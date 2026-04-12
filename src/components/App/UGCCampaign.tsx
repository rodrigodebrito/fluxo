"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  onBack: () => void;
}

interface Scene {
  number: number;
  role: string;
  timecode: string;
  imagePrompt: string;
  videoPrompt: string;
  spokenLine: string;
  onScreenText: string;
}

interface Campaign {
  scenes: Scene[];
  caption: string;
}

const NARRATIVE_STYLES = [
  { value: "discovery", label: "Descoberta" },
  { value: "curiosity", label: "Curiosidade" },
  { value: "review", label: "Review honesto" },
  { value: "unboxing", label: "Unboxing" },
  { value: "before_after", label: "Antes / Depois" },
  { value: "problem_sol", label: "Problema -> Solucao" },
];

const IMAGE_MODELS = [
  { value: "nano-banana-pro", label: "Nano Banana Pro" },
  { value: "gpt-image", label: "GPT Image 1.5" },
  { value: "flux-2-pro", label: "Flux 2 Pro" },
  { value: "z-image-turbo", label: "Z-Image Turbo" },
  { value: "lora", label: "Modelo Treinado (LoRA)" },
];

const VIDEO_MODELS = [
  { value: "seedance-2", label: "Seedance 2.0" },
  { value: "kling-3", label: "Kling 3" },
  { value: "kling-o3", label: "Kling O3" },
  { value: "veo-3", label: "Veo 3.1" },
  { value: "wan-2-7", label: "Wan 2.7" },
  { value: "grok", label: "Grok Imagine" },
];

const VOICE_MODE_OPTIONS = [
  { value: "in_video", label: "Fala no video (Veo 3.1 nativo)" },
  { value: "none", label: "So cenas (sem fala)" },
];

// Palavras por segundo em pt-br natural falado (media ~2.5)
const WORDS_PER_SECOND = 2.5;

const NUM_SCENES_OPTIONS = [2, 3, 4, 5, 6, 7, 8];
const DURATION_OPTIONS = [5, 8, 10, 12, 15];
const ASPECT_RATIO_OPTIONS = [
  { value: "9:16", label: "9:16 (Stories/Reels)" },
  { value: "1:1", label: "1:1 (Feed)" },
  { value: "16:9", label: "16:9 (YouTube)" },
];

const UGC_CAMPAIGN_SYSTEM_PROMPT = `You are an elite UGC campaign director and prompt engineer specializing in Brazilian Portuguese content. Your job: analyze a product photo (and optionally an avatar photo) and generate a complete UGC campaign with ready-to-use prompts for image and video generation, spoken lines timed to each scene, on-screen text, and post caption.

## Input

You will receive:
- Image 1: the PRODUCT photo (always present)
- Image 2 (optional): the AVATAR photo (the person appearing in the content)
- A text brief with: product name, description, narrative style, extra style instructions, number of scenes, scene duration, aspect ratio, target image model, target video model, VOICE MODE, and TARGET WORDS PER SCENE

## Voice Mode — CRITICAL

The brief specifies a voice_mode. Follow it strictly:

- **voice_mode = "in_video"**: the character speaks INSIDE the video natively (Veo 3.1 generates speech from the prompt). You MUST:
  1. Write the spokenLine in natural Brazilian Portuguese (pt-br), exactly as a real UGC creator would say it out loud
  2. Fit the line to the scene duration — the brief tells you the target words per scene. Hit that number ±2 words. Too short = wasted seconds. Too long = cuts off mid-sentence. This is the single most important rule: USE THE FULL DURATION.
  3. Embed the spokenLine inside the videoPrompt with explicit instruction for Veo 3.1 to speak it. Format: \`The character (same [gender] reference) speaks in Brazilian Portuguese, with natural intonation, saying exactly: "EXACT_PT_BR_LINE_HERE". [then visual action, camera, setting].\`
  4. The spoken line should NOT be translated — write it directly in pt-br, colloquial, how a real creator talks (contractions, "pra" instead of "para", "tá" instead of "está", "cê" is OK if the style is casual)
  5. Make the lines flow as ONE continuous conversation across all scenes, not isolated sentences

- **voice_mode = "none"**: the video has NO spoken dialogue — only visuals and ambient audio. You MUST:
  1. Set spokenLine to empty string ""
  2. Write videoPrompt as visual-only: action, camera, setting, ambient sound. NO dialogue instruction.
  3. Make the narrative readable WITHOUT words — stronger use of visual storytelling, facial expressions, on-screen text overlays

## Language Rules — ABSOLUTE AND NON-NEGOTIABLE

Each field has a FIXED language. Do NOT deviate:

- **imagePrompt**: ENGLISH ONLY. No Portuguese words anywhere. Ever.
- **videoPrompt**: ENGLISH ONLY for all description, action, camera, setting, ambient audio. The ONLY Portuguese allowed is the quoted spokenLine in pt-br when voice_mode=in_video — and it MUST be inside double quotes after the phrase \`speaks in Brazilian Portuguese, saying exactly:\`. Everything outside those quotes is English.
- **spokenLine**: BRAZILIAN PORTUGUESE (pt-br) ONLY. Natural spoken pt-br — contractions ("pra", "tá", "cê"), fillers ("sabe?", "tipo", "gente"), colloquial. NEVER Portugal Portuguese. NEVER formal/news-anchor pt-br. NEVER English.
- **onScreenText**: BRAZILIAN PORTUGUESE (pt-br) ONLY.
- **caption**: BRAZILIAN PORTUGUESE (pt-br) ONLY.

### Why this matters
Image and video models are trained primarily on English prompts and perform significantly worse with Portuguese instructions. Writing imagePrompt or videoPrompt in Portuguese will produce broken, low-quality generations. This rule is not a preference — it is a technical requirement.

### videoPrompt example (voice_mode=in_video, Veo 3.1)

CORRECT:
\`The same woman reference sits on her sunlit bed holding the Body Splash Delight close to camera with a surprised expression. Morning light streams through the window, birds chirping softly in the background. Camera slowly dollies in toward the bottle then cuts to her surprised face. The character speaks in Brazilian Portuguese, with natural intonation, saying exactly: "Gente, ninguém me contou desse cheirinho delicioso, vem ver isso comigo agora".\`

WRONG (Portuguese description — NEVER do this):
\`A mulher está sentada em seu quarto iluminado pelo sol, segura o Body Splash Delight...\`

### spokenLine is pt-br only — quoted inline in videoPrompt AND in its own field

The spokenLine field and the quoted text inside videoPrompt must be IDENTICAL (same pt-br string, character-for-character).

## Duration Fit (in_video mode)

The brief gives you TARGET_WORDS per scene based on scene duration × 2.5 words/second (natural pt-br speech rate).

- 5s scene  → ~12-14 words
- 8s scene  → ~19-21 words
- 10s scene → ~24-26 words
- 12s scene → ~29-31 words
- 15s scene → ~36-38 words

HIT the target. Count your words before finalizing. If you are below target, ADD content (reactions, fillers like "sabe?", "tipo", expand the thought). If above, trim aggressively. The scene duration MUST be fully used.

## Narrative Structure (always enforced)

- **Scene 1 = HOOK** in the first 2 seconds: pattern interrupt, visual question, surprised reaction, bold visual. This is what stops the scroll.
- **Middle scenes** develop the story: problem, demonstration, benefit, proof, transformation
- **Final scene = CTA**: "corre no link", "tá no meu perfil", "link na bio", "salva esse video"

Style-specific tone:
- Descoberta: "gente, olha o que eu achei"
- Curiosidade: "ninguém me contou isso"
- Review honesto: "vou te falar a real"
- Unboxing: "acabou de chegar"
- Antes/Depois: "olha a diferença"
- Problema/Solução: "cansei de sofrer com isso"

## ABSOLUTE RULE — Zero Physical Description of People

NEVER describe physical characteristics of the person in imagePrompt or videoPrompt:
- NO hair color/style/length, NO eye color, NO skin tone, NO body type, NO ethnicity, NO age, NO facial features
- The avatar's identity comes ENTIRELY from the reference image, NOT from text
- Use "same woman reference" or "same man reference" as placeholder
- Makeup IS allowed as a style choice (red lipstick, natural makeup)

## Image Prompt Adaptation (by target model)

- **nano-banana-pro**: long descriptive English, detailed scene. Always include: "Candid UGC iPhone 16 Pro Max, deep focus, natural ambient light, no bokeh, no portrait mode. No text, no captions, no watermarks."
- **gpt-image**: structured with brief lists (Setting / Lighting / Pose / Clothing / Mood) + UGC iPhone boilerplate
- **flux-2-pro**: shorter, direct, comma-separated style tags + UGC boilerplate
- **z-image-turbo**: simple, fast, direct description + UGC boilerplate
- **lora**: start with "<trigger_word>" placeholder, then scene, then UGC boilerplate

## Video Prompt Adaptation (by target model)

- **seedance-2**: MAX 1536 CHARACTERS. @image1 = product, @image2 = avatar (when provided). Timecode block ("0-2s: ... / 2-5s: ..."), camera, action, environment. No reliable dialogue — if voice_mode=in_video, Seedance is not ideal (prefer Veo 3.1).
- **kling-3**: multi-shot friendly, @element1 for refs, describe camera moves
- **kling-o3**: image-to-video, describe motion + camera + final state
- **veo-3**: BEST for in_video voice mode. Describes action + ambient audio + NATIVE SPEECH. When voice_mode=in_video, use the exact format specified above with the pt-br line quoted.
- **wan-2-7**: image-to-video, movement + pacing + camera
- **grok**: image-to-video, economical movement description

## On-Screen Text Rules

- pt-br, max 60 characters
- UGC style: "gente olha isso", "POV: você descobriu X", "ninguém me contou", "ESSE é o segredo", "PARE tudo"
- Punchy, scroll-stopping

## Caption Rules

- pt-br
- Opens with a textual hook (1 sentence)
- Brief product mention
- Clear CTA
- 5-10 niche-specific hashtags (not generic #fyp #viral — pick real niche tags)

## Output Format — STRICT JSON

Return ONLY valid JSON matching this exact schema. NO markdown code fences, NO prose before or after, NO trailing commas:

{
  "scenes": [
    {
      "number": 1,
      "role": "hook",
      "timecode": "0-5s",
      "imagePrompt": "...",
      "videoPrompt": "...",
      "spokenLine": "...",
      "onScreenText": "..."
    }
  ],
  "caption": "..."
}

- "role" must be one of: hook, develop, proof, demo, benefit, cta
- "timecode" reflects cumulative position in the full video (scene 2 of 8s scenes = "8-16s")
- "spokenLine" is empty string "" when voice_mode=none, otherwise the exact pt-br line
- When voice_mode=in_video, the spokenLine must ALSO appear quoted inside the videoPrompt`;

export default function UGCCampaign({ onBack }: Props) {
  // Produto
  const [productFile, setProductFile] = useState<File | null>(null);
  const [productPreview, setProductPreview] = useState<string | null>(null);
  const [productDirectUrl, setProductDirectUrl] = useState("");
  const [productInputMode, setProductInputMode] = useState<"upload" | "url">("upload");
  const productFileRef = useRef<HTMLInputElement>(null);

  // Avatar (opcional)
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarDirectUrl, setAvatarDirectUrl] = useState("");
  const [avatarInputMode, setAvatarInputMode] = useState<"upload" | "url">("upload");
  const avatarFileRef = useRef<HTMLInputElement>(null);

  // Briefing
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [narrativeStyle, setNarrativeStyle] = useState("discovery");
  const [styleExtra, setStyleExtra] = useState("");
  const [numScenes, setNumScenes] = useState(4);
  const [sceneDuration, setSceneDuration] = useState(8);
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [imageModel, setImageModel] = useState("nano-banana-pro");
  const [videoModel, setVideoModel] = useState("veo-3");
  const [voiceMode, setVoiceMode] = useState<"in_video" | "none">("in_video");

  // Quando voiceMode = in_video, forca Veo 3.1 (unico com fala nativa confiavel)
  useEffect(() => {
    if (voiceMode === "in_video" && videoModel !== "veo-3") {
      setVideoModel("veo-3");
    }
  }, [voiceMode, videoModel]);

  // Resultado
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [regeneratingScene, setRegeneratingScene] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleProductSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProductFile(file);
    const reader = new FileReader();
    reader.onload = () => setProductPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeProduct = () => {
    setProductFile(null);
    setProductPreview(null);
    setProductDirectUrl("");
    if (productFileRef.current) productFileRef.current.value = "";
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setAvatarDirectUrl("");
    if (avatarFileRef.current) avatarFileRef.current.value = "";
  };

  const hasProduct =
    productInputMode === "upload" ? !!productFile : productDirectUrl.trim().startsWith("http");
  const hasAvatar =
    avatarInputMode === "upload" ? !!avatarFile : avatarDirectUrl.trim().startsWith("http");

  async function uploadIfNeeded(mode: "upload" | "url", file: File | null, url: string): Promise<string> {
    if (mode === "url") return url.trim();
    const formData = new FormData();
    formData.append("files", file!);
    const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
    const uploadText = await uploadRes.text();
    let uploadData;
    try {
      uploadData = JSON.parse(uploadText);
    } catch {
      throw new Error("Erro no upload da imagem");
    }
    if (!uploadData?.urls?.[0]) throw new Error("Falha ao fazer upload da imagem");
    return uploadData.urls[0];
  }

  function buildUserPrompt(hasAvatarInput: boolean): string {
    const imageModelLabel = IMAGE_MODELS.find((m) => m.value === imageModel)?.label || imageModel;
    const videoModelLabel = VIDEO_MODELS.find((m) => m.value === videoModel)?.label || videoModel;
    const styleLabel = NARRATIVE_STYLES.find((s) => s.value === narrativeStyle)?.label || narrativeStyle;
    const targetWords = Math.round(sceneDuration * WORDS_PER_SECOND);

    return [
      `Product name: ${productName || "(unnamed)"}`,
      `Product description: ${productDescription || "(none)"}`,
      `Avatar provided: ${hasAvatarInput ? "yes (Image 2)" : "no"}`,
      `Narrative style: ${styleLabel} (style_key: ${narrativeStyle})`,
      styleExtra.trim() ? `Extra style instructions: ${styleExtra.trim()}` : "",
      `Number of scenes: ${numScenes}`,
      `Duration per scene: ${sceneDuration}s (total video: ${numScenes * sceneDuration}s)`,
      `Aspect ratio: ${aspectRatio}`,
      `Target IMAGE model: ${imageModelLabel} (model_key: ${imageModel})`,
      `Target VIDEO model: ${videoModelLabel} (model_key: ${videoModel})`,
      `voice_mode: ${voiceMode}`,
      voiceMode === "in_video"
        ? `TARGET_WORDS per spokenLine: ${targetWords} words (±2). This must fill ${sceneDuration}s of natural pt-br speech. USE THE FULL DURATION.`
        : `voice_mode is "none": set spokenLine="" for every scene, write visual-only videoPrompts.`,
      "",
      "LANGUAGE RULES (NON-NEGOTIABLE):",
      "- imagePrompt: ENGLISH ONLY",
      "- videoPrompt: ENGLISH ONLY (except the quoted pt-br spokenLine when voice_mode=in_video)",
      "- spokenLine: Brazilian Portuguese only",
      "- onScreenText: Brazilian Portuguese only",
      "- caption: Brazilian Portuguese only",
      "Writing imagePrompt or videoPrompt in Portuguese breaks the generation. Do NOT do it.",
      "Generate the full campaign as strict JSON per the schema in your system prompt.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  function parseCampaignJSON(text: string): Campaign {
    // Strip code fences if the model added them despite instructions
    let cleaned = text.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
    }
    // Find the first { and last } in case there's prose
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }
    const parsed = JSON.parse(cleaned);
    if (!parsed.scenes || !Array.isArray(parsed.scenes)) {
      throw new Error("Resposta invalida: sem 'scenes'");
    }
    // Normaliza spokenLine (aceita 'ttsScript' como fallback caso o modelo volte o nome antigo)
    parsed.scenes = parsed.scenes.map((s: Record<string, unknown>) => ({
      ...s,
      spokenLine: (s.spokenLine as string) ?? (s.ttsScript as string) ?? "",
    }));
    return parsed as Campaign;
  }

  const handleGenerate = async () => {
    if (!hasProduct) return;
    setIsGenerating(true);
    setCampaign(null);

    try {
      setIsUploading(true);
      const productUrl = await uploadIfNeeded(productInputMode, productFile, productDirectUrl);
      let avatarUrl: string | null = null;
      if (hasAvatar) {
        avatarUrl = await uploadIfNeeded(avatarInputMode, avatarFile, avatarDirectUrl);
      }
      setIsUploading(false);

      const imageUrls = avatarUrl ? [productUrl, avatarUrl] : [productUrl];
      const userPrompt = buildUserPrompt(!!avatarUrl);

      const response = await fetch("/api/generate-llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userPrompt,
          systemPrompt: UGC_CAMPAIGN_SYSTEM_PROMPT,
          model: "gpt-4.1",
          imageUrls,
          temperature: 0.8,
          cost: 1,
        }),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Resposta invalida do servidor");
      }
      if (!response.ok) throw new Error(data.error || "Erro ao gerar campanha");

      const parsed = parseCampaignJSON(data.text);
      setCampaign(parsed);
      window.dispatchEvent(new Event("fluxo-credits-update"));
    } catch (err) {
      alert("Erro: " + (err instanceof Error ? err.message : "Erro desconhecido"));
    } finally {
      setIsGenerating(false);
      setIsUploading(false);
    }
  };

  const handleRegenerateScene = async (sceneNumber: number) => {
    if (!campaign) return;
    setRegeneratingScene(sceneNumber);

    try {
      const productUrl = await uploadIfNeeded(productInputMode, productFile, productDirectUrl);
      let avatarUrl: string | null = null;
      if (hasAvatar) {
        avatarUrl = await uploadIfNeeded(avatarInputMode, avatarFile, avatarDirectUrl);
      }
      const imageUrls = avatarUrl ? [productUrl, avatarUrl] : [productUrl];

      const regenPrompt = [
        buildUserPrompt(!!avatarUrl),
        "",
        `REGENERATION REQUEST: Regenerate ONLY scene number ${sceneNumber}, keeping all other scenes identical to the current campaign context below. Produce a fresh variation of this single scene.`,
        "",
        `Current campaign context (for continuity):`,
        JSON.stringify(campaign),
        "",
        `Return the SAME JSON schema (scenes array + caption), but replace only scene ${sceneNumber} with a new variation. Keep all other scenes byte-identical. Keep the same caption.`,
      ].join("\n");

      const response = await fetch("/api/generate-llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: regenPrompt,
          systemPrompt: UGC_CAMPAIGN_SYSTEM_PROMPT,
          model: "gpt-4.1",
          imageUrls,
          temperature: 0.9,
          cost: 1,
        }),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Resposta invalida do servidor");
      }
      if (!response.ok) throw new Error(data.error || "Erro ao regerar cena");

      const parsed = parseCampaignJSON(data.text);
      const newScene = parsed.scenes.find((s) => s.number === sceneNumber);
      if (!newScene) throw new Error("Cena nao encontrada na resposta");

      setCampaign({
        ...campaign,
        scenes: campaign.scenes.map((s) => (s.number === sceneNumber ? newScene : s)),
      });
      window.dispatchEvent(new Event("fluxo-credits-update"));
    } catch (err) {
      alert("Erro: " + (err instanceof Error ? err.message : "Erro desconhecido"));
    } finally {
      setRegeneratingScene(null);
    }
  };

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleExport = () => {
    if (!campaign) return;
    const imageModelLabel = IMAGE_MODELS.find((m) => m.value === imageModel)?.label || imageModel;
    const videoModelLabel = VIDEO_MODELS.find((m) => m.value === videoModel)?.label || videoModel;

    const lines: string[] = [];
    lines.push(`UGC CAMPAIGN — ${productName || "(unnamed product)"}`);
    lines.push(`Estilo: ${NARRATIVE_STYLES.find((s) => s.value === narrativeStyle)?.label}`);
    lines.push(`${campaign.scenes.length} cenas x ${sceneDuration}s = ${campaign.scenes.length * sceneDuration}s total`);
    lines.push(`Modelo imagem: ${imageModelLabel} | Modelo video: ${videoModelLabel}`);
    lines.push(`Aspect ratio: ${aspectRatio}`);
    lines.push("");
    lines.push("=".repeat(60));
    lines.push("");

    campaign.scenes.forEach((scene) => {
      lines.push(`CENA ${scene.number} — ${scene.role.toUpperCase()} (${scene.timecode})`);
      lines.push("");
      lines.push(`[PROMPT DE IMAGEM — ${imageModelLabel}]`);
      lines.push(scene.imagePrompt);
      lines.push("");
      lines.push(`[PROMPT DE VIDEO — ${videoModelLabel}]`);
      lines.push(scene.videoPrompt);
      lines.push("");
      if (voiceMode === "in_video" && scene.spokenLine) {
        lines.push(`[FALA (pt-br)]`);
        lines.push(scene.spokenLine);
        lines.push("");
      }
      lines.push(`[TEXTO ON-SCREEN (CapCut)]`);
      lines.push(scene.onScreenText);
      lines.push("");
      lines.push("-".repeat(60));
      lines.push("");
    });

    lines.push("=".repeat(60));
    lines.push("");
    lines.push("[LEGENDA DO POST]");
    lines.push(campaign.caption);
    lines.push("");

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ugc-campaign-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalSeconds = campaign ? campaign.scenes.length * sceneDuration : 0;
  const imageModelLabel = IMAGE_MODELS.find((m) => m.value === imageModel)?.label || imageModel;
  const videoModelLabel = VIDEO_MODELS.find((m) => m.value === videoModel)?.label || videoModel;

  return (
    <div className="flex-1 h-full flex flex-col bg-zinc-950 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800 shrink-0">
        <button onClick={onBack} className="text-zinc-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <h1 className="text-lg font-semibold text-white">UGC Campaign</h1>
          <p className="text-xs text-zinc-500">
            Gere uma campanha UGC completa a partir de uma foto de produto
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left — Form */}
        <div className="w-1/2 border-r border-zinc-800 overflow-y-auto p-6 space-y-5">
          {/* Product photo */}
          <ImageInput
            label="Foto do Produto"
            required
            description="Foto do produto que voce quer divulgar."
            mode={productInputMode}
            setMode={setProductInputMode}
            file={productFile}
            preview={productPreview}
            directUrl={productDirectUrl}
            setDirectUrl={setProductDirectUrl}
            onFileChange={handleProductSelect}
            onRemove={removeProduct}
            fileRef={productFileRef}
          />

          {/* Avatar photo (optional) */}
          <ImageInput
            label="Foto da Avatar"
            required={false}
            description="Opcional. Se nao enviar, o app gera prompts sem referencia de avatar."
            mode={avatarInputMode}
            setMode={setAvatarInputMode}
            file={avatarFile}
            preview={avatarPreview}
            directUrl={avatarDirectUrl}
            setDirectUrl={setAvatarDirectUrl}
            onFileChange={handleAvatarSelect}
            onRemove={removeAvatar}
            fileRef={avatarFileRef}
          />

          {/* Product name */}
          <Field label="Nome do Produto">
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Ex: Tenis X, Creme Y, Curso Z"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-purple-500"
            />
          </Field>

          {/* Product description */}
          <Field label="Descricao do Produto" description="Fale o que e, pra quem serve, qual o diferencial.">
            <textarea
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              placeholder='Ex: "Tenis casual feminino, super leve, ideal pra quem anda o dia todo. Tem um solado que absorve impacto."'
              className="w-full min-h-[80px] bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-300 placeholder-zinc-600 resize-y focus:outline-none focus:border-purple-500"
            />
          </Field>

          {/* Narrative style */}
          <Field label="Estilo Narrativo">
            <select
              value={narrativeStyle}
              onChange={(e) => setNarrativeStyle(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-purple-500"
            >
              {NARRATIVE_STYLES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>

          {/* Style extra */}
          <Field label="Instrucoes extras de estilo" description="Opcional. Ajustes de tom ou direcionamento livre.">
            <textarea
              value={styleExtra}
              onChange={(e) => setStyleExtra(e.target.value)}
              placeholder='Ex: "tom engracado meio sarcastico", "fala direto, sem enrolacao"'
              className="w-full min-h-[60px] bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-300 placeholder-zinc-600 resize-y focus:outline-none focus:border-purple-500"
            />
          </Field>

          {/* Num scenes / Duration / Aspect ratio */}
          <div className="grid grid-cols-3 gap-3">
            <Field label="Cenas">
              <select
                value={numScenes}
                onChange={(e) => setNumScenes(Number(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-purple-500"
              >
                {NUM_SCENES_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Duracao">
              <select
                value={sceneDuration}
                onChange={(e) => setSceneDuration(Number(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-purple-500"
              >
                {DURATION_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}s
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Aspect">
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-purple-500"
              >
                {ASPECT_RATIO_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* Target models */}
          <Field label="Modelo-alvo de Imagem" description="O prompt sera otimizado pro formato desse modelo.">
            <select
              value={imageModel}
              onChange={(e) => setImageModel(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-purple-500"
            >
              {IMAGE_MODELS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Modo de Fala"
            description="Fala no video usa Veo 3.1 com geracao nativa de audio em pt-br, encaixada na duracao de cada cena."
          >
            <select
              value={voiceMode}
              onChange={(e) => setVoiceMode(e.target.value as "in_video" | "none")}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-purple-500"
            >
              {VOICE_MODE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Modelo-alvo de Video"
            description={
              voiceMode === "in_video"
                ? "Travado em Veo 3.1 (unico modelo com fala nativa confiavel)."
                : "O prompt sera otimizado pro formato desse modelo."
            }
          >
            <select
              value={videoModel}
              onChange={(e) => setVideoModel(e.target.value)}
              disabled={voiceMode === "in_video"}
              className={`w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-purple-500 ${
                voiceMode === "in_video" ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              {VIDEO_MODELS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>

          {/* Generate button */}
          <div className="pt-2">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !hasProduct}
              className={`w-full py-3 rounded-lg text-sm font-medium transition-colors ${
                isGenerating || !hasProduct
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-500 text-white"
              }`}
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isUploading ? "Enviando imagens..." : "Gerando campanha com GPT-4.1..."}
                </span>
              ) : (
                "Gerar Campanha (1 credito)"
              )}
            </button>
          </div>
        </div>

        {/* Right — Result */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-zinc-300">Campanha</span>
              {campaign && (
                <span className="text-xs text-zinc-500">
                  {campaign.scenes.length} cenas • {totalSeconds}s total
                </span>
              )}
            </div>
            {campaign && (
              <button
                onClick={handleExport}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
              >
                Exportar .txt
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {isGenerating ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-zinc-500">
                    {isUploading ? "Enviando imagens..." : "GPT-4.1 analisando e montando a campanha..."}
                  </p>
                </div>
              </div>
            ) : campaign ? (
              <>
                {campaign.scenes.map((scene) => (
                  <SceneCard
                    key={scene.number}
                    scene={scene}
                    imageModelLabel={imageModelLabel}
                    videoModelLabel={videoModelLabel}
                    videoModel={videoModel}
                    voiceMode={voiceMode}
                    sceneDuration={sceneDuration}
                    copiedKey={copiedKey}
                    onCopy={copyToClipboard}
                    onRegenerate={() => handleRegenerateScene(scene.number)}
                    isRegenerating={regeneratingScene === scene.number}
                  />
                ))}
                <CaptionCard
                  caption={campaign.caption}
                  copiedKey={copiedKey}
                  onCopy={copyToClipboard}
                />
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-sm">
                  <svg
                    className="w-12 h-12 mx-auto mb-3 text-zinc-700"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46"
                    />
                  </svg>
                  <p className="text-sm text-zinc-600 italic">
                    Envie uma foto do produto e preencha o briefing pra gerar a campanha completa
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Subcomponents ---

function Field({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-medium text-purple-400">{label}</span>
      </div>
      {description && <p className="text-xs text-zinc-500 mb-2">{description}</p>}
      {children}
    </div>
  );
}

function ImageInput({
  label,
  required,
  description,
  mode,
  setMode,
  preview,
  directUrl,
  setDirectUrl,
  onFileChange,
  onRemove,
  fileRef,
}: {
  label: string;
  required: boolean;
  description: string;
  mode: "upload" | "url";
  setMode: (m: "upload" | "url") => void;
  file: File | null;
  preview: string | null;
  directUrl: string;
  setDirectUrl: (s: string) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  fileRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-purple-400">{label}</span>
          {required && <span className="text-red-400 text-xs">*</span>}
        </div>
        <div className="flex items-center bg-zinc-800 rounded-lg border border-zinc-700 p-0.5">
          <button
            onClick={() => setMode("upload")}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
              mode === "upload" ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Upload
          </button>
          <button
            onClick={() => setMode("url")}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
              mode === "url" ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            URL
          </button>
        </div>
      </div>
      <p className="text-xs text-zinc-500 mb-2">{description}</p>

      {mode === "upload" ? (
        <>
          {preview ? (
            <div className="relative group">
              <img
                src={preview}
                alt={label}
                className="w-full max-h-[220px] object-contain rounded-lg border border-zinc-700 bg-zinc-900"
              />
              <button
                onClick={onRemove}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 border border-zinc-600 flex items-center justify-center text-zinc-400 hover:text-red-400 hover:border-red-400/50 transition-colors opacity-0 group-hover:opacity-100"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full h-[140px] border-2 border-dashed border-zinc-700 rounded-lg flex flex-col items-center justify-center gap-2 text-zinc-500 hover:border-purple-500/50 hover:text-purple-400 transition-colors"
            >
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
              <span className="text-xs">Clique para enviar</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
        </>
      ) : (
        <>
          <input
            type="text"
            value={directUrl}
            onChange={(e) => setDirectUrl(e.target.value)}
            placeholder="https://exemplo.com/foto.jpg"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-purple-500"
          />
          {directUrl.trim().startsWith("http") && (
            <img
              src={directUrl.trim()}
              alt="Preview"
              className="w-full max-h-[180px] object-contain rounded-lg border border-zinc-700 bg-zinc-900 mt-2"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
              onLoad={(e) => {
                (e.target as HTMLImageElement).style.display = "block";
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

function SceneCard({
  scene,
  imageModelLabel,
  videoModelLabel,
  videoModel,
  voiceMode,
  sceneDuration,
  copiedKey,
  onCopy,
  onRegenerate,
  isRegenerating,
}: {
  scene: Scene;
  imageModelLabel: string;
  videoModelLabel: string;
  videoModel: string;
  voiceMode: "in_video" | "none";
  sceneDuration: number;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
}) {
  const isSeedance = videoModel === "seedance-2";
  const videoLen = scene.videoPrompt.length;
  const overLimit = isSeedance && videoLen > 1536;

  // Word count da fala pra mostrar se encaixa na duracao
  const wordCount = scene.spokenLine ? scene.spokenLine.trim().split(/\s+/).filter(Boolean).length : 0;
  const targetWords = Math.round(sceneDuration * WORDS_PER_SECOND);
  const wordsOk = Math.abs(wordCount - targetWords) <= 2;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">
          CENA {scene.number} — {scene.role.toUpperCase()}{" "}
          <span className="text-zinc-500 font-normal">({scene.timecode})</span>
        </h3>
        <button
          onClick={onRegenerate}
          disabled={isRegenerating}
          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
            isRegenerating
              ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              : "bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white"
          }`}
        >
          {isRegenerating ? "Regerando..." : "Regerar cena"}
        </button>
      </div>

      <PromptBlock
        label="Prompt de Imagem"
        badge={imageModelLabel}
        text={scene.imagePrompt}
        copyKey={`img-${scene.number}`}
        copiedKey={copiedKey}
        onCopy={onCopy}
      />

      <PromptBlock
        label="Prompt de Video"
        badge={videoModelLabel}
        text={scene.videoPrompt}
        copyKey={`vid-${scene.number}`}
        copiedKey={copiedKey}
        onCopy={onCopy}
        extraBadge={
          isSeedance ? (
            <span className={`text-[10px] font-mono ${overLimit ? "text-red-400" : "text-green-400"}`}>
              {videoLen}/1536
            </span>
          ) : null
        }
      />

      {voiceMode === "in_video" && scene.spokenLine && (
        <PromptBlock
          label="Fala (pt-br)"
          text={scene.spokenLine}
          copyKey={`spoken-${scene.number}`}
          copiedKey={copiedKey}
          onCopy={onCopy}
          extraBadge={
            <span className={`text-[10px] font-mono ${wordsOk ? "text-green-400" : "text-yellow-400"}`}>
              {wordCount}/{targetWords} palavras
            </span>
          }
        />
      )}

      <PromptBlock
        label="Texto on-screen (CapCut)"
        text={scene.onScreenText}
        copyKey={`osc-${scene.number}`}
        copiedKey={copiedKey}
        onCopy={onCopy}
      />
    </div>
  );
}

function PromptBlock({
  label,
  badge,
  extraBadge,
  text,
  copyKey,
  copiedKey,
  onCopy,
}: {
  label: string;
  badge?: string;
  extraBadge?: React.ReactNode;
  text: string;
  copyKey: string;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-purple-400 uppercase tracking-wide">{label}</span>
          {badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300">
              {badge}
            </span>
          )}
          {extraBadge}
        </div>
        <button
          onClick={() => onCopy(text, copyKey)}
          className="text-[11px] font-medium text-zinc-400 hover:text-white transition-colors"
        >
          {copiedKey === copyKey ? "Copiado!" : "Copiar"}
        </button>
      </div>
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
        <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

function CaptionCard({
  caption,
  copiedKey,
  onCopy,
}: {
  caption: string;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  return (
    <div className="bg-zinc-900 border border-purple-500/30 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-white">Legenda do Post</h3>
        <button
          onClick={() => onCopy(caption, "caption")}
          className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
        >
          {copiedKey === "caption" ? "Copiado!" : "Copiar"}
        </button>
      </div>
      <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">{caption}</p>
    </div>
  );
}
