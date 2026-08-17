import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { requireLandlordOrHomeowner } from '../middleware/rbac';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/error';
import { notificationService } from '../services/notification.service';

const router = Router({ mergeParams: true });

async function verifyPropertyOwnership(propertyId: string, userId: string) {
  const property = await prisma.property.findFirst({ where: { id: propertyId, ownerId: userId } });
  if (!property) throw new AppError('Property not found', 404);
  return property;
}

router.get(
  '/',
  authenticate,
  requireLandlordOrHomeowner,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await verifyPropertyOwnership(req.params.propertyId, req.user!.userId);
    const devices = await prisma.smartDeviceData.findMany({
      where: { propertyId: req.params.propertyId },
      include: { room: { select: { id: true, roomNumber: true } } },
      orderBy: { lastUpdated: 'desc' },
    });
    res.json({ success: true, data: devices });
  })
);

router.get(
  '/:id',
  authenticate,
  requireLandlordOrHomeowner,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await verifyPropertyOwnership(req.params.propertyId, req.user!.userId);
    const device = await prisma.smartDeviceData.findFirst({
      where: { id: req.params.id, propertyId: req.params.propertyId },
      include: { room: true },
    });
    if (!device) throw new AppError('Smart device not found', 404);
    res.json({ success: true, data: device });
  })
);

const createDeviceSchema = z.object({
  deviceType: z.enum(['water_meter', 'electric_meter', 'camera', 'sensor']),
  deviceId: z.string().min(1),
  roomId: z.string().optional(),
  location: z.string().optional(),
  readings: z.array(z.object({ date: z.string(), value: z.number() })).optional(),
  cameraStatus: z.enum(['active', 'inactive', 'error']).optional(),
});

router.post(
  '/',
  authenticate,
  requireLandlordOrHomeowner,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await verifyPropertyOwnership(req.params.propertyId, req.user!.userId);

    const parsed = createDeviceSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.errors[0].message, 400);

    const device = await prisma.smartDeviceData.create({
      data: {
        propertyId: req.params.propertyId,
        roomId: parsed.data.roomId,
        deviceType: parsed.data.deviceType,
        deviceId: parsed.data.deviceId,
        location: parsed.data.location,
        readings: parsed.data.readings || [],
        cameraStatus: parsed.data.cameraStatus,
      },
    });
    res.status(201).json({ success: true, data: device });
  })
);

router.put(
  '/:id',
  authenticate,
  requireLandlordOrHomeowner,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await verifyPropertyOwnership(req.params.propertyId, req.user!.userId);
    const device = await prisma.smartDeviceData.findFirst({
      where: { id: req.params.id, propertyId: req.params.propertyId },
    });
    if (!device) throw new AppError('Smart device not found', 404);

    const { readings, cameraStatus, location, roomId } = req.body;
    const updateData: Record<string, unknown> = { lastUpdated: new Date() };
    if (readings !== undefined) updateData.readings = readings;
    if (location !== undefined) updateData.location = location;
    if (roomId !== undefined) updateData.roomId = roomId;
    if (cameraStatus !== undefined) {
      updateData.cameraStatus = cameraStatus;
      // If camera goes into error state, send alert
      if (cameraStatus === 'error') {
        const property = await prisma.property.findUnique({
          where: { id: req.params.propertyId },
          select: { ownerId: true, name: true },
        });
        if (property) {
          await notificationService.sendCameraAlert(
            property.ownerId,
            device.id,
            `${property.name} のカメラ (${device.deviceId}) でエラーが発生しました`
          );
        }
      }
    }

    const updated = await prisma.smartDeviceData.update({
      where: { id: req.params.id },
      data: updateData,
    });
    res.json({ success: true, data: updated });
  })
);

export default router;
