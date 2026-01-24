import { Context, Next } from 'hono';
import { query } from '../db/client';
import type { Subscription } from '@shared/core';

/**
 * Middleware para verificar se assinatura está ativa
 * Bloqueia operações de escrita se assinatura estiver past_due ou canceled
 * 
 * Nota: Será atualizado quando SubscriptionService for criado
 */
export async function requireActiveSubscription(c: Context, next: Next) {
  const companyId = c.get('companyId');
  const method = c.req.method;

  if (!companyId) {
    return c.json(
      {
        error: {
          message: 'Tenant not identified',
          code: 'TENANT_REQUIRED',
        },
      },
      400
    );
  }

  // Apenas bloquear métodos de escrita
  const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!writeMethods.includes(method)) {
    await next();
    return;
  }

  try {
    const result = await query<Subscription>(
      `SELECT id, company_id, plan_id, status, current_period_start, 
       current_period_end, stripe_subscription_id, stripe_customer_id, 
       canceled_at, created_at, updated_at
       FROM subscriptions 
       WHERE company_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [companyId]
    );

    if (result.rows.length === 0) {
      return c.json(
        {
          error: {
            message: 'No active subscription found',
            code: 'SUBSCRIPTION_NOT_FOUND',
          },
        },
        402
      );
    }

    const subscription = result.rows[0];

    // Verificar status da assinatura
    if (['past_due', 'canceled'].includes(subscription.status)) {
      // Grace period: 7 dias após cancelamento ou past_due
      const gracePeriodDays = 7;
      const gracePeriodEnd = new Date(subscription.updated_at);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + gracePeriodDays);

      if (new Date() > gracePeriodEnd) {
        return c.json(
          {
            error: {
              message: 'Subscription is not active',
              code: 'SUBSCRIPTION_INACTIVE',
            },
          },
          402
        );
      }
    }

    await next();
  } catch (error) {
    console.error('Error checking subscription:', error);
    return c.json(
      {
        error: {
          message: 'Error checking subscription status',
          code: 'SUBSCRIPTION_CHECK_ERROR',
        },
      },
      500
    );
  }
}
