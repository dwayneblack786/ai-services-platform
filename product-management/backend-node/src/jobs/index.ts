import cron from 'node-cron';

/**
 * Job Queue Infrastructure
 * Central registry for all background jobs and scheduled tasks
 */

interface Job {
  name: string;
  schedule: string; // Cron expression
  task: () => Promise<void>;
  enabled: boolean;
}

class JobScheduler {
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private registry: Job[] = [];

  /**
   * Register a new job
   */
  register(job: Job): void {
    this.registry.push(job);
    console.log(`[JobScheduler] Registered job: ${job.name} (${job.schedule})`);
  }

  /**
   * Start all registered jobs
   */
  startAll(): void {
    console.log(`[JobScheduler] Starting ${this.registry.length} jobs...`);

    for (const job of this.registry) {
      if (!job.enabled) {
        console.log(`[JobScheduler] Skipping disabled job: ${job.name}`);
        continue;
      }

      // Validate cron expression
      if (!cron.validate(job.schedule)) {
        console.error(`[JobScheduler] Invalid cron expression for job ${job.name}: ${job.schedule}`);
        continue;
      }

      // Schedule the job
      const task = cron.schedule(job.schedule, async () => {
        console.log(`[JobScheduler] Running job: ${job.name}`);
        const startTime = Date.now();

        try {
          await job.task();
          const duration = Date.now() - startTime;
          console.log(`[JobScheduler] Job ${job.name} completed in ${duration}ms`);
        } catch (error: any) {
          console.error(`[JobScheduler] Job ${job.name} failed:`, error);
        }
      });

      this.jobs.set(job.name, task);
      console.log(`[JobScheduler] Started job: ${job.name}`);
    }

    console.log(`[JobScheduler] All jobs started`);
  }

  /**
   * Stop all jobs
   */
  stopAll(): void {
    console.log(`[JobScheduler] Stopping all jobs...`);

    for (const [name, task] of this.jobs.entries()) {
      task.stop();
      console.log(`[JobScheduler] Stopped job: ${name}`);
    }

    this.jobs.clear();
    console.log(`[JobScheduler] All jobs stopped`);
  }

  /**
   * Stop a specific job
   */
  stop(jobName: string): void {
    const task = this.jobs.get(jobName);

    if (task) {
      task.stop();
      this.jobs.delete(jobName);
      console.log(`[JobScheduler] Stopped job: ${jobName}`);
    } else {
      console.warn(`[JobScheduler] Job not found: ${jobName}`);
    }
  }

  /**
   * Get list of registered jobs
   */
  list(): string[] {
    return this.registry.map(job => `${job.name} (${job.schedule}) - ${job.enabled ? 'enabled' : 'disabled'}`);
  }
}

// Singleton instance
export const jobScheduler = new JobScheduler();

/**
 * Initialize and start all jobs
 * This should be called from the main server file after database connection
 */
export function initializeJobs(): void {
  console.log('[JobScheduler] Initializing job queue...');

  // Jobs will be registered here as they are created
  // Example:
  // import { checkAbandonedSignupsJob } from './checkAbandonedSignups.job';
  // jobScheduler.register(checkAbandonedSignupsJob);

  // Start all registered jobs
  jobScheduler.startAll();
}

/**
 * Gracefully shutdown all jobs
 */
export function shutdownJobs(): void {
  console.log('[JobScheduler] Shutting down job queue...');
  jobScheduler.stopAll();
}
