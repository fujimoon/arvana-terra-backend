import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { scheduleService } from '../services/schedule.service';

const router = Router();

// GET /api/v1/schedules?year=2024&month=8  OR  ?start=2024-08-01&end=2024-08-31&category=inspection
router.get('/schedules', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { year, month, start, end, category } = req.query;
    const schedules = await scheduleService.getSchedules(userId, {
      year: year ? parseInt(year as string) : undefined,
      month: month ? parseInt(month as string) : undefined,
      start: start as string,
      end: end as string,
      category: category as string,
    });
    res.json({ schedules });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/v1/schedules/upcoming
router.get('/schedules/upcoming', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const schedules = await scheduleService.getUpcoming(userId, limit);
    res.json({ schedules });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/v1/schedules/:id
router.get('/schedules/:id', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const schedule = await scheduleService.getScheduleById(req.params.id, userId);
    if (!schedule) return res.status(404).json({ error: 'Schedule not found' });
    res.json({ schedule });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/v1/schedules
router.post('/schedules', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const schedule = await scheduleService.createSchedule(userId, req.body);
    res.status(201).json({ schedule });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/v1/schedules/:id
router.put('/schedules/:id', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const schedule = await scheduleService.updateSchedule(req.params.id, userId, req.body);
    res.json({ schedule });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/v1/schedules/:id/complete
router.patch('/schedules/:id/complete', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const schedule = await scheduleService.updateSchedule(req.params.id, userId, { isCompleted: true });
    res.json({ schedule });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/v1/schedules/:id
router.delete('/schedules/:id', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    await scheduleService.deleteSchedule(req.params.id, userId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
