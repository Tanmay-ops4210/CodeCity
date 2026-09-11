import React from 'react';
import { Split, Sparkles, ShieldAlert, CheckCircle2, ArrowRight, Layers, FileCode } from 'lucide-react';
import { CodeFile, AnalysisResult } from '../types';

interface RefactoringAdviceProps {
  data: AnalysisResult;
  onSelectFile: (file: CodeFile) => void;
}

export const RefactoringAdvice: React.FC<RefactoringAdviceProps> = ({ data, onSelectFile }) => {
  // Discover files with refactoring suggestions or high complexity/LOC
  const candidateFiles = data.files.filter(
    (f) => f.refactoring || f.complexity >= 15 || f.loc >= 350
  );

  return (
    <section id="refactoring" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#090d16] border-b border-white/5">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14">
          <div>
            <div className="inline-flex items-center space-x-2 text-xs font-mono tracking-widest text-cyan-400 uppercase mb-3">
              <Sparkles className="w-4 h-4" />
              <span>06 — HEURISTIC REFACTORING BLUEPRINTS</span>
            </div>
            <h2 className="font-display font-black text-4xl sm:text-6xl text-white tracking-tight uppercase">
              DECOMPOSE THE <span className="text-gradient-cyan">MONOLITHS</span>
            </h2>
          </div>
          <div className="mt-4 md:mt-0 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 max-w-md">
            <span className="text-[11px] font-mono text-amber-300 block">
              ⚠️ HEURISTIC ADVICE DISCLAIMER:
            </span>
            <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
              These suggestions are automated architectural heuristics derived from AST function clusters, not guaranteed conclusions.
            </span>
          </div>
        </div>

        {/* Candidate Cards Grid */}
        {candidateFiles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {candidateFiles.map((file) => {
              const ref = file.refactoring || {
                type: file.loc > 500 ? 'MONSTER FILE' : 'COMPLEXITY CONCENTRATION',
                recommendation: 'Decouple high-branching internal procedures into focused single-responsibility modules.',
                potential_modules: [
                  `${file.name.replace('.py', '')}_handlers`,
                  `${file.name.replace('.py', '')}_validator`,
                  `${file.name.replace('.py', '')}_service`,
                ],
              };

              return (
                <div
                  key={file.path}
                  className="p-6 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/10 hover:border-cyan-500/40 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Badge & Title */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-red-950/60 text-red-300 border border-red-500/30">
                        {ref.type}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        District: <span className="text-white font-bold">{file.folder}</span>
                      </span>
                    </div>

                    <h3 className="font-mono font-bold text-xl text-white truncate mb-1">
                      {file.name}
                    </h3>
                    <div className="text-xs font-mono text-slate-400 mb-4 truncate">
                      {file.path}
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center font-mono text-xs mb-5">
                      <div>
                        <span className="text-slate-400 block text-[10px]">LOC</span>
                        <span className="text-cyan-300 font-bold">{file.loc}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">COMPLEXITY</span>
                        <span className="text-amber-400 font-bold">{file.complexity}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">BRANCHES</span>
                        <span className="text-red-400 font-bold">{file.branches}</span>
                      </div>
                    </div>

                    {/* Recommendation */}
                    <div className="mb-5">
                      <span className="text-xs font-mono uppercase tracking-wider text-slate-300 block mb-1.5 flex items-center gap-1.5">
                        <Split className="w-3.5 h-3.5 text-cyan-400" />
                        RECOMMENDATION:
                      </span>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {ref.recommendation}
                      </p>
                    </div>

                    {/* Potential Modules */}
                    {ref.potential_modules && ref.potential_modules.length > 0 && (
                      <div className="mb-5">
                        <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase block mb-2">
                          POTENTIAL SUB-MODULES:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {ref.potential_modules.map((mod, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 rounded bg-cyan-950/30 border border-cyan-500/20 text-[11px] font-mono text-cyan-300"
                            >
                              {mod}.py
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Link */}
                  <button
                    onClick={() => onSelectFile(file)}
                    className="w-full mt-4 py-2.5 rounded-xl bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-300 border border-white/10 text-xs font-mono text-slate-200 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <span>INSPECT IN CODE CITY</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 rounded-2xl bg-white/[0.02] border border-white/10 text-center max-w-xl mx-auto">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h3 className="font-mono text-lg text-white font-bold mb-2">
              EXEMPLARY ARCHITECTURAL HEALTH
            </h3>
            <p className="text-sm font-mono text-slate-400">
              No files exceed the 400 LOC or 20 complexity threshold. The repository demonstrates clean separation of concerns.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
