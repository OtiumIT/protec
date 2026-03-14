import type { RuleDocumentation } from '@shared/types/documentation';
import { MODULES_INFO } from '@shared/types/documentation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalculator,
  faChartBar,
  faBuilding,
  faFileAlt,
  faMoneyBillWave,
  faChevronDown,
  faChevronUp,
  faClock,
  faTag,
  faHistory,
} from '@fortawesome/free-solid-svg-icons';
import { useState } from 'react';
import { FormulaDisplay } from './FormulaDisplay';
import { LegalBasisList } from './LegalBasisTag';
import { ExampleCalculation } from './ExampleCalculation';
import { AlertList } from './AlertTag';
import { VigenciaTag } from './VigenciaTag';

const moduleIcons: Record<string, any> = {
  'simulador-in-2306': faCalculator,
  'irpf-alta-renda': faMoneyBillWave,
  'rating-validator': faChartBar,
  'simulador-imoveis': faBuilding,
  'editais-pgfn': faFileAlt,
};

const moduleColors: Record<string, string> = {
  'simulador-in-2306': 'blue',
  'irpf-alta-renda': 'purple',
  'rating-validator': 'green',
  'simulador-imoveis': 'orange',
  'editais-pgfn': 'red',
};

interface RuleCardProps {
  rule: RuleDocumentation;
  expanded?: boolean;
  onToggle?: () => void;
}

export function RuleCard({ rule, expanded = false, onToggle }: RuleCardProps) {
  const [isExpanded, setIsExpanded] = useState(expanded);
  const moduleInfo = MODULES_INFO.find((m) => m.key === rule.modulo);
  const icon = moduleIcons[rule.modulo] ?? faFileAlt;
  const color = moduleColors[rule.modulo] ?? 'gray';

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  const colorClasses: Record<string, { bg: string; border: string; text: string; badge: string }> = {
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-700 dark:text-blue-300',
      badge: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200',
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      border: 'border-purple-200 dark:border-purple-800',
      text: 'text-purple-700 dark:text-purple-300',
      badge: 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200',
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-700 dark:text-green-300',
      badge: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200',
    },
    orange: {
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      border: 'border-orange-200 dark:border-orange-800',
      text: 'text-orange-700 dark:text-orange-300',
      badge: 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200',
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-700 dark:text-red-300',
      badge: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200',
    },
    gray: {
      bg: 'bg-gray-50 dark:bg-gray-900/20',
      border: 'border-gray-200 dark:border-gray-800',
      text: 'text-gray-700 dark:text-gray-300',
      badge: 'bg-gray-100 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200',
    },
  };

  const colors = colorClasses[color] ?? colorClasses.gray;

  const hasAlerts = rule.alertas && rule.alertas.length > 0;

  return (
    <div className={`rounded-lg border ${colors.border} overflow-hidden transition-all duration-200`}>
      <button
        onClick={handleToggle}
        className={`w-full ${colors.bg} px-4 py-4 flex items-center justify-between 
                   hover:opacity-90 transition-opacity text-left`}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${colors.badge} 
                          flex items-center justify-center`}>
            <FontAwesomeIcon icon={icon} className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {rule.nome}
              </h3>
              {hasAlerts && (
                <span className="flex-shrink-0 w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                {moduleInfo?.nome ?? rule.modulo}
              </p>
              {rule.vigencia && (
                <VigenciaTag vigencia={rule.vigencia} compact />
              )}
            </div>
          </div>
        </div>
        <FontAwesomeIcon
          icon={isExpanded ? faChevronUp : faChevronDown}
          className="h-4 w-4 text-slate-400 flex-shrink-0 ml-2"
        />
      </button>

      {isExpanded && (
        <div className="p-4 space-y-6 bg-white dark:bg-slate-900">
          {rule.alertas && rule.alertas.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Alertas
              </h4>
              <AlertList alerts={rule.alertas} />
            </div>
          )}

          {rule.vigencia && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Vigencia
              </h4>
              <VigenciaTag vigencia={rule.vigencia} />
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Descricao
            </h4>
            <p className="text-slate-600 dark:text-slate-400">{rule.descricao}</p>
          </div>

          {rule.formula && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Formula
              </h4>
              <FormulaDisplay formula={rule.formula} block />
              {rule.formula_explicada && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 italic">
                  {rule.formula_explicada}
                </p>
              )}
            </div>
          )}

          {rule.variaveis.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Variaveis
              </h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                        Variavel
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                        Descricao
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                        Tipo
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                        Exemplo
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {rule.variaveis.map((v, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-mono text-sm text-slate-900 dark:text-slate-100">
                          {v.nome}
                        </td>
                        <td className="px-3 py-2 text-sm text-slate-600 dark:text-slate-400">
                          {v.descricao}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex px-2 py-0.5 text-xs rounded ${colors.badge}`}>
                            {v.tipo}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-sm text-slate-500 dark:text-slate-400">
                          {v.exemplo ?? '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {rule.embasamento_legal.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Embasamento Legal
              </h4>
              <LegalBasisList bases={rule.embasamento_legal} />
            </div>
          )}

          {rule.exemplo_numerico && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Exemplo Numerico
              </h4>
              <ExampleCalculation example={rule.exemplo_numerico} />
            </div>
          )}

          {rule.observacoes && rule.observacoes.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Observacoes
              </h4>
              <ul className="space-y-1">
                {rule.observacoes.map((obs, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <span className="text-slate-400 mt-1">-</span>
                    <span>{obs}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {rule.historico && rule.historico.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                <FontAwesomeIcon icon={faHistory} className="h-3 w-3" />
                Historico de Alteracoes
              </h4>
              <div className="space-y-2">
                {rule.historico.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 text-sm bg-slate-50 dark:bg-slate-800 p-2 rounded"
                  >
                    <span className="text-slate-500 dark:text-slate-400 font-mono">
                      {item.data}
                    </span>
                    <span className="text-slate-400">v{item.versao}</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {item.descricao}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            {rule.tags && rule.tags.length > 0 && (
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faTag} className="h-3 w-3 text-slate-400" />
                <div className="flex flex-wrap gap-1">
                  {rule.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 
                                 text-slate-600 dark:text-slate-400 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <FontAwesomeIcon icon={faClock} className="h-3 w-3" />
              <span>Atualizado em {rule.ultima_atualizacao}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
