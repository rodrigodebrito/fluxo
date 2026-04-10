"use client";

import { type Node } from "@xyflow/react";
import { AVAILABLE_MODELS } from "@/types/nodes";
import { useState, useEffect } from "react";

interface NodePanelProps {
  node: Node;
  onRun: () => void;
  onClose: () => void;
  onUpdateData: (nodeId: string, data: Record<string, unknown>) => void;
  iteratorCount?: number;
}

const IMAGE_RESOLUTIONS = ["1K", "2K", "4K"];
const VIDEO_RESOLUTIONS = ["720p", "1080p"];
const IMAGE_ASPECT_RATIOS = [
  { value: "auto", label: "Default" },
  { value: "1:1", label: "1:1" },
  { value: "2:3", label: "2:3" },
  { value: "3:2", label: "3:2" },
  { value: "3:4", label: "3:4" },
  { value: "4:3", label: "4:3" },
  { value: "9:16", label: "9:16" },
  { value: "16:9", label: "16:9" },
];
const VIDEO_ASPECT_RATIOS = [
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
];
const VEO_MODELS = [
  { value: "veo3_fast", label: "Fast" },
  { value: "veo3", label: "Quality" },
  { value: "veo3_lite", label: "Lite" },
];
const VEO_DURATIONS = ["4s", "6s", "8s"];
const SD_RESOLUTIONS = ["480p", "720p"];
const SD_MODELS = [
  { value: "bytedance/seedance-2", label: "Seedance 2.0" },
  { value: "bytedance/seedance-2-fast", label: "Seedance Fast" },
];
const SD_ASPECT_RATIOS = [
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
  { value: "1:1", label: "1:1" },
  { value: "4:3", label: "4:3" },
  { value: "3:4", label: "3:4" },
  { value: "21:9", label: "21:9" },
  { value: "adaptive", label: "Adaptive" },
];
const GPT_QUALITIES = [
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];
const GPT_BACKGROUNDS = [
  { value: "opaque", label: "Opaque" },
  { value: "transparent", label: "Transparent" },
];
const GPT_ASPECT_RATIOS = [
  { value: "1:1", label: "1:1" },
  { value: "2:3", label: "2:3" },
  { value: "3:2", label: "3:2" },
];
const KLING_MODES = [
  { value: "std", label: "Standard" },
  { value: "pro", label: "Pro" },
];
const KLING_DURATIONS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const KLING_ASPECT_RATIOS = [
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
  { value: "1:1", label: "1:1" },
];

function ZImageLoraSelector({ loras, onUpdate }: {
  loras: { path: string; scale: number }[];
  onUpdate: (loras: { path: string; scale: number }[]) => void;
}) {
  const [models, setModels] = useState<{ id: string; name: string; trigger_word: string; weights_url: string | null; provider: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/training/list")
      .then((r) => r.json())
      .then((data) => {
        setModels(
          (data.models || []).filter(
            (m: { status: string; provider: string | null; weights_url: string | null }) =>
              m.status === "ready" && m.provider === "fal-zimage" && m.weights_url
          )
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const addFromTrained = (weightsUrl: string) => {
    if (loras.length >= 3) return;
    if (loras.some((l) => l.path === weightsUrl)) return;
    onUpdate([...loras, { path: weightsUrl, scale: 1 }]);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-zinc-300">LoRAs ({loras.length}/3)</span>
      </div>

      {/* Trained models quick-add */}
      {!loading && models.length > 0 && loras.length < 3 && (
        <div className="mb-2">
          <select
            value=""
            onChange={(e) => { if (e.target.value) addFromTrained(e.target.value); }}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-purple-500"
          >
            <option value="">+ Adicionar modelo treinado...</option>
            {models.map((m) => (
              <option key={m.id} value={m.weights_url || ""}>
                {m.name} ({m.trigger_word})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Manual add */}
      {loras.length < 3 && (
        <button
          onClick={() => onUpdate([...loras, { path: "", scale: 1 }])}
          className="text-xs text-purple-400 hover:text-purple-300 mb-2"
        >
          + Adicionar URL manual
        </button>
      )}

      {/* LoRA list */}
      {loras.map((lora, idx) => (
        <div key={idx} className="mb-2 p-2 bg-zinc-800 rounded-lg border border-zinc-700">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-xs text-zinc-400">LoRA {idx + 1}</span>
            <button
              onClick={() => onUpdate(loras.filter((_, i) => i !== idx))}
              className="ml-auto text-xs text-red-400 hover:text-red-300"
            >
              Remover
            </button>
          </div>
          <input
            type="text"
            placeholder="URL do LoRA"
            value={lora.path}
            onChange={(e) => {
              const updated = [...loras];
              updated[idx] = { ...updated[idx], path: e.target.value };
              onUpdate(updated);
            }}
            className="w-full bg-zinc-900 border border-zinc-600 rounded px-2 py-1 text-xs text-zinc-300 mb-1 focus:outline-none focus:border-purple-500"
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">Peso: {lora.scale.toFixed(1)}</span>
            <input
              type="range"
              min={0}
              max={20}
              value={Math.round(lora.scale * 10)}
              onChange={(e) => {
                const updated = [...loras];
                updated[idx] = { ...updated[idx], scale: parseInt(e.target.value) / 10 };
                onUpdate(updated);
              }}
              className="flex-1 accent-purple-500"
            />
          </div>
        </div>
      ))}

      {loras.length === 0 && (
        <p className="text-xs text-zinc-500">
          {loading ? "Carregando..." : models.length === 0
            ? <>Nenhum LoRA Z-Image treinado. <a href="/models" className="text-purple-400 hover:text-purple-300">Treinar um</a></>
            : "Selecione um modelo treinado ou adicione URL manual."
          }
        </p>
      )}
    </div>
  );
}

function TrainedModelSelector({ label, subtitle, selectedId, triggerWord, onSelect, allowEmpty }: {
  label?: string;
  subtitle?: string;
  selectedId: string;
  triggerWord: string;
  onSelect: (id: string, trigger: string) => void;
  allowEmpty?: boolean;
}) {
  const [models, setModels] = useState<{ id: string; name: string; trigger_word: string; thumbnail_url: string | null; status: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/training/list")
      .then((r) => r.json())
      .then((data) => {
        setModels((data.models || []).filter((m: { status: string }) => m.status === "ready"));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-1 mb-2">
          <span className="text-sm text-zinc-300">{label || "Modelo"}</span>
        </div>
        <div className="text-xs text-zinc-500">Carregando modelos...</div>
      </div>
    );
  }

  if (models.length === 0 && !allowEmpty) {
    return (
      <div>
        <div className="flex items-center gap-1 mb-2">
          <span className="text-sm text-zinc-300">{label || "Modelo"}</span>
        </div>
        <div className="text-xs text-zinc-500 mb-2">Nenhum modelo treinado</div>
        <a href="/models" className="text-xs text-purple-400 hover:text-purple-300">
          → Treinar um modelo
        </a>
      </div>
    );
  }

  if (models.length === 0 && allowEmpty) return null;

  return (
    <div>
      <div className="flex flex-col mb-2">
        <span className="text-sm text-zinc-300">{label || "Modelo Treinado"}</span>
        {subtitle && <span className="text-[10px] text-zinc-500">{subtitle}</span>}
      </div>
      <select
        value={selectedId}
        onChange={(e) => {
          const m = models.find((m) => m.id === e.target.value);
          onSelect(e.target.value, m?.trigger_word || "");
        }}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-purple-500"
      >
        <option value="">{allowEmpty ? "Nenhum" : "Selecione um modelo..."}</option>
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name} ({m.trigger_word})
          </option>
        ))}
      </select>
      {triggerWord && (
        <p className="text-[10px] text-zinc-500 mt-1.5">
          {allowEmpty ? "Trigger" : "Use"} <span className="text-purple-400 font-mono">{triggerWord}</span> {allowEmpty ? "" : "no prompt para ativar"}
        </p>
      )}
    </div>
  );
}

export default function NodePanel({ node, onRun, onClose, onUpdateData, iteratorCount = 0 }: NodePanelProps) {
  const model = (node.data.model as string) || "nano-banana-pro";
  const resolution = (node.data.resolution as string) || "1K";
  const aspectRatio = (node.data.aspectRatio as string) || "auto";
  const seed = (node.data.seed as number | null) ?? null;
  const randomSeed = (node.data.randomSeed as boolean) ?? true;
  const runs = (node.data.runs as number) || 1;
  const isRunning = (node.data.isRunning as boolean) || false;

  // Veo-specific
  const veoModel = (node.data.veoModel as string) || "veo3_fast";
  const duration = (node.data.duration as string) || "8s";
  const enhancePrompt = (node.data.enhancePrompt as boolean) ?? true;

  // Seedance-specific
  const sdResolution = (node.data.sdResolution as string) || "720p";
  const sdDuration = (node.data.sdDuration as number) || 8;
  const sdModel = (node.data.sdModel as string) || "bytedance/seedance-2";
  const generateAudio = (node.data.generateAudio as boolean) ?? true;
  const webSearch = (node.data.webSearch as boolean) ?? false;
  const fixedLens = (node.data.fixedLens as boolean) ?? false;
  const isSeedance = model === "seedance";
  const isKling = model === "kling" || model === "kling-o3-i2v" || model === "kling-o3-edit" || model === "kling-o1-ref";
  const isGptImage = model === "gpt-image-txt" || model === "gpt-image-img";
  const isMotion = model === "kling-motion";

  // GPT Image-specific
  const gptQuality = (node.data.gptQuality as string) || "medium";
  const gptBackground = (node.data.gptBackground as string) || "opaque";

  // Flux 2
  const isFlux = model === "flux-2-pro" || model === "flux-2-edit";
  const fluxImageSize = (node.data.fluxImageSize as string) || "landscape_4_3";

  // Kling-specific
  const klingMode = (node.data.klingMode as string) || "std";
  const klingDuration = (node.data.klingDuration as number) || 5;

  // fal.ai models
  const cfgScale = (node.data.cfgScale as number) ?? 0.5;
  const keepAudio = (node.data.keepAudio as boolean) ?? true;
  const klingO3Duration = (node.data.klingO3Duration as number) || 5;
  const klingO1Duration = (node.data.klingO1Duration as number) || 5;
  const falTier = (node.data.falTier as string) || "pro";

  // Motion Control
  const motionVersion = (node.data.motionVersion as string) || "2.6";
  const motionMode = (node.data.motionMode as string) || "720p";
  const characterOrientation = (node.data.characterOrientation as string) || "video";

  // Wan 2.1 I2V
  const wanResolution = (node.data.wanResolution as string) || "720p";
  const wanDuration = (node.data.wanDuration as number) || 5;
  const promptExtend = (node.data.promptExtend as boolean) ?? true;
  const isWan = model === "wan-i2v";

  // Grok Imagine
  const grokResolution = (node.data.grokResolution as string) || "480p";
  const grokDuration = (node.data.grokDuration as number) || 6;
  const grokMode = (node.data.grokMode as string) || "normal";

  // Z-Image Turbo
  const isZimage = model === "zimage-t2i" || model === "zimage-i2i" || model === "zimage-lora" || model === "zimage-i2i-lora";
  const zimageSize = (node.data.zimageSize as string) || "landscape_4_3";
  const zimageSteps = (node.data.zimageSteps as number) || 8;
  const zimageAcceleration = (node.data.zimageAcceleration as string) || "regular";
  const zimageSafety = (node.data.zimageSafety as boolean) ?? false;
  const zimageStrength = (node.data.zimageStrength as number) ?? 0.6;
  const zimageLoras = (node.data.zimageLoras as { path: string; scale: number }[]) || [];

  // Kling Avatar TTS
  const isAvatar = model === "kling-avatar";
  const avatarTier = (node.data.avatarTier as string) || "standard";
  const avatarText = (node.data.avatarText as string) || "";
  const avatarVoice = (node.data.avatarVoice as string) || "Lily";
  const avatarSpeed = (node.data.avatarSpeed as number) ?? 1.0;

  // Multi-Shot
  const multiShotEnabled = (node.data.multiShotEnabled as boolean) ?? false;
  const multiShots = (node.data.multiShots as { prompt: string; duration: number }[]) || [];
  const totalShotDuration = multiShots.reduce((s, shot) => s + shot.duration, 0);
  const maxShotDuration = model === "kling" ? 12 : 15;

  const selectedModel = AVAILABLE_MODELS.find((m) => m.id === model);
  const isVideo = selectedModel?.type === "video";
  // Custo dinamico
  const baseCost = selectedModel?.costPerRun || 18;
  let costPerRun = baseCost;
  if (model === "nano-banana-pro" && resolution === "4K") costPerRun = 24;
  if ((model === "gpt-image-txt" || model === "gpt-image-img") && gptQuality === "high") costPerRun = 22;
  if (model === "veo3") { if (veoModel === "veo3_lite") costPerRun = 30; else if (veoModel === "veo3") costPerRun = 250; }
  if (model === "seedance") {
    const isFast = sdModel === "bytedance/seedance-2-fast";
    const perSec = isFast ? 33 : 41;
    costPerRun = perSec * sdDuration;
  }
  if (model === "kling") {
    const perSec = klingMode === "pro" ? (generateAudio ? 27 : 18) : (generateAudio ? 20 : 14);
    const dur = multiShotEnabled && multiShots.length > 0 ? totalShotDuration : klingDuration;
    costPerRun = perSec * dur;
  }
  if (model === "kling-o3-i2v") {
    const isPro = falTier === "pro";
    const perSec = isPro
      ? (generateAudio ? 28 : 23)
      : (generateAudio ? 23 : 17);
    const dur = multiShotEnabled && multiShots.length > 0 ? totalShotDuration : klingO3Duration;
    costPerRun = perSec * dur;
  }
  if (model === "kling-o3-edit") {
    const isPro = falTier === "pro";
    const editDur = (node.data.videoDuration as number) || 5;
    costPerRun = (isPro ? 34 : 26) * editDur;
  }
  if (model === "kling-o1-ref") {
    const isPro = falTier === "pro";
    const perSec = isPro
      ? (generateAudio ? 28 : 23)
      : (generateAudio ? 23 : 17);
    const multiShots = (node.data.multiShots as { prompt: string; duration: number }[]) || [];
    const msEnabled = (node.data.multiShotEnabled as boolean) ?? false;
    const refDur = (msEnabled && multiShots.length > 0)
      ? multiShots.reduce((s, shot) => s + shot.duration, 0)
      : klingO1Duration;
    costPerRun = perSec * refDur;
  }
  if (isFlux) {
    const hdSizes = ["square_hd", "portrait_16_9", "landscape_16_9"];
    costPerRun = hdSizes.includes(fluxImageSize) ? 9 : 6;
  }
  if (isWan) {
    // 720p: 16 cred/s, 1080p: 24 cred/s
    const wanPerSec = wanResolution === "1080p" ? 24 : 16;
    costPerRun = wanPerSec * wanDuration;
  }
  if (isAvatar) {
    // Standard: 8 cred/s, Pro: 16 cred/s (1:1 com Kie.ai)
    const avatarPerSec = avatarTier === "pro" ? 16 : 8;
    costPerRun = avatarPerSec * 5; // estimativa 5s, real calculado na execucao
  }
  if (model === "grok-i2v") {
    const grokPerSec = grokResolution === "720p" ? 3 : 1.6;
    costPerRun = Math.ceil(grokPerSec * grokDuration);
  }
  if (model === "custom-model") {
    costPerRun = 10 * ((node.data.customNumOutputs as number) || 1);
  }
  if (model === "zimage-t2i" || model === "zimage-i2i") {
    // $0.005/MP ~ 1MP padrao = 2 cred
    const hdSizes = ["square_hd", "portrait_16_9", "landscape_16_9"];
    costPerRun = hdSizes.includes(zimageSize) ? 3 : 2;
  }
  if (model === "zimage-lora" || model === "zimage-i2i-lora") {
    // $0.0085/MP ~ 1MP padrao = 3 cred
    const hdSizes = ["square_hd", "portrait_16_9", "landscape_16_9"];
    costPerRun = hdSizes.includes(zimageSize) ? 5 : 3;
  }
  const connectedVideoDuration = (node.data.connectedVideoDuration as number) || 0;
  if (isMotion) {
    const is3 = motionVersion === "3.0";
    const is1080 = motionMode === "1080p";
    const motionPerSec = is3 ? (is1080 ? 27 : 20) : (is1080 ? 9 : 6);
    costPerRun = motionPerSec * (connectedVideoDuration || 10);
  }
  const multiplier = iteratorCount > 0 ? iteratorCount : 1;
  const totalCost = costPerRun * runs * multiplier;
  const params = selectedModel?.params || [];

  const update = (data: Record<string, unknown>) => {
    onUpdateData(node.id, data);
  };

  return (
    <div className="w-72 bg-zinc-900 border-l border-zinc-800 flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2 min-w-0">
          {isVideo ? (
            <span className="text-red-400 text-sm">G</span>
          ) : (
            <span className="text-purple-400 text-sm">✦</span>
          )}
          <span className="text-sm font-medium text-zinc-200 truncate">
            {selectedModel?.name || "Modelo"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">✳ {totalCost}</span>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-lg leading-none">×</button>
        </div>
      </div>

      {/* Parameters */}
      <div className="flex-1 p-4 space-y-5">

        {/* Veo Model Type */}
        {params.includes("veoModel") && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm text-zinc-300">Model type</span>
              <span className="text-zinc-500 text-xs cursor-help" title="Fast = rapido e barato, Quality = melhor qualidade, Lite = economico">i</span>
            </div>
            <select
              value={veoModel}
              onChange={(e) => update({ veoModel: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-purple-500"
            >
              {VEO_MODELS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Kling Mode */}
        {params.includes("klingMode") && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm text-zinc-300">Model</span>
              <span className="text-zinc-500 text-xs cursor-help" title="Standard = mais rapido, Pro = melhor qualidade">i</span>
            </div>
            <select
              value={klingMode}
              onChange={(e) => update({ klingMode: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-purple-500"
            >
              {KLING_MODES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Kling Duration — hidden when multishot ON */}
        {params.includes("klingDuration") && !multiShotEnabled && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm text-zinc-300">Duration</span>
              <span className="text-zinc-500 text-xs cursor-help" title="Duracao do video em segundos (3-15)">i</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={3}
                max={15}
                step={1}
                value={klingDuration}
                onChange={(e) => update({ klingDuration: parseInt(e.target.value) })}
                className="flex-1 accent-purple-500"
              />
              <span className="text-sm text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1 min-w-[40px] text-center">
                {klingDuration}
              </span>
            </div>
          </div>
        )}

        {/* fal.ai Tier (Standard/Pro) */}
        {params.includes("falTier") && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm text-zinc-300">Quality</span>
              <span className="text-zinc-500 text-xs cursor-help" title="Standard = mais rapido e barato, Pro = melhor qualidade">i</span>
            </div>
            <select
              value={falTier}
              onChange={(e) => update({ falTier: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-purple-500"
            >
              <option value="std">Standard</option>
              <option value="pro">Pro</option>
            </select>
          </div>
        )}

        {/* Kling O3 Duration (3-15s) — hidden when multishot ON */}
        {params.includes("klingO3Duration") && !multiShotEnabled && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm text-zinc-300">Duration</span>
              <span className="text-zinc-500 text-xs cursor-help" title="Duracao do video em segundos (3-15)">i</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={3}
                max={15}
                step={1}
                value={klingO3Duration}
                onChange={(e) => update({ klingO3Duration: parseInt(e.target.value) })}
                className="flex-1 accent-purple-500"
              />
              <span className="text-sm text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1 min-w-[40px] text-center">
                {klingO3Duration}
              </span>
            </div>
          </div>
        )}

        {/* Kling O3 Ref Duration (3-15s) */}
        {params.includes("klingO1Duration") && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm text-zinc-300">Duration</span>
              <span className="text-zinc-500 text-xs cursor-help" title="Duracao do video em segundos (3-15)">i</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={3}
                max={15}
                step={1}
                value={klingO1Duration}
                onChange={(e) => update({ klingO1Duration: parseInt(e.target.value) })}
                className="flex-1 accent-purple-500"
              />
              <span className="text-sm text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1 min-w-[40px] text-center">
                {klingO1Duration}
              </span>
            </div>
          </div>
        )}

        {/* Multi-Shot */}
        {params.includes("multiShots") && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-sm text-zinc-300">Multi-Shot</span>
                <span className="text-zinc-500 text-xs cursor-help" title="Dividir o video em multiplas cenas, cada uma com prompt e duracao proprios">i</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={multiShotEnabled}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    update({
                      multiShotEnabled: enabled,
                      multiShots: enabled && multiShots.length === 0
                        ? [{ prompt: "", duration: 5 }]
                        : multiShots,
                      ...(enabled ? { generateAudio: true } : {}),
                    });
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600" />
              </label>
            </div>

            {multiShotEnabled && (
              <div className="space-y-2">
                {multiShots.map((shot, idx) => (
                  <div key={idx} className="bg-zinc-800 border border-zinc-700 rounded-lg p-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-purple-400 font-medium">Shot {idx + 1}</span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={1}
                            max={maxShotDuration}
                            value={shot.duration}
                            onChange={(e) => {
                              const newShots = [...multiShots];
                              newShots[idx] = { ...newShots[idx], duration: Math.max(1, Math.min(maxShotDuration, parseInt(e.target.value) || 1)) };
                              update({ multiShots: newShots });
                            }}
                            className="w-12 bg-zinc-900 border border-zinc-600 rounded px-1.5 py-0.5 text-xs text-zinc-300 text-center focus:outline-none focus:border-purple-500"
                          />
                          <span className="text-xs text-zinc-500">s</span>
                        </div>
                        {multiShots.length > 1 && (
                          <button
                            onClick={() => {
                              const newShots = multiShots.filter((_, i) => i !== idx);
                              update({ multiShots: newShots });
                            }}
                            className="text-zinc-500 hover:text-red-400 text-xs"
                          >
                            x
                          </button>
                        )}
                      </div>
                    </div>
                    <textarea
                      value={shot.prompt}
                      onChange={(e) => {
                        const newShots = [...multiShots];
                        newShots[idx] = { ...newShots[idx], prompt: e.target.value };
                        update({ multiShots: newShots });
                      }}
                      placeholder={`Descreva a cena ${idx + 1}...`}
                      rows={2}
                      className="w-full bg-zinc-900 border border-zinc-600 rounded px-2 py-1 text-xs text-zinc-300 placeholder:text-zinc-500 focus:outline-none focus:border-purple-500 resize-none"
                    />
                  </div>
                ))}

                <button
                  onClick={() => update({ multiShots: [...multiShots, { prompt: "", duration: 3 }] })}
                  className="w-full text-xs text-purple-400 hover:text-purple-300 border border-dashed border-zinc-700 hover:border-purple-500/50 rounded-lg py-1.5 transition-colors"
                >
                  + Add Shot
                </button>

                <div className={`flex items-center justify-between text-xs px-1 ${totalShotDuration > 15 ? "text-red-400" : "text-zinc-400"}`}>
                  <span>Total: {totalShotDuration}s / 15s</span>
                  {totalShotDuration > 15 && <span className="text-red-400 font-medium">Excede limite!</span>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Motion Control Version */}
        {params.includes("motionVersion") && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm text-zinc-300">Kling Version</span>
              <span className="text-zinc-500 text-xs cursor-help" title="Kling 2.6 = mais barato, Kling 3.0 = melhor qualidade">i</span>
            </div>
            <select
              value={motionVersion}
              onChange={(e) => update({ motionVersion: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-purple-500"
            >
              <option value="2.6">Kling 2.6</option>
              <option value="3.0">Kling 3.0</option>
            </select>
          </div>
        )}

        {/* Motion Mode (resolution) */}
        {params.includes("motionMode") && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm text-zinc-300">Resolution</span>
              <span className="text-zinc-500 text-xs cursor-help" title="720p = mais rapido e barato, 1080p = melhor qualidade">i</span>
            </div>
            <select
              value={motionMode}
              onChange={(e) => update({ motionMode: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-purple-500"
            >
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
            </select>
          </div>
        )}

        {/* Character Orientation */}
        {params.includes("characterOrientation") && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm text-zinc-300">Character Orientation</span>
              <span className="text-zinc-500 text-xs cursor-help" title="Image = personagem na imagem (max 10s), Video = personagem no video (max 30s)">i</span>
            </div>
            <select
              value={characterOrientation}
              onChange={(e) => update({ characterOrientation: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-purple-500"
            >
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
          </div>
        )}

        {/* Motion cost info */}
        {isMotion && (
          <div className="text-xs text-zinc-500 bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2">
            <span className="text-zinc-400">{motionVersion === "3.0" ? (motionMode === "1080p" ? 27 : 20) : (motionMode === "1080p" ? 9 : 6)}</span> credits/s
            {connectedVideoDuration > 0
              ? <> × <span className="text-zinc-300">{connectedVideoDuration}s</span> = <span className="text-purple-400">{costPerRun}</span> credits</>
              : <> — conecte um video pra ver o custo exato</>
            }
          </div>
        )}

        {/* CFG Scale (Kling O3 i2v) */}
        {params.includes("cfgScale") && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm text-zinc-300">CFG Scale</span>
              <span className="text-zinc-500 text-xs cursor-help" title="Aderencia ao prompt (0 = mais criativo, 1 = mais fiel ao prompt)">i</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={cfgScale}
                onChange={(e) => update({ cfgScale: parseFloat(e.target.value) })}
                className="flex-1 accent-purple-500"
              />
              <span className="text-sm text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1 min-w-[40px] text-center">
                {cfgScale.toFixed(1)}
              </span>
            </div>
          </div>
        )}

        {/* Keep Audio (fal.ai video-to-video) */}
        {params.includes("keepAudio") && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={keepAudio}
              onChange={(e) => update({ keepAudio: e.target.checked })}
              className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
            />
            <span className="text-sm text-zinc-300">Keep Original Audio</span>
            <span className="text-zinc-500 text-xs cursor-help" title="Manter o audio original do video de entrada">i</span>
          </label>
        )}

        {/* Enhance Prompt (Veo) */}
        {params.includes("enhancePrompt") && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enhancePrompt}
              onChange={(e) => update({ enhancePrompt: e.target.checked })}
              className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
            />
            <span className="text-sm text-zinc-300">Enhance Prompt</span>
            <span className="text-zinc-500 text-xs cursor-help" title="Auto-traduz e melhora o prompt para melhores resultados">i</span>
          </label>
        )}

        {/* GPT Image Quality */}
        {params.includes("gptQuality") && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm text-zinc-300">Quality</span>
              <span className="text-zinc-500 text-xs cursor-help" title="Medium = balanceado, High = mais detalhado">i</span>
            </div>
            <select
              value={gptQuality}
              onChange={(e) => update({ gptQuality: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-purple-500"
            >
              {GPT_QUALITIES.map((q) => (
                <option key={q.value} value={q.value}>{q.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* GPT Image Background (text-to-image only) */}
        {params.includes("gptBackground") && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm text-zinc-300">Background</span>
              <span className="text-zinc-500 text-xs cursor-help" title="Transparent = fundo transparente (PNG), Opaque = fundo solido">i</span>
            </div>
            <select
              value={gptBackground}
              onChange={(e) => update({ gptBackground: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-purple-500"
            >
              {GPT_BACKGROUNDS.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Upscale Scale */}
        {params.includes("upscaleScale") && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm text-zinc-300">Escala</span>
            </div>
            <select
              value={(node.data.upscaleScale as number) || 2}
              onChange={(e) => update({ upscaleScale: parseInt(e.target.value) })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-purple-500"
            >
              <option value={2}>2x</option>
              <option value={4}>4x</option>
            </select>
          </div>
        )}

        {/* Audio Format */}
        {params.includes("audioFormat") && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm text-zinc-300">Formato</span>
            </div>
            <select
              value={(node.data.audioFormat as string) || "mp3"}
              onChange={(e) => update({ audioFormat: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-purple-500"
            >
              <option value="mp3">MP3</option>
              <option value="wav">WAV</option>
            </select>
            <p className="text-[10px] text-zinc-500 mt-1">Custo: 1 credito</p>
          </div>
        )}

        {/* Trained Model Selection */}
        {params.includes("trainedModel") && (
          <>
            <TrainedModelSelector
              label="Modelo Principal"
              selectedId={(node.data.trainedModelId as string) || ""}
              triggerWord={(node.data.trainedModelTrigger as string) || ""}
              onSelect={(id, trigger) => update({ trainedModelId: id, trainedModelTrigger: trigger })}
            />
            {/* Main model weight - advanced */}
            <details className="mb-1 -mt-1">
              <summary className="text-[10px] text-zinc-500 cursor-pointer hover:text-zinc-400 select-none">Advanced</summary>
              <div className="mt-1.5 px-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-zinc-400">Forca</span>
                  <span className="text-[10px] text-purple-400 font-mono">{((node.data.mainLoraScale as number) ?? 1).toFixed(1)}</span>
                </div>
                <input
                  type="range" min="0" max="1" step="0.1"
                  value={(node.data.mainLoraScale as number) ?? 1}
                  onChange={(e) => update({ mainLoraScale: parseFloat(e.target.value) })}
                  className="w-full h-1.5 rounded-full appearance-none bg-zinc-700 accent-purple-500 nodrag"
                />
                <div className="flex justify-between text-[9px] text-zinc-600 mt-0.5">
                  <span>Fraco</span><span>Forte</span>
                </div>
              </div>
            </details>


            {/* Extra LoRAs - dynamic list */}
            {((node.data.extraLoras as { id: string; trigger: string }[]) || []).map((lora, idx) => (
              <div key={idx} className="relative">
                <TrainedModelSelector
                  label={`LoRA Extra ${idx + 1}`}
                  subtitle="Ex: produto, roupa, estilo"
                  selectedId={lora.id}
                  triggerWord={lora.trigger}
                  onSelect={(id, trigger) => {
                    const loras = [...((node.data.extraLoras as { id: string; trigger: string }[]) || [])];
                    loras[idx] = { id, trigger };
                    update({ extraLoras: loras });
                  }}
                  allowEmpty
                />
                <button
                  onClick={() => {
                    const loras = [...((node.data.extraLoras as { id: string; trigger: string }[]) || [])];
                    loras.splice(idx, 1);
                    update({ extraLoras: loras });
                  }}
                  className="absolute top-0 right-0 text-zinc-500 hover:text-red-400 text-xs"
                  title="Remover LoRA"
                >
                  x
                </button>
              </div>
            ))}
            {((node.data.extraLoras as { id: string; trigger: string }[]) || []).length < 16 && (
              <button
                onClick={() => {
                  const loras = [...((node.data.extraLoras as { id: string; trigger: string }[]) || [])];
                  loras.push({ id: "", trigger: "" });
                  update({ extraLoras: loras });
                }}
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                + Adicionar LoRA Extra
              </button>
            )}
          </>
        )}

        {/* Custom Aspect Ratio */}
        {params.includes("customAspectRatio") && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm text-zinc-300">Aspecto</span>
            </div>
            <select
              value={(node.data.customAspectRatio as string) || "1:1"}
              onChange={(e) => update({ customAspectRatio: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-purple-500"
            >
              <option value="1:1">1:1 (Quadrado)</option>
              <option value="16:9">16:9 (Paisagem)</option>
              <option value="9:16">9:16 (Retrato)</option>
              <option value="4:3">4:3</option>
              <option value="3:4">3:4</option>
            </select>
          </div>
        )}

        {/* Custom Num Outputs */}
        {params.includes("customNumOutputs") && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm text-zinc-300">Quantidade</span>
              <span className="text-zinc-500 text-xs cursor-help" title="Cada imagem adicional custa 10 creditos">i</span>
            </div>
            <select
              value={(node.data.customNumOutputs as number) || 1}
              onChange={(e) => update({ customNumOutputs: parseInt(e.target.value) })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-purple-500"
            >
              <option value={1}>1 imagem</option>
              <option value={2}>2 imagens</option>
              <option value={3}>3 imagens</option>
              <option value={4}>4 imagens</option>
            </select>
          </div>
        )}

        {/* Flux Image Size */}
        {params.includes("fluxImageSize") && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm text-zinc-300">Tamanho</span>
              <span className="text-zinc-500 text-xs cursor-help" title="HD = mais caro (9 cred). Padrao = 6 cred">i</span>
            </div>
            <select
              value={fluxImageSize}
              onChange={(e) => update({ fluxImageSize: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-purple-500"
            >
              <option value="auto">Auto</option>
              <option value="square">Square (1:1)</option>
              <option value="square_hd">Square HD (1:1)</option>
              <option value="landscape_4_3">Landscape 4:3</option>
              <option value="landscape_16_9">Landscape 16:9 (HD)</option>
              <option value="portrait_4_3">Portrait 4:3</option>
              <option value="portrait_16_9">Portrait 16:9 (HD)</option>
            </select>
          </div>
        )}

        {/* Z-Image Size */}
        {params.includes("zimageSize") && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm text-zinc-300">Tamanho</span>
              <span className="text-zinc-500 text-xs cursor-help" title="HD = mais caro. Padrao = mais barato">i</span>
            </div>
            <select
              value={zimageSize}
              onChange={(e) => update({ zimageSize: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-purple-500"
            >
              <option value="auto">Auto</option>
              <option value="square">Square (1:1)</option>
              <option value="square_hd">Square HD (1:1)</option>
              <option value="landscape_4_3">Landscape 4:3</option>
              <option value="landscape_16_9">Landscape 16:9 (HD)</option>
              <option value="portrait_4_3">Portrait 4:3</option>
              <option value="portrait_16_9">Portrait 16:9 (HD)</option>
            </select>
          </div>
        )}

        {/* Z-Image Steps */}
        {params.includes("zimageSteps") && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm text-zinc-300">Steps: {zimageSteps}</span>
              <span className="text-zinc-500 text-xs cursor-help" title="Mais steps = mais qualidade, mais lento (1-8)">i</span>
            </div>
            <input
              type="range"
              min={1}
              max={8}
              value={zimageSteps}
              onChange={(e) => update({ zimageSteps: parseInt(e.target.value) })}
              className="w-full accent-purple-500"
            />
          </div>
        )}

        {/* Z-Image Strength (I2I only) */}
        {params.includes("zimageStrength") && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm text-zinc-300">Forca: {Math.round(zimageStrength * 100)}%</span>
              <span className="text-zinc-500 text-xs cursor-help" title="Quanto mais alto, mais transforma a imagem original (0-100%)">i</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(zimageStrength * 100)}
              onChange={(e) => update({ zimageStrength: parseInt(e.target.value) / 100 })}
              className="w-full accent-purple-500"
            />
          </div>
        )}

        {/* Z-Image Acceleration */}
        {params.includes("zimageAcceleration") && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm text-zinc-300">Aceleracao</span>
            </div>
            <select
              value={zimageAcceleration}
              onChange={(e) => update({ zimageAcceleration: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-purple-500"
            >
              <option value="none">Nenhuma</option>
              <option value="regular">Regular</option>
              <option value="high">Alta</option>
            </select>
          </div>
        )}

        {/* Z-Image Safety Checker */}
        {params.includes("zimageSafety") && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-sm text-zinc-300">Filtro NSFW</span>
              <span className="text-zinc-500 text-xs cursor-help" title="Desligado = sem censura">i</span>
            </div>
            <button
              onClick={() => update({ zimageSafety: !zimageSafety })}
              className={`w-10 h-5 rounded-full transition-colors ${zimageSafety ? "bg-purple-600" : "bg-zinc-700"}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${zimageSafety ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
        )}

        {/* Z-Image LoRAs */}
        {params.includes("zimageLoras") && (
          <ZImageLoraSelector
            loras={zimageLoras}
            onUpdate={(updated) => update({ zimageLoras: updated })}
          />
        )}

        {/* Aspect Ratio */}
        {params.includes("aspectRatio") && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm text-zinc-300">Aspect Ratio</span>
              <span className="text-zinc-500 text-xs cursor-help" title="Proporcao do resultado">i</span>
            </div>
            <select
              value={aspectRatio}
              onChange={(e) => update({ aspectRatio: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-purple-500"
            >
              {(isGptImage ? GPT_ASPECT_RATIOS : (isKling || isMotion) ? KLING_ASPECT_RATIOS : isSeedance ? SD_ASPECT_RATIOS : isVideo ? VIDEO_ASPECT_RATIOS : IMAGE_ASPECT_RATIOS).map((ar) => (
                <option key={ar.value} value={ar.value}>{ar.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Duration (Veo) */}
        {params.includes("duration") && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm text-zinc-300">Duration</span>
              <span className="text-zinc-500 text-xs cursor-help" title="Duracao do video">i</span>
            </div>
            <select
              value={duration}
              onChange={(e) => update({ duration: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-purple-500"
            >
              {VEO_DURATIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        )}

        {/* Resolution */}
        {params.includes("resolution") && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm text-zinc-300">Resolution</span>
              <span className="text-zinc-500 text-xs cursor-help" title="Resolucao do resultado">i</span>
            </div>
            <select
              value={resolution}
              onChange={(e) => update({ resolution: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-purple-500"
            >
              {(isVideo ? VIDEO_RESOLUTIONS : IMAGE_RESOLUTIONS).map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        )}

        {/* Seedance Resolution */}
        {params.includes("sdResolution") && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm text-zinc-300">Resolution</span>
              <span className="text-zinc-500 text-xs cursor-help" title="Resolucao do video">i</span>
            </div>
            <select
              value={sdResolution}
              onChange={(e) => update({ sdResolution: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-purple-500"
            >
              {SD_RESOLUTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        )}

        {/* Seedance Model */}
        {isSeedance && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm text-zinc-300">Model</span>
              <span className="text-zinc-500 text-xs cursor-help" title="Seedance 2.0 = melhor qualidade, Fast = mais rapido e barato">i</span>
            </div>
            <select
              value={sdModel}
              onChange={(e) => update({ sdModel: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-purple-500"
            >
              {SD_MODELS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Seedance Duration */}
        {params.includes("sdDuration") && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm text-zinc-300">Duration</span>
              <span className="text-zinc-500 text-xs cursor-help" title="Duracao do video em segundos (4-15)">i</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={4}
                max={15}
                step={1}
                value={sdDuration}
                onChange={(e) => update({ sdDuration: parseInt(e.target.value) })}
                className="flex-1 accent-purple-500"
              />
                <span className="text-sm text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1 min-w-[40px] text-center">
                  {sdDuration}
                </span>
              </div>
          </div>
        )}

        {/* Wan Resolution */}
        {params.includes("wanResolution") && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm text-zinc-300">Resolution</span>
              <span className="text-zinc-500 text-xs cursor-help" title="720p: 16 cred/s, 1080p: 24 cred/s">i</span>
            </div>
            <select
              value={wanResolution}
              onChange={(e) => update({ wanResolution: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200"
            >
              <option value="720p">720p (16 cred/s)</option>
              <option value="1080p">1080p (24 cred/s)</option>
            </select>
          </div>
        )}

        {/* Wan Duration (seconds) */}
        {params.includes("wanDuration") && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm text-zinc-300">Duracao</span>
              <span className="text-zinc-500 text-xs cursor-help" title="Duracao do video em segundos (2-15s)">i</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={2}
                max={15}
                step={1}
                value={wanDuration}
                onChange={(e) => update({ wanDuration: parseInt(e.target.value) })}
                className="flex-1 accent-purple-500"
              />
              <span className="text-sm text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1 min-w-[50px] text-center">
                {wanDuration}s
              </span>
            </div>
          </div>
        )}

        {/* Wan Prompt Extend */}
        {params.includes("promptExtend") && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={promptExtend}
              onChange={(e) => update({ promptExtend: e.target.checked })}
              className="accent-purple-500"
            />
            <span className="text-sm text-zinc-300">Prompt Extend</span>
            <span className="text-zinc-500 text-xs cursor-help" title="Reescreve o prompt automaticamente para melhor qualidade">i</span>
          </label>
        )}

        {/* Grok Resolution */}
        {params.includes("grokResolution") && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm text-zinc-300">Resolution</span>
              <span className="text-zinc-500 text-xs cursor-help" title="480p: 1.6 cred/s, 720p: 3 cred/s">i</span>
            </div>
            <select
              value={grokResolution}
              onChange={(e) => update({ grokResolution: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200"
            >
              <option value="480p">480p (economico)</option>
              <option value="720p">720p (melhor qualidade)</option>
            </select>
          </div>
        )}

        {/* Grok Duration */}
        {params.includes("grokDuration") && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm text-zinc-300">Duracao</span>
              <span className="text-zinc-500 text-xs cursor-help" title="Duracao do video em segundos (6-30s)">i</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={6}
                max={30}
                step={1}
                value={grokDuration}
                onChange={(e) => update({ grokDuration: parseInt(e.target.value) })}
                className="flex-1 accent-purple-500"
              />
              <span className="text-sm text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1 min-w-[50px] text-center">
                {grokDuration}s
              </span>
            </div>
          </div>
        )}

        {/* Grok Mode */}
        {params.includes("grokMode") && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm text-zinc-300">Mode</span>
              <span className="text-zinc-500 text-xs cursor-help" title="Fun: mais expressivo, Normal: equilibrado, Spicy: artistico/ousado">i</span>
            </div>
            <select
              value={grokMode}
              onChange={(e) => update({ grokMode: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200"
            >
              <option value="fun">Fun</option>
              <option value="normal">Normal</option>
              <option value="spicy">Spicy</option>
            </select>
          </div>
        )}

        {/* Avatar Tier */}
        {params.includes("avatarTier") && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm text-zinc-300">Qualidade</span>
              <span className="text-zinc-500 text-xs cursor-help" title="Standard: 720p ($0.04/s), Pro: 1080p ($0.08/s)">i</span>
            </div>
            <select
              value={avatarTier}
              onChange={(e) => update({ avatarTier: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200"
            >
              <option value="standard">Standard (720p)</option>
              <option value="pro">Pro (1080p)</option>
            </select>
          </div>
        )}

        {/* Avatar Text (TTS) */}
        {params.includes("avatarText") && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm text-zinc-300">Texto para fala (TTS)</span>
              <span className="text-zinc-500 text-xs cursor-help" title="Se nao conectar um Audio Input, digite o texto aqui e o sistema gera a voz automaticamente via ElevenLabs">i</span>
            </div>
            <textarea
              value={avatarText}
              onChange={(e) => update({ avatarText: e.target.value })}
              placeholder="Digite o texto que o avatar vai falar... (ou conecte um Audio Input)"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 min-h-[80px] resize-y"
            />
          </div>
        )}

        {/* Avatar Voice */}
        {params.includes("avatarVoice") && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm text-zinc-300">Voz</span>
            </div>
            <select
              value={avatarVoice}
              onChange={(e) => update({ avatarVoice: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200"
            >
              <option value="Rachel">Rachel (feminina, calma)</option>
              <option value="Aria">Aria (feminina, expressiva)</option>
              <option value="Sarah">Sarah (feminina, suave)</option>
              <option value="Laura">Laura (feminina, forte)</option>
              <option value="Lily">Lily (feminina, natural)</option>
              <option value="Charlotte">Charlotte (feminina, elegante)</option>
              <option value="Alice">Alice (feminina, confiante)</option>
              <option value="Matilda">Matilda (feminina, calorosa)</option>
              <option value="Jessica">Jessica (feminina, animada)</option>
              <option value="Roger">Roger (masculino, autoritário)</option>
              <option value="Liam">Liam (masculino, jovem)</option>
              <option value="Brian">Brian (masculino, natural)</option>
              <option value="Daniel">Daniel (masculino, britânico)</option>
              <option value="Charlie">Charlie (masculino, casual)</option>
              <option value="George">George (masculino, maduro)</option>
              <option value="Callum">Callum (masculino, intenso)</option>
              <option value="Will">Will (masculino, amigável)</option>
              <option value="Eric">Eric (masculino, claro)</option>
              <option value="Chris">Chris (masculino, enérgico)</option>
              <option value="Bill">Bill (masculino, grave)</option>
              <option value="River">River (não-binário, suave)</option>
            </select>
          </div>
        )}

        {/* Avatar Speed */}
        {params.includes("avatarSpeed") && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm text-zinc-300">Velocidade da fala</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0.7}
                max={1.2}
                step={0.05}
                value={avatarSpeed}
                onChange={(e) => update({ avatarSpeed: parseFloat(e.target.value) })}
                className="flex-1 accent-purple-500"
              />
              <span className="text-sm text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1 min-w-[45px] text-center">
                {avatarSpeed.toFixed(2)}x
              </span>
            </div>
          </div>
        )}

        {/* Generate Audio */}
        {params.includes("generateAudio") && (
          <label className={`flex items-center gap-2 ${multiShotEnabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
            <input
              type="checkbox"
              checked={multiShotEnabled ? true : generateAudio}
              onChange={(e) => { if (!multiShotEnabled) update({ generateAudio: e.target.checked }); }}
              disabled={multiShotEnabled}
              className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
            />
            <span className="text-sm text-zinc-300">Generate Audio</span>
            {multiShotEnabled
              ? <span className="text-zinc-500 text-xs">(obrigatorio no multi-shot)</span>
              : <span className="text-zinc-500 text-xs cursor-help" title="Gera audio junto com o video (aumenta custo)">i</span>
            }
          </label>
        )}

        {/* Web Search (Seedance) */}
        {params.includes("webSearch") && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={webSearch}
              onChange={(e) => update({ webSearch: e.target.checked })}
              className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
            />
            <span className="text-sm text-zinc-300">Web Search</span>
            <span className="text-zinc-500 text-xs cursor-help" title="Busca online para enriquecer o conteudo">i</span>
          </label>
        )}

        {/* Seed */}
        {params.includes("seed") && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm text-zinc-300">Seed</span>
              <span className="text-zinc-500 text-xs cursor-help" title="A seed permite reproduzir o mesmo resultado">i</span>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={randomSeed}
                  onChange={(e) => update({ randomSeed: e.target.checked, seed: null })}
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
                />
                <span className="text-sm text-zinc-300">Random</span>
              </label>
              <input
                type="number"
                value={randomSeed ? "" : (seed ?? "")}
                disabled={randomSeed}
                placeholder={randomSeed ? "------" : "Enter seed"}
                onChange={(e) => update({ seed: parseInt(e.target.value) || null })}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-purple-500 disabled:opacity-40 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer — Run */}
      <div className="p-4 border-t border-zinc-800 space-y-3">
        <div className="text-xs text-zinc-400">Run selected nodes</div>

        {/* Text Iterator info */}
        {iteratorCount > 0 && (
          <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-xs text-green-400 font-medium">Text Iterator</span>
            </div>
            <span className="text-xs text-green-300 font-medium">{iteratorCount} values</span>
          </div>
        )}

        {/* Runs counter */}
        {params.includes("runs") && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-300">Runs</span>
            <div className="flex items-center gap-0 border border-zinc-700 rounded-lg overflow-hidden">
              <button
                onClick={() => update({ runs: Math.max(1, runs - 1) })}
                className="px-3 py-1 text-zinc-400 hover:text-white hover:bg-zinc-700 text-sm transition-colors"
              >-</button>
              <span className="px-3 py-1 text-sm text-zinc-200 bg-zinc-800 min-w-[32px] text-center">{runs}</span>
              <button
                onClick={() => update({ runs: Math.min(10, runs + 1) })}
                className="px-3 py-1 text-zinc-400 hover:text-white hover:bg-zinc-700 text-sm transition-colors"
              >+</button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">Total cost</span>
          <span className="text-xs text-zinc-300">
            ✳ {totalCost} credits
            {iteratorCount > 0 && (
              <span className="text-zinc-500 ml-1">({costPerRun} × {iteratorCount}{runs > 1 ? ` × ${runs}` : ""})</span>
            )}
          </span>
        </div>

        <button
          onClick={onRun}
          disabled={isRunning}
          className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isRunning
              ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
              : "bg-zinc-800 border border-zinc-700 text-zinc-200 hover:bg-zinc-700 hover:text-white"
          }`}
        >
          {isRunning ? "Gerando..." : "→ Run selected"}
        </button>
      </div>
    </div>
  );
}
