import { useEffect, useState } from 'react';
import { Button } from '../../../shared/components/ui/Button';
import { gestaoImobiliariaService as svc } from '../services/gestao-imobiliaria.service';
import type { PropertyDocument } from '@shared/core';
import { DOC_CATEGORIAS, inputCls } from '../ui';

const MAX_BYTES = 15 * 1024 * 1024;

export function LeaseDocuments({
  leaseId,
  onError,
  onSuccess,
}: {
  leaseId: string;
  onError: (m: string) => void;
  onSuccess: (m: string) => void;
}) {
  const [docs, setDocs] = useState<PropertyDocument[]>([]);
  const [categoria, setCategoria] = useState('contrato_assinado');
  const [uploading, setUploading] = useState(false);

  const reload = () => svc.listDocuments({ lease_id: leaseId }).then(setDocs).catch(() => setDocs([]));
  useEffect(() => { reload(); }, [leaseId]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_BYTES) return onError('Arquivo excede o limite de 15 MB.');
    setUploading(true);
    try {
      await svc.uploadLeaseDocument(leaseId, file, categoria);
      onSuccess('Anexo enviado');
      reload();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Falha ao enviar anexo');
    } finally {
      setUploading(false);
    }
  };

  const download = async (id: string) => {
    try {
      const { download_url } = await svc.getDocumentDownloadUrl(id);
      window.open(download_url, '_blank', 'noopener');
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Falha ao baixar anexo');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Excluir este anexo?')) return;
    try {
      await svc.deleteDocument(id);
      onSuccess('Anexo excluído');
      reload();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Falha ao excluir anexo');
    }
  };

  const catLabel = (v: string) => DOC_CATEGORIAS.find((c) => c.value === v)?.label ?? v;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="block min-w-[180px]">
          <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Categoria</span>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={inputCls}>
            {DOC_CATEGORIAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
        <label className="inline-flex">
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,application/pdf,image/*,.docx"
            className="hidden"
            disabled={uploading}
            onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }}
          />
          <Button size="sm" variant="secondary" disabled={uploading} onClick={(ev) => {
            const input = (ev.currentTarget.parentElement as HTMLLabelElement).querySelector('input');
            input?.click();
          }}>
            {uploading ? 'Enviando…' : 'Anexar arquivo'}
          </Button>
        </label>
        <span className="text-xs text-slate-400">PDF, imagem ou DOCX · até 15 MB</span>
      </div>
      {docs.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhum anexo neste contrato.</p>
      ) : (
        <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <div className="min-w-0">
                <div className="font-medium text-slate-800 truncate">{d.nome_arquivo}</div>
                <div className="text-xs text-slate-500">{catLabel(d.categoria)}{d.tamanho_bytes ? ` · ${(d.tamanho_bytes / 1024).toFixed(0)} KB` : ''}</div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button type="button" onClick={() => download(d.id)} className="text-indigo-700 text-xs font-semibold">Baixar</button>
                <button type="button" onClick={() => remove(d.id)} className="text-red-600 text-xs font-semibold">Excluir</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
