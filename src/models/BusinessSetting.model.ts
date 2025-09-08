import { DataTypes, Model, Op } from 'sequelize';
import { sequelize } from '@config/database';
import {
  BusinessSettingAttributes,
  BusinessSettingCreationAttributes,
} from '@app-types/settings.types';

// Define enums
export enum DataType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
}

export enum OperationType {
  LEASE = 'LEASE',
  REFILL = 'REFILL',
  SWAP = 'SWAP',
  GENERAL = 'GENERAL',
}

interface BusinessSettingInstance
  extends Model<BusinessSettingAttributes, BusinessSettingCreationAttributes>,
    BusinessSettingAttributes {}

export const BusinessSetting = sequelize.define<BusinessSettingInstance>(
  'BusinessSetting',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'category_id',
      references: {
        model: 'setting_categories',
        key: 'id',
      },
    },
    settingKey: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'setting_key',
      validate: {
        notEmpty: true,
        len: [2, 200],
      },
    },
    settingValue: {
      type: DataTypes.JSON,
      allowNull: false,
      field: 'setting_value',
      get() {
        const rawValue = this.getDataValue('settingValue');
        const dataType = this.getDataValue('dataType');

        // If the value is already parsed (from JSON column), return it
        if (rawValue !== null && rawValue !== undefined) {
          // For specific data types, ensure proper type conversion
          switch (dataType) {
            case DataType.NUMBER:
              return typeof rawValue === 'number' ? rawValue : Number(rawValue);
            case DataType.BOOLEAN:
              return typeof rawValue === 'boolean' ? rawValue : Boolean(rawValue);
            default:
              return typeof rawValue === 'string' ? rawValue : String(rawValue);
          }
        }
        return rawValue;
      },
      set(value: string | number | boolean | object | null) {
        // Store the value as-is since JSON column handles serialization
        this.setDataValue('settingValue', value);
      },
    },
    dataType: {
      type: DataTypes.ENUM(...Object.values(DataType)),
      allowNull: false,
      defaultValue: DataType.STRING,
      field: 'data_type',
    },
    outletId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'outlet_id',
      references: {
        model: 'outlets',
        key: 'id',
      },
    },
    cylinderType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'cylinder_type',
    },
    operationType: {
      type: DataTypes.ENUM(...Object.values(OperationType)),
      allowNull: true,
      field: 'operation_type',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'created_by',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'updated_by',
      references: {
        model: 'users',
        key: 'id',
      },
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
    tableName: 'business_settings',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeValidate: (setting: BusinessSettingInstance) => {
        if (setting.settingKey) {
          setting.settingKey = setting.settingKey.trim().toLowerCase();
        }
      },
    },
    scopes: {
      active: {
        where: {
          isActive: true,
        },
      },
    },
  }
);
