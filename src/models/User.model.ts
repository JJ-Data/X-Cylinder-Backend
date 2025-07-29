import { DataTypes, Model } from 'sequelize';
import * as bcrypt from 'bcrypt';
import { sequelize } from '@config/database';
import { UserAttributes, UserCreationAttributes } from '@app-types/user.types';
import { CONSTANTS } from '@config/constants';

interface UserInstance extends Model<UserAttributes, UserCreationAttributes>, UserAttributes {
  comparePassword(password: string): Promise<boolean>;
  toPublicJSON(): any;
}

export const User = sequelize.define<UserInstance>(
  'User',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: {
          msg: 'Invalid email format',
        },
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'first_name',
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'last_name',
    },
    role: {
      type: DataTypes.ENUM(...Object.values(CONSTANTS.USER_ROLES)),
      defaultValue: CONSTANTS.USER_ROLES.CUSTOMER,
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      field: 'is_active',
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      field: 'email_verified',
    },
    emailVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'email_verified_at',
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_login',
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
    paymentStatus: {
      type: DataTypes.ENUM('pending', 'active', 'inactive'),
      defaultValue: 'pending',
      allowNull: true,
      field: 'payment_status',
    },
    activatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'activated_at',
    },
    phoneNumber: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'phone_number',
    },
    alternatePhone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'alternate_phone',
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'address',
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'city',
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'state',
    },
    postalCode: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'postal_code',
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
    tableName: 'users',
    timestamps: true,
    hooks: {
      beforeCreate: async (user: UserInstance) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, CONSTANTS.SALT_ROUNDS);
        }
      },
      beforeUpdate: async (user: UserInstance) => {
        if (user.changed('password') && user.password) {
          user.password = await bcrypt.hash(user.password, CONSTANTS.SALT_ROUNDS);
        }
      },
    },
    indexes: [
      {
        unique: true,
        fields: ['email'],
      },
      {
        fields: ['role'],
      },
      {
        fields: ['is_active'],
      },
      {
        fields: ['outlet_id'],
      },
      {
        fields: ['payment_status'],
      },
    ],
  }
);

// Add instance methods to the prototype with proper typing
(User as any).prototype.comparePassword = async function (
  this: UserInstance,
  password: string
): Promise<boolean> {
  if (!this.password) {
    return false; // Users without passwords cannot authenticate with password
  }
  return bcrypt.compare(password, this.password);
};

(User as any).prototype.toPublicJSON = function (this: UserInstance) {
  const { password, ...publicData } = this.toJSON();
  return publicData;
};

export default User;
