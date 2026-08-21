import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { userPreferenceService } from '../services/userPreference.service';

const router = Router();

// GET /api/v1/preferences - get current user's preferences
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const pref = await userPreferenceService.getOrCreate(userId);
    res.json({ success: true, data: pref });
  } catch (error) { next(error); }
});

// PUT /api/v1/preferences - update preferences
router.put('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const { displayMode, displayPrefectures, preferredRegions, notificationSettings } = req.body;
    const pref = await userPreferenceService.update(userId, {
      displayMode, displayPrefectures, preferredRegions, notificationSettings
    });
    res.json({ success: true, data: pref });
  } catch (error) { next(error); }
});

export default router;
