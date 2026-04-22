import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { Button } from '../../../shared/components/ui/Button';
import { PasswordInput } from '../../../shared/components/ui/PasswordInput';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: 'Bem-vindo ao Sistema de Inteligência Tributária',
      description: 'Identifique milhões em oportunidades tributárias através de análise automatizada de arquivos fiscais.',
    },
    {
      title: 'Reenquadramento de Rating',
      description: 'Prove que seu cliente é Rating D e obtenha descontos de até 70% em dívidas milionárias (Portaria 6.757/22).',
    },
    {
      title: 'Simulador de Regime Tributário',
      description: 'Compare Lucro Real vs. Presumido em segundos e identifique a melhor opção para seus clientes.',
    },
    {
      title: 'Scanner de Editais PGFN',
      description: 'Cruze automaticamente dívidas dos clientes com novos editais da PGFN e identifique oportunidades.',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err) {
      const isNetworkError =
        err instanceof TypeError ||
        (err instanceof Error && (err.message === 'Failed to fetch' || err.message.includes('NetworkError')));
      const message = isNetworkError
        ? 'Servidor indisponível. Verifique se a API está em execução (ex.: pnpm run dev em apps/api).'
        : err instanceof Error
          ? err.message
          : 'Erro ao fazer login. Verifique suas credenciais.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Side - Carousel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand via-brand-dark to-otium-black relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand/90 via-brand-dark/90 to-otium-black/90"></div>
        
        {/* Slide Content */}
        <div className="relative z-10 w-full flex items-center justify-center p-12">
          <div className="max-w-lg text-center">
            <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
              {slides[currentSlide].title}
            </h2>
            <p className="text-xl text-slate-300 leading-relaxed">
              {slides[currentSlide].description}
            </p>
          </div>
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all backdrop-blur-sm"
          aria-label="Slide anterior"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all backdrop-blur-sm"
          aria-label="Próximo slide"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Slide Indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex space-x-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentSlide ? 'bg-brand w-8' : 'bg-white/30'
              }`}
              aria-label={`Ir para slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Voltar ao início */}
          <div className="mb-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Voltar ao início
            </Link>
          </div>

          {/* Logo and Header */}
          <div className="mb-10 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start mb-6 gap-4">
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
              Inteligência Tributária
            </h2>
            <p className="text-slate-600 mb-1">
              Sistema de Análise Fiscal e Tributária
            </p>
            <p className="text-sm text-slate-500">
              Entre para continuar
            </p>
          </div>

          {/* Login Form */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
                  placeholder="seu@email.com"
                />
              </div>

              <PasswordInput
                label="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="rounded-lg py-3"
                placeholder="••••••••"
              />

              <Button type="submit" variant="secondary" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-otium-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Entrando...
                  </span>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                to="/forgot-password"
                className="text-sm text-slate-600 hover:text-brand font-medium transition-colors"
              >
                Esqueceu sua senha?
              </Link>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center space-y-2">
            <p className="text-xs text-slate-500">
              IATax Soluções Inteligentes
            </p>
            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} IATax Soluções Inteligentes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
