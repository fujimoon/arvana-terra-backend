import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireAdmin, requireLandlordOrHomeowner } from '../middleware/rbac';
import { saleRequestService } from '../services/saleRequest.service';
import { upload } from '../middleware/upload';

const router = Router();

const saleRequestSchema = z.object({
  type: z.enum(['property', 'land']),
  propertyId: z.string().optional(),
  landId: z.string().optional(),
  askingPrice: z.number().optional(),
  description: z.string().optional(),
  contactInfo: z.string().optional()
});

// Owner: submit sale listing request
router.post('/', authenticate, requireLandlordOrHomeowner, upload.array('images', 10), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = saleRequestSchema.parse({
      ...req.body,
      askingPrice: req.body.askingPrice ? Number(req.body.askingPrice) : undefined
    });
    const files = req.files as Express.Multer.File[];
    const imageUrls = files?.map(f => `/uploads/${f.filename}`) || [];
    const thumbnailUrl = imageUrls[0] || undefined;

    const userId = (req as any).user.id;
    const result = await saleRequestService.createSaleRequest({
      ...data,
      ownerId: userId,
      thumbnailUrl,
      imageUrls
    });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// Owner: get my sale requests
router.get('/my', authenticate, requireLandlordOrHomeowner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const requests = await saleRequestService.getMySaleRequests(userId);
    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
});

// Admin: get all sale requests
router.get('/', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    const requests = await saleRequestService.getAllSaleRequests({ status: status as string });
    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
});

// Admin: approve
router.patch('/:id/approve', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { adminNote } = req.body;
    const result = await saleRequestService.approveSaleRequest(req.params.id, adminNote);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// Admin: reject
router.patch('/:id/reject', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { adminNote } = req.body;
    if (!adminNote) {
      return res.status(400).json({ success: false, error: '却下理由を入力してください' });
    }
    const result = await saleRequestService.rejectSaleRequest(req.params.id, adminNote);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
