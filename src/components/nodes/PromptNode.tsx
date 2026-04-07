"use client";

import { Handle, Position, type NodeProps, useReactFlow } from "@xyflow/react";
import { useCallback, useState, useEffect, useRef } from "react";

export default function PromptNode({ id, data }: NodeProps) {
  const { updateNodeData, deleteElements } = useReactFlow();
  const [expanded, setExpanded] = useState(false);
  const expandedRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(id, { text: e.target.value });
    },
    [id, updateNodeData]
  );

  // Focus expanded textarea when opened
  useEffect(() => {
    if (expanded && expandedRef.current) {
      expandedRef.current.focus();
      expandedRef.current.selectionStart = expandedRef.current.value.length;
    }
  }, [expanded]);

  // Close on Escape
  useEffect(() => {
    if (!expanded) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [expanded]);

  return (
    <>
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-lg w-[200px]">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-700">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="text-xs font-medium text-zinc-200">Prompt</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setExpanded(true)}
              className="text-zinc-500 hover:text-purple-400 text-[10px] leading-none nodrag"
              title="Expandir prompt"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
            </button>
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

      {/* Expanded Modal */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm nodrag"
          onClick={(e) => { if (e.target === e.currentTarget) setExpanded(false); }}
        >
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-[600px] max-w-[90vw] max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-700">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span className="text-sm font-semibold text-zinc-200">Prompt</span>
                <span className="text-[10px] text-zinc-500">
                  {((data.text as string) || "").length} chars
                </span>
              </div>
              <button
                onClick={() => setExpanded(false)}
                className="text-zinc-400 hover:text-white text-lg leading-none transition-colors"
                title="Fechar (Esc)"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 flex-1 min-h-0">
              <textarea
                ref={expandedRef}
                className="w-full h-[400px] max-h-[60vh] bg-zinc-800 border border-zinc-600 rounded-xl p-4 text-sm text-zinc-200 placeholder-zinc-500 resize-none focus:outline-none focus:border-purple-500 transition-colors leading-relaxed"
                placeholder="Digite seu prompt aqui..."
                value={(data.text as string) || ""}
                onChange={handleChange}
              />
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-zinc-700 flex justify-end">
              <button
                onClick={() => setExpanded(false)}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
