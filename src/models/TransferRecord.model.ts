import { DataTypes, Model } from 'sequelize';
import { sequelize } from '@config/database';
import { TransferRecordAttributes, TransferRecordCreationAttributes } from '@app-types/transfer.types';

interface TransferRecordInstance extends Model<TransferRecordAttributes, TransferRecordCreationAttributes>, TransferRecordAttributes {}

export const TransferRecord = sequelize.define<TransferRecordInstance>(
  'TransferRecord',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    cylinderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'cylinder_id',
      references: {
        model: 'cylinders',
        key: 'id',
      },
    },
    fromOutletId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'from_outlet_id',
      references: {
        model: 'outlets',
        key: 'id',
      },
    },
    toOutletId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'to_outlet_id',
      references: {
        model: 'outlets',
        key: 'id',
      },
    },
    // Keep transferredById for backward compatibility, maps to initiated_by_id
    transferredById: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'initiated_by_id',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    acceptedById: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'accepted_by_id',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'rejected'),
      allowNull: false,
      defaultValue: 'completed', // Default to completed for backward compatibility
    },
    transferDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'transfer_date',
    },
    reason: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'rejection_reason',
    },
    acceptedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'accepted_at',
    },
    rejectedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'rejected_at',
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
    tableName: 'transfer_records',
    timestamps: true,
    indexes: [
      {
        fields: ['cylinder_id'],
      },
      {
        fields: ['from_outlet_id'],
      },
      {
        fields: ['to_outlet_id'],
      },
      {
        fields: ['initiated_by_id'],
      },
      {
        fields: ['accepted_by_id'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['transfer_date'],
      },
      {
        fields: ['created_at'],
      },
    ],
    validate: {
      differentOutlets() {
        if (this.fromOutletId === this.toOutletId) {
          throw new Error('Cannot transfer cylinder to the same outlet');
        }
      },
      statusTransitions(this: any) {
        if (this.changed('status')) {
          const oldStatus = this.previous('status') as string;
          const newStatus = this.status as string;
          
          // Define valid status transitions
          const validTransitions: Record<string, string[]> = {
            'pending': ['completed', 'rejected'],
            'completed': [],
            'rejected': [],
          };
          
          if (oldStatus && !validTransitions[oldStatus]?.includes(newStatus)) {
            throw new Error(`Invalid status transition from ${oldStatus} to ${newStatus}`);
          }
        }
      },
      rejectionFields() {
        if (this.status === 'rejected' && !this.rejectionReason) {
          throw new Error('Rejection reason is required when status is rejected');
        }
        if (this.status === 'rejected' && !this.rejectedAt) {
          throw new Error('Rejected date is required when status is rejected');
        }
      },
      acceptanceFields() {
        if (this.status === 'completed' && !this.acceptedById) {
          throw new Error('Accepted by user is required when status is completed');
        }
        if (this.status === 'completed' && !this.acceptedAt) {
          throw new Error('Accepted date is required when status is completed');
        }
      },
    },
  }
);

// Override toJSON to include initiatedById as an alias for transferredById
TransferRecord.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  // Add initiatedById as an alias for transferredById for API consistency
  values.initiatedById = values.transferredById;
  return values;
};

export default TransferRecord;