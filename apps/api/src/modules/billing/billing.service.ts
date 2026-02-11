// TODO: Instalar e configurar Stripe SDK
// import Stripe from 'stripe';
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export class BillingService {
  async createCustomer(_companyId: string, _email: string): Promise<string> {
    // TODO: Implementar criação de customer no Stripe
    // const customer = await stripe.customers.create({ email });
    // return customer.id;
    throw new Error('Stripe integration not implemented');
  }

  async createSubscription(_customerId: string, _planId: string): Promise<string> {
    // TODO: Implementar criação de assinatura no Stripe
    throw new Error('Stripe integration not implemented');
  }

  async handleWebhook(_event: unknown): Promise<void> {
    // TODO: Implementar processamento de webhooks
    // Validar signature
    // Processar eventos: subscription.updated, invoice.payment_failed, etc.
    throw new Error('Stripe webhook handling not implemented');
  }
}
