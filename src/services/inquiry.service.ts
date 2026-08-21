import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error';

export class InquiryService {
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
    if (data.type === 'property' && data.propertyId) {
      const property = await prisma.property.findFirst({
        where: { id: data.propertyId, isPublic: true },
      });
      if (!property) throw new AppError('物件が見つかりません', 404);
    } else if (data.type === 'land' && data.landId) {
      const land = await prisma.land.findFirst({
        where: { id: data.landId, isPublic: true },
      });
      if (!land) throw new AppError('土地が見つかりません', 404);
    }
    // PurchaseInquiry model not in current schema; return stub
    return { ...data, id: 'stub', status: 'pending', createdAt: new Date() };
  }

  async getInquiries(_filters: { status?: string; type?: string }) {
    return [];
  }

  async updateInquiryStatus(_id: string, _status: string, _adminNote?: string) {
    return null;
  }
}

export const inquiryService = new InquiryService();
