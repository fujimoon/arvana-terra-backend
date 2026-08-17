import { Router, Response } from 'express';
import { z } from 'zod';
import { taskService } from '../services/task.service';
import { aiService } from '../services/ai.service';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/error';
import { prisma } from '../lib/prisma';

const router = Router();

router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await taskService.getTasks(req.user!.userId, req.query as Record<string, string>);
    res.json({ success: true, ...result });
  })
);

router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const task = await taskService.getTaskById(req.params.id, req.user!.userId);
    res.json({ success: true, data: task });
  })
);

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'done', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  propertyId: z.string().optional(),
  landId: z.string().optional(),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
});

router.post(
  '/',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const parsed = createTaskSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.errors[0].message, 400);

    const task = await taskService.createTask(req.user!.userId, parsed.data);
    res.status(201).json({ success: true, data: task });
  })
);

router.put(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const task = await taskService.updateTask(req.params.id, req.user!.userId, req.body);
    res.json({ success: true, data: task });
  })
);

router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await taskService.deleteTask(req.params.id, req.user!.userId);
    res.json({ success: true, message: 'Task deleted successfully' });
  })
);

// AI task suggestions
router.post(
  '/ai-suggest',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { propertyId, landId } = req.body;
    const suggestions = await aiService.suggestTasks(req.user!.userId, { propertyId, landId });

    // Optionally save AI-suggested tasks
    const tasks = await Promise.all(
      suggestions.map((s) =>
        prisma.task.create({
          data: {
            ownerId: req.user!.userId,
            title: s.title,
            description: s.description,
            priority: s.priority as 'low' | 'medium' | 'high' | 'urgent',
            propertyId,
            landId,
            isAiSuggested: true,
            aiReason: s.reason,
            status: 'todo',
          },
        })
      )
    );

    res.json({ success: true, data: tasks });
  })
);

export default router;
