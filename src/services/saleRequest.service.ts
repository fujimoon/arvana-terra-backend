// SaleListingRequest model is not in the current Prisma schema.
// This service is a stub until the schema is extended.

export class SaleRequestService {
  async createSaleRequest(_data: any) {
    return { id: 'stub', status: 'pending', createdAt: new Date() };
  }

  async getMySaleRequests(_ownerId: string) {
    return [];
  }

  async getAllSaleRequests(_filters: { status?: string }) {
    return [];
  }

  async approveSaleRequest(_id: string, _adminNote?: string) {
    return null;
  }

  async rejectSaleRequest(_id: string, _adminNote?: string) {
    return null;
  }
}

export const saleRequestService = new SaleRequestService();
