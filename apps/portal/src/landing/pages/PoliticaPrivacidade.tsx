import { LandingHeader } from '../LandingHeader';
import { Footer } from '../Footer';

export function PoliticaPrivacidade() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA]">
      <LandingHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-[1fr_320px] lg:gap-12 lg:items-start">
            {/* Coluna principal - leitura focada (max 800px efetivo) */}
            <article className="min-w-0 max-w-[800px]">
              <h1 className="text-3xl font-bold tracking-tight text-[#0f172a] sm:text-4xl">
                Compromisso IATax com a Privacidade e LGPD
              </h1>
              <p className="mt-4 text-slate-600 leading-relaxed">
                A IATax Soluções Inteligentes está comprometida com a proteção dos dados pessoais de seus usuários, em total conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018). Esta política descreve como tratamos suas informações. O controlador dos dados é a IATax Soluções Inteligentes. Dúvidas sobre privacidade: contato@iatax.com.br.
              </p>

              <section className="mt-10 space-y-10">
                <div>
                  <h2 className="text-xl font-bold text-[#0f172a] sm:text-2xl">
                    1. Coleta de Dados
                  </h2>
                  <p className="mt-3 text-slate-600 leading-relaxed">
                    Coletamos apenas os dados necessários para a prestação dos nossos serviços: identificação (nome, e-mail), dados cadastrais da empresa e informações fiscais necessárias para o processamento de simulações e análises. O tratamento fundamenta-se nas bases legais de execução de contrato (Art. 7º, V, LGPD) e, quando aplicável, consentimento. Não comercializamos dados pessoais. Podemos compartilhar dados com operadores (hospedagem, processamento de pagamento) para viabilizar o serviço, sob contrato que garante o mesmo padrão de proteção. Não realizamos transferência internacional de dados sem as salvaguardas previstas na LGPD.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-bold text-[#0f172a] sm:text-2xl">
                    2. Segurança Técnica
                  </h2>
                  <p className="mt-3 text-slate-600 leading-relaxed">
                    Utilizamos criptografia em trânsito e em repouso, controles de acesso rigorosos e monitoramento contínuo. Cada empresa possui isolamento total de banco de dados (multitenancy por company_id), garantindo que os dados de um cliente jamais possam ser acessados por outro. Todas as operações são registradas em log para auditoria.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-bold text-[#0f172a] sm:text-2xl">
                    3. Retenção de Arquivos
                  </h2>
                  <p className="mt-3 text-slate-600 leading-relaxed">
                    Os arquivos fiscais e documentos enviados são armazenados pelo tempo necessário ao cumprimento das finalidades do serviço e das obrigações legais. Após o encerramento da conta ou término do prazo de retenção, os dados são eliminados de forma segura, salvo quando a legislação exigir manutenção por período superior.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-bold text-[#0f172a] sm:text-2xl">
                    4. Suporte ao Titular
                  </h2>
                  <p className="mt-3 text-slate-600 leading-relaxed">
                    O titular dos dados pode, a qualquer momento, exercer seus direitos de acesso, correção, exclusão, portabilidade, informação sobre compartilhamento e revogação do consentimento (Art. 18, LGPD). Entre em contato pelo e-mail contato@iatax.com.br ou pelo canal Fale Conosco. Responderemos em até 15 (quinze) dias. Em caso de insatisfação, o titular pode recorrer à Autoridade Nacional de Proteção de Dados (ANPD).
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-bold text-[#0f172a] sm:text-2xl">
                    5. Alterações nesta Política
                  </h2>
                  <p className="mt-3 text-slate-600 leading-relaxed">
                    Podemos atualizar esta política para refletir mudanças legais ou operacionais. Alterações relevantes serão comunicadas por e-mail ou aviso na plataforma. O uso continuado após a divulgação constitui aceite, salvo quando a alteração exigir novo consentimento nos termos da LGPD.
                  </p>
                </div>
              </section>
            </article>

            {/* Card lateral - Destaque de Segurança */}
            <aside className="lg:sticky lg:top-24">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0f172a]/10 text-[#0f172a]">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-bold text-[#0f172a]">
                  Expertise que prioriza a segurança
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  O IATax nasceu da expertise de especialistas com décadas de atuação no setor contábil e consultivo. Priorizamos o respaldo normativo total em tudo que fazemos — inclusive na forma como tratamos e protegem os seus dados.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
