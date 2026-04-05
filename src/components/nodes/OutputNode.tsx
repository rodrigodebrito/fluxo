"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";

export default function OutputNode({ id, data }: NodeProps) {
  const resultUrl = data.resultUrl as string;
  const resultType = data.resultType as string;
  const isLoading = data.isLoading as boolean;

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-lg min-w-[280px]">
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-green-300"
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
          <span className="text-sm font-medium text-zinc-200">Output</span>
        </div>
        <div className="flex items-center gap-1.5">
          {resultUrl && (
            <a
              href={resultUrl}
              download
              className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
            >
              Download
            </a>
          )}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("fluxo-duplicate-node", { detail: { nodeId: id } }))}
            className="text-zinc-500 hover:text-blue-400 text-[10px] leading-none"
            title="Duplicar"
          >
            ⧉
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-zinc-400 mt-3">Gerando...</span>
          </div>
        ) : resultUrl ? (
          <div>
            {resultType === "video" ? (
              <video
                src={resultUrl}
                controls
                className="w-full h-40 object-cover rounded-lg bg-black"
              />
            ) : (
              <img
                src={resultUrl}
                alt="Resultado"
                className="w-full h-40 object-cover rounded-lg"
              />
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-zinc-700 rounded-lg">
            <svg
              className="w-8 h-8 text-zinc-600 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            <span className="text-xs text-zinc-500">Resultado aparecera aqui</span>
          </div>
        )}
      </div>
    </div>
  );
}
