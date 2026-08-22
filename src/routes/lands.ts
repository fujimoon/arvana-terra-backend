import { Router, Response } from 'express';
import { z } from 'zod';
import { landService } from '../services/land.service';
import { authenticate } from '../middleware/auth';
import { requireLandlordOrHomeowner } from '../middleware/rbac';
import { uploadSingle, uploadMultiple } from '../middleware/upload';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/error';

const router = Router();

// Public routes
router.get(
  '/',
  asyncHandler(async (req, res: Response) => {
    const result = await landService.getPublicLands(req.query as Record<string, string>);
    res.json({ success: true, ...result });
  })
);

// Private routes (owner) — must be before /:id
router.get(
  '/my',
  authenticate,
  requireLandlordOrHomeowner,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await landService.getMyLands(req.user!.userId, req.query as Record<string, string>);
    res.json({ success: true, ...result });
  })
);

router.get(
  '/my/:id',
  authenticate,
  requireLandlordOrHomeowner,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const land = await landService.getMyLandById(req.params.id, req.user!.userId);
    res.json({ success: true, data: land });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res: Response) => {
    const land = await landService.getPublicLandById(req.params.id);
    res.json({ success: true, data: land });
  })
);

const createLandSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  area: z.number().positive(),
  zoning: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'for_sale', 'sold']).optional(),
  isPublic: z.boolean().optional(),
  imageUrls: z.array(z.string()).optional(),
  purchasePrice: z.number().optional(),
  currentValue: z.number().optional(),
  purchaseDate: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

router.post(
  '/',
  authenticate,
  requireLandlordOrHomeowner,
  uploadSingle,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const body = {
      ...req.body,
      area: parseFloat(req.body.area),
      isPublic: req.body.isPublic === 'true',
      purchasePrice: req.body.purchasePrice ? parseFloat(req.body.purchasePrice) : undefined,
      currentValue: req.body.currentValue ? parseFloat(req.body.currentValue) : undefined,
      imageUrls: req.body.imageUrls ? JSON.parse(req.body.imageUrls) : undefined,
      tags: req.body.tags ? JSON.parse(req.body.tags) : undefined,
    };

    const parsed = createLandSchema.safeParse(body);
    if (!parsed.success) throw new AppError(parsed.error.errors[0].message, 400);

    const thumbnailUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
    const land = await landService.createLand(req.user!.userId, { ...parsed.data, thumbnailUrl });
    res.status(201).json({ success: true, data: land });
  })
);

router.put(
  '/:id',
  authenticate,
  requireLandlordOrHomeowner,
  uploadSingle,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const body = { ...req.body };
    if (body.area) body.area = parseFloat(body.area);
    if (body.isPublic !== undefined) body.isPublic = body.isPublic === 'true';
    if (body.purchasePrice) body.purchasePrice = parseFloat(body.purchasePrice);
    if (body.currentValue) body.currentValue = parseFloat(body.currentValue);
    if (body.imageUrls) body.imageUrls = JSON.parse(body.imageUrls);
    if (body.tags) body.tags = JSON.parse(body.tags);

    const thumbnailUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
    if (thumbnailUrl) body.thumbnailUrl = thumbnailUrl;

    const land = await landService.updateLand(req.params.id, req.user!.userId, body);
    res.json({ success: true, data: land });
  })
);

router.delete(
  '/:id',
  authenticate,
  requireLandlordOrHomeowner,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await landService.deleteLand(req.params.id, req.user!.userId);
    res.json({ success: true, message: 'Land deleted successfully' });
  })
);

export default router;
