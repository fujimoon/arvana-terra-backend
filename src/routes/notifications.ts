import { Router, Response } from 'express';
import { notificationService } from '../services/notification.service';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthenticatedRequest } from '../types';

const router = Router();

router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await notificationService.getNotifications(
      req.user!.userId,
      req.query as Record<string, string>
    );
    res.json({ success: true, ...result });
  })
);

router.patch(
  '/:id/read',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await notificationService.markAsRead(req.params.id, req.user!.userId);
    res.json({ success: true, message: 'Notification marked as read' });
  })
);

router.patch(
  '/read-all',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await notificationService.markAllAsRead(req.user!.userId);
    res.json({ success: true, message: 'All notifications marked as read' });
  })
);

export default router;
