import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireModule } from '../../middleware/module.middleware';
import { errorHandler } from '../../shared/utils/error-handler';
import { AtividadeImobiliariaRepository } from './atividade-imobiliaria.repository';
import { AtividadeImobiliariaService } from './atividade-imobiliaria.service';
import { ClientRepository } from '../clients/client.repository';
import {
  CreateDevelopmentSchema,
  UpdateDevelopmentSchema,
  ListDevelopmentsQuerySchema,
  DevelopmentIdParamSchema,
  UnitIdParamSchema,
  CreateUnitSchema,
  CreateUnitBatchSchema,
  UpdateUnitSchema,
  CreateSaleContractSchema,
  UpdateSaleContractSchema,
  ContractIdParamSchema,
  InstallmentIdParamSchema,
  ReceiptIdParamSchema,
  CreateReceiptSchema,
} from '@shared/core';

const repo = new AtividadeImobiliariaRepository();
const clientRepo = new ClientRepository();
const service = new AtividadeImobiliariaService(repo, clientRepo);

const routes = new Hono();

routes.use('/*', tenantMiddleware);
routes.use('/*', authMiddleware);
routes.use('/*', requireModule('GESTAO_IMOVEIS'));

// ---- Empreendimentos ----

routes.get('/developments', zValidator('query', ListDevelopmentsQuerySchema), async (c) => {
  try {
    const q = c.req.valid('query');
    const data = await service.listDevelopments(q);
    return c.json({ data });
  } catch (err) { return errorHandler(err, c); }
});

routes.post('/developments', zValidator('json', CreateDevelopmentSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    const data = await service.createDevelopment(body);
    return c.json({ data }, 201);
  } catch (err) { return errorHandler(err, c); }
});

routes.get('/developments/:id', zValidator('param', DevelopmentIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid('param');
    const data = await service.getDevelopment(id);
    return c.json({ data });
  } catch (err) { return errorHandler(err, c); }
});

routes.patch('/developments/:id', zValidator('param', DevelopmentIdParamSchema), zValidator('json', UpdateDevelopmentSchema), async (c) => {
  try {
    const { id } = c.req.valid('param');
    const body = c.req.valid('json');
    const data = await service.updateDevelopment(id, body);
    return c.json({ data });
  } catch (err) { return errorHandler(err, c); }
});

routes.delete('/developments/:id', zValidator('param', DevelopmentIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid('param');
    await service.deleteDevelopment(id);
    return c.json({ data: { ok: true } });
  } catch (err) { return errorHandler(err, c); }
});

// ---- Unidades ----

routes.get('/developments/:id/units', zValidator('param', DevelopmentIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid('param');
    const data = await service.listUnits(id);
    return c.json({ data });
  } catch (err) { return errorHandler(err, c); }
});

routes.post('/developments/:id/units', zValidator('param', DevelopmentIdParamSchema), zValidator('json', CreateUnitSchema), async (c) => {
  try {
    const { id } = c.req.valid('param');
    const body = c.req.valid('json');
    const data = await service.createUnit(id, body);
    return c.json({ data }, 201);
  } catch (err) { return errorHandler(err, c); }
});

routes.post('/developments/:id/units/batch', zValidator('param', DevelopmentIdParamSchema), zValidator('json', CreateUnitBatchSchema), async (c) => {
  try {
    const { id } = c.req.valid('param');
    const { units } = c.req.valid('json');
    const data = await service.createUnitsBatch(id, units);
    return c.json({ data }, 201);
  } catch (err) { return errorHandler(err, c); }
});

routes.patch('/units/:unitId', zValidator('param', UnitIdParamSchema), zValidator('json', UpdateUnitSchema), async (c) => {
  try {
    const { unitId } = c.req.valid('param');
    const body = c.req.valid('json');
    const data = await service.updateUnit(unitId, body);
    return c.json({ data });
  } catch (err) { return errorHandler(err, c); }
});

routes.delete('/units/:unitId', zValidator('param', UnitIdParamSchema), async (c) => {
  try {
    const { unitId } = c.req.valid('param');
    await service.deleteUnit(unitId);
    return c.json({ data: { ok: true } });
  } catch (err) { return errorHandler(err, c); }
});

// ---- Integridade ----

routes.get('/developments/:id/integrity', zValidator('param', DevelopmentIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid('param');
    const data = await service.getIntegrity(id);
    return c.json({ data });
  } catch (err) { return errorHandler(err, c); }
});

// ---- Contratos ----

routes.get('/developments/:id/contracts', zValidator('param', DevelopmentIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid('param');
    const data = await service.listContracts(id);
    return c.json({ data });
  } catch (err) { return errorHandler(err, c); }
});

routes.post('/developments/:id/contracts', zValidator('param', DevelopmentIdParamSchema), zValidator('json', CreateSaleContractSchema), async (c) => {
  try {
    const { id } = c.req.valid('param');
    const body = c.req.valid('json');
    const data = await service.createContract(id, body);
    return c.json({ data }, 201);
  } catch (err) { return errorHandler(err, c); }
});

routes.get('/contracts/:contractId', zValidator('param', ContractIdParamSchema), async (c) => {
  try {
    const { contractId } = c.req.valid('param');
    const data = await service.getContractDetail(contractId);
    return c.json({ data });
  } catch (err) { return errorHandler(err, c); }
});

routes.patch('/contracts/:contractId', zValidator('param', ContractIdParamSchema), zValidator('json', UpdateSaleContractSchema), async (c) => {
  try {
    const { contractId } = c.req.valid('param');
    const body = c.req.valid('json');
    const data = await service.updateContract(contractId, body);
    return c.json({ data });
  } catch (err) { return errorHandler(err, c); }
});

routes.delete('/contracts/:contractId', zValidator('param', ContractIdParamSchema), async (c) => {
  try {
    const { contractId } = c.req.valid('param');
    await service.deleteContract(contractId);
    return c.json({ data: { ok: true } });
  } catch (err) { return errorHandler(err, c); }
});

routes.get('/contracts/:contractId/integrity', zValidator('param', ContractIdParamSchema), async (c) => {
  try {
    const { contractId } = c.req.valid('param');
    const data = await service.getContractIntegrity(contractId);
    return c.json({ data });
  } catch (err) { return errorHandler(err, c); }
});

// ---- Baixas ----

routes.post('/installments/:installmentId/receipts', zValidator('param', InstallmentIdParamSchema), zValidator('json', CreateReceiptSchema), async (c) => {
  try {
    const { installmentId } = c.req.valid('param');
    const body = c.req.valid('json');
    const data = await service.createReceipt(installmentId, body);
    return c.json({ data }, 201);
  } catch (err) { return errorHandler(err, c); }
});

routes.delete('/receipts/:receiptId', zValidator('param', ReceiptIdParamSchema), async (c) => {
  try {
    const { receiptId } = c.req.valid('param');
    await service.deleteReceipt(receiptId);
    return c.json({ data: { ok: true } });
  } catch (err) { return errorHandler(err, c); }
});

// ---- Exportação Domínio ----

routes.get('/developments/:id/export-dominio', zValidator('param', DevelopmentIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid('param');
    const data = await service.exportDominio(id);
    return c.json({ data });
  } catch (err) { return errorHandler(err, c); }
});

export const atividadeImobiliariaRoutes = routes;
