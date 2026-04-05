"use client";

import { Handle, Position, type NodeProps, useReactFlow } from "@xyflow/react";
import { useCallback } from "react";

export default function PromptNode({ id, data }: NodeProps) {
  const { updateNodeData, deleteElements } = useReactFlow();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(id, { text: e.target.value });
    },
    [id, updateNodeData]
  );

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-lg w-[200px]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-700">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-xs font-medium text-zinc-200">Prompt</span>
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
        <textarea
          className="w-full h-20 bg-zinc-800 border border-zinc-600 rounded-md p-2 text-[11px] text-zinc-200 placeholder-zinc-500 resize-none focus:outline-none focus:border-purple-500 transition-colors nodrag nowheel"
          placeholder="Use the current image as base and keep the exact same face, proportions, expression, lighting and structure..."
          value={(data.text as string) || ""}
          onChange={handleChange}
        />
      </div>

      {/* Footer */}
      <div className="px-2 pb-2">
        <button className="text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors">
          + Add variable
        </button>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-purple-500 !border-2 !border-purple-300"
      />
    </div>
  );
}
