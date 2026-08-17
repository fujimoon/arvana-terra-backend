import { TaskStatus, TaskPriority } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error';
import { getPagination, paginate } from '../types';

export class TaskService {
  async getTasks(userId: string, query: {
    page?: string;
    limit?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    propertyId?: string;
    landId?: string;
    isAiSuggested?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { skip, take, page, limit } = getPagination(query);
    const where: Record<string, unknown> = { ownerId: userId };
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.propertyId) where.propertyId = query.propertyId;
    if (query.landId) where.landId = query.landId;
    if (query.isAiSuggested !== undefined) where.isAiSuggested = query.isAiSuggested === 'true';

    const orderBy: Record<string, string> = {};
    orderBy[query.sortBy || 'createdAt'] = query.sortOrder || 'desc';

    const [data, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          property: { select: { id: true, name: true } },
          land: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true } },
        },
      }),
      prisma.task.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async getTaskById(id: string, userId: string) {
    const task = await prisma.task.findFirst({
      where: { id, ownerId: userId },
      include: {
        property: { select: { id: true, name: true } },
        land: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
    });
    if (!task) throw new AppError('Task not found', 404);
    return task;
  }

  async createTask(userId: string, data: {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    propertyId?: string;
    landId?: string;
    assignedTo?: string;
    dueDate?: string;
    isAiSuggested?: boolean;
    aiReason?: string;
  }) {
    return prisma.task.create({
      data: {
        ownerId: userId,
        title: data.title,
        description: data.description,
        status: data.status || 'todo',
        priority: data.priority || 'medium',
        propertyId: data.propertyId,
        landId: data.landId,
        assignedTo: data.assignedTo,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        isAiSuggested: data.isAiSuggested ?? false,
        aiReason: data.aiReason,
      },
    });
  }

  async updateTask(id: string, userId: string, data: Partial<{
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    propertyId: string;
    landId: string;
    assignedTo: string;
    dueDate: string;
  }>) {
    await this.getTaskById(id, userId);
    return prisma.task.update({
      where: { id },
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
    });
  }

  async deleteTask(id: string, userId: string) {
    await this.getTaskById(id, userId);
    await prisma.task.delete({ where: { id } });
  }
}

export const taskService = new TaskService();
