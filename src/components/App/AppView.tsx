"use client";

import { useState } from "react";
import SystemPromptGenerator from "./SystemPromptGenerator";
import CloneFoto from "./CloneFoto";
import ResizeTool from "./ResizeTool";
import SeedanceCinematic from "./SeedanceCinematic";
import UGCCampaign from "./UGCCampaign";

interface AppCard {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const APPS: AppCard[] = [
  {
    id: "system-prompt-generator",
    name: "Gerador de System Prompt",
    description: "Crie system prompts profissionais preenchendo um formulario simples",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    ),
  },
  {
    id: "clone-foto",
    name: "Clone Foto",
    description: "Gere prompts profissionais a partir de fotos de referencia",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
      </svg>
    ),
  },
  {
    id: "resize-tool",
    name: "Resize Tool",
    description: "Redimensione imagens grandes para usar como input no gerador",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
      </svg>
    ),
  },
  {
    id: "seedance-cinematic",
    name: "Seedance 2 Cinematic",
    description: "Gere prompts cinematograficos shot-by-shot para Seedance 2.0",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
  {
    id: "ugc-campaign",
    name: "UGC Campaign",
    description: "Gere uma campanha UGC completa a partir de uma foto de produto",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
      </svg>
    ),
  },
];

export default function AppView() {
  const [activeApp, setActiveApp] = useState<string | null>(null);

  if (activeApp === "system-prompt-generator") {
    return <SystemPromptGenerator onBack={() => setActiveApp(null)} />;
  }

  if (activeApp === "clone-foto") {
    return <CloneFoto onBack={() => setActiveApp(null)} />;
  }

  if (activeApp === "resize-tool") {
    return <ResizeTool onBack={() => setActiveApp(null)} />;
  }

  if (activeApp === "seedance-cinematic") {
    return <SeedanceCinematic onBack={() => setActiveApp(null)} />;
  }

  if (activeApp === "ugc-campaign") {
    return <UGCCampaign onBack={() => setActiveApp(null)} />;
  }

  return (
    <div className="flex-1 h-full overflow-y-auto bg-zinc-950 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-2">Apps</h1>
        <p className="text-sm text-zinc-500 mb-8">Ferramentas de IA para turbinar seus fluxos</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {APPS.map((app) => (
            <button
              key={app.id}
              onClick={() => setActiveApp(app.id)}
              className="flex flex-col items-center gap-3 p-6 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-purple-500/50 hover:bg-zinc-800/50 transition-all group text-left"
            >
              <div className="w-14 h-14 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:text-purple-300 group-hover:bg-purple-500/20 transition-colors">
                {app.icon}
              </div>
              <div className="text-center">
                <h3 className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">
                  {app.name}
                </h3>
                <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                  {app.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
