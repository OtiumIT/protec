import { useState, useEffect } from 'react';
import { Layout } from '../../../shared/components/layout/Layout';
import { Card } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { Modal } from '../../../shared/components/ui/Modal';
import { useToast } from '../../../shared/components/ui/Toast';
import { companyService } from '../services/company.service';
import { subscriptionService } from '../../system/services/subscription.service';
import { planService } from '../../plans/services/plan.service';
import type { Module, ActiveModule } from '../../modules/services/module.service';
import apiRequest from '../../../shared/services/api';
import type { Company } from '@shared/core';

interface TenantWithPlan extends Company {
  plan?: {
    id: string;
    name: string;
    isCustom?: boolean;
    isManaged?: boolean;
  };
}

export function Tenants() {
  const { success, error: showError, ToastContainer } = useToast();
  const [tenants, setTenants] = useState<TenantWithPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModulesModalOpen, setIsModulesModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Company | null>(null);
  const [editingTenant, setEditingTenant] = useState<Company | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableModules, setAvailableModules] = useState<Module[]>([]);
  const [activeModules, setActiveModules] = useState<ActiveModule[]>([]);
  const [isLoadingModules, setIsLoadingModules] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);

  const [formData, setFormData] = useState<any>({
    name: '',
    cnpj: '',
    email: '',
    legal_name: '',
    trade_name: '',
    phone: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    tax_regime: '',
    state_registration: '',
    municipal_registration: '',
    cnae: '',
    zip_code: '',
    address_street: '',
    address_number: '',
    address_complement: '',
    address_neighborhood: '',
    address_city: '',
    address_state: '',
    notes: '',
    planId: '',
  });

  useEffect(() => {
    loadTenants();
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const plans = await planService.list();
      setAvailablePlans(plans);
    } catch (error) {
      console.error('Error loading plans:', error);
    }
  };

  const loadTenants = async () => {
    setIsLoading(true);
    try {
      // Usar rota /clients que retorna empresas quando for super_admin
      const token = localStorage.getItem('accessToken');
      const response = await apiRequest<{ data: { clients: any[] } }>('/api/v1/clients', {
        method: 'GET',
        token: token || undefined,
      });
      
      // Buscar plano de cada tenant
      const tenantsWithPlans = await Promise.all(
        (response.data.clients || []).map(async (tenant: any) => {
          try {
            const subscriptionResponse = await subscriptionService.getByCompany(tenant.id);
            return {
              ...tenant,
              plan: subscriptionResponse?.plan || null,
            };
          } catch (error: any) {
            // Se não encontrar subscription, retornar sem plano
            if (error.message?.includes('SUBSCRIPTION_NOT_FOUND') || error.message?.includes('404')) {
              return { ...tenant, plan: null };
            }
            return { ...tenant, plan: null };
          }
        })
      );
      
      setTenants(tenantsWithPlans);
    } catch (error) {
      console.error('Error loading tenants:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = async (tenant?: Company) => {
    if (tenant) {
      setEditingTenant(tenant);
      
      // Buscar plano atual do tenant
      let currentPlanId = '';
      try {
        const subscription = await subscriptionService.getByCompany(tenant.id);
        if (subscription) {
          currentPlanId = subscription.plan_id;
        }
      } catch (error) {
        // Tenant sem plano ainda
      }
      
      setFormData({
        name: tenant.name || '',
        cnpj: tenant.cnpj || '',
        email: tenant.email || '',
        legal_name: tenant.legal_name || '',
        trade_name: tenant.trade_name || '',
        phone: tenant.phone || '',
        contact_name: tenant.contact_name || '',
        contact_email: tenant.contact_email || '',
        contact_phone: tenant.contact_phone || '',
        tax_regime: tenant.tax_regime || '',
        state_registration: tenant.state_registration || '',
        municipal_registration: tenant.municipal_registration || '',
        cnae: tenant.cnae || '',
        zip_code: tenant.zip_code || '',
        address_street: tenant.address_street || '',
        address_number: tenant.address_number || '',
        address_complement: tenant.address_complement || '',
        address_neighborhood: tenant.address_neighborhood || '',
        address_city: tenant.address_city || '',
        address_state: tenant.address_state || '',
        notes: tenant.notes || '',
        planId: currentPlanId,
      });
    } else {
      setEditingTenant(null);
      setFormData({
        name: '', cnpj: '', email: '', legal_name: '', trade_name: '', phone: '',
        contact_name: '', contact_email: '', contact_phone: '', tax_regime: '',
        state_registration: '', municipal_registration: '', cnae: '',
        zip_code: '', address_street: '', address_number: '', address_complement: '',
        address_neighborhood: '', address_city: '', address_state: '', notes: '',
        planId: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTenant(null);
    setFormData({
      name: '', cnpj: '', email: '', legal_name: '', trade_name: '', phone: '',
      contact_name: '', contact_email: '', contact_phone: '', tax_regime: '',
      state_registration: '', municipal_registration: '', cnae: '',
      zip_code: '', address_street: '', address_number: '', address_complement: '',
      address_neighborhood: '', address_city: '', address_state: '', notes: '',
      planId: '',
    });
  };

  const handleOpenModulesModal = async (tenant: Company) => {
    setSelectedTenant(tenant);
    setIsModulesModalOpen(true);
    await loadModulesForTenant(tenant.id);
  };

  const handleCloseModulesModal = () => {
    setIsModulesModalOpen(false);
    setSelectedTenant(null);
    setAvailableModules([]);
    setActiveModules([]);
  };

  const loadModulesForTenant = async (companyId: string) => {
    setIsLoadingModules(true);
    try {
      const token = localStorage.getItem('accessToken');
      
      // Buscar módulos disponíveis
      const availableResponse = await apiRequest<{ data: { modules: Module[] } }>(
        '/api/v1/modules',
        {
          method: 'GET',
          token: token || undefined,
        }
      );
      
      // Buscar módulos ativos do tenant
      const activeResponse = await apiRequest<{ data: { modules: ActiveModule[] } }>(
        `/api/v1/modules/admin/active?companyId=${companyId}`,
        {
          method: 'GET',
          token: token || undefined,
        }
      );
      
      setAvailableModules(availableResponse.data.modules);
      setActiveModules(activeResponse.data.modules);
    } catch (error) {
      console.error('Error loading modules:', error);
    } finally {
      setIsLoadingModules(false);
    }
  };

  const handleToggleModule = async (module: Module) => {
    if (!selectedTenant) return;
    
    const isActive = activeModules.some((m) => m.id === module.id);
    const token = localStorage.getItem('accessToken');
    
    try {
      if (isActive) {
        await apiRequest(
          `/api/v1/modules/admin/${module.id}/deactivate?companyId=${selectedTenant.id}`,
          {
            method: 'POST',
            token: token || undefined,
          }
        );
      } else {
        await apiRequest(
          `/api/v1/modules/admin/${module.id}/activate?companyId=${selectedTenant.id}`,
          {
            method: 'POST',
            body: JSON.stringify({ moduleId: module.id }),
            token: token || undefined,
          }
        );
      }
      await loadModulesForTenant(selectedTenant.id);
    } catch (error) {
      console.error('Error toggling module:', error);
        showError('Erro ao alterar status do módulo');
    }
  };

  const handleOpenPlanModal = (tenant: Company) => {
    setSelectedTenant(tenant);
    // Buscar plano atual do tenant
    subscriptionService.getByCompany(tenant.id).then((sub) => {
      if (sub) {
        setSelectedPlanId(sub.plan_id);
      }
    }).catch(() => {
      setSelectedPlanId('');
    });
    setIsPlanModalOpen(true);
  };

  const handleClosePlanModal = () => {
    setIsPlanModalOpen(false);
    setSelectedTenant(null);
    setSelectedPlanId('');
  };

  const handleAssignPlan = async () => {
    if (!selectedTenant || !selectedPlanId) return;
    
    // Proteção contra duplo clique
    if (isSubmitting) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      
      // Verificar se já existe subscription
      const existing = await subscriptionService.getByCompany(selectedTenant.id);
      
      if (existing) {
        // Atualizar subscription existente
        await apiRequest(
          `/api/v1/subscriptions/admin?companyId=${selectedTenant.id}`,
          {
            method: 'PUT',
            body: JSON.stringify({ planId: selectedPlanId }),
            token: token || undefined,
          }
        );
      } else {
        // Criar nova subscription
        await apiRequest(
          `/api/v1/subscriptions/admin?companyId=${selectedTenant.id}`,
          {
            method: 'POST',
            body: JSON.stringify({ planId: selectedPlanId }),
            token: token || undefined,
          }
        );
      }
      
      success('Plano associado com sucesso!');
      handleClosePlanModal();
      loadTenants();
    } catch (error: any) {
      console.error('Error assigning plan:', error);
      showError(error.message || 'Erro ao associar plano');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Proteção contra duplo clique
    if (isSubmitting) {
      return;
    }
    
    if (!formData.planId) {
      showError('Por favor, selecione um plano para o cliente.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const dataToSend: any = {
        name: formData.name,
        email: formData.email,
        cnpj: formData.cnpj || undefined,
        legal_name: formData.legal_name || undefined,
        trade_name: formData.trade_name || undefined,
        phone: formData.phone || undefined,
        contact_name: formData.contact_name || undefined,
        contact_email: formData.contact_email || undefined,
        contact_phone: formData.contact_phone || undefined,
        tax_regime: formData.tax_regime || undefined,
        state_registration: formData.state_registration || undefined,
        municipal_registration: formData.municipal_registration || undefined,
        cnae: formData.cnae || undefined,
        zip_code: formData.zip_code || undefined,
        address_street: formData.address_street || undefined,
        address_number: formData.address_number || undefined,
        address_complement: formData.address_complement || undefined,
        address_neighborhood: formData.address_neighborhood || undefined,
        address_city: formData.address_city || undefined,
        address_state: formData.address_state || undefined,
        notes: formData.notes || undefined,
      };

      const token = localStorage.getItem('accessToken');
      let companyId: string;
      
      if (editingTenant) {
        // Atualizar empresa
        await companyService.update(editingTenant.id, dataToSend);
        companyId = editingTenant.id;
      } else {
        // Criar via rota /clients que cria empresa e schema automaticamente
        const response = await apiRequest<{ data: { client: any } }>('/api/v1/clients', {
          method: 'POST',
          body: JSON.stringify(dataToSend),
          token: token || undefined,
        });
        companyId = response.data.client.id;
        success('Empresa criada com sucesso! O schema do tenant foi criado automaticamente.');
      }

      // Associar plano (criar ou atualizar subscription)
      try {
        const existing = await subscriptionService.getByCompany(companyId);
        if (existing) {
          // Atualizar subscription existente
          await apiRequest(
            `/api/v1/subscriptions/admin?companyId=${companyId}`,
            {
              method: 'PUT',
              body: JSON.stringify({ planId: formData.planId }),
              token: token || undefined,
            }
          );
        } else {
          // Criar nova subscription
          await apiRequest(
            `/api/v1/subscriptions/admin?companyId=${companyId}`,
            {
              method: 'POST',
              body: JSON.stringify({ planId: formData.planId }),
              token: token || undefined,
            }
          );
        }
      } catch (subError: any) {
        console.error('Error assigning plan:', subError);
        showError('Empresa salva, mas houve erro ao associar o plano. Você pode associar manualmente depois.');
      }

      handleCloseModal();
      loadTenants();
    } catch (error: any) {
      console.error('Error saving tenant:', error);
      showError(error.message || 'Erro ao salvar empresa');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTenants = tenants.filter((tenant) => {
    const matchesSearch =
      tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tenant.cnpj && tenant.cnpj.includes(searchTerm)) ||
      (tenant.domain && tenant.domain.includes(searchTerm));
    return matchesSearch;
  });

  return (
    <Layout>
      <ToastContainer />
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Gestão de Clientes</h1>
          <Button variant="secondary" onClick={() => handleOpenModal()}>
            Nova Empresa
          </Button>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Buscar por nome, CNPJ ou domínio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Button
              variant="primary"
              className="w-full md:w-auto"
              onClick={() => setSearchTerm('')}
            >
              Limpar Filtros
            </Button>
          </div>
        </Card>

        {/* Tenants List */}
        <Card>
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">Carregando...</div>
          ) : filteredTenants.length === 0 ? (
            <div className="text-center py-8 text-slate-500">Nenhuma empresa encontrada</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Nome</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Plano</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">CNPJ</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Domínio</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Data</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTenants.map((tenant) => (
                    <tr key={tenant.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-900">{tenant.name}</span>
                      </td>
                      <td className="py-3 px-4">
                        {tenant.plan ? (
                          <Badge variant={tenant.plan.isCustom ? 'info' : 'success'}>
                            {tenant.plan.name}
                            {tenant.plan.isCustom && ' (Customizado)'}
                          </Badge>
                        ) : (
                          <span className="text-sm text-slate-500">Sem plano</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">{tenant.cnpj || '-'}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{tenant.domain || '-'}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{tenant.email || '-'}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {new Date(tenant.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end space-x-2">
                          {tenant.plan?.isCustom && (
                            <button
                              onClick={() => handleOpenModulesModal(tenant)}
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                              Módulos
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenPlanModal(tenant)}
                            className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                          >
                            Plano
                          </button>
                          <button
                            onClick={() => handleOpenModal(tenant)}
                            className="text-brand hover:text-brand-dark text-sm font-medium"
                          >
                            Editar
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
          title={editingTenant ? 'Editar Empresa' : 'Nova Empresa (Tenant)'}
        >
          <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
            <p className="text-sm text-slate-600 mb-4">
              Ao criar uma nova empresa, o schema do tenant será criado automaticamente.
            </p>

            {/* Seleção de Plano */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Plano</h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Plano <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  value={formData.planId}
                  onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
                  required
                >
                  <option value="">Selecione um plano...</option>
                  {availablePlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} {plan.isCustom ? '(Customizado - Negociado)' : `- R$ ${Number(plan.price || 0).toFixed(2)}/mês`}
                    </option>
                  ))}
                </select>
                {formData.planId && (() => {
                  const selectedPlan = availablePlans.find((p) => p.id === formData.planId);
                  if (!selectedPlan) return null;
                  
                  return (
                    <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-sm font-semibold text-slate-900">
                        {selectedPlan.name}
                        {selectedPlan.isCustom && (
                          <Badge variant="info" className="ml-2 text-xs">Customizado</Badge>
                        )}
                      </p>
                      {selectedPlan.isCustom ? (
                        <p className="text-xs text-slate-600 mt-1">
                          Módulos podem ser gerenciados individualmente. Cobrança negociada separadamente.
                        </p>
                      ) : (
                        <p className="text-xs text-slate-600 mt-1">
                          Preço: R$ {Number(selectedPlan.price || 0).toFixed(2)}/mês • 
                          Até {selectedPlan.maxUsers} usuários
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Dados Básicos */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Dados Básicos</h3>
              <Input
                label="Nome / Nome Fantasia"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <Input
                label="Razão Social"
                value={formData.legal_name}
                onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
              />
              <Input
                label="CNPJ"
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                placeholder="00.000.000/0000-00"
              />
              <Input
                label="Email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <Input
                label="Telefone"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>

            {/* Dados Fiscais */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Dados Fiscais</h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Regime Tributário
                </label>
                <select
                  className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  value={formData.tax_regime || ''}
                  onChange={(e) => setFormData({ ...formData, tax_regime: e.target.value })}
                >
                  <option value="">Selecione...</option>
                  <option value="simples_nacional">Simples Nacional</option>
                  <option value="lucro_presumido">Lucro Presumido</option>
                  <option value="lucro_real">Lucro Real</option>
                  <option value="outros">Outros</option>
                </select>
              </div>
              <Input
                label="Inscrição Estadual"
                value={formData.state_registration || ''}
                onChange={(e) => setFormData({ ...formData, state_registration: e.target.value })}
              />
              <Input
                label="Inscrição Municipal"
                value={formData.municipal_registration || ''}
                onChange={(e) => setFormData({ ...formData, municipal_registration: e.target.value })}
              />
              <Input
                label="CNAE Principal"
                value={formData.cnae || ''}
                onChange={(e) => setFormData({ ...formData, cnae: e.target.value })}
                placeholder="0000-0/00"
              />
            </div>

            {/* Endereço */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Endereço</h3>
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="CEP"
                  value={formData.zip_code || ''}
                  onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                  placeholder="00000-000"
                  className="col-span-1"
                />
                <Input
                  label="Rua"
                  value={formData.address_street || ''}
                  onChange={(e) => setFormData({ ...formData, address_street: e.target.value })}
                  className="col-span-2"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Número"
                  value={formData.address_number || ''}
                  onChange={(e) => setFormData({ ...formData, address_number: e.target.value })}
                  className="col-span-1"
                />
                <Input
                  label="Complemento"
                  value={formData.address_complement || ''}
                  onChange={(e) => setFormData({ ...formData, address_complement: e.target.value })}
                  className="col-span-2"
                />
              </div>
              <Input
                label="Bairro"
                value={formData.address_neighborhood || ''}
                onChange={(e) => setFormData({ ...formData, address_neighborhood: e.target.value })}
              />
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Cidade"
                  value={formData.address_city || ''}
                  onChange={(e) => setFormData({ ...formData, address_city: e.target.value })}
                  className="col-span-2"
                />
                <Input
                  label="UF"
                  value={formData.address_state || ''}
                  onChange={(e) => setFormData({ ...formData, address_state: e.target.value.toUpperCase() })}
                  maxLength={2}
                  placeholder="SP"
                  className="col-span-1"
                />
              </div>
            </div>

            {/* Contato */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Contato Responsável</h3>
              <Input
                label="Nome do Contato"
                value={formData.contact_name || ''}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
              />
              <Input
                label="Email do Contato"
                type="email"
                value={formData.contact_email || ''}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              />
              <Input
                label="Telefone do Contato"
                value={formData.contact_phone || ''}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>

            {/* Observações */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Observações</h3>
              <textarea
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 min-h-[100px]"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Observações adicionais..."
              />
            </div>

            <div className="flex space-x-3 pt-4 border-t">
              <Button 
                type="submit" 
                variant="secondary" 
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Salvando...' : (editingTenant ? 'Salvar Alterações' : 'Criar Empresa')}
              </Button>
              <Button type="button" variant="tertiary" onClick={handleCloseModal} className="flex-1">
                Cancelar
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modules Management Modal */}
        <Modal
          isOpen={isModulesModalOpen}
          onClose={handleCloseModulesModal}
          title={`Gerenciar Módulos - ${selectedTenant?.name || ''}`}
          size="lg"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600 mb-4">
              Gerencie os módulos ativos para este cliente com plano customizado.
            </p>

            {isLoadingModules ? (
              <div className="text-center py-8 text-slate-500">Carregando módulos...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">
                {availableModules.map((module) => {
                  const isActive = activeModules.some((m) => m.id === module.id);
                  return (
                    <Card key={module.id} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900">{module.name}</h4>
                          <p className="text-xs text-slate-500 mt-1">Key: {module.key}</p>
                          {module.description && (
                            <p className="text-sm text-slate-600 mt-2">{module.description}</p>
                          )}
                        </div>
                        <Badge variant={isActive ? 'success' : 'default'}>
                          {isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      <Button
                        variant={isActive ? 'secondary' : 'primary'}
                        onClick={() => handleToggleModule(module)}
                        className="w-full mt-3"
                        size="sm"
                      >
                        {isActive ? 'Desativar' : 'Ativar'}
                      </Button>
                    </Card>
                  );
                })}
              </div>
            )}

            {!isLoadingModules && availableModules.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                Nenhum módulo disponível no sistema.
              </div>
            )}

            <div className="flex space-x-3 pt-4 border-t">
              <Button
                variant="tertiary"
                onClick={handleCloseModulesModal}
                className="flex-1"
              >
                Fechar
              </Button>
            </div>
          </div>
        </Modal>

        {/* Plan Assignment Modal */}
        <Modal
          isOpen={isPlanModalOpen}
          onClose={handleClosePlanModal}
          title={`Associar Plano - ${selectedTenant?.name || ''}`}
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600 mb-4">
              Selecione o plano para este cliente. Planos customizados permitem gerenciar módulos individualmente.
            </p>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Plano
              </label>
              <select
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
              >
                <option value="">Selecione um plano...</option>
                {availablePlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} {plan.isCustom ? '(Customizado)' : `- R$ ${Number(plan.price || 0).toFixed(2)}/mês`}
                  </option>
                ))}
              </select>
            </div>

            {selectedPlanId && (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                {(() => {
                  const selectedPlan = availablePlans.find((p) => p.id === selectedPlanId);
                  if (!selectedPlan) return null;
                  
                  return (
                    <div>
                      <p className="text-sm font-semibold text-slate-900 mb-2">
                        {selectedPlan.name}
                        {selectedPlan.isCustom && (
                          <Badge variant="info" className="ml-2">Customizado</Badge>
                        )}
                      </p>
                      {selectedPlan.isCustom ? (
                        <p className="text-sm text-slate-600">
                          Módulos podem ser gerenciados individualmente. Cobrança negociada separadamente.
                        </p>
                      ) : (
                        <p className="text-sm text-slate-600">
                          Preço: R$ {Number(selectedPlan.price || 0).toFixed(2)}/mês • 
                          Até {selectedPlan.maxUsers} usuários
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="flex space-x-3 pt-4 border-t">
              <Button
                variant="secondary"
                onClick={handleAssignPlan}
                className="flex-1"
                disabled={!selectedPlanId || isSubmitting}
              >
                {isSubmitting ? 'Associando...' : 'Associar Plano'}
              </Button>
              <Button
                variant="tertiary"
                onClick={handleClosePlanModal}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
}
