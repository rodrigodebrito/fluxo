"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Algo deu errado</h2>
          <p className="text-zinc-400 mb-6">Um erro inesperado aconteceu.</p>
          <button
            onClick={reset}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
