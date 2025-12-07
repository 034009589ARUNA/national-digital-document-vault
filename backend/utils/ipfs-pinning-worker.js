/**
 * IPFS Pinning Worker
 * Ensures redundant pinning across multiple IPFS providers
 * Phase 1.2: IPFS Integration
 */

const axios = require('axios');
const { getIPFS } = require('./ipfs');
const Document = require('../models/Document');

class IPFSPinningWorker {
  constructor() {
    this.minPins = parseInt(process.env.IPFS_MIN_PINS) || 3;
    this.retryAttempts = parseInt(process.env.IPFS_PIN_RETRY_ATTEMPTS) || 3;
    this.retryDelay = parseInt(process.env.IPFS_PIN_RETRY_DELAY) || 5000;
    this.isRunning = false;
  }

  /**
   * Process pinning task with retry logic
   * @param {string} documentId - Document ID
   * @param {string} cid - IPFS CID
   * @returns {Promise<{success: boolean, pins: number, errors: string[]}>}
   */
  async processPinningTask(documentId, cid) {
    const ipfs = getIPFS();
    let attempts = 0;
    let lastError = null;

    while (attempts < this.retryAttempts) {
      try {
        // Pin CID to all providers
        const pinResult = await ipfs.pinCID(cid);
        
        const successCount = pinResult.pinned.length;
        const failedCount = pinResult.failed.length;

        // Check if we have minimum required pins
        if (successCount >= this.minPins) {
          // Update document with pin status
          await Document.findByIdAndUpdate(documentId, {
            ipfsPinStatus: {
              pinned: true,
              providers: pinResult.pinned,
              failed: pinResult.failed,
              pinnedAt: new Date()
            }
          });

          return {
            success: true,
            pins: successCount,
            providers: pinResult.pinned,
            errors: pinResult.failed
          };
        } else {
          // Not enough pins, retry
          attempts++;
          if (attempts < this.retryAttempts) {
            await this.delay(this.retryDelay * attempts); // Exponential backoff
          }
        }
      } catch (error) {
        lastError = error;
        attempts++;
        if (attempts < this.retryAttempts) {
          await this.delay(this.retryDelay * attempts);
        }
      }
    }

    // All retries failed
    await Document.findByIdAndUpdate(documentId, {
      ipfsPinStatus: {
        pinned: false,
        error: lastError?.message || 'Pinning failed after retries',
        lastAttempt: new Date()
      }
    });

    return {
      success: false,
      pins: 0,
      errors: [lastError?.message || 'Unknown error']
    };
  }

  /**
   * Verify pin status and re-pin if needed
   * @param {string} documentId - Document ID
   * @param {string} cid - IPFS CID
   * @returns {Promise<{verified: boolean, action: string}>}
   */
  async verifyAndRepin(documentId, cid) {
    const ipfs = getIPFS();
    
    try {
      // Check current pin status
      const pinStatus = await ipfs.checkPinStatus(cid);
      const pinnedCount = pinStatus.filter(s => s.pinned).length;

      if (pinnedCount >= this.minPins) {
        return {
          verified: true,
          action: 'no_action',
          pins: pinnedCount
        };
      }

      // Need to re-pin
      console.log(`Re-pinning CID ${cid} for document ${documentId}`);
      const result = await this.processPinningTask(documentId, cid);

      return {
        verified: result.success,
        action: 'repinned',
        pins: result.pins
      };
    } catch (error) {
      console.error('Verify and repin error:', error);
      return {
        verified: false,
        action: 'error',
        error: error.message
      };
    }
  }

  /**
   * Health check for IPFS providers
   * @returns {Promise<{provider: string, healthy: boolean, error?: string}[]>}
   */
  async healthCheck() {
    const ipfs = getIPFS();
    const health = [];

    // Test each provider
    if (ipfs.clients.web3) {
      try {
        // Try to get status of a known CID
        await ipfs.clients.web3.status('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG');
        health.push({ provider: 'web3.storage', healthy: true });
      } catch (error) {
        health.push({ provider: 'web3.storage', healthy: false, error: error.message });
      }
    }

    if (ipfs.clients.pinata) {
      try {
        const response = await axios.get('https://api.pinata.cloud/data/testAuthentication', {
          headers: {
            'pinata_api_key': ipfs.clients.pinata.apiKey,
            'pinata_secret_api_key': ipfs.clients.pinata.secretKey
          }
        });
        health.push({ provider: 'pinata', healthy: response.status === 200 });
      } catch (error) {
        health.push({ provider: 'pinata', healthy: false, error: error.message });
      }
    }

    if (ipfs.clients.local) {
      try {
        const id = await ipfs.clients.local.id();
        health.push({ provider: 'local', healthy: !!id });
      } catch (error) {
        health.push({ provider: 'local', healthy: false, error: error.message });
      }
    }

    return health;
  }

  /**
   * Delay helper
   * @private
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
let workerInstance = null;

function getPinningWorker() {
  if (!workerInstance) {
    workerInstance = new IPFSPinningWorker();
  }
  return workerInstance;
}

module.exports = {
  IPFSPinningWorker,
  getPinningWorker
};

