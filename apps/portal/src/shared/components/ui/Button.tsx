import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export const Button = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}: ButtonProps) => {
  const baseClasses =
    'font-semibold rounded-[10px] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary:
      'bg-landing-cta hover:bg-[#c2410c] text-white shadow-sm focus:ring-orange-500/40',
    secondary:
      'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 shadow-sm focus:ring-slate-400/30',
    tertiary:
      'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 focus:ring-slate-400/25',
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-2.5 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
