import { prisma } from '../lib/prisma';

export class UserPreferenceService {
  async getOrCreate(userId: string) {
    let pref = await prisma.userPreference.findUnique({ where: { userId } });
    if (!pref) {
      pref = await prisma.userPreference.create({
        data: {
          userId,
          preferredRegions: [],
          notificationSettings: {},
        },
      });
    }
    return pref;
  }

  async update(userId: string, data: {
    preferredRegions?: string[];
    notificationSettings?: object;
  }) {
    return prisma.userPreference.upsert({
      where: { userId },
      create: { userId, ...data, notificationSettings: data.notificationSettings || {} },
      update: data,
    });
  }
}

export const userPreferenceService = new UserPreferenceService();
