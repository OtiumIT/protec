import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../../shared/components/layout/Layout';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { RuleCard } from '../components/RuleCard';
import { MODULES_INFO, type RuleModule } from '@shared/types/documentation';
import { allRules, getRulesByModule, searchRules } from '../data';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faCalculator,
  faChartBar,
  faBuilding,
  faFileAlt,
  faUserDollar,
  faBookOpen,
  faListAlt,
  faLock,
  faBook,
} from '@fortawesome/free-solid-svg-icons';

const moduleIcons: Record<string, any> = {
  'simulador-in-2306': faCalculator,
  'irpf-alta-renda': faUserDollar,
  'rating-validator': faChartBar,
  'simulador-imoveis': faBuilding,
  'editais-pgfn': faFileAlt,
};

export function Documentacao() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [selectedModule, setSelectedModule] = useState<RuleModule | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);

  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin' || isSuperAdmin;

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [authLoading, isAdmin, navigate]);

  const filteredRules = useMemo(() => {
    if (searchQuery.trim()) {
      const searchResults = searchRules(searchQuery);
      if (selectedModule === 'all') {
        return searchResults;
      }
      return searchResults.filter((r) => r.modulo === selectedModule);
    }

    if (selectedModule === 'all') {
      return allRules;
    }

    return getRulesByModule(selectedModule);
  }, [selectedModule, searchQuery]);

  const moduleCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allRules.length };
    MODULES_INFO.forEach((m) => {
      counts[m.key] = getRulesByModule(m.key).length;
    });
    return counts;
  }, []);

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <FontAwesomeIcon icon={faLock} className="h-12 w-12 text-slate-400 mb-4" />
          <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300">
            Acesso Restrito
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Esta area e restrita a administradores.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <FontAwesomeIcon icon={faBookOpen} className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Documentacao de Regras Tributarias
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Consulte todas as regras de calculo, formulas e embasamentos legais do sistema PROTEC.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-64 flex-shrink-0">
            <div className="sticky top-4 space-y-4">
              <div className="relative">
                <FontAwesomeIcon
                  icon={faSearch}
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Buscar regra..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 
                             rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                             placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <nav className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <FontAwesomeIcon icon={faListAlt} className="h-4 w-4" />
                    Modulos
                  </h3>
                </div>
                <div className="p-2">
                  <button
                    onClick={() => setSelectedModule('all')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between
                               transition-colors ${
                                 selectedModule === 'all'
                                   ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                   : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                               }`}
                  >
                    <span>Todos</span>
                    <span className="text-xs bg-slate-200 dark:bg-slate-600 px-2 py-0.5 rounded">
                      {moduleCounts.all}
                    </span>
                  </button>

                  {MODULES_INFO.map((moduleInfo) => {
                    const icon = moduleIcons[moduleInfo.key] ?? faFileAlt;
                    const count = moduleCounts[moduleInfo.key] ?? 0;
                    const isSelected = selectedModule === moduleInfo.key;

                    return (
                      <button
                        key={moduleInfo.key}
                        onClick={() => setSelectedModule(moduleInfo.key)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2
                                   transition-colors mt-1 ${
                                     isSelected
                                       ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                       : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                                   }`}
                      >
                        <FontAwesomeIcon icon={icon} className="h-4 w-4 flex-shrink-0" />
                        <span className="flex-1 truncate">{moduleInfo.nome}</span>
                        <span className="text-xs bg-slate-200 dark:bg-slate-600 px-2 py-0.5 rounded">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </nav>

              <button
                onClick={() => navigate('/documentacao/glossario')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-purple-50 dark:bg-purple-900/20 
                           rounded-lg border border-purple-200 dark:border-purple-800 
                           hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
              >
                <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                  <FontAwesomeIcon icon={faBook} className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-purple-800 dark:text-purple-200">
                    Glossario Tributario
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-400">
                    Termos tecnicos e siglas
                  </p>
                </div>
              </button>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
                  Sobre esta documentacao
                </h4>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Esta area contem todas as regras de calculo implementadas no sistema.
                  Cada regra inclui formula, embasamento legal e exemplos numericos
                  para facilitar a validacao e revisao.
                </p>
              </div>
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {filteredRules.length} regra{filteredRules.length !== 1 ? 's' : ''} encontrada
                {filteredRules.length !== 1 ? 's' : ''}
                {searchQuery && ` para "${searchQuery}"`}
              </p>
            </div>

            {filteredRules.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <FontAwesomeIcon
                  icon={faSearch}
                  className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4"
                />
                <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">
                  Nenhuma regra encontrada
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                  Tente ajustar os filtros ou a busca.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRules.map((rule) => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    expanded={expandedRuleId === rule.id}
                    onToggle={() =>
                      setExpandedRuleId(expandedRuleId === rule.id ? null : rule.id)
                    }
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </Layout>
  );
}
