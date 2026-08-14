import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { ConfirmModal } from '../../../shared/components/ui/ConfirmModal';
import { useToast } from '../../../shared/components/ui/Toast';
import {
  fiscalFileService,
  type CreateSpedCalibratorRuleInput,
  type SpedCalibratorRule,
  type UpdateSpedCalibratorRuleInput,
} from '../services/fiscal-file.service';
import { type ClientWithCreatedAt } from '../../clients/services/client.service';
import { useClients } from '../../../shared/hooks/useClients';

type TargetKind = 'receita' | 'deducao' | 'retencao';
type ScopeType = 'global' | 'cliente';

const TARGET_FIELD_OPTIONS: Record<TargetKind, string[]> = {
  receita: [
    'produtos_mercadorias',
    'servicos',
    'servicos_favorecida',
    'servicos_hospitalares',
    'demais_receitas',
  ],
  deducao: ['pis_cofins_zero', 'icms_destacado'],
  retencao: ['irrf', 'orgaos_publicos'],
};

export function FiscalFilesCalibrator() {
  const { success, error: showError, ToastContainer } = useToast();
  const { clients, loading: isLoadingClients } = useClients();
  const [rules, setRules] = useState<SpedCalibratorRule[]>([]);
  const [isLoadingRules, setIsLoadingRules] = useState(false);
  const [filterClientId, setFilterClientId] = useState('');

  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [scopeType, setScopeType] = useState<ScopeType>('global');
  const [formClientId, setFormClientId] = useState('');
  const [pattern, setPattern] = useState('');
  const [targetKind, setTargetKind] = useState<TargetKind>('receita');
  const [targetField, setTargetField] = useState(TARGET_FIELD_OPTIONS.receita[0]);
  const [confidenceOverride, setConfidenceOverride] = useState('');
  const [active, setActive] = useState(true);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);

  const filteredFieldOptions = useMemo(
    () => TARGET_FIELD_OPTIONS[targetKind],
    [targetKind]
  );

  useEffect(() => {
    void loadRules(filterClientId || undefined);
  }, [filterClientId]);

  useEffect(() => {
    if (!filteredFieldOptions.includes(targetField)) {
      setTargetField(filteredFieldOptions[0]);
    }
  }, [filteredFieldOptions, targetField]);


  const loadRules = async (clientId?: string) => {
    setIsLoadingRules(true);
    try {
      const data = await fiscalFileService.listCalibratorRules(clientId);
      setRules(data);
    } catch (error: any) {
      showError(error?.message || 'Erro ao carregar regras do calibrador');
    } finally {
      setIsLoadingRules(false);
    }
  };

  const resetForm = () => {
    setEditingRuleId(null);
    setScopeType('global');
    setFormClientId(filterClientId || '');
    setPattern('');
    setTargetKind('receita');
    setTargetField(TARGET_FIELD_OPTIONS.receita[0]);
    setConfidenceOverride('');
    setActive(true);
    setNotes('');
  };

  const fillFormFromRule = (rule: SpedCalibratorRule) => {
    setEditingRuleId(rule.id);
    if (rule.client_id) {
      setScopeType('cliente');
      setFormClientId(rule.client_id);
    } else {
      setScopeType('global');
      setFormClientId('');
    }
    setPattern(rule.pattern);
    setTargetKind(rule.target_kind);
    setTargetField(rule.target_field);
    setConfidenceOverride(
      typeof rule.confidence_override === 'number'
        ? String(rule.confidence_override)
        : ''
    );
    setActive(rule.active);
    setNotes(rule.notes || '');
  };

  const validateForm = (): string | null => {
    if (!pattern.trim() || pattern.trim().length < 2) {
      return 'Informe um padrão com ao menos 2 caracteres.';
    }
    if (!filteredFieldOptions.includes(targetField)) {
      return 'Campo de destino inválido para o tipo selecionado.';
    }
    if (scopeType === 'cliente' && !formClientId) {
      return 'Selecione um cliente para criar regra específica.';
    }
    if (confidenceOverride.trim()) {
      const value = Number(confidenceOverride);
      if (Number.isNaN(value) || value < 0 || value > 1) {
        return 'Confiança deve estar entre 0 e 1.';
      }
    }
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      showError(validationError);
      return;
    }

    const payload: CreateSpedCalibratorRuleInput | UpdateSpedCalibratorRuleInput = {
      pattern: pattern.trim(),
      target_kind: targetKind,
      target_field: targetField,
      confidence_override: confidenceOverride.trim() ? Number(confidenceOverride) : null,
      active,
      notes: notes.trim() || null,
    };

    if (!editingRuleId) {
      (payload as CreateSpedCalibratorRuleInput).client_id =
        scopeType === 'cliente' ? formClientId : null;
    }

    setIsSaving(true);
    try {
      if (editingRuleId) {
        await fiscalFileService.updateCalibratorRule(editingRuleId, payload);
        success('Regra atualizada com sucesso');
      } else {
        await fiscalFileService.createCalibratorRule(payload as CreateSpedCalibratorRuleInput);
        success('Regra criada com sucesso');
      }
      await loadRules(filterClientId || undefined);
      resetForm();
    } catch (error: any) {
      showError(error?.message || 'Erro ao salvar regra');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRule = async () => {
    if (!deleteRuleId) return;
    try {
      await fiscalFileService.deleteCalibratorRule(deleteRuleId);
      success('Regra removida com sucesso');
      if (editingRuleId === deleteRuleId) {
        resetForm();
      }
      setDeleteRuleId(null);
      await loadRules(filterClientId || undefined);
    } catch (error: any) {
      showError(error?.message || 'Erro ao remover regra');
    }
  };

  const resolveClientName = (clientId: string | null) => {
    if (!clientId) return 'Regra global do escritório';
    return clients.find((c) => c.id === clientId)?.name || clientId;
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <>
      <ToastContainer />
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Calibrador SPED (IN 2.306)</h1>
            <p className="mt-2 text-slate-600">
              Ajuste aliases por cliente para aumentar a assertividade do pré-preenchimento.
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/fiscal-files">
              <Button variant="tertiary">Voltar para arquivos</Button>
            </Link>
            <Link to="/fiscal-files/upload">
              <Button>Novo upload</Button>
            </Link>
          </div>
        </div>

        <Card>
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="w-full md:max-w-md">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Filtro por cliente (lista mostra global + cliente)
              </label>
              <select
                value={filterClientId}
                onChange={(e) => setFilterClientId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                disabled={isLoadingClients}
              >
                <option value="">
                  {isLoadingClients ? 'Carregando clientes...' : 'Todos os clientes'}
                </option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="secondary"
              onClick={() => void loadRules(filterClientId || undefined)}
            >
              Atualizar lista
            </Button>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <Card className="xl:col-span-2">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              {editingRuleId ? 'Editar regra' : 'Nova regra'}
            </h2>
            <form className="space-y-4" onSubmit={handleSubmit}>
              {!editingRuleId && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Escopo
                  </label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={scopeType === 'global' ? 'primary' : 'tertiary'}
                      size="sm"
                      onClick={() => setScopeType('global')}
                    >
                      Global do escritório
                    </Button>
                    <Button
                      type="button"
                      variant={scopeType === 'cliente' ? 'primary' : 'tertiary'}
                      size="sm"
                      onClick={() => {
                        setScopeType('cliente');
                        if (!formClientId && filterClientId) {
                          setFormClientId(filterClientId);
                        }
                      }}
                    >
                      Cliente específico
                    </Button>
                  </div>
                </div>
              )}

              {!editingRuleId && scopeType === 'cliente' && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Cliente da regra
                  </label>
                  <select
                    value={formClientId}
                    onChange={(e) => setFormClientId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    disabled={isLoadingClients}
                  >
                    <option value="">Selecione um cliente</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <Input
                label="Padrão de descrição (pattern)"
                placeholder="Ex.: SERVICO MEDICO"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                required
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Tipo de destino
                </label>
                <select
                  value={targetKind}
                  onChange={(e) => setTargetKind(e.target.value as TargetKind)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                >
                  <option value="receita">Receita</option>
                  <option value="deducao">Dedução</option>
                  <option value="retencao">Retenção</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Campo de destino
                </label>
                <select
                  value={targetField}
                  onChange={(e) => setTargetField(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                >
                  {filteredFieldOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Confiança override (0 a 1)"
                placeholder="Ex.: 0.92"
                value={confidenceOverride}
                onChange={(e) => setConfidenceOverride(e.target.value)}
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Observações (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-24 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  placeholder="Anotações sobre quando usar esta regra..."
                />
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30"
                />
                Regra ativa
              </label>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={isSaving}>
                  {isSaving
                    ? 'Salvando...'
                    : editingRuleId
                      ? 'Salvar alterações'
                      : 'Criar regra'}
                </Button>
                <Button type="button" variant="tertiary" onClick={resetForm}>
                  Limpar
                </Button>
              </div>
            </form>
          </Card>

          <Card className="xl:col-span-3">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">
                Regras cadastradas ({rules.length})
              </h2>
              <p className="text-xs text-slate-500">
                Upload e inspeção já aplicam essas regras automaticamente.
              </p>
            </div>

            {isLoadingRules ? (
              <p className="py-10 text-center text-slate-500">Carregando regras...</p>
            ) : rules.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <p className="text-slate-600">
                  Nenhuma regra encontrada para o filtro atual.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="rounded-lg border border-slate-200 p-4 transition-colors hover:bg-slate-50"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-1">
                        <p className="font-medium text-slate-900">
                          Pattern: <span className="text-brand">{rule.pattern}</span>
                        </p>
                        <p className="text-sm text-slate-600">
                          {rule.target_kind} {'->'} {rule.target_field}
                        </p>
                        <p className="text-xs text-slate-500">
                          Escopo: {resolveClientName(rule.client_id)}
                        </p>
                        <p className="text-xs text-slate-500">
                          Confiança:{' '}
                          {typeof rule.confidence_override === 'number'
                            ? rule.confidence_override
                            : 'padrão do sistema'}
                          {' | '}Atualizado em: {formatDate(rule.updated_at)}
                        </p>
                        {rule.notes && (
                          <p className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                            {rule.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                            rule.active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {rule.active ? 'Ativa' : 'Inativa'}
                        </span>
                        <Button
                          size="sm"
                          variant="tertiary"
                          onClick={() => fillFormFromRule(rule)}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="tertiary"
                          className="border-red-300 text-red-700 hover:bg-red-50"
                          onClick={() => setDeleteRuleId(rule.id)}
                        >
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteRuleId}
        onClose={() => setDeleteRuleId(null)}
        onConfirm={() => void handleDeleteRule()}
        title="Excluir regra do calibrador"
        message="Tem certeza que deseja remover esta regra? Essa ação não pode ser desfeita."
        variant="danger"
      />
    </>
  );
}

