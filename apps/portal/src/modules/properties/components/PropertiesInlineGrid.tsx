import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PropertyWithClient } from '../services/property.service';
import { Button } from '../../../shared/components/ui/Button';
import { MoneyInput } from '../../../shared/components/ui/MoneyInput';
import { Modal } from '../../../shared/components/ui/Modal';
import { Input } from '../../../shared/components/ui/Input';

type ColumnId =
  | 'identificador'
  | 'valor_aluguel_mensal'
  | 'tipo_locacao'
  | 'natureza_locacao'
  | 'matricula_imovel'
  | 'inscricao_iptu'
  | 'cartorio_registro'
  | 'iptu_mensal_padrao'
  | 'condominio_mensal_padrao'
  | 'seguro_mensal_padrao'
  | 'camareira_mensal_padrao'
  | 'seguranca_mensal_padrao'
  | 'material_limpeza_mensal_padrao'
  | 'lavanderia_enxoval_mensal_padrao'
  | 'checkin_checkout_mensal_padrao'
  | 'taxas_pagamento_mensal_padrao'
  | 'tarifas_bancarias_mensal_padrao'
  | 'vacancia_mensal_padrao'
  | 'inadimplencia_mensal_padrao';

type GridRow = {
  rowId: string;
  propertyId?: string;
  isPersisted: boolean;
  isSelected: boolean;
  isEditing: boolean;
  identificador: string;
  valor_aluguel_mensal: number;
  tipo_locacao: 'fixa' | 'flexivel' | '';
  natureza_locacao: 'residencial' | 'nao_residencial' | '';
  matricula_imovel: string;
  inscricao_iptu: string;
  cartorio_registro: string;
  iptu_mensal_padrao: number;
  condominio_mensal_padrao: number;
  seguro_mensal_padrao: number;
  camareira_mensal_padrao: number;
  seguranca_mensal_padrao: number;
  material_limpeza_mensal_padrao: number;
  lavanderia_enxoval_mensal_padrao: number;
  checkin_checkout_mensal_padrao: number;
  taxas_pagamento_mensal_padrao: number;
  tarifas_bancarias_mensal_padrao: number;
  vacancia_mensal_padrao: number;
  inadimplencia_mensal_padrao: number;
};

type SaveRowInput = {
  identificador: string;
  valor_aluguel_mensal: number;
  tipo_locacao: 'fixa' | 'flexivel';
  natureza_locacao: 'residencial' | 'nao_residencial';
  matricula_imovel?: string;
  inscricao_iptu?: string;
  cartorio_registro?: string;
  iptu_mensal_padrao: number;
  condominio_mensal_padrao: number;
  seguro_mensal_padrao: number;
  camareira_mensal_padrao: number;
  seguranca_mensal_padrao: number;
  material_limpeza_mensal_padrao: number;
  lavanderia_enxoval_mensal_padrao: number;
  checkin_checkout_mensal_padrao: number;
  taxas_pagamento_mensal_padrao: number;
  tarifas_bancarias_mensal_padrao: number;
  vacancia_mensal_padrao: number;
  inadimplencia_mensal_padrao: number;
};

export type SimulationDraftRowInput = {
  rowId: string;
  identificador: string;
  valor_aluguel_mensal: number;
  tipo_locacao: 'fixa' | 'flexivel';
  natureza_locacao: 'residencial' | 'nao_residencial';
};

const INITIAL_EMPTY_ROWS = 5;
const TRAILING_EMPTY_ROWS = 3;

type Props = {
  clientId: string;
  clientName?: string;
  properties: PropertyWithClient[];
  loading: boolean;
  onRefreshClientProperties: () => Promise<void>;
  onRequireClientToSave: () => void;
  onSaveRows: (rows: SaveRowInput[]) => Promise<void>;
  onApplyToSimulation: (payload: {
    propertyIds: string[];
    draftRows: SimulationDraftRowInput[];
  }) => Promise<void>;
  onDeletePersistedRows: (propertyIds: string[]) => Promise<void>;
};

const COLUMN_DEFS: Array<{ id: ColumnId; label: string; isMoney?: boolean }> = [
  { id: 'identificador', label: 'Imovel' },
  { id: 'valor_aluguel_mensal', label: 'Valor do aluguel mensal', isMoney: true },
  { id: 'tipo_locacao', label: 'Tipo da locacao' },
  { id: 'natureza_locacao', label: 'Natureza da locacao' },
  { id: 'matricula_imovel', label: 'Matrícula' },
  { id: 'inscricao_iptu', label: 'Inscrição IPTU' },
  { id: 'cartorio_registro', label: 'Cartório' },
  { id: 'iptu_mensal_padrao', label: 'IPTU', isMoney: true },
  { id: 'condominio_mensal_padrao', label: 'Condomínio', isMoney: true },
  { id: 'seguro_mensal_padrao', label: 'Seguro', isMoney: true },
  { id: 'camareira_mensal_padrao', label: 'Camareira', isMoney: true },
  { id: 'seguranca_mensal_padrao', label: 'Segurança', isMoney: true },
  { id: 'material_limpeza_mensal_padrao', label: 'Material limpeza', isMoney: true },
  { id: 'lavanderia_enxoval_mensal_padrao', label: 'Lavanderia/enxoval', isMoney: true },
  { id: 'checkin_checkout_mensal_padrao', label: 'Checkin/checkout', isMoney: true },
  { id: 'taxas_pagamento_mensal_padrao', label: 'Taxas pagamento', isMoney: true },
  { id: 'tarifas_bancarias_mensal_padrao', label: 'Tarifas bancárias', isMoney: true },
  { id: 'vacancia_mensal_padrao', label: 'Vacância', isMoney: true },
  { id: 'inadimplencia_mensal_padrao', label: 'Inadimplência', isMoney: true },
];

const DEFAULT_VISIBLE_COLUMNS: ColumnId[] = [
  'identificador',
  'valor_aluguel_mensal',
  'tipo_locacao',
  'natureza_locacao',
  'iptu_mensal_padrao',
  'condominio_mensal_padrao',
  'seguro_mensal_padrao'
];

function toGridRow(property: PropertyWithClient): GridRow {
  return {
    rowId: property.id,
    propertyId: property.id,
    isPersisted: true,
    isSelected: false,
    isEditing: false,
    identificador: property.identificador ?? '',
    valor_aluguel_mensal: Number(property.valor_aluguel_mensal ?? 0),
    tipo_locacao: property.tipo_locacao === 'flexivel' ? 'flexivel' : 'fixa',
    natureza_locacao: property.natureza_locacao === 'nao_residencial' ? 'nao_residencial' : 'residencial',
    matricula_imovel: property.matricula_imovel ?? '',
    inscricao_iptu: property.inscricao_iptu ?? '',
    cartorio_registro: property.cartorio_registro ?? '',
    iptu_mensal_padrao: Number(property.iptu_mensal_padrao ?? 0),
    condominio_mensal_padrao: Number(property.condominio_mensal_padrao ?? 0),
    seguro_mensal_padrao: Number(property.seguro_mensal_padrao ?? 0),
    camareira_mensal_padrao: Number(property.camareira_mensal_padrao ?? 0),
    seguranca_mensal_padrao: Number(property.seguranca_mensal_padrao ?? 0),
    material_limpeza_mensal_padrao: Number(property.material_limpeza_mensal_padrao ?? 0),
    lavanderia_enxoval_mensal_padrao: Number(property.lavanderia_enxoval_mensal_padrao ?? 0),
    checkin_checkout_mensal_padrao: Number(property.checkin_checkout_mensal_padrao ?? 0),
    taxas_pagamento_mensal_padrao: Number(property.taxas_pagamento_mensal_padrao ?? 0),
    tarifas_bancarias_mensal_padrao: Number(property.tarifas_bancarias_mensal_padrao ?? 0),
    vacancia_mensal_padrao: Number(property.vacancia_mensal_padrao ?? 0),
    inadimplencia_mensal_padrao: Number(property.inadimplencia_mensal_padrao ?? 0),
  };
}

function createDraftRow(): GridRow {
  return {
    rowId: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    isPersisted: false,
    isSelected: false,
    isEditing: true,
    identificador: '',
    valor_aluguel_mensal: 0,
    tipo_locacao: '',
    natureza_locacao: '',
    matricula_imovel: '',
    inscricao_iptu: '',
    cartorio_registro: '',
    iptu_mensal_padrao: 0,
    condominio_mensal_padrao: 0,
    seguro_mensal_padrao: 0,
    camareira_mensal_padrao: 0,
    seguranca_mensal_padrao: 0,
    material_limpeza_mensal_padrao: 0,
    lavanderia_enxoval_mensal_padrao: 0,
    checkin_checkout_mensal_padrao: 0,
    taxas_pagamento_mensal_padrao: 0,
    tarifas_bancarias_mensal_padrao: 0,
    vacancia_mensal_padrao: 0,
    inadimplencia_mensal_padrao: 0,
  };
}

function formatMoneyTooltip(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatTipoLocacaoLabel(tipo: GridRow['tipo_locacao']): string {
  if (tipo === 'fixa') return 'Locação de longa duração';
  if (tipo === 'flexivel') return 'Locação curta duração/temporada';
  return '-';
}

function formatNaturezaLocacaoLabel(natureza: GridRow['natureza_locacao']): string {
  if (natureza === 'residencial') return 'Residencial';
  if (natureza === 'nao_residencial') return 'Nao residencial';
  return '-';
}

function isGridRowEmpty(row: GridRow): boolean {
  return (
    row.identificador.trim() === '' &&
    row.valor_aluguel_mensal === 0 &&
    row.tipo_locacao === '' &&
    row.natureza_locacao === '' &&
    row.matricula_imovel.trim() === '' &&
    row.inscricao_iptu.trim() === '' &&
    row.cartorio_registro.trim() === '' &&
    row.iptu_mensal_padrao === 0 &&
    row.condominio_mensal_padrao === 0 &&
    row.seguro_mensal_padrao === 0 &&
    row.camareira_mensal_padrao === 0 &&
    row.seguranca_mensal_padrao === 0 &&
    row.material_limpeza_mensal_padrao === 0 &&
    row.lavanderia_enxoval_mensal_padrao === 0 &&
    row.checkin_checkout_mensal_padrao === 0 &&
    row.taxas_pagamento_mensal_padrao === 0 &&
    row.tarifas_bancarias_mensal_padrao === 0 &&
    row.vacancia_mensal_padrao === 0 &&
    row.inadimplencia_mensal_padrao === 0
  );
}

function isRowEligibleForSimulation(row: GridRow): boolean {
  return row.valor_aluguel_mensal > 0;
}

function ensureDraftCapacity(inputRows: GridRow[]): GridRow[] {
  const rows = [...inputRows];
  const filledRows = rows.filter((r) => !isGridRowEmpty(r)).length;
  const desiredEmptyBuffer = filledRows === 0 ? INITIAL_EMPTY_ROWS : TRAILING_EMPTY_ROWS;
  const currentEmpty = rows.filter((r) => isGridRowEmpty(r)).length;

  if (currentEmpty >= desiredEmptyBuffer) return rows;

  const toAdd = desiredEmptyBuffer - currentEmpty;
  for (let i = 0; i < toAdd; i += 1) {
    rows.push(createDraftRow());
  }
  return rows;
}

function readColumnPrefs(): ColumnId[] {
  try {
    const userStr = localStorage.getItem('user');
    const userId = userStr ? JSON.parse(userStr)?.id : undefined;
    const key = `propertiesGridPrefs:${userId ?? 'anon'}`;
    const raw = localStorage.getItem(key);
    if (!raw) return DEFAULT_VISIBLE_COLUMNS;
    const parsed = JSON.parse(raw) as { visibleColumns?: ColumnId[] };
    if (!parsed.visibleColumns?.length) return DEFAULT_VISIBLE_COLUMNS;
    return parsed.visibleColumns;
  } catch {
    return DEFAULT_VISIBLE_COLUMNS;
  }
}

function persistColumnPrefs(visibleColumns: ColumnId[]) {
  try {
    const userStr = localStorage.getItem('user');
    const userId = userStr ? JSON.parse(userStr)?.id : undefined;
    const key = `propertiesGridPrefs:${userId ?? 'anon'}`;
    localStorage.setItem(key, JSON.stringify({ visibleColumns }));
  } catch {
    // no-op
  }
}

export function PropertiesInlineGrid({
  clientId,
  clientName,
  properties,
  loading,
  onRefreshClientProperties,
  onRequireClientToSave,
  onSaveRows,
  onApplyToSimulation,
  onDeletePersistedRows,
}: Props) {
  const [rows, setRows] = useState<GridRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<ColumnId[]>(() => readColumnPrefs());
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showLoadSimulationModal, setShowLoadSimulationModal] = useState(false);
  const debugShortcutArmedUntilRef = useRef<number>(0);

  const selectedPersistedIds = useMemo(
    () =>
      rows
        .filter((r) => r.isSelected && r.isPersisted && r.propertyId && isRowEligibleForSimulation(r))
        .map((r) => r.propertyId as string),
    [rows]
  );
  const allPersistedIds = useMemo(
    () =>
      rows
        .filter((r) => r.isPersisted && r.propertyId && isRowEligibleForSimulation(r))
        .map((r) => r.propertyId as string),
    [rows]
  );
  const selectedDraftRows = useMemo(
    () =>
      rows
        .filter((r) => r.isSelected && !r.isPersisted && isRowEligibleForSimulation(r))
        .map((r) => ({
          rowId: r.rowId,
          identificador: r.identificador.trim(),
          valor_aluguel_mensal: r.valor_aluguel_mensal,
          tipo_locacao: (r.tipo_locacao || 'fixa') as 'fixa' | 'flexivel',
          natureza_locacao: (r.natureza_locacao || 'residencial') as 'residencial' | 'nao_residencial',
        })),
    [rows]
  );
  const allDraftRows = useMemo(
    () =>
      rows
        .filter((r) => !r.isPersisted && isRowEligibleForSimulation(r))
        .map((r) => ({
          rowId: r.rowId,
          identificador: r.identificador.trim(),
          valor_aluguel_mensal: r.valor_aluguel_mensal,
          tipo_locacao: (r.tipo_locacao || 'fixa') as 'fixa' | 'flexivel',
          natureza_locacao: (r.natureza_locacao || 'residencial') as 'residencial' | 'nao_residencial',
        })),
    [rows]
  );

  useEffect(() => {
    setRows((prev) => {
      const drafts = prev.filter((r) => !r.isPersisted);
      const persisted = properties.map(toGridRow);
      return ensureDraftCapacity([...persisted, ...drafts]);
    });
  }, [properties]);

  const isRowEmpty = (row: GridRow) => isGridRowEmpty(row);

  const selectedRowsWithData = rows.filter((r) => r.isSelected && !isRowEmpty(r));
  const selectedPersistedRows = selectedRowsWithData.filter((r) => r.isPersisted && r.propertyId);
  const deleteRequiredText = selectedRowsWithData.length <= 1 ? 'deletar' : `deletar ${selectedRowsWithData.length}`;

  const getRowStatus = (row: GridRow): '' | 'saved' | 'clock' => {
    if (isRowEmpty(row)) return '';
    if (!row.isPersisted || row.isEditing) return 'clock';
    return 'saved';
  };

  const hasRowsToSave = rows.some((r) => getRowStatus(r) === 'clock');
  const eligibleRowsCount = rows.filter((r) => isRowEligibleForSimulation(r)).length;
  const selectedSavedRowsCount = rows.filter(
    (r) => r.isSelected && getRowStatus(r) === 'saved'
  ).length;

  const fillDebugRows = useCallback((count: number) => {
    setRows((prev) => {
      const next = [...prev];
      let seed = 1;

      for (let i = 0; i < next.length && seed <= count; i += 1) {
        const row = next[i];
        if (!isGridRowEmpty(row)) continue;

        next[i] = {
          ...row,
          isPersisted: false,
          isEditing: true,
          identificador: `Teste Imovel ${seed}`,
          valor_aluguel_mensal: 1500 * seed,
          tipo_locacao: seed % 2 === 0 ? 'flexivel' : 'fixa',
          natureza_locacao: seed % 3 === 0 ? 'nao_residencial' : 'residencial',
          iptu_mensal_padrao: 120 * seed,
          condominio_mensal_padrao: 180 * seed,
          seguro_mensal_padrao: 60 * seed,
          camareira_mensal_padrao: 90 * seed,
          material_limpeza_mensal_padrao: 40 * seed,
          checkin_checkout_mensal_padrao: 30 * seed,
          taxas_pagamento_mensal_padrao: 25 * seed,
        };
        seed += 1;
      }

      return ensureDraftCapacity(next);
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;

      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        Boolean(target?.isContentEditable);
      if (isTypingTarget) return;

      if (event.ctrlKey && event.key.toLowerCase() === 'd') {
        debugShortcutArmedUntilRef.current = Date.now() + 2000;
        event.preventDefault();
        return;
      }

      const isDebugCombo =
        (event.ctrlKey && event.key === '3') ||
        (event.key === '3' && Date.now() <= debugShortcutArmedUntilRef.current);

      if (!isDebugCombo) return;

      event.preventDefault();
      debugShortcutArmedUntilRef.current = 0;
      fillDebugRows(3);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fillDebugRows]);

  const toggleSelect = (rowId: string) => {
    setRows((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, isSelected: !r.isSelected } : r))
    );
  };

  const enableEditSelected = () => {
    setRows((prev) =>
      prev.map((r) => (r.isSelected && getRowStatus(r) === 'saved' ? { ...r, isEditing: true } : r))
    );
  };

  const cancelEdit = () => {
    setRows((prev) =>
      prev.map((r) => ({ ...r, isEditing: !r.isPersisted }))
    );
  };

  const saveRows = async () => {
    if (!clientId) {
      onRequireClientToSave();
      return;
    }
    const changed = rows.filter((r) => getRowStatus(r) === 'clock');
    if (!changed.length) return;
    const savedDraftRowIds = new Set(changed.filter((r) => !r.isPersisted).map((r) => r.rowId));
    setIsSaving(true);
    try {
      await onSaveRows(
        changed.map((r) => ({
          identificador: r.identificador,
          valor_aluguel_mensal: r.valor_aluguel_mensal,
          tipo_locacao: (r.tipo_locacao || 'fixa') as 'fixa' | 'flexivel',
          natureza_locacao: (r.natureza_locacao || 'residencial') as 'residencial' | 'nao_residencial',
          matricula_imovel: r.matricula_imovel || undefined,
          inscricao_iptu: r.inscricao_iptu || undefined,
          cartorio_registro: r.cartorio_registro || undefined,
          iptu_mensal_padrao: r.iptu_mensal_padrao,
          condominio_mensal_padrao: r.condominio_mensal_padrao,
          seguro_mensal_padrao: r.seguro_mensal_padrao,
          camareira_mensal_padrao: r.camareira_mensal_padrao,
          seguranca_mensal_padrao: r.seguranca_mensal_padrao,
          material_limpeza_mensal_padrao: r.material_limpeza_mensal_padrao,
          lavanderia_enxoval_mensal_padrao: r.lavanderia_enxoval_mensal_padrao,
          checkin_checkout_mensal_padrao: r.checkin_checkout_mensal_padrao,
          taxas_pagamento_mensal_padrao: r.taxas_pagamento_mensal_padrao,
          tarifas_bancarias_mensal_padrao: r.tarifas_bancarias_mensal_padrao,
          vacancia_mensal_padrao: r.vacancia_mensal_padrao,
          inadimplencia_mensal_padrao: r.inadimplencia_mensal_padrao,
        }))
      );
      // Remove apenas os rascunhos que foram persistidos para evitar
      // duplicidade quando a listagem recarregar os mesmos imóveis salvos.
      if (savedDraftRowIds.size > 0) {
        setRows((prev) => ensureDraftCapacity(prev.filter((r) => !savedDraftRowIds.has(r.rowId))));
      }
      await onRefreshClientProperties();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (deleteConfirmText.trim().toLowerCase() !== deleteRequiredText) return;
    const persistedIds = selectedPersistedRows
      .map((r) => r.propertyId)
      .filter((id): id is string => Boolean(id));

    if (persistedIds.length > 0) {
      await onDeletePersistedRows(persistedIds);
    }

    setRows((prev) => ensureDraftCapacity(prev.filter((r) => !r.isSelected)));
    setDeleteConfirmText('');
    setShowDeleteModal(false);
  };

  const updateRow = (rowId: string, patch: Partial<GridRow>) => {
    setRows((prev) => {
      const updated = prev.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r));
      return ensureDraftCapacity(updated);
    });
  };

  const toggleColumn = (columnId: ColumnId) => {
    setVisibleColumns((prev) => {
      const next = prev.includes(columnId)
        ? prev.filter((id) => id !== columnId)
        : [...prev, columnId];
      persistColumnPrefs(next);
      return next;
    });
  };

  const canEditCell = (row: GridRow) => !row.isPersisted || row.isEditing;

  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-white space-y-3">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-semibold text-slate-800">Imóveis</h3>
          <p className="text-xs text-slate-500">
            {clientId ? `Cliente selecionado: ${clientName ?? 'cliente'}` : 'Sem cliente selecionado (você pode preencher e salvar depois)'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap border border-slate-200 rounded-md p-2 bg-slate-50/60">
        <div className="flex gap-2 flex-wrap">
          <Button type="button" variant="primary" size="sm" onClick={() => void saveRows()} disabled={isSaving || !hasRowsToSave}>
            {isSaving ? 'Salvando...' : 'Salvar imóveis'}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={enableEditSelected} disabled={selectedSavedRowsCount === 0}>Editar selecionadas</Button>
          <Button type="button" variant="tertiary" size="sm" onClick={cancelEdit}>Cancelar edição</Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowLoadSimulationModal(true)}
            disabled={eligibleRowsCount === 0}
          >
            Carregar simulação
          </Button>
          {selectedRowsWithData.length > 0 && (
            <Button type="button" variant="tertiary" size="sm" className="text-red-700" onClick={() => setShowDeleteModal(true)}>
              Deletar
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-slate-600 flex items-center gap-4 flex-wrap">
          <span>Legenda:</span>
          <span className="inline-flex items-center gap-1">✅ salva</span>
          <span className="inline-flex items-center gap-1">🕒 não salva</span>
          <span className="text-slate-500">
            Tipo: <strong>Locação de longa duração</strong> | <strong>Locação curta duração/temporada</strong>
          </span>
        </div>
        <div className="relative">
          <button
            type="button"
            aria-label="Configurar colunas"
            title="Configurar colunas"
            className="inline-flex items-center justify-center h-11 w-11 rounded-full bg-transparent text-slate-600 hover:bg-slate-100"
            onClick={() => setShowColumnsMenu((prev) => !prev)}
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.757.426 1.757 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.757-2.924 1.757-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.757-.426-1.757-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.5A3.5 3.5 0 1012 8.5a3.5 3.5 0 000 7z" />
            </svg>
          </button>
          {showColumnsMenu && (
            <div className="absolute right-0 mt-2 w-64 rounded-md border border-slate-200 bg-white shadow-lg p-2 z-20">
              <p className="text-xs font-medium text-slate-600 px-1 pb-1">Exibir colunas</p>
              <div className="max-h-60 overflow-auto space-y-1">
                {COLUMN_DEFS.map((col) => (
                  <label key={col.id} className="flex items-center gap-2 text-xs text-slate-700 px-1 py-1 rounded hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={visibleColumns.includes(col.id)}
                      onChange={() => toggleColumn(col.id)}
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1100px] w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 px-2 w-8"></th>
              <th className="text-left py-2 px-2 w-12">Status</th>
              {COLUMN_DEFS.filter((c) => visibleColumns.includes(c.id)).map((col) => (
                <th key={col.id} className="text-left py-2 px-2 text-slate-700">{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={visibleColumns.length + 2} className="py-3 px-2 text-slate-500">Carregando imóveis...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 2} className="py-3 px-2 text-slate-500">Sem linhas.</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.rowId} className="border-b border-slate-100">
                  <td className="py-2 px-2">
                    <input type="checkbox" checked={row.isSelected} onChange={() => toggleSelect(row.rowId)} />
                  </td>
                  <td className="py-2 px-2">
                    {getRowStatus(row) === 'saved' ? '✅' : getRowStatus(row) === 'clock' ? '🕒' : ''}
                  </td>

                  {visibleColumns.includes('identificador') && (
                    <td className="py-2 px-2 min-w-[240px]" title={row.identificador || ''}>
                      {canEditCell(row) ? (
                        <input
                          className="w-full border border-slate-200 rounded px-2 py-1"
                          value={row.identificador}
                          onChange={(e) => updateRow(row.rowId, { identificador: e.target.value })}
                          placeholder="Imovel"
                          title={row.identificador || ''}
                        />
                      ) : (
                        <span className="block px-2 py-1 text-slate-800">{row.identificador || '-'}</span>
                      )}
                    </td>
                  )}

                  {visibleColumns.includes('valor_aluguel_mensal') && (
                    <td className="py-2 px-2 min-w-[180px]" title={formatMoneyTooltip(row.valor_aluguel_mensal)}>
                      {canEditCell(row) ? (
                        <MoneyInput value={row.valor_aluguel_mensal} onChange={(v) => updateRow(row.rowId, { valor_aluguel_mensal: v })} title={formatMoneyTooltip(row.valor_aluguel_mensal)} />
                      ) : (
                        <span className="block px-2 py-1 text-slate-800 text-right">{formatMoneyTooltip(row.valor_aluguel_mensal)}</span>
                      )}
                    </td>
                  )}

                  {visibleColumns.includes('tipo_locacao') && (
                    <td
                      className="py-2 px-2 min-w-[170px]"
                      title={
                        row.tipo_locacao === 'fixa'
                          ? 'Locação de longa duração'
                          : row.tipo_locacao === 'flexivel'
                            ? 'Locação curta duração/temporada'
                            : 'Selecione o tipo da locação'
                      }
                    >
                      {canEditCell(row) ? (
                        <select
                          className="w-full border border-slate-200 rounded px-2 py-1"
                          value={row.tipo_locacao}
                          onChange={(e) => updateRow(row.rowId, { tipo_locacao: e.target.value as 'fixa' | 'flexivel' | '' })}
                          title={
                            row.tipo_locacao === 'fixa'
                              ? 'Locação de longa duração'
                              : row.tipo_locacao === 'flexivel'
                                ? 'Locação curta duração/temporada'
                                : 'Selecione o tipo da locação'
                          }
                        >
                          <option value="">Selecione o tipo da locação</option>
                          <option value="fixa">Locação de longa duração</option>
                          <option value="flexivel">Locação curta duração/temporada</option>
                        </select>
                      ) : (
                        <span className="block px-2 py-1 text-slate-800">{formatTipoLocacaoLabel(row.tipo_locacao)}</span>
                      )}
                    </td>
                  )}

                  {visibleColumns.includes('natureza_locacao') && (
                    <td
                      className="py-2 px-2 min-w-[190px]"
                      title={
                        row.natureza_locacao === 'residencial'
                          ? 'Residencial'
                          : row.natureza_locacao === 'nao_residencial'
                            ? 'Nao residencial'
                            : 'Selecione a natureza da locação'
                      }
                    >
                      {canEditCell(row) ? (
                        <select
                          className="w-full border border-slate-200 rounded px-2 py-1"
                          value={row.natureza_locacao}
                          onChange={(e) => updateRow(row.rowId, { natureza_locacao: e.target.value as 'residencial' | 'nao_residencial' | '' })}
                          title={
                            row.natureza_locacao === 'residencial'
                              ? 'Residencial'
                              : row.natureza_locacao === 'nao_residencial'
                                ? 'Nao residencial'
                                : 'Selecione a natureza da locação'
                          }
                        >
                          <option value="">Selecione a natureza da locação</option>
                          <option value="residencial">Residencial</option>
                          <option value="nao_residencial">Nao residencial</option>
                        </select>
                      ) : (
                        <span className="block px-2 py-1 text-slate-800">{formatNaturezaLocacaoLabel(row.natureza_locacao)}</span>
                      )}
                    </td>
                  )}

                  {visibleColumns.includes('matricula_imovel') && (
                    <td className="py-2 px-2 min-w-[180px]" title={row.matricula_imovel || ''}>
                      {canEditCell(row) ? (
                        <input
                          className="w-full border border-slate-200 rounded px-2 py-1"
                          value={row.matricula_imovel}
                          onChange={(e) => updateRow(row.rowId, { matricula_imovel: e.target.value })}
                          placeholder="Matrícula"
                          title={row.matricula_imovel || ''}
                        />
                      ) : (
                        <span className="block px-2 py-1 text-slate-800">{row.matricula_imovel || '-'}</span>
                      )}
                    </td>
                  )}

                  {visibleColumns.includes('inscricao_iptu') && (
                    <td className="py-2 px-2 min-w-[180px]" title={row.inscricao_iptu || ''}>
                      {canEditCell(row) ? (
                        <input
                          className="w-full border border-slate-200 rounded px-2 py-1"
                          value={row.inscricao_iptu}
                          onChange={(e) => updateRow(row.rowId, { inscricao_iptu: e.target.value })}
                          placeholder="Inscrição IPTU"
                          title={row.inscricao_iptu || ''}
                        />
                      ) : (
                        <span className="block px-2 py-1 text-slate-800">{row.inscricao_iptu || '-'}</span>
                      )}
                    </td>
                  )}

                  {visibleColumns.includes('cartorio_registro') && (
                    <td className="py-2 px-2 min-w-[200px]" title={row.cartorio_registro || ''}>
                      {canEditCell(row) ? (
                        <input
                          className="w-full border border-slate-200 rounded px-2 py-1"
                          value={row.cartorio_registro}
                          onChange={(e) => updateRow(row.rowId, { cartorio_registro: e.target.value })}
                          placeholder="Cartório"
                          title={row.cartorio_registro || ''}
                        />
                      ) : (
                        <span className="block px-2 py-1 text-slate-800">{row.cartorio_registro || '-'}</span>
                      )}
                    </td>
                  )}

                  {visibleColumns.includes('iptu_mensal_padrao') && (
                    <td className="py-2 px-2 min-w-[150px]" title={formatMoneyTooltip(row.iptu_mensal_padrao)}>
                      {canEditCell(row) ? (
                        <MoneyInput value={row.iptu_mensal_padrao} onChange={(v) => updateRow(row.rowId, { iptu_mensal_padrao: v })} title={formatMoneyTooltip(row.iptu_mensal_padrao)} />
                      ) : (
                        <span className="block px-2 py-1 text-slate-800 text-right">{formatMoneyTooltip(row.iptu_mensal_padrao)}</span>
                      )}
                    </td>
                  )}
                  {visibleColumns.includes('condominio_mensal_padrao') && (
                    <td className="py-2 px-2 min-w-[150px]" title={formatMoneyTooltip(row.condominio_mensal_padrao)}>
                      {canEditCell(row) ? (
                        <MoneyInput value={row.condominio_mensal_padrao} onChange={(v) => updateRow(row.rowId, { condominio_mensal_padrao: v })} title={formatMoneyTooltip(row.condominio_mensal_padrao)} />
                      ) : (
                        <span className="block px-2 py-1 text-slate-800 text-right">{formatMoneyTooltip(row.condominio_mensal_padrao)}</span>
                      )}
                    </td>
                  )}
                  {visibleColumns.includes('seguro_mensal_padrao') && (
                    <td className="py-2 px-2 min-w-[150px]" title={formatMoneyTooltip(row.seguro_mensal_padrao)}>
                      {canEditCell(row) ? (
                        <MoneyInput value={row.seguro_mensal_padrao} onChange={(v) => updateRow(row.rowId, { seguro_mensal_padrao: v })} title={formatMoneyTooltip(row.seguro_mensal_padrao)} />
                      ) : (
                        <span className="block px-2 py-1 text-slate-800 text-right">{formatMoneyTooltip(row.seguro_mensal_padrao)}</span>
                      )}
                    </td>
                  )}
                  {visibleColumns.includes('camareira_mensal_padrao') && (
                    <td className="py-2 px-2 min-w-[150px]" title={formatMoneyTooltip(row.camareira_mensal_padrao)}>
                      {canEditCell(row) ? (
                        <MoneyInput value={row.camareira_mensal_padrao} onChange={(v) => updateRow(row.rowId, { camareira_mensal_padrao: v })} title={formatMoneyTooltip(row.camareira_mensal_padrao)} />
                      ) : (
                        <span className="block px-2 py-1 text-slate-800 text-right">{formatMoneyTooltip(row.camareira_mensal_padrao)}</span>
                      )}
                    </td>
                  )}
                  {visibleColumns.includes('seguranca_mensal_padrao') && (
                    <td className="py-2 px-2 min-w-[150px]" title={formatMoneyTooltip(row.seguranca_mensal_padrao)}>
                      {canEditCell(row) ? (
                        <MoneyInput value={row.seguranca_mensal_padrao} onChange={(v) => updateRow(row.rowId, { seguranca_mensal_padrao: v })} title={formatMoneyTooltip(row.seguranca_mensal_padrao)} />
                      ) : (
                        <span className="block px-2 py-1 text-slate-800 text-right">{formatMoneyTooltip(row.seguranca_mensal_padrao)}</span>
                      )}
                    </td>
                  )}
                  {visibleColumns.includes('material_limpeza_mensal_padrao') && (
                    <td className="py-2 px-2 min-w-[150px]" title={formatMoneyTooltip(row.material_limpeza_mensal_padrao)}>
                      {canEditCell(row) ? (
                        <MoneyInput value={row.material_limpeza_mensal_padrao} onChange={(v) => updateRow(row.rowId, { material_limpeza_mensal_padrao: v })} title={formatMoneyTooltip(row.material_limpeza_mensal_padrao)} />
                      ) : (
                        <span className="block px-2 py-1 text-slate-800 text-right">{formatMoneyTooltip(row.material_limpeza_mensal_padrao)}</span>
                      )}
                    </td>
                  )}
                  {visibleColumns.includes('lavanderia_enxoval_mensal_padrao') && (
                    <td className="py-2 px-2 min-w-[170px]" title={formatMoneyTooltip(row.lavanderia_enxoval_mensal_padrao)}>
                      {canEditCell(row) ? (
                        <MoneyInput value={row.lavanderia_enxoval_mensal_padrao} onChange={(v) => updateRow(row.rowId, { lavanderia_enxoval_mensal_padrao: v })} title={formatMoneyTooltip(row.lavanderia_enxoval_mensal_padrao)} />
                      ) : (
                        <span className="block px-2 py-1 text-slate-800 text-right">{formatMoneyTooltip(row.lavanderia_enxoval_mensal_padrao)}</span>
                      )}
                    </td>
                  )}
                  {visibleColumns.includes('checkin_checkout_mensal_padrao') && (
                    <td className="py-2 px-2 min-w-[150px]" title={formatMoneyTooltip(row.checkin_checkout_mensal_padrao)}>
                      {canEditCell(row) ? (
                        <MoneyInput value={row.checkin_checkout_mensal_padrao} onChange={(v) => updateRow(row.rowId, { checkin_checkout_mensal_padrao: v })} title={formatMoneyTooltip(row.checkin_checkout_mensal_padrao)} />
                      ) : (
                        <span className="block px-2 py-1 text-slate-800 text-right">{formatMoneyTooltip(row.checkin_checkout_mensal_padrao)}</span>
                      )}
                    </td>
                  )}
                  {visibleColumns.includes('taxas_pagamento_mensal_padrao') && (
                    <td className="py-2 px-2 min-w-[150px]" title={formatMoneyTooltip(row.taxas_pagamento_mensal_padrao)}>
                      {canEditCell(row) ? (
                        <MoneyInput value={row.taxas_pagamento_mensal_padrao} onChange={(v) => updateRow(row.rowId, { taxas_pagamento_mensal_padrao: v })} title={formatMoneyTooltip(row.taxas_pagamento_mensal_padrao)} />
                      ) : (
                        <span className="block px-2 py-1 text-slate-800 text-right">{formatMoneyTooltip(row.taxas_pagamento_mensal_padrao)}</span>
                      )}
                    </td>
                  )}
                  {visibleColumns.includes('tarifas_bancarias_mensal_padrao') && (
                    <td className="py-2 px-2 min-w-[160px]" title={formatMoneyTooltip(row.tarifas_bancarias_mensal_padrao)}>
                      {canEditCell(row) ? (
                        <MoneyInput value={row.tarifas_bancarias_mensal_padrao} onChange={(v) => updateRow(row.rowId, { tarifas_bancarias_mensal_padrao: v })} title={formatMoneyTooltip(row.tarifas_bancarias_mensal_padrao)} />
                      ) : (
                        <span className="block px-2 py-1 text-slate-800 text-right">{formatMoneyTooltip(row.tarifas_bancarias_mensal_padrao)}</span>
                      )}
                    </td>
                  )}
                  {visibleColumns.includes('vacancia_mensal_padrao') && (
                    <td className="py-2 px-2 min-w-[150px]" title={formatMoneyTooltip(row.vacancia_mensal_padrao)}>
                      {canEditCell(row) ? (
                        <MoneyInput value={row.vacancia_mensal_padrao} onChange={(v) => updateRow(row.rowId, { vacancia_mensal_padrao: v })} title={formatMoneyTooltip(row.vacancia_mensal_padrao)} />
                      ) : (
                        <span className="block px-2 py-1 text-slate-800 text-right">{formatMoneyTooltip(row.vacancia_mensal_padrao)}</span>
                      )}
                    </td>
                  )}
                  {visibleColumns.includes('inadimplencia_mensal_padrao') && (
                    <td className="py-2 px-2 min-w-[160px]" title={formatMoneyTooltip(row.inadimplencia_mensal_padrao)}>
                      {canEditCell(row) ? (
                        <MoneyInput value={row.inadimplencia_mensal_padrao} onChange={(v) => updateRow(row.rowId, { inadimplencia_mensal_padrao: v })} title={formatMoneyTooltip(row.inadimplencia_mensal_padrao)} />
                      ) : (
                        <span className="block px-2 py-1 text-slate-800 text-right">{formatMoneyTooltip(row.inadimplencia_mensal_padrao)}</span>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteConfirmText('');
        }}
        title={selectedRowsWithData.length > 1 ? 'Deletar linhas selecionadas' : 'Deletar linha selecionada'}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Para confirmar, digite <strong>{deleteRequiredText}</strong>.
          </p>
          <Input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder={deleteRequiredText}
            className="font-mono"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="tertiary"
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirmText('');
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteConfirmText.trim().toLowerCase() !== deleteRequiredText}
              onClick={() => void handleDeleteSelected()}
            >
              Deletar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showLoadSimulationModal}
        onClose={() => setShowLoadSimulationModal(false)}
        title="Carregar simulação"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Deseja carregar a simulação com quais imóveis?
          </p>
          {allPersistedIds.length === 0 && allDraftRows.length > 0 && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              Existem imóveis não salvos com aluguel preenchido. Eles serão incluídos automaticamente no carregamento.
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="tertiary"
              onClick={() => setShowLoadSimulationModal(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={selectedPersistedIds.length + selectedDraftRows.length === 0}
              onClick={() => {
                void onApplyToSimulation({ propertyIds: selectedPersistedIds, draftRows: selectedDraftRows });
                setShowLoadSimulationModal(false);
              }}
            >
              Apenas selecionados ({selectedPersistedIds.length + selectedDraftRows.length})
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={allPersistedIds.length + allDraftRows.length === 0}
              onClick={() => {
                void onApplyToSimulation({ propertyIds: allPersistedIds, draftRows: allDraftRows });
                setShowLoadSimulationModal(false);
              }}
            >
              Todos elegíveis ({allPersistedIds.length + allDraftRows.length})
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
