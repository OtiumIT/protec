import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { AccessListService } from './access-list.service';
import { authMiddleware } from '../../middleware/auth.middleware';
import { ActivateAccessSchema, DeactivateAccessSchema } from '@shared/core';
import { errorHandler, AppError } from '../../shared/utils/error-handler';
import { z } from 'zod';

const accessListRoutes = new Hono();
const service = new AccessListService();

function requireSuperAdmin(c: any): void {
  const user = c.get('user');
  if (!user || user.role !== 'super_admin') {
    throw new AppError('Acesso restrito a super administradores', 'FORBIDDEN', 403);
  }
}

accessListRoutes.use('/*', authMiddleware);

accessListRoutes.post('/import', async (c) => {
  try {
    requireSuperAdmin(c);
    const user = c.get('user');

    const contentType = c.req.header('content-type') || '';

    let csvText: string;
    if (contentType.includes('multipart/form-data')) {
      const formData = await c.req.formData();
      const file = formData.get('file');
      if (!file || !(file instanceof File)) {
        throw new AppError('Arquivo CSV não encontrado', 'FILE_REQUIRED', 400);
      }
      csvText = await file.text();
    } else {
      const body = await c.req.json();
      csvText = body.csv;
    }

    if (!csvText || typeof csvText !== 'string') {
      throw new AppError('Conteúdo CSV vazio', 'EMPTY_CSV', 400);
    }

    const rows = parseCsv(csvText);
    if (rows.length === 0) {
      throw new AppError('Nenhuma linha válida encontrada no CSV', 'EMPTY_CSV', 400);
    }

    const result = await service.importCsv(rows, user.id);

    return c.json({ data: result });
  } catch (error) {
    return errorHandler(error, c);
  }
});

accessListRoutes.get('/', async (c) => {
  try {
    requireSuperAdmin(c);

    const status = c.req.query('status');
    const search = c.req.query('search');
    const page = parseInt(c.req.query('page') || '1', 10);
    const limit = parseInt(c.req.query('limit') || '50', 10);

    const result = await service.list({ status, search, page, limit });

    return c.json({ data: result });
  } catch (error) {
    return errorHandler(error, c);
  }
});

accessListRoutes.get('/stats', async (c) => {
  try {
    requireSuperAdmin(c);
    const stats = await service.getStats();
    return c.json({ data: stats });
  } catch (error) {
    return errorHandler(error, c);
  }
});

accessListRoutes.post(
  '/activate',
  zValidator('json', ActivateAccessSchema),
  async (c) => {
    try {
      requireSuperAdmin(c);
      const user = c.get('user');
      const { ids } = c.req.valid('json');
      const results = await service.activate(ids, user.id);
      return c.json({ data: results });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

accessListRoutes.post(
  '/deactivate',
  zValidator('json', DeactivateAccessSchema),
  async (c) => {
    try {
      requireSuperAdmin(c);
      const user = c.get('user');
      const { ids } = c.req.valid('json');
      const results = await service.deactivate(ids, user.id);
      return c.json({ data: results });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

accessListRoutes.post('/:id/activate', async (c) => {
  try {
    requireSuperAdmin(c);
    const user = c.get('user');
    const id = c.req.param('id');
    const results = await service.activate([id], user.id);
    return c.json({ data: results[0] });
  } catch (error) {
    return errorHandler(error, c);
  }
});

accessListRoutes.post('/:id/deactivate', async (c) => {
  try {
    requireSuperAdmin(c);
    const user = c.get('user');
    const id = c.req.param('id');
    const results = await service.deactivate([id], user.id);
    return c.json({ data: results[0] });
  } catch (error) {
    return errorHandler(error, c);
  }
});

accessListRoutes.post('/:id/regenerate-password', async (c) => {
  try {
    requireSuperAdmin(c);
    const user = c.get('user');
    const id = c.req.param('id');
    const result = await service.regeneratePassword(id, user.id);
    return c.json({ data: result });
  } catch (error) {
    return errorHandler(error, c);
  }
});

accessListRoutes.get('/:id/credentials', async (c) => {
  try {
    requireSuperAdmin(c);
    const id = c.req.param('id');
    const credentials = await service.getCredentials(id);
    return c.json({ data: credentials });
  } catch (error) {
    return errorHandler(error, c);
  }
});

accessListRoutes.delete('/:id', async (c) => {
  try {
    requireSuperAdmin(c);
    const id = c.req.param('id');
    await service.deleteEntry(id);
    return c.json({ data: { success: true } });
  } catch (error) {
    return errorHandler(error, c);
  }
});

export { accessListRoutes };

function parseCsv(csv: string): Array<{ nome: string; email: string; telefone?: string; cpf?: string; empresa?: string }> {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headerLine = lines[0].toLowerCase();
  const separator = headerLine.includes(';') ? ';' : ',';
  const headers = headerLine.split(separator).map((h) => h.trim().replace(/^["']|["']$/g, ''));

  const colMap: Record<string, number> = {};
  const aliases: Record<string, string[]> = {
    nome: ['nome', 'name', 'razao_social', 'razão social', 'razao social'],
    email: ['email', 'e-mail', 'e_mail', 'mail', 'contato'],
    telefone: ['telefone', 'phone', 'tel', 'celular', 'fone', 'whatsapp'],
    cpf: ['cpf', 'documento', 'doc'],
    empresa: ['empresa', 'company', 'empresa_nome', 'razao_social_empresa'],
  };

  for (const [field, aliasList] of Object.entries(aliases)) {
    const idx = headers.findIndex((h) => aliasList.includes(h));
    if (idx !== -1) colMap[field] = idx;
  }

  if (colMap.nome === undefined || colMap.email === undefined) {
    throw new AppError(
      'CSV deve conter ao menos as colunas "nome" e "email"',
      'INVALID_CSV_HEADERS',
      400
    );
  }

  const rows: Array<{ nome: string; email: string; telefone?: string; cpf?: string; empresa?: string }> = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(separator).map((c) => c.trim().replace(/^["']|["']$/g, ''));
    const nome = cols[colMap.nome]?.trim();
    const email = cols[colMap.email]?.trim();

    if (!nome || !email) continue;

    const emailCheck = z.string().email().safeParse(email);
    if (!emailCheck.success) continue;

    rows.push({
      nome,
      email,
      telefone: colMap.telefone !== undefined ? cols[colMap.telefone]?.trim() : undefined,
      cpf: colMap.cpf !== undefined ? cols[colMap.cpf]?.trim() : undefined,
      empresa: colMap.empresa !== undefined ? cols[colMap.empresa]?.trim() : undefined,
    });
  }

  return rows;
}
