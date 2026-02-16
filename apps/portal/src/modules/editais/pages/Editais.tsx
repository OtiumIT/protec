import { useState, useEffect } from 'react';
import { Layout } from '../../../shared/components/layout/Layout';
import { Card } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { MoneyInput } from '../../../shared/components/ui/MoneyInput';
import { Modal } from '../../../shared/components/ui/Modal';
import { ConfirmModal } from '../../../shared/components/ui/ConfirmModal';
import { useToast } from '../../../shared/components/ui/Toast';
import { editalService, type Edital, type CreateEditalInput } from '../services/edital.service';

type Rating = 'A' | 'B' | 'C' | 'D';

export function Editais() {
  const { success, error: showError, ToastContainer } = useToast();

  const [editais, setEditais] = useState<Edital[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEdital, setEditingEdital] = useState<Edital | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModality, setFilterModality] = useState<string>('');
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'payment' | 'discounts' | 'eligibility'>('basic');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [formData, setFormData] = useState<CreateEditalInput>({
    code: '',
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    extended: false,
    modality: 'CAPAG',
    payment_terms: {
      entryPercent: 6,
      entryInstallments: 12,
      maxInstallments: 114,
    },
    discount_rules: {
      A: {},
      B: {},
      C: {},
      D: {},
    },
    eligibility: {},
    notes: '',
    official_link: '',
    active: true,
  });

  useEffect(() => {
    loadEditais();
  }, [filterModality, filterActive]);

  const loadEditais = async () => {
    setIsLoading(true);
    try {
      const result = await editalService.list({
        modality: filterModality || undefined,
        active: filterActive,
        page: 1,
        limit: 100,
      });
      setEditais(result.editais || []);
    } catch (error: any) {
      console.error('Error loading editais:', error);
      const errorMessage = error?.message || 'Erro ao carregar editais';
      showError(errorMessage);
      setEditais([]); // Garantir que a lista fica vazia em caso de erro
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (edital?: Edital) => {
    setActiveTab('basic'); // Reset tab when opening modal
    if (edital) {
      setEditingEdital(edital);
      setFormData({
        code: edital.code,
        name: edital.name,
        description: edital.description || '',
        start_date: edital.start_date,
        end_date: edital.end_date,
        extended: edital.extended,
        modality: edital.modality,
        payment_terms: edital.payment_terms || {
          entryPercent: 6,
          entryInstallments: 12,
          maxInstallments: 114,
        },
        discount_rules: edital.discount_rules || {
          A: {},
          B: {},
          C: {},
          D: {},
        },
        eligibility: edital.eligibility || {},
        notes: edital.notes || '',
        official_link: edital.official_link || '',
        active: edital.active,
      });
    } else {
      setEditingEdital(null);
      setFormData({
        code: '',
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        extended: false,
        modality: 'CAPAG',
        payment_terms: {
          entryPercent: 6,
          entryInstallments: 12,
          maxInstallments: 114,
        },
        discount_rules: {
          A: {},
          B: {},
          C: {},
          D: {},
        },
        eligibility: {},
        notes: '',
        official_link: '',
        active: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (editingEdital) {
        await editalService.update(editingEdital.id, formData);
        success('Edital atualizado com sucesso!');
      } else {
        await editalService.create(formData);
        success('Edital criado com sucesso!');
      }
      setIsModalOpen(false);
      loadEditais();
    } catch (error: any) {
      console.error('Error saving edital:', error);
      showError(error.message || 'Erro ao salvar edital');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (edital: Edital) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirmar exclusão',
      message: `Tem certeza que deseja excluir o edital "${edital.name}"?`,
      onConfirm: async () => {
        try {
          await editalService.delete(edital.id);
          success('Edital excluído com sucesso!');
          loadEditais();
        } catch (error: any) {
          showError(error.message || 'Erro ao excluir edital');
        } finally {
          setConfirmModal({ ...confirmModal, isOpen: false });
        }
      },
    });
  };

  const getModalityColor = (modality: string) => {
    const colors: Record<string, string> = {
      CAPAG: 'bg-blue-100 text-blue-800',
      PEQUENO_VALOR: 'bg-indigo-100 text-indigo-800',
      CONTENCIOSO: 'bg-purple-100 text-purple-800',
      IRRECUPERAVEIS: 'bg-red-100 text-red-800',
      DESENROLA_RURAL: 'bg-yellow-100 text-yellow-800',
      PTI: 'bg-indigo-100 text-indigo-800',
    };
    return colors[modality] || 'bg-slate-100 text-slate-800';
  };

  const isActive = (edital: Edital) => {
    const today = new Date();
    const startDate = new Date(edital.start_date);
    const endDate = new Date(edital.end_date);
    return edital.active && today >= startDate && today <= endDate;
  };

  const filteredEditais = editais.filter((edital) => {
    const matchesSearch =
      edital.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      edital.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (edital.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Gerenciar Editais PGFN</h1>
            <p className="text-slate-600 mt-2">Gerencie os editais disponíveis no sistema</p>
          </div>
          <Button onClick={() => handleOpenModal()}>Novo Edital</Button>
        </div>

        {/* Filtros */}
        <Card className="p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Input
                type="text"
                placeholder="Buscar por nome, código ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <select
                value={filterModality}
                onChange={(e) => setFilterModality(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              >
                <option value="">Todas as modalidades</option>
                <option value="CAPAG">CAPAG</option>
                <option value="PEQUENO_VALOR">Pequeno Valor</option>
                <option value="CONTENCIOSO">Contencioso</option>
                <option value="IRRECUPERAVEIS">Irrecuperáveis</option>
                <option value="DESENROLA_RURAL">Desenrola Rural</option>
                <option value="PTI">PTI</option>
              </select>
            </div>
            <div>
              <select
                value={filterActive === undefined ? '' : filterActive.toString()}
                onChange={(e) =>
                  setFilterActive(e.target.value === '' ? undefined : e.target.value === 'true')
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              >
                <option value="">Todos os status</option>
                <option value="true">Ativos</option>
                <option value="false">Inativos</option>
              </select>
            </div>
            <div>
              <Button variant="tertiary" onClick={loadEditais}>
                Atualizar
              </Button>
            </div>
          </div>
        </Card>

        {/* Lista de Editais */}
        {isLoading ? (
          <Card className="p-12 text-center">
            <p className="text-slate-600">Carregando editais...</p>
          </Card>
        ) : filteredEditais.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-slate-600">Nenhum edital encontrado</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredEditais.map((edital) => (
              <Card key={edital.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-slate-900">{edital.name}</h3>
                      <Badge className={getModalityColor(edital.modality)}>{edital.modality}</Badge>
                      {isActive(edital) && <Badge className="bg-indigo-100 text-indigo-800">Ativo</Badge>}
                      {edital.extended && <Badge className="bg-yellow-100 text-yellow-800">Prorrogado</Badge>}
                    </div>
                    <p className="text-sm text-slate-600 mb-2">
                      <strong>Código:</strong> {edital.code}
                    </p>
                    {edital.description && (
                      <p className="text-sm text-slate-700 mb-3">{edital.description}</p>
                    )}
                    <div className="flex gap-4 text-sm text-slate-600">
                      <span>
                        <strong>Início:</strong> {new Date(edital.start_date).toLocaleDateString('pt-BR')}
                      </span>
                      <span>
                        <strong>Término:</strong> {new Date(edital.end_date).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="tertiary" onClick={() => handleOpenModal(edital)}>
                      Editar
                    </Button>
                    <Button 
                      variant="secondary" 
                      onClick={() => handleDelete(edital)}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Excluir
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Modal de Criação/Edição */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingEdital ? 'Editar Edital' : 'Novo Edital'}
          size="xl"
        >
          <div className="space-y-4">
            {/* Tabs */}
            <div className="border-b border-slate-200">
              <nav className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('basic')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'basic'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Básico
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('payment')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'payment'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pagamento
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('discounts')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'discounts'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Descontos
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('eligibility')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'eligibility'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Elegibilidade
                </button>
              </nav>
            </div>

            {/* Tab: Básico */}
            {activeTab === 'basic' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Código *</label>
                  <Input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    disabled={!!editingEdital}
                    placeholder="Ex: PGDAU-11-2025"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome do edital"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    rows={3}
                    placeholder="Descrição do edital"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Data Início *</label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Data Término *</label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Modalidade *</label>
                  <select
                    value={formData.modality}
                    onChange={(e) => setFormData({ ...formData, modality: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  >
                    <option value="CAPAG">CAPAG</option>
                    <option value="PEQUENO_VALOR">Pequeno Valor</option>
                    <option value="CONTENCIOSO">Contencioso</option>
                    <option value="IRRECUPERAVEIS">Irrecuperáveis</option>
                    <option value="DESENROLA_RURAL">Desenrola Rural</option>
                    <option value="PTI">PTI</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Link Oficial</label>
                  <Input
                    type="url"
                    value={formData.official_link || ''}
                    onChange={(e) => setFormData({ ...formData, official_link: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    rows={3}
                    placeholder="Observações adicionais"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="extended"
                      checked={formData.extended}
                      onChange={(e) => setFormData({ ...formData, extended: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label htmlFor="extended" className="text-sm text-slate-700">
                      Prazo prorrogado
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="active"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label htmlFor="active" className="text-sm text-slate-700">
                      Ativo
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Condições de Pagamento */}
            {activeTab === 'payment' && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-slate-900 mb-4">Condições de Pagamento</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Percentual de Entrada (%) *
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={formData.payment_terms?.entryPercent || 0}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            payment_terms: {
                              ...formData.payment_terms,
                              entryPercent: parseFloat(e.target.value) || 0,
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Parcelas para Entrada *
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.payment_terms?.entryInstallments || 0}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            payment_terms: {
                              ...formData.payment_terms,
                              entryInstallments: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Máximo de Parcelas *
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.payment_terms?.maxInstallments || 0}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            payment_terms: {
                              ...formData.payment_terms,
                              maxInstallments: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Valor Mínimo da Parcela (centavos)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.payment_terms?.minInstallmentAmount || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            payment_terms: {
                              ...formData.payment_terms,
                              minInstallmentAmount: e.target.value ? parseInt(e.target.value) : undefined,
                            },
                          })
                        }
                        placeholder="Opcional"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Regras de Desconto */}
            {activeTab === 'discounts' && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-slate-900 mb-4">Regras de Desconto por Rating</h3>
                  {(['A', 'B', 'C', 'D'] as Rating[]).map((rating) => (
                    <div key={rating} className="mb-6 p-4 bg-white rounded-lg border border-slate-200">
                      <h4 className="text-sm font-semibold text-slate-900 mb-3">Rating {rating}</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Desconto Principal (%)
                          </label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={formData.discount_rules?.[rating]?.principal || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                discount_rules: {
                                  ...formData.discount_rules,
                                  [rating]: {
                                    ...formData.discount_rules?.[rating],
                                    principal: e.target.value ? parseFloat(e.target.value) : undefined,
                                  },
                                },
                              })
                            }
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Desconto Juros (%)
                          </label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={formData.discount_rules?.[rating]?.interest || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                discount_rules: {
                                  ...formData.discount_rules,
                                  [rating]: {
                                    ...formData.discount_rules?.[rating],
                                    interest: e.target.value ? parseFloat(e.target.value) : undefined,
                                  },
                                },
                              })
                            }
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Desconto Multas (%)
                          </label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={formData.discount_rules?.[rating]?.fees || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                discount_rules: {
                                  ...formData.discount_rules,
                                  [rating]: {
                                    ...formData.discount_rules?.[rating],
                                    fees: e.target.value ? parseFloat(e.target.value) : undefined,
                                  },
                                },
                              })
                            }
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Desconto Encargos (%)
                          </label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={formData.discount_rules?.[rating]?.charges || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                discount_rules: {
                                  ...formData.discount_rules,
                                  [rating]: {
                                    ...formData.discount_rules?.[rating],
                                    charges: e.target.value ? parseFloat(e.target.value) : undefined,
                                  },
                                },
                              })
                            }
                            placeholder="0"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Desconto Total Máximo (%)
                          </label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={formData.discount_rules?.[rating]?.maxTotalDiscount || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                discount_rules: {
                                  ...formData.discount_rules,
                                  [rating]: {
                                    ...formData.discount_rules?.[rating],
                                    maxTotalDiscount: e.target.value ? parseFloat(e.target.value) : undefined,
                                  },
                                },
                              })
                            }
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Descontos Progressivos (JSON)
                        </label>
                        <textarea
                          value={
                            formData.discount_rules?.[rating]?.progressive
                              ? JSON.stringify(formData.discount_rules[rating].progressive, null, 2)
                              : ''
                          }
                          onChange={(e) => {
                            try {
                              const progressive = e.target.value ? JSON.parse(e.target.value) : undefined;
                              setFormData({
                                ...formData,
                                discount_rules: {
                                  ...formData.discount_rules,
                                  [rating]: {
                                    ...formData.discount_rules?.[rating],
                                    progressive,
                                  },
                                },
                              });
                            } catch {
                              // Ignore invalid JSON
                            }
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono text-xs"
                          rows={4}
                          placeholder='[{"maxMonths": 7, "discount": 50}, ...]'
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Formato: Array de objetos com maxMonths e discount
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Critérios de Elegibilidade */}
            {activeTab === 'eligibility' && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-slate-900 mb-4">Critérios de Elegibilidade</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <MoneyInput
                        label="Valor Máximo"
                        value={(formData.eligibility?.maxAmount || 0) / 100}
                        onChange={(value) =>
                          setFormData({
                            ...formData,
                            eligibility: {
                              ...formData.eligibility,
                              maxAmount: value ? Math.round(value * 100) : undefined,
                            },
                          })
                        }
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Valor máximo elegível para este edital
                      </p>
                    </div>
                    <div>
                      <MoneyInput
                        label="Valor Mínimo"
                        value={(formData.eligibility?.minAmount || 0) / 100}
                        onChange={(value) =>
                          setFormData({
                            ...formData,
                            eligibility: {
                              ...formData.eligibility,
                              minAmount: value ? Math.round(value * 100) : undefined,
                            },
                          })
                        }
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Valor mínimo elegível para este edital
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Anos Inscrito (mínimo)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.eligibility?.minYearsInscribed || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            eligibility: {
                              ...formData.eligibility,
                              minYearsInscribed: e.target.value ? parseInt(e.target.value) : undefined,
                            },
                          })
                        }
                        placeholder="Opcional"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Tese Jurídica
                      </label>
                      <Input
                        type="text"
                        value={formData.eligibility?.legalThesis || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            eligibility: {
                              ...formData.eligibility,
                              legalThesis: e.target.value || undefined,
                            },
                          })
                        }
                        placeholder="Ex: IPI - Conceito de Praça"
                      />
                    </div>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="requiresRating"
                        checked={formData.eligibility?.requiresRating || false}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            eligibility: {
                              ...formData.eligibility,
                              requiresRating: e.target.checked || undefined,
                            },
                          })
                        }
                        className="w-4 h-4"
                      />
                      <label htmlFor="requiresRating" className="text-sm text-slate-700">
                        Requer cálculo de rating
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="requiresJudicialProcess"
                        checked={formData.eligibility?.requiresJudicialProcess || false}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            eligibility: {
                              ...formData.eligibility,
                              requiresJudicialProcess: e.target.checked || undefined,
                            },
                          })
                        }
                        className="w-4 h-4"
                      />
                      <label htmlFor="requiresJudicialProcess" className="text-sm text-slate-700">
                        Requer processo judicial
                      </label>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Ratings Permitidos
                    </label>
                    <div className="flex gap-4">
                      {(['A', 'B', 'C', 'D'] as Rating[]).map((rating) => (
                        <div key={rating} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`rating-${rating}`}
                            checked={formData.eligibility?.allowedRatings?.includes(rating) || false}
                            onChange={(e) => {
                              const current = formData.eligibility?.allowedRatings || [];
                              const updated = e.target.checked
                                ? [...current, rating]
                                : current.filter((r: Rating) => r !== rating);
                              setFormData({
                                ...formData,
                                eligibility: {
                                  ...formData.eligibility,
                                  allowedRatings: updated.length > 0 ? updated : undefined,
                                },
                              });
                            }}
                            className="w-4 h-4"
                          />
                          <label htmlFor={`rating-${rating}`} className="text-sm text-slate-700">
                            Rating {rating}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Tipos de Empresa Permitidos
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        'REGULAR',
                        'MEI',
                        'ME',
                        'EPP',
                        'RECUPERACAO_JUDICIAL',
                        'SANTA_CASA',
                      ].map((type) => (
                        <div key={type} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`company-type-${type}`}
                            checked={formData.eligibility?.allowedCompanyTypes?.includes(type) || false}
                            onChange={(e) => {
                              const current = formData.eligibility?.allowedCompanyTypes || [];
                              const updated = e.target.checked
                                ? [...current, type]
                                : current.filter((t: string) => t !== type);
                              setFormData({
                                ...formData,
                                eligibility: {
                                  ...formData.eligibility,
                                  allowedCompanyTypes: updated.length > 0 ? updated : undefined,
                                },
                              });
                            }}
                            className="w-4 h-4"
                          />
                          <label htmlFor={`company-type-${type}`} className="text-sm text-slate-700">
                            {type}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
              <Button variant="tertiary" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : editingEdital ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </div>
        </Modal>

        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        />
      </div>
      <ToastContainer />
    </Layout>
  );
}
