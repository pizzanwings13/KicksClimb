// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title KicksClaimVault
 * @notice Secure vault for KICKS token claims in the betting game
 * @dev Uses EIP-712 signatures for claim authorization
 */
contract KicksClaimVault is AccessControl, ReentrancyGuard, Pausable, EIP712 {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant SIGNER_ROLE = keccak256("SIGNER_ROLE");

    bytes32 private constant CLAIM_TYPEHASH = keccak256(
        "Claim(address player,uint256 gameId,uint256 amount,uint256 nonce,uint256 expiry)"
    );

    IERC20 public immutable kicksToken;

    mapping(uint256 => bool) public usedNonces;
    mapping(address => uint256) public playerNonce;

    event ClaimProcessed(
        address indexed player,
        uint256 indexed gameId,
        uint256 amount,
        uint256 nonce
    );
    event Deposited(address indexed from, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);
    event SignerUpdated(address indexed oldSigner, address indexed newSigner);

    error InvalidSignature();
    error NonceAlreadyUsed();
    error ClaimExpired();
    error InsufficientBalance();
    error ZeroAmount();
    error ZeroAddress();

    /**
     * @notice Initialize the vault with KICKS token address
     * @param _kicksToken Address of the KICKS ERC20 token
     * @param _admin Admin address for role management
     * @param _signer Address authorized to sign claim messages
     */
    constructor(
        address _kicksToken,
        address _admin,
        address _signer
    ) EIP712("KicksClaimVault", "1") {
        if (_kicksToken == address(0)) revert ZeroAddress();
        if (_admin == address(0)) revert ZeroAddress();
        if (_signer == address(0)) revert ZeroAddress();

        kicksToken = IERC20(_kicksToken);

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(SIGNER_ROLE, _signer);
    }

    /**
     * @notice Claim KICKS tokens with a valid signature
     * @param gameId Unique game identifier
     * @param amount Amount of KICKS to claim
     * @param nonce Unique nonce for replay protection
     * @param expiry Timestamp when the claim expires
     * @param signature EIP-712 signature from authorized signer
     */
    function claimWin(
        uint256 gameId,
        uint256 amount,
        uint256 nonce,
        uint256 expiry,
        bytes calldata signature
    ) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        if (block.timestamp > expiry) revert ClaimExpired();
        if (usedNonces[nonce]) revert NonceAlreadyUsed();

        bytes32 structHash = keccak256(
            abi.encode(CLAIM_TYPEHASH, msg.sender, gameId, amount, nonce, expiry)
        );
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(hash, signature);

        if (!hasRole(SIGNER_ROLE, signer)) revert InvalidSignature();

        uint256 balance = kicksToken.balanceOf(address(this));
        if (balance < amount) revert InsufficientBalance();

        usedNonces[nonce] = true;
        playerNonce[msg.sender]++;

        kicksToken.safeTransfer(msg.sender, amount);

        emit ClaimProcessed(msg.sender, gameId, amount, nonce);
    }

    /**
     * @notice Deposit KICKS tokens to the vault (for house liquidity)
     * @param amount Amount of KICKS to deposit
     */
    function deposit(uint256 amount) external onlyRole(ADMIN_ROLE) {
        if (amount == 0) revert ZeroAmount();
        kicksToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(msg.sender, amount);
    }

    /**
     * @notice Withdraw KICKS tokens from the vault
     * @param amount Amount of KICKS to withdraw
     * @param to Recipient address
     */
    function withdraw(uint256 amount, address to) external onlyRole(ADMIN_ROLE) {
        if (amount == 0) revert ZeroAmount();
        if (to == address(0)) revert ZeroAddress();

        uint256 balance = kicksToken.balanceOf(address(this));
        if (balance < amount) revert InsufficientBalance();

        kicksToken.safeTransfer(to, amount);
        emit Withdrawn(to, amount);
    }

    /**
     * @notice Update the claim signer address
     * @param oldSigner Current signer address to revoke
     * @param newSigner New signer address
     */
    function updateSigner(address oldSigner, address newSigner) external onlyRole(ADMIN_ROLE) {
        if (newSigner == address(0)) revert ZeroAddress();

        if (oldSigner != address(0) && hasRole(SIGNER_ROLE, oldSigner)) {
            _revokeRole(SIGNER_ROLE, oldSigner);
        }

        _grantRole(SIGNER_ROLE, newSigner);
        emit SignerUpdated(oldSigner, newSigner);
    }

    /**
     * @notice Pause the contract in case of emergency
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @notice Get the vault's KICKS balance
     * @return Current KICKS balance
     */
    function getBalance() external view returns (uint256) {
        return kicksToken.balanceOf(address(this));
    }

    /**
     * @notice Get the domain separator for EIP-712
     * @return Domain separator bytes32
     */
    function getDomainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /**
     * @notice Check if a nonce has been used
     * @param nonce The nonce to check
     * @return True if nonce has been used
     */
    function isNonceUsed(uint256 nonce) external view returns (bool) {
        return usedNonces[nonce];
    }

    /**
     * @notice Get the next nonce for a player
     * @param player Player address
     * @return Next nonce value
     */
    function getPlayerNonce(address player) external view returns (uint256) {
        return playerNonce[player];
    }

}
