import { prisma } from '../lib/prisma';

export const tenantService = {
  async getTenantsByRoom(roomId: string) {
    return prisma.tenant.findMany({
      where: { roomId },
      include: { familyMembers: true, payments: { orderBy: { dueDate: 'desc' }, take: 12 } },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getTenantById(id: string) {
    return prisma.tenant.findUnique({
      where: { id },
      include: {
        room: { include: { property: true } },
        familyMembers: true,
        payments: { orderBy: { dueDate: 'desc' } },
      },
    });
  },

  async createTenant(roomId: string, data: any) {
    const { familyMembers, ...tenantData } = data;
    const tenant = await prisma.tenant.create({
      data: {
        ...tenantData,
        roomId,
        familyMembers: familyMembers?.length
          ? { create: familyMembers }
          : undefined,
      },
      include: { familyMembers: true },
    });
    // Update room status to occupied
    await prisma.room.update({ where: { id: roomId }, data: { status: 'occupied' } });
    return tenant;
  },

  async updateTenant(id: string, data: any) {
    const { familyMembers, ...tenantData } = data;
    return prisma.tenant.update({
      where: { id },
      data: tenantData,
      include: { familyMembers: true },
    });
  },

  async deleteTenant(id: string) {
    return prisma.tenant.delete({ where: { id } });
  },

  async addFamilyMember(tenantId: string, data: any) {
    return prisma.familyMember.create({ data: { ...data, tenantId } });
  },

  async updateFamilyMember(id: string, data: any) {
    return prisma.familyMember.update({ where: { id }, data });
  },

  async deleteFamilyMember(id: string) {
    return prisma.familyMember.delete({ where: { id } });
  },

  async createPayment(tenantId: string, roomId: string, data: any) {
    return prisma.payment.create({ data: { ...data, tenantId, roomId } });
  },

  async updatePaymentStatus(id: string, status: string, paidDate?: Date) {
    return prisma.payment.update({
      where: { id },
      data: { status, paidDate: paidDate ?? (status === 'paid' ? new Date() : undefined) },
    });
  },

  async getOverdueTenants(propertyId?: string) {
    return prisma.tenant.findMany({
      where: {
        paymentStatus: { in: ['overdue', 'partial'] },
        status: 'active',
        ...(propertyId ? { room: { propertyId } } : {}),
      },
      include: { room: { include: { property: true } }, payments: { where: { status: 'overdue' } } },
    });
  },
};
