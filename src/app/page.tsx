"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

function useScrollTo() {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a[href^="#"]');
      if (!anchor) return;
      e.preventDefault();
      const id = anchor.getAttribute("href")!.slice(1);
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);
}

function CountUp({ end, suffix = "" }: { end: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const counted = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !counted.current) {
          counted.current = true;
          const duration = 1500;
          const start = performance.now();
          const animate = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.floor(eased * end) + suffix;
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [end, suffix]);

  return <span ref={ref}>0{suffix}</span>;
}

export default function LandingPage() {
  useScrollTo();

  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-x-hidden scroll-smooth">
      {/* Nav */}
      <nav className="border-b border-zinc-800/50 backdrop-blur-xl sticky top-0 z-50 bg-zinc-950/90">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-lg font-bold">Fluxo AI</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
            <a href="#como-funciona" className="hover:text-white transition-colors">Como funciona</a>
            <a href="#modelos" className="hover:text-white transition-colors">Modelos</a>
            <a href="#comparacao" className="hover:text-white transition-colors">Precos</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-zinc-400 hover:text-white transition-colors px-3 py-1.5">
              Entrar
            </Link>
            <Link href="/register" className="text-sm bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg font-medium transition-all hover:shadow-lg hover:shadow-purple-600/25">
              Comecar Gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-16 md:pt-24 pb-20 md:pb-32 px-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-purple-600/15 rounded-full blur-[150px]" />
          <div className="absolute top-40 left-1/4 w-[400px] h-[400px] bg-pink-600/10 rounded-full blur-[120px]" />
          <div className="absolute top-60 right-1/4 w-[300px] h-[300px] bg-blue-600/8 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-purple-600/10 border border-purple-500/20 rounded-full text-xs text-purple-300 mb-8 animate-pulse">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
            Beta exclusivo — apenas 50 vagas
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold leading-[1.1] mb-6 tracking-tight">
            Voce ainda perde{" "}
            <span className="line-through text-zinc-500 decoration-red-500/50">horas</span>{" "}
            criando conteudo?
          </h1>
          <p className="text-xl md:text-2xl text-zinc-300 max-w-2xl mx-auto mb-4 leading-relaxed font-light">
            Gere imagens e videos com IA{" "}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent font-semibold">
              arrastando blocos visuais.
            </span>
          </p>
          <p className="text-base md:text-lg text-zinc-500 max-w-xl mx-auto mb-10">
            Sem codigo. Sem assinatura cara. Sem complicacao.
            <br className="hidden md:block" />
            O que levava 2 horas agora leva 2 minutos.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl text-lg transition-all hover:shadow-xl hover:shadow-purple-600/30 hover:-translate-y-0.5"
            >
              Comecar Agora — E Gratis
            </Link>
            <a
              href="#como-funciona"
              className="w-full sm:w-auto px-10 py-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium rounded-xl text-lg transition-all border border-zinc-700 hover:border-zinc-600 flex items-center justify-center gap-2"
            >
              Ver como funciona
              <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </a>
          </div>
          <p className="mt-5 text-xs text-zinc-600">Sem cartao de credito. Cancele quando quiser. Setup em 30 segundos.</p>
        </div>
      </section>

      {/* Dor / Problema */}
      <section className="py-16 md:py-20 px-6 border-y border-zinc-800/50 bg-zinc-900/20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            Se voce cria conteudo com IA, ja passou por isso:
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-zinc-900/80 border border-red-500/10 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-red-500/50 to-transparent" />
              <div className="text-3xl mb-3">😤</div>
              <h3 className="font-semibold mb-2 text-zinc-200">Ficar pulando entre 5 ferramentas</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Uma pra gerar imagem, outra pro video, outra pra editar, outra pra juntar... e no final o resultado nao fica bom.
              </p>
            </div>
            <div className="bg-zinc-900/80 border border-red-500/10 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-red-500/50 to-transparent" />
              <div className="text-3xl mb-3">💸</div>
              <h3 className="font-semibold mb-2 text-zinc-200">Pagar caro em cada plataforma</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                RunwayML $12/mes. Pika $8/mes. Midjourney $10/mes. No final do mes voce gastou R$200 e mal usou tudo.
              </p>
            </div>
            <div className="bg-zinc-900/80 border border-red-500/10 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-red-500/50 to-transparent" />
              <div className="text-3xl mb-3">⏰</div>
              <h3 className="font-semibold mb-2 text-zinc-200">Perder tempo com processo manual</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Gerar, baixar, fazer upload, gerar de novo... um fluxo que deveria levar minutos vira horas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solucao - Transicao */}
      <section className="py-16 md:py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-2xl mb-6">
            <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            E se tudo isso ficasse em{" "}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">um so lugar?</span>
          </h2>
          <p className="text-lg text-zinc-400 leading-relaxed max-w-2xl mx-auto">
            O Fluxo AI reune os melhores modelos de IA em um editor visual.
            Voce arrasta blocos, conecta e gera. <strong className="text-zinc-200">Sem sair da tela. Sem pagar 5 assinaturas.</strong>
          </p>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="py-16 md:py-24 px-6 bg-zinc-900/30 scroll-mt-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-purple-400 uppercase tracking-wider mb-3">Simples assim</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">3 passos. Resultado profissional.</h2>
            <p className="text-zinc-400 max-w-xl mx-auto">
              Nao precisa saber programar. Se voce sabe arrastar e soltar, voce sabe usar.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="relative group">
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center text-xl font-black shadow-lg shadow-purple-600/30 group-hover:scale-110 transition-transform">1</div>
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-8 pt-12 hover:border-purple-500/30 transition-colors">
                <h3 className="text-lg font-bold mb-3">Arraste os blocos</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Prompt, imagem de referencia, modelo de IA — cada um e um bloco. Arraste pro canvas.
                </p>
                <div className="mt-4 flex gap-2">
                  <span className="text-[10px] px-2 py-1 bg-zinc-800 rounded-md text-zinc-400">Prompt</span>
                  <span className="text-[10px] px-2 py-1 bg-zinc-800 rounded-md text-zinc-400">Imagem</span>
                  <span className="text-[10px] px-2 py-1 bg-purple-500/10 rounded-md text-purple-400">Modelo IA</span>
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-pink-600 rounded-2xl flex items-center justify-center text-xl font-black shadow-lg shadow-pink-600/30 group-hover:scale-110 transition-transform">2</div>
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-8 pt-12 hover:border-pink-500/30 transition-colors">
                <h3 className="text-lg font-bold mb-3">Conecte os nos</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Ligue o prompt ao modelo, a imagem ao video. Crie pipelines complexos com um clique.
                </p>
                <div className="mt-4 text-[10px] text-zinc-500 flex items-center gap-1">
                  <span className="w-2 h-2 bg-blue-400 rounded-full inline-block" />
                  Prompt
                  <span className="text-zinc-700 mx-1">——</span>
                  <span className="w-2 h-2 bg-purple-400 rounded-full inline-block" />
                  Kling 3.0
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-xl font-black shadow-lg shadow-orange-600/30 group-hover:scale-110 transition-transform">3</div>
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-8 pt-12 hover:border-orange-500/30 transition-colors">
                <h3 className="text-lg font-bold mb-3">Clique em &ldquo;Run&rdquo;</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Um clique. O Fluxo faz o resto. Imagem 4K, video HD, tudo aparece no mesmo fluxo.
                </p>
                <div className="mt-4">
                  <span className="text-[10px] px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-md text-green-400">Pronto em segundos</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Numeros / Social Proof */}
      <section className="py-16 px-6 border-y border-zinc-800/50">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="text-center">
            <p className="text-3xl md:text-4xl font-black text-white"><CountUp end={6} suffix="+" /></p>
            <p className="text-xs text-zinc-500 mt-1">Modelos de IA</p>
          </div>
          <div className="text-center">
            <p className="text-3xl md:text-4xl font-black text-white">4K</p>
            <p className="text-xs text-zinc-500 mt-1">Resolucao maxima</p>
          </div>
          <div className="text-center">
            <p className="text-3xl md:text-4xl font-black text-white"><CountUp end={30} suffix="s" /></p>
            <p className="text-xs text-zinc-500 mt-1">Para comecar</p>
          </div>
          <div className="text-center">
            <p className="text-3xl md:text-4xl font-black bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent"><CountUp end={25} suffix="%" /></p>
            <p className="text-xs text-zinc-500 mt-1">Mais barato que concorrentes</p>
          </div>
        </div>
      </section>

      {/* Modelos */}
      <section id="modelos" className="py-16 md:py-24 px-6 scroll-mt-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-purple-400 uppercase tracking-wider mb-3">Arsenal completo</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">6 modelos. 1 plataforma. 0 complicacao.</h2>
            <p className="text-zinc-400 max-w-xl mx-auto">
              Os mesmos modelos que as grandes agencias usam — so que voce paga por uso, nao por assinatura.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: "Nano Banana Pro", type: "Imagem", desc: "Imagens ate 4K. Qualidade de estudio.", cost: "A partir de 18 cred", badge: "bg-purple-500/10 text-purple-400 border-purple-500/20", icon: "🖼️" },
              { name: "GPT Image 1.5", type: "Imagem", desc: "Motor OpenAI. Texto perfeito em imagens.", cost: "A partir de 4 cred", badge: "bg-green-500/10 text-green-400 border-green-500/20", icon: "✨" },
              { name: "Veo 3.1", type: "Video", desc: "Google Veo. Videos realistas com audio.", cost: "A partir de 60 cred", badge: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: "🎬" },
              { name: "Kling 3.0", type: "Video", desc: "Controle total. Elementos customizados.", cost: "A partir de 70 cred", badge: "bg-orange-500/10 text-orange-400 border-orange-500/20", icon: "🎥" },
              { name: "Seedance 2.0", type: "Video", desc: "ByteDance. Danca e movimentos naturais.", cost: "A partir de 40 cred", badge: "bg-pink-500/10 text-pink-400 border-pink-500/20", icon: "💃" },
              { name: "Video Concat", type: "Gratis", desc: "Junte seus videos em um so. Sem custo.", cost: "0 creditos", badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20", icon: "🔗" },
            ].map((model) => (
              <div key={model.name} className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 transition-all hover:-translate-y-1 group">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs px-2.5 py-0.5 rounded-full border ${model.badge}`}>
                    {model.type}
                  </span>
                  <span className="text-xs text-zinc-500">{model.cost}</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{model.icon}</span>
                  <h3 className="font-bold">{model.name}</h3>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">{model.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Para quem e */}
      <section className="py-16 md:py-24 px-6 bg-zinc-900/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-purple-400 uppercase tracking-wider mb-3">Feito pra voce</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Quem usa o Fluxo AI?</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-8 hover:border-purple-500/20 transition-colors">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="font-bold text-lg mb-2">Criadores UGC</h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                Gere videos de produto, testimonials e conteudo para marcas em minutos em vez de horas.
              </p>
              <p className="text-xs text-purple-400 font-medium">&ldquo;Faco em 10 min o que antes levava 3 horas&rdquo;</p>
            </div>
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-8 hover:border-pink-500/20 transition-colors">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="font-bold text-lg mb-2">Social Media Managers</h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                Crie posts, reels e thumbnails com qualidade profissional. Multiplos formatos de uma vez.
              </p>
              <p className="text-xs text-pink-400 font-medium">&ldquo;Meu cliente achou que eu contratei designer&rdquo;</p>
            </div>
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-8 hover:border-orange-500/20 transition-colors">
              <div className="text-4xl mb-4">🏪</div>
              <h3 className="font-bold text-lg mb-2">E-commerce</h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                Fotos de produto, videos de anuncio e criativos para ads. Tudo sem fotografo.
              </p>
              <p className="text-xs text-orange-400 font-medium">&ldquo;Cortei 80% do custo com criativos&rdquo;</p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparacao */}
      <section id="comparacao" className="py-16 md:py-24 px-6 scroll-mt-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-purple-400 uppercase tracking-wider mb-3">Transparencia total</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Pare de pagar caro.{" "}
              <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">Compare.</span>
            </h2>
            <p className="text-zinc-400 max-w-xl mx-auto">
              Voce nao precisa de 5 assinaturas. Precisa de uma plataforma que faz tudo.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-900/80">
                  <th className="text-left py-4 px-5 text-zinc-500 font-medium">Recurso</th>
                  <th className="py-4 px-5 text-center">
                    <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-bold text-base">Fluxo AI</span>
                  </th>
                  <th className="py-4 px-5 text-center text-zinc-500">Weavy</th>
                  <th className="py-4 px-5 text-center text-zinc-500">RunwayML</th>
                  <th className="py-4 px-5 text-center text-zinc-500">Pika</th>
                </tr>
              </thead>
              <tbody className="text-zinc-400">
                <tr className="border-t border-zinc-800/50">
                  <td className="py-3.5 px-5 font-medium text-zinc-300">Editor visual (nos)</td>
                  <td className="py-3.5 px-5 text-center text-green-400 font-bold text-base">&#10003;</td>
                  <td className="py-3.5 px-5 text-center text-green-400/50">&#10003;</td>
                  <td className="py-3.5 px-5 text-center text-zinc-700">&#10007;</td>
                  <td className="py-3.5 px-5 text-center text-zinc-700">&#10007;</td>
                </tr>
                <tr className="border-t border-zinc-800/50">
                  <td className="py-3.5 px-5 font-medium text-zinc-300">Imagem 1K</td>
                  <td className="py-3.5 px-5 text-center text-purple-400 font-bold">18 cred</td>
                  <td className="py-3.5 px-5 text-center">24 cred</td>
                  <td className="py-3.5 px-5 text-center">40 cred</td>
                  <td className="py-3.5 px-5 text-center text-zinc-600">—</td>
                </tr>
                <tr className="border-t border-zinc-800/50">
                  <td className="py-3.5 px-5 font-medium text-zinc-300">Video basico</td>
                  <td className="py-3.5 px-5 text-center text-purple-400 font-bold">60 cred</td>
                  <td className="py-3.5 px-5 text-center">80 cred</td>
                  <td className="py-3.5 px-5 text-center">100 cred</td>
                  <td className="py-3.5 px-5 text-center">50 cred</td>
                </tr>
                <tr className="border-t border-zinc-800/50">
                  <td className="py-3.5 px-5 font-medium text-zinc-300">Modelos disponveis</td>
                  <td className="py-3.5 px-5 text-center text-green-400 font-bold">6 modelos</td>
                  <td className="py-3.5 px-5 text-center">5 modelos</td>
                  <td className="py-3.5 px-5 text-center">1 modelo</td>
                  <td className="py-3.5 px-5 text-center">1 modelo</td>
                </tr>
                <tr className="border-t border-zinc-800/50">
                  <td className="py-3.5 px-5 font-medium text-zinc-300">Concatenar videos</td>
                  <td className="py-3.5 px-5 text-center text-green-400 font-bold text-base">&#10003;</td>
                  <td className="py-3.5 px-5 text-center text-zinc-700">&#10007;</td>
                  <td className="py-3.5 px-5 text-center text-zinc-700">&#10007;</td>
                  <td className="py-3.5 px-5 text-center text-zinc-700">&#10007;</td>
                </tr>
                <tr className="border-t border-zinc-800/50">
                  <td className="py-3.5 px-5 font-medium text-zinc-300">Paga so o que usa</td>
                  <td className="py-3.5 px-5 text-center text-green-400 font-bold text-base">&#10003;</td>
                  <td className="py-3.5 px-5 text-center text-green-400/50">&#10003;</td>
                  <td className="py-3.5 px-5 text-center text-zinc-700">&#10007;</td>
                  <td className="py-3.5 px-5 text-center text-zinc-700">&#10007;</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-center text-xs text-zinc-600 mt-4">
            * Precos baseados nos planos publicados de cada plataforma em abril de 2026.
          </p>
        </div>
      </section>

      {/* Objecoes / FAQ */}
      <section className="py-16 md:py-24 px-6 bg-zinc-900/30">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Perguntas frequentes</h2>
          </div>

          <div className="space-y-4">
            {[
              { q: "Preciso saber programar?", a: "Nao. Zero codigo. Se voce sabe arrastar e soltar, voce sabe usar o Fluxo AI. A interface e visual e intuitiva." },
              { q: "Quanto custa?", a: "Voce compra creditos e usa como quiser. Uma imagem 1K custa 18 creditos. Sem assinatura mensal obrigatoria, sem surpresas." },
              { q: "E se a geracao falhar?", a: "Seus creditos sao devolvidos automaticamente. Se der erro, voce nao paga. Simples assim." },
              { q: "Posso cancelar quando quiser?", a: "Sim. Nao tem contrato, nao tem fidelidade. Seus creditos nunca expiram." },
              { q: "Qual a qualidade dos videos?", a: "Usamos os mesmos modelos das maiores agencias: Google Veo 3.1, Kling 3.0, ByteDance Seedance. Qualidade profissional." },
            ].map((faq) => (
              <details key={faq.q} className="group bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-zinc-800/50 transition-colors">
                  <span className="font-medium text-zinc-200">{faq.q}</span>
                  <svg className="w-5 h-5 text-zinc-500 group-open:rotate-180 transition-transform shrink-0 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-6 pb-4 text-sm text-zinc-400 leading-relaxed">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 md:py-32 px-6 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-purple-600/10 rounded-full blur-[150px]" />
        </div>
        <div className="max-w-2xl mx-auto text-center relative z-10">
          <p className="text-sm font-medium text-purple-400 uppercase tracking-wider mb-6">Falta pouco</p>
          <h2 className="text-3xl md:text-5xl font-extrabold mb-6 leading-tight">
            Enquanto voce pensa,{" "}
            <br className="hidden md:block" />
            outros ja estao criando.
          </h2>
          <p className="text-lg text-zinc-400 mb-10 leading-relaxed">
            50 vagas no beta. Quando acabar, acabou.
            <br />
            <strong className="text-zinc-200">Crie sua conta em 30 segundos e comece agora.</strong>
          </p>
          <Link
            href="/register"
            className="inline-flex px-10 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl text-lg transition-all hover:shadow-xl hover:shadow-purple-600/30 hover:-translate-y-0.5"
          >
            Quero Minha Vaga no Beta
          </Link>
          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-zinc-600">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              Sem cartao
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              Sem assinatura
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              Creditos nao expiram
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-sm font-bold text-zinc-400">Fluxo AI</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-zinc-600">
            <Link href="/login" className="hover:text-zinc-400 transition-colors">Entrar</Link>
            <Link href="/register" className="hover:text-zinc-400 transition-colors">Cadastrar</Link>
          </div>
          <p className="text-xs text-zinc-700">&copy; 2026 Fluxo AI. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
