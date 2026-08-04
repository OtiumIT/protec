import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '../../../shared/components/ui/Card';
import { getApiUrl } from '../../../shared/services/api';

interface ShareData {
  simulation: {
    id: string;
    ano: number;
    input_data: Record<string, unknown>;
    result_data: Record<string, unknown>;
    title: string | null;
    created_at: string;
  };
  share: {
    title: string | null;
    simulation_kind: string;
  };
  branding: {
    report_brand_name: string | null;
  };
}

function formatMoney(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function SimulacaoPublica() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setError('Token não informado');
      setLoading(false);
      return;
    }
    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/v1/properties/public/simulation/${encodeURIComponent(token)}`)
      .then((res) => {
        if (!res.ok) return res.json().then((j) => { throw new Error(j.error?.message || 'Erro'); });
        return res.json();
      })
      .then((json) => setData(json.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto mb-3" />
          <p className="text-slate-500">Carregando simulação...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="max-w-md p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.07 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Link indisponível</h2>
          <p className="text-slate-600">{error}</p>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const { simulation, share, branding } = data;
  const result = simulation.result_data as Record<string, unknown>;
  const cenarios = result.cenarios as Record<string, { imposto_total?: number; aliquota_efetiva?: number; aliquota_efetiva_anual?: number; dividendos?: { irrf_total?: number; lucro_liquido_socio?: number } }> | undefined;
  const brandName = branding?.report_brand_name || 'IATax Soluções Inteligentes';
  const isGanhoCapital = share.simulation_kind === 'ganho_capital_imovel';
  const title = share.title || simulation.title || (isGanhoCapital ? 'Ganho de Capital — Venda de Imóvel' : 'Simulação Tributária Imobiliária');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider">{brandName}</p>
            <h1 className="text-lg font-bold text-slate-900">{title}</h1>
          </div>
          <span className="text-xs text-slate-400">Ano-base: {simulation.ano}</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {cenarios && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {cenarios.pf && (
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-slate-600 mb-1">Pessoa Física</h3>
                <p className="text-2xl font-bold text-slate-800">{formatMoney(cenarios.pf.imposto_total ?? 0)}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Alíquota efetiva: {(cenarios.pf.aliquota_efetiva_anual ?? cenarios.pf.aliquota_efetiva ?? 0).toFixed(2)}%
                </p>
              </Card>
            )}
            {cenarios.pj && (
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-slate-600 mb-1">Pessoa Jurídica (LP)</h3>
                <p className="text-2xl font-bold text-slate-800">{formatMoney(cenarios.pj.imposto_total ?? 0)}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Alíquota efetiva: {(cenarios.pj.aliquota_efetiva ?? 0).toFixed(2)}%
                </p>
                {cenarios.pj.dividendos && (cenarios.pj.dividendos.irrf_total ?? 0) > 0 && (
                  <p className="text-xs text-violet-600 mt-1">
                    IRRF dividendos: {formatMoney(cenarios.pj.dividendos.irrf_total ?? 0)} — Líquido: {formatMoney(cenarios.pj.dividendos.lucro_liquido_socio ?? 0)}
                  </p>
                )}
              </Card>
            )}
            {(cenarios.reforma_2027_pf || cenarios.reforma_2027) && (() => {
              const ref = cenarios.reforma_2027_pf || cenarios.reforma_2027;
              if (!ref) return null;
              return (
                <Card className="p-4">
                  <h3 className="text-sm font-semibold text-slate-600 mb-1">Reforma IBS/CBS</h3>
                  <p className="text-2xl font-bold text-slate-800">{formatMoney(ref.imposto_total ?? 0)}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Alíquota efetiva: {(ref.aliquota_efetiva ?? 0).toFixed(2)}%
                  </p>
                </Card>
              );
            })()}
          </div>
        )}

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Dados da simulação</h3>
          <div className="text-xs text-slate-600 space-y-1">
            <p>Ano-base: {simulation.ano}</p>
            <p>Tipo: {isGanhoCapital ? 'Ganho de Capital — Venda de Imóvel' : 'Locação — PF vs PJ vs Reforma'}</p>
            <p>Gerada em: {new Date(simulation.created_at).toLocaleDateString('pt-BR')}</p>
          </div>
        </Card>

        <footer className="text-center text-xs text-slate-400 py-4 border-t border-slate-200">
          <p>{brandName} — Documento gerado automaticamente</p>
          <p className="mt-1">Este link é de acesso público e somente leitura</p>
        </footer>
      </main>
    </div>
  );
}
