// Utilitários compartilhados

export * from './masks.js';
export * from './fiscal-ipca.js';
export * from './email.js';
export * from './distribuicao-lucros-simulador.js';
export * from './precificador-simulador.js';
export * from './split-payment-simulador.js';
export * from './comparativo-regimes-simulador.js';

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
};
