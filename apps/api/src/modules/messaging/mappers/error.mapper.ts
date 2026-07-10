import {
  MetaApiException,
  TokenExpiredException,
  RateLimitException,
  NetworkException,
  MessagingException,
} from '../exceptions/messaging.exceptions';

export interface MetaErrorMapping {
  internalCode: string;
  retryable: boolean;
  exceptionFactory: (msg: string) => MessagingException;
}

const META_ERROR_MAP: Record<number, MetaErrorMapping> = {
  190: {
    internalCode: 'TOKEN_EXPIRED',
    retryable: false,
    exceptionFactory: (msg) => new TokenExpiredException(msg),
  },
  102: {
    internalCode: 'TOKEN_EXPIRED',
    retryable: false,
    exceptionFactory: (msg) => new TokenExpiredException(msg),
  },
  613: {
    internalCode: 'RATE_LIMITED',
    retryable: true,
    exceptionFactory: (msg) => new RateLimitException(msg),
  },
  32: {
    internalCode: 'RATE_LIMITED',
    retryable: true,
    exceptionFactory: (msg) => new RateLimitException(msg),
  },
  4: {
    internalCode: 'TRANSIENT_FAILURE',
    retryable: true,
    exceptionFactory: (msg) => new MetaApiException(msg, 4),
  },
  2: {
    internalCode: 'TRANSIENT_FAILURE',
    retryable: true,
    exceptionFactory: (msg) => new MetaApiException(msg, 2),
  },
  1: {
    internalCode: 'UNKNOWN_ERROR',
    retryable: true,
    exceptionFactory: (msg) => new MetaApiException(msg, 1),
  },
  10: {
    internalCode: 'PERMISSION_DENIED',
    retryable: false,
    exceptionFactory: (msg) => new MetaApiException(msg, 10),
  },
  200: {
    internalCode: 'PERMISSION_DENIED',
    retryable: false,
    exceptionFactory: (msg) => new MetaApiException(msg, 200),
  },
  100: {
    internalCode: 'INVALID_PARAMETER',
    retryable: false,
    exceptionFactory: (msg) => new MetaApiException(msg, 100),
  },
};

export function mapMetaError(
  metaCode: number,
  metaMessage: string,
  metaSubCode?: number,
): { exception: MessagingException; internalCode: string; retryable: boolean } {
  const mapping = META_ERROR_MAP[metaCode];

  if (mapping) {
    return {
      exception: mapping.exceptionFactory(
        `Meta API Error [${metaCode}${metaSubCode ? `/${metaSubCode}` : ''}]: ${metaMessage}`,
      ),
      internalCode: mapping.internalCode,
      retryable: mapping.retryable,
    };
  }

  return {
    exception: new MetaApiException(
      `Meta API Error [${metaCode}]: ${metaMessage}`,
      metaCode,
      metaSubCode,
    ),
    internalCode: 'UNKNOWN_META_ERROR',
    retryable: false,
  };
}

export function mapNetworkError(error: unknown): MessagingException {
  const err = error as { code?: string; message?: string };
  if (err && err.code === 'ECONNABORTED') {
    return new NetworkException('Meta API request timed out');
  }
  if (err && (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED')) {
    return new NetworkException(`Meta API unreachable: ${err.code}`);
  }
  return new NetworkException(
    `Network failure: ${err?.message || String(error)}`,
  );
}
