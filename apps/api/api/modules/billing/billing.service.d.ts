import { SubscriptionRepository } from '../subscriptions/subscription.repository';
import { PlanRepository } from '../plans/plan.repository';
import { CompanyRepository } from '../companies/company.repository';
export declare class BillingService {
    private subscriptionRepo;
    private planRepo;
    private companyRepo;
    constructor(subscriptionRepo: SubscriptionRepository, planRepo: PlanRepository, companyRepo: CompanyRepository);
    /**
     * Lista faturas (invoices) do cliente no Stripe.
     */
    listInvoices(companyId: string, limit?: number): Promise<{
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
    }[]>;
    /**
     * Cria sessão do Stripe Customer Billing Portal (alterar pagamento, cancelar, faturas).
     */
    createBillingPortalSession(companyId: string, returnUrl: string): Promise<{
        url: string;
    }>;
    /**
     * Cria sessão do Stripe Checkout para assinar um plano pago.
     */
    createCheckoutSession(companyId: string, planId: string, successUrl: string, cancelUrl: string): Promise<{
        url: string;
    }>;
    /**
     * Processa webhooks do Stripe (assinatura criada/atualizada/cancelada, falha de pagamento).
     */
    handleWebhook(rawBody: string | Buffer, signature: string | null): Promise<void>;
    private mapStripeStatus;
}
//# sourceMappingURL=billing.service.d.ts.map