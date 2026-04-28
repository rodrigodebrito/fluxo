import { Node } from "@xyflow/react";

export type NodeType = "prompt" | "imageInput" | "model" | "output";

export type AIModel = "nano-banana-pro" | "kling" | "veo3" | "veo-4k" | "seedance" | "gpt-image-txt" | "gpt-image-img" | "gpt-image-2" | "kling-o3-i2v" | "kling-o3-edit" | "kling-o1-ref" | "kling-motion" | "flux-2-pro" | "flux-2-edit" | "bg-removal" | "upscale" | "custom-model" | "wan-i2v" | "kling-avatar" | "grok-i2v" | "extract-audio" | "zimage-t2i" | "zimage-i2i" | "zimage-lora" | "zimage-i2i-lora" | "seedream-edit";

export interface ModelInfo {
  id: AIModel;
  name: string;
  type: "image" | "video" | "audio";
  description: string;
  costPerRun: number;
  handles: { id: string; label: string; required: boolean }[];
  params: string[]; // quais parametros mostrar no painel
  dynamicElements?: boolean; // suporta element handles dinamicos (kling)
  dynamicReferences?: boolean; // suporta reference_image_urls (seedance)
}

export const AVAILABLE_MODELS: ModelInfo[] = [
  {
    id: "nano-banana-pro",
    name: "Nano Banana Pro",
    type: "image",
    description: "Geracao de imagens de alta qualidade",
    costPerRun: 18,
    handles: [
      { id: "prompt", label: "Prompt*", required: true },
    ],
    params: ["seed", "resolution", "aspectRatio", "runs"],
  },
  {
    id: "veo3",
    name: "Veo 3.1",
    type: "video",
    description: "Geracao de videos (Google Veo 3)",
    costPerRun: 60,
    handles: [
      { id: "prompt", label: "Prompt*", required: true },
      { id: "negative-prompt", label: "Neg. Prompt", required: false },
      { id: "image-1", label: "First Frame", required: false },
      { id: "image-2", label: "Last Frame", required: false },
    ],
    params: ["veoModel", "aspectRatio", "duration", "resolution", "enhancePrompt", "masterMotionBlock", "physicsKeywords", "microMovements", "premiumBoost", "seed", "runs"],
  },
  {
    id: "veo-4k",
    name: "Veo 3.1 Upscale 4K",
    type: "video",
    description: "Upscale para 4K de um video Veo 3.1 ja gerado (aceita so Veo 3.1)",
    costPerRun: 120,
    handles: [
      { id: "video-1", label: "Veo 3.1 Video*", required: true },
    ],
    params: ["runs"],
  },
  {
    id: "seedance",
    name: "Seedance 2.0",
    type: "video",
    description: "Video IA (ByteDance via Kie AI)",
    costPerRun: 328,
    handles: [
      { id: "prompt", label: "Prompt*", required: true },
      { id: "negative-prompt", label: "Neg. Prompt", required: false },
      { id: "image-1", label: "First Frame", required: false },
      { id: "image-2", label: "Last Frame", required: false },
      { id: "video-1", label: "Video Ref", required: false },
      { id: "audio-1", label: "Audio", required: false },
    ],
    params: ["sdResolution", "aspectRatio", "sdDuration", "generateAudio", "webSearch", "masterMotionBlock", "physicsKeywords", "microMovements", "premiumBoost", "seed", "runs"],
    dynamicReferences: true, // suporta reference_image_urls (até 9)
  },
  {
    id: "kling",
    name: "Kling 3",
    type: "video",
    description: "Video IA (Kling 3.0)",
    costPerRun: 134,
    handles: [
      { id: "prompt", label: "Prompt*", required: true },
      { id: "negative-prompt", label: "Neg. Prompt", required: false },
      { id: "image-1", label: "First Frame", required: false },
      { id: "image-2", label: "Last Frame", required: false },
    ],
    params: ["klingMode", "multiShots", "klingDuration", "aspectRatio", "generateAudio", "masterMotionBlock", "physicsKeywords", "microMovements", "premiumBoost", "runs"],
    dynamicElements: true, // suporta element handles dinamicos
  },
  {
    id: "kling-o3-i2v",
    name: "Kling O3",
    type: "video",
    description: "Image to Video (Kling O3 via fal.ai)",
    costPerRun: 120,
    handles: [
      { id: "prompt", label: "Prompt*", required: true },
      { id: "image-1", label: "Start Frame", required: false },
      { id: "image-2", label: "End Frame", required: false },
    ],
    params: ["falTier", "multiShots", "klingO3Duration", "aspectRatio", "generateAudio", "masterMotionBlock", "physicsKeywords", "microMovements", "premiumBoost", "runs"],
  },
  {
    id: "kling-o3-edit",
    name: "Kling O3 Edit Video",
    type: "video",
    description: "Editar video com IA (Kling O3 via fal.ai)",
    costPerRun: 180,
    handles: [
      { id: "prompt", label: "Prompt*", required: true },
      { id: "video-1", label: "Video*", required: true },
      { id: "image-1", label: "Image 1", required: false },
    ],
    params: ["falTier", "keepAudio", "runs"],
    dynamicElements: true,
  },
  {
    id: "kling-o1-ref",
    name: "Kling O3 Reference",
    type: "video",
    description: "Video de referencia (Kling O3 via fal.ai)",
    costPerRun: 180,
    handles: [
      { id: "prompt", label: "Prompt*", required: true },
      { id: "video-1", label: "Ref Video*", required: true },
      { id: "image-1", label: "Start Frame", required: false },
      { id: "image-2", label: "End Frame", required: false },
    ],
    params: ["falTier", "multiShots", "klingO1Duration", "aspectRatio", "generateAudio", "masterMotionBlock", "physicsKeywords", "microMovements", "premiumBoost", "runs"],
    dynamicElements: true,
  },
  {
    id: "gpt-image-txt",
    name: "GPT Image 1.5",
    type: "image",
    description: "Text to Image (GPT Image 1.5)",
    costPerRun: 4,
    handles: [
      { id: "prompt", label: "Prompt*", required: true },
    ],
    params: ["gptQuality", "aspectRatio", "gptBackground", "runs"],
  },
  {
    id: "gpt-image-img",
    name: "GPT Image 1.5 Edit",
    type: "image",
    description: "Image to Image (GPT Image 1.5)",
    costPerRun: 4,
    handles: [
      { id: "prompt", label: "Prompt*", required: true },
      { id: "image-1", label: "Image*", required: true },
    ],
    params: ["gptQuality", "aspectRatio", "runs"],
  },
  {
    id: "gpt-image-2",
    name: "GPT Image 2",
    type: "image",
    description: "T2I/I2I auto (GPT Image 2) — usa image-to-image se tiver imagem, senao text-to-image",
    costPerRun: 6,
    handles: [
      { id: "prompt", label: "Prompt*", required: true },
      { id: "image-1", label: "Image 1", required: false },
      { id: "image-2", label: "Image 2", required: false },
      { id: "image-3", label: "Image 3", required: false },
      { id: "image-4", label: "Image 4", required: false },
    ],
    params: ["resolution", "aspectRatio", "runs"],
  },
  {
    id: "seedream-edit",
    name: "Seedream 4.5 Edit",
    type: "image",
    description: "Edicao multi-imagem (ate 4 refs) via Kie AI",
    costPerRun: 8,
    handles: [
      { id: "prompt", label: "Prompt*", required: true },
      { id: "image-1", label: "Image 1*", required: true },
      { id: "image-2", label: "Image 2", required: false },
      { id: "image-3", label: "Image 3", required: false },
      { id: "image-4", label: "Image 4", required: false },
    ],
    params: ["seedreamQuality", "aspectRatio", "runs"],
  },
  {
    id: "kling-motion",
    name: "Kling Motion Control",
    type: "video",
    description: "Motion Control (Kling 2.6/3.0 via Kie AI)",
    costPerRun: 50,
    handles: [
      { id: "prompt", label: "Prompt", required: false },
      { id: "image-1", label: "Character*", required: true },
      { id: "video-1", label: "Motion Video*", required: true },
    ],
    params: ["motionVersion", "motionMode", "characterOrientation", "runs"],
  },
  {
    id: "flux-2-pro",
    name: "Flux 2 Pro",
    type: "image",
    description: "Imagem de alta qualidade (Flux 2 Pro via fal.ai)",
    costPerRun: 6,
    handles: [
      { id: "prompt", label: "Prompt*", required: true },
    ],
    params: ["fluxImageSize", "seed", "runs"],
  },
  {
    id: "flux-2-edit",
    name: "Flux 2 Edit",
    type: "image",
    description: "Editar imagem com texto (Flux 2 Pro Edit via fal.ai, ate 9 imagens)",
    costPerRun: 6,
    handles: [
      { id: "prompt", label: "Prompt*", required: true },
    ],
    params: ["fluxImageSize", "seed", "runs"],
  },
  {
    id: "bg-removal",
    name: "Background Removal",
    type: "image",
    description: "Remover fundo de imagem (BiRefNet via fal.ai)",
    costPerRun: 1,
    handles: [
      { id: "image-1", label: "Image*", required: true },
    ],
    params: ["runs"],
  },
  {
    id: "upscale",
    name: "Upscale",
    type: "image",
    description: "Aumentar resolucao de imagem (ESRGAN via fal.ai)",
    costPerRun: 2,
    handles: [
      { id: "image-1", label: "Image*", required: true },
    ],
    params: ["upscaleScale", "runs"],
  },
  {
    id: "extract-audio",
    name: "Extract Audio",
    type: "audio",
    description: "Extrair audio de video (ffmpeg)",
    costPerRun: 1,
    handles: [
      { id: "video-1", label: "Video*", required: true },
    ],
    params: ["audioFormat", "runs"],
  },
  {
    id: "custom-model",
    name: "Modelo Treinado",
    type: "image",
    description: "Gere imagens com seu modelo personalizado (LoRA via Replicate)",
    costPerRun: 20,
    handles: [
      { id: "prompt", label: "Prompt*", required: true },
    ],
    params: ["trainedModel", "customGuidance", "customSteps", "customNsfw", "customRealism", "customAspectRatio", "customNumOutputs", "runs"],
  },
  {
    id: "wan-i2v",
    name: "Wan 2.7 I2V",
    type: "video",
    description: "Image to Video (Wan 2.7 via Kie AI)",
    costPerRun: 80,
    handles: [
      { id: "prompt", label: "Prompt*", required: true },
      { id: "negative-prompt", label: "Neg. Prompt", required: false },
      { id: "image-1", label: "First Frame", required: false },
      { id: "image-2", label: "Last Frame", required: false },
      { id: "video-1", label: "Extend Video", required: false },
      { id: "audio-1", label: "Audio", required: false },
    ],
    params: ["wanResolution", "wanDuration", "promptExtend", "masterMotionBlock", "physicsKeywords", "microMovements", "premiumBoost", "seed", "runs"],
  },
  {
    id: "kling-avatar",
    name: "Kling Avatar TTS",
    type: "video",
    description: "Avatar falante (foto + audio/texto via Kie AI)",
    costPerRun: 40,
    handles: [
      { id: "prompt", label: "Prompt", required: false },
      { id: "image-1", label: "Photo*", required: true },
      { id: "audio-1", label: "Audio", required: false },
    ],
    params: ["avatarTier", "avatarText", "avatarVoice", "avatarSpeed", "runs"],
  },
  {
    id: "grok-i2v",
    name: "Grok Imagine",
    type: "video",
    description: "Image to Video economico (Grok Imagine via Kie AI)",
    costPerRun: 10,
    handles: [
      { id: "prompt", label: "Prompt", required: false },
      { id: "image-1", label: "Image*", required: true },
    ],
    params: ["grokResolution", "grokDuration", "grokMode", "aspectRatio", "masterMotionBlock", "physicsKeywords", "microMovements", "premiumBoost", "runs"],
  },
  {
    id: "zimage-t2i",
    name: "Z-Image Turbo",
    type: "image",
    description: "Imagem rapida e barata (Z-Image Turbo 6B via fal.ai)",
    costPerRun: 2,
    handles: [
      { id: "prompt", label: "Prompt*", required: true },
    ],
    params: ["zimageSize", "zimageSteps", "zimageAcceleration", "zimageSafety", "seed", "runs"],
  },
  {
    id: "zimage-i2i",
    name: "Z-Image I2I",
    type: "image",
    description: "Image to Image (Z-Image Turbo via fal.ai)",
    costPerRun: 2,
    handles: [
      { id: "prompt", label: "Prompt*", required: true },
      { id: "image-1", label: "Image*", required: true },
    ],
    params: ["zimageSize", "zimageSteps", "zimageStrength", "zimageAcceleration", "zimageSafety", "seed", "runs"],
  },
  {
    id: "zimage-lora",
    name: "Z-Image LoRA",
    type: "image",
    description: "Imagem com ate 3 LoRAs (Z-Image Turbo via fal.ai)",
    costPerRun: 3,
    handles: [
      { id: "prompt", label: "Prompt*", required: true },
    ],
    params: ["zimageSize", "zimageSteps", "zimageAcceleration", "zimageSafety", "zimageLoras", "seed", "runs"],
  },
  {
    id: "zimage-i2i-lora",
    name: "Z-Image I2I + LoRA",
    type: "image",
    description: "Image to Image com ate 3 LoRAs (Z-Image Turbo via fal.ai)",
    costPerRun: 3,
    handles: [
      { id: "prompt", label: "Prompt*", required: true },
      { id: "image-1", label: "Image*", required: true },
    ],
    params: ["zimageSize", "zimageSteps", "zimageStrength", "zimageAcceleration", "zimageSafety", "zimageLoras", "seed", "runs"],
  },
];

export interface PromptNodeData extends Record<string, unknown> {
  label: string;
  text: string;
}

export interface ImageInputNodeData extends Record<string, unknown> {
  label: string;
  imageUrl: string;
  fileName: string;
}

export interface ModelNodeData extends Record<string, unknown> {
  label: string;
  model: AIModel;
}

export interface OutputNodeData extends Record<string, unknown> {
  label: string;
  resultUrl: string;
  resultType: "image" | "video" | "audio" | "none";
  isLoading: boolean;
}

export type PromptNode = Node<PromptNodeData, "prompt">;
export type ImageInputNode = Node<ImageInputNodeData, "imageInput">;
export type ModelNode = Node<ModelNodeData, "model">;
export type OutputNode = Node<OutputNodeData, "output">;

export type AppNode = PromptNode | ImageInputNode | ModelNode | OutputNode;
