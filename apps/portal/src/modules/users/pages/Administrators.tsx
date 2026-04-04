import { useState, useEffect } from 'react';
import { Layout } from '../../../shared/components/layout/Layout';
import { Card } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { PasswordInput } from '../../../shared/components/ui/PasswordInput';
import { Modal } from '../../../shared/components/ui/Modal';
import { ConfirmModal } from '../../../shared/components/ui/ConfirmModal';
import { useToast } from '../../../shared/components/ui/Toast';
import { useAuth } from '../../../shared/contexts/AuthContext';
import apiRequest from '../../../shared/services/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'super_admin';
  status?: 'active' | 'inactive';
  tenant_id?: string | null;
  company_id?: string | null;
  createdAt: string;
}

interface CreateUserData {
  name: string;
  email: string;
  password: string;
  /** Apenas formulário; não enviado à API */
  passwordConfirm?: string;
}

function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    throw new Error('Not authenticated');
  }
  return { token, tenantId: undefined };
}

export function Administrators() {
  const { user: currentUser } = useAuth();
  const { success, error: showError, ToastContainer } = useToast();
  
  const [superAdmins, setSuperAdmins] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
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

  const [formData, setFormData] = useState<CreateUserData>({
    name: '',
    email: '',
    password: '',
    passwordConfirm: '',
  });

  useEffect(() => {
    loadSuperAdmins();
  }, []);

  const loadSuperAdmins = async () => {
    setIsLoading(true);
    try {
      const { token } = getAuthHeaders();
      const response = await apiRequest<{ data: { users: any[] } }>(
        '/api/v1/users/admin/super-admins',
        { token: token || undefined }
      );
      setSuperAdmins((response.data.users || []).map((u: any) => ({
        ...u,
        status: u.status || 'active',
        createdAt: u.created_at || u.createdAt,
      })));
    } catch (error) {
      console.error('Error loading super admins:', error);
      showError('Erro ao carregar administradores');
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
        passwordConfirm: '',
      });
    } else {
      setEditingUser(null);
      setFormData({ name: '', email: '', password: '', passwordConfirm: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', passwordConfirm: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) {
      return;
    }

    if (!formData.password && !editingUser) {
      showError('Senha é obrigatória para novos administradores');
      return;
    }

    if (!editingUser && formData.password !== formData.passwordConfirm) {
      showError('As senhas não coincidem.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { token } = getAuthHeaders();
      
      if (editingUser) {
        // TODO: Implementar update de super admin
        showError('Edição de administradores ainda não implementada');
      } else {
        await apiRequest(
          '/api/v1/users/admin/super-admin',
          {
            method: 'POST',
            body: JSON.stringify({
              name: formData.name,
              email: formData.email,
              password: formData.password,
            }),
            token: token || undefined,
          }
        );
        success('Administrador criado com sucesso!');
        handleCloseModal();
        loadSuperAdmins();
      }
    } catch (error: any) {
      console.error('Error saving administrator:', error);
      showError(error.message || 'Erro ao salvar administrador');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (_id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirmar exclusão',
      message: 'Tem certeza que deseja excluir este administrador? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        try {
          // TODO: Implementar delete de super admin
          showError('Exclusão de administradores ainda não implementada');
        } catch (error: any) {
          console.error('Error deleting administrator:', error);
          showError(error.message || 'Erro ao excluir administrador');
        }
      },
    });
  };

  const filteredUsers = superAdmins.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const activeCount = filteredUsers.filter(u => u.status === 'active').length;
  const totalCount = filteredUsers.length;

  const getRoleBadge = (role: string) => {
    if (role === 'super_admin') return <Badge variant="error">Super Admin</Badge>;
    return <Badge variant="default">Admin</Badge>;
  };

  return (
    <Layout>
      <ToastContainer />
      <div className="h-full flex flex-col">
        {/* Header com busca integrada */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Administradores</h1>
              <p className="text-sm text-slate-500 mt-1">
                Gerencie os administradores do sistema
              </p>
            </div>
            <Button 
              variant="secondary" 
              onClick={() => handleOpenModal()}
              className="w-full sm:w-auto"
            >
              <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Novo Administrador
            </Button>
          </div>

          {/* Barra de busca e estatísticas */}
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
            {searchTerm && (
              <Button
                variant="tertiary"
                size="sm"
                onClick={() => setSearchTerm('')}
                className="whitespace-nowrap"
              >
                Limpar busca
              </Button>
            )}
            {/* Estatísticas rápidas */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Total:</span>
                <span className="font-semibold text-slate-900">{totalCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Ativos:</span>
                <span className="font-semibold text-indigo-600">{activeCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabela de Administradores */}
        <Card className="flex-1 overflow-hidden flex flex-col p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mb-4"></div>
              <p className="text-slate-500">Carregando administradores...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {searchTerm ? 'Nenhum administrador encontrado' : 'Nenhum administrador cadastrado'}
              </h3>
              <p className="text-slate-500 text-center max-w-md mb-6">
                {searchTerm 
                  ? 'Tente ajustar os termos de busca para encontrar o que procura.'
                  : 'Comece criando o primeiro administrador do sistema.'}
              </p>
              {!searchTerm && (
                <Button variant="secondary" onClick={() => handleOpenModal()}>
                  Criar Primeiro Administrador
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Administrador
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
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-1">
                          {getRoleBadge(user.role)}
                          <Badge variant={user.status === 'active' ? 'success' : 'default'} className="w-fit">
                            {user.status === 'active' ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
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
          title={editingUser ? 'Editar Administrador' : 'Novo Administrador'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nome
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            {!editingUser && (
              <div className="space-y-4">
                <div>
                  <PasswordInput
                    label="Senha"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={8}
                  />
                  <p className="mt-1 text-xs text-slate-500">Mínimo de 8 caracteres</p>
                </div>
                <PasswordInput
                  label="Confirmar senha"
                  value={formData.passwordConfirm ?? ''}
                  onChange={(e) => setFormData({ ...formData, passwordConfirm: e.target.value })}
                  required
                  minLength={8}
                />
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
                {isSubmitting ? 'Salvando...' : (editingUser ? 'Salvar Alterações' : 'Criar Administrador')}
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
