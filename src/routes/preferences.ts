import { Router, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/error';

const router = Router();

router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    let preference = await prisma.userPreference.findUnique({
      where: { userId: req.user!.userId },
    });

    if (!preference) {
      preference = await prisma.userPreference.create({
        data: { userId: req.user!.userId },
      });
    }

    res.json({ success: true, data: preference });
  })
);

const updatePreferenceSchema = z.object({
  preferredRegions: z.array(z.string()).optional(),
  notificationSettings: z.record(z.unknown()).optional(),
});

router.put(
  '/',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const parsed = updatePreferenceSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.errors[0].message, 400);

    const updateData: Prisma.UserPreferenceUpdateInput = {};
    if (parsed.data.preferredRegions !== undefined) updateData.preferredRegions = parsed.data.preferredRegions;
    if (parsed.data.notificationSettings !== undefined) updateData.notificationSettings = parsed.data.notificationSettings as Prisma.InputJsonValue;

    const preference = await prisma.userPreference.upsert({
      where: { userId: req.user!.userId },
      update: updateData,
      create: {
        userId: req.user!.userId,
        preferredRegions: parsed.data.preferredRegions || [],
        notificationSettings: (parsed.data.notificationSettings as Prisma.InputJsonValue) || {},
      },
    });

    res.json({ success: true, data: preference });
  })
);

export default router;
