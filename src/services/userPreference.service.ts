import { prisma } from '../lib/prisma';

export class UserPreferenceService {
  async getOrCreate(userId: string) {
    let pref = await prisma.userPreference.findUnique({ where: { userId } });
    if (!pref) {
      // Get user's prefectures as default displayPrefectures
      const user = await prisma.user.findUnique({ where: { id: userId } });
      pref = await prisma.userPreference.create({
        data: {
          userId,
          displayMode: 'nationwide',
          displayPrefectures: user?.prefectures || [],
          preferredRegions: user?.prefectures || [],
          notificationSettings: {}
        }
      });
    }
    return pref;
  }

  async update(userId: string, data: {
    displayMode?: string;
    displayPrefectures?: string[];
    preferredRegions?: string[];
    notificationSettings?: object;
  }) {
    return prisma.userPreference.upsert({
      where: { userId },
      create: { userId, ...data, notificationSettings: data.notificationSettings || {} },
      update: data
    });
  }
}

export const userPreferenceService = new UserPreferenceService();
