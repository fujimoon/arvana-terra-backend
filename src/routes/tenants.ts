import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { tenantService } from '../services/tenant.service';

const router = Router();

// GET /api/v1/rooms/:roomId/tenants
router.get('/rooms/:roomId/tenants', authenticate, async (req, res) => {
  try {
    const tenants = await tenantService.getTenantsByRoom(req.params.roomId);
    res.json({ tenants });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/v1/tenants/:id
router.get('/tenants/:id', authenticate, async (req, res) => {
  try {
    const tenant = await tenantService.getTenantById(req.params.id);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    res.json({ tenant });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/v1/rooms/:roomId/tenants
router.post('/rooms/:roomId/tenants', authenticate, async (req, res) => {
  try {
    const tenant = await tenantService.createTenant(req.params.roomId, req.body);
    res.status(201).json({ tenant });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/v1/tenants/:id
router.put('/tenants/:id', authenticate, async (req, res) => {
  try {
    const tenant = await tenantService.updateTenant(req.params.id, req.body);
    res.json({ tenant });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/v1/tenants/:id
router.delete('/tenants/:id', authenticate, async (req, res) => {
  try {
    await tenantService.deleteTenant(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/v1/tenants/:tenantId/payments
router.post('/tenants/:tenantId/payments', authenticate, async (req, res) => {
  try {
    const { roomId, ...data } = req.body;
    const payment = await tenantService.createPayment(req.params.tenantId, roomId, data);
    res.status(201).json({ payment });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/v1/payments/:id/status
router.patch('/payments/:id/status', authenticate, async (req, res) => {
  try {
    const { status, paidDate } = req.body;
    const payment = await tenantService.updatePaymentStatus(req.params.id, status, paidDate);
    res.json({ payment });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/v1/tenants/late
router.get('/tenants/late', authenticate, async (req, res) => {
  try {
    const tenants = await tenantService.getLateTenants(req.query.propertyId as string | undefined);
    res.json({ tenants });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
