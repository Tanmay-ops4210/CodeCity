# CODE CITY — Codebase Complexity Topology

> **A software repository is a city. Python files are buildings. Folders are districts. File size determines building size. Code complexity determines building color and risk.**

Inspired by high-end experimental web design (Shopify Editions-style), **Code City** transforms Python codebases into interactive digital cities to visualize architecture, cyclomatic complexity, and technical debt.

---

## 🏛️ Key Concepts & Rules

- **Districts = Folders**: The repository directory tree forms urban districts (`src/api`, `src/services`, `utils`, `tests`).
- **Buildings = Python Files**: Every Python file is rendered as a building block.
- **Footprint = Lines of Code (LOC)**: Physical lines of code (excluding blank lines) dictate building footprint. Large files dominate the skyline.
- **Color = Cyclomatic Complexity / Risk**:
  - **LOW (1–5)**: Light Green / Emerald (`#10b981`)
  - **MEDIUM (6–10)**: Amber / Yellow (`#f59e0b`)
  - **HIGH (11–25)**: Crimson Red (`#ef4444`)
  - **CRITICAL (26+)**: Deep Burgundy (`#7f1d1d`)
- **Visual Rule**: *Bigger + Darker = More Dangerous.*

---

## 🚀 Quick Start

### 1. Run Backend & Frontend Together:
```bash
./start.sh
```

Or run individually:

### Backend (Zero External Dependencies, Python 3.9+ standard library):
```bash
python3 backend/server.py
# Running on http://localhost:8000
# Endpoints: GET /health, GET /demo, POST /analyze
```

### Frontend (React + Vite + GSAP + Plotly):
```bash
cd frontend
npm run dev
# Running on http://localhost:5173
```

---

## 🛡️ Security & Zero Code Execution

The analyzer strictly parses Python files using Python's built-in `ast` module (`ast.parse()`).
**No code from analyzed repositories is ever imported, evaluated, or executed.**
Directories such as `.git`, `__pycache__`, `node_modules`, `.venv`, and `.env` are automatically ignored.

---

## 🔬 Cyclomatic Complexity Formula

McCabe cyclomatic complexity score computed via AST traversal:
- Base Complexity: `1`
- `FunctionDef` / `AsyncFunctionDef`: `+1`
- `If` / `IfExp` (ternary): `+1`
- `For` / `AsyncFor`: `+1`
- `While`: `+1`
- `ExceptHandler` / `With` / `AsyncWith`: `+1`
- `BoolOp` (`and`, `or`): `+len(values) - 1`
- Comprehensions (`ListComp`, `DictComp`, `SetComp`, `GeneratorExp`): `+generators`

---

## 🧩 Architectural Modules

- **`Hero`**: Large typography staggered entrance, 3D Three.js isometric grid & particle cloud, magnetic CTAs.
- **`EditorialStory`**: Shopify Editions-inspired horizontal scroll scrubbing across 5 thematic panels.
- **`CodeToCityStory`**: 5-phase scroll pinned sequence: *Code → AST Data → Geometry → Districts → Code City*.
- **`MetricsHUD`**: GSAP animated live counters for Files, Lines, Functions, Classes, Average Complexity, and High-Risk Files.
- **`CodeCityTreemap`**: Plotly.js interactive treemap with custom gradient, dark theme, and rich hover tooltips.
- **`BuildingInspector`**: Slide-over HUD panel with risk gauge meter, branching metrics, diagnostic issues, and heuristic module decomposition.
- **`RiskAnalysis`**: "Where is Your Technical Debt?" Top 5 risk files leaderboard, largest monoliths, and district averages.
- **`RefactoringAdvice`**: Monster files detector with heuristic decomposition suggestions.
- **`RepoModal`**: Scan any local filesystem repository or switch between built-in architectural presets.
