import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error';
import { getIO } from '../socket/instance';

export class SaleRequestService {
  // Owner submits a sale listing request
  async createSaleRequest(data: {
    type: 'property' | 'land';
    propertyId?: string;
    landId?: string;
    ownerId: string;
    askingPrice?: number;
    description?: string;
    contactInfo?: string;
    thumbnailUrl?: string;
    imageUrls?: string[];
  }) {
    // Verify ownership
    if (data.type === 'property' && data.propertyId) {
      const property = await prisma.property.findFirst({
        where: { id: data.propertyId, ownerId: data.ownerId }
      });
      if (!property) throw new AppError('物件が見つかりません', 404);
    } else if (data.type === 'land' && data.landId) {
      const land = await prisma.land.findFirst({
        where: { id: data.landId, ownerId: data.ownerId }
      });
      if (!land) throw new AppError('土地が見つかりません', 404);
    }

    // Check for existing pending request
    const existing = await prisma.saleListingRequest.findFirst({
      where: {
        ownerId: data.ownerId,
        ...(data.propertyId ? { propertyId: data.propertyId } : {}),
        ...(data.landId ? { landId: data.landId } : {}),
        status: 'pending'
      }
    });
    if (existing) throw new AppError('既に売出し希望申請が申請中です', 400);

    return prisma.saleListingRequest.create({
      data: { ...data, imageUrls: data.imageUrls || [] }
    });
  }

  async getMySaleRequests(ownerId: string) {
    return prisma.saleListingRequest.findMany({
      where: { ownerId },
      include: { property: true, land: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  // Admin: get all sale requests with filters
  async getAllSaleRequests(filters: { status?: string }) {
    return prisma.saleListingRequest.findMany({
      where: filters,
      include: {
        property: { select: { id: true, name: true, address: true, thumbnailUrl: true } },
        land: { select: { id: true, name: true, address: true, thumbnailUrl: true } },
        owner: { select: { id: true, name: true, email: true, phone: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // Admin: approve → set isPublic=true on property/land, send notification
  async approveSaleRequest(id: string, adminNote?: string) {
    const request = await prisma.saleListingRequest.findUnique({ where: { id } });
    if (!request) throw new AppError('申請が見つかりません', 404);
    if (request.status !== 'pending') throw new AppError('この申請は既に処理済みです', 400);

    // Update request status
    const updated = await prisma.saleListingRequest.update({
      where: { id },
      data: { status: 'approved', adminNote, approvedAt: new Date() },
      include: {
        owner: true,
        property: true,
        land: true
      }
    });

    // Set isPublic=true and status to for_sale on the property/land
    if (request.type === 'property' && request.propertyId) {
      await prisma.property.update({
        where: { id: request.propertyId },
        data: { isPublic: true, status: 'for_sale' }
      });
    } else if (request.type === 'land' && request.landId) {
      await prisma.land.update({
        where: { id: request.landId },
        data: { isPublic: true, status: 'for_sale' }
      });
    }

    // Send Socket.io notification to owner
    const io = getIO();
    if (io) {
      io.of('/notification').to(`user:${request.ownerId}`).emit('new_notification', {
        type: 'sale_request_approved',
        title: '売出し申請が承認されました',
        content: `${request.type === 'property' ? '物件' : '土地'}の売出し申請が承認され、公開されました。`,
        relatedId: id
      });
    }

    // Create notification record in DB
    await prisma.notification.create({
      data: {
        userId: request.ownerId,
        type: 'sale_request_approved',
        title: '売出し申請が承認されました',
        content: `${request.type === 'property' ? '物件' : '土地'}の売出し申請が承認され、一覧に公開されました。`,
        relatedId: id,
        relatedType: 'sale_listing_request'
      }
    });

    return updated;
  }

  // Admin: reject sale request
  async rejectSaleRequest(id: string, adminNote: string) {
    const request = await prisma.saleListingRequest.findUnique({ where: { id } });
    if (!request) throw new AppError('申請が見つかりません', 404);
    if (request.status !== 'pending') throw new AppError('この申請は既に処理済みです', 400);

    const updated = await prisma.saleListingRequest.update({
      where: { id },
      data: { status: 'rejected', adminNote, rejectedAt: new Date() }
    });

    // Send notification
    const io = getIO();
    if (io) {
      io.of('/notification').to(`user:${request.ownerId}`).emit('new_notification', {
        type: 'sale_request_rejected',
        title: '売出し申請が却下されました',
        content: adminNote,
        relatedId: id
      });
    }

    await prisma.notification.create({
      data: {
        userId: request.ownerId,
        type: 'sale_request_rejected',
        title: '売出し申請が却下されました',
        content: adminNote,
        relatedId: id,
        relatedType: 'sale_listing_request'
      }
    });

    return updated;
  }
}

export const saleRequestService = new SaleRequestService();
