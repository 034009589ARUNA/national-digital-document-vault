/**
 * Backup Scheduler using node-cron
 * Phase 1.4: Disaster Recovery
 */

const cron = require('node-cron');
const BackupService = require('../scripts/backup');

class BackupScheduler {
  constructor() {
    this.backupService = new BackupService();
    this.jobs = [];
  }

  /**
   * Start scheduled backups
   */
  start() {
    const schedule = process.env.BACKUP_SCHEDULE || '0 2 * * *'; // Daily at 2 AM
    
    console.log(`📅 Starting backup scheduler with schedule: ${schedule}`);
    
    const job = cron.schedule(schedule, async () => {
      try {
        console.log('🔄 Scheduled backup started...');
        await this.backupService.fullBackup();
        console.log('✅ Scheduled backup completed');
      } catch (error) {
        console.error('❌ Scheduled backup failed:', error);
        // In production, send alert to monitoring system
      }
    }, {
      scheduled: true,
      timezone: "UTC"
    });

    this.jobs.push(job);
    console.log('✅ Backup scheduler started');
  }

  /**
   * Stop scheduled backups
   */
  stop() {
    this.jobs.forEach(job => job.stop());
    console.log('⏹️  Backup scheduler stopped');
  }
}

// Singleton instance
let schedulerInstance = null;

function getScheduler() {
  if (!schedulerInstance) {
    schedulerInstance = new BackupScheduler();
  }
  return schedulerInstance;
}

module.exports = {
  BackupScheduler,
  getScheduler
};

