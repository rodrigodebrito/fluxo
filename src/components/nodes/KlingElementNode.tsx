"use client";

import { Handle, Position, type NodeProps, useReactFlow, useStore } from "@xyflow/react";
import { useCallback } from "react";

export default function KlingElementNode({ id, data }: NodeProps) {
  const { updateNodeData, deleteElements } = useReactFlow();
  const description = (data.elementDescription as string) || "";

  // Auto-detectar qual element number este nó é (baseado na conexão com o Kling model)
  const elementNumber = useStore(
    useCallback(
      (state) => {
        // Encontrar a edge que sai deste nó (source = this node)
        const outEdge = state.edges.find(
          (e: { source: string }) => e.source === id
        );
        if (!outEdge) return null;
        // O targetHandle será "element-1", "element-2", etc.
        const handle = (outEdge as { targetHandle?: string }).targetHandle;
        if (handle && handle.startsWith("element-")) {
          return parseInt(handle.replace("element-", ""), 10);
        }
        return null;
      },
      [id]
    )
  );

  // Coletar imagens dos nós conectados
  const connectedImages = useStore(
    useCallback(
      (state) => {
        const imgs: { url: string; name: string }[] = [];
        for (const edge of state.edges) {
          if (edge.target !== id) continue;
          const srcNode = state.nodes.find((n: { id: string }) => n.id === edge.source);
          if (!srcNode) continue;
          if (srcNode.type === "imageInput") {
            const nodeImages = (srcNode.data.images as Array<{ url: string; name: string }>) || [];
            imgs.push(...nodeImages);
          } else if (srcNode.type === "model") {
            const coverUrl = srcNode.data.coverResultUrl as string | null;
            if (coverUrl) imgs.push({ url: coverUrl, name: "Result" });
          }
        }
        return imgs;
      },
      [id]
    )
  );

  const handleDescChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData(id, { elementDescription: e.target.value });
    },
    [id, updateNodeData]
  );

  const mainImage = connectedImages[0] || null;
  const thumbs = connectedImages.slice(1);
  const hasImages = connectedImages.length > 0;
  const headerH = 32;
  const handleStartY = headerH + 16;
  const handleSpacing = 28;
  const elementLabel = elementNumber ? `element${elementNumber}` : "element?";

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-lg w-[240px] relative">
      {/* Input handles */}
      {["image-1", "image-2", "image-3", "image-4"].map((hid, i) => (
        <Handle
          key={hid}
          type="target"
          position={Position.Left}
          id={hid}
          style={{ top: `${handleStartY + i * handleSpacing}px` }}
          className={`!w-2.5 !h-2.5 ${i < 2 ? "!bg-cyan-500 !border-cyan-300" : "!bg-emerald-500 !border-emerald-300"} !border-2`}
        />
      ))}

      {/* Handle labels */}
      {[
        { label: "Frontal Image*", color: "text-cyan-400", w: 85 },
        { label: "Reference Image 1*", color: "text-cyan-400", w: 105 },
        { label: "Reference Image 2", color: "text-emerald-400", w: 102 },
        { label: "Reference Image 3", color: "text-emerald-400", w: 102 },
      ].map((h, i) => (
        <div
          key={`label-${i}`}
          className={`absolute text-[10px] ${h.color} font-medium`}
          style={{ left: `-${h.w}px`, top: `${handleStartY + i * handleSpacing - 6}px` }}
        >
          {h.label}
        </div>
      ))}

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ top: `${handleStartY + handleSpacing}px` }}
        className="!w-2.5 !h-2.5 !bg-rose-500 !border-2 !border-rose-300"
      />
      <div
        className="absolute text-[10px] text-rose-400 font-medium"
        style={{ right: "-50px", top: `${handleStartY + handleSpacing - 6}px` }}
      >
        Element
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-700">
        <div className="flex items-center gap-1.5">
          <span className="text-rose-400 text-[10px]">🔥</span>
          <span className="text-xs font-medium text-zinc-200">Kling Element</span>
          {elementNumber && (
            <span className="text-[9px] text-rose-400 bg-rose-500/10 px-1 py-0.5 rounded">
              @{elementLabel}
            </span>
          )}
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

      {/* Image Preview Area */}
      <div className="p-2">
        {hasImages ? (
          <div className="space-y-1.5">
            {mainImage && (
              <img
                src={mainImage.url}
                alt={mainImage.name}
                className="w-full h-[160px] object-cover rounded-md"
              />
            )}
            {thumbs.length > 0 && (
              <div className="flex gap-1">
                {thumbs.map((img, i) => (
                  <img
                    key={i}
                    src={img.url}
                    alt={img.name}
                    className="flex-1 h-[55px] object-cover rounded-sm"
                    style={{ maxWidth: `${100 / thumbs.length}%` }}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[120px] border-2 border-dashed border-zinc-600 rounded-md">
            <svg className="w-6 h-6 text-zinc-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            <span className="text-[10px] text-zinc-400">Connect 2-4 images</span>
          </div>
        )}
      </div>

      {/* Description */}
      <div className="px-2 pb-2 space-y-1.5">
        <div>
          <label className="text-[9px] text-zinc-500 block mb-0.5">Description</label>
          <input
            type="text"
            value={description}
            onChange={handleDescChange}
            placeholder="e.g. a woman with brown hair"
            className="w-full bg-zinc-800 border border-zinc-600 rounded px-1.5 py-0.5 text-[11px] text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-rose-500 nodrag"
          />
        </div>
        <p className="text-[9px] text-zinc-500 leading-tight">
          Use <span className="text-rose-400 font-medium">@{elementLabel}</span> in prompt
        </p>
      </div>
    </div>
  );
}
