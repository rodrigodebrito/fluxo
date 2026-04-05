"use client";

import { Handle, Position, type NodeProps, useReactFlow, useUpdateNodeInternals } from "@xyflow/react";
import { useCallback, useEffect } from "react";

export default function RouterNode({ id, data }: NodeProps) {
  const { updateNodeData, deleteElements } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();

  const outputCount = (data.outputCount as number) || 3;

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, outputCount]);

  const addOutput = useCallback(() => {
    if (outputCount < 10) {
      updateNodeData(id, { outputCount: outputCount + 1 });
    }
  }, [id, outputCount, updateNodeData]);

  const removeOutput = useCallback(() => {
    if (outputCount > 2) {
      updateNodeData(id, { outputCount: outputCount - 1 });
    }
  }, [id, outputCount, updateNodeData]);

  // Layout
  const headerH = 32;
  const bodyPadding = 12;
  const outputSpacing = 24;
  const bodyH = bodyPadding * 2 + (outputCount - 1) * outputSpacing;
  const inputY = headerH + bodyH / 2;

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-lg w-[160px] relative">
      {/* Input Handle (left) */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{ top: `${inputY}px` }}
        className="!w-2.5 !h-2.5 !bg-cyan-500 !border-2 !border-cyan-300"
      />
      <div
        className="absolute text-[10px] text-cyan-400 font-medium"
        style={{ left: "-32px", top: `${inputY - 6}px` }}
      >
        Input
      </div>

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

      {/* Output Labels */}
      {Array.from({ length: outputCount }, (_, i) => {
        const y = headerH + bodyPadding + i * outputSpacing;
        return (
          <div
            key={`label-${i}`}
            className="absolute text-[10px] text-cyan-400 font-medium"
            style={{ right: "-18px", top: `${y - 6}px` }}
          >
            {i + 1}
          </div>
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

      {/* Body */}
      <div className="flex items-center justify-center gap-2 px-3 py-2">
        <button
          onClick={removeOutput}
          disabled={outputCount <= 2}
          className="text-[10px] text-zinc-500 hover:text-red-400 disabled:text-zinc-700 disabled:cursor-not-allowed nodrag"
          title="Remover saida"
        >
          −
        </button>
        <span className="text-[10px] text-zinc-400">{outputCount} outputs</span>
        <button
          onClick={addOutput}
          disabled={outputCount >= 10}
          className="text-[10px] text-cyan-400 hover:text-cyan-300 disabled:text-zinc-700 disabled:cursor-not-allowed nodrag"
          title="Adicionar saida"
        >
          +
        </button>
      </div>
    </div>
  );
}
