import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../../../shared/components/layout/Layout';
import { CsvImportModal } from '../components/CsvImportModal';
import { CredentialsCopyPanel } from '../components/CredentialsCopyPanel';
import {
  accessListService,
  type AccessListEntry,
  type AccessListStats,
} from '../services/access-list.service';

type StatusFilter = '' | 'pending' | 'active' | 'inactive';

export function AccessList() {
  const [entries, setEntries] = useState<AccessListEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<AccessListStats>({ total: 0, pending: 0, active: 0, inactive: 0 });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [credentialsEntryId, setCredentialsEntryId] = useState<string | null>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const LIMIT = 50;

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        accessListService.list({ status: statusFilter || undefined, search: search || undefined, page, limit: LIMIT }),
        accessListService.getStats(),
      ]);
      setEntries(listRes.data.entries);
      setTotal(listRes.data.total);
      setStats(statsRes.data);
    } catch (err: any) {
      showToast(err.message || 'Erro ao carregar dados', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, search, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [statusFilter, search]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === entries.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(entries.map((e) => e.id)));
    }
  };

  const handleActivate = async (ids: string[]) => {
    setActionLoading(true);
    try {
      const res = await accessListService.activate(ids);
      const success = res.data.filter((r) => r.success).length;
      const failed = res.data.filter((r) => !r.success).length;
      if (success > 0) showToast(`${success} acesso(s) liberado(s)${failed > 0 ? `, ${failed} falha(s)` : ''}`);
      else showToast(`Falha ao liberar: ${res.data[0]?.error}`, 'error');
      setSelected(new Set());
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao ativar', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivate = async (ids: string[]) => {
    setActionLoading(true);
    try {
      const res = await accessListService.deactivate(ids);
      const success = res.data.filter((r) => r.success).length;
      if (success > 0) showToast(`${success} acesso(s) revogado(s)`);
      setSelected(new Set());
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao desativar', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este registro pendente?')) return;
    try {
      await accessListService.deleteEntry(id);
      showToast('Registro removido');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao remover', 'error');
    }
  };

  const handleRegenerate = async (id: string) => {
    try {
      await accessListService.regeneratePassword(id);
      showToast('Senha regenerada com sucesso');
      setCredentialsEntryId(id);
    } catch (err: any) {
      showToast(err.message || 'Erro ao regenerar senha', 'error');
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pendente' },
      active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Ativo' },
      inactive: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Inativo' },
    };
    const s = map[status] || map.pending;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
        {s.label}
      </span>
    );
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Lista de Acesso</h1>
            <p className="text-sm text-slate-500 mt-1">Gerenciamento de acessos ao Cálculo Imobiliário</p>
          </div>
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand text-white font-semibold text-sm rounded-xl hover:bg-brand/90 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Importar CSV
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, color: 'text-slate-900', bg: 'bg-slate-50' },
            { label: 'Pendentes', value: stats.pending, color: 'text-yellow-700', bg: 'bg-yellow-50' },
            { label: 'Ativos', value: stats.active, color: 'text-green-700', bg: 'bg-green-50' },
            { label: 'Inativos', value: stats.inactive, color: 'text-slate-600', bg: 'bg-slate-50' },
          ].map((stat) => (
            <div key={stat.label} className={`${stat.bg} rounded-xl p-4 border border-slate-200/50`}>
              <p className="text-xs font-semibold text-slate-500 uppercase">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color} mt-1`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {([
              { value: '', label: 'Todos' },
              { value: 'pending', label: 'Pendentes' },
              { value: 'active', label: 'Ativos' },
              { value: 'inactive', label: 'Inativos' },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  statusFilter === opt.value
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
            />
          </div>
        </div>

        {/* Batch Actions */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 p-3 bg-brand/5 border border-brand/20 rounded-xl">
            <span className="text-sm font-semibold text-brand">{selected.size} selecionado(s)</span>
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => handleActivate(Array.from(selected))}
                disabled={actionLoading}
                className="px-3 py-1.5 text-xs font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                Liberar Acesso
              </button>
              <button
                onClick={() => handleDeactivate(Array.from(selected))}
                disabled={actionLoading}
                className="px-3 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                Revogar Acesso
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-2 border-brand/20 border-t-brand rounded-full animate-spin mx-auto" />
              <p className="text-sm text-slate-500 mt-3">Carregando...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-slate-500 font-medium">Nenhum registro encontrado</p>
              <p className="text-sm text-slate-400 mt-1">Importe um CSV para começar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left w-10">
                      <input
                        type="checkbox"
                        checked={selected.size === entries.length && entries.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300 text-brand focus:ring-brand/20"
                      />
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase">Nome</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase">E-mail</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase hidden md:table-cell">Telefone</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase hidden lg:table-cell">Empresa</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase">Status</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600 text-xs uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(entry.id)}
                          onChange={() => toggleSelect(entry.id)}
                          className="rounded border-slate-300 text-brand focus:ring-brand/20"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">{entry.name}</td>
                      <td className="px-4 py-3 text-slate-600">{entry.email}</td>
                      <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{entry.phone || '-'}</td>
                      <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">{entry.company_name || '-'}</td>
                      <td className="px-4 py-3">{statusBadge(entry.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {entry.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleActivate([entry.id])}
                                disabled={actionLoading}
                                className="px-2.5 py-1 text-xs font-semibold text-green-700 bg-green-50 rounded-md hover:bg-green-100 transition-colors"
                                title="Liberar acesso"
                              >
                                Liberar
                              </button>
                              <button
                                onClick={() => handleDelete(entry.id)}
                                className="px-2.5 py-1 text-xs font-semibold text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                                title="Remover"
                              >
                                Remover
                              </button>
                            </>
                          )}
                          {entry.status === 'active' && (
                            <>
                              <button
                                onClick={() => setCredentialsEntryId(entry.id)}
                                className="px-2.5 py-1 text-xs font-semibold text-brand bg-brand/10 rounded-md hover:bg-brand/20 transition-colors"
                                title="Copiar credenciais"
                              >
                                Credenciais
                              </button>
                              <button
                                onClick={() => handleRegenerate(entry.id)}
                                className="px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
                                title="Regenerar senha"
                              >
                                Nova Senha
                              </button>
                              <button
                                onClick={() => handleDeactivate([entry.id])}
                                disabled={actionLoading}
                                className="px-2.5 py-1 text-xs font-semibold text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                                title="Revogar acesso"
                              >
                                Revogar
                              </button>
                            </>
                          )}
                          {entry.status === 'inactive' && (
                            <button
                              onClick={() => handleActivate([entry.id])}
                              disabled={actionLoading}
                              className="px-2.5 py-1 text-xs font-semibold text-green-700 bg-green-50 rounded-md hover:bg-green-100 transition-colors"
                              title="Reativar acesso"
                            >
                              Reativar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} de {total}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Próximo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CsvImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onSuccess={() => loadData()}
      />

      <CredentialsCopyPanel
        isOpen={!!credentialsEntryId}
        entryId={credentialsEntryId}
        onClose={() => setCredentialsEntryId(null)}
      />

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}
    </Layout>
  );
}
