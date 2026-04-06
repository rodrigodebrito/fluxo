const API_BASE = "https://api.kie.ai/api/v1/jobs";

// Safe JSON parse — returns error object if response is not valid JSON
async function safeJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    console.error("[kie] Invalid JSON response:", response.status, text.slice(0, 500));
    throw new Error(`API retornou resposta invalida (status ${response.status}): ${text.slice(0, 200)}`);
  }
}

// Retry para chamadas de criacao de task (500, 502, 503, 429, network errors)
const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 4000, 8000]; // backoff: 2s, 4s, 8s

async function fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, options);

      // Retry on server errors and rate limits
      if (attempt < MAX_RETRIES && (response.status >= 500 || response.status === 429)) {
        const delay = response.status === 429 ? RETRY_DELAYS[attempt] * 2 : RETRY_DELAYS[attempt];
        console.warn(`[kie] Attempt ${attempt + 1} failed (status ${response.status}), retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      return response;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < MAX_RETRIES) {
        console.warn(`[kie] Attempt ${attempt + 1} network error: ${lastError.message}, retrying in ${RETRY_DELAYS[attempt]}ms...`);
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
        continue;
      }
    }
  }

  throw lastError || new Error("Falha apos multiplas tentativas");
}

interface CreateTaskInput {
  prompt: string;
  imageInput?: string[];
  aspectRatio?: string;
  resolution?: string;
  outputFormat?: string;
  seed?: number | null;
}

interface CreateTaskResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
  } | null;
}

interface TaskStatusResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    model: string;
    state: "waiting" | "queuing" | "generating" | "success" | "fail";
    resultJson: string;
    failMsg: string;
    costTime: number;
    progress: number;
  } | null;
}

export async function createImageTask(
  apiKey: string,
  input: CreateTaskInput
): Promise<CreateTaskResponse> {
  const response = await fetchWithRetry(`${API_BASE}/createTask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "nano-banana-pro",
      input: {
        prompt: input.prompt,
        image_input: input.imageInput || [],
        aspect_ratio: input.aspectRatio || "auto",
        resolution: input.resolution || "1K",
        output_format: input.outputFormat || "png",
        ...(input.seed != null ? { seed: input.seed } : {}),
      },
    }),
  });

  return safeJson(response);
}

// === Seedance 2.0 Fast ===

interface CreateSeedanceInput {
  prompt: string;
  sdModel?: string;
  firstFrameUrl?: string;
  lastFrameUrl?: string;
  referenceImageUrls?: string[];
  resolution?: string;
  aspectRatio?: string;
  duration?: number;
  generateAudio?: boolean;
  webSearch?: boolean;
  seed?: number | null;
  fixedLens?: boolean;
}

// Upload para Asset Library da ByteDance (obrigatorio para imagens de pessoas)
export async function createByteDanceAsset(
  apiKey: string,
  url: string,
  assetType: "Image" | "Video" | "Audio" = "Image"
): Promise<{ id: string }> {
  const response = await fetch("https://api.kie.ai/api/v1/playground/createAsset", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, assetType }),
  });
  return safeJson(response);
}

// Verificar status de um asset na ByteDance
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getAssetStatus(
  apiKey: string,
  assetId: string
): Promise<any> {
  const response = await fetch(
    `https://api.kie.ai/api/v1/playground/getAsset?assetId=${encodeURIComponent(assetId)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    }
  );
  return safeJson(response);
}

export async function createSeedanceTask(
  apiKey: string,
  input: CreateSeedanceInput
): Promise<CreateTaskResponse> {
  const inputBody: Record<string, unknown> = {
    prompt: input.prompt,
    aspect_ratio: input.aspectRatio || "16:9",
    resolution: input.resolution || "720p",
    duration: String(input.duration || 8),
    generate_audio: input.generateAudio ?? true,
    web_search: input.webSearch ?? false,
  };

  if (input.firstFrameUrl) {
    inputBody.first_frame_url = input.firstFrameUrl;
  }
  if (input.lastFrameUrl) {
    inputBody.last_frame_url = input.lastFrameUrl;
  }
  if (input.referenceImageUrls && input.referenceImageUrls.length > 0) {
    inputBody.reference_image_urls = input.referenceImageUrls;
  }
  if (input.fixedLens != null) {
    inputBody.fixed_lens = input.fixedLens;
  }

  if (input.seed != null) {
    inputBody.seed = input.seed;
  }

  const response = await fetchWithRetry(`${API_BASE}/createTask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.sdModel || "bytedance/seedance-2",
      input: inputBody,
    }),
  });

  return safeJson(response);
}

export async function getTaskStatus(
  apiKey: string,
  taskId: string
): Promise<TaskStatusResponse> {
  const response = await fetch(
    `${API_BASE}/recordInfo?taskId=${encodeURIComponent(taskId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );

  return safeJson(response);
}

export function parseResultUrls(resultJson: string): string[] {
  try {
    const parsed = JSON.parse(resultJson);
    return parsed.resultUrls || [];
  } catch {
    return [];
  }
}

// === GPT Image 1.5 ===

interface CreateGptImageInput {
  prompt: string;
  inputUrls?: string[];
  aspectRatio?: string;
  quality?: "medium" | "high";
  background?: "transparent" | "opaque";
}

export async function createGptImageTask(
  apiKey: string,
  input: CreateGptImageInput
): Promise<CreateTaskResponse> {
  const isEdit = input.inputUrls && input.inputUrls.length > 0;
  const model = isEdit ? "gpt-image/1.5-image-to-image" : "gpt-image/1.5-text-to-image";

  const inputBody: Record<string, unknown> = {
    prompt: input.prompt,
    aspect_ratio: input.aspectRatio || "1:1",
    quality: input.quality || "medium",
  };

  if (isEdit) {
    inputBody.input_urls = input.inputUrls;
  }

  // background só para text-to-image
  if (!isEdit && input.background) {
    inputBody.background = input.background;
  }

  const response = await fetchWithRetry(`${API_BASE}/createTask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input: inputBody }),
  });

  return safeJson(response);
}

// === Kling 3.0 Video ===

interface CreateKlingInput {
  prompt: string;
  imageUrls?: string[];
  mode?: "std" | "pro";
  duration?: number;
  aspectRatio?: string;
  sound?: boolean;
  elements?: { name: string; description: string; element_input_urls: string[] }[];
}

export async function createKlingTask(
  apiKey: string,
  input: CreateKlingInput
): Promise<CreateTaskResponse> {
  const inputBody: Record<string, unknown> = {
    prompt: input.prompt,
    mode: input.mode || "std",
    duration: String(input.duration || 5),
    aspect_ratio: input.aspectRatio || "16:9",
    sound: input.sound ?? false,
    multi_shots: false,
  };

  if (input.imageUrls && input.imageUrls.length > 0) {
    inputBody.image_urls = input.imageUrls;
  }

  if (input.elements && input.elements.length > 0) {
    inputBody.kling_elements = input.elements;
  }

  const response = await fetchWithRetry(`${API_BASE}/createTask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "kling-3.0/video",
      input: inputBody,
    }),
  });

  return safeJson(response);
}

// === Veo 3.1 Image to Video ===

interface CreateVeoTaskInput {
  prompt: string;
  imageUrls?: string[];
  model?: "veo3" | "veo3_fast" | "veo3_lite";
  generationType?: "TEXT_2_VIDEO" | "FIRST_AND_LAST_FRAMES_2_VIDEO" | "REFERENCE_2_VIDEO";
  aspectRatio?: string;
  duration?: string;
  resolution?: string;
  seed?: number | null;
  enhancePrompt?: boolean;
}

export async function createVeoTask(
  apiKey: string,
  input: CreateVeoTaskInput
): Promise<CreateTaskResponse> {
  const body: Record<string, unknown> = {
    prompt: input.prompt,
    model: input.model || "veo3_fast",
    aspect_ratio: input.aspectRatio || "16:9",
    enableTranslation: true,
  };

  if (input.imageUrls && input.imageUrls.length > 0) {
    body.imageUrls = input.imageUrls;
    // Auto-detect generation type
    if (!input.generationType) {
      body.generationType = input.imageUrls.length >= 2
        ? "FIRST_AND_LAST_FRAMES_2_VIDEO"
        : "REFERENCE_2_VIDEO";
    } else {
      body.generationType = input.generationType;
    }
  } else {
    body.generationType = "TEXT_2_VIDEO";
  }

  if (input.seed != null) {
    body.seeds = input.seed;
  }

  const response = await fetchWithRetry("https://api.kie.ai/api/v1/veo/generate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return safeJson(response);
}

// Veo status endpoint (diferente do Nano Banana)
interface VeoStatusResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    successFlag: number; // 0=generating, 1=success, 2=failed, 3=failed
    response: {
      fullResultUrls: string[] | null;
      resultUrls: string[] | null;
      full_result_urls: string[] | null;
      resolution: string;
    } | null;
    errorCode: number | null;
    errorMessage: string | null;
  } | null;
}

export async function getVeoTaskStatus(
  apiKey: string,
  taskId: string
): Promise<VeoStatusResponse> {
  const response = await fetch(
    `https://api.kie.ai/api/v1/veo/record-info?taskId=${encodeURIComponent(taskId)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    }
  );
  return safeJson(response);
}
