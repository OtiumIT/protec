import { LandingHeader } from './LandingHeader';
import { Hero } from './Hero';
import { ProblemaSolucao } from './ProblemaSolucao';
import { Features } from './Features';
import { Differentials } from './Differentials';
import { CTA } from './CTA';
import { Footer } from './Footer';

export function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <LandingHeader />
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-8">
        <main className="flex-1">
          <Hero />
          <ProblemaSolucao />
          <Features />
          <Differentials />
          <CTA />
        </main>
      </div>
      <Footer />
    </div>
  );
}
