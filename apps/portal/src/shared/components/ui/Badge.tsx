import { HTMLAttributes, ReactNode } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'info' | 'warning' | 'error' | 'default';
  children: ReactNode;
}

export const Badge = ({ variant = 'default', children, className = '', ...props }: BadgeProps) => {
  const variantClasses = {
    success: 'bg-green-100 text-green-800',
    info: 'bg-blue-100 text-blue-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    default: 'bg-slate-100 text-slate-800',
  };

  return (
    <span
      className={`px-4 py-2 rounded-full text-sm font-semibold ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
