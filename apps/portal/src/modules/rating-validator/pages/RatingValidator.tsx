import { useState, useEffect, useMemo } from 'react';
import { Layout } from '../../../shared/components/layout/Layout';
import {
  ratingValidatorService,
  type SimulateRatingInput,
  type RatingSimulationResult,
} from '../services/rating-validator.service';
import { clientService, type ClientWithCreatedAt } from '../../clients/services/client.service';
import { judicialProcessService } from '../../judicial-processes/services/judicial-process.service';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { MoneyInput } from '../../../shared/components/ui/MoneyInput';
import { Badge } from '../../../shared/components/ui/Badge';
import { useToast } from '../../../shared/components/ui/Toast';

type Tab = 'simulation' | 'scenarios' | 'real' | 'history';
type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const STEPS: { number: Step; title: string; description: string }[] = [
  { number: 1, title: 'Ativo Circulante', description: 'Informe os valores do ativo circulante' },
  { number: 2, title: 'Ativo Não Circulante', description: 'Informe os valores do ativo não circulante' },
  { number: 3, title: 'Passivo Circulante', description: 'Informe os valores do passivo circulante' },
  { number: 4, title: 'Passivo Não Circulante', description: 'Informe os valores do passivo não circulante' },
  { number: 5, title: 'Patrimônio Líquido', description: 'Informe os valores do patrimônio líquido' },
  { number: 6, title: 'DRE (Opcional)', description: 'Informe dados da DRE (opcional)' },
  { number: 7, title: 'Revisão', description: 'Revise os dados e confirme' },
];

export function RatingValidator() {
  const { success, error: showError, ToastContainer } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('simulation');
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [clients, setClients] = useState<ClientWithCreatedAt[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<RatingSimulationResult | null>(null);
  
  // Simulador de parcelamento
  const [debtAmount, setDebtAmount] = useState<number>(0);
  const [showDebtSimulator, setShowDebtSimulator] = useState(false);
  
  // Processos judiciais elegíveis (para validação de CONTENCIOSO)
  const [eligibleTheses, setEligibleTheses] = useState<string[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Estado para controlar modo granular vs total em cada seção
  const [useTotalMode, setUseTotalMode] = useState<{
    ativo_circulante: boolean;
    realizavel_longo_prazo: boolean;
    passivo_circulante: boolean;
    passivo_nao_circulante: boolean;
    patrimonio_liquido: boolean;
  }>({
    ativo_circulante: false,
    realizavel_longo_prazo: false,
    passivo_circulante: false,
    passivo_nao_circulante: false,
    patrimonio_liquido: false,
  });

  // Form state - campos granulares
  const [formData, setFormData] = useState<SimulateRatingInput>({
    ativo_circulante: {
      caixa_equivalentes: 0,
      aplicacoes_financeiras: 0,
      contas_receber: 0,
      estoques: 0,
      tributos_recuperar: 0,
      despesas_antecipadas: 0,
      outros_ativos_circulantes: 0,
    },
    ativo_nao_circulante: {
      realizavel_longo_prazo: {
        contas_receber_lp: 0,
        emprestimos_concedidos: 0,
        outros_creditos_lp: 0,
      },
      investimentos: 0,
      imobilizado: 0,
      intangivel: 0,
      outros_ativos_nao_circulantes: 0,
    },
    passivo_circulante: {
      fornecedores: 0,
      emprestimos_financiamentos: 0,
      obrigacoes_trabalhistas: 0,
      tributos_pagar: 0,
      contas_pagar: 0,
      provisoes: 0,
      outros_passivos_circulantes: 0,
    },
    passivo_nao_circulante: {
      emprestimos_financiamentos_lp: 0,
      obrigacoes_trabalhistas_lp: 0,
      tributos_pagar_lp: 0,
      provisoes_lp: 0,
      outros_passivos_nao_circulantes: 0,
    },
    patrimonio_liquido: {
      capital_social: 0,
      reservas_capital: 0,
      reservas_lucros: 0,
      lucros_prejuizos_acumulados: 0,
      outros_ajustes: 0,
    },
    competencia: '',
    client_id: '',
    save_simulation: false,
  });

  // Calcular totais em tempo real
  const calculatedTotals = useMemo(() => {
    // Usar total direto se fornecido, senão calcular a partir dos campos granulares
    const ativoCirculanteTotal = useTotalMode.ativo_circulante && formData.ativo_circulante_total !== undefined
      ? formData.ativo_circulante_total
      : Object.values(formData.ativo_circulante).reduce((a, b) => a + b, 0);
    
    const realizavelLongoPrazoTotal = useTotalMode.realizavel_longo_prazo && formData.realizavel_longo_prazo_total !== undefined
      ? formData.realizavel_longo_prazo_total
      : (formData.ativo_nao_circulante.realizavel_longo_prazo?.contas_receber_lp || 0) +
        (formData.ativo_nao_circulante.realizavel_longo_prazo?.emprestimos_concedidos || 0) +
        (formData.ativo_nao_circulante.realizavel_longo_prazo?.outros_creditos_lp || 0);
    
    const passivoCirculanteTotal = useTotalMode.passivo_circulante && formData.passivo_circulante_total !== undefined
      ? formData.passivo_circulante_total
      : Object.values(formData.passivo_circulante).reduce((a, b) => a + b, 0);
    
    const passivoNaoCirculanteTotal = useTotalMode.passivo_nao_circulante && formData.passivo_nao_circulante_total !== undefined
      ? formData.passivo_nao_circulante_total
      : Object.values(formData.passivo_nao_circulante).reduce((a, b) => a + b, 0);
    
    const patrimonioLiquidoTotal = useTotalMode.patrimonio_liquido && formData.patrimonio_liquido_total !== undefined
      ? formData.patrimonio_liquido_total
      : Object.values(formData.patrimonio_liquido).reduce((a, b) => a + b, 0);
    
    const ativoTotal =
      ativoCirculanteTotal +
      realizavelLongoPrazoTotal +
      formData.ativo_nao_circulante.investimentos +
      formData.ativo_nao_circulante.imobilizado +
      formData.ativo_nao_circulante.intangivel +
      formData.ativo_nao_circulante.outros_ativos_nao_circulantes;
    const passivoTotal = passivoCirculanteTotal + passivoNaoCirculanteTotal;

    return {
      ativo_circulante_total: ativoCirculanteTotal,
      realizavel_longo_prazo_total: realizavelLongoPrazoTotal,
      passivo_circulante_total: passivoCirculanteTotal,
      passivo_nao_circulante_total: passivoNaoCirculanteTotal,
      patrimonio_liquido_total: patrimonioLiquidoTotal,
      ativo_total: ativoTotal,
      passivo_total: passivoTotal,
    };
  }, [formData, useTotalMode]);

  useEffect(() => {
    loadClients();
  }, []);

  // Carregar teses elegíveis quando cliente for selecionado
  useEffect(() => {
    if (formData.client_id && formData.client_id !== selectedClientId) {
      setSelectedClientId(formData.client_id);
      loadEligibleTheses(formData.client_id);
    } else if (!formData.client_id) {
      setSelectedClientId(null);
      setEligibleTheses([]);
    }
  }, [formData.client_id]);

  const loadEligibleTheses = async (clientId: string) => {
    try {
      const theses = await judicialProcessService.getEligibleTheses(clientId);
      setEligibleTheses(theses);
    } catch (error: any) {
      console.error('Error loading eligible theses:', error);
      // Não mostrar erro ao usuário, apenas não exibir CONTENCIOSO se não houver processos
      setEligibleTheses([]);
    }
  };

  const loadClients = async () => {
    setIsLoadingClients(true);
    try {
      const clientsList = await clientService.list();
      setClients(clientsList || []);
    } catch (error: any) {
      console.error('Error loading clients:', error);
      showError(error.message || 'Erro ao carregar clientes');
      setClients([]);
    } finally {
      setIsLoadingClients(false);
    }
  };

  const handleSimulate = async () => {
    if (!formData.competencia) {
      showError('Competência é obrigatória');
      return;
    }
    
    // Se for salvar simulação, cliente é obrigatório
    if (formData.save_simulation && !formData.client_id) {
      showError('Cliente é obrigatório para salvar a simulação');
      return;
    }

    setIsSimulating(true);
    try {
      const result = await ratingValidatorService.simulate(formData);
      setSimulationResult(result);
      success('Simulação realizada com sucesso!');
      // Scroll para resultado
      setTimeout(() => {
        document.getElementById('result-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error: any) {
      console.error('Error simulating:', error);
      showError(error.message || 'Erro ao realizar simulação');
    } finally {
      setIsSimulating(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };


  const getRatingColor = (rating: 'A' | 'B' | 'C' | 'D') => {
    switch (rating) {
      case 'A':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'B':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'C':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'D':
        return 'bg-red-100 text-red-800 border-red-300';
    }
  };

  const getRatingLabel = (rating: 'A' | 'B' | 'C' | 'D') => {
    switch (rating) {
      case 'A':
        return 'Excelente';
      case 'B':
        return 'Bom';
      case 'C':
        return 'Regular';
      case 'D':
        return 'Insuficiente';
    }
  };

  // Tipos para modalidades de transação
  type TransactionModality = 'CAPAG' | 'PEQUENO_VALOR' | 'CONTENCIOSO' | 'IRRECUPERAVEIS';

  interface TransactionConditions {
    modality: TransactionModality;
    name: string;
    description: string;
    entryPercent: number;
    entryInstallments: number; // Parcelas para entrada
    maxMonths: number;
    discountOnPrincipal: number; // Desconto sobre principal (%)
    discountOnInterest: number; // Desconto sobre juros (%)
    discountOnFees: number; // Desconto sobre multas (%)
    maxDiscountLimit?: number; // Limite máximo de desconto (% da dívida)
    eligibility?: {
      maxAmount?: number; // Valor máximo elegível
      minAmount?: number; // Valor mínimo elegível
      requiresRating?: boolean; // Se requer rating específico
    };
  }

  // Condições atualizadas baseadas nos Editais PGFN 2025
  const getTransactionConditions = (
    _amount: number,
    rating?: 'A' | 'B' | 'C' | 'D',
    isMEI: boolean = false
  ): Record<TransactionModality, TransactionConditions> => {
    const salarioMinimo = 1412; // SM 2025 (ajustar conforme necessário)
    const maxPequenoValor = 60 * salarioMinimo; // 60 SM

    // CAPAG - Edital 11/2025
    // Rating D: 70% desconto sobre valor total
    // Rating C: 65% desconto sobre valor total (70% para ME/EPP/MEI)
    // Rating A/B: 0% desconto
    const capagDiscountPercent = 
      rating === 'D' ? 70 : 
      rating === 'C' ? (isMEI ? 70 : 65) : 
      0;
    const capagMaxMonths = isMEI ? 133 : 114;

    const conditions: Record<TransactionModality, TransactionConditions> = {
      CAPAG: {
        modality: 'CAPAG',
        name: 'CAPAG (Transação por Capacidade de Pagamento)',
        description: 'Edital PGDAU 11/2025 - Transação conforme capacidade de pagamento',
        entryPercent: 6, // 6% de entrada (parcelável em até 12x)
        entryInstallments: 12,
        maxMonths: capagMaxMonths,
        // Para CAPAG, o desconto é aplicado sobre o valor total (principal + juros + multas)
        discountOnPrincipal: capagDiscountPercent, // Desconto sobre valor total
        discountOnInterest: 0, // Não usado para CAPAG (desconto é sobre total)
        discountOnFees: 0, // Não usado para CAPAG (desconto é sobre total)
        maxDiscountLimit: undefined, // Não há limite adicional (o desconto já é o limite)
        eligibility: {
          maxAmount: 45000000, // R$ 45 milhões
          requiresRating: true,
        },
      },
      PEQUENO_VALOR: {
        modality: 'PEQUENO_VALOR',
        name: 'Transação de Pequeno Valor',
        description: 'Edital 11/2025 - Para débitos até 60 salários mínimos',
        entryPercent: 5, // 5% de entrada
        entryInstallments: 5, // Parcelável em até 5x
        maxMonths: 55, // Até 55 meses
        discountOnPrincipal: 30, // Desconto progressivo: 50% (até 7m), 45% (até 12m), 40% (até 30m), 30% (até 55m) - usando o mínimo para cálculo conservador
        discountOnInterest: 0,
        discountOnFees: 0,
        eligibility: {
          maxAmount: maxPequenoValor,
          minAmount: isMEI ? 25 : 100, // R$ 25 para MEI, R$ 100 para demais
        },
      },
      CONTENCIOSO: {
        modality: 'CONTENCIOSO',
        name: 'Transação Contencioso Tributário (Teses)',
        description: 'Edital 52/2025 - Contencioso de relevante controvérsia jurídica. Desconto 65% independente de rating',
        entryPercent: 5, // 5% de entrada (estimado)
        entryInstallments: 6, // Parcelável em até 6x (estimado)
        maxMonths: 60, // Até 60 meses
        discountOnPrincipal: 65, // 65% de desconto sobre o valor total (independente de rating)
        discountOnInterest: 0,
        discountOnFees: 0,
        maxDiscountLimit: undefined,
        eligibility: {
          // Aplicável apenas se cliente tiver processo judicial ativo para uma das teses:
          // IPI_PRACA, PRL, IRPJ_CSLL_DESMUTUALIZACAO
          // Validação será feita dinamicamente no calculateModalitySimulation
        },
      },
      IRRECUPERAVEIS: {
        modality: 'IRRECUPERAVEIS' as TransactionModality,
        name: 'Débitos Irrecuperáveis',
        description: 'Edital 11/2025 - Para dívidas inscritas há mais de 15 anos, devedores falidos ou empresas com atividades encerradas',
        entryPercent: 5,
        entryInstallments: 12,
        maxMonths: capagMaxMonths,
        discountOnPrincipal: 70, // Descontos máximos permitidos por lei
        discountOnInterest: 100,
        discountOnFees: 100,
        eligibility: {
          // Requer comprovação de situação específica
        },
      },
    };

    return conditions;
  };

  // Calcular simulação para uma modalidade específica
  const calculateModalitySimulation = (
    amount: number,
    modality: TransactionModality,
    rating?: 'A' | 'B' | 'C' | 'D',
    isMEI: boolean = false,
    clientId?: string
  ) => {
    const conditions = getTransactionConditions(amount, rating, isMEI)[modality];

    // Verificar elegibilidade
    if (conditions.eligibility?.maxAmount && amount > conditions.eligibility.maxAmount) {
      return null; // Não elegível
    }
    if (conditions.eligibility?.minAmount && amount < conditions.eligibility.minAmount) {
      return null; // Não elegível
    }
    if (conditions.eligibility?.requiresRating && !rating) {
      return null; // Requer rating
    }

    // Para CONTENCIOSO: verificar se cliente tem processos judiciais ativos
    // Apenas validar se um cliente foi especificado
    if (modality === 'CONTENCIOSO' && clientId) {
      // Se cliente foi especificado mas não tem teses elegíveis, não é elegível
      if (eligibleTheses.length === 0) {
        return null; // Não elegível - cliente não tem processos judiciais ativos
      }
    }
    // Se não houver clientId, permite mostrar CONTENCIOSO (para simulação geral)

    // Estimativas (em produção viriam de API)
    const estimatedInterest = amount * 0.15; // 15% de juros
    const estimatedFees = amount * 0.1; // 10% de multas

    // Valor total com juros e multas
    const totalWithInterest = amount + estimatedInterest + estimatedFees;

    // Calcular desconto total
    // Para CAPAG e CONTENCIOSO: desconto é sobre o valor total (principal + juros + multas)
    // Para PEQUENO_VALOR: desconto progressivo sobre valor total
    let totalDiscount = 0;
    
    if (conditions.discountOnPrincipal > 0) {
      // Desconto sobre valor total (principal + juros + multas)
      totalDiscount = (totalWithInterest * conditions.discountOnPrincipal) / 100;
    } else if (conditions.discountOnInterest > 0 || conditions.discountOnFees > 0) {
      // Desconto apenas sobre juros/multas (caso específico)
      const discountOnInterest = conditions.discountOnInterest > 0 
        ? (estimatedInterest * conditions.discountOnInterest) / 100 
        : 0;
      const discountOnFees = conditions.discountOnFees > 0 
        ? (estimatedFees * conditions.discountOnFees) / 100 
        : 0;
      totalDiscount = discountOnInterest + discountOnFees;
    }

    // Aplicar limite máximo de desconto (se houver)
    if (conditions.maxDiscountLimit) {
      const maxDiscountAmount = (totalWithInterest * conditions.maxDiscountLimit) / 100;
      if (totalDiscount > maxDiscountAmount) {
        totalDiscount = maxDiscountAmount;
      }
    }

    // Valor final após descontos
    const totalWithDiscount = totalWithInterest - totalDiscount;
    
    // Valor a ser parcelado (após entrada e descontos)
    const entryAmount = (amount * conditions.entryPercent) / 100;
    const amountToInstall = totalWithDiscount - entryAmount;
    const monthlyPayment = amountToInstall / conditions.maxMonths;

    // Calcular descontos individuais para exibição (aproximado)
    const discountRatio = totalDiscount / totalWithInterest;
    const discountOnInterest = estimatedInterest * discountRatio;
    const discountOnFees = estimatedFees * discountRatio;
    const discountOnPrincipal = totalDiscount - discountOnInterest - discountOnFees;

    return {
      modality: conditions.modality,
      name: conditions.name,
      description: conditions.description,
      entryPercent: conditions.entryPercent,
      entryAmount,
      entryInstallments: conditions.entryInstallments,
      amountToInstall,
      monthlyPayment,
      maxMonths: conditions.maxMonths,
      totalWithInterest,
      totalWithDiscount,
      savings: totalDiscount,
      discountOnInterest,
      discountOnFees,
      discountOnPrincipal,
      estimatedInterest,
      estimatedFees,
      isEligible: true,
    };
  };

  // Comparar todas as modalidades e identificar a mais vantajosa
  const compareModalities = (
    amount: number,
    rating?: 'A' | 'B' | 'C' | 'D',
    isMEI: boolean = false,
    includeIrrecuperaveis: boolean = false,
    clientId?: string
  ) => {
    const modalities: TransactionModality[] = includeIrrecuperaveis
      ? ['CAPAG', 'PEQUENO_VALOR', 'CONTENCIOSO', 'IRRECUPERAVEIS']
      : ['CAPAG', 'PEQUENO_VALOR', 'CONTENCIOSO'];
    const simulations = modalities
      .map((modality) => calculateModalitySimulation(amount, modality, rating, isMEI, clientId))
      .filter((sim) => sim !== null) as Array<NonNullable<ReturnType<typeof calculateModalitySimulation>>>;

    // Ordenar por menor valor total (mais vantajosa)
    simulations.sort((a, b) => a.totalWithDiscount - b.totalWithDiscount);

    const bestModality = simulations[0]?.modality;

    return {
      simulations,
      bestModality,
      comparisons: simulations.map((sim, index) => ({
        ...sim,
        isBest: index === 0,
        savingsVsWorst: simulations.length > 1
          ? simulations[simulations.length - 1].totalWithDiscount - sim.totalWithDiscount
          : 0,
      })),
    };
  };

  // Simulador de parcelamento por rating (mantido para compatibilidade)
  const calculateDebtInstallment = (amount: number, rating: 'A' | 'B' | 'C' | 'D') => {
    const capagSim = calculateModalitySimulation(amount, 'CAPAG', rating, false, formData.client_id);
    if (!capagSim) {
      return null;
    }

    return {
      rating,
      entryAmount: capagSim.entryAmount,
      remainingAmount: capagSim.amountToInstall,
      monthlyPayment: capagSim.monthlyPayment,
      maxMonths: capagSim.maxMonths,
      totalWithInterest: capagSim.totalWithInterest,
      totalWithDiscount: capagSim.totalWithDiscount,
      savings: capagSim.savings,
      discountOnInterest: capagSim.discountOnInterest,
      discountOnFees: capagSim.discountOnFees,
      condition: capagSim.description,
      estimatedInterest: capagSim.estimatedInterest,
      estimatedFees: capagSim.estimatedFees,
    };
  };

  const debtSimulations = useMemo(() => {
    if (!debtAmount || debtAmount <= 0) return null;
    const sims = {
      A: calculateDebtInstallment(debtAmount, 'A'),
      B: calculateDebtInstallment(debtAmount, 'B'),
      C: calculateDebtInstallment(debtAmount, 'C'),
      D: calculateDebtInstallment(debtAmount, 'D'),
    };
    // Filtrar nulos
    return Object.fromEntries(Object.entries(sims).filter(([_, v]) => v !== null)) as Record<
      'A' | 'B' | 'C' | 'D',
      NonNullable<ReturnType<typeof calculateDebtInstallment>>
    >;
  }, [debtAmount]);

  // Comparativo de modalidades para o rating atual
  const modalityComparison = useMemo(() => {
    if (!debtAmount || debtAmount <= 0 || !simulationResult) return null;
    return compareModalities(debtAmount, simulationResult.rating_estimado, false);
  }, [debtAmount, simulationResult]);

  const handleNext = () => {
    if (currentStep < 7) {
      setCurrentStep((currentStep + 1) as Step);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  const handleFieldChange = (path: string[], value: number) => {
    setFormData((prev) => {
      const newData = { ...prev };
      let current: any = newData;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return newData;
    });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Dica:</strong> Preencha os valores que você encontra facilmente na contabilidade.
                O sistema calculará automaticamente o total do Ativo Circulante.
              </p>
            </div>
            
            {/* Toggle para modo total */}
            <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="use_total_ativo_circulante"
                  checked={useTotalMode.ativo_circulante}
                  onChange={(e) => {
                    setUseTotalMode({ ...useTotalMode, ativo_circulante: e.target.checked });
                    if (!e.target.checked) {
                      // Limpar total quando desativar modo total
                      setFormData({ ...formData, ativo_circulante_total: undefined });
                    }
                  }}
                  className="w-4 h-4"
                />
                <label htmlFor="use_total_ativo_circulante" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Digitar Total Ativo Circulante diretamente (se já possuir o valor calculado)
                </label>
              </div>
            </div>

            {useTotalMode.ativo_circulante ? (
              <div>
                <MoneyInput
                  label="Total Ativo Circulante"
                  value={formData.ativo_circulante_total || 0}
                  onChange={(value) =>
                    setFormData({
                      ...formData,
                      ativo_circulante_total: value || undefined,
                    })
                  }
                  className="text-lg"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Digite o valor total do Ativo Circulante conforme sua contabilidade
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(formData.ativo_circulante).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {key
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </label>
                    <MoneyInput
                      value={value || 0}
                      onChange={(val) => handleFieldChange(['ativo_circulante', key], val)}
                    />
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-700">Total Ativo Circulante:</span>
                <span className="text-2xl font-bold text-blue-600">
                  {formatCurrency(calculatedTotals.ativo_circulante_total)}
                </span>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Dica:</strong> Preencha os valores do Ativo Não Circulante, incluindo Realizável a Longo Prazo.
              </p>
            </div>
            
            {/* Toggle para modo total - Realizável a Longo Prazo */}
            <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="use_total_realizavel_lp"
                  checked={useTotalMode.realizavel_longo_prazo}
                  onChange={(e) => {
                    setUseTotalMode({ ...useTotalMode, realizavel_longo_prazo: e.target.checked });
                    if (!e.target.checked) {
                      setFormData({ ...formData, realizavel_longo_prazo_total: undefined });
                    }
                  }}
                  className="w-4 h-4"
                />
                <label htmlFor="use_total_realizavel_lp" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Digitar Total Realizável a Longo Prazo diretamente (se já possuir o valor calculado)
                </label>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-700 mb-3">Realizável a Longo Prazo</h4>
              {useTotalMode.realizavel_longo_prazo ? (
                <div>
                  <MoneyInput
                    value={formData.realizavel_longo_prazo_total || 0}
                    onChange={(value) =>
                      setFormData({
                        ...formData,
                        realizavel_longo_prazo_total: value || undefined,
                      })
                    }
                    className="text-lg"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Digite o valor total do Realizável a Longo Prazo conforme sua contabilidade
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {Object.entries(formData.ativo_nao_circulante.realizavel_longo_prazo || {}).map(
                    ([key, value]) => (
                      <div key={key}>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                        </label>
                        <MoneyInput
                          value={value || 0}
                          onChange={(val) =>
                            handleFieldChange(
                              ['ativo_nao_circulante', 'realizavel_longo_prazo', key],
                              val
                            )
                          }
                        />
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
            <div>
              <h4 className="font-semibold text-slate-700 mb-3">Outros Ativos Não Circulantes</h4>
              <div className="grid grid-cols-2 gap-4">
                {['investimentos', 'imobilizado', 'intangivel', 'outros_ativos_nao_circulantes'].map(
                  (key) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </label>
                      <MoneyInput
                        value={(formData.ativo_nao_circulante as any)[key] || 0}
                        onChange={(val) =>
                          handleFieldChange(
                            ['ativo_nao_circulante', key],
                            val
                          )
                        }
                      />
                    </div>
                  )
                )}
              </div>
            </div>
            <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Realizável a Longo Prazo:</span>
                  <span className="font-semibold">{formatCurrency(calculatedTotals.realizavel_longo_prazo_total)}</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Dica:</strong> Preencha todas as obrigações de curto prazo da empresa.
              </p>
            </div>
            
            {/* Toggle para modo total */}
            <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="use_total_passivo_circulante"
                  checked={useTotalMode.passivo_circulante}
                  onChange={(e) => {
                    setUseTotalMode({ ...useTotalMode, passivo_circulante: e.target.checked });
                    if (!e.target.checked) {
                      setFormData({ ...formData, passivo_circulante_total: undefined });
                    }
                  }}
                  className="w-4 h-4"
                />
                <label htmlFor="use_total_passivo_circulante" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Digitar Total Passivo Circulante diretamente (se já possuir o valor calculado)
                </label>
              </div>
            </div>

            {useTotalMode.passivo_circulante ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Total Passivo Circulante
                </label>
                <MoneyInput
                  value={formData.passivo_circulante_total || 0}
                  onChange={(value) =>
                    setFormData({
                      ...formData,
                      passivo_circulante_total: value || undefined,
                    })
                  }
                  className="text-lg"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Digite o valor total do Passivo Circulante conforme sua contabilidade
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(formData.passivo_circulante).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </label>
                    <MoneyInput
                      value={value || 0}
                      onChange={(val) => handleFieldChange(['passivo_circulante', key], val)}
                    />
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-700">Total Passivo Circulante:</span>
                <span className="text-2xl font-bold text-red-600">
                  {formatCurrency(calculatedTotals.passivo_circulante_total)}
                </span>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Dica:</strong> Preencha todas as obrigações de longo prazo da empresa.
              </p>
            </div>
            
            {/* Toggle para modo total */}
            <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="use_total_passivo_nao_circulante"
                  checked={useTotalMode.passivo_nao_circulante}
                  onChange={(e) => {
                    setUseTotalMode({ ...useTotalMode, passivo_nao_circulante: e.target.checked });
                    if (!e.target.checked) {
                      setFormData({ ...formData, passivo_nao_circulante_total: undefined });
                    }
                  }}
                  className="w-4 h-4"
                />
                <label htmlFor="use_total_passivo_nao_circulante" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Digitar Total Passivo Não Circulante diretamente (se já possuir o valor calculado)
                </label>
              </div>
            </div>

            {useTotalMode.passivo_nao_circulante ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Total Passivo Não Circulante
                </label>
                <MoneyInput
                  value={formData.passivo_nao_circulante_total || 0}
                  onChange={(value) =>
                    setFormData({
                      ...formData,
                      passivo_nao_circulante_total: value || undefined,
                    })
                  }
                  className="text-lg"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Digite o valor total do Passivo Não Circulante conforme sua contabilidade
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(formData.passivo_nao_circulante).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </label>
                    <MoneyInput
                      value={value || 0}
                      onChange={(val) => handleFieldChange(['passivo_nao_circulante', key], val)}
                    />
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-700">Total Passivo Não Circulante:</span>
                <span className="text-2xl font-bold text-red-600">
                  {formatCurrency(calculatedTotals.passivo_nao_circulante_total)}
                </span>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Dica:</strong> O campo "Lucros ou Prejuízos Acumulados" pode ser negativo.
              </p>
            </div>
            
            {/* Toggle para modo total */}
            <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="use_total_patrimonio_liquido"
                  checked={useTotalMode.patrimonio_liquido}
                  onChange={(e) => {
                    setUseTotalMode({ ...useTotalMode, patrimonio_liquido: e.target.checked });
                    if (!e.target.checked) {
                      setFormData({ ...formData, patrimonio_liquido_total: undefined });
                    }
                  }}
                  className="w-4 h-4"
                />
                <label htmlFor="use_total_patrimonio_liquido" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Digitar Total Patrimônio Líquido diretamente (se já possuir o valor calculado)
                </label>
              </div>
            </div>

            {useTotalMode.patrimonio_liquido ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Total Patrimônio Líquido
                </label>
                <MoneyInput
                  value={formData.patrimonio_liquido_total || 0}
                  onChange={(value) =>
                    setFormData({
                      ...formData,
                      patrimonio_liquido_total: value || undefined,
                    })
                  }
                  className="text-lg"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Digite o valor total do Patrimônio Líquido conforme sua contabilidade
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(formData.patrimonio_liquido).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </label>
                    <MoneyInput
                      value={value || 0}
                      onChange={(val) => handleFieldChange(['patrimonio_liquido', key], val)}
                    />
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-700">Total Patrimônio Líquido:</span>
                <span className="text-2xl font-bold text-green-600">
                  {formatCurrency(calculatedTotals.patrimonio_liquido_total)}
                </span>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <div className="mb-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>Opcional:</strong> Os dados da DRE são opcionais para o cálculo do Rating.
              </p>
            </div>
            {!formData.dre && (
              <Button
                variant="tertiary"
                onClick={() => setFormData({ ...formData, dre: { receita_bruta: 0, deducoes_vendas: 0, custos_vendas: 0, despesas_operacionais: 0, resultado_financeiro: 0, outros_resultados: 0 } })}
              >
                Adicionar Dados da DRE
              </Button>
            )}
            {formData.dre && (
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(formData.dre).map(([key, value]) => {
                  if (key === 'receita_liquida') return null;
                  return (
                    <div key={key}>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </label>
                      <MoneyInput
                        value={value || 0}
                        onChange={(val) => handleFieldChange(['dre', key], val)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800">
                <strong>Revise os dados:</strong> Verifique se todos os valores estão corretos antes de calcular o Rating.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Cliente {formData.save_simulation ? '*' : '(Opcional)'}
                </label>
                <select
                  value={formData.client_id || ''}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value || '' })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  disabled={isLoadingClients}
                >
                  <option value="">Selecione um cliente (opcional)</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
                {formData.save_simulation && !formData.client_id && (
                  <p className="text-xs text-red-600 mt-1">Cliente é obrigatório para salvar a simulação</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Competência (YYYY-MM) *
                </label>
                <Input
                  type="text"
                  value={formData.competencia}
                  onChange={(e) => setFormData({ ...formData, competencia: e.target.value })}
                  placeholder="2024-01"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <Card className="p-4">
                <h4 className="font-semibold mb-3 text-slate-700">Resumo do Balanço</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Ativo Circulante:</span>
                    <span className="font-semibold">{formatCurrency(calculatedTotals.ativo_circulante_total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Realizável LP:</span>
                    <span className="font-semibold">{formatCurrency(calculatedTotals.realizavel_longo_prazo_total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Outros Ativos NC:</span>
                    <span className="font-semibold">
                      {formatCurrency(
                        calculatedTotals.ativo_total -
                          calculatedTotals.ativo_circulante_total -
                          calculatedTotals.realizavel_longo_prazo_total
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="font-semibold text-slate-700">Total Ativo:</span>
                    <span className="font-bold text-lg text-blue-600">
                      {formatCurrency(calculatedTotals.ativo_total)}
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="font-semibold mb-3 text-slate-700">Resumo do Passivo</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Passivo Circulante:</span>
                    <span className="font-semibold">{formatCurrency(calculatedTotals.passivo_circulante_total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Passivo Não Circulante:</span>
                    <span className="font-semibold">{formatCurrency(calculatedTotals.passivo_nao_circulante_total)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="font-semibold text-slate-700">Total Passivo:</span>
                    <span className="font-bold text-lg text-red-600">
                      {formatCurrency(calculatedTotals.passivo_total)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="font-semibold text-slate-700">Patrimônio Líquido:</span>
                    <span className="font-bold text-lg text-green-600">
                      {formatCurrency(calculatedTotals.patrimonio_liquido_total)}
                    </span>
                  </div>
                </div>
              </Card>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="save_simulation"
                checked={formData.save_simulation}
                onChange={(e) => setFormData({ ...formData, save_simulation: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="save_simulation" className="text-sm text-slate-700">
                Salvar esta simulação no histórico
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Rating Real (Opcional - para comparação)
              </label>
              <select
                value={formData.rating_real || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    rating_real: (e.target.value as 'A' | 'B' | 'C' | 'D') || undefined,
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              >
                <option value="">Não informar</option>
                <option value="A">A - Excelente</option>
                <option value="B">B - Bom</option>
                <option value="C">C - Regular</option>
                <option value="D">D - Insuficiente</option>
              </select>
            </div>
          </div>
        );
    }
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Validador de Rating PGFN (CAPAG)</h1>
          <p className="text-slate-600 mt-2">
            Calcule e valide o Rating PGFN através de indicadores financeiros conforme Portaria PGFN 6.757/2022
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('simulation')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'simulation'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Simulação
            </button>
            <button
              onClick={() => setActiveTab('scenarios')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'scenarios'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Cenários
            </button>
            <button
              onClick={() => setActiveTab('real')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'real'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Validação Real
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Histórico
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'simulation' && (
          <div className="space-y-6">
            {/* Progress Steps */}
            <Card>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  {STEPS.map((step, index) => (
                    <div key={step.number} className="flex items-center flex-1">
                      <div className="flex flex-col items-center flex-1">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                            currentStep === step.number
                              ? 'bg-blue-600 text-white'
                              : currentStep > step.number
                              ? 'bg-green-500 text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {currentStep > step.number ? '✓' : step.number}
                        </div>
                        <div className="mt-2 text-xs text-center max-w-[100px]">
                          <div className="font-medium">{step.title}</div>
                        </div>
                      </div>
                      {index < STEPS.length - 1 && (
                        <div
                          className={`h-1 flex-1 mx-2 transition-all ${
                            currentStep > step.number ? 'bg-green-500' : 'bg-slate-200'
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <h2 className="text-xl font-semibold mb-2">{STEPS[currentStep - 1].title}</h2>
                <p className="text-sm text-slate-600 mb-6">{STEPS[currentStep - 1].description}</p>

                {renderStepContent()}

                <div className="flex justify-between mt-8 pt-6 border-t border-slate-200">
                  <Button
                    variant="tertiary"
                    onClick={handlePrevious}
                    disabled={currentStep === 1}
                  >
                    Anterior
                  </Button>
                  {currentStep < 7 ? (
                    <Button onClick={handleNext}>Próximo</Button>
                  ) : (
                    <Button onClick={handleSimulate} disabled={isSimulating}>
                      {isSimulating ? 'Calculando...' : 'Calcular Rating'}
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {/* Resultado */}
            {simulationResult && (
              <div id="result-section" className="space-y-6">
                {/* Cards de Indicadores */}
                <div className="grid grid-cols-3 gap-6">
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-slate-600">Liquidez Corrente</h3>
                      <Badge
                        className={
                          simulationResult.indicators.liquidez_corrente >= 1.0
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }
                      >
                        {simulationResult.indicators.liquidez_corrente >= 1.0 ? 'Adequado' : 'Atenção'}
                      </Badge>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">
                      {simulationResult.indicators.liquidez_corrente.toFixed(4)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Ativo Circulante / Passivo Circulante
                    </p>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-slate-600">Liquidez Geral</h3>
                      <Badge
                        className={
                          simulationResult.indicators.liquidez_geral >= 1.0
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }
                      >
                        {simulationResult.indicators.liquidez_geral >= 1.0 ? 'Adequado' : 'Atenção'}
                      </Badge>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">
                      {simulationResult.indicators.liquidez_geral.toFixed(4)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      (AC + RLP) / (PC + PNC)
                    </p>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-slate-600">Solvência</h3>
                      <Badge
                        className={
                          simulationResult.indicators.solvencia >= 0.3
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }
                      >
                        {simulationResult.indicators.solvencia >= 0.3 ? 'Bom' : 'Regular'}
                      </Badge>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">
                      {(simulationResult.indicators.solvencia * 100).toFixed(2)}%
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Patrimônio Líquido / Ativo Total
                    </p>
                  </Card>
                </div>

                {/* Rating Card */}
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-6">Classificação de Rating</h2>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-6 bg-slate-50 rounded-lg border-2 border-slate-200">
                      <p className="text-sm text-slate-600 mb-2">Rating Estimado</p>
                      <div className="flex items-center gap-4">
                        <Badge className={`${getRatingColor(simulationResult.rating_estimado)} text-2xl px-6 py-3 border-2`}>
                          {simulationResult.rating_estimado}
                        </Badge>
                        <div>
                          <p className="font-semibold text-lg">{getRatingLabel(simulationResult.rating_estimado)}</p>
                          <p className="text-sm text-slate-500">Capacidade de Pagamento</p>
                        </div>
                      </div>
                    </div>

                    {simulationResult.rating_real && (
                      <div className="p-6 bg-slate-50 rounded-lg border-2 border-slate-200">
                        <p className="text-sm text-slate-600 mb-2">Rating Real</p>
                        <div className="flex items-center gap-4">
                          <Badge className={`${getRatingColor(simulationResult.rating_real)} text-2xl px-6 py-3 border-2`}>
                            {simulationResult.rating_real}
                          </Badge>
                          <div>
                            <p className="font-semibold text-lg">{getRatingLabel(simulationResult.rating_real)}</p>
                            <p className="text-sm text-slate-500">Informado pelo usuário</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {simulationResult.has_discrepancy && (
                    <div className="mt-6 p-4 bg-red-50 rounded-lg border-2 border-red-200">
                      <div className="flex items-start gap-3">
                        <div className="text-red-600 text-xl">⚠️</div>
                        <div>
                          <p className="font-semibold text-red-800 mb-1">Discrepância Detectada!</p>
                          <p className="text-sm text-red-700">
                            {simulationResult.discrepancy_details?.message}
                          </p>
                          <p className="text-xs text-red-600 mt-2">
                            Esta discrepância pode indicar erro de classificação que pode resultar em desconto em transações.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>

                {/* Simulador de Parcelamento */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold">Simulador de Parcelamento de Dívida</h2>
                      <p className="text-sm text-slate-600 mt-1">
                        Veja a diferença efetiva de troca baseada no seu Rating
                      </p>
                    </div>
                    <Button
                      variant="tertiary"
                      onClick={() => setShowDebtSimulator(!showDebtSimulator)}
                    >
                      {showDebtSimulator ? 'Ocultar' : 'Mostrar Simulador'}
                    </Button>
                  </div>

                  {showDebtSimulator && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Valor Total da Dívida (R$)
                        </label>
                        <MoneyInput
                          label="Valor Total da Dívida"
                          value={debtAmount || 0}
                          onChange={(value) => setDebtAmount(value)}
                          className="text-lg"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Informe o valor total da dívida para simular as condições de parcelamento
                        </p>
                      </div>

                      {debtSimulations && (
                        <div className="mt-6 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            {(['A', 'B', 'C', 'D'] as const).map((rating) => {
                              const sim = debtSimulations[rating];
                              const isCurrentRating = simulationResult.rating_estimado === rating;
                              return (
                                <Card
                                  key={rating}
                                  className={`p-5 ${
                                    isCurrentRating
                                      ? 'border-2 border-blue-500 bg-blue-50'
                                      : 'border border-slate-200'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <Badge className={`${getRatingColor(rating)} text-lg px-3 py-1`}>
                                        Rating {rating}
                                      </Badge>
                                      {isCurrentRating && (
                                        <Badge className="bg-blue-600 text-white text-xs">
                                          Seu Rating
                                        </Badge>
                                      )}
                                    </div>
                                  </div>

                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-slate-600">Entrada (1%):</span>
                                      <span className="font-semibold">{formatCurrency(sim.entryAmount)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-600">Saldo a parcelar:</span>
                                      <span className="font-semibold">{formatCurrency(sim.remainingAmount)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-600">Parcela mensal:</span>
                                      <span className="font-semibold">{formatCurrency(sim.monthlyPayment)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-600">Prazo máximo:</span>
                                      <span className="font-semibold">{sim.maxMonths} meses</span>
                                    </div>
                                    {sim.savings > 0 && (
                                      <>
                                        <div className="pt-2 border-t border-slate-200">
                                          <div className="flex justify-between text-green-600">
                                            <span className="font-medium">Desconto em Juros:</span>
                                            <span className="font-bold">
                                              {formatCurrency(sim.discountOnInterest)}
                                            </span>
                                          </div>
                                          <div className="flex justify-between text-green-600">
                                            <span className="font-medium">Desconto em Multas:</span>
                                            <span className="font-bold">
                                              {formatCurrency(sim.discountOnFees)}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="pt-2 border-t-2 border-green-300 bg-green-50 p-2 rounded">
                                          <div className="flex justify-between">
                                            <span className="font-bold text-green-800">
                                              Economia Total:
                                            </span>
                                            <span className="font-bold text-lg text-green-800">
                                              {formatCurrency(sim.savings)}
                                            </span>
                                          </div>
                                        </div>
                                      </>
                                    )}
                                    <div className="pt-2 border-t border-slate-200">
                                      <div className="flex justify-between">
                                        <span className="text-slate-600">Total com juros/multas:</span>
                                        <span className="font-semibold text-slate-700">
                                          {formatCurrency(sim.totalWithInterest)}
                                        </span>
                                      </div>
                                      {sim.savings > 0 && (
                                        <div className="flex justify-between mt-1">
                                          <span className="text-slate-600">Total com descontos:</span>
                                          <span className="font-bold text-green-600">
                                            {formatCurrency(sim.totalWithDiscount)}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <p className="text-xs text-slate-500 mt-3 italic">
                                    {sim.condition}
                                  </p>
                                </Card>
                              );
                            })}
                          </div>

                          {/* Comparação */}
                          <Card className="p-6 bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200">
                            <h3 className="font-semibold text-lg mb-4">Comparação de Economia</h3>
                            <div className="grid grid-cols-4 gap-4">
                              {(['A', 'B', 'C', 'D'] as const).map((rating) => {
                                const sim = debtSimulations[rating];
                                const isCurrentRating = simulationResult.rating_estimado === rating;
                                const diffFromA = sim.savings - debtSimulations.A.savings;
                                return (
                                  <div
                                    key={rating}
                                    className={`p-4 rounded-lg ${
                                      isCurrentRating
                                        ? 'bg-blue-100 border-2 border-blue-500'
                                        : 'bg-white border border-slate-200'
                                    }`}
                                  >
                                    <div className="text-center">
                                      <Badge className={`${getRatingColor(rating)} mb-2`}>
                                        Rating {rating}
                                      </Badge>
                                      {isCurrentRating && (
                                        <p className="text-xs text-blue-600 font-medium mb-2">Seu Rating</p>
                                      )}
                                      <p className="text-2xl font-bold text-green-600">
                                        {formatCurrency(sim.savings)}
                                      </p>
                                      <p className="text-xs text-slate-500 mt-1">Economia total</p>
                                      {rating !== 'A' && diffFromA !== 0 && (
                                        <p
                                          className={`text-xs mt-2 font-medium ${
                                            diffFromA > 0 ? 'text-green-600' : 'text-red-600'
                                          }`}
                                        >
                                          {diffFromA > 0 ? '+' : ''}
                                          {formatCurrency(diffFromA)} vs Rating A
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="mt-4 p-4 bg-white rounded-lg border border-slate-200">
                              <p className="text-sm text-slate-700">
                                <strong>Diferença Efetiva:</strong> Com Rating{' '}
                                <Badge className={getRatingColor(simulationResult.rating_estimado)}>
                                  {simulationResult.rating_estimado}
                                </Badge>
                                , você teria uma economia de{' '}
                                <strong className="text-green-600">
                                  {formatCurrency(debtSimulations[simulationResult.rating_estimado].savings)}
                                </strong>{' '}
                                em relação ao pagamento sem negociação.
                                {simulationResult.rating_estimado === 'C' || simulationResult.rating_estimado === 'D' ? (
                                  <span className="block mt-2 text-green-700">
                                    ✓ Você se qualifica para descontos em juros e multas!
                                  </span>
                                ) : (
                                  <span className="block mt-2 text-blue-700">
                                    ✓ Você se qualifica para entrada facilitada e prazo máximo!
                                  </span>
                                )}
                              </p>
                            </div>
                          </Card>
                        </div>
                      )}
                    </div>
                  )}
                </Card>

                {/* Comparativo de Modalidades */}
                {simulationResult && (
                  <Card className="p-6">
                    <div className="mb-6">
                      <h2 className="text-xl font-semibold mb-2">Comparativo de Modalidades de Transação</h2>
                      <p className="text-sm text-slate-600">
                        Compare as condições das diferentes modalidades disponíveis nos Editais PGFN 2025 e identifique
                        qual é mais vantajosa para seu Rating{' '}
                        <Badge className={getRatingColor(simulationResult.rating_estimado)}>
                          {simulationResult.rating_estimado}
                        </Badge>
                      </p>
                    </div>

                    {!debtAmount || debtAmount <= 0 ? (
                      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-sm text-yellow-800">
                          Informe o valor da dívida acima para ver o comparativo de modalidades.
                        </p>
                      </div>
                    ) : modalityComparison && modalityComparison.comparisons.length > 0 ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {modalityComparison.comparisons.map((sim) => (
                            <Card
                              key={sim.modality}
                              className={`p-5 ${
                                sim.isBest
                                  ? 'border-2 border-green-500 bg-green-50'
                                  : 'border border-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-slate-700">{sim.name}</h3>
                                  {sim.isBest && (
                                    <Badge className="bg-green-600 text-white text-xs">
                                      ⭐ Mais Vantajosa
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              <p className="text-xs text-slate-500 mb-4">{sim.description}</p>

                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-slate-600">Entrada ({sim.entryPercent}%):</span>
                                  <span className="font-semibold">{formatCurrency(sim.entryAmount)}</span>
                                </div>
                                <div className="text-xs text-slate-500">
                                  Parcelável em até {sim.entryInstallments}x
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-600">Parcela mensal:</span>
                                  <span className="font-semibold">{formatCurrency(sim.monthlyPayment)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-600">Prazo máximo:</span>
                                  <span className="font-semibold">{sim.maxMonths} meses</span>
                                </div>

                                {(sim.discountOnInterest > 0 ||
                                  sim.discountOnFees > 0 ||
                                  sim.discountOnPrincipal > 0) && (
                                  <div className="pt-2 border-t border-slate-200">
                                    {sim.discountOnPrincipal > 0 && (
                                      <div className="flex justify-between text-green-600">
                                        <span className="font-medium">Desconto Principal:</span>
                                        <span className="font-bold">
                                          {formatCurrency(sim.discountOnPrincipal)}
                                        </span>
                                      </div>
                                    )}
                                    {sim.discountOnInterest > 0 && (
                                      <div className="flex justify-between text-green-600">
                                        <span className="font-medium">Desconto Juros:</span>
                                        <span className="font-bold">
                                          {formatCurrency(sim.discountOnInterest)}
                                        </span>
                                      </div>
                                    )}
                                    {sim.discountOnFees > 0 && (
                                      <div className="flex justify-between text-green-600">
                                        <span className="font-medium">Desconto Multas:</span>
                                        <span className="font-bold">{formatCurrency(sim.discountOnFees)}</span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className="pt-2 border-t-2 border-slate-300 bg-slate-50 p-2 rounded">
                                  <div className="flex justify-between mb-1">
                                    <span className="text-slate-600">Total a pagar:</span>
                                    <span className="font-bold text-lg text-slate-900">
                                      {formatCurrency(sim.totalWithDiscount)}
                                    </span>
                                  </div>
                                  {sim.savings > 0 && (
                                    <div className="flex justify-between">
                                      <span className="text-xs text-green-600">Economia total:</span>
                                      <span className="text-xs font-bold text-green-600">
                                        {formatCurrency(sim.savings)}
                                      </span>
                                    </div>
                                  )}
                                  {sim.savingsVsWorst > 0 && (
                                    <div className="flex justify-between mt-1">
                                      <span className="text-xs text-green-700">vs. pior modalidade:</span>
                                      <span className="text-xs font-bold text-green-700">
                                        +{formatCurrency(sim.savingsVsWorst)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>

                        {modalityComparison.bestModality && (
                          <Card className="p-6 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300">
                            <div className="flex items-start gap-4">
                              <div className="text-3xl">🎯</div>
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg mb-2">
                                  Modalidade Mais Vantajosa para Rating{' '}
                                  <Badge className={getRatingColor(simulationResult.rating_estimado)}>
                                    {simulationResult.rating_estimado}
                                  </Badge>
                                </h3>
                                <p className="text-sm text-slate-700 mb-3">
                                  Com base nas condições dos Editais PGFN 2025, a modalidade{' '}
                                  <strong>
                                    {
                                      modalityComparison.comparisons.find((c) => c.isBest)
                                        ?.name
                                    }
                                  </strong>{' '}
                                  oferece as melhores condições para seu perfil de rating.
                                </p>
                                {modalityComparison.comparisons.find((c) => c.isBest) && (
                                  <div className="bg-white p-4 rounded-lg border border-green-200">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <span className="text-slate-600">Valor total a pagar:</span>
                                        <span className="font-bold text-lg text-green-600 ml-2">
                                          {formatCurrency(
                                            modalityComparison.comparisons.find((c) => c.isBest)!
                                              .totalWithDiscount
                                          )}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-slate-600">Economia total:</span>
                                        <span className="font-bold text-lg text-green-600 ml-2">
                                          {formatCurrency(
                                            modalityComparison.comparisons.find((c) => c.isBest)!.savings
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </Card>
                        )}

                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-xs text-blue-800">
                            <strong>Nota:</strong> As condições são baseadas nos Editais PGFN 2025 (Edital 11/2025 e
                            Editais de Contencioso). Valores de juros e multas são estimativos. Consulte o portal
                            REGULARIZE para valores exatos e condições específicas do seu caso.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-sm text-yellow-800">
                          Nenhuma modalidade elegível encontrada para o valor informado. Verifique os critérios de
                          elegibilidade de cada modalidade.
                        </p>
                      </div>
                    )}
                  </Card>
                )}

                {/* Valores Calculados */}
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Valores Agregados Calculados</h2>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold text-slate-700 mb-3">Ativos</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Ativo Circulante:</span>
                          <span className="font-semibold">
                            {formatCurrency(simulationResult.calculated_values.ativo_circulante_total)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Realizável LP:</span>
                          <span className="font-semibold">
                            {formatCurrency(simulationResult.calculated_values.realizavel_longo_prazo_total)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-slate-200">
                          <span className="font-semibold text-slate-700">Total Ativo:</span>
                          <span className="font-bold text-lg text-blue-600">
                            {formatCurrency(simulationResult.calculated_values.ativo_total)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-700 mb-3">Passivos e PL</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Passivo Circulante:</span>
                          <span className="font-semibold">
                            {formatCurrency(simulationResult.calculated_values.passivo_circulante_total)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Passivo Não Circulante:</span>
                          <span className="font-semibold">
                            {formatCurrency(simulationResult.calculated_values.passivo_nao_circulante_total)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Patrimônio Líquido:</span>
                          <span className="font-semibold">
                            {formatCurrency(simulationResult.calculated_values.patrimonio_liquido_total)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-slate-200">
                          <span className="font-semibold text-slate-700">Total Passivo + PL:</span>
                          <span className="font-bold text-lg">
                            {formatCurrency(
                              simulationResult.calculated_values.passivo_total +
                                simulationResult.calculated_values.patrimonio_liquido_total
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}

        {activeTab === 'scenarios' && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-2">Simulação de Cenários por Rating</h2>
                <p className="text-slate-600">
                  Teste diferentes valores de dívida e compare as condições oferecidas para cada Rating (A, B, C, D)
                  nos Editais PGFN 2025. Identifique qual rating seria mais vantajoso para seu cliente.
                </p>
                <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    <strong>⚠️ Prazo Importante:</strong> Edital PGDAU 11/2025 prorrogado até{' '}
                    <strong>30 de janeiro de 2026</strong>. Use esta ferramenta para planejar estratégias de
                    negociação antes do prazo final.
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Valor da Dívida (R$)
                </label>
                <MoneyInput
                  label="Valor da Dívida"
                  value={debtAmount || 0}
                  onChange={(value) => setDebtAmount(value)}
                  className="text-right text-lg"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Informe o valor total da dívida para simular as condições de cada rating
                </p>
              </div>

              {debtAmount > 0 && (
                <div className="space-y-6">
                  {/* Comparação por Rating */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Comparação por Rating</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {(['A', 'B', 'C', 'D'] as const).map((rating) => {
                        // Na tela de cenários, não passar clientId para permitir ver todas as modalidades
                        const capagSim = calculateModalitySimulation(debtAmount, 'CAPAG', rating, false, undefined);
                        if (!capagSim) return null;

                        return (
                          <Card
                            key={rating}
                            className={`p-5 ${
                              rating === 'C' || rating === 'D'
                                ? 'border-2 border-green-300 bg-green-50'
                                : 'border border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <Badge className={`${getRatingColor(rating)} text-lg px-3 py-1`}>
                                Rating {rating}
                              </Badge>
                              {(rating === 'C' || rating === 'D') && (
                                <Badge className="bg-green-600 text-white text-xs">
                                  Com Descontos
                                </Badge>
                              )}
                            </div>

                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-slate-600">Entrada (6%):</span>
                                <span className="font-semibold">{formatCurrency(capagSim.entryAmount)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-600">Parcela mensal:</span>
                                <span className="font-semibold">{formatCurrency(capagSim.monthlyPayment)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-600">Prazo:</span>
                                <span className="font-semibold">{capagSim.maxMonths} meses</span>
                              </div>
                              {(rating === 'C' || rating === 'D') && (
                                <div className="pt-2 border-t border-slate-200">
                                  <div className="flex justify-between text-green-600">
                                    <span className="font-medium">Economia:</span>
                                    <span className="font-bold">{formatCurrency(capagSim.savings)}</span>
                                  </div>
                                  <div className="text-xs text-slate-500 mt-1">
                                    Desconto Real: {((capagSim.savings / capagSim.totalWithInterest) * 100).toFixed(1)}%
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {rating === 'D' ? '70%' : rating === 'C' ? '65-70%' : '0%'} do valor total
                                  </div>
                                </div>
                              )}
                              {rating === 'A' || rating === 'B' ? (
                                <div className="pt-2 border-t border-slate-200">
                                  <div className="text-xs text-slate-500">
                                    Desconto Real: 0% (sem desconto para Rating {rating})
                                  </div>
                                </div>
                              ) : null}
                              <div className="pt-2 border-t-2 border-slate-300 bg-slate-50 p-2 rounded">
                                <div className="flex justify-between">
                                  <span className="text-slate-600">Total a pagar:</span>
                                  <span className="font-bold text-lg text-slate-900">
                                    {formatCurrency(capagSim.totalWithDiscount)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>

                  {/* Análise Estratégica */}
                  <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300">
                    <h3 className="text-lg font-semibold mb-4">💡 Análise Estratégica</h3>
                    <div className="space-y-4">
                      <div className="bg-white p-4 rounded-lg border border-blue-200">
                        <h4 className="font-semibold mb-2">Diferença entre Ratings C/D vs A/B</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-slate-600">Rating A/B (sem desconto):</span>
                            <span className="font-bold text-lg text-slate-700 ml-2">
                              {formatCurrency(
                                calculateModalitySimulation(debtAmount, 'CAPAG', 'A', false, undefined)?.totalWithDiscount || 0
                              )}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-600">Rating C/D (com desconto):</span>
                            <span className="font-bold text-lg text-green-600 ml-2">
                              {formatCurrency(
                                calculateModalitySimulation(debtAmount, 'CAPAG', 'C', false, undefined)?.totalWithDiscount || 0
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <span className="text-slate-600">Economia potencial com Rating C/D:</span>
                          <span className="font-bold text-xl text-green-600 ml-2">
                            {formatCurrency(
                              (calculateModalitySimulation(debtAmount, 'CAPAG', 'A', false, undefined)?.totalWithDiscount || 0) -
                                (calculateModalitySimulation(debtAmount, 'CAPAG', 'C', false, undefined)?.totalWithDiscount || 0)
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-purple-200">
                        <h4 className="font-semibold mb-2">⚠️ Alerta: Discrepância de Rating</h4>
                        <p className="text-sm text-slate-700 mb-3">
                          Se o sistema PGFN calcular um Rating diferente do seu cálculo, você pode solicitar revisão
                          da Capag antes do prazo final (30/01/2026). Esta ferramenta permite validar seu cálculo
                          antecipadamente.
                        </p>
                        <div className="flex items-center gap-2 text-sm">
                          <Badge className="bg-yellow-100 text-yellow-800">Estratégia</Badge>
                          <span className="text-slate-600">
                            Calcule o rating do cliente antes dele entrar no sistema PGFN para identificar
                            discrepâncias e solicitar revisão.
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Comparativo de Modalidades */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Comparativo de Modalidades por Rating</h3>
                    <div className="space-y-4">
                      {(['A', 'B', 'C', 'D'] as const).map((rating) => {
                        // Na tela de cenários, não passar clientId para permitir ver todas as modalidades
                        const comparison = compareModalities(debtAmount, rating, false, false, undefined);
                        if (!comparison || comparison.comparisons.length === 0) return null;

                        return (
                          <div key={rating} className="border border-slate-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Badge className={getRatingColor(rating)}>Rating {rating}</Badge>
                              <span className="text-sm text-slate-600">
                                Melhor modalidade:{' '}
                                <strong>
                                  {comparison.comparisons.find((c) => c.isBest)?.name || 'N/A'}
                                </strong>
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {comparison.comparisons.map((sim) => (
                                <div
                                  key={sim.modality}
                                  className={`p-3 rounded border ${
                                    sim.isBest
                                      ? 'bg-green-50 border-green-300'
                                      : 'bg-slate-50 border-slate-200'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-slate-700">{sim.name}</span>
                                    {sim.isBest && (
                                      <Badge className="bg-green-600 text-white text-xs">⭐ Melhor</Badge>
                                    )}
                                  </div>
                                  <div className="text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-slate-600">Total:</span>
                                      <span className="font-bold">{formatCurrency(sim.totalWithDiscount)}</span>
                                    </div>
                                    {sim.savings > 0 && (
                                      <>
                                        <div className="flex justify-between text-green-600">
                                          <span>Economia:</span>
                                          <span className="font-bold">{formatCurrency(sim.savings)}</span>
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">
                                          Desconto: {((sim.savings / sim.totalWithInterest) * 100).toFixed(1)}%
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'real' && (
          <Card>
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-slate-700 mb-2">
                Validação Real a partir de ECD
              </h3>
              <p className="text-slate-600 max-w-md mx-auto">
                A validação automática a partir de arquivos ECD será implementada quando tivermos exemplos de dados.
                Por enquanto, utilize a simulação manual.
              </p>
            </div>
          </Card>
        )}

        {activeTab === 'history' && (
          <Card>
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-slate-700 mb-2">
                Histórico de Validações
              </h3>
              <p className="text-slate-600 max-w-md mx-auto">
                O histórico de validações salvas será exibido aqui em breve.
              </p>
            </div>
          </Card>
        )}
      </div>
      <ToastContainer />
    </Layout>
  );
}
