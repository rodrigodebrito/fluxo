"use client";

import { Handle, Position, type NodeProps, useReactFlow, useStore, useUpdateNodeInternals } from "@xyflow/react";
import { useCallback, useState, useEffect } from "react";

// Pre-load a video from blob and return ready-to-play element
async function preloadVideo(blob: Blob): Promise<HTMLVideoElement> {
  const url = URL.createObjectURL(blob);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;

  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve();
    video.onerror = () => reject(new Error("Falha ao carregar video"));
  });

  // Seek to start and wait
  video.currentTime = 0;
  await new Promise<void>((r) => { video.onseeked = () => r(); });

  return video;
}

// Play a pre-loaded video on canvas
async function playVideoToCanvas(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
): Promise<void> {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  // Draw first frame before playing to avoid any black flash
  ctx.drawImage(video, 0, 0);

  await video.play();

  await new Promise<void>((resolve) => {
    let animId: number;
    const draw = () => {
      if (video.ended) {
        // Draw the final frame one last time to keep it on canvas
        ctx.drawImage(video, 0, 0);
        resolve();
        return;
      }
      ctx.drawImage(video, 0, 0);
      animId = requestAnimationFrame(draw);
    };
    video.onended = () => {
      cancelAnimationFrame(animId);
      ctx.drawImage(video, 0, 0);
      resolve();
    };
    draw();
  });

  video.pause();
}

export default function VideoConcatNode({ id, data }: NodeProps) {
  const { updateNodeData, deleteElements } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  const inputCount = (data.inputCount as number) || 2;
  const resultUrl = (data.resultUrl as string) || "";
  const [isConcatenating, setIsConcatenating] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, inputCount]);

  // Collect video URLs from connected source nodes
  const connectedVideos = useStore(
    useCallback(
      (state) => {
        const videos: { handle: string; url: string }[] = [];
        for (let i = 1; i <= inputCount; i++) {
          const handleId = `video-${i}`;
          const edge = state.edges.find(
            (e) => e.target === id && e.targetHandle === handleId
          );
          if (!edge) continue;
          const sourceNode = state.nodes.find((n) => n.id === edge.source);
          if (!sourceNode) continue;

          let url = "";
          if (sourceNode.type === "model") {
            const results = (sourceNode.data.results as string[]) || [];
            url = results.length > 0 ? results[results.length - 1] : "";
          } else if (sourceNode.type === "videoConcat") {
            url = (sourceNode.data.resultUrl as string) || "";
          }
          if (url) videos.push({ handle: handleId, url });
        }
        return videos;
      },
      [id, inputCount]
    )
  );

  const addInput = useCallback(() => {
    updateNodeData(id, { inputCount: inputCount + 1 });
  }, [id, inputCount, updateNodeData]);

  const removeInput = useCallback(() => {
    if (inputCount > 2) {
      updateNodeData(id, { inputCount: inputCount - 1 });
    }
  }, [id, inputCount, updateNodeData]);

  const concatenate = useCallback(async () => {
    if (connectedVideos.length < 2) {
      setError("Conecte pelo menos 2 videos");
      return;
    }

    setIsConcatenating(true);
    setProgress("Baixando videos...");
    setError(null);

    try {
      // Download and pre-load all videos
      const videos: HTMLVideoElement[] = [];
      for (let i = 0; i < connectedVideos.length; i++) {
        setProgress(`Baixando video ${i + 1}/${connectedVideos.length}...`);
        const resp = await fetch(connectedVideos[i].url);
        const blob = await resp.blob();
        setProgress(`Carregando video ${i + 1}/${connectedVideos.length}...`);
        videos.push(await preloadVideo(blob));
      }

      // Setup canvas with dimensions from first video
      setProgress("Preparando...");
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context indisponivel");
      canvas.width = videos[0].videoWidth;
      canvas.height = videos[0].videoHeight;

      // Draw first frame before starting recorder
      ctx.drawImage(videos[0], 0, 0);

      // Start recording
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm",
        videoBitsPerSecond: 8_000_000,
      });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.start();

      // Play each pre-loaded video sequentially (no loading gap between them)
      for (let i = 0; i < videos.length; i++) {
        setProgress(`Processando video ${i + 1}/${videos.length}...`);
        await playVideoToCanvas(videos[i], canvas, ctx);
      }

      // Stop recording and get result
      const resultBlob = await new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType }));
        recorder.stop();
      });

      // Cleanup video elements
      for (const v of videos) {
        const src = v.src;
        v.src = "";
        if (src.startsWith("blob:")) URL.revokeObjectURL(src);
      }

      // Upload for permanent URL
      setProgress("Fazendo upload...");
      const formData = new FormData();
      formData.append("files", resultBlob, "concatenated.webm");
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const text = await response.text();
      let json;
      try { json = JSON.parse(text); } catch { json = null; }

      const permanentUrl = json?.urls?.[0];
      if (permanentUrl) {
        updateNodeData(id, { resultUrl: permanentUrl });
      } else {
        const blobUrl = URL.createObjectURL(resultBlob);
        updateNodeData(id, { resultUrl: blobUrl });
      }

      setProgress("");
    } catch (err) {
      console.error("Concatenation failed:", err);
      setError(err instanceof Error ? err.message : "Erro ao concatenar");
    } finally {
      setIsConcatenating(false);
    }
  }, [connectedVideos, id, updateNodeData]);

  const headerHeight = 32;
  const startY = headerHeight + 18;
  const spacing = 24;

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-lg w-[220px] relative">
      {/* Video Input Handles */}
      {Array.from({ length: inputCount }, (_, i) => (
        <Handle
          key={`video-${i + 1}`}
          type="target"
          position={Position.Left}
          id={`video-${i + 1}`}
          style={{ top: `${startY + i * spacing}px` }}
          className="!w-2.5 !h-2.5 !bg-green-500 !border-2 !border-green-300"
        />
      ))}

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ top: `${startY}px` }}
        className="!w-2.5 !h-2.5 !bg-orange-500 !border-2 !border-orange-300"
      />

      {/* Input Labels */}
      {Array.from({ length: inputCount }, (_, i) => (
        <div
          key={`label-${i}`}
          className="absolute text-[10px] text-green-400 font-medium"
          style={{ left: "-48px", top: `${startY + i * spacing - 6}px` }}
        >
          Video {i + 1}
        </div>
      ))}
      <div
        className="absolute text-[10px] text-orange-400 font-medium"
        style={{ right: "-38px", top: `${startY - 6}px` }}
      >
        Result
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-700">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-orange-500" />
          <span className="text-xs font-medium text-zinc-200">Video Concat</span>
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
            title="Deletar"
          >
            ×
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-2">
        {isConcatenating ? (
          <div className="flex flex-col items-center justify-center h-[100px] rounded-md bg-zinc-800">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] text-zinc-400 mt-2">{progress}</span>
          </div>
        ) : resultUrl ? (
          <div className="relative group">
            <video
              src={resultUrl}
              className="w-full h-[100px] object-cover rounded-md bg-black"
              controls
              muted
            />
            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <a
                href={resultUrl}
                download="concatenated.webm"
                target="_blank"
                rel="noopener noreferrer"
                className="px-1.5 py-0.5 bg-zinc-800/90 text-white/90 text-[10px] rounded nodrag hover:bg-zinc-700"
              >
                ↓
              </a>
              <button
                onClick={() => updateNodeData(id, { resultUrl: "" })}
                className="px-1.5 py-0.5 bg-zinc-800/90 text-red-400 text-[10px] rounded nodrag hover:bg-red-600/30"
              >
                ×
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[100px] border-2 border-dashed border-zinc-700 rounded-md">
            <svg className="w-6 h-6 text-zinc-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5" />
            </svg>
            <span className="text-[9px] text-zinc-500 text-center px-2">
              {connectedVideos.length > 0
                ? `${connectedVideos.length} video${connectedVideos.length > 1 ? "s" : ""} conectado${connectedVideos.length > 1 ? "s" : ""}`
                : "Conecte videos"}
            </span>
          </div>
        )}

        {error && (
          <div className="mt-1 text-[9px] text-red-400 text-center">{error}</div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-2 pb-2 gap-1">
        <div className="flex items-center gap-1">
          <button
            onClick={addInput}
            className="text-[10px] text-green-400 hover:text-green-300 nodrag"
          >
            + Video
          </button>
          {inputCount > 2 && (
            <button
              onClick={removeInput}
              className="text-[10px] text-zinc-500 hover:text-red-400 nodrag"
            >
              − Video
            </button>
          )}
        </div>
        <button
          onClick={concatenate}
          disabled={isConcatenating || connectedVideos.length < 2}
          className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors nodrag shrink-0 ${
            isConcatenating || connectedVideos.length < 2
              ? "bg-zinc-800 border border-zinc-700 text-zinc-500 cursor-not-allowed"
              : "bg-zinc-800 border border-zinc-600 text-zinc-200 hover:bg-zinc-600 hover:text-white"
          }`}
        >
          → Concatenar
        </button>
      </div>
    </div>
  );
}
