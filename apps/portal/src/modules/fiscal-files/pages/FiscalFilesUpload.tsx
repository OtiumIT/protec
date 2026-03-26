import { useState, useEffect } from 'react';
import { Layout } from '../../../shared/components/layout/Layout';
import {
  fiscalFileService,
  FiscalFileApiError,
  type InspectSpedResult,
} from '../services/fiscal-file.service';
import { clientService, type ClientWithCreatedAt } from '../../clients/services/client.service';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { Badge } from '../../../shared/components/ui/Badge';
import { useToast } from '../../../shared/components/ui/Toast';
import { Link } from 'react-router-dom';

interface FileUpload {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  stage?: 'sending' | 'processing' | 'finalizing';
  error?: string;
}

type FiscalFileType = 'sped' | 'ecd' | 'pgdas' | 'xml' | 'pdf' | 'txt' | 'outros';

interface FileMetadataFallback {
  required: boolean;
  reason?: string;
  suggested_competence?: string;
  suggested_file_type?: FiscalFileType;
  competence?: string;
  file_type?: FiscalFileType;
}

export function FiscalFilesUpload() {
  const { success, error: showError, ToastContainer } = useToast();
  const [clients, setClients] = useState<ClientWithCreatedAt[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [fileMetadataFallbacks, setFileMetadataFallbacks] = useState<Record<string, FileMetadataFallback>>({});
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  
  // Upload em lote
  const [filesToUpload, setFilesToUpload] = useState<FileUpload[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isInspectingFiles, setIsInspectingFiles] = useState(false);
  const [inspectionResults, setInspectionResults] = useState<Record<string, InspectSpedResult>>({});
  const [inspectionWarning, setInspectionWarning] = useState<string | null>(null);

  const onlyDigits = (value?: string | null) => (value || '').replace(/\D/g, '');

  const getFileStatusLabel = (fileUpload: FileUpload): string => {
    if (fileMetadataFallbacks[fileUpload.id]?.required) return 'Aguardando confirmação';
    if (fileUpload.status === 'pending') return 'Pendente';
    if (fileUpload.status === 'success') return 'Concluído';
    if (fileUpload.status === 'error') return 'Falha no processamento';
    if (fileUpload.stage === 'finalizing') return 'Finalizando...';
    if (fileUpload.stage === 'processing') return 'Processando dados...';
    return 'Enviando arquivo...';
  };

  const extractCompetenceFromFileName = (fileName: string): string | undefined => {
    const baseName = fileName.replace(/\.[^/.]+$/, '');
    const dashedDate = baseName.match(/(20\d{2})[-_](0[1-9]|1[0-2])[-_](0[1-9]|[12]\d|3[01])/);
    if (dashedDate) return `${dashedDate[1]}-${dashedDate[2]}`;
    const compactDate = baseName.match(/(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/);
    if (compactDate) return `${compactDate[1]}-${compactDate[2]}`;
    const competenceToken = baseName.match(/(20\d{2})[-_]?((0[1-9])|(1[0-2]))/);
    if (competenceToken) return `${competenceToken[1]}-${competenceToken[2]}`;
    return undefined;
  };

  const inferFileTypeFromFileName = (fileName: string): FiscalFileType => {
    const lowerName = fileName.toLowerCase();
    if (lowerName.endsWith('.xml')) return 'xml';
    if (lowerName.endsWith('.pdf')) return 'pdf';
    if (lowerName.endsWith('.txt')) {
      if (lowerName.includes('ecf')) return 'sped';
      if (lowerName.includes('ecd')) return 'ecd';
      return 'txt';
    }
    return 'outros';
  };

  const suggestMetadataForFile = (fileUpload: FileUpload): { competence?: string; fileType?: FiscalFileType } => {
    const inspected = inspectionResults[fileUpload.id];
    const byInspection =
      inspected?.inspection?.header?.period_end?.slice(0, 7) ||
      inspected?.inspection?.header?.period_start?.slice(0, 7);
    const inspectedType = inspected?.inspection?.header?.type;
    const byInspectionType: FiscalFileType | undefined =
      inspectedType === 'ecd' ? 'ecd' : inspectedType === 'ecf' ? 'sped' : undefined;
    return {
      competence: byInspection || extractCompetenceFromFileName(fileUpload.file.name),
      fileType: byInspectionType || inferFileTypeFromFileName(fileUpload.file.name),
    };
  };

  // Carregar clientes
  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (filesToUpload.length > 0 && !isLoadingClients) {
      void inspectClientFromFiles(filesToUpload);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients.length, isLoadingClients]);

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

  const handleFilesSelect = (fileList: FileList | null) => {
    if (!fileList) return;

    const newFiles: FileUpload[] = Array.from(fileList).map((file) => ({
      file,
      id: `${Date.now()}-${Math.random()}`,
      progress: 0,
      status: 'pending' as const,
    }));

    // Validar arquivos
    const validFiles: FileUpload[] = [];
    const errors: string[] = [];

    newFiles.forEach((fileUpload) => {
      const file = fileUpload.file;
      const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      const allowedExtensions = ['.txt', '.xml', '.pdf'];

      if (!allowedExtensions.includes(extension)) {
        errors.push(`${file.name}: Tipo não permitido`);
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        errors.push(`${file.name}: Arquivo muito grande (máx. 50MB)`);
        return;
      }

      validFiles.push(fileUpload);
    });

    if (errors.length > 0) {
      showError(errors.join(', '));
    }

    if (validFiles.length > 0) {
      const updatedFiles = [...filesToUpload, ...validFiles];
      setFilesToUpload(updatedFiles);
      void inspectClientFromFiles(updatedFiles);
    }
  };

  const inspectClientFromFiles = async (files: FileUpload[]) => {
    if (files.length === 0) {
      setInspectionResults({});
      setInspectionWarning(null);
      return;
    }

    setIsInspectingFiles(true);
    setInspectionWarning(null);

    const resultById: Record<string, InspectSpedResult> = {};
    for (const fileUpload of files) {
      try {
        const inspected = await fiscalFileService.inspectSped(fileUpload.file, selectedClientId || undefined);
        resultById[fileUpload.id] = inspected;
      } catch {
        // Não bloqueia o fluxo para arquivos não-SPED ou sem padrão.
      }
    }

    setInspectionResults(resultById);
    setIsInspectingFiles(false);

    const detectedDocs = Object.values(resultById).filter((item) => item.inspection.header.company_cnpj);
    if (detectedDocs.length === 0) {
      return;
    }

    const uniqueCnpjs = Array.from(
      new Set(detectedDocs.map((item) => onlyDigits(item.inspection.header.company_cnpj)).filter(Boolean))
    );

    if (uniqueCnpjs.length > 1) {
      setInspectionWarning(
        'Os arquivos selecionados possuem CNPJs diferentes. Separe por cliente para continuar.'
      );
      return;
    }

    const cnpj = uniqueCnpjs[0];
    const matchedClient =
      detectedDocs.find((item) => item.matched_client?.id)?.matched_client ||
      clients.find((client) => onlyDigits(client.cnpj) === cnpj);

    if (matchedClient?.id) {
      setSelectedClientId(matchedClient.id);
      setInspectionWarning(null);
      return;
    }

    const companyName =
      detectedDocs.find((item) => item.inspection.header.company_name)?.inspection.header.company_name || cnpj;
    setInspectionWarning(
      `Cliente não cadastrado para o CNPJ ${cnpj} (${companyName}). Cadastre o cliente para liberar o envio.`
    );
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFilesSelect(e.dataTransfer.files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFilesSelect(e.target.files);
  };

  const removeFileFromUpload = (id: string) => {
    const updated = filesToUpload.filter((f) => f.id !== id);
    setFilesToUpload(updated);
    setFileMetadataFallbacks((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    void inspectClientFromFiles(updated);
  };

  const clearAllFiles = () => {
    setFilesToUpload([]);
    setInspectionResults({});
    setInspectionWarning(null);
    setFileMetadataFallbacks({});
  };

  const handleBatchUpload = async () => {
    const filesQueue = filesToUpload.filter((item) => item.status === 'pending' || item.status === 'error');
    if (filesQueue.length === 0 || !selectedClientId) {
      showError('Selecione um cliente e ao menos um arquivo pendente para envio');
      return;
    }
    if (inspectionWarning) {
      showError(inspectionWarning);
      return;
    }

    const filesRequiringMetadata = filesQueue.filter((item) => fileMetadataFallbacks[item.id]?.required);
    for (const fileUpload of filesRequiringMetadata) {
      const fallback = fileMetadataFallbacks[fileUpload.id];
      const competence = fallback?.competence?.trim();
      if (!competence) {
        showError(`Informe a competência para ${fileUpload.file.name}`);
        return;
      }
      if (!/^\d{4}-\d{2}$/.test(competence)) {
        showError(`Competência inválida em ${fileUpload.file.name}. Use o formato YYYY-MM`);
        return;
      }
      if (!fallback?.file_type) {
        showError(`Informe o tipo do arquivo para ${fileUpload.file.name}`);
        return;
      }
    }

    setIsUploading(true);
    let successCount = 0;
    let errorCount = 0;

    // Upload sequencial com progresso
    for (let i = 0; i < filesQueue.length; i++) {
      const fileUpload = filesQueue[i];
      
      setFilesToUpload((prev) =>
        prev.map((f) =>
          f.id === fileUpload.id
            ? { ...f, status: 'uploading', progress: 8, stage: 'sending' }
            : f
        )
      );

      const startedAt = Date.now();
      const progressInterval = window.setInterval(() => {
        const elapsed = Date.now() - startedAt;
        setFilesToUpload((prev) =>
          prev.map((f) => {
            if (f.id !== fileUpload.id || f.status !== 'uploading') return f;
            if (elapsed >= 12000) {
              return { ...f, stage: 'finalizing', progress: Math.max(f.progress, 90) };
            }
            if (elapsed >= 3500) {
              return { ...f, stage: 'processing', progress: Math.max(f.progress, 58) };
            }
            return { ...f, stage: 'sending', progress: Math.max(f.progress, 18) };
          })
        );
      }, 900);

      try {
        const fileFallback = fileMetadataFallbacks[fileUpload.id];
        const suggested = suggestMetadataForFile(fileUpload);
        const inferredCompetence =
          fileFallback?.competence?.trim() ||
          suggested.competence ||
          new Date().toISOString().slice(0, 7);
        const inferredFileType =
          fileFallback?.file_type ||
          suggested.fileType ||
          inferFileTypeFromFileName(fileUpload.file.name);
        await fiscalFileService.upload({
          client_id: selectedClientId,
          competence: inferredCompetence,
          file_type: inferredFileType,
          file: fileUpload.file,
        });

        window.clearInterval(progressInterval);
        setFilesToUpload((prev) =>
          prev.map((f) =>
            f.id === fileUpload.id
              ? { ...f, status: 'success', progress: 100, stage: undefined }
              : f
          )
        );
        setFileMetadataFallbacks((prev) => {
          if (!prev[fileUpload.id]) return prev;
          const next = { ...prev };
          delete next[fileUpload.id];
          return next;
        });
        successCount++;
      } catch (error) {
        window.clearInterval(progressInterval);
        if (error instanceof FiscalFileApiError && error.code === 'UPLOAD_METADATA_REQUIRED') {
          const suggested = suggestMetadataForFile(fileUpload);
          setFileMetadataFallbacks((prev) => ({
            ...prev,
            [fileUpload.id]: {
              required: true,
              reason:
                error.message ||
                'Nao foi possivel identificar competencia/tipo automaticamente. Informe manualmente para continuar.',
              suggested_competence: suggested.competence,
              suggested_file_type: suggested.fileType,
              competence: prev[fileUpload.id]?.competence || suggested.competence || '',
              file_type: prev[fileUpload.id]?.file_type || suggested.fileType || 'txt',
            },
          }));
        }
        setFilesToUpload((prev) =>
          prev.map((f) =>
            f.id === fileUpload.id
              ? {
                  ...f,
                  status: 'error',
                  stage: undefined,
                  error:
                    error instanceof Error
                      ? error.message
                      : 'Erro desconhecido',
                }
              : f
          )
        );
        errorCount++;
      }
    }

    setIsUploading(false);
    
    // Mostrar resultado
    if (successCount > 0) {
      success(`${successCount} arquivo(s) enviado(s) com sucesso!`);
    }
    if (errorCount > 0) {
      showError(`${errorCount} arquivo(s) falharam no upload`);
    }

    // Limpar arquivos com sucesso após 3 segundos
    setTimeout(() => {
      setFilesToUpload((prev) => prev.filter((f) => f.status !== 'success'));
      // Limpar formulário se todos foram enviados
      if (filesToUpload.every((f) => f.status === 'success' || f.status === 'error')) {
        setSelectedClientId('');
        setFileMetadataFallbacks({});
      }
    }, 3000);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const pendingFiles = filesToUpload.filter((f) => f.status === 'pending');
  const uploadingFiles = filesToUpload.filter((f) => f.status === 'uploading');
  const successFiles = filesToUpload.filter((f) => f.status === 'success');
  const errorFiles = filesToUpload.filter(
    (f) => f.status === 'error' && !fileMetadataFallbacks[f.id]?.required
  );
  const detectedSpedFilesCount = Object.keys(inspectionResults).length;
  const filesRequiringMetadataCount = filesToUpload.filter(
    (fileUpload) =>
      fileMetadataFallbacks[fileUpload.id]?.required &&
      (fileUpload.status === 'pending' || fileUpload.status === 'error')
  ).length;

  return (
    <Layout>
      <ToastContainer />
      <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Upload de Arquivos Fiscais</h1>
        <p className="text-slate-600 mt-2">Faça upload de múltiplos arquivos fiscais de uma vez</p>
        <div className="mt-3">
          <Link to="/fiscal-files/calibrator" className="text-sm font-medium text-brand hover:underline">
            Abrir calibrador IN 2.306
          </Link>
        </div>
      </div>

      {/* Formulário de Upload */}
      <Card>
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Configurações do Upload</h2>

        <div className="space-y-4">
          {/* Seleção de Cliente */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Cliente *
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              required
              disabled={isLoadingClients}
            >
              <option value="">{isLoadingClients ? 'Carregando clientes...' : 'Selecione um cliente'}</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} {client.cnpj ? `- ${client.cnpj}` : ''}
                </option>
              ))}
            </select>
            {!isLoadingClients && clients.length === 0 && (
              <p className="text-xs text-red-600 mt-1">
                Nenhum cliente encontrado. Crie um cliente primeiro.
              </p>
            )}
            {isInspectingFiles && (
              <p className="text-xs text-slate-500 mt-1">Identificando cliente automaticamente pelos arquivos...</p>
            )}
            {inspectionWarning && (
              <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-xs text-amber-800">{inspectionWarning}</p>
                <div className="mt-2">
                  <Link to="/clients" className="text-xs font-medium text-amber-900 underline">
                    Ir para cadastro de clientes
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Área de Upload Múltiplo */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Arquivos *
            </label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragging
                  ? 'border-brand bg-brand/5'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              <div>
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
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="text-slate-600 mb-2">
                  Arraste múltiplos arquivos aqui ou{' '}
                  <label htmlFor="file-input" className="text-brand cursor-pointer hover:underline font-medium">
                    clique para selecionar
                  </label>
                </p>
                <input
                  id="file-input"
                  type="file"
                  accept=".txt,.xml,.pdf"
                  multiple
                  onChange={handleFileInput}
                  className="hidden"
                />
                <p className="text-xs text-slate-500">
                  Formatos permitidos: .txt, .xml, .pdf (máx. 50MB cada)
                </p>
              </div>
            </div>

            {/* Lista de Arquivos Selecionados */}
            {filesToUpload.length > 0 && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700">
                    {filesToUpload.length} arquivo(s) selecionado(s)
                  </p>
                  <Button variant="secondary" size="sm" onClick={clearAllFiles}>
                    Limpar Todos
                  </Button>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filesToUpload.map((fileUpload) => (
                    <div
                      key={fileUpload.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {fileUpload.file.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-slate-500">
                            {formatFileSize(fileUpload.file.size)}
                          </p>
                          {fileUpload.status === 'uploading' && (
                            <div className="flex-1 max-w-xs">
                              <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-brand transition-all duration-300"
                                  style={{ width: `${fileUpload.progress}%` }}
                                />
                              </div>
                            </div>
                          )}
                          {fileUpload.status === 'success' && (
                            <Badge variant="success" className="text-xs">Concluído</Badge>
                          )}
                          {fileMetadataFallbacks[fileUpload.id]?.required && (
                            <Badge variant="warning" className="text-xs">Aguardando confirmação</Badge>
                          )}
                          {fileUpload.status === 'error' && !fileMetadataFallbacks[fileUpload.id]?.required && (
                            <Badge variant="error" className="text-xs">Falha no processamento</Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{getFileStatusLabel(fileUpload)}</p>
                        {fileUpload.error && (
                          <p className="text-xs text-red-600 mt-1">{fileUpload.error}</p>
                        )}

                        {fileMetadataFallbacks[fileUpload.id]?.required && (
                          <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-3">
                            <p className="text-xs font-medium text-amber-900">
                              Confirmacao manual para este arquivo
                            </p>
                            {fileMetadataFallbacks[fileUpload.id]?.reason && (
                              <p className="text-xs text-amber-800 mt-1">
                                {fileMetadataFallbacks[fileUpload.id]?.reason}
                              </p>
                            )}
                            {(fileMetadataFallbacks[fileUpload.id]?.suggested_competence ||
                              fileMetadataFallbacks[fileUpload.id]?.suggested_file_type) && (
                              <p className="text-xs text-amber-800 mt-1">
                                Sugestao: 
                                {fileMetadataFallbacks[fileUpload.id]?.suggested_competence
                                  ? ` competencia ${fileMetadataFallbacks[fileUpload.id]?.suggested_competence}`
                                  : ''}
                                {fileMetadataFallbacks[fileUpload.id]?.suggested_competence &&
                                fileMetadataFallbacks[fileUpload.id]?.suggested_file_type
                                  ? ' |'
                                  : ''}
                                {fileMetadataFallbacks[fileUpload.id]?.suggested_file_type
                                  ? ` tipo ${fileMetadataFallbacks[fileUpload.id]?.suggested_file_type?.toUpperCase()}`
                                  : ''}
                              </p>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                              <Input
                                type="text"
                                placeholder="Competência (YYYY-MM)"
                                value={fileMetadataFallbacks[fileUpload.id]?.competence || ''}
                                onChange={(e) =>
                                  setFileMetadataFallbacks((prev) => ({
                                    ...prev,
                                    [fileUpload.id]: {
                                      ...prev[fileUpload.id],
                                      required: true,
                                      competence: e.target.value,
                                    },
                                  }))
                                }
                              />
                              <select
                                value={fileMetadataFallbacks[fileUpload.id]?.file_type || 'txt'}
                                onChange={(e) =>
                                  setFileMetadataFallbacks((prev) => ({
                                    ...prev,
                                    [fileUpload.id]: {
                                      ...prev[fileUpload.id],
                                      required: true,
                                      file_type: e.target.value as FiscalFileType,
                                    },
                                  }))
                                }
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                              >
                                <option value="sped">SPED</option>
                                <option value="ecd">ECD</option>
                                <option value="pgdas">PGDAS</option>
                                <option value="xml">XML</option>
                                <option value="pdf">PDF</option>
                                <option value="txt">TXT</option>
                                <option value="outros">Outros</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                      {fileUpload.status !== 'uploading' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => removeFileFromUpload(fileUpload.id)}
                          className="ml-2"
                        >
                          Remover
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Resumo */}
                {filesToUpload.length > 0 && (
                  <div className="flex items-center gap-4 pt-2 border-t border-slate-200">
                    {pendingFiles.length > 0 && (
                      <span className="text-xs text-slate-500">
                        {pendingFiles.length} pendente(s)
                      </span>
                    )}
                    {detectedSpedFilesCount > 0 && (
                      <span className="text-xs text-slate-600">
                        {detectedSpedFilesCount} arquivo(s) SPED inspecionado(s)
                      </span>
                    )}
                    {filesRequiringMetadataCount > 0 && (
                      <span className="text-xs text-amber-700">
                        {filesRequiringMetadataCount} arquivo(s) aguardando competência/tipo
                      </span>
                    )}
                    {uploadingFiles.length > 0 && (
                      <span className="text-xs text-blue-600">
                        {uploadingFiles.length} processando dados...
                      </span>
                    )}
                    {successFiles.length > 0 && (
                      <span className="text-xs text-indigo-600">
                        {successFiles.length} concluído(s)
                      </span>
                    )}
                    {errorFiles.length > 0 && (
                      <span className="text-xs text-red-600">
                        {errorFiles.length} falha(s) no processamento
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <Button
            onClick={handleBatchUpload}
            disabled={
              filesToUpload.length === 0 ||
              !selectedClientId ||
              !!inspectionWarning ||
              isInspectingFiles ||
              isUploading ||
              filesToUpload.some((f) => f.status === 'uploading')
            }
            className="w-full"
            size="lg"
          >
            {isUploading
              ? `Processando ${uploadingFiles.length} arquivo(s)...`
              : `Enviar ${filesToUpload.length} arquivo(s)`}
          </Button>
        </div>
      </Card>
      </div>
    </Layout>
  );
}
