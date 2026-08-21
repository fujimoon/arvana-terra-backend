import { prisma } from '../lib/prisma';

export const chatService = {
  // チャットルーム一覧取得
  // type: 'land'|'property'|'employee'
  // targetId: landId / propertyId / employeeId
  getRooms: async (userId: string, type: string, targetId: string) => {
    const where: any = { type };
    if (type === 'land') where.landId = targetId;
    else if (type === 'property') where.propertyId = targetId;
    else if (type === 'employee') where.employeeId = targetId;

    return prisma.chatRoom.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: { id: true, name: true } } },
        },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  },

  // チャットルーム作成
  createRoom: async (data: {
    type: string;
    title: string;
    description?: string;
    landId?: string;
    propertyId?: string;
    employeeId?: string;
    createdById: string;
  }) => {
    return prisma.chatRoom.create({
      data: {
        type: data.type as any,
        title: data.title,
        description: data.description,
        landId: data.landId,
        propertyId: data.propertyId,
        employeeId: data.employeeId,
        createdById: data.createdById,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });
  },

  // メッセージ一覧取得（ページネーション付き）
  getMessages: async (chatRoomId: string, page = 1, limit = 50) => {
    const skip = (page - 1) * limit;
    const [messages, total] = await Promise.all([
      prisma.chatMessage.findMany({
        where: { chatRoomId },
        include: { sender: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.chatMessage.count({ where: { chatRoomId } }),
    ]);
    return { messages, total, page, limit };
  },

  // メッセージ送信
  sendMessage: async (chatRoomId: string, senderId: string, content: string) => {
    const message = await prisma.chatMessage.create({
      data: { chatRoomId, senderId, content },
      include: { sender: { select: { id: true, name: true } } },
    });
    // updatedAt を更新
    await prisma.chatRoom.update({
      where: { id: chatRoomId },
      data: { updatedAt: new Date() },
    });
    return message;
  },

  // ルーム詳細取得
  getRoom: async (chatRoomId: string) => {
    return prisma.chatRoom.findUnique({
      where: { id: chatRoomId },
      include: {
        createdBy: { select: { id: true, name: true } },
        land: { select: { id: true, name: true } },
        property: { select: { id: true, name: true } },
        employee: { select: { id: true, name: true } },
      },
    });
  },
};
