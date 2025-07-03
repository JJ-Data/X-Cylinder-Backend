import { sequelize } from '@config/database';
import User from './User.model';
import RefreshToken from './RefreshToken.model';
import PasswordResetToken from './PasswordResetToken.model';
import EmailVerificationToken from './EmailVerificationToken.model';
import Outlet from './Outlet.model';
import Cylinder from './Cylinder.model';
import LeaseRecord from './LeaseRecord.model';
import RefillRecord from './RefillRecord.model';
import TransferRecord from './TransferRecord.model';
import setupAssociations from './associations';

// Setup model associations
setupAssociations();

export {
  sequelize,
  User,
  RefreshToken,
  PasswordResetToken,
  EmailVerificationToken,
  Outlet,
  Cylinder,
  LeaseRecord,
  RefillRecord,
  TransferRecord,
};

