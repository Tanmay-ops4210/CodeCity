import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  AlertOctagon,
  Info,
  Lightbulb,
  Wrench,
  Sparkles,
  ExternalLink,
  Search,
  Filter,
  CheckCircle2,
  FileCode2,
  Code2,
  ArrowRight,
  GitFork,
  Layers,
} from 'lucide-react';
import type {
  RefactoringFinding,
  RefactoringFindingSeverity,
  RefactoringSummary,
} from '@workspace/api-client-react';

interface RefactoringAdvisorProps {
  summary?: RefactoringSummary | null;
  selectedPath?: string;
  onSelectFile: (filePath: string) => void;
}

export function RefactoringAdvisor({
  summary,
  selectedPath,
  onSelectFile,
}: RefactoringAdvisorProps) {
  const [query, setQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | RefactoringFindingSeverity>('all');
  const [ruleFilter, setRuleFilter] = useState('all');
  const [onlySelectedFile, setOnlySelectedFile] = useState(false);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);

  const findings = summary?.findings ?? [];

  // Extract distinct rules for the filter dropdown and pill badges
  const availableRules = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    findings.forEach((f) => {
      const existing = map.get(f.ruleId);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(f.ruleId, { id: f.ruleId, name: f.ruleName, count: 1 });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [findings]);

  // Filter findings based on user criteria
  const filteredFindings = useMemo(() => {
    const q = query.trim().toLowerCase();
    return findings.filter((f) => {
      if (severityFilter !== 'all' && f.severity !== severityFilter) {
        return false;
      }
      if (ruleFilter !== 'all' && f.ruleId !== ruleFilter) {
        return false;
      }
      if (onlySelectedFile && selectedPath && f.filePath !== selectedPath) {
        return false;
      }
      if (q) {
        const matchRule = f.ruleName.toLowerCase().includes(q) || f.ruleId.toLowerCase().includes(q);
        const matchPath = f.filePath.toLowerCase().includes(q);
        const matchFn = f.functionName?.toLowerCase().includes(q);
        const matchIssue = f.issueExplanation.toLowerCase().includes(q);
        const matchRec = f.recommendation.toLowerCase().includes(q);
        if (!matchRule && !matchPath && !matchFn && !matchIssue && !matchRec) {
          return false;
        }
      }
      return true;
    });
  }, [findings, severityFilter, ruleFilter, onlySelectedFile, selectedPath, query]);

  const activeFinding = useMemo(() => {
    if (selectedFindingId) {
      const found = findings.find((f) => f.id === selectedFindingId);
      if (found) return found;
    }
    return filteredFindings[0] ?? null;
  }, [findings, selectedFindingId, filteredFindings]);

  const handleCardClick = (finding: RefactoringFinding) => {
    setSelectedFindingId(finding.id);
    if (finding.filePath) {
      onSelectFile(finding.filePath);
    }
  };

  const severityColor = (severity: RefactoringFindingSeverity) => {
    switch (severity) {
      case 'critical':
        return '#ef7776';
      case 'warning':
        return '#efbd62';
      case 'info':
        return '#60c5d2';
      default:
        return '#8995a5';
    }
  };

  const severityBadgeClass = (severity: RefactoringFindingSeverity) => {
    switch (severity) {
      case 'critical':
        return 'high';
      case 'warning':
        return 'medium';
      case 'info':
        return 'low';
      default:
        return 'unavailable';
    }
  };

  const getTargetIcon = (targetType: string) => {
    switch (targetType) {
      case 'function':
        return <Code2 size={13} color="#60c5d2" />;
      case 'file':
        return <FileCode2 size={13} color="#a994ff" />;
      case 'cycle':
        return <GitFork size={13} color="#efbd62" />;
      default:
        return <Layers size={13} color="#6fce9c" />;
    }
  };

  return (
    <div
      className="section-card"
      id="refactoring-advisor"
      aria-label="Intelligent rule-based refactoring advisor"
      data-testid="section-refactoring-advisor"
      style={{ marginBottom: 18 }}
    >
      <div className="section-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div className="section-title">Refactoring advisor</div>
          <span className="section-meta">DETERMINISTIC QUALITY HEURISTICS</span>
        </div>
        <div className="section-meta">
          {filteredFindings.length} / {findings.length} findings
        </div>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 10,
          padding: '14px 16px',
          borderBottom: '1px solid #252e39',
          background: '#121822',
        }}
      >
        <div className="detail-stat" style={{ cursor: 'pointer' }} onClick={() => setSeverityFilter('all')}>
          <div className="detail-stat-label">Total Findings</div>
          <div className="detail-stat-value" style={{ color: '#e8edf3' }}>
            {summary?.totalFindings ?? 0}
          </div>
        </div>

        <div
          className="detail-stat"
          style={{
            cursor: 'pointer',
            borderColor: severityFilter === 'critical' ? '#ef7776' : undefined,
          }}
          onClick={() => setSeverityFilter(severityFilter === 'critical' ? 'all' : 'critical')}
        >
          <div className="detail-stat-label" style={{ color: '#ef7776' }}>
            Critical
          </div>
          <div className="detail-stat-value" style={{ color: '#ef7776' }}>
            {summary?.criticalCount ?? 0}
          </div>
        </div>

        <div
          className="detail-stat"
          style={{
            cursor: 'pointer',
            borderColor: severityFilter === 'warning' ? '#efbd62' : undefined,
          }}
          onClick={() => setSeverityFilter(severityFilter === 'warning' ? 'all' : 'warning')}
        >
          <div className="detail-stat-label" style={{ color: '#efbd62' }}>
            Warnings
          </div>
          <div className="detail-stat-value" style={{ color: '#efbd62' }}>
            {summary?.warningCount ?? 0}
          </div>
        </div>

        <div
          className="detail-stat"
          style={{
            cursor: 'pointer',
            borderColor: severityFilter === 'info' ? '#60c5d2' : undefined,
          }}
          onClick={() => setSeverityFilter(severityFilter === 'info' ? 'all' : 'info')}
        >
          <div className="detail-stat-label" style={{ color: '#60c5d2' }}>
            Suggestions
          </div>
          <div className="detail-stat-value" style={{ color: '#60c5d2' }}>
            {summary?.infoCount ?? 0}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="explorer-head">
        <label className="explorer-search">
          <Search size={13} />
          <input
            type="search"
            aria-label="Filter refactoring findings"
            placeholder="Search rules, files, functions, or guidance…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        <select
          className="filter-select"
          aria-label="Filter by severity"
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as any)}
        >
          <option value="all">All severities</option>
          <option value="critical">Critical priority</option>
          <option value="warning">Warning</option>
          <option value="info">Info / Suggestion</option>
        </select>

        <select
          className="filter-select"
          aria-label="Filter by rule"
          value={ruleFilter}
          onChange={(e) => setRuleFilter(e.target.value)}
        >
          <option value="all">All rules ({availableRules.length})</option>
          {availableRules.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} ({r.count})
            </option>
          ))}
        </select>

        {selectedPath && (
          <button
            type="button"
            className={`btn ${onlySelectedFile ? 'btn-primary' : ''}`}
            style={{ height: 32, fontSize: 11, padding: '0 10px' }}
            onClick={() => setOnlySelectedFile(!onlySelectedFile)}
            title={`Toggle filtering to current file: ${selectedPath}`}
          >
            <Filter size={11} />
            {onlySelectedFile ? 'Filtered to active file' : 'Filter by active file'}
          </button>
        )}
      </div>

      {/* Main Layout: Findings List and Finding Details Sidebar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: activeFinding ? 'minmax(0, 1fr) 380px' : '1fr',
          minHeight: 400,
        }}
      >
        {/* Finding List */}
        <div className="file-list scrollbar" style={{ maxHeight: 480 }}>
          {filteredFindings.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#7e8b9b', fontSize: 12 }}>
              <CheckCircle2 size={32} color="#66c997" style={{ margin: '0 auto 10px' }} />
              <div style={{ color: '#dbe3ed', fontWeight: 600, marginBottom: 4 }}>
                No findings match the current filters
              </div>
              <div>Adjust search terms, severity, or rule selection to view advice.</div>
            </div>
          ) : (
            filteredFindings.map((finding) => {
              const isSelected = activeFinding?.id === finding.id;
              const isForActivePath = selectedPath && finding.filePath === selectedPath;

              return (
                <div
                  key={finding.id}
                  onClick={() => handleCardClick(finding)}
                  data-testid={`card-refactoring-finding-${finding.id}`}
                  style={{
                    padding: '12px 14px',
                    borderBottom: '1px solid #202832',
                    cursor: 'pointer',
                    background: isSelected
                      ? '#19242f'
                      : isForActivePath
                      ? '#151d27'
                      : 'transparent',
                    boxShadow: isSelected ? 'inset 3px 0 #54d2df' : undefined,
                    transition: 'background 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <span className={`level ${severityBadgeClass(finding.severity)}`}>
                      {finding.severity}
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 10,
                        color: '#90a0b2',
                        fontFamily: 'var(--app-font-mono)',
                      }}
                    >
                      {getTargetIcon(finding.targetType)}
                      {finding.targetType}
                    </span>
                    <span
                      style={{
                        marginLeft: 'auto',
                        font: '600 11px var(--app-font-display)',
                        color: '#e4ebf2',
                      }}
                    >
                      {finding.ruleName}
                    </span>
                  </div>

                  <div
                    style={{
                      font: '500 11px var(--app-font-mono)',
                      color: '#d0dae6',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginBottom: 4,
                    }}
                  >
                    {finding.filePath}
                    {finding.functionName && (
                      <span style={{ color: '#57cddc' }}> : {finding.functionName}()</span>
                    )}
                    {finding.lineStart && (
                      <span style={{ color: '#7e8d9e' }}>
                        {' '}
                        [L{finding.lineStart}{finding.lineEnd ? `-L${finding.lineEnd}` : ''}]
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color: '#919fae',
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {finding.issueExplanation}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginTop: 8,
                      fontSize: 10,
                      color: '#707f90',
                      fontFamily: 'var(--app-font-mono)',
                    }}
                  >
                    <span>
                      Actual: <strong style={{ color: severityColor(finding.severity) }}>{finding.actualValue}</strong>
                    </span>
                    <span>·</span>
                    <span>Threshold: {finding.threshold}</span>
                    <button
                      type="button"
                      className="btn"
                      style={{
                        marginLeft: 'auto',
                        height: 20,
                        padding: '0 6px',
                        fontSize: 9,
                        background: '#1b232d',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectFile(finding.filePath);
                      }}
                    >
                      Focus building <ExternalLink size={9} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Finding Detail Panel */}
        {activeFinding && (
          <div
            style={{
              borderLeft: '1px solid #252e39',
              background: '#111721',
              padding: 18,
              overflowY: 'auto',
              maxHeight: 480,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <span className="eyebrow" style={{ color: '#57cddc' }}>
                Refactoring recommendation
              </span>
              <span className={`level ${severityBadgeClass(activeFinding.severity)}`}>
                {activeFinding.severity}
              </span>
            </div>

            <div
              style={{
                font: '600 15px var(--app-font-display)',
                color: '#f1f5fa',
                marginBottom: 6,
              }}
            >
              {activeFinding.ruleName}
            </div>

            <div
              style={{
                font: '500 11px var(--app-font-mono)',
                color: '#8999ab',
                wordBreak: 'break-all',
                marginBottom: 12,
              }}
            >
              {activeFinding.filePath}
              {activeFinding.functionName && (
                <div style={{ color: '#57cddc', marginTop: 3 }}>
                  Function: <code>{activeFinding.functionName}</code>
                </div>
              )}
              {activeFinding.lineStart && (
                <div style={{ color: '#758596', marginTop: 2 }}>
                  Lines {activeFinding.lineStart}
                  {activeFinding.lineEnd ? ` – ${activeFinding.lineEnd}` : ''}
                </div>
              )}
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', marginBottom: 16, height: 32, fontSize: 11 }}
              onClick={() => onSelectFile(activeFinding.filePath)}
            >
              <ExternalLink size={12} /> Focus in Code City 3D
            </button>

            <div className="detail-stat-grid" style={{ marginBottom: 14 }}>
              <div className="detail-stat">
                <div className="detail-stat-label">Measured Metric</div>
                <div
                  className="detail-stat-value"
                  style={{ color: severityColor(activeFinding.severity), fontSize: 16 }}
                >
                  {activeFinding.actualValue}
                </div>
              </div>
              <div className="detail-stat">
                <div className="detail-stat-label">Threshold Rule</div>
                <div className="detail-stat-value" style={{ fontSize: 16 }}>
                  {activeFinding.threshold}
                </div>
              </div>
            </div>

            {/* Issue Explanation */}
            <div className="detail-block" style={{ marginTop: 10 }}>
              <div
                className="detail-block-title"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <AlertTriangle size={12} color="#efbd62" /> Diagnosis
              </div>
              <p style={{ margin: 0, fontSize: 11, color: '#c4ced9', lineHeight: 1.55 }}>
                {activeFinding.issueExplanation}
              </p>
            </div>

            {/* Actionable Guidance */}
            <div className="detail-block" style={{ marginTop: 14 }}>
              <div
                className="detail-block-title"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#60c5d2',
                }}
              >
                <Wrench size={12} color="#60c5d2" /> Actionable Advice
              </div>
              <div
                className="reason"
                style={{
                  borderLeftColor: '#54d2df',
                  background: '#151f28',
                  padding: '9px 12px',
                  borderRadius: '0 6px 6px 0',
                  fontSize: 11,
                  lineHeight: 1.6,
                  color: '#e2eaf2',
                }}
              >
                {activeFinding.recommendation}
              </div>
            </div>

            <div style={{ marginTop: 16, fontSize: 10, color: '#687788', lineHeight: 1.5 }}>
              Language: <span className="mono">{activeFinding.language}</span> · Rule ID:{' '}
              <span className="mono">{activeFinding.ruleId}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
