import { Outlet, User, Cylinder } from '@models/index';
import { OutletCreationAttributes, OutletUpdateAttributes, OutletPublicData } from '@app-types/outlet.types';
import { AppError } from '@utils/errors';
import { CONSTANTS } from '@config/constants';
import { Transaction } from 'sequelize';

export class OutletService {
  async createOutlet(data: OutletCreationAttributes, transaction?: Transaction): Promise<OutletPublicData> {
    try {
      const outlet = await Outlet.create(data, { transaction });
      return outlet.toJSON() as OutletPublicData;
    } catch (error: any) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new AppError('Outlet with this name already exists', CONSTANTS.HTTP_STATUS.CONFLICT);
      }
      throw error;
    }
  }

  async updateOutlet(id: number, data: OutletUpdateAttributes, transaction?: Transaction): Promise<OutletPublicData> {
    const outlet = await Outlet.findByPk(id);
    if (!outlet) {
      throw new AppError('Outlet not found', CONSTANTS.HTTP_STATUS.NOT_FOUND);
    }

    await outlet.update(data, { transaction });
    return outlet.toJSON() as OutletPublicData;
  }

  async getOutletById(id: number): Promise<OutletPublicData> {
    const outlet = await Outlet.findByPk(id, {
      include: [
        {
          model: User,
          as: 'manager',
          attributes: ['id', 'email', 'firstName', 'lastName'],
        },
      ],
    });

    if (!outlet) {
      throw new AppError('Outlet not found', CONSTANTS.HTTP_STATUS.NOT_FOUND);
    }

    return outlet.toJSON() as OutletPublicData;
  }

  async getAllOutlets(filters?: {
    status?: 'active' | 'inactive';
    page?: number;
    limit?: number;
  }): Promise<{
    outlets: OutletPublicData[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = filters?.page || CONSTANTS.DEFAULT_PAGE;
    const limit = Math.min(filters?.limit || CONSTANTS.DEFAULT_PAGE_SIZE, CONSTANTS.MAX_PAGE_SIZE);
    const offset = (page - 1) * limit;

    const where: any = {};
    if (filters?.status) {
      where.status = filters.status;
    }

    const { count, rows } = await Outlet.findAndCountAll({
      where,
      limit,
      offset,
      include: [
        {
          model: User,
          as: 'manager',
          attributes: ['id', 'email', 'firstName', 'lastName'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    return {
      outlets: rows.map(outlet => outlet.toJSON() as OutletPublicData),
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    };
  }

  async getOutletInventory(outletId: number): Promise<{
    outletId: number;
    totalCylinders: number;
    availableCylinders: number;
    leasedCylinders: number;
    refillingCylinders: number;
    damagedCylinders: number;
    byType: Record<string, number>;
  }> {
    const outlet = await Outlet.findByPk(outletId);
    if (!outlet) {
      throw new AppError('Outlet not found', CONSTANTS.HTTP_STATUS.NOT_FOUND);
    }

    const cylinders = await Cylinder.findAll({
      where: { currentOutletId: outletId },
      attributes: ['status', 'type'],
    });

    const inventory = {
      outletId,
      totalCylinders: cylinders.length,
      availableCylinders: 0,
      leasedCylinders: 0,
      refillingCylinders: 0,
      damagedCylinders: 0,
      byType: {} as Record<string, number>,
    };

    cylinders.forEach(cylinder => {
      // Count by status
      switch (cylinder.getDataValue('status')) {
        case 'available':
          inventory.availableCylinders++;
          break;
        case 'leased':
          inventory.leasedCylinders++;
          break;
        case 'refilling':
          inventory.refillingCylinders++;
          break;
        case 'damaged':
          inventory.damagedCylinders++;
          break;
      }

      // Count by type
      const type = cylinder.getDataValue('type');
      inventory.byType[type] = (inventory.byType[type] || 0) + 1;
    });

    return inventory;
  }

  async deactivateOutlet(id: number): Promise<void> {
    const outlet = await Outlet.findByPk(id);
    if (!outlet) {
      throw new AppError('Outlet not found', CONSTANTS.HTTP_STATUS.NOT_FOUND);
    }

    // Check if outlet has active cylinders
    const activeCylinders = await Cylinder.count({
      where: { 
        currentOutletId: id,
        status: ['available', 'leased', 'refilling'],
      },
    });

    if (activeCylinders > 0) {
      throw new AppError(
        'Cannot deactivate outlet with active cylinders. Please transfer or retire all cylinders first.',
        CONSTANTS.HTTP_STATUS.BAD_REQUEST
      );
    }

    await outlet.update({ status: 'inactive' });
  }
}

export const outletService = new OutletService();