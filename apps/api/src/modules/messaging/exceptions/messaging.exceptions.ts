export class MessagingException extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class MetaApiException extends MessagingException {
  constructor(
    message: string,
    public readonly metaErrorCode?: number,
    public readonly metaSubCode?: number,
  ) {
    super(message);
  }
}

export class TokenExpiredException extends MessagingException {
  constructor(message = 'Access token has expired') {
    super(message);
  }
}

export class RateLimitException extends MessagingException {
  public readonly retryAfterMs: number;
  constructor(message = 'Rate limit exceeded', retryAfterMs = 60000) {
    super(message);
    this.retryAfterMs = retryAfterMs;
  }
}

export class MessageValidationException extends MessagingException {
  constructor(message: string) {
    super(message);
  }
}

export class DeliveryException extends MessagingException {
  constructor(
    message: string,
    public readonly metaMessageId?: string,
  ) {
    super(message);
  }
}

export class NetworkException extends MessagingException {
  constructor(message = 'Network error communicating with Meta API') {
    super(message);
  }
}
