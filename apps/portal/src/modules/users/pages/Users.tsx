import { useState, useEffect } from 'react';
import { Layout } from '../../../shared/components/layout/Layout';
import { Card } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { Modal } from '../../../shared/components/ui/Modal';
import { ConfirmModal } from '../../../shared/components/ui/ConfirmModal';
import { TenantSelector } from '../../../shared/components/ui/TenantSelector';
import { useToast } from '../../../shared/components/ui/Toast';
import { useAuth } from '../../../shared/contexts/AuthContext';
import apiRequest from '../../../shared/services/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  status?: 'active' | 'inactive';
  company_id?: string | null;
  company_name?: string;
  createdAt: string;
}

interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
}


function getAuthHeaders(overrideTenantId?: string | null) {
  const token = localStorage.getItem('accessToken');
  let tenantId = localStorage.getItem('tenantId');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  
  if (!token) {
    throw new Error('Not authenticated');
  }
  
  // Se um tenantId foi passado como override (ex: selectedTenantId para super_admin), usar ele
  if (overrideTenantId) {
    tenantId = overrideTenantId;
  }
  
  // Super_admin pode não ter tenantId padrão, mas pode ter selecionado um
  if (user?.role === 'super_admin') {
    return { token, tenantId: tenantId || undefined };
  }
  
  if (!tenantId) {
    throw new Error('Not authenticated');
  }
  
  return { token, tenantId };
}

export function Users() {
  const { user: currentUser } = useAuth();
  const { success, error: showError, ToastContainer } = useToast();
  const isSuperAdmin = currentUser?.role === 'super_admin';
  
  const [users, setUsers] = useState<User[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [formData, setFormData] = useState<CreateUserData & { password?: string; status?: 'active' | 'inactive' }>({
    name: '',
    email: '',
    password: '',
    role: 'user',
    status: 'active',
  });

  useEffect(() => {
    if (!isSuperAdmin) {
      // Admin normal carrega usuários do seu próprio tenant
      loadUsers();
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (isSuperAdmin && selectedTenantId) {
      loadUsersForTenant(selectedTenantId);
    }
  }, [selectedTenantId, isSuperAdmin]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const { token, tenantId } = getAuthHeaders();
      const response = await apiRequest<{ data: { users: any[]; total: number } }>(
        '/api/v1/users',
        { token, tenantId }
      );
      setUsers((response.data.users || []).map((u: any) => ({
        ...u,
        status: u.status || 'active',
        createdAt: u.created_at || u.createdAt,
      })));
    } catch (error) {
      console.error('Error loading users:', error);
      showError('Erro ao carregar usuários');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsersForTenant = async (companyId: string) => {
    setIsLoading(true);
    try {
      // Para super_admin, usar o companyId selecionado como tenantId
      const { token, tenantId } = getAuthHeaders(companyId);
      // Enviar tenantId no header E como query param para garantir
      const response = await apiRequest<{ data: { users: any[]; total: number } }>(
        `/api/v1/users/admin?companyId=${companyId}`,
        { token: token || undefined, tenantId: tenantId || companyId }
      );
      
      const usersWithCompany = (response.data.users || []).map((u: any) => ({
        ...u,
        status: u.status || 'active',
        company_name: u.company_name,
        createdAt: u.created_at || u.createdAt,
      }));
      
      setUsers(usersWithCompany);
    } catch (error) {
      console.error('Error loading users:', error);
      showError('Erro ao carregar usuários do tenant');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
        status: user.status || 'active',
      });
    } else {
      setEditingUser(null);
      setFormData({ name: '', email: '', password: '', role: 'user', status: 'active' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', role: 'user', status: 'active' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) {
      return;
    }

    if (!formData.password && !editingUser) {
      showError('Senha é obrigatória para novos usuários');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSuperAdmin && selectedTenantId) {
        // Criar/editar usuário para tenant específico
        const { token, tenantId } = getAuthHeaders(selectedTenantId);
        if (editingUser) {
          // TODO: Implementar update via admin route
          showError('Edição de usuários via admin ainda não implementada');
        } else {
          await apiRequest(
            `/api/v1/users/admin?companyId=${selectedTenantId}`,
            {
              method: 'POST',
              body: JSON.stringify({
                name: formData.name,
                email: formData.email,
                password: formData.password,
                role: formData.role,
              }),
              token: token || undefined,
              tenantId: tenantId || selectedTenantId,
            }
          );
          success('Usuário criado com sucesso!');
          handleCloseModal();
          loadUsersForTenant(selectedTenantId);
        }
      } else {
        // Criar/editar usuário no tenant atual
        const { token, tenantId } = getAuthHeaders();
        if (editingUser) {
          await apiRequest(
            `/api/v1/users/${editingUser.id}`,
            {
              method: 'PUT',
              body: JSON.stringify({
                name: formData.name,
                email: formData.email,
                role: formData.role,
                status: formData.status || 'active',
              }),
              token,
              tenantId,
            }
          );
          success('Usuário atualizado com sucesso!');
          handleCloseModal();
          loadUsers();
        } else {
          if (!formData.password) {
            showError('Senha é obrigatória para novos usuários');
            return;
          }
          await apiRequest(
            '/api/v1/users',
            {
              method: 'POST',
              body: JSON.stringify({
                name: formData.name,
                email: formData.email,
                password: formData.password,
                role: formData.role,
              }),
              token,
              tenantId,
            }
          );
          success('Usuário criado com sucesso!');
          handleCloseModal();
          loadUsers();
        }
      }
    } catch (error: any) {
      console.error('Error saving user:', error);
      showError(error.message || 'Erro ao salvar usuário');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirmar exclusão',
      message: 'Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        try {
          const tenantIdToUse = isSuperAdmin && selectedTenantId ? selectedTenantId : undefined;
          const { token, tenantId } = getAuthHeaders(tenantIdToUse);
          await apiRequest(
            `/api/v1/users/${id}`,
            {
              method: 'DELETE',
              token,
              tenantId: tenantId || tenantIdToUse,
            }
          );
          success('Usuário excluído com sucesso!');
          if (isSuperAdmin && selectedTenantId) {
            loadUsersForTenant(selectedTenantId);
          } else {
            loadUsers();
          }
        } catch (error: any) {
          console.error('Error deleting user:', error);
          showError(error.message || 'Erro ao excluir usuário');
        }
      },
    });
  };

  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? 'ativar' : 'desativar';
    
    setConfirmModal({
      isOpen: true,
      title: `Confirmar ${action === 'ativar' ? 'ativação' : 'desativação'}`,
      message: `Tem certeza que deseja ${action} este usuário?`,
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        try {
          const tenantIdToUse = isSuperAdmin && selectedTenantId ? selectedTenantId : undefined;
          const { token, tenantId } = getAuthHeaders(tenantIdToUse);
          await apiRequest(
            `/api/v1/users/${user.id}`,
            {
              method: 'PUT',
              body: JSON.stringify({
                status: newStatus,
              }),
              token,
              tenantId: tenantId || tenantIdToUse,
            }
          );
          success(`Usuário ${newStatus === 'active' ? 'ativado' : 'desativado'} com sucesso!`);
          if (isSuperAdmin && selectedTenantId) {
            loadUsersForTenant(selectedTenantId);
          } else {
            loadUsers();
          }
        } catch (error: any) {
          console.error('Error toggling user status:', error);
          showError(error.message || 'Erro ao alterar status do usuário');
        }
      },
    });
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !roleFilter || user.role === roleFilter;
    const matchesStatus = !statusFilter || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const activeCount = filteredUsers.filter(u => u.status === 'active').length;
  const adminCount = filteredUsers.filter(u => u.role === 'admin').length;
  const userCount = filteredUsers.filter(u => u.role === 'user').length;

  const getRoleBadge = (role: string) => {
    if (role === 'admin') return <Badge variant="info">Admin</Badge>;
    return <Badge variant="default">Usuário</Badge>;
  };

  return (
    <Layout>
      <ToastContainer />
      <div className="h-full flex flex-col">
        {/* Header com busca integrada */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Clientes</h1>
              <p className="text-sm text-slate-500 mt-1">
                {isSuperAdmin ? 'Gerencie usuários de todos os tenants' : 'Gerencie os usuários do seu tenant'}
              </p>
            </div>
            <Button 
              variant="secondary" 
              onClick={() => handleOpenModal()}
              disabled={isSuperAdmin && !selectedTenantId}
              className="w-full sm:w-auto"
            >
              <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Novo Usuário
            </Button>
          </div>

          {/* Tenant Selector - Apenas para super_admin */}
          {isSuperAdmin && (
            <div className="mb-4">
              <TenantSelector
                selectedTenantId={selectedTenantId}
                onSelect={setSelectedTenantId}
                label="Selecionar Tenant"
              />
            </div>
          )}

          {/* Barra de busca e filtros */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1 relative">
              <svg 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              className="bg-white border border-slate-200 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">Todos os roles</option>
              <option value="admin">Admin</option>
              <option value="user">Usuário</option>
            </select>
            <select
              className="bg-white border border-slate-200 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos os status</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
            {(searchTerm || roleFilter || statusFilter) && (
              <Button
                variant="tertiary"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setRoleFilter('');
                  setStatusFilter('');
                }}
                className="whitespace-nowrap"
              >
                Limpar filtros
              </Button>
            )}
            {/* Estatísticas rápidas */}
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Total:</span>
                <span className="font-semibold text-slate-900">{filteredUsers.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Ativos:</span>
                <span className="font-semibold text-green-600">{activeCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Admins:</span>
                <span className="font-semibold text-blue-600">{adminCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Usuários:</span>
                <span className="font-semibold text-slate-600">{userCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabela de Usuários */}
        <Card className="flex-1 overflow-hidden flex flex-col p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mb-4"></div>
              <p className="text-slate-500">Carregando usuários...</p>
            </div>
          ) : isSuperAdmin && !selectedTenantId ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Selecione um tenant
              </h3>
              <p className="text-slate-500 text-center max-w-md">
                Escolha um tenant acima para visualizar e gerenciar seus usuários.
              </p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {searchTerm || roleFilter || statusFilter ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
              </h3>
              <p className="text-slate-500 text-center max-w-md mb-6">
                {searchTerm || roleFilter || statusFilter
                  ? 'Tente ajustar os filtros para encontrar o que procura.'
                  : 'Comece criando o primeiro usuário do tenant.'}
              </p>
              {!searchTerm && !roleFilter && !statusFilter && (
                <Button variant="secondary" onClick={() => handleOpenModal()}>
                  Criar Primeiro Usuário
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Usuário
                    </th>
                    {isSuperAdmin && (
                      <th className="text-left py-4 px-6 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Tenant
                      </th>
                    )}
                    <th className="text-left py-4 px-6 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Cadastrado em
                    </th>
                    <th className="text-right py-4 px-6 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => (
                    <tr 
                      key={user.id} 
                      className="hover:bg-slate-50 transition-colors group"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-brand/10 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                            <span className="text-brand font-semibold text-sm">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-900 truncate">{user.name}</p>
                            <p className="text-sm text-slate-500 truncate">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      {isSuperAdmin && (
                        <td className="py-4 px-6 text-sm text-slate-600">
                          {user.company_name || '-'}
                        </td>
                      )}
                      <td className="py-4 px-6">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="py-4 px-6">
                        <Badge variant={user.status === 'active' ? 'success' : 'default'} className="w-fit">
                          {user.status === 'active' ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 text-sm text-slate-600">
                        {new Date(user.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleOpenModal(user)}
                            className="min-w-[80px]"
                          >
                            <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Editar
                          </Button>
                          <Button
                            variant={user.status === 'active' ? 'tertiary' : 'secondary'}
                            size="sm"
                            onClick={() => handleToggleStatus(user)}
                            className="min-w-[80px]"
                            title={user.status === 'active' ? 'Desativar usuário' : 'Ativar usuário'}
                          >
                            <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {user.status === 'active' ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              )}
                            </svg>
                            {user.status === 'active' ? 'Desativar' : 'Ativar'}
                          </Button>
                          {user.id !== currentUser?.id && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleDelete(user.id)}
                              className="min-w-[80px] bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                            >
                              <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Excluir
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Create/Edit Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={editingUser ? 'Editar Usuário' : 'Novo Usuário'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nome"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            {!editingUser && (
              <div>
                <Input
                  label="Senha"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={8}
                />
                <p className="mt-1 text-xs text-slate-500">Mínimo de 8 caracteres</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
              <select
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })}
                required
              >
                <option value="user">Usuário</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {editingUser && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                <select
                  className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  value={formData.status || 'active'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                  required
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>
            )}
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCloseModal}
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Salvando...' : (editingUser ? 'Salvar Alterações' : 'Criar Usuário')}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Confirm Modal */}
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
          variant="danger"
        />
      </div>
    </Layout>
  );
}
