import { Router, Response } from 'express';
import { z } from 'zod';
import { chatService } from '../services/chat.service';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/error';

const router = Router();

router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const chatRooms = await chatService.getMyChatRooms(req.user!.userId);
    res.json({ success: true, data: chatRooms });
  })
);

router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const chatRoom = await chatService.getChatRoomById(req.params.id, req.user!.userId);
    res.json({ success: true, data: chatRoom });
  })
);

const createChatSchema = z.object({
  type: z.enum(['property', 'land', 'employee', 'direct']),
  name: z.string().min(1),
  topic: z.string().optional(),
  description: z.string().optional(),
  propertyId: z.string().optional(),
  landId: z.string().optional(),
  participantIds: z.array(z.string()).optional(),
});

router.post(
  '/',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const parsed = createChatSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.errors[0].message, 400);

    const chatRoom = await chatService.createChatRoom(req.user!.userId, parsed.data);
    res.status(201).json({ success: true, data: chatRoom });
  })
);

router.get(
  '/:id/messages',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await chatService.getMessages(req.params.id, req.user!.userId, req.query as Record<string, string>);
    res.json({ success: true, ...result });
  })
);

router.post(
  '/:id/messages',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const schema = z.object({
      content: z.string().min(1),
      messageType: z.enum(['text', 'image', 'file']).optional(),
      fileUrl: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.errors[0].message, 400);

    const message = await chatService.sendMessage(req.params.id, req.user!.userId, parsed.data);
    res.status(201).json({ success: true, data: message });
  })
);

router.post(
  '/:id/participants',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.body;
    if (!userId) throw new AppError('userId is required', 400);

    const participant = await chatService.addParticipant(req.params.id, req.user!.userId, userId);
    res.status(201).json({ success: true, data: participant });
  })
);

router.delete(
  '/:id/participants/:userId',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await chatService.removeParticipant(req.params.id, req.user!.userId, req.params.userId);
    res.json({ success: true, message: 'Participant removed' });
  })
);

export default router;
