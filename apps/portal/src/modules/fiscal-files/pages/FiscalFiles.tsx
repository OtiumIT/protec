import { useState, useEffect } from 'react';
import { Layout } from '../../../shared/components/layout/Layout';
import { fiscalFileService, type FiscalFile } from '../services/fiscal-file.service';
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
    if (selectedClientId) {
      loadFiles();
    } else {
      setFiles([]);
    }
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
      const fullFile = await fiscalFileService.getById(file.id);
      setSelectedFile(fullFile);
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

  const getStatusDetail = (status: FiscalFile['status']) => {
    const map = {
      uploaded: 'Arquivo recebido e aguardando processamento.',
      processing: 'Processamento em andamento no backend.',
      processed: 'Processamento concluído com sucesso.',
      error: 'Não foi possível concluir o processamento.',
    };
    return map[status];
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

  const clearFilters = () => {
    setStatusFilter('');
    setCompetenceFilter('');
    setFileTypeFilter('');
  };

  const hasActiveFilters = statusFilter || competenceFilter || fileTypeFilter;

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
        <Link to="/fiscal-files/upload">
          <Button>
            <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novo Upload
          </Button>
        </Link>
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
            Arquivos {selectedClientId && `(${files.length})`}
          </h2>
        </div>

        {!selectedClientId ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-slate-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-slate-500 text-lg mb-2">Selecione um cliente para ver os arquivos</p>
            <p className="text-slate-400 text-sm">Ou faça um novo upload de arquivos</p>
          </div>
        ) : isLoading ? (
          <div className="text-center py-12">
            <p className="text-slate-500">Carregando...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-slate-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-slate-500 text-lg mb-2">Nenhum arquivo encontrado</p>
            <p className="text-slate-400 text-sm mb-4">
              {hasActiveFilters
                ? 'Tente ajustar os filtros ou faça um novo upload'
                : 'Faça upload de arquivos para começar'}
            </p>
            <Link to="/fiscal-files/upload">
              <Button variant="secondary">Fazer Upload</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => handleViewDetails(file)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-medium text-slate-900 truncate">{file.file_name}</p>
                    {getStatusBadge(file.status)}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                    <span>Competência: {file.competence}</span>
                    <span>Tipo: {file.file_type.toUpperCase()}</span>
                    <span>Tamanho: {formatFileSize(file.file_size)}</span>
                    <span>Enviado em: {formatDate(file.created_at)}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{getStatusDetail(file.status)}</p>
                  {file.processing_error && (
                    <p className="text-xs text-red-600 mt-1">Erro: {file.processing_error}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                  {file.status === 'processed' && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleViewDetails(file)}
                      >
                        Ver Detalhes
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDownload(file.id, file.file_name)}
                      >
                        Download
                      </Button>
                    </>
                  )}
                  {file.status === 'error' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleViewDetails(file)}
                    >
                      Ver Erro
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDelete(file.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Excluir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal de Detalhes */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedFile(null);
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

            {/* Metadados */}
            {selectedFile.metadata && Object.keys(selectedFile.metadata).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Metadados</h3>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <pre className="text-xs text-slate-700 overflow-auto">
                    {JSON.stringify(selectedFile.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Dados Extraídos (quando processado) */}
            {selectedFile.status === 'processed' && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Dados Extraídos</h3>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-sm text-slate-600">
                    Os dados extraídos serão exibidos aqui quando disponíveis.
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    Esta funcionalidade será implementada quando os workers processarem os arquivos.
                  </p>
                </div>
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
