/**
 * Seção de autoridade antes do rodapé – foco na marca IATax, sem citar parceiros.
 */
export function AuthoritySection() {
  return (
    <section className="w-full border-t border-slate-200/60 bg-slate-50 py-6" aria-labelledby="authority-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 id="authority-title" className="sr-only">
          Credibilidade
        </h2>
        <p className="text-center text-slate-600 text-sm sm:text-base">
          Tecnologia nascida da expertise de grandes players do setor contábil.
        </p>
      </div>
    </section>
  );
}
