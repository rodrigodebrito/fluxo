"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Props {
  onBack: () => void;
}

type AspectRatio = "free" | "9:16" | "1:1" | "16:9" | "4:5";

const ASPECTS: { label: string; value: AspectRatio; ratio: number | null }[] = [
  { label: "Livre", value: "free", ratio: null },
  { label: "9:16", value: "9:16", ratio: 9 / 16 },
  { label: "1:1", value: "1:1", ratio: 1 },
  { label: "4:5", value: "4:5", ratio: 4 / 5 },
  { label: "16:9", value: "16:9", ratio: 16 / 9 },
];

interface ImageInfo {
  src: string;
  width: number;
  height: number;
  name: string;
}

interface Crop {
  x: number;
  y: number;
  w: number;
  h: number;
}

type DragMode = "move" | "nw" | "ne" | "sw" | "se" | null;

export default function CropTool({ onBack }: Props) {
  const [image, setImage] = useState<ImageInfo | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [aspect, setAspect] = useState<AspectRatio>("9:16");
  const [crop, setCrop] = useState<Crop | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<{ w: number; h: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgContainerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragStateRef = useRef<{
    mode: DragMode;
    startX: number;
    startY: number;
    startCrop: Crop;
  } | null>(null);

  const resetCrop = useCallback((info: ImageInfo, a: AspectRatio) => {
    const ratio = ASPECTS.find((x) => x.value === a)?.ratio ?? null;
    if (ratio === null) {
      const m = Math.min(info.width, info.height) * 0.8;
      setCrop({
        x: (info.width - m) / 2,
        y: (info.height - m) / 2,
        w: m,
        h: m,
      });
      return;
    }
    // fit largest rect of given ratio inside image, 80%
    const imgRatio = info.width / info.height;
    let w: number, h: number;
    if (ratio > imgRatio) {
      w = info.width * 0.9;
      h = w / ratio;
    } else {
      h = info.height * 0.9;
      w = h * ratio;
    }
    setCrop({
      x: (info.width - w) / 2,
      y: (info.height - h) / 2,
      w,
      h,
    });
  }, []);

  const loadImage = (src: string, name: string) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const info = { src, width: img.naturalWidth, height: img.naturalHeight, name };
      setImage(info);
      setResultUrl(null);
      setResultSize(null);
      resetCrop(info, aspect);
    };
    img.onerror = () => alert("Nao foi possivel carregar a imagem");
    img.src = src;
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const url = URL.createObjectURL(file);
    loadImage(url, file.name.replace(/\.[^.]+$/, ""));
  };

  const handleLoadUrl = () => {
    if (!urlInput.trim()) return;
    loadImage(urlInput.trim(), "crop");
  };

  const handleAspectChange = (a: AspectRatio) => {
    setAspect(a);
    if (image) resetCrop(image, a);
  };

  // drag handlers
  const getImgPoint = (clientX: number, clientY: number): { x: number; y: number } | null => {
    if (!imgRef.current || !image) return null;
    const rect = imgRef.current.getBoundingClientRect();
    const scaleX = image.width / rect.width;
    const scaleY = image.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrag = (e: React.PointerEvent, dragMode: DragMode) => {
    if (!crop) return;
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const pt = getImgPoint(e.clientX, e.clientY);
    if (!pt) return;
    dragStateRef.current = {
      mode: dragMode,
      startX: pt.x,
      startY: pt.y,
      startCrop: { ...crop },
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const ds = dragStateRef.current;
    if (!ds || !image) return;
    const pt = getImgPoint(e.clientX, e.clientY);
    if (!pt) return;
    const dx = pt.x - ds.startX;
    const dy = pt.y - ds.startY;
    const ratio = ASPECTS.find((x) => x.value === aspect)?.ratio ?? null;
    let { x, y, w, h } = ds.startCrop;

    if (ds.mode === "move") {
      x = Math.max(0, Math.min(image.width - w, ds.startCrop.x + dx));
      y = Math.max(0, Math.min(image.height - h, ds.startCrop.y + dy));
    } else {
      // resize from a corner
      let newX = ds.startCrop.x;
      let newY = ds.startCrop.y;
      let newW = ds.startCrop.w;
      let newH = ds.startCrop.h;

      if (ds.mode === "se") {
        newW = Math.max(20, ds.startCrop.w + dx);
        newH = ratio ? newW / ratio : Math.max(20, ds.startCrop.h + dy);
      } else if (ds.mode === "sw") {
        newW = Math.max(20, ds.startCrop.w - dx);
        newH = ratio ? newW / ratio : Math.max(20, ds.startCrop.h + dy);
        newX = ds.startCrop.x + (ds.startCrop.w - newW);
      } else if (ds.mode === "ne") {
        newW = Math.max(20, ds.startCrop.w + dx);
        newH = ratio ? newW / ratio : Math.max(20, ds.startCrop.h - dy);
        newY = ds.startCrop.y + (ds.startCrop.h - newH);
      } else if (ds.mode === "nw") {
        newW = Math.max(20, ds.startCrop.w - dx);
        newH = ratio ? newW / ratio : Math.max(20, ds.startCrop.h - dy);
        newX = ds.startCrop.x + (ds.startCrop.w - newW);
        newY = ds.startCrop.y + (ds.startCrop.h - newH);
      }

      // clamp inside image
      if (newX < 0) {
        newW += newX;
        if (ratio) newH = newW / ratio;
        newX = 0;
      }
      if (newY < 0) {
        newH += newY;
        if (ratio) newW = newH * ratio;
        newY = 0;
      }
      if (newX + newW > image.width) {
        newW = image.width - newX;
        if (ratio) newH = newW / ratio;
      }
      if (newY + newH > image.height) {
        newH = image.height - newY;
        if (ratio) newW = newH * ratio;
      }

      x = newX;
      y = newY;
      w = newW;
      h = newH;
    }
    setCrop({ x, y, w, h });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    dragStateRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleApply = () => {
    if (!image || !crop) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(crop.w);
      canvas.height = Math.round(crop.h);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(
        img,
        Math.round(crop.x),
        Math.round(crop.y),
        Math.round(crop.w),
        Math.round(crop.h),
        0,
        0,
        Math.round(crop.w),
        Math.round(crop.h),
      );
      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          if (resultUrl) URL.revokeObjectURL(resultUrl);
          const url = URL.createObjectURL(blob);
          setResultUrl(url);
          setResultSize({ w: Math.round(crop.w), h: Math.round(crop.h) });
        },
        "image/png",
        1,
      );
    };
    img.src = image.src;
  };

  const handleDownload = () => {
    if (!resultUrl || !image) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `${image.name}-crop.png`;
    a.click();
  };

  const handleReset = () => {
    if (image) resetCrop(image, aspect);
    setResultUrl(null);
    setResultSize(null);
  };

  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  // Display crop box in pixel coords of the rendered image
  const [displayRect, setDisplayRect] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    if (!image) return;
    const update = () => {
      if (imgRef.current) {
        const r = imgRef.current.getBoundingClientRect();
        setDisplayRect({ w: r.width, h: r.height });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    if (imgRef.current) ro.observe(imgRef.current);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [image]);

  const scale = displayRect && image ? displayRect.w / image.width : 1;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-zinc-950">
      <div className="sticky top-0 z-10 bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-800 px-6 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          title="Voltar"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-lg font-semibold text-white">Crop Tool</h1>
          <p className="text-xs text-zinc-500">Cortar imagem em qualquer aspect ratio</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
        {/* Left column: controls */}
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-purple-400">Imagem</span>
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
            {mode === "upload" ? (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full py-3 bg-zinc-900 border-2 border-dashed border-zinc-700 rounded-lg text-xs text-zinc-400 hover:border-purple-500/50 hover:text-purple-400 transition-colors"
              >
                {image ? "Trocar imagem" : "Clique para enviar"}
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={handleLoadUrl}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-lg"
                >
                  Carregar
                </button>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </div>

          <div>
            <span className="text-sm font-medium text-purple-400 block mb-2">Aspect Ratio</span>
            <div className="grid grid-cols-5 gap-1.5">
              {ASPECTS.map((a) => (
                <button
                  key={a.value}
                  onClick={() => handleAspectChange(a.value)}
                  className={`py-2 rounded-md text-[11px] font-medium transition-colors ${
                    aspect === a.value
                      ? "bg-purple-600 text-white"
                      : "bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600"
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-zinc-500 mt-2">
              9:16 para Veo, Seedance e UGC vertical. 1:1 para posts. 4:5 para feed Instagram.
            </p>
          </div>

          {image && crop && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 space-y-1.5 text-[11px] text-zinc-400 font-mono">
              <div className="flex justify-between">
                <span className="text-zinc-500">Original:</span>
                <span>{image.width} x {image.height}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Crop:</span>
                <span>{Math.round(crop.w)} x {Math.round(crop.h)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Pos:</span>
                <span>{Math.round(crop.x)}, {Math.round(crop.y)}</span>
              </div>
            </div>
          )}

          {image && (
            <div className="space-y-2">
              <button
                onClick={handleApply}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg"
              >
                Aplicar crop
              </button>
              <button
                onClick={handleReset}
                className="w-full py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-700 text-xs font-medium rounded-lg"
              >
                Resetar seleção
              </button>
            </div>
          )}

          {resultUrl && resultSize && (
            <div className="bg-zinc-900 border border-purple-500/30 rounded-lg p-3 space-y-2">
              <div className="text-[11px] text-purple-300 font-mono">
                Resultado: {resultSize.w} x {resultSize.h}
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resultUrl} alt="Crop result" className="w-full rounded border border-zinc-800" />
              <button
                onClick={handleDownload}
                className="w-full py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded-lg"
              >
                Baixar .png
              </button>
            </div>
          )}
        </div>

        {/* Right column: canvas */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 min-h-[500px] flex items-center justify-center">
          {!image ? (
            <div className="text-center text-zinc-600">
              <svg className="w-16 h-16 mx-auto mb-3 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              <p className="text-sm">Envie uma imagem para começar</p>
            </div>
          ) : (
            <div
              ref={imgContainerRef}
              className="relative inline-block max-w-full"
              style={{ touchAction: "none" }}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={image.src}
                alt="Para crop"
                className="block max-w-full max-h-[70vh] w-auto h-auto select-none pointer-events-none"
                draggable={false}
              />
              {crop && displayRect && (
                <>
                  {/* darkening mask */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      boxShadow: `0 0 0 9999px rgba(0,0,0,0.55)`,
                      clipPath: `polygon(
                        0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
                        ${crop.x * scale}px ${crop.y * scale}px,
                        ${crop.x * scale}px ${(crop.y + crop.h) * scale}px,
                        ${(crop.x + crop.w) * scale}px ${(crop.y + crop.h) * scale}px,
                        ${(crop.x + crop.w) * scale}px ${crop.y * scale}px,
                        ${crop.x * scale}px ${crop.y * scale}px
                      )`,
                    }}
                  />
                  {/* crop box */}
                  <div
                    className="absolute border-2 border-purple-500 cursor-move"
                    style={{
                      left: crop.x * scale,
                      top: crop.y * scale,
                      width: crop.w * scale,
                      height: crop.h * scale,
                    }}
                    onPointerDown={(e) => startDrag(e, "move")}
                  >
                    {/* rule of thirds */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute left-1/3 top-0 bottom-0 border-l border-white/30" />
                      <div className="absolute left-2/3 top-0 bottom-0 border-l border-white/30" />
                      <div className="absolute top-1/3 left-0 right-0 border-t border-white/30" />
                      <div className="absolute top-2/3 left-0 right-0 border-t border-white/30" />
                    </div>
                    {/* corner handles */}
                    {(["nw", "ne", "sw", "se"] as const).map((corner) => {
                      const pos: React.CSSProperties = {
                        left: corner.includes("w") ? -6 : undefined,
                        right: corner.includes("e") ? -6 : undefined,
                        top: corner.includes("n") ? -6 : undefined,
                        bottom: corner.includes("s") ? -6 : undefined,
                        cursor: `${corner}-resize`,
                      };
                      return (
                        <div
                          key={corner}
                          className="absolute w-3 h-3 bg-white border border-purple-600 rounded-sm"
                          style={pos}
                          onPointerDown={(e) => startDrag(e, corner)}
                        />
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
