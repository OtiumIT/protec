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
  const [localExpanded, setLocalExpanded] = useState(expanded);
  const moduleInfo = MODULES_INFO.find((m) => m.key === rule.modulo);
  const icon = moduleIcons[rule.modulo] ?? faFileAlt;
  const color = moduleColors[rule.modulo] ?? 'gray';

  // Usa prop expanded quando onToggle é fornecido, senão usa estado local
  const isExpanded = onToggle ? expanded : localExpanded;

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setLocalExpanded(!localExpanded);
    }
  };

  const colorClasses: Record<string, { bg: string; border: string; text: string; badge: string }> = {
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      badge: 'bg-blue-100 text-blue-800',
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-700',
      badge: 'bg-purple-100 text-purple-800',
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      badge: 'bg-green-100 text-green-800',
    },
    orange: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-700',
      badge: 'bg-orange-100 text-orange-800',
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      badge: 'bg-red-100 text-red-800',
    },
    gray: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-700',
      badge: 'bg-gray-100 text-gray-800',
    },
  };

  const colors = colorClasses[color] ?? colorClasses.gray;

  const hasAlerts = rule.alertas && rule.alertas.length > 0;

  return (
    <div className={`rounded-lg border ${colors.border} overflow-hidden transition-all duration-200 shadow-sm`}>
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
              <h3 className="font-semibold text-slate-900 truncate">
                {rule.nome}
              </h3>
              {hasAlerts && (
                <span className="flex-shrink-0 w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-slate-600 truncate">
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
        <div className="p-4 space-y-6 bg-white border-t border-slate-100">
          {rule.alertas && rule.alertas.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">
                Alertas
              </h4>
              <AlertList alerts={rule.alertas} />
            </div>
          )}

          {rule.vigencia && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">
                Vigencia
              </h4>
              <VigenciaTag vigencia={rule.vigencia} />
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">
              Descricao
            </h4>
            <p className="text-slate-600">{rule.descricao}</p>
          </div>

          {rule.formula && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">
                Formula
              </h4>
              <FormulaDisplay formula={rule.formula} block />
              {rule.formula_explicada && (
                <p className="text-sm text-slate-500 mt-2 italic">
                  {rule.formula_explicada}
                </p>
              )}
            </div>
          )}

          {rule.variaveis.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">
                Variaveis
              </h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                        Variavel
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                        Descricao
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                        Tipo
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                        Exemplo
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {rule.variaveis.map((v, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-mono text-sm text-slate-900">
                          {v.nome}
                        </td>
                        <td className="px-3 py-2 text-sm text-slate-600">
                          {v.descricao}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex px-2 py-0.5 text-xs rounded ${colors.badge}`}>
                            {v.tipo}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-sm text-slate-500">
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
              <h4 className="text-sm font-semibold text-slate-700 mb-2">
                Embasamento Legal
              </h4>
              <LegalBasisList bases={rule.embasamento_legal} />
            </div>
          )}

          {rule.exemplo_numerico && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">
                Exemplo Numerico
              </h4>
              <ExampleCalculation example={rule.exemplo_numerico} />
            </div>
          )}

          {rule.observacoes && rule.observacoes.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">
                Observacoes
              </h4>
              <ul className="space-y-1">
                {rule.observacoes.map((obs, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="text-slate-400 mt-1">-</span>
                    <span>{obs}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {rule.historico && rule.historico.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <FontAwesomeIcon icon={faHistory} className="h-3 w-3" />
                Historico de Alteracoes
              </h4>
              <div className="space-y-2">
                {rule.historico.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 text-sm bg-slate-50 p-2 rounded border border-slate-100"
                  >
                    <span className="text-slate-500 font-mono">
                      {item.data}
                    </span>
                    <span className="text-slate-400">v{item.versao}</span>
                    <span className="text-slate-600">
                      {item.descricao}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-200">
            {rule.tags && rule.tags.length > 0 && (
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faTag} className="h-3 w-3 text-slate-400" />
                <div className="flex flex-wrap gap-1">
                  {rule.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 text-xs bg-slate-100 
                                 text-slate-600 rounded border border-slate-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <FontAwesomeIcon icon={faClock} className="h-3 w-3" />
              <span>Atualizado em {rule.ultima_atualizacao}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
