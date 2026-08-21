import { BuildingType, PropertyStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error';
import { getPagination, paginate } from '../types';

export class PropertyService {
  async getPublicProperties(query: {
    page?: string;
    limit?: string;
    status?: PropertyStatus;
    buildingType?: BuildingType;
    region?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { skip, take, page, limit } = getPagination(query);
    const where: Record<string, unknown> = { isPublic: true };
    if (query.status) where.status = query.status;
    if (query.buildingType) where.buildingType = query.buildingType;
    if (query.region) where.address = { contains: query.region, mode: 'insensitive' };

    const orderBy: Record<string, string> = {};
    orderBy[query.sortBy || 'createdAt'] = query.sortOrder || 'desc';

    const [data, total] = await Promise.all([
      prisma.property.findMany({
        where,
        skip,
        take,
        orderBy,
        select: {
          id: true,
          name: true,
          address: true,
          buildingType: true,
          floors: true,
          totalRooms: true,
          area: true,
          status: true,
          thumbnailUrl: true,
          tags: true,
          createdAt: true,
        },
      }),
      prisma.property.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async getPublicPropertyById(id: string) {
    const property = await prisma.property.findFirst({
      where: { id, isPublic: true },
      select: {
        id: true,
        name: true,
        address: true,
        buildingType: true,
        floors: true,
        totalRooms: true,
        builtYear: true,
        area: true,
        description: true,
        status: true,
        thumbnailUrl: true,
        imageUrls: true,
        tags: true,
        createdAt: true,
      },
    });
    if (!property) throw new AppError('Property not found', 404);
    return property;
  }

  async getMyProperties(userId: string, query: {
    page?: string;
    limit?: string;
    status?: PropertyStatus;
    landId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { skip, take, page, limit } = getPagination(query);
    const where: Record<string, unknown> = { ownerId: userId };
    if (query.status) where.status = query.status;
    if (query.landId) where.landId = query.landId;

    const orderBy: Record<string, string> = {};
    orderBy[query.sortBy || 'createdAt'] = query.sortOrder || 'desc';

    const [data, total] = await Promise.all([
      prisma.property.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          rooms: { select: { id: true, roomNumber: true, status: true } },
          land: { select: { id: true, name: true } },
        },
      }),
      prisma.property.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async getMyPropertyById(id: string, userId: string) {
    const property = await prisma.property.findFirst({
      where: { id, ownerId: userId },
      include: {
        rooms: {
          include: { tenant: true },
        },
        land: true,
      },
    });
    if (!property) throw new AppError('Property not found', 404);
    return property;
  }

  async createProperty(userId: string, data: {
    name: string;
    address: string;
    buildingType: BuildingType;
    area: number;
    landId?: string;
    floors?: number;
    totalRooms?: number;
    builtYear?: number;
    description?: string;
    status?: PropertyStatus;
    isPublic?: boolean;
    thumbnailUrl?: string;
    imageUrls?: string[];
    purchasePrice?: number;
    currentValue?: number;
    purchaseDate?: string;
    notes?: string;
    tags?: string[];
  }) {
    if (data.landId) {
      const land = await prisma.land.findFirst({ where: { id: data.landId, ownerId: userId } });
      if (!land) throw new AppError('Land not found or not owned by you', 400);
    }

    const property = await prisma.property.create({
      data: {
        ownerId: userId,
        landId: data.landId,
        name: data.name,
        address: data.address,
        buildingType: data.buildingType,
        area: data.area,
        floors: data.floors,
        totalRooms: data.totalRooms,
        builtYear: data.builtYear,
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
    return property;
  }

  async updateProperty(id: string, userId: string, data: Partial<{
    name: string;
    address: string;
    buildingType: BuildingType;
    area: number;
    landId: string;
    floors: number;
    totalRooms: number;
    builtYear: number;
    description: string;
    status: PropertyStatus;
    isPublic: boolean;
    thumbnailUrl: string;
    imageUrls: string[];
    purchasePrice: number;
    currentValue: number;
    purchaseDate: string;
    notes: string;
    tags: string[];
  }>) {
    const existing = await prisma.property.findFirst({ where: { id, ownerId: userId } });
    if (!existing) throw new AppError('Property not found', 404);

    const updated = await prisma.property.update({
      where: { id },
      data: {
        ...data,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
      },
    });
    return updated;
  }

  async deleteProperty(id: string, userId: string) {
    const existing = await prisma.property.findFirst({ where: { id, ownerId: userId } });
    if (!existing) throw new AppError('Property not found', 404);
    await prisma.property.delete({ where: { id } });
  }
}

export const propertyService = new PropertyService();
