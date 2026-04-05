"use client";

import { Handle, Position, type NodeProps, useReactFlow, useUpdateNodeInternals } from "@xyflow/react";
import { useEffect } from "react";

export default function RouterNode({ id, data }: NodeProps) {
  const { deleteElements } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();

  const outputCount = (data.outputCount as number) || 2;

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, outputCount]);

  // Layout
  const headerH = 32;
  const bodyPadding = 10;
  const outputSpacing = 22;
  const bodyH = bodyPadding * 2 + (outputCount - 1) * outputSpacing;
  const inputY = headerH + bodyH / 2;

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-lg w-[120px] relative">
      {/* Input Handle (left) */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{ top: `${inputY}px` }}
        className="!w-2.5 !h-2.5 !bg-cyan-500 !border-2 !border-cyan-300"
      />

      {/* Output Handles (right) */}
      {Array.from({ length: outputCount }, (_, i) => {
        const y = headerH + bodyPadding + i * outputSpacing;
        return (
          <Handle
            key={`out-${i + 1}`}
            type="source"
            position={Position.Right}
            id={`output-${i + 1}`}
            style={{ top: `${y}px` }}
            className="!w-2.5 !h-2.5 !bg-cyan-500 !border-2 !border-cyan-300"
          />
        );
      })}

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-700">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-cyan-500" />
          <span className="text-xs font-medium text-zinc-200">Router</span>
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

      {/* Body — minimal, just spacing for outputs */}
      <div style={{ height: `${bodyH}px` }} />
    </div>
  );
}
