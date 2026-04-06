const QUEUE_BASE = "https://queue.fal.run";

// Endpoints map
export const FAL_ENDPOINTS: Record<string, string> = {
  "kling-o3-i2v": "fal-ai/kling-video/o3/pro/image-to-video",
  "kling-o3-edit": "fal-ai/kling-video/o3/pro/video-to-video/edit",
  "kling-o1-ref": "fal-ai/kling-video/o1/video-to-video/reference",
};

// Retry config (same pattern as kie.ts)
const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 4000, 8000];

async function fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, options);

      if (attempt < MAX_RETRIES && (response.status >= 500 || response.status === 429)) {
        const delay = response.status === 429 ? RETRY_DELAYS[attempt] * 2 : RETRY_DELAYS[attempt];
        console.warn(`[fal] Attempt ${attempt + 1} failed (status ${response.status}), retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      return response;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < MAX_RETRIES) {
        console.warn(`[fal] Attempt ${attempt + 1} network error: ${lastError.message}, retrying in ${RETRY_DELAYS[attempt]}ms...`);
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
        continue;
      }
    }
  }

  throw lastError || new Error("fal.ai: falha apos multiplas tentativas");
}

async function safeJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    console.error("[fal] Invalid JSON response:", response.status, text.slice(0, 500));
    throw new Error(`fal.ai retornou resposta invalida (status ${response.status}): ${text.slice(0, 200)}`);
  }
}

// === Submit task to queue ===

interface SubmitResponse {
  request_id: string;
  status: string;
  response_url: string;
  status_url: string;
}

export async function submitFalTask(
  falKey: string,
  endpoint: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: Record<string, any>
): Promise<SubmitResponse> {
  const response = await fetchWithRetry(`${QUEUE_BASE}/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${falKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`fal.ai submit failed (${response.status}): ${text.slice(0, 300)}`);
  }

  return safeJson(response);
}

// === Poll task status ===

interface FalStatusResponse {
  request_id: string;
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED";
  queue_position?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logs?: { message: string; timestamp: string }[];
}

export async function pollFalStatus(
  falKey: string,
  endpoint: string,
  requestId: string
): Promise<FalStatusResponse> {
  const response = await fetch(
    `${QUEUE_BASE}/${endpoint}/requests/${encodeURIComponent(requestId)}/status`,
    {
      method: "GET",
      headers: { Authorization: `Key ${falKey}` },
    }
  );

  return safeJson(response);
}

// === Get result ===

interface FalVideoResult {
  video: {
    url: string;
    file_name: string;
    file_size: number;
    content_type: string;
  };
}

export async function getFalResult(
  falKey: string,
  endpoint: string,
  requestId: string
): Promise<FalVideoResult> {
  const response = await fetch(
    `${QUEUE_BASE}/${endpoint}/requests/${encodeURIComponent(requestId)}`,
    {
      method: "GET",
      headers: { Authorization: `Key ${falKey}` },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`fal.ai result failed (${response.status}): ${text.slice(0, 300)}`);
  }

  return safeJson(response);
}

// === Build input body per model ===

interface FalGenerateInput {
  model: string;
  prompt: string;
  negativePrompt?: string;
  imageUrls?: string[];
  videoUrl?: string;
  endImageUrl?: string;
  duration?: number;
  aspectRatio?: string;
  generateAudio?: boolean;
  cfgScale?: number;
  keepAudio?: boolean;
  elements?: { frontal_image_url: string; reference_image_urls?: string[] }[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildFalInput(input: FalGenerateInput): Record<string, any> {
  const model = input.model;

  if (model === "kling-o3-i2v") {
    // Kling O3 Image-to-Video
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: Record<string, any> = {};
    if (input.prompt) body.prompt = input.prompt;
    if (input.negativePrompt) body.negative_prompt = input.negativePrompt;
    if (input.imageUrls && input.imageUrls[0]) body.image_url = input.imageUrls[0];
    if (input.endImageUrl) body.end_image_url = input.endImageUrl;
    body.duration = String(input.duration || 5);
    body.aspect_ratio = input.aspectRatio || "16:9";
    body.generate_audio = input.generateAudio ?? false;
    if (input.cfgScale != null) body.cfg_scale = input.cfgScale;
    if (input.elements && input.elements.length > 0) body.elements = input.elements;
    return body;
  }

  if (model === "kling-o3-edit") {
    // Kling O3 Edit Video
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: Record<string, any> = {
      prompt: input.prompt,
    };
    if (input.videoUrl) body.video_url = input.videoUrl;
    if (input.imageUrls && input.imageUrls.length > 0) body.image_urls = input.imageUrls;
    body.keep_audio = input.keepAudio ?? true;
    if (input.elements && input.elements.length > 0) body.elements = input.elements;
    return body;
  }

  if (model === "kling-o1-ref") {
    // Kling O1 Reference Video to Video
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: Record<string, any> = {
      prompt: input.prompt,
    };
    if (input.videoUrl) body.video_url = input.videoUrl;
    if (input.imageUrls && input.imageUrls.length > 0) body.image_urls = input.imageUrls;
    if (input.keepAudio != null) body.keep_audio = input.keepAudio;
    if (input.elements && input.elements.length > 0) body.elements = input.elements;
    body.aspect_ratio = input.aspectRatio || "auto";
    body.duration = String(input.duration || 5);
    return body;
  }

  throw new Error(`Modelo fal.ai desconhecido: ${model}`);
}
