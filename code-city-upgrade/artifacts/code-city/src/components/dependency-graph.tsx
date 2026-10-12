import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  GitFork,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  AlertTriangle,
  Search,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  Filter,
  CheckCircle2,
  Box,
} from 'lucide-react';
import type { DependencyGraph as GraphData, DependencyNode } from '@workspace/api-client-react';

interface DependencyGraphProps {
  graph?: GraphData | null;
  selectedPath?: string;
  onSelectFile: (filePath: string) => void;
}

export function DependencyGraph({
  graph,
  selectedPath,
  onSelectFile,
}: DependencyGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(selectedPath || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [activeCycleIndex, setActiveCycleIndex] = useState<number | null>(null);

  // Sync selectedNodeId with external selectedPath
  useEffect(() => {
    if (selectedPath) {
      setSelectedNodeId(selectedPath);
    }
  }, [selectedPath]);

  const nodes = graph?.nodes ?? [];
  const edges = graph?.edges ?? [];
  const cycles = graph?.cycles ?? [];

  // Filter nodes according to search and language
  const visibleNodes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return nodes.filter((node) => {
      if (languageFilter !== 'all' && node.language && node.language !== languageFilter) {
        return false;
      }
      if (q) {
        const matchId = node.id.toLowerCase().includes(q);
        const matchLabel = node.label.toLowerCase().includes(q);
        if (!matchId && !matchLabel) return false;
      }
      return true;
    });
  }, [nodes, searchQuery, languageFilter]);

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);

  const visibleEdges = useMemo(() => {
    return edges.filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));
  }, [edges, visibleNodeIds]);

  // Compute 2D Positions for nodes
  const nodePositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    const count = visibleNodes.length;
    if (count === 0) return positions;

    const width = 800;
    const height = 500;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.38;

    visibleNodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / count;
      positions[node.id] = {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      };
    });

    return positions;
  }, [visibleNodes]);

  // Canvas drawing loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    // Clear
    ctx.fillStyle = '#101620';
    ctx.fillRect(0, 0, w, h);

    // Apply pan & zoom
    ctx.save();
    ctx.translate(offset.x + w / 2, offset.y + h / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-400, -250); // Center around 800x500 virtual layout

    // Cycle edges set
    const cycleEdgeKeys = new Set<string>();
    if (activeCycleIndex !== null && cycles[activeCycleIndex]) {
      cycles[activeCycleIndex].edges?.forEach(([u, v]) => {
        cycleEdgeKeys.add(`${u}->${v}`);
      });
    }

    // Draw Edges
    visibleEdges.forEach((edge) => {
      const p1 = nodePositions[edge.source];
      const p2 = nodePositions[edge.target];
      if (!p1 || !p2) return;

      const edgeKey = `${edge.source}->${edge.target}`;
      const isCycleEdge = cycleEdgeKeys.has(edgeKey);
      const isConnectedToSelected =
        selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);

      if (isCycleEdge) {
        ctx.strokeStyle = '#ef7776';
        ctx.lineWidth = 2.5;
      } else if (isConnectedToSelected) {
        ctx.strokeStyle = '#54d2df';
        ctx.lineWidth = 2;
      } else {
        ctx.strokeStyle = 'rgba(78, 97, 120, 0.35)';
        ctx.lineWidth = 1;
      }
      ctx.stroke();

      // Draw arrow head
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const targetRadius = 14;
      const arrowX = p2.x - targetRadius * Math.cos(angle);
      const arrowY = p2.y - targetRadius * Math.sin(angle);
      const arrowSize = 6;

      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(
        arrowX - arrowSize * Math.cos(angle - Math.PI / 6),
        arrowY - arrowSize * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        arrowX - arrowSize * Math.cos(angle + Math.PI / 6),
        arrowY - arrowSize * Math.sin(angle + Math.PI / 6)
      );
      ctx.fillStyle = isCycleEdge ? '#ef7776' : isConnectedToSelected ? '#54d2df' : '#4e6178';
      ctx.fill();
    });

    // Draw Nodes
    visibleNodes.forEach((node) => {
      const pos = nodePositions[node.id];
      if (!pos) return;

      const isSelected = selectedNodeId === node.id;
      const isHovered = hoveredNodeId === node.id;
      const isInActiveCycle =
        activeCycleIndex !== null && cycles[activeCycleIndex]?.files.includes(node.id);

      const radius = 12;

      // Outer glow for selected/cycle nodes
      if (isSelected || isInActiveCycle) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius + 4, 0, 2 * Math.PI);
        ctx.fillStyle = isInActiveCycle ? 'rgba(239, 119, 118, 0.3)' : 'rgba(84, 210, 223, 0.3)';
        ctx.fill();
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI);

      if (node.nodeType === 'standard_library') {
        ctx.fillStyle = '#6fce9c';
      } else if (node.nodeType === 'external') {
        ctx.fillStyle = '#a994ff';
      } else if (node.complexity && node.complexity >= 11) {
        ctx.fillStyle = '#ef7776';
      } else if (node.complexity && node.complexity >= 6) {
        ctx.fillStyle = '#efbd62';
      } else {
        ctx.fillStyle = '#54d2df';
      }
      ctx.fill();

      ctx.strokeStyle = isSelected ? '#ffffff' : '#222d3a';
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.stroke();

      // Node text label
      ctx.font = '500 10px "DM Mono", monospace';
      ctx.fillStyle = isSelected ? '#ffffff' : '#c9d5e3';
      ctx.textAlign = 'center';
      const label = node.label.length > 18 ? node.label.slice(0, 16) + '…' : node.label;
      ctx.fillText(label, pos.x, pos.y + radius + 12);
    });

    ctx.restore();
  }, [
    visibleNodes,
    visibleEdges,
    nodePositions,
    zoom,
    offset,
    selectedNodeId,
    hoveredNodeId,
    activeCycleIndex,
    cycles,
  ]);

  // Pointer interaction
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Transform mouse coordinate back to virtual 800x500 layout
    const worldX = (mx - (offset.x + rect.width / 2)) / zoom + 400;
    const worldY = (my - (offset.y + rect.height / 2)) / zoom + 250;

    let found: string | null = null;
    for (const node of visibleNodes) {
      const pos = nodePositions[node.id];
      if (pos) {
        const dx = pos.x - worldX;
        const dy = pos.y - worldY;
        if (Math.sqrt(dx * dx + dy * dy) <= 15) {
          found = node.id;
          break;
        }
      }
    }
    setHoveredNodeId(found);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setIsDragging(false);

    // If drag distance was very small, treat as click
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const worldX = (mx - (offset.x + rect.width / 2)) / zoom + 400;
    const worldY = (my - (offset.y + rect.height / 2)) / zoom + 250;

    for (const node of visibleNodes) {
      const pos = nodePositions[node.id];
      if (pos) {
        const dx = pos.x - worldX;
        const dy = pos.y - worldY;
        if (Math.sqrt(dx * dx + dy * dy) <= 15) {
          setSelectedNodeId(node.id);
          if (node.path) {
            onSelectFile(node.path);
          }
          return;
        }
      }
    }
  };

  const resetView = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setSelectedNodeId(null);
    setActiveCycleIndex(null);
  };

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );

  // Top coupled modules
  const topCoupledNodes = useMemo(() => {
    return [...nodes]
      .filter((n) => n.nodeType === 'file')
      .sort((a, b) => b.incomingCount + b.outgoingCount - (a.incomingCount + a.outgoingCount))
      .slice(0, 5);
  }, [nodes]);

  return (
    <div className="section-card" id="dependency-architecture" aria-label="Multi-language dependency architecture">
      <div className="section-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div className="section-title">Dependency architecture</div>
          <span className="section-meta">CROSS-MODULE TOPOLOGY & GRAPH ANALYSIS</span>
        </div>
        <div className="section-meta">
          {graph?.totalInternalEdges ?? 0} internal edges · {graph?.totalExternalEdges ?? 0} external
        </div>
      </div>

      {/* Circular dependency warning banner if cycles exist */}
      {cycles.length > 0 && (
        <div
          className="notice error"
          role="alert"
          style={{ margin: '14px 14px 0', borderLeftWidth: 4, display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
            <ShieldAlert size={16} />
            <span>Circular Dependencies Detected ({cycles.length} cycle{cycles.length > 1 ? 's' : ''})</span>
          </div>
          <div style={{ fontSize: 11, lineHeight: 1.5 }}>
            Directed cycles were found between modules. These indicate tight coupling and potential maintenance hazards.
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            {cycles.map((c, idx) => (
              <button
                key={c.cycleId}
                type="button"
                className="btn"
                style={{
                  height: 26,
                  padding: '0 9px',
                  fontSize: 10,
                  background: activeCycleIndex === idx ? '#ef7776' : '#301e22',
                  borderColor: '#82444a',
                  color: activeCycleIndex === idx ? '#111720' : '#f0a3a1',
                }}
                onClick={() => {
                  setActiveCycleIndex(activeCycleIndex === idx ? null : idx);
                  if (c.files[0]) onSelectFile(c.files[0]);
                }}
              >
                Inspect Cycle {idx + 1} ({c.size} files)
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter and control bar */}
      <div className="explorer-head">
        <label className="explorer-search">
          <Search size={13} />
          <input
            type="search"
            aria-label="Search dependency nodes"
            placeholder="Search module or package…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </label>
        <div className="actions" style={{ marginLeft: 'auto' }}>
          <button
            type="button"
            className="icon-button"
            title="Zoom in"
            onClick={() => setZoom((z) => Math.min(2.5, z * 1.2))}
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            className="icon-button"
            title="Zoom out"
            onClick={() => setZoom((z) => Math.max(0.4, z / 1.2))}
          >
            <ZoomOut size={14} />
          </button>
          <button
            type="button"
            className="icon-button"
            title="Reset graph view"
            onClick={resetView}
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Main Canvas and Side Inspector */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedNode ? 'minmax(0, 1fr) 330px' : '1fr', minHeight: 460 }}>
        <div style={{ position: 'relative', width: '100%', height: 460, background: '#101620' }}>
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', cursor: isDragging ? 'grabbing' : 'grab' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
          <div className="plot-overlay">
            <span className="plot-chip">INTERACTIVE FORCE TOPOLOGY</span>
            <span className="plot-chip">DRAG TO PAN · ZOOM</span>
          </div>
        </div>

        {/* Selected Node Details or Top Coupled Summary */}
        <div style={{ borderLeft: '1px solid #252e39', background: '#111721', padding: 16, overflowY: 'auto', maxHeight: 460 }}>
          {selectedNode ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span className="eyebrow" style={{ color: '#57cddc' }}>Node details</span>
                <span className="language-pill">{selectedNode.nodeType}</span>
              </div>

              <div style={{ font: '600 13px var(--app-font-display)', color: '#f1f5fa', wordBreak: 'break-all', marginBottom: 4 }}>
                {selectedNode.label}
              </div>

              {selectedNode.path && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#7b8a9c', marginBottom: 12 }}>
                  <span className="mono">{selectedNode.path}</span>
                  <button
                    type="button"
                    className="btn"
                    style={{ height: 20, padding: '0 5px', fontSize: 9, marginLeft: 'auto' }}
                    onClick={() => onSelectFile(selectedNode.path!)}
                  >
                    Locate in City <ExternalLink size={9} />
                  </button>
                </div>
              )}

              <div className="detail-stat-grid" style={{ marginBottom: 14 }}>
                <div className="detail-stat">
                  <div className="detail-stat-label">Fan-In (Dependents)</div>
                  <div className="detail-stat-value" style={{ color: '#66c997' }}>
                    {selectedNode.incomingCount}
                  </div>
                </div>
                <div className="detail-stat">
                  <div className="detail-stat-label">Fan-Out (Dependencies)</div>
                  <div className="detail-stat-value" style={{ color: '#54d2df' }}>
                    {selectedNode.outgoingCount}
                  </div>
                </div>
                <div className="detail-stat">
                  <div className="detail-stat-label">Lines of Code</div>
                  <div className="detail-stat-value">{selectedNode.loc ?? '—'}</div>
                </div>
                <div className="detail-stat">
                  <div className="detail-stat-label">Complexity</div>
                  <div className="detail-stat-value">{selectedNode.complexity?.toFixed(1) ?? '—'}</div>
                </div>
              </div>

              {/* Direct outgoing dependencies list */}
              <div className="detail-block">
                <div className="detail-block-title">Outgoing dependencies</div>
                {edges.filter((e) => e.source === selectedNode.id).length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {edges
                      .filter((e) => e.source === selectedNode.id)
                      .slice(0, 8)
                      .map((e, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="file-row"
                          style={{ height: 28, padding: '0 6px', fontSize: 10 }}
                          onClick={() => {
                            setSelectedNodeId(e.target);
                            const tNode = nodes.find((n) => n.id === e.target);
                            if (tNode?.path) onSelectFile(tNode.path);
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <ArrowRight size={10} color="#54d2df" />
                            {e.target}
                          </span>
                        </button>
                      ))}
                  </div>
                ) : (
                  <div className="subtle" style={{ fontSize: 10 }}>No outgoing dependencies.</div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="eyebrow" style={{ marginBottom: 10, color: '#57cddc' }}>Top coupled modules</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {topCoupledNodes.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className="file-row"
                    style={{ height: 38, padding: '0 8px' }}
                    onClick={() => {
                      setSelectedNodeId(n.id);
                      if (n.path) onSelectFile(n.path);
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', overflow: 'hidden' }}>
                      <span style={{ color: '#e0e7ef', fontWeight: 600, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {n.label}
                      </span>
                      <span style={{ color: '#778696', fontSize: 9 }}>
                        {n.incomingCount} in · {n.outgoingCount} out
                      </span>
                    </div>
                    <span className="mono" style={{ color: '#e9bd68', fontSize: 11, marginLeft: 'auto' }}>
                      deg {n.incomingCount + n.outgoingCount}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
