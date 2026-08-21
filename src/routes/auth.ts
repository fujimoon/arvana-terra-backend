import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  phone: z.string().optional(),
  role: z.enum(['homeowner', 'landlord']).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body);
    const result = await authService.register(data);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.login(email, password);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
