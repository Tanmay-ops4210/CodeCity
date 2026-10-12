import type { FileAnalysis, ProjectAnalysis } from '@workspace/api-client-react';

export type LevelFilter = 'all' | 'low' | 'medium' | 'high' | 'unavailable';
export type FileSort = 'complexity' | 'loc' | 'name';
export type TreemapTile = { file: FileAnalysis; left: number; top: number; width: number; height: number };

export type FileFilters = {
  query: string;
  complexity: LevelFilter;
  language: string;
  directory: string;
  sort: FileSort;
};

export function filterProjectFiles(files: FileAnalysis[], filters: FileFilters): FileAnalysis[] {
  const normalized = filters.query.trim().toLowerCase();
  return files.filter((file) =>
    (filters.complexity === 'all' ||
      (filters.complexity === 'unavailable'
        ? file.complexityLevel == null
        : file.complexityLevel === filters.complexity)) &&
    (filters.language === 'all' || file.language === filters.language) &&
    (filters.directory === 'all' ||
      (filters.directory === '@root'
        ? !file.directory || file.directory === '.'
        : file.directory === filters.directory ||
          file.directory.startsWith(`${filters.directory.replace(/\/$/, '')}/`))) &&
    (!normalized ||
      file.path.toLowerCase().includes(normalized) ||
      file.filename.toLowerCase().includes(normalized))
  ).sort((a, b) => {
    if (filters.sort === 'complexity') {
      if (Boolean(a.complexity == null) !== Boolean(b.complexity == null)) return a.complexity == null ? 1 : -1;
      return (b.complexity ?? -1) - (a.complexity ?? -1) || a.path.localeCompare(b.path);
    }
    if (filters.sort === 'name') return a.path.localeCompare(b.path);
    if (filters.sort === 'loc') return (b.loc ?? -1) - (a.loc ?? -1);
    return a.path.localeCompare(b.path);
  });
}

export function layoutTreemap(files: FileAnalysis[]): TreemapTile[] {
  if (!files.length) return [];
  const sorted = [...files].sort((a, b) => b.sizeBytes - a.sizeBytes);
  const tiles: TreemapTile[] = [];
  const divide = (items: FileAnalysis[], left: number, top: number, width: number, height: number) => {
    if (!items.length) return;
    if (items.length === 1) {
      tiles.push({ file: items[0], left, top, width, height });
      return;
    }
    const weights = items.map((file) => Math.max(1, file.sizeBytes));
    const total = weights.reduce((sum, value) => sum + value, 0);
    let splitAt = 1;
    let accumulated = weights[0];
    while (splitAt < items.length - 1 && accumulated < total / 2) {
      accumulated += weights[splitAt];
      splitAt += 1;
    }
    const ratio = accumulated / total;
    if (width >= height) {
      const firstWidth = width * ratio;
      divide(items.slice(0, splitAt), left, top, firstWidth, height);
      divide(items.slice(splitAt), left + firstWidth, top, width - firstWidth, height);
    } else {
      const firstHeight = height * ratio;
      divide(items.slice(0, splitAt), left, top, width, firstHeight);
      divide(items.slice(splitAt), left, top + firstHeight, width, height - firstHeight);
    }
  };
  divide(sorted, 0, 0, 100, 100);
  return tiles;
}

const colors = { low: '#61c995', medium: '#e8b957', high: '#e76f73', unavailable: '#758394' };
const bytes = (value: number) => value < 1024 ? `${value} B` : value < 1024 * 1024 ? `${(value / 1024).toFixed(1)} KB` : `${(value / 1024 / 1024).toFixed(2)} MB`;

export function makeCityTraces(files: FileAnalysis[], directories: ProjectAnalysis['directories']) {
  const directoryNames = [...new Set(files.map((file) => file.directory || '.'))];
  const directoryIndex = new Map(directoryNames.map((name, index) => [name, index]));
  const localIndexes = new Map<string, number>();
  const maxBytes = Math.max(1, ...files.map((file) => file.sizeBytes));
  const grouped: Record<'low' | 'medium' | 'high' | 'unavailable', { x: number[]; y: number[]; z: number[]; i: number[]; j: number[]; k: number[]; customdata: string[][]; text: string[] }> = {
    low: { x: [], y: [], z: [], i: [], j: [], k: [], customdata: [], text: [] },
    medium: { x: [], y: [], z: [], i: [], j: [], k: [], customdata: [], text: [] },
    high: { x: [], y: [], z: [], i: [], j: [], k: [], customdata: [], text: [] },
    unavailable: { x: [], y: [], z: [], i: [], j: [], k: [], customdata: [], text: [] },
  };
  const labelPoints: Array<{ x: number; y: number; z: number; text: string; complexity: number | null; loc: number }> = [];
  const faceTemplate = [[0, 1, 2], [0, 2, 3], [4, 6, 5], [4, 7, 6], [0, 4, 5], [0, 5, 1], [1, 5, 6], [1, 6, 2], [2, 6, 7], [2, 7, 3], [3, 7, 4], [3, 4, 0]];
  files.forEach((file) => {
    const level = file.complexityLevel ?? 'unavailable';
    const group = grouped[level];
    const dirKey = file.directory || '.';
    const offset = group.x.length;
    const x = directoryIndex.get(dirKey) ?? 0;
    const ySlot = localIndexes.get(dirKey) ?? 0;
    localIndexes.set(dirKey, ySlot + 1);
    const width = 0.18 + Math.sqrt(Math.max(0, file.sizeBytes) / maxBytes) * 0.44;
    const depth = width * 0.82;
    const centerY = ySlot * 0.78;
    const height = Math.max(0, file.loc ?? 0);
    labelPoints.push({ x, y: centerY, z: height, text: file.filename, complexity: file.complexity, loc: file.loc ?? 0 });
    const corners = [
      [x - width / 2, centerY - depth / 2, 0], [x + width / 2, centerY - depth / 2, 0],
      [x + width / 2, centerY + depth / 2, 0], [x - width / 2, centerY + depth / 2, 0],
      [x - width / 2, centerY - depth / 2, height], [x + width / 2, centerY - depth / 2, height],
      [x + width / 2, centerY + depth / 2, height], [x - width / 2, centerY + depth / 2, height],
    ];
    corners.forEach(([cxValue, cyValue, czValue]) => {
      group.x.push(cxValue);
      group.y.push(cyValue);
      group.z.push(czValue);
      group.customdata.push([file.path, file.loc == null ? 'unavailable' : String(file.loc), file.complexity == null ? 'unavailable' : file.complexity.toFixed(1), bytes(file.sizeBytes), level, file.functions == null ? 'unavailable' : String(file.functions), file.classes == null ? 'unavailable' : String(file.classes), file.language]);
      group.text.push(file.path);
    });
    faceTemplate.forEach(([a, b, c]) => {
      group.i.push(offset + a);
      group.j.push(offset + b);
      group.k.push(offset + c);
    });
  });
  const traces: any[] = (['low', 'medium', 'high', 'unavailable'] as const).map((level) => ({
    type: 'mesh3d' as const,
    ...grouped[level],
    name: `${level[0].toUpperCase()}${level.slice(1)} complexity`,
    color: colors[level],
    opacity: 0.92,
    flatshading: true,
    hovertemplate: '<b>%{customdata[0]}</b><br>Language: %{customdata[7]}<br>LOC: %{customdata[1]}<br>Functions: %{customdata[5]}<br>Classes: %{customdata[6]}<br>Complexity: %{customdata[2]}<extra></extra>',
    showlegend: true,
  }));
  const districtCenters = directoryNames.map((name) => {
    const directory = directories.find((item) => item.path === name);
    const count = files.filter((file) => (file.directory || '.') === name).length;
    const folderName = name === '.' ? 'root' : name.split('/').pop() || name;
    const measuredLoc = directory?.loc ?? files.filter((file) => (file.directory || '.') === name).reduce((total, file) => total + (file.loc ?? 0), 0);
    const languages = directory?.languages ?? [...new Set(files.filter((file) => file.directory === name).map((file) => file.language))];
    return { x: directoryIndex.get(name) ?? 0, y: Math.max(0, count - 1) * 0.39, text: `${folderName}<br>${directory?.files ?? count} files · ${measuredLoc} LOC · ${languages.length} languages` };
  });
  traces.push({
    type: 'scatter3d' as const,
    mode: 'text' as const,
    x: districtCenters.map((item) => item.x),
    y: districtCenters.map((item) => item.y + 1.2),
    z: districtCenters.map(() => 0),
    text: districtCenters.map((item) => item.text),
    textposition: 'middle center' as const,
    textfont: { size: 10, color: '#97a5b4', family: 'DM Mono' },
    hoverinfo: 'skip' as const,
    showlegend: false,
    name: 'Folder districts',
  });
  const visibleLabels = labelPoints.length <= 32
    ? labelPoints
    : [...labelPoints].sort((a, b) => (b.complexity ?? -1) - (a.complexity ?? -1) || b.loc - a.loc).slice(0, 20);
  if (visibleLabels.length) {
    traces.push({
      type: 'scatter3d' as const,
      mode: 'text' as const,
      x: visibleLabels.map((item) => item.x),
      y: visibleLabels.map((item) => item.y),
      z: visibleLabels.map((item) => item.z),
      text: visibleLabels.map((item) => item.text),
      textposition: 'top center' as const,
      textfont: { size: 9, color: '#d8e5ec', family: 'DM Mono' },
      hoverinfo: 'skip' as const,
      showlegend: false,
      name: 'File labels',
    });
  }
  return traces;
}
