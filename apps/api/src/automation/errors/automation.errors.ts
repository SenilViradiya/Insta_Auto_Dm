export class NonRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRetryableError';
    Object.setPrototypeOf(this, NonRetryableError.prototype);
  }
}

export class ValidationError extends NonRetryableError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}
