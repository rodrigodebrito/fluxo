import { Node } from "@xyflow/react";

export type NodeType = "prompt" | "imageInput" | "model" | "output";

export type AIModel = "nano-banana-pro" | "kling" | "veo3" | "seedance" | "gpt-image-txt" | "gpt-image-img";

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
    params: ["klingMode", "klingDuration", "aspectRatio", "generateAudio", "runs"],
    dynamicElements: true, // suporta element handles dinamicos
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
