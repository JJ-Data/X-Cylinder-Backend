import { DataTypes, Model } from 'sequelize';
import { sequelize } from '@config/database';
import { PricingRuleAttributes, PricingRuleCreationAttributes } from '@app-types/settings.types';

export enum RuleType {
  BASE_PRICE = 'base_price',
  DISCOUNT = 'discount',
  SURCHARGE = 'surcharge',
  CONDITIONAL = 'conditional',
  VOLUME_DISCOUNT = 'volume_discount',
}

interface PricingRuleInstance 
  extends Model<PricingRuleAttributes, PricingRuleCreationAttributes>, 
          PricingRuleAttributes {}

export const PricingRule = sequelize.define<PricingRuleInstance>(
  'PricingRule',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 200],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ruleType: {
      type: DataTypes.ENUM(...Object.values(RuleType)),
      allowNull: false,
      field: 'rule_type',
    },
    conditions: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    actions: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    appliesTo: {
      type: DataTypes.JSON,
      allowNull: false,
      field: 'applies_to',
    },
    outletIds: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'outlet_ids',
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    effectiveDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'effective_date',
    },
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expiry_date',
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
    tableName: 'pricing_rules',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeValidate: (rule: any) => {
        if (rule.name) {
          rule.name = rule.name.trim();
        }
      },
    },
    scopes: {
      active: {
        where: {
          isActive: true,
        },
        order: [['priority', 'DESC'], ['createdAt', 'ASC']],
      },
    },
  }
);