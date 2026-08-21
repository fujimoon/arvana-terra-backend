import { Router, Response } from 'express';
import { z } from 'zod';
import { equipmentService } from '../services/equipment.service';
import { authenticate } from '../middleware/auth';
import { requireLandlordOrHomeowner } from '../middleware/rbac';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/error';

const router = Router({ mergeParams: true });

router.get(
  '/',
  authenticate,
  requireLandlordOrHomeowner,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const equipment = await equipmentService.getEquipment(req.params.propertyId, req.user!.userId);
    res.json({ success: true, data: equipment });
  })
);

router.get(
  '/floor/:floor',
  authenticate,
  requireLandlordOrHomeowner,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const equipment = await equipmentService.getEquipmentByFloor(
      req.params.propertyId,
      parseInt(req.params.floor),
      req.user!.userId
    );
    res.json({ success: true, data: equipment });
  })
);

router.get(
  '/:id',
  authenticate,
  requireLandlordOrHomeowner,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const eq = await equipmentService.getEquipmentById(req.params.propertyId, req.params.id, req.user!.userId);
    res.json({ success: true, data: eq });
  })
);

const createEquipmentSchema = z.object({
  name: z.string().min(1),
  category: z.enum(['lighting', 'door', 'hvac', 'plumbing', 'electrical', 'elevator', 'camera', 'other']),
  roomId: z.string().optional(),
  floor: z.number().int().optional(),
  location: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  installDate: z.string().optional(),
  warrantyExpiry: z.string().optional(),
  status: z.enum(['good', 'warning', 'broken', 'replaced']).optional(),
  lastInspectionDate: z.string().optional(),
  nextInspectionDate: z.string().optional(),
  repairCostEstimate: z.number().optional(),
  notes: z.string().optional(),
});

router.post(
  '/',
  authenticate,
  requireLandlordOrHomeowner,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const body = {
      ...req.body,
      floor: req.body.floor ? parseInt(req.body.floor) : undefined,
      repairCostEstimate: req.body.repairCostEstimate ? parseFloat(req.body.repairCostEstimate) : undefined,
    };

    const parsed = createEquipmentSchema.safeParse(body);
    if (!parsed.success) throw new AppError(parsed.error.errors[0].message, 400);

    const eq = await equipmentService.createEquipment(req.params.propertyId, req.user!.userId, parsed.data);
    res.status(201).json({ success: true, data: eq });
  })
);

router.put(
  '/:id',
  authenticate,
  requireLandlordOrHomeowner,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const body = { ...req.body };
    if (body.floor) body.floor = parseInt(body.floor);
    if (body.repairCostEstimate) body.repairCostEstimate = parseFloat(body.repairCostEstimate);

    const eq = await equipmentService.updateEquipment(req.params.propertyId, req.params.id, req.user!.userId, body);
    res.json({ success: true, data: eq });
  })
);

router.delete(
  '/:id',
  authenticate,
  requireLandlordOrHomeowner,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await equipmentService.deleteEquipment(req.params.propertyId, req.params.id, req.user!.userId);
    res.json({ success: true, message: 'Equipment deleted successfully' });
  })
);

export default router;
