import { useCallback, useEffect, useState } from 'react';
import { comparativoRegimesService } from '../services/comparativo-regimes.service';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { MoneyInput } from '../../../shared/components/ui/MoneyInput';
import { Modal } from '../../../shared/components/ui/Modal';
import { PageLoading } from '../../../shared/components/ui/Spinner';
import { useToast } from '../../../shared/components/ui/Toast';
import {
  ALIQUOTAS_IBS_CBS_POR_ANO,
  AVISO_SIMPLES_REFORMA,
  CATEGORIAS_SEM_CREDITO_SIMPLES,
  EXEMPLOS_SIMPLES_REFORMA,
  type AnexoSimples,
  type CategoriaDespesaSimples,
  type ComparativoRegimesSimulation,
  type SimplesIbsCbsDespesa,
  type SimplesIbsCbsInput,
  type SimplesIbsCbsResult,
} from '@shared/core';

const CATEGORIA_LABELS: Record<CategoriaDespesaSimples, string> = {
  mercadoria: 'Mercadoria para revenda',
  insumo: 'Insumo',
  aluguel: 'Aluguel',
  servico_pj: 'Serviço de PJ',
  energia: 'Energia, água, gás',
  tecnologia: 'Tecnologia e assinaturas',
  publicidade: 'Publicidade',
  seguro: 'Seguros',
  pessoal: 'Pessoal (folha)',
  tributo: 'Tributos',
  uso_pessoal: 'Uso pessoal',
  outros: 'Outros',
};

const REGIME_LABELS: Record<SimplesIbsCbsResult['regime_mais_economico'], string> = {
  simples_puro: 'Simples puro',
  regime_regular: 'Regime regular de IBS/CBS',
  empate: 'Empate',
};

const ANOS = Array.from({ length: 9 }, (_, i) => 2027 + i);

type PerfilClientes = 'consumidor' | 'empresas' | 'misto';

const selectClass =
  'w-full bg-white border border-[#d2dae2] rounded-md px-3 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:border-[#1351b4] focus:ring-1 focus:ring-[#1351b4]/20';

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPct(value: number): string {
  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function aliquotasDoAno(ano: number) {
  const anos = Object.keys(ALIQUOTAS_IBS_CBS_POR_ANO).map(Number).sort((a, b) => a - b);
  const alvo = anos.filter((a) => a <= ano).pop() ?? anos[0]!;
  return ALIQUOTAS_IBS_CBS_POR_ANO[alvo]!;
}

function perfilClientesDe(pct: number): PerfilClientes {
  if (pct <= 0) return 'consumidor';
  if (pct >= 100) return 'empresas';
  return 'misto';
}

function creditoCheioDoAno(ano: number): number {
  const { cbs, ibs } = aliquotasDoAno(ano);
  return Math.round((cbs + ibs) * 100) / 100;
}

function novaDespesa(ano = 2027): SimplesIbsCbsDespesa {
  return { descricao: '', categoria: 'outros', valor_anual: 0, gera_credito: true, aliquota_credito: creditoCheioDoAno(ano) };
}

function isVedada(categoria: CategoriaDespesaSimples): boolean {
  return (CATEGORIAS_SEM_CREDITO_SIMPLES as readonly CategoriaDespesaSimples[]).includes(categoria);
}

export function SimplesReforma() {
  const { success, error: showError, ToastContainer } = useToast();

  const [ano, setAno] = useState(2027);
  const [perfil, setPerfil] = useState<'servico' | 'comercio'>('servico');
  const [anexo, setAnexo] = useState<AnexoSimples>('III');
  const [receitaBruta, setReceitaBruta] = useState(0);
  const [deducoes, setDeducoes] = useState(0);
  const [aliquotaSimples, setAliquotaSimples] = useState('');
  const [aliquotaCbs, setAliquotaCbs] = useState(aliquotasDoAno(2027).cbs);
  const [aliquotaIbs, setAliquotaIbs] = useState(aliquotasDoAno(2027).ibs);
  const [perfilClientes, setPerfilClientes] = useState<PerfilClientes>('consumidor');
  const [pctEmpresas, setPctEmpresas] = useState(0);
  const [despesas, setDespesas] = useState<SimplesIbsCbsDespesa[]>([novaDespesa()]);
  const [title, setTitle] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimplesIbsCbsResult | null>(null);
  const [simulations, setSimulations] = useState<ComparativoRegimesSimulation[]>([]);
  const [loadingSims, setLoadingSims] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const loadSimulations = useCallback(async () => {
    setLoadingSims(true);
    try {
      const data = await comparativoRegimesService.list({ kind: 'simples_ibs_cbs', limit: 50 });
      setSimulations(data.simulations);
    } catch {
      /* silent */
    } finally {
      setLoadingSims(false);
    }
  }, []);

  useEffect(() => {
    loadSimulations();
  }, [loadSimulations]);

  function aplicarInput(input: Partial<SimplesIbsCbsInput>) {
    const anoInput = input.ano ?? 2027;
    const padrao = aliquotasDoAno(anoInput);
    setAno(anoInput);
    setPerfil(input.perfil ?? 'servico');
    setAnexo(input.anexo ?? (input.perfil === 'comercio' ? 'I' : 'III'));
    setReceitaBruta(input.receita_bruta_anual ?? 0);
    setDeducoes(input.deducoes_anual ?? 0);
    setAliquotaSimples(input.aliquota_efetiva_simples !== undefined ? String(input.aliquota_efetiva_simples) : '');
    setAliquotaCbs(input.aliquota_cbs ?? padrao.cbs);
    setAliquotaIbs(input.aliquota_ibs ?? padrao.ibs);
    const pct = input.percentual_vendas_empresas ?? 0;
    setPctEmpresas(pct);
    setPerfilClientes(perfilClientesDe(pct));
    setDespesas(input.despesas && input.despesas.length > 0 ? input.despesas.map((d) => ({ ...d })) : [novaDespesa(anoInput)]);
    setTitle(input.title ?? '');
  }

  function carregarExemplo(chave: keyof typeof EXEMPLOS_SIMPLES_REFORMA) {
    aplicarInput(EXEMPLOS_SIMPLES_REFORMA[chave].input);
    setResult(null);
    success(`Exemplo carregado: ${EXEMPLOS_SIMPLES_REFORMA[chave].rotulo}`);
  }

  function limpar() {
    aplicarInput({});
    setResult(null);
  }

  function handleAno(novoAno: number) {
    const padrao = aliquotasDoAno(novoAno);
    const anterior = aliquotasDoAno(ano);
    const padroesAnteriores = new Set([anterior.cbs, creditoCheioDoAno(ano)]);
    const novoCredito = creditoCheioDoAno(novoAno);
    setAno(novoAno);
    setAliquotaCbs(padrao.cbs);
    setAliquotaIbs(padrao.ibs);
    setDespesas((prev) =>
      prev.map((d) =>
        d.gera_credito && !isVedada(d.categoria) && padroesAnteriores.has(d.aliquota_credito)
          ? { ...d, aliquota_credito: novoCredito }
          : d
      )
    );
  }

  function handlePerfil(novo: 'servico' | 'comercio') {
    setPerfil(novo);
    setAnexo(novo === 'comercio' ? 'I' : 'III');
  }

  function handlePerfilClientes(novo: PerfilClientes) {
    setPerfilClientes(novo);
    if (novo === 'consumidor') setPctEmpresas(0);
    else if (novo === 'empresas') setPctEmpresas(100);
    else if (pctEmpresas <= 0 || pctEmpresas >= 100) setPctEmpresas(50);
  }

  function atualizarDespesa(index: number, patch: Partial<SimplesIbsCbsDespesa>) {
    setDespesas((prev) =>
      prev.map((d, i) => {
        if (i !== index) return d;
        const next = { ...d, ...patch };
        if (patch.categoria && isVedada(patch.categoria)) {
          next.gera_credito = false;
          next.aliquota_credito = 0;
        }
        return next;
      })
    );
  }

  function removerDespesa(index: number) {
    setDespesas((prev) => (prev.length <= 1 ? [novaDespesa(ano)] : prev.filter((_, i) => i !== index)));
  }

  function buildInput(): SimplesIbsCbsInput {
    const aliqSimples = aliquotaSimples.trim() === '' ? undefined : Number(aliquotaSimples.replace(',', '.'));
    return {
      ano,
      perfil,
      anexo,
      receita_bruta_anual: receitaBruta,
      deducoes_anual: deducoes,
      aliquota_efetiva_simples: aliqSimples !== undefined && Number.isFinite(aliqSimples) ? aliqSimples : undefined,
      aliquota_cbs: aliquotaCbs,
      aliquota_ibs: aliquotaIbs,
      percentual_vendas_empresas: pctEmpresas,
      despesas: despesas
        .filter((d) => d.descricao.trim() !== '' || d.valor_anual > 0)
        .map((d) => ({ ...d, descricao: d.descricao.trim() || CATEGORIA_LABELS[d.categoria] })),
      title: title.trim() || undefined,
    };
  }

  const formInvalido = receitaBruta <= 0 || deducoes > receitaBruta;

  async function handleSimulate(save: boolean) {
    setLoading(true);
    try {
      const input = buildInput();
      const data = save
        ? await comparativoRegimesService.simulateSimplesAndSave(input)
        : await comparativoRegimesService.simulateSimples(input);
      setResult(data);
      success(save ? 'Simulação salva' : 'Simulação calculada');
      if (save) loadSimulations();
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Erro ao simular');
    } finally {
      setLoading(false);
    }
  }

  function handleLoadSimulation(sim: ComparativoRegimesSimulation) {
    aplicarInput(sim.input_data as unknown as SimplesIbsCbsInput);
    setResult(sim.result_data as unknown as SimplesIbsCbsResult);
    success('Simulação carregada');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(id: string) {
    try {
      await comparativoRegimesService.delete(id);
      success('Simulação excluída');
      setDeleteConfirmId(null);
      loadSimulations();
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Erro ao excluir');
    }
  }

  const receitaLiquida = Math.max(0, receitaBruta - deducoes);

  return (
    <div className="space-y-6">
      <ToastContainer />

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Simples puro × regime regular de IBS/CBS</h1>
        <p className="text-sm sm:text-base text-slate-500 mt-1">
          Vale a pena a empresa do Simples apurar IBS/CBS por fora, com crédito das despesas?
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          {['LC 123/2006', 'LC 214/2025'].map((norma) => (
            <span
              key={norma}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200"
            >
              {norma}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="note">
        {AVISO_SIMPLES_REFORMA}
      </div>

      <Card title="Dados da empresa">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-600">Começar de um exemplo:</span>
            {(Object.keys(EXEMPLOS_SIMPLES_REFORMA) as Array<keyof typeof EXEMPLOS_SIMPLES_REFORMA>).map((chave) => (
              <Button key={chave} type="button" variant="secondary" size="sm" onClick={() => carregarExemplo(chave)}>
                {EXEMPLOS_SIMPLES_REFORMA[chave].rotulo}
              </Button>
            ))}
            <Button type="button" variant="tertiary" size="sm" onClick={limpar}>
              Em branco
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <label className="block text-sm font-medium text-slate-700">
              Ano da simulação
              <select className={`${selectClass} mt-1`} value={ano} onChange={(e) => handleAno(Number(e.target.value))}>
                {ANOS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Atividade
              <select
                className={`${selectClass} mt-1`}
                value={perfil}
                onChange={(e) => handlePerfil(e.target.value as 'servico' | 'comercio')}
              >
                <option value="servico">Serviço</option>
                <option value="comercio">Comércio</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Anexo do Simples
              <select className={`${selectClass} mt-1`} value={anexo} onChange={(e) => setAnexo(e.target.value as AnexoSimples)}>
                <option value="I">Anexo I (comércio)</option>
                <option value="III">Anexo III (serviços)</option>
                <option value="IV">Anexo IV (advocacia, construção)</option>
                <option value="V">Anexo V (serviços, Fator R abaixo de 28%)</option>
              </select>
            </label>
            <Input
              label="Alíquota efetiva do DAS (%)"
              value={aliquotaSimples}
              onChange={(e) => setAliquotaSimples(e.target.value)}
              placeholder="Vazio = calcula pela faixa"
              inputMode="decimal"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MoneyInput label="Receita bruta anual" value={receitaBruta} onChange={setReceitaBruta} />
            <MoneyInput
              label="Deduções (cancelamentos, descontos)"
              value={deducoes}
              onChange={setDeducoes}
              error={deducoes > receitaBruta ? 'Maior que a receita bruta' : undefined}
            />
            <Input
              label="CBS no regime regular (%)"
              type="number"
              min={0}
              max={30}
              step={0.01}
              value={aliquotaCbs}
              onChange={(e) => setAliquotaCbs(Number(e.target.value))}
            />
            <Input
              label="IBS no regime regular (%)"
              type="number"
              min={0}
              max={30}
              step={0.01}
              value={aliquotaIbs}
              onChange={(e) => setAliquotaIbs(Number(e.target.value))}
            />
          </div>
          <p className="text-xs text-slate-500 -mt-3">
            Receita líquida: <strong>{formatCurrency(receitaLiquida)}</strong>. CBS e IBS começam com a estimativa do ano e podem ser
            ajustadas.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block text-sm font-medium text-slate-700">
              Para quem a empresa vende
              <select
                className={`${selectClass} mt-1`}
                value={perfilClientes}
                onChange={(e) => handlePerfilClientes(e.target.value as PerfilClientes)}
              >
                <option value="consumidor">Consumidor final (não usa crédito)</option>
                <option value="empresas">Empresas (querem crédito)</option>
                <option value="misto">Misto</option>
              </select>
            </label>
            {perfilClientes === 'misto' && (
              <Input
                label="Vendas para empresas (% da receita)"
                type="number"
                min={1}
                max={99}
                value={pctEmpresas}
                onChange={(e) => setPctEmpresas(Math.min(99, Math.max(1, Number(e.target.value))))}
              />
            )}
          </div>
        </div>
      </Card>

      <Card title="Despesas e crédito de IBS/CBS">
        <p className="text-sm text-slate-500 mb-4">
          Informe o valor anual de cada despesa, se o fornecedor dá direito a crédito e a alíquota do crédito. Folha, tributos e uso pessoal
          ficam sem crédito.
        </p>
        <div className="space-y-3">
          <div className="hidden md:grid md:grid-cols-[2fr_1.4fr_1.2fr_0.7fr_0.8fr_auto] gap-2 text-xs font-medium text-slate-500 px-1">
            <span>Descrição</span>
            <span>Categoria</span>
            <span>Valor anual</span>
            <span>Crédito?</span>
            <span>Alíquota (%)</span>
            <span className="sr-only">Remover</span>
          </div>
          {despesas.map((d, i) => {
            const vedada = isVedada(d.categoria);
            return (
              <div
                key={i}
                className="grid grid-cols-2 md:grid-cols-[2fr_1.4fr_1.2fr_0.7fr_0.8fr_auto] gap-2 items-center rounded-lg border border-slate-200 md:border-0 p-3 md:p-0"
              >
                <div className="col-span-2 md:col-span-1">
                  <Input
                    aria-label={`Descrição da despesa ${i + 1}`}
                    value={d.descricao}
                    onChange={(e) => atualizarDespesa(i, { descricao: e.target.value })}
                    placeholder="Ex.: Aluguel"
                  />
                </div>
                <select
                  aria-label={`Categoria da despesa ${i + 1}`}
                  className={`${selectClass} col-span-2 md:col-span-1`}
                  value={d.categoria}
                  onChange={(e) => atualizarDespesa(i, { categoria: e.target.value as CategoriaDespesaSimples })}
                >
                  {(Object.keys(CATEGORIA_LABELS) as CategoriaDespesaSimples[]).map((c) => (
                    <option key={c} value={c}>
                      {CATEGORIA_LABELS[c]}
                    </option>
                  ))}
                </select>
                <div className="col-span-2 md:col-span-1">
                  <MoneyInput
                    aria-label={`Valor anual da despesa ${i + 1}`}
                    value={d.valor_anual}
                    onChange={(v) => atualizarDespesa(i, { valor_anual: v })}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={d.gera_credito && !vedada}
                    disabled={vedada}
                    onChange={(e) => atualizarDespesa(i, { gera_credito: e.target.checked })}
                  />
                  <span className="md:sr-only">Gera crédito</span>
                </label>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-slate-500 md:hidden">Alíquota de crédito (%)</span>
                  <Input
                    aria-label={`Alíquota de crédito da despesa ${i + 1}`}
                    type="number"
                    min={0}
                    max={40}
                    step={0.01}
                    value={d.aliquota_credito}
                    disabled={vedada || !d.gera_credito}
                    onChange={(e) => atualizarDespesa(i, { aliquota_credito: Number(e.target.value) })}
                  />
                </div>
                <div className="col-span-2 md:col-span-1 flex justify-end">
                  <Button
                    type="button"
                    variant="tertiary"
                    size="sm"
                    className="text-rose-700"
                    onClick={() => removerDespesa(i)}
                    aria-label={`Remover despesa ${i + 1}`}
                  >
                    Remover
                  </Button>
                </div>
              </div>
            );
          })}
          <Button type="button" variant="secondary" size="sm" onClick={() => setDespesas((prev) => [...prev, novaDespesa(ano)])}>
            Adicionar despesa
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end gap-3 mt-6">
          <div className="flex-1">
            <Input label="Título (opcional)" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Escritório X, opção 2027" />
          </div>
          <Button onClick={() => handleSimulate(false)} loading={loading} disabled={formInvalido}>
            Simular
          </Button>
          <Button onClick={() => handleSimulate(true)} loading={loading} disabled={formInvalido} variant="secondary">
            Simular e salvar
          </Button>
        </div>
      </Card>

      {result && <ResultadoSimples result={result} />}

      <Card title="Simulações salvas">
        {loadingSims ? (
          <PageLoading label="Carregando simulações…" />
        ) : simulations.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma simulação salva. Use "Simular e salvar".</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[680px]">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="pb-2 pr-3 font-medium">Título</th>
                  <th className="pb-2 px-3 font-medium">Ano</th>
                  <th className="pb-2 px-3 font-medium">Mais econômico</th>
                  <th className="pb-2 px-3 font-medium text-right whitespace-nowrap">Diferença anual</th>
                  <th className="pb-2 px-3 font-medium">Data</th>
                  <th className="pb-2 pl-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {simulations.map((sim) => {
                  const rd = sim.result_data as unknown as Partial<SimplesIbsCbsResult>;
                  return (
                    <tr key={sim.id} className="hover:bg-slate-50">
                      <td className="py-3 pr-3 text-slate-900">{sim.title || 'Sem título'}</td>
                      <td className="py-3 px-3 text-slate-600">{sim.ano}</td>
                      <td className="py-3 px-3 text-slate-700 whitespace-nowrap">{rd.regime_mais_economico ? REGIME_LABELS[rd.regime_mais_economico] : '—'}</td>
                      <td className="py-3 px-3 text-right text-slate-700 whitespace-nowrap">
                        {typeof rd.diferenca_anual === 'number' ? formatCurrency(Math.abs(rd.diferenca_anual)) : '—'}
                      </td>
                      <td className="py-3 px-3 text-slate-600">{new Date(sim.created_at).toLocaleDateString('pt-BR')}</td>
                      <td className="py-3 pl-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="tertiary" size="sm" onClick={() => handleLoadSimulation(sim)}>
                            Abrir
                          </Button>
                          <Button
                            variant="tertiary"
                            size="sm"
                            className="text-rose-700 hover:text-rose-800"
                            onClick={() => setDeleteConfirmId(sim.id)}
                          >
                            Excluir
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {deleteConfirmId && (
        <Modal isOpen={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} title="Confirmar exclusão">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Excluir esta simulação? Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteConfirmId(null)}>
                Cancelar
              </Button>
              <Button variant="primary" className="bg-rose-600 hover:bg-rose-700" onClick={() => handleDelete(deleteConfirmId)}>
                Excluir
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ResultadoSimples({ result }: { result: SimplesIbsCbsResult }) {
  const { simples_puro: puro, regime_regular: regular, efeito_adquirente: adq, parametros: p } = result;
  const melhor = result.regime_mais_economico;
  const economia = Math.abs(result.diferenca_anual);

  return (
    <div className="space-y-4" data-testid="resultado-simples">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={melhor === 'simples_puro' ? 'ring-2 ring-emerald-400 border-emerald-500' : ''}>
          <h3 className="text-lg font-semibold text-amber-700">Simples puro</h3>
          <p className="text-xs text-slate-500 mt-1">
            IBS/CBS dentro do DAS · {p.anexo}, faixa {p.faixa}
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-4">{formatCurrency(puro.ibs_cbs_anual)}</p>
          <p className="text-sm text-slate-600">{formatPct(puro.aliquota_sobre_receita)} da receita líquida</p>
          <p className="text-xs text-slate-500 mt-3">
            DAS efetivo {formatPct(p.aliquota_efetiva_simples)}
            {p.aliquota_efetiva_simples_informada ? ' (informado)' : ' (pela faixa)'} × participação CBS {formatPct(p.participacao_cbs_das)}
            {p.participacao_ibs_das > 0 ? ` + IBS ${formatPct(p.participacao_ibs_das)}` : ''}
          </p>
        </Card>

        <Card className={melhor === 'regime_regular' ? 'ring-2 ring-emerald-400 border-emerald-500' : ''}>
          <h3 className="text-lg font-semibold text-blue-700">Regime regular</h3>
          <p className="text-xs text-slate-500 mt-1">
            CBS {formatPct(p.aliquota_cbs)} + IBS {formatPct(p.aliquota_ibs)}, com crédito
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-4">{formatCurrency(regular.saldo_recolher)}</p>
          <p className="text-sm text-slate-600">{formatPct(regular.aliquota_sobre_receita)} da receita líquida</p>
          <dl className="text-xs text-slate-600 mt-3 space-y-1">
            <div className="flex justify-between">
              <dt>Débito</dt>
              <dd>{formatCurrency(regular.debito)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Crédito das despesas</dt>
              <dd>− {formatCurrency(regular.credito)}</dd>
            </div>
            {regular.saldo_credor > 0 && (
              <div className="flex justify-between text-emerald-700">
                <dt>Saldo credor</dt>
                <dd>{formatCurrency(regular.saldo_credor)}</dd>
              </div>
            )}
          </dl>
        </Card>

        <Card className="bg-emerald-50/40 border-emerald-200">
          <h3 className="text-lg font-semibold text-emerald-800">Resultado</h3>
          <p className="text-2xl font-bold text-emerald-800 mt-4">{REGIME_LABELS[melhor]}</p>
          {melhor !== 'empate' && (
            <p className="text-sm text-emerald-700 mt-1">
              Economia de {formatCurrency(economia)} por ano ({formatCurrency(economia / 12)} por mês) em IBS/CBS
            </p>
          )}
          <p className="text-xs text-slate-500 mt-3">Receita líquida {formatCurrency(result.receita_liquida_anual)} · ano {result.ano}</p>
        </Card>
      </div>

      {result.alertas.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3" role="status">
          <ul className="list-disc pl-5 text-sm text-amber-900 space-y-1">
            {result.alertas.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      {adq.percentual_vendas_empresas > 0 && (
        <Card title="Efeito no cliente empresa">
          <p className="text-sm text-slate-600 mb-3">
            {formatPct(adq.percentual_vendas_empresas)} da receita vai para empresas ({formatCurrency(adq.receita_para_empresas)}). É o crédito
            que esses clientes tomam na compra.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-slate-500">Com o regime regular</p>
              <p className="text-lg font-semibold text-slate-900">{formatCurrency(adq.credito_adquirente_regime_regular)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-slate-500">Com o Simples puro</p>
              <p className="text-lg font-semibold text-slate-900">{formatCurrency(adq.credito_adquirente_simples_puro)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-slate-500">Crédito que o cliente perde no Simples puro</p>
              <p className="text-lg font-semibold text-rose-700">{formatCurrency(adq.diferenca)}</p>
            </div>
          </div>
        </Card>
      )}

      {result.despesas.length > 0 && (
        <Card title="Memória do crédito">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[680px]">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="pb-2 pr-3 font-medium">Despesa</th>
                  <th className="pb-2 px-3 font-medium text-right whitespace-nowrap">Valor anual</th>
                  <th className="pb-2 px-3 font-medium text-right">Alíquota</th>
                  <th className="pb-2 px-3 font-medium text-right">Crédito</th>
                  <th className="pb-2 pl-3 font-medium">Observação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.despesas.map((d, i) => (
                  <tr key={`${d.descricao}-${i}`}>
                    <td className="py-2 pr-3 text-slate-900">
                      {d.descricao}
                      <span className="block text-xs text-slate-500">{CATEGORIA_LABELS[d.categoria]}</span>
                    </td>
                    <td className="py-2 px-3 text-right whitespace-nowrap">{formatCurrency(d.valor_anual)}</td>
                    <td className="py-2 px-3 text-right whitespace-nowrap">{d.gera_credito ? formatPct(d.aliquota_credito) : '—'}</td>
                    <td className="py-2 px-3 text-right font-medium whitespace-nowrap">{formatCurrency(d.credito)}</td>
                    <td className="py-2 pl-3 text-xs text-slate-500">{d.motivo_sem_credito ?? ''}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 font-semibold">
                  <td className="pt-2 pr-3">Total</td>
                  <td className="pt-2 px-3 text-right whitespace-nowrap">{formatCurrency(result.despesas.reduce((s, d) => s + d.valor_anual, 0))}</td>
                  <td />
                  <td className="pt-2 px-3 text-right whitespace-nowrap">{formatCurrency(regular.credito)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-3">Parâmetros {p.versao}</p>
        </Card>
      )}
    </div>
  );
}
