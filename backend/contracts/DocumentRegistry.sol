// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title DocumentRegistry
 * @dev On-chain registry for document anchors with versioning and revocation
 * Phase 1.3: Real Blockchain Integration
 */
contract DocumentRegistry is Ownable, AccessControl {
    bytes32 public constant ANCHOR_ROLE = keccak256("ANCHOR_ROLE");
    bytes32 public constant REVOKER_ROLE = keccak256("REVOKER_ROLE");
    
    struct DocumentAnchor {
        bytes32 anchorHash;
        string ipfsCid;
        address owner;
        string issuerDid;
        bool revoked;
        uint256 version;
        uint256 timestamp;
        uint256 revokedAt;
        string revocationReason;
        address revokedBy;
    }
    
    mapping(uint256 => DocumentAnchor) public documents;
    mapping(bytes32 => uint256) public anchorHashToDocId;
    mapping(address => uint256[]) public ownerDocuments;
    mapping(string => uint256[]) public issuerDocuments;
    
    uint256 public documentCount;
    
    event DocumentAnchored(
        uint256 indexed docId,
        bytes32 indexed anchorHash,
        string ipfsCid,
        address indexed owner,
        string issuerDid,
        uint256 version
    );
    
    event DocumentRevoked(
        uint256 indexed docId,
        bytes32 indexed anchorHash,
        string reason,
        address revokedBy
    );
    
    event DocumentVersioned(
        uint256 indexed oldDocId,
        uint256 indexed newDocId,
        bytes32 indexed anchorHash,
        uint256 newVersion
    );
    
    constructor(address initialOwner) Ownable(initialOwner) {
        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(ANCHOR_ROLE, initialOwner);
        _grantRole(REVOKER_ROLE, initialOwner);
    }
    
    /**
     * @dev Anchor a document on-chain
     * @param anchorHash Keccak256 hash of document metadata
     * @param ipfsCid IPFS CID (shortened, first 20 chars)
     * @param owner Document owner address
     * @param issuerDid Issuer's DID (empty string if user-uploaded)
     * @param version Document version (1 for initial)
     * @return docId Document ID
     */
    function anchorDocument(
        bytes32 anchorHash,
        string calldata ipfsCid,
        address owner,
        string calldata issuerDid,
        uint256 version
    ) external onlyRole(ANCHOR_ROLE) returns (uint256 docId) {
        require(owner != address(0), "Invalid owner address");
        require(version > 0, "Version must be > 0");
        require(anchorHashToDocId[anchorHash] == 0, "Anchor hash already exists");
        
        docId = ++documentCount;
        
        documents[docId] = DocumentAnchor({
            anchorHash: anchorHash,
            ipfsCid: ipfsCid,
            owner: owner,
            issuerDid: issuerDid,
            revoked: false,
            version: version,
            timestamp: block.timestamp,
            revokedAt: 0,
            revocationReason: "",
            revokedBy: address(0)
        });
        
        anchorHashToDocId[anchorHash] = docId;
        ownerDocuments[owner].push(docId);
        
        if (bytes(issuerDid).length > 0) {
            issuerDocuments[issuerDid].push(docId);
        }
        
        emit DocumentAnchored(docId, anchorHash, ipfsCid, owner, issuerDid, version);
    }
    
    /**
     * @dev Create new version of existing document
     * @param oldDocId Previous document version ID
     * @param anchorHash New anchor hash
     * @param ipfsCid New IPFS CID
     * @param version New version number
     * @return newDocId New document version ID
     */
    function createVersion(
        uint256 oldDocId,
        bytes32 anchorHash,
        string calldata ipfsCid,
        uint256 version
    ) external onlyRole(ANCHOR_ROLE) returns (uint256 newDocId) {
        require(documents[oldDocId].owner != address(0), "Previous document not found");
        require(!documents[oldDocId].revoked, "Cannot version revoked document");
        require(version > documents[oldDocId].version, "Version must be greater");
        require(anchorHashToDocId[anchorHash] == 0, "Anchor hash already exists");
        
        newDocId = ++documentCount;
        address owner = documents[oldDocId].owner;
        string memory issuerDid = documents[oldDocId].issuerDid;
        
        documents[newDocId] = DocumentAnchor({
            anchorHash: anchorHash,
            ipfsCid: ipfsCid,
            owner: owner,
            issuerDid: issuerDid,
            revoked: false,
            version: version,
            timestamp: block.timestamp,
            revokedAt: 0,
            revocationReason: "",
            revokedBy: address(0)
        });
        
        anchorHashToDocId[anchorHash] = newDocId;
        ownerDocuments[owner].push(newDocId);
        
        if (bytes(issuerDid).length > 0) {
            issuerDocuments[issuerDid].push(newDocId);
        }
        
        emit DocumentVersioned(oldDocId, newDocId, anchorHash, version);
        emit DocumentAnchored(newDocId, anchorHash, ipfsCid, owner, issuerDid, version);
    }
    
    /**
     * @dev Revoke a document
     * @param docId Document ID
     * @param reason Revocation reason
     */
    function revokeDocument(
        uint256 docId,
        string calldata reason
    ) external onlyRole(REVOKER_ROLE) {
        require(documents[docId].owner != address(0), "Document not found");
        require(!documents[docId].revoked, "Document already revoked");
        
        documents[docId].revoked = true;
        documents[docId].revokedAt = block.timestamp;
        documents[docId].revocationReason = reason;
        documents[docId].revokedBy = msg.sender;
        
        emit DocumentRevoked(docId, documents[docId].anchorHash, reason, msg.sender);
    }
    
    /**
     * @dev Get document details
     * @param docId Document ID
     * @return DocumentAnchor struct
     */
    function getDocument(uint256 docId) external view returns (DocumentAnchor memory) {
        require(documents[docId].owner != address(0), "Document not found");
        return documents[docId];
    }
    
    /**
     * @dev Check if anchor hash exists
     * @param anchorHash Anchor hash to check
     * @return exists True if exists
     * @return docId Document ID if exists
     */
    function anchorExists(bytes32 anchorHash) external view returns (bool exists, uint256 docId) {
        docId = anchorHashToDocId[anchorHash];
        exists = docId > 0 && !documents[docId].revoked;
    }
    
    /**
     * @dev Get documents by owner
     * @param owner Owner address
     * @return docIds Array of document IDs
     */
    function getDocumentsByOwner(address owner) external view returns (uint256[] memory) {
        return ownerDocuments[owner];
    }
    
    /**
     * @dev Get documents by issuer DID
     * @param issuerDid Issuer's DID
     * @return docIds Array of document IDs
     */
    function getDocumentsByIssuer(string calldata issuerDid) external view returns (uint256[] memory) {
        return issuerDocuments[issuerDid];
    }
}

