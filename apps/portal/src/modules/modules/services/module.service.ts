import apiRequest from '../../../shared/services/api';

// Tipos
export interface Module {
  id: string;
  name: string;
  key: string;
  description?: string;
  created_at: string;
}

export interface ActiveModule extends Module {
  enabled_until?: string;
}

export interface ActivateModuleData {
  moduleId?: string;
  enabledUntil?: Date;
}

function getAuthHeaders(requireTenant: boolean = true) {
  const token = localStorage.getItem('accessToken');
  const tenantId = localStorage.getItem('tenantId');
  
  console.log('[moduleService.getAuthHeaders]', { 
    hasToken: !!token, 
    hasTenantId: !!tenantId, 
    requireTenant,
    tokenLength: token?.length || 0
  });
  
  if (!token) {
    console.error('[moduleService.getAuthHeaders] Token não encontrado no localStorage');
    console.error('[moduleService.getAuthHeaders] localStorage keys:', Object.keys(localStorage));
    throw new Error('Not authenticated - Token não encontrado');
  }
  
  if (requireTenant && !tenantId) {
    console.error('[moduleService.getAuthHeaders] TenantId requerido mas não encontrado');
    throw new Error('Tenant ID required');
  }
  
  return { token, tenantId: tenantId || undefined };
}

export const moduleService = {
  /**
   * Listar módulos disponíveis no sistema
   * NOTA: Esta rota não precisa de tenantId (lista módulos globais)
   */
  async listAvailable(): Promise<Module[]> {
    try {
      const { token } = getAuthHeaders(false); // Não requer tenantId
      console.log('[moduleService.listAvailable] Token obtido:', !!token);
      const response = await apiRequest<{ data: { modules: Module[] } }>(
        '/api/v1/modules',
        { token, tenantId: undefined } // Explicitamente não enviar tenantId
      );
      console.log('[moduleService.listAvailable] Módulos recebidos:', response.data.modules);
      return response.data.modules;
    } catch (error) {
      console.error('[moduleService.listAvailable] Erro:', error);
      throw error;
    }
  },

  /**
   * Listar módulos ativos do tenant atual
   */
  async listActive(): Promise<ActiveModule[]> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { modules: ActiveModule[] } }>(
      '/api/v1/modules/active',
      { token, tenantId }
    );
    return response.data.modules;
  },

  /**
   * Ativar módulo para o tenant
   */
  async activate(moduleId: string, enabledUntil?: Date): Promise<void> {
    const { token, tenantId } = getAuthHeaders();
    const body: { moduleId: string; enabledUntil?: string } = {
      moduleId,
    };
    if (enabledUntil) {
      body.enabledUntil = enabledUntil.toISOString();
    }
    
    await apiRequest<{ data: { module: any } }>(
      `/api/v1/modules/${moduleId}/activate`,
      {
        method: 'POST',
        body: JSON.stringify(body),
        token,
        tenantId,
      }
    );
  },

  /**
   * Desativar módulo para o tenant
   */
  async deactivate(moduleId: string): Promise<void> {
    const { token, tenantId } = getAuthHeaders();
    await apiRequest<{ data: { success: boolean } }>(
      `/api/v1/modules/${moduleId}/deactivate`,
      {
        method: 'POST',
        token,
        tenantId,
      }
    );
  },

  /**
   * Listar módulos de um plano (apenas super_admin)
   */
  async getModulesByPlan(planId: string): Promise<(Module & { is_default: boolean })[]> {
    const { token } = getAuthHeaders(false);
    const response = await apiRequest<{ data: { modules: (Module & { is_default: boolean })[] } }>(
      `/api/v1/modules/plans/${planId}`,
      { token }
    );
    return response.data.modules;
  },

  /**
   * Associar módulo a um plano (apenas super_admin)
   */
  async addModuleToPlan(planId: string, moduleId: string, isDefault: boolean = true): Promise<void> {
    const { token } = getAuthHeaders(false);
    await apiRequest<{ data: { success: boolean } }>(
      `/api/v1/modules/plans/${planId}`,
      {
        method: 'POST',
        body: JSON.stringify({ moduleId, isDefault }),
        token,
      }
    );
  },

  /**
   * Remover módulo de um plano (apenas super_admin)
   */
  async removeModuleFromPlan(planId: string, moduleId: string): Promise<void> {
    const { token } = getAuthHeaders(false);
    await apiRequest<{ data: { success: boolean } }>(
      `/api/v1/modules/plans/${planId}/${moduleId}`,
      {
        method: 'DELETE',
        token,
      }
    );
  },
};
