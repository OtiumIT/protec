import Stripe from 'stripe';
import { SubscriptionRepository } from '../subscriptions/subscription.repository';
import { PlanRepository } from '../plans/plan.repository';
import { CompanyRepository } from '../companies/company.repository';
import { AppError } from '../../shared/utils/error-handler';

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

function getStripe(): Stripe {
  if (!stripeSecret) {
    throw new AppError('Stripe is not configured', 'STRIPE_NOT_CONFIGURED', 503);
  }
  return new Stripe(stripeSecret);
}

export class BillingService {
  constructor(
    private subscriptionRepo: SubscriptionRepository,
    private planRepo: PlanRepository,
    private companyRepo: CompanyRepository
  ) {}

  /**
   * Lista faturas (invoices) do cliente no Stripe.
   */
  async listInvoices(companyId: string, limit = 24): Promise<{
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
  }[]> {
    const subscription = await this.subscriptionRepo.findByCompany(companyId);
    if (!subscription?.stripe_customer_id) {
      return [];
    }
    const stripe = getStripe();
    const invoices = await stripe.invoices.list({
      customer: subscription.stripe_customer_id,
      limit: Math.min(limit, 100),
    });
    return invoices.data.map((inv) => ({
      id: inv.id,
      number: inv.number ?? null,
      status: inv.status ?? 'unknown',
      amountPaid: inv.amount_paid ?? 0,
      currency: (inv.currency ?? 'brl').toUpperCase(),
      createdAt: inv.created,
      hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
      invoicePdf: inv.invoice_pdf ?? null,
      periodStart: inv.period_start ?? inv.created,
      periodEnd: inv.period_end ?? inv.created,
    }));
  }

  /**
   * Cria sessão do Stripe Customer Billing Portal (alterar pagamento, cancelar, faturas).
   */
  async createBillingPortalSession(
    companyId: string,
    returnUrl: string
  ): Promise<{ url: string }> {
    const subscription = await this.subscriptionRepo.findByCompany(companyId);
    if (!subscription?.stripe_customer_id) {
      throw new AppError(
        'Nenhum pagamento configurado para esta conta. Assine um plano pago primeiro.',
        'NO_STRIPE_CUSTOMER',
        400
      );
    }
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: returnUrl,
    });
    return { url: session.url! };
  }

  /**
   * Cria sessão do Stripe Checkout para assinar um plano pago.
   */
  async createCheckoutSession(
    companyId: string,
    planId: string,
    successUrl: string,
    cancelUrl: string,
    fallbackEmail?: string
  ): Promise<{ url: string }> {
    const plan = await this.planRepo.findById(planId);
    if (!plan) {
      throw new AppError('Plan not found', 'PLAN_NOT_FOUND', 404);
    }
    const stripePriceId = (plan as any).stripe_price_id;
    if (!stripePriceId) {
      throw new AppError(
        'Este plano não está configurado para pagamento via Stripe. Use "Meu plano" para alterar sem pagamento.',
        'PLAN_NO_STRIPE_PRICE',
        400
      );
    }
    const company = await this.companyRepo.findById(companyId);
    if (!company) {
      throw new AppError('Company not found', 'COMPANY_NOT_FOUND', 404);
    }
    const email = company.email || (company as any).contact_email || fallbackEmail || undefined;
    if (!email) {
      throw new AppError(
        'E-mail não encontrado. Atualize os dados da empresa ou entre em contato.',
        'COMPANY_EMAIL_REQUIRED',
        400
      );
    }
    const stripe = getStripe();
    const existingSubscription = await this.subscriptionRepo.findByCompany(companyId);
    const customerId = existingSubscription?.stripe_customer_id ?? undefined;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId || undefined,
      customer_email: customerId ? undefined : email,
      line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { companyId, planId },
      subscription_data: { metadata: { companyId, planId } },
    });
    if (!session.url) {
      throw new AppError('Stripe did not return checkout URL', 'STRIPE_ERROR', 500);
    }
    return { url: session.url };
  }

  /**
   * Processa webhooks do Stripe (assinatura criada/atualizada/cancelada, falha de pagamento).
   */
  async handleWebhook(rawBody: string | Buffer, signature: string | null): Promise<void> {
    if (!stripeWebhookSecret) {
      throw new AppError('Stripe webhook secret not configured', 'STRIPE_NOT_CONFIGURED', 503);
    }
    const stripe = getStripe();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature ?? '',
        stripeWebhookSecret
      );
    } catch (err: any) {
      throw new AppError(`Webhook signature verification failed: ${err.message}`, 'WEBHOOK_INVALID', 400);
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const companyId = session.metadata?.companyId;
        const planId = session.metadata?.planId;
        const stripeSubscriptionId = session.subscription as string | null;
        const stripeCustomerId = session.customer as string | null;
        if (!companyId || !planId) break;
        const existing = await this.subscriptionRepo.findByCompany(companyId);
        if (existing) {
          await this.subscriptionRepo.update(companyId, {
            planId,
            status: 'active',
            stripeSubscriptionId: stripeSubscriptionId ?? undefined,
            stripeCustomerId: stripeCustomerId ?? undefined,
          });
        } else {
          await this.subscriptionRepo.create(companyId, {
            planId,
            stripeSubscriptionId: stripeSubscriptionId ?? undefined,
            stripeCustomerId: stripeCustomerId ?? undefined,
          });
        }
        break;
      }
      case 'customer.subscription.updated': {
        const stripeSub = event.data.object as Stripe.Subscription;
        const existing = await this.subscriptionRepo.findByStripeId(stripeSub.id);
        if (!existing) break;
        const status = this.mapStripeStatus(stripeSub.status);
        await this.subscriptionRepo.update(existing.company_id, {
          status,
          currentPeriodStart: (stripeSub as any).current_period_start
            ? new Date((stripeSub as any).current_period_start * 1000)
            : undefined,
          currentPeriodEnd: (stripeSub as any).current_period_end
            ? new Date((stripeSub as any).current_period_end * 1000)
            : undefined,
        });
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const existing = await this.subscriptionRepo.findByStripeId(sub.id);
        if (!existing) break;
        await this.subscriptionRepo.update(existing.company_id, {
          status: 'canceled',
          canceledAt: new Date(),
        });
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeSubId = (invoice as any).subscription as string | null;
        if (!stripeSubId) break;
        const existing = await this.subscriptionRepo.findByStripeId(stripeSubId);
        if (!existing) break;
        await this.subscriptionRepo.updateStatus(existing.company_id, 'past_due');
        break;
      }
      default:
        // ignore other events
        break;
    }
  }

  private mapStripeStatus(stripeStatus: Stripe.Subscription.Status): 'active' | 'past_due' | 'canceled' | 'trialing' {
    switch (stripeStatus) {
      case 'active':
        return 'active';
      case 'past_due':
      case 'unpaid':
        return 'past_due';
      case 'canceled':
      case 'incomplete_expired':
        return 'canceled';
      case 'trialing':
        return 'trialing';
      default:
        return 'active';
    }
  }
}
