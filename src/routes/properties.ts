import { Router, Response } from 'express';
import { z } from 'zod';
import { propertyService } from '../services/property.service';
import { authenticate } from '../middleware/auth';
import { requireLandlordOrHomeowner } from '../middleware/rbac';
import { uploadSingle } from '../middleware/upload';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/error';

const router = Router();

// Public routes
router.get(
  '/',
  asyncHandler(async (req, res: Response) => {
    const result = await propertyService.getPublicProperties(req.query as Record<string, string>);
    res.json({ success: true, ...result });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res: Response) => {
    const property = await propertyService.getPublicPropertyById(req.params.id);
    res.json({ success: true, data: property });
  })
);

// Private routes
router.get(
  '/my',
  authenticate,
  requireLandlordOrHomeowner,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await propertyService.getMyProperties(req.user!.userId, req.query as Record<string, string>);
    res.json({ success: true, ...result });
  })
);

router.get(
  '/my/:id',
  authenticate,
  requireLandlordOrHomeowner,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const property = await propertyService.getMyPropertyById(req.params.id, req.user!.userId);
    res.json({ success: true, data: property });
  })
);

const createPropertySchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  buildingType: z.enum(['apartment', 'house', 'commercial', 'warehouse', 'other']),
  area: z.number().positive(),
  landId: z.string().optional(),
  floors: z.number().int().optional(),
  totalRooms: z.number().int().optional(),
  builtYear: z.number().int().optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'for_sale', 'sold', 'under_renovation']).optional(),
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
      floors: req.body.floors ? parseInt(req.body.floors) : undefined,
      totalRooms: req.body.totalRooms ? parseInt(req.body.totalRooms) : undefined,
      builtYear: req.body.builtYear ? parseInt(req.body.builtYear) : undefined,
      purchasePrice: req.body.purchasePrice ? parseFloat(req.body.purchasePrice) : undefined,
      currentValue: req.body.currentValue ? parseFloat(req.body.currentValue) : undefined,
      imageUrls: req.body.imageUrls ? JSON.parse(req.body.imageUrls) : undefined,
      tags: req.body.tags ? JSON.parse(req.body.tags) : undefined,
    };

    const parsed = createPropertySchema.safeParse(body);
    if (!parsed.success) throw new AppError(parsed.error.errors[0].message, 400);

    const thumbnailUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
    const property = await propertyService.createProperty(req.user!.userId, { ...parsed.data, thumbnailUrl });
    res.status(201).json({ success: true, data: property });
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
    if (body.floors) body.floors = parseInt(body.floors);
    if (body.totalRooms) body.totalRooms = parseInt(body.totalRooms);
    if (body.builtYear) body.builtYear = parseInt(body.builtYear);
    if (body.purchasePrice) body.purchasePrice = parseFloat(body.purchasePrice);
    if (body.currentValue) body.currentValue = parseFloat(body.currentValue);
    if (body.imageUrls) body.imageUrls = JSON.parse(body.imageUrls);
    if (body.tags) body.tags = JSON.parse(body.tags);
    if (req.file) body.thumbnailUrl = `/uploads/${req.file.filename}`;

    const property = await propertyService.updateProperty(req.params.id, req.user!.userId, body);
    res.json({ success: true, data: property });
  })
);

router.delete(
  '/:id',
  authenticate,
  requireLandlordOrHomeowner,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await propertyService.deleteProperty(req.params.id, req.user!.userId);
    res.json({ success: true, message: 'Property deleted successfully' });
  })
);

export default router;
