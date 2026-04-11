"use client";

import { Handle, Position, type NodeProps, useReactFlow } from "@xyflow/react";
import { useCallback, useState } from "react";

// Gera thumbnail pequeno (max 300px) a partir de um File pra nao carregar 4K inteira na memoria
function createThumbnail(file: File, maxSize = 300): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = () => resolve(reader.result as string);
      img.src = reader.result as string;
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

export default function ImageInputNode({ id, data }: NodeProps) {
  const { updateNodeData, deleteElements } = useReactFlow();
  const images = (data.images as Array<{ url: string; name: string; thumbUrl?: string }>) || [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;
      e.target.value = "";

      // Gerar thumbnails leves pra preview (nao carrega 4K na memoria)
      // Criar blob URLs como fallback caso upload falhe
      const blobUrls = files.map((f) => URL.createObjectURL(f));
      const thumbs = await Promise.all(files.map((f) => createThumbnail(f)));

      const previews = files.map((file, i) => ({
        url: blobUrls[i],
        name: file.name,
        thumbUrl: thumbs[i],
      }));
      const currentImages = [...images, ...previews];
      updateNodeData(id, { images: currentImages });
      setIsUploading(true);

      try {
        // Upload individual — uma por vez pra evitar estouro com 4K
        const uploaded: string[] = [];
        for (const file of files) {
          const formData = new FormData();
          formData.append("files", file);
          const response = await fetch("/api/upload", { method: "POST", body: formData });
          const text = await response.text();
          let json;
          try { json = JSON.parse(text); } catch { json = null; }
          uploaded.push(json?.urls?.[0] || "");
        }

        const finalImages = [...images];
        for (let i = 0; i < files.length; i++) {
          finalImages.push({
            url: uploaded[i] || blobUrls[i],
            name: files[i].name,
            thumbUrl: thumbs[i],
          });
        }
        updateNodeData(id, { images: finalImages });
        // Revogar blob URLs apenas dos que foram uploaded com sucesso
        blobUrls.forEach((b, i) => { if (uploaded[i]) URL.revokeObjectURL(b); });
      } catch (err) {
        console.error("Upload failed, keeping blob URLs:", err);
      } finally {
        setIsUploading(false);
      }
    },
    [id, images, updateNodeData]
  );

  const prev = useCallback(() => {
    setCurrentIndex((i) => (i > 0 ? i - 1 : images.length - 1));
  }, [images.length]);

  const next = useCallback(() => {
    setCurrentIndex((i) => (i < images.length - 1 ? i + 1 : 0));
  }, [images.length]);

  const safeIndex = Math.min(currentIndex, Math.max(images.length - 1, 0));

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-lg w-[180px]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-700">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-xs font-medium text-zinc-200">File</span>
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
            title="Deletar nó"
          >
            ×
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-2">
        {images.length > 0 ? (
          <div
            className="relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Media atual */}
            {/\.(mp4|webm|mov|avi)$/i.test(images[safeIndex]?.name || "") ? (
              <video
                src={images[safeIndex]?.url}
                className="w-full h-[130px] object-cover rounded-md"
                muted
              />
            ) : (
              <img
                src={images[safeIndex]?.thumbUrl || images[safeIndex]?.url}
                alt={images[safeIndex]?.name}
                className="w-full h-[130px] object-cover rounded-md"
                loading="lazy"
                decoding="async"
              />
            )}

            {/* Overlay com controles — aparece no hover */}
            {isHovered && (
              <>
                {/* Barra superior: fullscreen, setas, contador, download */}
                <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-2 py-1.5 bg-gradient-to-b from-black/60 to-transparent rounded-t-lg">
                  <div className="flex items-center gap-2">
                    {/* Fullscreen icon */}
                    <button className="text-white/70 hover:text-white nodrag">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                      </svg>
                    </button>

                    {/* Setas + contador */}
                    <button onClick={prev} className="text-white/70 hover:text-white text-sm nodrag">&lt;</button>
                    <span className="text-white/90 text-xs font-medium">
                      {safeIndex + 1} / {images.length}
                    </span>
                    <button onClick={next} className="text-white/70 hover:text-white text-sm nodrag">&gt;</button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Download */}
                    <a
                      href={images[safeIndex]?.url}
                      download={images[safeIndex]?.name}
                      className="text-white/70 hover:text-white nodrag"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </a>
                    {/* Remove current image */}
                    <button
                      onClick={() => {
                        const newImages = images.filter((_: unknown, i: number) => i !== safeIndex);
                        updateNodeData(id, { images: newImages });
                        if (safeIndex >= newImages.length && newImages.length > 0) setCurrentIndex(newImages.length - 1);
                      }}
                      className="text-white/70 hover:text-red-400 nodrag"
                      title="Remover esta imagem"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Setas laterais grandes */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={prev}
                      className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-black/50 hover:bg-black/70 text-white rounded-full text-sm nodrag"
                    >
                      &lt;
                    </button>
                    <button
                      onClick={next}
                      className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-black/50 hover:bg-black/70 text-white rounded-full text-sm nodrag"
                    >
                      &gt;
                    </button>
                  </>
                )}

                {/* Info inferior */}
                <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/60 to-transparent rounded-b-lg">
                  <span className="text-white/60 text-[10px]">{images[safeIndex]?.name}</span>
                </div>
              </>
            )}
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-[130px] border-2 border-dashed border-zinc-600 rounded-md cursor-pointer hover:border-blue-500 transition-colors">
            <svg className="w-6 h-6 text-zinc-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-[10px] text-zinc-400">Click to add</span>
            <span className="text-[9px] text-zinc-500 mt-0.5">Images or videos</span>
            <input type="file" className="hidden" accept="image/*,video/*" multiple onChange={handleFileChange} />
          </label>
        )}
      </div>

      {/* Footer */}
      {images.length > 0 && (
        <div className="px-2 pb-2 flex items-center gap-2">
          {images.length < 8 && (
            <label className="text-[10px] text-cyan-400 hover:text-cyan-300 cursor-pointer transition-colors">
              + Add more files
              <input type="file" className="hidden" accept="image/*,video/*" multiple onChange={handleFileChange} />
            </label>
          )}
          <button
            onClick={() => { updateNodeData(id, { images: [] }); setCurrentIndex(0); }}
            className="text-[10px] text-red-400 hover:text-red-300 cursor-pointer transition-colors nodrag"
          >
            Clear all
          </button>
          {isUploading && (
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 border border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-[9px] text-zinc-400">uploading...</span>
            </div>
          )}
        </div>
      )}

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-blue-500 !border-2 !border-blue-300"
      />
    </div>
  );
}
