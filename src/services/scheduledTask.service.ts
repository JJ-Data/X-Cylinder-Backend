import * as cron from 'node-cron';
import { OverdueService } from './overdue.service';
import { config } from '@config/environment';

export interface ScheduledTask {
  name: string;
  schedule: string;
  task: cron.ScheduledTask;
  description: string;
  lastRun?: Date;
  nextRun?: Date;
  enabled: boolean;
}

export class ScheduledTaskService {
  private static tasks: Map<string, ScheduledTask> = new Map();
  private static initialized = false;

  /**
   * Initialize all scheduled tasks
   */
  public static initialize(): void {
    if (this.initialized) {
      console.log('Scheduled tasks already initialized');
      return;
    }

    try {
      // Daily overdue check - runs at 9:00 AM every day
      this.scheduleOverdueCheck();

      // Daily statistics update - runs at 11:00 PM every day
      this.scheduleStatisticsUpdate();

      this.initialized = true;
      console.log(`Initialized ${this.tasks.size} scheduled tasks`);
    } catch (error) {
      console.error('Failed to initialize scheduled tasks:', error);
    }
  }

  /**
   * Schedule daily overdue check
   */
  private static scheduleOverdueCheck(): void {
    const overdueSchedule = process.env.OVERDUE_CHECK_SCHEDULE || '0 9 * * *'; // 9:00 AM daily
    
    const task = cron.schedule(
      overdueSchedule,
      async () => {
        try {
          console.log('Starting daily overdue check...');
          const result = await OverdueService.processOverdueLeases();
          
          console.log(`Overdue check completed:`, {
            processed: result.processed,
            notificationsSent: result.notificationsSent,
            errors: result.errors.length
          });

          if (result.errors.length > 0) {
            console.error('Overdue check errors:', result.errors);
          }

          this.updateTaskRunInfo('overdueCheck');
        } catch (error) {
          console.error('Daily overdue check failed:', error);
        }
      },
      {
        timezone: process.env.TIMEZONE || 'UTC'
      }
    );

    const scheduledTask: ScheduledTask = {
      name: 'overdueCheck',
      schedule: overdueSchedule,
      task,
      description: 'Daily check for overdue lease returns and send notifications',
      enabled: true
    };

    this.tasks.set('overdueCheck', scheduledTask);
    console.log(`Scheduled overdue check task: ${overdueSchedule}`);
  }

  /**
   * Schedule daily statistics update
   */
  private static scheduleStatisticsUpdate(): void {
    const statsSchedule = process.env.STATS_UPDATE_SCHEDULE || '0 23 * * *'; // 11:00 PM daily
    
    const task = cron.schedule(
      statsSchedule,
      async () => {
        try {
          console.log('Starting daily statistics update...');
          
          // Get overdue statistics
          const overdueStats = await OverdueService.getOverdueStatistics();
          console.log('Daily overdue statistics:', overdueStats);

          // Here you could store these stats in a database or send to monitoring
          this.updateTaskRunInfo('statisticsUpdate');
        } catch (error) {
          console.error('Daily statistics update failed:', error);
        }
      },
      {
        timezone: process.env.TIMEZONE || 'UTC'
      }
    );

    const scheduledTask: ScheduledTask = {
      name: 'statisticsUpdate',
      schedule: statsSchedule,
      task,
      description: 'Daily statistics update and reporting',
      enabled: true
    };

    this.tasks.set('statisticsUpdate', scheduledTask);
    console.log(`Scheduled statistics update task: ${statsSchedule}`);
  }

  /**
   * Update task run information
   */
  private static updateTaskRunInfo(taskName: string): void {
    const task = this.tasks.get(taskName);
    if (task) {
      task.lastRun = new Date();
      // Calculate next run time based on cron expression
      // This is a simplified calculation - for production, consider using a cron parser library
      const now = new Date();
      const nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Simplified: next day
      task.nextRun = nextRun;
    }
  }

  /**
   * Start a specific task
   */
  public static startTask(taskName: string): boolean {
    const scheduledTask = this.tasks.get(taskName);
    if (!scheduledTask) {
      console.error(`Task '${taskName}' not found`);
      return false;
    }

    if (scheduledTask.enabled) {
      console.log(`Task '${taskName}' is already running`);
      return true;
    }

    scheduledTask.task.start();
    scheduledTask.enabled = true;
    console.log(`Started task: ${taskName}`);
    return true;
  }

  /**
   * Stop a specific task
   */
  public static stopTask(taskName: string): boolean {
    const scheduledTask = this.tasks.get(taskName);
    if (!scheduledTask) {
      console.error(`Task '${taskName}' not found`);
      return false;
    }

    if (!scheduledTask.enabled) {
      console.log(`Task '${taskName}' is already stopped`);
      return true;
    }

    scheduledTask.task.stop();
    scheduledTask.enabled = false;
    console.log(`Stopped task: ${taskName}`);
    return true;
  }

  /**
   * Manually trigger a task
   */
  public static async triggerTask(taskName: string): Promise<boolean> {
    try {
      switch (taskName) {
        case 'overdueCheck':
          console.log('Manually triggering overdue check...');
          const result = await OverdueService.processOverdueLeases();
          console.log('Manual overdue check completed:', {
            processed: result.processed,
            notificationsSent: result.notificationsSent,
            errors: result.errors.length
          });
          this.updateTaskRunInfo('overdueCheck');
          return true;

        case 'statisticsUpdate':
          console.log('Manually triggering statistics update...');
          const stats = await OverdueService.getOverdueStatistics();
          console.log('Manual statistics update completed:', stats);
          this.updateTaskRunInfo('statisticsUpdate');
          return true;

        default:
          console.error(`Unknown task: ${taskName}`);
          return false;
      }
    } catch (error) {
      console.error(`Failed to trigger task '${taskName}':`, error);
      return false;
    }
  }

  /**
   * Get all scheduled tasks status
   */
  public static getTasksStatus(): ScheduledTask[] {
    return Array.from(this.tasks.values()).map(task => ({
      ...task,
      task: undefined as any // Don't expose the actual cron task object
    }));
  }

  /**
   * Get specific task status
   */
  public static getTaskStatus(taskName: string): ScheduledTask | null {
    const task = this.tasks.get(taskName);
    if (!task) return null;

    return {
      ...task,
      task: undefined as any // Don't expose the actual cron task object
    };
  }

  /**
   * Stop all tasks (useful for graceful shutdown)
   */
  public static stopAllTasks(): void {
    console.log('Stopping all scheduled tasks...');
    
    for (const [name, scheduledTask] of this.tasks) {
      if (scheduledTask.enabled) {
        scheduledTask.task.stop();
        scheduledTask.enabled = false;
        console.log(`Stopped task: ${name}`);
      }
    }

    console.log('All scheduled tasks stopped');
  }

  /**
   * Validate cron expression
   */
  public static validateCronExpression(expression: string): boolean {
    return cron.validate(expression);
  }

  /**
   * Add custom scheduled task
   */
  public static addCustomTask(
    name: string,
    schedule: string,
    taskFunction: () => Promise<void>,
    description: string
  ): boolean {
    if (this.tasks.has(name)) {
      console.error(`Task '${name}' already exists`);
      return false;
    }

    if (!this.validateCronExpression(schedule)) {
      console.error(`Invalid cron expression: ${schedule}`);
      return false;
    }

    try {
      const task = cron.schedule(
        schedule,
        async () => {
          try {
            console.log(`Running custom task: ${name}`);
            await taskFunction();
            this.updateTaskRunInfo(name);
            console.log(`Completed custom task: ${name}`);
          } catch (error) {
            console.error(`Custom task '${name}' failed:`, error);
          }
        },
        {
            timezone: process.env.TIMEZONE || 'UTC'
        }
      );

      const scheduledTask: ScheduledTask = {
        name,
        schedule,
        task,
        description,
        enabled: true
      };

      this.tasks.set(name, scheduledTask);
      console.log(`Added custom task: ${name} (${schedule})`);
      return true;
    } catch (error) {
      console.error(`Failed to add custom task '${name}':`, error);
      return false;
    }
  }

  /**
   * Remove custom task
   */
  public static removeCustomTask(name: string): boolean {
    const scheduledTask = this.tasks.get(name);
    if (!scheduledTask) {
      console.error(`Task '${name}' not found`);
      return false;
    }

    // Don't allow removal of system tasks
    if (['overdueCheck', 'statisticsUpdate'].includes(name)) {
      console.error(`Cannot remove system task: ${name}`);
      return false;
    }

    scheduledTask.task.stop();
    this.tasks.delete(name);
    console.log(`Removed custom task: ${name}`);
    return true;
  }
}