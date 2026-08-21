import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/error';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1),
  role: z.enum(['landlord', 'homeowner', 'employer']),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post(
  '/register',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors.map((e) => e.message).join(', '), 400);
    }
    const result = await authService.register(parsed.data);
    res.status(201).json({ success: true, data: result });
  })
);

router.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('Invalid email or password', 400);
    }
    const result = await authService.login(parsed.data.email, parsed.data.password);
    res.json({ success: true, data: result });
  })
);

router.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new AppError('Refresh token required', 400);
    const tokens = await authService.refreshTokens(refreshToken);
    res.json({ success: true, data: tokens });
  })
);

router.post(
  '/logout',
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    if (refreshToken) await authService.logout(refreshToken);
    res.json({ success: true, message: 'Logged out successfully' });
  })
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = await authService.getMe(req.user!.userId);
    res.json({ success: true, data: user });
  })
);

router.put(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const schema = z.object({
      name: z.string().min(1).optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      bio: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.errors[0].message, 400);

    // Handle profile image upload
    const profileImageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

    const user = await authService.updateMe(req.user!.userId, {
      ...parsed.data,
      ...(profileImageUrl && { profileImageUrl }),
    });
    res.json({ success: true, data: user });
  })
);

export default router;
