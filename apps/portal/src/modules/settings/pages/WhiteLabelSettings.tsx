import { useState, useEffect, useRef } from 'react';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { useToast } from '../../../shared/components/ui/Toast';
import { useAuth } from '../../../shared/contexts/AuthContext';
import apiRequest, { getApiUrl } from '../../../shared/services/api';
import { invalidateBrandingCache, useBranding } from '../../../shared/hooks/useBranding';

export function WhiteLabelSettings() {
  const { tenantId } = useAuth();
  const branding = useBranding();
  const { showToast } = useToast();

  const [brandName, setBrandName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (branding) {
      setBrandName(branding.report_brand_name ?? '');
      setLogoUrl(branding.report_logo_url ?? null);
    }
  }, [branding]);

  const handleFileSelect = (file: File) => {
    const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!ALLOWED.includes(file.type)) {
      showToast('Formato inválido. Use PNG, JPEG, WebP ou SVG.', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('Arquivo muito grande (máximo 2 MB).', 'error');
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setUploadSuccess(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const save = async () => {
    if (!tenantId) return;
    setSaving(true);
    try {
      if (logoFile) {
        const formData = new FormData();
        formData.append('file', logoFile);
        const token = localStorage.getItem('accessToken') ?? '';
        const base = getApiUrl();
        const res = await fetch(`${base}/api/v1/companies/${tenantId}/branding/logo`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
          body: formData,
        });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error?.message || 'Erro ao enviar logo');
        }
        const json = await res.json();
        setLogoUrl(json.data.report_logo_url);
        setLogoFile(null);
        setLogoPreview(null);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);
      }

      await apiRequest(`/api/v1/companies/${tenantId}/branding`, {
        method: 'PATCH',
        body: JSON.stringify({ report_brand_name: brandName || null }),
        token: localStorage.getItem('accessToken') ?? '',
        tenantId,
      });

      invalidateBrandingCache();
      showToast('Configurações salvas com sucesso!', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Erro ao salvar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const displayLogo = logoPreview || logoUrl;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Configurações White Label</h1>
        <p className="text-sm text-slate-500 mt-1">Personalize a identidade visual do seu escritório nos relatórios e links compartilhados.</p>
      </div>

      <Card title="Logo do Escritório">
        <div className="space-y-4">
          <div
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
            aria-label="Área de upload de logo — clique ou arraste para selecionar"
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              uploadSuccess
                ? 'border-emerald-400 bg-emerald-50'
                : 'border-slate-300 hover:border-brand/50 hover:bg-slate-50'
            }`}
          >
            {uploadSuccess ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center animate-[bounce_0.5s_ease-in-out]">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-emerald-700">Logo enviado com sucesso!</p>
                {displayLogo && (
                  <img src={displayLogo} alt="Logo" className="max-h-16 max-w-[160px] object-contain rounded-lg mt-1" />
                )}
              </div>
            ) : displayLogo ? (
              <div className="flex flex-col items-center gap-3">
                <img
                  src={displayLogo}
                  alt="Logo"
                  className="max-h-24 max-w-[200px] object-contain rounded-lg"
                />
                <p className="text-xs text-slate-500">Clique ou arraste para substituir</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm font-medium">Arraste uma imagem ou clique para selecionar</p>
                <p className="text-xs">PNG, JPEG, WebP ou SVG — até 2 MB</p>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            aria-hidden="true"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileSelect(f);
              e.target.value = '';
            }}
          />
        </div>
      </Card>

      <Card title="Nome do Escritório">
        <div className="space-y-2">
          <label htmlFor="brand-name-input" className="sr-only">Nome do escritório</label>
          <input
            id="brand-name-input"
            type="text"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="Ex: Oliveira & Associados Contabilidade"
            maxLength={255}
            aria-describedby="brand-name-help"
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          />
          <p id="brand-name-help" className="text-xs text-slate-400">Este nome aparecerá nos relatórios e nas páginas de simulações compartilhadas.</p>
        </div>
      </Card>

      {displayLogo && (
        <Card title="Pré-visualização">
          <p className="text-xs text-slate-500 mb-3">Exemplo de como a marca aparecerá em relatórios e links compartilhados:</p>
          <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
            {/* Report header mockup */}
            <div className="bg-white border-b border-slate-200 px-5 py-4 flex items-center gap-3">
              <img src={displayLogo} alt="Logo" className="h-9 max-w-[140px] object-contain" />
              <div className="border-l border-slate-200 pl-3">
                <span className="text-sm font-semibold text-slate-800">{brandName || 'Nome do escritório'}</span>
                <p className="text-[10px] text-slate-400 mt-0.5">Relatório gerado automaticamente</p>
              </div>
            </div>
            {/* Content mockup */}
            <div className="px-5 py-4 bg-slate-50 space-y-2">
              <div className="h-3 w-3/4 bg-slate-200 rounded" />
              <div className="h-3 w-1/2 bg-slate-200 rounded" />
              <div className="h-3 w-2/3 bg-slate-200 rounded" />
            </div>
            {/* Footer mockup */}
            <div className="px-5 py-3 bg-white border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">{brandName || 'Nome do escritório'}</span>
              <span className="text-[10px] text-slate-400">Página 1 de 3</span>
            </div>
          </div>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} aria-label="Salvar configurações white label">
          {saving ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Salvando…
            </span>
          ) : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  );
}
