export class AutomationException extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationException extends AutomationException {
  constructor(message: string) {
    super(message);
  }
}

export class ConditionEvaluationException extends AutomationException {
  constructor(message: string) {
    super(message);
  }
}

export class QueueException extends AutomationException {
  constructor(message: string) {
    super(message);
  }
}

export class ExecutionException extends AutomationException {
  constructor(message: string) {
    super(message);
  }
}

export class InfrastructureException extends AutomationException {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

export class NonRetryableException extends AutomationException {
  constructor(message: string) {
    super(message);
  }
}

export class UnknownTriggerException extends AutomationException {
  constructor(message: string) {
    super(message);
  }
}

export class TriggerConfigurationException extends AutomationException {
  constructor(message: string) {
    super(message);
  }
}

export class TriggerValidationException extends AutomationException {
  constructor(message: string) {
    super(message);
  }
}

export class TriggerMatchException extends AutomationException {
  constructor(message: string) {
    super(message);
  }
}

// Backward compatible aliases
export { ValidationException as ValidationError };
export { NonRetryableException as NonRetryableError };

export class ConditionException extends AutomationException {
  constructor(message: string) {
    super(message);
  }
}

export class ActionException extends AutomationException {
  constructor(message: string) {
    super(message);
  }
}

export class VariableResolutionException extends AutomationException {
  constructor(message: string) {
    super(message);
  }
}

export class RetryException extends AutomationException {
  constructor(message: string) {
    super(message);
  }
}

