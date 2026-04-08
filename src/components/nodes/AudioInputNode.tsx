"use client";

import { Handle, Position, type NodeProps, useReactFlow } from "@xyflow/react";
import { useCallback, useState, useRef } from "react";

export default function AudioInputNode({ id, data }: NodeProps) {
  const { updateNodeData, deleteElements } = useReactFlow();
  const audioUrl = (data.audioUrl as string) || "";
  const fileName = (data.fileName as string) || "";
  const [isUploading, setIsUploading] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";

      const blobUrl = URL.createObjectURL(file);
      updateNodeData(id, { audioUrl: blobUrl, fileName: file.name });
      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("files", file);
        const response = await fetch("/api/upload", { method: "POST", body: formData });
        const json = await response.json();

        if (json?.urls?.[0]) {
          updateNodeData(id, { audioUrl: json.urls[0], fileName: file.name });
          URL.revokeObjectURL(blobUrl);
        }
      } catch (err) {
        console.error("Audio upload failed:", err);
      } finally {
        setIsUploading(false);
      }
    },
    [id, updateNodeData]
  );

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-lg w-[180px]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-700">
        <div className="flex items-center gap-1.5">
          <svg className="w-3 h-3 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <span className="text-xs font-medium text-zinc-200">Audio</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("fluxo-duplicate-node", { detail: { nodeId: id } }))}
            className="text-zinc-500 hover:text-blue-400 text-[10px] leading-none nodrag"
            title="Duplicar"
          >
            &#x29C9;
          </button>
          <button
            onClick={() => deleteElements({ nodes: [{ id }] })}
            className="text-zinc-500 hover:text-red-400 text-sm leading-none nodrag"
            title="Deletar"
          >
            &times;
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-2">
        {audioUrl ? (
          <div className="relative group">
            <div className="flex flex-col items-center justify-center w-full h-[80px] bg-zinc-800 rounded-md">
              <svg className="w-8 h-8 text-orange-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span className="text-[10px] text-zinc-400 truncate max-w-[150px] px-2">{fileName}</span>
            </div>
            {/* Audio player */}
            <audio ref={audioRef} src={audioUrl} className="w-full mt-1.5" controls style={{ height: 28 }} />
            {/* Duration badge */}
            {(data.audioDuration as number) > 0 && (
              <div className="absolute top-1 left-1 bg-black/60 rounded px-1.5 py-0.5">
                <span className="text-[9px] text-white/70">{data.audioDuration as number}s</span>
              </div>
            )}
            {/* Remove button */}
            <button
              onClick={() => updateNodeData(id, { audioUrl: "", fileName: "", audioDuration: 0 })}
              className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center bg-black/50 hover:bg-red-500/80 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity nodrag"
              title="Remover audio"
            >
              &times;
            </button>
            {isUploading && (
              <div className="absolute top-1 left-1 flex items-center gap-1 bg-black/60 rounded px-1.5 py-0.5">
                <div className="w-2.5 h-2.5 border border-orange-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-[9px] text-white/70">uploading...</span>
              </div>
            )}
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-[80px] border-2 border-dashed border-zinc-600 rounded-md cursor-pointer hover:border-orange-500 transition-colors">
            <svg className="w-6 h-6 text-zinc-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <span className="text-[10px] text-zinc-400">Click to add audio</span>
            <span className="text-[9px] text-zinc-500 mt-0.5">MP3, WAV, AAC, OGG</span>
            <input type="file" className="hidden" accept="audio/mpeg,audio/wav,audio/aac,audio/ogg,audio/mp4,.mp3,.wav,.aac,.ogg,.m4a" onChange={handleFileChange} />
          </label>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-orange-500 !border-2 !border-orange-300"
      />
    </div>
  );
}
