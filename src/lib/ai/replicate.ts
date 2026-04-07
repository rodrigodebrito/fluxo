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

// NSFW uncensor LoRA — always injected to remove FLUX.1-dev built-in content restrictions
const NSFW_LORA = "enhanceaiteam/Flux-Uncensored-V2";
const NSFW_LORA_SCALE = 0.6;

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
  nsfwEnabled?: boolean; // Auto-inject NSFW uncensor LoRA (default true)
}

export async function generateWithTrainedModel(
  input: ReplicateGenerateInput
): Promise<string[]> {
  // Conditionally inject NSFW uncensor LoRA
  const allLoras: LoraInput[] = [
    ...(input.nsfwEnabled !== false ? [{ url: NSFW_LORA, scale: NSFW_LORA_SCALE }] : []),
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
