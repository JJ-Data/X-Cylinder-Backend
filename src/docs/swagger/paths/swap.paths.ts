import { PathBuilder } from '../builder/PathBuilder';

const pb = new PathBuilder();

export const swapPaths = {
  '/swaps': {
    get: pb
      .endpoint('getSwaps', 'Swaps')
      .summary('Get list of cylinder swaps')
      .description('Retrieve a paginated list of cylinder swap records with optional filtering')
      .security([{ BearerAuth: [] }])
      .response(200, 'SwapsResponse', 'Successful response')
      .response(400, 'Error', 'Bad request - Invalid parameters')
      .response(401, 'Error', 'Unauthorized - Invalid or missing authentication')
      .response(403, 'Error', 'Forbidden - Insufficient permissions')
      .response(500, 'Error', 'Internal server error')
      .build(),

    post: pb
      .endpoint('createSwap', 'Swaps')
      .summary('Create a new cylinder swap')
      .description('Process a cylinder swap for a customer by replacing their current cylinder with a new one')
      .security([{ BearerAuth: [] }])
      .response(201, 'SwapRecord', 'Swap created successfully')
      .response(400, 'Error', 'Bad request - Invalid swap data')
      .response(401, 'Error', 'Unauthorized - Invalid or missing authentication')
      .response(403, 'Error', 'Forbidden - Insufficient permissions')
      .response(404, 'Error', 'Not found - Lease or cylinder not found')
      .response(500, 'Error', 'Internal server error')
      .build(),
  },

  '/swaps/statistics': {
    get: pb
      .endpoint('getSwapStatistics', 'Swaps')
      .summary('Get swap statistics')
      .description('Retrieve statistical information about cylinder swaps')
      .security([{ BearerAuth: [] }])
      .response(200, 'SwapStatistics', 'Successful response')
      .response(401, 'Error', 'Unauthorized - Invalid or missing authentication')
      .response(403, 'Error', 'Forbidden - Insufficient permissions')
      .response(500, 'Error', 'Internal server error')
      .build(),
  },

  '/swaps/{id}': {
    get: pb
      .endpoint('getSwapById', 'Swaps')
      .summary('Get swap details by ID')
      .description('Retrieve detailed information about a specific cylinder swap')
      .security([{ BearerAuth: [] }])
      .response(200, 'SwapRecord', 'Successful response')
      .response(401, 'Error', 'Unauthorized - Invalid or missing authentication')
      .response(403, 'Error', 'Forbidden - Insufficient permissions')
      .response(404, 'Error', 'Not found - Swap record not found')
      .response(500, 'Error', 'Internal server error')
      .build(),
  },

  '/swaps/{id}/receipt': {
    get: pb
      .endpoint('getSwapReceiptData', 'Swaps')
      .summary('Get swap receipt data')
      .description('Retrieve formatted data for printing a swap receipt')
      .security([{ BearerAuth: [] }])
      .response(200, 'SwapReceiptData', 'Successful response')
      .response(401, 'Error', 'Unauthorized - Invalid or missing authentication')
      .response(403, 'Error', 'Forbidden - Insufficient permissions')
      .response(404, 'Error', 'Not found - Swap record not found')
      .response(500, 'Error', 'Internal server error')
      .build(),
  },

  '/swaps/{id}/receipt-printed': {
    patch: pb
      .endpoint('markReceiptPrinted', 'Swaps')
      .summary('Mark swap receipt as printed')
      .description('Update the swap record to indicate that the receipt has been printed')
      .security([{ BearerAuth: [] }])
      .response(200, 'SuccessResponse', 'Receipt marked as printed successfully')
      .response(401, 'Error', 'Unauthorized - Invalid or missing authentication')
      .response(403, 'Error', 'Forbidden - Insufficient permissions')
      .response(404, 'Error', 'Not found - Swap record not found')
      .response(500, 'Error', 'Internal server error')
      .build(),
  },

  '/swaps/customers/{customerId}': {
    get: pb
      .endpoint('getSwapsByCustomer', 'Swaps')
      .summary('Get swaps for a specific customer')
      .description('Retrieve all cylinder swaps performed for a specific customer')
      .security([{ BearerAuth: [] }])
      .response(200, 'SwapsResponse', 'Successful response')
      .response(401, 'Error', 'Unauthorized - Invalid or missing authentication')
      .response(403, 'Error', 'Forbidden - Insufficient permissions')
      .response(404, 'Error', 'Not found - Customer not found')
      .response(500, 'Error', 'Internal server error')
      .build(),
  },

  '/swaps/outlets/{outletId}': {
    get: pb
      .endpoint('getOutletSwaps', 'Swaps')
      .summary('Get swaps for a specific outlet')
      .description('Retrieve all cylinder swaps performed at a specific outlet')
      .security([{ BearerAuth: [] }])
      .response(200, 'SwapsResponse', 'Successful response')
      .response(401, 'Error', 'Unauthorized - Invalid or missing authentication')
      .response(403, 'Error', 'Forbidden - Insufficient permissions')
      .response(404, 'Error', 'Not found - Outlet not found')
      .response(500, 'Error', 'Internal server error')
      .build(),
  },

  '/swaps/find-cylinder': {
    get: pb
      .endpoint('findCylinder', 'Swaps')
      .summary('Find cylinder by identifier')
      .description('Find cylinder by lease ID, cylinder code, or QR code for swap operations')
      .security([{ BearerAuth: [] }])
      .response(200, 'CylinderLookupResponse', 'Successful response')
      .response(401, 'Error', 'Unauthorized - Invalid or missing authentication')
      .response(403, 'Error', 'Forbidden - Insufficient permissions')
      .response(404, 'Error', 'Not found - No active lease found for the specified cylinder')
      .response(500, 'Error', 'Internal server error')
      .build(),
  },

  '/swaps/available-cylinders': {
    get: pb
      .endpoint('getAvailableCylinders', 'Swaps')
      .summary('Get available cylinders for swap')
      .description('Retrieve list of available cylinders that can be used for swap operations')
      .security([{ BearerAuth: [] }])
      .response(200, 'AvailableCylindersResponse', 'Successful response')
      .response(401, 'Error', 'Unauthorized - Invalid or missing authentication')
      .response(403, 'Error', 'Forbidden - Insufficient permissions')
      .response(500, 'Error', 'Internal server error')
      .build(),
  },
};

export default swapPaths;