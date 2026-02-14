import type { Partner } from './types';

/**
 * Faixa "Quem faz o IATax" – logos/nomes Protec e Otium.
 * Quando houver arquivos de logo em /public (ex.: logo-protec.png), adicionar logoSrc ao partner.
 */
const partners: Partner[] = [
  {
    name: 'Protec',
    description: 'Contabilidade, Assessoria e Consultoria',
    url: 'https://protec.cnt.br/',
  },
  {
    name: 'Otium',
    description: 'Tecnologia e produto',
    url: 'https://otiumit.com',
  },
];

export function WhoMakesIATax() {
  return (
    <div className="mt-10 pt-8 border-t border-slate-200">
      <h3 className="text-center text-sm font-semibold uppercase tracking-wider text-slate-500">
        Quem faz o IATax
      </h3>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-12">
        {partners.map((partner) => (
          <a
            key={partner.name}
            href={partner.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1 rounded-lg px-6 py-4 transition-colors hover:bg-slate-50"
          >
            <span className="text-lg font-bold text-slate-800">{partner.name}</span>
            <span className="text-xs text-slate-500">{partner.description}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
