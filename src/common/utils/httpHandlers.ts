import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ZodError, ZodSchema } from 'zod';

import { ResponseStatus, ServiceResponse } from '@/common/models/serviceResponse';

export const handleServiceResponse = (serviceResponse: ServiceResponse<any>, response: Response) => {
  return response.status(serviceResponse.statusCode).send(serviceResponse);
};

export const validateRequest = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = { ...req.body, ...req.query, ...req.params };
    schema.parse(data);
    // schema.parse( req.body|| req.query  || req.params );
    // schema.parse({ body: req.body, query: req.query, params: req.params });
    next();
  } catch (err) {
    const errorMessage = `Invalid input: ${(err as ZodError).errors.map((e) => e.message).join(', ')}`;
    const statusCode = StatusCodes.BAD_REQUEST;
    res.status(statusCode).send(new ServiceResponse<null>(ResponseStatus.Failed, errorMessage, null, statusCode));
  }
};

export const normalizeQueryArray = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const paramValue = req.query[paramName];

    if (typeof paramValue === 'string') {
      // If the parameter is a comma-separated string, split it into an array
      req.query[paramName] = paramValue.split(',').map((item) => item.trim());
    } else if (!Array.isArray(paramValue)) {
      // If it's neither a string nor an array, set it as an empty array (or handle as needed)
      req.query[paramName] = [];
    }

    next(); // Move on to the next middleware (Zod validation, etc.)
  };
};
