import { prisma } from '../lib/prisma';

export const roomService = {
  async getRoomsByProperty(propertyId: string) {
    return prisma.room.findMany({
      where: { propertyId },
      include: {
        tenants: { where: { status: 'active' }, include: { familyMembers: true } },
        payments: { orderBy: { dueDate: 'desc' }, take: 12 },
        parkingSpots: true,
      },
      orderBy: { name: 'asc' },
    });
  },

  async getRoomById(id: string) {
    return prisma.room.findUnique({
      where: { id },
      include: {
        property: true,
        tenants: {
          include: {
            familyMembers: true,
            payments: { orderBy: { dueDate: 'desc' }, take: 12 },
          },
        },
        payments: { orderBy: { dueDate: 'desc' }, take: 24 },
        parkingSpots: true,
      },
    });
  },

  async createRoom(propertyId: string, data: any) {
    return prisma.room.create({ data: { ...data, propertyId } });
  },

  async updateRoom(id: string, data: any) {
    return prisma.room.update({ where: { id }, data });
  },

  async deleteRoom(id: string) {
    return prisma.room.delete({ where: { id } });
  },
};
