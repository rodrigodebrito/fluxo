import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-x-hidden">
      {/* Nav */}
      <nav className="border-b border-zinc-800/50 backdrop-blur-sm sticky top-0 z-50 bg-zinc-950/80">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-lg font-bold">Fluxo AI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-zinc-400 hover:text-white transition-colors px-3 py-1.5">
              Entrar
            </Link>
            <Link href="/register" className="text-sm bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg font-medium transition-colors">
              Comecar Gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-20 pb-28 px-6">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-purple-600/10 rounded-full blur-[120px]" />
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-600/10 border border-purple-500/20 rounded-full text-xs text-purple-300 mb-6">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            Beta aberto — vagas limitadas
          </div>
          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
            Crie imagens e videos com IA
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
              de forma visual
            </span>
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Conecte modelos de IA como blocos. Arraste, conecte, gere.
            Sem codigo, sem complicacao. Resultados profissionais em minutos.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="px-8 py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-base transition-all hover:shadow-lg hover:shadow-purple-600/25"
            >
              Criar Conta Gratis
            </Link>
            <a
              href="#como-funciona"
              className="px-8 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl text-base transition-colors border border-zinc-700"
            >
              Ver como funciona
            </a>
          </div>
          <p className="mt-4 text-xs text-zinc-600">Sem cartao de credito. Comece em 30 segundos.</p>
        </div>
      </section>

      {/* Social proof */}
      <section className="border-y border-zinc-800/50 py-8 px-6">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-8 md:gap-16">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">6+</p>
            <p className="text-xs text-zinc-500">Modelos de IA</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">4K</p>
            <p className="text-xs text-zinc-500">Resolucao maxima</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">30s</p>
            <p className="text-xs text-zinc-500">Para comecar</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">25%</p>
            <p className="text-xs text-zinc-500">Mais barato que Weavy</p>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Como funciona</h2>
          <p className="text-zinc-400 text-center mb-16 max-w-xl mx-auto">
            Tres passos simples para criar conteudo profissional com IA
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 text-center">
              <div className="w-14 h-14 bg-purple-600/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">1. Arraste os blocos</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Escolha modelos de IA, prompts e inputs. Arraste para o canvas como blocos visuais.
              </p>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 text-center">
              <div className="w-14 h-14 bg-pink-600/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <svg className="w-7 h-7 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.07-9.07a4.5 4.5 0 00-6.364 0l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">2. Conecte os nos</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Conecte prompt ao modelo, imagem ao video. Crie pipelines complexos com um clique.
              </p>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 text-center">
              <div className="w-14 h-14 bg-orange-600/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <svg className="w-7 h-7 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">3. Gere com um clique</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Aperte "Run" e veja seus resultados aparecerem. Imagens, videos, tudo no mesmo fluxo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Modelos */}
      <section className="py-24 px-6 bg-zinc-900/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Modelos disponiveis</h2>
          <p className="text-zinc-400 text-center mb-16 max-w-xl mx-auto">
            Os melhores modelos de IA do mercado, tudo em um so lugar
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: "Nano Banana Pro", type: "Imagem", desc: "Imagens de alta qualidade ate 4K", cost: "18 creditos", badge: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
              { name: "GPT Image 1.5", type: "Imagem", desc: "Geracao e edicao de imagens com GPT", cost: "4 creditos", badge: "bg-green-500/10 text-green-400 border-green-500/20" },
              { name: "Veo 3.1", type: "Video", desc: "Videos com Google Veo, ate 250 frames", cost: "60 creditos", badge: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
              { name: "Seedance 2.0", type: "Video", desc: "Videos com ByteDance, ate 1080p", cost: "40 creditos", badge: "bg-pink-500/10 text-pink-400 border-pink-500/20" },
              { name: "Kling 3.0", type: "Video", desc: "Videos com Kling, elementos customizados", cost: "70 creditos", badge: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
              { name: "Video Concat", type: "Ferramenta", desc: "Junte multiplos videos em um so", cost: "Gratis", badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
            ].map((model) => (
              <div key={model.name} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${model.badge}`}>
                    {model.type}
                  </span>
                  <span className="text-xs text-zinc-500">{model.cost}</span>
                </div>
                <h3 className="font-semibold mb-1">{model.name}</h3>
                <p className="text-xs text-zinc-500">{model.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparacao */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Por que Fluxo AI?
          </h2>
          <p className="text-zinc-400 text-center mb-16 max-w-xl mx-auto">
            Compare com as principais plataformas do mercado
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-4 px-4 text-zinc-500 font-medium">Recurso</th>
                  <th className="py-4 px-4 text-center">
                    <span className="text-purple-400 font-bold">Fluxo AI</span>
                  </th>
                  <th className="py-4 px-4 text-center text-zinc-500">Weavy</th>
                  <th className="py-4 px-4 text-center text-zinc-500">RunwayML</th>
                  <th className="py-4 px-4 text-center text-zinc-500">Pika</th>
                </tr>
              </thead>
              <tbody className="text-zinc-400">
                <tr className="border-b border-zinc-800/50">
                  <td className="py-3.5 px-4">Editor visual (nos)</td>
                  <td className="py-3.5 px-4 text-center text-green-400">&#10003;</td>
                  <td className="py-3.5 px-4 text-center text-green-400">&#10003;</td>
                  <td className="py-3.5 px-4 text-center text-zinc-600">&#10007;</td>
                  <td className="py-3.5 px-4 text-center text-zinc-600">&#10007;</td>
                </tr>
                <tr className="border-b border-zinc-800/50">
                  <td className="py-3.5 px-4">Imagem 1K</td>
                  <td className="py-3.5 px-4 text-center text-purple-400 font-medium">18 cred</td>
                  <td className="py-3.5 px-4 text-center">24 cred</td>
                  <td className="py-3.5 px-4 text-center">40 cred</td>
                  <td className="py-3.5 px-4 text-center">—</td>
                </tr>
                <tr className="border-b border-zinc-800/50">
                  <td className="py-3.5 px-4">Video (basico)</td>
                  <td className="py-3.5 px-4 text-center text-purple-400 font-medium">60 cred</td>
                  <td className="py-3.5 px-4 text-center">80 cred</td>
                  <td className="py-3.5 px-4 text-center">100 cred</td>
                  <td className="py-3.5 px-4 text-center">50 cred</td>
                </tr>
                <tr className="border-b border-zinc-800/50">
                  <td className="py-3.5 px-4">Multiplos modelos</td>
                  <td className="py-3.5 px-4 text-center text-green-400">6 modelos</td>
                  <td className="py-3.5 px-4 text-center">5 modelos</td>
                  <td className="py-3.5 px-4 text-center">1 modelo</td>
                  <td className="py-3.5 px-4 text-center">1 modelo</td>
                </tr>
                <tr className="border-b border-zinc-800/50">
                  <td className="py-3.5 px-4">Concat de videos</td>
                  <td className="py-3.5 px-4 text-center text-green-400">&#10003;</td>
                  <td className="py-3.5 px-4 text-center text-zinc-600">&#10007;</td>
                  <td className="py-3.5 px-4 text-center text-zinc-600">&#10007;</td>
                  <td className="py-3.5 px-4 text-center text-zinc-600">&#10007;</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4">Preco mensal</td>
                  <td className="py-3.5 px-4 text-center text-purple-400 font-medium">A partir de R$29</td>
                  <td className="py-3.5 px-4 text-center">$15/mes</td>
                  <td className="py-3.5 px-4 text-center">$12/mes</td>
                  <td className="py-3.5 px-4 text-center">$8/mes</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Ferramentas */}
      <section className="py-24 px-6 bg-zinc-900/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Ferramentas poderosas</h2>
          <p className="text-zinc-400 text-center mb-16 max-w-xl mx-auto">
            Tudo que voce precisa para criar conteudo profissional
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="w-10 h-10 bg-purple-600/10 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Prompt Negativo</h3>
                <p className="text-sm text-zinc-400">Controle o que nao quer na imagem. Conecte um prompt negativo a qualquer modelo de video.</p>
              </div>
            </div>

            <div className="flex gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="w-10 h-10 bg-amber-600/10 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Last Frame</h3>
                <p className="text-sm text-zinc-400">Extraia o ultimo frame de um video e use como input para o proximo. Crie sequencias cinematicas.</p>
              </div>
            </div>

            <div className="flex gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="w-10 h-10 bg-orange-600/10 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Video Concat</h3>
                <p className="text-sm text-zinc-400">Junte multiplos videos gerados em um so. Perfeito para criar conteudo UGC completo.</p>
              </div>
            </div>

            <div className="flex gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="w-10 h-10 bg-cyan-600/10 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Duplicar Nos</h3>
                <p className="text-sm text-zinc-400">Duplique qualquer no com um clique. Reutilize configuracoes e acelere seu workflow.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 px-6 relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-purple-600/8 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-2xl mx-auto text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Pronto para criar?
          </h2>
          <p className="text-zinc-400 mb-8 text-lg">
            Junte-se aos criadores que ja estao usando Fluxo AI para produzir conteudo com IA.
          </p>
          <Link
            href="/register"
            className="inline-flex px-8 py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-base transition-all hover:shadow-lg hover:shadow-purple-600/25"
          >
            Comecar Agora — Gratis
          </Link>
          <p className="mt-4 text-xs text-zinc-600">Sem cartao de credito. Cancele quando quiser.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-purple-600 rounded flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-zinc-400">Fluxo AI</span>
          </div>
          <p className="text-xs text-zinc-600">&copy; 2026 Fluxo AI. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
