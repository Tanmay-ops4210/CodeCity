import React, { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import { CodeFile, FilterState } from '../types';

interface CodeCityTreemapProps {
  files: CodeFile[];
  repoName: string;
  filterState: FilterState;
  onSelectFile: (file: CodeFile) => void;
  selectedFile: CodeFile | null;
}

export const CodeCityTreemap: React.FC<CodeCityTreemapProps> = ({
  files,
  repoName,
  filterState,
  onSelectFile,
  selectedFile,
}) => {
  const plotContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!plotContainerRef.current || !files || files.length === 0) return;

    // Build hierarchical Treemap structures
    // Root -> Districts -> Subdistricts -> Files
    const ids: string[] = ['root'];
    const labels: string[] = [repoName.toUpperCase()];
    const parents: string[] = [''];
    const values: number[] = [0];
    const colors: number[] = [0];
    const customdata: any[] = [null];

    const folderMap = new Set<string>();

    // First pass: create folder / district nodes
    files.forEach((f) => {
      const folderParts = f.folder.split('/').filter(Boolean);
      let currentPath = '';

      folderParts.forEach((part) => {
        const parentPath = currentPath ? `folder_${currentPath}` : 'root';
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        const folderId = `folder_${currentPath}`;

        if (!folderMap.has(folderId)) {
          folderMap.add(folderId);
          ids.push(folderId);
          labels.push(`${part.toUpperCase()}`);
          parents.push(parentPath);
          values.push(0);
          colors.push(0); // Neutral color for district folders
          customdata.push(null);
        }
      });
    });

    // Second pass: add file building leaves
    files.forEach((f) => {
      // Determine if file satisfies active filters
      const matchesRisk = filterState.risk === 'ALL' || f.risk === filterState.risk;
      const matchesDistrict =
        filterState.district === 'ALL' ||
        f.folder === filterState.district ||
        f.folder.startsWith(`${filterState.district}/`);
      const matchesLoc = f.loc >= filterState.minLoc;
      const query = filterState.searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        f.name.toLowerCase().includes(query) ||
        f.path.toLowerCase().includes(query) ||
        f.folder.toLowerCase().includes(query);

      const isVisible = matchesRisk && matchesDistrict && matchesLoc;
      if (!isVisible) return;

      const fileId = `file_${f.path}`;
      const parentId = f.folder && f.folder !== 'root' ? `folder_${f.folder}` : 'root';

      // Dim non-matching search results if user is actively searching
      let complexityVal = f.complexity;
      if (query && !matchesSearch) {
        complexityVal = 0.5; // Will render muted/dim
      }

      ids.push(fileId);
      labels.push(f.name);
      parents.push(parentId);
      values.push(f.loc);
      colors.push(complexityVal);
      customdata.push(f);
    });

    // Color gradient matching technical risk:
    // 0 -> #1e293b (muted/dim or district)
    // 1-5 -> #10b981 (Low: Emerald)
    // 6-10 -> #f59e0b (Medium: Amber)
    // 11-25 -> #ef4444 (High: Crimson)
    // 26+ -> #7f1d1d (Critical: Deep Burgundy)
    const customColorscale = [
      [0.0, '#111827'],
      [0.1, '#10b981'],
      [0.25, '#34d399'],
      [0.4, '#f59e0b'],
      [0.6, '#f97316'],
      [0.75, '#ef4444'],
      [1.0, '#7f1d1d'],
    ];

    // Hovertemplate matching Section 8 format
    const hovertemplate =
      '<b>FILE:</b> %{label}<br>' +
      '<b>DISTRICT:</b> %{parent}<br>' +
      '<b>LINES (LOC):</b> %{value:,}<br>' +
      '<b>COMPLEXITY:</b> %{color:.0f}<br>' +
      '<extra></extra>';

    const data: Plotly.Data[] = [
      {
        type: 'treemap',
        ids,
        labels,
        parents,
        values,
        branchvalues: 'remainder',
        marker: {
          colors,
          colorscale: customColorscale as any,
          cmin: 1,
          cmax: 40,
          colorbar: {
            title: {
              text: '<b>COMPLEXITY RISK</b>',
              font: { color: '#94a3b8', family: 'JetBrains Mono, monospace', size: 11 },
            },
            tickvals: [2, 8, 18, 32],
            ticktext: ['LOW', 'MED', 'HIGH', 'CRITICAL'],
            tickfont: { color: '#cbd5e1', family: 'JetBrains Mono, monospace', size: 10 },
            len: 0.75,
            thickness: 14,
            outlinewidth: 1,
            outlinecolor: 'rgba(255,255,255,0.1)',
            bgcolor: 'rgba(11,15,23,0.8)',
          },
          line: {
            width: 1.5,
            color: '#06080d',
          },
          pad: {
            inner: 3,
            top: 24,
            left: 6,
            right: 6,
            bottom: 6,
          },
        },
        textfont: {
          family: 'JetBrains Mono, Space Grotesk, monospace',
          size: 12,
          color: '#ffffff',
        },
        pathbar: {
          visible: true,
          side: 'top',
          thickness: 24,
          textfont: {
            family: 'JetBrains Mono, monospace',
            size: 11,
            color: '#00f2fe',
          },
        },
        hovertemplate,
        customdata,
      } as any,
    ];

    const layout: Partial<Plotly.Layout> = {
      margin: { l: 0, r: 0, b: 0, t: 0 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      autosize: true,
      hoverlabel: {
        bgcolor: '#0f172a',
        bordercolor: '#00f2fe',
        font: {
          family: 'JetBrains Mono, monospace',
          size: 12,
          color: '#f8fafc',
        },
      },
    };

    const config: Partial<Plotly.Config> = {
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
      modeBarButtonsToRemove: [
        'lasso2d',
        'select2d',
        'hoverClosestCartesian',
        'hoverCompareCartesian',
      ],
      toImageButtonOptions: {
        format: 'png',
        filename: `${repoName}-codecity-topology`,
        height: 800,
        width: 1200,
        scale: 2,
      },
    };

    Plotly.react(plotContainerRef.current, data, layout, config);

    // Attach click listener for building telemetry inspector
    const plotEl = plotContainerRef.current as any;
    const handleClick = (eventData: any) => {
      if (eventData?.points?.[0]?.customdata) {
        const fileObj = eventData.points[0].customdata as CodeFile;
        onSelectFile(fileObj);
      }
    };

    plotEl.on('plotly_click', handleClick);

    const handleResize = () => {
      if (plotContainerRef.current) {
        Plotly.Plots.resize(plotContainerRef.current);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (plotEl?.removeAllListeners) {
        plotEl.removeAllListeners('plotly_click');
      }
    };
  }, [files, repoName, filterState, onSelectFile]);

  return (
    <div className="relative w-full h-[650px] sm:h-[720px] rounded-2xl bg-[#090d16] border border-white/10 overflow-hidden shadow-2xl p-2 sm:p-4">
      {/* City Legend Header */}
      <div className="absolute top-4 left-4 z-10 hidden sm:flex items-center space-x-3 px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 text-[11px] font-mono backdrop-blur-md">
        <span className="text-slate-400">MAP KEY:</span>
        <span className="text-emerald-400">● LOW</span>
        <span className="text-amber-400">● MED</span>
        <span className="text-red-400">● HIGH</span>
        <span className="text-rose-600 font-bold">● CRITICAL</span>
        <span className="text-white/20">|</span>
        <span className="text-cyan-300">AREA = LOC</span>
      </div>

      {/* Plotly Container */}
      <div ref={plotContainerRef} className="w-full h-full" />
    </div>
  );
};
