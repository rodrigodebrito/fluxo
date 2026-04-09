"use client";

import { type NodeProps, useReactFlow, NodeResizer } from "@xyflow/react";
import { useCallback, useState, useRef } from "react";

const GROUP_COLORS = [
  { label: "Cinza", bg: "rgba(63, 63, 70, 0.3)", border: "rgba(113, 113, 122, 0.5)", resizer: "#71717a" },
  { label: "Roxo", bg: "rgba(147, 51, 234, 0.15)", border: "rgba(147, 51, 234, 0.4)", resizer: "#9333ea" },
  { label: "Azul", bg: "rgba(59, 130, 246, 0.15)", border: "rgba(59, 130, 246, 0.4)", resizer: "#3b82f6" },
  { label: "Verde", bg: "rgba(34, 197, 94, 0.15)", border: "rgba(34, 197, 94, 0.4)", resizer: "#22c55e" },
  { label: "Amarelo", bg: "rgba(234, 179, 8, 0.15)", border: "rgba(234, 179, 8, 0.4)", resizer: "#eab308" },
  { label: "Vermelho", bg: "rgba(239, 68, 68, 0.15)", border: "rgba(239, 68, 68, 0.4)", resizer: "#ef4444" },
  { label: "Ciano", bg: "rgba(6, 182, 212, 0.15)", border: "rgba(6, 182, 212, 0.4)", resizer: "#06b6d4" },
  { label: "Rosa", bg: "rgba(236, 72, 153, 0.15)", border: "rgba(236, 72, 153, 0.4)", resizer: "#ec4899" },
];

const FONT_SIZES = [12, 14, 16, 20, 24, 32];

export default function GroupNode({ id, data, selected }: NodeProps) {
  const { updateNodeData, deleteElements } = useReactFlow();
  const colorIndex = (data.colorIndex as number) || 0;
  const color = GROUP_COLORS[colorIndex] || GROUP_COLORS[0];
  const label = (data.label as string) || "";
  const notes = (data.notes as string) || "";
  const fontSize = (data.fontSize as number) || 14;
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const colorRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  const handleLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData(id, { label: e.target.value });
    },
    [id, updateNodeData]
  );

  const handleNotesChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(id, { notes: e.target.value });
    },
    [id, updateNodeData]
  );

  const handleNotesKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Allow Enter to create new lines (stop propagation to prevent React Flow shortcuts)
      if (e.key === "Enter") {
        e.stopPropagation();
      }
      // Tab inserts spaces
      if (e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
        const target = e.target as HTMLTextAreaElement;
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const newValue = notes.substring(0, start) + "  " + notes.substring(end);
        updateNodeData(id, { notes: newValue });
        // Restore cursor position after React re-render
        requestAnimationFrame(() => {
          target.selectionStart = target.selectionEnd = start + 2;
        });
      }
    },
    [id, notes, updateNodeData]
  );

  const selectColor = useCallback(
    (idx: number) => {
      updateNodeData(id, { colorIndex: idx });
      setShowColorPicker(false);
    },
    [id, updateNodeData]
  );

  const changeFontSize = useCallback(
    (size: number) => {
      updateNodeData(id, { fontSize: size });
    },
    [id, updateNodeData]
  );

  return (
    <div
      className="relative"
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: color.bg,
        border: `2px dashed ${color.border}`,
        borderRadius: "12px",
      }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={200}
        minHeight={100}
        lineClassName="!border-transparent"
        handleClassName="!w-2.5 !h-2.5 !rounded-sm"
        handleStyle={{ backgroundColor: color.resizer, borderColor: color.resizer }}
      />

      {/* Header bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center gap-1.5 px-3 py-1.5">
        {/* Color picker */}
        <div className="relative" ref={colorRef}>
          <button
            onClick={() => { setShowColorPicker(!showColorPicker); setShowSettings(false); }}
            className="w-4 h-4 rounded-full shrink-0 nodrag cursor-pointer border border-white/20 hover:scale-110 transition-transform"
            style={{ backgroundColor: color.resizer }}
            title="Mudar cor"
          />
          {showColorPicker && (
            <div className="absolute top-6 left-0 z-50 bg-zinc-900 border border-zinc-700 rounded-lg p-2 shadow-xl nodrag">
              <div className="grid grid-cols-4 gap-1.5">
                {GROUP_COLORS.map((c, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectColor(idx)}
                    className={`w-6 h-6 rounded-full border-2 hover:scale-110 transition-transform ${
                      idx === colorIndex ? "border-white" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c.resizer }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Title input */}
        <input
          value={label}
          onChange={handleLabelChange}
          placeholder="Nome do grupo..."
          className="bg-transparent text-sm font-semibold outline-none flex-1 nodrag placeholder:text-zinc-500"
          style={{ minWidth: 0, color: color.resizer }}
        />

        {/* Settings toggle */}
        <div className="relative" ref={settingsRef}>
          <button
            onClick={() => { setShowSettings(!showSettings); setShowColorPicker(false); }}
            className="text-zinc-500 hover:text-zinc-300 text-xs nodrag p-0.5"
            title="Configuracoes"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75M10.5 18a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 18H7.5m6-6h6.75M13.5 12a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 12h6" />
            </svg>
          </button>
          {showSettings && (
            <div className="absolute top-6 right-0 z-50 bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl nodrag min-w-[160px]">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Tamanho do texto</span>
              <div className="flex items-center gap-1 mt-1.5">
                {FONT_SIZES.map((size) => (
                  <button
                    key={size}
                    onClick={() => changeFontSize(size)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                      fontSize === size
                        ? "bg-purple-600 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Delete */}
        <button
          onClick={() => deleteElements({ nodes: [{ id }] })}
          className="text-zinc-600 hover:text-red-400 text-xs nodrag"
          title="Remover grupo"
        >
          x
        </button>
      </div>

      {/* Notes area - multi-line text editor */}
      <div className="absolute top-8 left-0 right-0 bottom-0 px-3 pb-2">
        <textarea
          value={notes}
          onChange={handleNotesChange}
          onKeyDown={handleNotesKeyDown}
          placeholder="Anotacoes..."
          className="w-full h-full bg-transparent outline-none resize-none text-zinc-300 placeholder:text-zinc-600/50 nodrag nowheel"
          style={{ fontSize: `${fontSize}px`, lineHeight: "1.5" }}
          spellCheck={false}
        />
      </div>
    </div>
  );
}
