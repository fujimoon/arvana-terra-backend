import { VendorCategory } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error';
import { getPagination, paginate } from '../types';

export class VendorService {
  async getPublicVendors(query: {
    page?: string;
    limit?: string;
    category?: VendorCategory;
    region?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { skip, take, page, limit } = getPagination(query);
    const where: Record<string, unknown> = { isApproved: true };
    if (query.category) where.category = query.category;
    if (query.region) where.serviceAreas = { has: query.region };

    const orderBy: Record<string, string> = {};
    orderBy[query.sortBy || 'name'] = query.sortOrder || 'asc';

    const [data, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        skip,
        take,
        orderBy,
        select: {
          id: true,
          name: true,
          category: true,
          contactName: true,
          email: true,
          phone: true,
          description: true,
          serviceAreas: true,
          rating: true,
        },
      }),
      prisma.vendor.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async getVendorById(id: string) {
    const vendor = await prisma.vendor.findFirst({
      where: { id, isApproved: true },
    });
    if (!vendor) throw new AppError('Vendor not found', 404);
    return vendor;
  }

  async getMyVendors(userId: string) {
    return prisma.userVendor.findMany({
      where: { userId },
      include: { vendor: true },
      orderBy: { connectedAt: 'desc' },
    });
  }

  async applyVendor(data: {
    name: string;
    category: VendorCategory;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    description?: string;
    website?: string;
    serviceAreas?: string[];
  }) {
    return prisma.vendor.create({
      data: {
        name: data.name,
        category: data.category,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        description: data.description,
        website: data.website,
        serviceAreas: data.serviceAreas || [],
        isApproved: false,
      },
    });
  }

  async connectVendor(userId: string, vendorId: string, notes?: string) {
    const vendor = await prisma.vendor.findFirst({ where: { id: vendorId, isApproved: true } });
    if (!vendor) throw new AppError('Vendor not found', 404);

    const existing = await prisma.userVendor.findFirst({ where: { userId, vendorId } });
    if (existing) throw new AppError('Already connected with this vendor', 409);

    return prisma.userVendor.create({ data: { userId, vendorId, notes } });
  }

  async disconnectVendor(userId: string, vendorId: string) {
    const connection = await prisma.userVendor.findFirst({ where: { userId, vendorId } });
    if (!connection) throw new AppError('Connection not found', 404);
    await prisma.userVendor.delete({ where: { id: connection.id } });
  }

  // Admin methods
  async getAllVendors(query: {
    page?: string;
    limit?: string;
    isApproved?: string;
    category?: VendorCategory;
  }) {
    const { skip, take, page, limit } = getPagination(query);
    const where: Record<string, unknown> = {};
    if (query.isApproved !== undefined) where.isApproved = query.isApproved === 'true';
    if (query.category) where.category = query.category;

    const [data, total] = await Promise.all([
      prisma.vendor.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.vendor.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async adminCreateVendor(adminUserId: string, data: {
    name: string;
    category: VendorCategory;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    description?: string;
    website?: string;
    serviceAreas?: string[];
  }) {
    return prisma.vendor.create({
      data: {
        ...data,
        serviceAreas: data.serviceAreas || [],
        isApproved: true,
        registeredBy: adminUserId,
      },
    });
  }

  async approveVendor(id: string, adminUserId: string) {
    const vendor = await prisma.vendor.findUnique({ where: { id } });
    if (!vendor) throw new AppError('Vendor not found', 404);
    return prisma.vendor.update({
      where: { id },
      data: { isApproved: true, registeredBy: adminUserId },
    });
  }

  async adminDeleteVendor(id: string) {
    const vendor = await prisma.vendor.findUnique({ where: { id } });
    if (!vendor) throw new AppError('Vendor not found', 404);
    await prisma.vendor.delete({ where: { id } });
  }
}

export const vendorService = new VendorService();
