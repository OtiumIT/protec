import { useState, useEffect } from 'react';
import { Layout } from '../../../shared/components/layout/Layout';
import { Card } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { MoneyInput } from '../../../shared/components/ui/MoneyInput';
import { Modal } from '../../../shared/components/ui/Modal';
import { ConfirmModal } from '../../../shared/components/ui/ConfirmModal';
import { useToast } from '../../../shared/components/ui/Toast';
import {
  planService,
  type Plan,
  type CreatePlanData,
} from '../services/plan.service';

export function Plans() {
  const { success: showSuccess, error: showError, ToastContainer } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
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

  const [formData, setFormData] = useState<CreatePlanData & { status?: 'active' | 'inactive' }>({
    name: '',
    maxUsers: 1,
    maxClients: 0,
    price: 0,
    billingCycle: 'monthly',
    features: [],
    stripePriceId: null,
  });

  const [featureInput, setFeatureInput] = useState('');

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setIsLoading(true);
    try {
      // Gestão: usar listAdmin para ver todos os planos (incl. inativos); fallback para list público
      try {
        const data = await planService.listAdmin();
        setPlans(data);
      } catch (adminError: any) {
        if (adminError?.message?.includes('403') || adminError?.message?.includes('Forbidden')) {
          const data = await planService.list();
          setPlans(data);
        } else {
          throw adminError;
        }
      }
    } catch (error) {
      console.error('Error loading plans:', error);
      showError('Erro ao carregar planos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (plan?: Plan) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        name: plan.name,
        maxUsers: plan.maxUsers,
        maxClients: plan.maxClients ?? 0,
        price: plan.price,
        billingCycle: plan.billingCycle,
        features: plan.features,
        status: plan.status === 'inactive' ? 'inactive' : 'active',
        stripePriceId: plan.stripePriceId ?? null,
      });
    } else {
      setEditingPlan(null);
      setFormData({ name: '', maxUsers: 1, maxClients: 0, price: 0, billingCycle: 'monthly', features: [], stripePriceId: null });
    }
    setFeatureInput('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPlan(null);
    setFormData({ name: '', maxUsers: 1, maxClients: 0, price: 0, billingCycle: 'monthly', features: [], stripePriceId: null });
    setFeatureInput('');
    setIsSubmitting(false);
  };

  const handleAddFeature = () => {
    if (featureInput.trim()) {
      setFormData({
        ...formData,
        features: [...formData.features, featureInput.trim()],
      });
      setFeatureInput('');
    }
  };

  const handleRemoveFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (editingPlan) {
        await planService.update(editingPlan.id, formData);
        showSuccess('Plano atualizado com sucesso');
      } else {
        await planService.create(formData);
        showSuccess('Plano criado com sucesso');
      }
      handleCloseModal();
      loadPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
      showError('Erro ao salvar plano');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirmar exclusão',
      message: 'Tem certeza que deseja excluir este plano? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          await planService.delete(id);
          showSuccess('Plano excluído');
          loadPlans();
        } catch (error) {
          console.error('Error deleting plan:', error);
          showError('Erro ao excluir plano');
        }
      },
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Layout>
      <ToastContainer />
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Gestão de Planos</h1>
          <Button variant="secondary" onClick={() => handleOpenModal()}>
            Novo Plano
          </Button>
        </div>

        {/* Plans Grid */}
        {isLoading ? (
          <div className="text-center py-8 text-slate-500">Carregando...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className="relative">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                  <div className="flex items-center space-x-2">
                    {plan.isCustom && (
                      <Badge variant="info">Customizado</Badge>
                    )}
                    {plan.status === 'inactive' ? (
                      <Badge variant="default">Inativo</Badge>
                    ) : (
                      <Badge variant="success">Ativo</Badge>
                    )}
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline space-x-2 mb-2">
                    <span className="text-3xl font-bold text-slate-900">
                      {plan.isCustom ? 'Negociado' : formatCurrency(plan.price)}
                    </span>
                    {!plan.isCustom && (
                      <span className="text-sm text-slate-500">/mês</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">
                    {plan.isCustom
                      ? 'Módulos gerenciados individualmente'
                      : [
                          `Até ${plan.maxUsers} usuário${plan.maxUsers > 1 ? 's' : ''}`,
                          ((plan.maxClients ?? 0) > 0 ? ` · Até ${plan.maxClients ?? 0} cliente${(plan.maxClients ?? 0) > 1 ? 's' : ''}` : ' · Clientes ilimitados'),
                        ].join('')
                    }
                  </p>
                  {plan.stripePriceId && (
                    <p className="text-xs text-slate-400 mt-1 font-mono truncate" title={plan.stripePriceId}>
                      Stripe: {plan.stripePriceId}
                    </p>
                  )}
                </div>

                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-slate-900 mb-3">Recursos:</h4>
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <svg
                          className="w-5 h-5 text-brand flex-shrink-0 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span className="text-sm text-slate-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex space-x-2">
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={() => handleOpenModal(plan)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="tertiary"
                    className="flex-1"
                    onClick={() => handleDelete(plan.id)}
                  >
                    Excluir
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={editingPlan ? 'Editar Plano' : 'Novo Plano'}
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nome do Plano"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Máximo de Usuários
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxUsers}
                  onChange={(e) =>
                    setFormData({ ...formData, maxUsers: parseInt(e.target.value) || 1 })
                  }
                  className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Máximo de Clientes
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.maxClients ?? 0}
                  onChange={(e) =>
                    setFormData({ ...formData, maxClients: Math.max(0, parseInt(e.target.value) || 0) })
                  }
                  className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  placeholder="0 = ilimitado"
                />
              </div>
              <div>
                <MoneyInput
                  label="Preço"
                  value={formData.price}
                  onChange={(value) => setFormData({ ...formData, price: value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Ciclo de Cobrança
                </label>
                <select
                  className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  value={formData.billingCycle}
                  onChange={(e) =>
                    setFormData({ ...formData, billingCycle: e.target.value as 'monthly' | 'yearly' })
                  }
                  required
                >
                  <option value="monthly">Mensal</option>
                  <option value="yearly">Anual</option>
                </select>
              </div>
              {editingPlan && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                  <select
                    className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                    value={formData.status ?? 'active'}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })
                    }
                  >
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </div>
              )}
            </div>
            <Input
              label="Stripe Price ID (opcional)"
              placeholder="price_1ABC... (deixe vazio para plano gratuito)"
              value={formData.stripePriceId ?? ''}
              onChange={(e) => setFormData({ ...formData, stripePriceId: e.target.value.trim() || null })}
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Recursos</label>
              <div className="flex space-x-2 mb-2">
                <Input
                  placeholder="Adicionar recurso..."
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddFeature();
                    }
                  }}
                />
                <Button type="button" variant="secondary" onClick={handleAddFeature}>
                  Adicionar
                </Button>
              </div>
              <div className="space-y-2">
                {formData.features.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"
                  >
                    <span className="text-sm text-slate-700">{feature}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFeature(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex space-x-3 pt-4">
              <Button
                type="submit"
                variant="secondary"
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Salvando...' : editingPlan ? 'Salvar Alterações' : 'Criar Plano'}
              </Button>
              <Button
                type="button"
                variant="tertiary"
                onClick={handleCloseModal}
                className="flex-1"
                disabled={isSubmitting}
              >
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
