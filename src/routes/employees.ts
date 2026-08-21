import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { requireLandlordOrHomeowner } from '../middleware/rbac';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/error';
import { encrypt, decrypt } from '../utils/crypto';
import { getPagination, paginate } from '../types';

const router = Router();

router.get(
  '/',
  authenticate,
  requireLandlordOrHomeowner,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { skip, take, page, limit } = getPagination(req.query as Record<string, string>);
    const where = { ownerId: req.user!.userId };

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          department: true,
          hireDate: true,
          contractType: true,
          createdAt: true,
          // mynumber is excluded from list view
        },
      }),
      prisma.employee.count({ where }),
    ]);

    res.json({ success: true, ...paginate(employees, total, page, limit) });
  })
);

router.get(
  '/:id',
  authenticate,
  requireLandlordOrHomeowner,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const employee = await prisma.employee.findFirst({
      where: { id: req.params.id, ownerId: req.user!.userId },
    });
    if (!employee) throw new AppError('Employee not found', 404);

    // Decrypt mynumber for detail view
    const result = {
      ...employee,
      mynumber: employee.mynumber ? decrypt(employee.mynumber) : undefined,
    };

    res.json({ success: true, data: result });
  })
);

const createEmployeeSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  mynumber: z.string().optional(),
  role: z.string().optional(),
  department: z.string().optional(),
  hireDate: z.string().optional(),
  contractType: z.string().optional(),
  notes: z.string().optional(),
});

router.post(
  '/',
  authenticate,
  requireLandlordOrHomeowner,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const parsed = createEmployeeSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.errors[0].message, 400);

    const encryptedMynumber = parsed.data.mynumber ? encrypt(parsed.data.mynumber) : undefined;

    const employee = await prisma.employee.create({
      data: {
        ownerId: req.user!.userId,
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        address: parsed.data.address,
        mynumber: encryptedMynumber,
        role: parsed.data.role,
        department: parsed.data.department,
        hireDate: parsed.data.hireDate ? new Date(parsed.data.hireDate) : undefined,
        contractType: parsed.data.contractType,
        notes: parsed.data.notes,
      },
    });

    res.status(201).json({
      success: true,
      data: { ...employee, mynumber: parsed.data.mynumber ? '[ENCRYPTED]' : undefined },
    });
  })
);

router.put(
  '/:id',
  authenticate,
  requireLandlordOrHomeowner,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const employee = await prisma.employee.findFirst({
      where: { id: req.params.id, ownerId: req.user!.userId },
    });
    if (!employee) throw new AppError('Employee not found', 404);

    const updateData: Record<string, unknown> = { ...req.body };
    if (updateData.mynumber) {
      updateData.mynumber = encrypt(updateData.mynumber as string);
    }
    if (updateData.hireDate) {
      updateData.hireDate = new Date(updateData.hireDate as string);
    }

    const updated = await prisma.employee.update({ where: { id: req.params.id }, data: updateData });
    res.json({
      success: true,
      data: { ...updated, mynumber: updated.mynumber ? '[ENCRYPTED]' : undefined },
    });
  })
);

router.delete(
  '/:id',
  authenticate,
  requireLandlordOrHomeowner,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const employee = await prisma.employee.findFirst({
      where: { id: req.params.id, ownerId: req.user!.userId },
    });
    if (!employee) throw new AppError('Employee not found', 404);
    await prisma.employee.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Employee deleted successfully' });
  })
);

export default router;
