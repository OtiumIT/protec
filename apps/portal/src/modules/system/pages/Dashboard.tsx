import { useState, useEffect } from 'react';
import { Layout } from '../../../shared/components/layout/Layout';
import { Card } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { clientService, type ClientWithCreatedAt } from '../../clients/services/client.service';
import { userService } from '../../users/services/user.service';
import { planService } from '../../plans/services/plan.service';
import { companyService } from '../../companies/services/company.service';
import { systemService, DatabaseStats } from '../services/system.service';

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

  // Verificar se usuário é super_admin (pode criar empresas)
  const isSuperAdmin = user?.role === 'super_admin';


  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (isSuperAdmin) {
        // Para super_admin, carregar apenas dados globais
        const loadPromises: Promise<any>[] = [
          companyService.list(), // Lista todas as empresas/tenants
          planService.list(),
          systemService.getStats(),
        ];

        const results = await Promise.all(loadPromises);
        const clients = results[0] || [];
        const plans = results[1] || [];
        const dbStatsData = results[2];

        console.log('Dashboard - Clients loaded:', clients);
        console.log('Dashboard - Plans loaded:', plans);

        const activeClients = (clients as ClientWithCreatedAt[]).filter((c: ClientWithCreatedAt) => c.status === 'active' || !c.status);

        setStats({
          totalClients: clients.length,
          activeClients: activeClients.length,
          totalUsers: 0, // Super admin não mostra usuários no dashboard
          activePlans: plans.length,
        });

        // Clientes mais recentes (últimos 3)
        setRecentClients(
          clients
            .sort((a: ClientWithCreatedAt, b: ClientWithCreatedAt) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 3)
        );

        // Estatísticas do banco
        if (dbStatsData) {
          setDbStats(dbStatsData);
        } else {
          console.warn('Database stats not loaded');
        }
      } else {
        // Para admin normal, carregar dados do tenant
        const loadPromises: Promise<any>[] = [
          clientService.list(),
          userService.list(),
          planService.list(),
        ];

        const results = await Promise.all(loadPromises);
        const clients = results[0];
        const users = results[1];
        const plans = results[2];

        // Debug: verificar status dos clientes
        console.log('Dashboard - Clients with status:', (clients as ClientWithCreatedAt[]).map((c: ClientWithCreatedAt) => ({ 
          name: c.name, 
          status: c.status, 
          hasStatus: !!c.status 
        })));

        const activeClients = (clients as ClientWithCreatedAt[]).filter((c: ClientWithCreatedAt) => {
          const isActive = c.status === 'active' || !c.status;
          if (!isActive) {
            console.log('Dashboard - Inactive client:', { name: c.name, status: c.status });
          }
          return isActive;
        });

        setStats({
          totalClients: clients.length,
          activeClients: activeClients.length,
          totalUsers: users.length,
          activePlans: plans.length,
        });

        // Clientes mais recentes (últimos 3)
        setRecentClients(
          clients
            .sort((a: ClientWithCreatedAt, b: ClientWithCreatedAt) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 3)
        );
      }
      } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Se for super_admin e houver erro ao carregar stats, ainda mostrar o resto
      if (isSuperAdmin) {
        console.error('Error loading database stats:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total de Clientes</p>
                <p className="text-3xl font-bold text-slate-900">
                  {isLoading ? '...' : stats.totalClients}
                </p>
              </div>
              <div className="w-12 h-12 bg-brand/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Clientes Ativos</p>
                <p className="text-3xl font-bold text-slate-900">
                  {isLoading ? '...' : stats.activeClients}
                </p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total de Usuários</p>
                <p className="text-3xl font-bold text-slate-900">
                  {isLoading ? '...' : stats.totalUsers}
                </p>
              </div>
              <div className="w-12 h-12 bg-brand/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Planos Ativos</p>
                <p className="text-3xl font-bold text-slate-900">
                  {isLoading ? '...' : stats.activePlans}
                </p>
              </div>
              <div className="w-12 h-12 bg-brand/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
          </Card>
        </div>

        {/* Database Stats - Apenas para super_admin */}
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
                <p className="text-2xl font-bold text-slate-900">
                  {dbStats.activeConnections}/{dbStats.maxConnections}
                </p>
                <div className="mt-2">
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        dbStats.connectionUsagePercent > 80
                          ? 'bg-red-500'
                          : dbStats.connectionUsagePercent > 60
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${dbStats.connectionUsagePercent}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{dbStats.connectionUsagePercent}% utilizado</p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm text-slate-600 mb-1">Cache Hit Ratio</p>
                <p className="text-2xl font-bold text-slate-900">
                  {Number(dbStats.cacheHitRatio || 0).toFixed(2)}%
                </p>
                <div className="mt-2">
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        Number(dbStats.cacheHitRatio || 0) > 95
                          ? 'bg-green-500'
                          : Number(dbStats.cacheHitRatio || 0) > 80
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${Number(dbStats.cacheHitRatio || 0)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm text-slate-600 mb-1">Uso de Índices</p>
                <p className="text-2xl font-bold text-slate-900">
                  {Number(dbStats.indexUsage || 0).toFixed(2)}%
                </p>
                <div className="mt-2">
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        Number(dbStats.indexUsage || 0) > 80
                          ? 'bg-green-500'
                          : Number(dbStats.indexUsage || 0) > 60
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${Number(dbStats.indexUsage || 0)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              {dbStats.diskUsage && (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm text-slate-600 mb-1">Uso de Disco</p>
                  <p className="text-2xl font-bold text-slate-900">{dbStats.diskUsage}</p>
                  {dbStats.diskUsagePercent !== undefined && (
                    <div className="mt-2">
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            dbStats.diskUsagePercent > 80
                              ? 'bg-red-500'
                              : dbStats.diskUsagePercent > 60
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${dbStats.diskUsagePercent}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{dbStats.diskUsagePercent}% utilizado</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                {isLoading ? 'Carregando estatísticas...' : 'Erro ao carregar estatísticas do banco de dados'}
              </div>
            )}
          </Card>
        )}

        {/* Recent Clients */}
        <Card>
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
                      Criado em {new Date(client.createdAt).toLocaleDateString('pt-BR')}
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
      </div>
    </Layout>
  );
}
