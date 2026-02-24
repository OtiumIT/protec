import { useState, useEffect, useRef, useCallback } from 'react';
import { Layout } from '../../../shared/components/layout/Layout';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { useToast } from '../../../shared/components/ui/Toast';
import { moduleService, type Module, type ActiveModule } from '../services/module.service';
import { planService, type Plan } from '../../plans/services/plan.service';
import { companyService } from '../../companies/services/company.service';
import type { Company } from '@shared/core';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { TenantSelector } from '../../../shared/components/ui/TenantSelector';
import apiRequest from '../../../shared/services/api';

type Tab = 'by-plan' | 'by-tenant';

export function Modules() {
  const { user, isLoading: authLoading } = useAuth();
  const { success, error: showError, ToastContainer } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('by-plan');
  
  // Dados gerais
  const [availableModules, setAvailableModules] = useState<Module[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [tenants, setTenants] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Aba "Por Plano"
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [planModules, setPlanModules] = useState<(Module & { is_default: boolean })[]>([]);
  const [isLoadingPlanModules, setIsLoadingPlanModules] = useState(false);
  const [isTogglingPlanModule, setIsTogglingPlanModule] = useState<string | null>(null);
  
  // Aba "Por Tenant"
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [tenantActiveModules, setTenantActiveModules] = useState<ActiveModule[]>([]);
  const [isLoadingTenantModules, setIsLoadingTenantModules] = useState(false);
  const [isTogglingTenantModule, setIsTogglingTenantModule] = useState<string | null>(null);

  // Refs para evitar loops infinitos
  const tenantInitializedRef = useRef(false);
  const loadingTenantModulesRef = useRef(false);
  const lastLoadedTenantIdRef = useRef<string>('');

  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin' || isSuperAdmin;

  // Definir loadTenantModules antes de usar nos useEffects
  // Removido showError das dependências para evitar recriação desnecessária
  const loadTenantModules = useCallback(async (tenantId: string) => {
    if (!tenantId) {
      setTenantActiveModules([]);
      return;
    }
    
    // Evitar chamadas simultâneas ou duplicadas
    if (loadingTenantModulesRef.current) return;
    if (lastLoadedTenantIdRef.current === tenantId) return; // Já carregou este tenant
    
    loadingTenantModulesRef.current = true;
    setIsLoadingTenantModules(true);
    
    try {
      // Para super_admin, usar endpoint admin
      if (isSuperAdmin) {
        const token = localStorage.getItem('accessToken');
        const tenantIdValue: string | undefined = tenantId === null ? undefined : tenantId;
        const response = await apiRequest<{ data: { modules: ActiveModule[] } }>(
          `/api/v1/modules/admin/active?companyId=${tenantId}`,
          { token: token || undefined, tenantId: tenantIdValue }
        );
        setTenantActiveModules(response.data.modules || []);
      } else {
        // Admin de tenant usa endpoint normal
        const modules = await moduleService.listActive();
        setTenantActiveModules(modules);
      }
      lastLoadedTenantIdRef.current = tenantId; // Marcar como carregado
    } catch (error: any) {
      console.error('Error loading tenant modules:', error);
      // Se o erro for sobre tabela não existir, mostrar mensagem mais clara
      if (error?.message?.includes('tenant_modules') || error?.message?.includes('does not exist')) {
        showError('Tabela tenant_modules não encontrada. Execute as migrations do banco de dados.');
      } else {
        showError('Erro ao carregar módulos do tenant');
      }
      setTenantActiveModules([]);
    } finally {
      setIsLoadingTenantModules(false);
      loadingTenantModulesRef.current = false;
    }
  }, [isSuperAdmin]); // Removido showError e selectedTenantId das dependências

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [modulesData, plansData, tenantsData] = await Promise.all([
        moduleService.listAvailable(),
        isSuperAdmin ? planService.list() : Promise.resolve([]),
        isSuperAdmin ? companyService.list() : Promise.resolve([]),
      ]);
      
      setAvailableModules(modulesData);
      setPlans(plansData);
      setTenants(tenantsData);
    } catch (error) {
      console.error('Error loading data:', error);
      showError('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPlanModules = async () => {
    if (!selectedPlanId) return;
    setIsLoadingPlanModules(true);
    try {
      const modules = await moduleService.getModulesByPlan(selectedPlanId);
      setPlanModules(modules);
    } catch (error) {
      console.error('Error loading plan modules:', error);
      showError('Erro ao carregar módulos do plano');
    } finally {
      setIsLoadingPlanModules(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) {
      setIsLoading(false);
      return;
    }
    loadData();
  }, [authLoading, isAdmin]);

  useEffect(() => {
    if (selectedPlanId && isSuperAdmin) {
      loadPlanModules();
    }
  }, [selectedPlanId, isSuperAdmin]);

  // Inicializar tenantId para admin de tenant apenas uma vez
  useEffect(() => {
    if (!isSuperAdmin && (user?.tenant_id ?? user?.company_id) && !tenantInitializedRef.current) {
      const companyId = (user?.tenant_id ?? user?.company_id) || '';
      setSelectedTenantId(companyId);
      tenantInitializedRef.current = true;
    }
  }, [isSuperAdmin, user?.tenant_id, user?.company_id]);

  // Carregar módulos do tenant quando selectedTenantId mudar
  useEffect(() => {
    if (!selectedTenantId) {
      setTenantActiveModules([]);
      lastLoadedTenantIdRef.current = '';
      return;
    }
    
    // Só carregar se o tenant realmente mudou
    if (lastLoadedTenantIdRef.current === selectedTenantId) return;
    if (loadingTenantModulesRef.current) return; // Evitar chamadas simultâneas
    
    // Chamar diretamente sem depender de loadTenantModules
    loadTenantModules(selectedTenantId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenantId]); // Removido loadTenantModules das dependências

  const handleTogglePlanModule = async (module: Module) => {
    if (!selectedPlanId) return;
    setIsTogglingPlanModule(module.id);
    
    try {
      const isInPlan = planModules.some((m) => m.id === module.id);
      
      if (isInPlan) {
        await moduleService.removeModuleFromPlan(selectedPlanId, module.id);
        success('Módulo removido do plano');
      } else {
        await moduleService.addModuleToPlan(selectedPlanId, module.id, true);
        success('Módulo adicionado ao plano');
      }
      
      await loadPlanModules();
    } catch (error) {
      console.error('Error toggling plan module:', error);
      showError('Erro ao alterar módulo do plano');
    } finally {
      setIsTogglingPlanModule(null);
    }
  };

  const handleToggleTenantModule = async (module: Module) => {
    if (!selectedTenantId) return;
    setIsTogglingTenantModule(module.id);
    
    try {
      const isActive = tenantActiveModules.some((m) => m.id === module.id);
      const token = localStorage.getItem('accessToken');
      
      if (isActive) {
        if (isSuperAdmin) {
          await apiRequest<{ data: { success: boolean } }>(
            `/api/v1/modules/admin/${module.id}/deactivate?companyId=${selectedTenantId}`,
            {
              method: 'POST',
              token: token || undefined,
            }
          );
        } else {
          await moduleService.deactivate(module.id);
        }
        success('Módulo desativado para o tenant');
      } else {
        if (isSuperAdmin) {
          await apiRequest<{ data: { module: any } }>(
            `/api/v1/modules/admin/${module.id}/activate?companyId=${selectedTenantId}`,
            {
              method: 'POST',
              body: JSON.stringify({ moduleId: module.id }),
              token: token || undefined,
            }
          );
        } else {
          await moduleService.activate(module.id);
        }
        success('Módulo ativado para o tenant');
      }
      
      // Resetar ref para forçar recarregamento
      lastLoadedTenantIdRef.current = '';
      await loadTenantModules(selectedTenantId);
    } catch (error) {
      console.error('Error toggling tenant module:', error);
      showError('Erro ao alterar módulo do tenant');
    } finally {
      setIsTogglingTenantModule(null);
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Sem expiração';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (!isAdmin) {
    return (
      <Layout>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">Você não tem permissão para acessar esta página.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <ToastContainer />
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gerenciar Módulos</h1>
          <p className="text-slate-600 mt-2">
            {isSuperAdmin
              ? 'Configure módulos por plano ou ative módulos para tenants específicos'
              : 'Ative ou desative módulos para o seu tenant'}
          </p>
        </div>

        {/* Tabs */}
        {isSuperAdmin && (
          <div className="border-b border-slate-200">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('by-plan')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'by-plan'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                Por Plano
              </button>
              <button
                onClick={() => setActiveTab('by-tenant')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'by-tenant'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                Por Tenant
              </button>
            </nav>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'by-plan' && isSuperAdmin && (
          <div className="space-y-6">
            <Card>
              <h2 className="text-lg font-semibold mb-4">Configurar Módulos por Plano</h2>
              <p className="text-sm text-slate-600 mb-4">
                Selecione um plano para configurar quais módulos vêm incluídos por padrão.
                Quando um tenant assinar este plano, os módulos marcados como "padrão" serão ativados automaticamente.
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Selecione o Plano
                </label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                >
                  <option value="">Selecione um plano</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - {plan.price > 0 ? `R$ ${plan.price.toFixed(2)}` : 'Grátis'}
                    </option>
                  ))}
                </select>
              </div>

              {selectedPlanId && (
                <div className="mt-6">
                  {isLoadingPlanModules ? (
                    <p className="text-slate-500 text-center py-4">Carregando módulos do plano...</p>
                  ) : (
                    <div>
                      <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-slate-900 text-lg">
                              Módulos do Plano: {plans.find((p) => p.id === selectedPlanId)?.name}
                            </h3>
                            <p className="text-sm text-slate-600 mt-1">
                              {planModules.length} de {availableModules.length} módulos incluídos
                            </p>
                          </div>
                          <Badge className="bg-blue-100 text-blue-800 border border-blue-300 text-lg px-4 py-2">
                            {planModules.length} / {availableModules.length}
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {availableModules.length === 0 ? (
                        <p className="text-slate-500 text-center py-8 col-span-full">
                          Nenhum módulo disponível no sistema
                        </p>
                      ) : (
                        availableModules.map((module) => {
                          const isInPlan = planModules.some((m) => m.id === module.id);
                          const planModule = planModules.find((m) => m.id === module.id);
                          const isToggling = isTogglingPlanModule === module.id;

                          return (
                            <Card key={module.id} className="p-4 hover:shadow-lg transition-shadow">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-slate-900">{module.name}</h4>
                                  <p className="text-xs text-slate-500 mt-1">Key: {module.key}</p>
                                </div>
                                <Badge
                                  className={
                                    isInPlan
                                      ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                                      : 'bg-slate-100 text-slate-600 border border-slate-300'
                                  }
                                >
                                  {isInPlan ? 'Incluído' : 'Não incluído'}
                                </Badge>
                              </div>

                              {module.description && (
                                <p className="text-sm text-slate-600 mb-3">{module.description}</p>
                              )}

                              {isInPlan && planModule?.is_default && (
                                <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                                  <strong>✓ Padrão:</strong> Ativado automaticamente quando tenant assina o plano
                                </div>
                              )}

                              <Button
                                variant={isInPlan ? 'secondary' : 'primary'}
                                size="sm"
                                onClick={() => handleTogglePlanModule(module)}
                                disabled={isToggling}
                                className="w-full"
                              >
                                {isToggling
                                  ? 'Processando...'
                                  : isInPlan
                                  ? 'Remover do Plano'
                                  : 'Adicionar ao Plano'}
                              </Button>
                            </Card>
                          );
                        })
                      )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'by-tenant' && (
          <div className="space-y-6">
            <Card>
              <h2 className="text-lg font-semibold mb-4">
                {isSuperAdmin ? 'Ativar Módulos para Tenant Específico' : 'Módulos do Meu Tenant'}
              </h2>
              <p className="text-sm text-slate-600 mb-4">
                {isSuperAdmin
                  ? 'Selecione um tenant para ativar ou desativar módulos manualmente. Esta configuração sobrescreve os módulos padrão do plano.'
                  : 'Ative ou desative módulos para o seu tenant. Apenas administradores podem gerenciar módulos.'}
              </p>

              {isSuperAdmin && (
                <div className="mb-4">
                  <TenantSelector
                    selectedTenantId={selectedTenantId || null}
                    onSelect={(id) => {
                      // Resetar ref quando selecionar novo tenant
                      lastLoadedTenantIdRef.current = '';
                      setSelectedTenantId(id);
                    }}
                    label="Selecione o Tenant"
                  />
                </div>
              )}

              {selectedTenantId && (
                <div className="mt-6">
                  {isLoadingTenantModules ? (
                    <p className="text-slate-500 text-center py-4">Carregando módulos do tenant...</p>
                  ) : (
                    <div>
                      <h3 className="font-semibold text-slate-700 mb-4">
                        Módulos do Tenant{' '}
                        {isSuperAdmin
                          ? tenants.find((t) => t.id === selectedTenantId)?.name || ''
                          : 'Atual'}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {availableModules.length === 0 ? (
                          <p className="text-slate-500 text-center py-8 col-span-full">
                            Nenhum módulo disponível no sistema
                          </p>
                        ) : (
                          availableModules.map((module) => {
                            const isActive = tenantActiveModules.some((m) => m.id === module.id);
                            const activeModule = tenantActiveModules.find((m) => m.id === module.id);
                            const isToggling = isTogglingTenantModule === module.id;

                            return (
                              <Card key={module.id} className="p-4 hover:shadow-lg transition-shadow">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-slate-900">{module.name}</h4>
                                    <p className="text-xs text-slate-500 mt-1">Key: {module.key}</p>
                                  </div>
                                  <Badge
                                    className={
                                      isActive
                                        ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                                        : 'bg-slate-100 text-slate-600 border border-slate-300'
                                    }
                                  >
                                    {isActive ? 'Ativo' : 'Inativo'}
                                  </Badge>
                                </div>

                                {module.description && (
                                  <p className="text-sm text-slate-600 mb-3">{module.description}</p>
                                )}

                                {isActive && activeModule?.enabled_until && (
                                  <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                                    <strong>Expira em:</strong> {formatDate(activeModule.enabled_until)}
                                  </div>
                                )}

                                {isActive && !activeModule?.enabled_until && (
                                  <div className="mb-3 p-2 bg-indigo-50 border border-indigo-200 rounded text-xs text-indigo-700">
                                    <strong>Status:</strong> Ativo permanentemente
                                  </div>
                                )}

                                <Button
                                  variant={isActive ? 'secondary' : 'primary'}
                                  size="sm"
                                  onClick={() => handleToggleTenantModule(module)}
                                  disabled={isToggling}
                                  className="w-full"
                                >
                                  {isToggling
                                    ? 'Processando...'
                                    : isActive
                                    ? 'Desativar Módulo'
                                    : 'Ativar Módulo'}
                                </Button>
                              </Card>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-12">
            <p className="text-slate-500">Carregando...</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
