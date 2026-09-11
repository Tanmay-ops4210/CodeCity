import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { EditorialStory } from './components/EditorialStory';
import { CodeToCityStory } from './components/CodeToCityStory';
import { MetricsHUD } from './components/MetricsHUD';
import { CityControls } from './components/CityControls';
import { CodeCityTreemap } from './components/CodeCityTreemap';
import { BuildingInspector } from './components/BuildingInspector';
import { RiskAnalysis } from './components/RiskAnalysis';
import { RefactoringAdvice } from './components/RefactoringAdvice';
import { RepoModal } from './components/RepoModal';
import { Footer } from './components/Footer';

import { checkServerHealth, fetchDemoAnalysis, HealthStatus } from './services/api';
import { AnalysisResult, CodeFile, FilterState, RiskLevel } from './types';
import { DEMO_DATA } from './data/demoData';

export const App: React.FC = () => {
  const [data, setData] = useState<AnalysisResult>(DEMO_DATA);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [selectedFile, setSelectedFile] = useState<CodeFile | null>(null);
  const [isRepoModalOpen, setIsRepoModalOpen] = useState(false);

  const [filterState, setFilterState] = useState<FilterState>({
    risk: 'ALL',
    district: 'ALL',
    searchQuery: '',
    minLoc: 0,
    maxLoc: 5000,
  });

  // Check health and load initial demo data
  useEffect(() => {
    async function init() {
      const h = await checkServerHealth();
      setHealth(h);
      if (h?.status === 'online') {
        const liveDemo = await fetchDemoAnalysis();
        if (liveDemo && liveDemo.files && liveDemo.files.length > 0) {
          setData(liveDemo);
        }
      }
    }
    init();
  }, []);

  const handleFilterChange = (newFilter: Partial<FilterState>) => {
    setFilterState((prev) => ({ ...prev, ...newFilter }));
  };

  const handleResetFilters = () => {
    setFilterState({
      risk: 'ALL',
      district: 'ALL',
      searchQuery: '',
      minLoc: 0,
      maxLoc: 5000,
    });
  };

  const handleSelectFile = (file: CodeFile) => {
    setSelectedFile(file);
    // Smooth scroll to Code City section if selected from leaderboards
    const cityEl = document.getElementById('city');
    if (cityEl) {
      cityEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Compute risk counts for control buttons
  const riskCounts: Record<RiskLevel | 'ALL', number> = {
    ALL: data.files.length,
    LOW: data.files.filter((f) => f.risk === 'LOW').length,
    MEDIUM: data.files.filter((f) => f.risk === 'MEDIUM').length,
    HIGH: data.files.filter((f) => f.risk === 'HIGH').length,
    CRITICAL: data.files.filter((f) => f.risk === 'CRITICAL').length,
  };

  return (
    <div className="min-h-screen bg-[#06080d] text-slate-100 flex flex-col font-sans selection:bg-cyan-400 selection:text-black">
      {/* Top Navbar */}
      <Navbar
        health={health}
        onOpenRepoModal={() => setIsRepoModalOpen(true)}
        activeRepoName={data.repository}
      />

      {/* 01 — Hero */}
      <Hero
        onExploreClick={() => {
          document.getElementById('city')?.scrollIntoView({ behavior: 'smooth' });
        }}
        onOpenRepoModal={() => setIsRepoModalOpen(true)}
      />

      {/* 02 — Editorial Horizontal Scrub Story (Shopify Editions style) */}
      <EditorialStory />

      {/* 03 — From Code to City 5-Stage Pinned Transformation */}
      <CodeToCityStory />

      {/* 04 — Animated Metrics HUD */}
      <MetricsHUD data={data} />

      {/* 05 — Interactive Code City Treemap */}
      <section id="city" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#070a12] border-b border-white/5">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
            <div>
              <div className="flex items-center space-x-2 text-xs font-mono tracking-widest text-cyan-400 uppercase mb-2">
                <span>05 — VISUAL COMPLEXITY TOPOLOGY</span>
              </div>
              <h2 className="font-display font-black text-4xl sm:text-6xl text-white tracking-tight">
                INTERACTIVE <span className="text-gradient-cyan">CODE CITY</span>
              </h2>
            </div>
            <p className="mt-4 md:mt-0 text-xs font-mono text-slate-400 max-w-sm">
              Click any building to inspect internal telemetry, functions, classes, and architectural risks.
            </p>
          </div>

          {/* City Controls: Search, Risk tiers, Districts, LOC slider */}
          <CityControls
            districts={data.districts}
            filterState={filterState}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
            riskCounts={riskCounts}
            totalFilesCount={data.files.length}
          />

          {/* Interactive Plotly Treemap */}
          <CodeCityTreemap
            files={data.files}
            repoName={data.repository}
            filterState={filterState}
            onSelectFile={handleSelectFile}
            selectedFile={selectedFile}
          />
        </div>
      </section>

      {/* 06 — Risk Analysis & Debt Leaderboards */}
      <RiskAnalysis data={data} onSelectFile={handleSelectFile} />

      {/* 07 — Refactoring Targets & Monster File Decompositions */}
      <RefactoringAdvice data={data} onSelectFile={handleSelectFile} />

      {/* Slide-over Building Inspector Drawer */}
      <BuildingInspector file={selectedFile} onClose={() => setSelectedFile(null)} />

      {/* Local Path & Architecture Preset Selector Modal */}
      <RepoModal
        isOpen={isRepoModalOpen}
        onClose={() => setIsRepoModalOpen(false)}
        onDataLoaded={(newData) => {
          setData(newData);
          setSelectedFile(null);
        }}
        health={health}
        activeRepoName={data.repository}
      />

      {/* Technical Footer */}
      <Footer />
    </div>
  );
};

export default App;
