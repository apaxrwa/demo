import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const METALS = [
  { id: "Gold", name: "APAX Gold", symbol: "APXG" },
  { id: "Silver", name: "APAX Silver", symbol: "APXS" },
  { id: "Platinum", name: "APAX Platinum", symbol: "APXP" },
] as const;

// Deploys the shared ComplianceRegistry and one MetalToken per metal. Admin and operator
// default to the deployer for local use; on a public network pass separate addresses
// (ideally multisigs) through Ignition parameters.
const MetalTokensModule = buildModule("MetalTokensModule", (m) => {
  const admin = m.getParameter("admin", m.getAccount(0));
  const operator = m.getParameter("operator", m.getAccount(0));

  const registry = m.contract("ComplianceRegistry", [admin]);
  const complianceRole = m.staticCall(registry, "COMPLIANCE_ROLE", [], 0, { id: "COMPLIANCE_ROLE_id" });
  m.call(registry, "grantRole", [complianceRole, operator], { id: "grant_COMPLIANCE_ROLE" });

  const tokens = Object.fromEntries(
    METALS.map(({ id, name, symbol }) => {
      const token = m.contract("MetalToken", [name, symbol, admin, registry], { id: `${id}Token` });
      for (const role of ["MINTER_ROLE", "PAUSER_ROLE", "REDEEMER_ROLE"]) {
        const roleId = m.staticCall(token, role, [], 0, { id: `${id}_${role}_id` });
        m.call(token, "grantRole", [roleId, operator], { id: `${id}_grant_${role}` });
      }
      return [`${id.toLowerCase()}Token`, token];
    })
  );

  return { registry, ...tokens };
});

export default MetalTokensModule;
