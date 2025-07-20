import { DataTypes, Model } from 'sequelize';
import { sequelize } from '@config/database';
import {
  SettingsAuditAttributes,
  SettingsAuditCreationAttributes,
} from '@app-types/settings.types';

export enum AuditAction {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  ACTIVATED = 'activated',
  DEACTIVATED = 'deactivated',
}

interface SettingsAuditInstance
  extends Model<SettingsAuditAttributes, SettingsAuditCreationAttributes>,
    SettingsAuditAttributes {}

export const SettingsAudit = sequelize.define<SettingsAuditInstance>(
  'SettingsAudit',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    settingId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'setting_id',
      references: {
        model: 'business_settings',
        key: 'id',
      },
    },
    ruleId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'rule_id',
      references: {
        model: 'pricing_rules',
        key: 'id',
      },
    },
    action: {
      type: DataTypes.ENUM(...Object.values(AuditAction)),
      allowNull: false,
    },
    oldValue: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'old_value',
    },
    newValue: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'new_value',
    },
    changedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'changed_by',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    changeReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'change_reason',
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'ip_address',
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'user_agent',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
    },
  },
  {
    tableName: 'settings_audit',
    timestamps: false, // Only createdAt, no updatedAt
    underscored: true,
    scopes: {
      recent: {
        order: [['createdAt', 'DESC']],
        limit: 100,
      },
    },
  }
);
