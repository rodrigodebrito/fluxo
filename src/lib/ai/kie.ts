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
  referenceVideoUrls?: string[];
  referenceAudioUrls?: string[];
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
  if (input.referenceVideoUrls && input.referenceVideoUrls.length > 0) {
    inputBody.reference_video_urls = input.referenceVideoUrls;
  }
  if (input.referenceAudioUrls && input.referenceAudioUrls.length > 0) {
    inputBody.reference_audio_urls = input.referenceAudioUrls;
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
  multiShotEnabled?: boolean;
  multiShots?: { prompt: string; duration: number }[];
}

export async function createKlingTask(
  apiKey: string,
  input: CreateKlingInput
): Promise<CreateTaskResponse> {
  const isMultiShot = input.multiShotEnabled && input.multiShots && input.multiShots.length > 0;

  const inputBody: Record<string, unknown> = {
    mode: input.mode || "std",
    aspect_ratio: input.aspectRatio || "16:9",
    sound: isMultiShot ? true : (input.sound ?? false),
    multi_shots: isMultiShot ? true : false,
  };

  if (isMultiShot) {
    // Multi-Shot: use multi_prompt array, no top-level prompt
    inputBody.multi_prompt = input.multiShots!.map((s) => ({
      prompt: s.prompt,
      duration: s.duration,
    }));
    // Duration = total of all shots
    inputBody.duration = String(input.multiShots!.reduce((sum, s) => sum + s.duration, 0));
  } else {
    inputBody.prompt = input.prompt;
    inputBody.duration = String(input.duration || 5);
  }

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

// === Kling Motion Control ===

interface CreateKlingMotionInput {
  prompt?: string;
  inputUrls: string[];   // character image(s)
  videoUrls: string[];   // motion reference video
  version?: "2.6" | "3.0";
  mode?: "720p" | "1080p";
  characterOrientation?: "image" | "video";
}

export async function createKlingMotionTask(
  apiKey: string,
  input: CreateKlingMotionInput
): Promise<CreateTaskResponse> {
  const model = input.version === "3.0" ? "kling-3.0/motion-control" : "kling-2.6/motion-control";

  const inputBody: Record<string, unknown> = {
    input_urls: input.inputUrls,
    video_urls: input.videoUrls,
    mode: input.mode || "720p",
    character_orientation: input.characterOrientation || "video",
  };

  if (input.prompt) {
    inputBody.prompt = input.prompt;
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
      if (input.imageUrls.length >= 2) {
        body.generationType = "FIRST_AND_LAST_FRAMES_2_VIDEO";
      } else if (input.model === "veo3_fast") {
        // REFERENCE_2_VIDEO only works with Fast model
        body.generationType = "REFERENCE_2_VIDEO";
      } else {
        // Quality/Lite: use FIRST_AND_LAST_FRAMES with single image
        body.generationType = "FIRST_AND_LAST_FRAMES_2_VIDEO";
      }
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

// === Kling Avatar (TTS + Talking Head) ===

interface CreateAvatarInput {
  imageUrl: string;
  audioUrl: string;
  prompt?: string;
  tier?: "standard" | "pro";
}

export async function createAvatarTask(
  apiKey: string,
  input: CreateAvatarInput
): Promise<CreateTaskResponse> {
  const model = input.tier === "pro" ? "kling/ai-avatar-pro" : "kling/ai-avatar-standard";

  const inputBody: Record<string, unknown> = {
    image_url: input.imageUrl,
    audio_url: input.audioUrl,
    prompt: input.prompt || ".",
  };

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

// === ElevenLabs TTS via Kie AI ===

interface CreateTTSInput {
  text: string;
  voiceId?: string;
  speed?: number;
  languageCode?: string;
}

export async function createTTSTask(
  apiKey: string,
  input: CreateTTSInput
): Promise<CreateTaskResponse> {
  const inputBody: Record<string, unknown> = {
    text: input.text,
    voice: input.voiceId || "Lily",
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0,
    speed: input.speed ?? 1.0,
    language_code: input.languageCode || "",
  };

  const response = await fetchWithRetry(`${API_BASE}/createTask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "elevenlabs/text-to-speech-multilingual-v2", input: inputBody }),
  });

  return safeJson(response);
}

// === Wan 2.7 Image-to-Video ===

interface CreateWan27Input {
  prompt: string;
  negativePrompt?: string;
  firstFrameUrl?: string;
  lastFrameUrl?: string;
  firstClipUrl?: string;
  drivingAudioUrl?: string;
  resolution?: "720p" | "1080p";
  duration?: number;
  promptExtend?: boolean;
  seed?: number | null;
  nsfwChecker?: boolean;
}

export async function createWan27Task(
  apiKey: string,
  input: CreateWan27Input
): Promise<CreateTaskResponse> {
  const inputBody: Record<string, unknown> = {
    prompt: input.prompt,
    resolution: input.resolution || "720p",
    duration: input.duration || 5,
    prompt_extend: input.promptExtend ?? true,
    watermark: false,
    nsfw_checker: input.nsfwChecker ?? false,
  };

  if (input.negativePrompt) inputBody.negative_prompt = input.negativePrompt;
  if (input.firstFrameUrl) inputBody.first_frame_url = input.firstFrameUrl;
  if (input.lastFrameUrl) inputBody.last_frame_url = input.lastFrameUrl;
  if (input.firstClipUrl) inputBody.first_clip_url = input.firstClipUrl;
  if (input.drivingAudioUrl) inputBody.driving_audio_url = input.drivingAudioUrl;
  if (input.seed != null) inputBody.seed = input.seed;

  const response = await fetchWithRetry(`${API_BASE}/createTask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "wan/2-7-image-to-video",
      input: inputBody,
    }),
  });

  return safeJson(response);
}

// === Grok Imagine (Image-to-Video) ===

interface CreateGrokImagineInput {
  imageUrls: string[];
  prompt?: string;
  mode?: "fun" | "normal" | "spicy";
  duration?: number;
  resolution?: "480p" | "720p";
  aspectRatio?: string;
  nsfwChecker?: boolean;
}

export async function createGrokImagineTask(
  apiKey: string,
  input: CreateGrokImagineInput
): Promise<CreateTaskResponse> {
  const inputBody: Record<string, unknown> = {
    image_urls: input.imageUrls,
    mode: input.mode || "normal",
    duration: String(input.duration || 6),
    resolution: input.resolution || "480p",
    aspect_ratio: input.aspectRatio || "16:9",
    nsfw_checker: input.nsfwChecker ?? false,
  };

  if (input.prompt) {
    inputBody.prompt = input.prompt;
  }

  const response = await fetchWithRetry(`${API_BASE}/createTask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-imagine/image-to-video",
      input: inputBody,
    }),
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
