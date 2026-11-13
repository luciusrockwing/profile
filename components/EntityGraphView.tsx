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
  Building,
  Users,
  AtSign,
  Tag,
  ArrowRight,
  X,
  Play,
  Pause,
  Route,
  Network,
  Pin,
  PinOff,
  Maximize2,
  Download,
  Plus,
  AlertCircle,
  Crosshair,
} from 'lucide-react';
import {
  OsintTarget,
  GraphNode,
  GraphLink,
  RelationshipType,
  TargetRelationship,
  TargetStatus,
} from '@/lib/osint-types';
import {
  buildEntityGraph,
  findShortestGraphPath,
  getEgoSubgraph,
  analyzeGraphTopology,
  formatPlatformUrl,
  PLATFORM_REGISTRY,
} from '@/lib/osint-engine';
import { AstryxButton } from './astryx/Button';
import { AstryxBadge } from './astryx/Badge';
import { AstryxInput } from './astryx/Input';
import { AstryxSelect } from './astryx/Select';
import { AstryxDrawer } from './astryx/Drawer';
import { AstryxAvatar } from './astryx/Avatar';

interface EntityGraphViewProps {
  targets: OsintTarget[];
  onSelectTarget: (target: OsintTarget) => void;
  onAddNewTarget: () => void;
  onUpdateTarget?: (target: OsintTarget) => Promise<void>;
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

const RELATIONSHIP_OPTIONS: Array<{ value: RelationshipType; label: string }> = [
  { value: 'collaborator', label: 'Collaborator' },
  { value: 'member_of', label: 'Member Of' },
  { value: 'operates', label: 'Operates' },
  { value: 'aliases_as', label: 'Aliases As' },
  { value: 'parent_company_of', label: 'Parent Company Of' },
  { value: 'shared_infrastructure', label: 'Shared Infrastructure' },
  { value: 'reported_associate', label: 'Reported Associate' },
];

const STATUS_FILTERS: Array<{ value: 'all' | TargetStatus; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'surveillance', label: 'Surveillance' },
  { value: 'flagged', label: 'Flagged' },
];

export function EntityGraphView({
  targets,
  onSelectTarget,
  onAddNewTarget,
  onUpdateTarget,
}: EntityGraphViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Filter toggles
  const [includeCompanies, setIncludeCompanies] = useState(true);
  const [includeGroups, setIncludeGroups] = useState(true);
  const [includeHandles, setIncludeHandles] = useState(true);
  const [includeTags, setIncludeTags] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | TargetStatus>('all');
  const [isSimulating, setIsSimulating] = useState(true);

  // Search, Selection & Ego Isolation
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [egoDepth, setEgoDepth] = useState<'full' | 1 | 2>('full');

  // Topology Bridge Radar Panel
  const [showTopologyPanel, setShowTopologyPanel] = useState(false);

  // Shortest-Path Pathfinder
  const [pathSourceId, setPathSourceId] = useState<string | null>(null);
  const [pathTargetId, setPathTargetId] = useState<string | null>(null);
  const [isPickingPathTarget, setIsPickingPathTarget] = useState(false);

  // Pinned Nodes (kept in state for UI + ref for 60fps canvas loop)
  const [pinnedNodeIds, setPinnedNodeIds] = useState<string[]>([]);
  const pinnedNodeIdsRef = useRef<Set<string>>(new Set());

  // Inline Relationship Link Form
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkTargetId, setLinkTargetId] = useState('');
  const [linkType, setLinkType] = useState<RelationshipType>('collaborator');
  const [linkNote, setLinkNote] = useState('');
  const [isSavingLink, setIsSavingLink] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

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

  // Status-filtered targets
  const filteredTargets = useMemo(() => {
    if (statusFilter === 'all') return targets;
    return targets.filter((t) => t.status === statusFilter);
  }, [targets, statusFilter]);

  // Base graph from filtered targets
  const baseGraph = useMemo(() => {
    return buildEntityGraph(filteredTargets, {
      includeCompanies,
      includeGroups,
      includeHandles,
      includeTags,
    });
  }, [filteredTargets, includeCompanies, includeGroups, includeHandles, includeTags]);

  // Displayed graph (applies 1-hop or 2-hop ego isolation when active)
  const rawGraph = useMemo(() => {
    if (!selectedNodeId || egoDepth === 'full') return baseGraph;
    const ego = getEgoSubgraph(baseGraph, selectedNodeId, egoDepth);
    return ego.nodes.length > 0 ? ego : baseGraph;
  }, [baseGraph, selectedNodeId, egoDepth]);

  // Graph topology analysis (clusters, isolated nodes, bridge entities)
  const topology = useMemo(() => analyzeGraphTopology(baseGraph), [baseGraph]);

  // Shortest-path calculation
  const activePath = useMemo(() => {
    if (!pathSourceId || !pathTargetId) return null;
    return findShortestGraphPath(rawGraph, pathSourceId, pathTargetId);
  }, [rawGraph, pathSourceId, pathTargetId]);

  const pathHighlightData = useMemo(() => {
    if (!activePath) return null;
    const nodeIds = new Set(activePath.nodeIds);
    const edgeKeys = new Set<string>();
    for (const l of activePath.links) {
      edgeKeys.add(`${l.source}-->${l.target}::${l.label}`);
      edgeKeys.add(`${l.target}-->${l.source}::${l.label}`);
    }
    const segments: Array<{ fromId: string; toId: string }> = [];
    for (let i = 0; i < activePath.nodeIds.length - 1; i++) {
      segments.push({ fromId: activePath.nodeIds[i], toId: activePath.nodeIds[i + 1] });
    }
    return { nodeIds, edgeKeys, segments };
  }, [activePath]);

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
      let color = '#38bdf8';
      let radius = 22;

      if (n.type === 'target') {
        radius = 26;
        if (n.status === 'active') color = '#10b981';
        else if (n.status === 'surveillance') color = '#f59e0b';
        else if (n.status === 'flagged') color = '#ef4444';
        else color = '#06b6d4';
      } else if (n.type === 'company') {
        color = '#f59e0b';
        radius = 20;
      } else if (n.type === 'group') {
        color = '#a855f7';
        radius = 20;
      } else if (n.type === 'email') {
        color = '#10b981';
        radius = 16;
      } else if (n.type === 'handle') {
        color = '#06b6d4';
        radius = 16;
      } else if (n.type === 'tag') {
        color = '#94a3b8';
        radius = 14;
      }

      if (n.avatarUrl && !imageCacheRef.current.has(n.avatarUrl)) {
        const img = new Image();
        img.referrerPolicy = 'no-referrer';
        img.src = n.avatarUrl;
        imageCacheRef.current.set(n.avatarUrl, img);
      }

      const angle = (idx / Math.max(1, rawGraph.nodes.length)) * Math.PI * 2;
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

  // Center view on mount or reset using actual rendered canvas dimensions
  const resetViewport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width || canvas.width || 1000;
    const h = rect.height || canvas.height || 700;
    if (rect.width > 0 && rect.height > 0) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
    const scale = 0.95;
    transformRef.current = {
      x: w / 2 - 500 * scale,
      y: h / 2 - 350 * scale,
      scale,
    };
    setZoomLevel(scale);
  }, []);

  // Fit all visible nodes into canvas viewport
  const fitGraphToViewport = useCallback(() => {
    const canvas = canvasRef.current;
    const { nodes } = simStateRef.current;
    if (!canvas || nodes.length === 0) {
      resetViewport();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const w = rect.width || canvas.width || 1000;
    const h = rect.height || canvas.height || 700;
    if (rect.width > 0 && rect.height > 0) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const n of nodes) {
      minX = Math.min(minX, n.x - n.radius - 40);
      maxX = Math.max(maxX, n.x + n.radius + 40);
      minY = Math.min(minY, n.y - n.radius - 40);
      maxY = Math.max(maxY, n.y + n.radius + 40);
    }

    const boxW = Math.max(120, maxX - minX);
    const boxH = Math.max(120, maxY - minY);
    const padding = 80;
    const scaleX = (w - padding * 2) / boxW;
    const scaleY = (h - padding * 2) / boxH;
    const newScale = Math.max(0.3, Math.min(1.6, Math.min(scaleX, scaleY)));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    transformRef.current = {
      x: w / 2 - centerX * newScale,
      y: h / 2 - centerY * newScale,
      scale: newScale,
    };
    setZoomLevel(newScale);
  }, [resetViewport]);

  useEffect(() => {
    resetViewport();
  }, [resetViewport]);

  // Pin / Unpin helpers
  const togglePinNode = useCallback((nodeId: string) => {
    setPinnedNodeIds((prev) => {
      const next = prev.includes(nodeId)
        ? prev.filter((id) => id !== nodeId)
        : [...prev, nodeId];
      pinnedNodeIdsRef.current = new Set(next);
      return next;
    });
  }, []);

  const unpinAllNodes = useCallback(() => {
    pinnedNodeIdsRef.current = new Set();
    setPinnedNodeIds([]);
  }, []);

  // Select node helper (handles path destination picking mode)
  const selectOrPickNode = useCallback(
    (nodeId: string) => {
      if (isPickingPathTarget && pathSourceId) {
        setPathTargetId(nodeId);
        setIsPickingPathTarget(false);
      }
      setSelectedNodeId(nodeId);
      setShowLinkForm(false);
      setLinkError(null);
    },
    [isPickingPathTarget, pathSourceId]
  );

  // Focus camera on specific node (e.g. from search or topology radar)
  const focusOnNode = useCallback(
    (nodeId: string) => {
      const node = simStateRef.current.nodeMap.get(nodeId);
      const canvas = canvasRef.current;
      selectOrPickNode(nodeId);
      if (!node || !canvas) return;

      transformRef.current = {
        x: canvas.width / 2 - node.x * 1.2,
        y: canvas.height / 2 - node.y * 1.2,
        scale: 1.2,
      };
      setZoomLevel(1.2);
    },
    [selectOrPickNode]
  );

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

  // Refs for animation loop so state changes don't tear down requestAnimationFrame
  const isSimulatingRef = useRef(isSimulating);
  const selectedNodeIdRef = useRef(selectedNodeId);
  const connectedNodeIdsRef = useRef(connectedNodeIds);
  const pathHighlightRef = useRef(pathHighlightData);
  const isPickingPathTargetRef = useRef(isPickingPathTarget);
  const pathSourceIdRef = useRef(pathSourceId);

  useEffect(() => {
    isSimulatingRef.current = isSimulating;
  }, [isSimulating]);

  useEffect(() => {
    selectedNodeIdRef.current = selectedNodeId;
  }, [selectedNodeId]);

  useEffect(() => {
    connectedNodeIdsRef.current = connectedNodeIds;
  }, [connectedNodeIds]);

  useEffect(() => {
    pathHighlightRef.current = pathHighlightData;
  }, [pathHighlightData]);

  useEffect(() => {
    isPickingPathTargetRef.current = isPickingPathTarget;
  }, [isPickingPathTarget]);

  useEffect(() => {
    pathSourceIdRef.current = pathSourceId;
  }, [pathSourceId]);

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

  // Available targets to link inline
  const availableTargetsToLink = useMemo(() => {
    if (!selectedTarget) return [];
    return targets.filter((t) => t.id !== selectedTarget.id);
  }, [targets, selectedTarget]);

  // Connected relationships for drawer
  const connectedLinks = useMemo(() => {
    if (!selectedNodeId) return [];
    return rawGraph.links.filter(
      (l) => l.source === selectedNodeId || l.target === selectedNodeId
    );
  }, [selectedNodeId, rawGraph.links]);

  // Node lookup map for path step labels
  const nodeLookup = useMemo(() => {
    const map = new Map<string, GraphNode>();
    for (const n of rawGraph.nodes) {
      map.set(n.id, n);
    }
    return map;
  }, [rawGraph.nodes]);

  // Animation Loop (Force simulation + Render)
  useEffect(() => {
    let animFrame: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && (canvas.width !== rect.width || canvas.height !== rect.height)) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };
    updateSize();

    const loop = () => {
      updateSize();
      const { nodes, links, nodeMap } = simStateRef.current;
      const { x: tx, y: ty, scale } = transformRef.current;
      const activeSelectedId = selectedNodeIdRef.current;
      const activeConnectedIds = connectedNodeIdsRef.current;
      const activePathData = pathHighlightRef.current;
      const pinnedSet = pinnedNodeIdsRef.current;

      // 1. Force Simulation Step
      if (isSimulatingRef.current) {
        const k = 0.035;
        const rep = 1600;
        const damping = 0.86;
        const centerGravity = 0.0015;
        const centerX = 500;
        const centerY = 350;

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

          n1.vx += (centerX - n1.x) * centerGravity;
          n1.vy += (centerY - n1.y) * centerGravity;
        }

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

        for (const n of nodes) {
          if (dragRef.current.draggedNode?.id === n.id || pinnedSet.has(n.id)) {
            n.vx = 0;
            n.vy = 0;
            continue;
          }
          n.vx *= damping;
          n.vy *= damping;
          n.x += n.vx;
          n.y += n.vy;
        }
      }

      // 2. Render Canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(tx, ty);
      ctx.scale(scale, scale);

      // Subtle background grid
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1 / scale;
      const gridSize = 40;
      const startX = Math.floor(-tx / scale / gridSize) * gridSize;
      const endX = startX + canvas.width / scale + gridSize;
      const startY = Math.floor(-ty / scale / gridSize) * gridSize;
      const endY = startY + canvas.height / scale + gridSize;

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

        const edgeKey = `${link.source}-->${link.target}::${link.label}`;
        const isPathLink = activePathData ? activePathData.edgeKeys.has(edgeKey) : false;
        const isHighlighted = activePathData
          ? isPathLink
          : !!(activeConnectedIds && activeConnectedIds.has(s.id) && activeConnectedIds.has(t.id));
        const isDimmed = activePathData
          ? !isPathLink
          : !!(activeConnectedIds && !isHighlighted);

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);

        if (isPathLink) {
          ctx.strokeStyle = '#22d3ee';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 10;
        } else if (isHighlighted) {
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

        if (scale > 0.75 && (isHighlighted || isPathLink || (!activeConnectedIds && !activePathData))) {
          const midX = (s.x + t.x) / 2;
          const midY = (s.y + t.y) / 2;
          ctx.font = isPathLink ? 'bold 9px monospace' : '9px monospace';
          ctx.fillStyle = isPathLink ? '#a5f3fc' : isHighlighted ? '#7dd3fc' : '#64748b';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(link.label, midX, midY - 6);
        }
      }

      // Render animated directional pulse dots along active shortest path
      if (activePathData && activePathData.segments.length > 0) {
        const tPulse = (performance.now() * 0.00085) % 1;
        for (const seg of activePathData.segments) {
          const fromNode = nodeMap.get(seg.fromId);
          const toNode = nodeMap.get(seg.toId);
          if (!fromNode || !toNode) continue;
          const px = fromNode.x + (toNode.x - fromNode.x) * tPulse;
          const py = fromNode.y + (toNode.y - fromNode.y) * tPulse;
          ctx.beginPath();
          ctx.arc(px, py, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = '#a5f3fc';
          ctx.shadowColor = '#22d3ee';
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // Render Nodes
      for (const n of nodes) {
        const isSelected = activeSelectedId === n.id;
        const isPathNode = activePathData ? activePathData.nodeIds.has(n.id) : false;
        const isConnected = activePathData
          ? isPathNode
          : !!(activeConnectedIds && activeConnectedIds.has(n.id));
        const isDimmed = activePathData
          ? !isPathNode
          : !!(activeConnectedIds && !isConnected);
        const isPinned = pinnedSet.has(n.id);

        ctx.save();
        ctx.translate(n.x, n.y);

        const r = n.radius;
        ctx.globalAlpha = isDimmed ? 0.2 : 1.0;

        // Selection / path / connection outer aura ring
        if (isSelected || isConnected || isPathNode) {
          ctx.beginPath();
          ctx.arc(0, 0, r + 6, 0, Math.PI * 2);
          ctx.strokeStyle = isPathNode ? '#22d3ee' : isSelected ? '#38bdf8' : '#0ea5e9';
          ctx.lineWidth = isSelected || isPathNode ? 2.5 : 1.5;
          if (!isPathNode) {
            ctx.setLineDash([4, 3]);
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Main node circle
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = '#0a0f1d';
        ctx.fill();
        ctx.strokeStyle = isPathNode ? '#22d3ee' : n.color;
        ctx.lineWidth = isSelected || isPathNode ? 3 : 2;
        ctx.stroke();

        // Target avatar thumbnail
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
              // fallback if image draw fails
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
          else if (n.type === 'company') symbol = 'CO';
          else if (n.type === 'group') symbol = 'GR';
          else if (n.type === 'email') symbol = 'EM';
          else if (n.type === 'handle') symbol = '@';
          else symbol = '#';
          ctx.fillText(symbol, 0, 0);
        }

        // Pinned node diamond badge at top-right of node ring
        if (isPinned) {
          const px = r * 0.72;
          const py = -r * 0.72;
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(Math.PI / 4);
          ctx.fillStyle = '#06b6d4';
          ctx.strokeStyle = '#070b14';
          ctx.lineWidth = 1.5;
          ctx.fillRect(-4, -4, 8, 8);
          ctx.strokeRect(-4, -4, 8, 8);
          ctx.restore();
        }

        // Node label underneath
        ctx.font = `${isSelected || isPathNode ? 'bold 12px' : '10px'} monospace`;
        ctx.fillStyle =
          isSelected || isPathNode
            ? '#ffffff'
            : isConnected
            ? '#e2e8f0'
            : isDimmed
            ? '#475569'
            : '#cbd5e1';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const displayLabel =
          !isSelected && !isPathNode && n.label.length > 20 ? `${n.label.slice(0, 18)}…` : n.label;
        ctx.fillText(displayLabel, 0, r + 5);

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
  }, []);

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

  const didDragRef = useRef(false);

  const findNodeAtCoords = (x: number, y: number): SimNode | null => {
    const { nodes } = simStateRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const dx = x - n.x;
      const dy = y - n.y;
      if (dx * dx + dy * dy <= (n.radius + 5) * (n.radius + 5)) {
        return n;
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    didDragRef.current = false;
    const clickedNode = findNodeAtCoords(coords.x, coords.y);

    if (clickedNode) {
      dragRef.current = {
        isDraggingCanvas: false,
        draggedNode: clickedNode,
        startX: coords.x,
        startY: coords.y,
      };
      if (isPickingPathTargetRef.current && pathSourceIdRef.current) {
        setPathTargetId(clickedNode.id);
        setIsPickingPathTarget(false);
      }
      setSelectedNodeId(clickedNode.id);
      setShowLinkForm(false);
      setLinkError(null);
    } else {
      dragRef.current = {
        isDraggingCanvas: true,
        draggedNode: null,
        startX: coords.rawX,
        startY: coords.rawY,
      };
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    const clickedNode = findNodeAtCoords(coords.x, coords.y);
    if (clickedNode) {
      togglePinNode(clickedNode.id);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragRef.current.draggedNode) {
      didDragRef.current = true;
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
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        didDragRef.current = true;
      }
      transformRef.current.x += dx;
      transformRef.current.y += dy;
      dragRef.current.startX = rawX;
      dragRef.current.startY = rawY;
    }
  };

  const handleMouseUp = useCallback(() => {
    if (dragRef.current.isDraggingCanvas && !didDragRef.current && !isPickingPathTargetRef.current) {
      setSelectedNodeId(null);
      setEgoDepth('full');
      setShowLinkForm(false);
      setLinkError(null);
    }
    dragRef.current = {
      isDraggingCanvas: false,
      draggedNode: null,
      startX: 0,
      startY: 0,
    };
  }, []);

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    const canvas = canvasRef.current;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!canvas) return;
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
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

    if (canvas) {
      canvas.addEventListener('wheel', onWheel, { passive: false });
    }
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      if (canvas) {
        canvas.removeEventListener('wheel', onWheel);
      }
    };
  }, [handleMouseUp]);

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

  // Client-side PNG Snapshot Export (zero server storage)
  const handleExportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) return;

    exportCtx.fillStyle = '#070b14';
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    exportCtx.drawImage(canvas, 0, 0);

    const dataUrl = exportCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `specter-entity-graph-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  };

  // Inline Relationship Link Handler
  const handleAddInlineRelationship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTarget || !onUpdateTarget) return;
    const destination = availableTargetsToLink.find((t) => t.id === linkTargetId);
    if (!destination) {
      setLinkError('Select a destination target to connect.');
      return;
    }

    const alreadyExists = selectedTarget.relationships.some(
      (r) => r.targetId === destination.id && r.relationshipType === linkType
    );
    if (alreadyExists) {
      setLinkError(`Relationship "${linkType.replace(/_/g, ' ')}" to ${destination.alias} already exists.`);
      return;
    }

    setIsSavingLink(true);
    setLinkError(null);

    const newRel: TargetRelationship = {
      id: `rel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      targetId: destination.id,
      targetName: destination.alias,
      relationshipType: linkType,
      notes: linkNote.trim() || undefined,
    };

    try {
      await onUpdateTarget({
        ...selectedTarget,
        relationships: [...selectedTarget.relationships, newRel],
        updatedAt: new Date().toISOString(),
      });
      setShowLinkForm(false);
      setLinkNote('');
      setLinkTargetId('');
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Failed to save relationship link.');
    } finally {
      setIsSavingLink(false);
    }
  };

  const clearPathfinder = () => {
    setPathSourceId(null);
    setPathTargetId(null);
    setIsPickingPathTarget(false);
  };

  const isSelectedPinned = selectedNodeId ? pinnedNodeIds.includes(selectedNodeId) : false;

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] bg-[#070b14] overflow-hidden select-none flex flex-col">
      {/* Top Overlay Controls Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2.5 pointer-events-none">
        {/* Search Input + Status Filter */}
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
          <div className="w-64 sm:w-72">
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
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : undefined
              }
            />
          </div>

          {/* Target Status Filter */}
          <div className="hidden lg:flex items-center space-x-1 bg-[#070b14]/90 backdrop-blur-md border border-[#121d33] rounded-lg p-1 text-xs font-mono">
            {STATUS_FILTERS.map((sf) => (
              <button
                key={sf.value}
                type="button"
                onClick={() => setStatusFilter(sf.value)}
                className={`px-2 py-1 rounded transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === sf.value
                    ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {sf.label}
              </button>
            ))}
          </div>
        </div>

        {/* Layer Toggles, Topology Radar & Physics Controls */}
        <div className="flex items-center flex-wrap gap-1.5 pointer-events-auto bg-[#070b14]/90 backdrop-blur-md border border-[#121d33] rounded-lg p-1.5 shadow-lg text-xs font-mono">
          <span className="text-[11px] text-slate-500 px-1 hidden xl:inline whitespace-nowrap">
            <Filter className="w-3 h-3 inline mr-1 text-cyan-400" />
            LAYERS:
          </span>

          <button
            type="button"
            onClick={() => setIncludeCompanies(!includeCompanies)}
            className={`px-2 py-1 rounded text-xs font-mono transition-colors flex items-center space-x-1 border whitespace-nowrap shrink-0 ${
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
            className={`px-2 py-1 rounded text-xs font-mono transition-colors flex items-center space-x-1 border whitespace-nowrap shrink-0 ${
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
            className={`px-2 py-1 rounded text-xs font-mono transition-colors flex items-center space-x-1 border whitespace-nowrap shrink-0 ${
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
            className={`px-2 py-1 rounded text-xs font-mono transition-colors flex items-center space-x-1 border whitespace-nowrap shrink-0 ${
              includeTags
                ? 'bg-[#16233b] text-slate-200 border-cyan-500/40'
                : 'bg-[#090e18] text-slate-500 border-[#121d33]'
            }`}
            title="Toggle Tag Nodes"
          >
            <Tag className="w-3 h-3" />
            <span className="hidden md:inline">Tags</span>
          </button>

          <div className="h-4 w-px bg-[#16233b] mx-0.5" />

          {/* Bridge & Cluster Radar Button */}
          <button
            type="button"
            onClick={() => setShowTopologyPanel(!showTopologyPanel)}
            className={`px-2 py-1 rounded text-xs font-mono transition-colors flex items-center space-x-1.5 border whitespace-nowrap shrink-0 tabular-nums ${
              showTopologyPanel
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/50'
                : 'bg-[#090e18] text-slate-300 hover:text-cyan-300 border-[#121d33]'
            }`}
            title="Inspect Shared Bridges & Clusters"
          >
            <Network className="w-3 h-3" />
            <span>Bridges ({topology.bridgeNodes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSimulating(!isSimulating)}
            className="p-1.5 rounded text-slate-400 hover:text-cyan-400 hover:bg-[#121d33] transition-colors shrink-0"
            title={isSimulating ? 'Pause physics layout' : 'Resume physics layout'}
            aria-label={isSimulating ? 'Pause physics layout' : 'Resume physics layout'}
          >
            {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Pathfinder Mode Banner */}
      {(isPickingPathTarget || (pathSourceId && pathTargetId)) && (
        <div className="absolute top-18 left-1/2 -translate-x-1/2 z-20 pointer-events-auto bg-[#0a0e18]/95 backdrop-blur-md border border-cyan-500/50 rounded-lg px-3 py-2 shadow-xl flex items-center space-x-3 text-xs font-mono max-w-[92vw]">
          <Route className="w-4 h-4 text-cyan-400 shrink-0" />
          {isPickingPathTarget ? (
            <span className="text-slate-200 truncate">
              Pathfinder: Select destination node on canvas or via search (from{' '}
              <span className="text-cyan-300 font-bold">
                {nodeLookup.get(pathSourceId || '')?.label || 'Entity'}
              </span>
              )
            </span>
          ) : activePath ? (
            <span className="text-slate-200 truncate tabular-nums">
              Shortest Path:{' '}
              <span className="text-cyan-300 font-bold">
                {nodeLookup.get(pathSourceId || '')?.label}
              </span>{' '}
              →{' '}
              <span className="text-cyan-300 font-bold">
                {nodeLookup.get(pathTargetId || '')?.label}
              </span>{' '}
              · {activePath.hopCount} {activePath.hopCount === 1 ? 'hop' : 'hops'}
            </span>
          ) : (
            <span className="text-amber-300 truncate">
              No connection path found under active filters
            </span>
          )}
          <button
            type="button"
            onClick={clearPathfinder}
            className="text-slate-400 hover:text-slate-100 p-0.5 rounded hover:bg-[#121d33] shrink-0"
            aria-label="Clear pathfinder"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search match results dropdown */}
      {searchQuery.trim() && (
        <div className="absolute top-16 left-4 z-30 bg-[#070b14] border border-[#16233b] rounded-lg p-2 shadow-2xl max-w-sm w-full max-h-60 overflow-y-auto">
          {baseGraph.nodes
            .filter((n) => n.label.toLowerCase().includes(searchQuery.toLowerCase()))
            .slice(0, 8)
            .map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  if (egoDepth !== 'full') setEgoDepth('full');
                  focusOnNode(n.id);
                  setSearchQuery('');
                }}
                className="flex items-center justify-between p-2 rounded hover:bg-[#0e1626] cursor-pointer font-mono text-xs"
              >
                <div className="flex items-center space-x-2 truncate">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
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
          {baseGraph.nodes.filter((n) =>
            n.label.toLowerCase().includes(searchQuery.toLowerCase())
          ).length === 0 && (
            <p className="text-xs font-mono text-slate-500 p-2">No matching entity found</p>
          )}
        </div>
      )}

      {/* Bridge & Cluster Topology Radar Panel */}
      {showTopologyPanel && (
        <div className="absolute top-16 right-4 z-25 w-80 bg-[#0a0e18]/95 backdrop-blur-md border border-[#121d33] rounded-xl p-3.5 shadow-2xl font-mono">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#121d33]">
            <div>
              <h3 className="text-xs font-bold text-slate-100">Topology Radar</h3>
              <p className="text-[11px] text-slate-400 tabular-nums">
                {topology.clusterCount} {topology.clusterCount === 1 ? 'cluster' : 'clusters'} ·{' '}
                {topology.bridgeNodes.length} bridges · {topology.isolatedNodeIds.length} isolated
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowTopologyPanel(false)}
              className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-[#121d33]"
              aria-label="Close topology panel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {topology.bridgeNodes.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">
              No shared bridge entities detected under current filters.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
              {topology.bridgeNodes.map((bridge) => (
                <button
                  key={bridge.nodeId}
                  type="button"
                  onClick={() => {
                    if (egoDepth !== 'full') setEgoDepth('full');
                    setShowTopologyPanel(false);
                    focusOnNode(bridge.nodeId);
                  }}
                  className="w-full text-left p-2 rounded-md bg-[#070b14] hover:bg-[#0e1626] border border-[#121d33] flex items-center justify-between gap-2 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-slate-100 font-medium truncate">{bridge.label}</p>
                    <p className="text-[10px] text-slate-400 tabular-nums">
                      {bridge.type.toUpperCase()} · {bridge.connectedTargetCount} targets ·{' '}
                      {bridge.degree} links
                    </p>
                  </div>
                  <Crosshair className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Graph Canvas */}
      <div className="flex-1 w-full h-full cursor-grab active:cursor-grabbing relative">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="w-full h-full block"
        />

        {/* Empty State Overlay */}
        {rawGraph.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="pointer-events-auto bg-[#0a0e18]/95 border border-[#121d33] rounded-xl p-6 max-w-sm text-center font-mono space-y-3">
              <p className="text-sm text-slate-200 font-bold">No matching graph entities</p>
              <p className="text-xs text-slate-400">
                Adjust status or layer filters to display recorded targets and infrastructure.
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <AstryxButton
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatusFilter('all');
                    setIncludeCompanies(true);
                    setIncludeGroups(true);
                    setIncludeHandles(true);
                  }}
                >
                  Reset Filters
                </AstryxButton>
                <AstryxButton variant="primary" size="sm" onClick={onAddNewTarget}>
                  Add Target
                </AstryxButton>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Zoom, Fit, Pin & Snapshot Controls */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center space-x-1 bg-[#070b14]/90 backdrop-blur-md border border-[#121d33] rounded-lg p-1.5 shadow-lg text-xs font-mono">
        <button
          type="button"
          onClick={() => handleZoom(1.2)}
          className="p-1.5 rounded hover:bg-[#121d33] text-slate-300 hover:text-cyan-400 transition-colors"
          title="Zoom In"
          aria-label="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => handleZoom(0.8)}
          className="p-1.5 rounded hover:bg-[#121d33] text-slate-300 hover:text-cyan-400 transition-colors"
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={fitGraphToViewport}
          className="p-1.5 rounded hover:bg-[#121d33] text-slate-300 hover:text-cyan-400 transition-colors"
          title="Fit All Nodes"
          aria-label="Fit All Nodes"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={resetViewport}
          className="p-1.5 rounded hover:bg-[#121d33] text-slate-300 hover:text-cyan-400 transition-colors"
          title="Reset View"
          aria-label="Reset View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <span className="text-[10px] text-slate-400 px-1.5 font-mono tabular-nums">
          {Math.round(zoomLevel * 100)}%
        </span>

        <div className="h-4 w-px bg-[#16233b] mx-0.5" />

        <button
          type="button"
          onClick={handleExportPng}
          className="px-2 py-1 rounded hover:bg-[#121d33] text-slate-300 hover:text-cyan-400 transition-colors flex items-center space-x-1 whitespace-nowrap"
          title="Download PNG Snapshot"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">PNG</span>
        </button>

        {pinnedNodeIds.length > 0 && (
          <button
            type="button"
            onClick={unpinAllNodes}
            className="px-2 py-1 rounded hover:bg-[#121d33] text-cyan-300 transition-colors flex items-center space-x-1 whitespace-nowrap tabular-nums"
            title="Release all pinned nodes"
          >
            <PinOff className="w-3.5 h-3.5" />
            <span>Unpin ({pinnedNodeIds.length})</span>
          </button>
        )}
      </div>

      {/* Astryx Cyber Legend */}
      <div className="absolute bottom-4 right-4 z-20 hidden md:flex items-center space-x-3 bg-[#070b14]/90 backdrop-blur-md border border-[#121d33] rounded-lg px-3 py-1.5 text-[11px] font-mono text-slate-400 tabular-nums">
        <span className="text-slate-500">
          {rawGraph.nodes.length} nodes · {rawGraph.links.length} links
        </span>
        <span className="text-slate-600">|</span>
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
        onClose={() => {
          setSelectedNodeId(null);
          setEgoDepth('full');
          setShowLinkForm(false);
          setLinkError(null);
        }}
        title={selectedNode?.label || 'Entity Inspector'}
        subtitle={
          selectedNode
            ? `${selectedNode.type.toUpperCase()} NODE · ${
                topology.nodeDegrees[selectedNode.id] ?? connectedLinks.length
              } links`
            : undefined
        }
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
            {/* Quick Graph Tools: Pin, Pathfinder, Neighborhood Isolation */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <AstryxButton
                  variant={isSelectedPinned ? 'secondary' : 'outline'}
                  size="sm"
                  icon={isSelectedPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                  onClick={() => togglePinNode(selectedNode.id)}
                >
                  {isSelectedPinned ? 'Unpin Node' : 'Pin Position'}
                </AstryxButton>
                <AstryxButton
                  variant={isPickingPathTarget ? 'secondary' : 'outline'}
                  size="sm"
                  icon={<Route className="w-3.5 h-3.5" />}
                  onClick={() => {
                    setPathSourceId(selectedNode.id);
                    setPathTargetId(null);
                    setIsPickingPathTarget(true);
                  }}
                >
                  Find Path To...
                </AstryxButton>
              </div>

              {/* Neighborhood Isolation Segmented Control */}
              <div className="flex items-center justify-between bg-[#070b14] border border-[#121d33] rounded-md p-1 text-[11px] font-mono">
                <span className="text-slate-400 px-2">Scope</span>
                <div className="flex items-center space-x-1">
                  {(['full', 1, 2] as const).map((mode) => (
                    <button
                      key={String(mode)}
                      type="button"
                      onClick={() => setEgoDepth(mode)}
                      className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${
                        egoDepth === mode
                          ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40'
                          : 'text-slate-400 hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      {mode === 'full' ? 'Full' : `${mode}-Hop`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Active Shortest Path Steps */}
            {pathSourceId && pathTargetId && (
              <div className="bg-[#070b14] border border-cyan-500/40 rounded-lg p-2.5 space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-cyan-300 font-bold tabular-nums">
                    {activePath
                      ? `Path (${activePath.hopCount} ${activePath.hopCount === 1 ? 'hop' : 'hops'})`
                      : 'No Path Found'}
                  </span>
                  <button
                    type="button"
                    onClick={clearPathfinder}
                    className="text-[11px] text-slate-400 hover:text-slate-200"
                  >
                    Clear
                  </button>
                </div>
                {activePath ? (
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {activePath.nodeIds.map((nid, idx) => {
                      const stepNode = nodeLookup.get(nid);
                      const edge = activePath.links[idx];
                      return (
                        <div key={`${nid}-${idx}`} className="space-y-0.5">
                          <button
                            type="button"
                            onClick={() => focusOnNode(nid)}
                            className="w-full text-left px-2 py-1 rounded bg-[#0a0f1d] hover:bg-[#11192b] text-slate-200 truncate"
                          >
                            {idx + 1}. {stepNode?.label || nid}
                          </button>
                          {edge && (
                            <p className="text-[10px] text-cyan-400/80 pl-3">
                              ↓ {edge.label}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    No connecting chain exists under the current layer or status filters.
                  </p>
                )}
              </div>
            )}

            {/* If Target Node: Show Astryx Avatar, Details & Inline Link Creator */}
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

                {/* Inline Link Target Action */}
                {onUpdateTarget && availableTargetsToLink.length > 0 && (
                  <div className="bg-[#070b14] border border-[#121d33] rounded-lg p-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                        Target Relationships
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowLinkForm(!showLinkForm);
                          setLinkError(null);
                          if (!linkTargetId && availableTargetsToLink[0]) {
                            setLinkTargetId(availableTargetsToLink[0].id);
                          }
                        }}
                        className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{showLinkForm ? 'Close' : 'Link Target'}</span>
                      </button>
                    </div>

                    {showLinkForm && (
                      <form onSubmit={handleAddInlineRelationship} className="space-y-2 pt-1">
                        <AstryxSelect
                          label="Connect To"
                          value={linkTargetId || availableTargetsToLink[0]?.id || ''}
                          onChange={(e) => setLinkTargetId(e.target.value)}
                          options={availableTargetsToLink.map((t) => ({
                            value: t.id,
                            label: t.alias,
                          }))}
                        />
                        <AstryxSelect
                          label="Relationship Type"
                          value={linkType}
                          onChange={(e) => setLinkType(e.target.value as RelationshipType)}
                          options={RELATIONSHIP_OPTIONS}
                        />
                        <AstryxInput
                          label="Note (Optional)"
                          value={linkNote}
                          onChange={(e) => setLinkNote(e.target.value)}
                          placeholder="Shared infrastructure or sighting..."
                        />
                        {linkError && (
                          <p className="text-[11px] font-mono text-rose-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            <span>{linkError}</span>
                          </p>
                        )}
                        <AstryxButton
                          type="submit"
                          variant="primary"
                          size="sm"
                          loading={isSavingLink}
                          className="w-full"
                        >
                          Save Relationship Link
                        </AstryxButton>
                      </form>
                    )}
                  </div>
                )}

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
                            {platformMeta?.name || h.platform}:{' '}
                            <span className="text-slate-200">{h.value}</span>
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
              <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5 tabular-nums">
                Connected Links ({connectedLinks.length})
              </h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {connectedLinks.map((l, idx) => {
                  const otherNodeId = l.source === selectedNode.id ? l.target : l.source;
                  const otherNode = rawGraph.nodes.find((n) => n.id === otherNodeId);
                  return (
                    <div
                      key={idx}
                      onClick={() => otherNode && selectOrPickNode(otherNode.id)}
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
