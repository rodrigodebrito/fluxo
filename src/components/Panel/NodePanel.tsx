"use client";

import { type Node } from "@xyflow/react";
import { AVAILABLE_MODELS } from "@/types/nodes";

interface NodePanelProps {
  node: Node;
  onRun: () => void;
  onClose: () => void;
  onUpdateData: (nodeId: string, data: Record<string, unknown>) => void;
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

export default function NodePanel({ node, onRun, onClose, onUpdateData }: NodePanelProps) {
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
  const isSeedance = model === "seedance";
  const isKling = model === "kling";
  const isGptImage = model === "gpt-image-txt" || model === "gpt-image-img";

  // GPT Image-specific
  const gptQuality = (node.data.gptQuality as string) || "medium";
  const gptBackground = (node.data.gptBackground as string) || "opaque";

  // Kling-specific
  const klingMode = (node.data.klingMode as string) || "std";
  const klingDuration = (node.data.klingDuration as number) || 5;

  const selectedModel = AVAILABLE_MODELS.find((m) => m.id === model);
  const isVideo = selectedModel?.type === "video";
  // Custo dinamico
  const baseCost = selectedModel?.costPerRun || 18;
  let costPerRun = baseCost;
  if (model === "nano-banana-pro" && resolution === "4K") costPerRun = 24;
  if ((model === "gpt-image-txt" || model === "gpt-image-img") && gptQuality === "high") costPerRun = 22;
  if (model === "veo3") { if (veoModel === "veo3_lite") costPerRun = 30; else if (veoModel === "veo3") costPerRun = 250; }
  if (model === "seedance") {
    // with video input = tem first frame conectado, sem = text-to-video (no video input)
    // Por simplicidade, assume "no video input" (mais caro) como padrão
    const is720 = sdResolution === "720p";
    const isFast = sdModel === "bytedance/seedance-2-fast";
    let perSec: number;
    if (isFast) { perSec = is720 ? 33 : 15.5; }
    else { perSec = is720 ? 41 : 19; }
    costPerRun = Math.round(perSec * sdDuration);
  }
  if (model === "kling") {
    const perSec = klingMode === "pro" ? (generateAudio ? 27 : 18) : (generateAudio ? 20 : 14);
    costPerRun = perSec * klingDuration;
  }
  const totalCost = costPerRun * runs;
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

        {/* Kling Duration */}
        {params.includes("klingDuration") && (
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
              {(isGptImage ? GPT_ASPECT_RATIOS : isKling ? KLING_ASPECT_RATIOS : isSeedance ? SD_ASPECT_RATIOS : isVideo ? VIDEO_ASPECT_RATIOS : IMAGE_ASPECT_RATIOS).map((ar) => (
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
              <span className="text-zinc-500 text-xs cursor-help" title="480p ou 720p">i</span>
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

        {/* Seedance Duration (slider) */}
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

        {/* Generate Audio (Seedance) */}
        {params.includes("generateAudio") && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={generateAudio}
              onChange={(e) => update({ generateAudio: e.target.checked })}
              className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
            />
            <span className="text-sm text-zinc-300">Generate Audio</span>
            <span className="text-zinc-500 text-xs cursor-help" title="Gera audio junto com o video (aumenta custo)">i</span>
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
          <span className="text-xs text-zinc-300">✳ {totalCost} credits</span>
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
