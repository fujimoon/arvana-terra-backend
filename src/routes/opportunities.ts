import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { aiService } from '../services/ai.service';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/error';
import { getPagination, paginate } from '../types';

const router = Router();

router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { skip, take, page, limit } = getPagination(req.query as Record<string, string>);

    // Get user's preferred regions
    const preference = await prisma.userPreference.findUnique({
      where: { userId: req.user!.userId },
    });
    const preferredRegions = preference?.preferredRegions || [];

    const where: Record<string, unknown> = { userId: req.user!.userId };
    if (req.query.type) where.type = req.query.type;
    if (req.query.region) where.region = req.query.region;
    if (req.query.isBookmarked !== undefined) where.isBookmarked = req.query.isBookmarked === 'true';

    const [data, total] = await Promise.all([
      prisma.businessOpportunity.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.businessOpportunity.count({ where }),
    ]);

    res.json({ success: true, ...paginate(data, total, page, limit), preferredRegions });
  })
);

router.post(
  '/search',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { region, type, minValue, maxValue } = req.body;
    const { skip, take, page, limit } = getPagination(req.query as Record<string, string>);

    const where: Record<string, unknown> = { userId: req.user!.userId };
    if (region) where.region = { contains: region, mode: 'insensitive' };
    if (type) where.type = type;
    if (minValue || maxValue) {
      where.estimatedValue = {};
      if (minValue) (where.estimatedValue as Record<string, unknown>).gte = parseFloat(minValue);
      if (maxValue) (where.estimatedValue as Record<string, unknown>).lte = parseFloat(maxValue);
    }

    const [data, total] = await Promise.all([
      prisma.businessOpportunity.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.businessOpportunity.count({ where }),
    ]);

    res.json({ success: true, ...paginate(data, total, page, limit) });
  })
);

router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const opportunity = await prisma.businessOpportunity.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    if (!opportunity) throw new AppError('Opportunity not found', 404);
    res.json({ success: true, data: opportunity });
  })
);

const createOpportunitySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['land_purchase', 'sale', 'rental', 'development', 'other']),
  location: z.string().optional(),
  region: z.string().optional(),
  estimatedValue: z.number().optional(),
  source: z.string().optional(),
});

router.post(
  '/',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const parsed = createOpportunitySchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.errors[0].message, 400);

    // AI analyze the opportunity
    let aiAnalysis: string | undefined;
    try {
      aiAnalysis = await aiService.analyzeOpportunity({
        title: parsed.data.title,
        description: parsed.data.description,
        type: parsed.data.type,
        location: parsed.data.location,
        estimatedValue: parsed.data.estimatedValue,
      });
    } catch {
      // AI analysis is optional
    }

    const opportunity = await prisma.businessOpportunity.create({
      data: {
        userId: req.user!.userId,
        ...parsed.data,
        aiAnalysis,
      },
    });

    res.status(201).json({ success: true, data: opportunity });
  })
);

router.patch(
  '/:id/bookmark',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const opportunity = await prisma.businessOpportunity.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    if (!opportunity) throw new AppError('Opportunity not found', 404);

    const updated = await prisma.businessOpportunity.update({
      where: { id: req.params.id },
      data: { isBookmarked: !opportunity.isBookmarked },
    });
    res.json({ success: true, data: updated });
  })
);

export default router;
