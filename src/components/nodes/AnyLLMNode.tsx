"use client";

import { Handle, Position, type NodeProps, useReactFlow, useUpdateNodeInternals } from "@xyflow/react";
import { useCallback, useEffect } from "react";

export default function AnyLLMNode({ id, data }: NodeProps) {
  const { updateNodeData, deleteElements } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();

  const imageInputCount = (data.imageInputCount as number) || 1;
  const generatedText = (data.generatedText as string) || "";
  const isRunning = (data.isRunning as boolean) || false;
  const llmModel = (data.llmModel as string) || "gpt-4o-mini";
  const temperature = (data.temperature as number) ?? 0.7;

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, imageInputCount]);

  const addImageInput = useCallback(() => {
    updateNodeData(id, { imageInputCount: imageInputCount + 1 });
  }, [id, imageInputCount, updateNodeData]);

  const runLLM = useCallback(() => {
    window.dispatchEvent(new CustomEvent("fluxo-run-llm", { detail: { nodeId: id } }));
  }, [id]);

  // Handle positions
  const headerH = 32;
  const promptY = headerH + 20;
  const systemPromptY = promptY + 26;
  const imageStartY = systemPromptY + 26;

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-lg w-[280px] relative">
      {/* Input Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="prompt"
        style={{ top: `${promptY}px` }}
        className="!w-2.5 !h-2.5 !bg-pink-500 !border-2 !border-pink-300"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="system-prompt"
        style={{ top: `${systemPromptY}px` }}
        className="!w-2.5 !h-2.5 !bg-purple-500 !border-2 !border-purple-300"
      />
      {Array.from({ length: imageInputCount }, (_, i) => (
        <Handle
          key={`image-${i + 1}`}
          type="target"
          position={Position.Left}
          id={`image-${i + 1}`}
          style={{ top: `${imageStartY + i * 26}px` }}
          className="!w-2.5 !h-2.5 !bg-green-500 !border-2 !border-green-300"
        />
      ))}

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="text"
        style={{ top: `${promptY}px` }}
        className="!w-2.5 !h-2.5 !bg-purple-500 !border-2 !border-purple-300"
      />

      {/* Handle Labels */}
      <div className="absolute text-[10px] text-pink-400 font-medium" style={{ left: "-48px", top: `${promptY - 6}px` }}>
        Prompt<span className="text-red-400">*</span>
      </div>
      <div className="absolute text-[10px] text-purple-400 font-medium whitespace-nowrap" style={{ left: "-76px", top: `${systemPromptY - 6}px` }}>
        System Prompt
      </div>
      {Array.from({ length: imageInputCount }, (_, i) => (
        <div key={`label-${i}`} className="absolute text-[10px] text-green-400 font-medium" style={{ left: "-52px", top: `${imageStartY + i * 26 - 6}px` }}>
          Image {i + 1}
        </div>
      ))}
      <div className="absolute text-[10px] text-purple-400 font-medium" style={{ right: "-28px", top: `${promptY - 6}px` }}>
        Text
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-700">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-xs font-medium text-zinc-200">Any LLM</span>
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

      {/* Body — Generated text area */}
      <div className="p-2">
        <div className="w-full min-h-[120px] max-h-[200px] overflow-y-auto bg-zinc-800 border border-zinc-600 rounded-md p-2 text-[11px] text-zinc-300 nodrag nowheel">
          {isRunning ? (
            <div className="flex items-center gap-2 text-amber-400">
              <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              Gerando...
            </div>
          ) : generatedText ? (
            <p className="whitespace-pre-wrap">{generatedText}</p>
          ) : (
            <p className="text-zinc-600 italic">The generated text will appear here</p>
          )}
        </div>

        {/* Model & Temperature compact display */}
        <div className="flex items-center justify-between mt-2 px-1">
          <select
            value={llmModel}
            onChange={(e) => updateNodeData(id, { llmModel: e.target.value })}
            className="bg-zinc-800 border border-zinc-700 rounded text-[10px] text-zinc-300 px-1.5 py-1 nodrag focus:outline-none focus:border-purple-500"
          >
            <option value="gpt-4o-mini">GPT-4o Mini</option>
            <option value="gpt-4o">GPT-4o</option>
          </select>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-zinc-500">Temp:</span>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e) => updateNodeData(id, { temperature: parseFloat(e.target.value) })}
              className="w-14 h-1 nodrag"
            />
            <span className="text-[9px] text-zinc-400 w-4 text-right">{temperature}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-2 pb-2 gap-1">
        <button
          onClick={addImageInput}
          className="text-[10px] text-green-400 hover:text-green-300 nodrag"
        >
          + Add image input
        </button>
        <button
          onClick={runLLM}
          disabled={isRunning}
          className={`px-3 py-1.5 rounded-md text-[10px] font-medium transition-colors nodrag shrink-0 ${
            isRunning
              ? "bg-zinc-800 border border-zinc-700 text-zinc-500 cursor-not-allowed"
              : "bg-zinc-800 border border-zinc-600 text-zinc-200 hover:bg-zinc-600 hover:text-white"
          }`}
        >
          → Run Model
        </button>
      </div>
    </div>
  );
}
