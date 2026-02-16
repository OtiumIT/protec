import { useState, useEffect } from 'react';
import { Layout } from '../../../shared/components/layout/Layout';
import { fiscalFileService } from '../services/fiscal-file.service';
import { clientService, type ClientWithCreatedAt } from '../../clients/services/client.service';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { Badge } from '../../../shared/components/ui/Badge';
import { useToast } from '../../../shared/components/ui/Toast';

interface FileUpload {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export function FiscalFilesUpload() {
  const { success, error: showError, ToastContainer } = useToast();
  const [clients, setClients] = useState<ClientWithCreatedAt[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [competence, setCompetence] = useState<string>('');
  const [fileType, setFileType] = useState<'sped' | 'ecd' | 'pgdas' | 'xml' | 'pdf' | 'txt' | 'outros'>('sped');
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  
  // Upload em lote
  const [filesToUpload, setFilesToUpload] = useState<FileUpload[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Carregar clientes
  useEffect(() => {
    loadClients();
  }, []);

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
      setFilesToUpload((prev) => [...prev, ...validFiles]);
    }
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
    setFilesToUpload((prev) => prev.filter((f) => f.id !== id));
  };

  const clearAllFiles = () => {
    setFilesToUpload([]);
  };

  const handleBatchUpload = async () => {
    if (filesToUpload.length === 0 || !selectedClientId || !competence) {
      showError('Preencha todos os campos obrigatórios e selecione pelo menos um arquivo');
      return;
    }

    // Validar formato de competência
    if (!/^\d{4}-\d{2}$/.test(competence)) {
      showError('Competência deve estar no formato YYYY-MM (ex: 2024-01)');
      return;
    }

    setIsUploading(true);
    let successCount = 0;
    let errorCount = 0;

    // Upload sequencial com progresso
    for (let i = 0; i < filesToUpload.length; i++) {
      const fileUpload = filesToUpload[i];
      
      setFilesToUpload((prev) =>
        prev.map((f) =>
          f.id === fileUpload.id
            ? { ...f, status: 'uploading', progress: 0 }
            : f
        )
      );

      try {
        await fiscalFileService.upload({
          client_id: selectedClientId,
          competence,
          file_type: fileType,
          file: fileUpload.file,
        });

        setFilesToUpload((prev) =>
          prev.map((f) =>
            f.id === fileUpload.id
              ? { ...f, status: 'success', progress: 100 }
              : f
          )
        );
        successCount++;
      } catch (error) {
        setFilesToUpload((prev) =>
          prev.map((f) =>
            f.id === fileUpload.id
              ? {
                  ...f,
                  status: 'error',
                  error: error instanceof Error ? error.message : 'Erro desconhecido',
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
        setCompetence('');
        setSelectedClientId('');
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
  const errorFiles = filesToUpload.filter((f) => f.status === 'error');

  return (
    <Layout>
      <ToastContainer />
      <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Upload de Arquivos Fiscais</h1>
        <p className="text-slate-600 mt-2">Faça upload de múltiplos arquivos fiscais de uma vez</p>
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
          </div>

          {/* Competência e Tipo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Competência (YYYY-MM) *
              </label>
              <Input
                type="text"
                placeholder="2024-01"
                value={competence}
                onChange={(e) => setCompetence(e.target.value)}
                pattern="\d{4}-\d{2}"
                required
              />
              <p className="text-xs text-slate-500 mt-1">Formato: YYYY-MM</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tipo de Arquivo *
              </label>
              <select
                value={fileType}
                onChange={(e) => setFileType(e.target.value as any)}
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
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
                            <Badge variant="success" className="text-xs">Enviado</Badge>
                          )}
                          {fileUpload.status === 'error' && (
                            <Badge variant="error" className="text-xs">Erro</Badge>
                          )}
                        </div>
                        {fileUpload.error && (
                          <p className="text-xs text-red-600 mt-1">{fileUpload.error}</p>
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
                    {uploadingFiles.length > 0 && (
                      <span className="text-xs text-blue-600">
                        {uploadingFiles.length} enviando...
                      </span>
                    )}
                    {successFiles.length > 0 && (
                      <span className="text-xs text-indigo-600">
                        {successFiles.length} enviado(s)
                      </span>
                    )}
                    {errorFiles.length > 0 && (
                      <span className="text-xs text-red-600">
                        {errorFiles.length} erro(s)
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
              !competence ||
              isUploading ||
              filesToUpload.some((f) => f.status === 'uploading')
            }
            className="w-full"
            size="lg"
          >
            {isUploading
              ? `Enviando ${uploadingFiles.length} arquivo(s)...`
              : `Enviar ${filesToUpload.length} arquivo(s)`}
          </Button>
        </div>
      </Card>
      </div>
    </Layout>
  );
}
