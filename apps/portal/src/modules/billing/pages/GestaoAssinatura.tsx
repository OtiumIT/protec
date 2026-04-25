import { useState, useEffect } from 'react';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { useToast } from '../../../shared/components/ui/Toast';
import { subscriptionService, type Subscription } from '../../system/services/subscription.service';
import { billingService, type Invoice } from '../services/billing.service';

function formatCurrency(value: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100); // Stripe amount in cents
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    paid: 'Pago',
    open: 'Aberto',
    draft: 'Rascunho',
    uncollectible: 'Inadimplente',
    void: 'Anulado',
  };
  return map[status] ?? status;
}

export function GestaoAssinatura() {
  const { error: showError, ToastContainer } = useToast();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const [sub, invList] = await Promise.all([
        subscriptionService.getMySubscription(),
        billingService.listInvoices(24),
      ]);
      setSubscription(sub);
      setInvoices(invList);
    } catch (e) {
      console.error(e);
      showError('Erro ao carregar dados.');
      setInvoices([]);
      setSubscription(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const hasStripeCustomer = Boolean(subscription?.stripe_customer_id);
  const returnUrl = `${window.location.origin}/gestao-assinatura`;

  const handleOpenPortal = async () => {
    setPortalLoading(true);
    try {
      const { url } = await billingService.createPortalSession(returnUrl);
      window.location.href = url;
    } catch (e: any) {
      console.error(e);
      showError(e?.message ?? 'Não foi possível abrir o painel de pagamento.');
      setPortalLoading(false);
    }
  };

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const invoicesThisMonth = invoices.filter((inv) => {
    const d = new Date(inv.createdAt * 1000);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const otherInvoices = invoices.filter((inv) => {
    const d = new Date(inv.createdAt * 1000);
    return d.getMonth() !== currentMonth || d.getFullYear() !== currentYear;
  });

  return (
    <>
      <ToastContainer />
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Gestão de assinatura</h1>
        <p className="text-slate-600 mb-6">
          Veja suas faturas do mês, altere a forma de pagamento ou cancele a assinatura.
        </p>

        {isLoading ? (
          <div className="text-center py-12 text-slate-500">Carregando...</div>
        ) : !hasStripeCustomer ? (
          <Card className="max-w-2xl border border-dashed border-slate-300 bg-slate-50">
            <p className="text-slate-600 mb-4">
              Você ainda não tem assinatura com pagamento configurado. Assine um plano pago em{' '}
              <a href="/meu-plano" className="text-brand hover:underline font-medium">
                Meu plano
              </a>{' '}
              para ver faturas e gerenciar pagamento.
            </p>
            <Button variant="primary" onClick={() => (window.location.href = '/meu-plano')}>
              Ir para Meu plano
            </Button>
          </Card>
        ) : (
          <>
            {/* Resumo e ações */}
            <section className="mb-8">
              <Card className="max-w-3xl border-2 border-brand/20 bg-brand/5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800">Assinatura atual</h2>
                    {subscription?.plan && (
                      <p className="text-slate-700 mt-1">
                        {subscription.plan.name} ·{' '}
                        {subscription.status === 'active'
                          ? 'Ativa'
                          : subscription.status === 'past_due'
                            ? 'Pagamento pendente'
                            : subscription.status}
                      </p>
                    )}
                    <p className="text-sm text-slate-500 mt-1">
                      No painel do Stripe você pode alterar o cartão, ver histórico de faturas e
                      cancelar a assinatura.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="primary"
                      onClick={handleOpenPortal}
                      disabled={portalLoading}
                    >
                      {portalLoading ? 'Abrindo...' : 'Alterar pagamento ou cancelar'}
                    </Button>
                  </div>
                </div>
              </Card>
            </section>

            {/* Faturas do mês */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-slate-800 mb-3">Faturas do mês</h2>
              {invoicesThisMonth.length === 0 ? (
                <Card className="max-w-3xl border border-slate-200">
                  <p className="text-slate-500 py-4">
                    Nenhuma fatura emitida neste mês ainda.
                  </p>
                </Card>
              ) : (
                <div className="overflow-x-auto max-w-3xl">
                  <table className="w-full border border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                          Número
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                          Período
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                          Valor
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                          Ação
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoicesThisMonth.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 text-sm text-slate-700 font-mono">
                            {inv.number ?? inv.id.slice(0, 12)}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-700">
                            {formatCurrency(inv.amountPaid, inv.currency)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={
                                inv.status === 'paid'
                                  ? 'text-emerald-600 font-medium'
                                  : inv.status === 'open'
                                    ? 'text-amber-600'
                                    : 'text-slate-600'
                              }
                            >
                              {statusLabel(inv.status)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {(inv.hostedInvoiceUrl || inv.invoicePdf) && (
                              <a
                                href={inv.hostedInvoiceUrl ?? inv.invoicePdf ?? '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-brand hover:underline text-sm font-medium"
                              >
                                Ver fatura
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Outras faturas */}
            {otherInvoices.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-slate-800 mb-3">Outras faturas</h2>
                <div className="overflow-x-auto max-w-3xl">
                  <table className="w-full border border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                          Número
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                          Período
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                          Valor
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                          Ação
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {otherInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 text-sm text-slate-700 font-mono">
                            {inv.number ?? inv.id.slice(0, 12)}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-700">
                            {formatCurrency(inv.amountPaid, inv.currency)}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {statusLabel(inv.status)}
                          </td>
                          <td className="py-3 px-4">
                            {(inv.hostedInvoiceUrl || inv.invoicePdf) && (
                              <a
                                href={inv.hostedInvoiceUrl ?? inv.invoicePdf ?? '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-brand hover:underline text-sm font-medium"
                              >
                                Ver fatura
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </>
  );
}
