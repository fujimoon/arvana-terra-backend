// Schedule model is not in the current Prisma schema.
// This service is a stub until the schema is extended.

export const scheduleService = {
  async getSchedules(_userId: string, _params: {
    year?: number;
    month?: number;
    start?: string;
    end?: string;
    category?: string;
  }) {
    return [];
  },

  async getScheduleById(_id: string, _userId: string) {
    return null;
  },

  async createSchedule(_userId: string, _data: any) {
    return { id: 'stub', createdAt: new Date() };
  },

  async updateSchedule(_id: string, _userId: string, _data: any) {
    return null;
  },

  async deleteSchedule(_id: string, _userId: string) {
    return null;
  },

  async getUpcoming(_userId: string, _limit = 10) {
    return [];
  },
};
