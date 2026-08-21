import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { chatService } from '../services/chat.service';
import { getIO } from '../socket/instance';

const router = Router();

// チャットルーム一覧
// GET /chats?type=land&targetId=land-001
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { type, targetId } = req.query as { type: string; targetId: string };
    if (!type || !targetId) {
      return res.status(400).json({ success: false, message: 'type and targetId are required' });
    }
    const rooms = await chatService.getRooms((req as any).user.id, type, targetId);
    res.json({ success: true, data: rooms });
  } catch (err) {
    next(err);
  }
});

// チャットルーム作成
// POST /chats
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { type, title, description, landId, propertyId, employeeId } = req.body;
    const room = await chatService.createRoom({
      type,
      title,
      description,
      landId,
      propertyId,
      employeeId,
      createdById: (req as any).user.id,
    });
    res.status(201).json({ success: true, data: room });
  } catch (err) {
    next(err);
  }
});

// ルーム詳細
// GET /chats/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const room = await chatService.getRoom(req.params.id);
    if (!room) return res.status(404).json({ success: false, message: 'Chat room not found' });
    res.json({ success: true, data: room });
  } catch (err) {
    next(err);
  }
});

// メッセージ一覧
// GET /chats/:id/messages?page=1&limit=50
router.get('/:id/messages', authenticate, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const result = await chatService.getMessages(req.params.id, page, limit);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// メッセージ送信（HTTP fallback）
// POST /chats/:id/messages
router.post('/:id/messages', authenticate, async (req, res, next) => {
  try {
    const { content } = req.body;
    const message = await chatService.sendMessage(
      req.params.id,
      (req as any).user.id,
      content
    );
    // Socket.io でブロードキャスト
    const io = getIO();
    if (io) {
      io.of('/chat').to(`room:${req.params.id}`).emit('new_message', message);
    }
    res.status(201).json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
});

export default router;
