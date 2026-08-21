import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requireLandlordOrHomeowner } from '../middleware/rbac';
import { employeeService } from '../services/employee.service';
import { upload } from '../middleware/upload';

const router = Router();

// GET /api/v1/employees - list owner's employees
router.get('/', authenticate, requireLandlordOrHomeowner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ownerId = (req as any).user.id;
    const employees = await employeeService.getEmployees(ownerId);
    res.json({ success: true, data: employees });
  } catch (error) { next(error); }
});

// GET /api/v1/employees/:id
router.get('/:id', authenticate, requireLandlordOrHomeowner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ownerId = (req as any).user.id;
    const employee = await employeeService.getEmployee(req.params.id, ownerId);
    res.json({ success: true, data: employee });
  } catch (error) { next(error); }
});

// POST /api/v1/employees
router.post('/', authenticate, requireLandlordOrHomeowner, upload.fields([
  { name: 'mynumberCardFront', maxCount: 1 },
  { name: 'mynumberCardBack', maxCount: 1 }
]), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ownerId = (req as any).user.id;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const mynumberCardFrontUrl = files?.mynumberCardFront?.[0]
      ? `/uploads/${files.mynumberCardFront[0].filename}`
      : undefined;
    const mynumberCardBackUrl = files?.mynumberCardBack?.[0]
      ? `/uploads/${files.mynumberCardBack[0].filename}`
      : undefined;

    const employee = await employeeService.createEmployee(ownerId, {
      ...req.body,
      hireDate: req.body.hireDate ? new Date(req.body.hireDate) : undefined,
      mynumberCardFrontUrl,
      mynumberCardBackUrl
    });
    res.status(201).json({ success: true, data: employee });
  } catch (error) { next(error); }
});

// PUT /api/v1/employees/:id
router.put('/:id', authenticate, requireLandlordOrHomeowner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ownerId = (req as any).user.id;
    const employee = await employeeService.updateEmployee(req.params.id, ownerId, req.body);
    res.json({ success: true, data: employee });
  } catch (error) { next(error); }
});

// DELETE /api/v1/employees/:id (soft delete)
router.delete('/:id', authenticate, requireLandlordOrHomeowner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ownerId = (req as any).user.id;
    await employeeService.deleteEmployee(req.params.id, ownerId);
    res.json({ success: true, data: { message: '被雇用者を削除しました' } });
  } catch (error) { next(error); }
});

export default router;
