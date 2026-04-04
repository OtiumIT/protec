import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../shared/components/ui/Button';
import { authService } from '../services/auth.service';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await authService.forgotPassword(email);
      setSubmitted(true);
    } catch {
      setError('Ocorreu um erro ao processar sua solicitação. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Side - decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand via-brand-dark to-otium-black relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand/90 via-brand-dark/90 to-otium-black/90" />
        <div className="relative z-10 w-full flex items-center justify-center p-12">
          <div className="max-w-lg text-center">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-8 backdrop-blur-sm">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
              Recuperação de Acesso
            </h2>
            <p className="text-xl text-slate-300 leading-relaxed">
              Enviaremos um link seguro para o seu e-mail para que você possa redefinir sua senha.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Voltar ao login */}
          <div className="mb-6">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Voltar ao login
            </Link>
          </div>

          {/* Logo and Header */}
          <div className="mb-8 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start mb-6 gap-3">
              <img
                src="/logo-iatax.png"
                alt="IATax"
                className="w-10 h-10 flex-shrink-0 object-contain rounded-lg"
              />
              <h1 className="text-xl font-bold text-slate-900">
                IATax Soluções Inteligentes
              </h1>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              Esqueceu sua senha?
            </h2>
            <p className="text-slate-600">
              Informe seu e-mail para receber as instruções de recuperação.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8">
            {submitted ? (
              /* Estado de sucesso */
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Verifique seu e-mail
                </h3>
                <p className="text-slate-600 text-sm mb-6">
                  Se o endereço <strong>{email}</strong> estiver cadastrado, você receberá as instruções para redefinir sua senha em breve.
                </p>
                <p className="text-xs text-slate-400 mb-6">
                  Não recebeu o e-mail? Verifique sua caixa de spam ou tente novamente.
                </p>
                <button
                  onClick={() => { setSubmitted(false); setEmail(''); }}
                  className="text-sm text-brand hover:underline font-medium"
                >
                  Tentar com outro e-mail
                </button>
              </div>
            ) : (
              /* Formulário */
              <>
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      E-mail cadastrado
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      autoFocus
                      className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
                      placeholder="seu@email.com"
                    />
                  </div>

                  <Button type="submit" variant="secondary" className="w-full" size="lg" disabled={isLoading}>
                    {isLoading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-otium-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Enviando...
                      </span>
                    ) : (
                      'Enviar instruções'
                    )}
                  </Button>
                </form>
              </>
            )}
          </div>

          <div className="mt-8 text-center space-y-2">
            <p className="text-xs text-slate-500">IATax Soluções Inteligentes</p>
            <p className="text-xs text-slate-400">© {new Date().getFullYear()} IATax Soluções Inteligentes</p>
          </div>
        </div>
      </div>
    </div>
  );
}
