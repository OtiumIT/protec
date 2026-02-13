import { LandingHeader } from './LandingHeader';
import { Hero } from './Hero';
import { WhoIsFor } from './WhoIsFor';
import { Features } from './Features';
import { ProductPreview } from './ProductPreview';
import { HowYouUse } from './HowYouUse';
import { Differentials } from './Differentials';
import { CTA } from './CTA';
import { Footer } from './Footer';

export function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <LandingHeader />
      <main className="flex-1">
        <Hero />
        <WhoIsFor />
        <Features />
        <ProductPreview />
        <HowYouUse />
        <Differentials />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
