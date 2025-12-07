/**
 * Disaster Recovery - Automated Backup Script
 * Phase 1.4: Disaster Recovery
 */

const mongoose = require('mongoose');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { getKMS } = require('../utils/kms');
require('dotenv').config();

class BackupService {
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
   * Backup MongoDB database
   * @returns {Promise<{success: boolean, backupPath: string, size: number}>}
   */
  async backupMongoDB() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(__dirname, '../backups');
      
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const backupFile = path.join(backupDir, `mongodb-backup-${timestamp}.json`);
      
      // Connect to MongoDB
      await mongoose.connect(process.env.MONGODB_URI);
      
      // Get all collections
      const collections = await mongoose.connection.db.listCollections().toArray();
      const backupData = {
        timestamp: new Date().toISOString(),
        database: mongoose.connection.db.databaseName,
        collections: {}
      };

      // Backup each collection
      for (const collection of collections) {
        const collectionName = collection.name;
        const documents = await mongoose.connection.db.collection(collectionName).find({}).toArray();
        backupData.collections[collectionName] = documents;
      }

      // Write backup file
      fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
      const fileSize = fs.statSync(backupFile).size;

      // Encrypt backup if encryption key is configured
      let encryptedBackup = null;
      if (this.encryptionKeyRef) {
        encryptedBackup = await this.encryptBackup(backupFile);
      }

      // Upload to S3 if configured
      if (this.s3Client && this.backupBucket) {
        const s3Key = `mongodb-backups/${timestamp}/backup.json`;
        await this.uploadToS3(encryptedBackup || backupFile, s3Key);
      }

      console.log(`✅ MongoDB backup completed: ${backupFile} (${fileSize} bytes)`);

      return {
        success: true,
        backupPath: backupFile,
        size: fileSize,
        s3Key: this.s3Client ? `mongodb-backups/${timestamp}/backup.json` : null
      };
    } catch (error) {
      console.error('MongoDB backup error:', error);
      throw error;
    }
  }

  /**
   * Backup IPFS pin list
   * @returns {Promise<{success: boolean, pinList: any[], count: number}>}
   */
  async backupIPFSPinList() {
    try {
      const { getIPFS } = require('../utils/ipfs');
      const Document = require('../models/Document');
      
      // Get all documents with IPFS CIDs
      const documents = await Document.find({
        ipfsHash: { $exists: true, $ne: '' }
      }).select('_id ipfsHash ipfsPinStatus');

      const pinList = documents.map(doc => ({
        documentId: doc._id.toString(),
        cid: doc.ipfsHash,
        pinStatus: doc.ipfsPinStatus || {}
      }));

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(__dirname, '../backups');
      
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const backupFile = path.join(backupDir, `ipfs-pinlist-${timestamp}.json`);
      fs.writeFileSync(backupFile, JSON.stringify(pinList, null, 2));

      // Upload to S3 if configured
      if (this.s3Client && this.backupBucket) {
        const s3Key = `ipfs-pinlists/${timestamp}/pinlist.json`;
        await this.uploadToS3(backupFile, s3Key);
      }

      console.log(`✅ IPFS pin list backup completed: ${backupFile} (${pinList.length} pins)`);

      return {
        success: true,
        pinList: pinList,
        count: pinList.length,
        backupPath: backupFile
      };
    } catch (error) {
      console.error('IPFS pin list backup error:', error);
      throw error;
    }
  }

  /**
   * Encrypt backup file
   * @private
   */
  async encryptBackup(backupFile) {
    try {
      const kms = getKMS();
      const fileBuffer = fs.readFileSync(backupFile);
      
      // Generate encryption key
      const keyData = await kms.generateDataKey(this.encryptionKeyRef);
      
      // Encrypt file
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', keyData.plaintextKey, iv);
      let encrypted = cipher.update(fileBuffer);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      const authTag = cipher.getAuthTag();
      
      // Combine encrypted data with IV and auth tag
      const encryptedData = Buffer.concat([iv, authTag, encrypted]);
      
      // Save encrypted backup
      const encryptedFile = backupFile + '.encrypted';
      fs.writeFileSync(encryptedFile, encryptedData);
      
      return encryptedFile;
    } catch (error) {
      console.error('Encrypt backup error:', error);
      throw error;
    }
  }

  /**
   * Upload file to S3
   * @private
   */
  async uploadToS3(filePath, s3Key) {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      
      const command = new PutObjectCommand({
        Bucket: this.backupBucket,
        Key: s3Key,
        Body: fileBuffer,
        ServerSideEncryption: 'AES256',
        Metadata: {
          'backup-date': new Date().toISOString(),
          'backup-type': filePath.includes('mongodb') ? 'mongodb' : 'ipfs'
        }
      });

      await this.s3Client.send(command);
      console.log(`✅ Uploaded to S3: s3://${this.backupBucket}/${s3Key}`);
    } catch (error) {
      console.error('S3 upload error:', error);
      throw error;
    }
  }

  /**
   * Cleanup old backups (local)
   * @param {number} retentionDays - Days to retain backups
   */
  async cleanupOldBackups(retentionDays = 30) {
    try {
      const backupDir = path.join(__dirname, '../backups');
      if (!fs.existsSync(backupDir)) {
        return;
      }

      const files = fs.readdirSync(backupDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      let deletedCount = 0;
      for (const file of files) {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }

      console.log(`✅ Cleaned up ${deletedCount} old backup files`);
      return deletedCount;
    } catch (error) {
      console.error('Cleanup error:', error);
      throw error;
    }
  }

  /**
   * Full backup (MongoDB + IPFS)
   * @returns {Promise<{mongodb: any, ipfs: any}>}
   */
  async fullBackup() {
    try {
      console.log('🔄 Starting full backup...');
      
      const mongodbBackup = await this.backupMongoDB();
      const ipfsBackup = await this.backupIPFSPinList();
      
      // Cleanup old backups
      const retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS) || 30;
      await this.cleanupOldBackups(retentionDays);
      
      console.log('✅ Full backup completed successfully');
      
      return {
        mongodb: mongodbBackup,
        ipfs: ipfsBackup,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Full backup error:', error);
      throw error;
    }
  }
}

// CLI execution
if (require.main === module) {
  const backupService = new BackupService();
  
  const command = process.argv[2] || 'full';
  
  (async () => {
    try {
      switch (command) {
        case 'mongodb':
          await backupService.backupMongoDB();
          break;
        case 'ipfs':
          await backupService.backupIPFSPinList();
          break;
        case 'full':
        default:
          await backupService.fullBackup();
          break;
      }
      process.exit(0);
    } catch (error) {
      console.error('Backup failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = BackupService;

