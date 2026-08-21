import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';
import { prisma } from '../lib/prisma';
import { UserRole } from '@prisma/client';

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  phone: true,
  address: true,
  profileImageUrl: true,
  bio: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

const router = Router();

// GET /api/v1/users/me
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { ...userSelect, preference: true },
    });
    res.json({ success: true, data: user });
  } catch (error) { next(error); }
});

// PUT /api/v1/users/me
router.put('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.userId;
    const { name, phone, address, bio, profileImageUrl } = req.body;
    const user = await prisma.user.update({
      where: { id: userId },
      data: { name, phone, address, bio, profileImageUrl },
      select: userSelect,
    });
    res.json({ success: true, data: user });
  } catch (error) { next(error); }
});

// Admin: GET /api/v1/users
router.get('/', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, search } = req.query;
    const users = await prisma.user.findMany({
      where: {
        ...(role ? { role: role as UserRole } : {}),
        ...(search ? {
          OR: [
            { name: { contains: search as string, mode: 'insensitive' } },
            { email: { contains: search as string, mode: 'insensitive' } },
          ],
        } : {}),
      },
      select: { ...userSelect, preference: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: users });
  } catch (error) { next(error); }
});

export default router;
