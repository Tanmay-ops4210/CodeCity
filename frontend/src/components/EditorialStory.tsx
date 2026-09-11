import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Binary, FolderGit2, Cpu, Building2, Flame } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface EditorialCard {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
  borderColor: string;
  stats: string;
}

const CARDS: EditorialCard[] = [
  {
    id: 'code',
    number: '01',
    title: 'THE CODE',
    subtitle: 'RAW SYNTACTIC INVENTORY',
    description: 'Every statement, branching predicate, and loop forms the invisible structural load of your system.',
    icon: Binary,
    gradient: 'from-blue-600/20 via-cyan-500/10 to-transparent',
    borderColor: 'border-cyan-500/40',
    stats: '100% STATIC • ZERO RUNTIME',
  },
  {
    id: 'repository',
    number: '02',
    title: 'THE REPO',
    subtitle: 'FOLDER DISTRICT TOPOLOGY',
    description: 'Directories cease being cold file paths. They partition into industrial zones, commercial centers, and residential blocks.',
    icon: FolderGit2,
    gradient: 'from-indigo-600/20 via-purple-500/10 to-transparent',
    borderColor: 'border-indigo-500/40',
    stats: 'DISTRICTS BY NESTING DEPTH',
  },
  {
    id: 'analysis',
    number: '03',
    title: 'THE PARSER',
    subtitle: 'AST FLOW GRAPHING',
    description: 'Python built-in Abstract Syntax Tree audits decision points: IfExp, ExceptHandler, BoolOp, and comprehensions.',
    icon: Cpu,
    gradient: 'from-cyan-600/20 via-teal-500/10 to-transparent',
    borderColor: 'border-cyan-400/40',
    stats: 'MCCABE CYCLOMATIC FORMULA',
  },
  {
    id: 'city',
    number: '04',
    title: 'THE CITY',
    subtitle: 'MASS = PHYSICAL LOC',
    description: 'File size dictates the rectangular footprint. Monolithic files become towering sky-scrapers dominating the skyline.',
    icon: Building2,
    gradient: 'from-amber-600/20 via-orange-500/10 to-transparent',
    borderColor: 'border-amber-500/40',
    stats: 'BOX SIZE = NON-EMPTY LINES',
  },
  {
    id: 'complexity',
    number: '05',
    title: 'THE RISK',
    subtitle: 'HEATMAP SPECTRUM',
    description: 'Safe modules glow in emerald green. As nested branching escalates, buildings ignite into crimson and burgundy.',
    icon: Flame,
    gradient: 'from-red-600/25 via-rose-500/10 to-transparent',
    borderColor: 'border-red-500/40',
    stats: 'CRITICAL THRESHOLD > 25',
  },
];

export const EditorialStory: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>('.editorial-panel');

      gsap.to(cards, {
        xPercent: -100 * (cards.length - 1),
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          pin: true,
          scrub: 1,
          snap: 1 / (cards.length - 1),
          end: () => `+=${cards.length * 550}`,
          invalidateOnRefresh: true,
        },
      });

      // Subtle scale and parallax for individual cards
      cards.forEach((card) => {
        gsap.fromTo(
          card.querySelector('.card-visual'),
          { scale: 0.92, opacity: 0.7 },
          {
            scale: 1,
            opacity: 1,
            ease: 'power1.out',
            scrollTrigger: {
              trigger: card,
              containerAnimation: gsap.getTweensOf(cards)[0],
              start: 'left center',
              end: 'right center',
              scrub: true,
            },
          }
        );
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="relative h-screen bg-[#06080d] overflow-hidden flex flex-col justify-center border-t border-b border-white/5"
    >
      {/* Header bar */}
      <div className="absolute top-10 left-8 right-8 flex justify-between items-center z-20">
        <div className="flex items-center space-x-3">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-xs font-mono tracking-widest uppercase text-slate-400">
            02 — EDITORIAL TOPOLOGY
          </span>
        </div>
        <div className="text-xs font-mono text-slate-400">
          [HORIZONTAL SCRUB INTERACTION]
        </div>
      </div>

      {/* Horizontal Cards Strip */}
      <div
        ref={containerRef}
        className="flex h-[70vh] items-center pl-8 sm:pl-16 space-x-8 sm:space-x-12 w-[500vw] sm:w-[400vw] lg:w-[320vw]"
      >
        {CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className="editorial-panel w-[85vw] sm:w-[50vw] lg:w-[32vw] h-[55vh] sm:h-[58vh] flex-shrink-0"
            >
              <div
                className={`card-visual relative h-full rounded-2xl bg-[#0c1019] border ${card.borderColor} p-8 sm:p-10 flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-300 hover:border-white/30`}
              >
                {/* Background Gradient */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${card.gradient} pointer-events-none`}
                />

                {/* Card Top */}
                <div className="relative z-10 flex justify-between items-start">
                  <span className="font-mono text-3xl sm:text-4xl font-bold text-white/20">
                    {card.number}
                  </span>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-cyan-300">
                    <Icon className="w-6 h-6" />
                  </div>
                </div>

                {/* Card Middle */}
                <div className="relative z-10 my-auto">
                  <div className="text-[11px] font-mono tracking-widest text-cyan-400 uppercase mb-2">
                    {card.subtitle}
                  </div>
                  <h3 className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight leading-tight">
                    {card.title}
                  </h3>
                  <p className="mt-4 text-sm sm:text-base text-slate-300 font-light leading-relaxed">
                    {card.description}
                  </p>
                </div>

                {/* Card Bottom Meta */}
                <div className="relative z-10 pt-4 border-t border-white/10 flex justify-between items-center text-xs font-mono text-slate-400">
                  <span>METRIC:</span>
                  <span className="text-white tracking-wider">{card.stats}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer scrubber notice */}
      <div className="absolute bottom-8 left-8 right-8 flex justify-between items-center text-[11px] font-mono text-slate-400">
        <span>← DRAG OR SCROLL HORIZONTALLY →</span>
        <span>THE CINEMATIC METRICS PIPELINE</span>
      </div>
    </section>
  );
};
