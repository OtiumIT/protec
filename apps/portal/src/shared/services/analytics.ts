import { getApiUrl } from './api';

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

function getModuleFromPath(path: string): string {
  const pathname = path.split('?')[0].split('#')[0] || '/';
  if (pathname === '/') return 'landing';
  if (pathname.startsWith('/simulador-in-2306')) return 'simulador-in-2306';
  if (pathname.startsWith('/irpf-alta-renda')) return 'irpf-alta-renda';
  if (pathname.startsWith('/rating-validator')) return 'rating-validator';
  if (pathname.startsWith('/properties')) return 'properties';
  if (pathname.startsWith('/fiscal-files')) return 'fiscal-files';
  if (pathname.startsWith('/clients')) return 'clients';
  if (pathname.startsWith('/dashboard')) return 'system';
  return pathname.split('/').filter(Boolean)[0] || 'unknown';
}

async function sendUsageLog(payload: {
  module_key: string;
  feature_key: string;
  action: string;
  route_path?: string;
  metadata?: Record<string, unknown>;
}) {
  if (typeof window === 'undefined') return;

  const token = localStorage.getItem('accessToken');
  if (!token) return;

  const tenantId = localStorage.getItem('tenantId');
  const baseUrl = getApiUrl().replace(/\/$/, '');
  if (!baseUrl) return;

  try {
    await fetch(`${baseUrl}/api/v1/system/usage-log`, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(tenantId ? { 'X-Tenant-ID': tenantId } : {}),
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Não interromper UX por falha de observabilidade.
  }
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
  const payload = {
    page_path: path,
    page_title: title,
    user_id: context?.userId || undefined,
    company_id: context?.companyId || undefined,
    user_role: context?.userRole || undefined,
  };

  if (hasAnalyticsConfig()) {
    pushDataLayer('page_view', payload);
    gtag('event', 'page_view', {
      ...payload,
    });
  }

  void sendUsageLog({
    module_key: getModuleFromPath(path),
    feature_key: 'page_view',
    action: 'view',
    route_path: path,
    metadata: {
      page_title: title,
      user_id: context?.userId || undefined,
      company_id: context?.companyId || undefined,
      user_role: context?.userRole || undefined,
    },
  });
}

export function trackEvent(
  eventName: string,
  params: Record<string, unknown> = {},
  context?: AnalyticsContext,
) {
  const payload = {
    ...params,
    user_id: context?.userId || undefined,
    company_id: context?.companyId || undefined,
    user_role: context?.userRole || undefined,
  };

  if (hasAnalyticsConfig()) {
    pushDataLayer(eventName, payload);
    gtag('event', eventName, {
      ...payload,
    });
  }

  const routePath = typeof params.page_path === 'string' ? params.page_path : window.location.pathname;
  if (eventName === 'ui_click') {
    return;
  }
  void sendUsageLog({
    module_key: getModuleFromPath(routePath),
    feature_key: eventName,
    action: eventName === 'ui_click' ? 'click' : eventName,
    route_path: routePath,
    metadata: payload,
  });
}

