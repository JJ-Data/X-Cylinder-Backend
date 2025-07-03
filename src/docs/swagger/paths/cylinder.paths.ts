import { PathBuilder } from '../builder/PathBuilder';

const pb = new PathBuilder();

export const cylinderPaths = {
  '/cylinders': {
    post: pb
      .endpoint('createCylinder', 'Cylinders')
      .summary('Create a new cylinder')
      .body('CreateCylinder')
      .response(201, 'CylinderResponse', 'Cylinder created successfully')
      .build(),

    get: pb
      .endpoint('searchCylinders', 'Cylinders')
      .summary('Search cylinders')
      .query('outletId', 'integer', false)
      .query('status', 'string', false)
      .query('type', 'string', false)
      .query('searchTerm', 'string', false)
      .response(200, 'CylinderListResponse', 'Cylinders retrieved successfully')
      .build(),
  },

  '/cylinders/bulk': {
    post: pb
      .endpoint('bulkCreateCylinders', 'Cylinders')
      .summary('Bulk create cylinders')
      .body('BulkCreateCylinders')
      .response(201, 'BulkCreateCylindersResponse', 'Cylinders created successfully')
      .build(),
  },
};
