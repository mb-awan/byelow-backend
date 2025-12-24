import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { logger } from '@/server';

import { APIResponse } from './response';

// General error handling function for API errors
export const handleError = (error: any, res: Response, customMessage?: string) => {
  if (error.response) {
    // Axios error: server responded with a status other than 2xx
    logger.error('Error response from external service:', {
      status: error.response.status,
      headers: error.response.headers,
      data: error.response.data,
    });
    return APIResponse.error(
      res,
      customMessage || 'Failed to retrieve data from the external service.',
      error.response.data,
      error.response.status
    );
  } else if (error.request) {
    // Axios error: request was made but no response was received
    logger.error('No response received from external service:', error.request);
    return APIResponse.error(
      res,
      customMessage || 'No response received from the external service.',
      null,
      StatusCodes.REQUEST_TIMEOUT
    );
  } else if (error instanceof SyntaxError) {
    // Handle syntax errors (e.g., JSON parsing issues)
    logger.error('Syntax error encountered:', error.message);
    return APIResponse.error(
      res,
      customMessage || 'A syntax error occurred while processing the request.',
      error.message,
      StatusCodes.BAD_REQUEST
    );
  } else if (error instanceof TypeError) {
    // Handle type errors (e.g., accessing properties of undefined)
    logger.error('Type error encountered:', error.message);
    return APIResponse.error(
      res,
      customMessage || 'A type error occurred in the request.',
      error.message,
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  } else {
    // Generic or unknown error
    logger.error('An unexpected error occurred:', error.message);
    return APIResponse.error(
      res,
      customMessage || 'An unexpected error occurred.',
      error.message,
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};
