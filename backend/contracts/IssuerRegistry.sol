// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title IssuerRegistry
 * @dev On-chain registry for verified document issuers
 * Phase 1.3: Real Blockchain Integration
 */
contract IssuerRegistry is Ownable, AccessControl {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    
    struct Issuer {
        address wallet;
        string did;
        string metadataCID;
        bool approved;
        uint256 createdAt;
        address registeredBy;
    }
    
    mapping(address => Issuer) public issuers;
    mapping(string => address) public didToAddress;
    address[] public issuerAddresses;
    
    event IssuerRegistered(
        address indexed wallet,
        string did,
        string metadataCID,
        address registeredBy
    );
    
    event IssuerApproved(
        address indexed wallet,
        address approvedBy
    );
    
    event IssuerSuspended(
        address indexed wallet,
        address suspendedBy
    );
    
    constructor(address initialOwner) Ownable(initialOwner) {
        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(REGISTRAR_ROLE, initialOwner);
    }
    
    /**
     * @dev Register a new issuer (requires REGISTRAR_ROLE)
     * @param wallet Issuer's wallet address
     * @param did Issuer's DID (Decentralized Identifier)
     * @param metadataCID IPFS CID of issuer metadata
     */
    function registerIssuer(
        address wallet,
        string memory did,
        string memory metadataCID
    ) external onlyRole(REGISTRAR_ROLE) {
        require(wallet != address(0), "Invalid wallet address");
        require(bytes(did).length > 0, "DID cannot be empty");
        require(issuers[wallet].wallet == address(0), "Issuer already registered");
        require(didToAddress[did] == address(0), "DID already in use");
        
        issuers[wallet] = Issuer({
            wallet: wallet,
            did: did,
            metadataCID: metadataCID,
            approved: false,
            createdAt: block.timestamp,
            registeredBy: msg.sender
        });
        
        didToAddress[did] = wallet;
        issuerAddresses.push(wallet);
        
        emit IssuerRegistered(wallet, did, metadataCID, msg.sender);
    }
    
    /**
     * @dev Approve an issuer (requires REGISTRAR_ROLE)
     * @param wallet Issuer's wallet address
     */
    function approveIssuer(address wallet) external onlyRole(REGISTRAR_ROLE) {
        require(issuers[wallet].wallet != address(0), "Issuer not registered");
        require(!issuers[wallet].approved, "Issuer already approved");
        
        issuers[wallet].approved = true;
        
        emit IssuerApproved(wallet, msg.sender);
    }
    
    /**
     * @dev Suspend an issuer (requires REGISTRAR_ROLE)
     * @param wallet Issuer's wallet address
     */
    function suspendIssuer(address wallet) external onlyRole(REGISTRAR_ROLE) {
        require(issuers[wallet].wallet != address(0), "Issuer not registered");
        require(issuers[wallet].approved, "Issuer not approved");
        
        issuers[wallet].approved = false;
        
        emit IssuerSuspended(wallet, msg.sender);
    }
    
    /**
     * @dev Check if issuer is registered and approved
     * @param wallet Issuer's wallet address
     * @return bool True if issuer is registered and approved
     */
    function isIssuerApproved(address wallet) external view returns (bool) {
        return issuers[wallet].wallet != address(0) && issuers[wallet].approved;
    }
    
    /**
     * @dev Get issuer by DID
     * @param did Issuer's DID
     * @return wallet Issuer's wallet address
     * @return approved Approval status
     */
    function getIssuerByDID(string memory did) external view returns (address wallet, bool approved) {
        wallet = didToAddress[did];
        if (wallet != address(0)) {
            approved = issuers[wallet].approved;
        }
    }
    
    /**
     * @dev Get total number of registered issuers
     * @return uint256 Total count
     */
    function getIssuerCount() external view returns (uint256) {
        return issuerAddresses.length;
    }
}

