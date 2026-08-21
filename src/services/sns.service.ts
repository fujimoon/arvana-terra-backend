import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error';

export class SnsService {
  async getPosts(filters: { category?: string; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where = filters.category ? { category: filters.category } : {};

    const [posts, total] = await Promise.all([
      prisma.snsPost.findMany({
        where,
        include: {
          author: { select: { id: true, name: true, profileImageUrl: true } },
          _count: { select: { comments: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.snsPost.count({ where })
    ]);

    return { posts, total, page, limit };
  }

  async createPost(data: {
    authorId: string;
    content: string;
    category: string;
    tags?: string[];
  }) {
    return prisma.snsPost.create({
      data: {
        authorId: data.authorId,
        content: data.content,
        category: data.category,
        tags: data.tags || []
      },
      include: {
        author: { select: { id: true, name: true, profileImageUrl: true } }
      }
    });
  }

  async getPostById(id: string) {
    const post = await prisma.snsPost.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, profileImageUrl: true } },
        comments: {
          include: {
            author: { select: { id: true, name: true, profileImageUrl: true } }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    if (!post) throw new AppError('投稿が見つかりません', 404);
    return post;
  }

  async addComment(data: {
    postId: string;
    authorId: string;
    content: string;
  }) {
    const post = await prisma.snsPost.findUnique({ where: { id: data.postId } });
    if (!post) throw new AppError('投稿が見つかりません', 404);

    return prisma.snsComment.create({
      data: {
        postId: data.postId,
        authorId: data.authorId,
        content: data.content
      },
      include: {
        author: { select: { id: true, name: true, profileImageUrl: true } }
      }
    });
  }

  async toggleLike(postId: string, userId: string) {
    const post = await prisma.snsPost.findUnique({ where: { id: postId } });
    if (!post) throw new AppError('投稿が見つかりません', 404);

    const alreadyLiked = post.likedBy.includes(userId);

    if (alreadyLiked) {
      // いいね解除
      return prisma.snsPost.update({
        where: { id: postId },
        data: {
          likedBy: { set: post.likedBy.filter(id => id !== userId) },
          likeCount: { decrement: 1 }
        }
      });
    } else {
      // いいね追加
      return prisma.snsPost.update({
        where: { id: postId },
        data: {
          likedBy: { push: userId },
          likeCount: { increment: 1 }
        }
      });
    }
  }
}

export const snsService = new SnsService();
