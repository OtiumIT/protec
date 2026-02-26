const LIMITE_ISENTO = 600_000;
const LIMITE_PROGRESSIVA = 1_200_000;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

type FaixaVisual = 'isento' | 'progressiva' | 'fixa_10';

function getFaixaFromBcc(bcc: number): FaixaVisual {
  if (bcc <= LIMITE_ISENTO) return 'isento';
  if (bcc <= LIMITE_PROGRESSIVA) return 'progressiva';
  return 'fixa_10';
}

const FAIXA_STYLES: Record<FaixaVisual, { label: string; className: string }> = {
  isento: {
    label: 'Isento',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  progressiva: {
    label: 'Progressiva (até 10%)',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  fixa_10: {
    label: 'Fixa 10%',
    className: 'border-red-200 bg-red-50 text-red-800',
  },
};

type Props = {
  bcc: number;
};

export function IrpfBccCard({ bcc }: Props) {
  const faixa = getFaixaFromBcc(bcc);
  const style = FAIXA_STYLES[faixa];
  return (
    <div className={`rounded-lg border-2 p-4 ${style.className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs font-medium opacity-80">Base de Cálculo Combinada (BCC)</p>
          <p className="text-xl font-bold font-mono tabular-nums">{formatCurrency(Math.max(0, bcc))}</p>
          <p className="text-xs mt-1 opacity-80">
            RT + dividendos + outros isentos − exclusões
          </p>
        </div>
        <div className="shrink-0">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold border ${style.className}`}
          >
            {style.label}
          </span>
        </div>
      </div>
    </div>
  );
}
