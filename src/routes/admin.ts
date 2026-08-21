import { Router, Response } from 'express';
import { z } from 'zod';
import { vendorService } from '../services/vendor.service';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/error';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// Vendor management
router.get(
  '/vendors',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await vendorService.getAllVendors(req.query as Record<string, string>);
    res.json({ success: true, ...result });
  })
);

router.post(
  '/vendors',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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

    const vendor = await vendorService.adminCreateVendor(req.user!.userId, parsed.data);
    res.status(201).json({ success: true, data: vendor });
  })
);

router.patch(
  '/vendors/:id/approve',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const vendor = await vendorService.approveVendor(req.params.id, req.user!.userId);
    res.json({ success: true, data: vendor });
  })
);

router.delete(
  '/vendors/:id',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await vendorService.adminDeleteVendor(req.params.id);
    res.json({ success: true, message: 'Vendor deleted successfully' });
  })
);

export default router;
