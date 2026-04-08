"use client";

import { type NodeProps, useReactFlow, NodeResizer } from "@xyflow/react";
import { useCallback } from "react";

const GROUP_COLORS = [
  { label: "Cinza", bg: "rgba(63, 63, 70, 0.3)", border: "rgba(113, 113, 122, 0.5)" },
  { label: "Roxo", bg: "rgba(147, 51, 234, 0.15)", border: "rgba(147, 51, 234, 0.4)" },
  { label: "Azul", bg: "rgba(59, 130, 246, 0.15)", border: "rgba(59, 130, 246, 0.4)" },
  { label: "Verde", bg: "rgba(34, 197, 94, 0.15)", border: "rgba(34, 197, 94, 0.4)" },
  { label: "Amarelo", bg: "rgba(234, 179, 8, 0.15)", border: "rgba(234, 179, 8, 0.4)" },
  { label: "Vermelho", bg: "rgba(239, 68, 68, 0.15)", border: "rgba(239, 68, 68, 0.4)" },
];

export default function GroupNode({ id, data, selected }: NodeProps) {
  const { updateNodeData, deleteElements } = useReactFlow();
  const colorIndex = (data.colorIndex as number) || 0;
  const color = GROUP_COLORS[colorIndex] || GROUP_COLORS[0];
  const label = (data.label as string) || "";

  const handleLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData(id, { label: e.target.value });
    },
    [id, updateNodeData]
  );

  const cycleColor = useCallback(() => {
    const next = ((data.colorIndex as number) || 0) + 1;
    updateNodeData(id, { colorIndex: next >= GROUP_COLORS.length ? 0 : next });
  }, [id, data.colorIndex, updateNodeData]);

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
        lineClassName="!border-purple-500"
        handleClassName="!w-2.5 !h-2.5 !bg-purple-500 !border-purple-500 !rounded-sm"
      />
      {/* Header bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center gap-2 px-3 py-1.5">
        <button
          onClick={cycleColor}
          className="w-3 h-3 rounded-full shrink-0 nodrag cursor-pointer"
          style={{ backgroundColor: color.border }}
          title="Mudar cor"
        />
        <input
          value={label}
          onChange={handleLabelChange}
          placeholder="Nome do grupo..."
          className="bg-transparent text-sm font-medium text-zinc-200 outline-none flex-1 nodrag placeholder:text-zinc-500"
          style={{ minWidth: 0 }}
        />
        <button
          onClick={() => deleteElements({ nodes: [{ id }] })}
          className="text-zinc-600 hover:text-red-400 text-xs nodrag"
          title="Remover grupo"
        >
          x
        </button>
      </div>
    </div>
  );
}
