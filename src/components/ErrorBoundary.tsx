"use client";

import { Component, type ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex-1 flex items-center justify-center bg-zinc-950">
          <div className="text-center max-w-md">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-white mb-2">Algo deu errado</h2>
            <p className="text-zinc-400 mb-4 text-sm">
              {this.state.error?.message || "Erro inesperado no editor."}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors text-sm"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
