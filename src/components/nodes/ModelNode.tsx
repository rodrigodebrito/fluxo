"use client";

import { Handle, Position, type NodeProps, useReactFlow, useUpdateNodeInternals } from "@xyflow/react";
import { AVAILABLE_MODELS } from "@/types/nodes";
import { useCallback, useState, useEffect } from "react";
import Gallery from "@/components/Gallery/Gallery";

export default function ModelNode({ id, data }: NodeProps) {
  const { updateNodeData, deleteElements } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  const model = (data.model as string) || "nano-banana-pro";
  const isRunning = (data.isRunning as boolean) || false;
  const results = (data.results as string[]) || [];
  const imageInputCount = (data.imageInputCount as number) || 1;
  const selectedModel = AVAILABLE_MODELS.find((m) => m.id === model);
  const isVideo = selectedModel?.type === "video";
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);

  // Para Veo3/Seedance/Kling, handles vêm do modelo. Para nano-banana, são dinâmicos
  const modelHandles = selectedModel?.handles.filter((h) => h.id !== "prompt") || [];
  const hasPrompt = selectedModel ? selectedModel.handles.some((h) => h.id === "prompt") : true;
  const useFixedHandles = modelHandles.length > 0 && model !== "nano-banana-pro" && model !== "flux-2-edit";
  // Modelos que só têm Prompt (sem handles de imagem definidos) e não são nano-banana/flux-edit: 0 image handles
  const hasDynamicImages = model === "nano-banana-pro" || model === "flux-2-edit";
  const imageHandleCount = useFixedHandles ? modelHandles.length : hasDynamicImages ? imageInputCount : 0;
  const hasDynamicElements = selectedModel?.dynamicElements ?? false;
  const elementCount = (data.elementCount as number) || 0;
  const hasDynamicRefs = selectedModel?.dynamicReferences ?? false;
  const refCount = (data.refCount as number) || 0;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, imageInputCount, model, elementCount, refCount]);

  useEffect(() => {
    if (results.length > 0) setCurrentIndex(results.length - 1);
  }, [results.length]);

  const safeIndex = Math.min(currentIndex, Math.max(results.length - 1, 0));

  useEffect(() => {
    const coverUrl = results.length > 0 ? results[safeIndex] : null;
    updateNodeData(id, { coverResultUrl: coverUrl });
  }, [id, safeIndex, results, updateNodeData]);

  const prev = useCallback(() => {
    setCurrentIndex((i) => (i > 0 ? i - 1 : results.length - 1));
  }, [results.length]);

  const next = useCallback(() => {
    setCurrentIndex((i) => (i < results.length - 1 ? i + 1 : 0));
  }, [results.length]);

  const handleRun = useCallback(() => {
    window.dispatchEvent(new CustomEvent("fluxo-run-pipeline", { detail: { modelNodeId: id } }));
  }, [id]);

  const handleCancel = useCallback(() => {
    window.dispatchEvent(new CustomEvent("fluxo-cancel-pipeline", { detail: { modelNodeId: id } }));
  }, [id]);

  const addImageInput = useCallback(() => {
    updateNodeData(id, { imageInputCount: imageInputCount + 1 });
  }, [id, imageInputCount, updateNodeData]);

  const headerHeight = 32;
  const startY = headerHeight + 22;
  const spacing = 28;

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-lg w-[240px] relative">
      {/* Prompt Handle */}
      {hasPrompt && (
        <Handle
          type="target"
          position={Position.Left}
          id="prompt"
          style={{ top: "16px" }}
          className="!w-2.5 !h-2.5 !bg-purple-500 !border-2 !border-purple-300"
        />
      )}

      {/* Image Handles */}
      {useFixedHandles
        ? modelHandles.map((h, i) => (
            <Handle
              key={h.id}
              type="target"
              position={Position.Left}
              id={h.id}
              style={{ top: `${startY + i * spacing}px` }}
              className={`!w-2.5 !h-2.5 ${h.id === "negative-prompt" ? "!bg-pink-500 !border-pink-300" : h.id.startsWith("audio") ? "!bg-orange-500 !border-orange-300" : h.required ? "!bg-cyan-500 !border-cyan-300" : "!bg-emerald-500 !border-emerald-300"} !border-2`}
            />
          ))
        : hasDynamicImages && Array.from({ length: imageInputCount }, (_, i) => (
            <Handle
              key={`image-${i + 1}`}
              type="target"
              position={Position.Left}
              id={`image-${i + 1}`}
              style={{ top: `${startY + i * spacing}px` }}
              className="!w-2.5 !h-2.5 !bg-cyan-500 !border-2 !border-cyan-300"
            />
          ))}

      {/* Element Handles (Kling) */}
      {hasDynamicElements && Array.from({ length: elementCount }, (_, i) => (
        <Handle
          key={`element-${i + 1}`}
          type="target"
          position={Position.Left}
          id={`element-${i + 1}`}
          style={{ top: `${startY + (imageHandleCount + i) * spacing}px` }}
          className="!w-2.5 !h-2.5 !bg-rose-500 !border-2 !border-rose-300"
        />
      ))}

      {/* Reference Handles (Seedance) */}
      {hasDynamicRefs && Array.from({ length: refCount }, (_, i) => (
        <Handle
          key={`ref-${i + 1}`}
          type="target"
          position={Position.Left}
          id={`ref-${i + 1}`}
          style={{ top: `${startY + (imageHandleCount + i) * spacing}px` }}
          className="!w-2.5 !h-2.5 !bg-amber-500 !border-2 !border-amber-300"
        />
      ))}

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ top: `${startY}px` }}
        className="!w-2.5 !h-2.5 !bg-green-500 !border-2 !border-green-300"
      />

      {/* Labels */}
      {hasPrompt && (
        <div className="absolute text-[10px] text-purple-400 font-medium" style={{ left: "-50px", top: "10px" }}>
          Prompt*
        </div>
      )}
      {useFixedHandles
        ? modelHandles.map((h, i) => (
            <div
              key={`label-${h.id}`}
              className={`absolute text-[10px] font-medium ${h.id === "negative-prompt" ? "text-pink-400" : h.required ? "text-cyan-400" : "text-emerald-400"}`}
              style={{ left: `-${h.label.length * 5 + 10}px`, top: `${startY + i * spacing - 6}px` }}
            >
              {h.label}
            </div>
          ))
        : hasDynamicImages && Array.from({ length: imageInputCount }, (_, i) => (
            <div
              key={`label-${i}`}
              className="absolute text-[10px] text-cyan-400 font-medium"
              style={{ left: "-55px", top: `${startY + i * spacing - 6}px` }}
            >
              Image {i + 1}
            </div>
          ))}
      {/* Element labels */}
      {hasDynamicElements && Array.from({ length: elementCount }, (_, i) => (
        <div
          key={`elabel-${i}`}
          className="absolute text-[10px] text-rose-400 font-medium"
          style={{ left: "-60px", top: `${startY + (imageHandleCount + i) * spacing - 6}px` }}
        >
          Element {i + 1}
        </div>
      ))}
      {/* Reference labels */}
      {hasDynamicRefs && Array.from({ length: refCount }, (_, i) => (
        <div
          key={`rlabel-${i}`}
          className="absolute text-[10px] text-amber-400 font-medium"
          style={{ left: "-55px", top: `${startY + (imageHandleCount + i) * spacing - 6}px` }}
        >
          @Image{i + 1}
        </div>
      ))}
      <div className="absolute text-[10px] text-green-400 font-medium" style={{ right: "-42px", top: `${startY - 6}px` }}>
        {isVideo ? "Video" : "Result"}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-700">
        <div className="flex items-center gap-1.5">
          {isVideo ? (
            <span className="text-red-400 text-[10px]">G</span>
          ) : (
            <span className="text-purple-400 text-[10px]">✦</span>
          )}
          <span className="text-xs font-medium text-zinc-200 truncate">
            {selectedModel?.name || "Modelo"}
          </span>
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

      {/* Result area */}
      <div className="p-2" onClick={(e) => e.stopPropagation()}>
        {isRunning ? (
          <div className="flex flex-col items-center justify-center h-[150px] rounded-md bg-zinc-800">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] text-zinc-400 mt-2">Gerando{isVideo ? " video" : ""}...</span>
            <button
              onClick={handleCancel}
              className="mt-2 px-3 py-1 rounded-md text-[10px] font-medium bg-zinc-700 border border-zinc-600 text-red-400 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/50 transition-colors nodrag"
            >
              Cancelar
            </button>
          </div>
        ) : results.length > 0 ? (
          <div
            className="relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {isVideo ? (
              <video
                src={results[safeIndex]}
                className="w-full rounded-md max-h-[180px] object-contain bg-black"
                controls
                muted
                loop
                onLoadedMetadata={(e) => {
                  const dur = Math.round((e.target as HTMLVideoElement).duration);
                  if (dur > 0) updateNodeData(id, { videoDuration: dur });
                }}
              />
            ) : (
              <img
                src={results[safeIndex]}
                alt={`Resultado ${safeIndex + 1}`}
                className="w-full rounded-md max-h-[180px] object-cover"
              />
            )}

            {isHovered && (
              <>
                <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-2 py-1.5 bg-gradient-to-b from-black/60 to-transparent rounded-t-md">
                  <span className="text-white/90 text-[10px] font-medium">{safeIndex + 1} / {results.length}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setGalleryOpen(true)}
                      className="flex items-center px-1.5 py-0.5 bg-zinc-700/80 hover:bg-zinc-600 text-white/90 text-[10px] rounded nodrag transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                      </svg>
                    </button>
                    <a href={results[safeIndex]} download target="_blank" rel="noopener noreferrer" className="flex items-center px-1.5 py-0.5 bg-zinc-700/80 hover:bg-zinc-600 text-white/90 rounded nodrag transition-colors">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </a>
                    <button
                      onClick={() => { updateNodeData(id, { results: [], coverResultUrl: null }); setCurrentIndex(0); }}
                      className="flex items-center px-1.5 py-0.5 bg-zinc-700/80 hover:bg-red-600/80 text-white/90 rounded nodrag transition-colors"
                      title="Limpar resultados"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                {results.length > 1 && (
                  <>
                    <button onClick={prev} className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center bg-black/50 hover:bg-black/70 text-white rounded-full text-[10px] nodrag">&lt;</button>
                    <button onClick={next} className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center bg-black/50 hover:bg-black/70 text-white rounded-full text-[10px] nodrag">&gt;</button>
                  </>
                )}
              </>
            )}
          </div>
        ) : (
          <div
            className="h-[150px] rounded-md border border-zinc-700"
            style={{
              backgroundImage: "linear-gradient(45deg, #1a1a1e 25%, transparent 25%), linear-gradient(-45deg, #1a1a1e 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1a1a1e 75%), linear-gradient(-45deg, transparent 75%, #1a1a1e 75%)",
              backgroundSize: "16px 16px",
              backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
              backgroundColor: "#131316",
            }}
          />
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-2 pb-2 gap-1">
        {hasDynamicImages && !useFixedHandles && !hasDynamicElements && (
          <button
            onClick={addImageInput}
            className="text-[10px] text-cyan-400 cursor-pointer hover:text-cyan-300 nodrag shrink-0"
          >
            + Image input
          </button>
        )}
        {hasDynamicElements && elementCount < 3 && (
          <button
            onClick={() => updateNodeData(id, { elementCount: elementCount + 1 })}
            className="text-[10px] text-rose-400 cursor-pointer hover:text-rose-300 nodrag shrink-0"
          >
            + Add element
          </button>
        )}
        {hasDynamicRefs && refCount < 9 && (
          <button
            onClick={() => updateNodeData(id, { refCount: refCount + 1 })}
            className="text-[10px] text-amber-400 cursor-pointer hover:text-amber-300 nodrag shrink-0"
          >
            + Add reference
          </button>
        )}
        <div className={(!useFixedHandles || hasDynamicElements || hasDynamicRefs) ? "" : "flex-1"} />
        {isRunning ? (
          <button
            onClick={handleCancel}
            className="px-2 py-1 rounded-md text-[10px] font-medium transition-colors nodrag shrink-0 bg-zinc-800 border border-red-500/50 text-red-400 hover:bg-red-500/20 hover:text-red-300"
          >
            ✕ Cancel
          </button>
        ) : (
          <button
            onClick={handleRun}
            className="px-2 py-1 rounded-md text-[10px] font-medium transition-colors nodrag shrink-0 bg-zinc-800 border border-zinc-600 text-zinc-200 hover:bg-zinc-600 hover:text-white"
          >
            → Run Model
          </button>
        )}
      </div>

      {/* Gallery fullscreen */}
      {galleryOpen && results.length > 0 && (
        <Gallery
          images={results}
          initialIndex={safeIndex}
          modelName={selectedModel?.name || "Modelo"}
          isVideo={isVideo}
          onClose={() => setGalleryOpen(false)}
        />
      )}
    </div>
  );
}
