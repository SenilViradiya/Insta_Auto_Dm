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

  process(job: Job<unknown, unknown, string>): Promise<unknown> {
    const { name, data } = job;
    const typedData = data as
      | {
          executionId?: string;
          automationId?: string;
          event?: { eventId?: string; instagramAccountId?: string };
        }
      | null
      | undefined;

    const structuredLogContext = {
      executionId: typedData?.executionId,
      automationId: typedData?.automationId,
      eventId: typedData?.event?.eventId,
      instagramAccountId: typedData?.event?.instagramAccountId,
      workerName: 'AutomationWorker',
    };

    this.logger.log(
      `[AutomationWorker] Monitoring execution job: ${name} (id: ${job.id})`,
      JSON.stringify(structuredLogContext),
    );
    return Promise.resolve({ status: 'logged', name });
  }
}
