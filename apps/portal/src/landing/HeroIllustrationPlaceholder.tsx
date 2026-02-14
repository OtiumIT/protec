/**
 * Placeholder visual para o Hero quando hero-illustration.png não existe.
 * Ilustração abstrata que sugere dados/analytics (azul e roxo), sem parecer UI de sistema.
 */
export function HeroIllustrationPlaceholder() {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-4">
      <svg
        viewBox="0 0 400 300"
        className="h-full w-full max-h-full max-w-full object-contain opacity-90"
        aria-hidden
      >
        <defs>
          <linearGradient id="heroGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="heroGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        {/* Formas abstratas: "gráfico" e elementos flutuantes */}
        <rect x="80" y="120" width="120" height="80" rx="8" fill="url(#heroGrad1)" />
        <rect x="90" y="160" width="30" height="40" rx="4" fill="white" fillOpacity="0.2" />
        <rect x="130" y="140" width="30" height="60" rx="4" fill="white" fillOpacity="0.25" />
        <rect x="170" y="150" width="30" height="50" rx="4" fill="white" fillOpacity="0.2" />
        <circle cx="260" cy="100" r="40" fill="url(#heroGrad2)" />
        <circle cx="260" cy="100" r="24" fill="white" fillOpacity="0.15" />
        <rect x="220" y="180" width="100" height="60" rx="8" fill="url(#heroGrad1)" transform="rotate(-5 270 210)" />
        <path d="M320 140 L360 100 L360 180 L320 220 Z" fill="url(#heroGrad2)" opacity="0.8" />
      </svg>
    </div>
  );
}
