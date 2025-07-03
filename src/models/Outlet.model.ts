import { DataTypes, Model } from 'sequelize';
import { sequelize } from '@config/database';
import { OutletAttributes, OutletCreationAttributes } from '@app-types/outlet.types';

interface OutletInstance
  extends Model<OutletAttributes, OutletCreationAttributes>,
    OutletAttributes {}

export const Outlet = sequelize.define<OutletInstance>(
  'Outlet',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    location: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    contactPhone: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'contact_phone',
    },
    contactEmail: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'contact_email',
      validate: {
        isEmail: true,
      },
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active',
      allowNull: false,
    },
    managerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'manager_id',
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
    tableName: 'outlets',
    timestamps: true,
    indexes: [
      {
        fields: ['status'],
      },
      {
        fields: ['manager_id'],
      },
    ],
  }
);

export default Outlet;
