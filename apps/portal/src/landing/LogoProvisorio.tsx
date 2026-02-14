import { Link } from 'react-router-dom';

/** Logo para a landing. dark = para uso em header/footer escuro (texto claro). variant = "iatax" exibe "IATax Soluções Inteligentes" no header. */
export function LogoProvisorio({
  className = '',
  onClick,
  dark = false,
  variant = 'default',
}: {
  className?: string;
  onClick?: () => void;
  dark?: boolean;
  variant?: 'default' | 'iatax';
}) {
  const textClass = dark ? 'text-white' : 'text-slate-800';
  const iconBg = dark ? 'bg-white/20' : 'bg-landing-accent';
  const iconText = dark ? 'text-white' : 'text-white';
  const label = variant === 'iatax' ? 'IATax Soluções Inteligentes' : 'Logo';

  return (
    <Link
      to="/"
      className={`flex items-center gap-2.5 min-w-0 ${className}`}
      aria-label="Ir para o início"
      onClick={onClick}
    >
      <div
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${iconBg} ${iconText} shadow-sm`}
        aria-hidden
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
        </svg>
      </div>
      <span className={`text-base font-semibold truncate ${textClass}`}>{label}</span>
    </Link>
  );
}
