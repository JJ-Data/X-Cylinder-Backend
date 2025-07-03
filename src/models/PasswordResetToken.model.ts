import { DataTypes, Model } from 'sequelize';
import { randomBytes } from 'crypto';
import { sequelize } from '@config/database';
import {
  PasswordResetTokenAttributes,
  PasswordResetTokenCreationAttributes,
} from '@app-types/auth.types';

interface PasswordResetTokenInstance
  extends Model<PasswordResetTokenAttributes, PasswordResetTokenCreationAttributes>,
    PasswordResetTokenAttributes {
  generateToken(): string;
}

export const PasswordResetToken = sequelize.define<PasswordResetTokenInstance>(
  'PasswordResetToken',
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
      onDelete: 'CASCADE',
    },
    token: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at',
    },
    used: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
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
    tableName: 'password_reset_tokens',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['token'],
      },
      {
        fields: ['user_id'],
      },
      {
        fields: ['expires_at'],
      },
      {
        fields: ['used'],
      },
    ],
    hooks: {
      beforeCreate: (token: PasswordResetTokenInstance) => {
        // Generate a secure random token if not provided
        if (!token.token) {
          token.token = randomBytes(32).toString('hex');
        }
        // Set expiration to 1 hour from now if not provided
        if (!token.expiresAt) {
          token.expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        }
      },
    },
  }
);

export default PasswordResetToken;
