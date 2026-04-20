import { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  children: ReactNode;
  title?: ReactNode;
  accent?: boolean;
}

export const Card = ({ children, className = '', title, accent = false, ...props }: CardProps) => {
  return (
    <div
      className={`card-gov ${accent ? 'card-gov-accent' : ''} p-6 ${className}`}
      {...props}
    >
      {title ? <h2 className="mb-4 text-sm font-bold text-[#0c326f] uppercase tracking-wider">{title}</h2> : null}
      {children}
    </div>
  );
};
