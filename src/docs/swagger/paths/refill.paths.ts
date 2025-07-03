import { PathBuilder } from '../builder/PathBuilder';

const pb = new PathBuilder();

export const refillPaths = {
  '/refills': {
    post: pb
      .endpoint('createRefill', 'Refills')
      .summary('Create a new refill record')
      .body('CreateRefill')
      .response(201, 'RefillResponse')
      .build(),
  },

  '/refills/bulk': {
    post: pb
      .endpoint('bulkRefill', 'Refills')
      .summary('Bulk refill cylinders')
      .body('BulkRefill')
      .response(200, 'BulkRefillResponse')
      .build(),
  },
};
