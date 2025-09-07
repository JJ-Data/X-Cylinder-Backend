import { Request, Response } from 'express';
import { customerService } from '@services/customer.service';
import { ResponseUtil } from '@utils/response';
import { CONSTANTS } from '@config/constants';
import { asyncHandler } from '@utils/asyncHandler';
import { AuthRequest } from '@app-types/auth.types';

export class CustomerController {
  registerCustomer = asyncHandler(async (req: AuthRequest, res: Response) => {
    const staffId = req.user?.id;
    const result = await customerService.registerCustomer(req.body, staffId);

    return ResponseUtil.success(
      res,
      result,
      'Customer registered and activated successfully.',
      CONSTANTS.HTTP_STATUS.CREATED
    );
  });

  /**
   * @deprecated Payment is no longer required for customer registration.
   * Customers are automatically activated upon registration.
   * This endpoint is kept for backward compatibility only.
   */
  activateCustomer = asyncHandler(async (req: Request, res: Response) => {
    const { userId, paymentAmount, paymentMethod, paymentReference } = req.body;
    
    // For backward compatibility, just return the existing customer if already active
    const customer = await customerService.activateCustomer(userId, {
      paymentAmount,
      paymentMethod,
      paymentReference
    });

    return ResponseUtil.success(res, customer, 'Customer activated successfully');
  });

  getCustomerById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    // Customers can only see their own profile
    const targetId = req.user!.role === CONSTANTS.USER_ROLES.CUSTOMER ? req.user!.id : Number(id);

    const customer = await customerService.getCustomerById(targetId);

    return ResponseUtil.success(res, customer);
  });

  searchCustomers = asyncHandler(async (req: AuthRequest, res: Response) => {
    const filters = {
      searchTerm: req.query.searchTerm as string | undefined,
      outletId: req.query.outletId ? Number(req.query.outletId) : undefined,
      paymentStatus: req.query.paymentStatus as 'pending' | 'active' | 'inactive' | undefined,
      hasActiveLeases: req.query.hasActiveLeases ? req.query.hasActiveLeases === 'true' : undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    };

    // Allow staff to see all customers for lease creation
    // Customers should be able to visit any outlet for service
    // Note: The outlet filter can still be applied if explicitly passed in the query
    // if (req.user!.role === CONSTANTS.USER_ROLES.STAFF && req.user!.outletId) {
    //   filters.outletId = req.user!.outletId;
    // }

    const result = await customerService.searchCustomers(filters);

    return ResponseUtil.success(res, result);
  });

  getCustomersByOutlet = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { outletId } = req.params;

    // Staff can only see their outlet's customers
    const targetOutletId =
      req.user!.role === CONSTANTS.USER_ROLES.ADMIN ? Number(outletId) : req.user!.outletId!;

    const customers = await customerService.getCustomersByOutlet(targetOutletId);

    return ResponseUtil.success(res, customers);
  });

  deactivateCustomer = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;

    await customerService.deactivateCustomer(Number(id), reason);

    return ResponseUtil.success(res, null, 'Customer deactivated successfully');
  });

  resendPaymentLink = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const paymentLink = await customerService.resendPaymentLink(Number(userId));

    return ResponseUtil.success(res, paymentLink, 'Payment link sent successfully');
  });
}

export const customerController = new CustomerController();
