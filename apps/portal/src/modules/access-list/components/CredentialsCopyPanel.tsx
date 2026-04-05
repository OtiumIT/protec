import { useState, useEffect } from 'react';
import { accessListService, type Credentials } from '../services/access-list.service';

interface CredentialsCopyPanelProps {
  isOpen: boolean;
  entryId: string | null;
  onClose: () => void;
}

export function CredentialsCopyPanel({ isOpen, entryId, onClose }: CredentialsCopyPanelProps) {
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !entryId) return;
    setIsLoading(true);
    setError('');
    setCredentials(null);

    accessListService
      .getCredentials(entryId)
      .then((res) => setCredentials(res.data))
      .catch((err: any) => setError(err.message || 'Erro ao buscar credenciais'))
      .finally(() => setIsLoading(false));
  }, [isOpen, entryId]);

  if (!isOpen) return null;

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const whatsappText = credentials
    ? `*Acesso IATax - Cálculo Imobiliário*\n\nOlá ${credentials.name.split(' ')[0]},\n\nSeu acesso foi liberado:\n\n*Login:* ${credentials.email}\n*Senha:* ${credentials.tempPassword}\n*Link:* ${credentials.loginUrl}\n\n_Altere sua senha no primeiro acesso._`
    : '';

  const simpleText = credentials
    ? `${credentials.email} / ${credentials.tempPassword}`
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Credenciais de Acesso</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {isLoading && (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-brand/20 border-t-brand rounded-full animate-spin mx-auto" />
              <p className="text-sm text-slate-500 mt-3">Carregando...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              {error}
            </div>
          )}

          {credentials && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Login</span>
                  <button
                    onClick={() => copyToClipboard(credentials.email, 'login')}
                    className="text-xs text-brand hover:text-brand/80 font-medium"
                  >
                    {copied === 'login' ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
                <p className="text-sm font-mono text-slate-800 break-all">{credentials.email}</p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Senha provisória</span>
                  <button
                    onClick={() => copyToClipboard(credentials.tempPassword, 'password')}
                    className="text-xs text-brand hover:text-brand/80 font-medium"
                  >
                    {copied === 'password' ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
                <p className="text-sm font-mono text-slate-800">{credentials.tempPassword}</p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Link de acesso</span>
                  <button
                    onClick={() => copyToClipboard(credentials.loginUrl, 'link')}
                    className="text-xs text-brand hover:text-brand/80 font-medium"
                  >
                    {copied === 'link' ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
                <p className="text-sm font-mono text-slate-800 break-all">{credentials.loginUrl}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => copyToClipboard(whatsappText, 'whatsapp')}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  {copied === 'whatsapp' ? 'Copiado!' : 'WhatsApp'}
                </button>

                <button
                  onClick={() => copyToClipboard(simpleText, 'simple')}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 text-white rounded-xl font-semibold text-sm hover:bg-slate-800 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {copied === 'simple' ? 'Copiado!' : 'Login/Senha'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
