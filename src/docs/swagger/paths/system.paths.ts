import { PathBuilder } from '../builder/PathBuilder';

const pb = new PathBuilder();

export const systemPaths = {
  '/health': {
    get: pb
      .endpoint('healthCheck', 'System')
      .summary('Health check endpoint')
      .description('Check if the API server is healthy and running')
      .noAuth()
      .response(200, 'SuccessResponse', 'Server is healthy')
      .build(),
  },
};
