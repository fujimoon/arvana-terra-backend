import { Router, Response } from 'express';
import { z } from 'zod';
import { snsService } from '../services/sns.service';
import { authenticate } from '../middleware/auth';
import { uploadMultiple } from '../middleware/upload';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/error';

const router = Router();

router.get(
  '/posts',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await snsService.getPosts(req.user!.userId, req.query as Record<string, string>);
    res.json({ success: true, ...result });
  })
);

router.get(
  '/posts/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const post = await snsService.getPostById(req.params.id, req.user!.userId);
    res.json({ success: true, data: post });
  })
);

const createPostSchema = z.object({
  type: z.enum(['general', 'advice', 'knowledge', 'event', 'case_study', 'official', 'tax_advice', 'vendor_info', 'announcement']),
  title: z.string().min(1),
  content: z.string().min(1),
  tags: z.array(z.string()).optional(),
  imageUrls: z.array(z.string()).optional(),
  event: z.object({
    eventDate: z.string(),
    location: z.string().optional(),
    maxParticipants: z.number().int().optional(),
  }).optional(),
});

router.post(
  '/posts',
  authenticate,
  uploadMultiple,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const body = {
      ...req.body,
      tags: req.body.tags ? JSON.parse(req.body.tags) : undefined,
      imageUrls: req.body.imageUrls ? JSON.parse(req.body.imageUrls) : undefined,
      event: req.body.event ? JSON.parse(req.body.event) : undefined,
    };

    // Add uploaded images
    if (req.files && Array.isArray(req.files)) {
      const uploadedUrls = req.files.map((f) => `/uploads/${f.filename}`);
      body.imageUrls = [...(body.imageUrls || []), ...uploadedUrls];
    }

    const parsed = createPostSchema.safeParse(body);
    if (!parsed.success) throw new AppError(parsed.error.errors[0].message, 400);

    const post = await snsService.createPost(req.user!.userId, parsed.data);
    res.status(201).json({ success: true, data: post });
  })
);

router.put(
  '/posts/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const post = await snsService.updatePost(req.params.id, req.user!.userId, req.body);
    res.json({ success: true, data: post });
  })
);

router.delete(
  '/posts/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await snsService.deletePost(req.params.id, req.user!.userId);
    res.json({ success: true, message: 'Post deleted successfully' });
  })
);

router.post(
  '/posts/:id/like',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await snsService.likePost(req.params.id, req.user!.userId);
    res.json({ success: true, data: result });
  })
);

router.get(
  '/posts/:id/comments',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await snsService.getComments(req.params.id, req.query as Record<string, string>);
    res.json({ success: true, ...result });
  })
);

router.post(
  '/posts/:id/comments',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { content } = req.body;
    if (!content || typeof content !== 'string') throw new AppError('Content is required', 400);

    const comment = await snsService.createComment(req.params.id, req.user!.userId, content);
    res.status(201).json({ success: true, data: comment });
  })
);

router.get(
  '/events',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await snsService.getEvents(req.query as Record<string, string>);
    res.json({ success: true, ...result });
  })
);

router.post(
  '/events/:id/register',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await snsService.registerForEvent(req.params.id, req.user!.userId);
    res.json({ success: true, data: result });
  })
);

router.get(
  '/members',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await snsService.searchMembers(req.query as Record<string, string>);
    res.json({ success: true, ...result });
  })
);

router.get(
  '/users/:userId',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const profile = await snsService.getUserProfile(req.params.userId);
    res.json({ success: true, data: profile });
  })
);

export default router;
