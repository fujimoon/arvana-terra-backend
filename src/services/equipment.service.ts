import { EquipmentCategory, EquipmentStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error';

export class EquipmentService {
  private async verifyPropertyOwnership(propertyId: string, userId: string) {
    const property = await prisma.property.findFirst({ where: { id: propertyId, ownerId: userId } });
    if (!property) throw new AppError('Property not found', 404);
    return property;
  }

  async getEquipment(propertyId: string, userId: string) {
    await this.verifyPropertyOwnership(propertyId, userId);
    return prisma.equipment.findMany({
      where: { propertyId },
      include: { room: { select: { id: true, roomNumber: true, floor: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getEquipmentById(propertyId: string, id: string, userId: string) {
    await this.verifyPropertyOwnership(propertyId, userId);
    const eq = await prisma.equipment.findFirst({
      where: { id, propertyId },
      include: { room: true },
    });
    if (!eq) throw new AppError('Equipment not found', 404);
    return eq;
  }

  async getEquipmentByFloor(propertyId: string, floor: number, userId: string) {
    await this.verifyPropertyOwnership(propertyId, userId);
    // Common area equipment on this floor (no roomId)
    return prisma.equipment.findMany({
      where: { propertyId, floor, roomId: null },
      orderBy: { name: 'asc' },
    });
  }

  async createEquipment(propertyId: string, userId: string, data: {
    name: string;
    category: EquipmentCategory;
    roomId?: string;
    floor?: number;
    location?: string;
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
    installDate?: string;
    warrantyExpiry?: string;
    status?: EquipmentStatus;
    lastInspectionDate?: string;
    nextInspectionDate?: string;
    repairCostEstimate?: number;
    notes?: string;
  }) {
    await this.verifyPropertyOwnership(propertyId, userId);

    if (data.roomId) {
      const room = await prisma.room.findFirst({ where: { id: data.roomId, propertyId } });
      if (!room) throw new AppError('Room not found in this property', 400);
    }

    return prisma.equipment.create({
      data: {
        propertyId,
        roomId: data.roomId,
        name: data.name,
        category: data.category,
        floor: data.floor,
        location: data.location,
        manufacturer: data.manufacturer,
        model: data.model,
        serialNumber: data.serialNumber,
        installDate: data.installDate ? new Date(data.installDate) : undefined,
        warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : undefined,
        status: data.status || 'good',
        lastInspectionDate: data.lastInspectionDate ? new Date(data.lastInspectionDate) : undefined,
        nextInspectionDate: data.nextInspectionDate ? new Date(data.nextInspectionDate) : undefined,
        repairCostEstimate: data.repairCostEstimate,
        notes: data.notes,
      },
    });
  }

  async updateEquipment(propertyId: string, id: string, userId: string, data: Partial<{
    name: string;
    category: EquipmentCategory;
    roomId: string | null;
    floor: number;
    location: string;
    manufacturer: string;
    model: string;
    serialNumber: string;
    installDate: string;
    warrantyExpiry: string;
    status: EquipmentStatus;
    lastInspectionDate: string;
    nextInspectionDate: string;
    repairCostEstimate: number;
    notes: string;
  }>) {
    await this.verifyPropertyOwnership(propertyId, userId);
    const eq = await prisma.equipment.findFirst({ where: { id, propertyId } });
    if (!eq) throw new AppError('Equipment not found', 404);

    return prisma.equipment.update({
      where: { id },
      data: {
        ...data,
        installDate: data.installDate ? new Date(data.installDate) : undefined,
        warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : undefined,
        lastInspectionDate: data.lastInspectionDate ? new Date(data.lastInspectionDate) : undefined,
        nextInspectionDate: data.nextInspectionDate ? new Date(data.nextInspectionDate) : undefined,
      },
    });
  }

  async deleteEquipment(propertyId: string, id: string, userId: string) {
    await this.verifyPropertyOwnership(propertyId, userId);
    const eq = await prisma.equipment.findFirst({ where: { id, propertyId } });
    if (!eq) throw new AppError('Equipment not found', 404);
    await prisma.equipment.delete({ where: { id } });
  }
}

export const equipmentService = new EquipmentService();
