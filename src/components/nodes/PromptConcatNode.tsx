"use client";

import { Handle, Position, type NodeProps, useReactFlow, useUpdateNodeInternals } from "@xyflow/react";
import { useEffect } from "react";

export default function PromptConcatNode({ id, data }: NodeProps) {
  const { updateNodeData, deleteElements } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();

  const inputCount = (data.inputCount as number) || 2;
  const additionalText = (data.additionalText as string) || "";

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, inputCount]);

  // Layout
  const headerH = 32;
  const inputSpacing = 26;
  const inputsStartY = headerH + 20;
  const outputY = inputsStartY;

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-lg w-[260px] relative">
      {/* Input Handles (left) */}
      {Array.from({ length: inputCount }, (_, i) => {
        const y = inputsStartY + i * inputSpacing;
        return (
          <Handle
            key={`in-${i + 1}`}
            type="target"
            position={Position.Left}
            id={`prompt-${i + 1}`}
            style={{ top: `${y}px` }}
            className="!w-2.5 !h-2.5 !bg-purple-500 !border-2 !border-purple-300"
          />
        );
      })}

      {/* Input Labels */}
      {Array.from({ length: inputCount }, (_, i) => {
        const y = inputsStartY + i * inputSpacing;
        return (
          <div
            key={`label-${i}`}
            className="absolute text-[10px] text-purple-400 font-medium"
            style={{ left: "-56px", top: `${y - 6}px` }}
          >
            Prompt {i + 1}
          </div>
        );
      })}

      {/* Output Handle (right) */}
      <Handle
        type="source"
        position={Position.Right}
        id="combined"
        style={{ top: `${outputY}px` }}
        className="!w-2.5 !h-2.5 !bg-purple-500 !border-2 !border-purple-300"
      />
      <div
        className="absolute text-[10px] text-purple-400 font-medium"
        style={{ right: "-54px", top: `${outputY - 6}px` }}
      >
        Combined
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-700">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-xs font-medium text-zinc-200">Prompt Concatenator</span>
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
        <p className="text-[10px] text-zinc-500 mb-2">Connect multiple prompts to one output prompt.</p>
        <textarea
          value={additionalText}
          onChange={(e) => updateNodeData(id, { additionalText: e.target.value })}
          placeholder="Write additional text"
          className="w-full min-h-[50px] bg-zinc-800 border border-zinc-600 rounded-md p-2 text-[11px] text-zinc-300 placeholder-zinc-600 resize-y nodrag nowheel focus:outline-none focus:border-purple-500"
        />

        <button
          onClick={() => updateNodeData(id, { inputCount: inputCount + 1 })}
          className="text-[10px] text-purple-400 hover:text-purple-300 mt-1 nodrag"
        >
          + Add another text input
        </button>
      </div>
    </div>
  );
}
