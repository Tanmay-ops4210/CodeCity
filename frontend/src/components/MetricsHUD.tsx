import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { FileCode, AlignLeft, FunctionSquare, Network, Activity, AlertTriangle } from 'lucide-react';
import { AnalysisResult } from '../types';

gsap.registerPlugin(ScrollTrigger);

interface MetricsHUDProps {
  data: AnalysisResult;
}

export const MetricsHUD: React.FC<MetricsHUDProps> = ({ data }) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const numRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const stats = [
    {
      id: 'files',
      label: 'PYTHON FILES',
      val: data.total_files,
      format: (n: number) => Math.round(n).toLocaleString(),
      icon: FileCode,
      color: 'text-cyan-400',
      border: 'border-cyan-500/20',
    },
    {
      id: 'loc',
      label: 'TOTAL LINES (LOC)',
      val: data.total_loc,
      format: (n: number) => Math.round(n).toLocaleString(),
      icon: AlignLeft,
      color: 'text-blue-400',
      border: 'border-blue-500/20',
    },
    {
      id: 'functions',
      label: 'DECLARED FUNCTIONS',
      val: data.total_functions,
      format: (n: number) => Math.round(n).toLocaleString(),
      icon: FunctionSquare,
      color: 'text-emerald-400',
      border: 'border-emerald-500/20',
    },
    {
      id: 'classes',
      label: 'TOTAL CLASSES',
      val: data.total_classes,
      format: (n: number) => Math.round(n).toLocaleString(),
      icon: Network,
      color: 'text-purple-400',
      border: 'border-purple-500/20',
    },
    {
      id: 'complexity',
      label: 'AVG COMPLEXITY',
      val: data.avg_complexity,
      format: (n: number) => n.toFixed(1),
      icon: Activity,
      color: 'text-amber-400',
      border: 'border-amber-500/20',
    },
    {
      id: 'high-risk',
      label: 'HIGH-RISK MODULES',
      val: data.high_risk_files,
      format: (n: number) => Math.round(n).toLocaleString(),
      icon: AlertTriangle,
      color: 'text-red-400',
      border: 'border-red-500/20',
    },
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      stats.forEach((st, idx) => {
        const el = numRefs.current[idx];
        if (!el) return;

        const obj = { val: 0 };
        gsap.to(obj, {
          val: st.val,
          duration: 1.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
          onUpdate: () => {
            if (el) {
              el.innerText = st.format(obj.val);
            }
          },
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [data]);

  return (
    <section
      id="metrics"
      ref={sectionRef}
      className="relative py-20 px-4 sm:px-6 lg:px-8 bg-[#080b12] border-b border-white/5"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono tracking-widest text-cyan-400 uppercase mb-2">
              <span>04 — TELEMETRY HUD</span>
            </div>
            <h2 className="font-display font-black text-3xl sm:text-5xl text-white tracking-tight">
              LIVE REPOSITORY TOPOLOGY
            </h2>
          </div>
          <p className="mt-4 md:mt-0 text-sm font-mono text-slate-400 max-w-md">
            Synthesized AST metrics across {data.districts.length} districts in <span className="text-white font-bold">{data.repository}</span>.
          </p>
        </div>

        {/* Counter Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.id}
                className={`relative p-5 rounded-xl bg-white/[0.03] backdrop-blur-md border ${stat.border} hover:border-white/20 transition-all duration-200 flex flex-col justify-between`}
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] font-mono tracking-wider text-slate-400">
                    {stat.label}
                  </span>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div>
                  <div className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight">
                    <span ref={(el) => (numRefs.current[idx] = el)}>0</span>
                  </div>
                  <div className="mt-1 flex items-center space-x-1.5 text-[10px] font-mono text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>PARSED AST</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
