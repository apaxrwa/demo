// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title Compliance Registry
/// @notice One allowlist of verified investors shared by every APAX metal token, so
///         approving or blocking an account happens once for gold, silver and platinum.
contract ComplianceRegistry is AccessControl {
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");

    mapping(address => bool) private _allowed;

    error ZeroAddress();

    event AllowlistUpdated(address indexed account, bool allowed);

    /// @param admin Receives only DEFAULT_ADMIN_ROLE; the compliance role is granted separately.
    constructor(address admin) {
        if (admin == address(0)) {
            revert ZeroAddress();
        }
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /// @notice Whether `account` may hold and move APAX metal tokens.
    function isAllowed(address account) external view returns (bool) {
        return _allowed[account];
    }

    function setAllowed(address account, bool allowed) external onlyRole(COMPLIANCE_ROLE) {
        _setAllowed(account, allowed);
    }

    function setAllowedBatch(address[] calldata accounts, bool allowed) external onlyRole(COMPLIANCE_ROLE) {
        for (uint256 i = 0; i < accounts.length; i++) {
            _setAllowed(accounts[i], allowed);
        }
    }

    function _setAllowed(address account, bool allowed) private {
        if (account == address(0)) {
            revert ZeroAddress();
        }
        _allowed[account] = allowed;
        emit AllowlistUpdated(account, allowed);
    }
}
