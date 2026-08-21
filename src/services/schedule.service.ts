import { prisma } from '../lib/prisma';

export const scheduleService = {
  async getSchedules(userId: string, params: {
    year?: number;
    month?: number;
    start?: string;
    end?: string;
    category?: string;
  }) {
    const where: any = { userId };

    if (params.start && params.end) {
      where.OR = [
        { startDateTime: { gte: new Date(params.start), lte: new Date(params.end) } },
        { endDateTime: { gte: new Date(params.start), lte: new Date(params.end) } },
        { AND: [{ startDateTime: { lte: new Date(params.start) } }, { endDateTime: { gte: new Date(params.end) } }] },
      ];
    } else if (params.year && params.month) {
      const start = new Date(params.year, params.month - 1, 1);
      const end = new Date(params.year, params.month, 0, 23, 59, 59);
      where.OR = [
        { startDateTime: { gte: start, lte: end } },
        { endDateTime: { gte: start, lte: end } },
        { AND: [{ startDateTime: { lte: start } }, { endDateTime: { gte: end } }] },
      ];
    }

    if (params.category) {
      where.category = params.category;
    }

    return prisma.schedule.findMany({
      where,
      include: {
        relatedProperty: { select: { id: true, name: true } },
        relatedLand: { select: { id: true, name: true } },
        relatedRoom: { select: { id: true, name: true } },
        relatedTenant: { select: { id: true, name: true } },
      },
      orderBy: { startDateTime: 'asc' },
    });
  },

  async getScheduleById(id: string, userId: string) {
    return prisma.schedule.findFirst({
      where: { id, userId },
      include: {
        relatedProperty: { select: { id: true, name: true } },
        relatedLand: { select: { id: true, name: true } },
        relatedRoom: { select: { id: true, name: true } },
        relatedTenant: { select: { id: true, name: true } },
      },
    });
  },

  async createSchedule(userId: string, data: any) {
    const { relatedPropertyId, relatedLandId, relatedRoomId, relatedTenantId, ...rest } = data;
    return prisma.schedule.create({
      data: {
        ...rest,
        userId,
        startDateTime: new Date(rest.startDateTime),
        endDateTime: new Date(rest.endDateTime),
        relatedPropertyId: relatedPropertyId || null,
        relatedLandId: relatedLandId || null,
        relatedRoomId: relatedRoomId || null,
        relatedTenantId: relatedTenantId || null,
      },
      include: {
        relatedProperty: { select: { id: true, name: true } },
        relatedLand: { select: { id: true, name: true } },
        relatedRoom: { select: { id: true, name: true } },
        relatedTenant: { select: { id: true, name: true } },
      },
    });
  },

  async updateSchedule(id: string, userId: string, data: any) {
    const schedule = await prisma.schedule.findFirst({ where: { id, userId } });
    if (!schedule) throw new Error('Schedule not found or unauthorized');
    const { relatedPropertyId, relatedLandId, relatedRoomId, relatedTenantId, ...rest } = data;
    return prisma.schedule.update({
      where: { id },
      data: {
        ...rest,
        ...(rest.startDateTime ? { startDateTime: new Date(rest.startDateTime) } : {}),
        ...(rest.endDateTime ? { endDateTime: new Date(rest.endDateTime) } : {}),
        relatedPropertyId: relatedPropertyId || null,
        relatedLandId: relatedLandId || null,
        relatedRoomId: relatedRoomId || null,
        relatedTenantId: relatedTenantId || null,
      },
      include: {
        relatedProperty: { select: { id: true, name: true } },
        relatedLand: { select: { id: true, name: true } },
        relatedRoom: { select: { id: true, name: true } },
        relatedTenant: { select: { id: true, name: true } },
      },
    });
  },

  async deleteSchedule(id: string, userId: string) {
    const schedule = await prisma.schedule.findFirst({ where: { id, userId } });
    if (!schedule) throw new Error('Schedule not found or unauthorized');
    return prisma.schedule.delete({ where: { id } });
  },

  async getUpcoming(userId: string, limit = 10) {
    return prisma.schedule.findMany({
      where: {
        userId,
        startDateTime: { gte: new Date() },
        isCancelled: false,
        isCompleted: false,
      },
      include: {
        relatedProperty: { select: { id: true, name: true } },
        relatedRoom: { select: { id: true, name: true } },
      },
      orderBy: { startDateTime: 'asc' },
      take: limit,
    });
  },
};
