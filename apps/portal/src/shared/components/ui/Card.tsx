import { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  children: ReactNode;
  title?: ReactNode;
}

export const Card = ({ children, className = '', title, ...props }: CardProps) => {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200/90 shadow-card p-6 sm:p-8 hover:shadow-card-hover transition-shadow duration-200 ${className}`}
      {...props}
    >
      {title ? <h2 className="mb-4 text-lg font-semibold text-slate-800">{title}</h2> : null}
      {children}
    </div>
  );
};
