import { LandStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error';
import { getPagination, paginate } from '../types';

export class LandService {
  async getPublicLands(query: {
    page?: string;
    limit?: string;
    status?: LandStatus;
    region?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { skip, take, page, limit } = getPagination(query);
    const where: Record<string, unknown> = { isPublic: true };
    if (query.status) where.status = query.status;
    if (query.region) where.address = { contains: query.region, mode: 'insensitive' };

    const orderBy: Record<string, string> = {};
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';
    orderBy[sortBy] = sortOrder;

    const [data, total] = await Promise.all([
      prisma.land.findMany({
        where,
        skip,
        take,
        orderBy,
        select: {
          id: true,
          name: true,
          address: true,
          area: true,
          zoning: true,
          status: true,
          thumbnailUrl: true,
          tags: true,
          createdAt: true,
        },
      }),
      prisma.land.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async getPublicLandById(id: string) {
    const land = await prisma.land.findFirst({
      where: { id, isPublic: true },
      select: {
        id: true,
        name: true,
        address: true,
        area: true,
        zoning: true,
        description: true,
        status: true,
        thumbnailUrl: true,
        imageUrls: true,
        tags: true,
        createdAt: true,
      },
    });
    if (!land) throw new AppError('Land not found', 404);
    return land;
  }

  async getMyLands(userId: string, query: {
    page?: string;
    limit?: string;
    status?: LandStatus;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { skip, take, page, limit } = getPagination(query);
    const where: Record<string, unknown> = { ownerId: userId };
    if (query.status) where.status = query.status;

    const orderBy: Record<string, string> = {};
    orderBy[query.sortBy || 'createdAt'] = query.sortOrder || 'desc';

    const [data, total] = await Promise.all([
      prisma.land.findMany({ where, skip, take, orderBy }),
      prisma.land.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async getMyLandById(id: string, userId: string) {
    const land = await prisma.land.findFirst({
      where: { id, ownerId: userId },
      include: {
        properties: {
          select: { id: true, name: true, buildingType: true, status: true },
        },
      },
    });
    if (!land) throw new AppError('Land not found', 404);
    return land;
  }

  async createLand(userId: string, data: {
    name: string;
    address: string;
    area: number;
    zoning?: string;
    description?: string;
    status?: LandStatus;
    isPublic?: boolean;
    thumbnailUrl?: string;
    imageUrls?: string[];
    purchasePrice?: number;
    currentValue?: number;
    purchaseDate?: string;
    notes?: string;
    tags?: string[];
  }) {
    const land = await prisma.land.create({
      data: {
        ownerId: userId,
        name: data.name,
        address: data.address,
        area: data.area,
        zoning: data.zoning,
        description: data.description,
        status: data.status || 'active',
        isPublic: data.isPublic ?? false,
        thumbnailUrl: data.thumbnailUrl,
        imageUrls: data.imageUrls || [],
        purchasePrice: data.purchasePrice,
        currentValue: data.currentValue,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
        notes: data.notes,
        tags: data.tags || [],
      },
    });
    return land;
  }

  async updateLand(id: string, userId: string, data: Partial<{
    name: string;
    address: string;
    area: number;
    zoning: string;
    description: string;
    status: LandStatus;
    isPublic: boolean;
    thumbnailUrl: string;
    imageUrls: string[];
    purchasePrice: number;
    currentValue: number;
    purchaseDate: string;
    notes: string;
    tags: string[];
  }>) {
    const existing = await prisma.land.findFirst({ where: { id, ownerId: userId } });
    if (!existing) throw new AppError('Land not found', 404);

    const updated = await prisma.land.update({
      where: { id },
      data: {
        ...data,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
      },
    });
    return updated;
  }

  async deleteLand(id: string, userId: string) {
    const existing = await prisma.land.findFirst({ where: { id, ownerId: userId } });
    if (!existing) throw new AppError('Land not found', 404);
    await prisma.land.delete({ where: { id } });
  }
}

export const landService = new LandService();
