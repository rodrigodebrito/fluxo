import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
  useFileOutput: false, // Return plain URL strings instead of FileOutput objects
});

const REPLICATE_USERNAME = process.env.REPLICATE_USERNAME || "fluxo-ai";

// Fast Flux Trainer
const TRAINER_OWNER = "ostris";
const TRAINER_MODEL = "flux-dev-lora-trainer";
const TRAINER_VERSION =
  "d995297071a44dcb72244e6c19462111649ec86a9646c32df56daa7f14801944";

// --- Training ---

export async function createReplicateModel(
  name: string,
  description: string
): Promise<string> {
  const model = await replicate.models.create(REPLICATE_USERNAME, name, {
    visibility: "private",
    hardware: "gpu-l40s",
    description,
  });
  return `${model.owner}/${model.name}`;
}

export async function uploadTrainingZip(
  zipBuffer: Buffer
): Promise<string> {
  const res = await fetch("https://api.replicate.com/v1/files", {
    method: "POST",
    headers: {
      Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
    },
    body: (() => {
      const form = new FormData();
      form.append("content", new Blob([new Uint8Array(zipBuffer)]), "data.zip");
      return form;
    })(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to upload zip: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.urls.get;
}

export async function startTraining(
  destination: string,
  imageZipUrl: string,
  triggerWord: string,
  webhookUrl?: string
): Promise<{ trainingId: string }> {
  const training = await replicate.trainings.create(
    TRAINER_OWNER,
    TRAINER_MODEL,
    TRAINER_VERSION,
    {
      destination: destination as `${string}/${string}`,
      input: {
        input_images: imageZipUrl,
        trigger_word: triggerWord,
        steps: 1000,
        autocaption: true,
        learning_rate: 0.0004,
      },
      ...(webhookUrl
        ? {
            webhook: webhookUrl,
            webhook_events_filter: ["completed"],
          }
        : {}),
    }
  );

  return { trainingId: training.id };
}

export async function getTrainingStatus(trainingId: string) {
  const training = await replicate.trainings.get(trainingId);
  return {
    id: training.id,
    status: training.status as string,
    version: (training.output as Record<string, string>)?.version,
    weightsUrl: (training.output as Record<string, string>)?.weights,
    logs: training.logs,
    completedAt: training.completed_at,
    error: training.error,
  };
}

// --- Inference ---

// Multi-LoRA model: supports up to 20 LoRAs, NSFW unrestricted
const INFERENCE_MODEL = "lucataco/flux-dev-multi-lora:ad0314563856e714367fdc7244b19b160d25926d305fec270c9e00f64665d352";

// Auto-injected LoRAs for quality and NSFW support (HuggingFace slugs, no dots allowed)
const NSFW_LORA = "enhanceaiteam/Flux-Uncensored-V2";
const NSFW_LORA_SCALE = 0.6;
const SUPER_REALISM_LORA = "strangerzonehf/Flux-Super-Realism-LoRA";
const SUPER_REALISM_LORA_SCALE = 0.7;

export interface LoraInput {
  url: string;   // URL to LoRA weights (Replicate, HuggingFace, or CivitAI)
  scale?: number; // Weight for this LoRA (default 1)
}

export interface ReplicateGenerateInput {
  loras: LoraInput[]; // Up to 20 LoRAs
  prompt: string;
  aspectRatio?: string;
  numOutputs?: number;
  guidanceScale?: number;
  nsfwEnabled?: boolean;
  nsfwScale?: number;
  realismEnabled?: boolean;
  realismScale?: number;
}

export async function generateWithTrainedModel(
  input: ReplicateGenerateInput
): Promise<string[]> {
  // Auto-inject quality + NSFW LoRAs based on user settings
  const allLoras: LoraInput[] = [
    ...(input.nsfwEnabled !== false ? [{ url: NSFW_LORA, scale: input.nsfwScale ?? NSFW_LORA_SCALE }] : []),
    ...(input.realismEnabled !== false ? [{ url: SUPER_REALISM_LORA, scale: input.realismScale ?? SUPER_REALISM_LORA_SCALE }] : []),
    ...input.loras,
  ];

  const hfLoras = allLoras.map((l) => l.url);
  const loraScales = allLoras.map((l) => l.scale ?? 1);

  const inferenceInput: Record<string, unknown> = {
    prompt: input.prompt,
    hf_loras: hfLoras,
    lora_scales: loraScales,
    num_outputs: input.numOutputs ?? 1,
    aspect_ratio: input.aspectRatio ?? "1:1",
    guidance_scale: input.guidanceScale ?? 3.5,
    output_format: "png",
    disable_safety_checker: true,
  };

  console.log("[replicate] inference input:", JSON.stringify(inferenceInput));

  const output = await replicate.run(INFERENCE_MODEL as `${string}/${string}`, {
    input: inferenceInput,
  });

  console.log("[replicate] raw output:", JSON.stringify(output));

  // Output is an array of FileOutput objects or URLs
  if (Array.isArray(output)) {
    return output.map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "url" in item)
        return (item as { url: string }).url;
      // FileOutput from replicate SDK has .toString() returning the URL
      if (item && typeof item === "object" && typeof item.toString === "function") {
        const str = String(item);
        if (str.startsWith("http")) return str;
      }
      return String(item);
    });
  }

  return [];
}

// --- Flux NSFW V3 (aisha-ai-official/flux.1dev-uncensored-fluxedup-nsfw-v3) ---

const FLUX_NSFW_MODEL = "aisha-ai-official/flux.1dev-uncensored-fluxedup-nsfw-v3";

export interface FluxNsfwInput {
  prompt: string;
  width?: number;
  height?: number;
  cfgScale?: number;
  steps?: number;
  seed?: number;
  numOutputs?: number;
}

// Map aspect ratio string to width/height
function aspectToSize(aspect: string): { width: number; height: number } {
  switch (aspect) {
    case "1:1": return { width: 1024, height: 1024 };
    case "16:9": return { width: 1344, height: 768 };
    case "9:16": return { width: 768, height: 1344 };
    case "4:3": return { width: 1184, height: 896 };
    case "3:4": return { width: 896, height: 1184 };
    case "3:2": return { width: 1248, height: 832 };
    case "2:3": return { width: 832, height: 1248 };
    default: return { width: 1024, height: 1024 };
  }
}

export async function generateWithFluxNSFW(
  input: FluxNsfwInput
): Promise<string[]> {
  const size = input.width && input.height
    ? { width: input.width, height: input.height }
    : aspectToSize("1:1");

  const allResults: string[] = [];
  const count = input.numOutputs ?? 1;

  // Model outputs 1 image per run, so loop for multiple outputs
  for (let i = 0; i < count; i++) {
    const inferenceInput: Record<string, unknown> = {
      prompt: input.prompt,
      width: size.width,
      height: size.height,
      cfg_scale: input.cfgScale ?? 5,
      steps: input.steps ?? 20,
      seed: input.seed ?? -1,
    };

    console.log(`[replicate-flux-nsfw] run ${i + 1}/${count} input:`, JSON.stringify(inferenceInput));

    const output = await replicate.run(FLUX_NSFW_MODEL as `${string}/${string}`, {
      input: inferenceInput,
    });

    console.log(`[replicate-flux-nsfw] run ${i + 1}/${count} output:`, JSON.stringify(output));

    if (Array.isArray(output)) {
      for (const item of output) {
        if (typeof item === "string") { allResults.push(item); continue; }
        if (item && typeof item === "object" && "url" in item) { allResults.push((item as { url: string }).url); continue; }
        if (item && typeof item === "object" && typeof item.toString === "function") {
          const str = String(item);
          if (str.startsWith("http")) { allResults.push(str); continue; }
        }
        allResults.push(String(item));
      }
    } else if (typeof output === "string") {
      allResults.push(output);
    } else if (output && typeof output === "object" && "url" in output) {
      allResults.push((output as { url: string }).url);
    } else if (output && typeof output === "object" && typeof (output as { toString: () => string }).toString === "function") {
      const str = String(output);
      if (str.startsWith("http")) allResults.push(str);
    }
  }

  return allResults;
}

// --- Cleanup ---

export async function deleteReplicateModel(modelId: string): Promise<void> {
  const [owner, name] = modelId.split("/");
  if (!owner || !name) return;
  try {
    await fetch(`https://api.replicate.com/v1/models/${owner}/${name}`, {
      method: "DELETE",
      headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` },
    });
  } catch {
    // Model may already be deleted
  }
}
