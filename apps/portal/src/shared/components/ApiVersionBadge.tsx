import { useState, useEffect } from 'react';
import { getApiUrl } from '../services/api';

interface VersionResponse {
  version?: string;
  updatedAt?: string;
}

/** Badge discreto com versão da API. Não exibe nada se a requisição falhar. */
interface ApiVersionBadgeProps {
  className?: string;
}

export function ApiVersionBadge({ className = '' }: ApiVersionBadgeProps) {
  const [info, setInfo] = useState<VersionResponse | null>(null);

  useEffect(() => {
    const baseUrl = getApiUrl().replace(/\/$/, '');
    fetch(`${baseUrl}/api/v1/version`, { method: 'GET' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: VersionResponse | null) => {
        if (data?.version) setInfo(data);
      })
      .catch(() => {});
  }, []);

  if (!info?.version) return null;

  const dateStr = info.updatedAt
    ? new Date(info.updatedAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : null;

  return (
    <span
      className={`text-[10px] text-slate-400 font-mono ${className}`}
      title={dateStr ? `Atualizado em ${dateStr}` : 'Versão da API'}
    >
      API v{info.version}
      {dateStr && ` | ${dateStr}`}
    </span>
  );
}
