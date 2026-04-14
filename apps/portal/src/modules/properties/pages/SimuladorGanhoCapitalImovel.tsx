import { useState, useEffect, useMemo } from 'react';
import { Layout } from '../../../shared/components/layout/Layout';
import { propertyService } from '../services/property.service';
import {
  calcularFatorIpcaAcumuladoLc214,
  type FiscalIndicesIpcaSeriesResponse,
} from '@shared/core';

// ===== CONSTANTES =====

const ART18_TABELA: [number, number][] = [
  [1969, 100], [1970, 100], [1971, 95], [1972, 90], [1973, 85],
  [1974, 80], [1975, 75], [1976, 70], [1977, 65], [1978, 60],
  [1979, 55], [1980, 50], [1981, 45], [1982, 40], [1983, 35],
  [1984, 30], [1985, 25], [1986, 20], [1987, 15], [1988, 5],
];

const IBS_TRANSICAO: Record<number, { cbs: number; ibs: number; obs: string; teste?: boolean }> = {
  2026: { cbs: 0, ibs: 0, obs: 'Alíquota teste 1% — sem impacto real para PF', teste: true },
  2027: { cbs: 1, ibs: 0, obs: 'CBS plena; IBS ainda não vigente' },
  2028: { cbs: 1, ibs: 0, obs: 'CBS plena; IBS ainda não vigente' },
  2029: { cbs: 1, ibs: 0.10, obs: 'CBS plena + IBS 10% da plena' },
  2030: { cbs: 1, ibs: 0.20, obs: 'CBS plena + IBS 20% da plena' },
  2031: { cbs: 1, ibs: 0.30, obs: 'CBS plena + IBS 30% da plena' },
  2032: { cbs: 1, ibs: 0.40, obs: 'CBS plena + IBS 40% da plena' },
  2033: { cbs: 1, ibs: 1, obs: 'CBS e IBS ambos plenos' },
};

// Alíquotas plenas LC 214/2025 (após redução de 50%)
const CBS_PLENA_PCT = 4.5;
const IBS_PLENA_PCT = 9.5;

// Redutores sociais LC 214/2025 art. 259 — nominais, corrigidos mensalmente a partir de jan/2025
const REDUTOR_IMOVEL_NOVO_NOMINAL = 100_000;
const REDUTOR_LOTE_NOMINAL = 30_000;

// Limites PF contribuinte IBS/CBS (nominais — LC 214/2025)
const LIMITE_240K_NOMINAL = 240_000;
const LIMITE_288K_NOMINAL = 288_000;

type TabId = 'simulador' | 'ibs_cbs' | 'tabelas' | 'comparativo' | 'metodologia';
type TipoImovel = 'imovel_construido' | 'lote_residencial' | 'imovel_rural';
type NaturezaPJ = 'ativo' | 'mercadoria';
type RedutorTipo = 'referencia' | 'corrigido';

// ===== UTILITÁRIOS DE FORMATAÇÃO =====

function fmtBRL(v: number): string {
  return (
    'R$\u00a0' +
    v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

function fmtPct(v: number, dec = 2): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + '%';
}

// ===== FUNÇÕES DE CÁLCULO (puras) =====

function getReducaoArt18(ano: number): number {
  if (ano > 1988) return 0;
  const row = ART18_TABELA.find(([a]) => a === ano);
  if (!row) return ano <= 1969 ? 100 : 0;
  return row[1];
}

function calcFR1(dtAq: Date): number {
  const anoAq = dtAq.getFullYear();
  const mesAq = dtAq.getMonth() + 1;
  if (anoAq * 12 + mesAq > 2006 * 12 + 1) return 1;
  const m1 = 2005 * 12 + 12 - (anoAq * 12 + mesAq);
  if (m1 <= 0) return 1;
  return 1 / Math.pow(1.006, m1);
}

function calcFR2(dtAl: Date): number {
  const anoAl = dtAl.getFullYear();
  const mesAl = dtAl.getMonth() + 1;
  if (anoAl * 12 + mesAl <= 2005 * 12 + 12) return 1;
  const m2 = anoAl * 12 + mesAl - (2005 * 12 + 12) + 1;
  return 1 / Math.pow(1.0035, m2);
}

function calcIRPF(gc: number): { f1: number; f2: number; f3: number; f4: number; total: number } {
  const f1 = Math.min(gc, 5_000_000) * 0.15;
  const f2 = Math.max(0, Math.min(gc - 5_000_000, 5_000_000)) * 0.175;
  const f3 = Math.max(0, Math.min(gc - 10_000_000, 20_000_000)) * 0.2;
  const f4 = Math.max(0, gc - 30_000_000) * 0.225;
  return { f1, f2, f3, f4, total: f1 + f2 + f3 + f4 };
}

function calcPJMercadoria(receita: number) {
  const baseirpj = receita * 0.08;
  const basecsll = receita * 0.12;
  const adicional = Math.max(0, baseirpj - 60_000) * 0.1;
  const irpj = baseirpj * 0.15 + adicional;
  const csll = basecsll * 0.09;
  const pis = receita * 0.0065;
  const cofins = receita * 0.03;
  return { irpj, csll, pis, cofins, total: irpj + csll + pis + cofins, baseirpj, basecsll, adicional };
}

function calcPJAtivo(receita: number, custoPJ: number) {
  const ganho = receita - custoPJ;
  if (ganho <= 0) return { irpj: 0, csll: 0, pis: 0, cofins: 0, total: 0, ganho: 0, baseirpj: 0, basecsll: 0, adicional: 0 };
  const adicional = Math.max(0, ganho - 60_000) * 0.1;
  const irpj = ganho * 0.15 + adicional;
  const csll = ganho * 0.09;
  return { irpj, csll, pis: 0, cofins: 0, total: irpj + csll, ganho, baseirpj: ganho, basecsll: ganho, adicional };
}

function calcPJMercadoriaReforma(receita: number, cbsEf: number, ibsEf: number) {
  const base = calcPJMercadoria(receita);
  const cbs = (receita * cbsEf) / 100;
  const ibs = (receita * ibsEf) / 100;
  return { ...base, cbs, ibs, pis: 0, cofins: 0, total: base.irpj + base.csll + cbs + ibs };
}

function calcPJAtivoReforma(receita: number, custoPJ: number, _cbsEf: number, ibsEf: number) {
  const base = calcPJAtivo(receita, custoPJ);
  const ibs = (receita * ibsEf) / 100;
  return { ...base, cbs: 0, ibs, total: base.irpj + base.csll + ibs };
}

// Constrói Map YYYY-MM → variação % a partir da série
function buildIpcaMap(series: FiscalIndicesIpcaSeriesResponse | null): Map<string, number> {
  const map = new Map<string, number>();
  if (!series) return map;
  for (const mes of series.meses) {
    map.set(mes.mes_referencia, mes.variacao_mensal_pct);
  }
  return map;
}

// Fator acumulado IPCA de qualquer data de início até o mês mais recente disponível
function calcFatorIpcaDesde(
  ipcaMap: Map<string, number>,
  dtInicio: Date
): { fator: number; pctAcumulado: number; mesesAplicados: number; parcial: boolean; primeiraMesDisponivel: string } {
  const hoje = new Date();
  let y = dtInicio.getFullYear();
  let m = dtInicio.getMonth() + 1;
  const endY = hoje.getFullYear();
  const endM = hoje.getMonth();

  let fator = 1;
  let mesesAplicados = 0;

  // Encontrar primeira chave na série (mínimo)
  const allKeys = [...ipcaMap.keys()].sort();
  const primeiraChave = allKeys[0] ?? '';

  while (y < endY || (y === endY && m <= endM)) {
    const key = `${y}-${String(m).padStart(2, '0')}`;
    if (ipcaMap.has(key)) {
      fator *= 1 + (ipcaMap.get(key) ?? 0) / 100;
      mesesAplicados++;
    }
    m++;
    if (m > 12) { m = 1; y++; }
  }

  const startKey = `${dtInicio.getFullYear()}-${String(dtInicio.getMonth() + 1).padStart(2, '0')}`;
  const parcial = primeiraChave > startKey;

  return {
    fator: Math.round(fator * 1_000_000) / 1_000_000,
    pctAcumulado: Math.round((fator - 1) * 10_000) / 100,
    mesesAplicados,
    parcial,
    primeiraMesDisponivel: primeiraChave,
  };
}

// Verifica se PF é contribuinte IBS/CBS (locação / vendas acima dos limites)
function verificarContribuintePF(
  qtdeImoveis: number,
  receitaAnual: number,
  lim240k: number,
  lim288k: number
): { contribuinte: boolean; motivo: string } {
  if (receitaAnual > lim288k) {
    return {
      contribuinte: true,
      motivo: `Receita anual (${fmtBRL(receitaAnual)}) supera o limite absoluto corrigido de ${fmtBRL(lim288k)} — contribuinte independente do número de imóveis`,
    };
  }
  if (qtdeImoveis > 3 && receitaAnual > lim240k) {
    return {
      contribuinte: true,
      motivo: `Mais de 3 imóveis e receita (${fmtBRL(receitaAnual)}) acima do limite corrigido de ${fmtBRL(lim240k)} — contribuinte`,
    };
  }
  return {
    contribuinte: false,
    motivo:
      qtdeImoveis > 3
        ? `Mais de 3 imóveis, mas receita (${fmtBRL(receitaAnual)}) abaixo do limite de ${fmtBRL(lim240k)} — não contribuinte`
        : `Até 3 imóveis — não contribuinte (IBS/CBS não incide sobre a venda nesta condição)`,
  };
}

// ===== SUBCOMPONENTES UI =====

function Metric({ label, value, color }: { label: string; value: string; color?: 'green' | 'red' | 'blue' | 'amber' }) {
  const colorClass = color === 'green' ? 'text-green-600 dark:text-green-400'
    : color === 'red' ? 'text-red-600 dark:text-red-400'
    : color === 'blue' ? 'text-blue-600 dark:text-blue-400'
    : color === 'amber' ? 'text-amber-600 dark:text-amber-400'
    : 'text-gray-900 dark:text-gray-100';
  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">{label}</div>
      <div className={`text-base font-semibold break-words ${colorClass}`}>{value}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-4 mb-2">
      {children}
    </div>
  );
}

function FormulaBox({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-500 rounded-r-lg p-3 text-xs text-gray-600 dark:text-gray-400 font-mono leading-relaxed whitespace-pre-wrap mb-3">
      {children}
    </pre>
  );
}

function Badge({ children, color = 'blue' }: { children: React.ReactNode; color?: 'green' | 'red' | 'blue' | 'amber' | 'gray' }) {
  const cls = color === 'green' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    : color === 'red' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    : color === 'blue' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    : color === 'amber' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${cls}`}>{children}</span>
  );
}

function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {children}
      </select>
    </div>
  );
}

function NumberField({ label, value, onChange, placeholder, step, min }: { label: string; value: number; onChange: (v: number) => void; placeholder?: string; step?: number; min?: number }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
      <input
        type="number"
        value={value || ''}
        min={min ?? 0}
        step={step ?? 1}
        placeholder={placeholder}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
      <input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
}

// ===== COMPONENTE PRINCIPAL =====

export default function SimuladorGanhoCapitalImovel() {
  const [activeTab, setActiveTab] = useState<TabId>('simulador');

  // IPCA
  const [ipcaSeries, setIpcaSeries] = useState<FiscalIndicesIpcaSeriesResponse | null>(null);
  const [ipcaLoading, setIpcaLoading] = useState(true);

  // Inputs — Simulador principal
  const [venda, setVenda] = useState(1_500_000);
  const [custo, setCusto] = useState(300_000);
  const [despesas, setDespesas] = useState(20_000);
  const [dtAq, setDtAq] = useState('1995-06-01');
  const [dtAl, setDtAl] = useState('2025-03-01');
  const [tipoImovel, setTipoImovel] = useState<TipoImovel>('imovel_construido');
  const [naturezaPJ, setNaturezaPJ] = useState<NaturezaPJ>('ativo');
  const [custoPJ, setCustoPJ] = useState(300_000);
  const [incluirPisCofins, setIncluirPisCofins] = useState(true);

  // Inputs — IBS/CBS
  const [ibsAno, setIbsAno] = useState(2027);
  const [imovelAte2026, setImovelAte2026] = useState(true);
  const [redutorTipo, setRedutorTipo] = useState<RedutorTipo>('corrigido');
  const [valorRefIBS, setValorRefIBS] = useState(0);
  const [correcaoManualPct, setCorrecaoManualPct] = useState<number | null>(null); // null = usar IPCA automático

  // Inputs — Contribuinte PF
  const [qtdeImoveis, setQtdeImoveis] = useState(1);
  const [receitaAnualPF, setReceitaAnualPF] = useState(0);

  // Fetch IPCA ao montar
  useEffect(() => {
    let cancelled = false;
    setIpcaLoading(true);
    const anoAtual = new Date().getFullYear();
    propertyService.getFiscalIndicesIpcaSeries(anoAtual, 36)
      .then(data => { if (!cancelled) { setIpcaSeries(data); } })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIpcaLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // ===== MAP IPCA =====
  const ipcaMap = useMemo(() => buildIpcaMap(ipcaSeries), [ipcaSeries]);

  // ===== FATOR IPCA DESDE AQUISIÇÃO (para correção monetária do custo) =====
  const ipcaDesdeAquisicao = useMemo(() => {
    if (!dtAq || ipcaMap.size === 0) return null;
    const dt = new Date(dtAq + 'T12:00:00');
    if (isNaN(dt.getTime())) return null;
    return calcFatorIpcaDesde(ipcaMap, dt);
  }, [dtAq, ipcaMap]);

  // IPCA acumulado desde jan/2025 (para os redutores R$ 100k / R$ 30k)
  const fatorRedutoresLc214 = useMemo(() => {
    if (ipcaMap.size === 0) return 1;
    const { fator } = calcularFatorIpcaAcumuladoLc214(ipcaMap, new Date().getFullYear(), new Date().getMonth() + 1);
    return fator;
  }, [ipcaMap]);

  // Redutores corrigidos
  const redutorImóvelNovoCor = Math.round(REDUTOR_IMOVEL_NOVO_NOMINAL * fatorRedutoresLc214 * 100) / 100;
  const redutorLoteCor = Math.round(REDUTOR_LOTE_NOMINAL * fatorRedutoresLc214 * 100) / 100;

  // Limites contribuinte PF corrigidos pelo IPCA
  const limite240kCor = Math.round(LIMITE_240K_NOMINAL * fatorRedutoresLc214 * 100) / 100;
  const limite288kCor = Math.round(LIMITE_288K_NOMINAL * fatorRedutoresLc214 * 100) / 100;

  // % de correção a usar no redutor de ajuste IBS/CBS
  const correcaoPctEfetiva = useMemo(() => {
    if (correcaoManualPct !== null) return correcaoManualPct;
    if (!ipcaDesdeAquisicao) return 0;
    return ipcaDesdeAquisicao.pctAcumulado;
  }, [correcaoManualPct, ipcaDesdeAquisicao]);

  // ===== CÁLCULO PF =====
  const resultPF = useMemo(() => {
    if (!dtAq || !dtAl) return null;
    const dtAqDate = new Date(dtAq + 'T12:00:00');
    const dtAlDate = new Date(dtAl + 'T12:00:00');
    if (isNaN(dtAqDate.getTime()) || isNaN(dtAlDate.getTime())) return null;

    const gcBruto = venda - custo - despesas;
    if (gcBruto <= 0) return { gcBruto, gcApos18: 0, fr1: 1, fr2: 1, gcTrib: 0, ir: { f1: 0, f2: 0, f3: 0, f4: 0, total: 0 }, red18pct: 0 };

    const red18pct = getReducaoArt18(dtAqDate.getFullYear());
    const gcApos18 = gcBruto * (1 - red18pct / 100);
    const fr1 = calcFR1(dtAqDate);
    const fr2 = calcFR2(dtAlDate);
    const gcTrib = gcApos18 * fr1 * fr2;
    const ir = calcIRPF(gcTrib);

    return { gcBruto, gcApos18, fr1, fr2, gcTrib, ir, red18pct };
  }, [venda, custo, despesas, dtAq, dtAl]);

  // ===== CÁLCULO PJ =====
  const resultPJ = useMemo(() => {
    const merc = calcPJMercadoria(venda);
    const ativo = calcPJAtivo(venda, custoPJ);
    const selected = naturezaPJ === 'mercadoria' ? merc : ativo;
    const effective = incluirPisCofins ? selected : { ...selected, pis: 0, cofins: 0, total: selected.irpj + selected.csll };
    return { merc, ativo, selected: effective };
  }, [venda, custoPJ, naturezaPJ, incluirPisCofins]);

  // ===== CÁLCULO IBS/CBS =====
  const ibsResult = useMemo(() => {
    const trans = IBS_TRANSICAO[ibsAno] ?? IBS_TRANSICAO[2033]!;
    const cbsAno = trans.teste ? 0 : CBS_PLENA_PCT * trans.cbs;
    const ibsAno_ = trans.teste ? 0 : IBS_PLENA_PCT * trans.ibs;
    const totalAno = cbsAno + ibsAno_;

    // Redutor de ajuste
    const custoCorrigido = custo * (1 + correcaoPctEfetiva / 100);
    let redutorAj = 0;
    let redutorAjLabel = '';

    if (imovelAte2026) {
      if (redutorTipo === 'referencia' && valorRefIBS > 0) {
        redutorAj = Math.max(custoCorrigido, valorRefIBS);
        redutorAjLabel = `max(custo corrigido ${fmtBRL(custoCorrigido)}, valor referência ${fmtBRL(valorRefIBS)}) = ${fmtBRL(redutorAj)}`;
      } else {
        redutorAj = custoCorrigido;
        redutorAjLabel = `Custo corrigido (${fmtPct(correcaoPctEfetiva)} IPCA) = ${fmtBRL(custoCorrigido)}`;
      }
    } else {
      redutorAj = custo;
      redutorAjLabel = `Custo original (adquirido após 31/12/2026) = ${fmtBRL(custo)}`;
    }

    // Redutor social (tipo do imóvel)
    const baseAposAj = Math.max(0, venda - redutorAj);
    let redutorSocial = 0;
    let redutorSocialLabel = 'Não aplicável';
    const redutorSocialNominal = tipoImovel === 'imovel_construido' ? REDUTOR_IMOVEL_NOVO_NOMINAL : tipoImovel === 'lote_residencial' ? REDUTOR_LOTE_NOMINAL : 0;
    const redutorSocialCor = tipoImovel === 'imovel_construido' ? redutorImóvelNovoCor : tipoImovel === 'lote_residencial' ? redutorLoteCor : 0;

    if (tipoImovel === 'imovel_construido') {
      redutorSocial = Math.min(redutorSocialCor, baseAposAj);
      redutorSocialLabel = `Imóvel residencial construído — ${fmtBRL(redutorSocialCor)} (nominal ${fmtBRL(redutorSocialNominal)} + IPCA ${fmtPct((fatorRedutoresLc214 - 1) * 100)} desde jan/2025)`;
    } else if (tipoImovel === 'lote_residencial') {
      redutorSocial = Math.min(redutorSocialCor, baseAposAj);
      redutorSocialLabel = `Lote residencial — ${fmtBRL(redutorSocialCor)} (nominal ${fmtBRL(redutorSocialNominal)} + IPCA ${fmtPct((fatorRedutoresLc214 - 1) * 100)} desde jan/2025)`;
    }

    const baseIBSCBS = Math.max(0, baseAposAj - redutorSocial);

    // Verificar contribuinte PF
    const contribuinteCheck = verificarContribuintePF(qtdeImoveis, receitaAnualPF, limite240kCor, limite288kCor);
    const cbsDev = contribuinteCheck.contribuinte ? baseIBSCBS * cbsAno / 100 : 0;
    const ibsDev = contribuinteCheck.contribuinte ? baseIBSCBS * ibsAno_ / 100 : 0;
    const totalDev = cbsDev + ibsDev;

    // PJ reforma
    const cbsPJ = CBS_PLENA_PCT * trans.cbs;
    const ibsPJ = IBS_PLENA_PCT * trans.ibs;
    const pjMercReforma = calcPJMercadoriaReforma(venda, cbsPJ, ibsPJ);
    const pjAtivoReforma = calcPJAtivoReforma(venda, custoPJ, cbsPJ, ibsPJ);
    const pjReformaSelected = naturezaPJ === 'mercadoria' ? pjMercReforma : pjAtivoReforma;

    return {
      trans, cbsAno, ibsAno: ibsAno_, totalAno,
      redutorAj, redutorAjLabel,
      baseAposAj, redutorSocial, redutorSocialLabel, redutorSocialNominal, redutorSocialCor,
      baseIBSCBS, cbsDev, ibsDev, totalDev,
      contribuinteCheck,
      pjMercReforma, pjAtivoReforma, pjReformaSelected,
      cbsPJ, ibsPJ,
    };
  }, [
    ibsAno, imovelAte2026, redutorTipo, valorRefIBS, correcaoPctEfetiva,
    venda, custo, custoPJ, tipoImovel, naturezaPJ,
    qtdeImoveis, receitaAnualPF, limite240kCor, limite288kCor,
    redutorImóvelNovoCor, redutorLoteCor, fatorRedutoresLc214,
  ]);

  // ===== ABAS =====
  const TABS: { id: TabId; label: string }[] = [
    { id: 'simulador', label: 'Simulador' },
    { id: 'ibs_cbs', label: 'IBS/CBS — Reforma' },
    { id: 'tabelas', label: 'Tabelas de redução' },
    { id: 'comparativo', label: 'Comparativo PF vs PJ' },
    { id: 'metodologia', label: 'Fórmulas e base legal' },
  ];

  // ===== RENDER ABAS =====

  function renderSimulador() {
    const r = resultPF;
    const pj = resultPJ;
    const gcBruto = r?.gcBruto ?? 0;

    return (
      <div className="space-y-4">
        {/* Dados da operação */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Dados da operação</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <NumberField label="Valor de alienação (R$)" value={venda} onChange={setVenda} />
            <NumberField label="Custo de aquisição (R$)" value={custo} onChange={setCusto} />
            <NumberField label="Despesas dedutíveis (R$)" value={despesas} onChange={setDespesas} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <DateField label="Data de aquisição" value={dtAq} onChange={setDtAq} />
            <DateField label="Data de alienação" value={dtAl} onChange={setDtAl} />
            <SelectField
              label="Tipo do imóvel"
              value={tipoImovel}
              onChange={v => setTipoImovel(v as TipoImovel)}
            >
              <option value="imovel_construido">Imóvel residencial construído</option>
              <option value="lote_residencial">Lote residencial</option>
              <option value="imovel_rural">Imóvel rural (VTN — ver nota)</option>
            </SelectField>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SelectField label="Natureza do imóvel na PJ" value={naturezaPJ} onChange={v => setNaturezaPJ(v as NaturezaPJ)}>
              <option value="ativo">Ativo imobilizado</option>
              <option value="mercadoria">Mercadoria / Estoque (atividade imobiliária)</option>
            </SelectField>
            <NumberField label="Custo contábil PJ (R$)" value={custoPJ} onChange={setCustoPJ} />
            <SelectField label="Tributos PJ a considerar" value={incluirPisCofins ? 'sim' : 'nao'} onChange={v => setIncluirPisCofins(v === 'sim')}>
              <option value="sim">IRPJ + CSLL + PIS + COFINS</option>
              <option value="nao">Somente IRPJ + CSLL</option>
            </SelectField>
          </div>
          {tipoImovel === 'imovel_rural' && (
            <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-200">
              <strong>Imóvel rural:</strong> O ganho de capital de terra nua adquirida após 01/01/1997 é calculado pela diferença entre os VTNs (art. 19 da Lei nº 9.393/1996). Os redutores art. 18 e FR1/FR2 não se aplicam à terra nua. O simulador exibe os resultados pelo regime geral — para imóvel rural completo, consulte a calculadora específica.
            </div>
          )}
        </div>

        {/* Correção monetária IPCA — informativo */}
        {ipcaDesdeAquisicao && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-xs text-blue-800 dark:text-blue-200">
            <strong>Correção IPCA automática (BCB SGS 433):</strong>{' '}
            {ipcaDesdeAquisicao.parcial
              ? `Dados disponíveis a partir de ${ipcaDesdeAquisicao.primeiraMesDisponivel}. Correção parcial: ${fmtPct(ipcaDesdeAquisicao.pctAcumulado)} (${ipcaDesdeAquisicao.mesesAplicados} meses).`
              : `IPCA acumulado desde a data de aquisição: ${fmtPct(ipcaDesdeAquisicao.pctAcumulado)} (${ipcaDesdeAquisicao.mesesAplicados} meses).`}
            {' '}Este percentual é sugerido como correção monetária na aba IBS/CBS, mas pode ser ajustado manualmente.
            {ipcaLoading && ' (carregando série...)'}
          </div>
        )}

        {/* Resultado PF */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Resultado — Pessoa Física (IRPF sobre ganho de capital)</h3>
          {!r || gcBruto <= 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400 italic">
              {gcBruto <= 0 ? `Ganho bruto negativo (${fmtBRL(gcBruto)}) — sem tributação de ganho de capital.` : 'Preencha os dados da operação.'}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                <Metric label="Ganho bruto" value={fmtBRL(r.gcBruto)} />
                <Metric label={`Redução art. 18 L. 7.713 (${r.red18pct}%)`} value={r.red18pct > 0 ? fmtBRL(r.gcBruto - r.gcApos18) : '0% — aquisição após 1988'} color="green" />
                <Metric label={`FR1 × FR2 (L. 11.196/2005)`} value={`${r.fr1.toFixed(4)} × ${r.fr2.toFixed(4)} = ${((1 - r.fr1 * r.fr2) * 100).toFixed(1)}% red.`} color="green" />
                <Metric label="Ganho tributável" value={fmtBRL(r.gcTrib)} color="blue" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                <Metric label="IRPF faixa 15%" value={fmtBRL(r.ir.f1)} />
                <Metric label="IRPF faixa 17,5%" value={fmtBRL(r.ir.f2)} />
                <Metric label="IRPF faixa 20%" value={fmtBRL(r.ir.f3)} />
                <Metric label="IRPF faixa 22,5%" value={fmtBRL(r.ir.f4)} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Metric label="Total IRPF" value={fmtBRL(r.ir.total)} color="red" />
                <Metric label="Alíquota efetiva s/ ganho bruto" value={fmtPct(r.gcBruto > 0 ? (r.ir.total / r.gcBruto) * 100 : 0)} color="red" />
                <Metric label="Carga s/ valor de venda" value={fmtPct((r.ir.total / venda) * 100)} />
                <Metric label="Líquido PF pós-IR" value={fmtBRL(venda - r.ir.total - custo - despesas)} color="green" />
              </div>
            </>
          )}
        </div>

        {/* Resultado PJ */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Resultado — Pessoa Jurídica (Lucro Presumido)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <Metric label={`Base: ${naturezaPJ === 'mercadoria' ? 'receita bruta' : 'ganho de capital'}`} value={naturezaPJ === 'mercadoria' ? fmtBRL(venda) : fmtBRL(pj.ativo.ganho)} />
            <Metric label="Lucro presumido (IRPJ)" value={fmtBRL(pj.selected.baseirpj)} />
            <Metric label="IRPJ (15% + adicional)" value={fmtBRL(pj.selected.irpj)} color="red" />
            <Metric label="CSLL" value={fmtBRL(pj.selected.csll)} color="red" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <Metric label="PIS (0,65%)" value={incluirPisCofins ? fmtBRL(pj.selected.pis) : 'Não incluído'} />
            <Metric label="COFINS (3%)" value={incluirPisCofins ? fmtBRL(pj.selected.cofins) : 'Não incluído'} />
            <Metric label="Total tributos PJ" value={fmtBRL(pj.selected.total)} color="red" />
            <Metric label="Alíquota efetiva s/ venda" value={fmtPct((pj.selected.total / venda) * 100)} color="red" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Metric label="Carga s/ valor de venda" value={fmtPct((pj.selected.total / venda) * 100)} />
            <Metric label="Líquido PJ pós-tributos" value={fmtBRL(venda - pj.selected.total - custoPJ)} color="green" />
            {r && r.gcBruto > 0 && (
              <>
                <Metric
                  label="Diferença PJ vs PF"
                  value={fmtBRL(Math.abs(r.ir.total - pj.selected.total))}
                  color={r.ir.total > pj.selected.total ? 'green' : 'red'}
                />
                <Metric
                  label="Regime mais vantajoso"
                  value={r.ir.total > pj.selected.total
                    ? `PJ — economia de ${fmtPct(((r.ir.total - pj.selected.total) / r.ir.total) * 100)}`
                    : r.ir.total < pj.selected.total
                    ? `PF — economia de ${fmtPct(((pj.selected.total - r.ir.total) / pj.selected.total) * 100)}`
                    : 'Equivalente'}
                  color={r.ir.total > pj.selected.total ? 'blue' : 'green'}
                />
              </>
            )}
          </div>
        </div>

        {/* Memória de cálculo */}
        {r && r.gcBruto > 0 && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Memória de cálculo</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 px-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Item</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">PF — IRPF/GC</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">PJ LP — ativo imob.</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">PJ LP — mercadoria</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {[
                    ['Valor de alienação', fmtBRL(venda), fmtBRL(venda), fmtBRL(venda)],
                    ['(-) Custo / custo contábil', fmtBRL(custo + despesas), `${fmtBRL(custoPJ)} (contábil)`, `${fmtBRL(custoPJ)} (contábil)`],
                    ['= Ganho bruto', fmtBRL(r.gcBruto), fmtBRL(venda) + ' (receita)', fmtBRL(venda - custoPJ) + ' (ganho cap.)'],
                    ['(-) Redução art. 18 L. 7.713', r.red18pct > 0 ? `−${r.red18pct}% → ${fmtBRL(r.gcApos18)}` : 'N/A (aq. após 1988)', '—', '—'],
                    ['(×) FR1', `FR1 = ${r.fr1.toFixed(6)}`, '—', '—'],
                    ['(×) FR2', `FR2 = ${r.fr2.toFixed(6)}`, '—', '—'],
                    ['= Base tributável', fmtBRL(r.gcTrib), `${fmtBRL(pj.merc.baseirpj)} (IRPJ)`, `${fmtBRL(venda - custoPJ)} (ganho)`],
                    ['IRPJ / IRPF (15–22,5%)', fmtBRL(r.ir.total), fmtBRL(pj.merc.irpj), fmtBRL(pj.ativo.irpj)],
                    ['CSLL', '—', fmtBRL(pj.merc.csll), fmtBRL(pj.ativo.csll)],
                    ['PIS (0,65%)', '—', incluirPisCofins ? fmtBRL(pj.merc.pis) : 'Não incluído', 'Não incide'],
                    ['COFINS (3%)', '—', incluirPisCofins ? fmtBRL(pj.merc.cofins) : 'Não incluído', 'Não incide'],
                    ['TOTAL tributos', fmtBRL(r.ir.total), fmtBRL(pj.merc.total), fmtBRL(pj.ativo.total)],
                    ['Carga s/ venda', fmtPct((r.ir.total / venda) * 100), fmtPct((pj.merc.total / venda) * 100), fmtPct((pj.ativo.total / venda) * 100)],
                  ].map(([item, pf, pjA, pjM], i) => (
                    <tr key={i} className={i % 2 === 0 ? '' : 'bg-gray-50 dark:bg-gray-800/50'}>
                      <td className="py-2 px-3 font-medium text-gray-700 dark:text-gray-300">{item}</td>
                      <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{pf}</td>
                      <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{pjA}</td>
                      <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{pjM}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderIBSCBS() {
    const ib = ibsResult;
    const r = resultPF;
    const irpfTotal = r?.ir.total ?? 0;

    const pjAntes = resultPJ.selected;
    const pjDepois = ib.pjReformaSelected;

    const pfAntes = irpfTotal;
    const pfDepois = irpfTotal + ib.totalDev;

    const cenarios = [
      { label: 'PF — antes da reforma', v: pfAntes },
      { label: 'PF — após reforma (IRPF + IBS/CBS)', v: pfDepois },
      { label: `PJ LP — antes da reforma`, v: pjAntes.total },
      { label: `PJ LP — após reforma`, v: pjDepois.total },
    ].sort((a, b) => a.v - b.v);

    return (
      <div className="space-y-4">
        {/* Parâmetros IBS/CBS */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Parâmetros IBS/CBS — LC nº 214/2025</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <SelectField label="Ano da alienação (transição)" value={String(ibsAno)} onChange={v => setIbsAno(Number(v))}>
              <option value="2026">2026 — alíquota teste 1% (sem impacto real PF)</option>
              <option value="2027">2027 — CBS plena 4,5%; IBS = 0%</option>
              <option value="2028">2028 — CBS plena 4,5%; IBS = 0%</option>
              <option value="2029">2029 — CBS 4,5% + IBS 0,95%</option>
              <option value="2030">2030 — CBS 4,5% + IBS 1,9%</option>
              <option value="2031">2031 — CBS 4,5% + IBS 2,85%</option>
              <option value="2032">2032 — CBS 4,5% + IBS 3,8%</option>
              <option value="2033">2033+ — CBS 4,5% + IBS 9,5% (plenos)</option>
            </SelectField>
            <SelectField label="Imóvel adquirido até 31/12/2026?" value={imovelAte2026 ? 'sim' : 'nao'} onChange={v => setImovelAte2026(v === 'sim')}>
              <option value="sim">Sim — redutor de ajuste amplo disponível</option>
              <option value="nao">Não — apenas custo de aquisição como redutor</option>
            </SelectField>
          </div>

          {imovelAte2026 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <SelectField label="Redutor de ajuste a utilizar" value={redutorTipo} onChange={v => setRedutorTipo(v as RedutorTipo)}>
                <option value="referencia">Valor de referência (quando divulgado pela RFB)</option>
                <option value="corrigido">Custo de aquisição corrigido pelo IPCA</option>
              </SelectField>
              {redutorTipo === 'referencia' && (
                <NumberField label="Valor de referência do imóvel (RFB) (R$)" value={valorRefIBS} onChange={setValorRefIBS} placeholder="Aguardando divulgação RFB" />
              )}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Correção monetária do custo (% acumulado)
                  {ipcaDesdeAquisicao && <span className="ml-1 text-blue-500">— IPCA auto: {fmtPct(ipcaDesdeAquisicao.pctAcumulado)}{ipcaDesdeAquisicao.parcial ? ' (parcial)' : ''}</span>}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={correcaoManualPct !== null ? correcaoManualPct : (ipcaDesdeAquisicao?.pctAcumulado ?? 0)}
                  onChange={e => setCorrecaoManualPct(parseFloat(e.target.value) || 0)}
                  placeholder="Ex.: 150 para +150%"
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {correcaoManualPct !== null && (
                  <button
                    className="text-xs text-blue-500 hover:underline mt-1"
                    onClick={() => setCorrecaoManualPct(null)}
                  >
                    Usar IPCA automático
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Seção: Contribuinte PF IBS/CBS */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Situação da PF como contribuinte IBS/CBS (LC nº 214/2025)</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Informe o total de imóveis e a receita anual de locação/outras fontes para verificar se a PF é contribuinte. Se não for, IBS/CBS não incide sobre a venda.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <NumberField label="Quantidade total de imóveis (PF)" value={qtdeImoveis} onChange={setQtdeImoveis} min={0} />
            <NumberField label="Receita anual total de locação (R$)" value={receitaAnualPF} onChange={setReceitaAnualPF} placeholder="Receita bruta anual (aluguel + outras)" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <Metric label="Limite 240k (corrigido IPCA)" value={fmtBRL(limite240kCor)} color="blue" />
            <Metric label="Limite 288k (corrigido IPCA)" value={fmtBRL(limite288kCor)} color="blue" />
            <div className={`rounded-lg p-3 ${ibsResult.contribuinteCheck.contribuinte ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'}`}>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Resultado</div>
              <Badge color={ibsResult.contribuinteCheck.contribuinte ? 'red' : 'green'}>
                {ibsResult.contribuinteCheck.contribuinte ? 'Contribuinte IBS/CBS' : 'Não contribuinte IBS/CBS'}
              </Badge>
              <div className="text-xs mt-2 text-gray-600 dark:text-gray-400">{ibsResult.contribuinteCheck.motivo}</div>
            </div>
          </div>
          {!ibsResult.contribuinteCheck.contribuinte && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-xs text-green-800 dark:text-green-200">
              <strong>Impacto:</strong> Por não ser contribuinte de IBS/CBS, o IBS e a CBS não incidem sobre esta venda no cenário PF. Os tributos ficam restritos ao IRPF sobre o ganho de capital.
            </div>
          )}
        </div>

        {/* Alíquotas vigentes */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Alíquotas IBS/CBS aplicáveis em {ibsAno}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Metric label="CBS plena → c/ redução 50%" value={`9% → 4,5%`} />
            <Metric label="IBS pleno → c/ redução 50%" value={`19% → 9,5%`} />
            <Metric label="Total pleno → c/ redução 50%" value={`28% → 14%`} />
            <Metric
              label={`Alíquota efetiva em ${ibsAno}`}
              value={ibsResult.trans.teste
                ? '~1% (teste operacional — sem impacto real)'
                : `CBS ${fmtPct(ibsResult.cbsAno, 4)} + IBS ${fmtPct(ibsResult.ibsAno, 4)} = ${fmtPct(ibsResult.totalAno, 4)}`}
              color="blue"
            />
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">{ibsResult.trans.obs}</div>
        </div>

        {/* Redutores corrigidos */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Redutores sociais — art. 259, LC nº 214/2025 (corrigidos pelo IPCA)</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Corrigidos mensalmente a partir de 16/01/2025 pelo IPCA (BCB SGS 433). Fator acumulado atual: {fmtPct((fatorRedutoresLc214 - 1) * 100)} desde jan/2025.
            {ipcaLoading && <span className="ml-1 italic">(carregando...)</span>}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Imóvel residencial construído</div>
              <div className="text-base font-semibold text-blue-600 dark:text-blue-400">{fmtBRL(redutorImóvelNovoCor)}</div>
              <div className="text-xs text-gray-400 mt-1">Nominal: {fmtBRL(REDUTOR_IMOVEL_NOVO_NOMINAL)}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Lote residencial</div>
              <div className="text-base font-semibold text-blue-600 dark:text-blue-400">{fmtBRL(redutorLoteCor)}</div>
              <div className="text-xs text-gray-400 mt-1">Nominal: {fmtBRL(REDUTOR_LOTE_NOMINAL)}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Redutor aplicado (tipo selecionado)</div>
              <div className="text-base font-semibold text-green-600 dark:text-green-400">
                {tipoImovel === 'imovel_construido' ? fmtBRL(redutorImóvelNovoCor)
                  : tipoImovel === 'lote_residencial' ? fmtBRL(redutorLoteCor)
                  : '—'}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {tipoImovel === 'imovel_rural' ? 'Não aplicável para imóvel rural' : `Tipo: ${tipoImovel === 'imovel_construido' ? 'imóvel construído' : 'lote residencial'}`}
              </div>
            </div>
          </div>
        </div>

        {/* Redutor de ajuste e base IBS/CBS */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Redutor de ajuste e base de cálculo IBS/CBS</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Metric label="Valor de alienação" value={fmtBRL(venda)} />
            <Metric label="Redutor de ajuste" value={fmtBRL(ib.redutorAj)} color="green" />
            <Metric
              label={`Redutor social (${tipoImovel === 'imovel_construido' ? 'imóvel novo' : tipoImovel === 'lote_residencial' ? 'lote resid.' : 'N/A'})`}
              value={tipoImovel !== 'imovel_rural' ? fmtBRL(ib.redutorSocial) : '—'}
              color="green"
            />
            <Metric label="Base IBS/CBS após redutores" value={fmtBRL(ib.baseIBSCBS)} color="blue" />
          </div>
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs text-gray-600 dark:text-gray-400 font-mono">
            <strong>Redutor de ajuste:</strong> {ib.redutorAjLabel}
            <br />
            <strong>Redutor social:</strong> {ib.redutorSocialLabel}
            <br />
            <strong>Base tributável:</strong> max(0, {fmtBRL(venda)} − {fmtBRL(ib.redutorAj)}{tipoImovel !== 'imovel_rural' ? ` − ${fmtBRL(ib.redutorSocial)}` : ''}) = {fmtBRL(ib.baseIBSCBS)}
          </div>
        </div>

        {/* Tributos IBS/CBS */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Tributos IBS/CBS devidos
            {!ibsResult.contribuinteCheck.contribuinte && (
              <span className="ml-2"><Badge color="green">PF não contribuinte — sem IBS/CBS</Badge></span>
            )}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Metric label="CBS devida (PF)" value={fmtBRL(ib.cbsDev)} color="red" />
            <Metric label="IBS devido (PF)" value={fmtBRL(ib.ibsDev)} color="red" />
            <Metric label="Total IBS+CBS (PF)" value={fmtBRL(ib.totalDev)} color="red" />
            <Metric label="Carga IBS/CBS s/ venda" value={venda > 0 ? fmtPct((ib.totalDev / venda) * 100) : '—'} />
          </div>
        </div>

        {/* Comparativo quádruplo */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Comparativo total — PF e PJ antes e depois da Reforma</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Carga tributária total nos quatro cenários. O ano de transição selecionado determina as alíquotas IBS/CBS aplicadas.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <Metric label="PF — antes da reforma" value={fmtBRL(pfAntes)} />
            <Metric label="PF — após reforma (IRPF + IBS/CBS)" value={fmtBRL(pfDepois)} color="red" />
            <Metric label={`PJ LP (${naturezaPJ}) — antes`} value={fmtBRL(pjAntes.total)} />
            <Metric label={`PJ LP — após reforma`} value={fmtBRL(pjDepois.total)} color="red" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tributo</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">PF — antes</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">PF — após</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">PJ LP — antes</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">PJ LP — após</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {[
                  ['Valor de alienação', fmtBRL(venda), fmtBRL(venda), fmtBRL(venda), fmtBRL(venda)],
                  ['IRPF / IRPJ', fmtBRL(irpfTotal), fmtBRL(irpfTotal), fmtBRL(pjAntes.irpj), fmtBRL(pjDepois.irpj)],
                  ['CSLL', '—', '—', fmtBRL(pjAntes.csll), fmtBRL(pjDepois.csll)],
                  ['PIS (0,65%)', '—', 'extinto', fmtBRL(pjAntes.pis), 'extinto'],
                  ['COFINS (3%)', '—', 'extinto', fmtBRL(pjAntes.cofins), 'extinto'],
                  ['CBS', '—', fmtBRL(ib.cbsDev), '—', fmtBRL(ib.pjReformaSelected.cbs ?? 0)],
                  ['IBS', '—', fmtBRL(ib.ibsDev), '—', fmtBRL(ib.pjReformaSelected.ibs ?? 0)],
                  ['TOTAL tributos', fmtBRL(pfAntes), fmtBRL(pfDepois), fmtBRL(pjAntes.total), fmtBRL(pjDepois.total)],
                  ['Carga s/ venda', fmtPct((pfAntes / venda) * 100), fmtPct((pfDepois / venda) * 100), fmtPct((pjAntes.total / venda) * 100), fmtPct((pjDepois.total / venda) * 100)],
                ].map(([item, ...cols], i) => (
                  <tr key={i} className={i % 2 === 0 ? '' : 'bg-gray-50 dark:bg-gray-800/50'}>
                    <td className="py-2 px-3 font-medium text-gray-700 dark:text-gray-300">{item}</td>
                    {cols.map((c, ci) => <td key={ci} className="py-2 px-3 text-gray-600 dark:text-gray-400">{c}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Ranking — menor carga tributária</div>
            <div className="text-xs text-gray-700 dark:text-gray-300 space-x-4">
              {cenarios.map((c, i) => (
                <span key={i} className="mr-4">
                  <strong>{i + 1}º</strong> {c.label} — {fmtBRL(c.v)} ({fmtPct((c.v / venda) * 100)} s/ venda)
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Nota legal */}
        <div className="bg-white dark:bg-gray-900 border-l-4 border-amber-400 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-2">Atenção — vigência e aspectos em aberto</h3>
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-2">
            <p><strong>(1) Cronograma:</strong> 2026 = alíquota teste (sem impacto real). 2027–2028 = CBS plena (4,5%); IBS não vigente. 2029+ = IBS gradual. 2033+ = pleno (CBS 4,5% + IBS 9,5% = 14%).</p>
            <p><strong>(2) Valor de referência:</strong> Aguardando regulamentação da RFB. Usar zero enquanto não divulgado.</p>
            <p><strong>(3) Redutores sociais:</strong> R$ 100.000 (imóvel residencial construído) e R$ 30.000 (lote residencial), corrigidos mensalmente pelo IPCA desde 16/01/2025 (art. 259 LC 214/2025).</p>
            <p><strong>(4) Contribuinte PF:</strong> Critérios: mais de 3 imóveis E receita &gt; R$ 240k (corrigido), OU receita &gt; R$ 288k (corrigido), independente do número de imóveis.</p>
          </div>
        </div>
      </div>
    );
  }

  function renderTabelas() {
    return (
      <div className="space-y-4">
        {/* Art. 18 */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Art. 18, Lei nº 7.713/1988 — reduções para bens adquiridos até 31/12/1988</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ano de aquisição</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Redução (%)</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Base remanescente</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {ART18_TABELA.map(([ano, red], i) => (
                  <tr key={i} className={i % 2 === 0 ? '' : 'bg-gray-50 dark:bg-gray-800/50'}>
                    <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{ano <= 1969 ? 'Até 1969' : ano}</td>
                    <td className="py-2 px-3"><Badge color={red === 100 ? 'green' : 'blue'}>{red}%</Badge></td>
                    <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{100 - red}%</td>
                    <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{red === 100 ? 'Isento' : 'Tributação parcial'}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  <td className="py-2 px-3 text-gray-700 dark:text-gray-300">A partir de 1989</td>
                  <td className="py-2 px-3"><Badge color="gray">0%</Badge></td>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400">100%</td>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400">Sem redução — aplica-se apenas FR1/FR2</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FR1 / FR2 */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Art. 40, Lei nº 11.196/2005 — fatores de redução FR1 e FR2</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <SectionTitle>FR1 — período da aquisição até dez/2005</SectionTitle>
              <FormulaBox>{`FR1 = 1 / 1,0060^m1\nm1 = (2005×12+12) − (ano_aq×12 + mes_aq)\nAquisição a partir de jan/2006 → FR1 = 1`}</FormulaBox>
              <table className="w-full text-xs">
                <thead><tr className="border-b border-gray-200 dark:border-gray-700"><th className="text-left py-1 px-2 text-gray-500 uppercase tracking-wide">Anos antes dez/2005</th><th className="text-left py-1 px-2 text-gray-500 uppercase tracking-wide">FR1</th><th className="text-left py-1 px-2 text-gray-500 uppercase tracking-wide">Redução</th></tr></thead>
                <tbody>{[1,2,3,5,7,10,15,20,25,30,35].map(a => { const m1 = a * 12; const fr = 1/Math.pow(1.006,m1); return (<tr key={a}><td className="py-1 px-2 text-gray-600 dark:text-gray-400">{a} ano{a>1?'s':''}</td><td className="py-1 px-2 text-gray-600 dark:text-gray-400">{fr.toFixed(4)}</td><td className="py-1 px-2 text-gray-600 dark:text-gray-400">{fmtPct((1-fr)*100)}</td></tr>); })}</tbody>
              </table>
            </div>
            <div>
              <SectionTitle>FR2 — período jan/2006 até alienação (inclusive)</SectionTitle>
              <FormulaBox>{`FR2 = 1 / 1,0035^m2\nm2 = (ano_al×12 + mes_al) − (2005×12+12) + 1\nAlienação até dez/2005 → FR2 = 1`}</FormulaBox>
              <table className="w-full text-xs">
                <thead><tr className="border-b border-gray-200 dark:border-gray-700"><th className="text-left py-1 px-2 text-gray-500 uppercase tracking-wide">Anos após jan/2006</th><th className="text-left py-1 px-2 text-gray-500 uppercase tracking-wide">FR2</th><th className="text-left py-1 px-2 text-gray-500 uppercase tracking-wide">Redução</th></tr></thead>
                <tbody>{[1,2,3,5,7,10,15,20,25].map(a => { const anoAl=2006+a; const m2=(anoAl*12+1)-(2005*12+12)+1; const fr=1/Math.pow(1.0035,m2); return (<tr key={a}><td className="py-1 px-2 text-gray-600 dark:text-gray-400">{a} ano{a>1?'s':''} (jan/{anoAl})</td><td className="py-1 px-2 text-gray-600 dark:text-gray-400">{fr.toFixed(4)}</td><td className="py-1 px-2 text-gray-600 dark:text-gray-400">{fmtPct((1-fr)*100)}</td></tr>); })}</tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Alíquotas progressivas */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Alíquotas progressivas — Lei nº 13.259/2016</h3>
          <table className="w-full text-xs">
            <thead><tr className="border-b border-gray-200 dark:border-gray-700"><th className="text-left py-2 px-3 text-gray-500 uppercase tracking-wide">Faixa do ganho tributável</th><th className="text-left py-2 px-3 text-gray-500 uppercase tracking-wide">Alíquota</th><th className="text-left py-2 px-3 text-gray-500 uppercase tracking-wide">Tributo máximo</th></tr></thead>
            <tbody>
              <tr><td className="py-2 px-3 text-gray-700 dark:text-gray-300">Até R$ 5.000.000,00</td><td className="py-2 px-3"><Badge color="green">15%</Badge></td><td className="py-2 px-3 text-gray-600 dark:text-gray-400">R$ 750.000,00</td></tr>
              <tr className="bg-gray-50 dark:bg-gray-800/50"><td className="py-2 px-3 text-gray-700 dark:text-gray-300">De R$ 5.000.000,01 a R$ 10.000.000,00</td><td className="py-2 px-3"><Badge color="blue">17,5%</Badge></td><td className="py-2 px-3 text-gray-600 dark:text-gray-400">R$ 875.000,00</td></tr>
              <tr><td className="py-2 px-3 text-gray-700 dark:text-gray-300">De R$ 10.000.000,01 a R$ 30.000.000,00</td><td className="py-2 px-3"><Badge color="amber">20%</Badge></td><td className="py-2 px-3 text-gray-600 dark:text-gray-400">R$ 4.000.000,00</td></tr>
              <tr className="bg-gray-50 dark:bg-gray-800/50"><td className="py-2 px-3 text-gray-700 dark:text-gray-300">Acima de R$ 30.000.000,00</td><td className="py-2 px-3"><Badge color="red">22,5%</Badge></td><td className="py-2 px-3 text-gray-600 dark:text-gray-400">Sobre o excedente</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderComparativo() {
    const pj = resultPJ;
    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Quadro comparativo — PF × PJ Lucro Presumido</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 px-3 text-gray-500 uppercase tracking-wide">Tributo / Base</th>
                <th className="text-left py-2 px-3 text-gray-500 uppercase tracking-wide">PF — ganho capital</th>
                <th className="text-left py-2 px-3 text-gray-500 uppercase tracking-wide">PJ LP — mercadoria</th>
                <th className="text-left py-2 px-3 text-gray-500 uppercase tracking-wide">PJ LP — ativo imob.</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {[
                  ['Base de incidência', 'Ganho de capital líquido (após reduções)', 'Receita bruta de venda', 'Ganho de capital (venda − custo contábil)'],
                  ['Percentual de presunção', 'N/A', '8% (IRPJ) / 12% (CSLL)', '100% do ganho (IRPJ/CSLL direto)'],
                  ['IRPJ / IRPF', '15% a 22,5% progressivo (L. 13.259/16)', '15% + adicional 10% s/ LP > R$ 20k/mês', '15% + adicional 10% s/ GC > R$ 60k/trim.'],
                  ['CSLL', 'Não incide', '9% sobre presunção (12%)', '9% sobre 100% do ganho'],
                  ['PIS', 'Não incide', '0,65% sobre receita', 'Não incide (ganho de capital)'],
                  ['COFINS', 'Não incide', '3% sobre receita', 'Não incide (ganho de capital)'],
                  ['Reduções / Benefícios', 'Art. 18 L. 7.713 + FR1/FR2 L. 11.196', 'Nenhuma redução de base', 'Nenhuma redução de base'],
                  ['Isenções aplicáveis', 'Imóvel único < R$440k; reaplicação 180d; GC < R$20k/mês', 'Não se aplicam', 'Não se aplicam'],
                ].map(([item, pf_, pjM, pjA], i) => (
                  <tr key={i} className={i % 2 === 0 ? '' : 'bg-gray-50 dark:bg-gray-800/50'}>
                    <td className="py-2 px-3 font-medium text-gray-700 dark:text-gray-300">{item}</td>
                    <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{pf_}</td>
                    <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{pjM}</td>
                    <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{pjA}</td>
                  </tr>
                ))}
                <tr>
                  <td className="py-2 px-3 font-bold text-gray-900 dark:text-gray-100">TOTAL calculado (valores informados)</td>
                  <td className="py-2 px-3 font-bold text-red-600 dark:text-red-400">{fmtBRL(resultPF?.ir.total ?? 0)}</td>
                  <td className="py-2 px-3 font-bold text-red-600 dark:text-red-400">{fmtBRL(pj.merc.total)}</td>
                  <td className="py-2 px-3 font-bold text-red-600 dark:text-red-400">{fmtBRL(pj.ativo.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  function renderMetodologia() {
    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Base legal e fórmulas aplicadas</h3>

          <SectionTitle>1. Ganho de capital bruto</SectionTitle>
          <FormulaBox>GC = Valor de alienação − Custo de aquisição − Despesas dedutíveis</FormulaBox>

          <SectionTitle>2. Redução art. 18, Lei nº 7.713/1988</SectionTitle>
          <FormulaBox>{`GC_reduzido = GC × (1 − percentual_art18 / 100)\nPercentual: de 5% (aq. 1988) a 100% (aq. até 1969)\nAplicável apenas a imóveis adquiridos até 31/12/1988`}</FormulaBox>

          <SectionTitle>3. Fator de Redução 1 — FR1 (art. 40, Lei nº 11.196/2005)</SectionTitle>
          <FormulaBox>{`FR1 = 1 / (1,0060 ^ m1)\nm1 = (2005×12+12) − (ano_aq×12 + mes_aq)\nSe aquisição a partir de jan/2006: FR1 = 1`}</FormulaBox>

          <SectionTitle>4. Fator de Redução 2 — FR2 (art. 40, Lei nº 11.196/2005)</SectionTitle>
          <FormulaBox>{`FR2 = 1 / (1,0035 ^ m2)\nm2 = (ano_al×12 + mes_al) − (2005×12+12) + 1\nSe alienação até dez/2005: FR2 = 1`}</FormulaBox>

          <SectionTitle>5. Ganho tributável final (PF)</SectionTitle>
          <FormulaBox>GC_tributável = GC_reduzido (art.18) × FR1 × FR2</FormulaBox>

          <SectionTitle>6. IRPF progressivo — Lei nº 13.259/2016</SectionTitle>
          <FormulaBox>{`Faixa 1: min(GC_trib, 5.000.000) × 15%\nFaixa 2: max(0, min(GC_trib − 5.000.000, 5.000.000)) × 17,5%\nFaixa 3: max(0, min(GC_trib − 10.000.000, 20.000.000)) × 20%\nFaixa 4: max(0, GC_trib − 30.000.000) × 22,5%`}</FormulaBox>

          <SectionTitle>7. PJ Lucro Presumido — mercadoria (atividade imobiliária)</SectionTitle>
          <FormulaBox>{`Base IRPJ = Receita × 8%\nBase CSLL = Receita × 12%\nAdicional = max(0, Base_IRPJ − 60.000) × 10%\nIRPJ = Base_IRPJ × 15% + Adicional\nCSLL = Base_CSLL × 9%\nPIS = Receita × 0,65%\nCOFINS = Receita × 3%`}</FormulaBox>

          <SectionTitle>8. PJ Lucro Presumido — ativo imobilizado</SectionTitle>
          <FormulaBox>{`Ganho PJ = Valor venda − Custo contábil\nBase IRPJ = Ganho PJ (100%)\nAdicional = max(0, Ganho − 60.000) × 10%\nIRPJ = Ganho × 15% + Adicional\nCSLL = Ganho × 9%\nPIS/COFINS: não incidem sobre ganho de capital`}</FormulaBox>

          <SectionTitle>9. IBS e CBS — LC nº 214/2025 (Reforma Tributária)</SectionTitle>
          <FormulaBox>{`Alíquotas plenas: CBS 9% + IBS 19% = 28%\nRedução de 50%: alíquotas efetivas CBS 4,5% + IBS 9,5% = 14%\n\nReductor de ajuste (art. 35 LC 214/2025):\n  Imóvel adquirido até 31/12/2026:\n    Redutor = max(custo_corrigido_IPCA, valor_de_referência_RFB)\n  Imóvel adquirido após 31/12/2026:\n    Redutor = custo original\n\nReductor social (art. 259 LC 214/2025) — corrigido pelo IPCA desde jan/2025:\n  Imóvel residencial construído: R$ 100.000,00 × fator_IPCA\n  Lote residencial:              R$ 30.000,00 × fator_IPCA\n  Aplicado após o redutor de ajuste, limitado à base remanescente\n\nBase IBS/CBS = max(0, Venda − Redutor_ajuste − Redutor_social)\nCBS = Base × alíquota_CBS_efetiva_ano\nIBS = Base × alíquota_IBS_efetiva_ano`}</FormulaBox>

          <SectionTitle>10. Contribuinte PF — IBS/CBS (LC 214/2025)</SectionTitle>
          <FormulaBox>{`Limites nominais (corrigidos mensalmente pelo IPCA desde jan/2025):\n  Limite 240k: R$ 240.000 × fator_IPCA\n  Limite 288k: R$ 288.000 × fator_IPCA\n\nContribuinte se:\n  (a) receita > limite_288k (independente do nº de imóveis), OU\n  (b) nº imóveis > 3 E receita > limite_240k\n\nSe não contribuinte: IBS/CBS = 0 sobre a venda (PF)`}</FormulaBox>

          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p><strong>Base legal:</strong> Lei nº 7.713/1988 art. 18 | Lei nº 11.196/2005 art. 40 | Lei nº 13.259/2016 | RIR/2018 arts. 591–592 | LC nº 214/2025 arts. 35 e 259</p>
            <p><strong>Correção monetária:</strong> IPCA — Série BCB SGS 433 (variação mensal %)</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Cabeçalho */}
        <div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 font-serif">
            Calculadora — Ganho de Capital na Venda de Imóvel
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Comparativo PF (IRPF) × PJ Lucro Presumido — com Reforma Tributária (IBS/CBS)
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            {['Lei nº 7.713/1988 art. 18', 'Lei nº 11.196/2005 art. 40', 'Lei nº 13.259/2016', 'RIR/2018 arts. 591–592'].map(l => (
              <span key={l} className="inline-block text-xs font-medium px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200">{l}</span>
            ))}
            <span className="inline-block text-xs font-medium px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200">LC nº 214/2025 — IBS/CBS</span>
          </div>
        </div>

        {/* Abas */}
        <div className="flex flex-wrap gap-1 mb-5 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-fit px-3 py-2 text-xs font-medium rounded-md transition-all ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm border border-gray-200 dark:border-gray-700'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Conteúdo da aba ativa */}
        {activeTab === 'simulador' && renderSimulador()}
        {activeTab === 'ibs_cbs' && renderIBSCBS()}
        {activeTab === 'tabelas' && renderTabelas()}
        {activeTab === 'comparativo' && renderComparativo()}
        {activeTab === 'metodologia' && renderMetodologia()}
      </div>
    </Layout>
  );
}
