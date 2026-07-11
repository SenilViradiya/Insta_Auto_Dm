import {
  MetaPlatformException,
  TokenExpiredException,
  RateLimitException,
  InvalidParameterException,
  PermissionDeniedException,
  GraphClientException,
} from './meta.exceptions';

export function translateMetaError(errorPayload: {
  message: string;
  type?: string;
  code: number;
  error_subcode?: number;
  fbtrace_id?: string;
}): MetaPlatformException {
  const code = errorPayload.code;
  const subcode = errorPayload.error_subcode;
  const message = errorPayload.message || 'Meta API error';

  switch (code) {
    case 190:
      return new TokenExpiredException(message, code, subcode);
    case 613:
    case 4:
    case 17:
      return new RateLimitException(message, code, subcode);
    case 100:
      return new InvalidParameterException(message, code, subcode);
    case 10:
      return new PermissionDeniedException(message, code, subcode);
    default:
      if (code >= 200 && code <= 299) {
        return new PermissionDeniedException(message, code, subcode);
      }
      return new GraphClientException(message, code, subcode);
  }
}
