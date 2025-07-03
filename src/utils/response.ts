import { Response } from 'express';
import { ApiResponse, PaginatedResponse } from '@app-types/common.types';
import { CONSTANTS } from '@config/constants';

export class ResponseUtil {
  public static success<T>(
    res: Response,
    data: T,
    message?: string,
    statusCode: number = CONSTANTS.HTTP_STATUS.OK
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
    };
    return res.status(statusCode).json(response);
  }

  public static error(
    res: Response,
    message: string,
    statusCode: number = CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR,
    errors?: Record<string, string[]>
  ): Response {
    const response: ApiResponse = {
      success: false,
      error: message,
      errors,
    };
    return res.status(statusCode).json(response);
  }

  public static created<T>(
    res: Response,
    data: T,
    message: string = CONSTANTS.SUCCESS_MESSAGES.RESOURCE_CREATED
  ): Response {
    return this.success(res, data, message, CONSTANTS.HTTP_STATUS.CREATED);
  }

  public static noContent(res: Response): Response {
    return res.status(CONSTANTS.HTTP_STATUS.NO_CONTENT).send();
  }

  public static paginated<T>(
    res: Response,
    data: T[],
    page: number,
    pageSize: number,
    totalItems: number,
    message?: string
  ): Response {
    const totalPages = Math.ceil(totalItems / pageSize);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    const paginatedResponse: PaginatedResponse<T> = {
      data,
      pagination: {
        page,
        pageSize,
        totalPages,
        totalItems,
        hasNextPage,
        hasPrevPage,
      },
    };

    const response: ApiResponse<PaginatedResponse<T>> = {
      success: true,
      message,
      data: paginatedResponse,
    };

    return res.status(CONSTANTS.HTTP_STATUS.OK).json(response);
  }

  public static unauthorized(
    res: Response,
    message: string = CONSTANTS.ERROR_MESSAGES.UNAUTHORIZED
  ): Response {
    return this.error(res, message, CONSTANTS.HTTP_STATUS.UNAUTHORIZED);
  }

  public static forbidden(
    res: Response,
    message: string = CONSTANTS.ERROR_MESSAGES.FORBIDDEN
  ): Response {
    return this.error(res, message, CONSTANTS.HTTP_STATUS.FORBIDDEN);
  }

  public static notFound(
    res: Response,
    message: string = CONSTANTS.ERROR_MESSAGES.NOT_FOUND
  ): Response {
    return this.error(res, message, CONSTANTS.HTTP_STATUS.NOT_FOUND);
  }

  public static badRequest(
    res: Response,
    message: string,
    errors?: Record<string, string[]>
  ): Response {
    return this.error(res, message, CONSTANTS.HTTP_STATUS.BAD_REQUEST, errors);
  }

  public static validationError(
    res: Response,
    errors: Record<string, string[]>
  ): Response {
    return this.error(
      res,
      CONSTANTS.ERROR_MESSAGES.VALIDATION_ERROR,
      CONSTANTS.HTTP_STATUS.UNPROCESSABLE_ENTITY,
      errors
    );
  }

  public static conflict(
    res: Response,
    message: string
  ): Response {
    return this.error(res, message, CONSTANTS.HTTP_STATUS.CONFLICT);
  }

  public static tooManyRequests(
    res: Response,
    message: string = CONSTANTS.ERROR_MESSAGES.RATE_LIMIT_EXCEEDED
  ): Response {
    return this.error(res, message, CONSTANTS.HTTP_STATUS.TOO_MANY_REQUESTS);
  }
}