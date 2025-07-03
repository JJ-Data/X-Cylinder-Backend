import { DataTypes, Model } from 'sequelize';
import { sequelize } from '@config/database';
import { CylinderAttributes, CylinderCreationAttributes } from '@app-types/cylinder.types';

interface CylinderInstance extends Model<CylinderAttributes, CylinderCreationAttributes>, CylinderAttributes {}

export const Cylinder = sequelize.define<CylinderInstance>(
  'Cylinder',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    cylinderCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'cylinder_code',
    },
    type: {
      type: DataTypes.ENUM('5kg', '10kg', '15kg', '50kg'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('available', 'leased', 'refilling', 'damaged', 'retired'),
      defaultValue: 'available',
      allowNull: false,
    },
    currentOutletId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'current_outlet_id',
      references: {
        model: 'outlets',
        key: 'id',
      },
    },
    qrCode: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: 'qr_code',
    },
    manufactureDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'manufacture_date',
    },
    lastInspectionDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_inspection_date',
    },
    currentGasVolume: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      allowNull: false,
      field: 'current_gas_volume',
      validate: {
        min: 0,
      },
    },
    maxGasVolume: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'max_gas_volume',
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
    tableName: 'cylinders',
    timestamps: true,
    indexes: [
      {
        fields: ['cylinder_code'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['current_outlet_id'],
      },
      {
        fields: ['type'],
      },
      {
        fields: ['qr_code'],
      },
    ],
  }
);

export default Cylinder;