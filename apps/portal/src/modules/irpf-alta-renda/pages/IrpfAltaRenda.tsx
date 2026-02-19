import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../../../shared/components/layout/Layout';
import {
  irpfAltaRendaService,
  type IrpfAltaRendaRecord,
  type ExtractFromPdfResult,
} from '../services/irpf-alta-renda.service';
import type { DeclaracaoIrpfCompleta } from '@shared/core';
import { companyService } from '../../companies/services/company.service';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { MoneyInput } from '../../../shared/components/ui/MoneyInput';
import { useToast } from '../../../shared/components/ui/Toast';
import type {
  SimulateIrpfAltaRendaInput,
  SimulateAndSaveIrpfAltaRendaInput,
  IrpfAltaRendaSimulacaoResponse,
  RendimentoIsentoDividendo,
} from '@shared/core';

const CURRENT_YEAR = new Date().getFullYear();

const emptyDividendo: RendimentoIsentoDividendo = {
  nome_fonte: '',
  valor: 0,
  codigo: '09',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function IrpfAltaRenda() {
  const { success, error: showError, ToastContainer } = useToast();
  const { user } = useAuth();
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [items, setItems] = useState<IrpfAltaRendaRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IrpfAltaRendaSimulacaoResponse | null>(null);

  const [ano, setAno] = useState(CURRENT_YEAR);
  const [contribuinteNome, setContribuinteNome] = useState('');
  const [contribuinteCpf, setContribuinteCpf] = useState('');
  const [rendimentosTributaveis, setRendimentosTributaveis] = useState(0);
  const [dividendos, setDividendos] = useState<RendimentoIsentoDividendo[]>([{ ...emptyDividendo }]);
  const [lucrosAprovadosAte31dez2025, setLucrosAprovadosAte31dez2025] = useState(0);
  const [impostoJaPagoRetencao, setImpostoJaPagoRetencao] = useState(0);
  const [impostoJaPagoCarneLeao, setImpostoJaPagoCarneLeao] = useState(0);
  const [impostoJaPagoAplicacoes, setImpostoJaPagoAplicacoes] = useState(0);
  const [impostoAntecipadoDividendos, setImpostoAntecipadoDividendos] = useState(0);
  const [ganhoCapitalExcluido, setGanhoCapitalExcluido] = useState(0);
  const [rendimentosFiisExcluidos, setRendimentosFiisExcluidos] = useState(0);

  const [saveCompanyId, setSaveCompanyId] = useState('');
  const [saveTitle, setSaveTitle] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [decDbkLoading, setDecDbkLoading] = useState(false);
  const [decDbkFile, setDecDbkFile] = useState<File | null>(null);
  const [declaracaoExtraida, setDeclaracaoExtraida] = useState<DeclaracaoIrpfCompleta | null>(null);

  const loadData = useCallback(async () => {
    try {
      const listRes = await irpfAltaRendaService.list({ page: 1, limit: 50 });
      setItems(listRes.items);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao carregar');
    }
  }, [showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'super_admin') {
      companyService.list().then((list) => setCompanies(list.map((c) => ({ id: c.id, name: c.name })))).catch(() => setCompanies([]));
    } else if (user.company_id) {
      setCompanies([{ id: user.company_id, name: 'Sua empresa' }]);
    } else {
      setCompanies([]);
    }
  }, [user]);

  const bccCalculado =
    rendimentosTributaveis +
    dividendos.reduce((s, d) => s + (d.valor ?? 0), 0) -
    lucrosAprovadosAte31dez2025 -
    ganhoCapitalExcluido -
    rendimentosFiisExcluidos;

  const updateDividendo = (index: number, field: keyof RendimentoIsentoDividendo, value: string | number) => {
    setDividendos((prev) => {
      const next = [...prev];
      next[index] = { ...next[index]!, [field]: value };
      return next;
    });
  };

  const addDividendo = () => {
    setDividendos((prev) => [...prev, { ...emptyDividendo }]);
  };

  const removeDividendo = (index: number) => {
    if (dividendos.length <= 1) return;
    setDividendos((prev) => prev.filter((_, i) => i !== index));
  };

  const buildInput = (): SimulateIrpfAltaRendaInput => ({
    ano,
    dados: {
      contribuinte: { nome: contribuinteNome.trim(), cpf: contribuinteCpf.replace(/\D/g, '') },
      rendimentos_tributaveis: rendimentosTributaveis,
      rendimentos_isentos_dividendos: dividendos
        .filter((d) => d.valor > 0)
        .map((d) => ({
          nome_fonte: d.nome_fonte || undefined,
          cnpj_fonte: d.cnpj_fonte || undefined,
          valor: d.valor,
          codigo: (d.codigo as '09' | '13') || '09',
        })),
      lucros_aprovados_ate_31dez2025: lucrosAprovadosAte31dez2025,
      imposto_ja_pago_retencao_fonte: impostoJaPagoRetencao,
      imposto_ja_pago_carne_leao: impostoJaPagoCarneLeao,
      imposto_ja_pago_aplicacoes: impostoJaPagoAplicacoes,
      imposto_antecipado_dividendos: impostoAntecipadoDividendos,
      ganho_capital_excluido: ganhoCapitalExcluido,
      rendimentos_fiis_excluidos: rendimentosFiisExcluidos,
    },
  });

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contribuinteNome.trim() || !contribuinteCpf.trim()) {
      showError('Preencha nome e CPF do contribuinte.');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await irpfAltaRendaService.simulate(buildInput());
      setResult(res);
      success('Simulação concluída.');
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao simular');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contribuinteNome.trim() || !contribuinteCpf.trim()) {
      showError('Preencha nome e CPF do contribuinte.');
      return;
    }
    if (!saveCompanyId) {
      showError('Selecione uma empresa para salvar.');
      return;
    }
    setLoading(true);
    try {
      const input: SimulateAndSaveIrpfAltaRendaInput = {
        ...buildInput(),
        company_id: saveCompanyId,
        title: saveTitle.trim() || undefined,
      };
      await irpfAltaRendaService.simulateAndSave(input);
      success('Simulação salva.');
      setResult(null);
      setSaveTitle('');
      setSaveCompanyId('');
      loadData();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir esta simulação?')) return;
    try {
      await irpfAltaRendaService.delete(id);
      success('Excluído.');
      loadData();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao excluir');
    }
  };

  const applyExtractedData = (res: ExtractFromPdfResult) => {
    const d = res.dados;
    setAno(res.ano);
    setContribuinteNome(d.contribuinte.nome);
    setContribuinteCpf(d.contribuinte.cpf.replace(/\D/g, ''));
    setRendimentosTributaveis(d.rendimentos_tributaveis);

    const isentos09 = d.isentos_lucros_dividendos ?? [];
    const isentos13 = d.isentos_simples_nacional ?? [];
    const isentosLegado = d.rendimentos_isentos_dividendos ?? [];
    const fmt = (x: { nome_fonte?: string; fonte?: string; cnpj_fonte?: string; cnpj?: string; valor: number }, cod: '09' | '13') => {
      const nome = x.nome_fonte ?? x.fonte ?? '';
      const cnpj = x.cnpj_fonte ?? x.cnpj ?? '';
      const nomeFonte = nome && cnpj ? `${nome} (${cnpj})` : nome || cnpj;
      return { nome_fonte: nomeFonte, cnpj_fonte: cnpj || undefined, valor: x.valor ?? 0, codigo: cod };
    };
    const combined = isentos09.length > 0 || isentos13.length > 0
      ? [...isentos09.map((x) => fmt(x, '09')), ...isentos13.map((x) => fmt(x, '13'))]
      : isentosLegado.map((x) => ({ nome_fonte: x.nome_fonte ?? '', cnpj_fonte: x.cnpj_fonte, valor: x.valor ?? 0, codigo: (x.codigo as '09' | '13') || '09' }));
    setDividendos(combined.length > 0 ? combined : [{ ...emptyDividendo }]);
    setLucrosAprovadosAte31dez2025((d as { lucros_aprovados_ate_31dez2025?: number }).lucros_aprovados_ate_31dez2025 ?? 0);
    const dd = d as { imposto_ja_pago_retencao_fonte?: number; imposto_ja_pago_carne_leao?: number; imposto_ja_pago_aplicacoes?: number; imposto_antecipado_dividendos?: number; ganho_capital_excluido?: number; rendimentos_fiis_excluidos?: number };
    setImpostoJaPagoRetencao(dd.imposto_ja_pago_retencao_fonte ?? 0);
    setImpostoJaPagoCarneLeao(dd.imposto_ja_pago_carne_leao ?? 0);
    setImpostoJaPagoAplicacoes(dd.imposto_ja_pago_aplicacoes ?? 0);
    setImpostoAntecipadoDividendos(dd.imposto_antecipado_dividendos ?? 0);
    setGanhoCapitalExcluido(dd.ganho_capital_excluido ?? 0);
    setRendimentosFiisExcluidos(dd.rendimentos_fiis_excluidos ?? 0);

    setDeclaracaoExtraida(res.declaracao_completa ?? null);
  };

  const handlePdfUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile) {
      showError('Selecione um arquivo PDF.');
      return;
    }
    setPdfLoading(true);
    try {
      const result = await irpfAltaRendaService.extractFromPdf(pdfFile);
      applyExtractedData(result);
      success('Dados extraídos do PDF. Revise e clique em Simular.');
      setPdfFile(null);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao extrair dados do PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDecDbkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decDbkFile) {
      showError('Selecione um arquivo .dec ou .dbk.');
      return;
    }
    setDecDbkLoading(true);
    try {
      const result = await irpfAltaRendaService.importDeclaration(decDbkFile);
      applyExtractedData(result);
      success('Dados importados do arquivo .dec/.dbk. Revise e clique em Simular.');
      setDecDbkFile(null);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao importar arquivo .dec/.dbk');
    } finally {
      setDecDbkLoading(false);
    }
  };

  return (
    <Layout>
      <ToastContainer />
      <div className="w-full max-w-full space-y-6">
        <h1 className="text-2xl font-semibold text-slate-800">Tributação da alta renda/dividendos - IRPFM - Lei 15.270/2025</h1>
        <p className="text-slate-600">
          Análise da declaração do IR do contribuinte e simulação da nova tributação da alta renda, com indicação da alíquota aplicável e do valor a ser pago, comparando cenários antes e depois da nova legislação e apontando possíveis soluções para redução (ex.: constituição de holding, segregação da renda com cônjuge/filhos).
        </p>

        <Card title="Importar dados de um PDF (DAA / declaração IRPF)" className="w-full">
          <p className="text-sm text-slate-600 mb-4">
            Envie um PDF da declaração ou do DAA para preencher automaticamente nome, CPF, ano, rendimentos tributáveis e dividendos (extração via OpenAI). Revise os dados antes de simular.
          </p>
          <form onSubmit={handlePdfUpload} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px]">
              <label className="block text-sm font-medium text-slate-700 mb-1">Arquivo PDF</label>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-brand file:text-white file:font-medium"
              />
            </div>
            <Button type="submit" disabled={pdfLoading || !pdfFile}>
              {pdfLoading ? 'Extraindo...' : 'Extrair dados do PDF'}
            </Button>
          </form>
        </Card>

        <Card title="Importar .dec ou .dbk (Programa IRPF / e-CAC)" className="w-full">
          <p className="text-sm text-slate-600 mb-4">
            Envie o arquivo .dec (após transmitir) ou .dbk (backup em edição) obtido no Programa IRPF ou no e-CAC (Documentos e Arquivos → Cópia da Declaração).
          </p>
          <form onSubmit={handleDecDbkUpload} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px]">
              <label className="block text-sm font-medium text-slate-700 mb-1">Arquivo .dec ou .dbk</label>
              <input
                type="file"
                accept=".dec,.dbk"
                onChange={(e) => setDecDbkFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-brand file:text-white file:font-medium"
              />
            </div>
            <Button type="submit" disabled={decDbkLoading || !decDbkFile}>
              {decDbkLoading ? 'Importando...' : 'Importar .dec/.dbk'}
            </Button>
          </form>
        </Card>

        <Card title="Dados do IRPF" className="w-full">
          {declaracaoExtraida && (
            <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm space-y-3 max-h-80 overflow-y-auto">
              <p className="font-medium text-emerald-800">Declaração extraída (100% dos dados)</p>
              {declaracaoExtraida.rendimentos_tributaveis_pj?.itens?.length > 0 && (
                <div>
                  <span className="text-emerald-700">Rendimentos PJ:</span>
                  <ul className="list-disc list-inside ml-2">
                    {declaracaoExtraida.rendimentos_tributaveis_pj.itens.map((p, i) => (
                      <li key={i}>{p.nome_fonte || p.cnpj || 'Fonte'}: {formatCurrency(p.valor)}</li>
                    ))}
                  </ul>
                  <p className="text-emerald-700 mt-1">Total: {formatCurrency(declaracaoExtraida.rendimentos_tributaveis_pj.total ?? 0)}</p>
                </div>
              )}
              {declaracaoExtraida.rendimentos_tributaveis_pf?.itens?.length > 0 && (
                <div>
                  <span className="text-emerald-700">Rendimentos PF (aluguéis, carnê-leão):</span>
                  <p className="ml-2">Total: {formatCurrency(declaracaoExtraida.rendimentos_tributaveis_pf.total ?? 0)}</p>
                </div>
              )}
              {declaracaoExtraida.rendimentos_isentos_nao_tributaveis?.itens?.length > 0 && (
                <div>
                  <span className="text-emerald-700">Isentos (códigos 09, 13, etc.):</span>
                  <p className="ml-2">Total: {formatCurrency(declaracaoExtraida.rendimentos_isentos_nao_tributaveis.total ?? 0)}</p>
                </div>
              )}
              {declaracaoExtraida.bens_direitos?.itens?.length > 0 && (
                <div>
                  <span className="text-emerald-700">Bens e direitos:</span>
                  <p className="ml-2">Total: {formatCurrency(declaracaoExtraida.bens_direitos.total ?? 0)}</p>
                </div>
              )}
              {declaracaoExtraida.resumo?.base_calculo_ir != null && declaracaoExtraida.resumo.base_calculo_ir > 0 && (
                <div className="pt-2 border-t border-emerald-200">
                  <span className="text-emerald-700 font-medium">Resumo:</span>
                  <p className="ml-2">Base IR: {formatCurrency(declaracaoExtraida.resumo.base_calculo_ir)} | Imposto: {formatCurrency(declaracaoExtraida.resumo.imposto_devido ?? 0)}</p>
                </div>
              )}
            </div>
          )}
          <form onSubmit={handleSimulate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nome do contribuinte"
                value={contribuinteNome}
                onChange={(e) => setContribuinteNome(e.target.value)}
                placeholder="Nome completo"
              />
              <Input
                label="CPF"
                value={contribuinteCpf}
                onChange={(e) => setContribuinteCpf(e.target.value)}
                placeholder="000.000.000-00"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ano da declaração</label>
                <select
                  value={ano}
                  onChange={(e) => setAno(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-md px-4 py-2 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                >
                  {[CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <MoneyInput
                label="Rendimentos tributáveis (RT) – Pro-labore, salários PJ, aluguéis"
                value={rendimentosTributaveis}
                onChange={setRendimentosTributaveis}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700">
                  Rendimentos isentos – Lucros e dividendos (09) e Sócio Simples (13)
                </label>
                <Button type="button" variant="secondary" size="sm" onClick={addDividendo}>
                  + Adicionar fonte
                </Button>
              </div>
              <div className="space-y-2">
                {dividendos.map((d, i) => (
                  <div key={i} className="flex flex-wrap items-end gap-2 p-2 bg-slate-50 rounded-md">
                    <select
                      value={d.codigo || '09'}
                      onChange={(e) => updateDividendo(i, 'codigo', e.target.value)}
                      className="w-24 border border-slate-200 rounded px-2 py-1.5 text-sm"
                    >
                      <option value="09">09 – Dividendos</option>
                      <option value="13">13 – Sócio Simples</option>
                    </select>
                    <Input
                      placeholder="Nome/CNPJ fonte"
                      value={d.nome_fonte ?? ''}
                      onChange={(e) => updateDividendo(i, 'nome_fonte', e.target.value)}
                      className="flex-1 min-w-[120px]"
                    />
                    <MoneyInput
                      value={d.valor ?? 0}
                      onChange={(v) => updateDividendo(i, 'valor', v)}
                      className="w-36"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => removeDividendo(i)}
                      disabled={dividendos.length <= 1}
                    >
                      Remover
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <MoneyInput
                label="Lucros aprovados até 31/12/2025 (excluídos – Art. 16-A § 1º XII)"
                value={lucrosAprovadosAte31dez2025}
                onChange={setLucrosAprovadosAte31dez2025}
              />
              <MoneyInput
                label="Ganho de capital excluído (Art. 16-A § 1º I)"
                value={ganhoCapitalExcluido}
                onChange={setGanhoCapitalExcluido}
              />
              <MoneyInput
                label="Rendimentos FIIs excluídos (Art. 16-A § 1º V-j)"
                value={rendimentosFiisExcluidos}
                onChange={setRendimentosFiisExcluidos}
              />
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">IR já pago (deduções do imposto mínimo – Art. 16-A § 3º)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <MoneyInput label="Retenção na fonte (pró-labore, salários)" value={impostoJaPagoRetencao} onChange={setImpostoJaPagoRetencao} />
                <MoneyInput label="Carnê-leão" value={impostoJaPagoCarneLeao} onChange={setImpostoJaPagoCarneLeao} />
                <MoneyInput label="Aplicações financeiras (tributação exclusiva)" value={impostoJaPagoAplicacoes} onChange={setImpostoJaPagoAplicacoes} />
                <MoneyInput label="Antecipado dividendos (10% retido – Art. 6º-A)" value={impostoAntecipadoDividendos} onChange={setImpostoAntecipadoDividendos} />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <p className="text-sm font-medium text-slate-700">
                Base de cálculo (BCC) = RT + dividendos − exclusões: {formatCurrency(bccCalculado)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Calculando...' : 'Simular'}
              </Button>
            </div>
          </form>
        </Card>

        {result && (
          <Card title="Resultado da simulação" className="w-full">
            <div className="space-y-3">
              <p><strong>Faixa:</strong> {result.faixa === 'isento' ? 'Isento' : result.faixa === 'progressiva' ? 'Progressiva (até 10%)' : 'Fixa 10%'}</p>
              <p><strong>Alíquota aplicável:</strong> {result.aliquota_percentual}%</p>
              {result.imposto_minimo != null && result.imposto_minimo > 0 && (
                <p><strong>Imposto mínimo:</strong> {formatCurrency(result.imposto_minimo)}{result.deducoes_imposto_ja_pago != null && result.deducoes_imposto_ja_pago > 0 && (
                  <> − Deduções (IR já pago): {formatCurrency(result.deducoes_imposto_ja_pago)}</>
                )}</p>
              )}
              <p><strong>Valor a complementar:</strong> {formatCurrency(result.imposto_estimado)}</p>
              {result.risco_retencao_mensal && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-sm font-medium text-amber-800">Risco de retenção mensal (10% na fonte)</p>
                  <p className="text-sm text-amber-700">{result.risco_retencao_detalhe}</p>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-slate-200 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="text-sm font-semibold text-slate-800 mb-2">Possíveis soluções para redução da tributação</h4>
                <p className="text-sm text-slate-700 mb-2">
                  Sugestões de planejamento com base nos dados da simulação:
                </p>
                <ul className="text-sm text-slate-700 list-disc list-inside space-y-1">
                  {(result.sugestoes_planejamento?.length ? result.sugestoes_planejamento : [
                    'Constituição de holding para reorganização da estrutura e da distribuição de dividendos',
                    'Segregação da renda com cônjuge ou filhos (dentro dos limites legais)',
                    'Revisão do momento e da forma de recebimento dos rendimentos',
                  ]).map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
                <p className="text-xs text-slate-600 mt-2">
                  Consulte seu consultor tributário para simulações específicas e enquadramento à Lei 15.270/2025.
                </p>
              </div>
            </div>

            {result.memoria_calculo && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <h4 className="text-sm font-medium text-slate-800 mb-2">Memória de cálculo</h4>
                <div className="text-sm text-slate-700 space-y-2 bg-slate-50 p-3 rounded-md">
                  <p>
                    <strong>BCC</strong> = Rendimentos tributáveis + Soma dos dividendos (09 e 13)
                    <br />
                    <span className="font-mono">
                      {formatCurrency(Number(result.memoria_calculo.rendimentos_tributaveis ?? 0))}
                      {' + '}
                      {formatCurrency(Number(result.memoria_calculo.soma_dividendos ?? 0))}
                      {' = '}
                      {formatCurrency(Number(result.memoria_calculo.base_calculo_combinada ?? result.base_calculo_combinada))}
                    </span>
                  </p>
                  {Array.isArray(result.memoria_calculo.detalhe_fontes) &&
                    (result.memoria_calculo.detalhe_fontes as { codigo?: string; nome_fonte?: string; valor: number }[]).length > 0 && (
                      <div>
                        <p className="font-medium mb-1">Detalhe por fonte:</p>
                        <table className="w-full text-xs border border-slate-200 rounded overflow-hidden">
                          <thead>
                            <tr className="bg-slate-100 text-left">
                              <th className="p-1.5">Cód.</th>
                              <th className="p-1.5">Fonte</th>
                              <th className="p-1.5 text-right">Valor</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(result.memoria_calculo.detalhe_fontes as { codigo?: string; nome_fonte?: string; valor: number }[]).map((f, i) => (
                              <tr key={i} className="border-t border-slate-100">
                                <td className="p-1.5">{f.codigo ?? '-'}</td>
                                <td className="p-1.5">{f.nome_fonte ?? '-'}</td>
                                <td className="p-1.5 text-right font-mono">{formatCurrency(f.valor)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  {Number(result.memoria_calculo.excedente_sobre_600k ?? 0) > 0 && (
                    <p>
                      <strong>Excedente sobre R$ 600.000:</strong>{' '}
                      {formatCurrency(Number(result.memoria_calculo.excedente_sobre_600k))}
                    </p>
                  )}
                  <p className="pt-1 text-slate-600">
                    <strong>Fonte normativa:</strong> {String(result.memoria_calculo.fonte_normativa ?? 'Lei 15.270/2025')}
                    {result.memoria_calculo.observacao_progressiva != null && result.memoria_calculo.observacao_progressiva !== '' ? (
                      <>
                        <br />
                        <span className="text-xs">{String(result.memoria_calculo.observacao_progressiva)}</span>
                      </>
                    ) : null}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-200">
              <h4 className="text-sm font-medium text-slate-700 mb-2">Salvar simulação</h4>
              <form onSubmit={handleSave} className="flex flex-wrap items-end gap-2">
                <div className="min-w-[200px]">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Empresa</label>
                  <select
                    value={saveCompanyId}
                    onChange={(e) => setSaveCompanyId(e.target.value)}
                    className="w-full border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:border-brand"
                  >
                    <option value="">Selecione...</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <Input
                  placeholder="Título (opcional)"
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  className="min-w-[180px]"
                />
                <Button type="submit" variant="secondary" disabled={loading}>
                  Salvar
                </Button>
              </form>
            </div>
          </Card>
        )}

        <Card title="Simulações salvas" className="w-full">
          {items.length === 0 ? (
            <p className="text-slate-500">Nenhuma simulação salva.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="py-2 pr-2">Ano</th>
                    <th className="py-2 pr-2">Contribuinte</th>
                    <th className="py-2 pr-2">BCC</th>
                    <th className="py-2 pr-2">Faixa</th>
                    <th className="py-2 pr-2">Imposto</th>
                    <th className="py-2 pr-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="py-2 pr-2">{item.ano}</td>
                      <td className="py-2 pr-2">{item.contribuinte_nome}</td>
                      <td className="py-2 pr-2">{formatCurrency(item.base_calculo_combinada)}</td>
                      <td className="py-2 pr-2">{item.resultado_simulacao?.faixa ?? '-'}</td>
                      <td className="py-2 pr-2">{formatCurrency(item.resultado_simulacao?.imposto_estimado ?? 0)}</td>
                      <td className="py-2 pr-2">
                        <Button type="button" variant="secondary" size="sm" onClick={() => handleDelete(item.id)}>
                          Excluir
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
