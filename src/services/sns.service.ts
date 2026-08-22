import { SnsPostType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error';
import { getPagination, paginate } from '../types';

export class SnsService {
  async getPosts(userId: string, query: {
    page?: string;
    limit?: string;
    type?: SnsPostType;
    tag?: string;
    authorId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { skip, take, page, limit } = getPagination(query);
    const where: Record<string, unknown> = {};
    if (query.type) where.type = query.type;
    if (query.tag) where.tags = { has: query.tag };
    if (query.authorId) where.authorId = query.authorId;

    const orderBy: Record<string, string> = {};
    orderBy[query.sortBy || 'createdAt'] = query.sortOrder || 'desc';

    const [data, total] = await Promise.all([
      prisma.snsPost.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          author: { select: { id: true, name: true, profileImageUrl: true, role: true } },
          _count: { select: { likes: true, comments: true } },
          likes: { where: { userId }, select: { id: true } },
        },
      }),
      prisma.snsPost.count({ where }),
    ]);

    const postsWithLiked = data.map((post) => ({
      ...post,
      isLiked: post.likes.length > 0,
      likeCount: post._count.likes,
      commentCount: post._count.comments,
      likes: undefined,
      _count: undefined,
    }));

    return paginate(postsWithLiked, total, page, limit);
  }

  async getPostById(id: string, userId: string) {
    const post = await prisma.snsPost.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, profileImageUrl: true, role: true } },
        _count: { select: { likes: true, comments: true } },
        likes: { where: { userId }, select: { id: true } },
        event: true,
      },
    });
    if (!post) throw new AppError('Post not found', 404);

    // Increment view count
    await prisma.snsPost.update({ where: { id }, data: { viewCount: { increment: 1 } } });

    return {
      ...post,
      isLiked: post.likes.length > 0,
      likeCount: post._count.likes,
      commentCount: post._count.comments,
      likes: undefined,
      _count: undefined,
    };
  }

  async createPost(userId: string, data: {
    type: SnsPostType;
    title: string;
    content: string;
    tags?: string[];
    imageUrls?: string[];
    event?: {
      eventDate: string;
      location?: string;
      maxParticipants?: number;
    };
  }) {
    const post = await prisma.snsPost.create({
      data: {
        authorId: userId,
        type: data.type,
        title: data.title,
        content: data.content,
        tags: data.tags || [],
        imageUrls: data.imageUrls || [],
        ...(data.event && {
          event: {
            create: {
              eventDate: new Date(data.event.eventDate),
              location: data.event.location,
              maxParticipants: data.event.maxParticipants,
            },
          },
        }),
      },
      include: {
        author: { select: { id: true, name: true } },
        event: true,
      },
    });
    return post;
  }

  async updatePost(id: string, userId: string, data: Partial<{
    title: string;
    content: string;
    tags: string[];
    imageUrls: string[];
  }>) {
    const post = await prisma.snsPost.findUnique({ where: { id } });
    if (!post) throw new AppError('Post not found', 404);
    if (post.authorId !== userId) throw new AppError('Not authorized', 403);

    return prisma.snsPost.update({ where: { id }, data });
  }

  async deletePost(id: string, userId: string) {
    const post = await prisma.snsPost.findUnique({ where: { id } });
    if (!post) throw new AppError('Post not found', 404);
    if (post.authorId !== userId) throw new AppError('Not authorized', 403);
    await prisma.snsPost.delete({ where: { id } });
  }

  async likePost(postId: string, userId: string) {
    const post = await prisma.snsPost.findUnique({ where: { id: postId } });
    if (!post) throw new AppError('Post not found', 404);

    const existing = await prisma.snsLike.findFirst({ where: { postId, userId } });
    if (existing) {
      await prisma.snsLike.delete({ where: { id: existing.id } });
      return { liked: false };
    }
    await prisma.snsLike.create({ data: { postId, userId } });
    return { liked: true };
  }

  async getComments(postId: string, query: { page?: string; limit?: string }) {
    const { skip, take, page, limit } = getPagination(query);
    const post = await prisma.snsPost.findUnique({ where: { id: postId } });
    if (!post) throw new AppError('Post not found', 404);

    const [data, total] = await Promise.all([
      prisma.snsComment.findMany({
        where: { postId },
        skip,
        take,
        orderBy: { createdAt: 'asc' },
        include: { author: { select: { id: true, name: true, profileImageUrl: true } } },
      }),
      prisma.snsComment.count({ where: { postId } }),
    ]);

    return paginate(data, total, page, limit);
  }

  async createComment(postId: string, userId: string, content: string) {
    const post = await prisma.snsPost.findUnique({ where: { id: postId } });
    if (!post) throw new AppError('Post not found', 404);

    return prisma.snsComment.create({
      data: { postId, authorId: userId, content },
      include: { author: { select: { id: true, name: true, profileImageUrl: true } } },
    });
  }

  async getEvents(query: { page?: string; limit?: string; region?: string }) {
    const { skip, take, page, limit } = getPagination(query);
    const where: Record<string, unknown> = {
      eventDate: { gte: new Date() },
    };
    if (query.region) where.location = { contains: query.region, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      prisma.snsEvent.findMany({
        where,
        skip,
        take,
        orderBy: { eventDate: 'asc' },
        include: {
          post: {
            include: { author: { select: { id: true, name: true, profileImageUrl: true } } },
          },
        },
      }),
      prisma.snsEvent.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async registerForEvent(eventId: string, userId: string) {
    const event = await prisma.snsEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new AppError('Event not found', 404);

    if (event.registeredUsers.includes(userId)) {
      // Unregister
      await prisma.snsEvent.update({
        where: { id: eventId },
        data: { registeredUsers: event.registeredUsers.filter((uid) => uid !== userId) },
      });
      return { registered: false };
    }

    if (event.maxParticipants && event.registeredUsers.length >= event.maxParticipants) {
      throw new AppError('Event is full', 400);
    }

    await prisma.snsEvent.update({
      where: { id: eventId },
      data: { registeredUsers: { push: userId } },
    });
    return { registered: true };
  }

  async getUserProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId, isActive: true },
      select: { id: true, name: true, role: true, profileImageUrl: true, bio: true },
    });
    if (!user) throw new AppError('User not found', 404);

    const [postCount, totalLikes] = await Promise.all([
      prisma.snsPost.count({ where: { authorId: userId } }),
      prisma.snsLike.count({ where: { post: { authorId: userId } } }),
    ]);

    return { ...user, postCount, totalLikes };
  }

  async searchMembers(query: { name?: string; role?: string; page?: string; limit?: string }) {
    const { skip, take, page, limit } = getPagination(query);
    const where: Record<string, unknown> = { isActive: true };
    if (query.name) where.name = { contains: query.name, mode: 'insensitive' };
    if (query.role) where.role = query.role;

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        select: { id: true, name: true, role: true, profileImageUrl: true, bio: true },
        orderBy: { name: 'asc' },
      }),
      prisma.user.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }
}

export const snsService = new SnsService();
