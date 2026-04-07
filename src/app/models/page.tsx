"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import UserCredits from "@/components/Header/UserCredits";

interface TrainedModel {
  id: string;
  name: string;
  trigger_word: string;
  replicate_model_id: string | null;
  replicate_version: string | null;
  status: string;
  thumbnail_url: string | null;
  created_at: string;
  completed_at: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  uploading: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  training: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  ready: "bg-green-500/10 text-green-400 border-green-500/20",
  failed: "bg-red-500/10 text-red-400 border-red-500/20",
};

const STATUS_LABELS: Record<string, string> = {
  uploading: "Enviando...",
  training: "Treinando...",
  ready: "Pronto",
  failed: "Falhou",
};

function generateTriggerWord(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let word = "";
  for (let i = 0; i < 6; i++) {
    word += chars[Math.floor(Math.random() * chars.length)];
  }
  return word;
}

export default function ModelsPage() {
  const [models, setModels] = useState<TrainedModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [modelName, setModelName] = useState("");
  const [triggerWord, setTriggerWord] = useState(() => generateTriggerWord());
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchModels = useCallback(async () => {
    try {
      const res = await fetch("/api/training/list");
      const data = await res.json();
      setModels(data.models || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // Poll training models
  useEffect(() => {
    const trainingModels = models.filter((m) => m.status === "training");
    if (trainingModels.length === 0) return;

    const interval = setInterval(async () => {
      for (const m of trainingModels) {
        const res = await fetch(`/api/training/status?id=${m.id}`);
        const data = await res.json();
        if (data.status !== m.status) {
          fetchModels();
          break;
        }
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [models, fetchModels]);

  const handleFilesSelected = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).filter((f) =>
      ["image/jpeg", "image/png", "image/webp"].includes(f.type)
    );
    const combined = [...selectedFiles, ...newFiles].slice(0, 30);
    setSelectedFiles(combined);

    // Generate previews
    const newPreviews = combined.map((f) => URL.createObjectURL(f));
    previews.forEach((p) => URL.revokeObjectURL(p));
    setPreviews(newPreviews);
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    URL.revokeObjectURL(previews[index]);
    setPreviews(previews.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!modelName.trim()) return;
    if (!triggerWord.trim()) return;
    if (selectedFiles.length < 5) return;

    setCreating(true);
    try {
      const formData = new FormData();
      formData.append("name", modelName.trim());
      formData.append("trigger_word", triggerWord.trim());
      for (const file of selectedFiles) {
        formData.append("images", file);
      }

      const res = await fetch("/api/training/create", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Erro ao criar modelo");
        return;
      }

      // Reset form
      setModelName("");
      setTriggerWord(generateTriggerWord());
      setSelectedFiles([]);
      previews.forEach((p) => URL.revokeObjectURL(p));
      setPreviews([]);
      setShowCreateModal(false);

      // Refresh list
      fetchModels();
      window.dispatchEvent(new Event("fluxo-credits-update"));
    } catch {
      alert("Erro ao criar modelo. Tente novamente.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deletar este modelo? Esta acao nao pode ser desfeita.")) return;
    await fetch("/api/training/list", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchModels();
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "Agora mesmo";
    if (diffMin < 60) return `${diffMin}min atras`;
    if (diffHours < 24) return `${diffHours}h atras`;
    if (diffDays < 7) return `${diffDays}d atras`;
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-shadow">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-white">Fluxo AI</h1>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <Link href="/dashboard" className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors">
                Workflows
              </Link>
              <Link href="/history" className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors">
                Historico
              </Link>
              <Link href="/models" className="px-3 py-1.5 text-sm text-white bg-zinc-800 rounded-lg">
                Meus Modelos
              </Link>
            </nav>
          </div>
          <UserCredits />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Title */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Meus Modelos</h2>
            <p className="text-sm text-zinc-500 mt-1">
              Treine modelos com suas fotos para gerar imagens consistentes
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Treinar Novo Modelo
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-zinc-500">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Carregando...
            </div>
          </div>
        ) : models.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 bg-zinc-900 rounded-2xl flex items-center justify-center mb-4 border border-zinc-800">
              <svg className="w-10 h-10 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <p className="text-zinc-400 text-sm mb-2">Nenhum modelo treinado</p>
            <p className="text-zinc-600 text-xs mb-6 text-center max-w-md">
              Treine um modelo com 10-20 fotos de uma pessoa para gerar imagens consistentes em qualquer cenario
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Treinar Primeiro Modelo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {models.map((model) => (
              <div key={model.id} className="group bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-600 transition-all">
                {/* Thumbnail */}
                <div className="relative aspect-square bg-zinc-800">
                  {model.thumbnail_url ? (
                    <img
                      src={model.thumbnail_url}
                      alt={model.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-700">
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                      </svg>
                    </div>
                  )}

                  {/* Status badge */}
                  <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_STYLES[model.status] || STATUS_STYLES.failed}`}>
                    {STATUS_LABELS[model.status] || model.status}
                  </div>

                  {/* Training spinner */}
                  {model.status === "training" && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <svg className="w-8 h-8 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <h3 className="text-sm font-medium text-zinc-200 truncate">{model.name}</h3>
                  <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">{model.trigger_word}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-zinc-600">{formatDate(model.created_at)}</span>
                    <div className="flex items-center gap-1">
                      {model.status === "ready" && (
                        <Link
                          href="/dashboard"
                          className="text-[10px] px-2 py-0.5 bg-purple-600/20 text-purple-400 rounded-md hover:bg-purple-600/30 transition-colors"
                        >
                          Usar
                        </Link>
                      )}
                      <button
                        onClick={() => handleDelete(model.id)}
                        className="text-zinc-600 hover:text-red-400 transition-colors p-0.5"
                        title="Deletar"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget && !creating) setShowCreateModal(false); }}
        >
          <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10 rounded-t-2xl">
              <div>
                <h3 className="text-lg font-semibold text-white">Treinar Novo Modelo</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Custo: 50 creditos</p>
              </div>
              <button
                onClick={() => !creating && setShowCreateModal(false)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Model Name */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Nome do Modelo
                </label>
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="Ex: Maria Santos, Produto XYZ"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              {/* Trigger Word */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Trigger Word
                  <span className="text-zinc-500 font-normal ml-1">(palavra unica para ativar o modelo)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={triggerWord}
                    onChange={(e) => setTriggerWord(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                    placeholder="Ex: MYCHAR7X"
                    className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 font-mono placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                  <button
                    onClick={() => setTriggerWord(generateTriggerWord())}
                    className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                    title="Gerar nova trigger word"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
                <p className="text-[10px] text-zinc-600 mt-1">
                  Use esta palavra nos seus prompts para ativar o modelo. Ex: &quot;{triggerWord} wearing a red dress&quot;
                </p>
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Fotos de Treino
                  <span className="text-zinc-500 font-normal ml-1">({selectedFiles.length}/30 — minimo 5)</span>
                </label>

                {/* Dropzone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleFilesSelected(e.dataTransfer.files); }}
                  className="border-2 border-dashed border-zinc-700 hover:border-purple-500/50 rounded-xl p-6 text-center cursor-pointer transition-colors"
                >
                  <svg className="w-8 h-8 mx-auto text-zinc-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                  </svg>
                  <p className="text-sm text-zinc-400">Clique ou arraste fotos aqui</p>
                  <p className="text-[10px] text-zinc-600 mt-1">JPG, PNG ou WebP — angulos variados, boa iluminacao</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFilesSelected(e.target.files)}
                  />
                </div>

                {/* Preview grid */}
                {previews.length > 0 && (
                  <div className="grid grid-cols-6 gap-2 mt-3">
                    {previews.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden group">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeFile(i)}
                          className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tips */}
              <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4">
                <p className="text-xs font-medium text-zinc-300 mb-2">Dicas para melhores resultados:</p>
                <ul className="text-[11px] text-zinc-500 space-y-1">
                  <li>• Use 10-20 fotos com angulos e iluminacoes variadas</li>
                  <li>• Inclua close-ups do rosto e fotos de corpo inteiro</li>
                  <li>• Evite fotos com oculos escuros ou muita maquiagem</li>
                  <li>• Resolucao minima recomendada: 1024x1024</li>
                  <li>• O treino demora ~5-20 minutos</li>
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800">
              <button
                onClick={() => !creating && setShowCreateModal(false)}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                disabled={creating}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !modelName.trim() || !triggerWord.trim() || selectedFiles.length < 5}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {creating ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Iniciando treino...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Iniciar Treino (50 creditos)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
