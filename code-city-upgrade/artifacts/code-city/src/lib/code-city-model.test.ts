import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { FileAnalysis } from '@workspace/api-client-react';
import { filterProjectFiles, layoutTreemap, makeCityTraces } from './code-city-model.ts';

function file(overrides: Partial<FileAnalysis> = {}): FileAnalysis {
  return {
    path: 'src/app.py',
    directory: 'src',
    filename: 'app.py',
    language: 'Python',
    capabilities: ['line_metrics'],
    metricsUnavailable: ['complexity', 'functions', 'classes'],
    physicalLines: 8,
    loc: 5,
    blankLines: 1,
    commentLines: 2,
    sizeBytes: 120,
    relativeSize: 1,
    functions: null,
    asyncFunctions: null,
    classes: null,
    complexity: null,
    complexityLevel: null,
    decisionCounts: null,
    complexityReasons: null,
    functionMetrics: null,
    nestingDepth: null,
    imports: null,
    analysisError: null,
    ...overrides,
  };
}

const filters = {
  query: '',
  complexity: 'all' as const,
  language: 'all',
  directory: 'all',
  sort: 'complexity' as const,
};

test('language, search, unavailable-complexity, and nested-folder filters use actual file results', () => {
  const python = file({ complexity: 8, complexityLevel: 'medium', capabilities: ['line_metrics', 'cyclomatic_complexity'], path: 'src/app.py', filename: 'app.py' });
  const javascript = file({ language: 'JavaScript', path: 'src/ui/app.js', directory: 'src/ui', filename: 'app.js', sizeBytes: 90 });
  const broken = file({ path: 'src/broken.py', filename: 'broken.py', analysisError: 'Syntax error', complexity: null, complexityLevel: null });
  const files = [python, javascript, broken];

  assert.deepEqual(filterProjectFiles(files, { ...filters, language: 'JavaScript' }).map((item) => item.path), ['src/ui/app.js']);
  assert.deepEqual(filterProjectFiles(files, { ...filters, directory: 'src' }).map((item) => item.path), ['src/app.py', 'src/broken.py', 'src/ui/app.js']);
  assert.deepEqual(filterProjectFiles(files, { ...filters, query: 'broken' }).map((item) => item.path), ['src/broken.py']);
  assert.deepEqual(filterProjectFiles(files, { ...filters, complexity: 'unavailable' }).map((item) => item.path), ['src/broken.py', 'src/ui/app.js']);
});

test('city data maps measured LOC to height and unsupported complexity to neutral buildings', () => {
  const python = file({ complexity: 8, complexityLevel: 'medium', capabilities: ['line_metrics', 'cyclomatic_complexity'] });
  const javascript = file({ path: 'src/app.js', filename: 'app.js', language: 'JavaScript', loc: 12, complexity: null, complexityLevel: null });
  const traces = makeCityTraces([python, javascript], [
    { path: 'src', files: 2, loc: 17, averageComplexity: 8, languages: ['Python', 'JavaScript'] },
  ]);
  const medium = traces[1];
  const unavailable = traces[3];
  const district = traces[4];

  assert.equal(medium.name, 'Medium complexity');
  assert.equal(medium.customdata[0][0], 'src/app.py');
  assert.equal(medium.customdata[0][7], 'Python');
  assert.deepEqual(unavailable.z.slice(0, 4), [0, 0, 0, 0]);
  assert.deepEqual(unavailable.z.slice(4), [12, 12, 12, 12]);
  assert.equal(unavailable.customdata[0][0], 'src/app.js');
  assert.equal(unavailable.customdata[0][2], 'unavailable');
  assert.equal(unavailable.color, '#758394');
  assert.match(district.text[0], /2 files · 17 LOC · 2 languages/);
});

test('treemap keeps nullable-metric files and allocates the full canvas', () => {
  const tiles = layoutTreemap([
    file({ sizeBytes: 150 }),
    file({ path: 'src/app.js', filename: 'app.js', language: 'JavaScript', complexity: null, complexityLevel: null, sizeBytes: 50 }),
  ]);
  assert.equal(tiles.length, 2);
  assert.equal(tiles.reduce((area, tile) => area + tile.width * tile.height, 0), 10_000);
  assert.ok(tiles.some((tile) => tile.file.complexity == null));
});
