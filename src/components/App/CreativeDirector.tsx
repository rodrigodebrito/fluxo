"use client";

import { useState, useRef, useEffect, useMemo } from "react";

interface Props {
  onBack: () => void;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  imageUrls?: string[];
}

interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
}

const WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  content: `Oi! Sou o seu Diretor Criativo de IA. Converso com voce pra desenhar uma campanha publicitaria gerada por IA do inicio ao fim.

**O que posso fazer:**
- Criar do zero: me conta marca + clima (luxo, epico, emocional, viral) e eu recomendo genero + estrutura + entrego os prompts prontos pra colar.
- Criticar frames ja gerados: anexa a imagem e eu aponto o fix exato — scale lock, interacao, logo flutuando, textura AI-demais, camera spec faltando.

**Pra comecar:**
- Qual marca / produto?
- Que clima voce busca?
- Ja tem foto do produto, do personagem, ou frames gerados pra eu avaliar? Anexa com o botao 📎 (ou cola com Ctrl+V).

Pode mandar varios frames de uma vez pra eu comparar consistencia entre eles (P3 scale lock).`,
};

const STORAGE_KEY_CONVS = "fluxo-creative-director-conversations";
const STORAGE_KEY_ACTIVE = "fluxo-creative-director-active-id";
const LEGACY_KEY_SINGLE = "fluxo-creative-director-chat";

const genId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const titleFromMessages = (messages: ChatMessage[]): string => {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "Nova conversa";
  const raw = firstUser.content.trim().replace(/\s+/g, " ");
  if (!raw && firstUser.imageUrls && firstUser.imageUrls.length > 0) return "Analise de imagem";
  if (!raw) return "Nova conversa";
  return raw.length > 40 ? raw.slice(0, 40) + "..." : raw;
};

const createEmptyConversation = (): Conversation => ({
  id: genId(),
  title: "Nova conversa",
  messages: [WELCOME_MESSAGE],
  updatedAt: Date.now(),
});

const loadInitialState = (): { conversations: Conversation[]; activeId: string } => {
  if (typeof window === "undefined") {
    const empty = createEmptyConversation();
    return { conversations: [empty], activeId: empty.id };
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CONVS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const conversations = parsed as Conversation[];
        const savedActive = localStorage.getItem(STORAGE_KEY_ACTIVE);
        const activeId =
          savedActive && conversations.some((c) => c.id === savedActive) ? savedActive : conversations[0].id;
        return { conversations, activeId };
      }
    }
    const legacy = localStorage.getItem(LEGACY_KEY_SINGLE);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const migrated: Conversation = {
          id: genId(),
          title: titleFromMessages(parsed as ChatMessage[]),
          messages: parsed as ChatMessage[],
          updatedAt: Date.now(),
        };
        localStorage.removeItem(LEGACY_KEY_SINGLE);
        return { conversations: [migrated], activeId: migrated.id };
      }
    }
  } catch {}
  const empty = createEmptyConversation();
  return { conversations: [empty], activeId: empty.id };
};

export default function CreativeDirector({ onBack }: Props) {
  const [{ conversations, activeId }, setState] = useState(loadInitialState);
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeConv = useMemo(
    () => conversations.find((c) => c.id === activeId) || conversations[0],
    [conversations, activeId]
  );
  const messages = activeConv?.messages || [WELCOME_MESSAGE];

  const sortedConvs = useMemo(
    () => [...conversations].sort((a, b) => b.updatedAt - a.updatedAt),
    [conversations]
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isSending]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CONVS, JSON.stringify(conversations));
      localStorage.setItem(STORAGE_KEY_ACTIVE, activeId);
    } catch {}
  }, [conversations, activeId]);

  const updateActiveMessages = (updater: (prev: ChatMessage[]) => ChatMessage[]) => {
    setState((s) => ({
      ...s,
      conversations: s.conversations.map((c) => {
        if (c.id !== s.activeId) return c;
        const nextMessages = updater(c.messages);
        return {
          ...c,
          messages: nextMessages,
          title: titleFromMessages(nextMessages),
          updatedAt: Date.now(),
        };
      }),
    }));
  };

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
    updateActiveMessages(() => nextMessages);
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
      updateActiveMessages((prev) => [...prev, reply]);
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

  const newConversation = () => {
    const empty = createEmptyConversation();
    setState((s) => ({ conversations: [empty, ...s.conversations], activeId: empty.id }));
    setPendingImages([]);
    setError("");
    setInput("");
    inputRef.current?.focus();
  };

  const selectConversation = (id: string) => {
    if (id === activeId) return;
    setState((s) => ({ ...s, activeId: id }));
    setPendingImages([]);
    setError("");
    setInput("");
  };

  const deleteConversation = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm("Apagar esta conversa? Nao tem como desfazer.")) return;
    setState((s) => {
      const remaining = s.conversations.filter((c) => c.id !== id);
      if (remaining.length === 0) {
        const empty = createEmptyConversation();
        return { conversations: [empty], activeId: empty.id };
      }
      const nextActive = s.activeId === id ? remaining[0].id : s.activeId;
      return { conversations: remaining, activeId: nextActive };
    });
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
    <div className="flex-1 min-h-0 flex bg-zinc-950">
      {sidebarOpen && (
        <aside className="w-64 border-r border-zinc-800 bg-zinc-900 flex flex-col">
          <div className="p-3 border-b border-zinc-800">
            <button
              onClick={newConversation}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Nova conversa
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-2">
            {sortedConvs.length === 0 ? (
              <div className="text-xs text-zinc-600 p-3 text-center">Nenhuma conversa ainda</div>
            ) : (
              <div className="space-y-1">
                {sortedConvs.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => selectConversation(c.id)}
                    className={`group flex items-center justify-between gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      c.id === activeId
                        ? "bg-purple-500/10 border border-purple-500/30 text-white"
                        : "hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-transparent"
                    }`}
                    title={c.title}
                  >
                    <span className="text-xs truncate flex-1">{c.title}</span>
                    <button
                      onClick={(e) => deleteConversation(c.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-opacity"
                      title="Apagar conversa"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
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
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
              title={sidebarOpen ? "Fechar conversas" : "Abrir conversas"}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <div>
              <h1 className="text-base font-semibold text-white">Diretor Criativo</h1>
              <p className="text-xs text-zinc-500 truncate max-w-[360px]">{activeConv?.title || "Nova conversa"}</p>
            </div>
          </div>
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
    </div>
  );
}
