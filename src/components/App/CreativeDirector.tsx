"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  onBack: () => void;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  content: `Oi! Sou o seu Diretor Criativo de IA. Converso com voce pra desenhar uma campanha publicitaria gerada por IA do inicio ao fim.

Pra comecar, me conta:
- Qual marca / produto voce quer anunciar?
- Qual o clima que voce busca? (luxo, epico, emocional, viral, etc)
- Voce ja tem foto do produto ou do personagem?

Com isso eu recomendo um genero (FMCG, Fashion, Mascot, Slice-of-Life ou Single-Shot Viral) e uma estrutura narrativa — depois entrego o pacote completo de prompts pra colar nos nodes.`,
};

export default function CreativeDirector({ onBack }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isSending]);

  const send = async () => {
    const text = input.trim();
    if (!text || isSending) return;

    setError("");
    const userMsg: ChatMessage = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setIsSending(true);

    try {
      const res = await fetch("/api/chat/creative-director", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Erro ao falar com o diretor criativo");
      }
      const reply: ChatMessage = { role: "assistant", content: json.text || "" };
      setMessages((prev) => [...prev, reply]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      setError(message);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const reset = () => {
    setMessages([WELCOME_MESSAGE]);
    setError("");
    inputRef.current?.focus();
  };

  const copyCodeBlock = async (idx: number, content: string) => {
    const match = content.match(/```[\s\S]*?\n([\s\S]*?)```/);
    const text = match ? match[1].trim() : content;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(idx);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  };

  const hasCodeBlock = (content: string) => /```[\s\S]*```/.test(content);

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-zinc-950">
      <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
            title="Voltar"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-base font-semibold text-white">Diretor Criativo</h1>
            <p className="text-xs text-zinc-500">Converse e receba o pacote completo de prompts</p>
          </div>
        </div>
        <button
          onClick={reset}
          disabled={isSending}
          className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors disabled:opacity-50"
        >
          Nova conversa
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-purple-600 text-white"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-200"
                }`}
              >
                {m.content}
                {m.role === "assistant" && hasCodeBlock(m.content) && (
                  <button
                    onClick={() => copyCodeBlock(idx, m.content)}
                    className="mt-3 text-xs px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:bg-purple-500/20 transition-colors"
                  >
                    {copied === idx ? "Copiado!" : "Copiar pacote de prompts"}
                  </button>
                )}
              </div>
            </div>
          ))}
          {isSending && (
            <div className="flex justify-start">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-zinc-500">
                <span className="inline-flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-zinc-600 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-zinc-600 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-zinc-600 animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="px-6 pb-2">
          <div className="max-w-3xl mx-auto bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg px-3 py-2 text-xs">
            {error}
          </div>
        </div>
      )}

      <div className="border-t border-zinc-800 bg-zinc-900 p-4">
        <div className="max-w-3xl mx-auto flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Conte sobre a campanha que voce quer criar... (Enter envia, Shift+Enter quebra linha)"
            rows={2}
            className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 resize-none outline-none transition-colors"
            disabled={isSending}
          />
          <button
            onClick={send}
            disabled={isSending || !input.trim()}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-sm font-medium transition-colors"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
