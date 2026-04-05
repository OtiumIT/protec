import { useState, useRef } from 'react';
import { accessListService, type ImportResult } from '../services/access-list.service';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CsvImportModal({ isOpen, onClose, onSuccess }: CsvImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setResult(null);
    setError('');

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        setError('CSV deve ter ao menos um cabeçalho e uma linha de dados');
        return;
      }

      const separator = lines[0].includes(';') ? ';' : ',';
      const cols = lines.map((l) =>
        l.split(separator).map((c) => c.trim().replace(/^["']|["']$/g, ''))
      );

      setHeaders(cols[0]);
      setPreview(cols.slice(1, 6));
    };
    reader.readAsText(selected);
  };

  const handleImport = async () => {
    if (!file) return;
    setIsLoading(true);
    setError('');

    try {
      const res = await accessListService.importCsv(file);
      setResult(res.data);
      if (res.data.imported > 0) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao importar CSV');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview([]);
    setHeaders([]);
    setResult(null);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Importar CSV</h2>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!result && (
            <>
              <div
                className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-brand/50 hover:bg-brand/5 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <svg className="w-12 h-12 mx-auto text-slate-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm text-slate-600 font-medium">
                  {file ? file.name : 'Clique para selecionar um arquivo CSV'}
                </p>
                <p className="text-xs text-slate-400 mt-1">Colunas esperadas: nome, email, telefone, cpf, empresa</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {headers.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">
                    Preview ({preview.length} de {preview.length}+ linhas)
                  </h3>
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50">
                          {headers.map((h, i) => (
                            <th key={i} className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row, i) => (
                          <tr key={i} className="border-t border-slate-100">
                            {row.map((cell, j) => (
                              <td key={j} className="px-3 py-2 text-slate-700 whitespace-nowrap">
                                {cell || <span className="text-slate-300">-</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {result && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-semibold text-green-800">{result.imported} registros importados</p>
                  {result.duplicates > 0 && (
                    <p className="text-sm text-green-700">{result.duplicates} duplicatas ignoradas</p>
                  )}
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="font-semibold text-red-800 mb-2">{result.errors.length} erros:</p>
                  <ul className="text-sm text-red-700 space-y-1">
                    {result.errors.slice(0, 10).map((e, i) => (
                      <li key={i}>Linha {e.row} ({e.email}): {e.reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            {result ? 'Fechar' : 'Cancelar'}
          </button>
          {!result && (
            <button
              onClick={handleImport}
              disabled={!file || isLoading}
              className="px-4 py-2 text-sm font-semibold text-white bg-brand rounded-lg hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Importando...' : 'Importar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
