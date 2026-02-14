import { LandingHeader } from './LandingHeader';
import { Hero } from './Hero';
import { ProblemaSolucao } from './ProblemaSolucao';
import { Features } from './Features';
import { Differentials } from './Differentials';
import { PricingSection } from './PricingSection';
import { FAQ } from './FAQ';
import { CTA } from './CTA';
import { AuthoritySection } from './AuthoritySection';
import { Footer } from './Footer';

export function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <LandingHeader />
      <Hero />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <ProblemaSolucao />
          <Features />
          <Differentials showPartners={false} />
          <PricingSection />
          <FAQ />
          <CTA />
        </div>
      </main>
      <AuthoritySection />
      <Footer />
    </div>
  );
}
