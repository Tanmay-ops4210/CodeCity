# Code City

Code City analyzes mixed-language software ZIP archives and maps each supported source file to a building in an interactive 3D city. Building height is LOC, footprint is file size, folders form districts, and color represents complexity when a parser can measure it. Unsupported complexity is shown in neutral gray, not as a zero score.

When the browser cannot create a WebGL context, the city view automatically falls back to a clickable, file-size-weighted treemap with the same complexity colors and file details.

## Run in Replit

Use the project Run workflow. It starts the Vite web app and the FastAPI service. The frontend is previewed at `/`; the API is routed through `/api`.

The managed service commands are also available individually:

```bash
pnpm --filter @workspace/code-city run dev
UV_PROJECT_ENVIRONMENT=.pythonlibs uv run --frozen --project . uvicorn code_city.main:app --app-dir artifacts/api-server/python --host 0.0.0.0 --port 8080
```

The Python dependencies are declared in the root `pyproject.toml` and pinned in `uv.lock`. Do not install a separate Python environment or add a database for this MVP.

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Health status |
| GET | `/api/healthz` | Health-check alias used by the service monitor |
| GET | `/api/demo` | Deterministic sample analysis with `isDemo: true` |
| POST | `/api/analyze` | Analyze a multi-language `.zip` project using multipart field `file` |
| GET | `/api/docs` | FastAPI interactive API documentation |

The complete request and response types live in `lib/api-spec/openapi.yaml`. After changing the contract, regenerate the TypeScript client and Zod schemas:

```bash
pnpm --filter @workspace/api-spec run codegen
```

## Language support

The API registry recognizes the following extensions. Python uses its standard-library AST and tokenizer. JavaScript, TypeScript, Java, C and C++ use the pinned Tree-sitter language pack for syntax-backed structure and line metrics. The remaining registered languages provide line metrics only, so functions, classes, imports, nesting and complexity are unavailable rather than guessed.

| Language | Extensions | Current support |
| --- | --- | --- |
| Python | `.py`, `.pyw` | `ast` + `tokenize`: lines, functions, async functions, classes, imports, nesting and approximate complexity |
| JavaScript | `.js`, `.jsx`, `.mjs`, `.cjs` | Tree-sitter: lines, functions/methods/arrows, async functions, classes, imports/re-exports/`require`, nesting and approximate complexity |
| TypeScript | `.ts`, `.tsx`, `.mts`, `.cts` | Tree-sitter TypeScript/TSX grammars: JavaScript metrics plus interfaces, enums and type aliases in the class/type count |
| Java | `.java` | Tree-sitter: lines, methods, constructors and lambdas with bodies, classes/interfaces/enums/records/annotation types, imports, nesting and approximate complexity |
| C | `.c`, `.h` | Tree-sitter: lines, function definitions, struct/union/enum definitions, `#include` dependencies, nesting and approximate complexity |
| C++ | `.cpp`, `.cc`, `.cxx`, `.hpp`, `.hh`, `.hxx` | Tree-sitter: lines, function/lambda definitions, classes/structs/unions/enums, `#include` dependencies, nesting and approximate complexity |
| C# | `.cs` | Line metrics |
| Go | `.go` | Line metrics |
| Rust | `.rs` | Line metrics |
| PHP | `.php` | Line metrics |
| Ruby | `.rb` | Line metrics |
| Swift | `.swift` | Line metrics |
| Kotlin | `.kt`, `.kts` | Line metrics |
| Dart | `.dart` | Line metrics |
| SQL | `.sql` | Line metrics |
| HTML | `.html`, `.htm` | Line metrics |
| CSS | `.css`, `.scss`, `.sass`, `.less` | Line metrics |
| Shell | `.sh`, `.bash`, `.zsh` | Line metrics |
| Vue | `.vue` | Line metrics |
| Svelte | `.svelte` | Line metrics |

Tree-sitter dependencies are pinned through `uv.lock` (`tree-sitter` 0.26.x and `tree-sitter-language-pack` 1.21.x). These are syntax parsers, not compilers: they do not type-check, resolve symbols, validate a build, or report semantic errors. Function totals describe definitions/bodies recognized in each file, not unique project-wide symbols. Java methods without bodies and C/C++ prototypes are not counted as functions. Java lambdas and C++ lambdas, and JavaScript/TypeScript arrow functions, are counted as function definitions. The class/type total includes language-specific equivalents listed above; TypeScript type aliases are included.

Tree-sitter comment nodes are used for line metrics in the five parser-backed languages, so comment markers inside strings and JavaScript template literals are not treated as comments. Python uses `tokenize`; line-only adapters use language-specific comment scanning and do not provide syntax validation. Vue/Svelte embedded languages remain line-only. No uploaded source is imported, executed, compiled or used to install dependencies.

The API also records `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `pom.xml`, `build.gradle` and `Dockerfile` as project metadata, not source files. The dashboard shows file/LOC distribution by language, filters the existing explorer and city by language, and labels unavailable per-file metrics. Async-function counts are available for Python, JavaScript and TypeScript; Java, C and C++ return that metric as unavailable rather than zero.

## Complexity method

The Python adapter reports an approximation of cyclomatic complexity. Each file starts at a base score of 1. It adds:

- One for each `if`/`elif` branch and conditional expression
- One for each `for`, `async for`, or `while` loop
- One for each exception handler
- One for each additional operand operator in an `and`/`or` chain
- One for each comprehension generator and each comprehension filter

The Tree-sitter adapters also start at 1 and add one for each `if`, ternary/conditional expression, non-default switch case, loop, catch handler, and each `&&`/`||` operator. These syntax-based scores are approximate, and language control-flow constructs do not all have identical semantics. File complexity includes decision points throughout the parsed file; per-function metrics do not include nested function/lambda bodies.

Scores 1–5 are low, 6–10 are medium, and 11 or higher are high. Per-function scores use the same rule and do not include nested function bodies in the enclosing function's score. This method is intentionally described as an approximation, not a replacement for a dedicated complexity tool.

LOC counts nonblank lines that are not comment-only lines. Inline comments remain code lines. Physical lines, blank lines, and comment-only lines are reported separately. Python docstrings are string expressions, not comment tokens, and count as source lines.

## ZIP safety

- Only `.zip` uploads with a valid ZIP signature are analyzed.
- The compressed upload is limited to 20 MiB; archives are limited to 1,000 entries and 100 MiB expanded.
- Each recognized source file is limited to 5 MiB; a best-effort 20-second deadline is checked between files (a single in-progress parser call is not preempted).
- Absolute paths, `..` traversal, duplicate paths, symbolic links, special files, and encrypted ZIPs are rejected.
- `.git`, `node_modules`, virtual environments, caches, vendor/generated folders, build outputs, and recognized generated files are ignored by default; matching source paths are returned for review in `excludedDirectories`.
- Recognized source files with binary bytes, unsupported encodings or oversized content stay visible with metrics unavailable and a warning. Other files continue to be analyzed.
- The API processes entries in memory without extracting archives to a filesystem and does not persist uploaded source. Error messages never include source snippets.

## Tests

Run the analyzer, registry, mixed-project, and archive-security tests with:

```bash
uv run --frozen --project . python -m unittest discover -s artifacts/api-server/python/tests -t artifacts/api-server/python -v
```

Run the dashboard filtering and city-model tests with:

```bash
pnpm --filter @workspace/code-city run test:ui-model
```

Run the TypeScript checks with:

```bash
pnpm run typecheck
```
