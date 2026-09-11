import React, { useEffect, useState } from 'react';
import { Activity, ShieldCheck, Layers, AlertTriangle, Compass, Terminal } from 'lucide-react';
import { HealthStatus } from '../services/api';

interface NavbarProps {
  health: HealthStatus | null;
  onOpenRepoModal: () => void;
  activeRepoName: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  health,
  onOpenRepoModal,
  activeRepoName
}) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        setScrollProgress((window.scrollY / totalHeight) * 100);
      }
      setIsScrolled(window.scrollY > 40);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#06080d]/85 backdrop-blur-xl border-b border-white/10 shadow-2xl py-3'
          : 'bg-transparent py-5'
      }`}
    >
      {/* Top Scroll Progress Bar */}
      <div
        className="absolute top-0 left-0 h-[2px] bg-gradient-to-r from-cyan-400 via-amber-400 to-red-500 transition-all duration-100 ease-out z-50"
        style={{ width: `${scrollProgress}%` }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-cyan-500/30 shadow-glow-cyan">
            <div className="w-2.5 h-2.5 bg-cyan-400 rounded-sm animate-pulse" />
          </div>
          <div>
            <a href="#" className="font-display font-black text-lg tracking-wider text-white flex items-center gap-2">
              CODE <span className="text-cyan-400">CITY</span>
            </a>
            <span className="text-[10px] font-mono tracking-widest text-slate-400 block -mt-1">
              COMPLEXITY TOPOLOGY
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center space-x-8 text-xs font-mono tracking-wider uppercase text-slate-300">
          <a href="#story" className="hover:text-cyan-400 transition-colors">
            Story
          </a>
          <a href="#how-it-works" className="hover:text-cyan-400 transition-colors">
            Architecture
          </a>
          <a href="#metrics" className="hover:text-cyan-400 transition-colors">
            Metrics
          </a>
          <a href="#city" className="hover:text-cyan-400 transition-colors">
            Code City
          </a>
          <a href="#debt" className="hover:text-cyan-400 transition-colors">
            Tech Debt
          </a>
          <a href="#refactoring" className="hover:text-cyan-400 transition-colors">
            Refactor
          </a>
        </nav>

        {/* Status Badge & Repo Switcher */}
        <div className="flex items-center space-x-3">
          {/* Status indicator */}
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                health?.status === 'online' ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
              }`}
            />
            <span className="hidden sm:inline text-slate-300 text-[11px]">
              {health?.status === 'online' ? 'ANALYZER ONLINE' : 'DEMO ENGINE ACTIVE'}
            </span>
          </div>

          {/* Repository trigger button */}
          <button
            onClick={onOpenRepoModal}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-mono transition-all duration-200"
            title="Switch or analyze repository"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="max-w-[120px] truncate font-medium">{activeRepoName}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
