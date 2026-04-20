import { HTMLAttributes, ReactNode } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'info' | 'warning' | 'error' | 'default';
  children: ReactNode;
}

export const Badge = ({ variant = 'default', children, className = '', ...props }: BadgeProps) => {
  const variantClasses = {
    success: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
    error: 'bg-rose-100 text-rose-800 border-rose-200',
    default: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <span
      className={`badge-gov border ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
