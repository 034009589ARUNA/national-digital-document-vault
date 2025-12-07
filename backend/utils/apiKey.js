const crypto = require('crypto');

/**
 * Generate secure API key
 */
const generateAPIKey = () => {
  // Generate a 64-character random string
  const key = crypto.randomBytes(32).toString('hex');
  // Prefix with 'sv_' (Sierra Vault) for identification
  return `sv_${key}`;
};

/**
 * Hash API key for storage
 */
const hashAPIKey = (apiKey) => {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
};

/**
 * Verify API key
 */
const verifyAPIKey = (providedKey, storedHash) => {
  const providedHash = hashAPIKey(providedKey);
  return providedHash === storedHash;
};

module.exports = {
  generateAPIKey,
  hashAPIKey,
  verifyAPIKey
};

