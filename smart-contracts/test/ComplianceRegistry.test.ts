import { expect } from "chai";
import { network } from "hardhat";

describe("ComplianceRegistry", function () {
    async function deployRegistryFixture() {
        const { ethers } = await network.create();
        const [admin, officer, investor1, investor2, outsider] = await ethers.getSigners();

        const registry = await ethers.deployContract("ComplianceRegistry", [admin.address]);
        await registry.waitForDeployment();
        await registry.grantRole(await registry.COMPLIANCE_ROLE(), officer.address);

        return { ethers, registry, admin, officer, investor1, investor2, outsider };
    }

    it("grants the admin only DEFAULT_ADMIN_ROLE", async function () {
        const { registry, admin } = await deployRegistryFixture();
        expect(await registry.hasRole(await registry.DEFAULT_ADMIN_ROLE(), admin.address)).to.equal(true);
        expect(await registry.hasRole(await registry.COMPLIANCE_ROLE(), admin.address)).to.equal(false);
    });

    it("rejects a zero admin address", async function () {
        const { ethers, registry } = await deployRegistryFixture();
        await expect(ethers.deployContract("ComplianceRegistry", [ethers.ZeroAddress]))
            .to.be.revertedWithCustomError(registry, "ZeroAddress");
    });

    it("lets the compliance role allow and remove an account", async function () {
        const { registry, officer, investor1 } = await deployRegistryFixture();
        expect(await registry.isAllowed(investor1.address)).to.equal(false);

        await expect(registry.connect(officer).setAllowed(investor1.address, true))
            .to.emit(registry, "AllowlistUpdated")
            .withArgs(investor1.address, true);
        expect(await registry.isAllowed(investor1.address)).to.equal(true);

        await registry.connect(officer).setAllowed(investor1.address, false);
        expect(await registry.isAllowed(investor1.address)).to.equal(false);
    });

    it("updates several accounts in one batch", async function () {
        const { registry, officer, investor1, investor2 } = await deployRegistryFixture();
        await registry.connect(officer).setAllowedBatch([investor1.address, investor2.address], true);
        expect(await registry.isAllowed(investor1.address)).to.equal(true);
        expect(await registry.isAllowed(investor2.address)).to.equal(true);
    });

    it("rejects updates from accounts without the compliance role", async function () {
        const { registry, admin, outsider, investor1 } = await deployRegistryFixture();
        await expect(registry.connect(outsider).setAllowed(investor1.address, true))
            .to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
        await expect(registry.connect(admin).setAllowed(investor1.address, true))
            .to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
    });

    it("rejects the zero address, including inside a batch", async function () {
        const { ethers, registry, officer, investor1 } = await deployRegistryFixture();
        await expect(registry.connect(officer).setAllowed(ethers.ZeroAddress, true))
            .to.be.revertedWithCustomError(registry, "ZeroAddress");
        await expect(registry.connect(officer).setAllowedBatch([investor1.address, ethers.ZeroAddress], true))
            .to.be.revertedWithCustomError(registry, "ZeroAddress");
    });
});
