import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface FormulaDisplayProps {
  formula: string;
  block?: boolean;
  className?: string;
}

export function FormulaDisplay({ formula, block = false, className = '' }: FormulaDisplayProps) {
  const cleanFormula = formula
    .replace(/\\;/g, '\\,')
    .replace(/\\_/g, '_')
    .replace(/\\%/g, '\\%');

  if (block) {
    return (
      <div className={`bg-slate-100 p-4 rounded-lg overflow-x-auto border border-slate-200 ${className}`}>
        <BlockMath math={cleanFormula} />
      </div>
    );
  }

  return (
    <span className={className}>
      <InlineMath math={cleanFormula} />
    </span>
  );
}
