import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { Modal } from '../../../shared/components/ui/Modal';
import { MoneyInput } from '../../../shared/components/ui/MoneyInput';
import { useToast } from '../../../shared/components/ui/Toast';
import { ShareSimulationButton } from '../../../shared/components/ui/ShareSimulationButton';
import { ReportCoverSection } from '../../../lib/report-pdf/ReportCoverSection';
import { ReportPrintHeader, ReportPrintFooter } from '../../../lib/report-pdf/ReportPrintChrome';
import { useReportPrint } from '../../../lib/report-pdf/useReportPrint';
import { useBranding } from '../../../shared/hooks/useBranding';
import { useClients } from '../../../shared/hooks/useClients';
import { propertyService } from '../services/property.service';
import {
  calcularItcmd,
  ITCMD_TABELA_UFS,
  ItcmdSimulationInputSchema,
  SIMULATION_KIND_ITCMD_DOACAO,
  temTabelaItcmd,
  type ItcmdBemTipo,
  type ItcmdCriterioImovel,
  type ItcmdCriterioQuotas,
  type ItcmdParentesco,
  type ItcmdSimulationInput,
  type ItcmdSimulationResult,
  type ItcmdTipoSociedade,
  type PropertySimulation,
} from '@shared/core';

const UFS = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT',
  'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
];

function fmtBRL(v: number): string {
  return 'R$\u00a0' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ItcmdReportMemory({ result }: { result: ItcmdSimulationResult }) {
  return (
    <>
      <dl className="grid grid-cols-2 gap-2 text-sm mb-4">
        <dt className="text-slate-500">UF</dt>
        <dd className="text-right font-medium">{result.uf}</dd>
        <dt className="text-slate-500">Valor do bem</dt>
        <dd className="text-right font-medium">{fmtBRL(result.valor_bem)}</dd>
        {result.criterio_base && (
          <>
            <dt className="text-slate-500">Critério</dt>
            <dd className="text-right font-medium">{result.criterio_base}</dd>
          </>
        )}
        <dt className="text-slate-500">Base</dt>
        <dd className="text-right font-medium">{fmtBRL(result.base)}</dd>
        <dt className="text-slate-500">Alíquota</dt>
        <dd className="text-right font-medium">{result.aliquota_percent}%</dd>
        <dt className="text-slate-500">ITCMD</dt>
        <dd className="text-right text-lg font-bold text-slate-900">{fmtBRL(result.itcmd)}</dd>
      </dl>
      <p className="text-sm text-slate-700 mb-3">{result.efeito_usufruto}</p>
      <ol className="text-xs space-y-1 text-slate-600">
        {result.memoria.map((m) => (
          <li key={m.ordem}>
            {m.ordem}. {m.descricao}
            {m.valor != null ? ` — ${fmtBRL(m.valor)}` : ''}
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs text-slate-500">{result.aviso}</p>
    </>
  );
}

export function SimuladorItcmd() {
  const { error: showError, success: showSuccess, ToastContainer } = useToast();
  const branding = useBranding();
  const { print } = useReportPrint('simulador-itcmd-print-wrapper');

  const { clients } = useClients();
  const [clientId, setClientId] = useState('');
  const [uf, setUf] = useState('SP');
  const [tipoBem, setTipoBem] = useState<ItcmdBemTipo>('imovel');
  const [criterioImovel, setCriterioImovel] = useState<ItcmdCriterioImovel>('mercado');
  const [criterioQuotas, setCriterioQuotas] = useState<ItcmdCriterioQuotas>('patrimonio_liquido');
  const [tipoSociedade, setTipoSociedade] = useState<ItcmdTipoSociedade>('ltda');
  const [valorMercado, setValorMercado] = useState(0);
  const [valorReferenciaItbi, setValorReferenciaItbi] = useState(0);
  const [valorIptu, setValorIptu] = useState(0);
  const [valorPl, setValorPl] = useState(0);
  const [parentesco, setParentesco] = useState<ItcmdParentesco>('descendente');
  const [reserva, setReserva] = useState(false);
  const [idade, setIdade] = useState(60);
  const [aliquotaManual, setAliquotaManual] = useState(4);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [simulations, setSimulations] = useState<PropertySimulation[]>([]);
  const [deleteSimulationModal, setDeleteSimulationModal] = useState<{ id: string; title: string } | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [reportClientName, setReportClientName] = useState('');

  const usaTabela = temTabelaItcmd(uf);

  const valorResolvido =
    tipoBem === 'imovel'
      ? criterioImovel === 'mercado'
        ? valorMercado
        : criterioImovel === 'referencia_itbi'
          ? valorReferenciaItbi
          : valorIptu
      : criterioQuotas === 'patrimonio_liquido'
        ? valorPl
        : valorMercado;

  const input: ItcmdSimulationInput = useMemo(
    () => ({
      snapshot_version: 1,
      uf,
      tipo_bem: tipoBem,
      valor: valorResolvido,
      parentesco,
      reserva_usufruto: reserva,
      idade_usufrutuario: reserva ? idade : undefined,
      aliquota_manual_percent: usaTabela ? undefined : aliquotaManual,
      criterio_base_imovel: tipoBem === 'imovel' ? criterioImovel : undefined,
      criterio_quotas: tipoBem === 'quotas' ? criterioQuotas : undefined,
      tipo_sociedade: tipoBem === 'quotas' ? tipoSociedade : undefined,
      valor_mercado: valorMercado,
      valor_referencia_itbi: valorReferenciaItbi,
      valor_iptu: valorIptu,
      valor_pl: valorPl,
    }),
    [
      uf,
      tipoBem,
      valorResolvido,
      parentesco,
      reserva,
      idade,
      aliquotaManual,
      usaTabela,
      criterioImovel,
      criterioQuotas,
      tipoSociedade,
      valorMercado,
      valorReferenciaItbi,
      valorIptu,
      valorPl,
    ]
  );

  const parsed = ItcmdSimulationInputSchema.safeParse(input);
  const result = parsed.success ? calcularItcmd(parsed.data) : null;
  const clientName = clients.find((c) => c.id === clientId)?.name ?? '';
  const effectiveClientName = clientName || reportClientName.trim();

  const refreshSimulations = useCallback(async () => {
    try {
      const listRes = await propertyService.listSimulations({
        page: 1,
        limit: 20,
        simulation_kind: SIMULATION_KIND_ITCMD_DOACAO,
        ...(clientId ? { client_id: clientId } : {}),
      });
      setSimulations(listRes.simulations);
    } catch {
      setSimulations([]);
    }
  }, [clientId]);

  useEffect(() => {
    void refreshSimulations();
  }, [refreshSimulations]);

  const handleSave = useCallback(async () => {
    if (!clientId) {
      showError('Selecione um cliente para salvar.');
      return;
    }
    if (!parsed.success || !result) {
      showError(parsed.success ? 'Dados inválidos.' : parsed.error.issues[0]?.message || 'Dados inválidos.');
      return;
    }
    setSaving(true);
    try {
      await propertyService.saveSnapshotSimulation({
        client_id: clientId,
        title: title.trim() || undefined,
        ano: new Date().getFullYear(),
        simulation_kind: SIMULATION_KIND_ITCMD_DOACAO,
        input: parsed.data,
        result,
      });
      showSuccess('Simulação de ITCMD salva.');
      await refreshSimulations();
    } catch {
      showError('Não foi possível salvar a simulação.');
    } finally {
      setSaving(false);
    }
  }, [clientId, parsed, result, showError, showSuccess, title, refreshSimulations]);

  const handleLoadSimulation = useCallback(async (id: string) => {
    setSaving(true);
    try {
      const sim = await propertyService.getSimulationById(id);
      if (sim.simulation_kind !== SIMULATION_KIND_ITCMD_DOACAO) {
        showError('Tipo de simulação incompatível');
        return;
      }
      const loaded = ItcmdSimulationInputSchema.safeParse(sim.input_data);
      if (!loaded.success) {
        showError('Não foi possível carregar os dados desta simulação');
        return;
      }
      const inp = loaded.data;
      setUf(inp.uf);
      setTipoBem(inp.tipo_bem);
      setCriterioImovel(inp.criterio_base_imovel ?? 'mercado');
      setCriterioQuotas(inp.criterio_quotas ?? 'patrimonio_liquido');
      setTipoSociedade(inp.tipo_sociedade ?? 'ltda');
      setValorMercado(inp.valor_mercado ?? (inp.tipo_bem === 'imovel' ? inp.valor : 0));
      setValorReferenciaItbi(inp.valor_referencia_itbi ?? 0);
      setValorIptu(inp.valor_iptu ?? 0);
      setValorPl(inp.valor_pl ?? (inp.tipo_bem === 'quotas' ? inp.valor : 0));
      setParentesco(inp.parentesco);
      setReserva(inp.reserva_usufruto);
      setIdade(inp.idade_usufrutuario ?? 60);
      if (inp.aliquota_manual_percent != null) setAliquotaManual(inp.aliquota_manual_percent);
      setClientId(sim.client_id ?? '');
      setTitle(sim.title ?? '');
      showSuccess('Simulação carregada.');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao carregar');
    } finally {
      setSaving(false);
    }
  }, [showError, showSuccess]);

  const handleDeleteSimulation = useCallback(async () => {
    if (!deleteSimulationModal) return;
    setSaving(true);
    try {
      await propertyService.deleteSimulation(deleteSimulationModal.id);
      showSuccess('Simulação excluída.');
      setDeleteSimulationModal(null);
      await refreshSimulations();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao excluir');
    } finally {
      setSaving(false);
    }
  }, [deleteSimulationModal, refreshSimulations, showError, showSuccess]);

  const handleDoPrint = useCallback(() => {
    setShowPrintPreview(false);
    print();
  }, [print]);

  return (
    <div className="space-y-6">
      <ToastContainer />
      <header>
        <h1 className="text-xl font-bold text-slate-900">ITCMD na doação</h1>
        <p className="text-sm text-slate-500">
          Tabelas embutidas: {ITCMD_TABELA_UFS.join(', ')}. Demais UFs: informe a alíquota. Simulação — não substitui a guia estadual.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-slate-700">
              Cliente
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Avulso / sem salvar</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-700">
              UF
              <select
                value={uf}
                onChange={(e) => setUf(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                {UFS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                    {temTabelaItcmd(u) ? ' (tabela)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-700">
              Tipo
              <select
                value={tipoBem}
                onChange={(e) => setTipoBem(e.target.value as ItcmdBemTipo)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="imovel">Imóvel</option>
                <option value="quotas">Cotas (Ltda / S.A. fechada)</option>
              </select>
            </label>
            <label className="text-sm text-slate-700">
              Parentesco
              <select
                value={parentesco}
                onChange={(e) => setParentesco(e.target.value as ItcmdParentesco)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="ascendente">Ascendente</option>
                <option value="descendente">Descendente</option>
                <option value="outros">Outros</option>
              </select>
            </label>
            {tipoBem === 'imovel' ? (
              <>
                <label className="text-sm text-slate-700 sm:col-span-2">
                  Critério da base
                  <select
                    value={criterioImovel}
                    onChange={(e) => setCriterioImovel(e.target.value as ItcmdCriterioImovel)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="mercado">Valor de mercado</option>
                    <option value="referencia_itbi">Valor de referência do ITBI (planta/prefeitura)</option>
                    <option value="iptu">Valor de IPTU (venal)</option>
                  </select>
                </label>
                {criterioImovel === 'mercado' && (
                  <MoneyInput label="Valor de mercado" value={valorMercado} onChange={setValorMercado} prefix="R$" />
                )}
                {criterioImovel === 'referencia_itbi' && (
                  <MoneyInput
                    label="Valor de referência do ITBI"
                    value={valorReferenciaItbi}
                    onChange={setValorReferenciaItbi}
                    prefix="R$"
                  />
                )}
                {criterioImovel === 'iptu' && (
                  <MoneyInput label="Valor de IPTU (venal)" value={valorIptu} onChange={setValorIptu} prefix="R$" />
                )}
              </>
            ) : (
              <>
                <label className="text-sm text-slate-700">
                  Tipo de sociedade
                  <select
                    value={tipoSociedade}
                    onChange={(e) => setTipoSociedade(e.target.value as ItcmdTipoSociedade)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="ltda">Limitada</option>
                    <option value="sa_fechada">S.A. fechada</option>
                  </select>
                </label>
                <label className="text-sm text-slate-700">
                  Critério da base
                  <select
                    value={criterioQuotas}
                    onChange={(e) => setCriterioQuotas(e.target.value as ItcmdCriterioQuotas)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="patrimonio_liquido">Patrimônio líquido (último balanço)</option>
                    <option value="valor_mercado">Valor de mercado</option>
                  </select>
                </label>
                {criterioQuotas === 'patrimonio_liquido' ? (
                  <MoneyInput
                    label="Patrimônio líquido (proporcional às cotas)"
                    value={valorPl}
                    onChange={setValorPl}
                    prefix="R$"
                  />
                ) : (
                  <MoneyInput label="Valor de mercado das cotas" value={valorMercado} onChange={setValorMercado} prefix="R$" />
                )}
                <p className="sm:col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Doação de cotas de Ltda ou S.A. fechada: a base (PL do balanço vs valor de mercado) varia de estado para estado
                  e gera as maiores divergências. Informe o critério usado na reunião. Isto não substitui o enquadramento da UF
                  nem causa mortis.
                </p>
              </>
            )}
            {!usaTabela && (
              <Input
                label="Alíquota ITCMD (%)"
                type="number"
                min={0.01}
                max={20}
                step={0.01}
                value={aliquotaManual}
                onChange={(e) => setAliquotaManual(Number(e.target.value) || 0)}
              />
            )}
            <Input label="Título (opcional)" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={reserva} onChange={(e) => setReserva(e.target.checked)} />
            Reserva de usufruto
          </label>
          {reserva && (
            <Input
              label="Idade do usufrutuário"
              type="number"
              min={0}
              max={120}
              value={idade}
              onChange={(e) => setIdade(Number(e.target.value) || 0)}
            />
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave} disabled={saving || !clientId}>
              {saving ? 'Salvando…' : 'Salvar simulação'}
            </Button>
            <Button variant="secondary" onClick={() => setShowPrintPreview(true)} disabled={!result}>
              Gerar PDF
            </Button>
          </div>
        </Card>

        <Card className="space-y-3">
          {!result ? (
            <p className="text-sm text-slate-500">Preencha o valor e, se a UF não tiver tabela, a alíquota.</p>
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                {result.criterio_base && (
                  <>
                    <dt className="text-slate-500">Critério</dt>
                    <dd className="text-right font-medium">{result.criterio_base}</dd>
                  </>
                )}
                <dt className="text-slate-500">Base</dt>
                <dd className="text-right font-medium">{fmtBRL(result.base)}</dd>
                <dt className="text-slate-500">Alíquota</dt>
                <dd className="text-right font-medium">{result.aliquota_percent}%</dd>
                <dt className="text-slate-500">ITCMD</dt>
                <dd className="text-right text-lg font-bold text-slate-900">{fmtBRL(result.itcmd)}</dd>
              </dl>
              <p className="text-sm text-slate-700">{result.efeito_usufruto}</p>
              <ol className="space-y-1 text-xs text-slate-600">
                {result.memoria.map((m) => (
                  <li key={m.ordem}>
                    {m.ordem}. {m.descricao}
                    {m.valor != null ? ` — ${fmtBRL(m.valor)}` : ''}
                  </li>
                ))}
              </ol>
              <p className="text-xs text-slate-500">{result.aviso}</p>
            </>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Simulações salvas</h2>
        {simulations.length === 0 ? (
          <p className="text-slate-500">Nenhuma simulação salva.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {simulations.map((s) => (
              <li key={s.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-medium text-slate-800">{s.title || `Simulação ${s.ano}`}</span>
                  <span className="text-slate-500 text-sm ml-2">Ano {s.ano}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button variant="secondary" size="sm" disabled={saving} onClick={() => void handleLoadSimulation(s.id)}>
                    Abrir
                  </Button>
                  <ShareSimulationButton
                    simulationId={s.id}
                    simulationType="itcmd_doacao"
                    title={s.title ?? undefined}
                    usePropertyEndpoint
                  />
                  <Button
                    variant="tertiary"
                    size="sm"
                    disabled={saving}
                    onClick={() =>
                      setDeleteSimulationModal({
                        id: s.id,
                        title: s.title || `Simulação ${s.ano}`,
                      })
                    }
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    Excluir
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {result && (
        <div id="simulador-itcmd-print-wrapper" className="hidden print:block">
          <ReportPrintHeader
            variant="printSheet"
            reportTitle="ITCMD na doação"
            metaLine={effectiveClientName || result.uf}
            logoUrl={branding?.report_logo_url}
            brandName={branding?.report_brand_name}
          />
          <ReportCoverSection
            variant="printSheet"
            title="ITCMD na doação"
            clientName={effectiveClientName || undefined}
            subtitle={`${result.uf} · ${tipoBem}`}
            brandName={branding?.report_brand_name}
            details={[
              { label: 'Base', value: fmtBRL(result.base) },
              { label: 'ITCMD', value: fmtBRL(result.itcmd) },
            ]}
          />
          <ItcmdReportMemory result={result} />
          <ReportPrintFooter variant="printSheet" brandName={branding?.report_brand_name} />
        </div>
      )}

      <Modal
        isOpen={!!deleteSimulationModal}
        onClose={() => setDeleteSimulationModal(null)}
        title="Excluir simulação?"
        size="sm"
      >
        <p className="text-sm text-slate-600 mb-4">
          Confirma a exclusão de <strong>{deleteSimulationModal?.title}</strong>? Esta ação não pode ser desfeita.
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setDeleteSimulationModal(null)}>
            Cancelar
          </Button>
          <Button type="button" variant="primary" className="!bg-red-600 hover:!bg-red-700" onClick={() => void handleDeleteSimulation()}>
            Excluir
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
        title="Visualizar relatório antes de imprimir"
        size="xl"
      >
        <div className="space-y-4">
          {!clientId && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome do cliente (opcional)</label>
              <Input
                placeholder="Nome na capa do relatório"
                value={reportClientName}
                onChange={(e) => setReportClientName(e.target.value)}
                className="w-full"
              />
            </div>
          )}
          {result && (
            <div
              className="report-preview border border-slate-200 rounded-lg overflow-hidden bg-white"
              style={{ width: '210mm', maxWidth: '100%', maxHeight: '65vh', overflowY: 'auto' }}
            >
              <div className="report-preview-inner p-4">
                <ReportPrintHeader
                  variant="previewModal"
                  reportTitle="ITCMD na doação"
                  metaLine={effectiveClientName || result.uf}
                  logoUrl={branding?.report_logo_url}
                  brandName={branding?.report_brand_name}
                />
                <ReportCoverSection
                  variant="previewModal"
                  title="ITCMD na doação"
                  clientName={effectiveClientName || undefined}
                  subtitle={`${result.uf} · ${tipoBem}`}
                  brandName={branding?.report_brand_name}
                  details={[
                    { label: 'Base', value: fmtBRL(result.base) },
                    { label: 'ITCMD', value: fmtBRL(result.itcmd) },
                  ]}
                />
                <ItcmdReportMemory result={result} />
                <ReportPrintFooter variant="previewModal" brandName={branding?.report_brand_name} />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowPrintPreview(false)}>
              Fechar
            </Button>
            <Button variant="primary" onClick={handleDoPrint} disabled={!result}>
              Imprimir / Exportar PDF
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default SimuladorItcmd;
