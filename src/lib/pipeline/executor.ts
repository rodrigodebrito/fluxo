import { type Node, type Edge } from "@xyflow/react";

// Cache for Replicate results (sync generation, no polling needed)
// Uses window global to ensure same instance across dynamic imports
function getReplicateCache(): Map<string, string[]> {
  if (typeof window !== "undefined") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    if (!w.__replicateResultsCache) {
      w.__replicateResultsCache = new Map<string, string[]>();
    }
    return w.__replicateResultsCache;
  }
  return new Map();
}

interface LLMChain {
  prompt: string;
  systemPrompt?: string;
  imageUrls?: string[];
  model: string;
  temperature: number;
  llmNodeId: string;
}

interface PipelineData {
  prompt: string;
  localImageUrls: string[];
  model: string;
  modelNodeId: string | null;
  resolution: string;
  aspectRatio: string;
  seed: number | null;
  runs: number;
  // Veo-specific
  veoModel?: string;
  enhancePrompt?: boolean;
  // Seedance-specific
  sdModel?: string;
  sdResolution?: string;
  sdDuration?: number;
  generateAudio?: boolean;
  webSearch?: boolean;
  // Kling-specific
  klingMode?: string;
  klingDuration?: number;
  klingElements?: { name: string; description: string; imageUrls: string[] }[];
  // Seedance reference images
  referenceImageUrls?: string[];
  // GPT Image
  gptQuality?: string;
  gptBackground?: string;
  // Seedance 1.5 Pro
  fixedLens?: boolean;
  // fal.ai models
  videoUrl?: string;
  cfgScale?: number;
  keepAudio?: boolean;
  klingO3Duration?: number;
  klingO1Duration?: number;
  falTier?: "std" | "pro";
  // Multi-Shot
  multiShotEnabled?: boolean;
  multiShots?: { prompt: string; duration: number }[];
  // Motion Control
  motionVersion?: string;
  motionMode?: string;
  characterOrientation?: string;
  videoDuration?: number;
  // Flux 2
  fluxImageSize?: string;
  // Upscale
  upscaleScale?: number;
  // Wan 2.1 I2V
  wanResolution?: string;
  wanDuration?: number;
  // Custom Model (Replicate LoRA)
  trainedModelId?: string;
  extraLoraIds?: string[];
  nsfwEnabled?: boolean;
  nsfwScale?: number;
  realismEnabled?: boolean;
  realismScale?: number;
  mainLoraScale?: number;
  customAspectRatio?: string;
  customNumOutputs?: number;
  // Grok Imagine
  grokResolution?: string;
  grokDuration?: number;
  grokMode?: string;
  // Negative prompt (separate for models that need it)
  negativePrompt?: string;
  // Prompt extend
  promptExtend?: boolean;
  // Extract Audio
  audioFormat?: string;
  // Z-Image Turbo
  zimageSteps?: number;
  zimageAcceleration?: string;
  zimageSafety?: boolean;
  zimageStrength?: number;
  zimageSize?: string;
  zimageLoras?: { path: string; scale: number }[];
  // Kling Avatar
  avatarTier?: string;
  avatarText?: string;
  avatarVoice?: string;
  avatarSpeed?: number;
  audioUrl?: string;
  audioDuration?: number;
  // LLM Chain
  llmChain?: LLMChain;
  // Text Iterator — array of complete prompts (one per iterator item)
  iteratorPrompts?: string[];
}

// Percorre os nós conectados e coleta os dados do pipeline
export function extractPipelineData(nodes: Node[], edges: Edge[], modelNodeId?: string): PipelineData {
  const result: PipelineData = {
    prompt: "",
    localImageUrls: [],
    model: "nano-banana-pro",
    modelNodeId: null,
    resolution: "1K",
    aspectRatio: "auto",
    seed: null,
    runs: 1,
  };

  const modelNode = modelNodeId
    ? nodes.find((n) => n.id === modelNodeId)
    : nodes.find((n) => n.type === "model");

  if (!modelNode) return result;

  result.modelNodeId = modelNode.id;
  result.model = (modelNode.data.model as string) || "nano-banana-pro";
  result.resolution = (modelNode.data.resolution as string) || "1K";
  result.aspectRatio = (modelNode.data.aspectRatio as string) || "auto";
  result.runs = (modelNode.data.runs as number) || 1;
  result.veoModel = (modelNode.data.veoModel as string) || "veo3_fast";
  result.enhancePrompt = (modelNode.data.enhancePrompt as boolean) ?? true;
  result.sdModel = (modelNode.data.sdModel as string) || "bytedance/seedance-2";
  result.sdResolution = (modelNode.data.sdResolution as string) || "720p";
  result.sdDuration = (modelNode.data.sdDuration as number) || 8;
  result.generateAudio = (modelNode.data.generateAudio as boolean) ?? true;
  result.webSearch = (modelNode.data.webSearch as boolean) ?? false;
  result.klingMode = (modelNode.data.klingMode as string) || "std";
  result.klingDuration = (modelNode.data.klingDuration as number) || 5;
  result.gptQuality = (modelNode.data.gptQuality as string) || "medium";
  result.gptBackground = (modelNode.data.gptBackground as string) || "opaque";
  result.fixedLens = (modelNode.data.fixedLens as boolean) ?? false;
  result.cfgScale = (modelNode.data.cfgScale as number) ?? 0.5;
  result.keepAudio = (modelNode.data.keepAudio as boolean) ?? true;
  result.klingO3Duration = (modelNode.data.klingO3Duration as number) || 5;
  result.klingO1Duration = (modelNode.data.klingO1Duration as number) || 5;
  result.falTier = (modelNode.data.falTier as "std" | "pro") || "pro";
  result.multiShotEnabled = (modelNode.data.multiShotEnabled as boolean) ?? false;
  result.multiShots = (modelNode.data.multiShots as { prompt: string; duration: number }[]) || [];
  result.motionVersion = (modelNode.data.motionVersion as string) || "2.6";
  result.motionMode = (modelNode.data.motionMode as string) || "720p";
  result.characterOrientation = (modelNode.data.characterOrientation as string) || "video";
  result.fluxImageSize = (modelNode.data.fluxImageSize as string) || "landscape_4_3";
  result.upscaleScale = (modelNode.data.upscaleScale as number) || 2;
  result.wanResolution = (modelNode.data.wanResolution as string) || "720p";
  result.wanDuration = (modelNode.data.wanDuration as number) || 81;
  result.trainedModelId = (modelNode.data.trainedModelId as string) || "";
  const extraLoras = (modelNode.data.extraLoras as { id: string; trigger: string }[]) || [];
  result.extraLoraIds = extraLoras.map((l) => l.id).filter((id) => id !== "");
  result.nsfwEnabled = (modelNode.data.nsfwEnabled as boolean) ?? true;
  result.nsfwScale = (modelNode.data.nsfwScale as number) ?? 0.6;
  result.realismEnabled = (modelNode.data.realismEnabled as boolean) ?? true;
  result.realismScale = (modelNode.data.realismScale as number) ?? 0.7;
  result.mainLoraScale = (modelNode.data.mainLoraScale as number) ?? 1;
  result.customAspectRatio = (modelNode.data.customAspectRatio as string) || "1:1";
  result.customNumOutputs = (modelNode.data.customNumOutputs as number) || 1;
  result.grokResolution = (modelNode.data.grokResolution as string) || "480p";
  result.grokDuration = (modelNode.data.grokDuration as number) || 6;
  result.grokMode = (modelNode.data.grokMode as string) || "normal";
  result.promptExtend = (modelNode.data.promptExtend as boolean) ?? true;
  result.audioFormat = (modelNode.data.audioFormat as string) || "mp3";
  result.avatarTier = (modelNode.data.avatarTier as string) || "standard";
  result.avatarText = (modelNode.data.avatarText as string) || "";
  result.avatarVoice = (modelNode.data.avatarVoice as string) || "pFZP5JQG7iQjIQuC4Bku";
  result.avatarSpeed = (modelNode.data.avatarSpeed as number) ?? 1.0;

  const randomSeed = (modelNode.data.randomSeed as boolean) ?? true;
  result.seed = randomSeed ? null : (modelNode.data.seed as number | null);

  // Coletar imagens na ordem dos handles (image-1, image-2, ...)
  const imageInputCount = (modelNode.data.imageInputCount as number) || 1;
  const imagesByHandle: Record<string, string[]> = {};

  let negativePrompt = "";

  // Helper: resolve router pass-through — if source is a router, find the real source
  function resolveSource(nodeId: string): Node | null {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return null;
    if (node.type === "router") {
      const inputEdge = edges.find((e) => e.target === node.id && e.targetHandle === "input");
      if (inputEdge) return resolveSource(inputEdge.source);
      return null;
    }
    return node;
  }

  for (const edge of edges) {
    if (edge.target === modelNode.id) {
      const rawSource = nodes.find((n) => n.id === edge.source);
      // If source is a router, resolve to the actual source node
      const sourceNode = rawSource?.type === "router" ? resolveSource(rawSource.id) : rawSource;
      if (!sourceNode) continue;

      if (sourceNode.type === "prompt" && edge.targetHandle === "negative-prompt") {
        negativePrompt = (sourceNode.data.text as string) || "";
        continue;
      }

      // PromptConcat → Model: concatenate all connected prompts
      if (sourceNode.type === "promptConcat" && edge.targetHandle === "prompt") {
        const parts: string[] = [];
        const inputCount = (sourceNode.data.inputCount as number) || 2;
        let iteratorItems: string[] | null = null;
        let iteratorSlotIndex = -1;

        // Collect prompts in order (prompt-1, prompt-2, ...)
        for (let i = 1; i <= inputCount; i++) {
          const promptEdge = edges.find((e) => e.target === sourceNode.id && e.targetHandle === `prompt-${i}`);
          if (!promptEdge) continue;
          const promptSource = resolveSource(promptEdge.source);

          // TextIterator connected to PromptConcat
          if (promptSource?.type === "textIterator") {
            const rawItems = (promptSource.data.items as string[]) || [];
            iteratorItems = rawItems.filter((t) => t.trim() !== "");
            iteratorSlotIndex = parts.length;
            parts.push("__ITERATOR__"); // placeholder
            continue;
          }

          if (promptSource?.type === "prompt") {
            const text = (promptSource.data.text as string) || "";
            if (text.trim()) parts.push(text.trim());
          }
        }

        // Add additional text from the node itself
        const additionalText = (sourceNode.data.additionalText as string) || "";
        if (additionalText.trim()) parts.push(additionalText.trim());

        if (iteratorItems && iteratorItems.length > 0 && iteratorSlotIndex >= 0) {
          // Build one complete prompt per iterator item
          result.iteratorPrompts = iteratorItems.map((item) => {
            const promptParts = [...parts];
            promptParts[iteratorSlotIndex] = item;
            return promptParts.join("\n\n");
          });
          // Use first item as the default prompt (for display/preview)
          result.prompt = result.iteratorPrompts[0];
        } else {
          result.prompt = parts.join("\n\n");
        }
        continue;
      }

      // TextIterator → Model direct (without PromptConcat)
      if (sourceNode.type === "textIterator" && edge.targetHandle === "prompt") {
        const rawItems = (sourceNode.data.items as string[]) || [];
        const validItems = rawItems.filter((t) => t.trim() !== "");
        if (validItems.length > 0) {
          result.iteratorPrompts = validItems;
          result.prompt = validItems[0];
        }
        continue;
      }

      // AnyLLM → Model: detect LLM chain
      if (sourceNode.type === "anyLLM" && edge.targetHandle === "prompt") {
        // If LLM already has generated text, use it directly
        const existingText = (sourceNode.data.generatedText as string) || "";
        if (existingText) {
          result.prompt = existingText;
        } else {
          // Collect the LLM node's inputs to run it as part of the pipeline
          let llmPrompt = "";
          let llmSystemPrompt = "";
          const llmImageUrls: string[] = [];

          for (const llmEdge of edges) {
            if (llmEdge.target !== sourceNode.id) continue;
            const llmSource = nodes.find((n) => n.id === llmEdge.source);
            if (!llmSource) continue;

            if (llmEdge.targetHandle === "prompt" && llmSource.type === "promptConcat") {
              // Resolve promptConcat: concatenate all its inputs
              const parts: string[] = [];
              const pcInputCount = (llmSource.data.inputCount as number) || 2;
              for (let pi = 1; pi <= pcInputCount; pi++) {
                const pcEdge = edges.find((e) => e.target === llmSource.id && e.targetHandle === `prompt-${pi}`);
                if (!pcEdge) continue;
                const pcSrc = resolveSource(pcEdge.source);
                if (pcSrc?.type === "prompt") {
                  const t = (pcSrc.data.text as string) || "";
                  if (t.trim()) parts.push(t.trim());
                }
              }
              const pcAdditional = (llmSource.data.additionalText as string) || "";
              if (pcAdditional.trim()) parts.push(pcAdditional.trim());
              llmPrompt = parts.join("\n\n");
            } else if (llmSource.type === "prompt" && llmEdge.targetHandle === "prompt") {
              llmPrompt = (llmSource.data.text as string) || "";
            } else if (llmSource.type === "prompt" && llmEdge.targetHandle === "system-prompt") {
              llmSystemPrompt = (llmSource.data.text as string) || "";
            } else if (llmSource.type === "imageInput" && llmEdge.targetHandle?.startsWith("image-")) {
              const imgs = (llmSource.data.images as Array<{ url: string; name: string }>) || [];
              llmImageUrls.push(...imgs.map((img) => img.url).filter(Boolean));
            }
          }

          if (llmPrompt) {
            result.llmChain = {
              prompt: llmPrompt,
              systemPrompt: llmSystemPrompt || undefined,
              imageUrls: llmImageUrls.length > 0 ? llmImageUrls : undefined,
              model: (sourceNode.data.llmModel as string) || "gpt-4.1",
              temperature: (sourceNode.data.temperature as number) ?? 0.7,
              llmNodeId: sourceNode.id,
            };
          }
        }
        continue;
      }

      if (sourceNode.type === "prompt") {
        result.prompt = (sourceNode.data.text as string) || "";
      } else if (sourceNode.type === "imageInput") {
        const handleId = edge.targetHandle || "image-1";
        const images = (sourceNode.data.images as Array<{ url: string; name: string }>) || [];
        const urls = images.map((img) => img.url).filter(Boolean);
        imagesByHandle[handleId] = [...(imagesByHandle[handleId] || []), ...urls];
      } else if (sourceNode.type === "lastFrame") {
        // LastFrame → Model: usar a imagem do último frame extraído
        const frameUrl = sourceNode.data.frameUrl as string;
        if (frameUrl) {
          const handleId = edge.targetHandle || "image-1";
          imagesByHandle[handleId] = [...(imagesByHandle[handleId] || []), frameUrl];
        }
      } else if (sourceNode.type === "videoInput") {
        // VideoInput → Model: video URL para modelos fal.ai
        const vUrl = (sourceNode.data.videoUrl as string) || "";
        if (vUrl) {
          result.videoUrl = vUrl;
          const vDur = sourceNode.data.videoDuration as number;
          if (vDur > 0) result.videoDuration = vDur;
        }
      } else if (sourceNode.type === "audioInput") {
        // AudioInput → Model: audio URL para avatar
        const aUrl = (sourceNode.data.audioUrl as string) || "";
        if (aUrl) {
          result.audioUrl = aUrl;
          const aDur = sourceNode.data.audioDuration as number;
          if (aDur > 0) result.audioDuration = aDur;
        }
      } else if (sourceNode.type === "model") {
        // Model → Model: usar resultado como referência
        const coverUrl = sourceNode.data.coverResultUrl as string | null;
        if (coverUrl) {
          const handleId = edge.targetHandle || "image-1";
          // Se conectado ao handle video-1, usar como videoUrl
          if (handleId === "video-1") {
            result.videoUrl = coverUrl;
          } else if (handleId === "audio-1") {
            // Audio output (e.g. extract-audio) → audio input
            result.audioUrl = coverUrl;
          } else {
            imagesByHandle[handleId] = [...(imagesByHandle[handleId] || []), coverUrl];
          }
        }
      }
    }
  }

  // Store negative prompt separately for models that support it, otherwise concatenate
  if (negativePrompt.trim()) {
    result.negativePrompt = negativePrompt.trim();
    // For models without native negative prompt support, append to main prompt
    const modelsWithNativeNeg = ["wan-i2v", "seedance", "veo3", "kling"];
    if (!modelsWithNativeNeg.includes(result.model)) {
      result.prompt = `${result.prompt}\n${negativePrompt.trim()}`;
    }
  }

  // Ordenar imagens por handle (image-1 primeiro, image-2 depois, etc.)
  for (let i = 1; i <= imageInputCount; i++) {
    const handleImages = imagesByHandle[`image-${i}`] || [];
    result.localImageUrls.push(...handleImages);
  }

  // Coletar elements (Kling) - KlingElement nodes conectados aos element handles
  const elementCount = (modelNode.data.elementCount as number) || 0;
  if (elementCount > 0) {
    result.klingElements = [];
    for (let i = 1; i <= elementCount; i++) {
      const handleId = `element-${i}`;
      // Encontrar o KlingElement node conectado a este handle
      const elementEdge = edges.find((e) => e.target === modelNode.id && e.targetHandle === handleId);
      if (!elementEdge) continue;
      const elementNode = nodes.find((n) => n.id === elementEdge.source && n.type === "klingElement");
      if (!elementNode) {
        // Fallback: imagens diretas (compatibilidade)
        const directImages = imagesByHandle[handleId] || [];
        if (directImages.length > 0) {
          result.klingElements.push({ name: `element_${i}`, description: `element_${i}`, imageUrls: directImages });
        }
        continue;
      }

      // Coletar imagens conectadas ao KlingElement node
      const elImages: string[] = [];
      for (const elEdge of edges) {
        if (elEdge.target !== elementNode.id) continue;
        const srcNode = nodes.find((n) => n.id === elEdge.source);
        if (!srcNode) continue;
        if (srcNode.type === "imageInput") {
          const imgs = (srcNode.data.images as Array<{ url: string; name: string }>) || [];
          elImages.push(...imgs.map((img) => img.url).filter(Boolean));
        } else if (srcNode.type === "model") {
          const coverUrl = srcNode.data.coverResultUrl as string | null;
          if (coverUrl) elImages.push(coverUrl);
        }
      }

      if (elImages.length > 0) {
        const elName = `element${i}`;
        const elDesc = (elementNode.data.elementDescription as string) || elName;
        result.klingElements.push({ name: elName, description: elDesc, imageUrls: elImages });
      }
    }
  }

  // Coletar reference images (Seedance) - ref-1, ref-2, ... ref-9
  const refCount = (modelNode.data.refCount as number) || 0;
  if (refCount > 0) {
    result.referenceImageUrls = [];
    for (let i = 1; i <= refCount; i++) {
      const refImages = imagesByHandle[`ref-${i}`] || [];
      result.referenceImageUrls.push(...refImages);
    }
  }

  return result;
}

// Executa LLM chain antes da geracao de imagem/video
export async function runLLMChain(chain: LLMChain): Promise<string> {
  let publicImageUrls: string[] | undefined;
  if (chain.imageUrls && chain.imageUrls.length > 0) {
    publicImageUrls = await uploadImages(chain.imageUrls);
  }

  const response = await fetch("/api/generate-llm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: chain.prompt,
      systemPrompt: chain.systemPrompt,
      model: chain.model,
      temperature: chain.temperature,
      imageUrls: publicImageUrls && publicImageUrls.length > 0 ? publicImageUrls : undefined,
      cost: chain.model === "gpt-5.4-pro" ? 2 : 1,
    }),
  });

  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`Resposta invalida do LLM: ${text.slice(0, 200)}`); }
  if (!response.ok) throw new Error(data.error || "Erro ao gerar texto com LLM");
  return data.text;
}

// Faz upload das imagens locais (blob) e retorna URLs públicas
// URLs que já são públicas (http/https) são mantidas sem re-upload
async function uploadImages(blobUrls: string[]): Promise<string[]> {
  if (blobUrls.length === 0) return [];

  const publicUrls: string[] = [];
  const blobsToUpload: string[] = [];
  const currentOrigin = window.location.origin;

  for (const url of blobUrls) {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      publicUrls.push(url);
    } else if (url.startsWith("blob:")) {
      // Blob URLs only work on the domain that created them
      if (!url.startsWith(`blob:${currentOrigin}/`)) {
        throw new Error("Imagens expiradas. Remova e adicione as imagens novamente.");
      }
      blobsToUpload.push(url);
    } else {
      blobsToUpload.push(url);
    }
  }

  if (blobsToUpload.length === 0) return publicUrls;

  const formData = new FormData();

  for (const blobUrl of blobsToUpload) {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    const ext = blob.type.split("/")[1] || "png";
    formData.append("files", blob, `image.${ext}`);
  }

  const uploadResponse = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  const text = await uploadResponse.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`Resposta invalida do servidor: ${text.slice(0, 200)}`); }
  if (!uploadResponse.ok) {
    throw new Error(data.error || "Erro ao fazer upload das imagens");
  }

  return [...publicUrls, ...data.urls];
}

// Inicia a geração chamando a API (imagem ou video)
export async function startGeneration(
  prompt: string,
  localImageUrls: string[],
  options?: {
    model?: string;
    resolution?: string;
    aspectRatio?: string;
    seed?: number | null;
    veoModel?: string;
    enhancePrompt?: boolean;
    sdModel?: string;
    sdResolution?: string;
    sdDuration?: number;
    generateAudio?: boolean;
    webSearch?: boolean;
    klingMode?: string;
    klingDuration?: number;
    klingElements?: { name: string; description: string; imageUrls: string[] }[];
    referenceImageUrls?: string[];
    gptQuality?: string;
    gptBackground?: string;
    fixedLens?: boolean;
    videoUrl?: string;
    cfgScale?: number;
    keepAudio?: boolean;
    klingO3Duration?: number;
    klingO1Duration?: number;
    falTier?: "std" | "pro";
    multiShotEnabled?: boolean;
    multiShots?: { prompt: string; duration: number }[];
    motionVersion?: string;
    motionMode?: string;
    characterOrientation?: string;
    fluxImageSize?: string;
    upscaleScale?: number;
    wanResolution?: string;
    wanDuration?: number;
    trainedModelId?: string;
    extraLoraIds?: string[];
    nsfwEnabled?: boolean;
    nsfwScale?: number;
    realismEnabled?: boolean;
    realismScale?: number;
    mainLoraScale?: number;
    customAspectRatio?: string;
    customNumOutputs?: number;
    avatarTier?: string;
    avatarText?: string;
    avatarVoice?: string;
    avatarSpeed?: number;
    audioUrl?: string;
    audioDuration?: number;
    grokResolution?: string;
    grokDuration?: number;
    grokMode?: string;
    negativePrompt?: string;
    promptExtend?: boolean;
    audioFormat?: string;
    // Z-Image Turbo
    zimageSteps?: number;
    zimageAcceleration?: string;
    zimageSafety?: boolean;
    zimageStrength?: number;
    zimageSize?: string;
    zimageLoras?: { path: string; scale: number }[];
    cost?: number;
  }
): Promise<string> {
  const publicUrls = await uploadImages(localImageUrls);

  // Extract Audio — synchronous, returns audioUrl directly (stored in cache like Replicate sync)
  if (options?.model === "extract-audio") {
    let videoUrl = options.videoUrl;
    if (videoUrl && videoUrl.startsWith("blob:")) {
      const uploaded = await uploadImages([videoUrl]);
      videoUrl = uploaded[0] || videoUrl;
    }
    if (!videoUrl) throw new Error("Nenhum video conectado ao Extract Audio");

    const response = await fetch("/api/extract-audio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoUrl, format: options.audioFormat || "mp3", cost: options.cost || 1 }),
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { throw new Error(`Resposta invalida: ${text.slice(0, 200)}`); }
    if (!response.ok) throw new Error(data.error || "Erro ao extrair audio");

    // Store in Replicate cache so FlowEditor picks it up without polling
    const cache = getReplicateCache();
    const fakeId = `extract-audio-${Date.now()}`;
    cache.set(fakeId, [data.audioUrl]);
    return fakeId;
  }

  // GPT Image 1.5 (text-to-image e image-to-image)
  if (options?.model === "gpt-image-txt" || options?.model === "gpt-image-img") {
    const response = await fetch("/api/generate-gpt-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        inputUrls: publicUrls.length > 0 ? publicUrls : undefined,
        aspectRatio: options?.aspectRatio || "1:1",
        quality: options?.gptQuality || "medium",
        background: options?.model === "gpt-image-txt" ? (options?.gptBackground || "opaque") : undefined,
        cost: options?.cost,
      }),
    });
    const gptText = await response.text();
    let data;
    try { data = JSON.parse(gptText); } catch { throw new Error(`Resposta invalida do servidor: ${gptText.slice(0, 200)}`); }
    if (!response.ok) throw new Error(data.error || "Erro ao iniciar geracao GPT Image");
    return data.taskId;
  }

  // Kling Avatar TTS (Kie AI) — async task com polling
  if (options?.model === "kling-avatar") {
    // Upload audio if it's a blob
    let audioUrl = options.audioUrl;
    if (audioUrl && audioUrl.startsWith("blob:")) {
      const uploaded = await uploadImages([audioUrl]);
      audioUrl = uploaded[0] || audioUrl;
    }

    const response = await fetch("/api/generate-avatar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageUrl: publicUrls[0] || "",
        audioUrl: audioUrl || undefined,
        text: !audioUrl ? (options.avatarText || prompt || undefined) : undefined,
        prompt: prompt || undefined,
        voiceId: options.avatarVoice || "pFZP5JQG7iQjIQuC4Bku",
        speed: options.avatarSpeed ?? 1.0,
        languageCode: "pt",
        avatarTier: options.avatarTier || "standard",
        cost: options.cost,
      }),
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { throw new Error(`Resposta invalida: ${text.slice(0, 200)}`); }
    if (!response.ok) throw new Error(data.error || "Erro ao gerar avatar");
    return data.taskId;
  }

  // Grok Imagine I2V (Kie.ai) — polling padrao
  if (options?.model === "grok-i2v") {
    const response = await fetch("/api/generate-grok", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        imageUrls: publicUrls,
        mode: options.grokMode || "normal",
        duration: options.grokDuration || 6,
        resolution: options.grokResolution || "480p",
        aspectRatio: options.aspectRatio || "16:9",
        cost: options.cost,
      }),
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { throw new Error(`Resposta invalida: ${text.slice(0, 200)}`); }
    if (!response.ok) throw new Error(data.error || "Erro ao criar task Grok Imagine");
    return data.taskId;
  }

  // Wan 2.7 I2V (Kie.ai) — polling padrao
  if (options?.model === "wan-i2v") {
    // Upload video/audio references if connected (blob → public URL)
    let firstClipUrl: string | undefined;
    if (options.videoUrl) {
      if (options.videoUrl.startsWith("blob:")) {
        const uploaded = await uploadImages([options.videoUrl]);
        firstClipUrl = uploaded[0] || undefined;
      } else {
        firstClipUrl = options.videoUrl;
      }
    }
    let drivingAudioUrl: string | undefined;
    if (options.audioUrl) {
      if (options.audioUrl.startsWith("blob:")) {
        const uploaded = await uploadImages([options.audioUrl]);
        drivingAudioUrl = uploaded[0] || undefined;
      } else {
        drivingAudioUrl = options.audioUrl;
      }
    }

    const response = await fetch("/api/generate-wan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        negativePrompt: options.negativePrompt || undefined,
        firstFrameUrl: publicUrls[0] || undefined,
        lastFrameUrl: publicUrls[1] || undefined,
        firstClipUrl: firstClipUrl || undefined,
        drivingAudioUrl: drivingAudioUrl || undefined,
        resolution: options.wanResolution || "720p",
        duration: options.wanDuration || 5,
        promptExtend: options.promptExtend ?? true,
        seed: options.seed ?? undefined,
        cost: options.cost,
      }),
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { throw new Error(`Resposta invalida: ${text.slice(0, 200)}`); }
    if (!response.ok) throw new Error(data.error || "Erro ao criar task Wan 2.7");
    return data.taskId;
  }

  // Custom Model (Replicate LoRA) — retorno sincrono, nao precisa de polling
  if (options?.model === "custom-model") {
    const response = await fetch("/api/generate-replicate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trainedModelId: options.trainedModelId,
        extraLoraIds: options.extraLoraIds || [],
        nsfwEnabled: options.nsfwEnabled ?? true,
        nsfwScale: options.nsfwScale ?? 0.6,
        realismEnabled: options.realismEnabled ?? true,
        realismScale: options.realismScale ?? 0.7,
        mainLoraScale: options.mainLoraScale ?? 1,
        prompt,
        aspectRatio: options.customAspectRatio || "1:1",
        numOutputs: options.customNumOutputs || 1,
        cost: options.cost,
      }),
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { throw new Error(`Resposta invalida: ${text.slice(0, 200)}`); }
    if (!response.ok) throw new Error(data.error || "Erro ao gerar com modelo treinado");
    // Store URLs for direct retrieval (skip polling)
    const taskId = `replicate_${Date.now()}`;
    getReplicateCache().set(taskId, data.urls || []);
    return taskId;
  }

  // fal.ai models (Kling O3 i2v, O3 edit, O3 ref, Flux 2, utilities)
  const FAL_MODELS = ["kling-o3-i2v", "kling-o3-edit", "kling-o1-ref", "flux-2-pro", "flux-2-edit", "bg-removal", "upscale", "zimage-t2i", "zimage-i2i", "zimage-lora", "zimage-i2i-lora"];
  if (options?.model && FAL_MODELS.includes(options.model)) {
    // Upload element images for fal.ai
    let falElements: { frontal_image_url: string; reference_image_urls?: string[] }[] | undefined;
    if (options.klingElements && options.klingElements.length > 0) {
      falElements = [];
      for (const el of options.klingElements) {
        const elPublicUrls = await uploadImages(el.imageUrls);
        if (elPublicUrls.length > 0) {
          falElements.push({
            frontal_image_url: elPublicUrls[0],
            reference_image_urls: elPublicUrls.slice(1),
          });
        }
      }
    }

    // Upload video URL if it's a blob
    let videoUrl = options.videoUrl;
    if (videoUrl && videoUrl.startsWith("blob:")) {
      const uploaded = await uploadImages([videoUrl]);
      videoUrl = uploaded[0] || videoUrl;
    }

    const response = await fetch("/api/generate-fal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: options.model,
        tier: options.falTier || "pro",
        prompt,
        negativePrompt: undefined,
        imageUrls: publicUrls.length > 0 ? publicUrls : undefined,
        videoUrl,
        endImageUrl: publicUrls[1] || undefined,
        duration: options.model === "kling-o3-i2v" ? (options.klingO3Duration || 5) :
                  options.model === "kling-o1-ref" ? (options.klingO1Duration || 5) : undefined,
        aspectRatio: options.aspectRatio || "16:9",
        generateAudio: options.generateAudio ?? false,
        cfgScale: options.cfgScale ?? 0.5,
        keepAudio: options.keepAudio ?? true,
        elements: falElements && falElements.length > 0 ? falElements : undefined,
        multiShotEnabled: options.multiShotEnabled,
        multiShots: options.multiShots && options.multiShots.length > 0 ? options.multiShots : undefined,
        fluxImageSize: options.fluxImageSize,
        seed: options.seed ?? undefined,
        upscaleScale: options.upscaleScale,
        // Z-Image Turbo
        zimageSteps: options.zimageSteps,
        zimageAcceleration: options.zimageAcceleration,
        zimageSafety: options.zimageSafety,
        zimageStrength: options.zimageStrength,
        zimageSize: options.zimageSize,
        zimageLoras: options.zimageLoras,
        cost: options.cost,
      }),
    });
    const falText = await response.text();
    let data;
    try { data = JSON.parse(falText); } catch { throw new Error(`Resposta invalida do servidor: ${falText.slice(0, 200)}`); }
    if (!response.ok) throw new Error(data.error || "Erro ao iniciar geracao fal.ai");
    // Return taskId with falEndpoint + status/response URLs encoded (separator: |)
    const parts = [data.taskId, data.falEndpoint, data.statusUrl || "", data.responseUrl || ""];
    return parts.join("|");
  }

  // Kling Motion Control
  if (options?.model === "kling-motion") {
    // Upload video URL if it's a blob
    let videoUrl = options.videoUrl;
    if (videoUrl && videoUrl.startsWith("blob:")) {
      const uploaded = await uploadImages([videoUrl]);
      videoUrl = uploaded[0] || videoUrl;
    }

    const response = await fetch("/api/generate-kling", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "kling-motion",
        prompt: prompt || undefined,
        inputUrls: publicUrls.length > 0 ? publicUrls : undefined,
        videoUrls: videoUrl ? [videoUrl] : undefined,
        motionVersion: options.motionVersion || "2.6",
        motionMode: options.motionMode || "720p",
        characterOrientation: options.characterOrientation || "video",
        cost: options.cost,
      }),
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { throw new Error(`Resposta invalida do servidor: ${text.slice(0, 200)}`); }
    if (!response.ok) throw new Error(data.error || "Erro ao iniciar geracao Kling Motion");
    return data.taskId;
  }

  // Kling 3.0
  if (options?.model === "kling") {
    // Upload element images separadamente
    let elements: { name: string; description: string; element_input_urls: string[] }[] | undefined;
    if (options.klingElements && options.klingElements.length > 0) {
      elements = [];
      for (const el of options.klingElements) {
        const elPublicUrls = await uploadImages(el.imageUrls);
        if (elPublicUrls.length > 0) {
          elements.push({
            name: el.name,
            description: el.description || el.name,
            element_input_urls: elPublicUrls,
          });
        }
      }
    }

    // Se tem elements mas não tem image_urls, usar a primeira imagem do primeiro element
    let klingImageUrls = publicUrls.length > 0 ? publicUrls : undefined;
    if (!klingImageUrls && elements && elements.length > 0) {
      const firstElUrl = elements[0]?.element_input_urls?.[0];
      if (firstElUrl) klingImageUrls = [firstElUrl];
    }

    const response = await fetch("/api/generate-kling", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        imageUrls: klingImageUrls,
        mode: options?.klingMode || "std",
        duration: options?.klingDuration || 5,
        aspectRatio: options?.aspectRatio || "16:9",
        sound: options?.generateAudio ?? false,
        elements: elements && elements.length > 0 ? elements : undefined,
        multiShotEnabled: options?.multiShotEnabled,
        multiShots: options?.multiShots && options.multiShots.length > 0 ? options.multiShots : undefined,
        cost: options?.cost,
      }),
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { throw new Error(`Resposta invalida do servidor: ${text.slice(0, 200)}`); }
    if (!response.ok) throw new Error(data.error || "Erro ao iniciar geracao Kling");
    return data.taskId;
  }

  // Veo 3.1
  if (options?.model === "veo3") {
    const response = await fetch("/api/generate-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        imageUrls: publicUrls.length > 0 ? publicUrls : undefined,
        model: options?.veoModel || "veo3_fast",
        aspectRatio: options?.aspectRatio || "16:9",
        seed: options?.seed ?? undefined,
        cost: options?.cost,
      }),
    });
    const veoText = await response.text();
    let data;
    try { data = JSON.parse(veoText); } catch { throw new Error(`Resposta invalida do servidor: ${veoText.slice(0, 200)}`); }
    if (!response.ok) throw new Error(data.error || "Erro ao iniciar geracao de video");
    return data.taskId;
  }

  // Seedance 2.0
  if (options?.model === "seedance") {
    // Upload reference images separadamente
    let refPublicUrls: string[] | undefined;
    if (options.referenceImageUrls && options.referenceImageUrls.length > 0) {
      refPublicUrls = await uploadImages(options.referenceImageUrls);
    }

    // Upload video/audio references if connected
    let videoRefUrl: string | undefined;
    if (options.videoUrl) {
      if (options.videoUrl.startsWith("blob:")) {
        const uploaded = await uploadImages([options.videoUrl]);
        videoRefUrl = uploaded[0] || undefined;
      } else {
        videoRefUrl = options.videoUrl;
      }
    }
    let audioRefUrl: string | undefined;
    if (options.audioUrl) {
      if (options.audioUrl.startsWith("blob:")) {
        const uploaded = await uploadImages([options.audioUrl]);
        audioRefUrl = uploaded[0] || undefined;
      } else {
        audioRefUrl = options.audioUrl;
      }
    }

    const response = await fetch("/api/generate-seedance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        sdModel: options?.sdModel || "bytedance/seedance-2",
        firstFrameUrl: publicUrls[0] || undefined,
        lastFrameUrl: publicUrls[1] || undefined,
        referenceImageUrls: refPublicUrls && refPublicUrls.length > 0 ? refPublicUrls : undefined,
        referenceVideoUrl: videoRefUrl || undefined,
        referenceAudioUrl: audioRefUrl || undefined,
        resolution: options?.sdResolution || "720p",
        aspectRatio: options?.aspectRatio || "16:9",
        duration: options?.sdDuration || 8,
        generateAudio: options?.generateAudio ?? true,
        webSearch: options?.webSearch ?? false,
        seed: options?.seed ?? undefined,
        cost: options?.cost,
      }),
    });
    const sdText = await response.text();
    let data;
    try { data = JSON.parse(sdText); } catch { throw new Error(`Resposta invalida do servidor: ${sdText.slice(0, 200)}`); }
    if (!response.ok) throw new Error(data.error || "Erro ao iniciar geracao Seedance");
    return data.taskId;
  }

  // Nano Banana Pro (image)
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      imageInput: publicUrls.length > 0 ? publicUrls : undefined,
      resolution: options?.resolution || "1K",
      aspectRatio: options?.aspectRatio || "auto",
      seed: options?.seed ?? undefined,
      cost: options?.cost,
    }),
  });

  const nanoText = await response.text();
  let data;
  try { data = JSON.parse(nanoText); } catch { throw new Error(`Resposta invalida do servidor: ${nanoText.slice(0, 200)}`); }
  if (!response.ok) throw new Error(data.error || "Erro ao iniciar geracao");
  return data.taskId;
}

// Salva geracao no historico
async function saveGeneration(model: string, prompt: string, resultUrls: string[], cost: number, type: "image" | "video") {
  try {
    await fetch("/api/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, resultUrls, cost, type }),
    });
  } catch (err) {
    console.error("[saveGeneration] Falha ao salvar historico:", err);
  }
}

// Solicita reembolso de creditos quando geracao falha
async function refundCredits(model: string, taskId: string, cost?: number) {
  try {
    await fetch("/api/credits/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, taskId, cost }),
    });
    // Notificar componente de creditos pra atualizar
    window.dispatchEvent(new Event("fluxo-credits-update"));
    console.log(`[refund] Creditos devolvidos para modelo ${model}, task ${taskId}`);
  } catch (err) {
    console.error("[refund] Falha ao devolver creditos:", err);
  }
}

// Faz polling do status até completar
export async function pollTaskStatus(
  taskId: string,
  onProgress: (progress: number) => void,
  type: "image" | "video" = "image",
  signal?: AbortSignal,
  model?: string,
  cost?: number,
  prompt?: string
): Promise<{ resultUrls: string[]; error: string | null }> {
  // Detect fal.ai tasks (taskId contains "|" separator with endpoint)
  const isFal = taskId.includes("|");
  // Detect PiAPI tasks (taskId starts with "piapi:")
  const isPiAPI = taskId.startsWith("piapi:");
  const piApiTaskId = isPiAPI ? taskId.slice(6) : "";
  const maxAttempts = 180; // ~9 min para video, ~6 min para imagem
  let consecutiveErrors = 0;

  for (let i = 0; i < maxAttempts; i++) {
    // Check abort before waiting
    if (signal?.aborted) {
      if (model) await refundCredits(model, taskId, cost);
      return { resultUrls: [], error: "Cancelado" };
    }

    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, 3000);
      signal?.addEventListener("abort", () => { clearTimeout(timer); reject(new DOMException("Cancelled", "AbortError")); }, { once: true });
    }).catch((e) => {
      if (e instanceof DOMException && e.name === "AbortError") return;
      throw e;
    });

    if (signal?.aborted) {
      if (model) await refundCredits(model, taskId, cost);
      return { resultUrls: [], error: "Cancelado" };
    }

    try {
      let statusUrl: string;
      if (isPiAPI) {
        statusUrl = `/api/status-piapi?taskId=${encodeURIComponent(piApiTaskId)}`;
      } else if (isFal) {
        const parts = taskId.split("|");
        const [falTaskId, falEndpoint] = parts;
        const falStatusUrl = parts[2] || "";
        const falResponseUrl = parts[3] || "";
        statusUrl = `/api/status-fal?taskId=${encodeURIComponent(falTaskId)}&falEndpoint=${encodeURIComponent(falEndpoint)}${falStatusUrl ? `&statusUrl=${encodeURIComponent(falStatusUrl)}` : ""}${falResponseUrl ? `&responseUrl=${encodeURIComponent(falResponseUrl)}` : ""}`;
      } else {
        statusUrl = `/api/status?taskId=${encodeURIComponent(taskId)}&type=${type}`;
      }
      const response = await fetch(statusUrl, { signal });
      const statusText = await response.text();
      let data;
      try { data = JSON.parse(statusText); } catch { console.error("[poll] Invalid JSON:", statusText.slice(0, 200)); continue; }

      if (!response.ok) {
        consecutiveErrors++;
        if (consecutiveErrors < 3) { console.warn(`Poll error (${consecutiveErrors}/3), retrying...`, data); continue; }
        throw new Error(data.error || "Erro ao buscar status");
      }

      consecutiveErrors = 0;
      onProgress(data.progress || 0);

      if (data.state === "success") {
        // Atualizar creditos na UI apos sucesso
        window.dispatchEvent(new Event("fluxo-credits-update"));
        // Salvar no historico
        if (model && data.resultUrls?.length > 0) {
          saveGeneration(model, prompt || "", data.resultUrls, cost || 0, type);
        }
        return { resultUrls: data.resultUrls, error: null };
      }

      if (data.state === "fail") {
        // Devolver creditos quando geracao falha
        if (model) await refundCredits(model, taskId, cost);
        return { resultUrls: [], error: data.error || "Geração falhou" };
      }
    } catch (err) {
      if (signal?.aborted) {
        if (model) await refundCredits(model, taskId, cost);
        return { resultUrls: [], error: "Cancelado" };
      }
      consecutiveErrors++;
      if (consecutiveErrors < 3) { console.warn(`Poll exception (${consecutiveErrors}/3), retrying...`, err); continue; }
      // Devolver creditos em erro persistente
      if (model) await refundCredits(model, taskId, cost);
      throw err;
    }
  }

  // Timeout: devolver creditos
  if (model) await refundCredits(model, taskId, cost);
  throw new Error("Timeout: geração demorou muito");
}
