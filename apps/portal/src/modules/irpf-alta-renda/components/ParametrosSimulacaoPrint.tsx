import type { RendimentoIsentoDividendo } from '@shared/core';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

type OutroIsentoInput = { descricao: string; valor: number };
type Lei7713Input = { descricao: string; valor_bruto: number; irrf: number };

interface ParametrosSimulacaoPrintProps {
  contribuinteNome: string;
  contribuinteCpf: string;
  ano: number;
  rendimentosTributaveis: number;
  dividendos: RendimentoIsentoDividendo[];
  lucrosAprovadosAte31dez2025: number;
  ganhoCapitalExcluido: number;
  rendimentosFiisExcluidos: number;
  outrosExcluidosArt16A: number;
  outrosIsentosQueEntramBase: OutroIsentoInput[];
  rendimentosLei7713: Lei7713Input[];
  optouAjusteAnualLei7713: boolean;
  impostoJaPagoRetencao: number;
  impostoJaPagoCarneLeao: number;
  impostoJaPagoAplicacoes: number;
  impostoAntecipadoDividendos: number;
  bccCalculado: number;
}

export function ParametrosSimulacaoPrint({
  contribuinteNome,
  contribuinteCpf,
  ano,
  rendimentosTributaveis,
  dividendos,
  lucrosAprovadosAte31dez2025,
  ganhoCapitalExcluido,
  rendimentosFiisExcluidos,
  outrosExcluidosArt16A,
  outrosIsentosQueEntramBase,
  rendimentosLei7713,
  optouAjusteAnualLei7713,
  impostoJaPagoRetencao,
  impostoJaPagoCarneLeao,
  impostoJaPagoAplicacoes,
  impostoAntecipadoDividendos,
  bccCalculado,
}: ParametrosSimulacaoPrintProps) {
  const totalDividendos = dividendos.reduce((s, d) => s + (d.valor ?? 0), 0);
  const totalOutrosIsentos = outrosIsentosQueEntramBase.reduce((s, i) => s + (i.valor ?? 0), 0);
  const totalLei7713Bruto = rendimentosLei7713.reduce((s, i) => s + (i.valor_bruto ?? 0), 0);
  const totalLei7713Irrf = rendimentosLei7713.reduce((s, i) => s + (i.irrf ?? 0), 0);

  return (
    <div className="keep space-y-4 mb-6">
      <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">
        Parâmetros da simulação (Etapa 2)
      </h3>

      <div className="grid grid-cols-1 gap-3 text-sm">
        <div>
          <p className="text-slate-500 text-xs">Contribuinte</p>
          <p className="font-medium text-slate-800">{contribuinteNome || '—'}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs">CPF</p>
          <p className="font-mono text-slate-800">{contribuinteCpf || '—'}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs">Ano</p>
          <p className="font-medium text-slate-800">{ano}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs">Rendimentos tributáveis</p>
          <p className="font-mono text-slate-800">{formatCurrency(rendimentosTributaveis)}</p>
        </div>
      </div>

      <div>
        <p className="text-slate-600 text-xs font-medium mb-2">Dividendos e lucros isentos (09/13)</p>
        <table className="w-full text-xs border border-slate-200 rounded overflow-hidden">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left p-2 font-medium text-slate-700">Tipo</th>
              <th className="text-left p-2 font-medium text-slate-700">Fonte</th>
              <th className="text-right p-2 font-medium text-slate-700">Valor</th>
            </tr>
          </thead>
          <tbody>
            {dividendos.filter((d) => (d.valor ?? 0) > 0).map((d, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="p-2">{d.codigo === '13' ? '13 – Sócio Simples' : '09 – Dividendos'}</td>
                <td className="p-2">{d.nome_fonte || '—'}</td>
                <td className="p-2 text-right font-mono">{formatCurrency(d.valor ?? 0)}</td>
              </tr>
            ))}
            {dividendos.filter((d) => (d.valor ?? 0) > 0).length === 0 && (
              <tr>
                <td colSpan={3} className="p-2 text-slate-500">
                  Nenhum
                </td>
              </tr>
            )}
            <tr className="bg-slate-50 font-medium">
              <td colSpan={2} className="p-2 text-slate-700">Total</td>
              <td className="p-2 text-right font-mono">{formatCurrency(totalDividendos)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-2 text-sm">
        <div>
          <p className="text-slate-500 text-xs">Lucros aprovados até 31/12/2025</p>
          <p className="font-mono text-slate-800">{formatCurrency(lucrosAprovadosAte31dez2025)}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs">Ganho de capital excluído</p>
          <p className="font-mono text-slate-800">{formatCurrency(ganhoCapitalExcluido)}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs">Rendimentos FIIs excluídos</p>
          <p className="font-mono text-slate-800">{formatCurrency(rendimentosFiisExcluidos)}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs">Outros excluídos Art. 16-A</p>
          <p className="font-mono text-slate-800">{formatCurrency(outrosExcluidosArt16A)}</p>
        </div>
      </div>

      <div>
        <p className="text-slate-600 text-xs font-medium mb-2">Outros isentos que entram na base</p>
        <table className="w-full text-xs border border-slate-200 rounded overflow-hidden">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left p-2 font-medium text-slate-700">Descrição</th>
              <th className="text-right p-2 font-medium text-slate-700">Valor</th>
            </tr>
          </thead>
          <tbody>
            {outrosIsentosQueEntramBase.filter((i) => (i.valor ?? 0) > 0).map((item, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="p-2">{item.descricao || '—'}</td>
                <td className="p-2 text-right font-mono">{formatCurrency(item.valor ?? 0)}</td>
              </tr>
            ))}
            {outrosIsentosQueEntramBase.filter((i) => (i.valor ?? 0) > 0).length === 0 && (
              <tr>
                <td colSpan={2} className="p-2 text-slate-500">
                  Nenhum
                </td>
              </tr>
            )}
            <tr className="bg-slate-50 font-medium">
              <td className="p-2 text-slate-700">Total</td>
              <td className="p-2 text-right font-mono">{formatCurrency(totalOutrosIsentos)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div>
        <p className="text-slate-600 text-xs font-medium mb-2">Lei 7.713 (tributação exclusiva na fonte)</p>
        <p className="text-slate-500 text-xs mb-2">
          Optou ajuste anual: {optouAjusteAnualLei7713 ? 'Sim' : 'Não'}
        </p>
        <table className="w-full text-xs border border-slate-200 rounded overflow-hidden">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left p-2 font-medium text-slate-700">Descrição</th>
              <th className="text-right p-2 font-medium text-slate-700">Valor bruto</th>
              <th className="text-right p-2 font-medium text-slate-700">IRRF</th>
            </tr>
          </thead>
          <tbody>
            {rendimentosLei7713.filter((i) => (i.valor_bruto ?? 0) > 0 || (i.irrf ?? 0) > 0).map((item, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="p-2">{item.descricao || '—'}</td>
                <td className="p-2 text-right font-mono">{formatCurrency(item.valor_bruto ?? 0)}</td>
                <td className="p-2 text-right font-mono">{formatCurrency(item.irrf ?? 0)}</td>
              </tr>
            ))}
            {rendimentosLei7713.filter((i) => (i.valor_bruto ?? 0) > 0 || (i.irrf ?? 0) > 0).length === 0 && (
              <tr>
                <td colSpan={3} className="p-2 text-slate-500">
                  Nenhum
                </td>
              </tr>
            )}
            <tr className="bg-slate-50 font-medium">
              <td className="p-2 text-slate-700">Total</td>
              <td className="p-2 text-right font-mono">{formatCurrency(totalLei7713Bruto)}</td>
              <td className="p-2 text-right font-mono">{formatCurrency(totalLei7713Irrf)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div>
        <p className="text-slate-600 text-xs font-medium mb-2">IR já pago (deduções)</p>
        <div className="grid grid-cols-1 gap-2 text-sm">
          <div>
            <span className="text-slate-500">Retenção na fonte:</span>{' '}
            <span className="font-mono">{formatCurrency(impostoJaPagoRetencao)}</span>
          </div>
          <div>
            <span className="text-slate-500">Carnê-leão:</span>{' '}
            <span className="font-mono">{formatCurrency(impostoJaPagoCarneLeao)}</span>
          </div>
          <div>
            <span className="text-slate-500">Aplicações financeiras:</span>{' '}
            <span className="font-mono">{formatCurrency(impostoJaPagoAplicacoes)}</span>
          </div>
          <div>
            <span className="text-slate-500">Antecipado dividendos:</span>{' '}
            <span className="font-mono">{formatCurrency(impostoAntecipadoDividendos)}</span>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-200">
        <p className="text-sm font-medium text-slate-800">
          Base de cálculo (BCC) = RT + dividendos + outros isentos − exclusões:{' '}
          <strong className="font-mono">{formatCurrency(bccCalculado)}</strong>
        </p>
      </div>
    </div>
  );
}
