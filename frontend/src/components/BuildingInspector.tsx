import React from 'react';
import { X, AlertOctagon, CheckCircle2, Copy, Layers, GitBranch, Cpu, Split, Wrench } from 'lucide-react';
import { CodeFile } from '../types';

interface BuildingInspectorProps {
  file: CodeFile | null;
  onClose: () => void;
}

export const BuildingInspector: React.FC<BuildingInspectorProps> = ({ file, onClose }) => {
  if (!file) return null;

  const copyPath = () => {
    navigator.clipboard.writeText(file.path);
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'LOW':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'MEDIUM':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'HIGH':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'CRITICAL':
        return 'bg-rose-950/50 text-rose-300 border-rose-500/50 shadow-glow-crimson';
      default:
        return 'bg-slate-500/10 text-slate-300 border-slate-500/30';
    }
  };

  // Complexity percentage for the visual risk meter (capped at 45)
  const complexityPct = Math.min(100, Math.round((file.complexity / 40) * 100));

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#0b0f17]/95 border-l border-white/10 backdrop-blur-2xl shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-mono tracking-widest text-slate-400 uppercase">
              BUILDING TELEMETRY
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Building Title & Path */}
        <div className="mt-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-mono font-bold text-xl text-white break-all">
              {file.name}
            </h3>
            <span
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold uppercase tracking-wider border ${getRiskBadge(
                file.risk
              )}`}
            >
              {file.risk}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between text-xs font-mono text-slate-400 bg-white/[0.03] p-2.5 rounded-lg border border-white/5">
            <span className="truncate mr-2">{file.path}</span>
            <button
              onClick={copyPath}
              className="p-1 hover:text-cyan-400 transition-colors"
              title="Copy relative file path"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Visual Risk & Complexity Meter */}
        <div className="mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/10">
          <div className="flex justify-between items-center text-xs font-mono mb-2">
            <span className="text-slate-400">CYCLOMATIC RISK METER:</span>
            <span className="text-white font-bold">{file.complexity} / 40+ PTS</span>
          </div>
          <div className="relative h-3 w-full bg-slate-800/80 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-emerald-400 via-amber-400 to-red-600"
              style={{ width: `${complexityPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1.5">
            <span>LOW (1-5)</span>
            <span>MED (6-10)</span>
            <span>HIGH (11-25)</span>
            <span>CRITICAL (26+)</span>
          </div>
        </div>

        {/* Core Metrics Grid */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
            <div className="text-[10px] font-mono text-slate-400 uppercase">LINES (LOC)</div>
            <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
              {file.loc.toLocaleString()}
            </div>
            <div className="text-[9px] font-mono text-slate-400">Physical</div>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
            <div className="text-[10px] font-mono text-slate-400 uppercase">FUNCTIONS</div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
              {file.functions}
            </div>
            <div className="text-[9px] font-mono text-slate-400">Defs</div>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
            <div className="text-[10px] font-mono text-slate-400 uppercase">BRANCHES</div>
            <div className="text-xl font-bold font-mono text-amber-400 mt-1">
              {file.branches}
            </div>
            <div className="text-[9px] font-mono text-slate-400">Decisions</div>
          </div>
        </div>

        {/* Classes and District */}
        <div className="mt-3 flex gap-3 text-xs font-mono text-slate-300">
          <div className="flex-1 p-2.5 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between">
            <span className="text-slate-400">District:</span>
            <span className="text-cyan-300 font-bold">{file.folder}</span>
          </div>
          <div className="flex-1 p-2.5 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between">
            <span className="text-slate-400">Classes:</span>
            <span className="text-purple-300 font-bold">{file.classes}</span>
          </div>
        </div>

        {/* Potential Issues Diagnostic */}
        <div className="mt-6">
          <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
            DIAGNOSTIC ISSUES:
          </h4>
          <div className="space-y-2">
            {file.issues && file.issues.length > 0 ? (
              file.issues.map((issue, i) => (
                <div
                  key={i}
                  className="flex items-center space-x-2.5 p-2.5 rounded-lg bg-white/[0.02] border border-white/5 text-xs text-slate-300"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                  <span>{issue}</span>
                </div>
              ))
            ) : (
              <div className="flex items-center space-x-2 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>No major architectural hotspots detected.</span>
              </div>
            )}
          </div>
        </div>

        {/* Refactoring Recommendations */}
        {file.refactoring && (
          <div className="mt-6 p-4 rounded-xl bg-red-950/20 border border-red-500/30">
            <div className="flex items-center space-x-2 text-xs font-mono font-bold text-red-400 mb-2">
              <Split className="w-4 h-4" />
              <span>{file.refactoring.type} DETECTED</span>
            </div>
            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              {file.refactoring.recommendation}
            </p>
            {file.refactoring.potential_modules && file.refactoring.potential_modules.length > 0 && (
              <div>
                <span className="text-[10px] font-mono text-slate-400 block mb-1.5">
                  SUGGESTED DECOMPOSITION MODULES:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {file.refactoring.potential_modules.map((mod, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 rounded bg-black/40 border border-red-500/30 text-[10px] font-mono text-red-300"
                    >
                      {mod}.py
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Close Action */}
      <div className="pt-6 border-t border-white/10 mt-6 flex justify-end">
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-slate-300 hover:text-white transition-all duration-200"
        >
          CLOSE TELEMETRY
        </button>
      </div>
    </div>
  );
};
