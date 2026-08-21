import { RoomStatus, RoomType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error';

export class RoomService {
  private async verifyPropertyOwnership(propertyId: string, userId: string) {
    const property = await prisma.property.findFirst({ where: { id: propertyId, ownerId: userId } });
    if (!property) throw new AppError('Property not found', 404);
    return property;
  }

  async getRooms(propertyId: string, userId: string) {
    await this.verifyPropertyOwnership(propertyId, userId);
    return prisma.room.findMany({
      where: { propertyId },
      include: { tenant: true },
      orderBy: { roomNumber: 'asc' },
    });
  }

  async getRoomById(propertyId: string, id: string, userId: string) {
    await this.verifyPropertyOwnership(propertyId, userId);
    const room = await prisma.room.findFirst({
      where: { id, propertyId },
      include: { tenant: true, payments: { orderBy: { dueDate: 'desc' }, take: 6 } },
    });
    if (!room) throw new AppError('Room not found', 404);
    return room;
  }

  async createRoom(propertyId: string, userId: string, data: {
    roomNumber: string;
    floor?: number;
    type: RoomType;
    area?: number;
    rentPrice?: number;
    status?: RoomStatus;
    notes?: string;
    memo?: string;
  }) {
    await this.verifyPropertyOwnership(propertyId, userId);

    const existing = await prisma.room.findFirst({ where: { propertyId, roomNumber: data.roomNumber } });
    if (existing) throw new AppError('Room number already exists in this property', 409);

    return prisma.room.create({
      data: {
        propertyId,
        roomNumber: data.roomNumber,
        floor: data.floor,
        type: data.type,
        area: data.area,
        rentPrice: data.rentPrice,
        status: data.status || 'vacant',
        notes: data.notes,
        memo: data.memo,
      },
    });
  }

  async updateRoom(propertyId: string, id: string, userId: string, data: Partial<{
    roomNumber: string;
    floor: number;
    type: RoomType;
    area: number;
    rentPrice: number;
    status: RoomStatus;
    notes: string;
    memo: string;
  }>) {
    await this.verifyPropertyOwnership(propertyId, userId);
    const room = await prisma.room.findFirst({ where: { id, propertyId } });
    if (!room) throw new AppError('Room not found', 404);

    return prisma.room.update({ where: { id }, data });
  }

  async deleteRoom(propertyId: string, id: string, userId: string) {
    await this.verifyPropertyOwnership(propertyId, userId);
    const room = await prisma.room.findFirst({ where: { id, propertyId } });
    if (!room) throw new AppError('Room not found', 404);

    const tenant = await prisma.tenant.findUnique({ where: { roomId: id } });
    if (tenant && !tenant.moveOutDate) throw new AppError('Cannot delete room with active tenant', 400);

    await prisma.room.delete({ where: { id } });
  }
}

export const roomService = new RoomService();
