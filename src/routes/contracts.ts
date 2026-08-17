import { Router, Response } from 'express';
import { z } from 'zod';
import { contractService } from '../services/contract.service';
import { authenticate } from '../middleware/auth';
import { requireLandlordOrHomeowner } from '../middleware/rbac';
import { uploadFile } from '../middleware/upload';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/error';

const router = Router();

// Property contracts
router.get(
  '/by-property/:propertyId',
  authenticate,
  requireLandlordOrHomeowner,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await contractService.getContractsByProperty(
      req.params.propertyId,
      req.user!.userId,
      req.query as Record<string, string>
    );
    res.json({ success: true, ...result });
  })
);

router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const contract = await contractService.getContractById(req.params.id, req.user!.userId);
    res.json({ success: true, data: contract });
  })
);

const createContractSchema = z.object({
  propertyId: z.string().optional(),
  landId: z.string().optional(),
  type: z.enum(['nda', 'rental', 'purchase', 'management', 'other']),
  title: z.string().min(1),
  content: z.string().min(1),
  templateId: z.string().optional(),
  parties: z.array(z.unknown()).optional(),
  signedDate: z.string().optional(),
  expiryDate: z.string().optional(),
  status: z.enum(['draft', 'active', 'expired', 'terminated']).optional(),
});

router.post(
  '/',
  authenticate,
  requireLandlordOrHomeowner,
  uploadFile,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const parsed = createContractSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.errors[0].message, 400);

    const fileUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
    const contract = await contractService.createContract(req.user!.userId, { ...parsed.data, fileUrl });
    res.status(201).json({ success: true, data: contract });
  })
);

router.put(
  '/:id',
  authenticate,
  requireLandlordOrHomeowner,
  uploadFile,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const body = { ...req.body };
    if (req.file) body.fileUrl = `/uploads/${req.file.filename}`;

    const contract = await contractService.updateContract(req.params.id, req.user!.userId, body);
    res.json({ success: true, data: contract });
  })
);

router.delete(
  '/:id',
  authenticate,
  requireLandlordOrHomeowner,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await contractService.deleteContract(req.params.id, req.user!.userId);
    res.json({ success: true, message: 'Contract deleted successfully' });
  })
);

// Template routes
router.get(
  '/templates',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await contractService.getTemplates(req.query as Record<string, string>);
    res.json({ success: true, ...result });
  })
);

router.post(
  '/templates',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const schema = z.object({
      type: z.enum(['nda', 'rental', 'purchase', 'management', 'other']),
      title: z.string().min(1),
      content: z.string().min(1),
      isOfficial: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.errors[0].message, 400);

    const template = await contractService.createTemplate(req.user!.userId, parsed.data);
    res.status(201).json({ success: true, data: template });
  })
);

router.put(
  '/templates/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const template = await contractService.updateTemplate(req.params.id, req.body);
    res.json({ success: true, data: template });
  })
);

export default router;
