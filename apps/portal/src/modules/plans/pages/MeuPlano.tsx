import { useState, useEffect } from 'react';
import { Layout } from '../../../shared/components/layout/Layout';
import { Card } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { Button } from '../../../shared/components/ui/Button';
import { useToast } from '../../../shared/components/ui/Toast';
import { planService, type Plan } from '../services/plan.service';
import { subscriptionService, type Subscription } from '../../system/services/subscription.service';
import { billingService } from '../../billing/services/billing.service';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function MeuPlano() {
  const { error: showError, ToastContainer } = useToast();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [changingPlanId, setChangingPlanId] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const [sub, plansList] = await Promise.all([
        subscriptionService.getMySubscription(),
        planService.list(),
      ]);
      setSubscription(sub);
      setPlans(plansList);
    } catch (e) {
      console.error(e);
      showError('Erro ao carregar planos');
      setPlans([]);
      setSubscription(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const currentPlanId = subscription?.plan_id ?? null;

  const handleAssinarOuMudar = async (plan: Plan) => {
    if (plan.id === currentPlanId) return;
    if (plan.isCustom || plan.isManaged) {
      showError('Plano customizado. Entre em contato para assinar.');
      return;
    }
    setChangingPlanId(plan.id);
    try {
      // Plano Free (preço = 0 ou nome "Free"): não usa Stripe — chama diretamente a API
      const isFree = plan.price === 0 || plan.name.toLowerCase() === 'free';
      if (isFree) {
        if (subscription) {
          await subscriptionService.updatePlan(plan.id);
        } else {
          await subscriptionService.createMySubscription(plan.id);
        }
        await load();
        setChangingPlanId(null);
        return;
      }
      // Plano pago: redirecionar para checkout do Stripe
      const returnUrl = `${window.location.origin}/meu-plano`;
      const { url } = await billingService.createCheckoutSession(plan.id, returnUrl, returnUrl);
      window.location.href = url;
    } catch (e: any) {
      console.error(e);
      showError(e?.message || 'Erro ao alterar plano.');
      setChangingPlanId(null);
    }
  };

  const handleGerenciarPagamento = async () => {
    setPortalLoading(true);
    try {
      const returnUrl = `${window.location.origin}/meu-plano`;
      const { url } = await billingService.createPortalSession(returnUrl);
      window.location.href = url;
    } catch (e: any) {
      console.error(e);
      showError(e?.message ?? 'Não foi possível abrir a página de pagamento.');
      setPortalLoading(false);
    }
  };

  return (
    <Layout>
      <ToastContainer />
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Meu plano</h1>
        <p className="text-slate-600 mb-6">
          Veja seu plano atual e altere quando quiser (por exemplo, sair do Grátis e ir para o pago).
        </p>

        {isLoading ? (
          <div className="text-center py-12 text-slate-500">Carregando...</div>
        ) : (
          <>
            {/* Plano atual */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-slate-800 mb-3">Plano atual</h2>
              {subscription?.plan ? (
                <Card className="max-w-2xl border-2 border-brand/30 bg-brand/5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xl font-bold text-slate-900">{subscription.plan.name}</h3>
                        <Badge variant="success">
                          {subscription.status === 'trialing' ? 'Período de teste' : 'Ativo'}
                        </Badge>
                      </div>
                      <p className="text-slate-600 mt-1">
                        {subscription.plan.isCustom
                          ? 'Plano customizado'
                          : `${formatCurrency(subscription.plan.price)}/${subscription.plan.billingCycle === 'yearly' ? 'ano' : 'mês'}`}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        Até {subscription.plan.maxUsers} usuário(s)
                        {(subscription.plan.maxClients ?? 0) > 0
                          ? ` · Até ${subscription.plan.maxClients} cliente(s)`
                          : ' · Clientes ilimitados'}
                      </p>
                    </div>
                    {subscription.stripe_customer_id && (
                      <Button
                        variant="secondary"
                        onClick={handleGerenciarPagamento}
                        disabled={portalLoading}
                      >
                        {portalLoading ? 'Abrindo...' : 'Gerenciar assinatura e pagamento'}
                      </Button>
                    )}
                  </div>
                  {subscription.stripe_customer_id && (
                    <p className="text-xs text-slate-500 mt-3">
                      Alterar forma de pagamento, cancelar assinatura ou ver faturas.
                    </p>
                  )}
                </Card>
              ) : (
                <Card className="max-w-2xl border border-dashed border-slate-300 bg-slate-50">
                  <p className="text-slate-600">Você ainda não tem um plano ativo. Escolha um dos planos abaixo para começar.</p>
                </Card>
              )}
            </section>

            {/* Planos disponíveis */}
            <section>
              <h2 className="text-lg font-semibold text-slate-800 mb-3">Planos disponíveis</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans
                  .filter((p) => !p.isCustom && !p.isManaged)
                  .map((plan) => {
                    const isCurrent = plan.id === currentPlanId;
                    const isChanging = changingPlanId === plan.id;
                    return (
                      <Card key={plan.id} className={isCurrent ? 'ring-2 ring-brand' : ''}>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                          {isCurrent && (
                            <Badge variant="success">Seu plano</Badge>
                          )}
                        </div>
                        <p className="text-2xl font-bold text-slate-900 mb-1">
                          {formatCurrency(plan.price)}
                          <span className="text-sm font-normal text-slate-500">
                            /{plan.billingCycle === 'yearly' ? 'ano' : 'mês'}
                          </span>
                        </p>
                        <p className="text-sm text-slate-600 mb-4">
                          Até {plan.maxUsers} usuário(s)
                          {(plan.maxClients ?? 0) > 0
                            ? ` · Até ${plan.maxClients} cliente(s)`
                            : ' · Clientes ilimitados'}
                        </p>
                        <ul className="text-sm text-slate-600 space-y-1 mb-4 list-disc list-inside">
                          {(plan.features || []).slice(0, 4).map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                        <Button
                          variant={isCurrent ? 'tertiary' : 'primary'}
                          className="w-full"
                          disabled={isCurrent || isChanging}
                          onClick={() => handleAssinarOuMudar(plan)}
                        >
                          {isChanging
                            ? (plan.price === 0 || plan.name.toLowerCase() === 'free' ? 'Alterando...' : 'Abrindo pagamento...')
                            : isCurrent ? 'Plano atual'
                            : subscription ? 'Mudar para este plano'
                            : 'Assinar'}
                        </Button>
                      </Card>
                    );
                  })}
              </div>
            </section>
          </>
        )}
      </div>
    </Layout>
  );
}
