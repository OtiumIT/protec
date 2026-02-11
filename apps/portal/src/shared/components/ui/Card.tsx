import { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const Card = ({ children, className = '', ...props }: CardProps) => {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200 shadow-lg p-8 hover:shadow-xl transition-shadow duration-200 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
