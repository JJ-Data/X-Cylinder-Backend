import { DataTypes, Model } from 'sequelize';
import { sequelize } from '@config/database';
import { LeaseRecordAttributes, LeaseRecordCreationAttributes } from '@app-types/lease.types';

interface LeaseRecordInstance
  extends Model<LeaseRecordAttributes, LeaseRecordCreationAttributes>,
    LeaseRecordAttributes {}

export const LeaseRecord = sequelize.define<LeaseRecordInstance>(
  'LeaseRecord',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    cylinderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'cylinder_id',
      references: {
        model: 'cylinders',
        key: 'id',
      },
    },
    customerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'customer_id',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    outletId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'outlet_id',
      references: {
        model: 'outlets',
        key: 'id',
      },
    },
    staffId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'staff_id',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    leaseDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'lease_date',
    },
    expectedReturnDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expected_return_date',
    },
    actualReturnDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'actual_return_date',
    },
    returnStaffId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'return_staff_id',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    leaseStatus: {
      type: DataTypes.ENUM('active', 'returned', 'overdue'),
      defaultValue: 'active',
      allowNull: false,
      field: 'lease_status',
    },
    depositAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'deposit_amount',
      validate: {
        min: 0,
      },
    },
    leaseAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'lease_amount',
      validate: {
        min: 0,
      },
    },
    refundAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'refund_amount',
      validate: {
        min: 0,
      },
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
    },
  },
  {
    tableName: 'lease_records',
    timestamps: true,
    indexes: [
      {
        fields: ['cylinder_id'],
      },
      {
        fields: ['customer_id'],
      },
      {
        fields: ['outlet_id'],
      },
      {
        fields: ['staff_id'],
      },
      {
        fields: ['lease_status'],
      },
      {
        fields: ['lease_date'],
      },
    ],
  }
);

export default LeaseRecord;
