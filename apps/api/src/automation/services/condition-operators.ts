import { Operator } from '@prisma/client';

export interface ConditionOperator {
  evaluate(fieldValue: string, expectedValue: string): boolean;
}

export class EqualsOperator implements ConditionOperator {
  evaluate(fieldValue: string, expectedValue: string): boolean {
    return fieldValue === expectedValue;
  }
}

export class NotEqualsOperator implements ConditionOperator {
  evaluate(fieldValue: string, expectedValue: string): boolean {
    return fieldValue !== expectedValue;
  }
}

export class ContainsOperator implements ConditionOperator {
  evaluate(fieldValue: string, expectedValue: string): boolean {
    return fieldValue.includes(expectedValue);
  }
}

export class NotContainsOperator implements ConditionOperator {
  evaluate(fieldValue: string, expectedValue: string): boolean {
    return !fieldValue.includes(expectedValue);
  }
}

export class StartsWithOperator implements ConditionOperator {
  evaluate(fieldValue: string, expectedValue: string): boolean {
    return fieldValue.startsWith(expectedValue);
  }
}

export class EndsWithOperator implements ConditionOperator {
  evaluate(fieldValue: string, expectedValue: string): boolean {
    return fieldValue.endsWith(expectedValue);
  }
}

export class RegexOperator implements ConditionOperator {
  evaluate(fieldValue: string, expectedValue: string): boolean {
    try {
      const regex = new RegExp(expectedValue, 'i');
      return regex.test(fieldValue);
    } catch {
      return false;
    }
  }
}

export const operatorRegistry: Record<Operator, ConditionOperator> = {
  [Operator.EQUALS]: new EqualsOperator(),
  [Operator.NOT_EQUALS]: new NotEqualsOperator(),
  [Operator.CONTAINS]: new ContainsOperator(),
  [Operator.NOT_CONTAINS]: new NotContainsOperator(),
  [Operator.STARTS_WITH]: new StartsWithOperator(),
  [Operator.ENDS_WITH]: new EndsWithOperator(),
  [Operator.REGEX]: new RegexOperator(),
};
