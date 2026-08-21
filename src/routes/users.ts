import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/v1/users/me - get current user with preferences
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { preference: true },
      omit: { password: true }
    });
    res.json({ success: true, data: user });
  } catch (error) { next(error); }
});

// PUT /api/v1/users/me - update profile including prefectures
router.put('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const { name, phone, address, bio, prefecture, prefectures, profileImageUrl } = req.body;
    const user = await prisma.user.update({
      where: { id: userId },
      data: { name, phone, address, bio, prefecture, prefectures, profileImageUrl },
      omit: { password: true }
    });
    res.json({ success: true, data: user });
  } catch (error) { next(error); }
});

// Admin: GET /api/v1/users - list all users
router.get('/', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, prefecture, search } = req.query;
    const users = await prisma.user.findMany({
      where: {
        ...(role ? { role: role as string } : {}),
        ...(prefecture ? { prefectures: { has: prefecture as string } } : {}),
        ...(search ? {
          OR: [
            { name: { contains: search as string, mode: 'insensitive' } },
            { email: { contains: search as string, mode: 'insensitive' } }
          ]
        } : {})
      },
      omit: { password: true },
      include: { preference: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: users });
  } catch (error) { next(error); }
});

export default router;
