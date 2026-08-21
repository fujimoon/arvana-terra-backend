import { prisma } from '../lib/prisma';

export const tenantService = {
  async getTenantsByRoom(roomId: string) {
    return prisma.tenant.findMany({
      where: { roomId },
      include: { payments: { orderBy: { dueDate: 'desc' }, take: 12 } },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getTenantById(id: string) {
    return prisma.tenant.findUnique({
      where: { id },
      include: {
        room: { include: { property: true } },
        payments: { orderBy: { dueDate: 'desc' } },
      },
    });
  },

  async createTenant(roomId: string, data: any) {
    const tenant = await prisma.tenant.create({
      data: { ...data, roomId },
    });
    await prisma.room.update({ where: { id: roomId }, data: { status: 'occupied' } });
    return tenant;
  },

  async updateTenant(id: string, data: any) {
    return prisma.tenant.update({ where: { id }, data });
  },

  async deleteTenant(id: string) {
    return prisma.tenant.delete({ where: { id } });
  },

  async createPayment(tenantId: string, roomId: string, data: any) {
    return prisma.payment.create({ data: { ...data, tenantId, roomId } });
  },

  async updatePaymentStatus(id: string, status: 'paid' | 'pending' | 'late' | 'overdue', paidDate?: Date) {
    return prisma.payment.update({
      where: { id },
      data: { status, paidDate: paidDate ?? (status === 'paid' ? new Date() : undefined) },
    });
  },

  async getLateTenants(propertyId?: string) {
    return prisma.tenant.findMany({
      where: {
        paymentStatus: 'late',
        ...(propertyId ? { room: { propertyId } } : {}),
      },
      include: { room: { include: { property: true } }, payments: true },
    });
  },
};
