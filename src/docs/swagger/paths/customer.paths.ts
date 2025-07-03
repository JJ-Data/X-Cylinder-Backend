import { PathBuilder } from '../builder/PathBuilder';

const pb = new PathBuilder();

export const customerPaths = {
  '/customers/register': {
    post: pb
      .endpoint('registerCustomer', 'Customers')
      .summary('Register a new customer')
      .description('Register a new customer and generate payment link')
      .body('RegisterCustomer')
      .response(201, 'CustomerRegistrationResponse')
      .security(false)
      .build(),
  },

  '/customers/activate': {
    post: pb
      .endpoint('activateCustomer', 'Customers')
      .summary('Activate customer account')
      .description('Activate customer account after payment verification')
      .body('ActivateCustomer')
      .response(200, 'CustomerResponse', 'Customer activated successfully')
      .security(false)
      .build(),
  },

  '/customers': {
    get: pb
      .endpoint('searchCustomers', 'Customers')
      .summary('Search customers')
      .query('searchTerm', 'string', false)
      .query('outletId', 'integer', false)
      .query('paymentStatus', 'string', false)
      .response(200, 'CustomerListResponse')
      .build(),
  },
};
