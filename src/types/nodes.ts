import { Node } from "@xyflow/react";

export type NodeType = "prompt" | "imageInput" | "model" | "output";

export type AIModel = "nano-banana-pro" | "kling" | "veo3" | "seedance" | "gpt-image-txt" | "gpt-image-img" | "kling-o3-i2v" | "kling-o3-edit" | "kling-o1-ref" | "kling-motion" | "flux-2-pro" | "flux-2-edit" | "bg-removal" | "upscale" | "custom-model" | "wan-i2v" | "kling-avatar";

export interface ModelInfo {
  id: AIModel;
  name: string;
  type: "image" | "video";
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
      { id: "image-1", label: "First Frame*", required: true },
      { id: "image-2", label: "Last Frame", required: false },
    ],
    params: ["veoModel", "aspectRatio", "enhancePrompt", "seed", "runs"],
  },
  {
    id: "seedance",
    name: "Seedance 2.0",
    type: "video",
    description: "Video IA (ByteDance)",
    costPerRun: 40,
    handles: [
      { id: "prompt", label: "Prompt*", required: true },
      { id: "negative-prompt", label: "Neg. Prompt", required: false },
      { id: "image-1", label: "First Frame", required: false },
      { id: "image-2", label: "Last Frame", required: false },
      { id: "video-1", label: "Video Ref", required: false },
      { id: "audio-1", label: "Audio", required: false },
    ],
    params: ["sdResolution", "aspectRatio", "sdDuration", "generateAudio", "webSearch", "seed", "runs"],
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
    params: ["klingMode", "multiShots", "klingDuration", "aspectRatio", "generateAudio", "runs"],
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
      { id: "image-1", label: "First Frame", required: false },
      { id: "image-2", label: "Last Frame", required: false },
    ],
    params: ["falTier", "multiShots", "klingO3Duration", "aspectRatio", "generateAudio", "cfgScale", "runs"],
    dynamicElements: true,
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
    description: "Video de referencia (Kling O1 via fal.ai)",
    costPerRun: 180,
    handles: [
      { id: "prompt", label: "Prompt*", required: true },
      { id: "video-1", label: "Ref Video*", required: true },
      { id: "image-1", label: "Image 1", required: false },
    ],
    params: ["falTier", "klingO1Duration", "aspectRatio", "keepAudio", "runs"],
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
    id: "custom-model",
    name: "Modelo Treinado",
    type: "image",
    description: "Gere imagens com seu modelo personalizado (LoRA via Replicate)",
    costPerRun: 10,
    handles: [
      { id: "prompt", label: "Prompt*", required: true },
    ],
    params: ["trainedModel", "customAspectRatio", "customNumOutputs", "runs"],
  },
  {
    id: "wan-i2v",
    name: "Wan 2.1 I2V",
    type: "video",
    description: "Image to Video (Wan 2.1 via Replicate)",
    costPerRun: 15,
    handles: [
      { id: "prompt", label: "Prompt*", required: true },
      { id: "image-1", label: "Image*", required: true },
    ],
    params: ["wanResolution", "wanDuration", "aspectRatio", "runs"],
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
  resultType: "image" | "video" | "none";
  isLoading: boolean;
}

export type PromptNode = Node<PromptNodeData, "prompt">;
export type ImageInputNode = Node<ImageInputNodeData, "imageInput">;
export type ModelNode = Node<ModelNodeData, "model">;
export type OutputNode = Node<OutputNodeData, "output">;

export type AppNode = PromptNode | ImageInputNode | ModelNode | OutputNode;
