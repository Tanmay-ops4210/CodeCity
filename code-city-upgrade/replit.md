# Code City

Code City analyzes project ZIPs across 20 registered language families. Python uses AST/tokenize; JavaScript, TypeScript, Java, C and C++ use Tree-sitter for syntax-backed structural metrics and approximate complexity. The other registered languages provide line metrics only. The existing dashboard visualizes source files as an interactive 3D city.

## Run & Operate

- Use the managed Run workflow to start both the Code City web app and FastAPI API service.
- `pnpm --filter @workspace/code-city run dev` — run the Vite frontend in its managed workflow.
- `UV_PROJECT_ENVIRONMENT=.pythonlibs uv run --frozen --project . uvicorn code_city.main:app --app-dir artifacts/api-server/python --host 0.0.0.0 --port 8080` — run the FastAPI service.
- `uv run --frozen --project . python -m unittest discover -s artifacts/api-server/python/tests -t artifacts/api-server/python -v` — run the analyzer and archive-security tests.
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- API endpoints: `/api/health`, `/api/healthz`, `/api/demo`, `/api/analyze`; interactive API docs at `/api/docs`.
- No database, API key, external AI service, or uploaded-source persistence is required.

## Stack

- pnpm workspaces, Node.js 24, React, TypeScript 5.9, and Vite
- API: Python 3.13, FastAPI, Uvicorn
- Analysis: language registry, Python `ast`/`tokenize`, Tree-sitter adapters for JavaScript/TypeScript/Java/C/C++, lexical line adapters for other registered languages, and `zipfile`; no uploaded source is executed, imported, compiled or used to install dependencies
- Visualization: Plotly.js 3D mesh buildings
- API codegen: Orval from `lib/api-spec/openapi.yaml`

## Where things live

- `artifacts/code-city/` — React/Vite dashboard and Plotly city
- `artifacts/api-server/python/code_city/` — FastAPI routes, ZIP validation, language registry, parser adapters, metrics and aggregation
- `artifacts/api-server/python/tests/` — standard-library analyzer, mixed-language, API-contract and archive-security tests
- `lib/api-spec/openapi.yaml` — REST contract and generated frontend types
- `README.md` — setup, API, complexity method, and security limits

## Architecture decisions

- The sample project uses the same analyzer as uploaded projects and is returned with `isDemo: true`.
- ZIP source files are analyzed in memory; they are never extracted to a public directory or executed.
- Python and Tree-sitter complexity values are explicit syntactic approximations; Tree-sitter scores add branches, ternaries, non-default switch cases, loops, catch handlers and `&&`/`||` operators to a base of 1.
- C#/Go/Rust/PHP/Ruby/Swift/Kotlin/Dart/SQL/HTML/CSS/Shell/Vue/Svelte currently provide line metrics only; structural metrics stay nullable.

## Product

Users can load marked demo data or upload a mixed-language ZIP, inspect project/language metrics, explore a responsive 3D code city, filter and sort files by language/complexity/folder, and inspect file metrics and parser limitations.

## User preferences

- Keep metrics tied to API analysis results; do not show demo values as an uploaded project's results.
- Preserve the dark developer-tool design, responsive behavior, and clear demo labeling.

## Gotchas

- ZIP size, entry count, expanded size, source-file size, and processing time limits are enforced by the API. Update the README if those limits change.
- Re-run API codegen after editing the OpenAPI spec.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
