const GA_MEASUREMENT_ID = (import.meta.env.VITE_GA_MEASUREMENT_ID || '').trim();
const GTM_ID = (import.meta.env.VITE_GTM_ID || '').trim();

let isInitialized = false;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export interface AnalyticsContext {
  userId?: string | null;
  companyId?: string | null;
  userRole?: string | null;
}

function hasAnalyticsConfig(): boolean {
  return Boolean(GA_MEASUREMENT_ID || GTM_ID);
}

function gtag(...args: unknown[]) {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag !== 'function') return;
  window.gtag(...args);
}

function pushDataLayer(eventName: string, params: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName,
    ...params,
  });
}

export function initAnalytics() {
  if (typeof window === 'undefined') return;
  if (!hasAnalyticsConfig()) return;
  if (isInitialized) return;

  window.dataLayer = window.dataLayer || [];

  // Se houver GA4 direto configurado, também inicializa gtag.
  if (GA_MEASUREMENT_ID) {
    const scriptExists = document.querySelector(`script[src*="${GA_MEASUREMENT_ID}"]`);
    if (!scriptExists) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
      document.head.appendChild(script);
    }

    window.gtag = window.gtag || function pushToDataLayer(...args: unknown[]) {
      window.dataLayer?.push(args);
    };

    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID, { send_page_view: false });
  }

  isInitialized = true;
}

export function trackPageView(path: string, title: string, context?: AnalyticsContext) {
  if (!hasAnalyticsConfig()) return;

  const payload = {
    page_path: path,
    page_title: title,
    user_id: context?.userId || undefined,
    company_id: context?.companyId || undefined,
    user_role: context?.userRole || undefined,
  };

  pushDataLayer('page_view', payload);

  gtag('event', 'page_view', {
    ...payload,
  });
}

export function trackEvent(
  eventName: string,
  params: Record<string, unknown> = {},
  context?: AnalyticsContext,
) {
  if (!hasAnalyticsConfig()) return;

  const payload = {
    ...params,
    user_id: context?.userId || undefined,
    company_id: context?.companyId || undefined,
    user_role: context?.userRole || undefined,
  };

  pushDataLayer(eventName, payload);

  gtag('event', eventName, {
    ...payload,
  });
}

