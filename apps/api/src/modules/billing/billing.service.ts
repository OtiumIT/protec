import { SubscriptionRepository } from '../subscriptions/subscription.repository';
import { PlanRepository } from './plan.repository';
import { AppError } from '../../shared/utils/error-handler';

// TODO: Instalar e configurar Stripe SDK
// import Stripe from 'stripe';
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export class BillingService {
  constructor(
    private subscriptionRepo: SubscriptionRepository,
    private planRepo: PlanRepository
  ) {}

  async createCustomer(companyId: string, email: string): Promise<string> {
    // TODO: Implementar criação de customer no Stripe
    // const customer = await stripe.customers.create({ email });
    // return customer.id;
    throw new Error('Stripe integration not implemented');
  }

  async createSubscription(customerId: string, planId: string): Promise<string> {
    // TODO: Implementar criação de assinatura no Stripe
    throw new Error('Stripe integration not implemented');
  }

  async handleWebhook(event: any): Promise<void> {
    // TODO: Implementar processamento de webhooks
    // Validar signature
    // Processar eventos: subscription.updated, invoice.payment_failed, etc.
    throw new Error('Stripe webhook handling not implemented');
  }
}
