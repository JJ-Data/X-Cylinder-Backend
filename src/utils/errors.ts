import { CONSTANTS } from '@config/constants';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errors?: Record<string, string[]>;

  constructor(
    message: string,
    statusCode: number = CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR,
    isOperational: boolean = true,
    errors?: Record<string, string[]>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;

    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(errors: Record<string, string[]>) {
    super(
      CONSTANTS.ERROR_MESSAGES.VALIDATION_ERROR,
      CONSTANTS.HTTP_STATUS.UNPROCESSABLE_ENTITY,
      true,
      errors
    );
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = CONSTANTS.ERROR_MESSAGES.UNAUTHORIZED) {
    super(message, CONSTANTS.HTTP_STATUS.UNAUTHORIZED);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = CONSTANTS.ERROR_MESSAGES.FORBIDDEN) {
    super(message, CONSTANTS.HTTP_STATUS.FORBIDDEN);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = CONSTANTS.ERROR_MESSAGES.NOT_FOUND) {
    super(message, CONSTANTS.HTTP_STATUS.NOT_FOUND);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, CONSTANTS.HTTP_STATUS.CONFLICT);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, CONSTANTS.HTTP_STATUS.BAD_REQUEST);
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string = CONSTANTS.ERROR_MESSAGES.RATE_LIMIT_EXCEEDED) {
    super(message, CONSTANTS.HTTP_STATUS.TOO_MANY_REQUESTS);
    Object.setPrototypeOf(this, TooManyRequestsError.prototype);
  }
}
