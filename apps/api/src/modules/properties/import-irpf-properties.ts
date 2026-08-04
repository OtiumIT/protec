/**
 * Extrai candidatos de imóveis a partir de arquivos .dec/.dbk ou PDF da declaração IRPF.
 * Retorna preview para seleção no frontend — nenhuma persistência.
 */

import { randomUUID } from 'crypto';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface IrpfPropertyCandidate {
  temp_id: string;
  identificador: string;
  descricao: string;
  grupo?: string;
  codigo?: string;
  valor_declarado?: number;
  natureza_locacao: 'residencial' | 'nao_residencial';
  tipo_locacao: 'fixa';
  cidade?: string;
  uf?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  selected_default: boolean;
}

export interface IrpfPropertyImportResult {
  source: 'pdf' | 'dec_dbk';
  contribuinte?: { nome?: string; cpf?: string };
  candidates: IrpfPropertyCandidate[];
  avisos: string[];
}

// ─── DBK Grupo codes relevantes ─────────────────────────────────────────────────

const GRUPO_IMOVEL_URBANO = '11';
const GRUPO_DIREITOS_REAIS = '13';
const GRUPO_IMOVEL_RURAL = '12';

const GRUPOS_IMOVEIS = new Set([GRUPO_IMOVEL_URBANO, GRUPO_IMOVEL_RURAL, GRUPO_DIREITOS_REAIS]);

const IMOVEL_KEYWORDS = /apartamento|unidade|casa |lote |terreno|im[oó]vel|edif[ií]cio|condom[ií]nio|chacara|ch[aá]cara|s[ií]tio|fazenda|sala comercial|galpao|galp[aã]o|sobrado|cobertura|flat|kitnet/i;
const NOT_IMOVEL_KEYWORDS = /compra de u\$|disponibilidade em moeda|saldo em moeda|dolar|usd|euro|moeda estrangeira/i;

// ─── Helpers ────────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return parseFloat((Math.round(n * 100) / 100).toFixed(2));
}

function parseValor13(s: string): number {
  const d = (s || '').replace(/\D/g, '').slice(0, 13);
  if (d.length < 11) return 0;
  return round2(parseInt(d.slice(0, -2) || '0', 10) + parseInt(d.slice(-2), 10) / 100);
}

function extractAddress(desc: string): {
  cidade?: string; uf?: string; logradouro?: string; numero?: string; complemento?: string;
} {
  const result: ReturnType<typeof extractAddress> = {};

  const ufMatch = desc.match(/(?:em|cidade de|munic[ií]pio de|no municipo de)\s+([A-Z\u00C0-\u00FF][a-z\u00E0-\u00FF]+(?:\s+[A-Za-z\u00C0-\u00FF]+)*)\s*[-,]\s*([A-Z]{2})/i)
    || desc.match(/([A-Z\u00C0-\u00FF][a-z\u00E0-\u00FF]+(?:\s+[A-Za-z\u00C0-\u00FF]+)*)\s*[-]\s*([A-Z]{2})[.,\s]/i);
  if (ufMatch) {
    result.cidade = ufMatch[1].trim();
    result.uf = ufMatch[2].toUpperCase();
  }

  const ruaMatch = desc.match(/(?:na\s+)?(?:rua|avenida|av\.|alameda|al\.|travessa)\s+([^,]+?)(?:,|\s+n[oº°]?\.?\s*(\d+))/i);
  if (ruaMatch) {
    result.logradouro = ruaMatch[1].trim().substring(0, 255);
    if (ruaMatch[2]) result.numero = ruaMatch[2];
  }

  if (!result.numero) {
    const numMatch = desc.match(/,\s*(\d{1,5})\s/);
    if (numMatch) result.numero = numMatch[1];
  }

  return result;
}

function generateIdentificador(desc: string): string {
  const lower = desc.toLowerCase();
  const condensed = desc.replace(/[^A-Za-z0-9À-ÿ\s]/g, ' ').replace(/\s+/g, ' ').trim();

  if (/apartamento/i.test(lower)) {
    const edificio = desc.match(/edif[ií]cio\s+([^,]+)/i) || desc.match(/empreendimento\s+([^,]+)/i);
    const numMatch = desc.match(/apartamento\s*(\d+)/i);
    if (edificio) {
      const name = edificio[1].trim().substring(0, 40);
      return numMatch ? `Apto ${numMatch[1]} - ${name}` : name;
    }
    return numMatch ? `Apartamento ${numMatch[1]}` : condensed.substring(0, 60);
  }

  if (/unidade/i.test(lower)) {
    const numMatch = desc.match(/unidade\s*(?:n[.º°]?\s*)?(\d+)/i);
    const condo = desc.match(/condom[ií]nio\s+([^,]+)/i);
    if (condo) {
      const name = condo[1].trim().substring(0, 40);
      return numMatch ? `Unidade ${numMatch[1]} - ${name}` : name;
    }
    return condensed.substring(0, 60);
  }

  if (/lote/i.test(lower)) {
    const loteMatch = desc.match(/lote\s*(?:n[oº°.]?\s*)?(\d+)/i);
    const quadra = desc.match(/quadra\s*(\d+)/i);
    const loteamento = desc.match(/loteamento\s+(?:denominado\s+)?([^,]+)/i);
    let id = loteMatch ? `Lote ${loteMatch[1]}` : 'Lote';
    if (quadra) id += ` Q${quadra[1]}`;
    if (loteamento) id += ` - ${loteamento[1].trim().substring(0, 40)}`;
    return id;
  }

  return condensed.substring(0, 60) || 'Imóvel (verifique)';
}

function inferNatureza(desc: string): 'residencial' | 'nao_residencial' {
  const lower = desc.toLowerCase();
  if (/comercial|sala|galpao|galp[aã]o|escrit[oó]rio|loja|industrial/i.test(lower)) return 'nao_residencial';
  return 'residencial';
}

function isRealEstateByDescription(desc: string): boolean {
  if (NOT_IMOVEL_KEYWORDS.test(desc)) return false;
  return IMOVEL_KEYWORDS.test(desc);
}

// ─── DEC/DBK Parser ─────────────────────────────────────────────────────────────

/**
 * Extrai bens imóveis do tipo 27 de arquivo .dec/.dbk (PGD fixed-width).
 * Layout empiric (PGD 2025, linhas de ~1250 chars):
 *   tipo(2) + cpf(11) + grupo(2) + localizacao(2) + ???(2) + discriminacao(até pos 531) + valor_anterior(13) + valor_atual(13)
 */
export function extractPropertiesFromDecDbk(content: string, _filename: string): IrpfPropertyImportResult {
  const lines = content.split(/\r?\n/);
  const avisos: string[] = [];
  let nome = '';
  let cpf = '';

  if (lines[0]?.startsWith('IRPF')) {
    const l1 = lines[0];
    const segment = l1.substring(16, 50).split(/\s{2,}/)[0] ?? '';
    const cpfStr = segment.replace(/\D/g, '');
    if (cpfStr.length >= 11) cpf = cpfStr.slice(-11);
    const nomePart = l1.substring(37, 100).replace(/^\d+/, '').trim();
    if (nomePart.length > 3) nome = nomePart.split(/\s{2,}/)[0]?.trim() || nomePart.substring(0, 60).trim();
  }

  // Also check line tipo 16 for address / name
  for (const line of lines.slice(0, 5)) {
    if (line.startsWith('16') && !nome) {
      const n = line.substring(13, 73).trim();
      if (n.length > 3) nome = n;
    }
  }

  const candidates: IrpfPropertyCandidate[] = [];
  const tipo27Lines = lines.filter((l) => l.startsWith('27'));

  for (const line of tipo27Lines) {
    if (line.length < 557) continue;

    const grupo = line.substring(13, 15);
    if (!GRUPOS_IMOVEIS.has(grupo)) continue;

    const discriminacao = line.substring(19, 531).trim();
    const valorAnterior = parseValor13(line.substring(531, 544));
    const valorAtual = parseValor13(line.substring(544, 557));
    const valor = valorAtual > 0 ? valorAtual : valorAnterior;

    if (!isRealEstateByDescription(discriminacao)) continue;

    const address = extractAddress(discriminacao);
    const identificador = generateIdentificador(discriminacao);

    candidates.push({
      temp_id: randomUUID(),
      identificador,
      descricao: discriminacao,
      grupo,
      codigo: grupo === GRUPO_IMOVEL_URBANO ? '01' : grupo === GRUPO_IMOVEL_RURAL ? '02' : '03',
      valor_declarado: valor > 0 ? valor : undefined,
      natureza_locacao: inferNatureza(discriminacao),
      tipo_locacao: 'fixa',
      ...address,
      selected_default: true,
    });
  }

  if (candidates.length === 0 && tipo27Lines.length > 0) {
    avisos.push('Nenhum imóvel identificado na declaração. Todos os bens encontrados são aplicações financeiras ou veículos.');
  }

  return {
    source: 'dec_dbk',
    contribuinte: (nome || cpf) ? { nome: nome || undefined, cpf: cpf || undefined } : undefined,
    candidates,
    avisos,
  };
}

// ─── PDF extraction adapter ─────────────────────────────────────────────────────

/**
 * Extrai candidatos de imóveis a partir da saída do extractIrpfFromPdf (bens_direitos + patrimonio_imobiliario).
 */
const CODIGOS_IMOVEIS_PDF = new Set([
  '01', '02', '03', '04', '05', '06', '07', '08', '09', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
]);

function normalizeCodigoImovel(raw: string): string {
  const cleaned = raw.replace(/[^0-9]/g, '');
  if (cleaned.length === 0) return '00';
  if (cleaned.length <= 2) return cleaned.padStart(2, '0');
  return cleaned.substring(0, 2);
}

export function extractPropertiesFromPdfResult(pdfResult: {
  declaracao_completa?: { bens_direitos?: { itens?: Array<Record<string, unknown>> } };
  dados?: { patrimonio_imobiliario?: Array<{ descricao?: string; valor_atual?: number }> };
  ano?: number;
}): IrpfPropertyImportResult {
  const avisos: string[] = [];
  const candidates: IrpfPropertyCandidate[] = [];

  const bens = pdfResult.declaracao_completa?.bens_direitos?.itens ?? [];
  const patrimonio = pdfResult.dados?.patrimonio_imobiliario ?? [];

  console.log(`[extractPropertiesFromPdfResult] bens_direitos.itens: ${bens.length}, patrimonio_imobiliario: ${patrimonio.length}`);
  if (bens.length > 0) {
    console.log('[extractPropertiesFromPdfResult] Amostra bens_direitos (até 5):', JSON.stringify(bens.slice(0, 5).map((b) => ({
      codigo: b.codigo, grupo: b.grupo, descricao: String(b.descricao ?? '').substring(0, 80), valor_atual: b.valor_atual,
    }))));
  }

  const allItems = bens.length > 0
    ? bens.map((b) => ({
        codigo: String(b.codigo ?? b.grupo ?? ''),
        grupo: String(b.grupo ?? b.codigo ?? ''),
        descricao: String(b.descricao ?? ''),
        valor_atual: Number(b.valor_atual ?? b.valor ?? b.situacao_31dez ?? 0) || 0,
      }))
    : patrimonio.map((p) => ({ codigo: '01', grupo: '01', descricao: p.descricao ?? '', valor_atual: p.valor_atual ?? 0 }));

  console.log(`[extractPropertiesFromPdfResult] allItems total: ${allItems.length}`);

  for (const item of allItems) {
    const codigoNorm = normalizeCodigoImovel(item.codigo);
    const grupoNorm = normalizeCodigoImovel(item.grupo);
    const desc = item.descricao.trim();
    if (!desc) continue;

    const isImovelByCodigo = CODIGOS_IMOVEIS_PDF.has(codigoNorm) || CODIGOS_IMOVEIS_PDF.has(grupoNorm);
    const isImovelByKeyword = isRealEstateByDescription(desc);

    if (!isImovelByCodigo && !isImovelByKeyword) {
      console.log(`[extractPropertiesFromPdfResult] SKIP (no match): codigo=${item.codigo} grupo=${item.grupo} desc="${desc.substring(0, 60)}"`);
      continue;
    }
    if (NOT_IMOVEL_KEYWORDS.test(desc)) {
      console.log(`[extractPropertiesFromPdfResult] SKIP (not imovel keywords): desc="${desc.substring(0, 60)}"`);
      continue;
    }

    const address = extractAddress(desc);
    const identificador = generateIdentificador(desc);
    const valor = round2(item.valor_atual);

    candidates.push({
      temp_id: randomUUID(),
      identificador,
      descricao: desc,
      grupo: codigoNorm,
      codigo: codigoNorm,
      valor_declarado: valor > 0 ? valor : undefined,
      natureza_locacao: inferNatureza(desc),
      tipo_locacao: 'fixa',
      ...address,
      selected_default: true,
    });
  }

  console.log(`[extractPropertiesFromPdfResult] candidates found: ${candidates.length}`);

  if (candidates.length === 0 && allItems.length > 0) {
    avisos.push(`Nenhum imóvel identificado entre os ${allItems.length} bens extraídos do PDF. Verifique se a declaração contém imóveis na seção "Bens e Direitos".`);
  } else if (candidates.length === 0) {
    avisos.push('Nenhum bem encontrado no PDF. Verifique se a declaração contém a seção "Bens e Direitos".');
  }

  const contribuinte = pdfResult.declaracao_completa
    ? extractContribuinteFromDeclaracao(pdfResult.declaracao_completa)
    : undefined;

  return {
    source: 'pdf',
    contribuinte,
    candidates,
    avisos,
  };
}

function extractContribuinteFromDeclaracao(dc: Record<string, unknown>): { nome?: string; cpf?: string } | undefined {
  const ident = (dc as any).identificacao ?? (dc as any).contribuinte;
  if (!ident) return undefined;
  const nome = String(ident.nome ?? '').trim() || undefined;
  const cpf = String(ident.cpf ?? '').replace(/\D/g, '') || undefined;
  return (nome || cpf) ? { nome, cpf } : undefined;
}
