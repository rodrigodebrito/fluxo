import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
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
    hardware: "gpu-a40-large",
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

export interface ReplicateGenerateInput {
  modelVersion: string; // "owner/name:version_hash" or "owner/name"
  prompt: string;
  aspectRatio?: string;
  numOutputs?: number;
  guidanceScale?: number;
  loraScale?: number;
}

export async function generateWithTrainedModel(
  input: ReplicateGenerateInput
): Promise<string[]> {
  const output = await replicate.run(input.modelVersion as `${string}/${string}`, {
    input: {
      prompt: input.prompt,
      num_outputs: input.numOutputs ?? 1,
      aspect_ratio: input.aspectRatio ?? "1:1",
      guidance_scale: input.guidanceScale ?? 3.5,
      lora_scale: input.loraScale ?? 1,
      output_format: "png",
    },
  });

  // Output is an array of FileOutput objects or URLs
  if (Array.isArray(output)) {
    return output.map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "url" in item)
        return (item as { url: string }).url;
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
