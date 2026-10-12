import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import createPlotlyComponent from 'react-plotly.js/factory';
import Plotly from 'plotly.js-gl3d-dist-min';
import {
  Activity, AlertTriangle, Box, Braces, Check,
  ChevronDown, ChevronsLeft, ChevronsRight, CircleHelp, CloudUpload,
  Code2, FileCode2, Gauge, GitBranch, GitFork, Layers3, Menu, Moon,
  RotateCcw, Search, ShieldCheck, Sparkles, Sun, X,
} from 'lucide-react';
import {
  getGetCodeCityDemoQueryKey,
  getHealthCheckQueryKey,
  useAnalyzeCodeCityUpload,
  useGetCodeCityDemo,
  useHealthCheck,
} from '@workspace/api-client-react';
import type { FileAnalysis, ProjectAnalysis } from '@workspace/api-client-react';
import { filterProjectFiles, layoutTreemap, makeCityTraces, type LevelFilter, type TreemapTile } from '../lib/code-city-model';
import { FunctionAnalysis } from '../components/function-analysis';
import { DependencyGraph } from '../components/dependency-graph';
import { RefactoringAdvisor } from '../components/refactoring-advisor';

const Plot = createPlotlyComponent(Plotly);

const languageColors = ['#59c8d6', '#a994ff', '#6fce9c', '#efbd62', '#ef8580', '#6aa6ec', '#d88acb', '#9da9b7'];
const bytes = (value: number) => value < 1024 ? `${value} B` : value < 1024 * 1024 ? `${(value / 1024).toFixed(1)} KB` : `${(value / 1024 / 1024).toFixed(2)} MB`;
const metricValue = (value: number | null | undefined) => value == null ? '—' : value.toLocaleString();
const languageColor = (index: number) => languageColors[index % languageColors.length];
const dateLabel = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};
const cx = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ');

function SkeletonDashboard() {
  return (
    <div className="content" aria-label="Loading project analysis" data-testid="status-analysis-loading">
      <div className="skeleton" style={{ width: 220, height: 27, marginBottom: 23 }} />
      <div className="metric-grid">{[0, 1, 2, 3, 4, 5].map((item) => <div className="skeleton" key={item} style={{ height: 94 }} />)}</div>
      <div className="skeleton" style={{ height: 470, marginBottom: 18 }} />
      <div className="skeleton" style={{ height: 260 }} />
    </div>
  );
}

export default function Dashboard() {
  const [uploadedAnalysis, setUploadedAnalysis] = useState<ProjectAnalysis | null>(null);
  const [selectedPath, setSelectedPath] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [contrast, setContrast] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<LevelFilter>('all');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [directoryFilter, setDirectoryFilter] = useState('all');
  const [sort, setSort] = useState<'complexity' | 'loc' | 'name'>('complexity');
  const [fileError, setFileError] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const globalSearch = useRef<HTMLInputElement>(null);
  const projectMenuRef = useRef<HTMLDivElement>(null);
  const projectTriggerRef = useRef<HTMLButtonElement>(null);

  const demoQuery = useGetCodeCityDemo({ query: { queryKey: getGetCodeCityDemoQueryKey(), enabled: !uploadedAnalysis, retry: 1 } });
  const healthQuery = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), retry: 1 } });
  const upload = useAnalyzeCodeCityUpload();
  const analysis = uploadedAnalysis ?? demoQuery.data;

  const visibleFiles = useMemo(() => filterProjectFiles(analysis?.files ?? [], {
    query,
    complexity: filter,
    language: languageFilter,
    directory: directoryFilter,
    sort,
  }), [analysis, query, filter, languageFilter, directoryFilter, sort]);
  const selected = analysis?.files.find((file) => file.path === selectedPath) ?? null;
  const hotspots = useMemo(() => [...(analysis?.files ?? [])].filter((file) => file.complexity != null && !file.analysisError).sort((a, b) => (b.complexity ?? -1) - (a.complexity ?? -1)).slice(0, 5), [analysis]);
  const cityFiles = visibleFiles;
  const plotData = useMemo(() => makeCityTraces(cityFiles, analysis?.directories ?? []), [cityFiles, analysis]);
  const treemapTiles = useMemo(() => layoutTreemap(cityFiles), [cityFiles]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        globalSearch.current?.focus();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  useEffect(() => {
    if (!projectMenuOpen) return;
    projectMenuRef.current?.querySelector<HTMLButtonElement>('[role="menuitemradio"]')?.focus();
    const handlePointerDown = (event: PointerEvent) => {
      if (!projectMenuRef.current?.contains(event.target as Node)) setProjectMenuOpen(false);
    };
    const handleMenuKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProjectMenuOpen(false);
        projectTriggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleMenuKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleMenuKeyDown);
    };
  }, [projectMenuOpen]);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const context = window.WebGLRenderingContext ? canvas.getContext('webgl2') || canvas.getContext('webgl') : null;
      setWebglAvailable(Boolean(context));
      context?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
      setWebglAvailable(false);
    }
  }, []);

  const chooseFile = (path: string) => {
    setSelectedPath(path);
    if (window.innerWidth < 800) setMobileNav(false);
  };
  const handleUpload = (file?: File) => {
    if (!file) return;
    setFileError('');
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setFileError('Choose a .zip archive to analyze a software project.');
      return;
    }
    setSelectedPath('');
    upload.mutate({ data: { file } }, {
      onSuccess: (payload) => {
        setUploadedAnalysis(payload);
        setQuery('');
        setFilter('all');
        setLanguageFilter('all');
        setDirectoryFilter('all');
      },
    });
  };
  const resetSelection = () => setSelectedPath('');
  const selectDemoProject = () => {
    setUploadedAnalysis(null);
    setSelectedPath('');
    setQuery('');
    setFilter('all');
    setLanguageFilter('all');
    setDirectoryFilter('all');
    setProjectMenuOpen(false);
    projectTriggerRef.current?.focus();
    void demoQuery.refetch();
  };
  const keepUploadedProject = () => {
    setProjectMenuOpen(false);
    projectTriggerRef.current?.focus();
  };
  const errorData = upload.error as { data?: { detail?: string }; message?: string } | null;
  const errorDetail = errorData?.data?.detail;

  if (!analysis && demoQuery.isLoading) return <div className={cx('shell', contrast && 'theme-contrast')}><SkeletonDashboard /></div>;

  return (
    <div className={cx('shell', contrast && 'theme-contrast')}>
      <aside className={cx('sidebar', collapsed && 'collapsed', mobileNav && 'mobile-open')} aria-label="Main navigation">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true"><Layers3 size={19} /></div>
          <span className="brand-name">Code City</span>
          <button className="icon-button" style={{ marginLeft: 'auto', width: 26, height: 26 }} aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} data-testid="button-collapse-navigation" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
          </button>
        </div>
        <div className="nav-section">Workspace</div>
        <button className="nav-item active" data-testid="nav-city-overview" onClick={resetSelection}><Gauge size={16} /><span>City overview</span></button>
        <button className="nav-item" data-testid="nav-file-explorer" onClick={() => document.getElementById('file-explorer')?.scrollIntoView({ behavior: 'smooth' })}><FileCode2 size={16} /><span>File explorer</span></button>
        <button className="nav-item" data-testid="nav-hotspots" onClick={() => document.getElementById('hotspots')?.scrollIntoView({ behavior: 'smooth' })}><Activity size={16} /><span>Complexity hotspots</span></button>
        <div className="nav-section">Advanced Intelligence</div>
        <button className="nav-item" data-testid="nav-function-analysis" onClick={() => document.getElementById('function-analysis')?.scrollIntoView({ behavior: 'smooth' })}><Code2 size={16} /><span>Function analysis</span></button>
        <button className="nav-item" data-testid="nav-dependency-graph" onClick={() => document.getElementById('dependency-graph')?.scrollIntoView({ behavior: 'smooth' })}><GitFork size={16} /><span>Dependency graph</span></button>
        <button className="nav-item" data-testid="nav-refactoring-advisor" onClick={() => document.getElementById('refactoring-advisor')?.scrollIntoView({ behavior: 'smooth' })}><Sparkles size={16} /><span>Refactoring advisor</span></button>
        <div className="nav-section">Analysis</div>
        <button className="nav-item" data-testid="nav-metrics" onClick={() => document.getElementById('metrics')?.scrollIntoView({ behavior: 'smooth' })}><Braces size={16} /><span>Code metrics</span></button>
        <div className="sidebar-bottom">
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#718091', fontSize: 10 }}>
            <span className={cx('dot', healthQuery.data ? 'low' : healthQuery.isError ? 'high' : 'medium')} />
            <span data-testid="status-api-health">{healthQuery.isLoading ? 'Checking API' : healthQuery.data ? `Analysis API · ${healthQuery.data.status}` : healthQuery.isError ? 'API unavailable' : 'API connecting'}</span>
          </div>
        </div>
      </aside>
      {mobileNav && <button aria-label="Close navigation" className="nav-scrim" data-testid="button-close-mobile-navigation" onClick={() => setMobileNav(false)} />}
      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open navigation" data-testid="button-open-mobile-navigation" onClick={() => setMobileNav(true)}><Menu size={17} /></button>
          <div className="project-picker" ref={projectMenuRef}>
            <button
              ref={projectTriggerRef}
              type="button"
              className="project-select"
              aria-label={`Active project: ${analysis?.projectName ?? 'Project analysis'}`}
              aria-haspopup="menu"
              aria-expanded={projectMenuOpen}
              aria-controls="project-selector-menu"
              data-testid="button-active-project"
              onClick={() => setProjectMenuOpen((open) => !open)}
            >
              <GitBranch size={14} color="#53ccda" />
              <span className="project-label" data-testid="text-active-project">{analysis?.projectName ?? 'Project analysis'}</span>
              <ChevronDown size={13} color="#758293" />
            </button>
            {projectMenuOpen && <div className="project-menu" role="menu" id="project-selector-menu" aria-label="Select project" data-testid="menu-project-selector">
              <div className="project-menu-heading">SWITCH PROJECT</div>
              <button type="button" role="menuitemradio" aria-checked={!uploadedAnalysis} className="project-menu-item" data-testid="menuitem-demo-project" onClick={selectDemoProject}>
                <span className="project-menu-icon"><Layers3 size={14} /></span>
                <span className="project-menu-copy"><span>Demo project</span><small>{demoQuery.data?.projectName ?? 'Deterministic sample'}</small></span>
                {!uploadedAnalysis && <Check className="project-menu-check" size={14} />}
              </button>
              {uploadedAnalysis && <button type="button" role="menuitemradio" aria-checked className="project-menu-item" data-testid="menuitem-uploaded-project" onClick={keepUploadedProject}>
                <span className="project-menu-icon"><FileCode2 size={14} /></span>
                <span className="project-menu-copy"><span>{uploadedAnalysis.projectName}</span><small>Uploaded project</small></span>
                <Check className="project-menu-check" size={14} />
              </button>}
              <div className="project-menu-divider" />
              <button type="button" role="menuitem" className="project-menu-item project-menu-upload" data-testid="menuitem-upload-project" onClick={() => { setProjectMenuOpen(false); fileInput.current?.click(); }}>
                <span className="project-menu-icon"><CloudUpload size={14} /></span>
                <span className="project-menu-copy"><span>Upload / replace project</span><small>Analyze a multi-language ZIP archive</small></span>
              </button>
            </div>}
          </div>
          <div className="topbar-spacer" />
          <label className="search-wrap" aria-label="Search project files">
            <Search size={14} />
            <input ref={globalSearch} type="search" value={query} placeholder="Search files…" aria-label="Search files" data-testid="input-global-search" onChange={(event) => setQuery(event.target.value)} />
            <span className="shortcut" aria-hidden="true">⌘ K</span>
          </label>
          <button className="icon-button" aria-label={contrast ? 'Use standard theme' : 'Use brighter theme'} title="Toggle display theme" data-testid="button-toggle-theme" onClick={() => setContrast(!contrast)}>{contrast ? <Sun size={15} /> : <Moon size={15} />}</button>
          <button className="icon-button" aria-label="Complexity help" aria-expanded={showHelp} title="Complexity is parser-backed for Python, JavaScript, TypeScript, Java, C, and C++" data-testid="button-complexity-help" onClick={() => setShowHelp(!showHelp)}><CircleHelp size={15} /></button>
        </header>
        <div className="content">
          {!analysis && demoQuery.isError ? (
            <div className="section-card empty-state" data-testid="status-analysis-failed">
              <div className="empty-mark"><AlertTriangle size={23} /></div>
              <div className="empty-title">Couldn’t load the demo analysis</div>
              <p className="empty-copy">The analysis service did not return project data. Retry the request or upload a multi-language project archive.</p>
              <input ref={fileInput} type="file" accept=".zip,application/zip" hidden data-testid="input-project-archive" onChange={(event) => { handleUpload(event.target.files?.[0]); event.currentTarget.value = ''; }} />
              <div className="actions" style={{ marginTop: 18 }}>
                <button className="btn" data-testid="button-retry-demo" onClick={() => void demoQuery.refetch()}><RotateCcw size={14} /> Retry</button>
                <button className="btn btn-primary" data-testid="button-upload-from-error" onClick={() => fileInput.current?.click()}><CloudUpload size={14} /> Upload ZIP</button>
              </div>
            </div>
          ) : analysis ? (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">Multi-language project analysis</div>
                  <h1 className="page-title display">{analysis.projectName}</h1>
                  <div className="subtle" data-testid="text-analysis-meta">Analyzed {dateLabel(analysis.analyzedAt)} <span style={{ color: '#505c6b', margin: '0 6px' }}>·</span> {analysis.summary}</div>
                </div>
                <div className="actions">
                  <input ref={fileInput} type="file" accept=".zip,application/zip" hidden data-testid="input-project-archive" onChange={(event) => { handleUpload(event.target.files?.[0]); event.currentTarget.value = ''; }} />
                  <button className="btn" data-testid="button-reload-demo" disabled={!uploadedAnalysis || upload.isPending} onClick={() => { setUploadedAnalysis(null); setSelectedPath(''); void demoQuery.refetch(); }}><RotateCcw size={14} /> Demo project</button>
                  <button className="btn btn-primary" data-testid="button-upload-project" disabled={upload.isPending} onClick={() => fileInput.current?.click()}><CloudUpload size={14} /> {upload.isPending ? 'Analyzing…' : 'Upload project'}</button>
                </div>
              </div>

              {analysis.isDemo && <div className="notice demo" data-testid="status-demo-project"><ShieldCheck size={13} style={{ verticalAlign: 'middle', marginRight: 7 }} />Deterministic demo data. Upload a .zip archive to analyze your own software project.</div>}
              {showHelp && <div className="notice demo" role="note" data-testid="status-complexity-explanation">Complexity is parser-backed for Python, JavaScript, TypeScript, Java, C and C++. Tree-sitter scores are syntactic approximations, not compiler or type-checker results. Other registered languages show neutral buildings because only line metrics are available.</div>}
              {fileError && <div className="notice error" role="alert" data-testid="status-upload-validation">{fileError}</div>}
              {upload.isPending && <div className="notice" role="status" data-testid="status-upload-progress"><Activity size={13} style={{ verticalAlign: 'middle', marginRight: 7 }} />Analyzing archive — building metrics from your source files.<div className="upload-progress"><span /></div></div>}
              {upload.isError && <div className="notice error" role="alert" data-testid="status-upload-error"><AlertTriangle size={13} style={{ verticalAlign: 'middle', marginRight: 7 }} />{errorDetail || upload.error?.message || 'Analysis failed. Check that the archive is a valid project ZIP and try again.'}</div>}
              {analysis.warnings.map((warning, index) => <div className="notice" key={`${index}-${warning}`} data-testid={`status-analysis-warning-${index}`}><AlertTriangle size={13} style={{ verticalAlign: 'middle', marginRight: 7 }} />{warning}</div>)}
              {analysis.manifests.length > 0 && <div className="notice demo" data-testid="status-project-manifests">Project metadata found: {analysis.manifests.join(', ')}. Manifests are not counted as source files.</div>}
              <details className="exclusion-details" data-testid="details-default-exclusions">
                <summary>Default exclusions · {analysis.excludedDirectories.length} matched</summary>
                <div>Directories ignored by default: .git, node_modules, .venv, venv, __pycache__, dist, build, .next, coverage, vendor, target, generated and common caches. {analysis.excludedDirectories.length > 0 ? `Matched paths: ${analysis.excludedDirectories.join(', ')}.` : 'No matching source directories were present.'}</div>
              </details>

              <section className="metric-grid" id="metrics" aria-label="Project metrics" data-testid="section-project-metrics">
                <Metric label="Source files" value={analysis.stats.sourceFiles} note={`${analysis.stats.analyzedFiles} analyzed`} />
                <Metric label="Lines of code" value={analysis.stats.linesOfCode.toLocaleString()} note={`${analysis.stats.totalLines.toLocaleString()} physical · ${analysis.stats.filesWithLineMetrics} files`} />
                <Metric label="Languages" value={analysis.stats.languagesDetected} note="detected" />
                <Metric label="Functions" value={metricValue(analysis.stats.functions)} note={`${analysis.stats.filesWithFunctionMetrics} files measured`} />
                <Metric label="Classes" value={metricValue(analysis.stats.classes)} note={`${analysis.stats.filesWithClassMetrics} files measured`} />
                <Metric label="Complexity files" value={analysis.stats.filesWithComplexity} note={`${analysis.stats.highComplexityFiles} high`} />
                <Metric label="Parsing errors" value={analysis.stats.parsingErrors} note="isolated files" />
                <Metric label="Unavailable metrics" value={analysis.stats.unavailableMetricCount} note={`${analysis.stats.filesWithUnavailableMetrics} files affected`} />
              </section>

              <section className="section-card language-card" aria-label="Language distribution" data-testid="section-language-distribution">
                <div className="section-head"><div className="section-title">Language distribution</div><div className="section-meta">SELECT A LANGUAGE TO FILTER</div></div>
                {analysis.stats.filesByLanguage.length ? <div className="language-list">
                  {analysis.stats.filesByLanguage.map((item, index) => {
                    const percent = analysis.stats.sourceFiles ? (item.files / analysis.stats.sourceFiles) * 100 : 0;
                    return <button type="button" key={item.language} className={cx('language-item', languageFilter === item.language && 'selected')} aria-pressed={languageFilter === item.language} data-testid={`button-language-${item.language.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`} onClick={() => setLanguageFilter(languageFilter === item.language ? 'all' : item.language)}>
                      <span className="language-item-top"><span className="language-name"><i style={{ background: languageColor(index) }} />{item.language}</span><span className="language-stat">{item.files} files · {item.loc.toLocaleString()} LOC</span></span>
                      <span className="language-track"><i style={{ width: `${percent}%`, background: languageColor(index) }} /></span>
                      <span className="language-item-foot">{item.filesWithComplexity} files with complexity metrics · {item.analyzedFiles} analyzed</span>
                    </button>;
                  })}
                </div> : <div className="language-empty">No supported source languages were found.</div>}
              </section>

              <section className="section-card city-card" aria-label="Interactive 3D code city">
                <div className="section-head">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}><div className="section-title">Code city</div><span className="section-meta">3D SOURCE MAP</span></div>
                  <div className="section-meta">{cityFiles.length} buildings <span style={{ margin: '0 5px' }}>·</span> drag to orbit</div>
                </div>
                {analysis.files.length === 0 ? <EmptyState title="No source buildings yet" copy="This project has no registered source files to map. Upload a different archive to explore its source structure." /> : cityFiles.length === 0 ? <EmptyState title="No buildings match these filters" copy="Adjust the language, complexity, folder, or search filters to show files in the city." /> : webglAvailable === false ? (
                  <>
                    <div className="notice demo treemap-fallback-notice" role="status" data-testid="status-2d-fallback">2D treemap fallback · The interactive 3D city is available on WebGL-enabled devices.</div>
                    <Treemap tiles={treemapTiles} selectedPath={selectedPath} onSelect={chooseFile} />
                  </>
                ) : webglAvailable === null ? (
                  <div className="city-plot" role="status" data-testid="status-graphics-check"><div className="graphics-check"><span className="skeleton" style={{ width: 180, height: 12 }} />Checking graphics support…</div></div>
                ) : (
                  <div className="city-plot">
                    <div className="plot-overlay"><span className="plot-chip">HEIGHT · LOC</span><span className="plot-chip">FOOTPRINT · FILE SIZE</span></div>
                    <Plot
                      data={plotData as never}
                      layout={{
                        autosize: true, paper_bgcolor: '#121821', plot_bgcolor: '#121821',
                        margin: { l: 0, r: 0, t: 8, b: 0 }, showlegend: true,
                        legend: { orientation: 'h', x: 0.67, y: 0.98, bgcolor: 'rgba(18,24,33,.8)', font: { color: '#aab5c2', size: 10 } },
                        scene: {
                          bgcolor: '#121821',
                          xaxis: { visible: false, showgrid: false, zeroline: false },
                          yaxis: { visible: false, showgrid: false, zeroline: false },
                          zaxis: { title: { text: 'LOC', font: { color: '#8693a2', size: 10 } }, color: '#657283', gridcolor: '#25303b', zerolinecolor: '#34404c', tickfont: { color: '#778494', size: 9 } },
                          camera: { eye: { x: 1.65, y: 1.8, z: 1.25 } },
                          aspectmode: 'manual', aspectratio: { x: 1.45, y: 1.2, z: 0.8 },
                        },
                        font: { family: 'DM Sans', color: '#dce4ed' },
                      }}
                      config={{ responsive: true, displaylogo: false, scrollZoom: true, modeBarButtonsToRemove: ['lasso3d', 'select3d'], toImageButtonOptions: { format: 'png', filename: 'code-city' } }}
                      useResizeHandler
                      style={{ width: '100%', height: '100%' }}
                      onClick={(event: any) => {
                        const path = event.points?.[0]?.customdata?.[0];
                        if (path) chooseFile(path);
                      }}
                    />
                  </div>
                )}
                <div className="city-caption">
                  <span className="legend-item"><i className="dot low" />Low complexity</span>
                  <span className="legend-item"><i className="dot medium" />Medium complexity</span>
                  <span className="legend-item"><i className="dot high" />High complexity</span>
                  <span className="legend-item"><i className="dot unavailable" />Unavailable</span>
                  <span style={{ marginLeft: 'auto' }}>Language is shown separately · neutral means no parser metric</span>
                </div>
              </section>

              <div className="data-layout">
                <section className="section-card" id="file-explorer" aria-label="Project file explorer">
                  <div className="section-head"><div className="section-title">File explorer</div><div className="section-meta">{visibleFiles.length} / {analysis.files.length} files</div></div>
                  <div className="explorer-head">
                    <label className="explorer-search"><Search size={13} /><input aria-label="Filter files" placeholder="Filter by filename or path" value={query} data-testid="input-file-filter" onChange={(event) => setQuery(event.target.value)} /></label>
                    <select className="filter-select" aria-label="Filter by complexity" value={filter} data-testid="select-complexity-filter" onChange={(event) => setFilter(event.target.value as LevelFilter)}>
                      <option value="all">All complexity</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="unavailable">Unavailable</option>
                    </select>
                    <select className="filter-select" aria-label="Filter by language" value={languageFilter} data-testid="select-language-filter" onChange={(event) => setLanguageFilter(event.target.value)}>
                      <option value="all">All languages</option>
                      {analysis.stats.filesByLanguage.map((item) => <option key={item.language} value={item.language}>{item.language} · {item.files}</option>)}
                    </select>
                    <select className="filter-select" aria-label="Filter by folder" value={directoryFilter} data-testid="select-directory-filter" onChange={(event) => setDirectoryFilter(event.target.value)}>
                      <option value="all">All folders</option>
                      {analysis.files.some((file) => !file.directory || file.directory === '.') && <option value="@root">Root files</option>}
                      {[...new Set(analysis.directories.map((directory) => directory.path).filter((path) => path && path !== '.'))].map((path) => <option key={path} value={path}>{path}</option>)}
                    </select>
                    <select className="filter-select" aria-label="Sort files" value={sort} data-testid="select-file-sort" onChange={(event) => setSort(event.target.value as typeof sort)}>
                      <option value="complexity">Complexity</option><option value="loc">LOC</option><option value="name">Name</option>
                    </select>
                  </div>
                  <div className="file-list scrollbar">
                    {visibleFiles.map((file) => <button key={file.path} className={cx('file-row', selectedPath === file.path && 'selected')} onClick={() => chooseFile(file.path)} data-testid={`button-file-${file.path}`}>
                      <span className="file-path"><FileCode2 size={13} color="#6b9daf" /><span className="file-name">{file.path}</span><span className="language-pill">{file.language}</span></span>
                      <span className="file-num">{file.loc == null ? '— LOC' : `${file.loc} LOC`}</span><span className="file-num">{file.complexity == null ? '—' : file.complexity.toFixed(1)}</span><span className={cx('level', file.complexityLevel ?? 'unavailable')}>{file.complexityLevel ?? 'unavailable'}</span>
                    </button>)}
                    {visibleFiles.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: '#8491a0', fontSize: 11 }} data-testid="status-no-files">No files match. Adjust the search or filters.</div>}
                  </div>
                </section>
                <div className="side-stack">
                  <section className="section-card" id="hotspots" aria-label="Five most complex files">
                    <div className="section-head"><div className="section-title">Complexity hotspots</div><div className="section-meta">TOP {hotspots.length}</div></div>
                    <div className="hotspot-list">
                      {hotspots.map((file, index) => <button className="hotspot" key={file.path} onClick={() => chooseFile(file.path)} data-testid={`button-hotspot-${index + 1}`} style={{ width: '100%', textAlign: 'left', background: selectedPath === file.path ? '#1a242e' : 'transparent', border: 0 }}>
                        <span className="rank">{String(index + 1).padStart(2, '0')}</span><span className="hotspot-main"><div className="hotspot-name">{file.filename}</div><div className="hotspot-sub">{file.directory || '.'} · {file.loc ?? '—'} LOC</div></span><span className="score">{file.complexity?.toFixed(1) ?? '—'}</span>
                      </button>)}
                      {!hotspots.length && <div style={{ padding: 20, color: '#8390a0', fontSize: 11 }} data-testid="status-no-hotspots">No complexity data is available.</div>}
                    </div>
                  </section>
                  <section className="section-card" aria-label="Selected file details">
                    <div className="section-head">
                      <div className="section-title">File details</div>
                      {selected && <button className="icon-button" style={{ width: 25, height: 25 }} aria-label="Clear selected file" data-testid="button-clear-selection" onClick={resetSelection}><X size={13} /></button>}
                    </div>
                    {selected ? <FileDetails file={selected} /> : <div className="empty-state" style={{ minHeight: 190, padding: 20 }} data-testid="status-no-file-selected"><div className="empty-mark" style={{ width: 40, height: 40, marginBottom: 10 }}><Box size={17} /></div><div className="empty-title" style={{ fontSize: 13 }}>Select a building</div><div className="empty-copy">Choose a file in the explorer or city to inspect its measured metrics.</div></div>}
                  </section>
                </div>
              </div>

              <div style={{ marginTop: 20 }}>
                <FunctionAnalysis
                  functions={analysis.functions ?? []}
                  selectedPath={selectedPath}
                  onSelectFile={chooseFile}
                />
              </div>

              <div style={{ marginTop: 20 }}>
                <DependencyGraph
                  graph={analysis.dependencyGraph}
                  selectedPath={selectedPath}
                  onSelectFile={chooseFile}
                />
              </div>

              <div style={{ marginTop: 20 }}>
                <RefactoringAdvisor
                  summary={analysis.refactoringSummary}
                  selectedPath={selectedPath}
                  onSelectFile={chooseFile}
                />
              </div>

              <footer style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '15px 2px 0', color: '#647182', fontSize: 10 }}>
                <span>Complexity measures decision paths, not code quality.</span>
                <span className="mono">{analysis.stats.highComplexityFiles} high-complexity files</span>
              </footer>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}

function Metric({ label, value, note }: { label: string; value: string | number; note: ReactNode }) {
  return <div className="metric" data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`}><div className="metric-label">{label}</div><div className="metric-value">{value}<span className="metric-note">{note}</span></div></div>;
}

function Treemap({ tiles, selectedPath, onSelect }: { tiles: TreemapTile[]; selectedPath: string; onSelect: (path: string) => void }) {
  return (
    <div className="treemap-view" data-testid="view-code-city-treemap" aria-label="2D code city file-size treemap">
      <div className="treemap-axis"><span>AREA · FILE SIZE</span><span>COLOR · COMPLEXITY</span></div>
      <div className="treemap-canvas">
        {tiles.map(({ file, left, top, width, height }) => {
          const showLabel = width >= 12 && height >= 17;
          const title = `${file.path} · ${file.language} · ${file.loc ?? 'LOC unavailable'} LOC · ${file.functions ?? 'functions unavailable'} functions · ${file.classes ?? 'classes unavailable'} classes · complexity ${file.complexity?.toFixed(2) ?? 'unavailable'}`;
          return (
            <button
              key={file.path}
              type="button"
              className={cx('treemap-tile', file.complexityLevel ?? 'unavailable', selectedPath === file.path && 'selected')}
              style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
              title={title}
              aria-label={title}
              data-testid={`button-treemap-${file.path}`}
              onClick={() => onSelect(file.path)}
            >
              {showLabel && <><span className="treemap-filename">{file.filename}</span><span className="treemap-metrics">{file.loc ?? '—'} LOC · CC {file.complexity?.toFixed(1) ?? '—'}</span></>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState({ title, copy }: { title: string; copy: string }) {
  return <div className="empty-state" data-testid="status-city-empty"><div className="empty-mark"><Code2 size={24} /></div><div className="empty-title">{title}</div><p className="empty-copy">{copy}</p></div>;
}

function FileDetails({ file }: { file: FileAnalysis }) {
  const decisions = file.decisionCounts ? [
    ['Branches', file.decisionCounts.conditionals],
    ['Loops', file.decisionCounts.loops],
    ['Exceptions', file.decisionCounts.exceptionHandlers],
    ['Boolean ops', file.decisionCounts.booleanOperators],
    ['Comprehensions', file.decisionCounts.comprehensionConditions],
  ].filter(([, value]) => Number(value) > 0) : [];
  return <div className="detail-body" data-testid={`details-file-${file.path}`}>
    <div className="detail-file">{file.path}</div>
    <div className="detail-language"><span>{file.language}</span><span>{file.capabilities.includes('cyclomatic_complexity') ? 'parser-backed metrics' : 'line metrics only'}</span></div>
    {file.analysisError && <div className="notice error" style={{ marginTop: 10, marginBottom: 0 }} data-testid="status-file-analysis-error"><AlertTriangle size={12} style={{ verticalAlign: 'middle', marginRight: 5 }} />{file.analysisError}</div>}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 9 }}><span className={cx('level', file.complexityLevel ?? 'unavailable')}>{file.complexityLevel ? `${file.complexityLevel} complexity` : 'complexity unavailable'}</span>{file.complexity != null && <span className="mono" style={{ color: '#e9bd68', fontSize: 13 }}>{file.complexity.toFixed(2)}</span>}</div>
    <div className="detail-stat-grid">
      <DetailStat label="Lines of code" value={metricValue(file.loc)} /><DetailStat label="Physical lines" value={metricValue(file.physicalLines)} />
      <DetailStat label="File size" value={bytes(file.sizeBytes)} /><DetailStat label="Relative size" value={`${(file.relativeSize * 100).toFixed(1)}%`} />
      <DetailStat label="Functions" value={metricValue(file.functions)} /><DetailStat label="Classes" value={metricValue(file.classes)} />
      <DetailStat label="Max nesting" value={metricValue(file.nestingDepth)} />
    </div>
    <div className="detail-block"><div className="detail-block-title">Complexity drivers</div>
      {file.complexityReasons?.length ? file.complexityReasons.map((reason, index) => <div className="reason" key={`${index}-${reason}`} data-testid={`text-complexity-reason-${index}`}>{reason}</div>) : <div className="subtle">{file.complexity == null ? (file.analysisError ? 'Unavailable for this file; see its parser status above.' : 'Unavailable for this language.') : 'No contributing decisions reported.'}</div>}
      {decisions.length > 0 && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>{decisions.map(([label, value]) => <span className="plot-chip" key={String(label)}>{label} <span className="mono">{value}</span></span>)}</div>}
    </div>
    <div className="detail-block"><div className="detail-block-title">Function metrics</div>
      {file.functionMetrics?.length ? file.functionMetrics.slice(0, 8).map((fn) => <div className="fn-row" key={`${fn.name}-${fn.line}`}><span>{fn.isAsync ? 'async ' : ''}{fn.name}<span style={{ color: '#667486' }}> :{fn.line}</span></span><span className="fn-score">CC {fn.complexity.toFixed(1)}</span></div>) : <div className="subtle">{file.functionMetrics == null ? (file.analysisError ? 'Unavailable for this file; see its parser status above.' : 'Unavailable for this language.') : 'No function definitions detected.'}</div>}
      {file.functionMetrics && file.functionMetrics.length > 8 && <div className="subtle" style={{ marginTop: 7 }}>+{file.functionMetrics.length - 8} more functions</div>}
    </div>
    {file.imports != null && <div className="detail-block"><div className="detail-block-title">Imports / dependencies</div>{file.imports.length ? <div className="import-list">{file.imports.join(', ')}</div> : <div className="subtle">No imports detected.</div>}</div>}
    {file.metricsUnavailable.length > 0 && <div className="detail-block"><div className="detail-block-title">Unavailable metrics</div><div className="subtle">{file.metricsUnavailable.join(', ')}</div></div>}
  </div>;
}

function DetailStat({ label, value }: { label: string; value: string | number }) {
  return <div className="detail-stat"><div className="detail-stat-label">{label}</div><div className="detail-stat-value">{value}</div></div>;
}

