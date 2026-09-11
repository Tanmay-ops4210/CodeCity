import React from 'react';
import { AlertTriangle, TrendingUp, Flame, ShieldCheck, ArrowRight, FolderKanban } from 'lucide-react';
import { CodeFile, AnalysisResult } from '../types';

interface RiskAnalysisProps {
  data: AnalysisResult;
  onSelectFile: (file: CodeFile) => void;
}

export const RiskAnalysis: React.FC<RiskAnalysisProps> = ({ data, onSelectFile }) => {
  // Sort by complexity descending
  const topComplexFiles = [...data.files]
    .sort((a, b) => b.complexity - a.complexity)
    .slice(0, 5);

  // Sort by LOC descending
  const largestFiles = [...data.files]
    .sort((a, b) => b.loc - a.loc)
    .slice(0, 5);

  // Calculate district risk breakdown
  const districtRiskMap: Record<string, { totalLoc: number; totalComplexity: number; fileCount: number; criticalCount: number }> = {};
  data.files.forEach((f) => {
    if (!districtRiskMap[f.folder]) {
      districtRiskMap[f.folder] = { totalLoc: 0, totalComplexity: 0, fileCount: 0, criticalCount: 0 };
    }
    districtRiskMap[f.folder].totalLoc += f.loc;
    districtRiskMap[f.folder].totalComplexity += f.complexity;
    districtRiskMap[f.folder].fileCount += 1;
    if (f.risk === 'CRITICAL' || f.risk === 'HIGH') {
      districtRiskMap[f.folder].criticalCount += 1;
    }
  });

  const districtLeaderboard = Object.entries(districtRiskMap)
    .map(([district, stats]) => ({
      district,
      avgComplexity: (stats.totalComplexity / stats.fileCount).toFixed(1),
      ...stats,
    }))
    .sort((a, b) => Number(b.avgComplexity) - Number(a.avgComplexity))
    .slice(0, 4);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'CRITICAL':
        return 'text-rose-400 bg-rose-950/40 border-rose-500/40';
      case 'HIGH':
        return 'text-red-400 bg-red-950/30 border-red-500/30';
      case 'MEDIUM':
        return 'text-amber-400 bg-amber-950/30 border-amber-500/30';
      default:
        return 'text-emerald-400 bg-emerald-950/30 border-emerald-500/30';
    }
  };

  return (
    <section id="debt" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#06080d] border-b border-white/5">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="mb-14">
          <div className="inline-flex items-center space-x-2 text-xs font-mono tracking-widest text-red-400 uppercase mb-3">
            <Flame className="w-4 h-4" />
            <span>05 — ARCHITECTURAL DEBT AUDIT</span>
          </div>
          <h2 className="font-display font-black text-4xl sm:text-6xl text-white tracking-tight uppercase">
            WHERE IS YOUR <span className="text-gradient-risk">TECHNICAL DEBT?</span>
          </h2>
          <p className="mt-4 text-slate-400 font-mono text-sm max-w-2xl leading-relaxed">
            Cyclomatic hotspots and bloated file footprints require deliberate isolation.
            Select any file to jump to its telemetry inspector.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Top Risk / Most Complex Files */}
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                <div className="flex items-center space-x-2.5">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <h3 className="font-mono font-bold text-sm text-white tracking-wider uppercase">
                    TOP RISK FILES
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400">BY COMPLEXITY</span>
              </div>

              <div className="space-y-3">
                {topComplexFiles.map((file, idx) => (
                  <div
                    key={file.path}
                    onClick={() => onSelectFile(file)}
                    className="group p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-cyan-500/40 transition-all duration-200 cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <span className="font-mono text-xs text-slate-400 w-4 font-bold">
                        {idx + 1}.
                      </span>
                      <div className="truncate">
                        <div className="text-sm font-mono text-white group-hover:text-cyan-400 transition-colors truncate">
                          {file.name}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 truncate">
                          {file.folder}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2.5 flex-shrink-0">
                      <span className="text-xs font-mono font-bold text-white">
                        {file.complexity} pts
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getRiskColor(
                          file.risk
                        )}`}
                      >
                        {file.risk}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Column 2: Largest Monolithic Files */}
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                <div className="flex items-center space-x-2.5">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  <h3 className="font-mono font-bold text-sm text-white tracking-wider uppercase">
                    LARGEST FILES
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400">BY VOLUME (LOC)</span>
              </div>

              <div className="space-y-3">
                {largestFiles.map((file, idx) => (
                  <div
                    key={file.path}
                    onClick={() => onSelectFile(file)}
                    className="group p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-cyan-500/40 transition-all duration-200 cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <span className="font-mono text-xs text-slate-400 w-4 font-bold">
                        {idx + 1}.
                      </span>
                      <div className="truncate">
                        <div className="text-sm font-mono text-white group-hover:text-cyan-400 transition-colors truncate">
                          {file.name}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 truncate">
                          {file.folder}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2.5 flex-shrink-0">
                      <span className="text-xs font-mono font-bold text-cyan-300">
                        {file.loc.toLocaleString()} LOC
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getRiskColor(
                          file.risk
                        )}`}
                      >
                        {file.risk}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Column 3: Highest-Risk Districts */}
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                <div className="flex items-center space-x-2.5">
                  <FolderKanban className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-mono font-bold text-sm text-white tracking-wider uppercase">
                    HIGH-RISK DISTRICTS
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400">AVG COMPLEXITY</span>
              </div>

              <div className="space-y-3">
                {districtLeaderboard.map((d, idx) => (
                  <div
                    key={d.district}
                    className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col space-y-2"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2 truncate">
                        <span className="font-mono text-xs text-slate-400 font-bold">
                          {idx + 1}.
                        </span>
                        <span className="font-mono text-sm text-white uppercase font-bold truncate">
                          {d.district}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-amber-400 font-bold">
                        Avg: {d.avgComplexity}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 pt-1 border-t border-white/5">
                      <span>{d.fileCount} modules</span>
                      <span>{d.totalLoc.toLocaleString()} total LOC</span>
                      {d.criticalCount > 0 ? (
                        <span className="text-red-400 font-bold">
                          {d.criticalCount} hotspots
                        </span>
                      ) : (
                        <span className="text-emerald-400">Stable</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
