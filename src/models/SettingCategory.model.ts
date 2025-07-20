import { DataTypes, Model } from 'sequelize';
import { sequelize } from '@config/database';
import {
  SettingCategoryAttributes,
  SettingCategoryCreationAttributes,
} from '@app-types/settings.types';

interface SettingCategoryInstance
  extends Model<SettingCategoryAttributes, SettingCategoryCreationAttributes>,
    SettingCategoryAttributes {}

export const SettingCategory = sequelize.define<SettingCategoryInstance>(
  'SettingCategory',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [2, 100],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    icon: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        len: [1, 50],
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'display_order',
      validate: {
        min: 0,
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
    tableName: 'setting_categories',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeValidate: (category: any) => {
        if (category.name) {
          category.name = category.name.trim().toUpperCase();
        }
      },
    },
    scopes: {
      active: {
        where: {
          isActive: true,
        },
        order: [
          ['displayOrder', 'ASC'],
          ['name', 'ASC'],
        ],
      },
    },
  }
);
