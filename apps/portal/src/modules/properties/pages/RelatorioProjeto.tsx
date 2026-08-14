import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { Modal } from '../../../shared/components/ui/Modal';
import { useToast } from '../../../shared/components/ui/Toast';
import { ShareSimulationButton } from '../../../shared/components/ui/ShareSimulationButton';
import { ReportCoverSection } from '../../../lib/report-pdf/ReportCoverSection';
import { ReportPrintHeader, ReportPrintFooter } from '../../../lib/report-pdf/ReportPrintChrome';
import { useReportPrint } from '../../../lib/report-pdf/useReportPrint';
import { useBranding } from '../../../shared/hooks/useBranding';
import { clientService, type ClientWithCreatedAt } from '../../clients/services/client.service';
import { propertyService } from '../services/property.service';
import { irpfAltaRendaService, type IrpfAltaRendaRecord } from '../../irpf-alta-renda/services/irpf-alta-renda.service';
import { simuladorIN2306Service } from '../../simulador-in-2306/services/simulador-in-2306.service';
import { comparativoRegimesService } from '../../comparativo-regimes/services/comparativo-regimes.service';
import {
  ProjetoPpsInputSchema,
  SIMULATION_KIND_GANHO_CAPITAL_IMOVEL,
  SIMULATION_KIND_ITBI_INTEGRALIZACAO,
  SIMULATION_KIND_ITCMD_DOACAO,
  SIMULATION_KIND_LOCACAO_PF_PJ,
  SIMULATION_KIND_PROJETO_PPS,
  type ComparativoRegimesSimulation,
  type IN2306Simulation,
  type ProjetoPpsInput,
  type ProjetoPpsResult,
  type PropertySimulation,
} from '@shared/core';

function fmtBRL(v: unknown): string {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return '—';
  return 'R$\u00a0' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function labelSim(s: PropertySimulation): string {
  const when = new Date(s.created_at).toLocaleDateString('pt-BR');
  return `${s.title || 'Sem título'} · ${s.ano} · ${when}`;
}

function resumoLocacao(s: PropertySimulation): ProjetoPpsResult['resumos'][number] {
  const r = s.result_data as Record<string, unknown>;
  const cenarios = (r.cenarios ?? r) as Record<string, unknown>;
  const pf = cenarios.pf as Record<string, unknown> | undefined;
  const pj = cenarios.pj as Record<string, unknown> | undefined;
  return {
    kind: 'locacao',
    titulo: s.title || 'Locação PF × PJ × Reforma',
    linhas: [
      { label: 'IR PF (anual)', valor: fmtBRL(pf?.imposto_total ?? pf?.imposto_anual) },
      { label: 'Imposto PJ (anual)', valor: fmtBRL(pj?.imposto_total ?? pj?.imposto_anual) },
    ],
  };
}

function resumoGc(s: PropertySimulation): ProjetoPpsResult['resumos'][number] {
  const r = s.result_data as Record<string, unknown>;
  return {
    kind: 'ganho_capital',
    titulo: s.title || 'Ganho de capital',
    linhas: [
      { label: 'IRPF', valor: fmtBRL(r.irpfTotal) },
      { label: 'GC bruto', valor: fmtBRL(r.gcBruto) },
    ],
  };
}

function resumoItbi(s: PropertySimulation): ProjetoPpsResult['resumos'][number] {
  const r = s.result_data as Record<string, unknown>;
  return {
    kind: 'itbi',
    titulo: s.title || 'ITBI na integralização',
    linhas: [
      { label: 'Enquadramento', valor: String(r.enquadramento ?? '—') },
      { label: 'ITBI', valor: fmtBRL(r.itbi) },
    ],
  };
}

function resumoItcmd(s: PropertySimulation): ProjetoPpsResult['resumos'][number] {
  const r = s.result_data as Record<string, unknown>;
  return {
    kind: 'itcmd',
    titulo: s.title || 'ITCMD na doação',
    linhas: [
      { label: 'UF', valor: String(r.uf ?? '—') },
      { label: 'ITCMD', valor: fmtBRL(r.itcmd) },
    ],
  };
}

function resumoIrpf(r: IrpfAltaRendaRecord): ProjetoPpsResult['resumos'][number] {
  return {
    kind: 'irpf',
    titulo: r.title || `IRPF alta renda ${r.ano}`,
    linhas: [
      { label: 'Contribuinte', valor: r.contribuinte_nome },
      { label: 'Base combinada', valor: fmtBRL(r.base_calculo_combinada) },
    ],
  };
}

function resumoIn2306(s: IN2306Simulation): ProjetoPpsResult['resumos'][number] {
  const result = (s.result_data ?? {}) as Record<string, unknown>;
  const comparativo = result.comparativo as Record<string, unknown> | undefined;
  return {
    kind: 'in2306',
    titulo: s.title || `LC 224 / IN 2.306 · ${s.competence}`,
    linhas: [
      { label: 'Imposto a maior 2026×2025', valor: fmtBRL(comparativo?.imposto_a_maior_2026_vs_2025) },
    ],
  };
}

function resumoRegime(s: ComparativoRegimesSimulation): ProjetoPpsResult['resumos'][number] {
  const r = s.result_data as Record<string, unknown>;
  return {
    kind: 'regime',
    titulo: s.title || `Comparativo de regimes ${s.ano}`,
    linhas: [
      { label: 'Recomendação', valor: String(r.recomendacao ?? r.regime_recomendado ?? '—') },
    ],
  };
}

function RelatorioBody({
  resumos,
  recomendacao,
}: {
  resumos: ProjetoPpsResult['resumos'];
  recomendacao: string;
}) {
  return (
    <>
      {resumos.map((r) => (
        <section key={r.kind} className="mb-4 break-inside-avoid">
          <h3 className="text-sm font-bold">{r.titulo}</h3>
          <dl className="grid grid-cols-2 gap-1 text-sm">
            {r.linhas.map((l) => (
              <div key={l.label} className="contents">
                <dt className="text-slate-500">{l.label}</dt>
                <dd className="text-right">{l.valor}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      {recomendacao && (
        <section className="mb-4">
          <h3 className="text-sm font-bold">Recomendação</h3>
          <p className="text-sm whitespace-pre-wrap">{recomendacao}</p>
        </section>
      )}
      <p className="text-xs text-slate-500">
        Simulação para reunião. Não substitui guia, DAA nem parecer. Os números vêm das simulações já salvas; nada foi recalculado neste relatório.
      </p>
    </>
  );
}

export function RelatorioProjeto() {
  const { error: showError, success: showSuccess, ToastContainer } = useToast();
  const branding = useBranding();
  const { print } = useReportPrint('relatorio-projeto-print-wrapper');

  const [clients, setClients] = useState<ClientWithCreatedAt[]>([]);
  const [clientId, setClientId] = useState('');
  const [recomendacao, setRecomendacao] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [reportClientName, setReportClientName] = useState('');
  const [savedReports, setSavedReports] = useState<PropertySimulation[]>([]);
  const [deleteReportModal, setDeleteReportModal] = useState<{ id: string; title: string } | null>(null);

  const [locacoes, setLocacoes] = useState<PropertySimulation[]>([]);
  const [gcs, setGcs] = useState<PropertySimulation[]>([]);
  const [itbis, setItbis] = useState<PropertySimulation[]>([]);
  const [itcmds, setItcmds] = useState<PropertySimulation[]>([]);
  const [irpfs, setIrpfs] = useState<IrpfAltaRendaRecord[]>([]);
  const [in2306s, setIn2306s] = useState<IN2306Simulation[]>([]);
  const [regimes, setRegimes] = useState<ComparativoRegimesSimulation[]>([]);

  const [locacaoId, setLocacaoId] = useState('');
  const [gcId, setGcId] = useState('');
  const [itbiId, setItbiId] = useState('');
  const [itcmdId, setItcmdId] = useState('');
  const [irpfId, setIrpfId] = useState('');
  const [in2306Id, setIn2306Id] = useState('');
  const [regimeId, setRegimeId] = useState('');
  const pendingSelectedRef = useRef<ProjetoPpsInput['selected'] | null>(null);

  const applySelected = useCallback((selected: ProjetoPpsInput['selected']) => {
    setLocacaoId(selected.locacao_id ?? '');
    setGcId(selected.ganho_capital_id ?? '');
    setItbiId(selected.itbi_id ?? '');
    setItcmdId(selected.itcmd_id ?? '');
    setIrpfId(selected.irpf_id ?? '');
    setIn2306Id(selected.in2306_id ?? '');
    setRegimeId(selected.regime_id ?? '');
  }, []);

  useEffect(() => {
    clientService.list().then(setClients).catch(() => showError('Não foi possível carregar clientes'));
  }, [showError]);

  useEffect(() => {
    if (!clientId) {
      setLocacoes([]);
      setGcs([]);
      setItbis([]);
      setItcmds([]);
      setIrpfs([]);
      setIn2306s([]);
      setRegimes([]);
      setLocacaoId('');
      setGcId('');
      setItbiId('');
      setItcmdId('');
      setIrpfId('');
      setIn2306Id('');
      setRegimeId('');
      return;
    }
    if (!pendingSelectedRef.current) {
      setLocacaoId('');
      setGcId('');
      setItbiId('');
      setItcmdId('');
      setIrpfId('');
      setIn2306Id('');
      setRegimeId('');
    }
    const opts = { client_id: clientId, limit: 50 };
    const pending = pendingSelectedRef.current;
    Promise.all([
      propertyService.listSimulations({ ...opts, simulation_kind: SIMULATION_KIND_LOCACAO_PF_PJ }).then((r) => r.simulations).catch(() => [] as PropertySimulation[]),
      propertyService.listSimulations({ ...opts, simulation_kind: SIMULATION_KIND_GANHO_CAPITAL_IMOVEL }).then((r) => r.simulations).catch(() => [] as PropertySimulation[]),
      propertyService.listSimulations({ ...opts, simulation_kind: SIMULATION_KIND_ITBI_INTEGRALIZACAO }).then((r) => r.simulations).catch(() => [] as PropertySimulation[]),
      propertyService.listSimulations({ ...opts, simulation_kind: SIMULATION_KIND_ITCMD_DOACAO }).then((r) => r.simulations).catch(() => [] as PropertySimulation[]),
      irpfAltaRendaService.list({ limit: 50 }).then((r) => r.items).catch(() => [] as IrpfAltaRendaRecord[]),
      simuladorIN2306Service.list(opts).then((r) => r.simulations).catch(() => [] as IN2306Simulation[]),
      comparativoRegimesService.list(opts).then((r) => r.simulations).catch(() => [] as ComparativoRegimesSimulation[]),
    ]).then(([loc, gc, itbi, itcmd, irpf, in2306, regime]) => {
      setLocacoes(loc);
      setGcs(gc);
      setItbis(itbi);
      setItcmds(itcmd);
      setIrpfs(irpf);
      setIn2306s(in2306);
      setRegimes(regime);
      if (pending && pendingSelectedRef.current === pending) {
        applySelected(pending);
        pendingSelectedRef.current = null;
      }
    });
  }, [clientId, applySelected]);

  const refreshSavedReports = useCallback(async () => {
    try {
      const listRes = await propertyService.listSimulations({
        page: 1,
        limit: 20,
        simulation_kind: SIMULATION_KIND_PROJETO_PPS,
        ...(clientId ? { client_id: clientId } : {}),
      });
      setSavedReports(listRes.simulations);
    } catch {
      setSavedReports([]);
    }
  }, [clientId]);

  useEffect(() => {
    void refreshSavedReports();
  }, [refreshSavedReports]);

  const clientName = clients.find((c) => c.id === clientId)?.name ?? '';
  const effectiveClientName = clientName || reportClientName.trim();

  const resumos = useMemo(() => {
    const out: ProjetoPpsResult['resumos'] = [];
    const loc = locacoes.find((s) => s.id === locacaoId);
    const gc = gcs.find((s) => s.id === gcId);
    const itbi = itbis.find((s) => s.id === itbiId);
    const itcmd = itcmds.find((s) => s.id === itcmdId);
    const irpf = irpfs.find((s) => s.id === irpfId);
    const in2306 = in2306s.find((s) => s.id === in2306Id);
    const regime = regimes.find((s) => s.id === regimeId);
    if (loc) out.push(resumoLocacao(loc));
    if (gc) out.push(resumoGc(gc));
    if (itbi) out.push(resumoItbi(itbi));
    if (itcmd) out.push(resumoItcmd(itcmd));
    if (irpf) out.push(resumoIrpf(irpf));
    if (in2306) out.push(resumoIn2306(in2306));
    if (regime) out.push(resumoRegime(regime));
    return out;
  }, [locacaoId, gcId, itbiId, itcmdId, irpfId, in2306Id, regimeId, locacoes, gcs, itbis, itcmds, irpfs, in2306s, regimes]);

  const handleSave = useCallback(async () => {
    if (!clientId) {
      showError('Selecione um cliente.');
      return;
    }
    if (resumos.length === 0) {
      showError('Marque ao menos uma simulação já salva. O relatório não recalcula.');
      return;
    }
    setSaving(true);
    try {
      await propertyService.saveSnapshotSimulation({
        client_id: clientId,
        title: `Relatório do projeto — ${clientName}`,
        ano: new Date().getFullYear(),
        simulation_kind: SIMULATION_KIND_PROJETO_PPS,
        input: {
          snapshot_version: 1,
          client_id: clientId,
          recomendacao,
          selected: {
            locacao_id: locacaoId || undefined,
            ganho_capital_id: gcId || undefined,
            itbi_id: itbiId || undefined,
            itcmd_id: itcmdId || undefined,
            irpf_id: irpfId || undefined,
            in2306_id: in2306Id || undefined,
            regime_id: regimeId || undefined,
          },
        },
        result: { resumos },
      });
      showSuccess('Relatório salvo.');
      await refreshSavedReports();
    } catch {
      showError('Não foi possível salvar o relatório.');
    } finally {
      setSaving(false);
    }
  }, [clientId, clientName, recomendacao, resumos, locacaoId, gcId, itbiId, itcmdId, irpfId, in2306Id, regimeId, showError, showSuccess, refreshSavedReports]);

  const handleLoadReport = useCallback(async (id: string) => {
    setSaving(true);
    try {
      const sim = await propertyService.getSimulationById(id);
      if (sim.simulation_kind !== SIMULATION_KIND_PROJETO_PPS) {
        showError('Tipo de simulação incompatível');
        return;
      }
      const loaded = ProjetoPpsInputSchema.safeParse(sim.input_data);
      if (!loaded.success) {
        showError('Não foi possível carregar os dados deste relatório');
        return;
      }
      const inp = loaded.data;
      pendingSelectedRef.current = inp.selected;
      setRecomendacao(inp.recomendacao);
      if (inp.client_id === clientId) {
        applySelected(inp.selected);
        pendingSelectedRef.current = null;
      } else {
        setClientId(inp.client_id);
      }
      showSuccess('Relatório carregado.');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao carregar');
    } finally {
      setSaving(false);
    }
  }, [applySelected, clientId, showError, showSuccess]);

  const handleDeleteReport = useCallback(async () => {
    if (!deleteReportModal) return;
    setSaving(true);
    try {
      await propertyService.deleteSimulation(deleteReportModal.id);
      showSuccess('Relatório excluído.');
      setDeleteReportModal(null);
      await refreshSavedReports();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao excluir');
    } finally {
      setSaving(false);
    }
  }, [deleteReportModal, refreshSavedReports, showError, showSuccess]);

  const handleDoPrint = useCallback(() => {
    setShowPrintPreview(false);
    print();
  }, [print]);

  const SelectSaved = ({
    label,
    value,
    onChange,
    options,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: { id: string; label: string }[];
  }) => (
    <label className="text-sm text-slate-700 block">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        disabled={!clientId || options.length === 0}
      >
        <option value="">{options.length === 0 ? 'Nenhuma simulação salva' : 'Não incluir'}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="space-y-6">
      <ToastContainer />
      <header>
        <h1 className="text-xl font-bold text-slate-900">Relatório do projeto</h1>
        <p className="text-sm text-slate-500">
          Junta simulações já salvas em um PDF com a marca do escritório. Não recalcula o que não foi salvo.
        </p>
      </header>

      <Card className="space-y-4">
        <label className="text-sm text-slate-700 block">
          Cliente
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="mt-1 w-full max-w-md rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Selecione</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectSaved label="Locação PF × PJ" value={locacaoId} onChange={setLocacaoId} options={locacoes.map((s) => ({ id: s.id, label: labelSim(s) }))} />
          <SelectSaved label="Ganho de capital" value={gcId} onChange={setGcId} options={gcs.map((s) => ({ id: s.id, label: labelSim(s) }))} />
          <SelectSaved label="ITBI" value={itbiId} onChange={setItbiId} options={itbis.map((s) => ({ id: s.id, label: labelSim(s) }))} />
          <SelectSaved label="ITCMD" value={itcmdId} onChange={setItcmdId} options={itcmds.map((s) => ({ id: s.id, label: labelSim(s) }))} />
          <SelectSaved
            label="IRPF alta renda"
            value={irpfId}
            onChange={setIrpfId}
            options={irpfs.map((s) => ({ id: s.id, label: `${s.title || s.contribuinte_nome} · ${s.ano}` }))}
          />
          <SelectSaved
            label="LC 224 / IN 2.306"
            value={in2306Id}
            onChange={setIn2306Id}
            options={in2306s.map((s) => ({ id: s.id, label: s.title || `Competência ${s.competence}` }))}
          />
          <SelectSaved
            label="Comparativo de regimes"
            value={regimeId}
            onChange={setRegimeId}
            options={regimes.map((s) => ({ id: s.id, label: s.title || `Ano ${s.ano}` }))}
          />
        </div>
        <label className="text-sm text-slate-700 block">
          Recomendação (editável)
          <textarea
            value={recomendacao}
            onChange={(e) => setRecomendacao(e.target.value)}
            rows={5}
            maxLength={8000}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Parágrafo para a reunião com o cliente."
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSave} disabled={saving || !clientId}>
            {saving ? 'Salvando…' : 'Salvar relatório'}
          </Button>
          <Button variant="secondary" onClick={() => setShowPrintPreview(true)} disabled={resumos.length === 0}>
            Gerar PDF
          </Button>
        </div>
      </Card>

      {resumos.length > 0 && (
        <Card className="space-y-4">
          <h2 className="font-semibold text-slate-900">Prévia</h2>
          {resumos.map((r) => (
            <div key={r.kind} className="border-t border-slate-100 pt-3">
              <p className="text-sm font-semibold">{r.titulo}</p>
              <dl className="mt-1 grid grid-cols-2 gap-1 text-sm">
                {r.linhas.map((l) => (
                  <div key={l.label} className="contents">
                    <dt className="text-slate-500">{l.label}</dt>
                    <dd className="text-right">{l.valor}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
          {recomendacao && <p className="text-sm text-slate-700 whitespace-pre-wrap">{recomendacao}</p>}
        </Card>
      )}

      <Card>
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Relatórios salvos</h2>
        {savedReports.length === 0 ? (
          <p className="text-slate-500">Nenhum relatório salvo.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {savedReports.map((s) => (
              <li key={s.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-medium text-slate-800">{s.title || `Relatório ${s.ano}`}</span>
                  <span className="text-slate-500 text-sm ml-2">Ano {s.ano}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button variant="secondary" size="sm" disabled={saving} onClick={() => void handleLoadReport(s.id)}>
                    Abrir
                  </Button>
                  <ShareSimulationButton
                    simulationId={s.id}
                    simulationType="projeto_pps"
                    title={s.title ?? undefined}
                    usePropertyEndpoint
                  />
                  <Button
                    variant="tertiary"
                    size="sm"
                    disabled={saving}
                    onClick={() =>
                      setDeleteReportModal({
                        id: s.id,
                        title: s.title || `Relatório ${s.ano}`,
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

      <div id="relatorio-projeto-print-wrapper" className="hidden print:block">
        <ReportPrintHeader
          variant="printSheet"
          reportTitle="Relatório do projeto"
          metaLine={effectiveClientName}
          logoUrl={branding?.report_logo_url}
          brandName={branding?.report_brand_name}
        />
        <ReportCoverSection
          variant="printSheet"
          title="Relatório do projeto"
          clientName={effectiveClientName || undefined}
          subtitle="Memória resumida das simulações selecionadas"
          brandName={branding?.report_brand_name}
        />
        <RelatorioBody resumos={resumos} recomendacao={recomendacao} />
        <ReportPrintFooter variant="printSheet" brandName={branding?.report_brand_name} />
      </div>

      <Modal
        isOpen={!!deleteReportModal}
        onClose={() => setDeleteReportModal(null)}
        title="Excluir relatório?"
        size="sm"
      >
        <p className="text-sm text-slate-600 mb-4">
          Confirma a exclusão de <strong>{deleteReportModal?.title}</strong>? Esta ação não pode ser desfeita.
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setDeleteReportModal(null)}>
            Cancelar
          </Button>
          <Button type="button" variant="primary" className="!bg-red-600 hover:!bg-red-700" onClick={() => void handleDeleteReport()}>
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
          <div
            className="report-preview border border-slate-200 rounded-lg overflow-hidden bg-white"
            style={{ width: '210mm', maxWidth: '100%', maxHeight: '65vh', overflowY: 'auto' }}
          >
            <div className="report-preview-inner p-4">
              <ReportPrintHeader
                variant="previewModal"
                reportTitle="Relatório do projeto"
                metaLine={effectiveClientName || undefined}
                logoUrl={branding?.report_logo_url}
                brandName={branding?.report_brand_name}
              />
              <ReportCoverSection
                variant="previewModal"
                title="Relatório do projeto"
                clientName={effectiveClientName || undefined}
                subtitle="Memória resumida das simulações selecionadas"
                brandName={branding?.report_brand_name}
              />
              <RelatorioBody resumos={resumos} recomendacao={recomendacao} />
              <ReportPrintFooter variant="previewModal" brandName={branding?.report_brand_name} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowPrintPreview(false)}>
              Fechar
            </Button>
            <Button variant="primary" onClick={handleDoPrint} disabled={resumos.length === 0}>
              Imprimir / Exportar PDF
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default RelatorioProjeto;
