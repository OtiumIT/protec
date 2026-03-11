import { Link } from 'react-router-dom';

const LOGO_IATAX_SRC = '/logo-iatax.png';

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
  const label = variant === 'iatax' ? 'IATax Soluções Inteligentes' : 'Logo';

  return (
    <Link
      to="/"
      className={`flex items-center gap-2.5 min-w-0 ${className}`}
      aria-label="Ir para o início"
      onClick={onClick}
    >
      <img
        src={LOGO_IATAX_SRC}
        alt=""
        className="h-9 w-9 flex-shrink-0 object-contain"
        aria-hidden
      />
      <span className={`text-base font-semibold truncate ${textClass}`}>{label}</span>
    </Link>
  );
}
