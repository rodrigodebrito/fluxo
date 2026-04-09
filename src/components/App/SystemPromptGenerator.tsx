"use client";

import { useState, useEffect } from "react";

interface Template {
  id: string;
  name: string;
  content: string;
  fields?: Record<string, string>;
  created_at: string;
}

interface Props {
  onBack: () => void;
}

const INTERPRETATION_MODES = [
  { value: "strict", label: "Estrito", description: "Usar apenas o que foi informado, sem inferir" },
  { value: "conservative", label: "Conservador", description: "Organizar sem adicionar conteudo criativo" },
  { value: "balanced", label: "Profissional / Equilibrado", description: "Preencher lacunas com padroes da industria" },
  { value: "creative", label: "Criativo", description: "Inferir tom e estrutura como um profissional senior" },
  { value: "exploratory", label: "Exploratorio", description: "Explorar ideias livremente, respeitando as regras" },
];

const META_SYSTEM_PROMPT = `You are a world-class prompt engineer who designs system prompts for AI models. Your job is to take the user's rough specifications and transform them into a highly detailed, professional-grade system prompt.

## How to write excellent system prompts:

1. **Open with a clear role definition**: Start with "You are an expert [role] specializing in [domain]." — be specific about the expertise area.

2. **Add domain-specific technical vocabulary**: If the target is video generation, use cinematic terms (close-up shot, dolly in, shallow depth of field, soft natural lighting). If it's image generation, use photography terms. If it's text, use writing craft terms. Match the vocabulary to the domain.

3. **Write actionable rules, not vague guidelines**: Instead of "make it good", write "describe the scene visually: camera angle, lighting, movement, environment". Instead of "be detailed", write "include specific details: product placement, hand movements, facial expressions".

4. **Include process instructions**: Tell the AI HOW to approach the task step by step. Example: "First analyze the input image to identify key visual elements. Then construct a scene description incorporating those elements. Finally, add technical specifications for camera and lighting."

5. **Specify output constraints clearly**: What format, what length, what to include, what to exclude. Be explicit about what the AI should NOT do.

6. **Add professional patterns from the domain**: For UGC content, mention "authentic and organic feel". For marketing, mention "conversion-focused". For technical writing, mention "precision and clarity". Use the terminology that professionals in that field actually use.

7. **Include concrete examples of the kind of language expected**: Instead of just saying "use cinematic language", also show examples: "close-up shot", "soft natural lighting", "slow dolly in".

## Interpretation modes:
- Strict: Use ONLY what the user provided. Do not add anything beyond their specifications.
- Conservative: Organize and clarify the user's input without adding creative content.
- Balanced: Fill gaps with industry-standard practices and professional patterns.
- Creative: Infer tone, structure, and add professional-level detail as a senior expert would.
- Exploratory: Freely explore ideas and add rich detail while respecting the stated rules.

## Critical rules:
- The output must be written in English (AI models perform better with English prompts)
- Output ONLY the system prompt text — no explanations, no titles, no markdown formatting, no code blocks
- The prompt must be immediately usable as-is when pasted into a system prompt field
- Be specific and technical, never generic or vague
- Every rule the user mentions must be included verbatim or strengthened, never weakened or omitted
- The prompt should read like it was written by a senior professional in that specific field`;

export default function SystemPromptGenerator({ onBack }: Props) {
  const [fields, setFields] = useState({
    job: "",
    targetEnv: "",
    inputs: "",
    coreOperation: "",
    desiredOutput: "",
    rules: "",
    interpretationMode: "balanced",
  });
  const [result, setResult] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveModal, setSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savedMsg, setSavedMsg] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Carregar templates ao abrir o painel
  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch("/api/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingTemplates(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const loadTemplate = (tpl: Template) => {
    setResult(tpl.content);
    if (tpl.fields) {
      setFields({
        job: tpl.fields.job || "",
        targetEnv: tpl.fields.targetEnv || "",
        inputs: tpl.fields.inputs || "",
        coreOperation: tpl.fields.coreOperation || "",
        desiredOutput: tpl.fields.desiredOutput || "",
        rules: tpl.fields.rules || "",
        interpretationMode: tpl.fields.interpretationMode || "balanced",
      });
    }
    setShowTemplates(false);
  };

  const deleteTemplate = async (id: string) => {
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
      }
    } catch {
      // silently fail
    }
  };

  const updateField = (key: string, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const buildUserPrompt = () => {
    const modeLabel = INTERPRETATION_MODES.find((m) => m.value === fields.interpretationMode)?.label || "Equilibrado";
    return [
      `**Objetivo:** ${fields.job}`,
      fields.targetEnv ? `**Ambiente Alvo:** ${fields.targetEnv}` : "",
      fields.inputs ? `**Entradas Fornecidas:** ${fields.inputs}` : "",
      fields.coreOperation ? `**Operacao Principal:** ${fields.coreOperation}` : "",
      fields.desiredOutput ? `**Resultado Desejado:** ${fields.desiredOutput}` : "",
      fields.rules ? `**Regras e Proibicoes:** ${fields.rules}` : "",
      `**Modo de Interpretacao:** ${modeLabel}`,
    ]
      .filter(Boolean)
      .join("\n");
  };

  const handleGenerate = async () => {
    if (!fields.job.trim()) return;
    setIsGenerating(true);
    setResult("");

    try {
      const response = await fetch("/api/generate-llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: buildUserPrompt(),
          systemPrompt: META_SYSTEM_PROMPT,
          model: "gpt-4.1",
          temperature: 0.7,
          cost: 1,
        }),
      });

      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error("Resposta invalida do servidor"); }
      if (!response.ok) throw new Error(data.error || "Erro ao gerar");

      setResult(data.text);
      window.dispatchEvent(new Event("fluxo-credits-update"));
    } catch (err) {
      alert("Erro: " + (err instanceof Error ? err.message : "Erro desconhecido"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!templateName.trim() || !result) return;
    setSaving(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: templateName, content: result, fields }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao salvar");
      }
      setSaveModal(false);
      setTemplateName("");
      setSavedMsg("Template salvo!");
      setTimeout(() => setSavedMsg(""), 3000);
      fetchTemplates();
    } catch (err) {
      alert("Erro: " + (err instanceof Error ? err.message : "Erro"));
    } finally {
      setSaving(false);
    }
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
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-white">Gerador de System Prompt</h1>
          <p className="text-xs text-zinc-500">Preencha os campos e gere um system prompt profissional com IA</p>
        </div>
        <button
          onClick={() => { setShowTemplates(!showTemplates); if (!showTemplates && templates.length === 0) fetchTemplates(); }}
          className={`px-4 py-2 rounded-lg text-xs font-medium border transition-colors ${
            showTemplates
              ? "bg-purple-600/20 border-purple-500/30 text-purple-300"
              : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white"
          }`}
        >
          Meus Templates ({templates.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left — Form */}
        <div className="w-1/2 border-r border-zinc-800 overflow-y-auto p-6 space-y-5">
          {/* 1. O Objetivo */}
          <FieldBlock
            label="O Objetivo"
            description="Descreva brevemente o que este sistema deve produzir ou alcancar."
            placeholder='Ex: "Gerar 5 prompts de imagem com angulos diferentes de uma mesma cena"'
            value={fields.job}
            onChange={(v) => updateField("job", v)}
            required
          />

          {/* 2. Ambiente Alvo */}
          <FieldBlock
            label="Ambiente Alvo"
            description="Especifique onde o resultado sera usado ou para qual modelo/ferramenta."
            placeholder='Ex: "Veo 3 para videos de 8 segundos" ou "GPT Image 1.5"'
            value={fields.targetEnv}
            onChange={(v) => updateField("targetEnv", v)}
          />

          {/* 3. Entradas Fornecidas */}
          <FieldBlock
            label="Entradas Fornecidas"
            description="Liste os tipos de entrada que voce vai dar e o que cada uma representa."
            placeholder='Ex: "Uma imagem de referencia do produto" e "Um texto com as diretrizes da marca"'
            value={fields.inputs}
            onChange={(v) => updateField("inputs", v)}
          />

          {/* 4. Operacao Principal */}
          <FieldBlock
            label="Operacao Principal"
            description="Explique o que o sistema deve fazer com as entradas."
            placeholder='Ex: "Analisar a imagem, extrair elementos visuais e criar descricoes cinematograficas"'
            value={fields.coreOperation}
            onChange={(v) => updateField("coreOperation", v)}
          />

          {/* 5. Resultado Desejado */}
          <FieldBlock
            label="Resultado Desejado"
            description="Defina a estrutura, quantidade e formatacao do resultado."
            placeholder='Ex: "Gerar 3 prompts de video, cada um com angulo de camera diferente"'
            value={fields.desiredOutput}
            onChange={(v) => updateField("desiredOutput", v)}
          />

          {/* 6. Regras e Proibicoes */}
          <FieldBlock
            label="Regras e Proibicoes"
            description="Liste regras absolutas que o sistema nunca deve violar."
            placeholder='Ex: "Nunca alterar as cores da marca" ou "Nao usar emojis"'
            value={fields.rules}
            onChange={(v) => updateField("rules", v)}
          />

          {/* 7. Modo de Interpretacao */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-purple-400">Modo de Interpretacao</span>
            </div>
            <p className="text-xs text-zinc-500 mb-2">
              Escolha o nivel de liberdade criativa do sistema.
            </p>
            <select
              value={fields.interpretationMode}
              onChange={(e) => updateField("interpretationMode", e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-purple-500"
            >
              {INTERPRETATION_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label} — {m.description}
                </option>
              ))}
            </select>
          </div>

          {/* Generate button */}
          <div className="pt-2">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !fields.job.trim()}
              className={`w-full py-3 rounded-lg text-sm font-medium transition-colors ${
                isGenerating || !fields.job.trim()
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-500 text-white"
              }`}
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Gerando com GPT-4.1...
                </span>
              ) : (
                "Gerar System Prompt (1 credito)"
              )}
            </button>
          </div>
        </div>

        {/* Right — Result */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 shrink-0">
            <span className="text-sm font-medium text-zinc-300">Resultado</span>
            <div className="flex items-center gap-2">
              {savedMsg && <span className="text-xs text-green-400">{savedMsg}</span>}
              {result && (
                <>
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                  >
                    {copied ? "Copiado!" : "Copiar"}
                  </button>
                  <button
                    onClick={() => setSaveModal(true)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30 transition-colors"
                  >
                    Salvar Template
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {isGenerating ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-zinc-500">Gerando system prompt...</p>
                </div>
              </div>
            ) : result ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{result}</p>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-zinc-600 italic">
                  O system prompt gerado aparecera aqui
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Templates Panel */}
      {showTemplates && (
        <div className="fixed inset-0 z-40 flex">
          <div className="flex-1" onClick={() => setShowTemplates(false)} />
          <div className="w-[380px] bg-zinc-900 border-l border-zinc-700 h-full flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <h3 className="text-sm font-semibold text-white">Meus Templates</h3>
              <button onClick={() => setShowTemplates(false)} className="text-zinc-500 hover:text-white transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loadingTemplates ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                </div>
              ) : templates.length === 0 ? (
                <p className="text-sm text-zinc-600 text-center py-12 italic">
                  Nenhum template salvo ainda
                </p>
              ) : (
                templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 hover:border-purple-500/40 transition-colors group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">
                        {tpl.name}
                      </h4>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteTemplate(tpl.id); }}
                        className="text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        title="Excluir template"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-xs text-zinc-500 line-clamp-2 mb-3">
                      {tpl.content.substring(0, 120)}...
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-600">
                        {new Date(tpl.created_at).toLocaleDateString("pt-BR")}
                      </span>
                      <button
                        onClick={() => loadTemplate(tpl)}
                        className="px-3 py-1 rounded text-xs font-medium bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30 transition-colors"
                      >
                        Carregar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save Modal */}
      {saveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-[400px] p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Salvar Template</h3>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Nome do template"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setSaveModal(false); setTemplateName(""); }}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !templateName.trim()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm rounded-lg transition-colors"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable field block
function FieldBlock({
  label,
  description,
  placeholder,
  value,
  onChange,
  required,
}: {
  label: string;
  description: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-medium text-purple-400">{label}</span>
        {required && <span className="text-red-400 text-xs">*</span>}
      </div>
      <p className="text-xs text-zinc-500 mb-2">{description}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-h-[80px] bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-300 placeholder-zinc-600 resize-y focus:outline-none focus:border-purple-500"
      />
    </div>
  );
}
