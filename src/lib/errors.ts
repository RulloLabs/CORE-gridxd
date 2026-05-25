import { logger } from "@/lib/logger";

export const ErrorCode = {
  UNKNOWN: "UNKNOWN",
  NETWORK_ERROR: "NETWORK_ERROR",
  API_ERROR: "API_ERROR",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  RATE_LIMITED: "RATE_LIMITED",
  SUBSCRIPTION_REQUIRED: "SUBSCRIPTION_REQUIRED",
  BACKEND_DOWN: "BACKEND_DOWN",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

export class AppError extends Error {
  public readonly code: ErrorCodeType;
  public readonly source: string;
  public readonly timestamp: string;
  public readonly context?: Record<string, unknown>;

  constructor(
    code: ErrorCodeType,
    message: string,
    options?: { source?: string; context?: Record<string, unknown>; cause?: unknown }
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.source = options?.source ?? "unknown";
    this.timestamp = new Date().toISOString();
    this.context = options?.context;

    if (options?.cause instanceof Error) {
      this.stack = options.cause.stack;
    }
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      source: this.source,
      timestamp: this.timestamp,
      context: this.context,
    };
  }
}

export function classifyApiError(err: unknown, source: string): AppError {
  if (err instanceof AppError) return err;

  if (err instanceof TypeError && err.message === "Failed to fetch") {
    return new AppError(ErrorCode.NETWORK_ERROR, "No se pudo conectar con el servidor", {
      source,
      cause: err,
    });
  }

  if (err instanceof Error) {
    if (err.message.includes("401") || err.message.includes("token")) {
      return new AppError(ErrorCode.TOKEN_EXPIRED, "Sesión expirada. Inicia sesión de nuevo.", {
        source,
        cause: err,
      });
    }
    if (err.message.includes("429") || err.message.includes("rate limit")) {
      return new AppError(ErrorCode.RATE_LIMITED, "Has alcanzado el límite diario. Actualiza tu plan.", {
        source,
        cause: err,
      });
    }
    if (err.message.includes("402") || err.message.includes("subscription")) {
      return new AppError(ErrorCode.SUBSCRIPTION_REQUIRED, "Se requiere una suscripción activa.", {
        source,
        cause: err,
      });
    }
    if (err.message.includes("503") || err.message.includes("502")) {
      return new AppError(ErrorCode.BACKEND_DOWN, "El servidor no está disponible. Intenta de nuevo.", {
        source,
        cause: err,
      });
    }
  }

  return new AppError(ErrorCode.API_ERROR, err instanceof Error ? err.message : "Error desconocido", {
    source,
    cause: err instanceof Error ? err : undefined,
  });
}

export function handleApiError(err: unknown, source: string): never {
  const appError = classifyApiError(err, source);
  logger.error(`[${appError.code}] ${appError.message}`, appError.context);
  throw appError;
}
