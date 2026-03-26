import { config } from 'dotenv';
import { resolve } from 'path';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { getClient } from '../db/client';
import { listTenantSchemas } from '../db/schema-manager';
import { inspectSpedBuffer } from '../modules/fiscal-files/sped-layout-parser';

config({ path: resolve(process.cwd(), '../../.env') });

type TargetKind = 'receita' | 'deducao' | 'retencao';

interface TraceEntry {
  conta_descricao?: string;
  valor?: number;
  campo_destino?: string;
  classificacao_confianca?: number;
}

interface AggregatedDescription {
  count: number;
  totalValue: number;
  confidenceSum: number;
}

interface CandidateRule {
  pattern: string;
  targetKind: TargetKind;
  targetField: string;
  confidenceOverride: number;
  notes: string;
}

const DOCS_SPED_DIR = resolve(process.cwd(), '../../docs/SPED');

const STOPWORDS = new Set([
  'DE',
  'DA',
  'DO',
  'DAS',
  'DOS',
  'E',
  'EM',
  'NO',
  'NA',
  'NOS',
  'NAS',
  'PARA',
  'COM',
  'SEM',
  'OUTRAS',
  'OUTROS',
  'OUTRA',
  'OUTRO',
  'RECEITA',
  'RECEITAS',
  'DESPESA',
  'DESPESAS',
  'RESULTADO',
  'VALOR',
  'CONTABIL',
  'CONTA',
  'CONTAS',
]);

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

async function listTxtFilesRecursively(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listTxtFilesRecursively(full)));
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.txt')) {
      files.push(full);
    }
  }
  return files;
}

function parseTarget(campoDestino: string): { targetKind: TargetKind; targetField: string } | null {
  const m = campoDestino.match(
    /^(trimestres\[n\]|deducoes_trimestrais\[n\]|retencoes_trimestrais\[n\])\.([a-z_]+)$/i
  );
  if (!m) return null;
  const origin = m[1];
  const targetField = m[2];
  if (origin === 'trimestres[n]') return { targetKind: 'receita', targetField };
  if (origin === 'deducoes_trimestrais[n]') return { targetKind: 'deducao', targetField };
  return { targetKind: 'retencao', targetField };
}

function choosePatternFromDescription(description: string, targetKind: TargetKind, targetField: string): string {
  const d = normalizeText(description);
  if (targetKind === 'deducao' && targetField === 'icms_destacado' && d.includes('ICMS')) {
    return 'ICMS';
  }
  if (targetKind === 'deducao' && targetField === 'pis_cofins_zero') {
    if (d.includes('PIS') && d.includes('COFINS')) return 'PIS COFINS';
    if (d.includes('PIS')) return 'PIS';
    if (d.includes('COFINS')) return 'COFINS';
  }
  if (targetKind === 'retencao' && targetField === 'irrf' && d.includes('IRRF')) {
    return 'IRRF';
  }
  if (targetKind === 'retencao' && targetField === 'orgaos_publicos') {
    if (d.includes('ORGAO PUBLICO')) return 'ORGAO PUBLICO';
    if (d.includes('RETENCAO')) return 'RETENCAO';
  }
  if (targetKind === 'receita' && targetField === 'servicos_hospitalares') {
    if (d.includes('HOSPITAL')) return 'SERVIC HOSPITAL';
    if (d.includes('CLINICA')) return 'SERVIC CLINICA';
    if (d.includes('SAUDE')) return 'SERVIC SAUDE';
  }
  if (targetKind === 'receita' && targetField === 'servicos_favorecida') {
    if (d.includes('FAVOREC')) return 'SERVIC FAVOREC';
    if (d.includes('INCENTIV')) return 'SERVIC INCENTIV';
  }
  if (targetKind === 'receita' && targetField === 'servicos' && d.includes('SERVIC')) {
    return 'SERVIC';
  }
  if (targetKind === 'receita' && targetField === 'produtos_mercadorias') {
    if (d.includes('MERCADOR')) return 'MERCADORIA';
    if (d.includes('PRODUT')) return 'PRODUT';
    if (d.includes('VENDA')) return 'VENDA';
  }

  const tokens = d
    .split(/[^A-Z0-9]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t) && !/^\d+$/.test(t));

  if (tokens.length === 0) return d.slice(0, 80) || 'PADRAO';
  if (tokens.length === 1) return tokens[0];
  return `${tokens[0]} ${tokens[1]}`.slice(0, 80);
}

function buildCandidateRules(aggregated: Map<string, Map<string, AggregatedDescription>>): CandidateRule[] {
  const rules: CandidateRule[] = [];
  const dedupe = new Set<string>();

  for (const [targetKey, descriptions] of aggregated.entries()) {
    const [targetKind, targetField] = targetKey.split(':') as [TargetKind, string];
    const ranked = Array.from(descriptions.entries())
      .map(([description, data]) => ({
        description,
        score: data.totalValue + data.count * 1000,
        data,
      }))
      .sort((a, b) => b.score - a.score);

    const top = ranked.slice(0, 4);
    for (const entry of top) {
      const pattern = choosePatternFromDescription(entry.description, targetKind, targetField);
      const confidenceBase = entry.data.confidenceSum / Math.max(entry.data.count, 1);
      const confidenceOverride = round2(Math.max(0.65, Math.min(0.95, confidenceBase)));
      const dedupeKey = `${targetKind}:${targetField}:${pattern}`;
      if (dedupe.has(dedupeKey)) continue;
      dedupe.add(dedupeKey);
      rules.push({
        pattern,
        targetKind,
        targetField,
        confidenceOverride,
        notes: 'Regra global gerada automaticamente a partir dos SPEDs da pasta docs/SPED',
      });
    }
  }

  return rules;
}

async function main() {
  console.log('🔎 Lendo arquivos SPED em docs/SPED...');
  const files = await listTxtFilesRecursively(DOCS_SPED_DIR);
  if (files.length === 0) {
    console.log('⚠️ Nenhum .txt encontrado em docs/SPED.');
    return;
  }

  const aggregated = new Map<string, Map<string, AggregatedDescription>>();
  let tracesProcessed = 0;

  for (const file of files) {
    const buffer = await readFile(file);
    const inspection = inspectSpedBuffer(buffer);
    const trace = (inspection.module_prefill?.simulador_in2306 as any)?.source_trace as TraceEntry[] | undefined;
    if (!Array.isArray(trace)) continue;
    for (const item of trace) {
      const target = parseTarget(item.campo_destino || '');
      if (!target) continue;
      const description = normalizeText(item.conta_descricao || '');
      if (!description) continue;
      const key = `${target.targetKind}:${target.targetField}`;
      if (!aggregated.has(key)) aggregated.set(key, new Map());
      const byDescription = aggregated.get(key)!;
      const current = byDescription.get(description) || {
        count: 0,
        totalValue: 0,
        confidenceSum: 0,
      };
      current.count += 1;
      current.totalValue += Math.abs(Number(item.valor || 0));
      current.confidenceSum += Number(item.classificacao_confianca || 0.7);
      byDescription.set(description, current);
      tracesProcessed += 1;
    }
  }

  console.log(`📄 Arquivos lidos: ${files.length}`);
  console.log(`🧩 Linhas de trace analisadas: ${tracesProcessed}`);

  const rules = buildCandidateRules(aggregated);
  if (rules.length === 0) {
    console.log('⚠️ Nenhuma regra candidata foi gerada a partir dos SPEDs.');
    return;
  }

  const schemas = await listTenantSchemas();
  if (schemas.length === 0) {
    console.log('⚠️ Nenhum schema tenant encontrado para inserir regras.');
    return;
  }

  console.log(`🛠️ Regras candidatas geradas: ${rules.length}`);
  console.log(`🏢 Aplicando em ${schemas.length} tenant(s)...`);

  const client = await getClient();
  let insertedTotal = 0;
  try {
    for (const schemaName of schemas) {
      if (!/^tenant_[a-z0-9_]+$/i.test(schemaName)) {
        throw new Error(`Schema inválido detectado: ${schemaName}`);
      }

      let insertedForSchema = 0;
      for (const rule of rules) {
        const result = await client.query(
          `INSERT INTO "${schemaName}".fiscal_sped_calibrator_rules
            (client_id, pattern, target_module, target_kind, target_field, confidence_override, active, notes)
           SELECT NULL, $1::varchar, 'simulador_in2306', $2::varchar, $3::varchar, $4::numeric, TRUE, $5::text
           WHERE NOT EXISTS (
             SELECT 1
             FROM "${schemaName}".fiscal_sped_calibrator_rules
             WHERE client_id IS NULL
               AND target_module = 'simulador_in2306'
               AND target_kind = $2::varchar
               AND target_field = $3::varchar
               AND UPPER(pattern::text) = UPPER($1::text)
           )`,
          [
            rule.pattern,
            rule.targetKind,
            rule.targetField,
            rule.confidenceOverride,
            rule.notes,
          ]
        );
        insertedForSchema += result.rowCount || 0;
      }
      insertedTotal += insertedForSchema;
      console.log(`  ✅ ${schemaName}: ${insertedForSchema} regra(s) inserida(s)`);
    }
  } finally {
    client.release();
  }

  console.log('✅ Seed de regras globais do calibrador finalizado.');
  console.log(`📌 Total inserido: ${insertedTotal}`);
  console.log('\nRegras geradas:');
  for (const rule of rules) {
    console.log(
      `- [${rule.targetKind}.${rule.targetField}] pattern="${rule.pattern}" confidence=${rule.confidenceOverride}`
    );
  }
}

main().catch((error) => {
  console.error('❌ Falha ao gerar/seedar regras do calibrador:', error);
  process.exit(1);
});

