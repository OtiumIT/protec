type SpedDocType = 'ecd' | 'ecf' | 'unknown';

export interface SpedHeaderInfo {
  type: SpedDocType;
  layout_code?: string;
  period_start?: string;
  period_end?: string;
  company_name?: string;
  company_cnpj?: string;
}

export interface SpedBalanceSheetSummary {
  ativo_total?: number;
  ativo_circulante?: number;
  ativo_nao_circulante?: number;
  passivo_total?: number;
  passivo_circulante?: number;
  passivo_nao_circulante?: number;
  patrimonio_liquido?: number;
}

export interface SpedDreSummary {
  receita_bruta?: number;
  deducoes?: number;
  receita_liquida?: number;
  lucro_bruto?: number;
  despesas_operacionais?: number;
  resultado_periodo?: number;
}

export interface SpedInspectionResult {
  header: SpedHeaderInfo;
  cadastro?: {
    cnae?: string;
    email?: string;
    uf?: string;
    municipio_ibge?: string;
  };
  signatories: Array<{ nome?: string; cpf?: string; qualificacao?: string }>;
  socios_remuneracao: Array<{
    cpf_cnpj?: string;
    nome?: string;
    qualificacao?: string;
    participacao_percentual?: number;
    valores_declarados: number[];
  }>;
  register_counts: Record<string, number>;
  ecf_tax_signals?: {
    trimestres: Array<{
      inicio?: string;
      fim?: string;
      receitas_possiveis: number;
      despesas_possiveis: number;
      resultado_aproximado: number;
      linhas_analisadas: number;
    }>;
    receita_bruta_anual_estimada: number;
  };
  prefill_catalog: Array<{
    modulo: 'rating_validator' | 'simulador_in2306' | 'irpf_alta_renda';
    campo_destino: string;
    origem_sped: string;
    transformacao: string;
    confianca: number;
  }>;
  balance_sheet_lines: Array<{ codigo: string; descricao: string; valor_final: number }>;
  dre_lines: Array<{ codigo: string; descricao: string; valor_final: number }>;
  balance_sheet?: SpedBalanceSheetSummary;
  dre?: SpedDreSummary;
  module_prefill: {
    rating_validator?: Record<string, any>;
    simulador_in2306?: Record<string, any>;
    irpf_alta_renda?: Record<string, any>;
  };
}

export interface SpedCalibratorRule {
  id?: string;
  client_id?: string | null;
  pattern: string;
  target_module: 'simulador_in2306';
  target_kind: 'receita' | 'deducao' | 'retencao';
  target_field:
    | In2306RevenueField
    | In2306DeductionField
    | In2306RetentionField;
  confidence_override?: number | null;
  active?: boolean;
}

type In2306RevenueField =
  | 'produtos_mercadorias'
  | 'servicos'
  | 'servicos_favorecida'
  | 'servicos_hospitalares'
  | 'demais_receitas';
type In2306DeductionField = 'pis_cofins_zero' | 'icms_destacado';
type In2306RetentionField = 'irrf' | 'orgaos_publicos';

type In2306Classification =
  | { kind: 'receita'; field: In2306RevenueField; confidence: number }
  | { kind: 'deducao'; field: In2306DeductionField; confidence: number }
  | { kind: 'retencao'; field: In2306RetentionField; confidence: number }
  | { kind: 'none' };

function normalizeDigits(value: string | undefined): string {
  return (value || '').replace(/\D/g, '');
}

function parseDateDDMMYYYY(value: string | undefined): string | undefined {
  if (!value || !/^\d{8}$/.test(value)) return undefined;
  const dd = value.slice(0, 2);
  const mm = value.slice(2, 4);
  const yyyy = value.slice(4, 8);
  return `${yyyy}-${mm}-${dd}`;
}

function parseSpedNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const negative = /^\(.*\)$/.test(trimmed);
  const noParens = trimmed.replace(/[()]/g, '');
  const normalized = noParens.replace(/\./g, '').replace(',', '.');
  const num = Number(normalized);
  if (!Number.isFinite(num)) return undefined;
  return negative ? -num : num;
}

function normalizeText(value: string | undefined): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

function decodeBuffer(buffer: Buffer): string {
  const utf8 = buffer.toString('utf8');
  const replacementRatio = (utf8.match(/\uFFFD/g) || []).length / Math.max(utf8.length, 1);
  if (replacementRatio > 0.02) {
    return buffer.toString('latin1');
  }
  return utf8;
}

function abs2(value: number): number {
  return Math.round(Math.abs(value) * 100) / 100;
}

function isRevenueDescription(description: string): boolean {
  return (
    description.includes('RECEITA') ||
    description.includes('VENDA') ||
    description.includes('FATURAMENTO')
  );
}

function isExpenseDescription(description: string): boolean {
  return (
    description.includes('DESPESA') ||
    description.includes('CUSTO') ||
    description.includes('IMPOST') ||
    description.includes('TRIBUT') ||
    description.includes('ICMS') ||
    description.includes('COFINS') ||
    description.includes('PIS')
  );
}

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((k) => text.includes(k));
}

function classifyIn2306FromAccountDescription(description: string): In2306Classification {
  const d = normalizeText(description);
  if (!d) return { kind: 'none' };

  if (
    includesAny(d, ['RETENCAO', 'RETIDO', 'IRRF']) &&
    includesAny(d, ['IRRF', 'IMP RENDA'])
  ) {
    return { kind: 'retencao', field: 'irrf', confidence: 0.8 };
  }

  if (
    includesAny(d, ['RETENCAO', 'RETIDO', 'PCC', 'CSRF', 'ORGAO PUBLICO', 'ORGAOS PUBLICOS']) ||
    includesAny(d, ['PIS RETIDO', 'COFINS RETIDO', 'CSLL RETIDA'])
  ) {
    return { kind: 'retencao', field: 'orgaos_publicos', confidence: 0.7 };
  }

  if (includesAny(d, ['ICMS', 'ICMS ST'])) {
    return { kind: 'deducao', field: 'icms_destacado', confidence: 0.72 };
  }

  if (includesAny(d, ['PIS', 'COFINS'])) {
    return { kind: 'deducao', field: 'pis_cofins_zero', confidence: 0.68 };
  }

  if (
    includesAny(d, ['HOSPITAL', 'CLINICA', 'SAUDE', 'LABORATORIO']) &&
    includesAny(d, ['RECEITA', 'SERVIC', 'FATURAMENTO'])
  ) {
    return { kind: 'receita', field: 'servicos_hospitalares', confidence: 0.75 };
  }

  if (
    includesAny(d, ['SERVIC']) &&
    includesAny(d, ['FAVORECID', 'REDUZID', 'INCENTIV', 'BENEFICIO'])
  ) {
    return { kind: 'receita', field: 'servicos_favorecida', confidence: 0.72 };
  }

  if (
    includesAny(d, ['SERVIC', 'PRESTACAO', 'HONORARIO', 'CONSULTORIA', 'LOCACAO']) &&
    !includesAny(d, ['PRODUT', 'MERCADORIA', 'VENDA DE PRODUTO'])
  ) {
    return { kind: 'receita', field: 'servicos', confidence: 0.74 };
  }

  if (
    includesAny(d, ['PRODUT', 'MERCADORIA', 'INDUSTRIALIZACAO', 'VENDA', 'FATURAMENTO']) &&
    !includesAny(d, ['SERVIC'])
  ) {
    return { kind: 'receita', field: 'produtos_mercadorias', confidence: 0.78 };
  }

  if (isRevenueDescription(d)) {
    return { kind: 'receita', field: 'demais_receitas', confidence: 0.55 };
  }

  return { kind: 'none' };
}

function classifyIn2306FromCalibratorRules(
  description: string,
  rules: SpedCalibratorRule[]
): In2306Classification {
  const d = normalizeText(description);
  if (!d) return { kind: 'none' };

  for (const rule of rules) {
    if (rule.active === false) continue;
    const pattern = normalizeText(rule.pattern || '');
    if (!pattern) continue;
    if (!d.includes(pattern)) continue;

    const confidence = Math.max(0, Math.min(1, rule.confidence_override ?? 0.92));
    if (rule.target_kind === 'receita') {
      return {
        kind: 'receita',
        field: rule.target_field as In2306RevenueField,
        confidence,
      };
    }
    if (rule.target_kind === 'deducao') {
      return {
        kind: 'deducao',
        field: rule.target_field as In2306DeductionField,
        confidence,
      };
    }
    return {
      kind: 'retencao',
      field: rule.target_field as In2306RetentionField,
      confidence,
    };
  }

  return { kind: 'none' };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseLine(rawLine: string): { reg: string; values: string[] } | null {
  const line = rawLine.trim();
  if (!line.startsWith('|')) return null;
  const parts = line.split('|');
  if (parts.length < 3) return null;
  const reg = parts[1]?.trim();
  if (!reg) return null;
  const values = parts.slice(2, parts.length - 1);
  return { reg, values };
}

function mapHeaderFrom0000(values: string[]): SpedHeaderInfo {
  const marker = (values[0] || '').toUpperCase();
  if (marker === 'LECD') {
    return {
      type: 'ecd',
      layout_code: marker,
      period_start: parseDateDDMMYYYY(values[1]),
      period_end: parseDateDDMMYYYY(values[2]),
      company_name: values[3] || undefined,
      company_cnpj: normalizeDigits(values[4]) || undefined,
    };
  }

  if (marker === 'LECF') {
    const maybeDateStart = values.find((v) => /^\d{8}$/.test(v));
    const maybeDateEnd = values.slice(values.indexOf(maybeDateStart || '') + 1).find((v) => /^\d{8}$/.test(v));
    return {
      type: 'ecf',
      layout_code: marker,
      period_start: parseDateDDMMYYYY(maybeDateStart),
      period_end: parseDateDDMMYYYY(maybeDateEnd),
      company_cnpj: normalizeDigits(values[2]) || undefined,
      company_name: values[3] || undefined,
    };
  }

  return {
    type: 'unknown',
    layout_code: marker || undefined,
  };
}

export function inspectSpedBuffer(
  buffer: Buffer,
  options?: {
    calibratorRules?: SpedCalibratorRule[];
  }
): SpedInspectionResult {
  const text = decodeBuffer(buffer);
  const lines = text.split(/\r?\n/);

  let header: SpedHeaderInfo = { type: 'unknown' };
  const registerCounts: Record<string, number> = {};
  const signatories: Array<{ nome?: string; cpf?: string; qualificacao?: string }> = [];
  const sociosRemuneracao: Array<{
    cpf_cnpj?: string;
    nome?: string;
    qualificacao?: string;
    participacao_percentual?: number;
    valores_declarados: number[];
  }> = [];
  const balanceLines: Array<{ codigo: string; descricao: string; valor_final: number }> = [];
  const dreLines: Array<{ codigo: string; descricao: string; valor_final: number }> = [];
  const contaDescricaoByCodigo: Record<string, string> = {};
  let currentQuarter: { inicio?: string; fim?: string; key: string } | null = null;
  const ecfQuarterSignalsMap: Record<
    string,
    {
      inicio?: string;
      fim?: string;
      receitas_possiveis: number;
      despesas_possiveis: number;
      linhas_analisadas: number;
      linhas_classificadas: number;
      in2306: {
        receitas: Record<In2306RevenueField, number>;
        deducoes: Record<In2306DeductionField, number>;
        retencoes: Record<In2306RetentionField, number>;
        source_trace: Array<{
          conta_codigo: string;
          conta_descricao: string;
          valor: number;
          campo_destino: string;
          classificacao_confianca: number;
        }>;
      };
    }
  > = {};
  const balance: SpedBalanceSheetSummary = {};
  const dre: SpedDreSummary = {};
  let cadastro: SpedInspectionResult['cadastro'] | undefined;
  const calibratorRules = (options?.calibratorRules || []).filter(
    (rule) => rule.target_module === 'simulador_in2306'
  );

  for (const rawLine of lines) {
    const parsed = parseLine(rawLine);
    if (!parsed) continue;

    registerCounts[parsed.reg] = (registerCounts[parsed.reg] || 0) + 1;

    if (parsed.reg === '0000') {
      header = mapHeaderFrom0000(parsed.values);
      continue;
    }

    if (parsed.reg === '0930') {
      signatories.push({
        nome: parsed.values[0] || undefined,
        cpf: normalizeDigits(parsed.values[1]) || undefined,
        qualificacao: parsed.values[2] || undefined,
      });
      continue;
    }

    if (parsed.reg === '0030') {
      cadastro = {
        cnae: parsed.values[0] || undefined,
        uf: parsed.values[7] || undefined,
        municipio_ibge: parsed.values[8] || undefined,
        email: parsed.values[11] || undefined,
      };
      continue;
    }

    if (parsed.reg === 'J100') {
      const codigo = parsed.values[0] || '';
      const descricao = normalizeText(parsed.values[5]);
      const valorFinal = parseSpedNumber(parsed.values[8]);
      if (valorFinal === undefined) continue;
      balanceLines.push({
        codigo,
        descricao: parsed.values[5] || '',
        valor_final: valorFinal,
      });

      if (descricao === 'ATIVO') balance.ativo_total = valorFinal;
      else if (descricao === 'ATIVO CIRCULANTE') balance.ativo_circulante = valorFinal;
      else if (descricao === 'ATIVO NAO-CIRCULANTE' || descricao === 'ATIVO NAO CIRCULANTE') {
        balance.ativo_nao_circulante = valorFinal;
      } else if (descricao === 'PASSIVO') balance.passivo_total = valorFinal;
      else if (descricao === 'PASSIVO CIRCULANTE') balance.passivo_circulante = valorFinal;
      else if (
        descricao === 'PASSIVO NAO-CIRCULANTE' ||
        descricao === 'PASSIVO NAO CIRCULANTE'
      ) {
        balance.passivo_nao_circulante = valorFinal;
      } else if (descricao === 'PATRIMONIO LIQUIDO') {
        balance.patrimonio_liquido = valorFinal;
      }
      continue;
    }

    if (parsed.reg === 'C050') {
      const codigoConta = parsed.values[4] || '';
      const descricaoConta = parsed.values[7] || parsed.values[6] || '';
      if (codigoConta && descricaoConta) {
        contaDescricaoByCodigo[codigoConta] = descricaoConta;
      }
      continue;
    }

    if (parsed.reg === 'K030') {
      const inicio = parseDateDDMMYYYY(parsed.values[0]);
      const fim = parseDateDDMMYYYY(parsed.values[1]);
      const key = `${inicio || ''}_${fim || ''}`;
      currentQuarter = { inicio, fim, key };
      if (!ecfQuarterSignalsMap[key]) {
        ecfQuarterSignalsMap[key] = {
          inicio,
          fim,
          receitas_possiveis: 0,
          despesas_possiveis: 0,
          linhas_analisadas: 0,
          linhas_classificadas: 0,
          in2306: {
            receitas: {
              produtos_mercadorias: 0,
              servicos: 0,
              servicos_favorecida: 0,
              servicos_hospitalares: 0,
              demais_receitas: 0,
            },
            deducoes: {
              pis_cofins_zero: 0,
              icms_destacado: 0,
            },
            retencoes: {
              irrf: 0,
              orgaos_publicos: 0,
            },
            source_trace: [],
          },
        };
      }
      continue;
    }

    if (parsed.reg === 'K355' && currentQuarter) {
      const codigoConta = parsed.values[0] || '';
      const valor = parseSpedNumber(parsed.values[2]);
      if (valor === undefined) continue;

      const descOriginal = contaDescricaoByCodigo[codigoConta] || '';
      const descNorm = normalizeText(descOriginal);
      const quarter = ecfQuarterSignalsMap[currentQuarter.key];
      quarter.linhas_analisadas += 1;

      if (descNorm && isRevenueDescription(descNorm)) {
        quarter.receitas_possiveis = Math.round((quarter.receitas_possiveis + abs2(valor)) * 100) / 100;
      } else if (descNorm && isExpenseDescription(descNorm)) {
        quarter.despesas_possiveis = Math.round((quarter.despesas_possiveis + abs2(valor)) * 100) / 100;
      }

      const classificationFromRule = classifyIn2306FromCalibratorRules(descNorm, calibratorRules);
      const classification =
        classificationFromRule.kind !== 'none'
          ? classificationFromRule
          : classifyIn2306FromAccountDescription(descNorm);
      const magnitude = abs2(valor);
      if (classification.kind === 'receita') {
        quarter.in2306.receitas[classification.field] = round2(
          quarter.in2306.receitas[classification.field] + magnitude
        );
        quarter.linhas_classificadas += 1;
        quarter.in2306.source_trace.push({
          conta_codigo: codigoConta,
          conta_descricao: descOriginal || '',
          valor: magnitude,
          campo_destino: `trimestres[n].${classification.field}`,
          classificacao_confianca: classification.confidence,
        });
      } else if (classification.kind === 'deducao') {
        quarter.in2306.deducoes[classification.field] = round2(
          quarter.in2306.deducoes[classification.field] + magnitude
        );
        quarter.linhas_classificadas += 1;
        quarter.in2306.source_trace.push({
          conta_codigo: codigoConta,
          conta_descricao: descOriginal || '',
          valor: magnitude,
          campo_destino: `deducoes_trimestrais[n].${classification.field}`,
          classificacao_confianca: classification.confidence,
        });
      } else if (classification.kind === 'retencao') {
        quarter.in2306.retencoes[classification.field] = round2(
          quarter.in2306.retencoes[classification.field] + magnitude
        );
        quarter.linhas_classificadas += 1;
        quarter.in2306.source_trace.push({
          conta_codigo: codigoConta,
          conta_descricao: descOriginal || '',
          valor: magnitude,
          campo_destino: `retencoes_trimestrais[n].${classification.field}`,
          classificacao_confianca: classification.confidence,
        });
      }
      continue;
    }

    if (parsed.reg === 'J150') {
      const codigo = parsed.values[1] || parsed.values[0] || '';
      const descricao = normalizeText(parsed.values[5]);
      const valorFinal = parseSpedNumber(parsed.values[8]);
      if (valorFinal === undefined) continue;
      dreLines.push({
        codigo,
        descricao: parsed.values[5] || '',
        valor_final: valorFinal,
      });

      if (descricao.includes('RECEITA BRUTA')) dre.receita_bruta = valorFinal;
      else if (descricao.includes('DEDU')) dre.deducoes = valorFinal;
      else if (descricao.includes('RECEITA LIQUIDA')) dre.receita_liquida = valorFinal;
      else if (descricao.includes('LUCRO BRUTO')) dre.lucro_bruto = valorFinal;
      else if (
        descricao.includes('DESPESAS OPERACIONAIS') ||
        descricao === 'DESPESAS OPERACIONAIS'
      ) {
        dre.despesas_operacionais = valorFinal;
      } else if (
        descricao.includes('RESULTADO DO PERIODO') ||
        descricao.includes('RESULTADO DO EXERCICIO') ||
        descricao.includes('LUCRO LIQUIDO')
      ) {
        dre.resultado_periodo = valorFinal;
      }
      continue;
    }

    if (parsed.reg === 'Y600') {
      const cpfCnpj = normalizeDigits(parsed.values[4]) || undefined;
      const nome = parsed.values[5] || undefined;
      const qualificacao = parsed.values[6] || undefined;
      const participacao = parseSpedNumber(parsed.values[7]);

      const valoresDeclarados = parsed.values
        .map((v) => parseSpedNumber(v))
        .filter((v): v is number => typeof v === 'number')
        .filter((v) => Math.abs(v) > 0);

      sociosRemuneracao.push({
        cpf_cnpj: cpfCnpj,
        nome,
        qualificacao,
        participacao_percentual: participacao,
        valores_declarados: valoresDeclarados.slice(-5),
      });
      continue;
    }
  }

  const hasBalance = Object.keys(balance).length > 0;
  const hasDre = Object.keys(dre).length > 0;
  const ecfTrimestres = Object.values(ecfQuarterSignalsMap)
    .map((q) => ({
      inicio: q.inicio,
      fim: q.fim,
      receitas_possiveis: Math.round(q.receitas_possiveis * 100) / 100,
      despesas_possiveis: Math.round(q.despesas_possiveis * 100) / 100,
      resultado_aproximado: Math.round((q.receitas_possiveis - q.despesas_possiveis) * 100) / 100,
      linhas_analisadas: q.linhas_analisadas,
    }))
    .sort((a, b) => String(a.inicio || '').localeCompare(String(b.inicio || '')));
  const ecfReceitaAnualEstimada = Math.round(
    ecfTrimestres.reduce((sum, t) => sum + t.receitas_possiveis, 0) * 100
  ) / 100;
  const hasEcfTaxSignals = ecfTrimestres.length > 0;
  const ecfQuarterRows = Object.values(ecfQuarterSignalsMap).sort((a, b) =>
    String(a.inicio || '').localeCompare(String(b.inicio || ''))
  );
  const totalAnalyzed = ecfQuarterRows.reduce((sum, q) => sum + q.linhas_analisadas, 0);
  const totalClassified = ecfQuarterRows.reduce((sum, q) => sum + q.linhas_classificadas, 0);
  const classificationCoverage = totalAnalyzed > 0 ? totalClassified / totalAnalyzed : 0;
  const ecfIn2306Confidence = round2(Math.min(0.93, 0.4 + classificationCoverage * 0.5));

  const ratingPrefill =
    hasBalance || hasDre
      ? {
          competencia: header.period_end?.slice(0, 7),
          ativo_circulante_total: balance.ativo_circulante,
          passivo_circulante_total: balance.passivo_circulante,
          passivo_nao_circulante_total: balance.passivo_nao_circulante,
          patrimonio_liquido_total: balance.patrimonio_liquido,
          dre: hasDre
            ? {
                receita_bruta: dre.receita_bruta,
                receita_liquida: dre.receita_liquida,
                deducoes_vendas: dre.deducoes,
                lucro_bruto: dre.lucro_bruto,
                despesas_operacionais: dre.despesas_operacionais,
                resultado_periodo: dre.resultado_periodo,
              }
            : undefined,
        }
      : undefined;

  const in2306Prefill =
    hasEcfTaxSignals
      ? {
          schema_target: 'SimulateTributarioIN2306InputSchema',
          ano: Number((header.period_end || '').slice(0, 4)) || undefined,
          receita_bruta_anual_estimada: ecfReceitaAnualEstimada,
          trimestres: ecfQuarterRows.slice(0, 4).map((q) => ({
            ...q.in2306.receitas,
          })),
          deducoes_trimestrais: ecfQuarterRows.slice(0, 4).map((q) => ({
            ...q.in2306.deducoes,
          })),
          retencoes_trimestrais: ecfQuarterRows.slice(0, 4).map((q) => ({
            ...q.in2306.retencoes,
          })),
          aplicar_equiparacao_hospitalar: false,
          confidence: {
            overall: ecfIn2306Confidence,
            coverage: round2(classificationCoverage),
            linhas_analisadas: totalAnalyzed,
            linhas_classificadas: totalClassified,
          },
          source_trace: ecfQuarterRows
            .slice(0, 4)
            .flatMap((q) =>
              q.in2306.source_trace.slice(0, 100).map((item) => ({
                trimestre_inicio: q.inicio,
                trimestre_fim: q.fim,
                ...item,
              }))
            ),
          origem: 'ecf_k355_por_descricao_conta',
        }
      : typeof dre.receita_bruta === 'number'
      ? {
          schema_target: 'SimulateTributarioIN2306InputSchema',
          ano: Number((header.period_end || '').slice(0, 4)) || undefined,
          receita_bruta_anual: dre.receita_bruta,
          trimestres: [
            { produtos_mercadorias: round2(dre.receita_bruta / 4), servicos: 0, servicos_favorecida: 0, servicos_hospitalares: 0, demais_receitas: 0 },
            { produtos_mercadorias: round2(dre.receita_bruta / 4), servicos: 0, servicos_favorecida: 0, servicos_hospitalares: 0, demais_receitas: 0 },
            { produtos_mercadorias: round2(dre.receita_bruta / 4), servicos: 0, servicos_favorecida: 0, servicos_hospitalares: 0, demais_receitas: 0 },
            { produtos_mercadorias: round2(dre.receita_bruta / 4), servicos: 0, servicos_favorecida: 0, servicos_hospitalares: 0, demais_receitas: 0 },
          ],
          confidence: {
            overall: 0.5,
            coverage: 0.25,
            linhas_analisadas: dreLines.length,
            linhas_classificadas: 1,
          },
          origem: 'dre_j150',
        }
      : undefined;

  const irpfAltaRendaPrefill =
    sociosRemuneracao.length > 0
      ? {
          socios: sociosRemuneracao.map((s) => ({
            nome: s.nome,
            cpf: s.cpf_cnpj,
            qualificacao: s.qualificacao,
            participacao_percentual: s.participacao_percentual,
          })),
        }
      : undefined;

  const prefillCatalog: SpedInspectionResult['prefill_catalog'] = [];
  if (ratingPrefill) {
    prefillCatalog.push(
      {
        modulo: 'rating_validator',
        campo_destino: 'ativo_circulante_total',
        origem_sped: 'J100.descricao=ATIVO CIRCULANTE.valor_final',
        transformacao: 'mapeamento direto',
        confianca: 0.95,
      },
      {
        modulo: 'rating_validator',
        campo_destino: 'passivo_circulante_total',
        origem_sped: 'J100.descricao=PASSIVO CIRCULANTE.valor_final',
        transformacao: 'mapeamento direto',
        confianca: 0.95,
      },
      {
        modulo: 'rating_validator',
        campo_destino: 'patrimonio_liquido_total',
        origem_sped: 'J100.descricao=PATRIMONIO LIQUIDO.valor_final',
        transformacao: 'mapeamento direto',
        confianca: 0.95,
      }
    );
  }
  if (in2306Prefill) {
    prefillCatalog.push(
      {
        modulo: 'simulador_in2306',
        campo_destino: 'trimestres[n].produtos_mercadorias',
        origem_sped: hasEcfTaxSignals
          ? 'K030(periodo) + K355(valor) + C050(descricao da conta)'
          : 'J150.descricao=RECEITA BRUTA.valor_final',
        transformacao: hasEcfTaxSignals
          ? 'classificacao por dicionario de contas (receita de produtos/mercadorias)'
          : 'distribuicao linear anual -> trimestral',
        confianca: hasEcfTaxSignals ? ecfIn2306Confidence : 0.5,
      },
      {
        modulo: 'simulador_in2306',
        campo_destino: 'deducoes_trimestrais[n].icms_destacado',
        origem_sped: 'K355 + C050(descricao contendo ICMS)',
        transformacao: 'soma por trimestre de contas classificadas como deducao ICMS',
        confianca: hasEcfTaxSignals ? round2(Math.max(0.35, ecfIn2306Confidence - 0.08)) : 0.3,
      },
      {
        modulo: 'simulador_in2306',
        campo_destino: 'retencoes_trimestrais[n].irrf',
        origem_sped: 'K355 + C050(descricao contendo IRRF/retencao)',
        transformacao: 'soma por trimestre de contas classificadas como retencao',
        confianca: hasEcfTaxSignals ? round2(Math.max(0.35, ecfIn2306Confidence - 0.1)) : 0.3,
      }
    );
  }
  if (irpfAltaRendaPrefill) {
    prefillCatalog.push({
      modulo: 'irpf_alta_renda',
      campo_destino: 'socios[]',
      origem_sped: 'Y600',
      transformacao: 'mapeamento de identificacao/remuneracao de socios',
      confianca: 0.55,
    });
  }

  return {
    header,
    cadastro,
    signatories,
    socios_remuneracao: sociosRemuneracao,
    register_counts: registerCounts,
    ecf_tax_signals: hasEcfTaxSignals
      ? {
          trimestres: ecfTrimestres,
          receita_bruta_anual_estimada: ecfReceitaAnualEstimada,
        }
      : undefined,
    prefill_catalog: prefillCatalog,
    balance_sheet_lines: balanceLines.slice(0, 120),
    dre_lines: dreLines.slice(0, 120),
    balance_sheet: hasBalance ? balance : undefined,
    dre: hasDre ? dre : undefined,
    module_prefill: {
      rating_validator: ratingPrefill,
      simulador_in2306: in2306Prefill,
      irpf_alta_renda: irpfAltaRendaPrefill,
    },
  };
}
