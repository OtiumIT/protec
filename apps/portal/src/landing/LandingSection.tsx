import type { ReactNode } from 'react';

type LandingSectionTone = 'white' | 'muted' | 'dark' | 'accent';

type LandingSectionProps = {
  id?: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  tone?: LandingSectionTone;
  children: ReactNode;
  className?: string;
};

const toneClasses: Record<LandingSectionTone, string> = {
  white: 'bg-white',
  muted: 'bg-slate-50 border-y border-slate-200/70',
  dark: 'bg-gradient-to-br from-[#0f172a] via-[#1A2E4C] to-[#1e3a5f] text-white',
  accent: 'bg-landing-accent text-white',
};

export function LandingSection({
  id,
  eyebrow,
  title,
  subtitle,
  tone = 'white',
  children,
  className = '',
}: LandingSectionProps) {
  const baseToneClasses = toneClasses[tone];

  const isDark = tone === 'dark' || tone === 'accent';
  const eyebrowClasses = isDark ? 'text-landing-accent/30' : 'text-landing-accent';
  const titleClasses = isDark ? 'text-white' : 'text-slate-900';
  const subtitleClasses = isDark ? 'text-slate-200' : 'text-slate-600';

  return (
    <section
      id={id}
      className={`py-10 sm:py-14 ${baseToneClasses} ${className}`.trim()}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 scroll-mt-24">
        {(eyebrow || title || subtitle) && (
          <div className="mx-auto max-w-3xl text-center mb-8 sm:mb-10">
            {eyebrow && (
              <p className={`text-xs font-semibold tracking-[0.18em] uppercase ${eyebrowClasses}`}>
                {eyebrow}
              </p>
            )}
            {title && (
              <h2
                className={`mt-2 text-xl font-bold tracking-tight sm:text-2xl ${titleClasses}`}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p className={`mt-3 text-sm sm:text-base leading-relaxed ${subtitleClasses}`}>
                {subtitle}
              </p>
            )}
          </div>
        )}

        {children}
      </div>
    </section>
  );
}

