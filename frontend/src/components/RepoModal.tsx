import React, { useState } from 'react';
import { X, Terminal, ShieldCheck, Play, FolderTree, AlertCircle, RefreshCw, Check } from 'lucide-react';
import { analyzeRepositoryPath, HealthStatus } from '../services/api';
import { AnalysisResult } from '../types';
import { REPOSITORY_PRESETS, PresetItem } from '../data/presets';

interface RepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataLoaded: (data: AnalysisResult) => void;
  health: HealthStatus | null;
  activeRepoName: string;
}

export const RepoModal: React.FC<RepoModalProps> = ({
  isOpen,
  onClose,
  onDataLoaded,
  health,
  activeRepoName,
}) => {
  const [inputPath, setInputPath] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleScanPath = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPath.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const result = await analyzeRepositoryPath(inputPath.trim());
      onDataLoaded(result);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Analysis failed. Check if path exists and backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPreset = (preset: PresetItem) => {
    onDataLoaded(preset.data);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-[#0b0f17] border border-white/15 shadow-2xl p-6 sm:p-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-white">
                EXPLORE REPOSITORY TOPOLOGY
              </h3>
              <p className="text-xs font-mono text-slate-400">
                Input a local filesystem directory or choose an architecture preset.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security & Sandbox Guarantee */}
        <div className="mt-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start space-x-3 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="text-slate-300 font-mono">
            <strong className="text-emerald-300">100% STATIC AST SECURITY GUARANTEE:</strong>
            <span className="block mt-0.5 text-slate-400">
              Source code is parsed exclusively via Python's built-in <code className="text-white">ast.parse()</code>.
              Files are never imported, compiled, or executed.
            </span>
          </div>
        </div>

        {/* Local Path Input Form */}
        <form onSubmit={handleScanPath} className="mt-6">
          <label className="block text-xs font-mono tracking-wider uppercase text-slate-300 mb-2">
            LOCAL REPOSITORY PATH:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputPath}
              onChange={(e) => setInputPath(e.target.value)}
              placeholder="e.g. /path/to/my-python-project or backend/demo_repo"
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            />
            <button
              type="submit"
              disabled={isLoading || !inputPath.trim()}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 disabled:hover:bg-cyan-400 text-black font-bold text-xs font-mono uppercase tracking-wider transition-all duration-200"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>PARSING...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>SCAN PATH</span>
                </>
              )}
            </button>
          </div>
          {errorMsg && (
            <div className="mt-2.5 flex items-center space-x-2 text-xs font-mono text-red-400 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </form>

        {/* Architecture Presets */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono tracking-wider uppercase text-slate-400">
              OR LOAD ARCHITECTURAL PRESETS:
            </span>
            <span className="text-[11px] font-mono text-cyan-400">
              INSTANT PRE-INDEXED TOPOLOGIES
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {REPOSITORY_PRESETS.map((preset) => {
              const isCurrent = activeRepoName === preset.data.repository;

              return (
                <div
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                    isCurrent
                      ? 'bg-cyan-500/10 border-cyan-400/50 shadow-glow-cyan'
                      : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.05]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono font-bold text-sm text-white">
                        {preset.name}
                      </span>
                      {isCurrent ? (
                        <span className="flex items-center space-x-1 text-[10px] font-mono font-bold text-cyan-400">
                          <Check className="w-3 h-3" />
                          <span>ACTIVE</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded">
                          {preset.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {preset.description}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>{preset.data.total_files} files</span>
                    <span>{preset.data.total_loc.toLocaleString()} LOC</span>
                    <span className="text-amber-400">{preset.data.high_risk_files} risk hotspots</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
