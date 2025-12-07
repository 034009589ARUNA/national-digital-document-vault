/**
 * IPFS Integration with Redundant Pinning
 * Supports: web3.storage, Pinata, and self-hosted IPFS node
 * Phase 1.2: IPFS Integration
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class IPFSProvider {
  constructor(provider, config) {
    this.provider = provider;
    this.config = config;
    this.clients = {};
    this.initialize();
  }

  async initialize() {
    try {
      // Initialize web3.storage client
      if (this.config.web3StorageToken) {
        const { Web3Storage } = require('web3.storage');
        this.clients.web3 = new Web3Storage({ token: this.config.web3StorageToken });
      }

      // Initialize Pinata client
      if (this.config.pinataApiKey && this.config.pinataSecretKey) {
        this.clients.pinata = {
          apiKey: this.config.pinataApiKey,
          secretKey: this.config.pinataSecretKey,
          jwt: this.config.pinataJwt
        };
      }

      // Initialize local IPFS node client
      if (this.config.localNodeUrl) {
        const { create } = require('ipfs-http-client');
        this.clients.local = create({
          url: this.config.localNodeUrl
        });
      }
    } catch (error) {
      console.error('IPFS initialization error:', error);
      throw new Error(`Failed to initialize IPFS: ${error.message}`);
    }
  }

  /**
   * Upload file to IPFS
   * @param {Buffer|string} fileData - File data or file path
   * @param {string} fileName - Optional file name
   * @returns {Promise<{cid: string, size: number}>}
   */
  async uploadFile(fileData, fileName = null) {
    try {
      let fileBuffer;
      
      if (Buffer.isBuffer(fileData)) {
        fileBuffer = fileData;
      } else if (typeof fileData === 'string') {
        // Assume it's a file path
        fileBuffer = fs.readFileSync(fileData);
      } else {
        throw new Error('Invalid file data type');
      }

      // Upload to all available providers
      const uploadPromises = [];
      const results = {};

      // Upload to web3.storage
      if (this.clients.web3) {
        uploadPromises.push(
          this.uploadToWeb3Storage(fileBuffer, fileName)
            .then(result => {
              results.web3 = result;
              return result;
            })
            .catch(error => {
              console.error('Web3.Storage upload error:', error);
              results.web3 = { error: error.message };
            })
        );
      }

      // Upload to Pinata
      if (this.clients.pinata) {
        uploadPromises.push(
          this.uploadToPinata(fileBuffer, fileName)
            .then(result => {
              results.pinata = result;
              return result;
            })
            .catch(error => {
              console.error('Pinata upload error:', error);
              results.pinata = { error: error.message };
            })
        );
      }

      // Upload to local node
      if (this.clients.local) {
        uploadPromises.push(
          this.uploadToLocalNode(fileBuffer, fileName)
            .then(result => {
              results.local = result;
              return result;
            })
            .catch(error => {
              console.error('Local IPFS upload error:', error);
              results.local = { error: error.message };
            })
        );
      }

      // Wait for all uploads
      await Promise.allSettled(uploadPromises);

      // Find successful upload
      const successfulUpload = Object.values(results).find(r => r && r.cid && !r.error);
      
      if (!successfulUpload) {
        throw new Error('All IPFS uploads failed');
      }

      return {
        cid: successfulUpload.cid,
        size: successfulUpload.size,
        pinStatus: results // Track which providers succeeded
      };
    } catch (error) {
      console.error('IPFS upload error:', error);
      throw new Error(`Failed to upload to IPFS: ${error.message}`);
    }
  }

  /**
   * Upload to web3.storage
   * @private
   */
  async uploadToWeb3Storage(fileBuffer, fileName) {
    // web3.storage v4.x API - put accepts File objects or File-like objects
    // Create a File-like object compatible with web3.storage
    const file = {
      name: fileName || 'document',
      stream: () => {
        const { Readable } = require('stream');
        return Readable.from([fileBuffer]);
      },
      arrayBuffer: async () => fileBuffer.buffer || fileBuffer,
      size: fileBuffer.length,
      type: 'application/octet-stream'
    };
    
    const cid = await this.clients.web3.put([file], {
      wrapWithDirectory: false
    });
    
    return {
      cid: cid.toString(),
      size: fileBuffer.length,
      provider: 'web3.storage'
    };
  }

  /**
   * Upload to Pinata
   * @private
   */
  async uploadToPinata(fileBuffer, fileName) {
    const FormData = require('form-data');
    const formData = new FormData();
    
    formData.append('file', fileBuffer, {
      filename: fileName || 'document',
      contentType: 'application/octet-stream'
    });

    const pinataMetadata = JSON.stringify({
      name: fileName || 'document'
    });
    formData.append('pinataMetadata', pinataMetadata);

    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        headers: {
          'pinata_api_key': this.clients.pinata.apiKey,
          'pinata_secret_api_key': this.clients.pinata.secretKey,
          ...formData.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    return {
      cid: response.data.IpfsHash,
      size: fileBuffer.length,
      provider: 'pinata'
    };
  }

  /**
   * Upload to local IPFS node
   * @private
   */
  async uploadToLocalNode(fileBuffer, fileName) {
    const result = await this.clients.local.add(fileBuffer, {
      pin: true,
      cidVersion: 1
    });

    return {
      cid: result.cid.toString(),
      size: result.size,
      provider: 'local'
    };
  }

  /**
   * Pin existing CID to all providers
   * @param {string} cid - IPFS CID
   * @returns {Promise<{pinned: string[], failed: string[]}>}
   */
  async pinCID(cid) {
    const results = {
      pinned: [],
      failed: []
    };

    // Pin to web3.storage (if not already pinned)
    if (this.clients.web3) {
      try {
        // web3.storage automatically pins on upload, but we can verify
        const status = await this.clients.web3.status(cid);
        if (status) {
          results.pinned.push('web3.storage');
        }
      } catch (error) {
        results.failed.push('web3.storage');
      }
    }

    // Pin to Pinata
    if (this.clients.pinata) {
      try {
        await axios.post(
          'https://api.pinata.cloud/pinning/pinByHash',
          {
            hashToPin: cid
          },
          {
            headers: {
              'pinata_api_key': this.clients.pinata.apiKey,
              'pinata_secret_api_key': this.clients.pinata.secretKey,
              'Content-Type': 'application/json'
            }
          }
        );
        results.pinned.push('pinata');
      } catch (error) {
        results.failed.push('pinata');
      }
    }

    // Pin to local node
    if (this.clients.local) {
      try {
        await this.clients.local.pin.add(cid);
        results.pinned.push('local');
      } catch (error) {
        results.failed.push('local');
      }
    }

    return results;
  }

  /**
   * Check pin status across all providers
   * @param {string} cid - IPFS CID
   * @returns {Promise<{provider: string, pinned: boolean}[]>}
   */
  async checkPinStatus(cid) {
    const status = [];

    // Check web3.storage
    if (this.clients.web3) {
      try {
        const pinStatus = await this.clients.web3.status(cid);
        status.push({
          provider: 'web3.storage',
          pinned: !!pinStatus
        });
      } catch (error) {
        status.push({
          provider: 'web3.storage',
          pinned: false,
          error: error.message
        });
      }
    }

    // Check Pinata
    if (this.clients.pinata) {
      try {
        const response = await axios.get(
          `https://api.pinata.cloud/data/pinList?hashContains=${cid}`,
          {
            headers: {
              'pinata_api_key': this.clients.pinata.apiKey,
              'pinata_secret_api_key': this.clients.pinata.secretKey
            }
          }
        );
        status.push({
          provider: 'pinata',
          pinned: response.data.count > 0
        });
      } catch (error) {
        status.push({
          provider: 'pinata',
          pinned: false,
          error: error.message
        });
      }
    }

    // Check local node
    if (this.clients.local) {
      try {
        const pins = await this.clients.local.pin.ls();
        const isPinned = pins.some(pin => pin.cid.toString() === cid);
        status.push({
          provider: 'local',
          pinned: isPinned
        });
      } catch (error) {
        status.push({
          provider: 'local',
          pinned: false,
          error: error.message
        });
      }
    }

    return status;
  }

  /**
   * Retrieve file from IPFS
   * @param {string} cid - IPFS CID
   * @returns {Promise<Buffer>}
   */
  async getFile(cid) {
    try {
      // Try local node first (fastest)
      if (this.clients.local) {
        try {
          const chunks = [];
          for await (const chunk of this.clients.local.cat(cid)) {
            chunks.push(chunk);
          }
          return Buffer.concat(chunks);
        } catch (error) {
          console.warn('Local IPFS retrieval failed, trying gateway:', error.message);
        }
      }

      // Fallback to public gateway
      const gatewayUrl = this.config.localGatewayUrl || `https://ipfs.io/ipfs/${cid}`;
      const response = await axios.get(gatewayUrl, {
        responseType: 'arraybuffer'
      });
      
      return Buffer.from(response.data);
    } catch (error) {
      console.error('IPFS retrieval error:', error);
      throw new Error(`Failed to retrieve file from IPFS: ${error.message}`);
    }
  }
}

// Factory function
function createIPFS() {
  const provider = process.env.IPFS_PROVIDER || 'multi';
  
  const config = {
    localNodeUrl: process.env.IPFS_LOCAL_NODE_URL,
    localGatewayUrl: process.env.IPFS_LOCAL_GATEWAY_URL,
    web3StorageToken: process.env.WEB3_STORAGE_TOKEN,
    pinataApiKey: process.env.PINATA_API_KEY,
    pinataSecretKey: process.env.PINATA_SECRET_KEY,
    pinataJwt: process.env.PINATA_JWT
  };
  
  return new IPFSProvider(provider, config);
}

// Singleton instance
let ipfsInstance = null;

function getIPFS() {
  if (!ipfsInstance) {
    ipfsInstance = createIPFS();
  }
  return ipfsInstance;
}

module.exports = {
  IPFSProvider,
  createIPFS,
  getIPFS
};

