const QUEUE_BASE = "https://queue.fal.run";
const QUEUE_BASE_ALT = "https://api.fal.ai/queue";

// Endpoints map — tier (std/pro) is resolved dynamically
const FAL_ENDPOINT_TEMPLATES: Record<string, { std: string; pro: string }> = {
  "kling-o3-i2v": {
    std: "fal-ai/kling-video/o3/standard/image-to-video",
    pro: "fal-ai/kling-video/o3/pro/image-to-video",
  },
  "kling-o3-edit": {
    std: "fal-ai/kling-video/o3/standard/video-to-video/edit",
    pro: "fal-ai/kling-video/o3/pro/video-to-video/edit",
  },
  "kling-o1-ref": {
    std: "fal-ai/kling-video/o3/standard/reference-to-video",
    pro: "fal-ai/kling-video/o3/pro/reference-to-video",
  },
};

// Sora 2 endpoints
const SORA_ENDPOINTS: Record<string, { t2v: string; i2v: string; characters: string }> = {
  "sora-2": {
    t2v: "fal-ai/sora-2/text-to-video",
    i2v: "fal-ai/sora-2/image-to-video",
    characters: "fal-ai/sora-2/characters",
  },
};

// Flux 2 + utility endpoints (no tier distinction)
const FLUX_ENDPOINTS: Record<string, string> = {
  "flux-2-pro": "fal-ai/flux-2-pro",
  "flux-2-edit": "fal-ai/flux-2-pro/edit",
  "bg-removal": "fal-ai/birefnet/v2",
  "upscale": "fal-ai/esrgan",
};

export function getFalEndpoint(model: string, tier: "std" | "pro" = "pro"): string | null {
  // Check Flux endpoints first
  if (FLUX_ENDPOINTS[model]) return FLUX_ENDPOINTS[model];
  const template = FAL_ENDPOINT_TEMPLATES[model];
  if (!template) return null;
  return template[tier];
}

// Sora 2: resolve endpoint based on whether image is provided
export function getSoraEndpoint(hasImage: boolean): string {
  return hasImage ? SORA_ENDPOINTS["sora-2"].i2v : SORA_ENDPOINTS["sora-2"].t2v;
}

export function getSoraCharactersEndpoint(): string {
  return SORA_ENDPOINTS["sora-2"].characters;
}

// Keep a flat lookup for validation
export const FAL_MODELS = new Set([...Object.keys(FAL_ENDPOINT_TEMPLATES), ...Object.keys(FLUX_ENDPOINTS)]);

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
  requestId: string,
  statusUrl?: string
): Promise<FalStatusResponse> {
  // Use status_url from submit response if available, otherwise try multiple URL formats
  const urls = statusUrl
    ? [statusUrl]
    : [
        `${QUEUE_BASE}/${endpoint}/requests/${encodeURIComponent(requestId)}/status`,
        `${QUEUE_BASE_ALT}/${endpoint}/requests/${encodeURIComponent(requestId)}/status`,
      ];

  let lastError: Error | null = null;
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Key ${falKey}` },
      });

      if (response.status === 405 || response.status === 404) {
        console.warn(`[fal] Status URL returned ${response.status}: ${url}`);
        lastError = new Error(`fal.ai status ${response.status} for ${url}`);
        continue;
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`fal.ai status failed (${response.status}): ${text.slice(0, 300)}`);
      }

      return safeJson(response);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (urls.length > 1) continue;
      throw lastError;
    }
  }

  throw lastError || new Error("fal.ai: falha ao obter status");
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

interface FalImageResult {
  images: {
    url: string;
    width: number;
    height: number;
    content_type: string;
  }[];
}

export async function getFalResult(
  falKey: string,
  endpoint: string,
  requestId: string,
  responseUrl?: string
): Promise<FalVideoResult | FalImageResult> {
  // Use response_url from submit response if available, otherwise try multiple URL formats
  const urls = responseUrl
    ? [responseUrl]
    : [
        `${QUEUE_BASE}/${endpoint}/requests/${encodeURIComponent(requestId)}`,
        `${QUEUE_BASE_ALT}/${endpoint}/requests/${encodeURIComponent(requestId)}`,
      ];

  let lastError: Error | null = null;
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Key ${falKey}` },
      });

      if (response.status === 405 || response.status === 404) {
        console.warn(`[fal] Result URL returned ${response.status}: ${url}`);
        lastError = new Error(`fal.ai result ${response.status} for ${url}`);
        continue;
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`fal.ai result failed (${response.status}): ${text.slice(0, 300)}`);
      }

      return safeJson(response);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (urls.length > 1) continue;
      throw lastError;
    }
  }

  throw lastError || new Error("fal.ai: falha ao obter resultado");
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
  multiShotEnabled?: boolean;
  multiShots?: { prompt: string; duration: number }[];
  // Flux 2
  fluxImageSize?: string;
  seed?: number;
  // Upscale
  upscaleScale?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildFalInput(input: FalGenerateInput): Record<string, any> {
  const model = input.model;

  if (model === "kling-o3-i2v") {
    // Kling O3 Image-to-Video
    // API only accepts: image_url, end_image_url, prompt/multi_prompt, duration, generate_audio, shot_type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: Record<string, any> = {};
    if (input.imageUrls && input.imageUrls[0]) body.image_url = input.imageUrls[0];
    if (input.endImageUrl) body.end_image_url = input.endImageUrl;
    body.generate_audio = input.generateAudio ?? false;

    // Multi-Shot: use multi_prompt instead of prompt + duration
    if (input.multiShotEnabled && input.multiShots && input.multiShots.length > 0) {
      body.multi_prompt = input.multiShots.map((s) => ({
        prompt: s.prompt,
        duration: s.duration,
      }));
      body.shot_type = "customize";
    } else {
      if (input.prompt) body.prompt = input.prompt;
      body.duration = String(input.duration || 5);
    }
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
    // Kling O3 Reference to Video
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: Record<string, any> = {};
    if (input.videoUrl) body.video_url = input.videoUrl;
    // imageUrls[0] = start frame, imageUrls[1] = end frame
    if (input.imageUrls && input.imageUrls[0]) body.start_image_url = input.imageUrls[0];
    if (input.endImageUrl) body.end_image_url = input.endImageUrl;
    if (input.elements && input.elements.length > 0) body.elements = input.elements;
    body.aspect_ratio = input.aspectRatio || "16:9";
    body.generate_audio = input.generateAudio ?? false;

    // Multi-Shot: use multi_prompt instead of prompt + duration
    if (input.multiShotEnabled && input.multiShots && input.multiShots.length > 0) {
      body.multi_prompt = input.multiShots.map((s) => ({
        prompt: s.prompt,
        duration: s.duration,
      }));
      body.shot_type = "customize";
    } else {
      if (input.prompt) body.prompt = input.prompt;
      body.duration = String(input.duration || 5);
    }
    return body;
  }

  if (model === "flux-2-pro") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: Record<string, any> = {
      prompt: input.prompt,
      image_size: input.fluxImageSize || "landscape_4_3",
      output_format: "png",
      safety_tolerance: "5",
    };
    if (input.seed != null) body.seed = input.seed;
    return body;
  }

  if (model === "flux-2-edit") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: Record<string, any> = {
      prompt: input.prompt,
      image_urls: input.imageUrls || [],
      image_size: input.fluxImageSize || "auto",
      output_format: "png",
      safety_tolerance: "5",
    };
    if (input.seed != null) body.seed = input.seed;
    return body;
  }

  if (model === "bg-removal") {
    return {
      image_url: input.imageUrls?.[0] || "",
      model: "General Use (Light)",
      operating_resolution: "1024x1024",
      output_format: "png",
    };
  }

  if (model === "upscale") {
    return {
      image_url: input.imageUrls?.[0] || "",
      scale: input.upscaleScale || 2,
      model: "RealESRGAN_x4plus",
      face: false,
      output_format: "png",
    };
  }

  throw new Error(`Modelo fal.ai desconhecido: ${model}`);
}

// === Sora 2 specific functions ===

interface SoraCharacterResult {
  id: string;
  name: string;
}

export async function createSoraCharacter(
  falKey: string,
  videoUrl: string,
  name: string
): Promise<SoraCharacterResult> {
  const endpoint = getSoraCharactersEndpoint();
  const response = await fetchWithRetry(`${QUEUE_BASE}/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${falKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ video_url: videoUrl, name }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Sora Characters failed (${response.status}): ${text.slice(0, 300)}`);
  }

  return safeJson(response);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildSoraInput(input: {
  prompt: string;
  imageUrl?: string;
  duration?: number;
  aspectRatio?: string;
  characterIds?: string[];
  seed?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: Record<string, any> = {
    prompt: input.prompt,
    duration: input.duration || 4,
    aspect_ratio: input.aspectRatio || "16:9",
    delete_video: false,
  };
  if (input.imageUrl) body.image_url = input.imageUrl;
  if (input.characterIds && input.characterIds.length > 0) body.character_ids = input.characterIds;
  if (input.seed != null) body.seed = input.seed;
  return body;
}
