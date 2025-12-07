/**
 * Document Encryption Utilities
 * Uses envelope encryption with KMS-managed keys
 * Phase 1.1: KMS Integration
 */

const crypto = require('crypto');
const { getKMS } = require('./kms');

/**
 * Encrypt document using envelope encryption
 * @param {Buffer} fileBuffer - Document file buffer
 * @param {string} encryptedKeyRef - Reference to encrypted data key (stored in DB)
 * @returns {Promise<{encryptedData: Buffer, iv: Buffer, authTag: Buffer}>}
 */
async function encryptDocument(fileBuffer, encryptedKeyRef = null) {
  try {
    const kms = getKMS();
    
    // Generate or use existing data key
    let dataKey;
    let encryptedKey;
    let keyId;
    
    if (encryptedKeyRef) {
      // Decrypt existing key
      const keyParts = encryptedKeyRef.split(':');
      keyId = keyParts[0];
      encryptedKey = keyParts[1];
      dataKey = await kms.decryptDataKey(encryptedKey, keyId);
    } else {
      // Generate new data key
      const keyData = await kms.generateDataKey();
      dataKey = keyData.plaintextKey;
      encryptedKey = keyData.encryptedKey;
      keyId = keyData.keyId;
    }
    
    // Encrypt file with AES-256-GCM
    const iv = crypto.randomBytes(12); // 96-bit IV for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', dataKey, iv);
    
    let encrypted = cipher.update(fileBuffer);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();
    
    return {
      encryptedData: encrypted,
      iv: iv,
      authTag: authTag,
      encryptedKeyRef: `${keyId}:${encryptedKey}` // Store this in DB
    };
  } catch (error) {
    console.error('Encrypt document error:', error);
    throw new Error(`Failed to encrypt document: ${error.message}`);
  }
}

/**
 * Decrypt document using envelope encryption
 * @param {Buffer} encryptedData - Encrypted document buffer
 * @param {Buffer} iv - Initialization vector
 * @param {Buffer} authTag - Authentication tag
 * @param {string} encryptedKeyRef - Reference to encrypted data key
 * @returns {Promise<Buffer>} Decrypted file buffer
 */
async function decryptDocument(encryptedData, iv, authTag, encryptedKeyRef) {
  try {
    const kms = getKMS();
    
    // Parse encrypted key reference
    const keyParts = encryptedKeyRef.split(':');
    if (keyParts.length !== 2) {
      throw new Error('Invalid encrypted key reference format');
    }
    
    const keyId = keyParts[0];
    const encryptedKey = keyParts[1];
    
    // Decrypt data key from KMS
    const dataKey = await kms.decryptDataKey(encryptedKey, keyId);
    
    // Decrypt file with AES-256-GCM
    const decipher = crypto.createDecipheriv('aes-256-gcm', dataKey, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted;
  } catch (error) {
    console.error('Decrypt document error:', error);
    throw new Error(`Failed to decrypt document: ${error.message}`);
  }
}

/**
 * Rotate encryption key (re-encrypt with new key)
 * @param {string} oldEncryptedKeyRef - Old encrypted key reference
 * @returns {Promise<string>} New encrypted key reference
 */
async function rotateEncryptionKey(oldEncryptedKeyRef) {
  try {
    const kms = getKMS();
    
    // Decrypt with old key
    const keyParts = oldEncryptedKeyRef.split(':');
    const oldKeyId = keyParts[0];
    const oldEncryptedKey = keyParts[1];
    const oldDataKey = await kms.decryptDataKey(oldEncryptedKey, oldKeyId);
    
    // Generate new key and re-encrypt
    const newKeyData = await kms.generateDataKey();
    
    // In a real scenario, you would:
    // 1. Decrypt all documents with old key
    // 2. Re-encrypt with new key
    // 3. Update database records
    // This is a simplified version
    
    return `${newKeyData.keyId}:${newKeyData.encryptedKey}`;
  } catch (error) {
    console.error('Rotate encryption key error:', error);
    throw new Error(`Failed to rotate encryption key: ${error.message}`);
  }
}

module.exports = {
  encryptDocument,
  decryptDocument,
  rotateEncryptionKey
};

