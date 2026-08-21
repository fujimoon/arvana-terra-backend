import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireAdmin, requireLandlordOrHomeowner } from '../middleware/rbac';
import { upload } from '../middleware/upload';
import { landService } from '../services/land.service';

const router = Router();

const landSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  description: z.string().optional(),
  price: z.number().optional()
});

// Public: list public lands
router.get('/public', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prefecture, status } = req.query;
    const lands = await landService.getPublicLands({
      prefecture: prefecture as string | undefined,
      status: status as string | undefined
    });
    res.json({ success: true, data: lands });
  } catch (error) {
    next(error);
  }
});

// Owner: get my lands
router.get('/my', authenticate, requireLandlordOrHomeowner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const lands = await landService.getMyLands(userId);
    res.json({ success: true, data: lands });
  } catch (error) {
    next(error);
  }
});

// Admin: get all lands
router.get('/', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    const lands = await landService.getAllLands({ status: status as string });
    res.json({ success: true, data: lands });
  } catch (error) {
    next(error);
  }
});

// Owner: create land
router.post('/', authenticate, requireLandlordOrHomeowner, upload.array('images', 10), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = landSchema.parse({
      ...req.body,
      price: req.body.price ? Number(req.body.price) : undefined
    });
    const files = req.files as Express.Multer.File[];
    const imageUrls = files?.map(f => `/uploads/${f.filename}`) || [];
    const thumbnailUrl = imageUrls[0] || undefined;
    const userId = (req as any).user.id;
    const land = await landService.createLand({ ...data, ownerId: userId, imageUrls, thumbnailUrl });
    res.status(201).json({ success: true, data: land });
  } catch (error) {
    next(error);
  }
});

// Get single land by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;
    const land = await landService.getLandById(req.params.id, userId);
    res.json({ success: true, data: land });
  } catch (error) {
    next(error);
  }
});

// Owner: update land
router.patch('/:id', authenticate, requireLandlordOrHomeowner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const land = await landService.updateLand(req.params.id, userId, req.body);
    res.json({ success: true, data: land });
  } catch (error) {
    next(error);
  }
});

// Owner: delete land
router.delete('/:id', authenticate, requireLandlordOrHomeowner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    await landService.deleteLand(req.params.id, userId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
