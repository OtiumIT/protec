import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { Modal } from '../../../shared/components/ui/Modal';
import { useToast } from '../../../shared/components/ui/Toast';
import { MoneyInput } from '../../../shared/components/ui/MoneyInput';
import {
  propertyService,
  type PropertyWithClient,
} from '../services/property.service';
import { clientService, type ClientWithCreatedAt } from '../../clients/services/client.service';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { PropertyTransaction } from '@shared/core';
import type { PropertyTaxSimulationResponse } from '@shared/core';

const CATEGORIAS: Record<string, string> = {
  aluguel: 'Aluguel',
  diarias: 'Diárias',
  iptu: 'IPTU',
  condominio: 'Condomínio',
  taxa_imobiliaria: 'Taxa Imobiliária',
  taxa_plataforma: 'Taxa Plataforma',
  reforma: 'Reforma',
  mobilia: 'Mobília',
  limpeza: 'Limpeza',
  energia: 'Energia',
  internet: 'Internet',
  taxa_intermediacao: 'Taxa Intermediação',
  outros: 'Outros',
};

const TIPOS = [
  { value: 'receita', label: 'Receita' },
  { value: 'despesa_dedutivel', label: 'Despesa Dedutível (PF)' },
  { value: 'custo_operacional', label: 'Custo Operacional (Reforma 2027)' },
] as const;

export function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: showError, ToastContainer } = useToast();
  const [property, setProperty] = useState<PropertyWithClient | null>(null);
  const [transactions, setTransactions] = useState<PropertyTransaction[]>([]);
  const [monthlyTotals, setMonthlyTotals] = useState<Array<{
    mes_referencia: string;
    receita_longa: number;
    receita_short: number;
    despesas_dedutiveis: number;
    custos_operacionais: number;
  }>>([]);
  const [simulation, setSimulation] = useState<PropertyTaxSimulationResponse | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [savingTotals, setSavingTotals] = useState(false);
  const [aliquotaDirpf, setAliquotaDirpf] = useState<string>('');
  const [aplicarPresuncao16, setAplicarPresuncao16] = useState(false);
  const [aplicarEquiparacaoHospitalar, setAplicarEquiparacaoHospitalar] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);
  const [modoReceitaAnual, setModoReceitaAnual] = useState(false);
  const [aluguelAnualLonga, setAluguelAnualLonga] = useState<number>(0);
  const [aluguelAnualShort, setAluguelAnualShort] = useState<number>(0);
  const [modoDespesaAnual, setModoDespesaAnual] = useState(false);
  const [despesaAnualTotal, setDespesaAnualTotal] = useState<number>(0);
  const [modoCustoAnual, setModoCustoAnual] = useState(false);
  const [custoAnualTotal, setCustoAnualTotal] = useState<number>(0);
  const [formTx, setFormTx] = useState<{
    mes_referencia: string;
    tipo: 'receita' | 'despesa_dedutivel' | 'custo_operacional';
    categoria: string;
    valor: string;
    observacao: string;
  }>({
    mes_referencia: `${year}-01`,
    tipo: 'receita',
    categoria: 'aluguel',
    valor: '0',
    observacao: '',
  });
  const [clients, setClients] = useState<ClientWithCreatedAt[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [saveClientId, setSaveClientId] = useState('');
  const [saveTitle, setSaveTitle] = useState('');
  /** Último input enviado na simulação (para Salvar no histórico após resultado). */
  const lastSimulationInputRef = useRef<{
    ano: number;
    property_ids: string[];
    aliquota_efetiva_dirpf?: number;
    aplicar_presuncao_16_servicos?: boolean;
    aplicar_equiparacao_hospitalar?: boolean;
  } | null>(null);

  useEffect(() => {
    if (id) loadProperty();
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) setIsLoadingClients(true);
      try {
        const list = await clientService.list();
        if (!cancelled && Array.isArray(list)) setClients(list);
      } catch {
        if (!cancelled) setClients([]);
      } finally {
        if (!cancelled) setIsLoadingClients(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (property && (property as { client_id?: string }).client_id && !saveClientId) {
      setSaveClientId((property as { client_id: string }).client_id);
    }
  }, [property]);

  useEffect(() => {
    if (id && year && property) {
      if (property.modo_entrada === 'reduzido') {
        loadMonthlyTotals();
      } else {
        loadTransactions();
      }
    }
  }, [id, year, property?.modo_entrada]);

  const loadMonthlyTotals = async () => {
    if (!id) return;
    const emptyMeses = () => {
      const m: typeof monthlyTotals = [];
      for (let i = 1; i <= 12; i++) {
        m.push({
          mes_referencia: `${year}-${String(i).padStart(2, '0')}`,
          receita_longa: 0,
          receita_short: 0,
          despesas_dedutiveis: 0,
          custos_operacionais: 0,
        });
      }
      return m;
    };
    setMonthlyTotals(emptyMeses());
    try {
      const totals = await propertyService.getMonthlyTotals(id, year);
      const totalsMap = new Map(totals.map((t) => [t.mes_referencia, t]));
      const meses: typeof monthlyTotals = [];
      for (let m = 1; m <= 12; m++) {
        const mesStr = `${year}-${String(m).padStart(2, '0')}`;
        const t = totalsMap.get(mesStr);
        meses.push({
          mes_referencia: mesStr,
          receita_longa: t?.receita_longa ?? 0,
          receita_short: t?.receita_short ?? 0,
          despesas_dedutiveis: t?.despesas_dedutiveis ?? 0,
          custos_operacionais: t?.custos_operacionais ?? 0,
        });
      }
      setMonthlyTotals(meses);
    } catch {
      setMonthlyTotals(emptyMeses());
    }
  };

  const loadProperty = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const p = await propertyService.getById(id);
      setProperty(p ?? null);
      if (!p) navigate('/properties');
    } catch {
      showError('Erro ao carregar imóvel');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTransactions = async () => {
    if (!id) return;
    try {
      const txs = await propertyService.listTransactions(id, { ano: year });
      setTransactions(txs);
    } catch {
      showError('Erro ao carregar transações');
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await propertyService.addTransaction(id, {
        mes_referencia: formTx.mes_referencia,
        tipo: formTx.tipo,
        categoria: formTx.categoria,
        valor: Math.round(parseFloat(formTx.valor || '0') * 100) / 100,
        observacao: formTx.observacao || undefined,
      });
      setIsTxModalOpen(false);
      setFormTx({
        mes_referencia: `${year}-01`,
        tipo: 'receita',
        categoria: 'aluguel',
        valor: '0',
        observacao: '',
      });
      loadTransactions();
      success('Transação adicionada');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao adicionar');
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (!id || !confirm('Excluir esta transação?')) return;
    try {
      await propertyService.deleteTransaction(id, txId);
      loadTransactions();
      success('Transação excluída');
    } catch {
      showError('Erro ao excluir');
    }
  };

  const handleSaveMonthlyTotals = async () => {
    if (!id) return;
    setSavingTotals(true);
    try {
      await propertyService.upsertMonthlyTotals(id, {
        ano: year,
        meses: monthlyTotals.map((m) => ({
          ...m,
          receita_longa: Math.round(m.receita_longa * 100) / 100,
          receita_short: Math.round(m.receita_short * 100) / 100,
          despesas_dedutiveis: Math.round(m.despesas_dedutiveis * 100) / 100,
          custos_operacionais: Math.round(m.custos_operacionais * 100) / 100,
        })),
      });
      success('Totais salvos');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSavingTotals(false);
    }
  };

  const updateMonthlyTotal = (idx: number, field: keyof typeof monthlyTotals[0], value: number) => {
    setMonthlyTotals((prev) => {
      const next = [...prev];
      if (next[idx]) next[idx] = { ...next[idx]!, [field]: value };
      return next;
    });
  };

  const round2 = (n: number) => Math.round(n * 100) / 100;

  const aplicarAluguelAnual = () => {
    const mensalLonga = round2((aluguelAnualLonga ?? 0) / 12);
    const mensalShort = round2((aluguelAnualShort ?? 0) / 12);
    setMonthlyTotals((prev) =>
      prev.map((m) => ({
        ...m,
        receita_longa: mensalLonga,
        receita_short: mensalShort,
      }))
    );
    if (aluguelAnualLonga > 0 || aluguelAnualShort > 0) {
      success('Aluguel anual rateado nos 12 meses. Ajuste manualmente se necessário.');
    }
  };

  const aplicarDespesaAnual = () => {
    const valorMensal = round2((despesaAnualTotal ?? 0) / 12);
    setMonthlyTotals((prev) =>
      prev.map((m) => ({
        ...m,
        despesas_dedutiveis: valorMensal,
      }))
    );
    if (despesaAnualTotal > 0) {
      success('Despesas anuais rateadas nos 12 meses. Ajuste manualmente se necessário.');
    }
  };

  const aplicarCustoAnual = () => {
    const valorMensal = round2((custoAnualTotal ?? 0) / 12);
    setMonthlyTotals((prev) =>
      prev.map((m) => ({
        ...m,
        custos_operacionais: valorMensal,
      }))
    );
    if (custoAnualTotal > 0) {
      success('Custos operacionais anuais rateados nos 12 meses. Ajuste manualmente se necessário.');
    }
  };

  const handleSimulate = async () => {
    if (!id) return;
    const input = {
      ano: year,
      property_ids: [id],
      aliquota_efetiva_dirpf: aliquotaDirpf ? parseFloat(aliquotaDirpf) : undefined,
      aplicar_presuncao_16_servicos: aplicarPresuncao16,
      aplicar_equiparacao_hospitalar: aplicarEquiparacaoHospitalar,
    };
    setIsSimulating(true);
    setSimulation(null);
    try {
      const result = await propertyService.simulate(input);
      lastSimulationInputRef.current = input;
      setSimulation(result);
      setShowSimulation(true);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro na simulação');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSaveToHistory = async () => {
    if (!saveClientId) {
      showError('Selecione um cliente para salvar a simulação');
      return;
    }
    const input = lastSimulationInputRef.current;
    if (!input || !id) {
      showError('Execute uma simulação antes de salvar');
      return;
    }
    setIsSimulating(true);
    try {
      const { result } = await propertyService.simulateAndSaveFromProperties({
        ...input,
        client_id: saveClientId,
        title: saveTitle || undefined,
      });
      setSimulation(result);
      success('Simulação salva no histórico.');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao salvar simulação');
    } finally {
      setIsSimulating(false);
    }
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(n);

  if (!property && !isLoading) return null;

  return (
    <>
      <ToastContainer />
      <div>
        {property && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <button
                  onClick={() => navigate('/properties')}
                  className="text-sm text-slate-600 hover:text-brand mb-1"
                >
                  ← Voltar
                </button>
                <h1 className="text-3xl font-bold text-slate-900">
                  {property.identificador}
                </h1>
                <p className="text-slate-600 mt-1">
                  {property.client_name} •{' '}
                  {property.tipo_locacao === 'fixa' ? 'Fixa (Mensal)' : 'Flexível (Airbnb)'}
                </p>
              </div>
            </div>

            <Card className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Pré-cadastro do imóvel</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <p><span className="text-slate-500">Matrícula:</span> <strong>{(property as any).matricula_imovel || '-'}</strong></p>
                <p><span className="text-slate-500">Inscrição IPTU:</span> <strong>{(property as any).inscricao_iptu || '-'}</strong></p>
                <p><span className="text-slate-500">Cartório:</span> <strong>{(property as any).cartorio_registro || '-'}</strong></p>
                <p>
                  <span className="text-slate-500">IPTU anual:</span>{' '}
                  <strong>{formatCurrency(Number((property as any).iptu_mensal_padrao || 0) * 12)}</strong>
                  <span className="text-slate-400 text-xs ml-1">(equiv. mensal {formatCurrency(Number((property as any).iptu_mensal_padrao || 0))})</span>
                </p>
                <p><span className="text-slate-500">Condomínio padrão (mensal):</span> <strong>{formatCurrency(Number((property as any).condominio_mensal_padrao || 0))}</strong></p>
                <p>
                  <span className="text-slate-500">Seguro do imóvel (anual):</span>{' '}
                  <strong>{formatCurrency(Number((property as any).seguro_mensal_padrao || 0) * 12)}</strong>
                  <span className="text-slate-400 text-xs ml-1">(equiv. mensal {formatCurrency(Number((property as any).seguro_mensal_padrao || 0))})</span>
                </p>
              </div>
            </Card>

            {/* Modo Reduzido: Totais mensais */}
            {property.modo_entrada === 'reduzido' ? (
              <Card className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-slate-900">
                    Totais mensais {year}
                  </h2>
                  <div className="flex gap-2">
                    <select
                      className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      value={year}
                      onChange={(e) => setYear(parseInt(e.target.value, 10))}
                    >
                      {[year - 2, year - 1, year, year + 1, year + 2].map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    <Button
                      variant="secondary"
                      onClick={handleSaveMonthlyTotals}
                      disabled={savingTotals || monthlyTotals.length === 0}
                    >
                      {savingTotals ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </div>
                <div className="mb-4 p-4 rounded-lg bg-slate-50/80 border border-slate-200 space-y-4">
                  <p className="text-sm font-semibold text-slate-800">Preenchimento rápido – Valores anuais</p>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={modoReceitaAnual}
                        onChange={(e) => setModoReceitaAnual(e.target.checked)}
                        className="rounded border-slate-300 text-brand focus:ring-brand"
                      />
                      <span className="text-sm font-medium text-slate-700">Valor Anual / Distribuição Igualitária – Receitas</span>
                    </label>
                    {modoReceitaAnual && (
                      <div className="flex flex-wrap items-end gap-4 mt-2">
                        <div className="flex flex-col gap-1 min-w-[160px]">
                          <label className="text-xs font-medium text-slate-600">Loc. longa anual</label>
                          <MoneyInput value={aluguelAnualLonga} onChange={setAluguelAnualLonga} className="!py-1.5 text-sm" />
                        </div>
                        <div className="flex flex-col gap-1 min-w-[160px]">
                          <label className="text-xs font-medium text-slate-600">Short anual</label>
                          <MoneyInput value={aluguelAnualShort} onChange={setAluguelAnualShort} className="!py-1.5 text-sm" />
                        </div>
                        <Button type="button" variant="secondary" size="sm" onClick={aplicarAluguelAnual}>
                          Aplicar rateio
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={modoDespesaAnual}
                        onChange={(e) => setModoDespesaAnual(e.target.checked)}
                        className="rounded border-slate-300 text-brand focus:ring-brand"
                      />
                      <span className="text-sm font-medium text-slate-700">Valor Anual / Distribuição Igualitária – Despesas dedutíveis</span>
                    </label>
                    {modoDespesaAnual && (
                      <div className="flex flex-wrap items-end gap-4 mt-2">
                        <div className="flex flex-col gap-1 min-w-[160px]">
                          <label className="text-xs font-medium text-slate-600">Valor total anual</label>
                          <MoneyInput value={despesaAnualTotal} onChange={setDespesaAnualTotal} className="!py-1.5 text-sm" />
                        </div>
                        <Button type="button" variant="secondary" size="sm" onClick={aplicarDespesaAnual}>
                          Aplicar rateio
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={modoCustoAnual}
                        onChange={(e) => setModoCustoAnual(e.target.checked)}
                        className="rounded border-slate-300 text-brand focus:ring-brand"
                      />
                      <span className="text-sm font-medium text-slate-700">Valor Anual / Distribuição Igualitária – Créditos IBS/CBS</span>
                    </label>
                    {modoCustoAnual && (
                      <div className="flex flex-wrap items-end gap-4 mt-2">
                        <div className="flex flex-col gap-1 min-w-[160px]">
                          <label className="text-xs font-medium text-slate-600">Valor total anual</label>
                          <MoneyInput value={custoAnualTotal} onChange={setCustoAnualTotal} className="!py-1.5 text-sm" />
                        </div>
                        <Button type="button" variant="secondary" size="sm" onClick={aplicarCustoAnual}>
                          Aplicar rateio
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 px-2 font-semibold">Mês</th>
                        <th className="text-right py-2 px-2 font-semibold">Loc. longa</th>
                        <th className="text-right py-2 px-2 font-semibold">Short</th>
                        <th className="text-right py-2 px-2 font-semibold">Desp. dedut.</th>
                        <th className="text-right py-2 px-2 font-semibold">Custos oper.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyTotals.map((m, idx) => (
                        <tr key={m.mes_referencia} className="border-b border-slate-100">
                          <td className="py-2 px-2">{m.mes_referencia}</td>
                          <td className="py-1 px-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="w-full text-right border rounded px-2 py-1"
                              value={m.receita_longa || ''}
                              onChange={(e) => updateMonthlyTotal(idx, 'receita_longa', parseFloat(e.target.value) || 0)}
                            />
                          </td>
                          <td className="py-1 px-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="w-full text-right border rounded px-2 py-1"
                              value={m.receita_short || ''}
                              onChange={(e) => updateMonthlyTotal(idx, 'receita_short', parseFloat(e.target.value) || 0)}
                            />
                          </td>
                          <td className="py-1 px-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="w-full text-right border rounded px-2 py-1"
                              value={m.despesas_dedutiveis || ''}
                              onChange={(e) => updateMonthlyTotal(idx, 'despesas_dedutiveis', parseFloat(e.target.value) || 0)}
                            />
                          </td>
                          <td className="py-1 px-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="w-full text-right border rounded px-2 py-1"
                              value={m.custos_operacionais || ''}
                              onChange={(e) => updateMonthlyTotal(idx, 'custos_operacionais', parseFloat(e.target.value) || 0)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ) : (
              <>
                {/* Modo Detalhado: Transações */}
                <Card className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-slate-900">
                      Lançamentos {year}
                    </h2>
                    <div className="flex gap-2">
                      <select
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        value={year}
                        onChange={(e) => setYear(parseInt(e.target.value, 10))}
                      >
                        {[year - 2, year - 1, year, year + 1].map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                      <Button variant="secondary" onClick={() => setIsTxModalOpen(true)}>
                        Novo lançamento
                      </Button>
                    </div>
                  </div>

                  {transactions.length === 0 ? (
                    <p className="text-slate-500 py-4">
                      Nenhum lançamento neste ano. Adicione receitas e despesas.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="text-left py-2 px-3 text-sm font-semibold">Mês</th>
                            <th className="text-left py-2 px-3 text-sm font-semibold">Tipo</th>
                            <th className="text-left py-2 px-3 text-sm font-semibold">Categoria</th>
                            <th className="text-right py-2 px-3 text-sm font-semibold">Valor</th>
                            <th className="text-right py-2 px-3 text-sm font-semibold">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactions.map((tx) => (
                            <tr key={tx.id} className="border-b border-slate-100">
                              <td className="py-2 px-3">{tx.mes_referencia}</td>
                              <td className="py-2 px-3">{TIPOS.find((t) => t.value === tx.tipo)?.label}</td>
                              <td className="py-2 px-3">{CATEGORIAS[tx.categoria] ?? tx.categoria}</td>
                              <td className="py-2 px-3 text-right font-medium">{formatCurrency(tx.valor)}</td>
                              <td className="py-2 px-3 text-right">
                                <button
                                  onClick={() => handleDeleteTransaction(tx.id)}
                                  className="text-red-600 hover:text-red-700 text-sm"
                                >
                                  Excluir
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              </>
            )}

            {/* Simulação */}
            <Card className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Simular Carga Tributária (PF vs PJ vs Reforma 2027)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-slate-700 mb-1">
                    Alíquota efetiva DIRPF (%)
                  </label>
                  <Input
                    type="number"
                    placeholder="Ex: 22.5"
                    value={aliquotaDirpf}
                    onChange={(e) => setAliquotaDirpf(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2 pt-7">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aplicarPresuncao16}
                      onChange={(e) => setAplicarPresuncao16(e.target.checked)}
                    />
                    <span className="text-sm">Presunção 16% (rec. acum. no ano ≤ R$ 120k até o trimestre)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aplicarEquiparacaoHospitalar}
                      onChange={(e) => setAplicarEquiparacaoHospitalar(e.target.checked)}
                    />
                    <span className="text-sm">Equiparação hospitalar (presunção 8% IRPJ, 12% CSLL)</span>
                  </label>
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={handleSimulate}
                disabled={
                  isSimulating ||
                  (property.modo_entrada === 'detalhado' && transactions.length === 0)
                }
              >
                {isSimulating ? 'Simulando...' : 'Simular'}
              </Button>
            </Card>

            {/* Resultado Simulação */}
            {simulation && showSimulation && (
              <>
              <Card className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">
                  Resultado da Simulação - Ano {simulation.ano}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <h3 className="font-semibold text-slate-700 mb-2">
                      Pessoa Física (Carnê-Leão)
                    </h3>
                    <p className="text-2xl font-bold text-brand">
                      {formatCurrency(simulation.cenarios.pf.imposto_total)}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      Alíquota efetiva: {simulation.cenarios.pf.aliquota_efetiva_anual.toFixed(1)}%
                    </p>
                  </div>
                  {simulation.cenarios.pf_dirpf_simplificado && (
                    <div className="p-4 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                      <h3 className="font-semibold text-slate-700 mb-1">
                        PF — DIRPF simplificado
                      </h3>
                      <p className="text-xs text-slate-500 mb-2">
                        Ajuste anual estimado (20%, teto{' '}
                        {formatCurrency(simulation.cenarios.pf_dirpf_simplificado.teto_desconto)}). Não altera o carnê-leão.
                      </p>
                      <p className="text-2xl font-bold text-slate-800">
                        {formatCurrency(simulation.cenarios.pf_dirpf_simplificado.imposto_total)}
                      </p>
                      <p className="text-sm text-slate-600 mt-1">
                        Alíquota efetiva: {simulation.cenarios.pf_dirpf_simplificado.aliquota_efetiva_anual.toFixed(1)}%
                      </p>
                      {simulation.cenarios.pf_dirpf_simplificado.ajuste_estimado !== 0 && (
                        <p className={`text-xs mt-1 font-medium ${simulation.cenarios.pf_dirpf_simplificado.ajuste_estimado > 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                          Ajuste estimado: {formatCurrency(simulation.cenarios.pf_dirpf_simplificado.ajuste_estimado)}
                          {simulation.cenarios.pf_dirpf_simplificado.ajuste_estimado > 0 ? ' (restituição potencial)' : ' (a pagar)'}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <h3 className="font-semibold text-slate-700 mb-2">
                      Pessoa Jurídica (Lucro Presumido)
                    </h3>
                    <p className="text-2xl font-bold text-slate-800">
                      {formatCurrency(simulation.cenarios.pj.imposto_total)}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      Alíquota efetiva: {simulation.cenarios.pj.aliquota_efetiva.toFixed(1)}%
                    </p>
                    {(simulation.cenarios.pj.irpj_postergado ?? 0) > 0 && (
                      <p className="text-xs text-amber-700 mt-1 font-medium">
                        Diferença postergada (Lei 9.249/95, Art. 15, § 8º): {formatCurrency(simulation.cenarios.pj.irpj_postergado ?? 0)}
                      </p>
                    )}
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <h3 className="font-semibold text-slate-700 mb-2">
                      Reforma 2027 – PF (IBS/CBS)
                    </h3>
                    <p className="text-2xl font-bold text-slate-800">
                      {formatCurrency((simulation.cenarios.reforma_2027_pf ?? simulation.cenarios.reforma_2027)?.imposto_total ?? 0)}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      Alíquota: {(simulation.cenarios.reforma_2027_pf ?? simulation.cenarios.reforma_2027)?.aliquota_efetiva?.toFixed(1) ?? '0'}%
                    </p>
                    <p className="text-xs text-amber-800/90 mt-1 bg-amber-50 rounded px-2 py-1">
                      Pelo regulamento da LC 214/2025, a PF só é contribuinte de IBS/CBS quando possui mais de 3 imóveis (4 ou mais) E receita anual &gt; R$ 240k. Receita acima de R$ 288k (240k + 20%) sozinha não torna a PF contribuinte.
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <h3 className="font-semibold text-slate-700 mb-2">
                      Reforma 2027 – PJ (IBS/CBS + IRPJ + CSLL)
                    </h3>
                    <p className="text-2xl font-bold text-slate-800">
                      {formatCurrency((simulation.cenarios.reforma_2027_pj ?? simulation.cenarios.reforma_2027)?.imposto_total ?? 0)}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      Alíquota efetiva total: {(simulation.cenarios.reforma_2027_pj ?? simulation.cenarios.reforma_2027)?.aliquota_efetiva?.toFixed(1) ?? '0'}%
                      {(() => {
                        const ref = simulation.cenarios.reforma_2027_pj ?? simulation.cenarios.reforma_2027;
                        const ext = ref as { redutor_diferenciado_short?: boolean; redutor_long_pct?: number; redutor_short_pct?: number; redutor_locacao_aplicado_pct?: number };
                        if (ext?.redutor_diferenciado_short && ext.redutor_long_pct != null && ext.redutor_short_pct != null) {
                          return ` (redutor ${ext.redutor_long_pct}% longa duração e ${ext.redutor_short_pct}% curta temporada)`;
                        }
                        return ` (redutor ${ext?.redutor_locacao_aplicado_pct ?? 70}% locação)`;
                      })()}
                    </p>
                    {(() => {
                      const ref = simulation.cenarios.reforma_2027_pj ?? simulation.cenarios.reforma_2027;
                      const irpj = (ref as { irpj?: number })?.irpj;
                      const csll = (ref as { csll?: number })?.csll;
                      const ibsCbs = ref?.ibs_cbs_liquido ?? 0;
                      if (irpj != null && csll != null) {
                        return (
                          <p className="text-xs text-slate-500 mt-1">
                            IBS/CBS: {formatCurrency(ibsCbs)} + IRPJ: {formatCurrency(irpj)} + CSLL: {formatCurrency(csll)} = Total acima.
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
                {simulation.cenarios.pf.trimestres?.length > 0 && simulation.cenarios.pj.trimestres?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-slate-700 mb-2">Comparativo trimestral</p>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={simulation.cenarios.pf.trimestres.map((t, i) => {
                            const pjTri = simulation.cenarios.pj.trimestres?.[i];
                            const pjImposto = pjTri ? (pjTri.irpj ?? 0) + (pjTri.irpj_adicional ?? 0) + (pjTri.irpj_postergado ?? 0) + (pjTri.csll ?? 0) + (pjTri.pis ?? 0) + (pjTri.cofins ?? 0) : 0;
                            return { trimestre: `${t.trimestre}º Tri`, PF: t.imposto, PJ: pjImposto };
                          })}
                          margin={{ top: 8, right: 16, left: 16, bottom: 8 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="trimestre" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                          <Legend />
                          <Bar dataKey="PF" name="PF (IR)" fill="var(--color-brand, #0ea5e9)" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="PJ" name="PJ" fill="#475569" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                {simulation.embasamentos_legais && simulation.embasamentos_legais.length > 0 && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm font-semibold text-slate-800 mb-2">Embasamentos legais</p>
                    <ul className="text-xs text-slate-600 space-y-1">
                      {simulation.embasamentos_legais.map((e, i) => (
                        <li key={i}><strong>{e.norma}</strong>{e.artigo ? ` (${e.artigo})` : ''}: {e.descricao}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {simulation.fluxo_caixa?.length > 0 && (() => {
                  const fc = simulation.fluxo_caixa[0]!;
                  const impostoPF = simulation.cenarios.pf.imposto_total;
                  const impostoPJ = simulation.cenarios.pj.imposto_total;
                  const pjVence = impostoPJ < impostoPF;
                  const economiaReais = Math.abs(impostoPF - impostoPJ);
                  const economiaPct = impostoPF > 0 ? (economiaReais / impostoPF) * 100 : 0;
                  const acoes: string[] = [];
                  if (pjVence && economiaReais > 0) {
                    acoes.push(`Considerar PJ para esta atividade — economia estimada de ${formatCurrency(economiaReais)} (${economiaPct.toFixed(0)}% sobre a carga em PF).`);
                  } else if (!pjVence && economiaReais > 0) {
                    acoes.push(`Manter PF é mais vantajoso neste cenário (evita ${formatCurrency(economiaReais)} em impostos em relação a PJ).`);
                  }
                  if (simulation.break_even) {
                    acoes.push(`Break-even: a partir de ~${formatCurrency(simulation.break_even.valor_mensal_break_even)}/mês, PJ tende a ser mais vantajosa.`);
                  }
                  const reformaPj = simulation.cenarios.reforma_2027_pj ?? simulation.cenarios.reforma_2027;
                  if (reformaPj?.aliquota_efetiva != null) {
                    acoes.push(`Reforma 2027: IBS/CBS + IRPJ + CSLL (carga total ${reformaPj.aliquota_efetiva.toFixed(1)}%). Contratos até 16/01/2025 podem optar por 3,65% até 31/12/2028.`);
                  }
                  acoes.push('Holding: também faz sentido por planejamento sucessório, proteção patrimonial e tributação na venda.');
                  if (acoes.length === 0) acoes.push('Revise com seu contador antes de decisão de estruturação.');
                  return (
                    <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-sm font-semibold text-slate-800 mb-2">Resumo estratégico</p>
                      <p className="text-sm text-slate-700 mb-2">
                        Melhor regime: <strong>{pjVence ? 'PJ (Lucro Presumido)' : 'PF (Carnê-Leão)'}</strong>
                        {economiaReais > 0 && ` — ${pjVence ? `economia de ${formatCurrency(economiaReais)}` : `diferença de ${formatCurrency(economiaReais)} a menos vs PJ`}.`}
                      </p>
                      <p className="text-sm text-slate-600 mb-2">
                        Lucro líquido no ano: PF {formatCurrency(fc.lucro_liquido_pf)} | PJ {formatCurrency(fc.lucro_liquido_pj)}
                      </p>
                      <p className="text-xs font-medium text-slate-600 mb-1">Plano de ação</p>
                      <ul className="list-disc list-inside text-sm text-slate-700 space-y-0.5">
                        {acoes.map((t, i) => <li key={i}>{t}</li>)}
                      </ul>
                    </div>
                  );
                })()}
                {simulation.break_even && (
                  <div className="mt-4 p-4 bg-brand/5 rounded-lg">
                    <p className="text-sm font-medium text-slate-700">
                      Break-even: {formatCurrency(simulation.break_even.valor_mensal_break_even)}/mês
                    </p>
                    <p className="text-sm text-slate-600">
                      {simulation.break_even.descricao}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      Devem ser considerados para tanto os custos envolvidos na constituição da PJ (ITBI, honorários advocatícios e contábeis etc.).
                    </p>
                  </div>
                )}
              </Card>

              {/* Salvar simulação no histórico (botão após resultado) */}
              <Card className="mb-6 p-5 border border-slate-200 bg-slate-50/50">
                <h3 className="text-base font-semibold text-slate-800 mb-3">Salvar simulação no histórico</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Salve esta simulação para consultar depois no Histórico do Simulador Imobiliário.
                </p>
                <div className="flex flex-wrap items-end gap-4">
                  <div className="min-w-[200px]">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cliente *</label>
                    <select
                      className="h-10 w-full min-w-[200px] border border-slate-300 rounded-md px-3 text-sm text-slate-700 bg-white"
                      value={saveClientId}
                      onChange={(e) => setSaveClientId(e.target.value)}
                      disabled={isLoadingClients}
                    >
                      <option value="">{isLoadingClients ? 'Carregando clientes...' : 'Selecione um cliente'}</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-[180px]">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Título (opcional)</label>
                    <Input
                      placeholder="Ex: Simulação 2025"
                      value={saveTitle}
                      onChange={(e) => setSaveTitle(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleSaveToHistory}
                    disabled={isSimulating || !saveClientId}
                  >
                    {isSimulating ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </Card>
              </>
            )}
          </>
        )}
      </div>

      {/* Modal Novo Lançamento */}
      <Modal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        title="Novo lançamento"
      >
        <form onSubmit={handleAddTransaction} className="space-y-4">
          <Input
            label="Mês (YYYY-MM)"
            type="month"
            value={formTx.mes_referencia}
            onChange={(e) =>
              setFormTx({ ...formTx, mes_referencia: e.target.value })
            }
            required
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tipo
            </label>
            <select
              className="w-full border border-slate-200 rounded-lg px-4 py-2"
              value={formTx.tipo}
              onChange={(e) =>
                setFormTx({
                  ...formTx,
                  tipo: e.target.value as 'receita' | 'despesa_dedutivel' | 'custo_operacional',
                })
              }
            >
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Categoria
            </label>
            <select
              className="w-full border border-slate-200 rounded-lg px-4 py-2"
              value={formTx.categoria}
              onChange={(e) =>
                setFormTx({ ...formTx, categoria: e.target.value })
              }
            >
              {Object.entries(CATEGORIAS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Valor (R$)"
            type="number"
            step="0.01"
            min="0"
            value={formTx.valor}
            onChange={(e) => setFormTx({ ...formTx, valor: e.target.value })}
            required
          />
          <Input
            label="Observação"
            value={formTx.observacao}
            onChange={(e) =>
              setFormTx({ ...formTx, observacao: e.target.value })
            }
          />
          <div className="flex gap-3 pt-4">
            <Button type="submit" variant="secondary" className="flex-1">
              Adicionar
            </Button>
            <Button
              type="button"
              variant="tertiary"
              onClick={() => setIsTxModalOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
