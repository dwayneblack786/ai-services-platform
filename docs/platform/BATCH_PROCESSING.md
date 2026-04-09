# Batch Processing & Queue Management

📑 **Table of Contents**
- [Overview](#overview)
- [Batch Operations](#batch-operations)
  - [Bulk Database Operations](#bulk-database-operations)
- [Job Queue Setup (BullMQ)](#job-queue-setup-bullmq)
  - [Queue Configuration](#queue-configuration)
  - [Email Queue with Worker](#email-queue-with-worker)
  - [Enqueue Jobs](#enqueue-jobs)
- [Report Generation Queue](#report-generation-queue)
- [Scheduled Tasks (Cron Jobs)](#scheduled-tasks-cron-jobs)
  - [Recurring Job Scheduling](#recurring-job-scheduling)
- [Data Import/Export](#data-importexport)
  - [Bulk Data Import](#bulk-data-import)
  - [Bulk Data Export](#bulk-data-export)
- [Queue Monitoring](#queue-monitoring)
- [Batch Processing Best Practices Checklist](#batch-processing-best-practices-checklist)
- [Related Documentation](#related-documentation)

---

## Overview

This guide covers batch processing, job queues, background task scheduling, and bulk operations in Node.js applications.

**Implementation Status:** Current backend uses simple asynchronous email sending through the email.service. BullMQ job queue is recommended for production systems requiring reliable job processing, retry logic, and scalability. This document covers both the current email implementation and recommended queue patterns.

**Batch Processing Principles:**
- Process large datasets efficiently
- Use queues for async operations
- Implement retry logic
- Monitor job progress
- Handle failures gracefully

## Batch Operations

### Bulk Database Operations

```typescript
// src/services/bulkOperations.ts
import { User } from '../models/User';

/**
 * Bulk insert with batching
 */
export async function bulkInsertUsers(users: any[]) {
  const batchSize = 1000;
  const totalBatches = Math.ceil(users.length / batchSize);

  console.log(`Starting bulk insert of ${users.length} users in ${totalBatches} batches`);

  let inserted = 0;

  for (let i = 0; i < totalBatches; i++) {
    const batch = users.slice(i * batchSize, (i + 1) * batchSize);

    try {
      const result = await User.insertMany(batch, { ordered: false });
      inserted += result.length;

      console.log(`Batch ${i + 1}/${totalBatches} completed. Inserted: ${inserted}`);
    } catch (error: any) {
      // Handle partial success
      if (error.writeErrors) {
        console.warn(`Batch ${i + 1} had ${error.writeErrors.length} failures`);
      }
    }
  }

  return inserted;
}

/**
 * Bulk update with filtering
 */
export async function bulkUpdateStatus(
  filter: any,
  newStatus: string
): Promise<number> {
  const result = await User.updateMany(filter, { status: newStatus });
  return result.modifiedCount;
}

/**
 * Bulk delete with streaming
 */
export async function bulkDeleteInactive(inactiveThresholdDays: number) {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - inactiveThresholdDays);

  const result = await User.deleteMany({
    lastLogin: { $lt: threshold },
  });

  return result.deletedCount;
}

/**
 * Streaming for memory efficiency
 */
export async function processLargeDataset(callback: (doc: any) => Promise<void>) {
  const stream = User.find().stream();

  stream.on('data', async (doc) => {
    stream.pause();
    try {
      await callback(doc);
    } finally {
      stream.resume();
    }
  });

  return new Promise((resolve, reject) => {
    stream.on('end', resolve);
    stream.on('error', reject);
  });
}
```

## Job Queue Setup (BullMQ)

### Queue Configuration

```typescript
// src/config/queue.ts
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

/**
 * Create queue with default options
 */
export function createQueue(name: string) {
  return new Queue(name, {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });
}

export const emailQueue = createQueue('email');
export const reportQueue = createQueue('reports');
export const dataProcessingQueue = createQueue('data-processing');

export default redis;
```

### Email Queue with Worker

```typescript
// src/workers/emailWorker.ts
import { Worker, Job } from 'bullmq';
import { emailQueue } from '../config/queue';
import { sendEmail } from '../services/emailService';

export const emailWorker = new Worker(
  'email',
  async (job: Job) => {
    const { to, subject, template, data } = job.data;

    try {
      console.log(`Processing email job ${job.id} to ${to}`);

      await sendEmail({
        to,
        subject,
        template,
        data,
      });

      // Update progress
      job.progress(100);

      return { success: true, messageId: job.id };
    } catch (error) {
      console.error(`Email job ${job.id} failed:`, error);
      throw error; // Trigger retry
    }
  },
  {
    connection: redis,
    concurrency: 5, // Process 5 emails concurrently
  }
);

// Listen to job events
emailWorker.on('completed', (job: Job) => {
  console.log(`Email job ${job.id} completed`);
});

emailWorker.on('failed', (job: Job, err: Error) => {
  console.error(`Email job ${job.id} failed: ${err.message}`);
});

emailWorker.on('progress', (job: Job, progress: number) => {
  console.log(`Email job ${job.id} progress: ${progress}%`);
});
```

### Enqueue Jobs

```typescript
// src/services/emailService.ts
import { emailQueue } from '../config/queue';

/**
 * Send email asynchronously via queue
 */
export async function queueEmail(
  to: string,
  subject: string,
  template: string,
  data: any
) {
  await emailQueue.add(
    'send-email',
    { to, subject, template, data },
    {
      priority: 10, // Higher priority emails
      delay: 0,
    }
  );
}

/**
 * Send bulk emails
 */
export async function queueBulkEmails(
  recipients: Array<{ email: string; name: string }>
) {
  const jobs = recipients.map(recipient =>
    emailQueue.add(
      'send-email',
      {
        to: recipient.email,
        subject: 'Welcome!',
        template: 'welcome',
        data: { name: recipient.name },
      },
      { delay: Math.random() * 5000 } // Spread emails over time
    )
  );

  return Promise.all(jobs);
}
```

## Report Generation Queue

```typescript
// src/workers/reportWorker.ts
import { Worker, Job } from 'bullmq';
import { reportQueue } from '../config/queue';

export const reportWorker = new Worker(
  'reports',
  async (job: Job) => {
    const { reportType, tenantId, filters, outputPath } = job.data;

    try {
      job.progress(10);
      const data = await fetchReportData(reportType, tenantId, filters);

      job.progress(50);
      const report = await generateReport(reportType, data);

      job.progress(80);
      await saveReport(report, outputPath);

      job.progress(100);

      // Store report in database
      await saveReportMetadata({
        tenantId,
        reportType,
        generatedAt: new Date(),
        filePath: outputPath,
        status: 'completed',
      });

      return { success: true, path: outputPath };
    } catch (error) {
      throw error;
    }
  },
  { connection: redis, concurrency: 1 } // Only one report at a time
);

/**
 * Queue report generation
 */
export async function generateReportAsync(
  reportType: string,
  tenantId: string,
  filters: any
) {
  const job = await reportQueue.add(
    'generate',
    {
      reportType,
      tenantId,
      filters,
      outputPath: `/reports/${tenantId}/${Date.now()}.pdf`,
    },
    {
      removeOnComplete: true,
      attempts: 2, // Retry once for reports
    }
  );

  return job.id;
}

/**
 * Track report generation progress
 */
export async function getReportProgress(jobId: string) {
  const job = await reportQueue.getJob(jobId);
  if (!job) {
    return null;
  }

  return {
    id: job.id,
    progress: job.progress(),
    state: await job.getState(),
  };
}
```

## Scheduled Tasks (Cron Jobs)

### Recurring Job Scheduling

```typescript
// src/workers/scheduledTasks.ts
import { Worker, Queue } from 'bullmq';
import cron from 'node-cron';
import redis from '../config/queue';

const scheduledQueue = new Queue('scheduled', { connection: redis });

/**
 * Schedule cleanup of old data
 */
export function scheduleCleanupTasks() {
  // Every day at 2 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('Running daily cleanup task');

    await scheduledQueue.add(
      'cleanup-old-sessions',
      {},
      {
        jobId: `cleanup-${Date.now()}`,
        repeat: { cron: '0 2 * * *' },
      }
    );
  });

  // Every hour
  cron.schedule('0 * * * *', async () => {
    await scheduledQueue.add(
      'health-check',
      {},
      {
        repeat: { cron: '0 * * * *' },
      }
    );
  });
}

/**
 * Worker for scheduled tasks
 */
export const scheduledWorker = new Worker(
  'scheduled',
  async (job) => {
    switch (job.name) {
      case 'cleanup-old-sessions':
        console.log('Cleaning up old sessions...');
        const deleted = await cleanupOldSessions(7); // 7 days old
        return { deleted };

      case 'health-check':
        console.log('Running health check...');
        const healthy = await performHealthCheck();
        return { healthy };

      default:
        throw new Error(`Unknown task: ${job.name}`);
    }
  },
  { connection: redis }
);

async function cleanupOldSessions(daysOld: number): Promise<number> {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - daysOld);
  const result = await Session.deleteMany({ createdAt: { $lt: threshold } });
  return result.deletedCount;
}

async function performHealthCheck(): Promise<boolean> {
  // Check database connection, Redis, external services
  return true;
}
```

## Data Import/Export

### Bulk Data Import

```typescript
// src/services/importService.ts
import { dataProcessingQueue } from '../config/queue';

/**
 * Queue bulk import
 */
export async function importUsersCsv(filePath: string) {
  const job = await dataProcessingQueue.add(
    'import-users',
    { filePath },
    {
      jobId: `import-${Date.now()}`,
    }
  );

  return job.id;
}

/**
 * Worker for data import
 */
export const importWorker = new Worker(
  'data-processing',
  async (job) => {
    const { filePath } = job.data;
    const results = { imported: 0, failed: 0, errors: [] };

    try {
      const users = await readCsvFile(filePath);
      const total = users.length;

      for (let i = 0; i < users.length; i++) {
        try {
          const user = new User(users[i]);
          await user.save();
          results.imported++;
        } catch (error: any) {
          results.failed++;
          results.errors.push({
            row: i + 1,
            error: error.message,
          });
        }

        // Update progress every 10 records
        if ((i + 1) % 10 === 0) {
          job.progress(((i + 1) / total) * 100);
        }
      }

      return results;
    } catch (error) {
      throw error;
    }
  },
  { connection: redis }
);
```

### Bulk Data Export

```typescript
// src/services/exportService.ts
/**
 * Queue bulk export
 */
export async function exportUsersToCSV(
  tenantId: string,
  format: 'csv' | 'json' = 'csv'
) {
  const job = await dataProcessingQueue.add(
    'export-users',
    { tenantId, format },
    {
      jobId: `export-${Date.now()}`,
    }
  );

  return job.id;
}

/**
 * Export worker
 */
export const exportWorker = new Worker(
  'data-processing',
  async (job) => {
    if (job.name === 'export-users') {
      const { tenantId, format } = job.data;
      const outputPath = `/exports/${tenantId}-${Date.now()}.${format === 'csv' ? 'csv' : 'json'}`;

      const users = await User.find({ tenantId });
      job.progress(50);

      if (format === 'csv') {
        await exportToCsv(users, outputPath);
      } else {
        await exportToJson(users, outputPath);
      }

      job.progress(100);

      return { success: true, path: outputPath };
    }
  },
  { connection: redis }
);
```

## Queue Monitoring

```typescript
// src/monitoring/queueMonitoring.ts
export class QueueMonitoring {
  /**
   * Get queue statistics
   */
  static async getQueueStats(queue: Queue) {
    const counts = await queue.getJobCounts();

    return {
      active: counts.active,
      waiting: counts.waiting,
      completed: counts.completed,
      failed: counts.failed,
      delayed: counts.delayed,
    };
  }

  /**
   * Monitor queue health
   */
  static async monitorQueueHealth(queue: Queue) {
    setInterval(async () => {
      const stats = await this.getQueueStats(queue);

      console.log(`Queue ${queue.name} stats:`, stats);

      // Alert if too many failures
      if (stats.failed > 100) {
        console.error(`High failure rate detected in ${queue.name}`);
      }

      // Alert if queue is backed up
      if (stats.waiting > 1000) {
        console.warn(`Queue ${queue.name} is backed up with ${stats.waiting} waiting jobs`);
      }
    }, 60000); // Check every minute
  }
}
```

## Batch Processing Best Practices Checklist

- [ ] Use queues for long-running operations
- [ ] Implement retry logic with exponential backoff
- [ ] Monitor job progress
- [ ] Handle failures gracefully
- [ ] Use batch operations for bulk writes
- [ ] Stream large datasets to save memory
- [ ] Implement idempotent operations
- [ ] Set appropriate concurrency levels
- [ ] Remove completed jobs to save memory
- [ ] Log detailed error information
- [ ] Monitor queue health regularly
- [ ] Set job timeouts
- [ ] Implement dead-letter queues for failed jobs
- [ ] Track job metrics and performance
- [ ] Test queue behavior under load

## Related Documentation

- [SERVICE_PATTERNS.md](SERVICE_PATTERNS.md) - Service patterns
- [DATABASE_PATTERNS.md](DATABASE_PATTERNS.md) - Database patterns
- [CACHING_STRATEGIES.md](CACHING_STRATEGIES.md) - Caching patterns
- [LOGGING_MONITORING.md](LOGGING_MONITORING.md) - Monitoring strategies

