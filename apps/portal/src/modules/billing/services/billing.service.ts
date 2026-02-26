import apiRequest from '../../../shared/services/api';

function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  const tenantId = localStorage.getItem('tenantId');
  if (!token) {
    throw new Error('Not authenticated');
  }
  return { token, tenantId: tenantId ?? undefined };
}

export interface Invoice {
  id: string;
  number: string | null;
  status: string;
  amountPaid: number;
  currency: string;
  createdAt: number;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
  periodStart: number;
  periodEnd: number;
}

export const billingService = {
  /**
   * Lista faturas (invoices) da assinatura.
   */
  async listInvoices(limit = 24): Promise<Invoice[]> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { invoices: Invoice[] } }>(
      `/api/v1/billing/invoices?limit=${limit}`,
      { method: 'GET', token, tenantId: tenantId ?? undefined }
    );
    return response.data.invoices ?? [];
  },

  /**
   * Cria sessão do Stripe Customer Portal (alterar forma de pagamento, cancelar, ver faturas).
   * Retorna a URL para redirecionar o usuário.
   */
  async createPortalSession(returnUrl: string): Promise<{ url: string }> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { url: string } }>(
      '/api/v1/billing/portal-session',
      {
        method: 'POST',
        body: JSON.stringify({ returnUrl }),
        token,
        tenantId,
      }
    );
    return { url: response.data.url };
  },

  /**
   * Cria sessão do Stripe Checkout para assinar plano pago.
   * Retorna a URL para redirecionar o usuário ao pagamento.
   */
  async createCheckoutSession(planId: string, successUrl: string, cancelUrl: string): Promise<{ url: string }> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { url: string } }>(
      '/api/v1/billing/checkout-session',
      {
        method: 'POST',
        body: JSON.stringify({ planId, successUrl, cancelUrl }),
        token,
        tenantId,
      }
    );
    return { url: response.data.url };
  },
};
