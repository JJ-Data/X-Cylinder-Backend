import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '@utils/errors';
import { formatJoiErrors } from '@utils/validation';

// Extend Express Request to include validated data
declare global {
  namespace Express {
    interface Request {
      validated?: {
        body?: any;
        query?: any;
        params?: any;
      };
    }
  }
}

type ValidationTarget = 'body' | 'query' | 'params';

export const validate = (schema: Joi.ObjectSchema, target: ValidationTarget = 'body') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { value, error } = schema.validate(req[target], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = formatJoiErrors(error);
      return next(new ValidationError(errors));
    }

    // Initialize validated object if it doesn't exist
    if (!req.validated) {
      req.validated = {};
    }

    // Store validated values in a separate object to avoid modifying read-only properties
    req.validated[target] = value;

    // For body, we can still update directly as it's not read-only
    if (target === 'body') {
      req.body = value;
    }

    next();
  };
};

export const validateBody = (schema: Joi.ObjectSchema) => validate(schema, 'body');
export const validateQuery = (schema: Joi.ObjectSchema) => validate(schema, 'query');
export const validateParams = (schema: Joi.ObjectSchema) => validate(schema, 'params');