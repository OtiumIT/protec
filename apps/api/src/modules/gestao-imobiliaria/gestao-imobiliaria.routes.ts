import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createHash } from 'crypto';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { requireModule } from '../../middleware/module.middleware';
import { errorHandler, AppError } from '../../shared/utils/error-handler';
import { query, runWithTenantClient } from '../../db/client';
import { GestaoImobiliariaRepository } from './gestao-imobiliaria.repository';
import { GestaoImobiliariaService } from './gestao-imobiliaria.service';
import { ClientRepository } from '../clients/client.repository';
import {
  CreatePropertyTenantSchema, UpdatePropertyTenantSchema,
  CreatePropertyLeaseSchema, UpdatePropertyLeaseSchema,
  CreateLeaseAmendmentSchema, CreateGuaranteeSchema, UpdateGuaranteeSchema,
  CreateLedgerEntrySchema, UpdateLedgerEntrySchema, SettleLedgerEntrySchema, ListLedgerQuerySchema,
  CreateRecurringRuleSchema, UpdateRecurringRuleSchema, GenerateRecurringSchema,
  CreatePropertyDocumentSchema,
  CreateStatementShareSchema, StatementQuerySchema, PublicStatementParamSchema,
  CreateOwnershipShareSchema, UpdateOwnershipShareSchema,
  CreateVendorSchema, UpdateVendorSchema,
  CreateMaintenanceTicketSchema, UpdateMaintenanceTicketSchema,
  CreateInspectionSchema, UpdateInspectionSchema,
  CreateInventoryItemSchema, UpdateInventoryItemSchema,
  CreatePaymentChargeSchema, CreateCommunicationSchema, CreateBankImportBatchSchema,
  GestaoImobiliariaIdParamSchema, DashboardQuerySchema, AlertsQuerySchema,
} from '@shared/core';

const repo = new GestaoImobiliariaRepository();
const clientRepo = new ClientRepository();
const service = new GestaoImobiliariaService(repo, clientRepo);

const idParam = GestaoImobiliariaIdParamSchema;

function requireAdmin(c: any): void {
  const role = String(c.get('user')?.role ?? '').toLowerCase();
  if (role !== 'admin' && role !== 'super_admin') {
    throw new AppError('Ação permitida apenas para administradores', 'FORBIDDEN', 403);
  }
}

// ==========================================================================
// Rota PÚBLICA (read-only) — sem auth/tenant middleware. Resolve o tenant via token.
// ==========================================================================
const publicRoutes = new Hono();
publicRoutes.get('/statement/:token', zValidator('param', PublicStatementParamSchema), async (c) => {
  try {
    const { token } = c.req.valid('param');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const reg = await query<{ company_id: string; expires_at: Date; revoked_at: Date | null }>(
      `SELECT company_id, expires_at, revoked_at FROM public.statement_share_tokens WHERE token_hash = $1`,
      [tokenHash]
    );
    const row = reg.rows[0];
    if (!row) return c.json({ error: { message: 'Link inválido', code: 'SHARE_NOT_FOUND' } }, 404);
    if (row.revoked_at) return c.json({ error: { message: 'Este link foi revogado', code: 'SHARE_REVOKED' } }, 403);
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return c.json({ error: { message: 'Este link expirou', code: 'SHARE_EXPIRED' } }, 403);
    }
    const data = await runWithTenantClient(row.company_id, () => service.getPublicStatement(token));
    return c.json({ data });
  } catch (err) {
    return errorHandler(err, c);
  }
});

// ==========================================================================
// Rotas autenticadas
// ==========================================================================
const routes = new Hono();

routes.use('/*', tenantMiddleware);
routes.use('/*', authMiddleware);
routes.use('/*', requireModule('GESTAO_IMOVEIS'));

const uid = (c: any) => c.get('user')?.id as string | undefined;

// ---- Dashboard / Alertas / Extrato / DRE ----
routes.get('/dashboard', zValidator('query', DashboardQuerySchema), async (c) => {
  try {
    const q = c.req.valid('query');
    const competencia = q.competencia ?? new Date().toISOString().slice(0, 7);
    const data = await service.getDashboard(q.client_id, competencia);
    return c.json({ data });
  } catch (err) { return errorHandler(err, c); }
});

routes.get('/alerts', zValidator('query', AlertsQuerySchema), async (c) => {
  try {
    const q = c.req.valid('query');
    const data = await service.getAlerts(q.client_id, q.dias);
    return c.json({ data });
  } catch (err) { return errorHandler(err, c); }
});

routes.get('/statement', zValidator('query', StatementQuerySchema), async (c) => {
  try {
    const q = c.req.valid('query');
    const propertyIds = (q.property_ids || '').split(',').map((s) => s.trim()).filter(Boolean);
    const data = await service.buildStatement(q.client_id, propertyIds, q.period_from, q.period_to);
    return c.json({ data });
  } catch (err) { return errorHandler(err, c); }
});

routes.post('/statement-shares', zValidator('json', CreateStatementShareSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    const companyId = c.get('companyId') as string;
    const data = await service.createStatementShare(body, companyId, uid(c));
    return c.json({ data }, 201);
  } catch (err) { return errorHandler(err, c); }
});

routes.get('/statement-shares', zValidator('query', z.object({ client_id: z.string().uuid().optional() })), async (c) => {
  try {
    const { client_id } = c.req.valid('query');
    const data = await service.listStatementShares(client_id);
    return c.json({ data });
  } catch (err) { return errorHandler(err, c); }
});

routes.post('/statement-shares/:id/revoke', zValidator('param', idParam), async (c) => {
  try {
    requireAdmin(c);
    const { id } = c.req.valid('param');
    const data = await service.revokeStatementShare(id);
    return c.json({ data });
  } catch (err) { return errorHandler(err, c); }
});

// ---- Inquilinos ----
routes.post('/tenants', zValidator('json', CreatePropertyTenantSchema), async (c) => {
  try { return c.json({ data: await service.createTenant(c.req.valid('json'), uid(c)) }, 201); }
  catch (err) { return errorHandler(err, c); }
});
routes.get('/tenants', zValidator('query', z.object({ client_id: z.string().uuid().optional() })), async (c) => {
  try { return c.json({ data: await service.listTenants(c.req.valid('query').client_id) }); }
  catch (err) { return errorHandler(err, c); }
});
routes.patch('/tenants/:id', zValidator('param', idParam), zValidator('json', UpdatePropertyTenantSchema), async (c) => {
  try { return c.json({ data: await service.updateTenant(c.req.valid('param').id, c.req.valid('json')) }); }
  catch (err) { return errorHandler(err, c); }
});
routes.delete('/tenants/:id', zValidator('param', idParam), async (c) => {
  try { requireAdmin(c); await service.deleteTenant(c.req.valid('param').id); return c.json({ data: { success: true } }); }
  catch (err) { return errorHandler(err, c); }
});

// ---- Contratos ----
routes.post('/leases', zValidator('json', CreatePropertyLeaseSchema), async (c) => {
  try { return c.json({ data: await service.createLease(c.req.valid('json'), uid(c)) }, 201); }
  catch (err) { return errorHandler(err, c); }
});
routes.get('/leases', zValidator('query', z.object({
  property_id: z.string().uuid().optional(), status: z.string().optional(), client_id: z.string().uuid().optional(),
})), async (c) => {
  try { return c.json({ data: await service.listLeases(c.req.valid('query')) }); }
  catch (err) { return errorHandler(err, c); }
});
routes.get('/leases/:id', zValidator('param', idParam), async (c) => {
  try { return c.json({ data: await service.getLease(c.req.valid('param').id) }); }
  catch (err) { return errorHandler(err, c); }
});
routes.patch('/leases/:id', zValidator('param', idParam), zValidator('json', UpdatePropertyLeaseSchema), async (c) => {
  try { return c.json({ data: await service.updateLease(c.req.valid('param').id, c.req.valid('json')) }); }
  catch (err) { return errorHandler(err, c); }
});
routes.delete('/leases/:id', zValidator('param', idParam), async (c) => {
  try { requireAdmin(c); await service.deleteLease(c.req.valid('param').id); return c.json({ data: { success: true } }); }
  catch (err) { return errorHandler(err, c); }
});
routes.post('/leases/:id/quick-simulate', zValidator('param', idParam), async (c) => {
  try { return c.json({ data: await service.quickSimulateLease(c.req.valid('param').id) }); }
  catch (err) { return errorHandler(err, c); }
});
routes.patch('/leases/:id/regime', zValidator('param', idParam), zValidator('json', z.object({ regime: z.enum(['pf', 'pj']) })), async (c) => {
  try { return c.json({ data: await service.saveLeaseRegime(c.req.valid('param').id, c.req.valid('json').regime) }); }
  catch (err) { return errorHandler(err, c); }
});

routes.post('/leases/:id/amendments', zValidator('param', idParam), zValidator('json', CreateLeaseAmendmentSchema.omit({ lease_id: true })), async (c) => {
  try { return c.json({ data: await service.createAmendment({ ...c.req.valid('json'), lease_id: c.req.valid('param').id }, uid(c)) }, 201); }
  catch (err) { return errorHandler(err, c); }
});
routes.get('/leases/:id/amendments', zValidator('param', idParam), async (c) => {
  try { return c.json({ data: await service.listAmendments(c.req.valid('param').id) }); }
  catch (err) { return errorHandler(err, c); }
});
routes.post('/leases/:id/guarantees', zValidator('param', idParam), zValidator('json', CreateGuaranteeSchema.omit({ lease_id: true })), async (c) => {
  try { return c.json({ data: await service.createGuarantee({ ...c.req.valid('json'), lease_id: c.req.valid('param').id }, uid(c)) }, 201); }
  catch (err) { return errorHandler(err, c); }
});
routes.get('/leases/:id/guarantees', zValidator('param', idParam), async (c) => {
  try { return c.json({ data: await service.listGuarantees(c.req.valid('param').id) }); }
  catch (err) { return errorHandler(err, c); }
});
routes.patch('/guarantees/:id', zValidator('param', idParam), zValidator('json', UpdateGuaranteeSchema), async (c) => {
  try { return c.json({ data: await service.updateGuarantee(c.req.valid('param').id, c.req.valid('json')) }); }
  catch (err) { return errorHandler(err, c); }
});

// ---- Ledger ----
routes.post('/ledger', zValidator('json', CreateLedgerEntrySchema), async (c) => {
  try { return c.json({ data: await service.createLedgerEntry(c.req.valid('json'), uid(c)) }, 201); }
  catch (err) { return errorHandler(err, c); }
});
routes.get('/ledger', zValidator('query', ListLedgerQuerySchema), async (c) => {
  try {
    const q = c.req.valid('query');
    const { entries, total } = await service.listLedger(q);
    return c.json({ data: { entries, total, page: q.page, limit: q.limit } });
  } catch (err) { return errorHandler(err, c); }
});
routes.patch('/ledger/:id', zValidator('param', idParam), zValidator('json', UpdateLedgerEntrySchema), async (c) => {
  try { return c.json({ data: await service.updateLedgerEntry(c.req.valid('param').id, c.req.valid('json')) }); }
  catch (err) { return errorHandler(err, c); }
});
routes.post('/ledger/:id/settle', zValidator('param', idParam), zValidator('json', SettleLedgerEntrySchema), async (c) => {
  try { return c.json({ data: await service.settleLedgerEntry(c.req.valid('param').id, c.req.valid('json').paid_at) }); }
  catch (err) { return errorHandler(err, c); }
});
routes.post('/ledger/:id/cancel', zValidator('param', idParam), async (c) => {
  try { return c.json({ data: await service.cancelLedgerEntry(c.req.valid('param').id) }); }
  catch (err) { return errorHandler(err, c); }
});
routes.delete('/ledger/:id', zValidator('param', idParam), async (c) => {
  try { requireAdmin(c); await service.deleteLedgerEntry(c.req.valid('param').id); return c.json({ data: { success: true } }); }
  catch (err) { return errorHandler(err, c); }
});
routes.post('/ledger/mark-overdue', async (c) => {
  try { return c.json({ data: { updated: await service.markOverdue() } }); }
  catch (err) { return errorHandler(err, c); }
});

// ---- Recorrências ----
routes.post('/recurring', zValidator('json', CreateRecurringRuleSchema), async (c) => {
  try { return c.json({ data: await service.createRecurringRule(c.req.valid('json'), uid(c)) }, 201); }
  catch (err) { return errorHandler(err, c); }
});
routes.get('/recurring', zValidator('query', z.object({ property_id: z.string().uuid().optional() })), async (c) => {
  try { return c.json({ data: await service.listRecurringRules(c.req.valid('query').property_id) }); }
  catch (err) { return errorHandler(err, c); }
});
routes.patch('/recurring/:id', zValidator('param', idParam), zValidator('json', UpdateRecurringRuleSchema), async (c) => {
  try { return c.json({ data: await service.updateRecurringRule(c.req.valid('param').id, c.req.valid('json')) }); }
  catch (err) { return errorHandler(err, c); }
});
routes.delete('/recurring/:id', zValidator('param', idParam), async (c) => {
  try { await service.deleteRecurringRule(c.req.valid('param').id); return c.json({ data: { success: true } }); }
  catch (err) { return errorHandler(err, c); }
});
routes.post('/recurring/generate', zValidator('json', GenerateRecurringSchema), async (c) => {
  try { return c.json({ data: await service.generateRecurring(c.req.valid('json').competencia, uid(c)) }, 201); }
  catch (err) { return errorHandler(err, c); }
});

// ---- Documentos ----
routes.post('/documents', zValidator('json', CreatePropertyDocumentSchema), async (c) => {
  try { return c.json({ data: await service.createDocument(c.req.valid('json'), uid(c)) }, 201); }
  catch (err) { return errorHandler(err, c); }
});
routes.get('/documents', zValidator('query', z.object({
  property_id: z.string().uuid().optional(), lease_id: z.string().uuid().optional(),
})), async (c) => {
  try { return c.json({ data: await service.listDocuments(c.req.valid('query')) }); }
  catch (err) { return errorHandler(err, c); }
});
routes.delete('/documents/:id', zValidator('param', idParam), async (c) => {
  try { await service.deleteDocument(c.req.valid('param').id); return c.json({ data: { success: true } }); }
  catch (err) { return errorHandler(err, c); }
});

// ---- Ownership shares ----
routes.post('/ownership-shares', zValidator('json', CreateOwnershipShareSchema), async (c) => {
  try { return c.json({ data: await service.createOwnershipShare(c.req.valid('json'), uid(c)) }, 201); }
  catch (err) { return errorHandler(err, c); }
});
routes.get('/ownership-shares', zValidator('query', z.object({ property_id: z.string().uuid() })), async (c) => {
  try { return c.json({ data: await service.listOwnershipShares(c.req.valid('query').property_id) }); }
  catch (err) { return errorHandler(err, c); }
});
routes.patch('/ownership-shares/:id', zValidator('param', idParam), zValidator('json', UpdateOwnershipShareSchema), async (c) => {
  try { return c.json({ data: await service.updateOwnershipShare(c.req.valid('param').id, c.req.valid('json')) }); }
  catch (err) { return errorHandler(err, c); }
});
routes.delete('/ownership-shares/:id', zValidator('param', idParam), async (c) => {
  try { await service.deleteOwnershipShare(c.req.valid('param').id); return c.json({ data: { success: true } }); }
  catch (err) { return errorHandler(err, c); }
});

// ---- Fornecedores ----
routes.post('/vendors', zValidator('json', CreateVendorSchema), async (c) => {
  try { return c.json({ data: await service.createVendor(c.req.valid('json'), uid(c)) }, 201); }
  catch (err) { return errorHandler(err, c); }
});
routes.get('/vendors', async (c) => {
  try { return c.json({ data: await service.listVendors() }); }
  catch (err) { return errorHandler(err, c); }
});
routes.patch('/vendors/:id', zValidator('param', idParam), zValidator('json', UpdateVendorSchema), async (c) => {
  try { return c.json({ data: await service.updateVendor(c.req.valid('param').id, c.req.valid('json')) }); }
  catch (err) { return errorHandler(err, c); }
});
routes.delete('/vendors/:id', zValidator('param', idParam), async (c) => {
  try { await service.deleteVendor(c.req.valid('param').id); return c.json({ data: { success: true } }); }
  catch (err) { return errorHandler(err, c); }
});

// ---- Manutenções ----
routes.post('/maintenance', zValidator('json', CreateMaintenanceTicketSchema), async (c) => {
  try { return c.json({ data: await service.createMaintenance(c.req.valid('json'), uid(c)) }, 201); }
  catch (err) { return errorHandler(err, c); }
});
routes.get('/maintenance', zValidator('query', z.object({ property_id: z.string().uuid().optional() })), async (c) => {
  try { return c.json({ data: await service.listMaintenance(c.req.valid('query').property_id) }); }
  catch (err) { return errorHandler(err, c); }
});
routes.patch('/maintenance/:id', zValidator('param', idParam), zValidator('json', UpdateMaintenanceTicketSchema), async (c) => {
  try { return c.json({ data: await service.updateMaintenance(c.req.valid('param').id, c.req.valid('json')) }); }
  catch (err) { return errorHandler(err, c); }
});
routes.delete('/maintenance/:id', zValidator('param', idParam), async (c) => {
  try { await service.deleteMaintenance(c.req.valid('param').id); return c.json({ data: { success: true } }); }
  catch (err) { return errorHandler(err, c); }
});

// ---- Vistorias ----
routes.post('/inspections', zValidator('json', CreateInspectionSchema), async (c) => {
  try { return c.json({ data: await service.createInspection(c.req.valid('json'), uid(c)) }, 201); }
  catch (err) { return errorHandler(err, c); }
});
routes.get('/inspections', zValidator('query', z.object({ property_id: z.string().uuid().optional() })), async (c) => {
  try { return c.json({ data: await service.listInspections(c.req.valid('query').property_id) }); }
  catch (err) { return errorHandler(err, c); }
});
routes.patch('/inspections/:id', zValidator('param', idParam), zValidator('json', UpdateInspectionSchema), async (c) => {
  try { return c.json({ data: await service.updateInspection(c.req.valid('param').id, c.req.valid('json')) }); }
  catch (err) { return errorHandler(err, c); }
});
routes.delete('/inspections/:id', zValidator('param', idParam), async (c) => {
  try { await service.deleteInspection(c.req.valid('param').id); return c.json({ data: { success: true } }); }
  catch (err) { return errorHandler(err, c); }
});

// ---- Inventário ----
routes.post('/inventory', zValidator('json', CreateInventoryItemSchema), async (c) => {
  try { return c.json({ data: await service.createInventoryItem(c.req.valid('json'), uid(c)) }, 201); }
  catch (err) { return errorHandler(err, c); }
});
routes.get('/inventory', zValidator('query', z.object({ property_id: z.string().uuid() })), async (c) => {
  try { return c.json({ data: await service.listInventory(c.req.valid('query').property_id) }); }
  catch (err) { return errorHandler(err, c); }
});
routes.patch('/inventory/:id', zValidator('param', idParam), zValidator('json', UpdateInventoryItemSchema), async (c) => {
  try { return c.json({ data: await service.updateInventoryItem(c.req.valid('param').id, c.req.valid('json')) }); }
  catch (err) { return errorHandler(err, c); }
});
routes.delete('/inventory/:id', zValidator('param', idParam), async (c) => {
  try { await service.deleteInventoryItem(c.req.valid('param').id); return c.json({ data: { success: true } }); }
  catch (err) { return errorHandler(err, c); }
});

// ---- Integrações externas (stubs "em criação") ----
routes.post('/payment-charges', zValidator('json', CreatePaymentChargeSchema), async (c) => {
  try { return c.json({ data: await service.createPaymentCharge(c.req.valid('json'), uid(c)) }, 201); }
  catch (err) { return errorHandler(err, c); }
});
routes.get('/payment-charges', zValidator('query', z.object({ property_id: z.string().uuid().optional() })), async (c) => {
  try { return c.json({ data: await service.listPaymentCharges(c.req.valid('query').property_id) }); }
  catch (err) { return errorHandler(err, c); }
});
routes.post('/communications', zValidator('json', CreateCommunicationSchema), async (c) => {
  try { return c.json({ data: await service.createCommunication(c.req.valid('json'), uid(c)) }, 201); }
  catch (err) { return errorHandler(err, c); }
});
routes.get('/communications', zValidator('query', z.object({ client_id: z.string().uuid().optional() })), async (c) => {
  try { return c.json({ data: await service.listCommunications(c.req.valid('query').client_id) }); }
  catch (err) { return errorHandler(err, c); }
});
routes.post('/bank-imports', zValidator('json', CreateBankImportBatchSchema), async (c) => {
  try { return c.json({ data: await service.createBankImportBatch(c.req.valid('json'), uid(c)) }, 201); }
  catch (err) { return errorHandler(err, c); }
});
routes.get('/bank-imports', async (c) => {
  try { return c.json({ data: await service.listBankImportBatches() }); }
  catch (err) { return errorHandler(err, c); }
});

export { routes as gestaoImobiliariaRoutes, publicRoutes as gestaoImobiliariaPublicRoutes };
