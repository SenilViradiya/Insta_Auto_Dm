import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor('automation')
@Injectable()
export class AutomationWorker extends WorkerHost {
  private readonly logger = new Logger(AutomationWorker.name);

  constructor() {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { name, data } = job;
    const structuredLogContext = {
      executionId: data?.executionId,
      automationId: data?.automationId,
      eventId: data?.event?.eventId,
      instagramAccountId: data?.event?.instagramAccountId,
      workerName: 'AutomationWorker',
    };

    this.logger.log(
      `[AutomationWorker] Monitoring execution job: ${name} (id: ${job.id})`,
      JSON.stringify(structuredLogContext),
    );
    return { status: 'logged', name };
  }
}
