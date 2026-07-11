export class MetaPlatformException extends Error {
  constructor(message: string, public readonly code?: number, public readonly subcode?: number) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class TokenExpiredException extends MetaPlatformException {
  constructor(message: string, code?: number, subcode?: number) {
    super(message, code, subcode);
  }
}

export class RateLimitException extends MetaPlatformException {
  constructor(message: string, code?: number, subcode?: number) {
    super(message, code, subcode);
  }
}

export class InvalidParameterException extends MetaPlatformException {
  constructor(message: string, code?: number, subcode?: number) {
    super(message, code, subcode);
  }
}

export class PermissionDeniedException extends MetaPlatformException {
  constructor(message: string, code?: number, subcode?: number) {
    super(message, code, subcode);
  }
}

export class RequestTimeoutException extends MetaPlatformException {
  constructor(message: string) {
    super(message);
  }
}

export class GraphClientException extends MetaPlatformException {
  constructor(message: string, code?: number, subcode?: number) {
    super(message, code, subcode);
  }
}
