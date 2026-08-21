import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error';

export class LandService {
  async createLand(data: {
    name: string;
    address: string;
    description?: string;
    price?: number;
    ownerId: string;
    thumbnailUrl?: string;
    imageUrls?: string[];
  }) {
    return prisma.land.create({
      data: { ...data, imageUrls: data.imageUrls || [] }
    });
  }

  async getPublicLands(filters?: { prefecture?: string; status?: string }) {
    return prisma.land.findMany({
      where: {
        isPublic: true,
        ...(filters?.prefecture ? { prefecture: filters.prefecture } : {}),
        ...(filters?.status ? { status: filters.status } : {})
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getLandById(id: string, userId?: string) {
    const land = await prisma.land.findUnique({ where: { id } });
    if (!land) throw new AppError('土地が見つかりません', 404);
    if (!land.isPublic && land.ownerId !== userId) {
      throw new AppError('この土地を閲覧する権限がありません', 403);
    }
    return land;
  }

  async getMyLands(ownerId: string) {
    return prisma.land.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateLand(id: string, ownerId: string, data: Partial<{
    name: string;
    address: string;
    description: string;
    price: number;
    thumbnailUrl: string;
    imageUrls: string[];
  }>) {
    const land = await prisma.land.findFirst({ where: { id, ownerId } });
    if (!land) throw new AppError('土地が見つかりません', 404);
    return prisma.land.update({ where: { id }, data });
  }

  async deleteLand(id: string, ownerId: string) {
    const land = await prisma.land.findFirst({ where: { id, ownerId } });
    if (!land) throw new AppError('土地が見つかりません', 404);
    return prisma.land.delete({ where: { id } });
  }

  // Admin: get all lands
  async getAllLands(filters: { status?: string; isPublic?: boolean }) {
    return prisma.land.findMany({
      where: filters,
      include: { owner: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' }
    });
  }
}

export const landService = new LandService();
