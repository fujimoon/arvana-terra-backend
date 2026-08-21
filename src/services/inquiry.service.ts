import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error';

export class InquiryService {
  // Submit a purchase/consultation inquiry for a property or land
  async createInquiry(data: {
    type: 'property' | 'land';
    propertyId?: string;
    landId?: string;
    userId?: string;
    senderName: string;
    senderEmail: string;
    senderPhone?: string;
    inquiryType: 'purchase' | 'consultation';
    message: string;
  }) {
    // Verify the property/land exists and is public
    if (data.type === 'property' && data.propertyId) {
      const property = await prisma.property.findFirst({
        where: { id: data.propertyId, isPublic: true }
      });
      if (!property) throw new AppError('物件が見つかりません', 404);
    } else if (data.type === 'land' && data.landId) {
      const land = await prisma.land.findFirst({
        where: { id: data.landId, isPublic: true }
      });
      if (!land) throw new AppError('土地が見つかりません', 404);
    }

    const inquiry = await prisma.purchaseInquiry.create({ data });

    // TODO: Send email notification to property/land owner
    // and to ARVANA admin

    return inquiry;
  }

  async getInquiries(filters: { status?: string; type?: string }) {
    return prisma.purchaseInquiry.findMany({
      where: filters,
      include: { property: true, land: true, user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateInquiryStatus(id: string, status: string, adminNote?: string) {
    return prisma.purchaseInquiry.update({
      where: { id },
      data: { status, adminNote }
    });
  }
}

export const inquiryService = new InquiryService();
