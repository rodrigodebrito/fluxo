import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <nav className="border-b border-zinc-800/50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Fluxo AI
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-2">Termos de Uso</h1>
        <p className="text-zinc-500 text-sm mb-12">Ultima atualizacao: abril de 2026</p>

        <div className="space-y-10 text-zinc-300 text-[15px] leading-relaxed">
          {/* 1 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Aceitacao dos Termos</h2>
            <p>
              Ao acessar e utilizar a plataforma Fluxo AI, voce concorda com estes Termos de Uso.
              Se nao concordar com qualquer parte destes termos, nao utilize a plataforma.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Descricao do Servico</h2>
            <p>
              O Fluxo AI e uma plataforma de geracao de imagens e videos utilizando inteligencia artificial.
              O servico funciona com sistema de creditos pre-pagos que nao expiram.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Cadastro e Conta</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Voce deve ter pelo menos 18 anos para utilizar a plataforma.</li>
              <li>Voce e responsavel por manter a seguranca de sua conta e senha.</li>
              <li>Cada pessoa pode manter apenas uma conta ativa.</li>
              <li>Informacoes falsas no cadastro podem resultar em suspensao da conta.</li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Conteudo Proibido</h2>
            <p className="mb-3">
              E estritamente proibido utilizar o Fluxo AI para gerar qualquer conteudo que:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li><strong className="text-red-400">Envolva menores de idade</strong> em qualquer contexto sexual, sugestivo ou explorador. Isso inclui conteudo gerado por IA. Violacoes serao reportadas as autoridades competentes.</li>
              <li>Promova violencia, terrorismo ou atividades ilegais.</li>
              <li>Constitua assedio, difamacao ou ameacas a terceiros.</li>
              <li>Viole direitos autorais ou propriedade intelectual de terceiros.</li>
              <li>Gere deepfakes nao-consensuais de pessoas reais.</li>
              <li>Distribua desinformacao ou conteudo enganoso.</li>
            </ul>
            <p className="mt-3 text-zinc-400 text-sm">
              Nossos sistemas possuem filtros automaticos de seguranca. Tentativas de contornar esses filtros podem resultar em banimento imediato e permanente.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Conteudo Adulto (NSFW)</h2>
            <p>
              A plataforma permite a geracao de conteudo adulto (NSFW) desde que envolva exclusivamente
              pessoas adultas (reais ou ficticias). O usuario e integralmente responsavel pelo conteudo
              gerado e por garantir que seu uso esteja em conformidade com as leis locais.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Creditos e Pagamentos</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Os creditos sao pre-pagos e nao expiram.</li>
              <li>Creditos consumidos em geracoes nao sao reembolsaveis, mesmo que o resultado nao seja satisfatorio.</li>
              <li>Falhas tecnicas que consumam creditos sem entregar resultado serao reembolsadas em creditos.</li>
              <li>Pagamentos sao processados via Mercado Pago. Os dados financeiros nao sao armazenados por nos.</li>
            </ul>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Propriedade do Conteudo</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Voce retem os direitos sobre o conteudo que gera na plataforma.</li>
              <li>Voce pode usar o conteudo gerado para fins pessoais e comerciais.</li>
              <li>O Fluxo AI nao reivindica propriedade sobre o conteudo gerado pelos usuarios.</li>
            </ul>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Modelos Treinados</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Voce so pode treinar modelos com imagens que voce tem permissao para usar.</li>
              <li>Treinar modelos com imagens de terceiros sem consentimento e proibido.</li>
              <li>Modelos treinados sao privados e acessiveis apenas pela sua conta.</li>
              <li>Nos reservamos o direito de remover modelos que violem estes termos.</li>
            </ul>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Disponibilidade</h2>
            <p>
              O servico e fornecido &quot;como esta&quot;. Nao garantimos disponibilidade ininterrupta.
              Modelos de IA podem ficar temporariamente indisponiveis por manutencao ou problemas
              nos provedores terceiros. Nao nos responsabilizamos por interrupcoes.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Suspensao e Encerramento</h2>
            <p>
              Reservamo-nos o direito de suspender ou encerrar contas que violem estes termos,
              sem aviso previo e sem reembolso de creditos. Em casos de conteudo envolvendo
              menores, a conta sera banida permanentemente e as autoridades serao notificadas.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">11. Alteracoes nos Termos</h2>
            <p>
              Podemos atualizar estes termos a qualquer momento. Alteracoes significativas serao
              comunicadas por email. O uso continuado da plataforma apos alteracoes constitui
              aceitacao dos novos termos.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">12. Contato</h2>
            <p>
              Para duvidas sobre estes termos ou para reportar violacoes, entre em contato
              pelo email disponivel na plataforma.
            </p>
          </section>
        </div>

        {/* Back */}
        <div className="mt-16 pt-8 border-t border-zinc-800/50 text-center">
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
            Voltar para o inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
