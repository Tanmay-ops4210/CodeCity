import React, { useMemo, useState } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Braces,
  Code2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Info,
} from 'lucide-react';
import type { FunctionMetric } from '@workspace/api-client-react';

interface FunctionAnalysisProps {
  functions: FunctionMetric[];
  selectedPath?: string;
  onSelectFile: (filePath: string) => void;
}

export function FunctionAnalysis({
  functions,
  selectedPath,
  onSelectFile,
}: FunctionAnalysisProps) {
  const [query, setQuery] = useState('');
  const [complexityFilter, setComplexityFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [sortField, setSortField] = useState<'complexity' | 'loc' | 'nestingDepth' | 'parametersCount' | 'name'>('complexity');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedFnKey, setSelectedFnKey] = useState<string | null>(null);

  const filteredFunctions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return functions
      .filter((fn) => {
        if (complexityFilter !== 'all' && fn.complexityLevel !== complexityFilter) {
          return false;
        }
        if (q) {
          const matchName = fn.name.toLowerCase().includes(q);
          const matchQualified = fn.qualifiedName?.toLowerCase().includes(q);
          const matchFile = fn.filePath?.toLowerCase().includes(q);
          if (!matchName && !matchQualified && !matchFile) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortField === 'complexity') diff = b.complexity - a.complexity;
        else if (sortField === 'loc') diff = (b.loc ?? 0) - (a.loc ?? 0);
        else if (sortField === 'nestingDepth') diff = (b.nestingDepth ?? 0) - (a.nestingDepth ?? 0);
        else if (sortField === 'parametersCount') diff = (b.parametersCount ?? 0) - (a.parametersCount ?? 0);
        else diff = a.name.localeCompare(b.name);

        return sortAsc ? -diff : diff;
      });
  }, [functions, query, complexityFilter, sortField, sortAsc]);

  const activeFn = useMemo(() => {
    if (selectedFnKey) {
      const match = functions.find((f) => `${f.filePath}:${f.name}:${f.lineStart}` === selectedFnKey);
      if (match) return match;
    }
    // Default to the first function belonging to selectedPath, if any
    if (selectedPath) {
      const pathMatch = functions.find((f) => f.filePath === selectedPath);
      if (pathMatch) return pathMatch;
    }
    return filteredFunctions[0] ?? null;
  }, [functions, selectedFnKey, selectedPath, filteredFunctions]);

  const handleRowClick = (fn: FunctionMetric) => {
    setSelectedFnKey(`${fn.filePath}:${fn.name}:${fn.lineStart}`);
    if (fn.filePath) {
      onSelectFile(fn.filePath);
    }
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="section-card" id="function-analysis" aria-label="Function-level complexity analysis">
      <div className="section-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div className="section-title">Function analysis</div>
          <span className="section-meta">CODE-LEVEL COMPLEXITY INTELLIGENCE</span>
        </div>
        <div className="section-meta">
          {filteredFunctions.length} / {functions.length} functions
        </div>
      </div>

      <div className="explorer-head">
        <label className="explorer-search">
          <Search size={13} />
          <input
            type="search"
            aria-label="Filter functions"
            placeholder="Search function name, method, or path…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          className="filter-select"
          aria-label="Filter by complexity"
          value={complexityFilter}
          onChange={(e) => setComplexityFilter(e.target.value as any)}
        >
          <option value="all">All complexity levels</option>
          <option value="low">Low (CC 1–5)</option>
          <option value="medium">Medium (CC 6–10)</option>
          <option value="high">High (CC 11+)</option>
        </select>
        <select
          className="filter-select"
          aria-label="Sort by metric"
          value={sortField}
          onChange={(e) => {
            setSortField(e.target.value as any);
            setSortAsc(false);
          }}
        >
          <option value="complexity">Sort: Cyclomatic Complexity</option>
          <option value="loc">Sort: Lines of Code (LOC)</option>
          <option value="nestingDepth">Sort: Max Nesting Depth</option>
          <option value="parametersCount">Sort: Parameter Count</option>
          <option value="name">Sort: Function Name</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: activeFn ? 'minmax(0, 1fr) 340px' : '1fr', minHeight: 380 }}>
        {/* Function Table */}
        <div className="file-list scrollbar" style={{ maxHeight: 460 }}>
          {filteredFunctions.length === 0 ? (
            <div style={{ padding: 36, textAlign: 'center', color: '#7e8b9b', fontSize: 12 }}>
              No functions match the criteria. Adjust search or filters.
            </div>
          ) : (
            filteredFunctions.map((fn) => {
              const key = `${fn.filePath}:${fn.name}:${fn.lineStart}`;
              const isSelected = activeFn && `${activeFn.filePath}:${activeFn.name}:${activeFn.lineStart}` === key;
              return (
                <button
                  key={key}
                  type="button"
                  className={`file-row ${isSelected ? 'selected' : ''}`}
                  style={{ gridTemplateColumns: 'minmax(140px, 1fr) 60px 50px 50px 60px', padding: '0 12px' }}
                  onClick={() => handleRowClick(fn)}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', textAlign: 'left' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#e0e7ef', fontWeight: 600 }}>
                      <Code2 size={12} color="#60c5d2" />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {fn.name}
                      </span>
                      {fn.isAsync && <span className="language-pill">async</span>}
                      {fn.isNested && <span className="language-pill" style={{ color: '#a994ff' }}>nested</span>}
                    </span>
                    <span style={{ fontSize: 10, color: '#748395', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {fn.filePath}:{fn.lineStart}
                    </span>
                  </div>

                  <span className="file-num">{fn.loc ?? '—'} LOC</span>
                  <span className="file-num">d:{fn.nestingDepth ?? 0}</span>
                  <span className="file-num">{fn.parametersCount ?? 0} args</span>
                  <span className={`level ${fn.complexityLevel ?? 'low'}`} style={{ justifyContent: 'flex-end' }}>
                    CC {fn.complexity}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Function Details Sidebar */}
        {activeFn && (
          <div style={{ borderLeft: '1px solid #252e39', background: '#111721', padding: 16, overflowY: 'auto', maxHeight: 460 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span className="eyebrow" style={{ color: '#57cddc' }}>Function details</span>
              <span className={`level ${activeFn.complexityLevel ?? 'low'}`}>
                {activeFn.complexityLevel}
              </span>
            </div>

            <div style={{ font: '600 14px var(--app-font-display)', color: '#f1f5fa', wordBreak: 'break-all', marginBottom: 4 }}>
              {activeFn.qualifiedName || activeFn.name}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#7b8a9c', marginBottom: 14 }}>
              <span className="mono">{activeFn.filePath}:{activeFn.lineStart}–{activeFn.lineEnd}</span>
              {activeFn.filePath && (
                <button
                  type="button"
                  className="btn"
                  style={{ height: 22, padding: '0 6px', fontSize: 10, marginLeft: 'auto' }}
                  onClick={() => onSelectFile(activeFn.filePath!)}
                >
                  Focus building <ExternalLink size={10} />
                </button>
              )}
            </div>

            <div className="detail-stat-grid" style={{ marginBottom: 14 }}>
              <div className="detail-stat">
                <div className="detail-stat-label">Cyclomatic Complexity</div>
                <div className="detail-stat-value" style={{ color: activeFn.complexity >= 11 ? '#ef7776' : activeFn.complexity >= 6 ? '#efbd62' : '#66c997' }}>
                  {activeFn.complexity}
                </div>
              </div>
              <div className="detail-stat">
                <div className="detail-stat-label">Lines of Code (LOC)</div>
                <div className="detail-stat-value">{activeFn.loc ?? '—'}</div>
              </div>
              <div className="detail-stat">
                <div className="detail-stat-label">Max Nesting Depth</div>
                <div className="detail-stat-value">{activeFn.nestingDepth ?? 0}</div>
              </div>
              <div className="detail-stat">
                <div className="detail-stat-label">Parameters</div>
                <div className="detail-stat-value">{activeFn.parametersCount ?? 0}</div>
              </div>
            </div>

            {/* Decision breakdown */}
            <div className="detail-block" style={{ marginTop: 8 }}>
              <div className="detail-block-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={11} color="#a994ff" /> Measured decision points
              </div>
              {activeFn.decisionDetails && activeFn.decisionDetails.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {activeFn.decisionDetails.map((detail, idx) => (
                    <div key={idx} className="reason" style={{ borderLeftColor: '#4ed5e7', fontSize: 11 }}>
                      {detail}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="subtle" style={{ fontSize: 11 }}>
                  Base complexity 1 with no additional branching logic.
                </div>
              )}
            </div>

            {/* Quick metrics chip summary */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
              {activeFn.conditionalBranches != null && activeFn.conditionalBranches > 0 && (
                <span className="plot-chip">{activeFn.conditionalBranches} branches</span>
              )}
              {activeFn.loops != null && activeFn.loops > 0 && (
                <span className="plot-chip">{activeFn.loops} loops</span>
              )}
              {activeFn.booleanOperators != null && activeFn.booleanOperators > 0 && (
                <span className="plot-chip">{activeFn.booleanOperators} bool ops</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
