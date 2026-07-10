import { Injectable } from '@nestjs/common';
import { TriggerType } from '@prisma/client';
import { TriggerStrategy } from '../interfaces/trigger.interface';
import { TriggerRegistry } from './trigger.registry';
import { UnknownTriggerException } from '../errors/automation.errors';

@Injectable()
export class TriggerResolver {
  constructor(private readonly registry: TriggerRegistry) {}

  resolve(type: TriggerType): TriggerStrategy {
    const strategy = this.registry.get(type);
    if (!strategy) {
      throw new UnknownTriggerException(`No trigger strategy implementation found for type: ${type}`);
    }
    return strategy;
  }
}
