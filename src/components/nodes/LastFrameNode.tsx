"use client";

import { Handle, Position, type NodeProps, useReactFlow, useStore } from "@xyflow/react";
import { useCallback, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export default function LastFrameNode({ id, data }: NodeProps) {
  const { updateNodeData, deleteElements } = useReactFlow();
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const frameUrl = (data.frameUrl as string) || "";
  const sourceVideoUrl = (data.sourceVideoUrl as string) || "";

  // Collect video URL from connected source node via useStore
  const connectedVideoUrl = useStore(
    useCallback(
      (state) => {
        const edge = state.edges.find(
          (e) => e.target === id && (e.targetHandle === "video-in" || !e.targetHandle)
        );
        if (!edge) return "";
        const sourceNode = state.nodes.find((n) => n.id === edge.source);
        if (!sourceNode) return "";

        // ModelNode: get the latest result
        if (sourceNode.type === "model") {
          const results = (sourceNode.data.results as string[]) || [];
          return results.length > 0 ? results[results.length - 1] : "";
        }
        // OutputNode
        if (sourceNode.type === "output") {
          return (sourceNode.data.resultUrl as string) || "";
        }
        return "";
      },
      [id]
    )
  );

  // Auto-extract when a new video URL comes in
  useEffect(() => {
    if (connectedVideoUrl && connectedVideoUrl !== sourceVideoUrl) {
      extractLastFrame(connectedVideoUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedVideoUrl]);

  const extractLastFrame = useCallback(
    async (videoUrl: string) => {
      if (!videoUrl) return;
      setIsExtracting(true);
      setError(null);

      try {
        // Fetch video as blob to avoid CORS issues
        const videoResponse = await fetch(videoUrl);
        const videoBlob = await videoResponse.blob();
        const blobUrl = URL.createObjectURL(videoBlob);

        const video = document.createElement("video");
        video.muted = true;
        video.preload = "auto";

        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => resolve();
          video.onerror = () => reject(new Error("Falha ao carregar vídeo"));
          video.src = blobUrl;
        });

        // Seek to the last frame (duration - small offset)
        const targetTime = Math.max(0, video.duration - 0.05);
        await new Promise<void>((resolve, reject) => {
          video.onseeked = () => resolve();
          video.onerror = () => reject(new Error("Falha ao buscar frame"));
          video.currentTime = targetTime;
        });

        // Draw frame to canvas
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context indisponível");
        ctx.drawImage(video, 0, 0);

        // Cleanup blob URL
        URL.revokeObjectURL(blobUrl);

        // Convert to blob and upload for permanent URL
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error("Falha ao criar blob"))),
            "image/png"
          );
        });

        // Upload to get permanent URL
        const formData = new FormData();
        formData.append("files", blob, "last-frame.png");
        const response = await fetch("/api/upload", { method: "POST", body: formData });
        const text = await response.text();
        let json;
        try {
          json = JSON.parse(text);
        } catch {
          json = null;
        }

        const permanentUrl = json?.urls?.[0];
        if (permanentUrl) {
          updateNodeData(id, {
            frameUrl: permanentUrl,
            sourceVideoUrl: videoUrl,
            images: [{ url: permanentUrl, name: "last-frame.png" }],
          });
        } else {
          // Fallback: use blob URL
          const blobUrl = URL.createObjectURL(blob);
          updateNodeData(id, {
            frameUrl: blobUrl,
            sourceVideoUrl: videoUrl,
            images: [{ url: blobUrl, name: "last-frame.png" }],
          });
        }
      } catch (err) {
        console.error("Last frame extraction failed:", err);
        setError(err instanceof Error ? err.message : "Erro desconhecido");
      } finally {
        setIsExtracting(false);
      }
    },
    [id, updateNodeData]
  );

  const [fullscreen, setFullscreen] = useState(false);

  const handleManualExtract = useCallback(() => {
    if (connectedVideoUrl) {
      extractLastFrame(connectedVideoUrl);
    }
  }, [connectedVideoUrl, extractLastFrame]);

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-lg w-[180px]">
      {/* Input Handle (video) */}
      <Handle
        type="target"
        position={Position.Left}
        id="video-in"
        className="!w-2.5 !h-2.5 !bg-green-500 !border-2 !border-green-300"
      />

      {/* Output Handle (image) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-cyan-500 !border-2 !border-cyan-300"
      />

      {/* Labels */}
      <div
        className="absolute text-[10px] text-green-400 font-medium"
        style={{ left: "-38px", top: "50%" }}
      >
        Video
      </div>
      <div
        className="absolute text-[10px] text-cyan-400 font-medium"
        style={{ right: "-38px", top: "50%" }}
      >
        Frame
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-700">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-xs font-medium text-zinc-200">Last Frame</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("fluxo-duplicate-node", { detail: { nodeId: id } }))}
            className="text-zinc-500 hover:text-blue-400 text-[10px] leading-none nodrag"
            title="Duplicar"
          >
            ⧉
          </button>
          <button
            onClick={() => deleteElements({ nodes: [{ id }] })}
            className="text-zinc-500 hover:text-red-400 text-sm leading-none nodrag"
            title="Deletar nó"
          >
            ×
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-2">
        {isExtracting ? (
          <div className="flex flex-col items-center justify-center h-[100px] rounded-md bg-zinc-800">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] text-zinc-400 mt-2">Extraindo frame...</span>
          </div>
        ) : frameUrl ? (
          <div className="relative group">
            <img
              src={frameUrl}
              alt="Last frame"
              className="w-full h-[100px] object-cover rounded-md cursor-pointer"
              onClick={() => setFullscreen(true)}
            />
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-1.5 py-1 bg-gradient-to-b from-black/60 to-transparent rounded-t-md opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setFullscreen(true)}
                className="flex items-center px-1.5 py-0.5 bg-zinc-700/80 hover:bg-zinc-600 text-white/90 text-[10px] rounded nodrag transition-colors"
                title="Ver fullscreen"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                </svg>
              </button>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleManualExtract}
                  className="flex items-center px-1.5 py-0.5 bg-zinc-700/80 hover:bg-zinc-600 text-white/90 text-[10px] rounded nodrag transition-colors"
                  title="Re-extrair"
                >
                  ↻
                </button>
                <a
                  href={frameUrl}
                  download="last-frame.png"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center px-1.5 py-0.5 bg-zinc-700/80 hover:bg-zinc-600 text-white/90 rounded nodrag transition-colors"
                  title="Download"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[100px] border-2 border-dashed border-zinc-700 rounded-md">
            <svg
              className="w-6 h-6 text-zinc-600 mb-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z"
              />
            </svg>
            <span className="text-[9px] text-zinc-500 text-center px-2">
              {connectedVideoUrl ? "Clique para extrair" : "Conecte um vídeo"}
            </span>
            {connectedVideoUrl && (
              <button
                onClick={handleManualExtract}
                className="mt-1 px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[9px] rounded nodrag hover:bg-amber-500/30"
              >
                Extrair frame
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="mt-1 text-[9px] text-red-400 text-center">{error}</div>
        )}
      </div>

      {/* Hidden elements for processing */}
      <video ref={videoRef} className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Fullscreen modal */}
      {fullscreen && frameUrl && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center"
          onClick={() => setFullscreen(false)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={frameUrl}
              alt="Last frame"
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            />
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <a
                href={frameUrl}
                download="last-frame.png"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-zinc-800/90 hover:bg-zinc-700 text-white text-xs rounded-lg transition-colors"
              >
                ↓ Download
              </a>
              <button
                onClick={() => setFullscreen(false)}
                className="px-3 py-1.5 bg-zinc-800/90 hover:bg-zinc-700 text-white text-xs rounded-lg transition-colors"
              >
                ✕ Fechar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
