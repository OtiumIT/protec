/**
 * Linha de números de credibilidade – anos de expertise, parceria.
 * Apenas fatos reais; não inclui número de clientes.
 */
const items = [
  { value: '30+', label: 'anos de expertise contábil e consultiva (Protec)' },
  { value: 'Protec + Otium', label: 'parceria por trás do IATax' },
];

export function CredibilityNumbers() {
  return (
    <section className="w-full border-b border-slate-200/60 bg-slate-50/80 py-6" aria-label="Credibilidade e prova social">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-x-16 gap-y-5">
          {items.map((item) => (
            <div key={item.label} className="text-center">
              <span className="block text-2xl font-bold text-slate-900 sm:text-3xl">{item.value}</span>
              <span className="block text-sm text-slate-600 mt-0.5">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
