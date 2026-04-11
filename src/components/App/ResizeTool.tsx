"use client";

import { useState, useRef } from "react";

interface Props {
  onBack: () => void;
}

const PRESETS = [
  { label: "4K (3840px)", maxSize: 3840 },
  { label: "2K (2560px)", maxSize: 2560 },
  { label: "Full HD (1920px)", maxSize: 1920 },
  { label: "HD (1280px)", maxSize: 1280 },
  { label: "Web (800px)", maxSize: 800 },
];

const QUALITY_OPTIONS = [
  { label: "Maxima (95%)", value: 0.95 },
  { label: "Alta (85%)", value: 0.85 },
  { label: "Media (70%)", value: 0.70 },
  { label: "Leve (50%)", value: 0.50 },
];

interface ImageInfo {
  file: File;
  preview: string;
  width: number;
  height: number;
}

export default function ResizeTool({ onBack }: Props) {
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [maxSize, setMaxSize] = useState(3840);
  const [quality, setQuality] = useState(0.85);
  const [format, setFormat] = useState<"jpeg" | "png" | "webp">("png");
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<{ name: string; url: string; size: number; width: number; height: number }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    e.target.value = "";

    const newImages: ImageInfo[] = [];

    let loaded = 0;
    for (const file of files) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        newImages.push({ file, preview: url, width: img.width, height: img.height });
        loaded++;
        if (loaded === files.length) {
          setImages((prev) => [...prev, ...newImages]);
        }
      };
      img.src = url;
    }
  };

  const resizeImage = (file: File, mSize: number, q: number, fmt: string): Promise<{ blob: Blob; width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const ratio = Math.min(mSize / img.width, mSize / img.height, 1);
          const newW = Math.round(img.width * ratio);
          const newH = Math.round(img.height * ratio);

          const canvas = document.createElement("canvas");
          canvas.width = newW;
          canvas.height = newH;
          const ctx = canvas.getContext("2d");
          if (!ctx) { reject(new Error("Canvas error")); return; }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, newW, newH);

          const mimeType = fmt === "jpeg" ? "image/jpeg" : fmt === "webp" ? "image/webp" : "image/png";
          canvas.toBlob(
            (blob) => {
              if (blob) resolve({ blob, width: newW, height: newH });
              else reject(new Error("Falha ao converter imagem"));
            },
            mimeType,
            fmt === "png" ? undefined : q
          );
        };
        img.onerror = () => reject(new Error("Falha ao carregar imagem"));
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
      reader.readAsDataURL(file);
    });
  };

  const handleResize = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);
    setResults([]);

    const newResults: typeof results = [];

    for (const img of images) {
      try {
        const { blob, width, height } = await resizeImage(img.file, maxSize, quality, format);
        const ext = format === "jpeg" ? "jpg" : format;
        const baseName = img.file.name.replace(/\.[^.]+$/, "");
        const url = URL.createObjectURL(blob);
        newResults.push({
          name: `${baseName}_${width}x${height}.${ext}`,
          url,
          size: blob.size,
          width,
          height,
        });
      } catch (err) {
        console.error("Resize failed:", img.file.name, err);
      }
    }

    setResults(newResults);
    setIsProcessing(false);
  };

  const handleDownloadAll = () => {
    for (const r of results) {
      const a = document.createElement("a");
      a.href = r.url;
      a.download = r.name;
      a.click();
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-zinc-950 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800 shrink-0">
        <button
          onClick={onBack}
          className="text-zinc-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <h1 className="text-lg font-semibold text-white">Resize Tool</h1>
          <p className="text-xs text-zinc-500">Redimensione imagens para usar como input no gerador</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left — Config */}
        <div className="w-1/2 border-r border-zinc-800 overflow-y-auto p-6 space-y-5">
          {/* Upload */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-purple-400">Imagens</span>
              {images.length > 0 && (
                <span className="text-[10px] text-zinc-500">{images.length} arquivo(s)</span>
              )}
            </div>

            {images.length > 0 ? (
              <div className="space-y-2">
                {images.map((img, i) => (
                  <div key={i} className="flex items-center gap-3 bg-zinc-800 border border-zinc-700 rounded-lg p-2">
                    <img src={img.preview} alt={img.file.name} className="w-12 h-12 object-cover rounded" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-300 truncate">{img.file.name}</p>
                      <p className="text-[10px] text-zinc-500">
                        {img.width}x{img.height} — {formatSize(img.file.size)}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        URL.revokeObjectURL(img.preview);
                        setImages((prev) => prev.filter((_, j) => j !== i));
                      }}
                      className="text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                >
                  + Adicionar mais
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-[120px] border-2 border-dashed border-zinc-700 rounded-lg flex flex-col items-center justify-center gap-2 text-zinc-500 hover:border-purple-500/50 hover:text-purple-400 transition-colors"
              >
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <span className="text-sm">Arraste ou clique para adicionar imagens</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Preset */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-purple-400">Tamanho Maximo</span>
            </div>
            <p className="text-xs text-zinc-500 mb-2">
              O lado maior da imagem sera limitado a esse valor. Proporcao mantida.
            </p>
            <select
              value={maxSize}
              onChange={(e) => setMaxSize(Number(e.target.value))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-purple-500"
            >
              {PRESETS.map((p) => (
                <option key={p.maxSize} value={p.maxSize}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Quality */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-purple-400">Qualidade</span>
            </div>
            <select
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-purple-500"
            >
              {QUALITY_OPTIONS.map((q) => (
                <option key={q.value} value={q.value}>{q.label}</option>
              ))}
            </select>
          </div>

          {/* Format */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-purple-400">Formato</span>
            </div>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as "jpeg" | "png" | "webp")}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-purple-500"
            >
              <option value="png">PNG (sem perda)</option>
              <option value="jpeg">JPEG (menor tamanho)</option>
              <option value="webp">WebP (melhor compressao)</option>
            </select>
          </div>

          {/* Resize button */}
          <div className="pt-2">
            <button
              onClick={handleResize}
              disabled={isProcessing || images.length === 0}
              className={`w-full py-3 rounded-lg text-sm font-medium transition-colors ${
                isProcessing || images.length === 0
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-500 text-white"
              }`}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Redimensionando...
                </span>
              ) : (
                `Redimensionar ${images.length > 0 ? `(${images.length} imagem${images.length > 1 ? "s" : ""})` : ""}`
              )}
            </button>
          </div>
        </div>

        {/* Right — Results */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 shrink-0">
            <span className="text-sm font-medium text-zinc-300">Resultado</span>
            {results.length > 0 && (
              <button
                onClick={handleDownloadAll}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30 transition-colors"
              >
                Baixar Todas ({results.length})
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {isProcessing ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-zinc-500">Processando imagens...</p>
                </div>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-3">
                {results.map((r, i) => (
                  <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                    <img src={r.url} alt={r.name} className="w-full max-h-[200px] object-contain bg-zinc-800" />
                    <div className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-xs text-zinc-300">{r.name}</p>
                        <p className="text-[10px] text-zinc-500">{r.width}x{r.height} — {formatSize(r.size)}</p>
                      </div>
                      <a
                        href={r.url}
                        download={r.name}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                      >
                        Baixar
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <svg className="w-12 h-12 mx-auto mb-3 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  <p className="text-sm text-zinc-600 italic">
                    Adicione imagens e clique em redimensionar
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
