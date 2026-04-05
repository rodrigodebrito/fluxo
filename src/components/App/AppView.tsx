"use client";

import { useState } from "react";
import SystemPromptGenerator from "./SystemPromptGenerator";

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
];

export default function AppView() {
  const [activeApp, setActiveApp] = useState<string | null>(null);

  if (activeApp === "system-prompt-generator") {
    return <SystemPromptGenerator onBack={() => setActiveApp(null)} />;
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
