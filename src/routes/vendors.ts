import { Router, Response } from 'express';
import { z } from 'zod';
import { vendorService } from '../services/vendor.service';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/error';

const router = Router();

// Public: approved vendors
router.get(
  '/',
  asyncHandler(async (req, res: Response) => {
    const result = await vendorService.getPublicVendors(req.query as Record<string, string>);
    res.json({ success: true, ...result });
  })
);

router.get(
  '/my',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const vendors = await vendorService.getMyVendors(req.user!.userId);
    res.json({ success: true, data: vendors });
  })
);

router.post(
  '/apply',
  asyncHandler(async (req, res: Response) => {
    const schema = z.object({
      name: z.string().min(1),
      category: z.enum(['glass', 'electric', 'plumbing', 'construction', 'cleaning', 'security', 'other']),
      contactName: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      description: z.string().optional(),
      website: z.string().optional(),
      serviceAreas: z.array(z.string()).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.errors[0].message, 400);

    const vendor = await vendorService.applyVendor(parsed.data);
    res.status(201).json({ success: true, data: vendor, message: 'Application submitted. Pending admin approval.' });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res: Response) => {
    const vendor = await vendorService.getVendorById(req.params.id);
    res.json({ success: true, data: vendor });
  })
);

router.post(
  '/:id/connect',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { notes } = req.body;
    const connection = await vendorService.connectVendor(req.user!.userId, req.params.id, notes);
    res.status(201).json({ success: true, data: connection });
  })
);

router.delete(
  '/:id/connect',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await vendorService.disconnectVendor(req.user!.userId, req.params.id);
    res.json({ success: true, message: 'Disconnected from vendor' });
  })
);

export default router;
