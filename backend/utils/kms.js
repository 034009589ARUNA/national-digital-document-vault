/**
 * Key Management System (KMS) Integration
 * Supports AWS KMS and HashiCorp Vault
 * Phase 1.1: KMS Integration
 */

const crypto = require('crypto');

class KMSProvider {
  constructor(provider, config) {
    this.provider = provider;
    this.config = config;
    this.client = null;
    this.initialize();
  }

  async initialize() {
    try {
      if (this.provider === 'aws') {
        const { KMSClient } = require('@aws-sdk/client-kms');
        this.client = new KMSClient({
          region: this.config.awsRegion || 'us-east-1',
          credentials: {
            accessKeyId: this.config.awsAccessKeyId,
            secretAccessKey: this.config.awsSecretAccessKey
          }
        });
      } else if (this.provider === 'vault') {
        const vault = require('node-vault')({
          apiVersion: 'v1',
          endpoint: this.config.vaultAddr || 'http://localhost:8200',
          token: this.config.vaultToken
        });
        this.client = vault;
      } else if (this.provider === 'local') {
        // Local development mode - uses in-memory keys (NOT for production)
        this.client = {
          keys: new Map(),
          mode: 'local'
        };
        console.warn('⚠️  WARNING: Using local KMS mode. NOT SECURE for production!');
      }
    } catch (error) {
      console.error('KMS initialization error:', error);
      throw new Error(`Failed to initialize KMS provider: ${error.message}`);
    }
  }

  /**
   * Generate a data encryption key (DEK) for envelope encryption
   * @returns {Promise<{plaintextKey: Buffer, encryptedKey: string, keyId: string}>}
   */
  async generateDataKey(keyId = null) {
    try {
      if (this.provider === 'aws') {
        const { GenerateDataKeyCommand } = require('@aws-sdk/client-kms');
        const keyIdToUse = keyId || this.config.awsKmsKeyId;
        
        const command = new GenerateDataKeyCommand({
          KeyId: keyIdToUse,
          KeySpec: 'AES_256'
        });
        
        const response = await this.client.send(command);
        
        return {
          plaintextKey: response.Plaintext,
          encryptedKey: Buffer.from(response.CiphertextBlob).toString('base64'),
          keyId: keyIdToUse
        };
      } else if (this.provider === 'vault') {
        const mountPath = this.config.vaultMountPath || 'secret';
        const keyPath = this.config.vaultKeyPath || 'sierra-vault/keys';
        
        // Generate random key
        const plaintextKey = crypto.randomBytes(32);
        
        // Encrypt with Vault transit engine
        const encryptedKey = await this.client.write(`${mountPath}/transit/encrypt/${keyPath}`, {
          plaintext: plaintextKey.toString('base64')
        });
        
        return {
          plaintextKey: plaintextKey,
          encryptedKey: encryptedKey.data.ciphertext,
          keyId: keyPath
        };
      } else if (this.provider === 'local') {
        // Local mode: generate key and store encrypted version
        const plaintextKey = crypto.randomBytes(32);
        const masterKey = this.getLocalMasterKey();
        const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, crypto.randomBytes(12));
        let encrypted = cipher.update(plaintextKey);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        const authTag = cipher.getAuthTag();
        
        const encryptedKey = Buffer.concat([encrypted, authTag]).toString('base64');
        const keyId = `local-${Date.now()}`;
        
        return {
          plaintextKey: plaintextKey,
          encryptedKey: encryptedKey,
          keyId: keyId
        };
      }
    } catch (error) {
      console.error('Generate data key error:', error);
      throw new Error(`Failed to generate data key: ${error.message}`);
    }
  }

  /**
   * Decrypt an encrypted data key
   * @param {string} encryptedKey - Base64 encoded encrypted key
   * @param {string} keyId - Key ID reference
   * @returns {Promise<Buffer>} Decrypted plaintext key
   */
  async decryptDataKey(encryptedKey, keyId = null) {
    try {
      if (this.provider === 'aws') {
        const { DecryptCommand } = require('@aws-sdk/client-kms');
        const keyIdToUse = keyId || this.config.awsKmsKeyId;
        
        const command = new DecryptCommand({
          CiphertextBlob: Buffer.from(encryptedKey, 'base64'),
          KeyId: keyIdToUse
        });
        
        const response = await this.client.send(command);
        return response.Plaintext;
      } else if (this.provider === 'vault') {
        const mountPath = this.config.vaultMountPath || 'secret';
        const keyPath = keyId || this.config.vaultKeyPath || 'sierra-vault/keys';
        
        const decrypted = await this.client.write(`${mountPath}/transit/decrypt/${keyPath}`, {
          ciphertext: encryptedKey
        });
        
        return Buffer.from(decrypted.data.plaintext, 'base64');
      } else if (this.provider === 'local') {
        // Local mode: decrypt using stored master key
        const masterKey = this.getLocalMasterKey();
        const encryptedBuffer = Buffer.from(encryptedKey, 'base64');
        const authTag = encryptedBuffer.slice(-16);
        const encrypted = encryptedBuffer.slice(0, -16);
        
        const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, crypto.randomBytes(12));
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encrypted);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        
        return decrypted;
      }
    } catch (error) {
      console.error('Decrypt data key error:', error);
      throw new Error(`Failed to decrypt data key: ${error.message}`);
    }
  }

  /**
   * Sign data with KMS-managed key
   * @param {Buffer|string} data - Data to sign
   * @param {string} keyId - Key ID for signing
   * @returns {Promise<{signature: string, algorithm: string}>}
   */
  async sign(data, keyId = null) {
    try {
      if (this.provider === 'aws') {
        const { SignCommand } = require('@aws-sdk/client-kms');
        const keyIdToUse = keyId || this.config.awsKmsKeyId;
        
        const dataToSign = Buffer.isBuffer(data) ? data : Buffer.from(data);
        const messageDigest = crypto.createHash('sha256').update(dataToSign).digest();
        
        const command = new SignCommand({
          KeyId: keyIdToUse,
          Message: messageDigest,
          MessageType: 'DIGEST',
          SigningAlgorithm: 'ECDSA_SHA_256'
        });
        
        const response = await this.client.send(command);
        
        return {
          signature: Buffer.from(response.Signature).toString('base64'),
          algorithm: 'ECDSA_SHA_256',
          keyId: keyIdToUse
        };
      } else if (this.provider === 'vault') {
        const mountPath = this.config.vaultMountPath || 'secret';
        const keyPath = keyId || this.config.vaultKeyPath || 'sierra-vault/keys';
        
        const dataToSign = Buffer.isBuffer(data) ? data : Buffer.from(data);
        const messageDigest = crypto.createHash('sha256').update(dataToSign).digest('base64');
        
        const signed = await this.client.write(`${mountPath}/transit/sign/${keyPath}`, {
          input: messageDigest,
          algorithm: 'sha2-256'
        });
        
        return {
          signature: signed.data.signature,
          algorithm: 'sha2-256',
          keyId: keyPath
        };
      } else if (this.provider === 'local') {
        // Local mode: use HMAC for signing (not production-grade)
        const masterKey = this.getLocalMasterKey();
        const hmac = crypto.createHmac('sha256', masterKey);
        hmac.update(Buffer.isBuffer(data) ? data : Buffer.from(data));
        const signature = hmac.digest('base64');
        
        return {
          signature: signature,
          algorithm: 'HMAC-SHA256',
          keyId: 'local-signing-key'
        };
      }
    } catch (error) {
      console.error('Sign error:', error);
      throw new Error(`Failed to sign data: ${error.message}`);
    }
  }

  /**
   * Verify signature
   * @param {Buffer|string} data - Original data
   * @param {string} signature - Base64 encoded signature
   * @param {string} keyId - Key ID
   * @returns {Promise<boolean>}
   */
  async verify(data, signature, keyId = null) {
    try {
      if (this.provider === 'aws') {
        const { VerifyCommand } = require('@aws-sdk/client-kms');
        const keyIdToUse = keyId || this.config.awsKmsKeyId;
        
        const dataToVerify = Buffer.isBuffer(data) ? data : Buffer.from(data);
        const messageDigest = crypto.createHash('sha256').update(dataToVerify).digest();
        
        const command = new VerifyCommand({
          KeyId: keyIdToUse,
          Message: messageDigest,
          MessageType: 'DIGEST',
          Signature: Buffer.from(signature, 'base64'),
          SigningAlgorithm: 'ECDSA_SHA_256'
        });
        
        const response = await this.client.send(command);
        return response.SignatureValid;
      } else if (this.provider === 'vault') {
        const mountPath = this.config.vaultMountPath || 'secret';
        const keyPath = keyId || this.config.vaultKeyPath || 'sierra-vault/keys';
        
        const dataToVerify = Buffer.isBuffer(data) ? data : Buffer.from(data);
        const messageDigest = crypto.createHash('sha256').update(dataToVerify).digest('base64');
        
        const verified = await this.client.write(`${mountPath}/transit/verify/${keyPath}`, {
          input: messageDigest,
          signature: signature,
          algorithm: 'sha2-256'
        });
        
        return verified.data.valid === true;
      } else if (this.provider === 'local') {
        // Local mode: verify HMAC
        const masterKey = this.getLocalMasterKey();
        const hmac = crypto.createHmac('sha256', masterKey);
        hmac.update(Buffer.isBuffer(data) ? data : Buffer.from(data));
        const expectedSignature = hmac.digest('base64');
        
        return crypto.timingSafeEqual(
          Buffer.from(signature, 'base64'),
          Buffer.from(expectedSignature, 'base64')
        );
      }
    } catch (error) {
      console.error('Verify error:', error);
      return false;
    }
  }

  /**
   * Get local master key for development (derived from env or generated)
   * @private
   */
  getLocalMasterKey() {
    if (!this.localMasterKey) {
      // In production, this should NEVER be used
      // For development, derive from JWT_SECRET or generate
      const seed = process.env.JWT_SECRET || 'local-dev-secret-change-in-production';
      this.localMasterKey = crypto.createHash('sha256').update(seed).digest();
    }
    return this.localMasterKey;
  }
}

// Factory function to create KMS instance
function createKMS() {
  const provider = process.env.KMS_PROVIDER || 'local';
  
  const config = {
    awsRegion: process.env.AWS_REGION,
    awsKmsKeyId: process.env.AWS_KMS_KEY_ID,
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    vaultAddr: process.env.VAULT_ADDR,
    vaultToken: process.env.VAULT_TOKEN,
    vaultMountPath: process.env.VAULT_MOUNT_PATH,
    vaultKeyPath: process.env.VAULT_KEY_PATH
  };
  
  return new KMSProvider(provider, config);
}

// Singleton instance
let kmsInstance = null;

function getKMS() {
  if (!kmsInstance) {
    kmsInstance = createKMS();
  }
  return kmsInstance;
}

module.exports = {
  KMSProvider,
  createKMS,
  getKMS
};

