type IrpfMetricEvent = {
  name: string;
  at: string;
  payload?: Record<string, unknown>;
};

const STORAGE_KEY = 'irpfm_metrics_events_v1';

function safeRead(): IrpfMetricEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function trackIrpfMetric(name: string, payload?: Record<string, unknown>) {
  const event: IrpfMetricEvent = {
    name,
    at: new Date().toISOString(),
    payload,
  };
  const current = safeRead();
  const next = [...current.slice(-249), event];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

