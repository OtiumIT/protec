import { useState, useEffect } from 'react';
import { getApiUrl } from '../services/api';

interface VersionResponse {
  version?: string;
  updatedAt?: string;
  updated_at?: string;
}

function formatBuildDate(iso: string | undefined | null): string | null {
  if (!iso || typeof iso !== 'string') return null;
  const t = iso.trim();
  if (!t) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Badge com versão da API (uso interno; exibir só para super_admin no Layout). */
export function ApiVersionBadge() {
  const [info, setInfo] = useState<VersionResponse | null>(null);

  useEffect(() => {
    const baseUrl = getApiUrl().replace(/\/$/, '');
    fetch(`${baseUrl}/api/v1/version`, { method: 'GET' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: VersionResponse | null) => {
        if (!data?.version) return;
        setInfo({
          version: data.version,
          updatedAt: data.updatedAt ?? data.updated_at,
        });
      })
      .catch(() => {});
  }, []);

  if (!info?.version) return null;

  const dateStr = formatBuildDate(info.updatedAt);

  return (
    <span
      className="text-[10px] text-slate-400 font-mono"
      title={dateStr ? `Atualizado em ${dateStr}` : 'Versão da API'}
    >
      API v{info.version}
      {dateStr ? ` · ${dateStr}` : ''}
    </span>
  );
}
