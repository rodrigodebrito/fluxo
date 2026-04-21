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

const ULTRA_REALISM_BLOCK = `Ultra photorealistic human skin rendering with visible pores, micro-imperfections, natural skin texture, subtle blemishes, fine lines and realistic subsurface scattering. No plastic or artificial smoothing.

Highly detailed eyes with natural iris complexity, radial patterns, subtle color variation, realistic reflections, moist waterline, and natural sclera tone (no pure white).

Individually defined hair strands with natural irregularity, flyaways, varying thickness, and realistic light interaction. No helmet-like or overly perfect hair.

Physically accurate lighting with soft imperfections, natural shadows, slight exposure inconsistencies, and real-world light behavior. Avoid studio-perfect artificial lighting unless specified.

Micro details preserved: skin grain, tiny facial hairs, pores, eyelashes with irregular spacing, natural lip texture (fine lines, slight dryness).

Camera realism: slight lens imperfections, subtle noise, depth of field consistent with real lenses, minor motion blur if applicable.

Avoid CGI look, avoid over-sharpening, avoid waxy skin, avoid symmetry perfection. Maintain natural human imperfections.

Shot as if captured on a real high-end camera (e.g. 50mm or 85mm lens), with cinematic yet natural color grading. Hyper-real human rendering indistinguishable from a real photograph. Imperfections are mandatory. Skin must NOT look digital.`;

const buildUltraCinematicBlock = (gender: string) => {
  const subject = gender === "man" ? "man" : "woman";
  return `Ultra-realistic, true-to-life cinematic photography of reference ${subject} model captured as if shot on a full-frame professional DSLR with a 35mm prime lens at f/1.8, using natural midday sunlight filtered through the atmosphere, creating physically-accurate soft highlights and deep realistic shadows. The image exhibits authentic optical depth of field with natural lens falloff, subtle background bokeh, and gentle edge softness, while the main subject remains razor-sharp. Surfaces show real-world micro-texture including skin pores, fabric weave, dust, fingerprints, smudges, scratches, and slight wear — nothing looks airbrushed or artificially clean. Lighting behaves realistically with light wrap, bounce light, and soft ambient occlusion, producing dimensional depth and grounded presence. Color grading is neutral and photographic with true whites, natural skin tones, and slight warm daylight bias, avoiding oversaturation or artificial HDR. There is fine cinematic film grain and sensor noise in the shadows, preserving organic realism. Highlights roll off smoothly with no clipping, and blacks retain detail instead of crushing. The image looks like a high-end still frame from a real cinematic camera, not an illustration, render, or digital painting — it should be visually indistinguishable from real life photography.`;
};

const SELFIE_UGC_RAW_BLOCK = `Ultra-realistic smartphone selfie captured as if filmed on a real iPhone Pro front camera in 8K resolution. Phone held slightly angled in front of the face in a natural casual influencer pose, fingers and phone edges visible in the frame. Skin shows real-world micro-detail including pores, faint blemishes, subtle redness, and natural oiliness — nothing airbrushed or plasticky. Lips have realistic texture and light reflections. Fabric of clothing shows visible fibers, folds, and natural wrinkles. Shallow depth of field from phone front camera. Raw unfiltered UGC influencer style, like a real selfie posted to TikTok or Instagram Stories, with natural phone camera sharpness, slight digital noise, and zero artificial beauty retouching — indistinguishable from a real photo taken by a real person.`;

const PRODUCT_DEMO_BLOCK = `UGC beauty influencer product demo pose. Subject framed from the waist up, facing forward, making direct eye contact with the camera with a calm, confident, slightly conversational expression as if speaking to an audience. The product is held delicately between the fingers of one hand and presented toward the camera, with the other hand posed underneath it in a classic beauty-influencer product framing gesture. Natural fingernails, skin creases, and subtle hand imperfections visible. Focus is crisp on both the subject's eyes and the product, giving the product hero-level presence without sacrificing face visibility.`;

const FMCG_BEVERAGE_BLOCK = `High-end FMCG / beverage commercial aesthetic. Pure white seamless studio background with soft diffused overhead lighting, zero clutter, absolute product focus. Shot style references premium ad agencies (Frooti, Magic Moments, Maaza): ultra-crisp macro details, glossy reflections, natural condensation droplets on cold surfaces, splash and liquid dynamics, high-speed photography feel with frozen motion. Cinematic composition with natural soft shadows under the product, subtle ground bounce light, and photographic color grading with true whites and saturated but natural product colors. Shot on phantom flex camera aesthetic, ultra slow motion sensibility, luxury brand beverage ad mood. Zero harsh studio light, zero CGI plastic look, zero artificial HDR — every surface shows real optical micro-texture. Premium product hero framing as if pulled from a real television commercial.`;

const FASHION_LUXURY_BLOCK = `High-end editorial fashion campaign aesthetic. Clean white infinity studio background with smooth luxury pacing, stable lighting continuity, and editorial tone. Shot style references flagship fashion houses (Lacoste, Calvin Klein): minimal motion blur, calm composed subject presence, elegant pose architecture, brand-accurate wardrobe treatment with crisp fabric texture (weave, folds, stitching visible). Photographic color grading stays neutral and muted with controlled highlights and deep controlled blacks, no oversaturation. Logo and monogram elements must remain sharp, centered, undistorted. Depth of field is shallow on the subject with the background melting into seamless white. Shot on full-frame cinema camera aesthetic, editorial still quality, luxury print-campaign mood. Zero frenetic motion, zero fabric glitches, zero logo warping — everything reads as a high-production Paris or Milan studio shoot.`;

const CINEMATIC_MASCOT_BLOCK = `Ultra-cinematic epic mascot / energy-drink ad aesthetic. 4K film-quality rendering with dramatic volumetric lighting, cinematic depth of field, atmospheric fog, global illumination, and epic environmental scale. Shot style references Hollywood brand films (Monster, Red Bull "Gives You Wings"): hero character framing with low-angle power shots, natural desaturated color palette with controlled contrast, realistic fur / fabric / skin physics, motion particles in the air, subtle camera shake for weight and presence. Environment is minimal but monumental — icy frozen landscape, rocky cliff under overcast sky, or studio-minimal white void with volumetric light rays — always singular and consistent across the frame. Shot on ARRI Alexa aesthetic, film still quality, neutral cinematic grading. Zero cartoon look, zero over-sharpening, zero flat lighting — every element has real physical weight and cinematic gravitas.`;

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
  const [ultraRealism, setUltraRealism] = useState(false);
  const [ultraCinematic, setUltraCinematic] = useState(false);
  const [selfieUgcRaw, setSelfieUgcRaw] = useState(false);
  const [productDemo, setProductDemo] = useState(false);
  const [fmcgBeverage, setFmcgBeverage] = useState(false);
  const [fashionLuxury, setFashionLuxury] = useState(false);
  const [cinematicMascot, setCinematicMascot] = useState(false);
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

      let finalPrompt = data.text as string;
      const injectionBlocks: string[] = [];
      if (ultraRealism) injectionBlocks.push(ULTRA_REALISM_BLOCK);
      if (ultraCinematic) injectionBlocks.push(buildUltraCinematicBlock(gender));
      if (selfieUgcRaw) injectionBlocks.push(SELFIE_UGC_RAW_BLOCK);
      if (productDemo) injectionBlocks.push(PRODUCT_DEMO_BLOCK);
      if (fmcgBeverage) injectionBlocks.push(FMCG_BEVERAGE_BLOCK);
      if (fashionLuxury) injectionBlocks.push(FASHION_LUXURY_BLOCK);
      if (cinematicMascot) injectionBlocks.push(CINEMATIC_MASCOT_BLOCK);
      if (injectionBlocks.length > 0) {
        const combined = injectionBlocks.join("\n\n");
        const cleanOutputMatch = finalPrompt.match(/\n?No text,[^\n]*$/i);
        if (cleanOutputMatch) {
          finalPrompt = finalPrompt.replace(cleanOutputMatch[0], `\n\n${combined}${cleanOutputMatch[0]}`);
        } else {
          finalPrompt = `${finalPrompt}\n\n${combined}`;
        }
      }
      setResult(finalPrompt);
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
    <div className="flex-1 min-h-0 flex flex-col bg-zinc-950 overflow-hidden">
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

          {/* Ultra Realism toggle */}
          <div>
            <button
              onClick={() => setUltraRealism((v) => !v)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors ${
                ultraRealism
                  ? "bg-purple-600/10 border-purple-500/50"
                  : "bg-zinc-800 border-zinc-700 hover:border-zinc-600"
              }`}
            >
              <div className="text-left">
                <div className="text-sm font-medium text-purple-400">Ultra Realismo</div>
                <div className="text-[10px] text-zinc-500">Injeta bloco de foto hiperrealista (poros, olhos, iluminacao, camera real)</div>
              </div>
              <div className={`relative w-10 h-5 rounded-full transition-colors ${ultraRealism ? "bg-purple-600" : "bg-zinc-700"}`}>
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${ultraRealism ? "left-5" : "left-0.5"}`} />
              </div>
            </button>
          </div>

          {/* Ultra Cinematic toggle */}
          <div>
            <button
              onClick={() => setUltraCinematic((v) => !v)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors ${
                ultraCinematic
                  ? "bg-purple-600/10 border-purple-500/50"
                  : "bg-zinc-800 border-zinc-700 hover:border-zinc-600"
              }`}
            >
              <div className="text-left">
                <div className="text-sm font-medium text-purple-400">Ultra Cinematic</div>
                <div className="text-[10px] text-zinc-500">Injeta bloco cinematografico (35mm f/1.8, grain, luz natural, still de cinema)</div>
              </div>
              <div className={`relative w-10 h-5 rounded-full transition-colors ${ultraCinematic ? "bg-purple-600" : "bg-zinc-700"}`}>
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${ultraCinematic ? "left-5" : "left-0.5"}`} />
              </div>
            </button>
          </div>

          {/* Selfie UGC Raw toggle */}
          <div>
            <button
              onClick={() => setSelfieUgcRaw((v) => !v)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors ${
                selfieUgcRaw
                  ? "bg-purple-600/10 border-purple-500/50"
                  : "bg-zinc-800 border-zinc-700 hover:border-zinc-600"
              }`}
            >
              <div className="text-left">
                <div className="text-sm font-medium text-purple-400">Selfie UGC Raw</div>
                <div className="text-[10px] text-zinc-500">iPhone front cam, pose influencer, TikTok/IG Stories crua sem retouch</div>
              </div>
              <div className={`relative w-10 h-5 rounded-full transition-colors ${selfieUgcRaw ? "bg-purple-600" : "bg-zinc-700"}`}>
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${selfieUgcRaw ? "left-5" : "left-0.5"}`} />
              </div>
            </button>
          </div>

          {/* UGC Product Demo toggle */}
          <div>
            <button
              onClick={() => setProductDemo((v) => !v)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors ${
                productDemo
                  ? "bg-purple-600/10 border-purple-500/50"
                  : "bg-zinc-800 border-zinc-700 hover:border-zinc-600"
              }`}
            >
              <div className="text-left">
                <div className="text-sm font-medium text-purple-400">UGC Product Demo</div>
                <div className="text-[10px] text-zinc-500">Pose influencer review de produto (waist up, olhar camera, produto nas maos)</div>
              </div>
              <div className={`relative w-10 h-5 rounded-full transition-colors ${productDemo ? "bg-purple-600" : "bg-zinc-700"}`}>
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${productDemo ? "left-5" : "left-0.5"}`} />
              </div>
            </button>
          </div>

          {/* FMCG / Beverage Studio White toggle */}
          <div>
            <button
              onClick={() => setFmcgBeverage((v) => !v)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors ${
                fmcgBeverage
                  ? "bg-purple-600/10 border-purple-500/50"
                  : "bg-zinc-800 border-zinc-700 hover:border-zinc-600"
              }`}
            >
              <div className="text-left">
                <div className="text-sm font-medium text-purple-400">FMCG / Beverage Studio White</div>
                <div className="text-[10px] text-zinc-500">Studio branco premium, condensation, splash, phantom flex slow-mo (Frooti / Magic Moments)</div>
              </div>
              <div className={`relative w-10 h-5 rounded-full transition-colors ${fmcgBeverage ? "bg-purple-600" : "bg-zinc-700"}`}>
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${fmcgBeverage ? "left-5" : "left-0.5"}`} />
              </div>
            </button>
          </div>

          {/* Fashion Luxury Editorial toggle */}
          <div>
            <button
              onClick={() => setFashionLuxury((v) => !v)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors ${
                fashionLuxury
                  ? "bg-purple-600/10 border-purple-500/50"
                  : "bg-zinc-800 border-zinc-700 hover:border-zinc-600"
              }`}
            >
              <div className="text-left">
                <div className="text-sm font-medium text-purple-400">Fashion Luxury Editorial</div>
                <div className="text-[10px] text-zinc-500">White infinity studio, smooth luxury pacing, logo preservation (Lacoste / Calvin Klein)</div>
              </div>
              <div className={`relative w-10 h-5 rounded-full transition-colors ${fashionLuxury ? "bg-purple-600" : "bg-zinc-700"}`}>
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${fashionLuxury ? "left-5" : "left-0.5"}`} />
              </div>
            </button>
          </div>

          {/* Cinematic Mascot Epic toggle */}
          <div>
            <button
              onClick={() => setCinematicMascot((v) => !v)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors ${
                cinematicMascot
                  ? "bg-purple-600/10 border-purple-500/50"
                  : "bg-zinc-800 border-zinc-700 hover:border-zinc-600"
              }`}
            >
              <div className="text-left">
                <div className="text-sm font-medium text-purple-400">Cinematic Mascot Epic</div>
                <div className="text-[10px] text-zinc-500">4K cinema, volumetric fog, epic scale, fur physics (Monster / Red Bull)</div>
              </div>
              <div className={`relative w-10 h-5 rounded-full transition-colors ${cinematicMascot ? "bg-purple-600" : "bg-zinc-700"}`}>
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${cinematicMascot ? "left-5" : "left-0.5"}`} />
              </div>
            </button>
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
