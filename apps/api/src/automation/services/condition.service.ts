import { Injectable, Logger } from '@nestjs/common';
import { AutomationCondition } from '@prisma/client';
import { DomainEvent } from '../interfaces/domain-event.interface';
import { operatorRegistry } from './condition-operators';

@Injectable()
export class ConditionService {
  private readonly logger = new Logger(ConditionService.name);

  evaluateConditions(
    conditions: AutomationCondition[],
    event: DomainEvent,
  ): boolean {
    if (conditions.length === 0) return true;

    for (const condition of conditions) {
      const fieldValue = this.getNestedValue(event, condition.field);
      const expectedValue = condition.value;
      const operator = operatorRegistry[condition.operator];

      if (!operator) {
        this.logger.error(`Operator ${condition.operator} is not registered`);
        return false;
      }

      const match = operator.evaluate(fieldValue, expectedValue);
      this.logger.debug(
        `Evaluating condition on field "${condition.field}". Got: "${fieldValue}", Expected: "${expectedValue}" using ${condition.operator}. Result: ${match}`,
      );

      if (!match) {
        return false; // All conditions must match (AND logic)
      }
    }

    return true;
  }

  private getNestedValue(obj: any, path: string): string {
    if (!obj || !path) return '';

    // Normalize old path schemes to new content scheme for schema backward compatibility
    let normalizedPath = path;
    if (path.startsWith('message.')) {
      normalizedPath = path.replace('message.', 'content.');
    } else if (path.startsWith('comment.')) {
      normalizedPath = path.replace('comment.', 'content.');
    }

    const parts = normalizedPath.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) {
        return '';
      }
      current = current[part];
    }
    if (current === null || current === undefined) {
      return '';
    }
    return typeof current === 'object'
      ? JSON.stringify(current)
      : String(current);
  }
}
