import type { NumericExample } from '@shared/types/documentation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalculator, faArrowRight, faCheckCircle } from '@fortawesome/free-solid-svg-icons';

interface ExampleCalculationProps {
  example: NumericExample;
}

function formatValue(value: number | string): string {
  if (typeof value === 'number') {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return String(value);
}

export function ExampleCalculation({ example }: ExampleCalculationProps) {
  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 
                    rounded-lg border border-green-200 dark:border-green-800 overflow-hidden">
      <div className="bg-green-100 dark:bg-green-900/40 px-4 py-3 border-b border-green-200 dark:border-green-800">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faCalculator} className="h-4 w-4 text-green-700 dark:text-green-400" />
          <h4 className="font-semibold text-green-900 dark:text-green-100">{example.titulo}</h4>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <h5 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
            Dados de Entrada
          </h5>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(example.dados_entrada).map(([key, value]) => (
              <div
                key={key}
                className="bg-white dark:bg-slate-800 px-3 py-2 rounded border border-green-200 dark:border-green-700"
              >
                <span className="text-xs text-slate-500 dark:text-slate-400 block">
                  {key.replace(/_/g, ' ')}
                </span>
                <span className="font-mono text-sm text-slate-900 dark:text-slate-100">
                  {formatValue(value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h5 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
            Passos do Calculo
          </h5>
          <div className="space-y-2">
            {example.passos.map((passo) => (
              <div
                key={passo.ordem}
                className="flex items-start gap-3 bg-white dark:bg-slate-800 p-3 rounded 
                           border border-green-200 dark:border-green-700"
              >
                <span
                  className="flex-shrink-0 w-6 h-6 rounded-full bg-green-600 text-white 
                             flex items-center justify-center text-xs font-bold"
                >
                  {passo.ordem}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {passo.descricao}
                  </p>
                  {passo.formula && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                      {passo.formula}
                    </p>
                  )}
                  {passo.calculo && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      <FontAwesomeIcon icon={faArrowRight} className="h-3 w-3 mr-1" />
                      {passo.calculo}
                    </p>
                  )}
                  <p className="text-sm font-semibold text-green-700 dark:text-green-400 mt-1">
                    {passo.resultado}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-green-200 dark:bg-green-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <FontAwesomeIcon icon={faCheckCircle} className="h-4 w-4 text-green-700 dark:text-green-400" />
            <h5 className="font-semibold text-green-900 dark:text-green-100">Resultado Final</h5>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(example.resultado_final).map(([key, value]) => (
              <div key={key} className="bg-white dark:bg-slate-800 px-3 py-2 rounded">
                <span className="text-xs text-slate-500 dark:text-slate-400 block">
                  {key.replace(/_/g, ' ')}
                </span>
                <span className="font-mono font-bold text-green-700 dark:text-green-400">
                  {formatValue(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
