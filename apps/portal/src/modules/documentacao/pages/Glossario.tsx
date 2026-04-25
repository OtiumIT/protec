import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBook,
  faSearch,
  faArrowLeft,
  faLock,
  faCoins,
  faChartLine,
  faBalanceScale,
  faBriefcase,
  faLightbulb,
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '@/shared/contexts/AuthContext';
import { glossarioTermos, categorias } from '../data/glossario';
import type { GlossarioTermo } from '@shared/types/documentation';

const categoriaIcons: Record<string, typeof faCoins> = {
  tributo: faCoins,
  indicador: faChartLine,
  regime: faBalanceScale,
  instrumento: faBriefcase,
  conceito: faLightbulb,
};

const categoriaColors: Record<string, { bg: string; text: string; border: string }> = {
  tributo: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-300',
  },
  indicador: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-300',
  },
  regime: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-300',
  },
  instrumento: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-300',
  },
  conceito: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
  },
};

function TermoCard({ termo }: { termo: GlossarioTermo }) {
  const colors = categoriaColors[termo.categoria];
  const icon = categoriaIcons[termo.categoria];
  const categoria = categorias.find((c) => c.key === termo.categoria);

  return (
    <div
      className={`border ${colors.border} rounded-lg overflow-hidden hover:shadow-md transition-shadow`}
    >
      <div className={`${colors.bg} px-4 py-3 border-b ${colors.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={icon} className={`h-4 w-4 ${colors.text}`} />
            <span className={`text-xs font-medium ${colors.text}`}>{categoria?.nome}</span>
          </div>
          <span
            className={`text-lg font-bold ${colors.text} bg-white px-2 py-0.5 rounded`}
          >
            {termo.sigla}
          </span>
        </div>
      </div>
      <div className="p-4 bg-white">
        <h3 className="font-semibold text-slate-900 mb-2">
          {termo.nome_completo}
        </h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          {termo.descricao}
        </p>
      </div>
    </div>
  );
}

export function Glossario() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin' || isSuperAdmin;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string | null>(null);

  const filteredTermos = useMemo(() => {
    let result = glossarioTermos;

    if (selectedCategoria) {
      result = result.filter((t) => t.categoria === selectedCategoria);
    }

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      result = result.filter(
        (t) =>
          t.sigla.toLowerCase().includes(search) ||
          t.nome_completo.toLowerCase().includes(search) ||
          t.descricao.toLowerCase().includes(search)
      );
    }

    return result.sort((a, b) => a.sigla.localeCompare(b.sigla));
  }, [searchTerm, selectedCategoria]);

  if (authLoading) {
    return (
      <>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <FontAwesomeIcon icon={faLock} className="h-12 w-12 text-slate-400 mb-4" />
          <h2 className="text-xl font-semibold text-slate-700">
            Acesso Restrito
          </h2>
          <p className="text-slate-500 mt-2">
            Esta area e restrita a administradores.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-6">
          <button
            onClick={() => navigate('/documentacao')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 
                       transition-colors mb-4"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
            Voltar para Documentacao
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FontAwesomeIcon icon={faBook} className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Glossario Tributario
              </h1>
              <p className="text-slate-600">
                {glossarioTermos.length} termos tecnicos
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <FontAwesomeIcon
              icon={faSearch}
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
            />
            <input
              type="text"
              placeholder="Buscar termos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 
                         rounded-lg bg-white text-slate-900
                         focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategoria(null)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${
                  selectedCategoria === null
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
            >
              Todos
            </button>
            {categorias.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategoria(cat.key)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2
                  ${
                    selectedCategoria === cat.key
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
              >
                <FontAwesomeIcon icon={categoriaIcons[cat.key]} className="h-3 w-3" />
                {cat.nome}
              </button>
            ))}
          </div>
        </div>

        {filteredTermos.length === 0 ? (
          <div className="text-center py-12">
            <FontAwesomeIcon icon={faBook} className="h-12 w-12 text-slate-300 mb-4" />
            <p className="text-slate-500">Nenhum termo encontrado.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTermos.map((termo) => (
              <TermoCard key={termo.sigla} termo={termo} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
