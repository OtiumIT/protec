import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../../shared/components/ui/Button';
import { PasswordInput } from '../../../shared/components/ui/PasswordInput';
import { authService } from '../services/auth.service';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Link inválido. Solicite um novo link de recuperação de senha.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setValidationError('');

    if (password.length < 8) {
      setValidationError('A senha deve ter no mínimo 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setValidationError('As senhas não coincidem.');
      return;
    }

    setIsLoading(true);

    try {
      await authService.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Ocorreu um erro. Tente novamente.';
      setError(message);
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
              Nova Senha Segura
            </h2>
            <p className="text-xl text-slate-300 leading-relaxed">
              Escolha uma senha forte com no mínimo 8 caracteres para proteger sua conta.
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
              Redefinir senha
            </h2>
            <p className="text-slate-600">
              Crie uma nova senha para sua conta.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8">
            {success ? (
              /* Estado de sucesso */
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Senha redefinida com sucesso!
                </h3>
                <p className="text-slate-600 text-sm mb-6">
                  Sua senha foi atualizada. Você será redirecionado para o login em instantes...
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center text-sm font-medium text-brand hover:underline"
                >
                  Ir para o login agora
                </Link>
              </div>
            ) : (
              /* Formulário */
              <>
                {(error || (!token && !success)) && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error || 'Link inválido. Solicite um novo link de recuperação de senha.'}
                    {!token && (
                      <div className="mt-2">
                        <Link to="/forgot-password" className="font-medium underline">
                          Solicitar novo link
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {validationError && (
                  <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                    {validationError}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <PasswordInput
                    label="Nova senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    autoFocus
                    className="rounded-lg py-3"
                    placeholder="••••••••"
                    disabled={!token}
                  />

                  <PasswordInput
                    label="Confirmar nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="rounded-lg py-3"
                    placeholder="••••••••"
                    disabled={!token}
                  />

                  <Button
                    type="submit"
                    variant="secondary"
                    className="w-full"
                    size="lg"
                    disabled={isLoading || !token}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-otium-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Salvando...
                      </span>
                    ) : (
                      'Salvar nova senha'
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
