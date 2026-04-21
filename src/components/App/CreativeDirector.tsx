"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  onBack: () => void;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  imageUrls?: string[];
}

const WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  content: `Oi! Sou o seu Diretor Criativo de IA. Converso com voce pra desenhar uma campanha publicitaria gerada por IA do inicio ao fim.

Pra comecar, me conta:
- Qual marca / produto voce quer anunciar?
- Qual o clima que voce busca? (luxo, epico, emocional, viral, etc)
- Voce ja tem foto do produto ou do personagem? Pode anexar aqui mesmo com o botao de imagem 📎

Com isso eu recomendo um genero (FMCG, Fashion, Mascot, Slice-of-Life ou Single-Shot Viral) e uma estrutura narrativa — depois entrego o pacote completo de prompts pra colar nos nodes.

Voce tambem pode me mandar frames/clips ja gerados pra eu analisar o que esta funcionando ou como melhorar.`,
};

export default function CreativeDirector({ onBack }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isSending]);

  const uploadFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (arr.length === 0) return;
    setError("");
    setIsUploading(true);
    try {
      const formData = new FormData();
      arr.forEach((f) => formData.append("files", f));
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Erro no upload da imagem");
      }
      if (!res.ok) throw new Error(data?.error || "Falha no upload");
      if (!data?.urls || !Array.isArray(data.urls)) throw new Error("Resposta de upload invalida");
      setPendingImages((prev) => [...prev, ...data.urls]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro no upload";
      setError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
      e.target.value = "";
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (const it of items) {
      if (it.kind === "file" && it.type.startsWith("image/")) {
        const f = it.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      uploadFiles(files);
    }
  };

  const removePendingImage = (idx: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const send = async () => {
    const text = input.trim();
    if ((!text && pendingImages.length === 0) || isSending || isUploading) return;

    setError("");
    const userMsg: ChatMessage = {
      role: "user",
      content: text,
      ...(pendingImages.length > 0 ? { imageUrls: [...pendingImages] } : {}),
    };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setPendingImages([]);
    setIsSending(true);

    try {
      const res = await fetch("/api/chat/creative-director", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({
            role: m.role,
            content: m.content,
            ...(m.imageUrls ? { imageUrls: m.imageUrls } : {}),
          })),
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
    setPendingImages([]);
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
            <p className="text-xs text-zinc-500">Converse, anexe imagens e receba o pacote de prompts</p>
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
                {m.imageUrls && m.imageUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {m.imageUrls.map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={url}
                        alt={`anexo ${i + 1}`}
                        className="w-28 h-28 object-cover rounded-lg border border-white/10"
                      />
                    ))}
                  </div>
                )}
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
        <div className="max-w-3xl mx-auto">
          {pendingImages.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {pendingImages.map((url, i) => (
                <div key={i} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`preview ${i + 1}`}
                    className="w-16 h-16 object-cover rounded-lg border border-zinc-700"
                  />
                  <button
                    onClick={() => removePendingImage(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-red-500/30 hover:border-red-500/50 flex items-center justify-center transition-colors"
                    title="Remover"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              {isUploading && (
                <div className="w-16 h-16 rounded-lg border border-zinc-700 bg-zinc-950 flex items-center justify-center text-xs text-zinc-500">
                  ...
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 items-end">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={onFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending || isUploading}
              className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-purple-500 text-zinc-400 hover:text-purple-400 transition-colors disabled:opacity-50"
              title="Anexar imagem"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
              </svg>
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
              placeholder="Conte sobre a campanha, anexe fotos do produto ou frames gerados... (Enter envia, Shift+Enter quebra linha, Ctrl+V cola imagem)"
              rows={2}
              className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 resize-none outline-none transition-colors"
              disabled={isSending}
            />
            <button
              onClick={send}
              disabled={isSending || isUploading || (!input.trim() && pendingImages.length === 0)}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-sm font-medium transition-colors"
            >
              Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
