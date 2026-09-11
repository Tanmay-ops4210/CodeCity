import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ArrowDownRight, Compass, ShieldAlert, Cpu, Sparkles } from 'lucide-react';
import { CityCanvas3D } from './CityCanvas3D';

interface HeroProps {
  onExploreClick: () => void;
  onOpenRepoModal: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onExploreClick, onOpenRepoModal }) => {
  const heroRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const badgesRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.fromTo(
        '.hero-tag',
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, delay: 0.2 }
      )
        .fromTo(
          '.hero-line',
          { y: 60, opacity: 0, skewY: 4 },
          { y: 0, opacity: 1, skewY: 0, duration: 1.1, stagger: 0.15 },
          '-=0.4'
        )
        .fromTo(
          subtitleRef.current,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9 },
          '-=0.6'
        )
        .fromTo(
          badgesRef.current?.children ? Array.from(badgesRef.current.children) : [],
          { scale: 0.9, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.6, stagger: 0.1 },
          '-=0.5'
        )
        .fromTo(
          ctaRef.current,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8 },
          '-=0.4'
        );
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex flex-col justify-center items-center pt-24 pb-16 px-4 sm:px-6 lg:px-8 tech-grid-bg overflow-hidden"
    >
      {/* 3D Isometric City Wireframe Matrix */}
      <CityCanvas3D />

      {/* Radial Glow Gradient */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-b from-cyan-500/10 via-amber-500/5 to-transparent blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto text-center flex flex-col items-center">
        {/* Technical Sub-Tag */}
        <div className="hero-tag inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono tracking-widest text-cyan-400 mb-8 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5" />
          <span>EXPERIMENTAL CODEBASE TOPOLOGY</span>
          <span className="text-white/30">•</span>
          <span className="text-slate-400">AST PARSER ENGINE</span>
        </div>

        {/* Large Editorial Headline */}
        <h1
          ref={headlineRef}
          className="font-display font-black text-6xl sm:text-7xl md:text-8xl lg:text-9xl tracking-tight text-white leading-[0.9] uppercase select-none"
        >
          <span className="hero-line block">YOUR</span>
          <span className="hero-line block text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">
            CODEBASE
          </span>
          <span className="hero-line block text-gradient-cyan">IS A CITY.</span>
        </h1>

        {/* Subtitle */}
        <p
          ref={subtitleRef}
          className="mt-8 max-w-2xl text-lg sm:text-xl text-slate-300 font-light tracking-wide leading-relaxed"
        >
          Explore the architecture, cyclomatic complexity, and technical debt hidden inside your repository.
          Folders become districts. Files become buildings. Color dictates risk.
        </p>

        {/* Technical Badges */}
        <div
          ref={badgesRef}
          className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs font-mono text-slate-400"
        >
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-white/5 border border-white/5">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span>BOX SIZE = PHYSICAL LOC</span>
          </div>
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-white/5 border border-white/5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>COLOR = CYCLOMATIC RISK</span>
          </div>
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-white/5 border border-white/5">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>DISTRICTS = FOLDER STRUCTURE</span>
          </div>
        </div>

        {/* CTAs */}
        <div
          ref={ctaRef}
          className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button
            onClick={onExploreClick}
            className="group relative inline-flex items-center space-x-3 px-8 py-4 rounded-xl bg-white text-[#06080d] font-bold text-sm tracking-wider uppercase hover:bg-cyan-300 transition-all duration-300 shadow-[0_0_35px_-5px_rgba(255,255,255,0.3)] hover:shadow-glow-cyan hover:scale-[1.02]"
          >
            <span>EXPLORE CODE CITY</span>
            <ArrowDownRight className="w-4 h-4 transition-transform group-hover:translate-x-1 group-hover:translate-y-1" />
          </button>

          <button
            onClick={onOpenRepoModal}
            className="inline-flex items-center space-x-2 px-7 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 text-sm font-mono tracking-wider transition-all duration-200 hover:border-cyan-500/40"
          >
            <span>SCAN REPOSITORY</span>
          </button>
        </div>
      </div>

      {/* Coordinate & Version stamp at footer of hero */}
      <div className="absolute bottom-6 left-8 right-8 hidden lg:flex justify-between items-center text-[10px] font-mono tracking-widest text-slate-400">
        <div>SYS: AST_PARSER_V2 // ZERO_EXECUTION_SANDBOX</div>
        <div>COORDINATES: LAT 37.7749° N, LONG 122.4194° W</div>
        <div>SCROLL TO ENTER TOPOLOGY ↓</div>
      </div>
    </section>
  );
};
