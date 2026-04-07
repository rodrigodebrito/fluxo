"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/* ── Scroll suave para anchors ── */
function SmoothScroll({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a[href^="#"]');
      if (!anchor) return;
      const id = anchor.getAttribute("href")!.slice(1);
      const el = document.getElementById(id);
      if (el) {
        e.preventDefault();
        const top = el.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top, behavior: "smooth" });
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  return <div ref={containerRef}>{children}</div>;
}

/* ── Anima numeros ao entrar na viewport ── */
function CountUp({ end, suffix = "" }: { end: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !done.current) {
          done.current = true;
          const dur = 1200;
          const t0 = performance.now();
          const tick = (now: number) => {
            const p = Math.min((now - t0) / dur, 1);
            el.textContent = Math.floor((1 - Math.pow(1 - p, 3)) * end) + suffix;
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [end, suffix]);

  return <span ref={ref}>0{suffix}</span>;
}

/* ── Reveal on scroll ── */
function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ── Nav mobile hamburger ── */
function MobileMenu() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(!open)} className="md:hidden text-zinc-400 hover:text-white p-1" aria-label="Menu">
        {open ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        )}
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 bg-zinc-950/98 border-b border-zinc-800 md:hidden backdrop-blur-xl">
          <div className="flex flex-col px-6 py-4 gap-3">
            <a href="#galeria" onClick={() => setOpen(false)} className="text-sm text-zinc-300 hover:text-white py-2">Galeria</a>
            <a href="#como-funciona" onClick={() => setOpen(false)} className="text-sm text-zinc-300 hover:text-white py-2">Como funciona</a>
            <a href="#modelos" onClick={() => setOpen(false)} className="text-sm text-zinc-300 hover:text-white py-2">Modelos</a>
            <a href="#precos" onClick={() => setOpen(false)} className="text-sm text-zinc-300 hover:text-white py-2">Precos</a>
            <a href="#faq" onClick={() => setOpen(false)} className="text-sm text-zinc-300 hover:text-white py-2">FAQ</a>
            <hr className="border-zinc-800" />
            <Link href="/login" className="text-sm text-zinc-400 py-2">Entrar</Link>
            <Link href="/register" className="text-sm bg-purple-600 hover:bg-purple-500 px-4 py-2.5 rounded-lg font-medium text-center">Comecar Gratis</Link>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Galeria item com hover ── */
function GalleryItem({ src, label, model, delay }: { src: string; label: string; model: string; delay: number }) {
  const isPlaceholder = !src || src.startsWith("/placeholder");

  return (
    <Reveal delay={delay}>
      <div className="group relative overflow-hidden rounded-2xl aspect-square cursor-pointer">
        {isPlaceholder ? (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-zinc-900 to-pink-900/40 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-2 opacity-40">🖼️</div>
              <p className="text-xs text-zinc-600">Adicionar imagem</p>
            </div>
          </div>
        ) : (
          <Image src={src} alt={label} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="text-xs text-zinc-400">{model}</p>
        </div>
      </div>
    </Reveal>
  );
}

/* ── Galeria item retangular (video) ── */
function GalleryVideoItem({ src, label, model, delay }: { src: string; label: string; model: string; delay: number }) {
  const isPlaceholder = !src || src.startsWith("/placeholder");

  return (
    <Reveal delay={delay}>
      <div className="group relative overflow-hidden rounded-2xl aspect-video cursor-pointer">
        {isPlaceholder ? (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 via-zinc-900 to-cyan-900/30 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-2 opacity-40">🎬</div>
              <p className="text-xs text-zinc-600">Adicionar video</p>
            </div>
          </div>
        ) : (
          <Image src={src} alt={label} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute top-3 right-3 w-8 h-8 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="text-xs text-zinc-400">{model}</p>
        </div>
      </div>
    </Reveal>
  );
}

/* ══════════════════════════════════════════════
   GALERIA — SUBSTITUA AS URLs ABAIXO PELAS
   IMAGENS/VIDEOS GERADOS NO FLUXO AI
   ══════════════════════════════════════════════ */
const GALLERY_IMAGES = [
  { src: "", label: "Produto gourmet em estudio", model: "Nano Banana Pro" },
  { src: "", label: "Retrato cinematografico 4K", model: "Nano Banana Pro" },
  { src: "", label: "Sneaker flutuando no espaco", model: "GPT Image 1.5" },
  { src: "", label: "Paisagem surreal de montanhas", model: "Nano Banana Pro" },
  { src: "", label: "Logo 3D com iluminacao neon", model: "GPT Image 1.5" },
  { src: "", label: "Moda editorial futurista", model: "Nano Banana Pro" },
];

const GALLERY_VIDEOS = [
  { src: "", label: "Carro esportivo em movimento", model: "Veo 3.1" },
  { src: "", label: "Danca coreografada com IA", model: "Kling 3.0" },
  { src: "", label: "Produto girando 360 graus", model: "Veo 3.1" },
];

/* ── Formulario de lista de espera ── */
function WaitlistForm() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "full">("idle");
  const [message, setMessage] = useState("");
  const [position, setPosition] = useState(0);
  const [remaining, setRemaining] = useState(50);

  useEffect(() => {
    fetch("/api/waitlist")
      .then((r) => r.json())
      .then((d) => {
        setRemaining(d.remaining);
        if (d.remaining <= 0) setStatus("full");
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !contact.trim()) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), contact: contact.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setStatus("error");
          setMessage(data.error);
        } else {
          setStatus("error");
          setMessage(data.error || "Erro ao enviar.");
        }
        return;
      }

      setStatus("success");
      setPosition(data.position);
      setRemaining(data.remaining);
    } catch {
      setStatus("error");
      setMessage("Erro de conexao. Tente novamente.");
    }
  };

  if (status === "success") {
    return (
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/10 rounded-full mb-4">
          <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold mb-2">Voce esta na lista!</h3>
        <p className="text-zinc-400 mb-2">
          Posicao <span className="text-purple-400 font-bold">#{position}</span> de 50
        </p>
        <p className="text-sm text-zinc-500">
          Entraremos em contato em breve. {remaining > 0 ? `Restam ${remaining} vagas.` : "Ultima vaga preenchida!"}
        </p>
      </div>
    );
  }

  if (status === "full") {
    return (
      <div className="text-center">
        <p className="text-lg font-semibold text-zinc-300 mb-2">Todas as 50 vagas foram preenchidas!</p>
        <p className="text-sm text-zinc-500">Fique de olho — novas vagas podem abrir em breve.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto">
      <div className="flex flex-col gap-3 mb-4">
        <input
          type="text"
          placeholder="Seu nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
        />
        <input
          type="text"
          placeholder="Email ou WhatsApp"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          required
          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
        />
      </div>

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full px-10 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl text-lg transition-all hover:shadow-2xl hover:shadow-purple-600/30 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
      >
        {status === "loading" ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            Enviando...
          </span>
        ) : (
          "Quero Minha Vaga no Beta"
        )}
      </button>

      {status === "error" && (
        <p className="text-red-400 text-sm text-center mt-3">{message}</p>
      )}

      <p className="text-center text-xs text-zinc-600 mt-4">
        {remaining > 0 ? (
          <>
            <span className="text-purple-400 font-semibold">{remaining}</span> vagas restantes de 50
          </>
        ) : (
          "Verificando vagas..."
        )}
      </p>
    </form>
  );
}

/* ════════════════════════════════════════ */
/*  LANDING PAGE                           */
/* ════════════════════════════════════════ */
export default function LandingPage() {
  return (
    <SmoothScroll>
      <div className="min-h-screen bg-zinc-950 text-white">

        {/* ── NAV ── */}
        <nav className="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800/50">
          <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between relative">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-shadow">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-lg font-bold">Fluxo AI</span>
            </Link>

            <div className="hidden md:flex items-center gap-8 text-[13px] text-zinc-400">
              <a href="#galeria" className="hover:text-white transition-colors">Galeria</a>
              <a href="#como-funciona" className="hover:text-white transition-colors">Como funciona</a>
              <a href="#modelos" className="hover:text-white transition-colors">Modelos</a>
              <a href="#precos" className="hover:text-white transition-colors">Precos</a>
              <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/login" className="hidden sm:block text-sm text-zinc-400 hover:text-white transition-colors px-3 py-1.5">
                Entrar
              </Link>
              <Link href="/register" className="text-sm bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg font-medium transition-all hover:shadow-lg hover:shadow-purple-600/25">
                Comecar Gratis
              </Link>
              <MobileMenu />
            </div>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section className="relative pt-16 md:pt-28 pb-12 md:pb-20 px-6">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-purple-600/15 rounded-full blur-[150px]" />
            <div className="absolute top-40 left-1/4 w-[400px] h-[400px] bg-pink-600/10 rounded-full blur-[120px]" />
            <div className="absolute top-60 right-1/4 w-[300px] h-[300px] bg-blue-600/8 rounded-full blur-[100px]" />
          </div>

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <Reveal>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-purple-600/10 border border-purple-500/20 rounded-full text-xs text-purple-300 mb-8">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                Beta exclusivo — vagas limitadas
              </div>
            </Reveal>

            <Reveal delay={100}>
              <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold leading-[1.08] mb-6 tracking-tight">
                Crie conteudo com IA{" "}
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                  arrastando blocos.
                </span>
              </h1>
            </Reveal>

            <Reveal delay={200}>
              <p className="text-xl md:text-2xl text-zinc-300 max-w-2xl mx-auto mb-3 leading-relaxed font-light">
                Imagens 4K e videos HD com os melhores modelos do mundo.{" "}
                <span className="text-zinc-500">Sem codigo. Sem assinatura cara.</span>
              </p>
              <p className="text-base md:text-lg text-zinc-500 max-w-xl mx-auto mb-10">
                O que levava 2 horas agora leva 2 minutos.
              </p>
            </Reveal>

            <Reveal delay={300}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl text-lg transition-all hover:shadow-2xl hover:shadow-purple-600/30 hover:-translate-y-0.5 active:translate-y-0"
                >
                  Comecar Agora — E Gratis
                </Link>
                <a
                  href="#galeria"
                  className="w-full sm:w-auto px-10 py-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium rounded-xl text-lg transition-all border border-zinc-700/80 hover:border-zinc-600 flex items-center justify-center gap-2 group"
                >
                  Ver galeria
                  <svg className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </a>
              </div>
              <div className="mt-6 flex items-center justify-center gap-5 text-xs text-zinc-600">
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-green-500/70" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  Sem cartao
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-green-500/70" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  Setup em 30s
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-green-500/70" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  Creditos nao expiram
                </span>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── PREVIEW DO EDITOR ── */}
        <section className="pb-16 md:pb-28 px-6">
          <Reveal delay={400}>
            <div className="max-w-5xl mx-auto">
              <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/80 overflow-hidden shadow-2xl shadow-purple-600/5">
                {/* Barra do topo fake */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-900">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-zinc-700" />
                    <div className="w-3 h-3 rounded-full bg-zinc-700" />
                    <div className="w-3 h-3 rounded-full bg-zinc-700" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="px-4 py-1 bg-zinc-800 rounded-md text-xs text-zinc-500">fluxo-ai.com/editor</div>
                  </div>
                </div>
                {/* Canvas mockup */}
                <div className="p-6 md:p-10 min-h-[300px] md:min-h-[400px] relative bg-[radial-gradient(circle_at_center,_rgba(124,58,237,0.03)_0%,_transparent_70%)]">
                  {/* Grid dots background */}
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle, #555 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

                  {/* Node: Prompt */}
                  <div className="absolute top-8 left-6 md:top-12 md:left-12 w-52 md:w-64 bg-zinc-800 border border-zinc-700 rounded-xl shadow-lg z-10">
                    <div className="px-4 py-2.5 border-b border-zinc-700 flex items-center gap-2">
                      <div className="w-5 h-5 bg-purple-600/20 rounded flex items-center justify-center"><span className="text-[10px]">✏️</span></div>
                      <span className="text-xs font-semibold text-zinc-300">Prompt</span>
                    </div>
                    <div className="p-3">
                      <div className="text-[11px] text-zinc-500 leading-relaxed">&quot;Foto de produto gourmet em estudio minimalista, iluminacao suave...&quot;</div>
                    </div>
                    <div className="absolute top-1/2 -right-2 w-4 h-4 bg-purple-500 rounded-full border-2 border-zinc-900 -translate-y-1/2" />
                  </div>

                  {/* Connection line */}
                  <svg className="absolute top-[4.5rem] md:top-[5.5rem] left-[17rem] md:left-[21rem] w-20 md:w-32 h-20 z-0 hidden sm:block" viewBox="0 0 120 80">
                    <path d="M0,10 C40,10 80,70 120,70" fill="none" stroke="url(#grad)" strokeWidth="2" strokeDasharray="6 4" />
                    <defs>
                      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#a855f7" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#ec4899" stopOpacity="0.6" />
                      </linearGradient>
                    </defs>
                  </svg>

                  {/* Node: Modelo IA */}
                  <div className="absolute top-32 right-6 md:top-24 md:right-12 w-52 md:w-64 bg-zinc-800 border border-purple-500/30 rounded-xl shadow-lg shadow-purple-500/5 z-10">
                    <div className="px-4 py-2.5 border-b border-zinc-700 flex items-center gap-2">
                      <div className="w-5 h-5 bg-pink-600/20 rounded flex items-center justify-center"><span className="text-[10px]">🖼️</span></div>
                      <span className="text-xs font-semibold text-zinc-300">Nano Banana Pro</span>
                      <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400">4K</span>
                    </div>
                    <div className="p-3 flex flex-col gap-2">
                      <div className="flex justify-between text-[10px]"><span className="text-zinc-500">Aspecto</span><span className="text-zinc-400">1:1</span></div>
                      <div className="flex justify-between text-[10px]"><span className="text-zinc-500">Resolucao</span><span className="text-zinc-400">1024x1024</span></div>
                      <div className="flex justify-between text-[10px]"><span className="text-zinc-500">Custo</span><span className="text-purple-400">18 cred</span></div>
                    </div>
                    <div className="absolute top-1/2 -left-2 w-4 h-4 bg-pink-500 rounded-full border-2 border-zinc-900 -translate-y-1/2" />
                  </div>

                  {/* Node: Resultado (bottom) */}
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 md:bottom-10 w-44 md:w-52 bg-zinc-800 border border-green-500/20 rounded-xl shadow-lg z-10">
                    <div className="px-4 py-2.5 border-b border-zinc-700 flex items-center gap-2">
                      <div className="w-5 h-5 bg-green-600/20 rounded flex items-center justify-center"><span className="text-[10px]">✅</span></div>
                      <span className="text-xs font-semibold text-green-400">Resultado</span>
                    </div>
                    <div className="p-3">
                      <div className="w-full aspect-square rounded-lg bg-gradient-to-br from-purple-900/40 via-zinc-800 to-pink-900/40 flex items-center justify-center">
                        <span className="text-2xl opacity-60">🖼️</span>
                      </div>
                    </div>
                  </div>

                  {/* Run button floating */}
                  <div className="absolute bottom-6 right-6 md:bottom-10 md:right-12 z-10">
                    <div className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-xs font-bold shadow-lg shadow-purple-600/20 flex items-center gap-2">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>
                      Run Pipeline
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ── GALERIA DE EXEMPLOS ── */}
        <section id="galeria" className="py-16 md:py-24 px-6 border-y border-zinc-800/50 bg-zinc-900/20">
          <div className="max-w-6xl mx-auto">
            <Reveal>
              <div className="text-center mb-12">
                <p className="text-sm font-semibold text-purple-400 uppercase tracking-widest mb-3">Resultados reais</p>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Tudo isso foi feito no{" "}
                  <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Fluxo AI</span>
                </h2>
                <p className="text-zinc-500 max-w-lg mx-auto">
                  Imagens em 4K e videos HD gerados por nossos usuarios. Clique pra ver detalhes.
                </p>
              </div>
            </Reveal>

            {/* Grid de imagens */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-4">
              {GALLERY_IMAGES.map((img, i) => (
                <GalleryItem key={i} src={img.src} label={img.label} model={img.model} delay={i * 80} />
              ))}
            </div>

            {/* Grid de videos */}
            <div className="grid md:grid-cols-3 gap-3 md:gap-4">
              {GALLERY_VIDEOS.map((vid, i) => (
                <GalleryVideoItem key={i} src={vid.src} label={vid.label} model={vid.model} delay={i * 100 + 200} />
              ))}
            </div>

            <Reveal delay={500}>
              <div className="text-center mt-10">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-8 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 rounded-xl text-sm font-medium transition-all"
                >
                  Criar meus proprios resultados
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── DOR / PROBLEMA ── */}
        <section className="py-16 md:py-24 px-6">
          <div className="max-w-4xl mx-auto">
            <Reveal>
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
                Se voce cria conteudo com IA, ja passou por isso:
              </h2>
              <p className="text-zinc-500 text-center mb-12 text-sm">( e sabe como e frustrante )</p>
            </Reveal>

            <div className="grid md:grid-cols-3 gap-5">
              {[
                { emoji: "😤", title: "5 ferramentas abertas", desc: "Uma pra gerar imagem, outra pro video, outra pra editar... e o resultado final? Mediocre." },
                { emoji: "💸", title: "R$200/mes em assinaturas", desc: "RunwayML, Pika, Midjourney... cada uma cobra separado. No final voce mal usa tudo." },
                { emoji: "⏰", title: "Horas em processo manual", desc: "Gerar, baixar, upload, gerar de novo. Um fluxo de 5 min vira uma tarde inteira." },
              ].map((item, i) => (
                <Reveal key={item.title} delay={i * 120}>
                  <div className="bg-zinc-900/80 border border-red-500/10 rounded-2xl p-6 h-full relative overflow-hidden group hover:border-red-500/20 transition-colors">
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-red-500/40 to-transparent" />
                    <div className="text-3xl mb-3">{item.emoji}</div>
                    <h3 className="font-semibold mb-2 text-zinc-200">{item.title}</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">{item.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── SOLUCAO ── */}
        <section className="py-16 md:py-24 px-6 bg-zinc-900/30">
          <Reveal>
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-2xl mb-6 ring-1 ring-purple-500/10">
                <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </div>
              <h2 className="text-3xl md:text-5xl font-extrabold mb-5 leading-tight">
                E se tudo isso ficasse em{" "}
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">um so lugar?</span>
              </h2>
              <p className="text-lg text-zinc-400 leading-relaxed max-w-2xl mx-auto">
                O Fluxo AI reune os melhores modelos de IA do mundo em um editor visual.
                Arraste blocos, conecte e gere. <strong className="text-zinc-200">Sem sair da tela. Sem pagar 5 assinaturas.</strong>
              </p>
            </div>
          </Reveal>
        </section>

        {/* ── COMO FUNCIONA ── */}
        <section id="como-funciona" className="py-16 md:py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <Reveal>
              <div className="text-center mb-16">
                <p className="text-sm font-semibold text-purple-400 uppercase tracking-widest mb-3">Simples assim</p>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">3 passos. Resultado profissional.</h2>
                <p className="text-zinc-500 max-w-lg mx-auto">
                  Se voce sabe arrastar e soltar, voce sabe usar. Zero codigo.
                </p>
              </div>
            </Reveal>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  n: "1", color: "purple", title: "Arraste os blocos",
                  desc: "Prompt, imagem, modelo de IA — cada um e um bloco visual. Arraste pro canvas.",
                  tags: ["Prompt", "Imagem", "Modelo IA"],
                  tagColors: ["bg-zinc-800 text-zinc-400", "bg-zinc-800 text-zinc-400", "bg-purple-500/10 text-purple-400"],
                },
                {
                  n: "2", color: "pink", title: "Conecte os nos",
                  desc: "Ligue prompt ao modelo, imagem ao video. Pipelines complexos com um clique.",
                  tags: ["Prompt → Kling 3.0"],
                  tagColors: ["bg-pink-500/10 text-pink-400"],
                },
                {
                  n: "3", color: "orange", title: 'Clique "Run"',
                  desc: "Um clique. Imagem 4K ou video HD aparece no mesmo fluxo. Pronto pra usar.",
                  tags: ["Pronto em segundos"],
                  tagColors: ["bg-green-500/10 text-green-400 border border-green-500/15"],
                },
              ].map((step, i) => {
                const bgMap: Record<string, string> = { purple: "bg-purple-600 shadow-purple-600/30", pink: "bg-pink-600 shadow-pink-600/30", orange: "bg-orange-600 shadow-orange-600/30" };
                const borderMap: Record<string, string> = { purple: "hover:border-purple-500/30", pink: "hover:border-pink-500/30", orange: "hover:border-orange-500/30" };
                return (
                  <Reveal key={step.n} delay={i * 150}>
                    <div className="relative group h-full">
                      <div className={`absolute -top-4 -left-4 w-12 h-12 ${bgMap[step.color]} rounded-2xl flex items-center justify-center text-xl font-black shadow-lg group-hover:scale-110 transition-transform z-10`}>{step.n}</div>
                      <div className={`bg-zinc-900/80 border border-zinc-800 rounded-2xl p-8 pt-12 ${borderMap[step.color]} transition-colors h-full`}>
                        <h3 className="text-lg font-bold mb-3">{step.title}</h3>
                        <p className="text-sm text-zinc-400 leading-relaxed mb-4">{step.desc}</p>
                        <div className="flex flex-wrap gap-2">
                          {step.tags.map((tag, j) => (
                            <span key={tag} className={`text-[10px] px-2.5 py-1 rounded-md ${step.tagColors[j]}`}>{tag}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── NUMEROS ── */}
        <section className="py-14 px-6 border-y border-zinc-800/50">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: <CountUp end={6} suffix="+" />, label: "Modelos de IA" },
              { value: "4K", label: "Resolucao maxima" },
              { value: <CountUp end={30} suffix="s" />, label: "Pra comecar" },
              { value: <><CountUp end={25} suffix="%" /></>, label: "Mais barato", gradient: true },
            ].map((item, i) => (
              <Reveal key={i} delay={i * 80}>
                <div className="text-center">
                  <p className={`text-3xl md:text-4xl font-black ${item.gradient ? "bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent" : "text-white"}`}>
                    {item.value}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1.5">{item.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── MODELOS ── */}
        <section id="modelos" className="py-16 md:py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <Reveal>
              <div className="text-center mb-16">
                <p className="text-sm font-semibold text-purple-400 uppercase tracking-widest mb-3">Arsenal completo</p>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">6 modelos. 1 plataforma.</h2>
                <p className="text-zinc-500 max-w-lg mx-auto">
                  Os mesmos modelos das grandes agencias — voce paga por uso, nao por assinatura.
                </p>
              </div>
            </Reveal>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { name: "Nano Banana Pro", type: "Imagem", desc: "Imagens ate 4K. Qualidade de estudio.", cost: "18 cred", badge: "bg-purple-500/10 text-purple-400 border-purple-500/20", icon: "🖼️" },
                { name: "GPT Image 1.5", type: "Imagem", desc: "Motor OpenAI. Texto perfeito em imagens.", cost: "4 cred", badge: "bg-green-500/10 text-green-400 border-green-500/20", icon: "✨" },
                { name: "Flux 2 Pro", type: "Imagem", desc: "Black Forest Labs. Qualidade top, barato.", cost: "6 cred", badge: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", icon: "⚡" },
                { name: "Veo 3.1", type: "Video", desc: "Google Veo. Videos realistas com audio.", cost: "60 cred", badge: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: "🎬" },
                { name: "Kling 3.0", type: "Video", desc: "Controle total. Elementos customizados.", cost: "70 cred", badge: "bg-orange-500/10 text-orange-400 border-orange-500/20", icon: "🎥" },
                { name: "Seedance 2.0", type: "Video", desc: "ByteDance. Danca e movimentos naturais.", cost: "40 cred", badge: "bg-pink-500/10 text-pink-400 border-pink-500/20", icon: "💃" },
                { name: "Video Concat", type: "Gratis", desc: "Junte multiplos videos em um so clique.", cost: "0 cred", badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20", icon: "🔗" },
              ].map((m, i) => (
                <Reveal key={m.name} delay={i * 80}>
                  <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 transition-all hover:-translate-y-1 h-full">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full border ${m.badge}`}>{m.type}</span>
                      <span className="text-[11px] text-zinc-600">{m.cost}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{m.icon}</span>
                      <h3 className="font-bold">{m.name}</h3>
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed">{m.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── PARA QUEM ── */}
        <section className="py-16 md:py-24 px-6 bg-zinc-900/30">
          <div className="max-w-5xl mx-auto">
            <Reveal>
              <div className="text-center mb-16">
                <p className="text-sm font-semibold text-purple-400 uppercase tracking-widest mb-3">Feito pra voce</p>
                <h2 className="text-3xl md:text-4xl font-bold">Quem usa o Fluxo AI?</h2>
              </div>
            </Reveal>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                { emoji: "🎯", title: "Criadores UGC", desc: "Videos de produto e conteudo para marcas em minutos.", quote: "Faco em 10 min o que antes levava 3 horas", color: "text-purple-400" },
                { emoji: "📱", title: "Social Media", desc: "Posts, reels e thumbnails com qualidade profissional.", quote: "Meu cliente achou que eu contratei designer", color: "text-pink-400" },
                { emoji: "🏪", title: "E-commerce", desc: "Fotos de produto e criativos para ads. Sem fotografo.", quote: "Cortei 80% do custo com criativos", color: "text-orange-400" },
              ].map((item, i) => (
                <Reveal key={item.title} delay={i * 120}>
                  <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-8 hover:border-zinc-700 transition-colors h-full flex flex-col">
                    <div className="text-4xl mb-4">{item.emoji}</div>
                    <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed mb-4 flex-1">{item.desc}</p>
                    <p className={`text-xs ${item.color} font-medium italic`}>&ldquo;{item.quote}&rdquo;</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── COMPARACAO ── */}
        <section id="precos" className="py-16 md:py-24 px-6">
          <div className="max-w-4xl mx-auto">
            <Reveal>
              <div className="text-center mb-16">
                <p className="text-sm font-semibold text-purple-400 uppercase tracking-widest mb-3">Transparencia total</p>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Pare de pagar caro.{" "}
                  <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">Compare.</span>
                </h2>
                <p className="text-zinc-500 max-w-lg mx-auto">
                  Uma plataforma. Todos os modelos. Sem 5 assinaturas.
                </p>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="overflow-x-auto rounded-2xl border border-zinc-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-zinc-900/80">
                      <th className="text-left py-4 px-5 text-zinc-500 font-medium">Recurso</th>
                      <th className="py-4 px-5 text-center"><span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-bold text-base">Fluxo AI</span></th>
                      <th className="py-4 px-5 text-center text-zinc-600 font-medium">Weavy</th>
                      <th className="py-4 px-5 text-center text-zinc-600 font-medium">RunwayML</th>
                      <th className="py-4 px-5 text-center text-zinc-600 font-medium">Pika</th>
                    </tr>
                  </thead>
                  <tbody className="text-zinc-400">
                    {[
                      { label: "Editor visual (nos)", vals: ["✓", "✓", "✗", "✗"], highlight: [true, false, false, false] },
                      { label: "Imagem 1K", vals: ["18 cred", "24 cred", "40 cred", "—"], highlight: [true, false, false, false] },
                      { label: "Video basico", vals: ["60 cred", "80 cred", "100 cred", "50 cred"], highlight: [true, false, false, false] },
                      { label: "Modelos disponiveis", vals: ["6", "5", "1", "1"], highlight: [true, false, false, false] },
                      { label: "Concatenar videos", vals: ["✓", "✗", "✗", "✗"], highlight: [true, false, false, false] },
                      { label: "Paga so o que usa", vals: ["✓", "✓", "✗", "✗"], highlight: [true, false, false, false] },
                    ].map((row) => (
                      <tr key={row.label} className="border-t border-zinc-800/50 hover:bg-zinc-900/40 transition-colors">
                        <td className="py-3.5 px-5 font-medium text-zinc-300 text-[13px]">{row.label}</td>
                        {row.vals.map((v, j) => (
                          <td key={j} className={`py-3.5 px-5 text-center ${
                            v === "✓" ? (row.highlight[j] ? "text-green-400 font-bold text-base" : "text-green-400/40") :
                            v === "✗" ? "text-zinc-700" :
                            row.highlight[j] ? "text-purple-400 font-semibold" : ""
                          }`}>{v === "✓" ? "✓" : v === "✗" ? "✗" : v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-center text-[11px] text-zinc-700 mt-3">
                Precos baseados nos planos publicados de cada plataforma em abril de 2026.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="py-16 md:py-24 px-6 bg-zinc-900/30">
          <div className="max-w-3xl mx-auto">
            <Reveal>
              <div className="text-center mb-12">
                <p className="text-sm font-semibold text-purple-400 uppercase tracking-widest mb-3">Duvidas?</p>
                <h2 className="text-3xl md:text-4xl font-bold">Perguntas frequentes</h2>
              </div>
            </Reveal>

            <div className="space-y-3">
              {[
                { q: "Preciso saber programar?", a: "Nao. Zero codigo. A interface e 100% visual — voce arrasta blocos e conecta com cliques. Se sabe usar PowerPoint, sabe usar o Fluxo." },
                { q: "Quanto custa?", a: "Voce compra creditos e gasta como quiser. Uma imagem custa a partir de 4 creditos, um video a partir de 40. Sem assinatura mensal, sem surpresas na fatura." },
                { q: "E se a geracao falhar?", a: "Seus creditos sao devolvidos automaticamente. Erro = reembolso instantaneo. Voce so paga por resultados." },
                { q: "Meus creditos expiram?", a: "Nao. Comprou, e seu. Sem prazo, sem fidelidade, sem contrato. Use quando quiser." },
                { q: "Qual a qualidade dos videos?", a: "Profissional. Usamos Google Veo 3.1, Kling 3.0 e ByteDance Seedance — os mesmos motores das maiores agencias do mundo." },
                { q: "Posso usar pra conteudo comercial?", a: "Sim. Todo conteudo gerado e seu. Use em ads, redes sociais, e-commerce — sem restricao." },
              ].map((faq, i) => (
                <Reveal key={faq.q} delay={i * 60}>
                  <details className="group bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors">
                    <summary className="flex items-center justify-between px-6 py-4 cursor-pointer select-none">
                      <span className="font-medium text-zinc-200 text-[15px]">{faq.q}</span>
                      <svg className="w-5 h-5 text-zinc-600 group-open:rotate-180 transition-transform shrink-0 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="px-6 pb-5 text-sm text-zinc-400 leading-relaxed">{faq.a}</div>
                  </details>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA FINAL — LISTA DE ESPERA ── */}
        <section className="py-20 md:py-32 px-6 relative">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-purple-600/10 rounded-full blur-[150px]" />
          </div>
          <Reveal>
            <div className="max-w-2xl mx-auto text-center relative z-10">
              <p className="text-sm font-semibold text-purple-400 uppercase tracking-widest mb-6">Falta pouco</p>
              <h2 className="text-3xl md:text-5xl font-extrabold mb-6 leading-tight">
                Enquanto voce pensa,
                <br />
                outros ja estao criando.
              </h2>
              <p className="text-lg text-zinc-400 mb-10 leading-relaxed">
                Apenas 50 vagas no beta. Deixe seu contato e seja um dos primeiros.
              </p>

              <WaitlistForm />

              <div className="mt-8 flex items-center justify-center gap-5 text-xs text-zinc-600">
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-green-500/70" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  Acesso antecipado
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-green-500/70" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  Bonus exclusivo
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-green-500/70" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  Sem compromisso
                </span>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ── FOOTER ── */}
        <footer className="border-t border-zinc-800/50 py-10 px-6">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-sm font-bold text-zinc-400">Fluxo AI</span>
            </Link>
            <div className="flex items-center gap-6 text-xs text-zinc-600">
              <a href="#galeria" className="hover:text-zinc-400 transition-colors">Galeria</a>
              <a href="#como-funciona" className="hover:text-zinc-400 transition-colors">Como funciona</a>
              <a href="#modelos" className="hover:text-zinc-400 transition-colors">Modelos</a>
              <a href="#precos" className="hover:text-zinc-400 transition-colors">Precos</a>
              <Link href="/pricing" className="hover:text-zinc-400 transition-colors">Planos</Link>
              <Link href="/login" className="hover:text-zinc-400 transition-colors">Entrar</Link>
            </div>
            <p className="text-[11px] text-zinc-700">&copy; 2026 Fluxo AI. Todos os direitos reservados.</p>
          </div>
        </footer>

      </div>
    </SmoothScroll>
  );
}
