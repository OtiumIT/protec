import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { fetchPublicStatement, type StatementData } from '../services/gestao-imobiliaria.service';

const brl = (n: number) => (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Página pública read-only da prestação de contas (acessada por token, sem login). */
export function PrestacaoContasPublica() {
  const location = useLocation();
  const token = new URLSearchParams(location.search).get('token') ?? '';
  const [state, setState] = useState<{ loading: boolean; error?: string; share?: { title: string | null; period_from: string; period_to: string }; statement?: StatementData }>({ loading: true });

  useEffect(() => {
    if (!token) { setState({ loading: false, error: 'Link inválido.' }); return; }
    fetchPublicStatement(token)
      .then((d) => setState({ loading: false, share: d.share, statement: d.statement }))
      .catch((e) => setState({ loading: false, error: e instanceof Error ? e.message : 'Não foi possível abrir a prestação de contas.' }));
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <span className="text-xl font-extrabold tracking-tight text-slate-900">iaTax</span>
          <span className="text-xs text-slate-500">Prestação de contas · somente leitura</span>
        </div>

        {state.loading && <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">Carregando…</div>}
        {state.error && <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-700">{state.error}</div>}

        {state.statement && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3">
              <div>
                <div className="text-lg font-bold">{state.share?.title ?? 'Prestação de contas'}</div>
                <div className="text-xs text-slate-500">{state.share?.period_from} → {state.share?.period_to}</div>
              </div>
              <span className="font-bold text-indigo-700">iaTax</span>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm"><span>Receitas</span><strong>{brl(state.statement.resumo.receitas)}</strong></div>
              <div className="flex justify-between text-sm"><span>Despesas</span><strong>− {brl(state.statement.resumo.despesas)}</strong></div>
              <div className="flex justify-between rounded-lg bg-slate-900 px-3 py-2 font-bold text-white"><span>Resultado líquido</span><span>{brl(state.statement.resumo.resultado_liquido)}</span></div>
            </div>
            <div className="mt-5">
              <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Detalhamento por imóvel</div>
              {state.statement.imoveis.map((i) => (
                <div key={i.property_id} className="flex justify-between border-t border-slate-100 py-2 text-sm">
                  <span>{i.identificador}</span><strong>{brl(i.resultado)}</strong>
                </div>
              ))}
              {state.statement.imoveis.length === 0 && <p className="py-2 text-sm text-slate-400">Sem lançamentos no período.</p>}
            </div>
            <p className="mt-6 text-[11px] leading-relaxed text-slate-400">
              Documento gerado pelo iaTax a partir dos lançamentos registrados pelo escritório contábil.
              Não constitui parecer contábil, jurídico ou fiscal.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PrestacaoContasPublica;
