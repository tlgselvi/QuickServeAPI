import express from 'express';
import type { Request, Response } from 'express';
import { insertTenantSchema, Tenant } from '../../shared/schema';
import { requireRole } from '../middleware/auth';
import { storage } from '../storage';

const router = express.Router();

// Get all tenants (admin only)
router.get('/', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const tenants = await storage.getTenants();
    res.json(tenants);
  } catch (error) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

// Get tenant by ID
router.get('/:id', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenant = await storage.getTenant(id);

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json(tenant);
  } catch (error) {
    console.error('Error fetching tenant:', error);
    res.status(500).json({ error: 'Failed to fetch tenant' });
  }
});

// Create new tenant (admin only)
router.post('/', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const validatedData = insertTenantSchema.parse(req.body);
    const tenant = await storage.createTenant(validatedData);

    res.status(201).json(tenant);
  } catch (error) {
    console.error('Error creating tenant:', error);
    res.status(400).json({ error: 'Failed to create tenant' });
  }
});

// Update tenant (admin only)
router.put('/:id', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = insertTenantSchema.partial().parse(req.body);

    const tenant = await storage.updateTenant(id, validatedData);

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json(tenant);
  } catch (error) {
    console.error('Error updating tenant:', error);
    res.status(400).json({ error: 'Failed to update tenant' });
  }
});

// Delete tenant (admin only)
router.delete('/:id', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = await storage.deleteTenant(id);

    if (!success) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting tenant:', error);
    res.status(500).json({ error: 'Failed to delete tenant' });
  }
});

// Get tenant by domain (public endpoint for white-label)
router.get('/domain/:domain', async (req: Request, res: Response) => {
  try {
    const { domain } = req.params;
    const tenant = await storage.getTenantByDomain(domain);

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Only return public information
    const publicTenant = {
      id: tenant.id,
      name: tenant.name,
      logo: tenant.logo,
      theme: tenant.theme,
    };

    res.json(publicTenant);
  } catch (error) {
    console.error('Error fetching tenant by domain:', error);
    res.status(500).json({ error: 'Failed to fetch tenant' });
  }
});

export default router;
