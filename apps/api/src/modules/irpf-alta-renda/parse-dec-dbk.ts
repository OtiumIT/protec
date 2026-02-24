/**
 * Parser para arquivos .dec e .dbk (DIRPF - Programa IRPF / e-CAC).
 * Suporta dois formatos:
 * - Pipe-delimitado (|) — leiaute TXT de alguns anos
 * - Fixed-width (posições fixas) — formato binário/texto do PGD (ex.: 2025)
 * Referência: https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/dirpf
 */

import {
  DadosIrpfAltaRendaSchema,
  DeclaracaoIrpfCompletaSchema,
  type DeclaracaoIrpfCompleta,
} from '@shared/core';
import { classificarIsentosArt16A } from './calculations';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const CPF_LENGTH = 11;

function round2(n: number): number {
  return parseFloat((Math.round(n * 100) / 100).toFixed(2));
}

/** Converte valor do arquivo: 15 dig (13+2 dec) ou 13 dig (11+2 dec). Ex: "000001234567" = 1234.67 */
function parseValorMonetario(s: string): number {
  if (!s || !/^\d+$/.test(s.replace(/\s/g, ''))) return 0;
  const digits = s.replace(/\D/g, '');
  if (digits.length < 3) return 0;
  const intPart = digits.slice(0, -2);
  const decPart = digits.slice(-2);
  return round2(parseInt(intPart || '0', 10) + parseInt(decPart, 10) / 100);
}

/** Valor em 13 dígitos (11 inteiros + 2 decimais), usado em tipo 20/21 e parte do 23 */
function parseValor13(s: string): number {
  const d = (s || '').replace(/\D/g, '').slice(0, 13);
  if (d.length < 11) return 0;
  return round2(parseInt(d.slice(0, -2) || '0', 10) + parseInt(d.slice(-2), 10) / 100);
}

/** Extrai CPF de string (apenas dígitos) */
function extractCpf(s: string): string {
  const digits = (s || '').replace(/\D/g, '');
  return digits.length >= CPF_LENGTH ? digits.slice(-CPF_LENGTH) : digits;
}

/** Extrai ano do nome do arquivo: DEC_ORIGI_2025_IRPF_xxx ou 87945339972-IRPF-A-2025-2024-RETIF.DBK */
function extractAnoFromFilename(name: string): number | null {
  const match =
    name.match(/_(20\d{2})_IRPF/i) ||
    name.match(/(20\d{2})[-_]?(20\d{2})?/i) ||
    name.match(/(20\d{2})/);
  return match ? parseInt(match[1], 10) : null;
}

/** Versão do parser (3 = tipo 24 posições corrigidas, tipo 19 imposto pago, códigos 06/10/11/12 classificados) */
export const DEC_DBK_PARSER_VERSION = 3;

export type ParseDecDbkResult = {
  ano: number;
  dados: import('@shared/core').DadosIrpfAltaRenda;
  declaracao_completa: DeclaracaoIrpfCompleta;
  parser_version?: number;
  diagnostico?: {
    fonte: 'dec_dbk_fixed_width' | 'dec_dbk_pipe';
    completude: 'alta' | 'media' | 'baixa';
    avisos: string[];
  };
};

const CODIGO_ISENTO_DESCRICAO: Record<string, string> = {
  '01': 'Transferencias patrimoniais (heranca/doacao)',
  '03': 'Transferencias patrimoniais entre conjuges/dependentes',
  '05': 'Outros rendimentos isentos (subcategoria)',
  '06': 'Rendimentos de aplicacoes financeiras (tributacao exclusiva)',
  '09': 'Lucros e dividendos recebidos',
  '10': 'Juros sobre capital proprio (JCP)',
  '11': 'LCI/LCA/Poupanca (isento)',
  '12': 'LCI/LCA/Poupanca (isento)',
  '13': 'Rendimento de socio ou titular de microempresa/EPP Simples',
  '99': 'Outros rendimentos isentos',
};

/**
 * Parser fixed-width (formato PGD 2025): linha 1 = IRPF header, demais = tipo(2)+cpf(11)+...
 */
function parseFixedWidth(
  lines: string[],
  filename: string
): ParseDecDbkResult {
  const ano = extractAnoFromFilename(filename) ?? new Date().getFullYear();
  let nome = '';
  let cpf = '';
  let baseCalculoIr = 0;
  let impostoDevido = 0;
  let impostoPagoRetencao = 0;
  let impostoPagoCarneLeao = 0;
  const itensPj: { cnpj?: string; nome_fonte?: string; valor: number }[] = [];
  const itensPf: { descricao?: string; valor: number; mes?: string }[] = [];
  const itensIsentos09: { nome_fonte?: string; cnpj_fonte?: string; valor: number }[] = [];
  const itensIsentos13: { nome_fonte?: string; cnpj_fonte?: string; valor: number }[] = [];
  const codigosValor: Record<string, number> = {}; // codigo -> valor
  const avisos: string[] = [];

  if (lines[0]?.startsWith('IRPF')) {
    const l1 = lines[0];
    const exercAno = l1.substring(8, 16).replace(/\s/g, '');
    if (exercAno.length >= 4) {
      const ex = parseInt(exercAno.substring(0, 4), 10);
      if (ex >= 2020 && ex <= 2030) {
        // ano já extraído
      }
    }
    const segment = l1.substring(16, 50).split(/\s{2,}/)[0] ?? '';
    const cpfStr = segment.replace(/\D/g, '');
    if (cpfStr.length >= 11) {
      cpf = cpfStr.slice(-11);
    }
    const nomePart = l1.substring(37, 100).replace(/^\d+/, '').trim();
    if (nomePart.length > 3) {
      nome = nomePart.split(/\s{2,}/)[0]?.trim() || nomePart.substring(0, 60).trim();
    }
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const tipo = line.substring(0, 2);
    const lineCpf = line.substring(2, 13).replace(/\D/g, '');
    if (lineCpf.length === 11 && !cpf) cpf = lineCpf;

    if (tipo === '21') {
      const nomeEmp = line.substring(24, 74).trim();
      // Valor: primeiro bloco de 13 dígitos (11+2 dec) após o nome — lucros/rendimentos PJ (ex.: 92.090,00)
      const afterName = line.substring(74);
      const match13 = afterName.match(/\d{13}/);
      const valor = match13 ? parseValor13(match13[0]) : 0;
      if (nomeEmp && valor > 0) {
        itensPj.push({ nome_fonte: nomeEmp, valor });
      }
    } else if (tipo === '22' || tipo === '23') {
      let cod: string;
      let v: number;
      if (tipo === '22') {
        cod = line.substring(25, 27).replace(/\D/g, '') || line.substring(23, 25).replace(/\D/g, '');
        const valStr = line.substring(36, 51).replace(/\D/g, '');
        v = valStr.length >= 13 ? parseValorMonetario(valStr) : 0;
      } else {
        // Tipo 23: código 3 dígitos (14-17), valor 13 dígitos (17-30) — ex.: 09 = 231.033,31
        cod = line.substring(14, 17).replace(/\D/g, '').padStart(2, '0').slice(-2);
        v = parseValor13(line.substring(17, 30));
      }
      if (cod && v > 0) {
        const c = cod.padStart(2, '0').slice(-2);
        // Tipo 22 tem layout diferente; preferir tipo 24 para 05/06/10. Tipo 23 para 09/13.
        const skipTipo22 = tipo === '22' && (c === '09' || c === '13' || c === '05' || c === '06' || c === '10');
        if (!skipTipo22) {
          codigosValor[c] = (codigosValor[c] || 0) + v;
        }
      }
    } else if (tipo === '24') {
      // Layout: tipo(2) + CPF(11) + reservado(2) + cod(2) + valor(13) — ex.: 2487945339972000500000000339784219758085
      const cod = line.substring(15, 17).replace(/\D/g, '').padStart(2, '0').slice(-2);
      const v = parseValor13(line.substring(17, 30));
      if (cod && v > 0 && v < 1e12) {
        codigosValor[cod] = (codigosValor[cod] || 0) + v;
      }
    } else if (tipo === '26') {
      // Tipo 26: códigos 01, 21, 26, 99 = Pagamentos Efetuados (deduções), NÃO são rendimentos.
      // Apenas 09 (dividendos) e 13 (sócio Simples) são isentos; não somamos 01/21/26/99 em itensPj.
      const codigo4 = line.substring(13, 17);
      const cod2 = codigo4.substring(0, 2);
      const cnpj14 = line.substring(17, 31).replace(/\D/g, '');
      const nomeFonte = line.substring(34, 94).trim();
      const valorStr = line.substring(105, 118).replace(/\D/g, '');
      const valor = valorStr.length >= 11 ? parseValor13(valorStr) : 0;
      if (cod2 === '09' && valor > 0) {
        itensIsentos09.push({ nome_fonte: nomeFonte || 'Dividendos', cnpj_fonte: cnpj14 || undefined, valor });
      } else if (cod2 === '13' && valor > 0) {
        itensIsentos13.push({ nome_fonte: nomeFonte || 'Sócio Simples', cnpj_fonte: cnpj14 || undefined, valor });
      }
      // 01, 21, 26, 99 = deduções (Escola Apoena, Unimed, Clínica etc.) — não entram em rendimentos
    } else if (tipo === '20') {
      // Totais oficiais: blocos de 13 dígitos a partir de pos 13. Bloco 0 = total PJ, 1 = total PF.
      const totalPj20 = parseValor13(line.substring(13, 26));
      const totalPf20 = parseValor13(line.substring(26, 39));
      if (totalPj20 > 0 || totalPf20 > 0) {
        // Guardar para usar no buildResult (sobrescreve a soma dos itens)
        codigosValor['__totalPj20'] = totalPj20;
        codigosValor['__totalPf20'] = totalPf20;
      }
      // Base de cálculo e imposto: blocos 13 dig (pos 64-77 = imposto, 78-91 = base)
      const imposto20 = parseValor13(line.substring(64, 77));
      const base20 = parseValor13(line.substring(78, 91));
      if (base20 > 0 && baseCalculoIr === 0) baseCalculoIr = base20;
      if (imposto20 >= 0 && impostoDevido === 0) impostoDevido = imposto20;
    } else if (tipo === '19') {
      // Tipo 19: blocos de 13 dígitos com impostos pagos (carnê-leão, retenção na fonte).
      // Layout PGD: após "19"+CPF+spaces, blocos 13 dig. Índices 5 e 11 = carnê-leão e retenção.
      const digitsOnly = line.substring(13).replace(/\D/g, '');
      const blocos: number[] = [];
      for (let p = 0; p + 13 <= digitsOnly.length; p += 13) {
        blocos.push(parseValor13(digitsOnly.substring(p, p + 13)));
      }
      const v5 = blocos[5] ?? 0;
      const v11 = blocos[11] ?? 0;
      if (v5 > 0 && v5 < 1e9) impostoPagoCarneLeao = v5;
      if (v11 > 0 && v11 < 1e9) impostoPagoRetencao = v11;
    }
  }

  const totalRendPj = (codigosValor['__totalPj20'] as number | undefined) ?? itensPj.reduce((s, i) => s + i.valor, 0);
  const totalRendPf = (codigosValor['__totalPf20'] as number | undefined) ?? itensPf.reduce((s, i) => s + i.valor, 0);
  const tot09 = codigosValor['09'] ?? itensIsentos09.reduce((s, i) => s + i.valor, 0);
  const tot13 = codigosValor['13'] ?? itensIsentos13.reduce((s, i) => s + i.valor, 0);
  const itensIsentosOutros = Object.entries(codigosValor)
    .filter(([codigo, valor]) => !codigo.startsWith('__') && codigo !== '09' && codigo !== '13' && Number(valor) > 0)
    .map(([codigo, valor]) => ({
      codigo,
      descricao: CODIGO_ISENTO_DESCRICAO[codigo] ?? `Rendimento isento codigo ${codigo}`,
      valor: round2(Number(valor)),
    }));

  if (tot09 > 0 && itensIsentos09.length === 0) {
    itensIsentos09.push({ nome_fonte: 'Dividendos (cód. 09)', valor: tot09 });
  }
  if (tot13 > 0 && itensIsentos13.length === 0) {
    itensIsentos13.push({ nome_fonte: 'Sócio Simples (cód. 13)', valor: tot13 });
  }
  if (totalRendPf > 0 && itensPf.length === 0) {
    avisos.push('O parser identificou total de rendimentos PF sem detalhamento por item. Revise manualmente aluguéis/carnê-leão.');
  }
  const somaItensPj = itensPj.reduce((s, i) => s + i.valor, 0);
  const totalPj20 = codigosValor['__totalPj20'] as number | undefined;
  if (totalPj20 != null && somaItensPj > 0 && Math.abs(totalPj20 - somaItensPj) / totalPj20 > 0.01) {
    avisos.push(`Discrepância entre total PJ (tipo 20: R$ ${totalPj20.toLocaleString('pt-BR')}) e soma dos itens (R$ ${somaItensPj.toLocaleString('pt-BR')}). Verifique os dados.`);
  }
  if (impostoPagoRetencao === 0 && impostoPagoCarneLeao === 0) {
    avisos.push('Imposto já pago por retenção/carnê-leão não identificado automaticamente no arquivo. Confirme estes campos antes de simular.');
  }

  if (!nome && cpf) nome = 'Contribuinte (importado)';
  if (!nome && !cpf) nome = 'Contribuinte (verifique os dados)';
  if (!cpf) cpf = '00000000000';

  return buildResult(
    ano,
    nome,
    cpf,
    totalRendPj,
    totalRendPf,
    itensPj,
    itensPf,
    itensIsentos09,
    itensIsentos13,
    itensIsentosOutros,
    baseCalculoIr,
    impostoDevido,
    impostoPagoRetencao,
    impostoPagoCarneLeao,
    tot09,
    tot13,
    {
      fonte: 'dec_dbk_fixed_width',
      completude: totalRendPj + totalRendPf <= 0 ? 'baixa' : avisos.length > 1 ? 'media' : 'alta',
      avisos,
    }
  );
}

function buildResult(
  ano: number,
  nome: string,
  cpf: string,
  totalRendPj: number,
  totalRendPf: number,
  itensPj: { cnpj?: string; nome_fonte?: string; valor: number }[],
  itensPf: { descricao?: string; valor: number; mes?: string }[],
  itensIsentos09: { nome_fonte?: string; cnpj_fonte?: string; valor: number }[],
  itensIsentos13: { nome_fonte?: string; cnpj_fonte?: string; valor: number }[],
  itensIsentosOutros: { codigo: string; descricao?: string; valor: number }[],
  baseCalculoIr: number,
  impostoDevido: number,
  impostoPagoRetencao: number,
  impostoPagoCarneLeao: number,
  tot09 = 0,
  tot13 = 0,
  diagnostico?: ParseDecDbkResult['diagnostico']
): ParseDecDbkResult {
  const t09 = round2(tot09 > 0 ? tot09 : itensIsentos09.reduce((s, i) => s + i.valor, 0));
  const t13 = round2(tot13 > 0 ? tot13 : itensIsentos13.reduce((s, i) => s + i.valor, 0));
  const rendimentos_tributaveis = round2(totalRendPj + totalRendPf);
  const rendimentos_isentos_dividendos = [
    ...itensIsentos09.map((i) => ({ ...i, valor: round2(i.valor), codigo: '09' as const })),
    ...itensIsentos13.map((i) => ({ ...i, valor: round2(i.valor), codigo: '13' as const })),
  ];
  const classificacaoIsentos = classificarIsentosArt16A([
    ...itensIsentos09.map((i) => ({
      codigo: '09',
      descricao: i.nome_fonte,
      nome_fonte: i.nome_fonte,
      valor: round2(i.valor),
    })),
    ...itensIsentos13.map((i) => ({
      codigo: '13',
      descricao: i.nome_fonte,
      nome_fonte: i.nome_fonte,
      valor: round2(i.valor),
    })),
    ...itensIsentosOutros.map((i) => ({
      codigo: i.codigo,
      descricao: i.descricao,
      valor: round2(i.valor),
    })),
  ]);

  const declaracao_completa: DeclaracaoIrpfCompleta = {
    identificacao: { nome, cpf, exercicio: ano, ano_calendario: ano - 1 },
    dependentes: [],
    rendimentos_tributaveis_pj: { total: round2(totalRendPj), itens: itensPj.map((i) => ({ ...i, valor: round2(i.valor) })) },
    rendimentos_tributaveis_pf: { total: round2(totalRendPf), itens: itensPf.map((i) => ({ ...i, valor: round2(i.valor) })) },
    rendimentos_tributaveis_outros: { total: 0, itens: [] },
    rendimentos_isentos_nao_tributaveis: {
      total: round2(t09 + t13 + itensIsentosOutros.reduce((s, i) => s + (i.valor ?? 0), 0)),
      itens: [
        ...itensIsentos09.map((i) => ({ codigo: '09', nome_fonte: i.nome_fonte, valor: round2(i.valor) })),
        ...itensIsentos13.map((i) => ({ codigo: '13', nome_fonte: i.nome_fonte, valor: round2(i.valor) })),
        ...itensIsentosOutros.map((i) => ({ codigo: i.codigo, descricao: i.descricao, valor: round2(i.valor) })),
      ],
    },
    rendimentos_tributacao_exclusiva_definitiva: { total: 0, itens: [] },
    bens_direitos: { total: 0, itens: [] },
    dividas_onus: { total: 0, itens: [] },
    resumo: {
      base_calculo_ir: round2(baseCalculoIr || rendimentos_tributaveis),
      imposto_devido: round2(impostoDevido),
      imposto_pago_retencao: round2(impostoPagoRetencao + impostoPagoCarneLeao),
      imposto_a_restituir: 0,
      imposto_a_pagar: 0,
    },
    pagamentos_efetuados: [],
    doacoes_deducoes: [],
    lei_15_270_classificacao: {
      ganho_capital_excluido: classificacaoIsentos.ganho_capital_excluido,
      rendimentos_fiis_excluidos: classificacaoIsentos.rendimentos_fiis_excluidos,
      lucros_aprovados_ate_31dez2025: classificacaoIsentos.lucros_aprovados_ate_31dez2025,
      outros_excluidos_art_16a: classificacaoIsentos.outros_excluidos_art_16a,
    },
    fonte: 'dec_dbk',
    extraido_em: new Date().toISOString(),
  };

  const dadosParsed = {
    contribuinte: { nome, cpf: cpf.replace(/\D/g, '').padStart(11, '0') },
    rendimentos_tributaveis,
    rendimentos_isentos_dividendos,
    tributaveis_pj: itensPj.map((i) => ({ fonte: i.nome_fonte ?? '', cnpj: i.cnpj ?? '', valor: round2(i.valor) })),
    tributaveis_pf_alugueis: itensPf.map((i) => ({ mes: i.mes ?? '', valor: round2(i.valor) })),
    isentos_lucros_dividendos: itensIsentos09.map((i) => ({ nome_fonte: i.nome_fonte ?? '', cnpj_fonte: i.cnpj_fonte, valor: round2(i.valor) })),
    isentos_simples_nacional: itensIsentos13.map((i) => ({ nome_fonte: i.nome_fonte ?? '', cnpj_fonte: i.cnpj_fonte, valor: round2(i.valor) })),
    outros_isentos_que_entram_base: classificacaoIsentos.outros_isentos_que_entram_base,
    rendimentos_tributados_exclusivamente_lei_7713: classificacaoIsentos.rendimentos_tributados_exclusivamente_lei_7713,
    imposto_ja_pago_retencao_fonte: round2(impostoPagoRetencao),
    imposto_ja_pago_carne_leao: round2(impostoPagoCarneLeao),
    imposto_ja_pago_aplicacoes: 0,
    imposto_antecipado_dividendos: 0,
    lucros_aprovados_ate_31dez2025: classificacaoIsentos.lucros_aprovados_ate_31dez2025,
    ganho_capital_excluido: classificacaoIsentos.ganho_capital_excluido,
    rendimentos_fiis_excluidos: classificacaoIsentos.rendimentos_fiis_excluidos,
    outros_excluidos_art_16a: classificacaoIsentos.outros_excluidos_art_16a,
  };

  const declaracaoValidada = DeclaracaoIrpfCompletaSchema.parse(declaracao_completa);
  const dadosValidados = DadosIrpfAltaRendaSchema.parse(dadosParsed);

  return {
    ano,
    dados: dadosValidados,
    declaracao_completa: declaracaoValidada,
    parser_version: DEC_DBK_PARSER_VERSION,
    diagnostico,
  };
}

/**
 * Parseia arquivo .dec ou .dbk e retorna dados para o formulário IRPF Alta Renda.
 */
export function parseDecDbk(buffer: Buffer, filename = ''): ParseDecDbkResult {
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error('Arquivo muito grande. Máximo 5MB.');
  }

  let text: string;
  try {
    text = buffer.toString('utf-8');
    if (text.includes('�')) {
      text = buffer.toString('latin1');
    }
  } catch {
    throw new Error('Não foi possível ler o arquivo. Verifique o encoding.');
  }

  const lines = text.split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean);
  if (lines.length === 0) {
    throw new Error('Arquivo vazio ou formato inválido.');
  }

  const hasPipe = lines.some((l) => l.includes('|'));
  const hasIrpfHeader = lines[0]?.startsWith('IRPF');

  if (hasPipe) {
    return parsePipeDelimited(lines, filename);
  }
  if (hasIrpfHeader || (lines[0] && /^\d{2}\d{11}/.test(lines[0]))) {
    return parseFixedWidth(lines, filename);
  }

  throw new Error(
    'Formato não reconhecido. Use arquivo .dec ou .dbk do Programa IRPF ou e-CAC.'
  );
}

function parsePipeDelimited(
  lines: string[],
  filename: string
): ParseDecDbkResult {
  const ano = extractAnoFromFilename(filename) ?? new Date().getFullYear();
  const records = lines.map((line) => line.split('|').map((f) => f.trim()));

  let nome = '';
  let cpf = '';
  let baseCalculoIr = 0;
  let impostoDevido = 0;
  let impostoPagoRetencao = 0;
  const itensPj: { cnpj?: string; nome_fonte?: string; valor: number }[] = [];
  const itensPf: { descricao?: string; valor: number; mes?: string }[] = [];
  const itensIsentos09: { nome_fonte?: string; cnpj_fonte?: string; valor: number }[] = [];
  const itensIsentos13: { nome_fonte?: string; cnpj_fonte?: string; valor: number }[] = [];
  const itensIsentosOutros: { codigo: string; descricao?: string; valor: number }[] = [];
  let totalRendPj = 0;
  let totalRendPf = 0;
  const avisos: string[] = [];

  for (const fields of records) {
    const tipo = (fields[0] ?? '').toUpperCase().slice(0, 6);
    if (tipo.startsWith('DECPF') || tipo.startsWith('RESPO') || tipo === '00' || tipo === '01') {
      for (let i = 0; i < fields.length; i++) {
        const f = fields[i] ?? '';
        const cpfCandidate = extractCpf(f);
        if (cpfCandidate.length === CPF_LENGTH && !cpf) cpf = cpfCandidate;
        if (f.length > 3 && /^[A-Za-zÀ-ÿ\s]+$/.test(f) && f.length < 100 && !nome) {
          const clean = f.replace(/\d/g, '').trim();
          if (clean.length > 5) nome = clean;
        }
      }
    }
    if (tipo.startsWith('RTRT') || tipo === '10' || tipo === '11') {
      let valor = 0;
      let cnpj = '';
      let desc = '';
      for (let i = 1; i < fields.length; i++) {
        const v = parseValorMonetario(fields[i] ?? '');
        if (v > 0 && valor === 0) valor = v;
        const digits = (fields[i] ?? '').replace(/\D/g, '');
        if (digits.length === 14) cnpj = digits;
        if (typeof fields[i] === 'string' && fields[i]!.length > 2 && !/^\d+$/.test(fields[i]!)) desc = fields[i]!;
      }
      if (valor > 0) {
        itensPj.push({ cnpj: cnpj || undefined, nome_fonte: desc || undefined, valor });
        totalRendPj += valor;
      }
    }
    if (tipo.startsWith('RTIRF') || tipo === '12') {
      const v = parseValorMonetario(fields[1] ?? fields[2] ?? '');
      if (v > 0) impostoPagoRetencao += v;
    }
    const codigoReceita = (fields[2] ?? fields[3] ?? '').replace(/\D/g, '');
    const valorField = fields[fields.length - 1] ?? fields[fields.length - 2] ?? '';
    if (/09|090/.test(codigoReceita) || tipo.includes('09')) {
      const v = parseValorMonetario(valorField);
      if (v > 0) itensIsentos09.push({ nome_fonte: fields[1] ?? 'Dividendos', valor: v });
    }
    if (/13|130/.test(codigoReceita) || tipo.includes('13')) {
      const v = parseValorMonetario(valorField);
      if (v > 0) itensIsentos13.push({ nome_fonte: fields[1] ?? 'Sócio Simples', valor: v });
    }
    if (codigoReceita && !/^(09|090|13|130)$/.test(codigoReceita)) {
      const v = parseValorMonetario(valorField);
      if (v > 0) {
        const cod = codigoReceita.padStart(2, '0').slice(-2);
        itensIsentosOutros.push({
          codigo: cod,
          descricao: fields[1] || CODIGO_ISENTO_DESCRICAO[cod] || `Rendimento isento codigo ${cod}`,
          valor: v,
        });
      }
    }
    if ((tipo === 'TOTRES' || tipo === '99') && fields.length >= 3) {
      const bc = parseValorMonetario(fields[1] ?? fields[2] ?? '');
      const imp = parseValorMonetario(fields[2] ?? fields[3] ?? '');
      if (bc > 0) baseCalculoIr = bc;
      if (imp > 0) impostoDevido = imp;
    }
  }

  if (!nome && cpf) nome = 'Contribuinte (importado)';
  if (!nome && !cpf) nome = 'Contribuinte (verifique os dados)';
  if (!cpf) cpf = '00000000000';
  if (totalRendPf === 0) {
    avisos.push('Rendimentos tributáveis de PF não foram encontrados no layout pipe; valide esse valor manualmente.');
  }
  if (impostoPagoRetencao === 0) {
    avisos.push('Imposto já pago por retenção não identificado automaticamente no layout pipe. Confirme antes de simular.');
  }

  return buildResult(
    ano,
    nome,
    cpf,
    totalRendPj,
    totalRendPf,
    itensPj,
    itensPf,
    itensIsentos09,
    itensIsentos13,
    itensIsentosOutros,
    baseCalculoIr,
    impostoDevido,
    impostoPagoRetencao,
    0, // impostoPagoCarneLeao (não extraído no layout pipe)
    0,
    0,
    {
      fonte: 'dec_dbk_pipe',
      completude: totalRendPj + totalRendPf <= 0 ? 'baixa' : avisos.length > 1 ? 'media' : 'alta',
      avisos,
    }
  );
}
