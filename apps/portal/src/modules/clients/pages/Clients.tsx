import { useState, useEffect } from 'react';
import { Layout } from '../../../shared/components/layout/Layout';
import { Card } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { Modal } from '../../../shared/components/ui/Modal';
import { ConfirmModal } from '../../../shared/components/ui/ConfirmModal';
import { useToast } from '../../../shared/components/ui/Toast';
import {
  clientService,
  type ClientWithCreatedAt as Client,
  type CreateClientData,
} from '../services/client.service';
import { formatCnpj, formatCpf, parseDigits } from '../../../shared/utils/masks';

export function Clients() {
  const { error: showError, ToastContainer } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
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

  const [formData, setFormData] = useState<CreateClientData>({
    name: '',
    person_type: 'pj',
    cnpj: '',
    cpf: '',
    email: '',
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setIsLoading(true);
    try {
      const data = await clientService.list();
      setClients(data);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      const isPf = !!client.cpf;
      setFormData({
        name: client.name,
        person_type: isPf ? 'pf' : 'pj',
        cnpj: client.cnpj ? parseDigits(client.cnpj) : '',
        cpf: client.cpf ? parseDigits(client.cpf) : '',
        email: client.email,
      });
    } else {
      setEditingClient(null);
      setFormData({ name: '', person_type: 'pj', cnpj: '', cpf: '', email: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
    setFormData({ name: '', person_type: 'pj', cnpj: '', cpf: '', email: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        cnpj: formData.cnpj ? parseDigits(formData.cnpj) : undefined,
        cpf: formData.cpf ? parseDigits(formData.cpf) : undefined,
      };
      if (editingClient) {
        await clientService.update(editingClient.id, payload);
      } else {
        await clientService.create(payload);
      }
      handleCloseModal();
      loadClients();
    } catch (error: any) {
      console.error('Error saving client:', error);
      showError(error.message || 'Erro ao salvar cliente');
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirmar exclusão',
      message: 'Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        try {
          await clientService.delete(id);
          loadClients();
        } catch (error) {
          console.error('Error deleting client:', error);
          showError('Erro ao excluir cliente');
        }
      },
    });
  };

  const filteredClients = clients.filter((client) => {
    const doc = client.cnpj || client.cpf || '';
    const matchesSearch =
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, ''));
    const matchesStatus = !statusFilter || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <Layout>
      <ToastContainer />
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Gestão de Clientes</h1>
          <Button variant="secondary" onClick={() => handleOpenModal()}>
            Novo Cliente
          </Button>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Buscar por nome, CNPJ ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="bg-white border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos os status</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
            <Button
              variant="primary"
              className="w-full md:w-auto"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
              }}
            >
              Limpar Filtros
            </Button>
          </div>
        </Card>

        {/* Clients List */}
        <Card>
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">Carregando...</div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-8 text-slate-500">Nenhum cliente encontrado</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Nome</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">CNPJ/CPF</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Data</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-900">{client.name}</span>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {client.cnpj ? formatCnpj(client.cnpj) : client.cpf ? formatCpf(client.cpf) : '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">{client.email || '-'}</td>
                      <td className="py-3 px-4">
                        <Badge variant={client.status === 'active' ? 'success' : 'default'}>
                          {client.status === 'active' ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {new Date(client.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleOpenModal(client)}
                            className="text-brand hover:text-brand-dark text-sm font-medium"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(client.id)}
                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                          >
                            Excluir
                          </button>
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
          title={editingClient ? 'Editar Cliente' : 'Novo Cliente'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de pessoa</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="personType"
                    value="pj"
                    checked={formData.person_type === 'pj'}
                    onChange={() => setFormData({ ...formData, person_type: 'pj', cpf: '' })}
                    className="rounded border-slate-300"
                  />
                  <span>PJ</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="personType"
                    value="pf"
                    checked={formData.person_type === 'pf'}
                    onChange={() => setFormData({ ...formData, person_type: 'pf', cnpj: '' })}
                    className="rounded border-slate-300"
                  />
                  <span>PF</span>
                </label>
              </div>
            </div>
            <Input
              label="Nome"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            {formData.person_type === 'pj' ? (
              <Input
                label="CNPJ"
                value={formatCnpj(formData.cnpj ?? '')}
                onChange={(e) => {
                  const raw = parseDigits(e.target.value);
                  if (raw.length <= 14) setFormData({ ...formData, cnpj: raw });
                }}
                placeholder="00.000.000/0001-00"
                required
                maxLength={18}
              />
            ) : (
              <Input
                label="CPF"
                value={formatCpf(formData.cpf ?? '')}
                onChange={(e) => {
                  const raw = parseDigits(e.target.value);
                  if (raw.length <= 11) setFormData({ ...formData, cpf: raw });
                }}
                placeholder="000.000.000-00"
                required
                maxLength={14}
              />
            )}
            <Input
              label="Email"
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <div className="flex space-x-3 pt-4">
              <Button type="submit" variant="secondary" className="flex-1">
                {editingClient ? 'Salvar Alterações' : 'Criar Cliente'}
              </Button>
              <Button type="button" variant="tertiary" onClick={handleCloseModal} className="flex-1">
                Cancelar
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
