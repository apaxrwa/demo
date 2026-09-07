// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Pausable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

interface IComplianceRegistry {
    function isAllowed(address account) external view returns (bool);
}

/// @title APAX Metal Token
/// @notice A vault-backed token where 1 token represents 1 gram of allocated metal. The same
///         contract is deployed once per metal (APXG gold, APXS silver, APXP platinum).
/// @dev Mints must cite a unique off-chain deposit reference. Redemptions escrow the holder's
///      tokens in this contract and burn them only once delivery is settled, so no role can
///      burn a holder's balance directly. Who may hold tokens is decided by a shared
///      ComplianceRegistry.
contract MetalToken is ERC20, ERC20Pausable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant REDEEMER_ROLE = keccak256("REDEEMER_ROLE");

    enum RedemptionStatus {
        None,
        Pending,
        Settled,
        Cancelled
    }

    struct Redemption {
        address holder;
        uint256 amount;
        RedemptionStatus status;
    }

    /// @notice The allowlist every holder must be on.
    IComplianceRegistry public complianceRegistry;
    /// @notice Deposit references that have already backed a mint.
    mapping(bytes32 => bool) public usedDepositRefs;
    /// @notice Redemption requests by id (ids start at 1).
    mapping(uint256 => Redemption) public redemptions;
    /// @notice Number of redemption requests created so far.
    uint256 public redemptionCount;
    /// @notice Tokens currently held in escrow for pending redemptions.
    uint256 public totalEscrowed;

    // Only the redemption functions may move tokens into or out of this contract.
    bool private _escrowOperation;

    error ZeroAddress();
    error ZeroAmount();
    error EmptyReference();
    error NotAContract(address account);
    error DepositRefAlreadyUsed(bytes32 depositRef);
    error NotAllowed(address account);
    error DirectEscrowTransfer();
    error RedemptionNotPending(uint256 id);
    error NotRedemptionHolder(uint256 id, address caller);

    event ComplianceRegistryUpdated(address indexed previousRegistry, address indexed newRegistry);
    event Minted(address indexed to, uint256 amount, bytes32 indexed depositRef);
    event RedemptionRequested(uint256 indexed id, address indexed holder, uint256 amount);
    event RedemptionSettled(uint256 indexed id, address indexed holder, uint256 amount, bytes32 deliveryRef);
    event RedemptionCancelled(uint256 indexed id, address indexed holder, uint256 amount);

    /// @param admin Receives only DEFAULT_ADMIN_ROLE; operational roles are granted separately.
    /// @param registry The shared ComplianceRegistry.
    constructor(
        string memory name_,
        string memory symbol_,
        address admin,
        address registry
    ) ERC20(name_, symbol_) {
        if (admin == address(0)) {
            revert ZeroAddress();
        }
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _setComplianceRegistry(registry);
    }

    // ---------------------------------------------------------------------
    // Compliance
    // ---------------------------------------------------------------------

    /// @notice Points the token at a new registry, for example after a registry upgrade.
    function setComplianceRegistry(address registry) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setComplianceRegistry(registry);
    }

    // ---------------------------------------------------------------------
    // Minting
    // ---------------------------------------------------------------------

    /// @notice Mints tokens backed by a vault deposit. Each deposit reference can be used once.
    function mintAgainstDeposit(address to, uint256 amount, bytes32 depositRef) external onlyRole(MINTER_ROLE) {
        if (to == address(0)) {
            revert ZeroAddress();
        }
        if (amount == 0) {
            revert ZeroAmount();
        }
        if (depositRef == bytes32(0)) {
            revert EmptyReference();
        }
        if (usedDepositRefs[depositRef]) {
            revert DepositRefAlreadyUsed(depositRef);
        }

        usedDepositRefs[depositRef] = true;
        _mint(to, amount);
        emit Minted(to, amount, depositRef);
    }

    // ---------------------------------------------------------------------
    // Redemption
    // ---------------------------------------------------------------------

    /// @notice Locks `amount` of the caller's tokens in escrow and opens a redemption request.
    function requestRedemption(uint256 amount) external returns (uint256 id) {
        if (amount == 0) {
            revert ZeroAmount();
        }

        _escrowTransfer(msg.sender, address(this), amount);

        id = ++redemptionCount;
        redemptions[id] = Redemption(msg.sender, amount, RedemptionStatus.Pending);
        totalEscrowed += amount;
        emit RedemptionRequested(id, msg.sender, amount);
    }

    /// @notice Burns the escrowed tokens once the custodian confirms physical delivery.
    function settleRedemption(uint256 id, bytes32 deliveryRef) external onlyRole(REDEEMER_ROLE) {
        if (deliveryRef == bytes32(0)) {
            revert EmptyReference();
        }
        Redemption storage redemption = _pendingRedemption(id);

        redemption.status = RedemptionStatus.Settled;
        totalEscrowed -= redemption.amount;
        _burn(address(this), redemption.amount);
        emit RedemptionSettled(id, redemption.holder, redemption.amount, deliveryRef);
    }

    /// @notice Returns escrowed tokens to the holder. Callable by the holder or the redeemer role.
    /// @dev The holder must still be allowed by the registry to receive the tokens back.
    function cancelRedemption(uint256 id) external {
        Redemption storage redemption = _pendingRedemption(id);
        if (msg.sender != redemption.holder && !hasRole(REDEEMER_ROLE, msg.sender)) {
            revert NotRedemptionHolder(id, msg.sender);
        }

        redemption.status = RedemptionStatus.Cancelled;
        totalEscrowed -= redemption.amount;
        _escrowTransfer(address(this), redemption.holder, redemption.amount);
        emit RedemptionCancelled(id, redemption.holder, redemption.amount);
    }

    // ---------------------------------------------------------------------
    // Emergency controls
    // ---------------------------------------------------------------------

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // ---------------------------------------------------------------------
    // Internals
    // ---------------------------------------------------------------------

    function _setComplianceRegistry(address registry) private {
        if (registry.code.length == 0) {
            revert NotAContract(registry);
        }
        emit ComplianceRegistryUpdated(address(complianceRegistry), registry);
        complianceRegistry = IComplianceRegistry(registry);
    }

    function _pendingRedemption(uint256 id) private view returns (Redemption storage redemption) {
        redemption = redemptions[id];
        if (redemption.status != RedemptionStatus.Pending) {
            revert RedemptionNotPending(id);
        }
    }

    function _escrowTransfer(address from, address to, uint256 amount) private {
        _escrowOperation = true;
        _transfer(from, to, amount);
        _escrowOperation = false;
    }

    /// @dev Enforces the registry allowlist on every transfer, mint and burn (the escrow itself
    ///      is exempt), then defers to ERC20Pausable so nothing moves while paused.
    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Pausable) {
        bool isTransfer = from != address(0) && to != address(0);
        if (isTransfer && (from == address(this) || to == address(this)) && !_escrowOperation) {
            revert DirectEscrowTransfer();
        }
        if (from != address(0) && from != address(this) && !complianceRegistry.isAllowed(from)) {
            revert NotAllowed(from);
        }
        if (to != address(0) && to != address(this) && !complianceRegistry.isAllowed(to)) {
            revert NotAllowed(to);
        }
        super._update(from, to, value);
    }
}
