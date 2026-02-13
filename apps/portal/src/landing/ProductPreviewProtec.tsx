import { useState } from 'react';
import { DashboardMockup } from './DashboardMockup';

export function ProductPreviewProtec() {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <section className="py-16 sm:py-24 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Tudo por cliente e competência
          </h2>
          <p className="mt-2 text-slate-600">
            Seu painel de controle em um só lugar.
          </p>
        </div>
        <div className="mx-auto mt-12 max-w-4xl">
          <div className="relative rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden min-h-[240px] aspect-video max-h-[320px]">
            <img
              src="/product-preview.png"
              alt="Listagem de clientes e arquivos fiscais por competência"
              className={`absolute inset-0 w-full h-full object-contain bg-white transition-opacity ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageLoaded(false)}
            />
            <div
              className={`absolute inset-0 transition-opacity ${imageLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
              aria-hidden={imageLoaded}
            >
              <DashboardMockup theme="protec" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
