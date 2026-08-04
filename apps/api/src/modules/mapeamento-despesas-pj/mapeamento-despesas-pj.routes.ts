import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { requireModule } from '../../middleware/module.middleware';
import { errorHandler, AppError } from '../../shared/utils/error-handler';
import { MapeamentoDespesasPjRepository } from './mapeamento-despesas-pj.repository';
import { MapeamentoDespesasPjService } from './mapeamento-despesas-pj.service';
import { ClientRepository } from '../clients/client.repository';
import {
  AnalyzeExpenseMappingSchema,
  CreateDiagnosisSchema,
  UpdateDiagnosisSchema,
  ListDiagnosesQuerySchema,
  DiagnosisIdParamSchema,
  CreatePendencySchema,
  UpdatePendencySchema,
  CreateEvidenceSchema,
  CreateImportBatchSchema,
} from '@shared/core';

const routes = new Hono();

routes.use('/*', tenantMiddleware);
routes.use('/*', authMiddleware);
routes.use('/*', requireModule('MAPEAMENTO_DESPESAS_PJ'));

const repo = new MapeamentoDespesasPjRepository();
const clientRepo = new ClientRepository();
const service = new MapeamentoDespesasPjService(repo, clientRepo);

const uid = (c: any) => c.get('user')?.id as string | undefined;
const idParam = DiagnosisIdParamSchema;

function requireAdmin(c: any): void {
  const role = String(c.get('user')?.role ?? '').toLowerCase();
  if (role !== 'admin' && role !== 'super_admin') {
    throw new AppError('Ação permitida apenas para administradores', 'FORBIDDEN', 403);
  }
}

// Catálogo versionado
routes.get('/catalog', async (c) => {
  try { return c.json({ data: service.getCatalog() }); }
  catch (err) { return errorHandler(err, c); }
});

// Dashboard da carteira
routes.get('/dashboard', async (c) => {
  try { return c.json({ data: await service.getDashboard() }); }
  catch (err) { return errorHandler(err, c); }
});

// Analisar sem persistir
routes.post('/analyze', zValidator('json', AnalyzeExpenseMappingSchema), async (c) => {
  try { return c.json({ data: service.analyze(c.req.valid('json')) }); }
  catch (err) { return errorHandler(err, c); }
});

// CRUD diagnósticos
routes.post('/', zValidator('json', CreateDiagnosisSchema), async (c) => {
  try { return c.json({ data: await service.createDiagnosis(c.req.valid('json'), uid(c)) }, 201); }
  catch (err) { return errorHandler(err, c); }
});

routes.get('/', zValidator('query', ListDiagnosesQuerySchema), async (c) => {
  try {
    const q = c.req.valid('query');
    const { diagnoses, total } = await service.list(q);
    return c.json({ data: { diagnoses, total, page: q.page, limit: q.limit } });
  } catch (err) { return errorHandler(err, c); }
});

routes.get('/:id', zValidator('param', idParam), async (c) => {
  try { return c.json({ data: await service.getDiagnosisFull(c.req.valid('param').id) }); }
  catch (err) { return errorHandler(err, c); }
});

routes.patch('/:id', zValidator('param', idParam), zValidator('json', UpdateDiagnosisSchema), async (c) => {
  try { return c.json({ data: await service.updateDiagnosis(c.req.valid('param').id, c.req.valid('json'), uid(c)) }); }
  catch (err) { return errorHandler(err, c); }
});

routes.post('/:id/complete', zValidator('param', idParam), async (c) => {
  try { return c.json({ data: await service.complete(c.req.valid('param').id, uid(c)) }); }
  catch (err) { return errorHandler(err, c); }
});

routes.post('/:id/reopen', zValidator('param', idParam), async (c) => {
  try { requireAdmin(c); return c.json({ data: await service.reopen(c.req.valid('param').id, uid(c)) }); }
  catch (err) { return errorHandler(err, c); }
});

routes.delete('/:id', zValidator('param', idParam), async (c) => {
  try { requireAdmin(c); await service.delete(c.req.valid('param').id, uid(c)); return c.json({ data: { success: true } }); }
  catch (err) { return errorHandler(err, c); }
});

routes.get('/:id/audit', zValidator('param', idParam), async (c) => {
  try { return c.json({ data: await service.listAudit(c.req.valid('param').id) }); }
  catch (err) { return errorHandler(err, c); }
});

// Pendências
routes.post('/:id/pendencies', zValidator('param', idParam), zValidator('json', CreatePendencySchema), async (c) => {
  try { return c.json({ data: await service.createPendency(c.req.valid('param').id, c.req.valid('json'), uid(c)) }, 201); }
  catch (err) { return errorHandler(err, c); }
});
routes.get('/:id/pendencies', zValidator('param', idParam), async (c) => {
  try { return c.json({ data: await service.listPendencies(c.req.valid('param').id) }); }
  catch (err) { return errorHandler(err, c); }
});
routes.patch('/pendencies/:id', zValidator('param', idParam), zValidator('json', UpdatePendencySchema), async (c) => {
  try { return c.json({ data: await service.updatePendency(c.req.valid('param').id, c.req.valid('json')) }); }
  catch (err) { return errorHandler(err, c); }
});
routes.delete('/pendencies/:id', zValidator('param', idParam), async (c) => {
  try { await service.deletePendency(c.req.valid('param').id); return c.json({ data: { success: true } }); }
  catch (err) { return errorHandler(err, c); }
});

// Evidências
routes.post('/:id/evidence', zValidator('param', idParam), zValidator('json', CreateEvidenceSchema), async (c) => {
  try { return c.json({ data: await service.createEvidence(c.req.valid('param').id, c.req.valid('json'), uid(c)) }, 201); }
  catch (err) { return errorHandler(err, c); }
});
routes.get('/:id/evidence', zValidator('param', idParam), async (c) => {
  try { return c.json({ data: await service.listEvidence(c.req.valid('param').id) }); }
  catch (err) { return errorHandler(err, c); }
});
routes.delete('/evidence/:id', zValidator('param', idParam), async (c) => {
  try { await service.deleteEvidence(c.req.valid('param').id); return c.json({ data: { success: true } }); }
  catch (err) { return errorHandler(err, c); }
});

// Importação documental (stub)
routes.post('/:id/imports', zValidator('param', idParam), zValidator('json', CreateImportBatchSchema), async (c) => {
  try { return c.json({ data: await service.createImportBatch(c.req.valid('param').id, c.req.valid('json'), uid(c)) }, 201); }
  catch (err) { return errorHandler(err, c); }
});
routes.get('/:id/imports', zValidator('param', idParam), async (c) => {
  try { return c.json({ data: await service.listImportBatches(c.req.valid('param').id) }); }
  catch (err) { return errorHandler(err, c); }
});

export { routes as mapeamentoDespesasPjRoutes };
