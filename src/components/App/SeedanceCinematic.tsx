"use client";

import { useState, useRef } from "react";

interface Props {
  onBack: () => void;
}

const DURATION_OPTIONS = [
  { value: "5s", label: "5 segundos (1-2 shots)" },
  { value: "10s", label: "10 segundos (2-3 shots)" },
  { value: "15s", label: "15 segundos (3-4 shots)" },
  { value: "20s", label: "20 segundos (4-5 shots)" },
  { value: "30s", label: "30 segundos (5-7 shots)" },
];

const MOOD_OPTIONS = [
  { value: "cinematic", label: "Cinematic" },
  { value: "epic", label: "Epic / Grand" },
  { value: "intense", label: "Intense / Tense" },
  { value: "calm", label: "Calm / Serene" },
  { value: "playful", label: "Playful / Fun" },
  { value: "dark", label: "Dark / Moody" },
  { value: "dreamy", label: "Dreamy / Ethereal" },
  { value: "raw", label: "Raw / Documentary" },
  { value: "romantic", label: "Romantic / Warm" },
  { value: "horror", label: "Horror / Suspense" },
];

const SEEDANCE_SYSTEM_PROMPT = `You are a world-class cinematic video prompt architect. Your job is to take a creative brief and transform it into a structured, shot-by-shot video prompt optimized for Seedance 2.0 AI video generation.

## Output Format

Your output MUST follow this exact structure:

### Section 1 — Image References (if provided)

If the user provides a character image, start with:
\`\`\`
@image1 as the character reference — [role description]. [Detailed description of their clothing, accessories, and styling. Do NOT describe physical traits like hair color, skin tone, eye color, body type, ethnicity, or age — the identity comes from the reference image itself. Only describe what they are WEARING and their general vibe/energy.]
\`\`\`

If the user provides a scene/location image, add:
\`\`\`
@image2 as the location reference — [detailed description of the environment: architecture, furniture, lighting, colors, textures, materials, atmosphere, time of day, weather if outdoor, every visual detail that defines the space.]
\`\`\`

### Section 2 — Global Cinematography

After the image references, write ONE paragraph establishing the overall camera feel:
- Handheld vs stabilized vs tripod
- General lighting mood
- Color grading direction
- Overall pace and rhythm
- Any persistent visual motif

### Section 3 — Shot-by-Shot Breakdown

Break the video into numbered shots with timecodes:

\`\`\`
SHOT [N] ([start]-[end])
— [Shot Title] EFFECT: [Camera type] (tracking, static, dolly, crane, handheld, steadicam, drone, etc.), [camera movement description]. [Detailed description of what happens in the frame: character actions, expressions, body language, environment interactions, lighting changes, atmospheric details. Be CINEMATIC — describe it like a director briefing a DP.]
\`\`\`

## Rules:

1. **Timecodes are mandatory** — every shot must have (00:00-00:05) format timecodes that add up to the requested duration
2. **Camera language is mandatory** — every shot must specify: shot type (wide, medium, close-up, extreme close-up, over-shoulder), camera movement, and any special effect
3. **Transitions between shots** — describe how one shot flows into the next (cut, dissolve, whip pan, match cut, etc.)
4. **Environmental storytelling** — the environment should feel alive, not just a backdrop. Describe ambient details: light particles, reflections, shadows, movement in the background
5. **Character action must be specific** — not "she walks" but "she shuffles forward with heavy groggy steps, one hand rubbing her eyes slowly, the other hanging loose at her side"
6. **Breathing camera** — always include subtle organic camera movement (natural drift, slight handheld sway) unless the shot specifically calls for locked-off tripod
7. **No physical traits in character description** — NEVER describe hair, eyes, skin, body type, ethnicity, age. The identity comes from @image1. Only describe clothing, accessories, makeup, and energy/vibe
8. **End with a strong final frame** — the last shot should have a clear, memorable closing image

## Mood Adaptation:

Adapt your camera choices, pacing, and descriptions to match the requested mood:
- **Epic**: Slow crane shots, wide establishing shots, dramatic lighting, grand scale
- **Intense**: Tight close-ups, fast cuts, shaky handheld, harsh lighting contrasts
- **Calm**: Slow movements, long takes, soft natural light, wide breathing spaces
- **Playful**: Dynamic angles, quick pans, bright lighting, energetic movement
- **Dark**: Low-key lighting, shadows, slow deliberate movements, negative space
- **Dreamy**: Soft focus moments, slow motion hints, ethereal light, floating camera
- **Raw**: Documentary-style handheld, available light, long unbroken takes, voyeuristic angles
- **Cinematic**: Classic Hollywood — dolly moves, motivated lighting, deliberate compositions
- **Romantic**: Warm color temperature, golden hour light, gentle movements, intimate framing
- **Horror**: Dutch angles, slow creeping camera, deep shadows, uncomfortable framing

## Output Rules:
- Write everything in English
- Output ONLY the prompt — no explanations, no markdown headers, no commentary
- Be extremely specific and vivid — every frame should be paintable in the reader's mind
- The prompt must be immediately usable as-is for Seedance 2.0
- Match the total duration to the user's requested length`;

export default function SeedanceCinematic({ onBack }: Props) {
  const [brief, setBrief] = useState("");
  const [duration, setDuration] = useState("10s");
  const [mood, setMood] = useState("cinematic");
  const [extraDetails, setExtraDetails] = useState("");

  // Character image (@image1)
  const [charFile, setCharFile] = useState<File | null>(null);
  const [charPreview, setCharPreview] = useState<string | null>(null);
  const [charUrl, setCharUrl] = useState("");
  const [charMode, setCharMode] = useState<"upload" | "url">("upload");
  const charInputRef = useRef<HTMLInputElement>(null);

  // Scene image (@image2)
  const [sceneFile, setSceneFile] = useState<File | null>(null);
  const [scenePreview, setScenePreview] = useState<string | null>(null);
  const [sceneUrl, setSceneUrl] = useState("");
  const [sceneMode, setSceneMode] = useState<"upload" | "url">("upload");
  const sceneInputRef = useRef<HTMLInputElement>(null);

  const [result, setResult] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleImageSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File | null) => void,
    setPreview: (p: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFile(file);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const hasChar = charMode === "upload" ? !!charFile : charUrl.trim().startsWith("http");
  const hasScene = sceneMode === "upload" ? !!sceneFile : sceneUrl.trim().startsWith("http");

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("files", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { throw new Error("Erro no upload"); }
    if (!json?.urls?.[0]) throw new Error("Falha no upload");
    return json.urls[0];
  };

  const handleGenerate = async () => {
    if (!brief.trim()) return;
    setIsGenerating(true);
    setResult("");

    try {
      const imageUrls: string[] = [];
      let charImageUrl = "";
      let sceneImageUrl = "";

      // Upload character image if provided
      if (hasChar) {
        setIsUploading(true);
        if (charMode === "url") {
          charImageUrl = charUrl.trim();
        } else {
          charImageUrl = await uploadFile(charFile!);
        }
        imageUrls.push(charImageUrl);
      }

      // Upload scene image if provided
      if (hasScene) {
        setIsUploading(true);
        if (sceneMode === "url") {
          sceneImageUrl = sceneUrl.trim();
        } else {
          sceneImageUrl = await uploadFile(sceneFile!);
        }
        imageUrls.push(sceneImageUrl);
      }
      setIsUploading(false);

      // Build user prompt
      const imageContext = [];
      if (hasChar && hasScene) {
        imageContext.push("I'm providing 2 reference images:");
        imageContext.push("- First image = CHARACTER reference (@image1) — describe their clothing/accessories/styling");
        imageContext.push("- Second image = SCENE/LOCATION reference (@image2) — describe the environment in detail");
      } else if (hasChar) {
        imageContext.push("I'm providing 1 reference image:");
        imageContext.push("- The image = CHARACTER reference (@image1) — describe their clothing/accessories/styling");
        imageContext.push("No scene reference provided — create the environment from the brief description.");
      } else if (hasScene) {
        imageContext.push("I'm providing 1 reference image:");
        imageContext.push("- The image = SCENE/LOCATION reference (@image2) — describe the environment in detail");
        imageContext.push("No character reference provided — do not use @image1.");
      } else {
        imageContext.push("No reference images provided. Create everything from the brief description. Do not use @image1 or @image2.");
      }

      const moodLabel = MOOD_OPTIONS.find((m) => m.value === mood)?.label || mood;

      const userPrompt = [
        `Creative Brief: ${brief.trim()}`,
        `Duration: ${duration}`,
        `Mood/Energy: ${moodLabel}`,
        "",
        ...imageContext,
        extraDetails.trim() ? `\nExtra details: ${extraDetails.trim()}` : "",
      ].filter((l) => l !== undefined).join("\n");

      const response = await fetch("/api/generate-llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userPrompt,
          systemPrompt: SEEDANCE_SYSTEM_PROMPT,
          model: "gpt-4.1",
          imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
          temperature: 0.75,
          cost: 1,
        }),
      });

      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error("Resposta invalida do servidor"); }
      if (!response.ok) throw new Error(data.error || "Erro ao gerar prompt");

      setResult(data.text);
      window.dispatchEvent(new Event("fluxo-credits-update"));
    } catch (err) {
      alert("Erro: " + (err instanceof Error ? err.message : "Erro desconhecido"));
    } finally {
      setIsGenerating(false);
      setIsUploading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const ImageInput = ({
    label,
    description,
    mode,
    setMode,
    file,
    preview,
    url,
    setUrl,
    inputRef,
    onSelect,
    onRemove,
    required,
  }: {
    label: string;
    description: string;
    mode: "upload" | "url";
    setMode: (m: "upload" | "url") => void;
    file: File | null;
    preview: string | null;
    url: string;
    setUrl: (u: string) => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
    onSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemove: () => void;
    required?: boolean;
  }) => (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-purple-400">{label}</span>
          {required && <span className="text-red-400 text-xs">*</span>}
          <span className="text-[10px] text-zinc-600">(opcional)</span>
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
                className="w-full max-h-[150px] object-contain rounded-lg border border-zinc-700 bg-zinc-900"
              />
              <button
                onClick={onRemove}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 border border-zinc-600 flex items-center justify-center text-zinc-400 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full h-[100px] border-2 border-dashed border-zinc-700 rounded-lg flex flex-col items-center justify-center gap-1.5 text-zinc-500 hover:border-purple-500/50 hover:text-purple-400 transition-colors"
            >
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <span className="text-[11px]">Clique para enviar</span>
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={onSelect}
            className="hidden"
          />
        </>
      ) : (
        <>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://exemplo.com/foto.jpg"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-purple-500"
          />
          {url.trim().startsWith("http") && (
            <img
              src={url.trim()}
              alt="Preview"
              className="w-full max-h-[120px] object-contain rounded-lg border border-zinc-700 bg-zinc-900 mt-2"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              onLoad={(e) => { (e.target as HTMLImageElement).style.display = "block"; }}
            />
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="flex-1 h-full flex flex-col bg-zinc-950 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800 shrink-0">
        <button
          onClick={onBack}
          className="text-zinc-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <h1 className="text-lg font-semibold text-white">Seedance 2 Cinematic Video</h1>
          <p className="text-xs text-zinc-500">Gere prompts cinematograficos shot-by-shot para Seedance 2.0</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left — Form */}
        <div className="w-1/2 border-r border-zinc-800 overflow-y-auto p-6 space-y-5">
          {/* Creative Brief */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-purple-400">Brief Criativo</span>
              <span className="text-red-400 text-xs">*</span>
            </div>
            <p className="text-xs text-zinc-500 mb-2">
              Descreva a cena/historia que voce quer transformar em video.
            </p>
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder='Ex: "Mulher acordando de manha, saindo do quarto sonolenta, caminhando pelo corredor ate a cozinha, fazendo cafe"'
              className="w-full min-h-[100px] bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-300 placeholder-zinc-600 resize-y focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Duration + Mood side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-purple-400">Duracao</span>
              </div>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-purple-500"
              >
                {DURATION_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-purple-400">Mood</span>
              </div>
              <select
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-purple-500"
              >
                {MOOD_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Character Image (@image1) */}
          <ImageInput
            label="Personagem (@image1)"
            description="Imagem do personagem/avatar — a IA vai descrever roupa e estilo."
            mode={charMode}
            setMode={setCharMode}
            file={charFile}
            preview={charPreview}
            url={charUrl}
            setUrl={setCharUrl}
            inputRef={charInputRef}
            onSelect={(e) => handleImageSelect(e, setCharFile, setCharPreview)}
            onRemove={() => { setCharFile(null); setCharPreview(null); setCharUrl(""); }}
          />

          {/* Scene Image (@image2) */}
          <ImageInput
            label="Cenario (@image2)"
            description="Imagem do ambiente/locacao — a IA vai descrever o espaco em detalhe."
            mode={sceneMode}
            setMode={setSceneMode}
            file={sceneFile}
            preview={scenePreview}
            url={sceneUrl}
            setUrl={setSceneUrl}
            inputRef={sceneInputRef}
            onSelect={(e) => handleImageSelect(e, setSceneFile, setScenePreview)}
            onRemove={() => { setSceneFile(null); setScenePreview(null); setSceneUrl(""); }}
          />

          {/* Extra Details */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-purple-400">Detalhes Extras</span>
            </div>
            <p className="text-xs text-zinc-500 mb-2">
              Camera especifica, transicoes, efeitos, ou ajustes no prompt (opcional).
            </p>
            <textarea
              value={extraDetails}
              onChange={(e) => setExtraDetails(e.target.value)}
              placeholder='Ex: "comeca em slow motion", "termina com close no rosto", "usar dolly zoom no shot final"'
              className="w-full min-h-[70px] bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-300 placeholder-zinc-600 resize-y focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Generate button */}
          <div className="pt-2">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !brief.trim()}
              className={`w-full py-3 rounded-lg text-sm font-medium transition-colors ${
                isGenerating || !brief.trim()
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-500 text-white"
              }`}
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isUploading ? "Enviando imagens..." : "Gerando prompt cinematografico..."}
                </span>
              ) : (
                "Gerar Video Prompt (1 credito)"
              )}
            </button>
          </div>
        </div>

        {/* Right — Result */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 shrink-0">
            <span className="text-sm font-medium text-zinc-300">Prompt Gerado</span>
            {result && (
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
              >
                {copied ? "Copiado!" : "Copiar"}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {isGenerating ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-zinc-500">
                    {isUploading ? "Enviando imagens..." : "Construindo prompt cinematografico..."}
                  </p>
                </div>
              </div>
            ) : result ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{result}</p>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <svg className="w-12 h-12 mx-auto mb-3 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  <p className="text-sm text-zinc-600 italic">
                    Descreva o brief e clique em gerar
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
