import { Router, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { aiService } from '../services/ai.service';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/error';

const router = Router();

router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const valuation = await prisma.assetValuation.findFirst({
      where: { userId: req.user!.userId },
      orderBy: { calculatedAt: 'desc' },
    });
    res.json({ success: true, data: valuation });
  })
);

router.post(
  '/calculate',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const schema = z.object({
      landIds: z.array(z.string()).default([]),
      propertyIds: z.array(z.string()).default([]),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.errors[0].message, 400);

    if (parsed.data.landIds.length === 0 && parsed.data.propertyIds.length === 0) {
      // If no specific IDs, use all user's assets
      const [lands, properties] = await Promise.all([
        prisma.land.findMany({ where: { ownerId: req.user!.userId }, select: { id: true } }),
        prisma.property.findMany({ where: { ownerId: req.user!.userId }, select: { id: true } }),
      ]);
      parsed.data.landIds = lands.map((l) => l.id);
      parsed.data.propertyIds = properties.map((p) => p.id);
    }

    const result = await aiService.analyzeAssetValuation(
      req.user!.userId,
      parsed.data.landIds,
      parsed.data.propertyIds
    );

    const valuation = await prisma.assetValuation.create({
      data: {
        userId: req.user!.userId,
        landIds: parsed.data.landIds,
        propertyIds: parsed.data.propertyIds,
        totalCurrentValue: result.totalCurrentValue,
        aiPredictedValue: result.aiPredictedValue,
        predictionYear: result.predictionYear,
        breakdown: result.breakdown as Prisma.InputJsonValue,
        aiAnalysis: result.aiAnalysis,
      },
    });

    res.json({ success: true, data: valuation });
  })
);

export default router;
