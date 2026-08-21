import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { roomService } from '../services/room.service';

const router = Router();

// GET /api/v1/properties/:propertyId/rooms
router.get('/properties/:propertyId/rooms', authenticate, async (req, res) => {
  try {
    const rooms = await roomService.getRoomsByProperty(req.params.propertyId);
    res.json({ rooms });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/v1/rooms/:id
router.get('/rooms/:id', authenticate, async (req, res) => {
  try {
    const room = await roomService.getRoomById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json({ room });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/v1/properties/:propertyId/rooms
router.post('/properties/:propertyId/rooms', authenticate, async (req, res) => {
  try {
    const room = await roomService.createRoom(req.params.propertyId, req.body);
    res.status(201).json({ room });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/v1/rooms/:id
router.put('/rooms/:id', authenticate, async (req, res) => {
  try {
    const room = await roomService.updateRoom(req.params.id, req.body);
    res.json({ room });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/v1/rooms/:id
router.delete('/rooms/:id', authenticate, async (req, res) => {
  try {
    await roomService.deleteRoom(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
