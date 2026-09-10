import { expect } from "chai";
import { network } from "hardhat";

describe("MetalToken", function () {
    async function deployMetalTokenFixture() {
        const { ethers } = await network.create();
        const [admin, operator, holder1, holder2, outsider] = await ethers.getSigners();

        const registry = await ethers.deployContract("ComplianceRegistry", [admin.address]);
        await registry.waitForDeployment();
        await registry.grantRole(await registry.COMPLIANCE_ROLE(), operator.address);
        const registryAsOperator = registry.connect(operator);
        await registryAsOperator.setAllowedBatch([holder1.address, holder2.address], true);

        const deployMetal = async (name: string, symbol: string) => {
            const token = await ethers.deployContract("MetalToken", [
                name,
                symbol,
                admin.address,
                await registry.getAddress(),
            ]);
            await token.waitForDeployment();
            for (const role of ["MINTER_ROLE", "PAUSER_ROLE", "REDEEMER_ROLE"] as const) {
                await token.grantRole(await token[role](), operator.address);
            }
            return token;
        };

        const token = await deployMetal("APAX Gold", "APXG");
        const tokenAsOperator = token.connect(operator);

        const grams = (value: string) => ethers.parseUnits(value, 18);
        const ref = (value: string) => ethers.encodeBytes32String(value);

        return {
            ethers, registry, registryAsOperator, deployMetal, token, tokenAsOperator,
            admin, operator, holder1, holder2, outsider, grams, ref,
        };
    }

    async function fundedFixture() {
        const fixture = await deployMetalTokenFixture();
        await fixture.tokenAsOperator.mintAgainstDeposit(
            fixture.holder1.address,
            fixture.grams("100"),
            fixture.ref("DEP-1")
        );
        return fixture;
    }

    describe("Deployment and roles", function () {
        it("sets the metal's name and symbol with 18 decimals", async function () {
            const { token } = await deployMetalTokenFixture();
            expect(await token.name()).to.equal("APAX Gold");
            expect(await token.symbol()).to.equal("APXG");
            expect(await token.decimals()).to.equal(18n);
        });

        it("grants the admin only DEFAULT_ADMIN_ROLE", async function () {
            const { token, admin } = await deployMetalTokenFixture();
            expect(await token.hasRole(await token.DEFAULT_ADMIN_ROLE(), admin.address)).to.equal(true);
            for (const role of ["MINTER_ROLE", "PAUSER_ROLE", "REDEEMER_ROLE"] as const) {
                expect(await token.hasRole(await token[role](), admin.address)).to.equal(false);
            }
        });

        it("rejects a zero admin address and a registry that is not a contract", async function () {
            const { ethers, token, registry, admin, outsider } = await deployMetalTokenFixture();
            const registryAddress = await registry.getAddress();
            await expect(ethers.deployContract("MetalToken", ["X", "X", ethers.ZeroAddress, registryAddress]))
                .to.be.revertedWithCustomError(token, "ZeroAddress");
            await expect(ethers.deployContract("MetalToken", ["X", "X", admin.address, outsider.address]))
                .to.be.revertedWithCustomError(token, "NotAContract")
                .withArgs(outsider.address);
        });
    });

    describe("Shared compliance registry", function () {
        it("blocks a removed investor on every metal token at once", async function () {
            const { deployMetal, registryAsOperator, tokenAsOperator, token, holder1, holder2, operator, grams, ref } =
                await deployMetalTokenFixture();
            const silver = await deployMetal("APAX Silver", "APXS");
            await tokenAsOperator.mintAgainstDeposit(holder1.address, grams("10"), ref("GOLD-1"));
            await silver.connect(operator).mintAgainstDeposit(holder1.address, grams("10"), ref("SILVER-1"));

            await registryAsOperator.setAllowed(holder1.address, false);

            await expect(token.connect(holder1).transfer(holder2.address, grams("1")))
                .to.be.revertedWithCustomError(token, "NotAllowed")
                .withArgs(holder1.address);
            await expect(silver.connect(holder1).transfer(holder2.address, grams("1")))
                .to.be.revertedWithCustomError(silver, "NotAllowed")
                .withArgs(holder1.address);
        });

        it("lets the admin switch to a new registry", async function () {
            const { ethers, token, admin, holder1, grams, tokenAsOperator, ref } = await deployMetalTokenFixture();
            const newRegistry = await ethers.deployContract("ComplianceRegistry", [admin.address]);
            const newRegistryAddress = await newRegistry.getAddress();

            await expect(token.connect(admin).setComplianceRegistry(newRegistryAddress))
                .to.emit(token, "ComplianceRegistryUpdated");
            expect(await token.complianceRegistry()).to.equal(newRegistryAddress);

            // Nobody is on the new, empty registry yet.
            await expect(tokenAsOperator.mintAgainstDeposit(holder1.address, grams("1"), ref("DEP-9")))
                .to.be.revertedWithCustomError(token, "NotAllowed")
                .withArgs(holder1.address);
        });

        it("rejects registry changes from non-admins and to non-contracts", async function () {
            const { token, admin, operator, outsider, registry } = await deployMetalTokenFixture();
            await expect(token.connect(operator).setComplianceRegistry(await registry.getAddress()))
                .to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
            await expect(token.connect(admin).setComplianceRegistry(outsider.address))
                .to.be.revertedWithCustomError(token, "NotAContract")
                .withArgs(outsider.address);
        });
    });

    describe("Minting against deposits", function () {
        it("mints to an allowed holder and records the deposit reference", async function () {
            const { token, tokenAsOperator, holder1, grams, ref } = await deployMetalTokenFixture();
            await expect(tokenAsOperator.mintAgainstDeposit(holder1.address, grams("156.75"), ref("DEP-1")))
                .to.emit(token, "Minted")
                .withArgs(holder1.address, grams("156.75"), ref("DEP-1"));
            expect(await token.balanceOf(holder1.address)).to.equal(grams("156.75"));
            expect(await token.usedDepositRefs(ref("DEP-1"))).to.equal(true);
        });

        it("rejects a reused deposit reference", async function () {
            const { token, tokenAsOperator, holder1, holder2, grams, ref } = await deployMetalTokenFixture();
            await tokenAsOperator.mintAgainstDeposit(holder1.address, grams("10"), ref("DEP-1"));
            await expect(tokenAsOperator.mintAgainstDeposit(holder2.address, grams("10"), ref("DEP-1")))
                .to.be.revertedWithCustomError(token, "DepositRefAlreadyUsed")
                .withArgs(ref("DEP-1"));
        });

        it("rejects zero amounts, empty references and the zero address", async function () {
            const { ethers, token, tokenAsOperator, holder1, grams, ref } = await deployMetalTokenFixture();
            await expect(tokenAsOperator.mintAgainstDeposit(holder1.address, 0n, ref("DEP-1")))
                .to.be.revertedWithCustomError(token, "ZeroAmount");
            await expect(tokenAsOperator.mintAgainstDeposit(holder1.address, grams("1"), ethers.ZeroHash))
                .to.be.revertedWithCustomError(token, "EmptyReference");
            await expect(tokenAsOperator.mintAgainstDeposit(ethers.ZeroAddress, grams("1"), ref("DEP-1")))
                .to.be.revertedWithCustomError(token, "ZeroAddress");
        });

        it("rejects minting to an account that is not allowed", async function () {
            const { token, tokenAsOperator, outsider, grams, ref } = await deployMetalTokenFixture();
            await expect(tokenAsOperator.mintAgainstDeposit(outsider.address, grams("1"), ref("DEP-1")))
                .to.be.revertedWithCustomError(token, "NotAllowed")
                .withArgs(outsider.address);
        });

        it("rejects minting by accounts without the minter role", async function () {
            const { token, admin, holder1, grams, ref } = await deployMetalTokenFixture();
            await expect(token.connect(admin).mintAgainstDeposit(holder1.address, grams("1"), ref("DEP-1")))
                .to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
        });
    });

    describe("Transfers", function () {
        it("allows transfers between allowed holders", async function () {
            const { token, holder1, holder2, grams } = await fundedFixture();
            await token.connect(holder1).transfer(holder2.address, grams("25"));
            expect(await token.balanceOf(holder2.address)).to.equal(grams("25"));
        });

        it("blocks transfers to accounts that are not allowed", async function () {
            const { token, holder1, outsider, grams } = await fundedFixture();
            await expect(token.connect(holder1).transfer(outsider.address, grams("1")))
                .to.be.revertedWithCustomError(token, "NotAllowed")
                .withArgs(outsider.address);
        });

        it("blocks sending tokens straight to the escrow contract", async function () {
            const { token, holder1, grams } = await fundedFixture();
            await expect(token.connect(holder1).transfer(await token.getAddress(), grams("1")))
                .to.be.revertedWithCustomError(token, "DirectEscrowTransfer");
        });
    });

    describe("Redemption", function () {
        it("escrows tokens when a holder requests a redemption", async function () {
            const { token, holder1, grams } = await fundedFixture();
            await expect(token.connect(holder1).requestRedemption(grams("40")))
                .to.emit(token, "RedemptionRequested")
                .withArgs(1n, holder1.address, grams("40"));

            expect(await token.balanceOf(holder1.address)).to.equal(grams("60"));
            expect(await token.balanceOf(await token.getAddress())).to.equal(grams("40"));
            expect(await token.totalEscrowed()).to.equal(grams("40"));
            const redemption = await token.redemptions(1n);
            expect(redemption.holder).to.equal(holder1.address);
            expect(redemption.status).to.equal(1n);
        });

        it("burns escrowed tokens when the redeemer settles", async function () {
            const { token, tokenAsOperator, holder1, grams, ref } = await fundedFixture();
            await token.connect(holder1).requestRedemption(grams("40"));

            await expect(tokenAsOperator.settleRedemption(1n, ref("DELIVERY-1")))
                .to.emit(token, "RedemptionSettled")
                .withArgs(1n, holder1.address, grams("40"), ref("DELIVERY-1"));

            expect(await token.totalSupply()).to.equal(grams("60"));
            expect(await token.totalEscrowed()).to.equal(0n);
            expect((await token.redemptions(1n)).status).to.equal(2n);
        });

        it("rejects settling twice, settling without a delivery reference, or by non-redeemers", async function () {
            const { ethers, token, tokenAsOperator, holder1, grams, ref } = await fundedFixture();
            await token.connect(holder1).requestRedemption(grams("40"));

            await expect(tokenAsOperator.settleRedemption(1n, ethers.ZeroHash))
                .to.be.revertedWithCustomError(token, "EmptyReference");
            await expect(token.connect(holder1).settleRedemption(1n, ref("DELIVERY-1")))
                .to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");

            await tokenAsOperator.settleRedemption(1n, ref("DELIVERY-1"));
            await expect(tokenAsOperator.settleRedemption(1n, ref("DELIVERY-2")))
                .to.be.revertedWithCustomError(token, "RedemptionNotPending")
                .withArgs(1n);
        });

        it("returns escrowed tokens when the holder cancels", async function () {
            const { token, holder1, grams } = await fundedFixture();
            await token.connect(holder1).requestRedemption(grams("40"));

            await expect(token.connect(holder1).cancelRedemption(1n))
                .to.emit(token, "RedemptionCancelled")
                .withArgs(1n, holder1.address, grams("40"));

            expect(await token.balanceOf(holder1.address)).to.equal(grams("100"));
            expect(await token.totalEscrowed()).to.equal(0n);
            expect((await token.redemptions(1n)).status).to.equal(3n);
        });

        it("lets the redeemer cancel but not other holders", async function () {
            const { token, tokenAsOperator, holder1, holder2, grams } = await fundedFixture();
            await token.connect(holder1).requestRedemption(grams("40"));
            await token.connect(holder1).requestRedemption(grams("10"));

            await expect(token.connect(holder2).cancelRedemption(1n))
                .to.be.revertedWithCustomError(token, "NotRedemptionHolder")
                .withArgs(1n, holder2.address);

            await tokenAsOperator.cancelRedemption(2n);
            expect(await token.balanceOf(holder1.address)).to.equal(grams("60"));
        });

        it("rejects redemption requests from accounts that are not allowed", async function () {
            const { token, registryAsOperator, holder1, grams } = await fundedFixture();
            await registryAsOperator.setAllowed(holder1.address, false);
            await expect(token.connect(holder1).requestRedemption(grams("1")))
                .to.be.revertedWithCustomError(token, "NotAllowed")
                .withArgs(holder1.address);
        });

        it("rejects zero-amount and unknown redemptions", async function () {
            const { token, holder1 } = await fundedFixture();
            await expect(token.connect(holder1).requestRedemption(0n))
                .to.be.revertedWithCustomError(token, "ZeroAmount");
            await expect(token.connect(holder1).cancelRedemption(99n))
                .to.be.revertedWithCustomError(token, "RedemptionNotPending")
                .withArgs(99n);
        });
    });

    describe("Pausing", function () {
        it("blocks transfers, mints and redemptions while paused", async function () {
            const { token, tokenAsOperator, holder1, holder2, grams, ref } = await fundedFixture();
            await tokenAsOperator.pause();

            await expect(token.connect(holder1).transfer(holder2.address, grams("1")))
                .to.be.revertedWithCustomError(token, "EnforcedPause");
            await expect(tokenAsOperator.mintAgainstDeposit(holder1.address, grams("1"), ref("DEP-2")))
                .to.be.revertedWithCustomError(token, "EnforcedPause");
            await expect(token.connect(holder1).requestRedemption(grams("1")))
                .to.be.revertedWithCustomError(token, "EnforcedPause");

            await tokenAsOperator.unpause();
            await token.connect(holder1).transfer(holder2.address, grams("1"));
            expect(await token.balanceOf(holder2.address)).to.equal(grams("1"));
        });

        it("rejects pausing by accounts without the pauser role", async function () {
            const { token, holder1 } = await fundedFixture();
            await expect(token.connect(holder1).pause())
                .to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
        });
    });
});
