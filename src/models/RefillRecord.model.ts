import { DataTypes, Model } from 'sequelize';
import { sequelize } from '@config/database';
import { RefillRecordAttributes, RefillRecordCreationAttributes } from '@app-types/refill.types';

interface RefillRecordInstance
  extends Model<RefillRecordAttributes, RefillRecordCreationAttributes>,
    RefillRecordAttributes {}

export const RefillRecord = sequelize.define<RefillRecordInstance>(
  'RefillRecord',
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
    operatorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'operator_id',
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
    refillDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'refill_date',
    },
    preRefillVolume: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'pre_refill_volume',
      validate: {
        min: 0,
      },
    },
    postRefillVolume: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'post_refill_volume',
      validate: {
        min: 0,
      },
    },
    volumeAdded: {
      type: DataTypes.VIRTUAL,
      get() {
        const pre = this.getDataValue('preRefillVolume');
        const post = this.getDataValue('postRefillVolume');
        return post - pre;
      },
    },
    refillCost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'refill_cost',
      validate: {
        min: 0,
      },
    },
    paymentMethod: {
      type: DataTypes.ENUM('cash', 'pos', 'bank_transfer'),
      allowNull: true,
      defaultValue: 'cash',
      field: 'payment_method',
    },
    paymentReference: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'payment_reference',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    batchNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'batch_number',
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
    tableName: 'refill_records',
    timestamps: true,
    indexes: [
      {
        fields: ['cylinder_id'],
      },
      {
        fields: ['operator_id'],
      },
      {
        fields: ['outlet_id'],
      },
      {
        fields: ['refill_date'],
      },
      {
        fields: ['batch_number'],
      },
    ],
    validate: {
      volumeIsValid(this: any) {
        if (this.postRefillVolume < this.preRefillVolume) {
          throw new Error('Post-refill volume cannot be less than pre-refill volume');
        }
      },
    },
  }
);

export default RefillRecord;
