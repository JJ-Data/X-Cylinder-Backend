import { DataTypes, Model } from 'sequelize';
import { sequelize } from '@config/database';

export interface LoginSessionAttributes {
  id?: number;
  userId: number;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  deviceInfo?: string;
  browserInfo?: string;
  location?: string;
  loginType: 'normal' | 'suspicious' | 'new_device';
  isSuspicious: boolean;
  isNewDevice: boolean;
  emailSent: boolean;
  loginTime: Date;
  logoutTime?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginSessionCreationAttributes extends Omit<LoginSessionAttributes, 'id' | 'createdAt' | 'updatedAt'> {
  id?: number;
}

interface LoginSessionInstance extends Model<LoginSessionAttributes, LoginSessionCreationAttributes>, LoginSessionAttributes {}

export const LoginSession = sequelize.define<LoginSessionInstance>(
  'LoginSession',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    sessionId: {
      type: DataTypes.STRING(512), // Increased to accommodate JWT tokens
      allowNull: false,
      unique: true,
      field: 'session_id',
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: false,
      field: 'ip_address',
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'user_agent',
    },
    deviceInfo: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'device_info',
    },
    browserInfo: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'browser_info',
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'location',
    },
    loginType: {
      type: DataTypes.ENUM('normal', 'suspicious', 'new_device'),
      defaultValue: 'normal',
      allowNull: false,
      field: 'login_type',
    },
    isSuspicious: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      field: 'is_suspicious',
    },
    isNewDevice: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      field: 'is_new_device',
    },
    emailSent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      field: 'email_sent',
    },
    loginTime: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'login_time',
    },
    logoutTime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'logout_time',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      field: 'is_active',
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
    tableName: 'login_sessions',
    timestamps: true,
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['session_id'],
        unique: true,
      },
      {
        fields: ['ip_address'],
      },
      {
        fields: ['login_time'],
      },
      {
        fields: ['is_active'],
      },
    ],
  }
);

export default LoginSession;