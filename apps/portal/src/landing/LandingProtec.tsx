import { LandingHeaderProtec } from './LandingHeaderProtec';
import { HeroProtec } from './HeroProtec';
import { WhoIsFor } from './WhoIsFor';
import { FeaturesProtec } from './FeaturesProtec';
import { ProductPreviewProtec } from './ProductPreviewProtec';
import { HowYouUseProtec } from './HowYouUseProtec';
import { DifferentialsProtec } from './DifferentialsProtec';
import { CTAProtec } from './CTAProtec';
import { FooterProtec } from './FooterProtec';

export function LandingProtec() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <LandingHeaderProtec />
      <main className="flex-1">
        <HeroProtec />
        <WhoIsFor />
        <FeaturesProtec />
        <ProductPreviewProtec />
        <HowYouUseProtec />
        <DifferentialsProtec />
        <CTAProtec />
      </main>
      <FooterProtec />
    </div>
  );
}
