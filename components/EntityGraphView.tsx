'use client';

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  Filter,
  Eye,
  ExternalLink,
  Shield,
  Building,
  Users,
  AtSign,
  Mail,
  Tag,
  ArrowRight,
  X,
  Play,
  Pause,
} from 'lucide-react';
import { OsintTarget, GraphNode, GraphLink, GraphData } from '@/lib/osint-types';
import { buildEntityGraph, formatPlatformUrl, PLATFORM_REGISTRY } from '@/lib/osint-engine';
import { AstryxButton } from './astryx/Button';
import { AstryxBadge } from './astryx/Badge';
import { AstryxInput } from './astryx/Input';
import { AstryxDrawer } from './astryx/Drawer';
import { AstryxAvatar } from './astryx/Avatar';

interface EntityGraphViewProps {
  targets: OsintTarget[];
  onSelectTarget: (target: OsintTarget) => void;
  onAddNewTarget: () => void;
}

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

interface SimLink extends GraphLink {
  sourceNode?: SimNode;
  targetNode?: SimNode;
}

export function EntityGraphView({
  targets,
  onSelectTarget,
  onAddNewTarget,
}: EntityGraphViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Filter toggles
  const [includeCompanies, setIncludeCompanies] = useState(true);
  const [includeGroups, setIncludeGroups] = useState(true);
  const [includeHandles, setIncludeHandles] = useState(true);
  const [includeTags, setIncludeTags] = useState(false);
  const [isSimulating, setIsSimulating] = useState(true);

  // Search & Selection
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Viewport transform
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const [zoomLevel, setZoomLevel] = useState(1);

  // Dragging state
  const dragRef = useRef<{
    isDraggingCanvas: boolean;
    draggedNode: SimNode | null;
    startX: number;
    startY: number;
  }>({
    isDraggingCanvas: false,
    draggedNode: null,
    startX: 0,
    startY: 0,
  });

  // Extract raw graph data
  const rawGraph = useMemo(() => {
    return buildEntityGraph(targets, {
      includeCompanies,
      includeGroups,
      includeHandles,
      includeTags,
    });
  }, [targets, includeCompanies, includeGroups, includeHandles, includeTags]);

  // Persistent sim nodes across renders to prevent layout jumping
  const simStateRef = useRef<{
    nodes: SimNode[];
    links: SimLink[];
    nodeMap: Map<string, SimNode>;
  }>({
    nodes: [],
    links: [],
    nodeMap: new Map(),
  });

  // Image cache for avatar thumbnails on canvas
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Initialize or update simulation nodes
  useEffect(() => {
    const existingMap = simStateRef.current.nodeMap;
    const newNodes: SimNode[] = [];
    const newMap = new Map<string, SimNode>();

    const width = 1000;
    const height = 700;

    rawGraph.nodes.forEach((n, idx) => {
      const existing = existingMap.get(n.id);
      let color = '#38bdf8'; // target default cyan
      let radius = 22;

      if (n.type === 'target') {
        radius = 26;
        if (n.status === 'active') color = '#10b981'; // emerald
        else if (n.status === 'surveillance') color = '#f59e0b'; // amber
        else if (n.status === 'flagged') color = '#ef4444'; // red
        else color = '#06b6d4'; // cyan
      } else if (n.type === 'company') {
        color = '#f59e0b'; // amber
        radius = 20;
      } else if (n.type === 'group') {
        color = '#a855f7'; // purple
        radius = 20;
      } else if (n.type === 'email') {
        color = '#10b981'; // emerald
        radius = 16;
      } else if (n.type === 'handle') {
        color = '#06b6d4'; // cyan
        radius = 16;
      } else if (n.type === 'tag') {
        color = '#94a3b8'; // slate
        radius = 14;
      }

      // Preload image if target has avatar URL
      if (n.avatarUrl && !imageCacheRef.current.has(n.avatarUrl)) {
        const img = new Image();
        img.referrerPolicy = 'no-referrer';
        img.crossOrigin = 'anonymous';
        img.src = n.avatarUrl;
        imageCacheRef.current.set(n.avatarUrl, img);
      }

      // Initial placement in orbit if new
      const angle = (idx / rawGraph.nodes.length) * Math.PI * 2;
      const dist = 160 + (idx % 3) * 80;

      const node: SimNode = {
        ...n,
        x: existing ? existing.x : width / 2 + Math.cos(angle) * dist,
        y: existing ? existing.y : height / 2 + Math.sin(angle) * dist,
        vx: existing ? existing.vx * 0.5 : (Math.random() - 0.5) * 2,
        vy: existing ? existing.vy * 0.5 : (Math.random() - 0.5) * 2,
        radius,
        color,
      };

      newNodes.push(node);
      newMap.set(n.id, node);
    });

    const newLinks: SimLink[] = rawGraph.links.map((l) => ({
      ...l,
      sourceNode: newMap.get(l.source),
      targetNode: newMap.get(l.target),
    }));

    simStateRef.current = {
      nodes: newNodes,
      links: newLinks,
      nodeMap: newMap,
    };
  }, [rawGraph]);

  // Center view on mount or reset
  const resetViewport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    transformRef.current = {
      x: canvas.width / 2 - 500,
      y: canvas.height / 2 - 350,
      scale: 0.95,
    };
    setZoomLevel(0.95);
  }, []);

  useEffect(() => {
    resetViewport();
  }, [resetViewport]);

  // Focus on specific node (e.g. from search)
  const focusOnNode = (nodeId: string) => {
    const node = simStateRef.current.nodeMap.get(nodeId);
    const canvas = canvasRef.current;
    if (!node || !canvas) return;

    setSelectedNodeId(nodeId);
    transformRef.current = {
      x: canvas.width / 2 - node.x * 1.2,
      y: canvas.height / 2 - node.y * 1.2,
      scale: 1.2,
    };
    setZoomLevel(1.2);
  };

  // Connected nodes set for highlight
  const connectedNodeIds = useMemo(() => {
    if (!selectedNodeId) return null;
    const set = new Set<string>([selectedNodeId]);
    for (const link of rawGraph.links) {
      if (link.source === selectedNodeId) set.add(link.target);
      if (link.target === selectedNodeId) set.add(link.source);
    }
    return set;
  }, [selectedNodeId, rawGraph.links]);

  // Selected node object
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return rawGraph.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [selectedNodeId, rawGraph.nodes]);

  // Selected target object (if node is a target)
  const selectedTarget = useMemo(() => {
    if (!selectedNode?.targetId) return null;
    return targets.find((t) => t.id === selectedNode.targetId) || null;
  }, [selectedNode, targets]);

  // Connected relationships for drawer
  const connectedLinks = useMemo(() => {
    if (!selectedNodeId) return [];
    return rawGraph.links.filter(
      (l) => l.source === selectedNodeId || l.target === selectedNodeId
    );
  }, [selectedNodeId, rawGraph.links]);

  // Animation Loop (Force simulation + Render)
  useEffect(() => {
    let animFrame: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas to match display size
    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };
    updateSize();

    const loop = () => {
      updateSize();
      const { nodes, links } = simStateRef.current;
      const { x: tx, y: ty, scale } = transformRef.current;

      // 1. Force Simulation Step
      if (isSimulating) {
        const k = 0.035; // Spring stiffness
        const rep = 1600; // Repulsion constant
        const damping = 0.86;
        const centerGravity = 0.0015;
        const centerX = 500;
        const centerY = 350;

        // Repulsion between all pairs
        for (let i = 0; i < nodes.length; i++) {
          const n1 = nodes[i];
          for (let j = i + 1; j < nodes.length; j++) {
            const n2 = nodes[j];
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const distSq = dx * dx + dy * dy || 1;
            const dist = Math.sqrt(distSq);

            if (dist < 420) {
              const force = rep / distSq;
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;
              n1.vx -= fx;
              n1.vy -= fy;
              n2.vx += fx;
              n2.vy += fy;
            }
          }

          // Center gravity
          n1.vx += (centerX - n1.x) * centerGravity;
          n1.vy += (centerY - n1.y) * centerGravity;
        }

        // Spring attraction along edges
        for (const link of links) {
          const s = link.sourceNode;
          const t = link.targetNode;
          if (!s || !t) continue;

          const dx = t.x - s.x;
          const dy = t.y - s.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const desiredDist = 160;
          const force = (dist - desiredDist) * k;

          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          s.vx += fx;
          s.vy += fy;
          t.vx -= fx;
          t.vy -= fy;
        }

        // Update positions with damping
        for (const n of nodes) {
          if (dragRef.current.draggedNode?.id === n.id) continue;
          n.vx *= damping;
          n.vy *= damping;
          n.x += n.vx;
          n.y += n.vy;
        }
      }

      // 2. Render Canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Save transform
      ctx.save();
      ctx.translate(tx, ty);
      ctx.scale(scale, scale);

      // Render subtle background grid
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1 / scale;
      const gridSize = 40;
      const startX = Math.floor(-tx / scale / gridSize) * gridSize;
      const endX = startX + (canvas.width / scale) + gridSize;
      const startY = Math.floor(-ty / scale / gridSize) * gridSize;
      const endY = startY + (canvas.height / scale) + gridSize;

      ctx.beginPath();
      for (let x = startX; x <= endX; x += gridSize) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
      }
      for (let y = startY; y <= endY; y += gridSize) {
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
      }
      ctx.stroke();

      // Render Links
      for (const link of links) {
        const s = link.sourceNode;
        const t = link.targetNode;
        if (!s || !t) continue;

        const isHighlighted =
          connectedNodeIds && (connectedNodeIds.has(s.id) && connectedNodeIds.has(t.id));
        const isDimmed = connectedNodeIds && !isHighlighted;

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);

        if (isHighlighted) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 8;
        } else if (isDimmed) {
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1;
          ctx.shadowBlur = 0;
        } else {
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1.2;
          ctx.shadowBlur = 0;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Link label in center if scale > 0.8
        if (scale > 0.75 && (isHighlighted || !connectedNodeIds)) {
          const midX = (s.x + t.x) / 2;
          const midY = (s.y + t.y) / 2;
          ctx.font = '9px monospace';
          ctx.fillStyle = isHighlighted ? '#7dd3fc' : '#64748b';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(link.label, midX, midY - 6);
        }
      }

      // Render Nodes
      for (const n of nodes) {
        const isSelected = selectedNodeId === n.id;
        const isConnected = connectedNodeIds && connectedNodeIds.has(n.id);
        const isDimmed = connectedNodeIds && !isConnected;

        ctx.save();
        ctx.translate(n.x, n.y);

        const r = n.radius;
        const alpha = isDimmed ? 0.25 : 1.0;
        ctx.globalAlpha = alpha;

        // Selection / connection outer aura ring
        if (isSelected || isConnected) {
          ctx.beginPath();
          ctx.arc(0, 0, r + 6, 0, Math.PI * 2);
          ctx.strokeStyle = isSelected ? '#38bdf8' : '#0ea5e9';
          ctx.lineWidth = isSelected ? 2.5 : 1.5;
          ctx.setLineDash([4, 3]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Main node circle
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = '#0a0f1d';
        ctx.fill();
        ctx.strokeStyle = n.color;
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.stroke();

        // Target with Avatar image thumbnail if cached
        let avatarRendered = false;
        if (n.type === 'target' && n.avatarUrl) {
          const img = imageCacheRef.current.get(n.avatarUrl);
          if (img && img.complete && img.naturalWidth > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(0, 0, r - 3, 0, Math.PI * 2);
            ctx.clip();
            try {
              ctx.drawImage(img, -r + 3, -r + 3, (r - 3) * 2, (r - 3) * 2);
              avatarRendered = true;
            } catch {
              // fallback if cross-origin tainted
            }
            ctx.restore();
          }
        }

        // Fallback Icon/Text inside node
        if (!avatarRendered) {
          ctx.fillStyle = n.color;
          ctx.font = `bold ${r > 20 ? 11 : 9}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          let symbol = '';
          if (n.type === 'target') symbol = n.label.slice(0, 2).toUpperCase();
          else if (n.type === 'company') symbol = '🏢';
          else if (n.type === 'group') symbol = '⚡';
          else if (n.type === 'email') symbol = '✉';
          else if (n.type === 'handle') symbol = '@';
          else symbol = '#';
          ctx.fillText(symbol, 0, 0);
        }

        // Node label underneath
        ctx.font = `${isSelected ? 'bold 12px' : '10px'} monospace`;
        ctx.fillStyle = isSelected ? '#ffffff' : isConnected ? '#e2e8f0' : isDimmed ? '#475569' : '#cbd5e1';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const displayLabel = !isSelected && n.label.length > 20 ? `${n.label.slice(0, 18)}…` : n.label;
        ctx.fillText(displayLabel, 0, r + 5);

        // Subtext type label
        if (n.type !== 'target') {
          ctx.font = '8px monospace';
          ctx.fillStyle = '#64748b';
          ctx.fillText(n.type.toUpperCase(), 0, r + 18);
        }

        ctx.restore();
      }

      ctx.restore();

      animFrame = requestAnimationFrame(loop);
    };

    animFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrame);
  }, [isSimulating, connectedNodeIds, selectedNodeId]);

  // Mouse / Pointer Event Handlers for Dragging & Zooming
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, rawX: 0, rawY: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const { x: tx, y: ty, scale } = transformRef.current;
    return {
      x: (clientX - tx) / scale,
      y: (clientY - ty) / scale,
      rawX: clientX,
      rawY: clientY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    const { nodes } = simStateRef.current;

    // Check if clicked on a node
    let clickedNode: SimNode | null = null;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const dx = coords.x - n.x;
      const dy = coords.y - n.y;
      if (dx * dx + dy * dy <= (n.radius + 5) * (n.radius + 5)) {
        clickedNode = n;
        break;
      }
    }

    if (clickedNode) {
      dragRef.current = {
        isDraggingCanvas: false,
        draggedNode: clickedNode,
        startX: coords.x,
        startY: coords.y,
      };
      setSelectedNodeId(clickedNode.id);
    } else {
      dragRef.current = {
        isDraggingCanvas: true,
        draggedNode: null,
        startX: coords.rawX,
        startY: coords.rawY,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragRef.current.draggedNode) {
      const coords = getCanvasCoords(e);
      dragRef.current.draggedNode.x = coords.x;
      dragRef.current.draggedNode.y = coords.y;
      dragRef.current.draggedNode.vx = 0;
      dragRef.current.draggedNode.vy = 0;
    } else if (dragRef.current.isDraggingCanvas) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;
      const dx = rawX - dragRef.current.startX;
      const dy = rawY - dragRef.current.startY;
      transformRef.current.x += dx;
      transformRef.current.y += dy;
      dragRef.current.startX = rawX;
      dragRef.current.startY = rawY;
    }
  };

  const handleMouseUp = () => {
    dragRef.current = {
      isDraggingCanvas: false,
      draggedNode: null,
      startX: 0,
      startY: 0,
    };
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const { x, y, scale } = transformRef.current;
    const newScale = Math.max(0.3, Math.min(3, scale * zoomFactor));

    transformRef.current = {
      x: mouseX - (mouseX - x) * (newScale / scale),
      y: mouseY - (mouseY - y) * (newScale / scale),
      scale: newScale,
    };
    setZoomLevel(newScale);
  };

  const handleZoom = (factor: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y, scale } = transformRef.current;
    const newScale = Math.max(0.3, Math.min(3, scale * factor));
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    transformRef.current = {
      x: centerX - (centerX - x) * (newScale / scale),
      y: centerY - (centerY - y) * (newScale / scale),
      scale: newScale,
    };
    setZoomLevel(newScale);
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] bg-[#070b14] overflow-hidden select-none flex flex-col">
      {/* Top Overlay Controls Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Astryx Search & Quick Selector */}
        <div className="pointer-events-auto max-w-sm w-full">
          <AstryxInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search entities, targets, handles..."
            leftIcon={<Search className="w-4 h-4 text-slate-500" />}
            actionSlot={
              searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : undefined
            }
          />
        </div>

        {/* Astryx Filter Toggles */}
        <div className="flex items-center space-x-1.5 pointer-events-auto bg-[#070b14]/90 backdrop-blur-md border border-[#121d33] rounded-lg p-1.5 shadow-lg text-xs font-mono">
          <span className="text-[11px] text-slate-500 px-1 hidden sm:inline">
            <Filter className="w-3 h-3 inline mr-1 text-cyan-400" />
            FILTER:
          </span>

          <button
            type="button"
            onClick={() => setIncludeCompanies(!includeCompanies)}
            className={`px-2 py-1 rounded text-xs font-mono transition-colors flex items-center space-x-1 border ${
              includeCompanies
                ? 'bg-amber-950/60 text-amber-300 border-amber-500/50'
                : 'bg-[#090e18] text-slate-500 border-[#121d33]'
            }`}
            title="Toggle Company Nodes"
          >
            <Building className="w-3 h-3" />
            <span className="hidden md:inline">Companies</span>
          </button>

          <button
            type="button"
            onClick={() => setIncludeGroups(!includeGroups)}
            className={`px-2 py-1 rounded text-xs font-mono transition-colors flex items-center space-x-1 border ${
              includeGroups
                ? 'bg-purple-950/60 text-purple-300 border-purple-500/50'
                : 'bg-[#090e18] text-slate-500 border-[#121d33]'
            }`}
            title="Toggle Group & Syndicate Nodes"
          >
            <Users className="w-3 h-3" />
            <span className="hidden md:inline">Groups</span>
          </button>

          <button
            type="button"
            onClick={() => setIncludeHandles(!includeHandles)}
            className={`px-2 py-1 rounded text-xs font-mono transition-colors flex items-center space-x-1 border ${
              includeHandles
                ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500/50'
                : 'bg-[#090e18] text-slate-500 border-[#121d33]'
            }`}
            title="Toggle Handles & Accounts"
          >
            <AtSign className="w-3 h-3" />
            <span className="hidden md:inline">Handles</span>
          </button>

          <button
            type="button"
            onClick={() => setIncludeTags(!includeTags)}
            className={`px-2 py-1 rounded text-xs font-mono transition-colors flex items-center space-x-1 border ${
              includeTags
                ? 'bg-[#16233b] text-slate-200 border-cyan-500/40'
                : 'bg-[#090e18] text-slate-500 border-[#121d33]'
            }`}
            title="Toggle Tag Nodes"
          >
            <Tag className="w-3 h-3" />
            <span className="hidden md:inline">Tags</span>
          </button>

          <div className="h-4 w-px bg-[#16233b] mx-1" />

          <button
            type="button"
            onClick={() => setIsSimulating(!isSimulating)}
            className="p-1 rounded text-slate-400 hover:text-cyan-400 hover:bg-[#121d33] transition-colors"
            title={isSimulating ? 'Pause physics layout' : 'Resume physics layout'}
          >
            {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Search match results dropdown */}
      {searchQuery.trim() && (
        <div className="absolute top-16 left-4 z-30 bg-[#070b14] border border-[#16233b] rounded-lg p-2 shadow-2xl max-w-sm w-full max-h-60 overflow-y-auto">
          {rawGraph.nodes
            .filter((n) => n.label.toLowerCase().includes(searchQuery.toLowerCase()))
            .slice(0, 8)
            .map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  focusOnNode(n.id);
                  setSearchQuery('');
                }}
                className="flex items-center justify-between p-2 rounded hover:bg-[#0e1626] cursor-pointer font-mono text-xs"
              >
                <div className="flex items-center space-x-2 truncate">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor:
                        n.type === 'target'
                          ? '#10b981'
                          : n.type === 'company'
                          ? '#f59e0b'
                          : n.type === 'group'
                          ? '#a855f7'
                          : '#06b6d4',
                    }}
                  />
                  <span className="text-slate-200 truncate">{n.label}</span>
                </div>
                <span className="text-[10px] text-slate-500 uppercase">{n.type}</span>
              </div>
            ))}
          {rawGraph.nodes.filter((n) =>
            n.label.toLowerCase().includes(searchQuery.toLowerCase())
          ).length === 0 && (
            <p className="text-xs font-mono text-slate-500 p-2">No matching entity found</p>
          )}
        </div>
      )}

      {/* Main Graph Canvas */}
      <div className="flex-1 w-full h-full cursor-grab active:cursor-grabbing">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          className="w-full h-full block"
        />
      </div>

      {/* Bottom Zoom & View Controls */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center space-x-1.5 bg-[#070b14]/90 backdrop-blur-md border border-[#121d33] rounded-lg p-1.5 shadow-lg text-xs font-mono">
        <button
          type="button"
          onClick={() => handleZoom(1.2)}
          className="p-1.5 rounded hover:bg-[#121d33] text-slate-300 hover:text-cyan-400 transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => handleZoom(0.8)}
          className="p-1.5 rounded hover:bg-[#121d33] text-slate-300 hover:text-cyan-400 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={resetViewport}
          className="p-1.5 rounded hover:bg-[#121d33] text-slate-300 hover:text-cyan-400 transition-colors"
          title="Reset View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <span className="text-[10px] text-slate-400 px-1.5 font-mono tabular-nums">
          {Math.round(zoomLevel * 100)}%
        </span>
      </div>

      {/* Astryx Cyber Legend */}
      <div className="absolute bottom-4 right-4 z-20 hidden md:flex items-center space-x-3 bg-[#070b14]/90 backdrop-blur-md border border-[#121d33] rounded-lg px-3 py-1.5 text-[11px] font-mono text-slate-400">
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Target</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span>Company</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-400" />
          <span>Group</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span>Slot/Handle</span>
        </div>
      </div>

      {/* Astryx Side Inspector Drawer */}
      <AstryxDrawer
        isOpen={!!selectedNode}
        onClose={() => setSelectedNodeId(null)}
        title={selectedNode?.label || 'Entity Inspector'}
        subtitle={selectedNode ? `${selectedNode.type.toUpperCase()} NODE • ${selectedNode.details || 'Linked entity'}` : undefined}
        footer={
          selectedTarget ? (
            <AstryxButton
              variant="primary"
              className="w-full"
              icon={<Eye className="w-4 h-4" />}
              onClick={() => onSelectTarget(selectedTarget)}
            >
              Open Classified Dossier
            </AstryxButton>
          ) : (
            <AstryxButton
              variant="secondary"
              className="w-full"
              onClick={onAddNewTarget}
            >
              + Connect New Target To Entity
            </AstryxButton>
          )
        }
      >
        {selectedNode && (
          <div className="space-y-4">
            {/* If Target Node: Show Astryx Avatar and Details */}
            {selectedTarget && (
              <div className="space-y-3">
                <div className="flex items-center space-x-3 bg-[#070b14] p-3 rounded-lg border border-[#121d33]">
                  <AstryxAvatar
                    src={selectedTarget.avatarUrl}
                    alt={selectedTarget.alias}
                    category={selectedTarget.category}
                    status={selectedTarget.status}
                    size="lg"
                  />
                  <div className="min-w-0 font-mono text-xs">
                    <p className="text-slate-100 font-bold truncate">
                      {selectedTarget.realName || '[Real Name Unknown]'}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <AstryxBadge variant="hairline" color="emerald" dot>
                        {selectedTarget.status.toUpperCase()}
                      </AstryxBadge>
                      <AstryxBadge variant="subtle" color="amber">
                        {selectedTarget.priority.toUpperCase()}
                      </AstryxBadge>
                    </div>
                  </div>
                </div>

                {/* Handles preview */}
                <div>
                  <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                    Identified Slots ({selectedTarget.handles.length})
                  </h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {selectedTarget.handles.map((h) => {
                      const url = formatPlatformUrl(h.platform, h.value);
                      const platformMeta = PLATFORM_REGISTRY[h.platform];
                      return (
                        <div
                          key={h.id}
                          className="flex items-center justify-between p-2 rounded bg-[#070b14] border border-[#121d33] text-xs font-mono"
                        >
                          <span className="text-cyan-400 truncate">
                            {platformMeta?.name || h.platform}: <span className="text-slate-200">{h.value}</span>
                          </span>
                          {url && (
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="text-slate-500 hover:text-cyan-300 ml-2"
                              title="Direct link"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Connected Links in Graph */}
            <div>
              <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                Connected Links ({connectedLinks.length})
              </h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {connectedLinks.map((l, idx) => {
                  const otherNodeId = l.source === selectedNode.id ? l.target : l.source;
                  const otherNode = rawGraph.nodes.find((n) => n.id === otherNodeId);
                  return (
                    <div
                      key={idx}
                      onClick={() => otherNode && setSelectedNodeId(otherNode.id)}
                      className="p-2 rounded bg-[#070b14] hover:bg-[#0e1626] border border-[#121d33] text-xs font-mono cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div className="truncate pr-2">
                        <span className="text-slate-500 text-[10px] block uppercase">
                          {l.label}
                        </span>
                        <span className="text-slate-200 truncate block font-medium">
                          {otherNode?.label || 'Entity'}
                        </span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-cyan-400/70 shrink-0" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </AstryxDrawer>
    </div>
  );
}
