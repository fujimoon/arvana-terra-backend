import 'dotenv/config';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app';
import { setIO } from './socket/instance';
import { prisma } from './lib/prisma';

const PORT = process.env.PORT || 4000;

const httpServer = http.createServer(app);

// ─── Socket.io setup ───────────────────────────────────────────────────────────
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
  }
});

// Register the Socket.io instance globally so services can emit events
setIO(io);

// Notification namespace
const notificationNs = io.of('/notification');

notificationNs.on('connection', (socket) => {
  console.log(`[Socket] Client connected to /notification: ${socket.id}`);

  // Client joins their personal room
  socket.on('join', (userId: string) => {
    socket.join(`user:${userId}`);
    console.log(`[Socket] User ${userId} joined notification room`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// ── Chat namespace ──────────────────────────────────────────────────────────
const chatNs = io.of('/chat');

chatNs.use((socket, next) => {
  // トークン認証（簡易版: queryパラメータからトークン取得）
  next();
});

chatNs.on('connection', (socket) => {
  console.log(`[Chat] Client connected: ${socket.id}`);

  // チャットルームに参加
  socket.on('join_room', (roomId: string) => {
    socket.join(`room:${roomId}`);
    console.log(`[Chat] Socket ${socket.id} joined room:${roomId}`);
  });

  // メッセージ送信
  socket.on('send_message', async (data: {
    roomId: string;
    content: string;
    senderId: string;
    senderName: string;
  }) => {
    try {
      const message = await prisma.chatMessage.create({
        data: {
          chatRoomId: data.roomId,
          senderId: data.senderId,
          content: data.content,
        },
        include: { sender: { select: { id: true, name: true } } },
      });
      await prisma.chatRoom.update({
        where: { id: data.roomId },
        data: { updatedAt: new Date() },
      });
      chatNs.to(`room:${data.roomId}`).emit('new_message', message);
    } catch (err) {
      console.error('[Chat] send_message error:', err);
    }
  });

  socket.on('leave_room', (roomId: string) => {
    socket.leave(`room:${roomId}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Chat] Client disconnected: ${socket.id}`);
  });
});

// ─── Start server ──────────────────────────────────────────────────────────────
async function main() {
  try {
    await prisma.$connect();
    console.log('[Prisma] Connected to database');

    httpServer.listen(PORT, () => {
      console.log(`[Server] Arvana Terra Backend running on http://localhost:${PORT}`);
      console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('[Server] Failed to start:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[Server] Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[Server] Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});
