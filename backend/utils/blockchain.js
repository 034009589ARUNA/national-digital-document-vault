/**
 * Blockchain Service - Real Blockchain Integration
 * Supports Ethereum, Polygon, Base, and local testnets
 * Phase 1.3: Real Blockchain Integration
 */

const { ethers } = require('ethers');
const crypto = require('crypto');
const { getKMS } = require('./kms');

class BlockchainService {
  constructor(network, config) {
    this.network = network;
    this.config = config;
    this.provider = null;
    this.signer = null;
    this.contracts = {};
    this.initialize();
  }

  async initialize() {
    try {
      // Initialize provider
      this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);

      // Initialize signer (using KMS for private key management)
      await this.initializeSigner();

      // Load contract addresses
      this.contracts.issuerRegistry = this.config.issuerRegistryAddress;
      this.contracts.documentRegistry = this.config.documentRegistryAddress;
    } catch (error) {
      console.error('Blockchain initialization error:', error);
      throw new Error(`Failed to initialize blockchain service: ${error.message}`);
    }
  }

  /**
   * Initialize signer using KMS
   * @private
   */
  async initializeSigner() {
    try {
      // Get private key reference from config
      const privateKeyRef = this.config.privateKeyRef;
      
      if (privateKeyRef && privateKeyRef.startsWith('kms://')) {
        // Use KMS to get private key
        const kms = getKMS();
        // In production, KMS would decrypt the key
        // For now, we'll use a wallet from env (should be in KMS)
        const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
        if (!privateKey) {
          throw new Error('Blockchain private key not configured. Use KMS or set BLOCKCHAIN_PRIVATE_KEY');
        }
        this.signer = new ethers.Wallet(privateKey, this.provider);
      } else {
        // Direct private key (development only)
        const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
        if (!privateKey) {
          throw new Error('Blockchain private key not configured');
        }
        this.signer = new ethers.Wallet(privateKey, this.provider);
      }
    } catch (error) {
      console.error('Signer initialization error:', error);
      throw error;
    }
  }

  /**
   * Generate anchor hash for document
   * @param {string} fileHash - SHA-256 hash of document
   * @param {string} ownerDID - Owner's DID
   * @param {number} version - Document version
   * @param {number} timestamp - Timestamp
   * @returns {string} Anchor hash (bytes32)
   */
  generateAnchorHash(fileHash, ownerDID, version = 1, timestamp = null) {
    const ts = timestamp || Math.floor(Date.now() / 1000);
    const data = `${fileHash}-${ownerDID}-${version}-${ts}`;
    return ethers.keccak256(ethers.toUtf8Bytes(data));
  }

  /**
   * Anchor document on blockchain
   * @param {string} anchorHash - Keccak256 hash of document metadata
   * @param {string} ipfsCid - IPFS CID (optional, shortened)
   * @param {string} ownerAddress - Owner's blockchain address
   * @param {string} issuerDID - Issuer's DID (optional)
   * @param {number} version - Document version
   * @returns {Promise<{txHash: string, blockNumber: number, gasUsed: bigint}>}
   */
  async anchorDocument(anchorHash, ipfsCid, ownerAddress, issuerDID = '', version = 1) {
    try {
      // Load DocumentRegistry contract ABI (simplified)
      const documentRegistryABI = [
        "function anchorDocument(bytes32 anchorHash, string calldata ipfsCid, address owner, string calldata issuerDid, uint256 version) external returns (uint256 docId)",
        "event DocumentAnchored(uint256 indexed docId, bytes32 indexed anchorHash, string ipfsCid, address owner, uint256 version)"
      ];

      const contract = new ethers.Contract(
        this.contracts.documentRegistry,
        documentRegistryABI,
        this.signer
      );

      // Shorten IPFS CID if too long (first 20 chars)
      const shortCid = ipfsCid ? ipfsCid.substring(0, 20) : '';

      // Estimate gas
      const gasEstimate = await contract.anchorDocument.estimateGas(
        anchorHash,
        shortCid,
        ownerAddress,
        issuerDID,
        version
      );

      // Send transaction
      const tx = await contract.anchorDocument(
        anchorHash,
        shortCid,
        ownerAddress,
        issuerDID,
        version,
        {
          gasLimit: gasEstimate * BigInt(120) / BigInt(100) // 20% buffer
        }
      );

      // Wait for confirmation
      const receipt = await tx.wait();

      // Find DocumentAnchored event
      const event = receipt.logs.find(log => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed && parsed.name === 'DocumentAnchored';
        } catch {
          return false;
        }
      });

      let docId = null;
      if (event) {
        const parsed = contract.interface.parseLog(event);
        docId = parsed.args.docId.toString();
      }

      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        docId: docId,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Anchor document error:', error);
      throw new Error(`Failed to anchor document: ${error.message}`);
    }
  }

  /**
   * Revoke document on blockchain
   * @param {number} docId - Document ID from blockchain
   * @param {string} reason - Revocation reason
   * @returns {Promise<{txHash: string, blockNumber: number}>}
   */
  async revokeDocument(docId, reason) {
    try {
      const documentRegistryABI = [
        "function revokeDocument(uint256 docId, string calldata reason) external",
        "event DocumentRevoked(uint256 indexed docId, string reason, address revokedBy)"
      ];

      const contract = new ethers.Contract(
        this.contracts.documentRegistry,
        documentRegistryABI,
        this.signer
      );

      const tx = await contract.revokeDocument(docId, reason);
      const receipt = await tx.wait();

      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Revoke document error:', error);
      throw new Error(`Failed to revoke document: ${error.message}`);
    }
  }

  /**
   * Register issuer on blockchain
   * @param {string} walletAddress - Issuer's wallet address
   * @param {string} did - Issuer's DID
   * @param {string} metadataCID - IPFS CID of issuer metadata
   * @returns {Promise<{txHash: string, blockNumber: number}>}
   */
  async registerIssuer(walletAddress, did, metadataCID) {
    try {
      const issuerRegistryABI = [
        "function registerIssuer(address wallet, string calldata did, string calldata metadataCID) external",
        "event IssuerRegistered(address indexed wallet, string did, string metadataCID)"
      ];

      const contract = new ethers.Contract(
        this.contracts.issuerRegistry,
        issuerRegistryABI,
        this.signer
      );

      const tx = await contract.registerIssuer(walletAddress, did, metadataCID);
      const receipt = await tx.wait();

      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Register issuer error:', error);
      throw new Error(`Failed to register issuer: ${error.message}`);
    }
  }

  /**
   * Get document from blockchain
   * @param {number} docId - Document ID
   * @returns {Promise<{anchorHash: string, ipfsCid: string, owner: string, issuerDid: string, revoked: boolean, version: number, timestamp: number}>}
   */
  async getDocument(docId) {
    try {
      const documentRegistryABI = [
        "function getDocument(uint256 docId) external view returns (bytes32 anchorHash, string memory ipfsCid, address owner, string memory issuerDid, bool revoked, uint256 version, uint256 timestamp)"
      ];

      const contract = new ethers.Contract(
        this.contracts.documentRegistry,
        documentRegistryABI,
        this.provider
      );

      const result = await contract.getDocument(docId);

      return {
        anchorHash: result.anchorHash,
        ipfsCid: result.ipfsCid,
        owner: result.owner,
        issuerDid: result.issuerDid,
        revoked: result.revoked,
        version: result.version.toString(),
        timestamp: new Date(Number(result.timestamp) * 1000)
      };
    } catch (error) {
      console.error('Get document error:', error);
      throw new Error(`Failed to get document: ${error.message}`);
    }
  }

  /**
   * Verify document anchor exists on blockchain
   * @param {string} anchorHash - Anchor hash to verify
   * @returns {Promise<{exists: boolean, docId?: number, revoked?: boolean}>}
   */
  async verifyAnchor(anchorHash) {
    try {
      // This would require an indexer or events query
      // For now, we'll check if we can find it in recent events
      // In production, use The Graph or similar indexing service
      
      const documentRegistryABI = [
        "event DocumentAnchored(uint256 indexed docId, bytes32 indexed anchorHash, string ipfsCid, address owner, uint256 version)"
      ];

      const contract = new ethers.Contract(
        this.contracts.documentRegistry,
        documentRegistryABI,
        this.provider
      );

      // Query recent events (last 10000 blocks)
      const currentBlock = await this.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000);

      const events = await contract.queryFilter(
        contract.filters.DocumentAnchored(null, anchorHash),
        fromBlock,
        currentBlock
      );

      if (events.length > 0) {
        const event = events[0];
        const docId = event.args.docId.toString();
        
        // Check if revoked
        const doc = await this.getDocument(docId);
        
        return {
          exists: true,
          docId: docId,
          revoked: doc.revoked,
          txHash: event.transactionHash
        };
      }

      return {
        exists: false
      };
    } catch (error) {
      console.error('Verify anchor error:', error);
      return {
        exists: false,
        error: error.message
      };
    }
  }

  /**
   * Get network info
   * @returns {Promise<{chainId: number, blockNumber: number, gasPrice: bigint}>}
   */
  async getNetworkInfo() {
    try {
      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();
      const feeData = await this.provider.getFeeData();

      return {
        chainId: Number(network.chainId),
        blockNumber: blockNumber,
        gasPrice: feeData.gasPrice,
        networkName: this.network
      };
    } catch (error) {
      console.error('Get network info error:', error);
      throw error;
    }
  }
}

// Factory function
function createBlockchainService() {
  const network = process.env.BLOCKCHAIN_NETWORK || 'polygon';
  
  const config = {
    rpcUrl: process.env.BLOCKCHAIN_RPC_URL,
    chainId: parseInt(process.env.BLOCKCHAIN_CHAIN_ID) || 137,
    privateKeyRef: process.env.BLOCKCHAIN_PRIVATE_KEY_REF,
    issuerRegistryAddress: process.env.ISSUER_REGISTRY_CONTRACT_ADDRESS,
    documentRegistryAddress: process.env.DOCUMENT_REGISTRY_CONTRACT_ADDRESS
  };
  
  return new BlockchainService(network, config);
}

// Singleton instance
let blockchainInstance = null;

function getBlockchainService() {
  if (!blockchainInstance) {
    blockchainInstance = createBlockchainService();
  }
  return blockchainInstance;
}

module.exports = {
  BlockchainService,
  createBlockchainService,
  getBlockchainService
};

