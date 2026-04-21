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
  const [, setIsLoading] = useState(true);
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
      const rows = await companyService.listWithSubscriptions();
      setTenants(
        rows.map((row) => ({
          ...row,
          plan: row.plan ?? null,
        })) as TenantWithPlan[]
      );
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
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-6">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Base de Entidades</h1>
              <p className="text-slate-500 text-sm font-medium mt-1">
                Monitoramento e gestão administrativa de todos os escritórios e tenants ativos no sistema
              </p>
            </div>
            <Button onClick={() => handleOpenModal()}>
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Nova Entidade
            </Button>
          </div>

        <div className="mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 w-full">
              <Input
                placeholder="Localizar por Nome, CNPJ ou Domínio de acesso..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="!py-3"
              />
            </div>
            <Button
              variant="secondary"
              onClick={() => setSearchTerm('')}
            >
              Limpar Filtros
            </Button>
          </div>
        </div>
      </div>

        {/* Tenants List */}
        <Card>
            <div className="overflow-x-auto -mx-6">
              <table className="table-gov border-t border-slate-100">
                <thead>
                  <tr>
                    <th className="pl-6">Entidade Corporativa</th>
                    <th>Subscrição</th>
                    <th>CNPJ / Documento</th>
                    <th>Atividade de Email</th>
                    <th>Registro em</th>
                    <th className="text-right pr-6">Ações Estratégicas</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTenants.map((tenant) => (
                    <tr key={tenant.id} className="group transition-colors">
                      <td className="py-5 pl-6">
                        <span className="font-bold text-slate-800 tracking-tight group-hover:text-[#1351b4] transition-colors">{tenant.name}</span>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{tenant.domain || 'Nenhum domínio associado'}</p>
                      </td>
                      <td>
                        {tenant.plan ? (
                          <Badge variant={tenant.plan.isCustom ? 'info' : 'success'}>
                            {tenant.plan.name}
                            {tenant.plan.isCustom && ' (Negociado)'}
                          </Badge>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-400 uppercase">Sem Plano Ativo</span>
                        )}
                      </td>
                      <td><span className="text-[11px] font-bold text-slate-600">{tenant.cnpj || '-'}</span></td>
                      <td><span className="text-xs font-medium text-slate-500">{tenant.email || '-'}</span></td>
                      <td>
                        <span className="text-[11px] font-bold text-slate-500">
                          {new Date(tenant.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </td>
                      <td className="pr-6">
                        <div className="flex items-center justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                          {tenant.plan?.isCustom && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleOpenModulesModal(tenant)}
                              className="text-indigo-600 hover:bg-indigo-50 border-transparent !p-2"
                              title="Módulos"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                              </svg>
                            </Button>
                          )}
                          <Button 
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenPlanModal(tenant)}
                            className="text-emerald-600 hover:bg-emerald-50 border-transparent !p-2"
                            title="Plano"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenModal(tenant)}
                            className="text-[#1351b4] hover:bg-blue-50 border-transparent !p-2"
                            title="Editar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
