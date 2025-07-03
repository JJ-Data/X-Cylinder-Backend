import { PathBuilder } from '../builder/PathBuilder';

const pb = new PathBuilder();

export const outletPaths = {
  '/outlets': {
    post: pb
      .endpoint('createOutlet', 'Outlets')
      .summary('Create a new outlet')
      .description('Creates a new outlet in the system (Admin only)')
      .body('CreateOutlet')
      .response(201, 'OutletResponse', 'Outlet created successfully')
      .response(400, 'Error', 'Invalid input data')
      .response(401, 'Error', 'Unauthorized')
      .response(403, 'Error', 'Forbidden - Admin only')
      .response(409, 'Error', 'Outlet with this name already exists')
      .build(),

    get: pb
      .endpoint('getAllOutlets', 'Outlets')
      .summary('Get all outlets')
      .description('Retrieve a paginated list of all outlets')
      .query('status', 'string', false, 'Filter by outlet status')
      .query('page', 'integer', false, 'Page number')
      .query('limit', 'integer', false, 'Items per page')
      .response(200, 'OutletListResponse', 'List of outlets')
      .response(401, 'Error', 'Unauthorized')
      .response(403, 'Error', 'Forbidden')
      .build(),
  },

  '/outlets/{id}': {
    get: pb
      .endpoint('getOutletById', 'Outlets')
      .summary('Get outlet by ID')
      .description('Retrieve detailed information about a specific outlet')
      .param('id', 'integer', 'Outlet ID')
      .response(200, 'OutletResponse', 'Outlet details')
      .response(401, 'Error', 'Unauthorized')
      .response(403, 'Error', 'Forbidden')
      .response(404, 'Error', 'Outlet not found')
      .build(),

    put: pb
      .endpoint('updateOutlet', 'Outlets')
      .summary('Update outlet')
      .description('Update outlet information (Admin only)')
      .param('id', 'integer', 'Outlet ID')
      .body('UpdateOutlet')
      .response(200, 'OutletResponse', 'Outlet updated successfully')
      .response(400, 'Error', 'Invalid input data')
      .response(401, 'Error', 'Unauthorized')
      .response(403, 'Error', 'Forbidden - Admin only')
      .response(404, 'Error', 'Outlet not found')
      .build(),

    delete: pb
      .endpoint('deactivateOutlet', 'Outlets')
      .summary('Deactivate outlet')
      .description(
        'Deactivate an outlet (Admin only). Cannot deactivate if outlet has active cylinders.'
      )
      .param('id', 'integer', 'Outlet ID')
      .response(200, 'SuccessResponse', 'Outlet deactivated successfully')
      .response(400, 'Error', 'Cannot deactivate outlet with active cylinders')
      .response(401, 'Error', 'Unauthorized')
      .response(403, 'Error', 'Forbidden - Admin only')
      .response(404, 'Error', 'Outlet not found')
      .build(),
  },

  '/outlets/{id}/inventory': {
    get: pb
      .endpoint('getOutletInventory', 'Outlets')
      .summary('Get outlet inventory')
      .description('Get cylinder inventory summary for an outlet')
      .param('id', 'integer', 'Outlet ID')
      .response(200, 'OutletInventoryResponse', 'Inventory summary')
      .response(401, 'Error', 'Unauthorized')
      .response(403, 'Error', 'Forbidden')
      .response(404, 'Error', 'Outlet not found')
      .build(),
  },
};
