import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { PropertyWithClient } from '../services/property.service';
import { Button } from '../../../shared/components/ui/Button';
import { MoneyInput } from '../../../shared/components/ui/MoneyInput';
import { Modal } from '../../../shared/components/ui/Modal';
import { Input } from '../../../shared/components/ui/Input';
import { spreadsheetTableNavCapture } from '../../../shared/utils/gridKeyboardNav';

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
  /** Id da linha na grelha (rascunho ou imóvel) — usado para gerar nome padrão se o identificador estiver vazio. */
  rowId: string;
  /** Presente quando a linha já existe no cadastro — o pai deve usar PATCH em vez de criar de novo. */
  propertyId?: string;
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
  /** `toolbar`: botão junto aos demais. `footer`: CTA principal ao final da grade (fluxo assistido). */
  simulationLoadButtonPlacement?: 'toolbar' | 'footer';
  /** Rótulo do botão que envia os imóveis para a planilha do simulador (ex.: «Avançar»). */
  simulationLoadButtonLabel?: string;
  /** Quando true, desabilita o botão e exibe spinner de carregamento. */
  simulationLoadButtonLoading?: boolean;
};

const COLUMN_DEFS: Array<{ id: ColumnId; label: string; isMoney?: boolean }> = [
  { id: 'identificador', label: 'Imovel' },
  { id: 'valor_aluguel_mensal', label: 'Valor do aluguel mensal', isMoney: true },
  { id: 'tipo_locacao', label: 'Tipo da locacao' },
  { id: 'natureza_locacao', label: 'Natureza da locacao' },
  { id: 'matricula_imovel', label: 'Matrícula' },
  { id: 'inscricao_iptu', label: 'Inscrição IPTU' },
  { id: 'cartorio_registro', label: 'Cartório' },
  { id: 'iptu_mensal_padrao', label: 'IPTU Anual', isMoney: true },
  { id: 'condominio_mensal_padrao', label: 'Condomínio', isMoney: true },
  { id: 'seguro_mensal_padrao', label: 'Seguro Anual', isMoney: true },
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

/** Trata NaN/undefined como zero — evita rascunho “fantasma” com valor inválido. */
function numIsEmpty(n: number): boolean {
  return !Number.isFinite(n) || n === 0;
}

function isGridRowEmpty(row: GridRow): boolean {
  return (
    row.identificador.trim() === '' &&
    numIsEmpty(row.valor_aluguel_mensal) &&
    row.tipo_locacao === '' &&
    row.natureza_locacao === '' &&
    row.matricula_imovel.trim() === '' &&
    row.inscricao_iptu.trim() === '' &&
    row.cartorio_registro.trim() === '' &&
    numIsEmpty(row.iptu_mensal_padrao) &&
    numIsEmpty(row.condominio_mensal_padrao) &&
    numIsEmpty(row.seguro_mensal_padrao) &&
    numIsEmpty(row.camareira_mensal_padrao) &&
    numIsEmpty(row.seguranca_mensal_padrao) &&
    numIsEmpty(row.material_limpeza_mensal_padrao) &&
    numIsEmpty(row.lavanderia_enxoval_mensal_padrao) &&
    numIsEmpty(row.checkin_checkout_mensal_padrao) &&
    numIsEmpty(row.taxas_pagamento_mensal_padrao) &&
    numIsEmpty(row.tarifas_bancarias_mensal_padrao) &&
    numIsEmpty(row.vacancia_mensal_padrao) &&
    numIsEmpty(row.inadimplencia_mensal_padrao)
  );
}

function isRowEligibleForSimulation(row: GridRow): boolean {
  const rent = Number(row.valor_aluguel_mensal);
  return Number.isFinite(rent) && rent > 0;
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
  simulationLoadButtonPlacement = 'toolbar',
  simulationLoadButtonLabel = 'Carregar simulação',
  simulationLoadButtonLoading = false,
}: Props) {
  const [rows, setRows] = useState<GridRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [iptuInputMode, setIptuInputMode] = useState<'mensal' | 'anual'>('anual');
  const [seguroInputMode, setSeguroInputMode] = useState<'mensal' | 'anual'>('anual');
  const [visibleColumns, setVisibleColumns] = useState<ColumnId[]>(() => readColumnPrefs());
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showLoadSimulationModal, setShowLoadSimulationModal] = useState(false);
  const debugShortcutArmedUntilRef = useRef<number>(0);
  const pendingDuplicateFocusRowIdRef = useRef<string | null>(null);
  const selectAllEligibleRef = useRef<HTMLInputElement>(null);

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

  const getRowStatus = (row: GridRow): '' | 'saved' | 'draft' | 'editing_saved' => {
    if (isRowEmpty(row)) return '';
    if (row.isPersisted && row.isEditing) return 'editing_saved';
    if (!row.isPersisted) return 'draft';
    return 'saved';
  };

  const rowNeedsSave = (row: GridRow) => {
    const s = getRowStatus(row);
    return s === 'draft' || s === 'editing_saved';
  };

  /** Novo imóvel só grava com aluguel mensal > 0 (evita registro vazio ao usar nome padrão). */
  const canSubmitRowForSave = (row: GridRow) => {
    if (!rowNeedsSave(row)) return false;
    if (!row.isPersisted) return isRowEligibleForSimulation(row);
    return true;
  };

  const hasRowsToSave = rows.some((r) => canSubmitRowForSave(r));
  const hasPersistedRowsEditing = rows.some((r) => r.isPersisted && r.isEditing);
  const eligibleRowsCount = rows.filter((r) => isRowEligibleForSimulation(r)).length;
  const eligibleRowsForBulk = useMemo(() => rows.filter((r) => isRowEligibleForSimulation(r)), [rows]);
  const allEligibleSelected = useMemo(
    () => eligibleRowsForBulk.length > 0 && eligibleRowsForBulk.every((r) => r.isSelected),
    [eligibleRowsForBulk]
  );
  const selectedSavedRowsCount = rows.filter(
    (r) => r.isSelected && getRowStatus(r) === 'saved'
  ).length;

  const selectedForSimulationCount = selectedPersistedIds.length + selectedDraftRows.length;
  const totalEligibleForLoad = allPersistedIds.length + allDraftRows.length;

  const handleClickCarregarSimulacao = useCallback(() => {
    if (eligibleRowsCount === 0 || totalEligibleForLoad === 0) return;
    if (selectedForSimulationCount === 0) {
      void onApplyToSimulation({ propertyIds: allPersistedIds, draftRows: allDraftRows });
      return;
    }
    if (selectedForSimulationCount === totalEligibleForLoad) {
      void onApplyToSimulation({ propertyIds: allPersistedIds, draftRows: allDraftRows });
      return;
    }
    setShowLoadSimulationModal(true);
  }, [
    eligibleRowsCount,
    totalEligibleForLoad,
    selectedForSimulationCount,
    allPersistedIds,
    allDraftRows,
    onApplyToSimulation,
  ]);

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

  const toggleSelectAllEligible = useCallback(() => {
    setRows((prev) => {
      const eligible = prev.filter((r) => isRowEligibleForSimulation(r));
      if (eligible.length === 0) return prev;
      const allOn = eligible.every((r) => r.isSelected);
      const eligibleIds = new Set(eligible.map((r) => r.rowId));
      return prev.map((r) => (eligibleIds.has(r.rowId) ? { ...r, isSelected: !allOn } : r));
    });
  }, []);

  const duplicateRowBelow = useCallback((sourceRowId: string) => {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.rowId === sourceRowId);
      if (idx < 0) return prev;
      const source = prev[idx];
      if (isGridRowEmpty(source)) return prev;

      const newRowId = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const newRow: GridRow = {
        rowId: newRowId,
        isPersisted: false,
        isSelected: false,
        isEditing: true,
        identificador: source.identificador.trim() ? `${source.identificador.trim()} (cópia)` : '',
        valor_aluguel_mensal: source.valor_aluguel_mensal,
        tipo_locacao: source.tipo_locacao,
        natureza_locacao: source.natureza_locacao,
        matricula_imovel: '',
        inscricao_iptu: '',
        cartorio_registro: '',
        iptu_mensal_padrao: source.iptu_mensal_padrao,
        condominio_mensal_padrao: source.condominio_mensal_padrao,
        seguro_mensal_padrao: source.seguro_mensal_padrao,
        camareira_mensal_padrao: source.camareira_mensal_padrao,
        seguranca_mensal_padrao: source.seguranca_mensal_padrao,
        material_limpeza_mensal_padrao: source.material_limpeza_mensal_padrao,
        lavanderia_enxoval_mensal_padrao: source.lavanderia_enxoval_mensal_padrao,
        checkin_checkout_mensal_padrao: source.checkin_checkout_mensal_padrao,
        taxas_pagamento_mensal_padrao: source.taxas_pagamento_mensal_padrao,
        tarifas_bancarias_mensal_padrao: source.tarifas_bancarias_mensal_padrao,
        vacancia_mensal_padrao: source.vacancia_mensal_padrao,
        inadimplencia_mensal_padrao: source.inadimplencia_mensal_padrao,
      };

      pendingDuplicateFocusRowIdRef.current = newRowId;
      const next = [...prev.slice(0, idx + 1), newRow, ...prev.slice(idx + 1)];
      return ensureDraftCapacity(next);
    });
  }, []);

  useLayoutEffect(() => {
    const selEl = selectAllEligibleRef.current;
    if (selEl) {
      const eligible = rows.filter((r) => isRowEligibleForSimulation(r));
      const n = eligible.length;
      const selected = eligible.filter((r) => r.isSelected).length;
      selEl.indeterminate = n > 0 && selected > 0 && selected < n;
    }

    const focusId = pendingDuplicateFocusRowIdRef.current;
    if (focusId) {
      pendingDuplicateFocusRowIdRef.current = null;
      const tr = document.querySelector(`tr[data-grid-row-id="${CSS.escape(focusId)}"]`);
      const byPlaceholder = tr?.querySelector('input[placeholder="Imovel"]') as HTMLInputElement | null;
      const firstEditable =
        byPlaceholder ??
        (tr?.querySelector('input:not([type="checkbox"])') as HTMLInputElement | null);
      firstEditable?.focus();
      firstEditable?.select?.();
    }
  }, [rows]);

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
    const changed = rows.filter((r) => canSubmitRowForSave(r));
    if (!changed.length) return;
    const savedDraftRowIds = new Set(changed.filter((r) => !r.isPersisted).map((r) => r.rowId));
    setIsSaving(true);
    try {
      await onSaveRows(
        changed.map((r) => ({
          rowId: r.rowId,
          ...(r.isPersisted && r.propertyId ? { propertyId: r.propertyId } : {}),
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
    } catch {
      // Erro já exibido pelo pai (ex.: toast); não recarregar lista nem limpar rascunhos.
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
  const toDisplayValue = (monthlyValue: number, mode: 'mensal' | 'anual') =>
    mode === 'anual' ? monthlyValue * 12 : monthlyValue;
  const toStoredMonthlyValue = (inputValue: number, mode: 'mensal' | 'anual') =>
    mode === 'anual' ? inputValue / 12 : inputValue;

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
        <div className="flex gap-2 flex-wrap items-center">
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => void saveRows()}
            disabled={isSaving || !hasRowsToSave}
          >
            {isSaving ? 'Salvando...' : 'Salvar imóveis'}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={enableEditSelected} disabled={selectedSavedRowsCount === 0}>Editar selecionadas</Button>
          {hasPersistedRowsEditing && (
            <Button type="button" variant="tertiary" size="sm" onClick={cancelEdit}>
              Cancelar edição
            </Button>
          )}
          {simulationLoadButtonPlacement === 'toolbar' && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleClickCarregarSimulacao}
              disabled={eligibleRowsCount === 0 || simulationLoadButtonLoading}
              title={
                selectedForSimulationCount === 0
                  ? 'Carrega todos os imóveis elegíveis na simulação'
                  : selectedForSimulationCount === totalEligibleForLoad
                    ? 'Todos os elegíveis estão marcados — carrega direto'
                    : 'Escolher entre imóveis selecionados ou todos os elegíveis'
              }
            >
              {simulationLoadButtonLoading ? 'Carregando...' : simulationLoadButtonLabel}
            </Button>
          )}
          {selectedRowsWithData.length > 0 && (
            <Button type="button" variant="tertiary" size="sm" className="text-red-700" onClick={() => setShowDeleteModal(true)}>
              Deletar
            </Button>
          )}
          {hasPersistedRowsEditing && (
            <span
              className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900"
              title="Uma ou mais linhas salvas estão em modo edição"
            >
              <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                />
              </svg>
              Editando (salvo)
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <label className="inline-flex items-center gap-1.5">
            <span className="font-medium text-slate-700">IPTU:</span>
            <select
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
              value={iptuInputMode}
              onChange={(e) => setIptuInputMode(e.target.value as 'mensal' | 'anual')}
            >
              <option value="mensal">Mensal</option>
              <option value="anual">Anual</option>
            </select>
          </label>
          <label className="inline-flex items-center gap-1.5">
            <span className="font-medium text-slate-700">Seguro:</span>
            <select
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
              value={seguroInputMode}
              onChange={(e) => setSeguroInputMode(e.target.value as 'mensal' | 'anual')}
            >
              <option value="mensal">Mensal</option>
              <option value="anual">Anual</option>
            </select>
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-slate-600 flex items-center gap-4 flex-wrap">
          <span>Legenda:</span>
          <span className="text-slate-500 max-w-[22rem] leading-snug">
            Coluna <strong className="text-slate-600">Dup.</strong>: duplicar linha (rascunho). Checkbox do cabeçalho: marcar todas elegíveis (com aluguel).
          </span>
          <span className="inline-flex items-center gap-1">✅ salva</span>
          <span className="inline-flex items-center gap-1">🕒 rascunho (não salva)</span>
          <span className="inline-flex items-center gap-1 text-amber-800">
            <svg className="h-3.5 w-3.5 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
              />
            </svg>
            editando imóvel já salvo
          </span>
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

      <div className="overflow-x-auto" onKeyDownCapture={spreadsheetTableNavCapture}>
        <table className="min-w-[1100px] w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="w-9 py-2 px-1 text-left align-middle">
                <input
                  ref={selectAllEligibleRef}
                  type="checkbox"
                  checked={allEligibleSelected}
                  disabled={eligibleRowsForBulk.length === 0}
                  onChange={toggleSelectAllEligible}
                  title="Marcar ou desmarcar todas as linhas com aluguel preenchido (elegíveis para simulação)"
                  aria-label="Marcar todas as linhas elegíveis para simulação"
                />
              </th>
              <th
                className="w-10 py-2 px-1 text-center text-xs font-normal text-slate-500"
                title="Duplicar linha como novo rascunho"
              >
                Dup.
              </th>
              <th className="text-left py-2 px-2 w-12">Status</th>
              {COLUMN_DEFS.filter((c) => visibleColumns.includes(c.id)).map((col) => (
                <th key={col.id} className="text-left py-2 px-2 text-slate-700">{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={visibleColumns.length + 3} className="py-3 px-2 text-slate-500">Carregando imóveis...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 3} className="py-3 px-2 text-slate-500">Sem linhas.</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.rowId} data-grid-row-id={row.rowId} className="border-b border-slate-100">
                  <td className="py-2 px-2">
                    <input type="checkbox" checked={row.isSelected} onChange={() => toggleSelect(row.rowId)} />
                  </td>
                  <td className="py-2 px-1 align-middle">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition-colors hover:border-brand/35 hover:bg-brand/5 hover:text-brand disabled:pointer-events-none disabled:opacity-35"
                      disabled={isGridRowEmpty(row)}
                      aria-label="Duplicar linha como rascunho"
                      title="Duplica aluguel, tipo, natureza e custos padrão. Matrícula, IPTU e cartório ficam em branco — cada imóvel é único."
                      onClick={() => duplicateRowBelow(row.rowId)}
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </td>
                  <td className="py-2 px-2 align-middle">
                    {getRowStatus(row) === 'saved' && '✅'}
                    {getRowStatus(row) === 'draft' && '🕒'}
                    {getRowStatus(row) === 'editing_saved' && (
                      <span
                        className="inline-flex items-center justify-center text-amber-700"
                        title="Editando registro salvo — salve ou cancele"
                        aria-label="Editando registro salvo"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                          />
                        </svg>
                      </span>
                    )}
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
                    <td
                      className="py-2 px-2 min-w-[150px]"
                      title={`Mensal: ${formatMoneyTooltip(row.iptu_mensal_padrao)} | Anual: ${formatMoneyTooltip(
                        row.iptu_mensal_padrao * 12
                      )}`}
                    >
                      {canEditCell(row) ? (
                        <MoneyInput
                          value={toDisplayValue(row.iptu_mensal_padrao, iptuInputMode)}
                          onChange={(v) =>
                            updateRow(row.rowId, {
                              iptu_mensal_padrao: toStoredMonthlyValue(v, iptuInputMode),
                            })
                          }
                          title={
                            iptuInputMode === 'anual'
                              ? 'Entrada anual (será convertida para mensal no cadastro)'
                              : 'Entrada mensal'
                          }
                        />
                      ) : (
                        <span className="block px-2 py-1 text-slate-800 text-right">
                          {formatMoneyTooltip(toDisplayValue(row.iptu_mensal_padrao, iptuInputMode))}
                        </span>
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
                    <td
                      className="py-2 px-2 min-w-[150px]"
                      title={`Mensal: ${formatMoneyTooltip(row.seguro_mensal_padrao)} | Anual: ${formatMoneyTooltip(
                        row.seguro_mensal_padrao * 12
                      )}`}
                    >
                      {canEditCell(row) ? (
                        <MoneyInput
                          value={toDisplayValue(row.seguro_mensal_padrao, seguroInputMode)}
                          onChange={(v) =>
                            updateRow(row.rowId, {
                              seguro_mensal_padrao: toStoredMonthlyValue(v, seguroInputMode),
                            })
                          }
                          title={
                            seguroInputMode === 'anual'
                              ? 'Entrada anual (será convertida para mensal no cadastro)'
                              : 'Entrada mensal'
                          }
                        />
                      ) : (
                        <span className="block px-2 py-1 text-slate-800 text-right">
                          {formatMoneyTooltip(toDisplayValue(row.seguro_mensal_padrao, seguroInputMode))}
                        </span>
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

      {simulationLoadButtonPlacement === 'footer' && (
        <div className="flex flex-col gap-3 pt-4 mt-4 border-t border-slate-200 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-slate-600">
              Quando terminar de incluir e selecionar os imóveis, avance para preencher a planilha mensal e os parâmetros tributários.
            </p>
            {simulationLoadButtonLoading && (
              <p className="text-xs text-brand font-medium animate-pulse">
                Buscando dados dos imóveis selecionados...
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="primary"
            className="shrink-0 min-w-[10rem] inline-flex items-center justify-center gap-2"
            onClick={handleClickCarregarSimulacao}
            disabled={eligibleRowsCount === 0 || simulationLoadButtonLoading}
            title={
              selectedForSimulationCount === 0
                ? 'Carrega todos os imóveis elegíveis na simulação'
                : selectedForSimulationCount === totalEligibleForLoad
                  ? 'Todos os elegíveis estão marcados — carrega direto'
                  : 'Escolher entre imóveis selecionados ou todos os elegíveis'
            }
          >
            {simulationLoadButtonLoading && (
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            {simulationLoadButtonLoading ? 'Carregando...' : simulationLoadButtonLabel}
          </Button>
        </div>
      )}

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
        title="Escopo dos imóveis na simulação"
        size="sm"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm leading-relaxed text-slate-700">
              {selectedForSimulationCount === totalEligibleForLoad ? (
                <>
                  Todas as linhas elegíveis estão marcadas (
                  <strong className="text-slate-900">{totalEligibleForLoad}</strong>). Confirme como deseja carregar.
                </>
              ) : (
                <>
                  <strong className="text-slate-900">{selectedForSimulationCount}</strong>{' '}
                  {selectedForSimulationCount === 1 ? 'linha marcada' : 'linhas marcadas'} ·{' '}
                  <strong className="text-slate-900">{totalEligibleForLoad}</strong> elegíveis no total. Escolha o
                  escopo.
                </>
              )}
            </p>
            <p className="text-xs text-slate-500">
              Fechar: clique fora, no × ou pressione <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">Esc</kbd>.
            </p>
          </div>
          {allPersistedIds.length === 0 && allDraftRows.length > 0 && (
            <div
              className="flex gap-3 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3.5 py-3 text-xs leading-snug text-amber-950"
              role="status"
            >
              <svg className="h-5 w-5 shrink-0 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
              <span>
                Rascunhos não salvos com dados válidos serão incluídos na opção que você escolher.
              </span>
            </div>
          )}
          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:flex-nowrap sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full sm:order-1 sm:w-auto sm:min-w-[12rem]"
              disabled={totalEligibleForLoad === 0}
              onClick={() => {
                void onApplyToSimulation({ propertyIds: allPersistedIds, draftRows: allDraftRows });
                setShowLoadSimulationModal(false);
              }}
            >
              Todos os elegíveis ({totalEligibleForLoad})
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="w-full sm:order-2 sm:w-auto sm:min-w-[12rem]"
              disabled={selectedForSimulationCount === 0}
              onClick={() => {
                void onApplyToSimulation({ propertyIds: selectedPersistedIds, draftRows: selectedDraftRows });
                setShowLoadSimulationModal(false);
              }}
            >
              Só a seleção ({selectedForSimulationCount})
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
