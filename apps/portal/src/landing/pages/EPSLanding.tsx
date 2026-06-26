import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/contexts/AuthContext';
import { parseDigits, formatCpf, formatCnpj, isValidCpf, isValidCnpj } from '../../shared/utils/masks';

function formatDocument(value: string): string {
  const digits = parseDigits(value);
  if (digits.length <= 11) return formatCpf(digits);
  return formatCnpj(digits);
}

export function EPSLanding() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [documentError, setDocumentError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateDocument = (digits: string): string => {
    if (digits.length === 0) return '';
    if (digits.length < 11) return '';
    if (digits.length === 11) return isValidCpf(digits) ? '' : 'CPF inválido. Verifique os dígitos.';
    if (digits.length === 14) return isValidCnpj(digits) ? '' : 'CNPJ inválido. Verifique os dígitos.';
    return 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos).';
  };

  const handleDocumentChange = (value: string) => {
    const digits = parseDigits(value);
    if (digits.length <= 14) {
      setDocument(formatDocument(value));
      setDocumentError(validateDocument(digits));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (name.trim().length < 3) {
      setError('Nome deve ter no mínimo 3 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.');
      return;
    }

    const digits = parseDigits(document);
    const isCpf = digits.length === 11;
    const isCnpj = digits.length === 14;

    if (!isCpf && !isCnpj) {
      setError('Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.');
      return;
    }

    if (isCpf && !isValidCpf(digits)) {
      setError('CPF inválido. Verifique os dígitos informados.');
      return;
    }

    if (isCnpj && !isValidCnpj(digits)) {
      setError('CNPJ inválido. Verifique os dígitos informados.');
      return;
    }

    setIsLoading(true);
    try {
      await register({
        company: {
          person_type: isCpf ? 'pf' : 'pj',
          legal_name: name,
          cpf: isCpf ? digits : undefined,
          cnpj: isCnpj ? digits : undefined,
        },
        user: { name, email, password },
        source: 'EPS',
      });
      navigate('/dashboard');
    } catch (err: any) {
      const msg =
        err?.data?.error?.message ||
        err?.response?.data?.error?.message ||
        err?.message ||
        'Erro ao criar conta. Tente novamente.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative font-sans text-slate-800 antialiased flex flex-col md:flex-row min-h-screen overflow-x-hidden">
      {/* Lado esquerdo — fundos com overflow-hidden; coluna em overflow-visible para o Pablo poder atravessar a junta sem cortar */}
      <div className="md:w-1/2 bg-[#0B1120] text-white flex flex-col justify-center md:justify-start px-8 py-12 md:px-12 lg:px-16 relative min-h-screen">
        <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden>
          <div
            className="absolute inset-0 bg-cover bg-left bg-no-repeat"
            style={{ backgroundImage: "url('/eps-hero-bg2.png')" }}
          />
          <div className="absolute inset-0 bg-[#0B1120]/50" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B1120]/65 via-[#0B1120]/25 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/35 to-transparent" />
        </div>

        {/* Pablo acima de fundos/overlays (z-15); textos no bloco seguinte z-30 ficam por cima */}
        <div
          className="pointer-events-none absolute bottom-0 left-[50vw] z-[15] hidden h-[min(95vh,960px)] w-[min(50vw,560px)] -translate-x-[calc(70%+80px)] md:flex md:items-end md:justify-center"
          aria-hidden
        >
          <img
            src="/pablo-arruda3.png"
            alt=""
            className="max-h-full w-auto object-contain object-bottom [filter:drop-shadow(0_28px_48px_rgba(0,0,0,0.4))]"
          />
        </div>

        <div className="relative z-30 md:max-w-[min(100%,28rem)] md:pr-4">
          {/* Logos + badge */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-16">
            <img
              src="/logo-iatax.png"
              alt="IATax"
              className="h-24 w-24 shrink-0 rounded-xl object-contain"
            />

            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/20">
              <svg
                className="w-5 h-5 text-blue-400 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                />
              </svg>
              <div className="text-xs">
                <span className="block text-slate-400">Parceria Exclusiva:</span>
                <span className="font-semibold text-slate-200">
                  Eng. do Planejamento Sucessório
                </span>
              </div>
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
            <span className="block">ATIVE SEU ACESSO</span>
            <span className="mt-1 block">
              EXCLUSIVO AO <span className="text-blue-400">IATax</span>
            </span>
          </h1>
          <p className="text-lg text-slate-300 mb-10 leading-relaxed">
            O ambiente restrito aos alunos do curso Engenharia do Planejamento
            Sucessório (EPS)
          </p>

          {/* Benefícios */}
          <ul className="mb-12 space-y-4 text-white">
            {[
              'Automatize rotinas complexas de planejamento',
              'Escalar sua atuação no direito sucessório',
              'Tecnologia com segurança',
            ].map((text) => (
              <li key={text} className="flex items-center gap-3 font-medium">
                <svg
                  className="w-6 h-6 text-emerald-400 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {text}
              </li>
            ))}
          </ul>

          <div className="rounded-xl border border-white/25 bg-white/[0.08] px-4 py-3.5 backdrop-blur-sm">
            <p className="text-sm text-slate-200 leading-snug">
              <span className="text-slate-400">Já possui acesso?</span>{' '}
              <Link
                to="/login"
                className="font-semibold text-blue-300 underline decoration-blue-400/80 underline-offset-[3px] hover:text-blue-200 hover:decoration-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1120] rounded-sm"
              >
                Fazer login no IATax
              </Link>
            </p>
          </div>
        </div>

        {/* Mobile: retrato abaixo do conteúdo, z-15 para ficar acima do fundo e abaixo dos textos (z-30) */}
        <div className="relative z-[15] mt-8 flex justify-center md:hidden">
          <img
            src="/pablo-arruda3.png"
            alt="Pablo Arruda - Engenharia do Planejamento Sucessório"
            className="max-h-56 w-auto object-contain object-bottom drop-shadow-xl"
          />
        </div>
      </div>

      {/* Lado direito — grid z-0; card z-30 acima do Pablo (z-15) na junta */}
      <div className="relative z-10 md:w-1/2 min-h-screen flex items-center justify-center md:items-start md:justify-start px-8 py-12 md:px-12 lg:px-16">
        <div
          className="absolute inset-0 z-0 bg-slate-50"
          style={{
            backgroundSize: '40px 40px',
            backgroundImage:
              'linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)',
          }}
          aria-hidden
        />

        <div className="relative z-30 w-full max-w-xl">
          <div
            role="region"
            aria-label="Quem já possui conta pode ir ao login"
            className="mb-5 flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          >
            <p className="text-sm text-slate-800">
              <span className="font-semibold text-slate-900">Já ativou sua conta?</span>{' '}
              <span className="text-slate-600">
                Entre com o mesmo e-mail e senha do cadastro.
              </span>
            </p>
            <Link
              to="/login"
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#0066FF] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Entrar na plataforma
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] w-full overflow-hidden border border-slate-100">
            <div className="p-8">
            {/* Header — mesma altura visual do título principal à esquerda */}
            <div className="text-center md:text-left mb-6">
              <h2 className="text-2xl font-bold text-slate-800">
                Crie sua conta em segundos
              </h2>
              <p className="mt-3 text-sm text-slate-600">
                Primeira vez aqui? Preencha o formulário abaixo.{' '}
                <Link
                  to="/login"
                  className="font-semibold text-[#0066FF] hover:text-blue-700 hover:underline underline-offset-2"
                >
                  Já tenho login — ir para o acesso
                </Link>
              </p>
            </div>

            {/* Alerta */}
            <div className="bg-[#FFF8E6] border border-[#FFE5A3] rounded-lg p-4 mb-6 flex gap-3">
              <svg
                className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p className="text-sm text-yellow-800 leading-tight">
                <strong className="font-semibold">ATENÇÃO:</strong> Para validar
                sua licença automaticamente, utilize o mesmo e-mail utilizado na
                compra do curso.
              </p>
            </div>

            {/* Erro */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Form */}
            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* Nome */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Nome Completo"
                  required
                  autoFocus
                />
              </div>

              {/* CPF/CNPJ */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  value={document}
                  onChange={(e) => handleDocumentChange(e.target.value)}
                  className={`block w-full pl-10 pr-3 py-3 border rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-colors ${
                    documentError
                      ? 'border-red-400 focus:ring-red-400 focus:border-red-400'
                      : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  placeholder="CPF ou CNPJ"
                  required
                />
              </div>
              {documentError && (
                <p className="text-sm text-red-600 -mt-2 ml-1">{documentError}</p>
              )}

              {/* E-mail */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="E-mail de Acesso"
                  required
                />
              </div>

              {/* Senha */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Crie sua Senha"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  )}
                </button>
              </div>

              {/* Confirmar Senha */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Confirme sua Senha"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  aria-label={
                    showConfirmPassword ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'
                  }
                >
                  {showConfirmPassword ? (
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  )}
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#0066FF] hover:bg-blue-700 text-white font-semibold py-3.5 px-4 rounded-lg transition-colors duration-200 mt-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Criando conta...' : 'ATIVAR MEU ACESSO E ENTRAR'}
              </button>

              <p className="text-center text-xs text-slate-500 mt-4">
                Ao cadastrar, você concorda com os{' '}
                <a href="/termos-de-uso" className="text-blue-600 hover:underline">
                  Termos de Uso
                </a>
                .
              </p>
            </form>
          </div>

          {/* WhatsApp suporte */}
          <div className="bg-slate-50 border-t border-slate-100 p-6 flex items-center gap-4">
            <a
              href="https://wa.me/5561998138714"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 bg-[#25D366] rounded-full flex items-center justify-center flex-shrink-0 shadow-sm hover:bg-[#20bd5a] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2"
              aria-label="Abrir WhatsApp do suporte — equipe Prof. Pablo Arruda"
            >
              <svg
                className="w-6 h-6 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </a>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Teve algum problema?
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Suporte Equipe do Prof. Pablo Arruda:{' '}
                <a
                  href="https://wa.me/5561998138714"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#25D366] font-medium hover:underline"
                >
                  (61) 99813-8714
                </a>
              </p>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
