import { DataTypes, Model } from 'sequelize';
import { randomBytes } from 'crypto';
import { sequelize } from '@config/database';
import {
  EmailVerificationTokenAttributes,
  EmailVerificationTokenCreationAttributes,
} from '@app-types/auth.types';

interface EmailVerificationTokenInstance
  extends Model<EmailVerificationTokenAttributes, EmailVerificationTokenCreationAttributes>,
    EmailVerificationTokenAttributes {
  generateToken(): string;
}

export const EmailVerificationToken = sequelize.define<EmailVerificationTokenInstance>(
  'EmailVerificationToken',
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
    verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'verified_at',
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
    tableName: 'email_verification_tokens',
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
        fields: ['verified'],
      },
    ],
    hooks: {
      beforeCreate: (token: EmailVerificationTokenInstance) => {
        // Generate a secure random token if not provided
        if (!token.token) {
          token.token = randomBytes(32).toString('hex');
        }
        // Set expiration to 24 hours from now if not provided
        if (!token.expiresAt) {
          token.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        }
      },
      beforeUpdate: (token: EmailVerificationTokenInstance) => {
        // Set verifiedAt timestamp when token is verified
        if (token.changed('verified') && token.verified && !token.verifiedAt) {
          token.verifiedAt = new Date();
        }
      },
    },
  }
);

export default EmailVerificationToken;
