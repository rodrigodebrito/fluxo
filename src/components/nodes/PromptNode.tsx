"use client";

import { Handle, Position, type NodeProps, useReactFlow } from "@xyflow/react";
import { useCallback, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

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

      {/* Expanded Modal - rendered via portal to escape ReactFlow transform */}
      {expanded && createPortal(
        <div
          style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setExpanded(false); }}
        >
          <div style={{ width: 700, maxWidth: "90vw", backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: 16, boxShadow: "0 25px 50px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column" }}>
            {/* Modal Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: "1px solid #3f3f46" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#a855f7" }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: "#e4e4e7" }}>Prompt</span>
                <span style={{ fontSize: 11, color: "#71717a" }}>
                  {((data.text as string) || "").length} chars
                </span>
              </div>
              <button
                onClick={() => setExpanded(false)}
                style={{ color: "#a1a1aa", fontSize: 20, lineHeight: 1, cursor: "pointer", background: "none", border: "none" }}
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 16 }}>
              <textarea
                ref={expandedRef}
                style={{ width: "100%", height: 350, backgroundColor: "#27272a", border: "1px solid #52525b", borderRadius: 12, padding: 16, fontSize: 14, color: "#e4e4e7", resize: "none", outline: "none", lineHeight: 1.7, fontFamily: "inherit" }}
                placeholder="Digite seu prompt aqui..."
                value={(data.text as string) || ""}
                onChange={handleChange}
              />
            </div>

            {/* Modal Footer */}
            <div style={{ padding: "12px 20px", borderTop: "1px solid #3f3f46", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setExpanded(false)}
                style={{ padding: "6px 16px", backgroundColor: "#9333ea", color: "white", fontSize: 13, fontWeight: 500, borderRadius: 8, border: "none", cursor: "pointer" }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
