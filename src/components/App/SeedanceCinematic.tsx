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

const ROLE_OPTIONS = [
  { value: "character", label: "Personagem" },
  { value: "scene", label: "Cenario / Locacao" },
  { value: "prop", label: "Objeto / Prop" },
  { value: "style", label: "Referencia de Estilo" },
];

interface ImageSlot {
  id: number;
  role: string;
  roleLabel: string;
  description: string;
  mode: "upload" | "url";
  file: File | null;
  preview: string | null;
  url: string;
}

let slotCounter = 0;

const SEEDANCE_SYSTEM_PROMPT = `You are a world-class cinematic video prompt architect. Your job is to take a creative brief and transform it into a structured, shot-by-shot video prompt optimized for Seedance 2.0 AI video generation.

## Output Format

Your output MUST follow this exact structure:

### Section 1 — Image References

For EACH image the user provides, write a reference line using the exact @imageN notation provided. Match the role the user assigned:

- **Character**: "@imageN as the character reference — [role in the story]. [Detailed description of their clothing, accessories, styling, posture, and energy. Do NOT describe physical traits like hair color, skin tone, eye color, body type, ethnicity, or age — the identity comes from the reference image. Only describe what they are WEARING and their vibe.]"
- **Scene/Location**: "@imageN as the location reference — [detailed description of the environment: architecture, furniture, lighting, colors, textures, materials, atmosphere, time of day, weather if outdoor.]"
- **Prop/Object**: "@imageN as the prop reference — [detailed description of the object, its material, color, size, how it will be used in the scene.]"
- **Style Reference**: "@imageN as the style reference — [describe the visual style, color palette, mood, cinematography approach to emulate.]"

### Section 2 — Global Cinematography

After the image references, write ONE paragraph establishing the overall camera feel:
- Handheld vs stabilized vs tripod
- General lighting mood
- Color grading direction
- Overall pace and rhythm
- Any persistent visual motif

### Section 3 — Shot-by-Shot Breakdown

Break the video into numbered shots with timecodes:

SHOT [N] ([start]-[end])
— [Shot Title] EFFECT: [Camera type] (tracking, static, dolly, crane, handheld, steadicam, drone, etc.), [camera movement description]. [Detailed description of what happens in the frame: character actions, expressions, body language, environment interactions, lighting changes, atmospheric details. Be CINEMATIC — describe it like a director briefing a DP.]

## Rules:

1. **Timecodes are mandatory** — every shot must have (00:00-00:05) format timecodes that add up to the requested duration
2. **Camera language is mandatory** — every shot must specify: shot type (wide, medium, close-up, extreme close-up, over-shoulder), camera movement, and any special effect
3. **Transitions between shots** — describe how one shot flows into the next (cut, dissolve, whip pan, match cut, etc.)
4. **Environmental storytelling** — the environment should feel alive, not just a backdrop. Describe ambient details: light particles, reflections, shadows, movement in the background
5. **Character action must be specific** — not "she walks" but "she shuffles forward with heavy groggy steps, one hand rubbing her eyes slowly, the other hanging loose at her side"
6. **Breathing camera** — always include subtle organic camera movement (natural drift, slight handheld sway) unless the shot specifically calls for locked-off tripod
7. **No physical traits in character description** — NEVER describe hair, eyes, skin, body type, ethnicity, age. The identity comes from the reference image. Only describe clothing, accessories, makeup, and energy/vibe
8. **End with a strong final frame** — the last shot should have a clear, memorable closing image
9. **Use @imageN references in shots** — when a character or scene from a reference appears in a shot, reference them naturally (e.g., "the protagonist (@image1) enters the room (@image3)")

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
  const [imageSlots, setImageSlots] = useState<ImageSlot[]>([]);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const [result, setResult] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [copied, setCopied] = useState(false);

  const addSlot = (role: string) => {
    const roleOpt = ROLE_OPTIONS.find((r) => r.value === role);
    slotCounter++;
    setImageSlots((prev) => [
      ...prev,
      {
        id: slotCounter,
        role,
        roleLabel: roleOpt?.label || role,
        description: "",
        mode: "upload",
        file: null,
        preview: null,
        url: "",
      },
    ]);
  };

  const removeSlot = (id: number) => {
    setImageSlots((prev) => {
      const slot = prev.find((s) => s.id === id);
      if (slot?.preview) URL.revokeObjectURL(slot.preview);
      return prev.filter((s) => s.id !== id);
    });
  };

  const updateSlot = (id: number, updates: Partial<ImageSlot>) => {
    setImageSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const handleSlotFileSelect = (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = () => {
      updateSlot(id, { file, preview: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const slotHasImage = (slot: ImageSlot) => {
    return slot.mode === "upload" ? !!slot.file : slot.url.trim().startsWith("http");
  };

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
      const imageDescriptions: string[] = [];

      // Upload all images that have content
      const activeSlots = imageSlots.filter(slotHasImage);
      if (activeSlots.length > 0) {
        setIsUploading(true);
        for (let i = 0; i < activeSlots.length; i++) {
          const slot = activeSlots[i];
          let url: string;
          if (slot.mode === "url") {
            url = slot.url.trim();
          } else {
            url = await uploadFile(slot.file!);
          }
          imageUrls.push(url);
          const desc = slot.description.trim() ? ` — "${slot.description.trim()}"` : "";
          imageDescriptions.push(`- Image ${i + 1} (@image${i + 1}) = ${slot.roleLabel.toUpperCase()} reference${desc}`);
        }
        setIsUploading(false);
      }

      // Build image context for user prompt
      const imageContext: string[] = [];
      if (activeSlots.length > 0) {
        imageContext.push(`I'm providing ${activeSlots.length} reference image(s):`);
        imageContext.push(...imageDescriptions);
      } else {
        imageContext.push("No reference images provided. Create everything from the brief description. Do not use @image references.");
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

          {/* Image References — Dynamic */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-purple-400">Imagens de Referencia</span>
                <span className="text-[10px] text-zinc-600">({imageSlots.length}/9)</span>
              </div>
            </div>
            <p className="text-xs text-zinc-500 mb-3">
              Adicione ate 9 imagens — personagens, cenarios, objetos ou referencias de estilo.
            </p>

            {/* Existing slots */}
            {imageSlots.length > 0 && (
              <div className="space-y-3 mb-3">
                {imageSlots.map((slot, idx) => (
                  <div key={slot.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-2">
                    {/* Slot header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-zinc-300">@image{idx + 1}</span>
                        <select
                          value={slot.role}
                          onChange={(e) => {
                            const roleOpt = ROLE_OPTIONS.find((r) => r.value === e.target.value);
                            updateSlot(slot.id, { role: e.target.value, roleLabel: roleOpt?.label || e.target.value });
                          }}
                          className="bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-[11px] text-zinc-300 focus:outline-none focus:border-purple-500"
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Upload/URL toggle */}
                        <div className="flex items-center bg-zinc-800 rounded-md border border-zinc-700 p-0.5">
                          <button
                            onClick={() => updateSlot(slot.id, { mode: "upload" })}
                            className={`px-2 py-0.5 rounded text-[9px] font-medium transition-colors ${
                              slot.mode === "upload" ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-zinc-200"
                            }`}
                          >
                            Upload
                          </button>
                          <button
                            onClick={() => updateSlot(slot.id, { mode: "url" })}
                            className={`px-2 py-0.5 rounded text-[9px] font-medium transition-colors ${
                              slot.mode === "url" ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-zinc-200"
                            }`}
                          >
                            URL
                          </button>
                        </div>
                        <button
                          onClick={() => removeSlot(slot.id)}
                          className="text-zinc-500 hover:text-red-400 transition-colors"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Image input */}
                    {slot.mode === "upload" ? (
                      <>
                        {slot.preview ? (
                          <div className="relative group">
                            <img
                              src={slot.preview}
                              alt={`@image${idx + 1}`}
                              className="w-full max-h-[120px] object-contain rounded-lg border border-zinc-700 bg-zinc-800"
                            />
                            <button
                              onClick={() => {
                                if (slot.preview) URL.revokeObjectURL(slot.preview);
                                updateSlot(slot.id, { file: null, preview: null });
                              }}
                              className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/70 border border-zinc-600 flex items-center justify-center text-zinc-400 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => fileInputRefs.current[slot.id]?.click()}
                            className="w-full h-[80px] border-2 border-dashed border-zinc-700 rounded-lg flex flex-col items-center justify-center gap-1 text-zinc-500 hover:border-purple-500/50 hover:text-purple-400 transition-colors"
                          >
                            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                            </svg>
                            <span className="text-[10px]">Clique para enviar</span>
                          </button>
                        )}
                        <input
                          ref={(el) => { fileInputRefs.current[slot.id] = el; }}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleSlotFileSelect(slot.id, e)}
                          className="hidden"
                        />
                      </>
                    ) : (
                      <>
                        <input
                          type="text"
                          value={slot.url}
                          onChange={(e) => updateSlot(slot.id, { url: e.target.value })}
                          placeholder="https://exemplo.com/foto.jpg"
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                        />
                        {slot.url.trim().startsWith("http") && (
                          <img
                            src={slot.url.trim()}
                            alt="Preview"
                            className="w-full max-h-[100px] object-contain rounded-lg border border-zinc-700 bg-zinc-800 mt-1"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            onLoad={(e) => { (e.target as HTMLImageElement).style.display = "block"; }}
                          />
                        )}
                      </>
                    )}

                    {/* Description */}
                    <input
                      type="text"
                      value={slot.description}
                      onChange={(e) => updateSlot(slot.id, { description: e.target.value })}
                      placeholder="Descreva quem/o que e (opcional)"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-[11px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Add image buttons */}
            {imageSlots.length < 9 && (
              <div className="flex flex-wrap gap-2">
                {ROLE_OPTIONS.map((role) => (
                  <button
                    key={role.value}
                    onClick={() => addSlot(role.value)}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-zinc-800 border border-zinc-700 text-zinc-400 hover:border-purple-500/50 hover:text-purple-400 transition-colors"
                  >
                    + {role.label}
                  </button>
                ))}
              </div>
            )}
          </div>

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
