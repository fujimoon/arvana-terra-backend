import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireAdmin, requireLandlordOrHomeowner } from '../middleware/rbac';
import { upload } from '../middleware/upload';
import { propertyService } from '../services/property.service';

const router = Router();

const propertySchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  description: z.string().optional(),
  price: z.number().optional()
});

// Public: list public properties
router.get('/public', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prefecture, status } = req.query;
    const properties = await propertyService.getPublicProperties({
      prefecture: prefecture as string | undefined,
      status: status as string | undefined
    });
    res.json({ success: true, data: properties });
  } catch (error) {
    next(error);
  }
});

// Owner: get my properties
router.get('/my', authenticate, requireLandlordOrHomeowner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const properties = await propertyService.getMyProperties(userId);
    res.json({ success: true, data: properties });
  } catch (error) {
    next(error);
  }
});

// Admin: get all properties
router.get('/', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    const properties = await propertyService.getAllProperties({ status: status as string });
    res.json({ success: true, data: properties });
  } catch (error) {
    next(error);
  }
});

// Owner: create property
router.post('/', authenticate, requireLandlordOrHomeowner, upload.array('images', 10), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = propertySchema.parse({
      ...req.body,
      price: req.body.price ? Number(req.body.price) : undefined
    });
    const files = req.files as Express.Multer.File[];
    const imageUrls = files?.map(f => `/uploads/${f.filename}`) || [];
    const thumbnailUrl = imageUrls[0] || undefined;
    const userId = (req as any).user.id;
    const property = await propertyService.createProperty({ ...data, ownerId: userId, imageUrls, thumbnailUrl });
    res.status(201).json({ success: true, data: property });
  } catch (error) {
    next(error);
  }
});

// Get single property by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;
    const property = await propertyService.getPropertyById(req.params.id, userId);
    res.json({ success: true, data: property });
  } catch (error) {
    next(error);
  }
});

// Owner: update property
router.patch('/:id', authenticate, requireLandlordOrHomeowner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const property = await propertyService.updateProperty(req.params.id, userId, req.body);
    res.json({ success: true, data: property });
  } catch (error) {
    next(error);
  }
});

// Owner: delete property
router.delete('/:id', authenticate, requireLandlordOrHomeowner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    await propertyService.deleteProperty(req.params.id, userId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
