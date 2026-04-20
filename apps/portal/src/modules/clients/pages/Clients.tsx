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
import { formatCnpj, formatCpf, parseDigits, isValidCpf, isValidCnpj } from '../../../shared/utils/masks';

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
    const cnpjDigits = formData.cnpj ? parseDigits(formData.cnpj) : '';
    const cpfDigits = formData.cpf ? parseDigits(formData.cpf) : '';
    if (formData.person_type === 'pj' && cnpjDigits) {
      if (cnpjDigits.length !== 14) {
        showError('CNPJ deve ter 14 dígitos.');
        return;
      }
      if (!isValidCnpj(cnpjDigits)) {
        showError('CNPJ inválido. Verifique os dígitos.');
        return;
      }
    }
    if (formData.person_type === 'pf' && cpfDigits) {
      if (cpfDigits.length !== 11) {
        showError('CPF deve ter 11 dígitos.');
        return;
      }
      if (!isValidCpf(cpfDigits)) {
        showError('CPF inválido. Verifique os dígitos.');
        return;
      }
    }
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Gestão de Clientes</h1>
            <p className="text-slate-500 text-sm font-medium mt-1">Gerencie a base de contribuintes e entidades analisadas no portal</p>
          </div>
          <Button onClick={() => handleOpenModal()}>
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Novo Cliente
          </Button>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 w-full">
              <Input
                placeholder="Buscar por nome, CNPJ ou CPF (filtro rápido)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="!py-3"
              />
            </div>
            <div className="w-full md:w-60">
              <select
                className="w-full bg-white border border-[#d2dae2] rounded-md px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:border-[#1351b4] focus:ring-1 focus:ring-[#1351b4]/20"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Todos os status</option>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
              }}
            >
              Limpar
            </Button>
          </div>
        </Card>

        {/* Clients List */}
        <Card>
          {isLoading ? (
            <div className="text-center py-20 bg-slate-50/50 rounded flex flex-col items-center">
               <div className="w-8 h-8 rounded bg-slate-200 animate-pulse mb-4"></div>
               <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Aguardando base de dados...</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-20 bg-slate-50/30 rounded border border-dashed border-slate-200">
               <p className="text-sm font-bold text-slate-500 uppercase">Nenhum registro localizado</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="table-gov border-t border-slate-100">
                <thead>
                  <tr>
                    <th className="pl-6">Contribuinte / Razão Social</th>
                    <th>Identificação</th>
                    <th>Contato Eletrônico</th>
                    <th>Status</th>
                    <th>Data Registro</th>
                    <th className="text-right pr-6">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="group transition-colors">
                      <td className="py-5 pl-6">
                        <span className="font-bold text-slate-800 tracking-tight block leading-none mb-1 group-hover:text-[#1351b4]">{client.name}</span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Entidade Protec</span>
                      </td>
                      <td>
                        <span className="font-black text-slate-700 tracking-tighter text-xs">
                          {client.cnpj ? formatCnpj(client.cnpj) : client.cpf ? formatCpf(client.cpf) : '-'}
                        </span>
                      </td>
                      <td className="text-xs font-medium text-slate-600">{client.email || 'N/A'}</td>
                      <td>
                        <Badge variant={client.status === 'active' ? 'success' : 'default'}>
                          {client.status === 'active' ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td>
                        <span className="text-[11px] font-bold text-slate-500">
                          {new Date(client.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </td>
                      <td className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenModal(client)}
                            className="text-[#1351b4] hover:bg-blue-50 border-transparent !p-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleDelete(client.id)}
                            className="text-rose-600 hover:bg-rose-50 border-transparent !p-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </Button>
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
