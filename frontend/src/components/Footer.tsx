import React from 'react';
import { Terminal, Shield, Cpu, Code2, ArrowUpRight } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#040609] border-t border-white/10 text-slate-400 font-mono text-xs py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-white/10">
        {/* Brand & Mission */}
        <div className="md:col-span-2">
          <div className="flex items-center space-x-2 text-white font-display font-black text-xl mb-3">
            <span>CODE</span>
            <span className="text-cyan-400">CITY</span>
          </div>
          <p className="text-slate-400 max-w-sm leading-relaxed mb-6 font-sans text-sm">
            Transforming software repositories into interactive architectural topologies.
            Exposing structural complexity, technical debt, and monster files before they degrade velocity.
          </p>
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>AST PARSER ENGINE — REVOLUTIONIZING STATIC VISUALIZATION</span>
          </div>
        </div>

        {/* Complexity Methodology */}
        <div>
          <h4 className="text-white font-bold uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            METHODOLOGY
          </h4>
          <ul className="space-y-2.5 text-[11px] text-slate-400">
            <li>• Base Complexity = 1</li>
            <li>• If / Elif / While / For = +1</li>
            <li>• BoolOp (and / or) = +N branches</li>
            <li>• ExceptHandler / With = +1</li>
            <li>• Comprehensions = +generators</li>
            <li>• Physical LOC = non-blank lines</li>
          </ul>
        </div>

        {/* Risk Thresholds */}
        <div>
          <h4 className="text-white font-bold uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            RISK TIERS
          </h4>
          <ul className="space-y-2.5 text-[11px]">
            <li className="text-emerald-400">● 1 - 5: LOW (Healthy Unit)</li>
            <li className="text-amber-400">● 6 - 10: MEDIUM (Moderate Logic)</li>
            <li className="text-red-400">● 11 - 25: HIGH (Testability Risk)</li>
            <li className="text-rose-400 font-bold">● 26+: CRITICAL (Refactor Target)</li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
        <div>CODE CITY // EXPERIMENTAL CODEBASE TOPOLOGY</div>
        <div>BUILT WITH REACT + VITE + GSAP + PLOTLY + PYTHON AST</div>
      </div>
    </footer>
  );
};
