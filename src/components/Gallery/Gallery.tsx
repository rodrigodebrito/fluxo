"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

interface GalleryProps {
  images: string[];
  initialIndex: number;
  modelName: string;
  isVideo?: boolean;
  onClose: () => void;
}

export default function Gallery({ images, initialIndex, modelName, isVideo, onClose }: GalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [copied, setCopied] = useState(false);
  const safeIndex = Math.min(currentIndex, Math.max(images.length - 1, 0));

  const prev = useCallback(() => {
    setCurrentIndex((i) => (i > 0 ? i - 1 : images.length - 1));
  }, [images.length]);

  const next = useCallback(() => {
    setCurrentIndex((i) => (i < images.length - 1 ? i + 1 : 0));
  }, [images.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, prev, next]);

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-zinc-950/95 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <span className="text-sm font-medium text-zinc-200">{modelName}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Download */}
          <a
            href={images[safeIndex]}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
            title="Download"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </a>
          {/* Copy link */}
          <button
            onClick={() => {
              navigator.clipboard.writeText(images[safeIndex]);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className={`h-8 flex items-center justify-center rounded-lg transition-colors px-2 gap-1.5 ${
              copied
                ? "bg-green-600/80 text-white"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white"
            }`}
            title="Copiar link"
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs font-medium">Copiado!</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span className="text-xs font-medium">Copiar link</span>
              </>
            )}
          </button>
          {/* Counter */}
          <div className="px-3 py-1.5 bg-zinc-800 rounded-lg text-xs font-medium text-zinc-300">
            {safeIndex + 1} / {images.length}
          </div>
        </div>
      </div>

      {/* Main image area */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden min-h-0">
        {/* Previous */}
        {images.length > 1 && (
          <button
            onClick={prev}
            className="absolute left-4 z-10 w-10 h-10 flex items-center justify-center bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Media */}
        {isVideo ? (
          <video
            key={safeIndex}
            src={images[safeIndex]}
            className="max-w-[90%] max-h-[calc(100vh-140px)] object-contain rounded-lg"
            controls
            autoPlay
            loop
          />
        ) : (
          <img
            src={images[safeIndex]}
            alt={`Resultado ${safeIndex + 1}`}
            className="max-w-[90%] max-h-[calc(100vh-140px)] object-contain rounded-lg"
          />
        )}

        {/* Next */}
        {images.length > 1 && (
          <button
            onClick={next}
            className="absolute right-20 z-10 w-10 h-10 flex items-center justify-center bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Thumbnails strip (right side) */}
        {images.length > 1 && (
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-zinc-900/80 border-l border-zinc-800 overflow-y-auto flex flex-col gap-1 p-1">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`shrink-0 w-14 h-14 rounded overflow-hidden border-2 transition-colors ${
                  i === safeIndex ? "border-purple-500" : "border-transparent hover:border-zinc-600"
                }`}
              >
                {isVideo ? (
                  <video src={img} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={img} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
