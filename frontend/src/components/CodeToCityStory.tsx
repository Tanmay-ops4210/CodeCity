import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Terminal, Code2, Cpu, Box, Building, ArrowRight } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export const CodeToCityStory: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stage1Ref = useRef<HTMLDivElement>(null);
  const stage2Ref = useRef<HTMLDivElement>(null);
  const stage3Ref = useRef<HTMLDivElement>(null);
  const stage4Ref = useRef<HTMLDivElement>(null);
  const stage5Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const stages = [
        stage1Ref.current,
        stage2Ref.current,
        stage3Ref.current,
        stage4Ref.current,
        stage5Ref.current,
      ];

      // Master pinned timeline
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          pin: true,
          start: 'top top',
          end: '+=4000',
          scrub: 1,
        },
      });

      // Initially show stage 1, hide others
      gsap.set(stages.slice(1), { autoAlpha: 0, scale: 0.92, y: 30 });
      gsap.set(stages[0], { autoAlpha: 1, scale: 1, y: 0 });

      // Transition 1 -> 2
      tl.to(stages[0], { autoAlpha: 0, scale: 1.06, duration: 0.8 })
        .to(stages[1], { autoAlpha: 1, scale: 1, y: 0, duration: 0.8 }, '-=0.3')
        // Hold 2
        .to({}, { duration: 0.5 })
        // Transition 2 -> 3
        .to(stages[1], { autoAlpha: 0, scale: 1.06, duration: 0.8 })
        .to(stages[2], { autoAlpha: 1, scale: 1, y: 0, duration: 0.8 }, '-=0.3')
        // Hold 3
        .to({}, { duration: 0.5 })
        // Transition 3 -> 4
        .to(stages[2], { autoAlpha: 0, scale: 1.06, duration: 0.8 })
        .to(stages[3], { autoAlpha: 1, scale: 1, y: 0, duration: 0.8 }, '-=0.3')
        // Hold 4
        .to({}, { duration: 0.5 })
        // Transition 4 -> 5
        .to(stages[3], { autoAlpha: 0, scale: 1.06, duration: 0.8 })
        .to(stages[5 - 1], { autoAlpha: 1, scale: 1, y: 0, duration: 0.8 }, '-=0.3');
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="story"
      ref={containerRef}
      className="relative h-screen w-full bg-[#07090f] overflow-hidden flex items-center justify-center border-b border-white/5"
    >
      {/* Background Matrix & Lighting */}
      <div className="absolute inset-0 tech-grid-bg opacity-30 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Progress / Step Watermark */}
      <div className="absolute top-10 left-8 sm:left-12 flex items-center space-x-3 z-30">
        <span className="text-xs font-mono tracking-widest text-cyan-400 uppercase">
          03 — THE TRANSFORMATION
        </span>
        <span className="text-xs font-mono text-white/20">/ FROM CODE TO CITY</span>
      </div>

      <div className="relative w-full max-w-5xl px-4 sm:px-8 h-[75vh] flex items-center justify-center">
        {/* ================= STAGE 1: RAW CODE ================= */}
        <div
          ref={stage1Ref}
          className="absolute inset-0 flex flex-col items-center justify-center text-center p-6"
        >
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-6 shadow-glow-cyan">
            <Terminal className="w-8 h-8" />
          </div>
          <h2 className="font-display font-black text-4xl sm:text-6xl md:text-7xl text-white uppercase tracking-tight max-w-3xl">
            Thousands of lines.<br />
            Hundreds of files.<br />
            <span className="text-gradient-cyan">One complex system.</span>
          </h2>
          <div className="mt-8 max-w-xl w-full p-4 rounded-xl bg-black/60 border border-white/10 font-mono text-left text-xs sm:text-sm text-slate-300 shadow-2xl overflow-hidden">
            <div className="flex items-center space-x-2 pb-3 mb-3 border-b border-white/10 text-slate-400 text-[11px]">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              <span className="ml-2 font-mono">src/services/payment_orchestrator.py</span>
            </div>
            <p className="text-purple-400">def process_payment(tx, gateway):</p>
            <p className="pl-4 text-cyan-300">if tx.amount &gt; 10000 and tx.is_foreign:</p>
            <p className="pl-8 text-amber-300">fraud_score = compute_risk(tx, velocity=10)</p>
            <p className="pl-8 text-slate-400"># 480 more lines of nested branches...</p>
          </div>
        </div>

        {/* ================= STAGE 2: AST & DATA EXTRACTION ================= */}
        <div
          ref={stage2Ref}
          className="absolute inset-0 flex flex-col items-center justify-center text-center p-6"
        >
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6 shadow-[0_0_25px_rgba(99,102,241,0.3)]">
            <Cpu className="w-8 h-8" />
          </div>
          <h2 className="font-display font-black text-4xl sm:text-6xl md:text-7xl text-white uppercase tracking-tight">
            The code becomes<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">
              Structured Data.
            </span>
          </h2>
          <p className="mt-4 text-slate-400 text-sm sm:text-base max-w-lg">
            Static AST decomposition strips away syntactic noise into 4 fundamental architectural vectors.
          </p>
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl w-full">
            <div className="p-5 rounded-xl bg-white/5 border border-cyan-500/30 text-left">
              <div className="text-[11px] font-mono text-cyan-400">01. PARSER</div>
              <div className="text-2xl font-bold font-mono text-white mt-1">AST</div>
              <div className="text-xs text-slate-400 mt-1">Syntax Tree Walk</div>
            </div>
            <div className="p-5 rounded-xl bg-white/5 border border-amber-500/30 text-left">
              <div className="text-[11px] font-mono text-amber-400">02. VOLUME</div>
              <div className="text-2xl font-bold font-mono text-white mt-1">LOC</div>
              <div className="text-xs text-slate-400 mt-1">Physical Lines</div>
            </div>
            <div className="p-5 rounded-xl bg-white/5 border border-rose-500/30 text-left">
              <div className="text-[11px] font-mono text-rose-400">03. CONTROL</div>
              <div className="text-2xl font-bold font-mono text-white mt-1">COMPLEXITY</div>
              <div className="text-xs text-slate-400 mt-1">Branch Decisions</div>
            </div>
            <div className="p-5 rounded-xl bg-white/5 border border-red-500/30 text-left">
              <div className="text-[11px] font-mono text-red-400">04. SEVERITY</div>
              <div className="text-2xl font-bold font-mono text-white mt-1">RISK</div>
              <div className="text-xs text-slate-400 mt-1">LOW to CRITICAL</div>
            </div>
          </div>
        </div>

        {/* ================= STAGE 3: GEOMETRY BLOCKS ================= */}
        <div
          ref={stage3Ref}
          className="absolute inset-0 flex flex-col items-center justify-center text-center p-6"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6 shadow-[0_0_25px_rgba(245,158,11,0.3)]">
            <Box className="w-8 h-8" />
          </div>
          <h2 className="font-display font-black text-4xl sm:text-6xl md:text-7xl text-white uppercase tracking-tight">
            Structure becomes<br />
            <span className="text-gradient-risk">Geometry.</span>
          </h2>
          <p className="mt-4 text-slate-400 text-sm sm:text-base max-w-lg">
            Every file claims physical footprint proportional to its line count. High LOC files expand into colossal rectangular slabs.
          </p>
          <div className="mt-8 flex items-end justify-center gap-4 sm:gap-6 h-36">
            <div className="w-12 h-14 rounded-lg bg-emerald-500/30 border border-emerald-400 flex items-center justify-center text-[10px] font-mono text-emerald-300">
              40 LOC
            </div>
            <div className="w-20 h-24 rounded-lg bg-amber-500/30 border border-amber-400 flex items-center justify-center text-[11px] font-mono text-amber-300">
              200 LOC
            </div>
            <div className="w-32 h-36 rounded-lg bg-red-500/40 border border-red-400 flex items-center justify-center text-xs font-mono text-red-200 font-bold shadow-glow-crimson">
              800 LOC
            </div>
          </div>
        </div>

        {/* ================= STAGE 4: DISTRICTS ASSEMBLE ================= */}
        <div
          ref={stage4Ref}
          className="absolute inset-0 flex flex-col items-center justify-center text-center p-6"
        >
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-6 shadow-glow-cyan">
            <Building className="w-8 h-8" />
          </div>
          <h2 className="font-display font-black text-4xl sm:text-6xl md:text-7xl text-white uppercase tracking-tight">
            Your codebase<br />
            <span className="text-gradient-cyan">Has a Shape.</span>
          </h2>
          <p className="mt-4 text-slate-400 text-sm sm:text-base max-w-lg">
            Directories cluster together into urban districts. API gateways become bustling ports. Models form residential blocks. Services dominate downtown.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3 max-w-md w-full font-mono text-xs text-left">
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <span className="text-cyan-400 block font-bold">SRC / API</span>
              <span className="text-slate-400 text-[10px]">Gateway District</span>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <span className="text-amber-400 block font-bold">SERVICES</span>
              <span className="text-slate-400 text-[10px]">Industrial Core</span>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <span className="text-emerald-400 block font-bold">MODELS</span>
              <span className="text-slate-400 text-[10px]">Residential Plain</span>
            </div>
          </div>
        </div>

        {/* ================= STAGE 5: EXPLORE CODE CITY ================= */}
        <div
          ref={stage5Ref}
          className="absolute inset-0 flex flex-col items-center justify-center text-center p-6"
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6 shadow-[0_0_25px_rgba(16,185,129,0.3)]">
            <Building className="w-8 h-8" />
          </div>
          <h2 className="font-display font-black text-5xl sm:text-7xl md:text-8xl text-white uppercase tracking-tight">
            NOW EXPLORE IT.
          </h2>
          <p className="mt-4 text-slate-300 text-base sm:text-lg max-w-xl leading-relaxed">
            The interactive topology is assembled. Inspect individual buildings, spot technical debt hotspots, and uncover monster files.
          </p>
          <a
            href="#city"
            className="mt-8 inline-flex items-center space-x-3 px-8 py-4 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-sm tracking-wider uppercase transition-all duration-200 shadow-glow-cyan"
          >
            <span>ENTER THE INTERACTIVE CITY</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>

      <div className="absolute bottom-6 text-[11px] font-mono text-slate-400">
        SCROLL TO ADVANCE TRANSFORMATION PIPELINE
      </div>
    </section>
  );
};
