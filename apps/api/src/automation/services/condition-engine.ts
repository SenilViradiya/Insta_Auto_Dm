import { Injectable, Logger } from '@nestjs/common';
import { Operator } from '@prisma/client';
import { operatorRegistry } from './condition-operators';
import { ConditionException } from '../errors/automation.errors';

export interface ConditionItem {
  field: string;
  operator: Operator | string;
  value: string;
}

export interface ConditionGroup {
  conjunction: 'AND' | 'OR';
  conditions: ConditionItem[];
  groups?: ConditionGroup[];
}

export interface ConditionResult {
  matched: boolean;
  reason?: string;
}

@Injectable()
export class ConditionEngine {
  private readonly logger = new Logger(ConditionEngine.name);

  evaluateFlat(conditions: ConditionItem[], context: any): ConditionResult {
    if (!conditions || conditions.length === 0) {
      return { matched: true };
    }

    // Default flat list matches with AND conjunction
    const group: ConditionGroup = {
      conjunction: 'AND',
      conditions,
      groups: [],
    };
    return this.evaluateGroup(group, context);
  }

  evaluateGroup(group: ConditionGroup, context: any): ConditionResult {
    const conjunction = group.conjunction || 'AND';
    const conditions = group.conditions || [];
    const nestedGroups = group.groups || [];

    const conditionResults: boolean[] = [];

    // Evaluate current level conditions
    for (const condition of conditions) {
      const fieldValue = this.getNestedValue(context, condition.field);
      const expectedValue = condition.value;
      const operator = operatorRegistry[condition.operator as Operator];

      if (!operator) {
        throw new ConditionException(
          `Operator ${condition.operator} is not registered or supported`,
        );
      }

      let match = false;
      try {
        match = operator.evaluate(fieldValue, expectedValue);
      } catch (error) {
        throw new ConditionException(
          `Failed to evaluate operator ${condition.operator} on path "${condition.field}": ${(error as Error).message}`,
        );
      }

      this.logger.debug(
        `[ConditionEngine] Evaluating: "${condition.field}" (${fieldValue}) ${condition.operator} "${expectedValue}" -> Result: ${match}`,
      );

      conditionResults.push(match);
    }

    // Evaluate nested groups (recursive support for future nested groups)
    for (const nested of nestedGroups) {
      const groupResult = this.evaluateGroup(nested, context);
      conditionResults.push(groupResult.matched);
    }

    if (conditionResults.length === 0) {
      return { matched: true };
    }

    if (conjunction === 'AND') {
      const matched = conditionResults.every((r) => r === true);
      return {
        matched,
        reason: matched ? undefined : 'One or more conditional rules failed in AND group.',
      };
    } else {
      const matched = conditionResults.some((r) => r === true);
      return {
        matched,
        reason: matched ? undefined : 'All conditional rules failed in OR group.',
      };
    }
  }

  private getNestedValue(obj: unknown, path: string): string {
    if (!obj || !path) return '';

    // Normalize path mappings for event schema backward compatibility
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
