import { useState, useEffect, useMemo } from 'react';
import { Layout } from '../../../shared/components/layout/Layout';
import {
  fiscalFileService,
  type FiscalFile,
  type FiscalFileExtractionSummary,
} from '../services/fiscal-file.service';
import { clientService, type ClientWithCreatedAt } from '../../clients/services/client.service';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { Badge } from '../../../shared/components/ui/Badge';
import { Modal } from '../../../shared/components/ui/Modal';
import { ConfirmModal } from '../../../shared/components/ui/ConfirmModal';
import { useToast } from '../../../shared/components/ui/Toast';
import { Link } from 'react-router-dom';

export function FiscalFiles() {
  const { success, error: showError, ToastContainer } = useToast();
  const [clients, setClients] = useState<ClientWithCreatedAt[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  
  // Lista de arquivos
  const [files, setFiles] = useState<FiscalFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [competenceFilter, setCompetenceFilter] = useState<string>('');
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('');
  
  // Detalhes do arquivo
  const [selectedFile, setSelectedFile] = useState<FiscalFile | null>(null);
  const [selectedSummary, setSelectedSummary] = useState<FiscalFileExtractionSummary | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
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

  // Carregar clientes
  useEffect(() => {
    loadClients();
  }, []);

  // Carregar arquivos quando filtros mudarem
  useEffect(() => {
    loadFiles();
  }, [selectedClientId, statusFilter, competenceFilter, fileTypeFilter]);

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

  const loadFiles = async () => {
    setIsLoading(true);
    try {
      const result = await fiscalFileService.list({
        client_id: selectedClientId,
        competence: competenceFilter || undefined,
        status: statusFilter || undefined,
      });
      
      // Filtrar por tipo se necessário
      let filteredFiles = result.files;
      if (fileTypeFilter) {
        filteredFiles = filteredFiles.filter((f) => f.file_type === fileTypeFilter);
      }
      
      setFiles(filteredFiles);
    } catch (error) {
      console.error('Error loading files:', error);
      showError('Erro ao carregar arquivos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      const url = await fiscalFileService.getDownloadUrl(fileId);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      success('Download iniciado');
    } catch (error) {
      console.error('Error downloading file:', error);
      showError('Erro ao baixar arquivo');
    }
  };

  const handleViewDetails = async (file: FiscalFile) => {
    try {
      const [fullFile, summary] = await Promise.all([
        fiscalFileService.getById(file.id),
        fiscalFileService.getSummary(file.id),
      ]);
      setSelectedFile(fullFile);
      setSelectedSummary(summary);
      setIsDetailModalOpen(true);
    } catch (error) {
      showError('Erro ao carregar detalhes do arquivo');
    }
  };

  const handleDelete = async (fileId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirmar exclusão',
      message: 'Tem certeza que deseja excluir este arquivo? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        try {
          await fiscalFileService.delete(fileId);
          success('Arquivo excluído com sucesso');
          loadFiles();
        } catch (error) {
          showError('Erro ao excluir arquivo');
        }
      },
    });
  };

  const getStatusBadge = (status: FiscalFile['status']) => {
    const statusMap = {
      uploaded: { label: 'Enviando arquivo...', variant: 'info' as const },
      processing: { label: 'Processando dados...', variant: 'warning' as const },
      processed: { label: 'Concluído', variant: 'success' as const },
      error: { label: 'Falha no processamento', variant: 'error' as const },
    };

    const statusInfo = statusMap[status];
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatNumber = (value: unknown) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);
  };

  const clearFilters = () => {
    setStatusFilter('');
    setCompetenceFilter('');
    setFileTypeFilter('');
  };

  const hasActiveFilters = statusFilter || competenceFilter || fileTypeFilter;
  const spedInspection = selectedFile?.metadata?.sped_inspection as any;
  const modulePrefill = selectedSummary?.fiscal_file?.metadata?.module_prefill as any;
  const registerChartData = useMemo(() => {
    const entries = Object.entries((spedInspection?.register_counts || {}) as Record<string, number>)
      .filter(([, count]) => typeof count === 'number' && count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
    const max = entries.length > 0 ? entries[0][1] : 1;
    return entries.map(([reg, count]) => ({
      reg,
      count,
      percent: Math.round((count / max) * 100),
    }));
  }, [spedInspection]);
  const ecfQuarterSignals = (spedInspection?.ecf_tax_signals?.trimestres || []) as Array<any>;
  const maxQuarterRevenue = useMemo(
    () =>
      ecfQuarterSignals.reduce(
        (acc, item) => Math.max(acc, Number(item?.receitas_possiveis || 0)),
        1
      ),
    [ecfQuarterSignals]
  );
  const dreBars = useMemo(
    () =>
      [
        { label: 'Receita bruta', key: 'receita_bruta' },
        { label: 'Deduções', key: 'deducoes' },
        { label: 'Receita líquida', key: 'receita_liquida' },
        { label: 'Lucro bruto', key: 'lucro_bruto' },
        { label: 'Despesas operacionais', key: 'despesas_operacionais' },
        { label: 'Resultado período', key: 'resultado_periodo' },
      ]
        .map((item) => ({
          ...item,
          value: Number(spedInspection?.dre?.[item.key] || 0),
        }))
        .filter((item) => item.value !== 0),
    [spedInspection]
  );
  const maxDreValue = useMemo(
    () =>
      dreBars.reduce((acc, item) => Math.max(acc, Math.abs(item.value)), 1),
    [dreBars]
  );

  return (
    <Layout>
      <ToastContainer />
      <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Arquivos Fiscais</h1>
          <p className="text-slate-600 mt-2">Visualize e gerencie os arquivos fiscais enviados</p>
        </div>
        <div className="flex gap-2">
          <Link to="/fiscal-files/calibrator">
            <Button variant="tertiary">Calibrador IN 2.306</Button>
          </Link>
          <Link to="/fiscal-files/upload">
            <Button>
              <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Novo Upload
            </Button>
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Filtros</h2>
          
          <div className="flex flex-wrap gap-2">
            {/* Cliente */}
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              disabled={isLoadingClients}
            >
              <option value="">{isLoadingClients ? 'Carregando clientes...' : 'Todos os clientes'}</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>

            {/* Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            >
              <option value="">Todos os status</option>
              <option value="uploaded">Enviando arquivo...</option>
              <option value="processing">Processando dados...</option>
              <option value="processed">Concluído</option>
              <option value="error">Falha no processamento</option>
            </select>

            {/* Tipo */}
            <select
              value={fileTypeFilter}
              onChange={(e) => setFileTypeFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            >
              <option value="">Todos os tipos</option>
              <option value="sped">SPED</option>
              <option value="ecd">ECD</option>
              <option value="pgdas">PGDAS</option>
              <option value="xml">XML</option>
              <option value="pdf">PDF</option>
              <option value="txt">TXT</option>
              <option value="outros">Outros</option>
            </select>
            
            {/* Competência */}
            <Input
              type="text"
              placeholder="Competência (YYYY-MM)"
              value={competenceFilter}
              onChange={(e) => setCompetenceFilter(e.target.value)}
              className="w-40"
            />
            
            {hasActiveFilters && (
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                Limpar Filtros
              </Button>
            )}
            
            <Button variant="secondary" size="sm" onClick={loadFiles}>
              Atualizar
            </Button>
          </div>
        </div>
      </Card>

      {/* Lista de Arquivos */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900">
            Arquivos ({files.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="text-center py-20 bg-[#f8fafc] rounded-lg border border-dashed border-slate-200">
            <div className="animate-pulse flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-slate-200 mb-4"></div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-none">Carregando dados...</p>
            </div>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-20 bg-[#f8fafc] rounded-lg border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="h-8 w-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-base font-black text-slate-800 uppercase tracking-tight mb-2">Nenhum arquivo processado</p>
            <p className="text-sm text-slate-500 font-medium mb-6">
              {hasActiveFilters
                ? 'Os filtros atuais não retornaram nenhum arquivo fiscal.'
                : 'Inicie o upload de arquivos fiscais (SPED/ECD) para análise.'}
            </p>
            <Link to="/fiscal-files/upload">
              <Button size="sm">Fazer Primeiro Upload</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="table-gov border-t border-slate-100">
              <thead>
                <tr>
                  <th className="pl-6">Identificação do Arquivo</th>
                  <th>Competência</th>
                  <th>Tipo / Tamanho</th>
                  <th>Status de Processamento</th>
                  <th className="text-right pr-6">Ações</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.id} className="group cursor-pointer" onClick={() => handleViewDetails(file)}>
                    <td className="pl-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slate-50 border border-slate-200 flex items-center justify-center text-[#0c326f] font-black text-[10px]">
                          {file.file_type.substring(0, 3).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 tracking-tight leading-none mb-1 group-hover:text-[#1351b4] transition-colors">{file.file_name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">ID: {file.id.substring(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="font-black text-slate-700 tracking-tighter">{file.competence}</span>
                    </td>
                    <td>
                      <div className="text-xs">
                        <span className="font-bold text-slate-600">{file.file_type.toUpperCase()}</span>
                        <span className="mx-2 text-slate-300">•</span>
                        <span className="text-slate-500 font-medium">{formatFileSize(file.file_size)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1.5 items-start">
                        {getStatusBadge(file.status)}
                        {file.processing_error && <span className="text-[9px] text-rose-600 font-bold uppercase leading-none">Erro: Falha Crítica</span>}
                      </div>
                    </td>
                    <td className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleDownload(file.id, file.file_name)}
                          className="!p-2 hover:text-[#1351b4]"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleDelete(file.id)}
                          className="!p-2 text-rose-600 hover:bg-rose-50 border-transparent"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de Detalhes */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedFile(null);
          setSelectedSummary(null);
        }}
        title={selectedFile ? `Detalhes: ${selectedFile.file_name}` : 'Detalhes do Arquivo'}
        size="large"
      >
        {selectedFile && (
          <div className="space-y-6">
            {/* Informações Básicas */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Informações Básicas</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Nome do Arquivo</p>
                  <p className="font-medium text-slate-900">{selectedFile.file_name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Tipo</p>
                  <p className="font-medium text-slate-900">{selectedFile.file_type.toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Competência</p>
                  <p className="font-medium text-slate-900">{selectedFile.competence}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Tamanho</p>
                  <p className="font-medium text-slate-900">{formatFileSize(selectedFile.file_size)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedFile.status)}</div>
                </div>
                <div>
                  <p className="text-sm text-slate-500">MIME Type</p>
                  <p className="font-medium text-slate-900">{selectedFile.mime_type || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Enviado em</p>
                  <p className="font-medium text-slate-900">{formatDate(selectedFile.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Atualizado em</p>
                  <p className="font-medium text-slate-900">{formatDate(selectedFile.updated_at)}</p>
                </div>
              </div>
            </div>

            {/* Erro de Processamento */}
            {selectedFile.processing_error && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Erro de Processamento</h3>
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{selectedFile.processing_error}</p>
                </div>
              </div>
            )}

            {/* Metadados — Refined Institutional Style */}
            {selectedFile.metadata && Object.keys(selectedFile.metadata).length > 0 && (
              <div className="space-y-8">
                {selectedSummary && (
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[#1351b4]"></div>
                    <div className="flex items-center gap-3 mb-6">
                       <h4 className="text-sm font-bold text-[#0c326f] uppercase tracking-wider">Painel Analítico de Confiança</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {[
                        { label: 'Rating Validator', value: selectedSummary.prefill_confidence.rating_validator, color: '#1351b4' },
                        { label: 'Simulador IN 2.306', value: selectedSummary.prefill_confidence.simulador_in2306, color: '#1351b4' },
                        { label: 'IRPF Alta Renda', value: selectedSummary.prefill_confidence.irpf_alta_renda, color: '#1351b4' },
                      ].map((item) => {
                        const pct = Math.max(0, Math.min(100, Math.round(item.value * 100)));
                        return (
                          <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">{item.label}</p>
                            <div className="flex items-center gap-4">
                              <div
                                className="h-12 w-12 rounded-full border-4 border-slate-50 flex items-center justify-center relative shadow-inner"
                                style={{
                                  background: `conic-gradient(${item.color} ${pct}%, #f1f5f9 ${pct}% 100%)`,
                                }}
                              >
                                <div className="absolute inset-1 bg-white rounded-full flex items-center justify-center text-[10px] font-black text-slate-800">{pct}%</div>
                              </div>
                              <div>
                                <p className="text-2xl font-black text-[#0c326f] leading-none mb-1">{pct}%</p>
                                <p className="text-[9px] font-black text-emerald-600 uppercase">Qualidade Adequada</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[10px] mt-6 pt-6 border-t border-slate-200">
                      <div className="flex flex-col gap-1">
                        <p className="text-slate-500 font-bold uppercase tracking-tighter">Tipos extraídos</p>
                        <p className="font-bold text-slate-800">
                          {selectedSummary.extracted_data_types.join(', ') || 'Nenhum'}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-slate-500 font-bold uppercase tracking-tighter">Registros mapeados</p>
                        <p className="font-bold text-slate-800">
                          {Object.values(spedInspection?.register_counts || {}).reduce((acc: number, n: any) => acc + Number(n || 0), 0)}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-slate-500 font-bold uppercase tracking-tighter">Dados persistidos</p>
                        <p className="font-bold text-slate-800">{selectedSummary.extracted_data.length} blocos estruturados</p>
                      </div>
                    </div>
                  </div>
                )}

                {spedInspection?.header && (
                  <div className="p-6 bg-white border border-[#d2dae2] rounded-lg shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
                      <svg className="w-16 h-16 text-[#0c326f]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                      </svg>
                    </div>
                    <h4 className="text-xs font-black text-[#0c326f] uppercase tracking-widest mb-4">Inspeção Técnica de Cabeçalho (Sped)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6 text-sm">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Tipo de Relatório</p>
                        <p className="font-bold text-slate-800 uppercase">{spedInspection.header.type || '-'}</p>
                      </div>
                        <div>
                          <p className="text-slate-500">CNPJ</p>
                          <p className="font-medium text-slate-900">{spedInspection.header.company_cnpj || '-'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Razão social</p>
                          <p className="font-medium text-slate-900">{spedInspection.header.company_name || '-'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Período inicial</p>
                          <p className="font-medium text-slate-900">{spedInspection.header.period_start || '-'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Período final</p>
                          <p className="font-medium text-slate-900">{spedInspection.header.period_end || '-'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Registros mapeados</p>
                          <p className="font-medium text-slate-900">
                            {Object.keys(spedInspection.register_counts || {}).length}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {spedInspection?.balance_sheet && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                      <h4 className="text-sm font-semibold text-slate-900 mb-2">Balanço (J100)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div><p className="text-slate-500">Ativo total</p><p className="font-medium">{spedInspection.balance_sheet.ativo_total ?? '-'}</p></div>
                        <div><p className="text-slate-500">Ativo circulante</p><p className="font-medium">{spedInspection.balance_sheet.ativo_circulante ?? '-'}</p></div>
                        <div><p className="text-slate-500">Ativo não circulante</p><p className="font-medium">{spedInspection.balance_sheet.ativo_nao_circulante ?? '-'}</p></div>
                        <div><p className="text-slate-500">Passivo total</p><p className="font-medium">{spedInspection.balance_sheet.passivo_total ?? '-'}</p></div>
                        <div><p className="text-slate-500">Passivo circulante</p><p className="font-medium">{spedInspection.balance_sheet.passivo_circulante ?? '-'}</p></div>
                        <div><p className="text-slate-500">Patrimônio líquido</p><p className="font-medium">{spedInspection.balance_sheet.patrimonio_liquido ?? '-'}</p></div>
                      </div>
                    </div>
                  )}

                  {spedInspection?.dre && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                      <h4 className="text-sm font-semibold text-slate-900 mb-2">DRE (J150)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div><p className="text-slate-500">Receita bruta</p><p className="font-medium">{spedInspection.dre.receita_bruta ?? '-'}</p></div>
                        <div><p className="text-slate-500">Deduções</p><p className="font-medium">{spedInspection.dre.deducoes ?? '-'}</p></div>
                        <div><p className="text-slate-500">Receita líquida</p><p className="font-medium">{spedInspection.dre.receita_liquida ?? '-'}</p></div>
                        <div><p className="text-slate-500">Lucro bruto</p><p className="font-medium">{spedInspection.dre.lucro_bruto ?? '-'}</p></div>
                        <div><p className="text-slate-500">Despesas operacionais</p><p className="font-medium">{spedInspection.dre.despesas_operacionais ?? '-'}</p></div>
                        <div><p className="text-slate-500">Resultado período</p><p className="font-medium">{spedInspection.dre.resultado_periodo ?? '-'}</p></div>
                      </div>
                    </div>
                  )}

                  {modulePrefill && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="text-sm font-semibold text-blue-900 mb-2">Pré-preenchimentos disponíveis</h4>
                      <div className="flex flex-wrap gap-2">
                        {modulePrefill.rating_validator && <Badge variant="info">Rating Validator</Badge>}
                        {modulePrefill.simulador_in2306 && <Badge variant="info">Simulador IN 2.306</Badge>}
                        {modulePrefill.irpf_alta_renda && <Badge variant="info">IRPF Alta Renda</Badge>}
                      </div>

                      {modulePrefill.simulador_in2306 && (
                        <div className="mt-3 rounded border border-blue-200 bg-white p-3">
                          <p className="text-xs font-medium text-blue-900">
                            IN 2.306 - payload estruturado
                          </p>
                          <p className="text-xs text-blue-800 mt-1">
                            Ano: {modulePrefill.simulador_in2306.ano ?? '-'} | Confiança geral:{' '}
                            {Math.round(((modulePrefill.simulador_in2306.confidence?.overall || 0) as number) * 100)}% | Cobertura:{' '}
                            {Math.round(((modulePrefill.simulador_in2306.confidence?.coverage || 0) as number) * 100)}%
                          </p>
                          <div className="mt-2 space-y-1">
                            {(modulePrefill.simulador_in2306.trimestres || []).map((t: any, idx: number) => (
                              <p key={`in2306-quarter-${idx}`} className="text-xs text-blue-800">
                                T{idx + 1}: produtos {t.produtos_mercadorias || 0} | serviços {t.servicos || 0} | demais {t.demais_receitas || 0}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {registerChartData.length > 0 && (
                    <div className="p-4 bg-cyan-50 border border-cyan-200 rounded-lg">
                      <h4 className="text-sm font-semibold text-cyan-900 mb-2">Mapa de densidade de registros SPED</h4>
                      <p className="text-xs text-cyan-800 mb-3">
                        Top registros por ocorrência (indicador rápido de riqueza técnica do arquivo).
                      </p>
                      <div className="space-y-2">
                        {registerChartData.map((item) => (
                          <div key={item.reg}>
                            <div className="flex items-center justify-between text-xs text-cyan-900">
                              <span>|{item.reg}|</span>
                              <span>{item.count}</span>
                            </div>
                            <div className="h-2 rounded bg-cyan-100">
                              <div
                                className="h-2 rounded bg-cyan-500"
                                style={{ width: `${item.percent}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {spedInspection?.ecf_tax_signals && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <h4 className="text-sm font-semibold text-emerald-900 mb-2">Sinais fiscais ECF (foco IN 2.306)</h4>
                      <p className="text-xs text-emerald-800 mb-3">
                        Receita anual estimada: {formatNumber(spedInspection.ecf_tax_signals.receita_bruta_anual_estimada)}
                      </p>
                      {ecfQuarterSignals.length > 0 && (
                        <div className="mb-3 rounded border border-emerald-200 bg-white p-3">
                          <p className="text-xs font-medium text-emerald-900 mb-2">Gráfico trimestral de receitas possíveis</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {ecfQuarterSignals.map((t: any, idx: number) => {
                              const receitas = Number(t.receitas_possiveis || 0);
                              const barPct = Math.max(6, Math.round((receitas / Math.max(maxQuarterRevenue, 1)) * 100));
                              return (
                                <div key={`ecf-chart-${idx}`} className="rounded border border-emerald-100 p-2">
                                  <p className="text-[11px] text-emerald-800 mb-1">T{idx + 1}</p>
                                  <div className="h-16 flex items-end">
                                    <div className="w-full bg-emerald-500 rounded-t" style={{ height: `${barPct}%` }} />
                                  </div>
                                  <p className="text-[11px] text-emerald-900 mt-1">{formatNumber(receitas)}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      <div className="space-y-2">
                        {(spedInspection.ecf_tax_signals.trimestres || []).map((t: any, idx: number) => (
                          <div key={`${t.inicio || idx}`} className="rounded border border-emerald-200 bg-white p-2 text-xs">
                            <p className="font-medium text-emerald-900">
                              Trimestre {idx + 1}: {t.inicio || '-'} a {t.fim || '-'}
                            </p>
                            <p className="text-emerald-800">
                              Receitas possíveis: {formatNumber(t.receitas_possiveis)} | Despesas possíveis: {formatNumber(t.despesas_possiveis)} | Resultado aprox.: {formatNumber(t.resultado_aproximado)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {dreBars.length > 0 && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <h4 className="text-sm font-semibold text-amber-900 mb-2">Análise gráfica DRE</h4>
                      <p className="text-xs text-amber-800 mb-3">
                        Magnitude relativa dos principais indicadores da DRE.
                      </p>
                      <div className="space-y-2">
                        {dreBars.map((item) => {
                          const pct = Math.max(4, Math.round((Math.abs(item.value) / Math.max(maxDreValue, 1)) * 100));
                          const isNegative = item.value < 0;
                          return (
                            <div key={item.key}>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-amber-900">{item.label}</span>
                                <span className="text-amber-900">{formatNumber(item.value)}</span>
                              </div>
                              <div className="h-2 rounded bg-amber-100">
                                <div
                                  className={`h-2 rounded ${isNegative ? 'bg-red-500' : 'bg-amber-500'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {spedInspection?.prefill_catalog?.length > 0 && (
                    <div className="p-4 bg-violet-50 border border-violet-200 rounded-lg">
                      <h4 className="text-sm font-semibold text-violet-900 mb-2">Catálogo de campos prontos (origem SPED)</h4>
                      <div className="space-y-2">
                        {spedInspection.prefill_catalog.map((item: any, idx: number) => (
                          <div key={`${item.modulo}-${item.campo_destino}-${idx}`} className="rounded border border-violet-200 bg-white p-2 text-xs">
                            <p className="font-medium text-violet-900">
                              [{item.modulo}] {item.campo_destino}
                            </p>
                            <p className="text-violet-800">
                              Origem: {item.origem_sped} | Transformação: {item.transformacao} | Confiança: {Math.round((item.confianca || 0) * 100)}%
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <details className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                    <summary className="text-sm font-medium text-slate-700 cursor-pointer">JSON completo dos metadados</summary>
                    <pre className="text-xs text-slate-700 overflow-auto mt-3">
                      {JSON.stringify(selectedFile.metadata, null, 2)}
                    </pre>
                  </details>
                </div>
            )}

            {/* Dados Extraídos (quando processado) */}
            {selectedFile.status === 'processed' && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Dados Extraídos</h3>
                {selectedSummary?.extracted_data?.length ? (
                  <div className="space-y-3">
                    {selectedSummary.extracted_data.map((row, idx) => (
                      <div
                        key={`${row.data_type}-${idx}`}
                        className="p-4 bg-slate-50 border border-slate-200 rounded-lg"
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <p className="text-sm font-semibold text-slate-900">
                            {row.data_type}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatDate(row.created_at)}
                          </p>
                        </div>
                        <pre className="text-xs text-slate-700 overflow-auto">
                          {JSON.stringify(row.data, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                    <p className="text-sm text-slate-600">
                      Nenhum dado estruturado foi persistido para este arquivo.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Ações */}
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
              {selectedFile.status === 'processed' && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    handleDownload(selectedFile.id, selectedFile.file_name);
                  }}
                >
                  Download
                </Button>
              )}
              <Button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedFile(null);
                  setSelectedSummary(null);
                }}
              >
                Fechar
              </Button>
            </div>
          </div>
        )}
        </Modal>

        {/* Confirm Modal */}
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
          variant="danger"
        />
      </div>
    </Layout>
  );
}
