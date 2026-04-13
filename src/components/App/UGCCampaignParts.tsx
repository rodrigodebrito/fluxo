"use client";

import React from "react";

export const WORDS_PER_SECOND = 2.5;

export interface Scene {
  number: number;
  role: string;
  timecode: string;
  imagePrompt: string;
  videoPrompt: string;
  spokenLine: string;
  onScreenText: string;
  previewUrl?: string | null;
}

export type SceneField = "imagePrompt" | "videoPrompt" | "spokenLine" | "onScreenText";

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export function Field({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-medium text-purple-400">{label}</span>
      </div>
      {description && <p className="text-xs text-zinc-500 mb-2">{description}</p>}
      {children}
    </div>
  );
}

export function ImageInput({
  label,
  required,
  description,
  mode,
  setMode,
  preview,
  directUrl,
  setDirectUrl,
  onFileChange,
  onRemove,
  fileRef,
}: {
  label: string;
  required: boolean;
  description: string;
  mode: "upload" | "url";
  setMode: (m: "upload" | "url") => void;
  file: File | null;
  preview: string | null;
  directUrl: string;
  setDirectUrl: (s: string) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  fileRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-purple-400">{label}</span>
          {required && <span className="text-red-400 text-xs">*</span>}
        </div>
        <div className="flex items-center bg-zinc-800 rounded-lg border border-zinc-700 p-0.5">
          <button
            onClick={() => setMode("upload")}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
              mode === "upload" ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Upload
          </button>
          <button
            onClick={() => setMode("url")}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
              mode === "url" ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            URL
          </button>
        </div>
      </div>
      <p className="text-xs text-zinc-500 mb-2">{description}</p>

      {mode === "upload" ? (
        <>
          {preview ? (
            <div className="relative group">
              <img
                src={preview}
                alt={label}
                className="w-full max-h-[220px] object-contain rounded-lg border border-zinc-700 bg-zinc-900"
              />
              <button
                onClick={onRemove}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 border border-zinc-600 flex items-center justify-center text-zinc-400 hover:text-red-400 hover:border-red-400/50 transition-colors opacity-0 group-hover:opacity-100"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full h-[140px] border-2 border-dashed border-zinc-700 rounded-lg flex flex-col items-center justify-center gap-2 text-zinc-500 hover:border-purple-500/50 hover:text-purple-400 transition-colors"
            >
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
              <span className="text-xs">Clique para enviar</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
        </>
      ) : (
        <>
          <input
            type="text"
            value={directUrl}
            onChange={(e) => setDirectUrl(e.target.value)}
            placeholder="https://exemplo.com/foto.jpg"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-purple-500"
          />
          {directUrl.trim().startsWith("http") && (
            <img
              src={directUrl.trim()}
              alt="Preview"
              className="w-full max-h-[180px] object-contain rounded-lg border border-zinc-700 bg-zinc-900 mt-2"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
              onLoad={(e) => {
                (e.target as HTMLImageElement).style.display = "block";
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

export function SceneCard({
  scene,
  imageModelLabel,
  videoModelLabel,
  videoModel,
  voiceMode,
  sceneDuration,
  copiedKey,
  onCopy,
  onRegenerate,
  isRegenerating,
  onRegenerateField,
  regeneratingField,
  onGeneratePreview,
  isPreviewing,
}: {
  scene: Scene;
  imageModelLabel: string;
  videoModelLabel: string;
  videoModel: string;
  voiceMode: "in_video" | "none";
  sceneDuration: number;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
  onRegenerateField: (field: SceneField) => void;
  regeneratingField: string | null;
  onGeneratePreview: () => void;
  isPreviewing: boolean;
}) {
  const isSeedance = videoModel === "seedance-2";
  const videoLen = scene.videoPrompt.length;
  const overLimit = isSeedance && videoLen > 1536;

  const wordCount = scene.spokenLine ? scene.spokenLine.trim().split(/\s+/).filter(Boolean).length : 0;
  const targetWords = Math.round(sceneDuration * WORDS_PER_SECOND);
  const wordsOk = Math.abs(wordCount - targetWords) <= 2;

  const isField = (f: SceneField) => regeneratingField === `${scene.number}-${f}`;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">
          CENA {scene.number} — {scene.role.toUpperCase()}{" "}
          <span className="text-zinc-500 font-normal">({scene.timecode})</span>
        </h3>
        <button
          onClick={onRegenerate}
          disabled={isRegenerating}
          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
            isRegenerating
              ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              : "bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white"
          }`}
        >
          {isRegenerating ? "Regerando..." : "Regerar cena"}
        </button>
      </div>

      {(scene.previewUrl || isPreviewing) && (
        <div className="relative rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950">
          {scene.previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={scene.previewUrl}
              alt={`Preview cena ${scene.number}`}
              className={`w-full max-h-[320px] object-contain ${isPreviewing ? "opacity-40" : ""}`}
            />
          )}
          {isPreviewing && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/60">
              <div className="text-center">
                <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-2" />
                <p className="text-[11px] text-zinc-400">Gerando com Nano Banana Pro...</p>
              </div>
            </div>
          )}
        </div>
      )}

      <PromptBlock
        label="Prompt de Imagem"
        badge={imageModelLabel}
        text={scene.imagePrompt}
        copyKey={`img-${scene.number}`}
        copiedKey={copiedKey}
        onCopy={onCopy}
        onRegenerate={() => onRegenerateField("imagePrompt")}
        isRegenerating={isField("imagePrompt")}
        extraAction={
          <button
            onClick={onGeneratePreview}
            disabled={isPreviewing}
            className="text-[11px] font-medium text-purple-400 hover:text-purple-300 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Gerar imagem desta cena com Nano Banana Pro (custa 18 creditos)"
          >
            {isPreviewing ? "Gerando..." : scene.previewUrl ? "Regerar img (18 cr)" : "Ver imagem (18 cr)"}
          </button>
        }
      />

      <PromptBlock
        label="Prompt de Video"
        badge={videoModelLabel}
        text={scene.videoPrompt}
        copyKey={`vid-${scene.number}`}
        copiedKey={copiedKey}
        onCopy={onCopy}
        onRegenerate={() => onRegenerateField("videoPrompt")}
        isRegenerating={isField("videoPrompt")}
        extraBadge={
          isSeedance ? (
            <span className={`text-[10px] font-mono ${overLimit ? "text-red-400" : "text-green-400"}`}>
              {videoLen}/1536
            </span>
          ) : null
        }
      />

      {voiceMode === "in_video" && scene.spokenLine && (
        <PromptBlock
          label="Fala (pt-br)"
          text={scene.spokenLine}
          copyKey={`spoken-${scene.number}`}
          copiedKey={copiedKey}
          onCopy={onCopy}
          onRegenerate={() => onRegenerateField("spokenLine")}
          isRegenerating={isField("spokenLine")}
          extraBadge={
            <span className={`text-[10px] font-mono ${wordsOk ? "text-green-400" : "text-yellow-400"}`}>
              {wordCount}/{targetWords} palavras
            </span>
          }
        />
      )}

      <PromptBlock
        label="Texto on-screen (CapCut)"
        text={scene.onScreenText}
        copyKey={`osc-${scene.number}`}
        copiedKey={copiedKey}
        onCopy={onCopy}
        onRegenerate={() => onRegenerateField("onScreenText")}
        isRegenerating={isField("onScreenText")}
      />
    </div>
  );
}

export function PromptBlock({
  label,
  badge,
  extraBadge,
  extraAction,
  text,
  copyKey,
  copiedKey,
  onCopy,
  onRegenerate,
  isRegenerating,
}: {
  label: string;
  badge?: string;
  extraBadge?: React.ReactNode;
  extraAction?: React.ReactNode;
  text: string;
  copyKey: string;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-medium text-purple-400 uppercase tracking-wide">{label}</span>
          {badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300">
              {badge}
            </span>
          )}
          {extraBadge}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {extraAction}
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="text-[11px] font-medium text-zinc-400 hover:text-purple-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Regerar apenas este campo (1 credito)"
            >
              {isRegenerating ? "..." : "↻"}
            </button>
          )}
          <button
            onClick={() => onCopy(text, copyKey)}
            className="text-[11px] font-medium text-zinc-400 hover:text-white transition-colors"
          >
            {copiedKey === copyKey ? "Copiado!" : "Copiar"}
          </button>
        </div>
      </div>
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
        <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

export function RefineChat({
  history,
  input,
  setInput,
  onSend,
  isRefining,
}: {
  history: ChatMessage[];
  input: string;
  setInput: (s: string) => void;
  onSend: () => void;
  isRefining: boolean;
}) {
  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <h3 className="text-sm font-semibold text-white">Refinar com chat</h3>
        <span className="text-[10px] text-zinc-500">1 credito por mensagem</span>
      </div>

      {history.length > 0 && (
        <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
          {history.map((m, i) => (
            <div
              key={i}
              className={`text-xs leading-relaxed rounded-lg px-3 py-2 ${
                m.role === "user"
                  ? "bg-purple-500/10 border border-purple-500/20 text-zinc-200"
                  : "bg-zinc-950 border border-zinc-800 text-zinc-400"
              }`}
            >
              <span className="text-[10px] uppercase tracking-wide font-semibold mr-2 opacity-60">
                {m.role === "user" ? "Voce" : "AI"}
              </span>
              {m.text}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder='Ex: "troca a cena 2 pra ficar engracada", "deixa a fala da cena 1 mais curta", "muda a legenda pra algo mais punchy"'
          rows={2}
          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none focus:border-purple-500"
          disabled={isRefining}
        />
        <button
          onClick={onSend}
          disabled={isRefining || !input.trim()}
          className={`px-4 rounded-lg text-xs font-medium shrink-0 ${
            isRefining || !input.trim()
              ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              : "bg-purple-600 hover:bg-purple-500 text-white"
          }`}
        >
          {isRefining ? "..." : "Enviar"}
        </button>
      </div>
    </div>
  );
}

export function CaptionCard({
  caption,
  copiedKey,
  onCopy,
}: {
  caption: string;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  return (
    <div className="bg-zinc-900 border border-purple-500/30 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-white">Legenda do Post</h3>
        <button
          onClick={() => onCopy(caption, "caption")}
          className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
        >
          {copiedKey === "caption" ? "Copiado!" : "Copiar"}
        </button>
      </div>
      <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">{caption}</p>
    </div>
  );
}
