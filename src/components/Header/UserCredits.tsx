"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UserCredits() {
  const router = useRouter();
  const [credits, setCredits] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("name, credits, role")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("[UserCredits] error:", error.message);
        // Fallback: show email at least
        setName(user.email || "");
        return;
      }

      if (profile) {
        setCredits(profile.credits);
        setName(profile.name || user.email || "");
        setRole(profile.role);
      }
    }

    loadProfile();

    // Listen for credit changes (after generation)
    const handleCreditsUpdate = () => loadProfile();
    window.addEventListener("fluxo-credits-update", handleCreditsUpdate);

    const interval = setInterval(loadProfile, 30000);
    return () => {
      clearInterval(interval);
      window.removeEventListener("fluxo-credits-update", handleCreditsUpdate);
    };
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2 relative">
      {/* Credits badge - Weavy style */}
      {credits !== null && (
        <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/90 backdrop-blur border border-zinc-700/50 rounded-xl shadow-lg">
          <svg className="w-4 h-4 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
          </svg>
          <span className="text-sm font-semibold text-zinc-100">{credits} credits</span>
        </div>
      )}

      {/* User menu button */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900/90 backdrop-blur border border-zinc-700/50 rounded-xl shadow-lg hover:bg-zinc-800 transition-colors"
      >
        <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center">
          <span className="text-[10px] font-bold text-white">
            {name ? name.charAt(0).toUpperCase() : "?"}
          </span>
        </div>
        <svg className={`w-3 h-3 text-zinc-400 transition-transform ${showMenu ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute top-full right-0 mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800">
              <p className="text-sm font-medium text-zinc-200 truncate">{name}</p>
              {credits !== null && (
                <p className="text-xs text-zinc-500 mt-0.5">{credits} creditos restantes</p>
              )}
            </div>

            {role === "admin" && (
              <a
                href="/admin"
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                onClick={() => setShowMenu(false)}
              >
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                </svg>
                Painel Admin
              </a>
            )}

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-red-400 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
              Sair
            </button>
          </div>
        </>
      )}
    </div>
  );
}
