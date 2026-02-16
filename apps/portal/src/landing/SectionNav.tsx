import type { ReactNode } from 'react';

type SectionLink = {
  id: string;
  label: string;
};

const SECTIONS: SectionLink[] = [
  { id: 'video', label: 'Fluxo em vídeo' },
  { id: 'beneficios', label: 'Benefícios' },
  { id: 'modulos', label: 'Módulos' },
  { id: 'para-quem-e', label: 'Para quem é' },
  { id: 'confianca', label: 'Confiança' },
  { id: 'proximo-passo', label: 'Próximo passo' },
];

type SectionNavProps = {
  className?: string;
  beforeContent?: ReactNode;
  afterContent?: ReactNode;
};

export function SectionNav({ className = '', beforeContent, afterContent }: SectionNavProps) {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    event.preventDefault();
    const target = document.getElementById(targetId);
    if (!target) return;

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav
      className={`border-b border-slate-200/70 bg-white/80 backdrop-blur sticky top-16 z-40 ${className}`.trim()}
      aria-label="Navegação das seções da página O Produto"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {beforeContent}
        <div className="flex items-center gap-3 py-3 overflow-x-auto no-scrollbar">
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              onClick={(event) => handleClick(event, section.id)}
              className="flex-shrink-0 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:border-landing-accent hover:text-landing-accent transition-colors"
            >
              {section.label}
            </a>
          ))}
        </div>
        {afterContent}
      </div>
    </nav>
  );
}

