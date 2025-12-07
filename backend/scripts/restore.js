/**
 * Disaster Recovery - Restore Script
 * Phase 1.4: Disaster Recovery
 */

const mongoose = require('mongoose');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const { getKMS } = require('../utils/kms');
require('dotenv').config();

class RestoreService {
  constructor() {
    this.s3Client = null;
    this.backupBucket = process.env.AWS_S3_BACKUP_BUCKET || process.env.BACKUP_S3_BUCKET;
    this.backupRegion = process.env.AWS_S3_BACKUP_REGION || process.env.BACKUP_S3_REGION || 'us-east-1';
    this.encryptionKeyRef = process.env.BACKUP_ENCRYPTION_KEY_REF;
    this.initialize();
  }

  initialize() {
    if (this.backupBucket) {
      this.s3Client = new S3Client({
        region: this.backupRegion,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      });
    }
  }

  /**
   * Restore MongoDB from backup
   * @param {string} backupPath - Path to backup file or S3 key
   * @param {boolean} fromS3 - Whether backup is in S3
   * @returns {Promise<{success: boolean, restored: number}>}
   */
  async restoreMongoDB(backupPath, fromS3 = false) {
    try {
      let backupData;
      
      if (fromS3 && this.s3Client) {
        // Download from S3
        const command = new GetObjectCommand({
          Bucket: this.backupBucket,
          Key: backupPath
        });
        
        const response = await this.s3Client.send(command);
        const chunks = [];
        for await (const chunk of response.Body) {
          chunks.push(chunk);
        }
        backupData = JSON.parse(Buffer.concat(chunks).toString());
      } else {
        // Read from local file
        let fileBuffer = fs.readFileSync(backupPath);
        
        // Decrypt if encrypted
        if (backupPath.endsWith('.encrypted')) {
          fileBuffer = await this.decryptBackup(fileBuffer);
        }
        
        backupData = JSON.parse(fileBuffer.toString());
      }

      // Connect to MongoDB
      await mongoose.connect(process.env.MONGODB_URI);
      
      let totalRestored = 0;

      // Restore each collection
      for (const [collectionName, documents] of Object.entries(backupData.collections)) {
        if (documents.length === 0) continue;
        
        const collection = mongoose.connection.db.collection(collectionName);
        
        // Clear existing data (optional - comment out to merge instead)
        // await collection.deleteMany({});
        
        // Insert documents
        if (documents.length > 0) {
          await collection.insertMany(documents, { ordered: false });
          totalRestored += documents.length;
          console.log(`✅ Restored ${documents.length} documents to ${collectionName}`);
        }
      }

      console.log(`✅ MongoDB restore completed: ${totalRestored} documents restored`);

      return {
        success: true,
        restored: totalRestored,
        database: backupData.database,
        timestamp: backupData.timestamp
      };
    } catch (error) {
      console.error('MongoDB restore error:', error);
      throw error;
    }
  }

  /**
   * Restore IPFS pin list
   * @param {string} backupPath - Path to backup file
   * @returns {Promise<{success: boolean, pins: any[]}>}
   */
  async restoreIPFSPinList(backupPath) {
    try {
      const pinList = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
      const { getIPFS } = require('../utils/ipfs');
      const { getPinningWorker } = require('../utils/ipfs-pinning-worker');
      
      const ipfs = getIPFS();
      const worker = getPinningWorker();
      
      let pinnedCount = 0;
      let failedCount = 0;

      for (const pin of pinList) {
        try {
          await worker.processPinningTask(pin.documentId, pin.cid);
          pinnedCount++;
        } catch (error) {
          console.error(`Failed to pin ${pin.cid}:`, error);
          failedCount++;
        }
      }

      console.log(`✅ IPFS pin list restore completed: ${pinnedCount} pinned, ${failedCount} failed`);

      return {
        success: true,
        pins: pinList,
        pinned: pinnedCount,
        failed: failedCount
      };
    } catch (error) {
      console.error('IPFS pin list restore error:', error);
      throw error;
    }
  }

  /**
   * Decrypt backup file
   * @private
   */
  async decryptBackup(encryptedBuffer) {
    try {
      const kms = getKMS();
      
      // Extract IV, auth tag, and encrypted data
      const iv = encryptedBuffer.slice(0, 12);
      const authTag = encryptedBuffer.slice(12, 28);
      const encrypted = encryptedBuffer.slice(28);
      
      // Decrypt data key from KMS
      const dataKey = await kms.decryptDataKey(this.encryptionKeyRef);
      
      // Decrypt file
      const decipher = crypto.createDecipheriv('aes-256-gcm', dataKey, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return decrypted;
    } catch (error) {
      console.error('Decrypt backup error:', error);
      throw error;
    }
  }

  /**
   * List available backups from S3
   * @returns {Promise<string[]>}
   */
  async listS3Backups() {
    try {
      if (!this.s3Client) {
        throw new Error('S3 client not configured');
      }

      const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
      const command = new ListObjectsV2Command({
        Bucket: this.backupBucket,
        Prefix: 'mongodb-backups/'
      });

      const response = await this.s3Client.send(command);
      return (response.Contents || []).map(obj => obj.Key);
    } catch (error) {
      console.error('List S3 backups error:', error);
      throw error;
    }
  }
}

// CLI execution
if (require.main === module) {
  const restoreService = new RestoreService();
  
  const command = process.argv[2];
  const backupPath = process.argv[3];
  const fromS3 = process.argv[4] === '--s3';
  
  (async () => {
    try {
      switch (command) {
        case 'mongodb':
          if (!backupPath) {
            console.error('Usage: node restore.js mongodb <backup-path> [--s3]');
            process.exit(1);
          }
          await restoreService.restoreMongoDB(backupPath, fromS3);
          break;
        case 'ipfs':
          if (!backupPath) {
            console.error('Usage: node restore.js ipfs <backup-path>');
            process.exit(1);
          }
          await restoreService.restoreIPFSPinList(backupPath);
          break;
        case 'list':
          const backups = await restoreService.listS3Backups();
          console.log('Available backups:');
          backups.forEach(backup => console.log(`  - ${backup}`));
          break;
        default:
          console.error('Usage: node restore.js <mongodb|ipfs|list> [backup-path] [--s3]');
          process.exit(1);
      }
      process.exit(0);
    } catch (error) {
      console.error('Restore failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = RestoreService;

