"use client";

import { Handle, Position, type NodeProps, useReactFlow } from "@xyflow/react";
import { useCallback, useState } from "react";

export default function VideoInputNode({ id, data }: NodeProps) {
  const { updateNodeData, deleteElements } = useReactFlow();
  const videoUrl = (data.videoUrl as string) || "";
  const fileName = (data.fileName as string) || "";
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";

      // Preview imediato com blob URL
      const blobUrl = URL.createObjectURL(file);
      updateNodeData(id, { videoUrl: blobUrl, fileName: file.name });
      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("files", file);
        const response = await fetch("/api/upload", { method: "POST", body: formData });
        const json = await response.json();

        if (json?.urls?.[0]) {
          updateNodeData(id, { videoUrl: json.urls[0], fileName: file.name });
          URL.revokeObjectURL(blobUrl);
        }
      } catch (err) {
        console.error("Video upload failed:", err);
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
          <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span className="text-xs font-medium text-zinc-200">Video</span>
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

      {/* Body */}
      <div className="p-2">
        {videoUrl ? (
          <div className="relative group">
            <video
              src={videoUrl}
              className="w-full h-[130px] object-cover rounded-md bg-black"
              muted
              loop
              onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
              onMouseLeave={(e) => { (e.target as HTMLVideoElement).pause(); (e.target as HTMLVideoElement).currentTime = 0; }}
            />
            {/* Overlay info */}
            <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/60 to-transparent rounded-b-md opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-white/60 text-[10px] truncate block">{fileName}</span>
            </div>
            {/* Remove button */}
            <button
              onClick={() => updateNodeData(id, { videoUrl: "", fileName: "" })}
              className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center bg-black/50 hover:bg-red-500/80 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity nodrag"
              title="Remover video"
            >
              ×
            </button>
            {isUploading && (
              <div className="absolute top-1 left-1 flex items-center gap-1 bg-black/60 rounded px-1.5 py-0.5">
                <div className="w-2.5 h-2.5 border border-red-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-[9px] text-white/70">uploading...</span>
              </div>
            )}
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-[130px] border-2 border-dashed border-zinc-600 rounded-md cursor-pointer hover:border-red-500 transition-colors">
            <svg className="w-6 h-6 text-zinc-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="text-[10px] text-zinc-400">Click to add video</span>
            <span className="text-[9px] text-zinc-500 mt-0.5">MP4, MOV (max 200MB)</span>
            <input type="file" className="hidden" accept="video/mp4,video/quicktime,video/mov,.mp4,.mov" onChange={handleFileChange} />
          </label>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-red-500 !border-2 !border-red-300"
      />
    </div>
  );
}
