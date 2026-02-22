import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../../../shared/components/layout/Layout';
import { Card } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { Modal } from '../../../shared/components/ui/Modal';
import { ConfirmModal } from '../../../shared/components/ui/ConfirmModal';
import { useToast } from '../../../shared/components/ui/Toast';
import {
  propertyService,
  type PropertyWithClient,
} from '../services/property.service';
import { clientService } from '../../clients/services/client.service';
import type { ClientWithCreatedAt } from '../../clients/services/client.service';

export function Properties() {
  const { error: showError, ToastContainer } = useToast();
  const [properties, setProperties] = useState<PropertyWithClient[]>([]);
  const [clients, setClients] = useState<ClientWithCreatedAt[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<PropertyWithClient | null>(null);
  const [clientFilter, setClientFilter] = useState<string>('');
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
  const [formData, setFormData] = useState({
    client_id: '',
    tipo_locacao: 'fixa' as 'fixa' | 'flexivel',
    identificador: '',
    modo_entrada: 'reduzido' as 'detalhado' | 'reduzido',
  });

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    loadProperties();
  }, [clientFilter, page]);

  const loadClients = async () => {
    try {
      const data = await clientService.list();
      setClients(data);
    } catch (err) {
      console.error('Error loading clients:', err);
    }
  };

  const loadProperties = async () => {
    setIsLoading(true);
    try {
      const data = await propertyService.list({
        client_id: clientFilter || undefined,
        page,
        limit,
      });
      setProperties(data.properties);
      setTotal(data.total);
    } catch (err) {
      console.error('Error loading properties:', err);
      showError('Erro ao carregar imóveis');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (property?: PropertyWithClient) => {
    if (property) {
      setEditingProperty(property);
      setFormData({
        client_id: property.client_id,
        tipo_locacao: property.tipo_locacao as 'fixa' | 'flexivel',
        identificador: property.identificador,
        modo_entrada: (property as { modo_entrada?: 'detalhado' | 'reduzido' }).modo_entrada ?? 'detalhado',
      });
    } else {
      setEditingProperty(null);
      setFormData({
        client_id: clients[0]?.id ?? '',
        tipo_locacao: 'fixa',
        identificador: '',
        modo_entrada: 'reduzido',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProperty(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProperty) {
        await propertyService.update(editingProperty.id, {
          client_id: formData.client_id,
          tipo_locacao: formData.tipo_locacao,
          identificador: formData.identificador,
          modo_entrada: formData.modo_entrada,
        });
      } else {
        await propertyService.create(formData);
      }
      handleCloseModal();
      loadProperties();
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Erro ao salvar imóvel');
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirmar exclusão',
      message:
        'Tem certeza que deseja excluir este imóvel? Todas as transações serão excluídas.',
      onConfirm: async () => {
        setConfirmModal((m) => ({ ...m, isOpen: false }));
        try {
          await propertyService.delete(id);
          loadProperties();
        } catch {
          showError('Erro ao excluir imóvel');
        }
      },
    });
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <Layout>
      <ToastContainer />
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Gestão Imobiliária</h1>
          <Button variant="secondary" onClick={() => handleOpenModal()}>
            Novo Imóvel
          </Button>
        </div>

        <Card className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Filtrar por Cliente
              </label>
              <select
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:border-brand"
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
              >
                <option value="">Todos os clientes</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        <Card>
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">Carregando...</div>
          ) : properties.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              Nenhum imóvel encontrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      Imóvel
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      Cliente
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      Tipo
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {properties.map((prop) => (
                    <tr
                      key={prop.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="py-3 px-4">
                        <Link
                          to={`/properties/${prop.id}`}
                          className="font-medium text-brand hover:text-brand-dark"
                        >
                          {prop.identificador}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {prop.client_name ?? '-'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="default">
                          {prop.tipo_locacao === 'fixa'
                            ? 'Fixa (Mensal)'
                            : 'Flexível (Airbnb)'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end space-x-2">
                          <Link to={`/properties/${prop.id}`}>
                            <button className="text-brand hover:text-brand-dark text-sm font-medium">
                              Ver detalhes
                            </button>
                          </Link>
                          <button
                            onClick={() => handleOpenModal(prop)}
                            className="text-slate-600 hover:text-slate-800 text-sm font-medium"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(prop.id)}
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

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="tertiary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <span className="py-2 px-4 text-sm text-slate-600">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="tertiary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          )}
        </Card>

        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={editingProperty ? 'Editar Imóvel' : 'Novo Imóvel'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Cliente
              </label>
              <select
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2"
                value={formData.client_id}
                onChange={(e) =>
                  setFormData({ ...formData, client_id: e.target.value })
                }
                required
              >
                <option value="">Selecione...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Identificador (endereço ou nome)"
              value={formData.identificador}
              onChange={(e) =>
                setFormData({ ...formData, identificador: e.target.value })
              }
              required
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tipo de Locação
              </label>
              <select
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2"
                value={formData.tipo_locacao}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    tipo_locacao: e.target.value as 'fixa' | 'flexivel',
                  })
                }
              >
                <option value="fixa">Fixa (Mensal)</option>
                <option value="flexivel">Flexível (Airbnb)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Modo de cadastro
              </label>
              <select
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2"
                value={formData.modo_entrada}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    modo_entrada: e.target.value as 'detalhado' | 'reduzido',
                  })
                }
              >
                <option value="reduzido">Reduzido (totais mensais: longa + short)</option>
                <option value="detalhado">Detalhado (lançamentos por categoria)</option>
              </select>
            </div>
            <div className="flex space-x-3 pt-4">
              <Button type="submit" variant="secondary" className="flex-1">
                {editingProperty ? 'Salvar' : 'Criar'}
              </Button>
              <Button
                type="button"
                variant="tertiary"
                onClick={handleCloseModal}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Modal>

        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal((m) => ({ ...m, isOpen: false }))}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
          variant="danger"
        />
      </div>
    </Layout>
  );
}
