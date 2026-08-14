import { useState } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';
import apiRequest from '../../services/api';

type SimulationType = 'in_2306' | 'irpf_alta_renda' | 'distribuicao_lucros' | 'locacao_pf_pj' | 'ganho_capital_imovel' | 'comparativo_regimes' | 'precificador' | 'split_payment' | 'itbi_integralizacao' | 'itcmd_doacao' | 'projeto_pps';

interface ShareSimulationButtonProps {
  simulationId: string;
  simulationType: SimulationType;
  title?: string;
  /** For property simulators that already have their own share endpoint */
  usePropertyEndpoint?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function ShareSimulationButton({
  simulationId,
  simulationType,
  title,
  usePropertyEndpoint = false,
  size = 'sm',
  className = '',
}: ShareSimulationButtonProps) {
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const generateLink = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken') ?? '';
      const tenantId = localStorage.getItem('tenantId') ?? '';

      let result: { token: string; expires_at: string };

      if (usePropertyEndpoint) {
        const res = await apiRequest<{ data: { token: string; expires_at: string } }>(
          `/api/v1/properties/simulations/${simulationId}/share`,
          { method: 'POST', body: JSON.stringify({ title }), token, tenantId }
        );
        result = res.data;
      } else {
        const res = await apiRequest<{ data: { token: string; expires_at: string } }>(
          '/api/v1/simulation-shares',
          {
            method: 'POST',
            body: JSON.stringify({ simulation_type: simulationType, simulation_id: simulationId, title }),
            token,
            tenantId,
          }
        );
        result = res.data;
      }

      const publicPath = usePropertyEndpoint
        ? `/simulacao-publica?token=${encodeURIComponent(result.token)}`
        : `/simulacao-publica?token=${encodeURIComponent(result.token)}&type=generic`;
      const url = `${window.location.origin}${publicPath}`;
      setShareUrl(url);
      setExpiresAt(result.expires_at);
      setShowModal(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao gerar link');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setShareUrl(null);
    setExpiresAt(null);
    setCopied(false);
  };

  return (
    <>
      <Button
        variant="secondary"
        size={size}
        onClick={generateLink}
        disabled={loading}
        className={className}
        title="Gerar link compartilhável"
      >
        {loading ? (
          '…'
        ) : (
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Compartilhar
          </span>
        )}
      </Button>

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      <Modal isOpen={showModal} onClose={closeModal} title="Link Compartilhável" size="md">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Qualquer pessoa com este link pode visualizar os resultados da simulação (somente leitura).
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl ?? ''}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm bg-slate-50 text-slate-700 select-all"
              onFocus={(e) => e.target.select()}
            />
            <Button size="sm" onClick={copyToClipboard}>
              {copied ? 'Copiado!' : 'Copiar'}
            </Button>
          </div>

          {expiresAt && (
            <p className="text-xs text-slate-400">
              Expira em: {new Date(expiresAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
