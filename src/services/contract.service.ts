import { ContractType, ContractStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error';
import { getPagination, paginate } from '../types';

export class ContractService {
  async getContractsByProperty(propertyId: string, userId: string, query: {
    page?: string;
    limit?: string;
    type?: ContractType;
    status?: ContractStatus;
  }) {
    // verify ownership
    const property = await prisma.property.findFirst({ where: { id: propertyId, ownerId: userId } });
    if (!property) throw new AppError('Property not found', 404);

    const { skip, take, page, limit } = getPagination(query);
    const where: Record<string, unknown> = { propertyId };
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { template: { select: { id: true, title: true } } },
      }),
      prisma.contract.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async getContractById(id: string, userId: string) {
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        property: { select: { id: true, name: true, ownerId: true } },
        land: { select: { id: true, name: true, ownerId: true } },
        template: true,
      },
    });
    if (!contract) throw new AppError('Contract not found', 404);

    const isOwner =
      (contract.property && contract.property.ownerId === userId) ||
      (contract.land && contract.land.ownerId === userId);

    if (!isOwner) throw new AppError('Access denied', 403);
    return contract;
  }

  async createContract(userId: string, data: {
    propertyId?: string;
    landId?: string;
    type: ContractType;
    title: string;
    content: string;
    templateId?: string;
    parties?: unknown[];
    signedDate?: string;
    expiryDate?: string;
    status?: ContractStatus;
    fileUrl?: string;
  }) {
    if (!data.propertyId && !data.landId) {
      throw new AppError('Either propertyId or landId must be provided', 400);
    }
    if (data.propertyId) {
      const prop = await prisma.property.findFirst({ where: { id: data.propertyId, ownerId: userId } });
      if (!prop) throw new AppError('Property not found', 404);
    }
    if (data.landId) {
      const land = await prisma.land.findFirst({ where: { id: data.landId, ownerId: userId } });
      if (!land) throw new AppError('Land not found', 404);
    }

    return prisma.contract.create({
      data: {
        propertyId: data.propertyId,
        landId: data.landId,
        type: data.type,
        title: data.title,
        content: data.content,
        templateId: data.templateId,
        parties: (data.parties || []) as Prisma.InputJsonValue,
        signedDate: data.signedDate ? new Date(data.signedDate) : undefined,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
        status: data.status || 'draft',
        fileUrl: data.fileUrl,
      },
    });
  }

  async updateContract(id: string, userId: string, data: Partial<{
    type: ContractType;
    title: string;
    content: string;
    templateId: string;
    parties: unknown[];
    signedDate: string;
    expiryDate: string;
    status: ContractStatus;
    fileUrl: string;
  }>) {
    await this.getContractById(id, userId);
    const updateData: Prisma.ContractUpdateInput = {};
    if (data.type !== undefined) updateData.type = data.type;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.templateId !== undefined) updateData.template = { connect: { id: data.templateId } };
    if (data.parties !== undefined) updateData.parties = data.parties as Prisma.InputJsonValue;
    if (data.signedDate !== undefined) updateData.signedDate = new Date(data.signedDate);
    if (data.expiryDate !== undefined) updateData.expiryDate = new Date(data.expiryDate);
    if (data.status !== undefined) updateData.status = data.status;
    if (data.fileUrl !== undefined) updateData.fileUrl = data.fileUrl;

    return prisma.contract.update({ where: { id }, data: updateData });
  }

  async deleteContract(id: string, userId: string) {
    await this.getContractById(id, userId);
    await prisma.contract.delete({ where: { id } });
  }

  // ---- Contract Templates ----
  async getTemplates(query: { type?: ContractType; page?: string; limit?: string }) {
    const { skip, take, page, limit } = getPagination(query);
    const where: Record<string, unknown> = {};
    if (query.type) where.type = query.type;

    const [data, total] = await Promise.all([
      prisma.contractTemplate.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.contractTemplate.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async createTemplate(userId: string, data: {
    type: ContractType;
    title: string;
    content: string;
    isOfficial?: boolean;
  }) {
    return prisma.contractTemplate.create({
      data: {
        type: data.type,
        title: data.title,
        content: data.content,
        createdBy: userId,
        isOfficial: data.isOfficial ?? false,
      },
    });
  }

  async updateTemplate(id: string, data: Partial<{
    type: ContractType;
    title: string;
    content: string;
    isOfficial: boolean;
  }>) {
    const existing = await prisma.contractTemplate.findUnique({ where: { id } });
    if (!existing) throw new AppError('Template not found', 404);
    return prisma.contractTemplate.update({ where: { id }, data });
  }
}

export const contractService = new ContractService();
