import { Link } from 'react-router-dom';
import { LandingHeader } from '../LandingHeader';
import { Footer } from '../Footer';

const SECTIONS = [
  { id: 'objeto', label: 'Objeto' },
  { id: 'cadastro-acesso', label: 'Cadastro e Acesso' },
  { id: 'responsabilidade', label: 'Responsabilidade' },
  { id: 'responsabilidade-insumos', label: 'Responsabilidade pelos Insumos' },
  { id: 'propriedade-intelectual', label: 'Propriedade Intelectual' },
  { id: 'pagamento', label: 'Pagamento e Cancelamento' },
  { id: 'rescisao', label: 'Rescisão e Suspensão' },
  { id: 'alteracoes', label: 'Alterações' },
  { id: 'disposicoes', label: 'Disposições Gerais' },
] as const;

function PdfIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

export function TermosDeUso() {
  const handleDownloadPdf = () => {
    window.print();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA]">
      <LandingHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-[240px_1fr] lg:gap-12 lg:items-start">
            {/* Navegação lateral (desktop) */}
            <nav
              className="hidden lg:block sticky top-24 print:hidden"
              aria-label="Navegação dos termos"
            >
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                  Nesta página
                </p>
                <ul className="space-y-1.5 text-sm">
                  {SECTIONS.map(({ id, label }) => (
                    <li key={id}>
                      <a
                        href={`#${id}`}
                        className="block py-1 text-slate-600 hover:text-[#0f172a] transition-colors"
                      >
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>

            {/* Conteúdo principal + nav mobile */}
            <div className="min-w-0 flex flex-col gap-6">
              <div className="lg:hidden print:hidden">
                <label htmlFor="nav-termos" className="sr-only">
                  Ir para seção
                </label>
                <select
                  id="nav-termos"
                  onChange={(e) => {
                    const id = e.target.value;
                    if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#0f172a]"
                >
                  <option value="">Nesta página</option>
                  {SECTIONS.map(({ id, label }) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <article className="min-w-0 max-w-[800px]">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#0f172a] sm:text-3xl">
                    Termos de Uso
                  </h1>
                  <p className="mt-1 text-sm text-slate-600">
                    IATax Soluções Inteligentes
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors print:hidden"
                >
                  <PdfIcon />
                  Baixar em PDF
                </button>
              </div>

              {/* Box de resumo */}
              <div className="mb-8 rounded-xl border-l-4 border-[#0f172a] bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-700 leading-relaxed">
                  <strong className="text-[#0f172a]">Em resumo:</strong> Somos uma ferramenta de apoio, seus dados estão isolados e a assinatura é recorrente.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] sm:p-8">
                <p className="text-slate-600 leading-relaxed text-[15px]">
                  Ao utilizar a plataforma IATax, você concorda com os termos descritos abaixo. Recomendamos a leitura integral antes do cadastro. O tratamento de dados pessoais rege-se pela nossa{' '}
                  <Link to="/politica-privacidade" className="text-[#0f172a] font-medium underline hover:no-underline">
                    Política de Privacidade
                  </Link>.
                </p>

                <section className="mt-10 space-y-10">
                  <div id="objeto" className="scroll-mt-24">
                    <h2 className="text-lg font-bold text-[#0f172a] sm:text-xl">
                      1. Objeto
                    </h2>
                    <p className="mt-2 text-slate-600 leading-relaxed text-[15px]">
                      O IATax é uma plataforma de inteligência fiscal e contábil que oferece ferramentas para análise da capacidade de pagamento (transação tributária), simulação do aumento da tributação do lucro presumido (LC 224/2025), tributação da alta renda/dividendos (IRPFM - Lei 12.570/2025), organização de clientes e arquivos fiscais. O serviço é prestado sob o modelo SaaS (Software as a Service) pela IATax Soluções Inteligentes.
                    </p>
                  </div>

                  <div id="cadastro-acesso" className="scroll-mt-24">
                    <h2 className="text-lg font-bold text-[#0f172a] sm:text-xl">
                      2. Cadastro e Acesso
                    </h2>
                    <p className="mt-2 text-slate-600 leading-relaxed text-[15px]">
                      O usuário é integralmente responsável pelo uso das credenciais de acesso (login e senha) e por todas as atividades realizadas em sua conta. É vedado o compartilhamento de credenciais com terceiros. Os dados são organizados por empresa (tenant), com isolamento total entre clientes, garantindo que informações de uma organização não sejam acessíveis a outras.
                    </p>
                  </div>

                  <div id="responsabilidade" className="scroll-mt-24">
                    <h2 className="text-lg font-bold text-[#0f172a] sm:text-xl">
                      3. Limitação de Responsabilidade
                    </h2>
                    <p className="mt-2 text-slate-600 leading-relaxed text-[15px]">
                      O IATax é uma ferramenta de apoio à decisão, baseada em leis e normas vigentes, incluindo a Portaria PGFN nº 6.757/2022 e a IN RFB nº 2.306/2026. Os resultados das simulações e validações são informativos e não substituem consultoria jurídica, contábil ou tributária. A IATax não se responsabiliza por decisões tomadas com base exclusivamente nos outputs do sistema. Recomenda-se sempre a validação por profissionais qualificados antes de atos definitivos.
                    </p>
                  </div>

                  <div id="responsabilidade-insumos" className="scroll-mt-24">
                    <h2 className="text-lg font-bold text-[#0f172a] sm:text-xl">
                      4. Responsabilidade pelos Insumos
                    </h2>
                    <p className="mt-2 text-slate-600 leading-relaxed text-[15px]">
                      O usuário é responsável pela veracidade, atualidade e licitude dos dados e arquivos enviados à plataforma. A qualidade dos resultados gerados depende diretamente da qualidade dos insumos informados. A IATax não se responsabiliza por erros ou inconsistências decorrentes de dados incorretos, desatualizados ou incompletos fornecidos pelo usuário.
                    </p>
                  </div>

                  <div id="propriedade-intelectual" className="scroll-mt-24">
                    <h2 className="text-lg font-bold text-[#0f172a] sm:text-xl">
                      5. Propriedade Intelectual
                    </h2>
                    <p className="mt-2 text-slate-600 leading-relaxed text-[15px]">
                      A plataforma IATax, incluindo sua interface, algoritmos, marcas e demais elementos, é de propriedade da IATax Soluções Inteligentes e está protegida por leis de propriedade intelectual. O uso da plataforma concede ao usuário apenas uma licença limitada, não exclusiva e intransferível, para utilização durante o período de assinatura ativa. É vedada a cópia, modificação, engenharia reversa ou utilização para fins não autorizados.
                    </p>
                  </div>

                  <div id="pagamento" className="scroll-mt-24">
                    <h2 className="text-lg font-bold text-[#0f172a] sm:text-xl">
                      6. Pagamento e Cancelamento
                    </h2>
                    <p className="mt-2 text-slate-600 leading-relaxed text-[15px]">
                      A assinatura do IATax é recorrente (mensal ou anual, conforme o plano contratado). O pagamento é debitado automaticamente no período escolhido. O cancelamento pode ser solicitado a qualquer momento pelo canal de atendimento; o acesso permanece ativo até o final do ciclo já pago. Não há reembolso proporcional em caso de cancelamento antecipado.
                    </p>
                  </div>

                  <div id="rescisao" className="scroll-mt-24">
                    <h2 className="text-lg font-bold text-[#0f172a] sm:text-xl">
                      7. Rescisão e Suspensão
                    </h2>
                    <p className="mt-2 text-slate-600 leading-relaxed text-[15px]">
                      A IATax pode suspender ou encerrar o acesso em caso de inadimplência, violação destes termos, uso fraudulento ou atividade que prejudique a plataforma ou terceiros. A suspensão por inadimplência será precedida de notificação quando aplicável. Após o encerramento, os dados serão tratados conforme a Política de Privacidade.
                    </p>
                  </div>

                  <div id="alteracoes" className="scroll-mt-24">
                    <h2 className="text-lg font-bold text-[#0f172a] sm:text-xl">
                      8. Alterações
                    </h2>
                    <p className="mt-2 text-slate-600 leading-relaxed text-[15px]">
                      A IATax pode alterar estes termos. Alterações substanciais serão comunicadas com antecedência por e-mail ou aviso na plataforma. O uso continuado após a vigência da nova versão constitui aceite. Se não concordar, o usuário poderá rescindir e solicitar o cancelamento antes da entrada em vigor.
                    </p>
                  </div>

                  <div id="disposicoes" className="scroll-mt-24">
                    <h2 className="text-lg font-bold text-[#0f172a] sm:text-xl">
                      9. Disposições Gerais
                    </h2>
                    <p className="mt-2 text-slate-600 leading-relaxed text-[15px]">
                      Estes termos regem-se pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca de Londrina/PR para dirimir controvérsias, com renúncia a qualquer outro, por mais privilegiado que seja. A tolerância da IATax quanto a eventuais inadimplementes não implica renúncia ao exercício de seus direitos.
                    </p>
                  </div>
                </section>
              </div>
            </article>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
