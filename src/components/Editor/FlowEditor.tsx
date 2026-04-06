"use client";

import { useCallback, useRef, useEffect, useState, DragEvent, forwardRef, useImperativeHandle } from "react";
import {
  ReactFlow,
  Background,
  Panel,
  useReactFlow,
  useViewport,
  ConnectionMode,
  SelectionMode,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { nodeTypes } from "../nodes";
import { AVAILABLE_MODELS } from "@/types/nodes";
import {
  extractPipelineData,
  startGeneration,
  pollTaskStatus,
  runLLMChain,
} from "@/lib/pipeline/executor";

// Dados padrão para cada tipo de nó
const getDefaultData = (type: string): Record<string, unknown> => {
  switch (type) {
    case "prompt":
      return { label: "Prompt", text: "" };
    case "imageInput":
      return { label: "File", images: [] };
    case "model":
      return { label: "Modelo", model: "nano-banana-pro", isRunning: false, results: [], imageInputCount: 1 };
    case "model-veo3":
      return { label: "Veo 3.1", model: "veo3", isRunning: false, results: [], imageInputCount: 1, veoModel: "veo3_fast", aspectRatio: "16:9", enhancePrompt: true };
    case "model-seedance":
      return { label: "Seedance 2.0", model: "seedance", isRunning: false, results: [], imageInputCount: 1, sdModel: "bytedance/seedance-2", sdResolution: "720p", aspectRatio: "16:9", sdDuration: 8, generateAudio: true, webSearch: false, refCount: 0 };
    case "model-kling":
      return { label: "Kling 3", model: "kling", isRunning: false, results: [], imageInputCount: 1, klingMode: "std", aspectRatio: "16:9", klingDuration: 5, generateAudio: false, elementCount: 0, multiShotEnabled: false, multiShots: [] };
    case "model-kling-o3-i2v":
      return { label: "Kling O3", model: "kling-o3-i2v", isRunning: false, results: [], imageInputCount: 1, aspectRatio: "16:9", klingO3Duration: 5, generateAudio: false, cfgScale: 0.5, falTier: "pro", elementCount: 0, multiShotEnabled: false, multiShots: [] };
    case "model-kling-o3-edit":
      return { label: "Kling O3 Edit Video", model: "kling-o3-edit", isRunning: false, results: [], imageInputCount: 1, keepAudio: true, falTier: "pro", elementCount: 0 };
    case "model-kling-o1-ref":
      return { label: "Kling O1 Reference", model: "kling-o1-ref", isRunning: false, results: [], imageInputCount: 1, aspectRatio: "auto", klingO1Duration: 5, keepAudio: true, falTier: "pro", elementCount: 0 };
    case "model-kling-motion":
      return { label: "Kling Motion", model: "kling-motion", isRunning: false, results: [], imageInputCount: 1, motionVersion: "2.6", motionMode: "720p", characterOrientation: "video" };
    case "model-gpt-image-txt":
      return { label: "GPT Image 1.5", model: "gpt-image-txt", isRunning: false, results: [], imageInputCount: 1, aspectRatio: "1:1", gptQuality: "medium", gptBackground: "opaque" };
    case "model-gpt-image-img":
      return { label: "GPT Image 1.5 Edit", model: "gpt-image-img", isRunning: false, results: [], imageInputCount: 1, aspectRatio: "1:1", gptQuality: "medium" };
    case "klingElement":
      return { label: "Kling Element", elementName: "", elementDescription: "" };
    case "lastFrame":
      return { label: "Last Frame", frameUrl: "", sourceVideoUrl: "", images: [] };
    case "videoConcat":
      return { label: "Video Concat", inputCount: 2, resultUrl: "" };
    case "anyLLM":
      return { label: "Any LLM", llmModel: "gpt-4o-mini", temperature: 0.7, isRunning: false, generatedText: "", imageInputCount: 1 };
    case "router":
      return { label: "Router", outputCount: 2 };
    case "promptConcat":
      return { label: "Prompt Concatenator", inputCount: 2, additionalText: "" };
    case "textIterator":
      return { label: "Text Iterator", items: ["", ""] };
    case "videoInput":
      return { label: "Video Input", videoUrl: "", fileName: "" };
    case "output":
      return { label: "Output", resultUrl: "", resultType: "none", isLoading: false };
    default:
      return { label: "Node" };
  }
};

// Começa vazio
const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

let nodeId = 1;

export interface FlowEditorProps {
  onNodeSelect?: (node: Node | null) => void;
  onFlowChange?: () => void;
}

export interface FlowEditorHandle {
  saveWorkflow: () => { nodes: Node[]; edges: Edge[] };
  loadWorkflow: (data?: { nodes: Node[]; edges: Edge[] }) => void;
  runPipeline: () => void;
  updateNodeData: (nodeId: string, data: Record<string, unknown>) => void;
  getIteratorCount: (modelNodeId: string) => number;
}

const FlowEditor = forwardRef<FlowEditorHandle, FlowEditorProps>(function FlowEditor({ onNodeSelect, onFlowChange }, ref) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reactFlowInstance = useRef<any>(null);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const connectingFrom = useRef<{ nodeId: string; handleId: string | null } | null>(null);
  const connectHandled = useRef(false); // flag: onConnect já tratou esta conexão
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  // Tool mode: "select" = default cursor/selection, "hand" = pan with left click
  const [toolMode, setToolMode] = useState<"select" | "hand">("select");

  // Undo/Redo history
  const undoStack = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const redoStack = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const lastSnapshot = useRef<string>("");

  const pushUndo = useCallback(() => {
    const snap = JSON.stringify({ nodes: nodesRef.current, edges: edgesRef.current });
    if (snap === lastSnapshot.current) return;
    undoStack.current.push(JSON.parse(lastSnapshot.current || snap));
    if (undoStack.current.length > 50) undoStack.current.shift();
    redoStack.current = [];
    lastSnapshot.current = snap;
  }, []);

  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    const current = { nodes: nodesRef.current, edges: edgesRef.current };
    redoStack.current.push(JSON.parse(JSON.stringify(current)));
    const prev = undoStack.current.pop()!;
    setNodes(prev.nodes);
    setEdges(prev.edges);
    lastSnapshot.current = JSON.stringify(prev);
  }, [setNodes, setEdges]);

  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    const current = { nodes: nodesRef.current, edges: edgesRef.current };
    undoStack.current.push(JSON.parse(JSON.stringify(current)));
    const next = redoStack.current.pop()!;
    setNodes(next.nodes);
    setEdges(next.edges);
    lastSnapshot.current = JSON.stringify(next);
  }, [setNodes, setEdges]);

  // Context menu
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; flowX: number; flowY: number } | null>(null);
  const [contextSearch, setContextSearch] = useState("");
  const [showNoCredits, setShowNoCredits] = useState(false);
  // Track right-mouse-button drag for panning cursor
  useEffect(() => {
    const wrapper = reactFlowWrapper.current;
    if (!wrapper) return;
    let rightDown = false;
    let startX = 0;
    let startY = 0;

    const onDown = (e: MouseEvent) => {
      if (e.button === 2) {
        rightDown = true;
        startX = e.clientX;
        startY = e.clientY;
      }
    };
    const onMove = (e: MouseEvent) => {
      if (!rightDown) return;
      const dx = Math.abs(e.clientX - startX);
      const dy = Math.abs(e.clientY - startY);
      if (dx > 3 || dy > 3) {
        document.documentElement.classList.add("is-panning");
      }
    };
    const onUp = (e: MouseEvent) => {
      if (e.button === 2) {
        rightDown = false;
        document.documentElement.classList.remove("is-panning");
      }
    };

    wrapper.addEventListener("mousedown", onDown, true);
    window.addEventListener("mousemove", onMove, true);
    window.addEventListener("mouseup", onUp, true);
    return () => {
      wrapper.removeEventListener("mousedown", onDown, true);
      window.removeEventListener("mousemove", onMove, true);
      window.removeEventListener("mouseup", onUp, true);
      document.documentElement.classList.remove("is-panning");
    };
  }, []);

  // Snapshot para undo quando nodes/edges mudam
  useEffect(() => {
    const snap = JSON.stringify({ nodes, edges });
    if (!lastSnapshot.current) { lastSnapshot.current = snap; return; }
    if (snap !== lastSnapshot.current) pushUndo();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  // Ctrl+Z / Ctrl+Y shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  const selectedNodeId = useRef<string | null>(null);

  // Manter refs atualizados e notificar seleção
  useEffect(() => {
    nodesRef.current = nodes;
    if (selectedNodeId.current && onNodeSelect) {
      const updated = nodes.find((n) => n.id === selectedNodeId.current);
      if (updated) onNodeSelect(updated);
    }
    onFlowChange?.();
  }, [nodes, onNodeSelect, onFlowChange]);
  useEffect(() => {
    edgesRef.current = edges;
    onFlowChange?.();
  }, [edges, onFlowChange]);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      // Forçar seleção visual do nó clicado
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          selected: n.id === node.id,
        }))
      );
      selectedNodeId.current = node.type === "model" ? node.id : null;
      onNodeSelect?.(node.type === "model" ? node : null);
    },
    [onNodeSelect, setNodes]
  );

  const onPaneClick = useCallback(() => {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
    selectedNodeId.current = null;
    onNodeSelect?.(null);
    setContextMenu(null);
  }, [onNodeSelect, setNodes]);

  // Context menu: right-click no canvas
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onPaneContextMenu = useCallback((event: any) => {
    event.preventDefault();
    if (!reactFlowInstance.current || !reactFlowWrapper.current) return;
    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    const flowPos = reactFlowInstance.current.screenToFlowPosition({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
    setContextMenu({ x: event.clientX - bounds.left, y: event.clientY - bounds.top, flowX: flowPos.x, flowY: flowPos.y });
    setContextSearch("");
  }, []);

  // Adicionar nó na posição do context menu
  const addNodeFromContext = useCallback((type: string) => {
    if (!contextMenu) return;
    const nodeType = type.startsWith("model-") ? "model" : type;
    const newNode: Node = {
      id: String(nodeId++),
      type: nodeType,
      position: { x: contextMenu.flowX, y: contextMenu.flowY },
      data: getDefaultData(type),
    };
    setNodes((nds) => [...nds, newNode]);
    setContextMenu(null);
  }, [contextMenu, setNodes]);

  // Helper: criar edge entre source e target com lógica de auto-routing
  const createEdge = useCallback(
    (sourceId: string, sourceHandleId: string | null, targetId: string, targetHandleId: string | null) => {
      const sourceNode = nodesRef.current.find((n) => n.id === sourceId);
      const targetNode = nodesRef.current.find((n) => n.id === targetId);
      if (!sourceNode || !targetNode) return;

      let edgeColor = "#22c55e";
      if (sourceNode.type === "prompt") edgeColor = "#a855f7";
      else if (sourceNode.type === "imageInput") edgeColor = "#06b6d4";
      else if (sourceNode.type === "klingElement") edgeColor = "#f43f5e";
      else if (sourceNode.type === "lastFrame") edgeColor = "#f59e0b";
      else if (sourceNode.type === "videoConcat") edgeColor = "#f97316";
      else if (sourceNode.type === "model") edgeColor = "#22c55e";
      else if (sourceNode.type === "anyLLM") edgeColor = "#f59e0b";
      else if (sourceNode.type === "router") edgeColor = "#06b6d4";
      else if (sourceNode.type === "promptConcat") edgeColor = "#a855f7";

      let finalTargetHandle = targetHandleId;

      // Any → router: always go to "input" handle
      if (targetNode.type === "router") {
        finalTargetHandle = "input";
      }

      // Router → model: route to prompt or image handle based on source type
      if (sourceNode.type === "router" && targetNode.type === "model") {
        // Find what's connected to the router's input to determine behavior
        const routerInputEdge = edgesRef.current.find((e) => e.target === sourceId && e.targetHandle === "input");
        const routerSource = routerInputEdge ? nodesRef.current.find((n) => n.id === routerInputEdge.source) : null;

        if (routerSource?.type === "prompt") {
          if (finalTargetHandle !== "negative-prompt") {
            finalTargetHandle = "prompt";
          }
        } else if (routerSource?.type === "imageInput" || routerSource?.type === "lastFrame" || routerSource?.type === "model") {
          const imageInputCount = (targetNode.data.imageInputCount as number) || 1;
          const occupiedHandles = new Set(
            edgesRef.current
              .filter((e) => e.target === targetId && e.targetHandle?.startsWith("image-"))
              .map((e) => e.targetHandle)
          );
          if (finalTargetHandle?.startsWith("image-") && !occupiedHandles.has(finalTargetHandle)) {
            // user chose specific handle
          } else {
            let freeHandle: string | null = null;
            for (let i = 1; i <= imageInputCount; i++) {
              const handleId = `image-${i}`;
              if (!occupiedHandles.has(handleId)) { freeHandle = handleId; break; }
            }
            if (!freeHandle) return;
            finalTargetHandle = freeHandle;
          }
        }
      }

      // Router → anyLLM: route based on source type
      if (sourceNode.type === "router" && targetNode.type === "anyLLM") {
        const routerInputEdge = edgesRef.current.find((e) => e.target === sourceId && e.targetHandle === "input");
        const routerSource = routerInputEdge ? nodesRef.current.find((n) => n.id === routerInputEdge.source) : null;

        if (routerSource?.type === "prompt") {
          const promptOccupied = edgesRef.current.some((e) => e.target === targetId && e.targetHandle === "prompt");
          finalTargetHandle = promptOccupied ? "system-prompt" : "prompt";
        } else if (routerSource?.type === "imageInput") {
          const imageInputCount = (targetNode.data.imageInputCount as number) || 1;
          const occupiedHandles = new Set(
            edgesRef.current.filter((e) => e.target === targetId && e.targetHandle?.startsWith("image-")).map((e) => e.targetHandle)
          );
          let freeHandle: string | null = null;
          for (let i = 1; i <= imageInputCount; i++) {
            if (!occupiedHandles.has(`image-${i}`)) { freeHandle = `image-${i}`; break; }
          }
          if (!freeHandle) return;
          finalTargetHandle = freeHandle;
        }
      }

      // Prompt → promptConcat: route to next free prompt handle
      if (sourceNode.type === "prompt" && targetNode.type === "promptConcat") {
        const inputCount = (targetNode.data.inputCount as number) || 2;
        const occupiedHandles = new Set(
          edgesRef.current
            .filter((e) => e.target === targetId && e.targetHandle?.startsWith("prompt-"))
            .map((e) => e.targetHandle)
        );
        if (finalTargetHandle?.startsWith("prompt-") && !occupiedHandles.has(finalTargetHandle)) {
          // user chose specific handle
        } else {
          let freeHandle: string | null = null;
          for (let i = 1; i <= inputCount; i++) {
            if (!occupiedHandles.has(`prompt-${i}`)) { freeHandle = `prompt-${i}`; break; }
          }
          if (!freeHandle) return;
          finalTargetHandle = freeHandle;
        }
      }

      // PromptConcat → model: output goes to prompt handle
      if (sourceNode.type === "promptConcat" && targetNode.type === "model") {
        if (finalTargetHandle !== "negative-prompt") {
          finalTargetHandle = "prompt";
        }
      }

      // PromptConcat → anyLLM: output goes to prompt or system-prompt handle
      if (sourceNode.type === "promptConcat" && targetNode.type === "anyLLM") {
        const promptOccupied = edgesRef.current.some((e) => e.target === targetId && e.targetHandle === "prompt");
        finalTargetHandle = promptOccupied ? "system-prompt" : "prompt";
      }

      // Prompt → anyLLM: auto-route to prompt or system-prompt handle
      if (sourceNode.type === "prompt" && targetNode.type === "anyLLM") {
        if (finalTargetHandle === "system-prompt") {
          // user explicitly chose system-prompt
        } else {
          // Check if prompt handle is occupied
          const promptOccupied = edgesRef.current.some(
            (e) => e.target === targetId && e.targetHandle === "prompt"
          );
          finalTargetHandle = promptOccupied ? "system-prompt" : "prompt";
        }
      }

      // ImageInput → anyLLM: route to image handles
      if (sourceNode.type === "imageInput" && targetNode.type === "anyLLM") {
        const imageInputCount = (targetNode.data.imageInputCount as number) || 1;
        const occupiedHandles = new Set(
          edgesRef.current
            .filter((e) => e.target === targetId && e.targetHandle?.startsWith("image-"))
            .map((e) => e.targetHandle)
        );
        if (finalTargetHandle?.startsWith("image-") && !occupiedHandles.has(finalTargetHandle)) {
          // user chose specific handle
        } else {
          let freeHandle: string | null = null;
          for (let i = 1; i <= imageInputCount; i++) {
            const handleId = `image-${i}`;
            if (!occupiedHandles.has(handleId)) { freeHandle = handleId; break; }
          }
          if (!freeHandle) return;
          finalTargetHandle = freeHandle;
        }
      }

      // AnyLLM → model: text output goes to prompt handle
      if (sourceNode.type === "anyLLM" && targetNode.type === "model") {
        finalTargetHandle = "prompt";
      }

      // Prompt → model: respeitar negative-prompt se o usuário conectou nele, senão usar "prompt"
      if (sourceNode.type === "prompt" && targetNode.type === "model") {
        if (finalTargetHandle !== "negative-prompt") {
          finalTargetHandle = "prompt";
        }
      }

      // Model → model: resultado vai como imagem de referência (encontrar handle livre)
      if (sourceNode.type === "model" && targetNode.type === "model") {
        // Respeitar ref-*, element-*, e video-* handles
        if (finalTargetHandle?.startsWith("ref-") || finalTargetHandle?.startsWith("element-") || finalTargetHandle?.startsWith("video-")) {
          // usar o escolhido
        } else {
          const imageInputCount = (targetNode.data.imageInputCount as number) || 1;
          const occupiedHandles = new Set(
            edgesRef.current
              .filter((e) => e.target === targetId && e.targetHandle?.startsWith("image-"))
              .map((e) => e.targetHandle)
          );

          // Se o source é um modelo de video e o target tem video-1, priorizar video-1
          const sourceModelInfo = AVAILABLE_MODELS.find((m) => m.id === sourceNode.data.model);
          const targetModelInfo = AVAILABLE_MODELS.find((m) => m.id === targetNode.data.model);
          const sourceIsVideo = sourceModelInfo?.type === "video";
          const targetHasVideo = targetModelInfo?.handles.some((h) => h.id === "video-1");
          const videoOccupied = edgesRef.current.some((e) => e.target === targetId && e.targetHandle === "video-1");

          if (sourceIsVideo && targetHasVideo && !videoOccupied && !finalTargetHandle?.startsWith("image-")) {
            finalTargetHandle = "video-1";
          } else if (finalTargetHandle?.startsWith("image-") && !occupiedHandles.has(finalTargetHandle)) {
            // usar o escolhido
          } else {
            let freeHandle: string | null = null;
            for (let i = 1; i <= imageInputCount; i++) {
              const handleId = `image-${i}`;
              if (!occupiedHandles.has(handleId)) {
                freeHandle = handleId;
                break;
              }
            }
            // Se não tem image handle livre, tentar video-1
            if (!freeHandle && targetHasVideo && !videoOccupied) {
              freeHandle = "video-1";
            }
            if (!freeHandle) return;
            finalTargetHandle = freeHandle;
          }
        }
      }

      // ImageInput → model: encontrar handle livre
      if (sourceNode.type === "imageInput" && targetNode.type === "model") {
        // Se o usuário conectou diretamente a um ref-* ou element-* handle, respeitar
        if (finalTargetHandle?.startsWith("ref-") || finalTargetHandle?.startsWith("element-")) {
          // usar o que o usuário escolheu — não auto-route
        } else {
          const imageInputCount = (targetNode.data.imageInputCount as number) || 1;
          const occupiedHandles = new Set(
            edgesRef.current
              .filter((e) => e.target === targetId && e.targetHandle?.startsWith("image-"))
              .map((e) => e.targetHandle)
          );

          if (finalTargetHandle?.startsWith("image-") && !occupiedHandles.has(finalTargetHandle)) {
            // usar o que o usuário escolheu
          } else {
            // Encontrar próximo livre
            let freeHandle: string | null = null;
            for (let i = 1; i <= imageInputCount; i++) {
              const handleId = `image-${i}`;
              if (!occupiedHandles.has(handleId)) {
                freeHandle = handleId;
                break;
              }
            }
            if (!freeHandle) return;
            finalTargetHandle = freeHandle;
          }
        }
      }

      // ImageInput → klingElement: encontrar handle livre (image-1 a image-4)
      if (sourceNode.type === "imageInput" && targetNode.type === "klingElement") {
        const occupiedHandles = new Set(
          edgesRef.current
            .filter((e) => e.target === targetId && e.targetHandle?.startsWith("image-"))
            .map((e) => e.targetHandle)
        );
        if (finalTargetHandle?.startsWith("image-") && !occupiedHandles.has(finalTargetHandle)) {
          // usar o escolhido
        } else {
          let freeHandle: string | null = null;
          for (let i = 1; i <= 4; i++) {
            const handleId = `image-${i}`;
            if (!occupiedHandles.has(handleId)) { freeHandle = handleId; break; }
          }
          if (!freeHandle) return;
          finalTargetHandle = freeHandle;
        }
      }

      // Model → lastFrame: video output to video-in
      if (sourceNode.type === "model" && targetNode.type === "lastFrame") {
        finalTargetHandle = "video-in";
      }

      // LastFrame → model: image output to first free image handle
      if (sourceNode.type === "lastFrame" && targetNode.type === "model") {
        if (finalTargetHandle?.startsWith("ref-") || finalTargetHandle?.startsWith("element-")) {
          // usar o escolhido
        } else {
          const imageInputCount = (targetNode.data.imageInputCount as number) || 1;
          const occupiedHandles = new Set(
            edgesRef.current
              .filter((e) => e.target === targetId && e.targetHandle?.startsWith("image-"))
              .map((e) => e.targetHandle)
          );
          if (finalTargetHandle?.startsWith("image-") && !occupiedHandles.has(finalTargetHandle)) {
            // usar o escolhido
          } else {
            let freeHandle: string | null = null;
            for (let i = 1; i <= imageInputCount; i++) {
              const handleId = `image-${i}`;
              if (!occupiedHandles.has(handleId)) { freeHandle = handleId; break; }
            }
            if (!freeHandle) return;
            finalTargetHandle = freeHandle;
          }
        }
      }

      // Model → videoConcat: encontrar handle video livre
      if (sourceNode.type === "model" && targetNode.type === "videoConcat") {
        const vidInputCount = (targetNode.data.inputCount as number) || 2;
        const occupiedHandles = new Set(
          edgesRef.current
            .filter((e) => e.target === targetId && e.targetHandle?.startsWith("video-"))
            .map((e) => e.targetHandle)
        );
        if (finalTargetHandle?.startsWith("video-") && !occupiedHandles.has(finalTargetHandle)) {
          // usar o escolhido
        } else {
          let freeHandle: string | null = null;
          for (let i = 1; i <= vidInputCount; i++) {
            const handleId = `video-${i}`;
            if (!occupiedHandles.has(handleId)) { freeHandle = handleId; break; }
          }
          if (!freeHandle) return;
          finalTargetHandle = freeHandle;
        }
      }

      // videoConcat → videoConcat: encadear concatenadores
      if (sourceNode.type === "videoConcat" && targetNode.type === "videoConcat") {
        const vidInputCount = (targetNode.data.inputCount as number) || 2;
        const occupiedHandles = new Set(
          edgesRef.current
            .filter((e) => e.target === targetId && e.targetHandle?.startsWith("video-"))
            .map((e) => e.targetHandle)
        );
        let freeHandle: string | null = null;
        for (let i = 1; i <= vidInputCount; i++) {
          const handleId = `video-${i}`;
          if (!occupiedHandles.has(handleId)) { freeHandle = handleId; break; }
        }
        if (!freeHandle) return;
        finalTargetHandle = freeHandle;
      }

      // KlingElement → model: encontrar handle element livre
      if (sourceNode.type === "klingElement" && targetNode.type === "model") {
        const elementCount = (targetNode.data.elementCount as number) || 0;
        const occupiedHandles = new Set(
          edgesRef.current
            .filter((e) => e.target === targetId && e.targetHandle?.startsWith("element-"))
            .map((e) => e.targetHandle)
        );
        if (finalTargetHandle?.startsWith("element-") && !occupiedHandles.has(finalTargetHandle)) {
          // usar o escolhido
        } else {
          let freeHandle: string | null = null;
          for (let i = 1; i <= elementCount; i++) {
            const handleId = `element-${i}`;
            if (!occupiedHandles.has(handleId)) { freeHandle = handleId; break; }
          }
          if (!freeHandle) return;
          finalTargetHandle = freeHandle;
        }
      }

      // Cor especial para negative-prompt
      const finalEdgeColor = finalTargetHandle === "negative-prompt" ? "#ec4899" : edgeColor;

      // Remover edge existente no mesmo handle e adicionar novo
      setEdges((eds) => {
        const filtered = eds.filter(
          (e) => !(e.target === targetId && e.targetHandle === finalTargetHandle)
        );
        return addEdge(
          {
            source: sourceId,
            target: targetId,
            sourceHandle: sourceHandleId,
            targetHandle: finalTargetHandle,
            animated: true,
            style: { stroke: finalEdgeColor },
          },
          filtered
        );
      });

      // Auto-expand router: when connecting FROM a router output, add another output if needed
      if (sourceNode.type === "router") {
        const currentOutputCount = (sourceNode.data.outputCount as number) || 2;
        const usedOutputs = edgesRef.current.filter((e) => e.source === sourceId && e.sourceHandle?.startsWith("output-")).length;
        // +1 because the new edge hasn't been committed to edgesRef yet
        if (usedOutputs + 1 >= currentOutputCount) {
          setNodes((nds) => nds.map((n) =>
            n.id === sourceId ? { ...n, data: { ...n.data, outputCount: currentOutputCount + 1 } } : n
          ));
        }
      }
    },
    [setEdges, setNodes]
  );

  // onConnect: chamado quando ReactFlow aceita uma conexão nativa (handle→handle)
  const onConnect = useCallback(
    (params: Connection) => {
      connectHandled.current = true; // marcar que onConnect já tratou
      createEdge(
        params.source,
        params.sourceHandle ?? null,
        params.target,
        params.targetHandle ?? null
      );
    },
    [createEdge]
  );

  // onConnectStart: guardar de onde a conexão começou
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onConnectStart = useCallback(
    (_event: any, params: { nodeId: string | null; handleId: string | null }) => {
      connectHandled.current = false; // resetar flag
      if (params.nodeId) {
        connectingFrom.current = { nodeId: params.nodeId, handleId: params.handleId };
      }
    },
    []
  );

  // onConnectEnd: quando a conexão é solta (inclusive quando não acertou um handle)
  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!connectingFrom.current || !reactFlowInstance.current) return;

      // Se onConnect já tratou esta conexão (acertou um handle), não duplicar
      if (connectHandled.current) {
        connectingFrom.current = null;
        connectHandled.current = false;
        return;
      }

      const fromNode = nodesRef.current.find((n) => n.id === connectingFrom.current!.nodeId);
      if (!fromNode) return;

      // Encontrar o nó alvo sob o cursor
      const clientX = "changedTouches" in event ? event.changedTouches[0].clientX : event.clientX;
      const clientY = "changedTouches" in event ? event.changedTouches[0].clientY : event.clientY;

      const targetElement = document.elementFromPoint(clientX, clientY);

      const targetNodeElement = targetElement?.closest(".react-flow__node");

      if (targetNodeElement) {
        const targetNodeId = targetNodeElement.getAttribute("data-id");
        if (targetNodeId && targetNodeId !== connectingFrom.current.nodeId) {
          const targetNode = nodesRef.current.find((n) => n.id === targetNodeId);

          if (targetNode && (targetNode.type === "model" || targetNode.type === "klingElement" || targetNode.type === "lastFrame" || targetNode.type === "videoConcat" || targetNode.type === "anyLLM" || targetNode.type === "router" || targetNode.type === "promptConcat")) {
            // Verificar se a conexão já foi feita pelo onConnect (evitar duplicata)
            const alreadyConnected = edgesRef.current.some(
              (e) => e.source === connectingFrom.current!.nodeId && e.target === targetNodeId
            );
            if (!alreadyConnected) {
              createEdge(
                connectingFrom.current.nodeId,
                connectingFrom.current.handleId,
                targetNodeId,
                null
              );
            }
          }
        }
      }

      connectingFrom.current = null;
    },
    [createEdge]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onInit = useCallback((instance: any) => {
    reactFlowInstance.current = instance;
  }, []);

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");
      if (!type || !reactFlowInstance.current || !reactFlowWrapper.current) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.current.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      // model-veo3 usa node type "model" mas com dados de veo3
      const nodeType = type.startsWith("model-") ? "model" : type;

      const newNode: Node = {
        id: String(nodeId++),
        type: nodeType,
        position,
        data: getDefaultData(type),
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  // Salvar workflow
  const saveWorkflow = useCallback(() => {
    return { nodes: nodesRef.current, edges: edgesRef.current };
  }, []);

  // Carregar workflow de dados externos
  const loadWorkflow = useCallback((data?: { nodes: Node[]; edges: Edge[] }) => {
    if (!data) return;
    setNodes(data.nodes || []);
    setEdges(data.edges || []);

    const maxId = Math.max(
      ...(data.nodes || []).map((n: Node) => parseInt(n.id) || 0),
      0
    );
    nodeId = maxId + 1;
  }, [setNodes, setEdges]);

  // Run pipeline
  const executePipeline = useCallback(async (modelNodeId?: string) => {
    const currentNodes = nodesRef.current;
    const currentEdges = edgesRef.current;
    const pipeline = extractPipelineData(currentNodes, currentEdges, modelNodeId);

    // If there's an LLM chain, run it first to get the prompt
    if (pipeline.llmChain && !pipeline.prompt) {
      const llmNodeId = pipeline.llmChain.llmNodeId;
      // Mark LLM node as running
      setNodes((nds) => nds.map((n) => n.id === llmNodeId ? { ...n, data: { ...n.data, isRunning: true, generatedText: "" } } : n));
      try {
        const llmText = await runLLMChain(pipeline.llmChain);
        pipeline.prompt = llmText;
        // Update LLM node with generated text
        setNodes((nds) => nds.map((n) => n.id === llmNodeId ? { ...n, data: { ...n.data, isRunning: false, generatedText: llmText } } : n));
        window.dispatchEvent(new Event("fluxo-credits-update"));
      } catch (err) {
        setNodes((nds) => nds.map((n) => n.id === llmNodeId ? { ...n, data: { ...n.data, isRunning: false } } : n));
        alert("Erro no LLM: " + (err instanceof Error ? err.message : "Erro desconhecido"));
        return;
      }
    }

    const isMultiShot = pipeline.multiShotEnabled && pipeline.multiShots && pipeline.multiShots.length > 0;
    const isPromptOptional = pipeline.model === "kling-motion";
    if (!pipeline.prompt && !isMultiShot && !isPromptOptional) {
      alert("Conecte um nó de Prompt com texto ao nó de Modelo antes de executar.");
      return;
    }

    if (!pipeline.modelNodeId) {
      alert("Nenhum nó de Modelo encontrado.");
      return;
    }

    // Criar AbortController para este node
    const ac = new AbortController();
    abortControllers.current.set(pipeline.modelNodeId, ac);

    // Marcar model como running
    setNodes((nds) =>
      nds.map((n) =>
        n.id === pipeline.modelNodeId
          ? { ...n, data: { ...n.data, isRunning: true } }
          : n
      )
    );

    try {
      // Calcular custo dinamico (mesma logica do NodePanel)
      let costPerRun = 18;
      const m = pipeline.model;
      if (m === "nano-banana-pro") costPerRun = pipeline.resolution === "4K" ? 24 : 18;
      else if (m === "gpt-image-txt" || m === "gpt-image-img") costPerRun = pipeline.gptQuality === "high" ? 22 : 4;
      else if (m === "veo3") {
        if (pipeline.veoModel === "veo3_lite") costPerRun = 30;
        else if (pipeline.veoModel === "veo3") costPerRun = 250;
        else costPerRun = 60;
      } else if (m === "seedance") {
        const is720 = pipeline.sdResolution === "720p";
        const isFast = pipeline.sdModel === "bytedance/seedance-2-fast";
        const perSec = isFast ? (is720 ? 33 : 15.5) : (is720 ? 41 : 19);
        costPerRun = Math.round(perSec * (pipeline.sdDuration || 8));
      } else if (m === "kling") {
        const perSec = pipeline.klingMode === "pro"
          ? (pipeline.generateAudio ? 27 : 18)
          : (pipeline.generateAudio ? 20 : 14);
        const klingDur = pipeline.multiShotEnabled && pipeline.multiShots?.length
          ? pipeline.multiShots.reduce((s, shot) => s + shot.duration, 0)
          : (pipeline.klingDuration || 5);
        costPerRun = perSec * klingDur;
      } else if (m === "kling-o3-i2v") {
        const isPro = pipeline.falTier === "pro";
        const perSec = isPro
          ? (pipeline.generateAudio ? 29 : 24)
          : (pipeline.generateAudio ? 20 : 16);
        const o3Dur = pipeline.multiShotEnabled && pipeline.multiShots?.length
          ? pipeline.multiShots.reduce((s, shot) => s + shot.duration, 0)
          : (pipeline.klingO3Duration || 5);
        costPerRun = perSec * o3Dur;
      } else if (m === "kling-o3-edit" || m === "kling-o1-ref") {
        const isPro = pipeline.falTier === "pro";
        const dur = m === "kling-o1-ref" ? (pipeline.klingO1Duration || 5) : 5;
        costPerRun = (isPro ? 36 : 24) * dur;
      } else if (m === "kling-motion") {
        // 2.6: 720p=$0.03/s, 1080p=$0.045/s → 5/s, 8/s credits (50% margin)
        // 3.0: 720p=$0.10/s, 1080p=$0.135/s → 17/s, 23/s credits (50% margin)
        const is3 = pipeline.motionVersion === "3.0";
        const is1080 = pipeline.motionMode === "1080p";
        const perSec = is3 ? (is1080 ? 23 : 17) : (is1080 ? 8 : 5);
        const motionDur = pipeline.videoDuration || 10;
        costPerRun = perSec * motionDur;
      }

      const genOptions = {
        model: pipeline.model,
        resolution: pipeline.resolution,
        aspectRatio: pipeline.aspectRatio,
        seed: pipeline.seed,
        veoModel: pipeline.veoModel,
        enhancePrompt: pipeline.enhancePrompt,
        sdModel: pipeline.sdModel,
        sdResolution: pipeline.sdResolution,
        sdDuration: pipeline.sdDuration,
        generateAudio: pipeline.generateAudio,
        webSearch: pipeline.webSearch,
        klingMode: pipeline.klingMode,
        klingDuration: pipeline.klingDuration,
        klingElements: pipeline.klingElements,
        referenceImageUrls: pipeline.referenceImageUrls,
        gptQuality: pipeline.gptQuality,
        gptBackground: pipeline.gptBackground,
        fixedLens: pipeline.fixedLens,
        videoUrl: pipeline.videoUrl,
        cfgScale: pipeline.cfgScale,
        keepAudio: pipeline.keepAudio,
        klingO3Duration: pipeline.klingO3Duration,
        klingO1Duration: pipeline.klingO1Duration,
        falTier: pipeline.falTier,
        multiShotEnabled: pipeline.multiShotEnabled,
        multiShots: pipeline.multiShots,
        motionVersion: pipeline.motionVersion,
        motionMode: pipeline.motionMode,
        characterOrientation: pipeline.characterOrientation,
        cost: costPerRun,
      };

      // Text Iterator: gerar uma task por item com delay entre cada (evita rate limit)
      // Runs normal: gerar N tasks com o mesmo prompt
      const taskIds: string[] = [];

      if (pipeline.iteratorPrompts && pipeline.iteratorPrompts.length > 0) {
        for (let i = 0; i < pipeline.iteratorPrompts.length; i++) {
          if (i > 0) await new Promise((r) => setTimeout(r, 1500)); // 1.5s delay entre tasks
          const id = await startGeneration(pipeline.iteratorPrompts[i], pipeline.localImageUrls, genOptions);
          taskIds.push(id);
        }
      } else {
        const runCount = pipeline.runs;
        for (let i = 0; i < runCount; i++) {
          if (i > 0 && runCount > 1) await new Promise((r) => setTimeout(r, 1500));
          const id = await startGeneration(pipeline.prompt, pipeline.localImageUrls, genOptions);
          taskIds.push(id);
        }
      }

      // Atualizar creditos na UI apos cobranca
      window.dispatchEvent(new Event("fluxo-credits-update"));

      // Veo usa endpoint diferente de polling, os outros usam recordInfo
      const pollType = pipeline.model === "veo3" ? "video" : "image";
      const resultPromises = taskIds.map((taskId, idx) => {
        const promptForTask = pipeline.iteratorPrompts?.[idx] || pipeline.prompt;
        return pollTaskStatus(taskId, (progress) => {
          console.log(`Task ${taskId} progresso:`, progress);
        }, pollType as "image" | "video", ac.signal, pipeline.model, costPerRun, promptForTask);
      });

      const results = await Promise.all(resultPromises);

      const allUrls: string[] = [];
      const errors: string[] = [];

      for (const result of results) {
        if (result.error) errors.push(result.error);
        allUrls.push(...result.resultUrls);
      }

      if (errors.length > 0 && allUrls.length === 0) {
        alert("Erro na geração: " + errors[0]);
        setNodes((nds) =>
          nds.map((n) =>
            n.id === pipeline.modelNodeId
              ? { ...n, data: { ...n.data, isRunning: false } }
              : n
          )
        );
        return;
      }

      if (allUrls.length > 0) {
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id === pipeline.modelNodeId) {
              const prevResults = (n.data.results as string[]) || [];
              return {
                ...n,
                data: {
                  ...n.data,
                  isRunning: false,
                  results: [...prevResults, ...allUrls],
                },
              };
            }
            return n;
          })
        );
      }
    } catch (err) {
      if (ac.signal.aborted) {
        // Cancelado pelo usuário — silencioso
        console.log("[pipeline] Cancelado pelo usuário");
      } else {
        console.error("Erro no pipeline:", err);
        const errMsg = err instanceof Error ? err.message : "Erro desconhecido";
        if (errMsg.includes("Creditos insuficientes") || errMsg.includes("402")) {
          setShowNoCredits(true);
        } else {
          alert("Erro: " + errMsg);
        }
      }
      setNodes((nds) =>
        nds.map((n) =>
          n.id === pipeline.modelNodeId
            ? { ...n, data: { ...n.data, isRunning: false } }
            : n
        )
      );
    } finally {
      abortControllers.current.delete(pipeline.modelNodeId);
    }
  }, [setNodes]);

  // Cancelar geração de um nó
  const cancelPipeline = useCallback((modelNodeId: string) => {
    const ac = abortControllers.current.get(modelNodeId);
    if (ac) {
      ac.abort();
      abortControllers.current.delete(modelNodeId);
    }
    setNodes((nds) =>
      nds.map((n) =>
        n.id === modelNodeId
          ? { ...n, data: { ...n.data, isRunning: false } }
          : n
      )
    );
  }, [setNodes]);

  // Ouvir evento "Run Model"
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      executePipeline(detail?.modelNodeId);
    };
    window.addEventListener("fluxo-run-pipeline", handler);

    const cancelHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.modelNodeId) cancelPipeline(detail.modelNodeId);
    };
    window.addEventListener("fluxo-cancel-pipeline", cancelHandler);

    const duplicateHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.nodeId) return;
      const sourceNode = nodesRef.current.find((n) => n.id === detail.nodeId);
      if (!sourceNode) return;
      const newId = String(nodeId++);
      const newNode = {
        ...sourceNode,
        id: newId,
        position: { x: sourceNode.position.x + 30, y: sourceNode.position.y + 30 },
        selected: false,
        data: { ...sourceNode.data, results: [], isRunning: false, resultUrl: "", isLoading: false },
      };
      setNodes((nds) => [...nds, newNode]);
    };
    window.addEventListener("fluxo-duplicate-node", duplicateHandler);

    // Run LLM standalone (Any LLM node "Run Model" button)
    const llmHandler = async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.nodeId) return;
      const currentNodes = nodesRef.current;
      const currentEdges = edgesRef.current;
      const llmNode = currentNodes.find((n) => n.id === detail.nodeId && n.type === "anyLLM");
      if (!llmNode) return;

      // Collect prompt from connected prompt node
      let prompt = "";
      let systemPrompt = "";
      const imageUrls: string[] = [];

      for (const edge of currentEdges) {
        if (edge.target !== llmNode.id) continue;
        const sourceNode = currentNodes.find((n) => n.id === edge.source);
        if (!sourceNode) continue;

        if (sourceNode.type === "prompt" && edge.targetHandle === "prompt") {
          prompt = (sourceNode.data.text as string) || "";
        } else if (sourceNode.type === "prompt" && edge.targetHandle === "system-prompt") {
          systemPrompt = (sourceNode.data.text as string) || "";
        } else if (sourceNode.type === "imageInput" && edge.targetHandle?.startsWith("image-")) {
          const images = (sourceNode.data.images as Array<{ url: string; name: string }>) || [];
          imageUrls.push(...images.map((img) => img.url).filter(Boolean));
        }
      }

      if (!prompt) {
        alert("Conecte um no de Prompt ao handle 'Prompt' do Any LLM.");
        return;
      }

      // Mark as running
      setNodes((nds) => nds.map((n) => n.id === llmNode.id ? { ...n, data: { ...n.data, isRunning: true, generatedText: "" } } : n));

      try {
        // Upload images if any
        let publicImageUrls: string[] = [];
        if (imageUrls.length > 0) {
          const currentOrigin = window.location.origin;
          const blobsToUpload: string[] = [];
          for (const url of imageUrls) {
            if (url.startsWith("http://") || url.startsWith("https://")) {
              publicImageUrls.push(url);
            } else if (url.startsWith("blob:")) {
              if (!url.startsWith(`blob:${currentOrigin}/`)) {
                throw new Error("Imagens expiradas. Remova e adicione as imagens novamente.");
              }
              blobsToUpload.push(url);
            }
          }
          if (blobsToUpload.length > 0) {
            const formData = new FormData();
            for (const blobUrl of blobsToUpload) {
              const resp = await fetch(blobUrl);
              const blob = await resp.blob();
              formData.append("files", blob, `image.${blob.type.split("/")[1] || "png"}`);
            }
            const uploadResp = await fetch("/api/upload", { method: "POST", body: formData });
            const uploadText = await uploadResp.text();
            let uploadData;
            try { uploadData = JSON.parse(uploadText); } catch { throw new Error("Erro no upload das imagens"); }
            if (!uploadResp.ok) throw new Error(uploadData.error || "Erro no upload");
            publicImageUrls = [...publicImageUrls, ...uploadData.urls];
          }
        }

        const response = await fetch("/api/generate-llm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            systemPrompt: systemPrompt || undefined,
            model: (llmNode.data.llmModel as string) || "gpt-4o-mini",
            temperature: (llmNode.data.temperature as number) ?? 0.7,
            imageUrls: publicImageUrls.length > 0 ? publicImageUrls : undefined,
            cost: 1,
          }),
        });

        const respText = await response.text();
        let data;
        try { data = JSON.parse(respText); } catch { throw new Error(`Resposta invalida: ${respText.slice(0, 200)}`); }
        if (!response.ok) throw new Error(data.error || "Erro ao gerar texto");

        setNodes((nds) => nds.map((n) => n.id === llmNode.id ? { ...n, data: { ...n.data, isRunning: false, generatedText: data.text } } : n));
        window.dispatchEvent(new Event("fluxo-credits-update"));
      } catch (err) {
        console.error("Erro no LLM:", err);
        alert("Erro: " + (err instanceof Error ? err.message : "Erro desconhecido"));
        setNodes((nds) => nds.map((n) => n.id === llmNode.id ? { ...n, data: { ...n.data, isRunning: false } } : n));
      }
    };
    window.addEventListener("fluxo-run-llm", llmHandler);

    return () => {
      window.removeEventListener("fluxo-run-pipeline", handler);
      window.removeEventListener("fluxo-cancel-pipeline", cancelHandler);
      window.removeEventListener("fluxo-duplicate-node", duplicateHandler);
      window.removeEventListener("fluxo-run-llm", llmHandler);
    };
  }, [executePipeline, cancelPipeline, setNodes]);

  // Atualizar dados de um nó
  const handleUpdateNodeData = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
        )
      );
    },
    [setNodes]
  );

  // Detectar TextIterator conectado a um model node (via PromptConcat ou direto)
  const getIteratorCount = useCallback((modelNodeId: string): number => {
    const currentNodes = nodesRef.current;
    const currentEdges = edgesRef.current;

    // Check direct: TextIterator → Model (prompt handle)
    for (const edge of currentEdges) {
      if (edge.target === modelNodeId && edge.targetHandle === "prompt") {
        const src = currentNodes.find((n) => n.id === edge.source);
        if (src?.type === "textIterator") {
          const items = (src.data.items as string[]) || [];
          return items.filter((t) => (t as string).trim() !== "").length;
        }
      }
    }

    // Check via PromptConcat: TextIterator → PromptConcat → Model
    for (const edge of currentEdges) {
      if (edge.target === modelNodeId && edge.targetHandle === "prompt") {
        const concatNode = currentNodes.find((n) => n.id === edge.source);
        if (concatNode?.type === "promptConcat") {
          // Check inputs to the PromptConcat
          for (const innerEdge of currentEdges) {
            if (innerEdge.target === concatNode.id) {
              const src = currentNodes.find((n) => n.id === innerEdge.source);
              if (src?.type === "textIterator") {
                const items = (src.data.items as string[]) || [];
                return items.filter((t) => (t as string).trim() !== "").length;
              }
            }
          }
        }
      }
    }

    return 0;
  }, []);

  // Expor funções via ref
  useImperativeHandle(ref, () => ({
    saveWorkflow,
    loadWorkflow,
    runPipeline: () => executePipeline(),
    updateNodeData: handleUpdateNodeData,
    getIteratorCount,
  }));

  return (
    <div
      ref={reactFlowWrapper}
      className={`flex-1 h-full relative ${toolMode === "hand" ? "hand-mode" : ""}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onInit={onInit}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onPaneContextMenu={onPaneContextMenu}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        selectionMode={SelectionMode.Partial}
        selectionOnDrag={toolMode === "select"}
        panOnDrag={toolMode === "hand" ? [0, 2] : [2]}
        panOnScroll
        zoomOnScroll={false}
        zoomOnPinch
        zoomActivationKeyCode="Control"
        deleteKeyCode={["Backspace", "Delete"]}
        elementsSelectable
        edgesFocusable
        multiSelectionKeyCode="Shift"
        fitView
        fitViewOptions={{ maxZoom: 1 }}
        minZoom={0.05}
        maxZoom={3}
        proOptions={{ hideAttribution: true }}
        className="bg-zinc-950"
        defaultEdgeOptions={{
          animated: true,
          interactionWidth: 20,
          style: { strokeWidth: 2 },
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#333338"
        />
        <FlowToolbar
          toolMode={toolMode}
          onToolModeChange={setToolMode}
          onUndo={undo}
          onRedo={redo}
          canUndo={undoStack.current.length > 0}
          canRedo={redoStack.current.length > 0}
        />
      </ReactFlow>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          search={contextSearch}
          onSearchChange={setContextSearch}
          onSelect={addNodeFromContext}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Modal: Creditos insuficientes */}
      {showNoCredits && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl">
            <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Creditos insuficientes</h3>
            <p className="text-sm text-zinc-400 mb-6">
              Voce nao tem creditos suficientes para essa geracao. Compre seu primeiro pacote e ganhe <span className="text-purple-400 font-semibold">+50 creditos de bonus</span>!
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowNoCredits(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 transition-colors"
              >
                Fechar
              </button>
              <a
                href="/pricing"
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white text-center transition-colors"
              >
                Comprar Creditos
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// === Context Menu Component ===

interface MenuItem {
  type?: string;
  label: string;
  children?: MenuItem[];
}

// === Flow Toolbar (bottom-center) ===

function FlowToolbar({
  toolMode, onToolModeChange, onUndo, onRedo,
}: {
  toolMode: "select" | "hand";
  onToolModeChange: (mode: "select" | "hand") => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}) {
  const { zoomIn, zoomOut, fitView, zoomTo } = useReactFlow();
  const { zoom } = useViewport();
  const [zoomMenuOpen, setZoomMenuOpen] = useState(false);
  const zoomRef = useRef<HTMLDivElement>(null);

  // Close zoom menu on click outside
  useEffect(() => {
    if (!zoomMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (zoomRef.current && !zoomRef.current.contains(e.target as HTMLElement)) setZoomMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [zoomMenuOpen]);

  const zoomPercent = Math.round(zoom * 100);

  const btnClass = (active?: boolean) =>
    `w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
      active
        ? "bg-yellow-400 text-zinc-900"
        : "text-zinc-400 hover:text-white hover:bg-zinc-800"
    }`;

  return (
    <Panel position="bottom-center">
      <div className="flex items-center gap-0.5 bg-zinc-900 border border-zinc-800 rounded-xl px-1.5 py-1 shadow-lg">
        {/* Select tool */}
        <button
          onClick={() => onToolModeChange("select")}
          className={btnClass(toolMode === "select")}
          title="Select (V)"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 2l14 10.5-5.5 1.5L17 22l-3 1.5-4.5-8L4 18V2z" />
          </svg>
        </button>

        {/* Hand tool */}
        <button
          onClick={() => onToolModeChange("hand")}
          className={btnClass(toolMode === "hand")}
          title="Hand (H)"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.05 4.575a1.575 1.575 0 10-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 013.15 0v1.5m-3.15 0l.075 5.925m3.075-5.925v2.925m0-2.925a1.575 1.575 0 013.15 0V8.25m-3.15-2.175a1.575 1.575 0 013.15 0v4.65m-3.15-4.65V6.15m0 9.6a6 6 0 01-6-6v-1.5m6 7.5v-3.15a6 6 0 00-6-6V6.15m12 4.5a1.575 1.575 0 013.15 0v2.1a6 6 0 01-6 6h-1.5" />
          </svg>
        </button>

        {/* Separator */}
        <div className="w-px h-5 bg-zinc-700 mx-1" />

        {/* Undo */}
        <button onClick={onUndo} className={btnClass()} title="Undo (Ctrl+Z)">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
          </svg>
        </button>

        {/* Redo */}
        <button onClick={onRedo} className={btnClass()} title="Redo (Ctrl+Y)">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
          </svg>
        </button>

        {/* Separator */}
        <div className="w-px h-5 bg-zinc-700 mx-1" />

        {/* Zoom display + dropdown */}
        <div className="relative" ref={zoomRef}>
          <button
            onClick={() => setZoomMenuOpen(!zoomMenuOpen)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors min-w-[52px] justify-center"
          >
            <span className="font-medium">{zoomPercent}%</span>
            <svg className={`w-3 h-3 transition-transform ${zoomMenuOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {zoomMenuOpen && (
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl w-[200px] py-1.5 overflow-hidden">
              <button onClick={() => { zoomIn(); setZoomMenuOpen(false); }} className="w-full text-left px-4 py-[7px] text-[13px] text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors flex items-center justify-between">
                <span>Zoom in</span><span className="text-[11px] text-zinc-600">Ctrl +</span>
              </button>
              <button onClick={() => { zoomOut(); setZoomMenuOpen(false); }} className="w-full text-left px-4 py-[7px] text-[13px] text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors flex items-center justify-between">
                <span>Zoom out</span><span className="text-[11px] text-zinc-600">Ctrl −</span>
              </button>
              <div className="h-px bg-zinc-800 mx-2.5 my-1" />
              <button onClick={() => { zoomTo(1); setZoomMenuOpen(false); }} className="w-full text-left px-4 py-[7px] text-[13px] text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors flex items-center justify-between">
                <span>Zoom to 100%</span><span className="text-[11px] text-zinc-600">Ctrl 0</span>
              </button>
              <button onClick={() => { fitView({ maxZoom: 1 }); setZoomMenuOpen(false); }} className="w-full text-left px-4 py-[7px] text-[13px] text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors flex items-center justify-between">
                <span>Zoom to fit</span><span className="text-[11px] text-zinc-600">Ctrl 1</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

// === Context Menu Component ===

const MENU_STRUCTURE: MenuItem[] = [
  {
    label: "Tools",
    children: [
      { type: "prompt", label: "Prompt" },
      { type: "imageInput", label: "File Input" },
      { type: "videoInput", label: "Video Input" },
      { type: "anyLLM", label: "Any LLM" },
      { type: "router", label: "Router" },
      { type: "promptConcat", label: "Prompt Concatenator" },
      { type: "textIterator", label: "Text Iterator" },
      { type: "lastFrame", label: "Last Frame" },
      { type: "videoConcat", label: "Video Concat" },
    ],
  },
  {
    label: "Image models",
    children: [
      { type: "model", label: "Nano Banana Pro" },
      { type: "model-gpt-image-txt", label: "GPT Image 1.5" },
      { type: "model-gpt-image-img", label: "GPT Image 1.5 Edit" },
    ],
  },
  {
    label: "Video models",
    children: [
      { type: "model-veo3", label: "Veo 3.1 Image to Video" },
      { type: "model-seedance", label: "Seedance 2.0" },
      { type: "model-kling", label: "Kling 3" },
      { type: "model-kling-o3-i2v", label: "Kling O3" },
      { type: "model-kling-o3-edit", label: "Kling O3 Edit Video" },
      { type: "model-kling-o1-ref", label: "Kling O1 Reference" },
      { type: "klingElement", label: "Kling Element" },
    ],
  },
  {
    label: "Video Motion",
    children: [
      { type: "model-kling-motion", label: "Kling Motion Control" },
    ],
  },
];

// Flatten for search
const ALL_ITEMS = MENU_STRUCTURE.flatMap((item) =>
  item.children ? item.children.map((c) => ({ ...c, category: item.label })) : [{ ...item, category: "" }]
);

function ContextMenu({
  x, y, search, onSearchChange, onSelect, onClose,
}: {
  x: number; y: number;
  search: string;
  onSearchChange: (v: string) => void;
  onSelect: (type: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [hoveredSub, setHoveredSub] = useState<string | null>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const q = search.toLowerCase().trim();
  const isSearching = q.length > 0;

  // Search mode: flat list filtered
  const searchResults = isSearching
    ? ALL_ITEMS.filter((item) => item.label.toLowerCase().includes(q))
    : [];

  // Adjust position so menu doesn't overflow outside viewport
  const menuMaxH = 400;
  const wrapperRef = ref;

  useEffect(() => {
    if (!wrapperRef.current) return;
    const el = wrapperRef.current;
    const parent = el.offsetParent as HTMLElement | null;
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();
    const menuBottom = parentRect.top + y + menuMaxH;
    const viewportH = window.innerHeight;
    if (menuBottom > viewportH - 16) {
      const adjusted = Math.max(16, y - (menuBottom - viewportH + 16));
      el.style.top = `${adjusted}px`;
    }
  }, [y]);

  return (
    <div ref={ref} className="absolute z-50" style={{ left: x, top: y }}>
      {/* Main menu */}
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl w-[220px] py-1.5 flex flex-col" style={{ maxHeight: `${menuMaxH}px` }}>
        {/* Search */}
        <div className="px-2.5 pb-1.5 pt-1 shrink-0">
          <div className="flex items-center gap-2 bg-zinc-800/80 border border-zinc-700 rounded-lg px-2.5 py-1.5">
            <svg className="w-3.5 h-3.5 text-zinc-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search"
              className="flex-1 bg-transparent text-[13px] text-zinc-300 placeholder-zinc-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="h-px bg-zinc-800 mx-2.5 my-1 shrink-0" />

        {isSearching ? (
          // Search results
          <div className="overflow-y-auto nowheel">
            {searchResults.length > 0 ? searchResults.map((item) => (
              <button
                key={item.type}
                onClick={() => item.type && onSelect(item.type)}
                className="w-full text-left px-4 py-[7px] text-[13px] text-zinc-300 hover:bg-purple-500/20 hover:text-white transition-colors flex items-center justify-between"
              >
                <span>{item.label}</span>
                {item.category && <span className="text-[10px] text-zinc-600">{item.category}</span>}
              </button>
            )) : (
              <div className="px-4 py-4 text-xs text-zinc-600 text-center">No results</div>
            )}
          </div>
        ) : (
          // Menu with inline expanding categories
          <div className="overflow-y-auto nowheel">
            {MENU_STRUCTURE.map((item, i) => (
              item.children ? (
                <div key={item.label}>
                  {/* Category header */}
                  <button
                    onClick={() => setHoveredSub(hoveredSub === item.label ? null : item.label)}
                    className={`w-full text-left px-4 py-[7px] text-[13px] flex items-center justify-between transition-colors ${
                      hoveredSub === item.label ? "bg-purple-500/20 text-white" : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    <span>{item.label}</span>
                    <svg
                      className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${hoveredSub === item.label ? "rotate-90" : ""}`}
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>

                  {/* Expanded children */}
                  {hoveredSub === item.label && (
                    <div className="bg-zinc-800/30">
                      {item.children.map((child) => (
                        <button
                          key={child.type}
                          onClick={() => child.type && onSelect(child.type)}
                          className="w-full text-left pl-8 pr-4 py-[7px] text-[13px] text-zinc-400 hover:bg-purple-500/20 hover:text-white transition-colors"
                        >
                          {child.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  key={item.type || i}
                  onClick={() => item.type && onSelect(item.type)}
                  className="w-full text-left px-4 py-[7px] text-[13px] text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                >
                  {item.label}
                </button>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default FlowEditor;
