import type { Alerta } from '@shared/types/documentation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faExclamationTriangle,
  faExclamationCircle,
  faTimesCircle,
} from '@fortawesome/free-solid-svg-icons';

interface AlertTagProps {
  alert: Alerta;
  compact?: boolean;
}

const alertStyles = {
  atencao: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-500',
    text: 'text-yellow-800',
    icon: faExclamationTriangle,
    iconColor: 'text-yellow-600',
    label: 'Atencao',
  },
  importante: {
    bg: 'bg-orange-50',
    border: 'border-orange-500',
    text: 'text-orange-800',
    icon: faExclamationCircle,
    iconColor: 'text-orange-600',
    label: 'Importante',
  },
  critico: {
    bg: 'bg-red-50',
    border: 'border-red-500',
    text: 'text-red-800',
    icon: faTimesCircle,
    iconColor: 'text-red-600',
    label: 'Critico',
  },
};

export function AlertTag({ alert, compact = false }: AlertTagProps) {
  const style = alertStyles[alert.tipo];

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 ${style.bg} ${style.text} text-xs rounded-md border ${style.border}`}
        title={alert.mensagem}
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
          <p className={`font-medium ${style.text}`}>{style.label}</p>
          <p className={`text-sm ${style.text} mt-1 opacity-90`}>{alert.mensagem}</p>
        </div>
      </div>
    </div>
  );
}

interface AlertListProps {
  alerts: Alerta[];
  compact?: boolean;
}

export function AlertList({ alerts, compact = false }: AlertListProps) {
  if (!alerts || alerts.length === 0) return null;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {alerts.map((alert, index) => (
          <AlertTag key={index} alert={alert} compact />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert, index) => (
        <AlertTag key={index} alert={alert} />
      ))}
    </div>
  );
}
