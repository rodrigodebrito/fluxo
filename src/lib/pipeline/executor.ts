import { type Node, type Edge } from "@xyflow/react";

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

  const randomSeed = (modelNode.data.randomSeed as boolean) ?? true;
  result.seed = randomSeed ? null : (modelNode.data.seed as number | null);

  // Coletar imagens na ordem dos handles (image-1, image-2, ...)
  const imageInputCount = (modelNode.data.imageInputCount as number) || 1;
  const imagesByHandle: Record<string, string[]> = {};

  let negativePrompt = "";

  for (const edge of edges) {
    if (edge.target === modelNode.id) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      if (!sourceNode) continue;

      if (sourceNode.type === "prompt" && edge.targetHandle === "negative-prompt") {
        negativePrompt = (sourceNode.data.text as string) || "";
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
      } else if (sourceNode.type === "model") {
        // Model → Model: usar a imagem de capa (resultado visível) como referência
        const coverUrl = sourceNode.data.coverResultUrl as string | null;
        if (coverUrl) {
          const handleId = edge.targetHandle || "image-1";
          imagesByHandle[handleId] = [...(imagesByHandle[handleId] || []), coverUrl];
        }
      }
    }
  }

  // Concatenar negative prompt ao prompt
  if (negativePrompt.trim()) {
    result.prompt = `${result.prompt}\n${negativePrompt.trim()}`;
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

// Faz upload das imagens locais (blob) e retorna URLs públicas
// URLs que já são públicas (http/https) são mantidas sem re-upload
async function uploadImages(blobUrls: string[]): Promise<string[]> {
  if (blobUrls.length === 0) return [];

  const publicUrls: string[] = [];
  const blobsToUpload: string[] = [];

  for (const url of blobUrls) {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      publicUrls.push(url);
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

  const data = await uploadResponse.json();
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
    cost?: number;
  }
): Promise<string> {
  const publicUrls = await uploadImages(localImageUrls);

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
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Erro ao iniciar geracao GPT Image");
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
        cost: options?.cost,
      }),
    });
    const data = await response.json();
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
    const data = await response.json();
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

    const response = await fetch("/api/generate-seedance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        sdModel: options?.sdModel || "bytedance/seedance-2",
        firstFrameUrl: publicUrls[0] || undefined,
        lastFrameUrl: publicUrls[1] || undefined,
        referenceImageUrls: refPublicUrls && refPublicUrls.length > 0 ? refPublicUrls : undefined,
        resolution: options?.sdResolution || "720p",
        aspectRatio: options?.aspectRatio || "16:9",
        duration: options?.sdDuration || 8,
        generateAudio: options?.generateAudio ?? true,
        webSearch: options?.webSearch ?? false,
        seed: options?.seed ?? undefined,
        cost: options?.cost,
      }),
    });
    const data = await response.json();
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

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Erro ao iniciar geracao");
  return data.taskId;
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
  cost?: number
): Promise<{ resultUrls: string[]; error: string | null }> {
  const maxAttempts = 180; // ~9 min para video, ~6 min para imagem

  for (let i = 0; i < maxAttempts; i++) {
    // Check abort before waiting
    if (signal?.aborted) {
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
      return { resultUrls: [], error: "Cancelado" };
    }

    try {
      const response = await fetch(`/api/status?taskId=${encodeURIComponent(taskId)}&type=${type}`, { signal });
      const data = await response.json();

      if (!response.ok) {
        // Para video, continuar tentando em vez de parar
        if (type === "video") { console.warn("Veo status error, retrying...", data); continue; }
        throw new Error(data.error || "Erro ao buscar status");
      }

      onProgress(data.progress || 0);

      if (data.state === "success") {
        // Atualizar creditos na UI apos sucesso
        window.dispatchEvent(new Event("fluxo-credits-update"));
        return { resultUrls: data.resultUrls, error: null };
      }

      if (data.state === "fail") {
        // Devolver creditos quando geracao falha
        if (model) await refundCredits(model, taskId, cost);
        return { resultUrls: [], error: data.error || "Geração falhou" };
      }
    } catch (err) {
      if (signal?.aborted) return { resultUrls: [], error: "Cancelado" };
      if (type === "video") { console.warn("Poll error, retrying...", err); continue; }
      // Devolver creditos em erro inesperado
      if (model) await refundCredits(model, taskId, cost);
      throw err;
    }
  }

  // Timeout: devolver creditos
  if (model) await refundCredits(model, taskId, cost);
  throw new Error("Timeout: geração demorou muito");
}
