import type { ReactNode } from 'react';

export interface FaqItem {
  question: string;
  answer: string;
}

export interface ModuloItem {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
}

export interface ProblemaItem {
  label: string;
  icon: ReactNode;
}

export interface SolucaoCard {
  title: string;
  description: string;
  icon: ReactNode;
}

export interface VantagemItem {
  title: string;
  description: string;
  icon: ReactNode;
}

export interface Partner {
  name: string;
  description: string;
  url: string;
}
