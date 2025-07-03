import { PathBuilder } from '../builder/PathBuilder';

const pb = new PathBuilder();

export const leasePaths = {
  '/leases': {
    post: pb
      .endpoint('createLease', 'Leases')
      .summary('Create a new lease')
      .body('CreateLease')
      .response(201, 'LeaseResponse', 'Lease created successfully')
      .build(),
  },

  '/leases/return': {
    post: pb
      .endpoint('returnCylinder', 'Leases')
      .summary('Return a leased cylinder')
      .body('ReturnCylinder')
      .response(200, 'LeaseResponse', 'Cylinder returned successfully')
      .build(),
  },
};
