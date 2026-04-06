"use client";

import { Handle, Position, type NodeProps, useReactFlow } from "@xyflow/react";

export default function TextIteratorNode({ id, data }: NodeProps) {
  const { updateNodeData, deleteElements } = useReactFlow();

  const items = (data.items as string[]) || ["", ""];

  const updateItem = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = value;
    updateNodeData(id, { items: newItems });
  };

  const addItem = () => {
    updateNodeData(id, { items: [...items, ""] });
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    const newItems = items.filter((_, i) => i !== index);
    updateNodeData(id, { items: newItems });
  };

  // Layout
  const headerH = 32;
  const itemH = 34;
  const bodyPaddingTop = 8;
  const outputY = headerH + bodyPaddingTop + (items.length * itemH) / 2;

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-lg w-[260px] relative">
      {/* Output Handle (right) */}
      <Handle
        type="source"
        position={Position.Right}
        id="iterator-out"
        style={{ top: `${outputY}px` }}
        className="!w-2.5 !h-2.5 !bg-green-500 !border-2 !border-green-300"
      />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-700">
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-xs font-medium text-zinc-200">Text Iterator</span>
          <span className="text-[9px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded-full font-medium">
            {items.filter((i) => i.trim()).length} values
          </span>
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

      {/* Items list */}
      <div className="p-2 space-y-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1">
            <input
              type="text"
              value={item}
              onChange={(e) => updateItem(i, e.target.value)}
              placeholder={`Item ${i + 1}`}
              className="flex-1 px-2 py-1.5 bg-zinc-800 border border-zinc-600 rounded-md text-[11px] text-zinc-300 placeholder-zinc-600 nodrag nowheel focus:outline-none focus:border-green-500"
            />
            {items.length > 1 && (
              <button
                onClick={() => removeItem(i)}
                className="text-zinc-600 hover:text-red-400 text-sm leading-none nodrag shrink-0 w-5 h-5 flex items-center justify-center"
                title="Remover"
              >
                ×
              </button>
            )}
          </div>
        ))}

        <button
          onClick={addItem}
          className="text-[10px] text-green-400 hover:text-green-300 mt-1 nodrag flex items-center gap-1"
        >
          <span>+</span> Add another item
        </button>
      </div>
    </div>
  );
}
