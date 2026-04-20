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
  const baseClasses = 'font-semibold rounded transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-[#1351b4] hover:bg-[#0c326f] text-white shadow-sm',
    secondary: 'bg-white text-slate-800 border border-[#d2dae2] hover:bg-slate-50 hover:border-slate-400 shadow-sm',
    tertiary: 'bg-white text-[#1351b4] hover:bg-blue-50 border border-[#1351b4]',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs font-bold uppercase tracking-tight',
    md: 'px-5 py-2.5 text-sm font-bold uppercase tracking-tight',
    lg: 'px-8 py-3.5 text-base font-black uppercase tracking-tight',
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
