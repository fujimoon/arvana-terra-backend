import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';
import { inquiryService } from '../services/inquiry.service';

const router = Router();

const inquirySchema = z.object({
  type: z.enum(['property', 'land']),
  propertyId: z.string().optional(),
  landId: z.string().optional(),
  senderName: z.string().min(1),
  senderEmail: z.string().email(),
  senderPhone: z.string().optional(),
  inquiryType: z.enum(['purchase', 'consultation']),
  message: z.string().min(10)
});

// Public: submit inquiry (auth optional)
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = inquirySchema.parse(req.body);
    // Attach userId if logged in (optional)
    const userId = (req as any).user?.id;
    const inquiry = await inquiryService.createInquiry({ ...data, userId });
    res.status(201).json({ success: true, data: inquiry });
  } catch (error) {
    next(error);
  }
});

// Admin: get all inquiries
router.get('/', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, type } = req.query;
    const inquiries = await inquiryService.getInquiries({
      status: status as string,
      type: type as string
    });
    res.json({ success: true, data: inquiries });
  } catch (error) {
    next(error);
  }
});

// Admin: update inquiry status
router.patch('/:id/status', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, adminNote } = req.body;
    const inquiry = await inquiryService.updateInquiryStatus(req.params.id, status, adminNote);
    res.json({ success: true, data: inquiry });
  } catch (error) {
    next(error);
  }
});

export default router;
