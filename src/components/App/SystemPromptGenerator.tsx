"use client";

import { useState } from "react";

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

const META_SYSTEM_PROMPT = `You are an expert prompt engineer. Based on the user's specifications below, generate a professional, detailed, and optimized system prompt.

The generated system prompt must:
- Be written in English (AI models perform better with English prompts)
- Be direct, specific, and actionable
- Include all rules and restrictions provided
- Be formatted as plain text, ready to use as a system prompt
- Follow the interpretation mode specified by the user
- Output ONLY the system prompt text, nothing else. No explanations, no titles, no markdown.`;

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
          model: "gpt-4o",
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
        <div>
          <h1 className="text-lg font-semibold text-white">Gerador de System Prompt</h1>
          <p className="text-xs text-zinc-500">Preencha os campos e gere um system prompt profissional com IA</p>
        </div>
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
                  Gerando com GPT-4o...
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
