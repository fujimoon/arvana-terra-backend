import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error';

export class PropertyService {
  async createProperty(data: {
    name: string;
    address: string;
    description?: string;
    price?: number;
    ownerId: string;
    thumbnailUrl?: string;
    imageUrls?: string[];
  }) {
    return prisma.property.create({
      data: { ...data, imageUrls: data.imageUrls || [] }
    });
  }

  async getPublicProperties(filters?: { prefecture?: string; status?: string }) {
    return prisma.property.findMany({
      where: {
        isPublic: true,
        ...(filters?.prefecture ? { prefecture: filters.prefecture } : {}),
        ...(filters?.status ? { status: filters.status } : {})
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getPropertyById(id: string, userId?: string) {
    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) throw new AppError('物件が見つかりません', 404);
    if (!property.isPublic && property.ownerId !== userId) {
      throw new AppError('この物件を閲覧する権限がありません', 403);
    }
    return property;
  }

  async getMyProperties(ownerId: string) {
    return prisma.property.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateProperty(id: string, ownerId: string, data: Partial<{
    name: string;
    address: string;
    description: string;
    price: number;
    thumbnailUrl: string;
    imageUrls: string[];
  }>) {
    const property = await prisma.property.findFirst({ where: { id, ownerId } });
    if (!property) throw new AppError('物件が見つかりません', 404);
    return prisma.property.update({ where: { id }, data });
  }

  async deleteProperty(id: string, ownerId: string) {
    const property = await prisma.property.findFirst({ where: { id, ownerId } });
    if (!property) throw new AppError('物件が見つかりません', 404);
    return prisma.property.delete({ where: { id } });
  }

  // Admin: get all properties
  async getAllProperties(filters: { status?: string; isPublic?: boolean }) {
    return prisma.property.findMany({
      where: filters,
      include: { owner: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' }
    });
  }
}

export const propertyService = new PropertyService();
