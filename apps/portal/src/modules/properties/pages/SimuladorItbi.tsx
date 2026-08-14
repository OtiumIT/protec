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
import { clientService, type ClientWithCreatedAt } from '../../clients/services/client.service';
import { propertyService, type PropertyWithClient } from '../services/property.service';
import {
  calcularItbi,
  getItbiMunicipios,
  getItbiAliquota,
  ItbiSimulationInputSchema,
  SIMULATION_KIND_ITBI_INTEGRALIZACAO,
  type ItbiAtividadePj,
  type ItbiMunicipio,
  type ItbiSimulationInput,
  type ItbiSimulationResult,
  type PropertySimulation,
} from '@shared/core';

const UFS = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT',
  'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
];

const ENQ: Record<ItbiSimulationResult['enquadramento'], string> = {
  incidencia: 'Incidência',
  imunidade_total: 'Imunidade total',
  imunidade_parcial: 'Imunidade parcial',
};

function fmtBRL(v: number): string {
  return 'R$\u00a0' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ItbiReportMemory({ result }: { result: ItbiSimulationResult }) {
  return (
    <>
      <dl className="grid grid-cols-2 gap-2 text-sm mb-4">
        <dt className="text-slate-500">Enquadramento</dt>
        <dd className="text-right font-medium">{ENQ[result.enquadramento]}</dd>
        <dt className="text-slate-500">Referência</dt>
        <dd className="text-right font-medium">{fmtBRL(result.valor_referencia)}</dd>
        <dt className="text-slate-500">Base cheia</dt>
        <dd className="text-right font-medium">{fmtBRL(result.base_cheia)}</dd>
        <dt className="text-slate-500">Capital imune</dt>
        <dd className="text-right font-medium">{fmtBRL(result.capital_imune)}</dd>
        <dt className="text-slate-500">Base tributável</dt>
        <dd className="text-right font-medium">{fmtBRL(result.base_tributavel)}</dd>
        <dt className="text-slate-500">Alíquota</dt>
        <dd className="text-right font-medium">{result.aliquota_percent}%</dd>
        <dt className="text-slate-500">ITBI</dt>
        <dd className="text-right text-lg font-bold text-slate-900">{fmtBRL(result.itbi)}</dd>
      </dl>
      {result.alerta_laudemio && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 mb-3">
          Terreno de marinha: verificar laudêmio junto à SPU. Este simulador não calcula laudêmio.
        </p>
      )}
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

export function SimuladorItbi() {
  const { error: showError, success: showSuccess, ToastContainer } = useToast();
  const branding = useBranding();
  const { print } = useReportPrint('simulador-itbi-print-wrapper');

  const [clients, setClients] = useState<ClientWithCreatedAt[]>([]);
  const [properties, setProperties] = useState<PropertyWithClient[]>([]);
  const [clientId, setClientId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [uf, setUf] = useState('SP');
  const [municipio, setMunicipio] = useState('');
  const [municipioManual, setMunicipioManual] = useState(false);
  const [municipiosLista, setMunicipiosLista] = useState<ItbiMunicipio[]>(() => getItbiMunicipios('SP'));
  const [valorVenal, setValorVenal] = useState(0);
  const [valorMercado, setValorMercado] = useState(0);
  const [valorIntegralizacao, setValorIntegralizacao] = useState(0);
  const [percentual, setPercentual] = useState(100);
  const [atividade, setAtividade] = useState<ItbiAtividadePj>('holding_patrimonial');
  const [aliquota, setAliquota] = useState(2);
  const [terrenoMarinha, setTerrenoMarinha] = useState(false);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [simulations, setSimulations] = useState<PropertySimulation[]>([]);
  const [deleteSimulationModal, setDeleteSimulationModal] = useState<{ id: string; title: string } | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [reportClientName, setReportClientName] = useState('');

  useEffect(() => {
    clientService.list().then(setClients).catch(() => showError('Não foi possível carregar clientes'));
  }, [showError]);

  useEffect(() => {
    if (!clientId) {
      setProperties([]);
      setPropertyId('');
      return;
    }
    propertyService
      .list({ client_id: clientId, limit: 100 })
      .then((r) => setProperties(r.properties))
      .catch(() => setProperties([]));
  }, [clientId]);

  useEffect(() => {
    const p = properties.find((x) => x.id === propertyId);
    if (!p) return;
    if (p.uf) {
      setUf(p.uf);
      setMunicipiosLista(getItbiMunicipios(p.uf));
    }
    if (p.cidade) {
      setMunicipio(p.cidade);
      const rate = getItbiAliquota(p.uf ?? uf, p.cidade);
      if (rate !== undefined) {
        setAliquota(rate);
        setMunicipioManual(false);
      } else {
        setMunicipioManual(true);
      }
    }
  }, [propertyId, properties]);

  const handleUfChange = useCallback((newUf: string) => {
    setUf(newUf);
    setMunicipio('');
    setMunicipioManual(false);
    setMunicipiosLista(getItbiMunicipios(newUf));
  }, []);

  const handleMunicipioSelect = useCallback((nome: string) => {
    setMunicipio(nome);
    if (nome === '__manual__') {
      setMunicipio('');
      setMunicipioManual(true);
      return;
    }
    setMunicipioManual(false);
    const rate = getItbiAliquota(uf, nome);
    if (rate !== undefined) {
      setAliquota(rate);
    }
  }, [uf]);

  const input: ItbiSimulationInput = useMemo(
    () => ({
      snapshot_version: 1,
      fato_gerador: 'integralizacao',
      client_id: clientId || undefined,
      property_id: propertyId || undefined,
      uf,
      municipio: municipio.trim() || '—',
      valor_venal: valorVenal,
      valor_mercado: valorMercado,
      valor_integralizacao: valorIntegralizacao,
      percentual_imovel: percentual,
      atividade_pj: atividade,
      aliquota_percent: aliquota,
      terreno_marinha: terrenoMarinha,
    }),
    [
      clientId,
      propertyId,
      uf,
      municipio,
      valorVenal,
      valorMercado,
      valorIntegralizacao,
      percentual,
      atividade,
      aliquota,
      terrenoMarinha,
    ]
  );

  const parsed = ItbiSimulationInputSchema.safeParse(input);
  const result = parsed.success ? calcularItbi(parsed.data) : null;
  const clientName = clients.find((c) => c.id === clientId)?.name ?? '';
  const effectiveClientName = clientName || reportClientName.trim();

  const refreshSimulations = useCallback(async () => {
    try {
      const listRes = await propertyService.listSimulations({
        page: 1,
        limit: 20,
        simulation_kind: SIMULATION_KIND_ITBI_INTEGRALIZACAO,
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
      showError('Preencha UF, município e valores válidos.');
      return;
    }
    setSaving(true);
    try {
      await propertyService.saveSnapshotSimulation({
        client_id: clientId,
        title: title.trim() || undefined,
        ano: new Date().getFullYear(),
        simulation_kind: SIMULATION_KIND_ITBI_INTEGRALIZACAO,
        input: parsed.data,
        result,
      });
      showSuccess('Simulação de ITBI salva.');
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
      if (sim.simulation_kind !== SIMULATION_KIND_ITBI_INTEGRALIZACAO) {
        showError('Tipo de simulação incompatível');
        return;
      }
      const loaded = ItbiSimulationInputSchema.safeParse(sim.input_data);
      if (!loaded.success) {
        showError('Não foi possível carregar os dados desta simulação');
        return;
      }
      const inp = loaded.data;
      setClientId(inp.client_id ?? sim.client_id ?? '');
      setPropertyId(inp.property_id ?? '');
      setUf(inp.uf);
      setMunicipio(inp.municipio === '—' ? '' : inp.municipio);
      setMunicipiosLista(getItbiMunicipios(inp.uf));
      const loadedMunicipio = inp.municipio === '—' ? '' : inp.municipio;
      if (loadedMunicipio && getItbiAliquota(inp.uf, loadedMunicipio) === undefined) {
        setMunicipioManual(true);
      } else {
        setMunicipioManual(false);
      }
      setValorVenal(inp.valor_venal);
      setValorMercado(inp.valor_mercado);
      setValorIntegralizacao(inp.valor_integralizacao);
      setPercentual(inp.percentual_imovel);
      setAtividade(inp.atividade_pj);
      setAliquota(inp.aliquota_percent);
      setTerrenoMarinha(inp.terreno_marinha);
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
        <h1 className="text-xl font-bold text-slate-900">ITBI na integralização</h1>
        <p className="text-sm text-slate-500">
          Tema 796 — imunidade na holding patrimonial até o valor de referência. Selecione UF e município para preenchimento automático da alíquota.
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
              Imóvel (opcional)
              <select
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                disabled={!clientId}
              >
                <option value="">Valores avulsos</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.identificador}</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-700">
              UF
              <select
                value={uf}
                onChange={(e) => handleUfChange(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                {UFS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </label>
            {municipioManual ? (
              <div>
                <Input label="Município" value={municipio} onChange={(e) => setMunicipio(e.target.value)} />
                <button
                  type="button"
                  onClick={() => { setMunicipioManual(false); setMunicipio(''); }}
                  className="mt-1 text-xs text-blue-600 hover:underline"
                >
                  ← Voltar à lista de municípios
                </button>
              </div>
            ) : (
              <div>
                <label className="text-sm text-slate-700">
                  Município
                  <select
                    value={municipio}
                    onChange={(e) => handleMunicipioSelect(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="">Selecione o município</option>
                    {municipiosLista.map((m) => (
                      <option key={m.nome} value={m.nome}>
                        {m.nome} — {m.aliquota}%
                      </option>
                    ))}
                    <option value="__manual__">Cidade não encontrada? Informe manualmente</option>
                  </select>
                </label>
                {municipio && (
                  <p className="mt-1 text-xs text-slate-500">
                    Alíquota preenchida: {aliquota}%. Você pode ajustar abaixo se necessário.
                  </p>
                )}
              </div>
            )}
            <MoneyInput label="Valor venal" value={valorVenal} onChange={setValorVenal} prefix="R$" />
            <MoneyInput label="Valor de mercado" value={valorMercado} onChange={setValorMercado} prefix="R$" />
            <MoneyInput label="Valor de integralização" value={valorIntegralizacao} onChange={setValorIntegralizacao} prefix="R$" />
            <Input
              label="% do imóvel"
              type="number"
              min={0.01}
              max={100}
              step={0.01}
              value={percentual}
              onChange={(e) => setPercentual(Number(e.target.value) || 0)}
            />
            <label className="text-sm text-slate-700">
              Atividade da PJ
              <select
                value={atividade}
                onChange={(e) => setAtividade(e.target.value as ItbiAtividadePj)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="holding_patrimonial">Holding patrimonial</option>
                <option value="operacional">Operacional</option>
              </select>
            </label>
            <Input
              label="Alíquota ITBI (%)"
              type="number"
              min={0.01}
              max={20}
              step={0.01}
              value={aliquota}
              onChange={(e) => setAliquota(Number(e.target.value) || 0)}
            />
            <Input label="Título (opcional)" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={terrenoMarinha}
              onChange={(e) => setTerrenoMarinha(e.target.checked)}
            />
            Terreno de marinha (alerta de laudêmio — sem cálculo)
          </label>
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
            <p className="text-sm text-slate-500">Preencha município e valores para ver o resultado.</p>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand">{ENQ[result.enquadramento]}</p>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <dt className="text-slate-500">Referência</dt>
                <dd className="text-right font-medium">{fmtBRL(result.valor_referencia)}</dd>
                <dt className="text-slate-500">Base cheia</dt>
                <dd className="text-right font-medium">{fmtBRL(result.base_cheia)}</dd>
                <dt className="text-slate-500">Capital imune</dt>
                <dd className="text-right font-medium">{fmtBRL(result.capital_imune)}</dd>
                <dt className="text-slate-500">Base tributável</dt>
                <dd className="text-right font-medium">{fmtBRL(result.base_tributavel)}</dd>
                <dt className="text-slate-500">ITBI</dt>
                <dd className="text-right text-lg font-bold text-slate-900">{fmtBRL(result.itbi)}</dd>
              </dl>
              {result.alerta_laudemio && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Terreno de marinha: verificar laudêmio junto à SPU. Este simulador não calcula laudêmio.
                </p>
              )}
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
                    simulationType="itbi_integralizacao"
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
        <div id="simulador-itbi-print-wrapper" className="hidden print:block">
          <ReportPrintHeader
            variant="printSheet"
            reportTitle="ITBI na integralização"
            metaLine={effectiveClientName || municipio}
            logoUrl={branding?.report_logo_url}
            brandName={branding?.report_brand_name}
          />
          <ReportCoverSection
            variant="printSheet"
            title="ITBI na integralização"
            clientName={effectiveClientName || undefined}
            subtitle={`${uf} / ${municipio} · Tema 796`}
            brandName={branding?.report_brand_name}
            details={[
              { label: 'Enquadramento', value: ENQ[result.enquadramento] },
              { label: 'ITBI', value: fmtBRL(result.itbi) },
            ]}
          />
          <ItbiReportMemory result={result} />
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
                  reportTitle="ITBI na integralização"
                  metaLine={effectiveClientName || municipio || undefined}
                  logoUrl={branding?.report_logo_url}
                  brandName={branding?.report_brand_name}
                />
                <ReportCoverSection
                  variant="previewModal"
                  title="ITBI na integralização"
                  clientName={effectiveClientName || undefined}
                  subtitle={`${uf} / ${municipio} · Tema 796`}
                  brandName={branding?.report_brand_name}
                  details={[
                    { label: 'Enquadramento', value: ENQ[result.enquadramento] },
                    { label: 'ITBI', value: fmtBRL(result.itbi) },
                  ]}
                />
                <ItbiReportMemory result={result} />
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

export default SimuladorItbi;
