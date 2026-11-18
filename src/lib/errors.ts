export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INSUFFICIENT_STOCK'
  | 'EXPIRED_SHIPPING_QUOTE'
  | 'INVALID_SHIPPING_QUOTE'
  | 'SHIPPING_RESTRICTION'
  | 'PAYMENT_PROVIDER_ERROR'
  | 'INVALID_WEBHOOK_SIGNATURE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(params: {
    code: ErrorCode;
    message: string;
    statusCode?: number;
    details?: Record<string, unknown>;
    cause?: unknown;
  }) {
    super(params.message, { cause: params.cause });
    this.name = 'AppError';
    this.code = params.code;
    this.statusCode = params.statusCode ?? mapErrorCodeToHttpStatus(params.code);
    this.details = params.details;
  }
}

export function mapErrorCodeToHttpStatus(code: ErrorCode): number {
  switch (code) {
    case 'VALIDATION_ERROR':
    case 'EXPIRED_SHIPPING_QUOTE':
    case 'INVALID_SHIPPING_QUOTE':
    case 'SHIPPING_RESTRICTION':
      return 400;
    case 'UNAUTHORIZED':
    case 'INVALID_WEBHOOK_SIGNATURE':
      return 401;
    case 'FORBIDDEN':
      return 403;
    case 'NOT_FOUND':
      return 404;
    case 'CONFLICT':
    case 'INSUFFICIENT_STOCK':
      return 409;
    case 'RATE_LIMIT_EXCEEDED':
      return 429;
    case 'PAYMENT_PROVIDER_ERROR':
      return 502;
    case 'INTERNAL_ERROR':
    default:
      return 500;
  }
}

export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: ErrorCode;
        message: string;
        details?: Record<string, unknown>;
      };
    };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail<T = never>(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>
): ActionResult<T> {
  return {
    ok: false,
    error: { code, message, details },
  };
}

export function toActionError<T = never>(err: unknown): ActionResult<T> {
  if (err instanceof AppError) {
    return fail(err.code, err.message, err.details);
  }
  return fail(
    'INTERNAL_ERROR',
    'Ocurrió un error inesperado al procesar la operación.'
  );
}
