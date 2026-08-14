import { useState, useEffect } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { useAuth } from '../../../shared/contexts/AuthContext';
import type { ClientWithCreatedAt } from '../../clients/services/client.service';
import { getCachedClients } from '../../../shared/hooks/useClients';
import { userService } from '../../users/services/user.service';
import { planService } from '../../plans/services/plan.service';
import { companyService } from '../../companies/services/company.service';
import {
  systemService,
  DatabaseStats,
  ModuleUsageSummary,
  GlobalClientThermometerSummary,
} from '../services/system.service';

const MODULE_LABELS: Record<string, string> = {
  'simulador-in-2306': 'Parcelamento IN 2306',
  'irpf-alta-renda': 'IRPF Alta Renda',
  'rating-validator': 'Rating/Parcelamento PGFN',
  properties: 'Simulador Imóveis',
  'fiscal-files': 'Arquivos Fiscais',
  clients: 'Cadastro de Clientes',
};

function normalizeDate(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return null;
}

function toDateLabel(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatClientCreatedAt(client: any): string {
  const dateValue = normalizeDate(client.createdAt ?? client.created_at);
  if (!dateValue) return 'Data indisponível';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Data indisponível';
  return date.toLocaleDateString('pt-BR');
}

function formatThermometerCreatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.length > 16 ? iso.slice(0, 16) : iso;
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

const THERM_LABELS: Record<string, { label: string; short: string; className: string }> = {
  hot: {
    label: 'Quente (acima da média de uso)',
    short: 'Quente',
    className: 'bg-rose-100 text-rose-900 border-rose-200',
  },
  warm: {
    label: 'Morno (na média de uso)',
    short: 'Morno',
    className: 'bg-amber-100 text-amber-900 border-amber-200',
  },
  cold: {
    label: 'Frio (abaixo da média de uso)',
    short: 'Frio',
    className: 'bg-sky-100 text-sky-900 border-sky-200',
  },
  none: {
    label: 'Sem uso no período',
    short: 'Sem uso',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  },
};

export function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    totalUsers: 0,
    activePlans: 0,
  });
  const [recentClients, setRecentClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [usageSummary, setUsageSummary] = useState<ModuleUsageSummary | null>(null);
  const [superAdminCompanies, setSuperAdminCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [thermFilters, setThermFilters] = useState({
    clientSearch: '',
    companySearch: '',
    companyId: '',
    limit: 30,
    days: 30,
  });
  const [thermFiltersDebounced, setThermFiltersDebounced] = useState(thermFilters);
  const [globalThermometer, setGlobalThermometer] = useState<GlobalClientThermometerSummary | null>(null);
  const [thermometerLoading, setThermometerLoading] = useState(false);

  const isSuperAdmin = user?.role === 'super_admin';

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => setThermFiltersDebounced(thermFilters), 400);
    return () => clearTimeout(id);
  }, [thermFilters]);

  useEffect(() => {
    if (!isSuperAdmin) {
      setGlobalThermometer(null);
      return;
    }
    let cancelled = false;
    setThermometerLoading(true);
    systemService
      .getGlobalClientThermometer({
        days: thermFiltersDebounced.days,
        limit: thermFiltersDebounced.limit,
        clientSearch: thermFiltersDebounced.clientSearch || undefined,
        companySearch: thermFiltersDebounced.companySearch || undefined,
        companyId: thermFiltersDebounced.companyId || undefined,
      })
      .then((t) => {
        if (!cancelled) setGlobalThermometer(t);
      })
      .catch(() => {
        if (!cancelled) setGlobalThermometer(null);
      })
      .finally(() => {
        if (!cancelled) setThermometerLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin, thermFiltersDebounced]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (isSuperAdmin) {
        const [companies, plans, dbStatsData, moduleUsageData] = await Promise.all([
          companyService.list(),
          planService.list(),
          systemService.getStats(),
          systemService.getModuleUsage(30),
        ]);

        const normalizedCompanies = (companies as any[]).map((company) => ({
          ...company,
          createdAt: normalizeDate(company.createdAt ?? company.created_at),
          status: 'active',
        }));

        setStats({
          totalClients: normalizedCompanies.length,
          activeClients: normalizedCompanies.length,
          totalUsers: 0,
          activePlans: plans.length,
        });

        setRecentClients(
          normalizedCompanies
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
            .slice(0, 3),
        );

        setSuperAdminCompanies(
          [...normalizedCompanies]
            .map((c) => ({ id: c.id, name: c.name || 'Sem nome' }))
            .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
        );

        setDbStats(dbStatsData || null);
        setUsageSummary(moduleUsageData || null);
      } else {
        const [clients, users, plans] = await Promise.all([
          getCachedClients(),
          userService.list(),
          planService.list(),
        ]);

        const normalizedClients = (clients as ClientWithCreatedAt[]).map((client) => ({
          ...client,
          createdAt: normalizeDate(client.createdAt ?? (client as any).created_at),
        }));

        const activeClients = normalizedClients.filter((c) => c.status === 'active' || !c.status);

        setStats({
          totalClients: normalizedClients.length,
          activeClients: activeClients.length,
          totalUsers: users.length,
          activePlans: plans.length,
        });

        setRecentClients(
          normalizedClients
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
            .slice(0, 3),
        );
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      if (isSuperAdmin) {
        console.error('Error loading database stats:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total de Clientes</p>
                <p className="text-3xl font-bold text-slate-900">{isLoading ? '...' : stats.totalClients}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Clientes Ativos</p>
                <p className="text-3xl font-bold text-slate-900">{isLoading ? '...' : stats.activeClients}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total de Usuários</p>
                <p className="text-3xl font-bold text-slate-900">{isLoading ? '...' : stats.totalUsers}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Planos Ativos</p>
                <p className="text-3xl font-bold text-slate-900">{isLoading ? '...' : stats.activePlans}</p>
              </div>
            </div>
          </Card>
        </div>

        {isSuperAdmin && usageSummary && (
          <Card className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Uso real do sistema (últimos {usageSummary.periodDays} dias)</h2>
            <p className="text-sm text-slate-500 mb-6">
              Eventos reais: <span className="font-semibold text-slate-700">{usageSummary.totalEvents}</span> ·
              Usuários ativos: <span className="font-semibold text-slate-700">{usageSummary.uniqueUsers}</span> ·
              Simulações: <span className="font-semibold text-slate-700">{usageSummary.totalSimulations}</span>
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Uso por módulo (métodos principais)</h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={usageSummary.moduleRealUsage.map((row) => ({
                        modulo: MODULE_LABELS[row.module_key] || row.module_key,
                        total: row.total_events,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="modulo" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={70} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="total" fill="#0f766e" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Clientes cadastrados por dia (30 dias)</h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={usageSummary.dailyClients.map((row) => ({
                        dia: toDateLabel(row.date),
                        total: row.total,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="dia" tick={{ fontSize: 11 }} interval={4} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </Card>
        )}

        {isSuperAdmin && usageSummary && (
          <Card className="mb-8">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Quem mais simulou</h3>
            <div className="space-y-2">
              {usageSummary.topSimulationUsers.length === 0 ? (
                <div className="text-sm text-slate-500 p-3 rounded-lg border border-slate-200 bg-slate-50">
                  Nenhuma simulação registrada no período.
                </div>
              ) : (
                usageSummary.topSimulationUsers.slice(0, 8).map((row, index) => (
                  <div
                    key={`${row.user_id || 'unknown'}-${row.module_key}-${index}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{row.user_name}</p>
                      <p className="text-xs text-slate-500">{MODULE_LABELS[row.module_key] || row.module_key}</p>
                    </div>
                    <p className="font-semibold text-slate-900">{row.simulations}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}

        <Card className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Clientes Recentes</h2>
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">Carregando...</div>
          ) : recentClients.length === 0 ? (
            <div className="text-center py-8 text-slate-500">Nenhum cliente cadastrado</div>
          ) : (
            <div className="space-y-4">
              {recentClients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div>
                    <h3 className="font-semibold text-slate-900">{client.name}</h3>
                    <p className="text-sm text-slate-500">
                      Criado em {formatClientCreatedAt(client)}
                    </p>
                  </div>
                  <Badge variant={(client.status === 'active' || !client.status) ? 'success' : 'default'}>
                    {(client.status === 'active' || !client.status) ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {isSuperAdmin && (
          <Card className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Termômetro dos clientes</h2>
            <p className="text-sm text-slate-500 mb-4">
              Os <strong>cadastros mais recentes</strong> entre os escritórios consultados (ordenados por data de cadastro
              do cliente), com engajamento nos últimos dias. Para muitos tenants, a API consulta só os escritórios mais
              recentes (teto configurável no servidor: <code className="text-xs">GLOBAL_THERMOMETER_MAX_TENANTS</code>).
            </p>

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label htmlFor="therm-client-search" className="block text-sm font-medium text-slate-700 mb-1">
                  Nome do cliente
                </label>
                <input
                  id="therm-client-search"
                  type="search"
                  placeholder="Filtrar por nome…"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  value={thermFilters.clientSearch}
                  onChange={(e) => setThermFilters((p) => ({ ...p, clientSearch: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="therm-company-search" className="block text-sm font-medium text-slate-700 mb-1">
                  Nome do escritório
                </label>
                <input
                  id="therm-company-search"
                  type="search"
                  placeholder="Filtrar empresas…"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  value={thermFilters.companySearch}
                  onChange={(e) => setThermFilters((p) => ({ ...p, companySearch: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="therm-company-id" className="block text-sm font-medium text-slate-700 mb-1">
                  Só este escritório (opcional)
                </label>
                <select
                  id="therm-company-id"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  value={thermFilters.companyId}
                  onChange={(e) => setThermFilters((p) => ({ ...p, companyId: e.target.value }))}
                >
                  <option value="">Todos (respeitando teto de consulta)</option>
                  {superAdminCompanies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="therm-limit" className="block text-sm font-medium text-slate-700 mb-1">
                  Quantidade (últimos cadastros)
                </label>
                <select
                  id="therm-limit"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  value={thermFilters.limit}
                  onChange={(e) => setThermFilters((p) => ({ ...p, limit: Number(e.target.value) }))}
                >
                  {[15, 30, 50, 100, 200].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="therm-days" className="block text-sm font-medium text-slate-700 mb-1">
                  Janela de uso (dias)
                </label>
                <select
                  id="therm-days"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  value={thermFilters.days}
                  onChange={(e) => setThermFilters((p) => ({ ...p, days: Number(e.target.value) }))}
                >
                  {[7, 14, 30, 60, 90, 180, 365].map((n) => (
                    <option key={n} value={n}>
                      {n} dias
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {thermometerLoading ? (
              <p className="text-sm text-slate-500 py-4">Carregando termômetro…</p>
            ) : !globalThermometer ? (
              <p className="text-sm text-amber-800 py-4 rounded-lg border border-amber-200 bg-amber-50 px-3">
                Não foi possível carregar o termômetro.
              </p>
            ) : (
              <>
                <p className="text-sm text-slate-500 mb-2">
                  Janela de pontuação: últimos {globalThermometer.periodDays} dias · Escritórios consultados:{' '}
                  {globalThermometer.tenantsScanned} · Clientes nesta lista: {globalThermometer.windowSize} (limite pedido:{' '}
                  {globalThermometer.limit}).
                </p>
                <p className="text-sm text-slate-600 mb-4">
                  Média entre quem usou:{' '}
                  <span className="font-semibold text-slate-900">
                    {globalThermometer.averageScoreAmongActive.toLocaleString('pt-BR', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })}{' '}
                    eventos
                  </span>
                </p>

                {(() => {
                  const { counts } = globalThermometer;
                  const total = Math.max(1, counts.hot + counts.warm + counts.cold + counts.none);
                  const segments = [
                    { key: 'hot', w: (counts.hot / total) * 100, color: 'bg-rose-500' },
                    { key: 'warm', w: (counts.warm / total) * 100, color: 'bg-amber-400' },
                    { key: 'cold', w: (counts.cold / total) * 100, color: 'bg-sky-500' },
                    { key: 'none', w: (counts.none / total) * 100, color: 'bg-slate-300' },
                  ];
                  return (
                    <div className="mb-6">
                      <div
                        className="flex h-4 w-full overflow-hidden rounded-full border border-slate-200"
                        role="img"
                        aria-label="Distribuição quente, morno, frio e sem uso"
                      >
                        {segments.map((s) =>
                          s.w > 0 ? (
                            <div key={s.key} className={`${s.color} h-full`} style={{ width: `${s.w}%` }} title={s.key} />
                          ) : null,
                        )}
                      </div>
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
                          <p className="font-semibold text-rose-900">Quente</p>
                          <p className="text-2xl font-bold text-rose-800">{counts.hot}</p>
                          <p className="text-xs text-rose-700/80">Acima da média</p>
                        </div>
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                          <p className="font-semibold text-amber-900">Morno</p>
                          <p className="text-2xl font-bold text-amber-800">{counts.warm}</p>
                          <p className="text-xs text-amber-800/80">Na média</p>
                        </div>
                        <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2">
                          <p className="font-semibold text-sky-900">Frio</p>
                          <p className="text-2xl font-bold text-sky-800">{counts.cold}</p>
                          <p className="text-xs text-sky-800/80">Abaixo da média</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                          <p className="font-semibold text-slate-700">Sem uso</p>
                          <p className="text-2xl font-bold text-slate-800">{counts.none}</p>
                          <p className="text-xs text-slate-500">Zero eventos</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <h3 className="text-sm font-semibold text-slate-700 mb-2">Lista (mais recentes primeiro)</h3>
                <div className="space-y-2">
                  {globalThermometer.rows.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Nenhum cliente encontrado com os filtros atuais (ou nenhum cadastro nos escritórios consultados).
                    </p>
                  ) : (
                    globalThermometer.rows.map((row) => {
                      const meta = THERM_LABELS[row.level] ?? THERM_LABELS.none;
                      return (
                        <div
                          key={`${row.company_id}-${row.client_id}`}
                          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate">{row.name}</p>
                            <p className="text-xs text-slate-500 truncate">
                              {row.company_name} · Cadastro {formatThermometerCreatedAt(row.created_at)} · {row.score}{' '}
                              evento(s) no período
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}
                            title={meta.label}
                          >
                            {meta.short}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </Card>
        )}

        {isSuperAdmin && (
          <Card className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Estatísticas do PostgreSQL</h2>
            {dbStats ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm text-slate-600 mb-1">Tamanho do Banco</p>
                  <p className="text-2xl font-bold text-slate-900">{dbStats.databaseSize}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm text-slate-600 mb-1">Total de Tabelas</p>
                  <p className="text-2xl font-bold text-slate-900">{dbStats.totalTables}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm text-slate-600 mb-1">Total de Schemas</p>
                  <p className="text-2xl font-bold text-slate-900">{dbStats.totalSchemas}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm text-slate-600 mb-1">Conexões</p>
                  <p className="text-2xl font-bold text-slate-900">{dbStats.activeConnections}/{dbStats.maxConnections}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                {isLoading ? 'Carregando estatísticas...' : 'Erro ao carregar estatísticas do banco de dados'}
              </div>
            )}
          </Card>
        )}
      </div>
    </>
  );
}

