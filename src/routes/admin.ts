import { Router, Response } from 'express';
import { z } from 'zod';
import { vendorService } from '../services/vendor.service';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/error';
import { prisma } from '../lib/prisma';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// User management
router.get(
  '/users',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string | undefined;

    const where = search
      ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, name: true, role: true, phone: true,
          isActive: true, createdAt: true, updatedAt: true,
          _count: { select: { properties: true, lands: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const mapped = users.map((u) => ({
      id: u.id, email: u.email, name: u.name, role: u.role, phone: u.phone,
      status: u.isActive ? 'active' : 'suspended',
      propertiesCount: u._count.properties,
      landsCount: u._count.lands,
      createdAt: u.createdAt, updatedAt: u.updatedAt,
    }));

    res.json({ success: true, data: mapped, total, page, limit, totalPages: Math.ceil(total / limit) });
  })
);

router.get(
  '/users/:id',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, email: true, name: true, role: true, phone: true, createdAt: true, updatedAt: true },
    });
    if (!user) throw new AppError('User not found', 404);
    res.json({ success: true, data: user });
  })
);

router.patch(
  '/users/:id/status',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { status } = req.body;
    const isActive = status === 'active';
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive },
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true, updatedAt: true },
    });
    res.json({ success: true, data: { ...user, status: user.isActive ? 'active' : 'suspended' } });
  })
);

router.delete(
  '/users/:id',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'User deleted successfully' });
  })
);

// Content management (SNS posts)
router.get(
  '/content',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string | undefined;
    const where = search ? { OR: [{ title: { contains: search } }, { content: { contains: search } }] } : {};
    const [posts, total] = await Promise.all([
      prisma.snsPost.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { author: { select: { id: true, name: true, email: true, role: true } } },
      }),
      prisma.snsPost.count({ where }),
    ]);
    res.json({ success: true, data: posts, total, page, limit, totalPages: Math.ceil(total / limit) });
  })
);

router.delete(
  '/content/:id',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await prisma.snsPost.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Post deleted successfully' });
  })
);

// Chat oversight
router.get(
  '/chats',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const [rooms, total] = await Promise.all([
      prisma.chatRoom.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          participants: { include: { user: { select: { id: true, name: true } } } },
          _count: { select: { messages: true } },
        },
      }),
      prisma.chatRoom.count(),
    ]);
    res.json({ success: true, data: rooms, total, page, limit, totalPages: Math.ceil(total / limit) });
  })
);

router.get(
  '/chats/:id',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const chatRoom = await prisma.chatRoom.findUnique({
      where: { id: req.params.id },
      include: {
        participants: {
          include: { user: { select: { id: true, name: true, email: true, role: true, profileImageUrl: true } } },
        },
        property: { select: { id: true, name: true } },
        land: { select: { id: true, name: true } },
        _count: { select: { messages: true } },
      },
    });
    if (!chatRoom) throw new AppError('Chat room not found', 404);
    res.json({ success: true, data: chatRoom });
  })
);

router.get(
  '/chats/:id/messages',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const room = await prisma.chatRoom.findUnique({ where: { id: req.params.id } });
    if (!room) throw new AppError('Chat room not found', 404);

    const [messages, total] = await Promise.all([
      prisma.chatMessage.findMany({
        where: { chatRoomId: req.params.id },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          sender: { select: { id: true, name: true, profileImageUrl: true } },
        },
      }),
      prisma.chatMessage.count({ where: { chatRoomId: req.params.id } }),
    ]);

    res.json({ success: true, data: messages, total, page, limit, totalPages: Math.ceil(total / limit) });
  })
);

// Vendor management
router.get(
  '/vendors',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await vendorService.getAllVendors(req.query as Record<string, string>);
    res.json({ success: true, ...result });
  })
);

router.post(
  '/vendors',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const schema = z.object({
      name: z.string().min(1),
      category: z.enum(['glass', 'electric', 'plumbing', 'construction', 'cleaning', 'security', 'other']),
      contactName: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      description: z.string().optional(),
      website: z.string().optional(),
      serviceAreas: z.array(z.string()).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.errors[0].message, 400);

    const vendor = await vendorService.adminCreateVendor(req.user!.userId, parsed.data);
    res.status(201).json({ success: true, data: vendor });
  })
);

router.patch(
  '/vendors/:id/approve',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const vendor = await vendorService.approveVendor(req.params.id, req.user!.userId);
    res.json({ success: true, data: vendor });
  })
);

router.delete(
  '/vendors/:id',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await vendorService.adminDeleteVendor(req.params.id);
    res.json({ success: true, message: 'Vendor deleted successfully' });
  })
);

export default router;
