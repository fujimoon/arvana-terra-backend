import { ChatRoomType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error';
import { getPagination, paginate } from '../types';

export class ChatService {
  async getMyChatRooms(userId: string) {
    return prisma.chatRoom.findMany({
      where: {
        participants: { some: { userId } },
      },
      include: {
        participants: {
          include: { user: { select: { id: true, name: true, profileImageUrl: true } } },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: { id: true, name: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getChatRoomById(id: string, userId: string) {
    const chatRoom = await prisma.chatRoom.findUnique({
      where: { id },
      include: {
        participants: {
          include: { user: { select: { id: true, name: true, profileImageUrl: true, role: true } } },
        },
        property: { select: { id: true, name: true } },
        land: { select: { id: true, name: true } },
      },
    });
    if (!chatRoom) throw new AppError('Chat room not found', 404);

    const isParticipant = chatRoom.participants.some((p) => p.userId === userId);
    if (!isParticipant) throw new AppError('Not a participant of this chat room', 403);

    return chatRoom;
  }

  async createChatRoom(userId: string, data: {
    type: ChatRoomType;
    name: string;
    topic?: string;
    description?: string;
    propertyId?: string;
    landId?: string;
    participantIds?: string[];
  }) {
    if (data.propertyId) {
      const property = await prisma.property.findFirst({ where: { id: data.propertyId, ownerId: userId } });
      if (!property) throw new AppError('Property not found', 404);
    }
    if (data.landId) {
      const land = await prisma.land.findFirst({ where: { id: data.landId, ownerId: userId } });
      if (!land) throw new AppError('Land not found', 404);
    }

    const participantIds = [...new Set([userId, ...(data.participantIds || [])])];

    const chatRoom = await prisma.chatRoom.create({
      data: {
        type: data.type,
        name: data.name,
        topic: data.topic,
        description: data.description,
        propertyId: data.propertyId,
        landId: data.landId,
        createdBy: userId,
        participants: {
          create: participantIds.map((uid) => ({
            userId: uid,
            role: uid === userId ? 'owner' : 'member',
          })),
        },
      },
      include: {
        participants: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });
    return chatRoom;
  }

  async getMessages(chatRoomId: string, userId: string, query: { page?: string; limit?: string }) {
    await this.getChatRoomById(chatRoomId, userId);
    const { skip, take, page, limit } = getPagination(query);

    const [messages, total] = await Promise.all([
      prisma.chatMessage.findMany({
        where: { chatRoomId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: { select: { id: true, name: true, profileImageUrl: true } },
        },
      }),
      prisma.chatMessage.count({ where: { chatRoomId } }),
    ]);

    // Mark as read
    const unread = messages.filter((m) => !m.readBy.includes(userId)).map((m) => m.id);
    if (unread.length > 0) {
      await prisma.$executeRaw`
        UPDATE chat_messages
        SET "readBy" = array_append("readBy", ${userId})
        WHERE id = ANY(${unread}::uuid[]) AND NOT (${userId} = ANY("readBy"))
      `;
    }

    return paginate(messages.reverse(), total, page, limit);
  }

  async sendMessage(chatRoomId: string, userId: string, data: {
    content: string;
    messageType?: 'text' | 'image' | 'file';
    fileUrl?: string;
  }) {
    await this.getChatRoomById(chatRoomId, userId);

    const message = await prisma.chatMessage.create({
      data: {
        chatRoomId,
        senderId: userId,
        content: data.content,
        messageType: data.messageType || 'text',
        fileUrl: data.fileUrl,
        readBy: [userId],
      },
      include: {
        sender: { select: { id: true, name: true, profileImageUrl: true } },
      },
    });

    await prisma.chatRoom.update({ where: { id: chatRoomId }, data: { updatedAt: new Date() } });
    return message;
  }

  async addParticipant(chatRoomId: string, requesterId: string, targetUserId: string) {
    const chatRoom = await prisma.chatRoom.findUnique({
      where: { id: chatRoomId },
      include: { participants: true },
    });
    if (!chatRoom) throw new AppError('Chat room not found', 404);

    const requesterParticipant = chatRoom.participants.find((p) => p.userId === requesterId);
    if (!requesterParticipant || requesterParticipant.role !== 'owner') {
      throw new AppError('Only room owner can add participants', 403);
    }

    const alreadyIn = chatRoom.participants.some((p) => p.userId === targetUserId);
    if (alreadyIn) throw new AppError('User is already a participant', 409);

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) throw new AppError('User not found', 404);

    return prisma.chatParticipant.create({
      data: { chatRoomId, userId: targetUserId, role: 'member' },
    });
  }

  async removeParticipant(chatRoomId: string, requesterId: string, targetUserId: string) {
    const chatRoom = await prisma.chatRoom.findUnique({
      where: { id: chatRoomId },
      include: { participants: true },
    });
    if (!chatRoom) throw new AppError('Chat room not found', 404);

    const requesterParticipant = chatRoom.participants.find((p) => p.userId === requesterId);
    if (!requesterParticipant || requesterParticipant.role !== 'owner') {
      throw new AppError('Only room owner can remove participants', 403);
    }

    if (targetUserId === requesterId) throw new AppError('Cannot remove yourself as owner', 400);

    const participant = chatRoom.participants.find((p) => p.userId === targetUserId);
    if (!participant) throw new AppError('User is not a participant', 404);

    await prisma.chatParticipant.delete({ where: { id: participant.id } });
  }
}

export const chatService = new ChatService();
