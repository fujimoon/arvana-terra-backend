import { Router } from 'express';
import authRoutes from './auth';
import landRoutes from './lands';
import propertyRoutes from './properties';
import roomRoutes from './rooms';
import paymentRoutes from './payments';
import equipmentRoutes from './equipment';
import smartDeviceRoutes from './smartDevices';
import contractRoutes from './contracts';
import chatRoutes from './chats';
import taskRoutes from './tasks';
import employeeRoutes from './employees';
import vendorRoutes from './vendors';
import opportunityRoutes from './opportunities';
import valuationRoutes from './valuation';
import snsRoutes from './sns';
import notificationRoutes from './notifications';
import preferenceRoutes from './preferences';
import adminRoutes from './admin';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthenticatedRequest } from '../types';
import { prisma } from '../lib/prisma';

// Standalone payment status update route
import { Router as ExpressRouter, Response } from 'express';
import { AppError } from '../middleware/error';

const paymentsStandalone = ExpressRouter();
paymentsStandalone.patch(
  '/:id/status',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { status, paidDate } = req.body;
    if (!status) throw new AppError('Status is required', 400);

    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: { property: { select: { ownerId: true } } },
    });
    if (!payment) throw new AppError('Payment not found', 404);
    if (payment.property.ownerId !== req.user!.userId) throw new AppError('Access denied', 403);

    const updated = await prisma.payment.update({
      where: { id: req.params.id },
      data: {
        status,
        paidDate: paidDate ? new Date(paidDate) : status === 'paid' ? new Date() : undefined,
      },
    });
    res.json({ success: true, data: updated });
  })
);

const router = Router();

router.use('/auth', authRoutes);
router.use('/lands', landRoutes);
router.use('/properties', propertyRoutes);
router.use('/properties/:propertyId/rooms', roomRoutes);
router.use('/properties/:propertyId/payments', paymentRoutes);
router.use('/properties/:propertyId/equipment', equipmentRoutes);
router.use('/properties/:propertyId/smart-devices', smartDeviceRoutes);
router.use('/contracts', contractRoutes);
router.use('/contract-templates', contractRoutes);
router.use('/chats', chatRoutes);
router.use('/tasks', taskRoutes);
router.use('/employees', employeeRoutes);
router.use('/vendors', vendorRoutes);
router.use('/opportunities', opportunityRoutes);
router.use('/valuation', valuationRoutes);
router.use('/sns', snsRoutes);
router.use('/notifications', notificationRoutes);
router.use('/preferences', preferenceRoutes);
router.use('/admin', adminRoutes);
router.use('/payments', paymentsStandalone);

export default router;
