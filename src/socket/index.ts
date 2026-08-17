import { Server } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { AuthPayload } from '../types';
import { logger } from '../lib/logger';

type AuthSocket = Socket & { user: AuthPayload };

export function initializeSocketIO(server: Server): SocketIOServer {
  const io = new SocketIOServer(server, {
    cors: {
      origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:5174').split(','),
      credentials: true,
    },
  });

  // JWT authentication middleware for all namespaces
  const authMiddleware = (socket: Socket, next: (err?: Error) => void) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
      (socket as AuthSocket).user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  };

  // ============================================================
  // /chat namespace
  // ============================================================
  const chatNamespace = io.of('/chat');
  chatNamespace.use(authMiddleware);

  chatNamespace.on('connection', (socket) => {
    const user = (socket as AuthSocket).user;
    logger.info(`User ${user.userId} connected to /chat`);

    // Join personal room for targeted notifications
    socket.join(`user:${user.userId}`);

    socket.on('join_chat', async (chatRoomId: string) => {
      try {
        const participant = await prisma.chatParticipant.findFirst({
          where: { chatRoomId, userId: user.userId },
        });
        if (participant) {
          socket.join(`chat:${chatRoomId}`);
          socket.emit('user_joined', { chatRoomId, userId: user.userId });
        } else {
          socket.emit('error', { message: 'Not a participant of this chat room' });
        }
      } catch (err) {
        logger.error('join_chat error:', err);
      }
    });

    socket.on('leave_chat', (chatRoomId: string) => {
      socket.leave(`chat:${chatRoomId}`);
      chatNamespace.to(`chat:${chatRoomId}`).emit('user_left', { chatRoomId, userId: user.userId });
    });

    socket.on('send_message', async (data: { chatRoomId: string; content: string; messageType?: string }) => {
      try {
        const participant = await prisma.chatParticipant.findFirst({
          where: { chatRoomId: data.chatRoomId, userId: user.userId },
        });
        if (!participant) {
          socket.emit('error', { message: 'Not a participant' });
          return;
        }

        const message = await prisma.chatMessage.create({
          data: {
            chatRoomId: data.chatRoomId,
            senderId: user.userId,
            content: data.content,
            messageType: (data.messageType as 'text' | 'image' | 'file') || 'text',
            readBy: [user.userId],
          },
          include: {
            sender: { select: { id: true, name: true, profileImageUrl: true } },
          },
        });

        await prisma.chatRoom.update({
          where: { id: data.chatRoomId },
          data: { updatedAt: new Date() },
        });

        chatNamespace.to(`chat:${data.chatRoomId}`).emit('new_message', message);
      } catch (err) {
        logger.error('send_message error:', err);
      }
    });

    socket.on('typing', (data: { chatRoomId: string }) => {
      socket.to(`chat:${data.chatRoomId}`).emit('user_typing', {
        userId: user.userId,
        chatRoomId: data.chatRoomId,
      });
    });

    socket.on('disconnect', () => {
      logger.info(`User ${user.userId} disconnected from /chat`);
    });
  });

  // ============================================================
  // /notification namespace
  // ============================================================
  const notificationNamespace = io.of('/notification');
  notificationNamespace.use(authMiddleware);

  notificationNamespace.on('connection', (socket) => {
    const user = (socket as AuthSocket).user;
    logger.info(`User ${user.userId} connected to /notification`);

    socket.join(`user:${user.userId}`);

    socket.on('disconnect', () => {
      logger.info(`User ${user.userId} disconnected from /notification`);
    });
  });

  return io;
}
