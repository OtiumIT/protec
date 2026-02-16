import { useState } from 'react';
import type { FaqItem } from './types';

const faqs: FaqItem[] = [
  {
    question: 'Preciso instalar algo para usar o sistema?',
    answer:
      'Não. O sistema é SaaS e roda diretamente no navegador. Basta ter acesso à internet para entrar com seu usuário e senha.',
  },
  {
    question: 'Quais arquivos posso subir hoje?',
    answer:
      'Você pode armazenar e organizar arquivos SPED, ECD, PGDAS, XML e PDFs vinculados a cada cliente e competência.',
  },
  {
    question: 'Meus dados e os dados dos clientes ficam seguros?',
    answer:
      'Sim. Cada empresa tem seus dados isolados por tenant (company_id), com controle de acesso por usuário, garantindo rastreabilidade e segurança total.',
  },
  {
    question: 'Posso começar com poucos clientes primeiro?',
    answer:
      'Sim. O sistema foi pensado para que você possa iniciar com uma base real e escalar conforme sua necessidade e volume de operação.',
  },
  {
    question: 'As simulações tributárias são baseadas em quais normas?',
    answer:
      'Toda a inteligência algorítmica é construída e atualizada com base em regras fiscais e editais vigentes, como a Portaria 6.757/2022 e a IN 2.306/2026.',
  },
  {
    question: 'Como funciona o suporte técnico?',
    answer:
      'Oferecemos suporte especializado para garantir que você extraia o máximo da plataforma, com canais de atendimento direto para tirar dúvidas sobre módulos e funcionalidades.',
  },
];

export interface FAQProps {
  /** Subset de perguntas (ex.: página O Produto). Se não informado, usa a lista completa. */
  items?: FaqItem[];
}

export function FAQ({ items: customItems }: FAQProps = {}) {
  const items = customItems ?? faqs;

  // Divide os itens em duas colunas independentes para evitar que o acordeão
  // da esquerda "puxe" a altura da direita e pareça um card vazio aberto.
  const middleIndex = Math.ceil(items.length / 2);
  const leftItems = items.slice(0, middleIndex);
  const rightItems = items.slice(middleIndex);

  const [openLeftIndex, setOpenLeftIndex] = useState<number | null>(null);
  const [openRightIndex, setOpenRightIndex] = useState<number | null>(null);

  const renderItem = (
    item: FaqItem,
    index: number,
    column: 'left' | 'right',
    isOpen: boolean,
    toggle: () => void,
  ) => {
    const idPrefix = `faq-${column}-${index}`;

    return (
      <div
        key={`${idPrefix}-${item.question}`}
        className="overflow-hidden rounded-[12px] border border-slate-200/80 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-200 hover:shadow-[0_6px_20px_rgba(0,0,0,0.1)] hover:border-slate-300"
      >
        <button
          type="button"
          onClick={toggle}
          className="flex w-full items-center justify-between gap-4 py-6 px-5 text-left"
          aria-expanded={isOpen}
          aria-controls={`${idPrefix}-answer`}
          id={`${idPrefix}-question`}
        >
          <span className="text-sm font-semibold text-slate-900">
            {item.question}
          </span>
          <span
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center text-slate-500 transition-transform duration-300 ease-in-out"
            style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            aria-hidden
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </span>
        </button>
        <div
          id={`${idPrefix}-answer`}
          role="region"
          aria-labelledby={`${idPrefix}-question`}
          className="grid transition-[grid-template-rows] duration-200 ease-out"
          style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
        >
          <div
            className={`min-h-0 overflow-hidden transition-colors duration-200 ${
              isOpen ? 'bg-[#f9f9f9]' : 'bg-transparent'
            }`}
          >
            <p className="border-t border-slate-100 px-5 py-6 pt-4 text-sm leading-relaxed text-slate-600">
              {item.answer}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section id="faq" className="py-12 sm:py-16 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Perguntas frequentes
          </h2>
          <p className="mt-2 text-slate-600">
            Respostas rápidas para as dúvidas mais comuns antes de começar.
          </p>
        </div>
        <div className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            {leftItems.map((item, index) =>
              renderItem(
                item,
                index,
                'left',
                openLeftIndex === index,
                () =>
                  setOpenLeftIndex((prev) =>
                    prev === index ? null : index,
                  ),
              ),
            )}
          </div>
          <div className="space-y-4">
            {rightItems.map((item, index) =>
              renderItem(
                item,
                index,
                'right',
                openRightIndex === index,
                () =>
                  setOpenRightIndex((prev) =>
                    prev === index ? null : index,
                  ),
              ),
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
