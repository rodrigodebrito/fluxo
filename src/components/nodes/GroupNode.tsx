"use client";

import { type NodeProps, useReactFlow, NodeResizer } from "@xyflow/react";
import { useCallback } from "react";

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

export default function GroupNode({ id, data, selected }: NodeProps) {
  const { updateNodeData, deleteElements } = useReactFlow();
  const colorIndex = (data.colorIndex as number) || 0;
  const color = GROUP_COLORS[colorIndex] || GROUP_COLORS[0];
  const label = (data.label as string) || "";
  const notes = (data.notes as string) || "";
  const fontSize = (data.fontSize as number) || 14;

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
      if (e.key === "Enter") {
        e.stopPropagation();
      }
      if (e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
        const target = e.target as HTMLTextAreaElement;
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const newValue = notes.substring(0, start) + "  " + notes.substring(end);
        updateNodeData(id, { notes: newValue });
        requestAnimationFrame(() => {
          target.selectionStart = target.selectionEnd = start + 2;
        });
      }
    },
    [id, notes, updateNodeData]
  );

  const decreaseFont = useCallback(() => {
    const newSize = Math.max(10, fontSize - 2);
    updateNodeData(id, { fontSize: newSize });
  }, [id, fontSize, updateNodeData]);

  const increaseFont = useCallback(() => {
    const newSize = Math.min(40, fontSize + 2);
    updateNodeData(id, { fontSize: newSize });
  }, [id, fontSize, updateNodeData]);

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
        minHeight={120}
        lineClassName="!border-transparent"
        handleClassName="!w-2.5 !h-2.5 !rounded-sm"
        handleStyle={{ backgroundColor: color.resizer, borderColor: color.resizer }}
      />

      {/* Header: title + delete */}
      <div className="absolute top-0 left-0 right-0 flex items-center gap-1.5 px-3 py-1.5">
        <input
          value={label}
          onChange={handleLabelChange}
          placeholder="Nome do grupo..."
          className="bg-transparent text-sm font-semibold outline-none flex-1 nodrag placeholder:text-zinc-500"
          style={{ minWidth: 0, color: color.resizer }}
        />
        <button
          onClick={() => deleteElements({ nodes: [{ id }] })}
          className="text-zinc-600 hover:text-red-400 text-sm leading-none nodrag"
          title="Remover grupo"
        >
          x
        </button>
      </div>

      {/* Toolbar: colors + font size */}
      <div className="absolute top-7 left-0 right-0 flex items-center gap-3 px-3 py-1">
        {/* Color circles */}
        <div className="flex items-center gap-1 nodrag">
          {GROUP_COLORS.map((c, idx) => (
            <button
              key={idx}
              onClick={() => updateNodeData(id, { colorIndex: idx })}
              className="w-4 h-4 rounded-full transition-transform hover:scale-125"
              style={{
                backgroundColor: c.resizer,
                outline: idx === colorIndex ? "2px solid white" : "1px solid rgba(255,255,255,0.15)",
                outlineOffset: "1px",
              }}
              title={c.label}
            />
          ))}
        </div>

        {/* Separator */}
        <div className="w-px h-4 bg-zinc-700" />

        {/* Font size controls */}
        <div className="flex items-center gap-1 nodrag">
          <button
            onClick={decreaseFont}
            className="w-5 h-5 flex items-center justify-center rounded bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700 text-xs font-bold"
            title="Diminuir fonte"
          >
            A-
          </button>
          <span className="text-[10px] text-zinc-400 w-5 text-center font-medium">{fontSize}</span>
          <button
            onClick={increaseFont}
            className="w-5 h-5 flex items-center justify-center rounded bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700 text-xs font-bold"
            title="Aumentar fonte"
          >
            A+
          </button>
        </div>
      </div>

      {/* Notes area */}
      <div className="absolute top-14 left-0 right-0 bottom-0 px-3 pb-2">
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
