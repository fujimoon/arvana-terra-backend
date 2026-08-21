import { Request, Response, NextFunction } from 'express';
import { AppError } from './error';
import { AuthenticatedRequest } from './auth';

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    return next(new AppError('認証が必要です', 401));
  }
  if (req.user.role !== 'admin') {
    return next(new AppError('管理者権限が必要です', 403));
  }
  next();
}

export function requireLandlordOrHomeowner(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    return next(new AppError('認証が必要です', 401));
  }
  if (!['landlord', 'homeowner', 'admin'].includes(req.user.role)) {
    return next(new AppError('権限がありません', 403));
  }
  next();
}

export function requireOwnerOrAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    return next(new AppError('認証が必要です', 401));
  }
  if (!['landlord', 'homeowner', 'admin'].includes(req.user.role)) {
    return next(new AppError('権限がありません', 403));
  }
  next();
}
