import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { requireLandlordOrHomeowner } from '../middleware/rbac';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/error';
import { getPagination, paginate } from '../types';

const router = Router({ mergeParams: true });

router.get(
  '/',
  authenticate,
  requireLandlordOrHomeowner,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const property = await prisma.property.findFirst({
      where: { id: req.params.propertyId, ownerId: req.user!.userId },
    });
    if (!property) throw new AppError('Property not found', 404);

    const { skip, take, page, limit } = getPagination(req.query as Record<string, string>);
    const where: Record<string, unknown> = { propertyId: req.params.propertyId };
    if (req.query.status) where.status = req.query.status;
    if (req.query.roomId) where.roomId = req.query.roomId;

    const [data, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take,
        orderBy: { dueDate: 'desc' },
        include: {
          room: { select: { id: true, roomNumber: true } },
          tenant: { select: { id: true, name: true } },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    res.json({ success: true, ...paginate(data, total, page, limit) });
  })
);

const createPaymentSchema = z.object({
  roomId: z.string(),
  tenantId: z.string().optional(),
  amount: z.number().positive(),
  dueDate: z.string(),
  paidDate: z.string().optional(),
  status: z.enum(['paid', 'pending', 'late', 'overdue']).optional(),
  notes: z.string().optional(),
});

router.post(
  '/',
  authenticate,
  requireLandlordOrHomeowner,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const property = await prisma.property.findFirst({
      where: { id: req.params.propertyId, ownerId: req.user!.userId },
    });
    if (!property) throw new AppError('Property not found', 404);

    const body = {
      ...req.body,
      amount: parseFloat(req.body.amount),
    };

    const parsed = createPaymentSchema.safeParse(body);
    if (!parsed.success) throw new AppError(parsed.error.errors[0].message, 400);

    const payment = await prisma.payment.create({
      data: {
        propertyId: req.params.propertyId,
        roomId: parsed.data.roomId,
        tenantId: parsed.data.tenantId,
        amount: parsed.data.amount,
        dueDate: new Date(parsed.data.dueDate),
        paidDate: parsed.data.paidDate ? new Date(parsed.data.paidDate) : undefined,
        status: parsed.data.status || 'pending',
        notes: parsed.data.notes,
      },
    });

    res.status(201).json({ success: true, data: payment });
  })
);

export default router;
