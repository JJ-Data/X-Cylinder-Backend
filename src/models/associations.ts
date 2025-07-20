import User from './User.model';
import RefreshToken from './RefreshToken.model';
import PasswordResetToken from './PasswordResetToken.model';
import EmailVerificationToken from './EmailVerificationToken.model';
import Outlet from './Outlet.model';
import Cylinder from './Cylinder.model';
import LeaseRecord from './LeaseRecord.model';
import RefillRecord from './RefillRecord.model';
import TransferRecord from './TransferRecord.model';
import SwapRecord from './SwapRecord.model';

export const setupAssociations = (): void => {
  // User has many RefreshTokens
  User.hasMany(RefreshToken, {
    foreignKey: 'userId',
    as: 'refreshTokens',
    onDelete: 'CASCADE',
  });

  // RefreshToken belongs to User
  RefreshToken.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  // User has many PasswordResetTokens
  User.hasMany(PasswordResetToken, {
    foreignKey: 'userId',
    as: 'passwordResetTokens',
    onDelete: 'CASCADE',
  });

  // PasswordResetToken belongs to User
  PasswordResetToken.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  // User has many EmailVerificationTokens
  User.hasMany(EmailVerificationToken, {
    foreignKey: 'userId',
    as: 'emailVerificationTokens',
    onDelete: 'CASCADE',
  });

  // EmailVerificationToken belongs to User
  EmailVerificationToken.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  // Outlet associations
  Outlet.belongsTo(User, {
    foreignKey: 'managerId',
    as: 'manager',
  });

  Outlet.hasMany(User, {
    foreignKey: 'outletId',
    as: 'staff',
  });

  Outlet.hasMany(Cylinder, {
    foreignKey: 'currentOutletId',
    as: 'cylinders',
  });

  Outlet.hasMany(LeaseRecord, {
    foreignKey: 'outletId',
    as: 'leaseRecords',
  });

  // User associations for CylinderX
  User.belongsTo(Outlet, {
    foreignKey: 'outletId',
    as: 'outlet',
  });

  User.hasMany(LeaseRecord, {
    foreignKey: 'customerId',
    as: 'customerLeases',
  });

  User.hasMany(LeaseRecord, {
    foreignKey: 'staffId',
    as: 'staffLeases',
  });

  User.hasMany(RefillRecord, {
    foreignKey: 'operatorId',
    as: 'refillRecords',
  });

  // Cylinder associations
  Cylinder.belongsTo(Outlet, {
    foreignKey: 'currentOutletId',
    as: 'currentOutlet',
  });

  Cylinder.hasMany(LeaseRecord, {
    foreignKey: 'cylinderId',
    as: 'leaseRecords',
  });

  Cylinder.hasMany(RefillRecord, {
    foreignKey: 'cylinderId',
    as: 'refillRecords',
  });

  Cylinder.hasMany(TransferRecord, {
    foreignKey: 'cylinderId',
    as: 'transferRecords',
  });

  // LeaseRecord associations
  LeaseRecord.belongsTo(Cylinder, {
    foreignKey: 'cylinderId',
    as: 'cylinder',
  });

  LeaseRecord.belongsTo(User, {
    foreignKey: 'customerId',
    as: 'customer',
  });

  LeaseRecord.belongsTo(User, {
    foreignKey: 'staffId',
    as: 'staff',
  });

  LeaseRecord.belongsTo(User, {
    foreignKey: 'returnStaffId',
    as: 'returnStaff',
  });

  LeaseRecord.belongsTo(Outlet, {
    foreignKey: 'outletId',
    as: 'outlet',
  });

  // RefillRecord associations
  RefillRecord.belongsTo(Cylinder, {
    foreignKey: 'cylinderId',
    as: 'cylinder',
  });

  RefillRecord.belongsTo(User, {
    foreignKey: 'operatorId',
    as: 'operator',
  });

  RefillRecord.belongsTo(Outlet, {
    foreignKey: 'outletId',
    as: 'outlet',
  });

  // TransferRecord associations
  TransferRecord.belongsTo(Cylinder, {
    foreignKey: 'cylinderId',
    as: 'cylinder',
  });

  TransferRecord.belongsTo(Outlet, {
    foreignKey: 'fromOutletId',
    as: 'fromOutlet',
  });

  TransferRecord.belongsTo(Outlet, {
    foreignKey: 'toOutletId',
    as: 'toOutlet',
  });

  TransferRecord.belongsTo(User, {
    foreignKey: 'transferredById',
    as: 'transferredBy',
  });

  // Also add an alias for initiatedBy for API consistency
  TransferRecord.belongsTo(User, {
    foreignKey: 'transferredById',
    as: 'initiatedBy',
  });

  TransferRecord.belongsTo(User, {
    foreignKey: 'acceptedById',
    as: 'acceptedBy',
  });

  // Add additional associations for the enhanced TransferRecord
  User.hasMany(TransferRecord, {
    foreignKey: 'acceptedById',
    as: 'acceptedTransferRecords',
  });

  // SwapRecord associations
  SwapRecord.belongsTo(LeaseRecord, {
    foreignKey: 'leaseId',
    as: 'lease',
  });

  SwapRecord.belongsTo(Cylinder, {
    foreignKey: 'oldCylinderId',
    as: 'oldCylinder',
  });

  SwapRecord.belongsTo(Cylinder, {
    foreignKey: 'newCylinderId',
    as: 'newCylinder',
  });

  SwapRecord.belongsTo(User, {
    foreignKey: 'staffId',
    as: 'staff',
  });

  // Reverse associations for SwapRecord
  LeaseRecord.hasMany(SwapRecord, {
    foreignKey: 'leaseId',
    as: 'swapRecords',
  });

  Cylinder.hasMany(SwapRecord, {
    foreignKey: 'oldCylinderId',
    as: 'oldSwapRecords',
  });

  Cylinder.hasMany(SwapRecord, {
    foreignKey: 'newCylinderId',
    as: 'newSwapRecords',
  });

  User.hasMany(SwapRecord, {
    foreignKey: 'staffId',
    as: 'staffSwapRecords',
  });
};

export default setupAssociations;