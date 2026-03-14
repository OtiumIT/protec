import type { Vigencia } from '@shared/types/documentation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faCalendarCheck, faCalendarTimes } from '@fortawesome/free-solid-svg-icons';

interface VigenciaTagProps {
  vigencia: Vigencia;
  compact?: boolean;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function isActive(vigencia: Vigencia): boolean {
  const now = new Date();
  const inicio = new Date(vigencia.inicio + 'T00:00:00');

  if (now < inicio) return false;
  if (vigencia.fim) {
    const fim = new Date(vigencia.fim + 'T00:00:00');
    if (now > fim) return false;
  }

  return true;
}

function isPending(vigencia: Vigencia): boolean {
  const now = new Date();
  const inicio = new Date(vigencia.inicio + 'T00:00:00');
  return now < inicio;
}

export function VigenciaTag({ vigencia, compact = false }: VigenciaTagProps) {
  const active = isActive(vigencia);
  const pending = isPending(vigencia);

  const status = pending ? 'pending' : active ? 'active' : 'expired';

  const styles = {
    active: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-500',
      text: 'text-green-800 dark:text-green-200',
      icon: faCalendarCheck,
      iconColor: 'text-green-600 dark:text-green-400',
      label: 'Vigente',
    },
    pending: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-500',
      text: 'text-blue-800 dark:text-blue-200',
      icon: faCalendarAlt,
      iconColor: 'text-blue-600 dark:text-blue-400',
      label: 'Futura',
    },
    expired: {
      bg: 'bg-slate-50 dark:bg-slate-900/20',
      border: 'border-slate-500',
      text: 'text-slate-800 dark:text-slate-200',
      icon: faCalendarTimes,
      iconColor: 'text-slate-600 dark:text-slate-400',
      label: 'Expirada',
    },
  };

  const style = styles[status];

  const dateRange = vigencia.fim
    ? `${formatDate(vigencia.inicio)} a ${formatDate(vigencia.fim)}`
    : `A partir de ${formatDate(vigencia.inicio)}`;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 ${style.bg} ${style.text} text-xs rounded-md`}
        title={vigencia.observacao ?? dateRange}
      >
        <FontAwesomeIcon icon={style.icon} className="h-3 w-3" />
        {style.label}
      </span>
    );
  }

  return (
    <div className={`border-l-4 ${style.border} ${style.bg} p-3 rounded-r-lg`}>
      <div className="flex items-start gap-2">
        <FontAwesomeIcon
          icon={style.icon}
          className={`h-4 w-4 ${style.iconColor} mt-0.5 flex-shrink-0`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`font-medium ${style.text}`}>{style.label}</p>
            <span className={`text-sm ${style.text} opacity-75`}>|</span>
            <span className={`text-sm ${style.text}`}>{dateRange}</span>
          </div>
          {vigencia.observacao && (
            <p className={`text-sm ${style.text} mt-1 opacity-90`}>{vigencia.observacao}</p>
          )}
        </div>
      </div>
    </div>
  );
}
