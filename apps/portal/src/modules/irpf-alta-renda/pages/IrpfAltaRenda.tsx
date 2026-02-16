import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../../../shared/components/layout/Layout';
import {
  irpfAltaRendaService,
  type IrpfAltaRendaRecord,
} from '../services/irpf-alta-renda.service';
import { clientService, type ClientWithCreatedAt } from '../../clients/services/client.service';
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
  const [clients, setClients] = useState<ClientWithCreatedAt[]>([]);
  const [items, setItems] = useState<IrpfAltaRendaRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IrpfAltaRendaSimulacaoResponse | null>(null);

  const [ano, setAno] = useState(CURRENT_YEAR);
  const [contribuinteNome, setContribuinteNome] = useState('');
  const [contribuinteCpf, setContribuinteCpf] = useState('');
  const [rendimentosTributaveis, setRendimentosTributaveis] = useState(0);
  const [dividendos, setDividendos] = useState<RendimentoIsentoDividendo[]>([{ ...emptyDividendo }]);

  const [saveClientId, setSaveClientId] = useState('');
  const [saveTitle, setSaveTitle] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [clientsRes, listRes] = await Promise.all([
        clientService.list(),
        irpfAltaRendaService.list({ page: 1, limit: 50 }),
      ]);
      setClients(Array.isArray(clientsRes) ? clientsRes : []);
      setItems(listRes.items);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao carregar');
    }
  }, [showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const bccCalculado =
    rendimentosTributaveis +
    dividendos.reduce((s, d) => s + (d.valor ?? 0), 0);

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
    if (!saveClientId) {
      showError('Selecione um cliente para salvar.');
      return;
    }
    setLoading(true);
    try {
      const input: SimulateAndSaveIrpfAltaRendaInput = {
        ...buildInput(),
        client_id: saveClientId,
        title: saveTitle.trim() || undefined,
      };
      await irpfAltaRendaService.simulateAndSave(input);
      success('Simulação salva.');
      setResult(null);
      setSaveTitle('');
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

  return (
    <Layout>
      <ToastContainer />
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-slate-800">IRPF Alta Renda (Lei 15.270/2025)</h1>
        <p className="text-slate-600">
          Simule o impacto tributário com base nos rendimentos tributáveis e nos lucros/dividendos (códigos 09 e 13).
        </p>

        <Card title="Dados do IRPF" className="max-w-3xl">
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

            <div className="pt-2 border-t border-slate-200">
              <p className="text-sm font-medium text-slate-700">
                Base de cálculo combinada (BCC) = RT + dividendos: {formatCurrency(bccCalculado)}
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
          <Card title="Resultado da simulação" className="max-w-3xl">
            <div className="space-y-3">
              <p><strong>Faixa:</strong> {result.faixa === 'isento' ? 'Isento' : result.faixa === 'progressiva' ? 'Progressiva (até 10%)' : 'Fixa 10%'}</p>
              <p><strong>Alíquota:</strong> {result.aliquota_percentual}%</p>
              <p><strong>Imposto estimado:</strong> {formatCurrency(result.imposto_estimado)}</p>
              {result.risco_retencao_mensal && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-sm font-medium text-amber-800">Risco de retenção mensal (10% na fonte)</p>
                  <p className="text-sm text-amber-700">{result.risco_retencao_detalhe}</p>
                </div>
              )}
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
                  <select
                    value={saveClientId}
                    onChange={(e) => setSaveClientId(e.target.value)}
                    className="w-full border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:border-brand"
                  >
                    <option value="">Selecione...</option>
                    {clients.map((c) => (
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

        <Card title="Simulações salvas" className="max-w-4xl">
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
