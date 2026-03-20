import { useState, useEffect } from 'react';
import { Modal } from '../../../shared/components/ui/Modal';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { useToast } from '../../../shared/components/ui/Toast';
import { propertyService } from '../services/property.service';
import type { PropertyTransaction } from '@shared/core';

const CATEGORIAS: Record<string, string> = {
  aluguel: 'Aluguel',
  diarias: 'Diárias',
  iptu: 'IPTU',
  condominio: 'Condomínio',
  taxa_imobiliaria: 'Taxa Imobiliária',
  taxa_plataforma: 'Taxa Plataforma',
  reforma: 'Reforma',
  mobilia: 'Mobília',
  limpeza: 'Limpeza',
  energia: 'Energia',
  internet: 'Internet',
  taxa_intermediacao: 'Taxa Intermediação',
  outros: 'Outros',
};

const TIPOS = [
  { value: 'receita', label: 'Receita' },
  { value: 'despesa_dedutivel', label: 'Despesa Dedutível (PF)' },
  { value: 'custo_operacional', label: 'Custo Operacional (Reforma 2027)' },
] as const;

interface PropertyTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  identificador: string;
  ano: number;
  onTransactionsChanged?: () => void;
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

export function PropertyTransactionsModal({
  isOpen,
  onClose,
  propertyId,
  identificador,
  ano,
  onTransactionsChanged,
}: PropertyTransactionsModalProps) {
  const { success, error: showError } = useToast();
  const [transactions, setTransactions] = useState<PropertyTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTxFormOpen, setIsTxFormOpen] = useState(false);
  const [formTx, setFormTx] = useState({
    mes_referencia: `${ano}-01`,
    tipo: 'receita' as 'receita' | 'despesa_dedutivel' | 'custo_operacional',
    categoria: 'aluguel',
    valor: '0',
    observacao: '',
  });
  const [modoEntrada, setModoEntrada] = useState<'detalhado' | 'reduzido'>('detalhado');

  useEffect(() => {
    if (!isOpen || !propertyId) return;
    let cancelled = false;
    setIsLoading(true);
    Promise.all([
      propertyService.getById(propertyId),
      propertyService.listTransactions(propertyId, { ano }),
    ])
      .then(([property, txs]) => {
        if (cancelled) return;
        const mod = (property as { modo_entrada?: 'detalhado' | 'reduzido' })?.modo_entrada ?? 'detalhado';
        setModoEntrada(mod);
        setTransactions(txs);
        setFormTx((f) => ({ ...f, mes_referencia: `${ano}-01` }));
      })
      .catch(() => {
        if (!cancelled) showError('Erro ao carregar lançamentos');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [isOpen, propertyId, ano, showError]);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await propertyService.addTransaction(propertyId, {
        mes_referencia: formTx.mes_referencia,
        tipo: formTx.tipo,
        categoria: formTx.categoria,
        valor: Math.round(parseFloat(formTx.valor || '0') * 100) / 100,
        observacao: formTx.observacao || undefined,
      });
      const txs = await propertyService.listTransactions(propertyId, { ano });
      setTransactions(txs);
      setIsTxFormOpen(false);
      setFormTx({ mes_referencia: `${ano}-01`, tipo: 'receita', categoria: 'aluguel', valor: '0', observacao: '' });
      success('Lançamento adicionado');
      onTransactionsChanged?.();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao adicionar');
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (!confirm('Excluir este lançamento?')) return;
    try {
      await propertyService.deleteTransaction(propertyId, txId);
      const txs = await propertyService.listTransactions(propertyId, { ano });
      setTransactions(txs);
      success('Lançamento excluído');
      onTransactionsChanged?.();
    } catch {
      showError('Erro ao excluir');
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Lançamentos — ${identificador} (${ano})`}
    >
      {modoEntrada === 'reduzido' ? (
        <p className="text-sm text-slate-600">
          Este imóvel usa modo reduzido (totais mensais). Para editar os valores, acesse os detalhes do imóvel.
        </p>
      ) : (
        <div className="space-y-4">
          {isLoading ? (
            <p className="text-slate-500 py-4">Carregando...</p>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">
                  {transactions.length} lançamento(s) em {ano}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsTxFormOpen(true)}
                >
                  Novo lançamento
                </Button>
              </div>

              {transactions.length === 0 && !isTxFormOpen ? (
                <p className="text-slate-500 py-4">
                  Nenhum lançamento neste ano. Clique em &quot;Novo lançamento&quot; para adicionar.
                </p>
              ) : (
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 px-3 font-semibold">Mês</th>
                        <th className="text-left py-2 px-3 font-semibold">Tipo</th>
                        <th className="text-left py-2 px-3 font-semibold">Categoria</th>
                        <th className="text-right py-2 px-3 font-semibold">Valor</th>
                        <th className="w-16" />
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="border-b border-slate-100">
                          <td className="py-2 px-3">{tx.mes_referencia}</td>
                          <td className="py-2 px-3">{TIPOS.find((t) => t.value === tx.tipo)?.label}</td>
                          <td className="py-2 px-3">{CATEGORIAS[tx.categoria] ?? tx.categoria}</td>
                          <td className="py-2 px-3 text-right font-medium">{formatCurrency(tx.valor)}</td>
                          <td className="py-2 px-3">
                            <button
                              type="button"
                              onClick={() => handleDeleteTransaction(tx.id)}
                              className="text-red-600 hover:text-red-700 text-xs"
                            >
                              Excluir
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {isTxFormOpen && (
                <form onSubmit={handleAddTransaction} className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                  <p className="text-sm font-medium text-slate-700">Novo lançamento</p>
                  <Input
                    label="Mês (YYYY-MM)"
                    type="month"
                    value={formTx.mes_referencia}
                    onChange={(e) =>
                      setFormTx({ ...formTx, mes_referencia: e.target.value })
                    }
                    required
                  />
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                    <select
                      className="w-full border border-slate-200 rounded-lg px-4 py-2"
                      value={formTx.tipo}
                      onChange={(e) =>
                        setFormTx({
                          ...formTx,
                          tipo: e.target.value as typeof formTx.tipo,
                        })
                      }
                    >
                      {TIPOS.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                    <select
                      className="w-full border border-slate-200 rounded-lg px-4 py-2"
                      value={formTx.categoria}
                      onChange={(e) =>
                        setFormTx({ ...formTx, categoria: e.target.value })
                      }
                    >
                      {Object.entries(CATEGORIAS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input
                    label="Valor (R$)"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formTx.valor}
                    onChange={(e) => setFormTx({ ...formTx, valor: e.target.value })}
                    required
                  />
                  <div className="flex gap-2">
                    <Button type="submit" variant="secondary" size="sm">
                      Adicionar
                    </Button>
                    <Button
                      type="button"
                      variant="tertiary"
                      size="sm"
                      onClick={() => setIsTxFormOpen(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
