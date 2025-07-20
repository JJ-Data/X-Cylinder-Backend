import { DataTypes, Model } from 'sequelize';
import { sequelize } from '@config/database';
import { SwapRecordAttributes, SwapRecordCreationAttributes } from '@app-types/swap.types';

interface SwapRecordInstance
  extends Model<SwapRecordAttributes, SwapRecordCreationAttributes>,
    SwapRecordAttributes {}

export const SwapRecord = sequelize.define<SwapRecordInstance>(
  'SwapRecord',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    leaseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'lease_id',
      references: {
        model: 'lease_records',
        key: 'id',
      },
    },
    oldCylinderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'old_cylinder_id',
      references: {
        model: 'cylinders',
        key: 'id',
      },
    },
    newCylinderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'new_cylinder_id',
      references: {
        model: 'cylinders',
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
    swapDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'swap_date',
    },
    condition: {
      type: DataTypes.ENUM('good', 'poor', 'damaged'),
      allowNull: false,
      defaultValue: 'good',
    },
    weightRecorded: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'weight_recorded',
      validate: {
        min: 0,
      },
    },
    damageNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'damage_notes',
    },
    swapFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
      field: 'swap_fee',
      validate: {
        min: 0,
      },
    },
    reasonForFee: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'reason_for_fee',
    },
    receiptPrinted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'receipt_printed',
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
    tableName: 'swap_records',
    timestamps: true,
    indexes: [
      {
        fields: ['lease_id'],
      },
      {
        fields: ['old_cylinder_id'],
      },
      {
        fields: ['new_cylinder_id'],
      },
      {
        fields: ['staff_id'],
      },
      {
        fields: ['swap_date'],
      },
      {
        fields: ['condition'],
      },
    ],
  }
);

export default SwapRecord;
