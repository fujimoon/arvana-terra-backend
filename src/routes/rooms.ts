import { Router, Response } from 'express';
import { z } from 'zod';
import { roomService } from '../services/room.service';
import { authenticate } from '../middleware/auth';
import { requireLandlordOrHomeowner } from '../middleware/rbac';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/error';
import { prisma } from '../lib/prisma';

const router = Router({ mergeParams: true });

router.get(
  '/',
  authenticate,
  requireLandlordOrHomeowner,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const rooms = await roomService.getRooms(req.params.propertyId, req.user!.userId);
    res.json({ success: true, data: rooms });
  })
);

router.get(
  '/:id',
  authenticate,
  requireLandlordOrHomeowner,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const room = await roomService.getRoomById(req.params.propertyId, req.params.id, req.user!.userId);
    res.json({ success: true, data: room });
  })
);

const createRoomSchema = z.object({
  roomNumber: z.string().min(1),
  floor: z.number().int().optional(),
  type: z.enum(['studio', 'one_k', 'one_ldk', 'two_ldk', 'three_ldk', 'four_ldk', 'office', 'shop', 'other']),
  area: z.number().positive().optional(),
  rentPrice: z.number().positive().optional(),
  status: z.enum(['occupied', 'vacant', 'maintenance']).optional(),
  notes: z.string().optional(),
  memo: z.string().optional(),
});

router.post(
  '/',
  authenticate,
  requireLandlordOrHomeowner,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const body = {
      ...req.body,
      floor: req.body.floor ? parseInt(req.body.floor) : undefined,
      area: req.body.area ? parseFloat(req.body.area) : undefined,
      rentPrice: req.body.rentPrice ? parseFloat(req.body.rentPrice) : undefined,
    };

    const parsed = createRoomSchema.safeParse(body);
    if (!parsed.success) throw new AppError(parsed.error.errors[0].message, 400);

    const room = await roomService.createRoom(req.params.propertyId, req.user!.userId, parsed.data);
    res.status(201).json({ success: true, data: room });
  })
);

router.put(
  '/:id',
  authenticate,
  requireLandlordOrHomeowner,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const body = { ...req.body };
    if (body.floor) body.floor = parseInt(body.floor);
    if (body.area) body.area = parseFloat(body.area);
    if (body.rentPrice) body.rentPrice = parseFloat(body.rentPrice);

    const room = await roomService.updateRoom(req.params.propertyId, req.params.id, req.user!.userId, body);
    res.json({ success: true, data: room });
  })
);

router.delete(
  '/:id',
  authenticate,
  requireLandlordOrHomeowner,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await roomService.deleteRoom(req.params.propertyId, req.params.id, req.user!.userId);
    res.json({ success: true, message: 'Room deleted successfully' });
  })
);

// ---- Tenant sub-routes ----
router.get(
  '/:roomId/tenant',
  authenticate,
  requireLandlordOrHomeowner,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const room = await prisma.room.findFirst({
      where: { id: req.params.roomId, propertyId: req.params.propertyId },
    });
    if (!room) throw new AppError('Room not found', 404);

    const tenant = await prisma.tenant.findUnique({
      where: { roomId: req.params.roomId },
    });
    res.json({ success: true, data: tenant });
  })
);

const createTenantSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  moveInDate: z.string(),
  moveOutDate: z.string().optional(),
  contractEndDate: z.string().optional(),
  rentAmount: z.number().positive(),
  depositAmount: z.number().optional(),
  paymentStatus: z.enum(['current', 'late', 'defaulted']).optional(),
  notes: z.string().optional(),
});

router.post(
  '/:roomId/tenant',
  authenticate,
  requireLandlordOrHomeowner,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const body = {
      ...req.body,
      rentAmount: parseFloat(req.body.rentAmount),
      depositAmount: req.body.depositAmount ? parseFloat(req.body.depositAmount) : undefined,
    };

    const parsed = createTenantSchema.safeParse(body);
    if (!parsed.success) throw new AppError(parsed.error.errors[0].message, 400);

    const existing = await prisma.tenant.findFirst({
      where: { roomId: req.params.roomId, moveOutDate: null },
    });
    if (existing) throw new AppError('Room already has an active tenant', 409);

    const tenant = await prisma.tenant.create({
      data: {
        roomId: req.params.roomId,
        propertyId: req.params.propertyId,
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        moveInDate: new Date(parsed.data.moveInDate),
        moveOutDate: parsed.data.moveOutDate ? new Date(parsed.data.moveOutDate) : undefined,
        contractEndDate: parsed.data.contractEndDate ? new Date(parsed.data.contractEndDate) : undefined,
        rentAmount: parsed.data.rentAmount,
        depositAmount: parsed.data.depositAmount,
        paymentStatus: parsed.data.paymentStatus || 'current',
        notes: parsed.data.notes,
      },
    });

    await prisma.room.update({ where: { id: req.params.roomId }, data: { status: 'occupied' } });

    res.status(201).json({ success: true, data: tenant });
  })
);

router.put(
  '/:roomId/tenant/:id',
  authenticate,
  requireLandlordOrHomeowner,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const body = { ...req.body };
    if (body.rentAmount) body.rentAmount = parseFloat(body.rentAmount);
    if (body.depositAmount) body.depositAmount = parseFloat(body.depositAmount);
    if (body.moveInDate) body.moveInDate = new Date(body.moveInDate);
    if (body.moveOutDate) body.moveOutDate = new Date(body.moveOutDate);
    if (body.contractEndDate) body.contractEndDate = new Date(body.contractEndDate);

    const tenant = await prisma.tenant.findFirst({
      where: { id: req.params.id, roomId: req.params.roomId },
    });
    if (!tenant) throw new AppError('Tenant not found', 404);

    const updated = await prisma.tenant.update({ where: { id: req.params.id }, data: body });

    if (body.moveOutDate) {
      await prisma.room.update({ where: { id: req.params.roomId }, data: { status: 'vacant' } });
    }

    res.json({ success: true, data: updated });
  })
);

export default router;
