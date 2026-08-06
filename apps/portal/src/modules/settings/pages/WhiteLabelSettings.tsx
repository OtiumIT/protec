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
        <h1 className="text-2xl font-bold text-slate-900">Configurações White Label</h1>
        <p className="text-sm text-slate-500 mt-1">Personalize a identidade visual do seu escritório nos relatórios e links compartilhados.</p>
      </div>

      <Card title="Logo do Escritório">
        <div className="space-y-4">
          <div
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-brand/50 hover:bg-slate-50 transition-colors"
          >
            {displayLogo ? (
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
          <input
            type="text"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="Ex: Oliveira & Associados Contabilidade"
            maxLength={255}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          />
          <p className="text-xs text-slate-400">Este nome aparecerá nos relatórios e nas páginas de simulações compartilhadas.</p>
        </div>
      </Card>

      {displayLogo && (
        <Card title="Pré-visualização">
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
              <img src={displayLogo} alt="Logo" className="h-8 max-w-[120px] object-contain" />
              <span className="text-sm font-semibold text-slate-700">{brandName || 'Nome do escritório'}</span>
            </div>
            <div className="px-4 py-3 bg-slate-50 text-xs text-slate-400 text-center">
              Exemplo de como o header aparecerá nos links compartilhados
            </div>
          </div>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  );
}
