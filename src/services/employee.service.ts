import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error';
import { encrypt, decrypt } from '../utils/crypto';

export class EmployeeService {
  async getEmployees(ownerId: string) {
    const employees = await prisma.employee.findMany({
      where: { ownerId, isActive: true },
      orderBy: { name: 'asc' }
    });
    // Return with decrypted mynumber (masked by default in service - frontend decides display)
    return employees.map(e => ({
      ...e,
      mynumber: e.mynumber ? decrypt(e.mynumber) : null
    }));
  }

  async getEmployee(id: string, ownerId: string) {
    const employee = await prisma.employee.findFirst({
      where: { id, ownerId }
    });
    if (!employee) throw new AppError('被雇用者が見つかりません', 404);
    return {
      ...employee,
      mynumber: employee.mynumber ? decrypt(employee.mynumber) : null
    };
  }

  async createEmployee(ownerId: string, data: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    role?: string;
    department?: string;
    hireDate?: Date;
    contractType?: string;
    mynumber?: string;
    mynumberCardFrontUrl?: string;
    mynumberCardBackUrl?: string;
    notes?: string;
  }) {
    return prisma.employee.create({
      data: {
        ...data,
        ownerId,
        mynumber: data.mynumber ? encrypt(data.mynumber) : undefined
      }
    });
  }

  async updateEmployee(id: string, ownerId: string, data: Partial<{
    name: string;
    email: string;
    phone: string;
    address: string;
    role: string;
    department: string;
    hireDate: Date;
    contractType: string;
    mynumber: string;
    mynumberVerified: boolean;
    mynumberCardFrontUrl: string;
    mynumberCardBackUrl: string;
    notes: string;
    isActive: boolean;
  }>) {
    const existing = await prisma.employee.findFirst({ where: { id, ownerId } });
    if (!existing) throw new AppError('被雇用者が見つかりません', 404);
    return prisma.employee.update({
      where: { id },
      data: {
        ...data,
        mynumber: data.mynumber ? encrypt(data.mynumber) : undefined
      }
    });
  }

  async deleteEmployee(id: string, ownerId: string) {
    const existing = await prisma.employee.findFirst({ where: { id, ownerId } });
    if (!existing) throw new AppError('被雇用者が見つかりません', 404);
    // Soft delete
    return prisma.employee.update({ where: { id }, data: { isActive: false } });
  }
}

export const employeeService = new EmployeeService();
