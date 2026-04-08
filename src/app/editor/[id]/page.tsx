"use client";

import { useRef, useCallback, useState, useEffect, use } from "react";
import dynamic from "next/dynamic";
import Sidebar from "@/components/Sidebar/Sidebar";
import UserCredits from "@/components/Header/UserCredits";
import AppView from "@/components/App/AppView";
import type { FlowEditorHandle } from "@/components/Editor/FlowEditor";
import type { Node } from "@xyflow/react";
import { useRouter } from "next/navigation";

const FlowEditor = dynamic(() => import("@/components/Editor/FlowEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-zinc-950">
      <div className="text-zinc-500">Carregando editor...</div>
    </div>
  ),
});

const NodePanel = dynamic(() => import("@/components/Panel/NodePanel"), {
  ssr: false,
});

export default function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: initialId } = use(params);
  const router = useRouter();
  const editorRef = useRef<FlowEditorHandle>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [workflowName, setWorkflowName] = useState("untitled");
  const [activeTab, setActiveTab] = useState<"canvas" | "app">("canvas");
  const [workflowId, setWorkflowId] = useState(initialId);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoading = useRef(true);

  // Carregar workflow do banco ao montar
  useEffect(() => {
    if (workflowId === "new") {
      isLoading.current = false;
      return;
    }
    fetch(`/api/workflows/${workflowId}`)
      .then((r) => r.json())
      .then((wf) => {
        if (wf.error) return;
        setWorkflowName(wf.name);
        const flowData = JSON.parse(wf.data);
        const interval = setInterval(() => {
          if (editorRef.current) {
            editorRef.current.loadWorkflow(flowData);
            clearInterval(interval);
            // Pequeno delay para não autosave o load
            setTimeout(() => { isLoading.current = false; }, 500);
          }
        }, 100);
      });
  }, [workflowId]);

  // Autosave: salva 1.5s após última mudança
  const autoSave = useCallback(async () => {
    if (!editorRef.current || isLoading.current) return;
    const flowData = editorRef.current.saveWorkflow();

    if (workflowId === "new") {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: workflowName, data: flowData }),
      });
      const wf = await res.json();
      setWorkflowId(wf.id);
      router.replace(`/editor/${wf.id}`);
    } else {
      await fetch(`/api/workflows/${workflowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: workflowName, data: flowData }),
      });
    }
  }, [workflowId, workflowName, router]);

  // Trigger autosave com debounce
  const triggerAutoSave = useCallback(() => {
    if (isLoading.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => autoSave(), 1500);
  }, [autoSave]);

  // Autosave quando nome muda
  useEffect(() => {
    if (!isLoading.current) triggerAutoSave();
  }, [workflowName, triggerAutoSave]);

  const handleRun = useCallback(() => {
    editorRef.current?.runPipeline();
  }, []);

  const handleRunSelected = useCallback(() => {
    if (selectedNode) {
      window.dispatchEvent(
        new CustomEvent("fluxo-run-pipeline", { detail: { modelNodeId: selectedNode.id } })
      );
    }
  }, [selectedNode]);

  const [iteratorCount, setIteratorCount] = useState(0);

  const handleNodeSelect = useCallback((node: Node | null) => {
    const modelNode = node?.type === "model" ? node : null;
    setSelectedNode(modelNode);
    if (modelNode && editorRef.current) {
      setIteratorCount(editorRef.current.getIteratorCount(modelNode.id));
    } else {
      setIteratorCount(0);
    }
  }, []);

  const handleUpdateNodeData = useCallback((nodeId: string, data: Record<string, unknown>) => {
    editorRef.current?.updateNodeData(nodeId, data);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950">
      <Sidebar
        onRun={handleRun}
        workflowName={workflowName}
        onNameChange={setWorkflowName}
        onBack={() => router.push("/dashboard")}
      />
      {/* Main area */}
      <div className="flex-1 flex flex-col relative">
        {/* Workflow name (top-left) */}
        <div className="absolute top-3 left-3 z-10">
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="bg-zinc-900/80 border border-zinc-800 hover:border-zinc-600 focus:border-purple-500 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-200 focus:outline-none backdrop-blur-sm transition-colors w-48 placeholder-zinc-600"
            placeholder="untitled"
          />
        </div>

        {/* Tab switcher + credits */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center bg-zinc-900/90 border border-zinc-800 rounded-lg p-0.5 backdrop-blur-sm">
          <button
            onClick={() => setActiveTab("canvas")}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === "canvas"
                ? "bg-zinc-700 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Canvas
          </button>
          <button
            onClick={() => setActiveTab("app")}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === "app"
                ? "bg-zinc-700 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            App
          </button>
        </div>
        <div className="absolute top-3 right-3 z-10">
          <UserCredits />
        </div>

        {/* Content */}
        <div className={`flex-1 ${activeTab === "canvas" ? "" : "hidden"}`}>
          <FlowEditor ref={editorRef} onNodeSelect={handleNodeSelect} onFlowChange={triggerAutoSave} />
        </div>
        {activeTab === "app" && <AppView />}
      </div>
      {selectedNode && (
        <NodePanel
          node={selectedNode}
          onRun={handleRunSelected}
          onClose={() => setSelectedNode(null)}
          onUpdateData={handleUpdateNodeData}
          iteratorCount={iteratorCount}
        />
      )}
    </div>
  );
}
