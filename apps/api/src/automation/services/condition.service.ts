import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent } from '../interfaces/domain-event.interface';
import { operatorRegistry } from './condition-operators';
import { ConditionEvaluationException } from '../errors/automation.errors';
import { Operator } from '@prisma/client';

@Injectable()
export class ConditionService {
  private readonly logger = new Logger(ConditionService.name);

  evaluateConditions(
    conditions: Array<{ field: string; operator: string; value: string }>,
    event: DomainEvent,
  ): boolean {
    if (conditions.length === 0) return true;

    for (const condition of conditions) {
      const fieldValue = this.getNestedValue(event, condition.field);
      const expectedValue = condition.value;
      const operator = operatorRegistry[condition.operator as Operator];

      if (!operator) {
        throw new ConditionEvaluationException(
          `Operator ${condition.operator} is not registered`,
        );
      }

      let match = false;
      try {
        match = operator.evaluate(fieldValue, expectedValue);
      } catch (error) {
        throw new ConditionEvaluationException(
          `Failed to evaluate operator ${condition.operator} on path "${condition.field}": ${(error as Error).message}`,
        );
      }

      this.logger.debug(
        `Evaluating condition on field "${condition.field}". Got: "${fieldValue}", Expected: "${expectedValue}" using ${condition.operator}. Result: ${match}`,
      );

      if (!match) {
        return false; // All conditions must match (AND logic)
      }
    }

    return true;
  }

  private getNestedValue(obj: unknown, path: string): string {
    if (!obj || !path) return '';

    // Normalize old path schemes to new content scheme for schema backward compatibility
    let normalizedPath = path;
    if (path.startsWith('message.')) {
      normalizedPath = path.replace('message.', 'content.');
    } else if (path.startsWith('comment.')) {
      normalizedPath = path.replace('comment.', 'content.');
    }

    const parts = normalizedPath.split('.');
    let current: unknown = obj;
    for (const part of parts) {
      if (
        current === null ||
        current === undefined ||
        typeof current !== 'object'
      ) {
        return '';
      }
      current = (current as Record<string, unknown>)[part];
    }
    if (current === null || current === undefined) {
      return '';
    }
    if (typeof current === 'string') {
      return current;
    }
    if (typeof current === 'number' || typeof current === 'boolean') {
      return String(current);
    }
    if (typeof current === 'object') {
      return JSON.stringify(current);
    }
    return '';
  }
}
