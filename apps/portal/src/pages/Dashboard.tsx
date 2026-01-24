import { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { clientService } from '../services/client.service';
import { userService } from '../services/user.service';
import { planService } from '../services/plan.service';

export function Dashboard() {
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    totalUsers: 0,
    activePlans: 0,
  });
  const [recentClients, setRecentClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [clients, users, plans] = await Promise.all([
        clientService.list(),
        userService.list(),
        planService.list(),
      ]);

      const activeClients = clients.filter((c) => c.status === 'active');
      const activeUsers = users.filter((u) => u.status === 'active');

      setStats({
        totalClients: clients.length,
        activeClients: activeClients.length,
        totalUsers: users.length,
        activePlans: plans.length,
      });

      // Clientes mais recentes (últimos 3)
      setRecentClients(
        clients
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 3)
      );
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Dashboard</h1>

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
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <Badge variant={client.status === 'active' ? 'success' : 'default'}>
                    {client.status === 'active' ? 'Ativo' : 'Inativo'}
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
