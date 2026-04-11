"use client";

import { useState, useRef } from "react";

interface Props {
  onBack: () => void;
}

const GENDER_OPTIONS = [
  { value: "woman", label: "Mulher" },
  { value: "man", label: "Homem" },
];

const MODE_OPTIONS = [
  { value: "clone", label: "Clonar (recriar exato)", description: "Recria a cena da referencia com maxima fidelidade" },
  { value: "style", label: "Modelar Estilo (variacao criativa)", description: "Captura o vibe/estetica e gera uma variacao criativa" },
];

const ASPECT_RATIO_OPTIONS = [
  { value: "9:16", label: "9:16 (Stories)" },
  { value: "4:5", label: "4:5 (Feed)" },
  { value: "1:1", label: "1:1 (Quadrado)" },
  { value: "16:9", label: "16:9 (Paisagem)" },
];

const CLONE_FOTO_SYSTEM_PROMPT = `You are an expert visual prompt engineer specializing in UGC (User-Generated Content) photography recreation. Your job is to analyze a reference image and generate a professional prompt that recreates or reinterprets the scene for AI image generation.

## Your Process:

1. **Analyze the reference image** and extract:
   - Setting/environment (location, architecture, decor, objects)
   - Lighting (natural/artificial, direction, color temperature, shadows)
   - Clothing and accessories worn by the subject
   - Pose and body language (position, gesture, expression mood)
   - Camera angle and composition (eye-level, low angle, rule of thirds, etc.)
   - Overall mood/atmosphere (cozy, dramatic, playful, elegant, etc.)
   - Background details (depth, blur, elements)
   - Makeup style if visible (lip color, eye makeup, blush, etc.) — treat makeup as a style choice, not a physical trait

2. **Generate the prompt** following this exact structure:
   - **Line 1 — Identity Lock:** "same [gender] reference (LoRA identity lock). Preserve exact facial identity, bone structure, and all distinguishing features."
   - **Line 2 — Camera Spec:** "Candid UGC iPhone 16 Pro Max, deep focus, natural ambient light, no bokeh, no portrait mode, no studio setup."
   - **Lines 3+ — Scene Description:** Detailed description of setting, clothing, pose, lighting, expression, makeup, and atmosphere.
   - **Last Line — Clean Output:** "No text, no captions, no watermarks, no UI elements visible in the image."

## ABSOLUTE RULE — Zero Physical Description:
NEVER describe any physical characteristics of the person:
- NO hair color, style, length, or texture
- NO eye color or shape
- NO skin tone or complexion
- NO body type, height, or build
- NO ethnicity, race, or age
- NO facial features (nose shape, lip size, jawline, etc.)

The identity comes ENTIRELY from the input reference image (LoRA), NOT from the text prompt. Any physical description in the prompt will conflict with the LoRA and produce bad results.

**Exception — Makeup IS allowed:** Describe makeup as a style element (red lipstick, smokey eye, natural makeup, glossy lips, etc.) because it's a deliberate style choice, not an inherent physical trait.

## Modes:

**Clone Mode:** Recreate the EXACT scene from the reference image with maximum fidelity. Match every detail: same setting, same lighting direction, same pose angle, same clothing style, same atmosphere. The goal is a near-identical recreation.

**Style Mode:** Capture the VIBE and AESTHETIC of the reference image but generate a creative variation. Keep the mood, lighting style, and general feel, but vary the specific setting, pose, or composition. The goal is "inspired by" not "copied from."

## Output Rules:
- Write the prompt in English
- Output ONLY the prompt text — no explanations, no titles, no markdown, no labels
- The prompt must be immediately usable as-is
- Be specific and vivid with environmental details
- Always include the aspect ratio instruction naturally in the prompt
- If the user provides extra details, incorporate them naturally into the prompt`;

export default function CloneFoto({ onBack }: Props) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDirectUrl, setImageDirectUrl] = useState("");
  const [inputMode, setInputMode] = useState<"upload" | "url">("upload");
  const [gender, setGender] = useState("woman");
  const [mode, setMode] = useState("clone");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [extraDetails, setExtraDetails] = useState("");
  const [result, setResult] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageDirectUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const hasImage = inputMode === "upload" ? !!imageFile : imageDirectUrl.trim().startsWith("http");

  const handleGenerate = async () => {
    if (!hasImage) return;
    setIsGenerating(true);
    setResult("");

    try {
      let imageUrl: string;

      if (inputMode === "url") {
        // URL direta — ja e publica, nao precisa upload
        imageUrl = imageDirectUrl.trim();
      } else {
        // Upload do arquivo
        setIsUploading(true);
        const formData = new FormData();
        formData.append("files", imageFile!);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        const uploadText = await uploadRes.text();
        let uploadData;
        try { uploadData = JSON.parse(uploadText); } catch { throw new Error("Erro no upload da imagem"); }
        if (!uploadData?.urls?.[0]) throw new Error("Falha ao fazer upload da imagem");
        imageUrl = uploadData.urls[0];
        setIsUploading(false);
      }

      // 2. Build user prompt
      const genderLabel = gender === "woman" ? "Mulher" : "Homem";
      const modeLabel = mode === "clone" ? "Clone Mode (recriar exato)" : "Style Mode (variacao criativa)";
      const userPrompt = [
        `Gender: ${genderLabel}`,
        `Mode: ${modeLabel}`,
        `Aspect Ratio: ${aspectRatio}`,
        extraDetails.trim() ? `Extra details to incorporate: ${extraDetails.trim()}` : "",
      ].filter(Boolean).join("\n");

      // 3. Call LLM with vision
      const response = await fetch("/api/generate-llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userPrompt,
          systemPrompt: CLONE_FOTO_SYSTEM_PROMPT,
          model: "gpt-4.1",
          imageUrls: [imageUrl],
          temperature: 0.7,
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
          <h1 className="text-lg font-semibold text-white">Clone Foto</h1>
          <p className="text-xs text-zinc-500">Gere prompts profissionais a partir de fotos de referencia</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left — Form */}
        <div className="w-1/2 border-r border-zinc-800 overflow-y-auto p-6 space-y-5">
          {/* Image Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-purple-400">Imagem de Referencia</span>
                <span className="text-red-400 text-xs">*</span>
              </div>
              <div className="flex items-center bg-zinc-800 rounded-lg border border-zinc-700 p-0.5">
                <button
                  onClick={() => setInputMode("upload")}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
                    inputMode === "upload" ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Upload
                </button>
                <button
                  onClick={() => setInputMode("url")}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
                    inputMode === "url" ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  URL
                </button>
              </div>
            </div>

            {inputMode === "upload" ? (
              <>
                <p className="text-xs text-zinc-500 mb-2">
                  Envie a foto que voce quer clonar ou usar como inspiracao de estilo.
                </p>
                {imagePreview ? (
                  <div className="relative group">
                    <img
                      src={imagePreview}
                      alt="Referencia"
                      className="w-full max-h-[300px] object-contain rounded-lg border border-zinc-700 bg-zinc-900"
                    />
                    <button
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 border border-zinc-600 flex items-center justify-center text-zinc-400 hover:text-red-400 hover:border-red-400/50 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-[180px] border-2 border-dashed border-zinc-700 rounded-lg flex flex-col items-center justify-center gap-2 text-zinc-500 hover:border-purple-500/50 hover:text-purple-400 transition-colors"
                  >
                    <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                    </svg>
                    <span className="text-sm">Clique para enviar uma imagem</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </>
            ) : (
              <>
                <p className="text-xs text-zinc-500 mb-2">
                  Cole a URL da imagem de referencia (precisa ser publica).
                </p>
                <input
                  type="text"
                  value={imageDirectUrl}
                  onChange={(e) => setImageDirectUrl(e.target.value)}
                  placeholder="https://exemplo.com/foto.jpg"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                />
                {imageDirectUrl.trim().startsWith("http") && (
                  <img
                    src={imageDirectUrl.trim()}
                    alt="Preview"
                    className="w-full max-h-[200px] object-contain rounded-lg border border-zinc-700 bg-zinc-900 mt-2"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    onLoad={(e) => { (e.target as HTMLImageElement).style.display = "block"; }}
                  />
                )}
              </>
            )}
          </div>

          {/* Gender */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-purple-400">Genero</span>
              <span className="text-red-400 text-xs">*</span>
            </div>
            <p className="text-xs text-zinc-500 mb-2">
              Genero do personagem na referencia (usado no identity lock).
            </p>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-purple-500"
            >
              {GENDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Mode */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-purple-400">Modo</span>
            </div>
            <p className="text-xs text-zinc-500 mb-2">
              Clonar recria a cena exata. Modelar Estilo captura o vibe e gera variacao.
            </p>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-purple-500"
            >
              {MODE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Aspect Ratio */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-purple-400">Aspect Ratio</span>
            </div>
            <p className="text-xs text-zinc-500 mb-2">
              Proporcao da imagem gerada.
            </p>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-purple-500"
            >
              {ASPECT_RATIO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Extra Details */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-purple-400">Detalhes Extras</span>
            </div>
            <p className="text-xs text-zinc-500 mb-2">
              Informacoes adicionais sobre seu avatar ou ajustes na cena (opcional).
            </p>
            <textarea
              value={extraDetails}
              onChange={(e) => setExtraDetails(e.target.value)}
              placeholder='Ex: "minha avatar tem uma pinta acima dos labios", "adiciona oculos de sol", "troca a roupa por vestido vermelho"'
              className="w-full min-h-[80px] bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-300 placeholder-zinc-600 resize-y focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Generate button */}
          <div className="pt-2">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !hasImage}
              className={`w-full py-3 rounded-lg text-sm font-medium transition-colors ${
                isGenerating || !hasImage
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-500 text-white"
              }`}
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isUploading ? "Enviando imagem..." : "Analisando com GPT-4.1..."}
                </span>
              ) : (
                "Gerar Prompt (1 credito)"
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
                    {isUploading ? "Enviando imagem..." : "Analisando imagem e gerando prompt..."}
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
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                  </svg>
                  <p className="text-sm text-zinc-600 italic">
                    Envie uma imagem de referencia e clique em gerar
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
