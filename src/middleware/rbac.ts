import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { UserRole } from '@prisma/client';

export const requireRoles = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `This action requires one of: ${roles.join(', ')}`,
      });
      return;
    }
    next();
  };
};

export const requireAdmin = requireRoles('admin', 'super_admin');

export const requireSuperAdmin = requireRoles('super_admin');

export const requireLandlordOrHomeowner = requireRoles('landlord', 'homeowner', 'admin', 'super_admin');
