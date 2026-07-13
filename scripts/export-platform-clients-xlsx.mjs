/**
 * Exporta clientes da plataforma (escritórios) para XLSX.
 * Uso: node scripts/export-platform-clients-xlsx.mjs [--days=30]
 */
import { createRequire } from 'module';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, readFileSync, existsSync } from 'fs';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnv() {
  const envPath = resolve(root, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const require = createRequire(import.meta.url);
const { Pool } = require(resolve(root, 'apps/api/node_modules/pg'));

const daysArg = process.argv.find((a) => a.startsWith('--days='));
const periodDays = daysArg
  ? Math.max(1, Math.min(365, parseInt(daysArg.split('=')[1] || '30', 10)))
  : 30;

const MODULE_LABELS = {
  'simulador-in-2306': 'IN 2306',
  'irpf-alta-renda': 'IRPF Alta Renda',
  'rating-validator': 'Rating PGFN',
  properties: 'Imóveis',
  'fiscal-files': 'Arquivos Fiscais',
  clients: 'Clientes',
  'judicial-processes': 'Processos Judiciais',
  'distribuicao-lucros': 'Distribuição Lucros',
  'simulador-distribuicao-lucros-lei-15270': 'Dist. Lucros Lei 15270',
  editais: 'Editais',
  system: 'Sistema',
  auth: 'Auth',
  login: 'Login',
  landing: 'Landing',
  documentacao: 'Documentação',
  'meu-plano': 'Meu Plano',
  'gestao-assinatura': 'Gestão Assinatura',
  users: 'Usuários',
  companies: 'Empresa',
  billing: 'Billing',
  subscriptions: 'Assinaturas',
};

const TEMP_LABELS = {
  hot: 'Quente',
  warm: 'Morno',
  cold: 'Frio',
  none: 'Sem uso',
};

const SQL = `
WITH company_base AS (
  SELECT
    c.id,
    c.name,
    COALESCE(NULLIF(TRIM(c.contact_name), ''), c.name) AS contato_nome,
    COALESCE(NULLIF(TRIM(c.contact_email), ''), NULLIF(TRIM(c.email), ''), admin.email) AS contato_email,
    COALESCE(NULLIF(TRIM(c.contact_phone), ''), NULLIF(TRIM(c.phone), '')) AS contato_telefone,
    c.email AS empresa_email,
    c.phone AS empresa_telefone,
    c.cnpj,
    c.cpf,
    c.created_at,
    s.status AS assinatura_status,
    p.name AS plano
  FROM public.companies c
  LEFT JOIN public.subscriptions s ON s.company_id = c.id
  LEFT JOIN public.plans p ON p.id = s.plan_id
  LEFT JOIN LATERAL (
    SELECT u.email, u.name
    FROM public.users u
    WHERE u.tenant_id = c.id AND u.role = 'admin'
    ORDER BY u.created_at ASC
    LIMIT 1
  ) admin ON true
),
usage_period AS (
  SELECT company_id, module_key, COUNT(*)::int AS qtd
  FROM public.module_usage_logs
  WHERE company_id IS NOT NULL
    AND created_at >= NOW() - ($1::int * INTERVAL '1 day')
  GROUP BY company_id, module_key
),
usage_all AS (
  SELECT company_id, module_key, COUNT(*)::int AS qtd
  FROM public.module_usage_logs
  WHERE company_id IS NOT NULL
  GROUP BY company_id, module_key
),
totals_period AS (
  SELECT company_id, SUM(qtd)::int AS total FROM usage_period GROUP BY company_id
),
totals_all AS (
  SELECT company_id, SUM(qtd)::int AS total FROM usage_all GROUP BY company_id
),
scored AS (
  SELECT
    b.*,
    COALESCE(tp.total, 0) AS total_uso_periodo,
    COALESCE(ta.total, 0) AS total_uso_historico
  FROM company_base b
  LEFT JOIN totals_period tp ON tp.company_id = b.id
  LEFT JOIN totals_all ta ON ta.company_id = b.id
  WHERE COALESCE(b.assinatura_status, 'active') IN ('active', 'trialing')
),
avg_active AS (
  SELECT AVG(total_uso_periodo) AS media FROM scored WHERE total_uso_periodo > 0
)
SELECT
  s.id,
  s.name,
  s.contato_nome,
  s.contato_email,
  s.contato_telefone,
  s.empresa_email,
  s.empresa_telefone,
  s.cnpj,
  s.cpf,
  s.plano,
  s.assinatura_status,
  s.created_at,
  s.total_uso_periodo,
  s.total_uso_historico,
  CASE
    WHEN s.total_uso_periodo <= 0 THEN 'none'
    WHEN (SELECT COUNT(*) FROM scored WHERE total_uso_periodo > 0) <= 0 THEN 'warm'
    WHEN s.total_uso_periodo > (SELECT media FROM avg_active) THEN 'hot'
    WHEN s.total_uso_periodo < (SELECT media FROM avg_active) THEN 'cold'
    ELSE 'warm'
  END AS temperatura,
  (
    SELECT jsonb_object_agg(module_key, qtd)
    FROM usage_period up WHERE up.company_id = s.id
  ) AS modulos_periodo,
  (
    SELECT jsonb_object_agg(module_key, qtd)
    FROM usage_all ua WHERE ua.company_id = s.id
  ) AS modulos_historico
FROM scored s
ORDER BY s.total_uso_periodo DESC, s.total_uso_historico DESC, s.name ASC;
`;

function formatModulesSummary(modulesObj) {
  if (!modulesObj || typeof modulesObj !== 'object') return '';
  return Object.entries(modulesObj)
    .sort((a, b) => b[1] - a[1])
    .map(([key, qtd]) => `${MODULE_LABELS[key] || key} (${qtd}x)`)
    .join(', ');
}

function moduleColumns(modulesObj, prefix) {
  const cols = {};
  if (!modulesObj || typeof modulesObj !== 'object') return cols;
  for (const [key, qtd] of Object.entries(modulesObj)) {
    const label = MODULE_LABELS[key] || key;
    cols[`${prefix}${label}`] = qtd;
  }
  return cols;
}

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost')
      ? false
      : { rejectUnauthorized: false },
  });

  try {
    const { rows } = await pool.query(SQL, [periodDays]);

    const withUsage = rows.filter((r) => r.total_uso_periodo > 0);
    const avgUsage =
      withUsage.length > 0
        ? Math.round((withUsage.reduce((s, r) => s + r.total_uso_periodo, 0) / withUsage.length) * 10) / 10
        : 0;

    const counts = { hot: 0, warm: 0, cold: 0, none: 0 };
    for (const r of rows) counts[r.temperatura] += 1;

    const resumo = [
      { Campo: 'Gerado em', Valor: new Date().toLocaleString('pt-BR') },
      { Campo: 'Janela de uso (dias)', Valor: periodDays },
      { Campo: 'Total clientes plataforma (ativos)', Valor: rows.length },
      { Campo: 'Com uso no período', Valor: withUsage.length },
      { Campo: 'Sem uso no período', Valor: rows.length - withUsage.length },
      { Campo: 'Média eventos (quem usou no período)', Valor: avgUsage },
      { Campo: 'Quente', Valor: counts.hot },
      { Campo: 'Morno', Valor: counts.warm },
      { Campo: 'Frio', Valor: counts.cold },
      { Campo: 'Sem uso', Valor: counts.none },
    ];

    const clientes = rows.map((r) => {
      const modPeriodo = r.modulos_periodo || {};
      const modHistorico = r.modulos_historico || {};
      return {
        Temperatura: TEMP_LABELS[r.temperatura] || r.temperatura,
        [`Total uso (${periodDays}d)`]: r.total_uso_periodo,
        'Total uso (histórico)': r.total_uso_historico,
        Escritório: r.name,
        'Contato nome': r.contato_nome,
        'Contato e-mail': r.contato_email,
        'Contato telefone': r.contato_telefone || '',
        'E-mail empresa': r.empresa_email || '',
        'Telefone empresa': r.empresa_telefone || '',
        CNPJ: r.cnpj || '',
        CPF: r.cpf || '',
        Plano: r.plano || '',
        Assinatura: r.assinatura_status || '',
        Cadastro: r.created_at ? new Date(r.created_at).toLocaleString('pt-BR') : '',
        [`Módulos (${periodDays}d)`]: formatModulesSummary(modPeriodo),
        'Módulos (histórico)': formatModulesSummary(modHistorico),
        ...moduleColumns(modPeriodo, `[${periodDays}d] `),
        ...moduleColumns(modHistorico, '[Hist] '),
        ID: r.id,
      };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumo), 'Resumo');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(clientes), 'Clientes Plataforma');

    const exportsDir = resolve(root, 'exports');
    mkdirSync(exportsDir, { recursive: true });
    const date = new Date().toISOString().slice(0, 10);
    const outPath = resolve(exportsDir, `clientes-plataforma-${date}.xlsx`);
    XLSX.writeFile(wb, outPath);

    console.log(JSON.stringify({ ok: true, path: outPath, rows: rows.length, periodDays }, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
