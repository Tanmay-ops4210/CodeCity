import React from 'react';
import { Search, Filter, SlidersHorizontal, RotateCcw, ShieldAlert } from 'lucide-react';
import { FilterState, RiskLevel } from '../types';

interface CityControlsProps {
  districts: string[];
  filterState: FilterState;
  onFilterChange: (newFilter: Partial<FilterState>) => void;
  onReset: () => void;
  riskCounts: Record<RiskLevel | 'ALL', number>;
  totalFilesCount: number;
}

export const CityControls: React.FC<CityControlsProps> = ({
  districts,
  filterState,
  onFilterChange,
  onReset,
  riskCounts,
  totalFilesCount,
}) => {
  const riskTiers: { level: 'ALL' | RiskLevel; label: string; color: string; dot: string }[] = [
    { level: 'ALL', label: 'ALL BUILDINGS', color: 'border-white/20 text-white', dot: 'bg-white' },
    { level: 'LOW', label: 'LOW RISK', color: 'border-emerald-500/40 text-emerald-400', dot: 'bg-emerald-400' },
    { level: 'MEDIUM', label: 'MEDIUM', color: 'border-amber-500/40 text-amber-400', dot: 'bg-amber-400' },
    { level: 'HIGH', label: 'HIGH RISK', color: 'border-red-500/40 text-red-400', dot: 'bg-red-400' },
    { level: 'CRITICAL', label: 'CRITICAL', color: 'border-rose-700/60 text-rose-300', dot: 'bg-rose-600' },
  ];

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[#0a0e17]/90 border border-white/10 backdrop-blur-xl shadow-2xl mb-6">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={filterState.searchQuery}
            onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
            placeholder="Search files or modules (e.g., payment, auth)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-mono transition-all duration-200"
          />
          {filterState.searchQuery && (
            <button
              onClick={() => onFilterChange({ searchQuery: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 hover:text-white"
            >
              ESC
            </button>
          )}
        </div>

        {/* District Filter Dropdown */}
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-cyan-400" />
          <select
            value={filterState.district}
            onChange={(e) => onFilterChange({ district: e.target.value })}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="ALL" className="bg-[#0b0f17] text-white">
              ALL DISTRICTS ({districts.length})
            </option>
            {districts.map((d) => (
              <option key={d} value={d} className="bg-[#0b0f17] text-white">
                {d.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Min LOC Slider */}
        <div className="flex items-center space-x-3 text-xs font-mono text-slate-300">
          <span className="text-slate-400">MIN LOC:</span>
          <input
            type="range"
            min={0}
            max={500}
            step={25}
            value={filterState.minLoc}
            onChange={(e) => onFilterChange({ minLoc: Number(e.target.value) })}
            className="w-24 sm:w-28 accent-cyan-400 cursor-pointer"
          />
          <span className="w-10 text-right font-bold text-cyan-400">{filterState.minLoc}</span>
        </div>

        {/* Reset Filters */}
        {(filterState.risk !== 'ALL' ||
          filterState.district !== 'ALL' ||
          filterState.minLoc > 0 ||
          filterState.searchQuery) && (
          <button
            onClick={onReset}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-slate-300 hover:text-white transition-all"
            title="Reset active filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET</span>
          </button>
        )}
      </div>

      {/* Risk Tiers Selector Strip */}
      <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-mono tracking-wider text-slate-400 uppercase mr-2 flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5" />
          RISK TIER:
        </span>
        {riskTiers.map((tier) => {
          const isActive = filterState.risk === tier.level;
          const count = tier.level === 'ALL' ? totalFilesCount : riskCounts[tier.level] || 0;

          return (
            <button
              key={tier.level}
              onClick={() => onFilterChange({ risk: tier.level })}
              className={`inline-flex items-center space-x-2 px-3 py-1 rounded-lg text-xs font-mono tracking-wider border transition-all duration-200 ${
                isActive
                  ? `${tier.color} bg-white/10 font-bold shadow-sm`
                  : 'border-white/5 text-slate-400 hover:border-white/20 hover:text-slate-200 bg-white/[0.02]'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${tier.dot}`} />
              <span>{tier.label}</span>
              <span className="opacity-60 text-[10px]">({count})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
