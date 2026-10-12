from __future__ import annotations

import ast
import io
import tokenize
from collections import defaultdict
from datetime import UTC, datetime
from typing import Any, Protocol

from .language_registry import (
    LANGUAGES,
    LanguageSpec,
    default_capabilities,
    language_for_path,
)
from .line_metrics import (
    decode_text,
    is_binary_source,
    lexical_line_metrics,
    python_line_metrics,
)


def _zero_decisions() -> dict[str, int]:
    return {
        "conditionals": 0,
        "loops": 0,
        "exceptionHandlers": 0,
        "booleanOperators": 0,
        "comprehensionConditions": 0,
    }


class DecisionCounter(ast.NodeVisitor):
    """Counts explicit control-flow decision points; this is an approximation."""

    def __init__(self, root_function: ast.AST | None = None) -> None:
        self.root_function = root_function
        self.counts = _zero_decisions()

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        if self.root_function is None or node is self.root_function:
            self.generic_visit(node)

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
        if self.root_function is None or node is self.root_function:
            self.generic_visit(node)

    def visit_If(self, node: ast.If) -> None:
        self.counts["conditionals"] += 1
        self.generic_visit(node)

    def visit_IfExp(self, node: ast.IfExp) -> None:
        self.counts["conditionals"] += 1
        self.generic_visit(node)

    def visit_For(self, node: ast.For) -> None:
        self.counts["loops"] += 1
        self.generic_visit(node)

    def visit_AsyncFor(self, node: ast.AsyncFor) -> None:
        self.counts["loops"] += 1
        self.generic_visit(node)

    def visit_While(self, node: ast.While) -> None:
        self.counts["loops"] += 1
        self.generic_visit(node)

    def visit_ExceptHandler(self, node: ast.ExceptHandler) -> None:
        self.counts["exceptionHandlers"] += 1
        self.generic_visit(node)

    def visit_BoolOp(self, node: ast.BoolOp) -> None:
        # A chain of n operands contains n - 1 boolean decision operators.
        self.counts["booleanOperators"] += max(0, len(node.values) - 1)
        self.generic_visit(node)

    def visit_comprehension(self, node: ast.comprehension) -> None:
        # Each generator adds iteration control flow; each filter is a decision.
        self.counts["loops"] += 1
        self.counts["comprehensionConditions"] += len(node.ifs)
        self.generic_visit(node)

    def visit_match_case(self, node: ast.match_case) -> None:
        is_wildcard = isinstance(node.pattern, ast.MatchAs) and node.pattern.name is None and node.guard is None
        if not is_wildcard:
            self.counts["conditionals"] += 1
        if node.guard:
            self.counts["conditionals"] += 1
        self.generic_visit(node)


def _decode_source(source_bytes: bytes) -> str:
    if source_bytes.startswith(
        (
            b"\xff\xfe\x00\x00",
            b"\x00\x00\xfe\xff",
            b"\xff\xfe",
            b"\xfe\xff",
        )
    ):
        return decode_text(source_bytes)
    encoding, _ = tokenize.detect_encoding(io.BytesIO(source_bytes).readline)
    return source_bytes.decode(encoding)


def _line_metrics(source: str) -> tuple[int, int, int, int]:
    return python_line_metrics(source)


def _complexity_level(score: int) -> str:
    if score <= 5:
        return "low"
    if score <= 10:
        return "medium"
    return "high"


def _complexity_reasons(counts: dict[str, int]) -> list[str]:
    labels = [
        ("conditionals", "conditional branches"),
        ("loops", "loops and comprehension generators"),
        ("exceptionHandlers", "exception handlers"),
        ("booleanOperators", "additional boolean operators"),
        ("comprehensionConditions", "comprehension filters"),
    ]
    reasons = [
        f"{counts[key]} {label}"
        for key, label in labels
        if counts[key] > 0
    ]
    if not reasons:
        return ["No decision points beyond the base complexity of 1."]
    return ["Base complexity 1 plus " + ", ".join(reasons) + "."]


def unavailable_file(
    path: str,
    size_bytes: int,
    message: str,
    language: LanguageSpec | None = None,
    line_metrics: tuple[int, int, int, int] | None = None,
) -> dict[str, Any]:
    language = language or language_for_path(path) or LANGUAGES[0]
    directory = path.rpartition("/")[0] or "."
    physical, loc, blank, comments = line_metrics or (None, None, None, None)
    unavailable = [
        "functions",
        "asyncFunctions",
        "classes",
        "complexity",
        "nestingDepth",
        "imports",
    ]
    if line_metrics is None:
        unavailable[:0] = ["physicalLines", "loc", "blankLines", "commentLines"]
    return {
        "path": path,
        "directory": directory,
        "filename": path.rpartition("/")[2],
        "language": language.name,
        "capabilities": list(language.capabilities),
        "metricsUnavailable": unavailable,
        "physicalLines": physical,
        "loc": loc,
        "blankLines": blank,
        "commentLines": comments,
        "sizeBytes": size_bytes,
        "relativeSize": 0.0,
        "functions": None,
        "asyncFunctions": None,
        "classes": None,
        "complexity": None,
        "complexityLevel": None,
        "decisionCounts": None,
        "complexityReasons": None,
        "functionMetrics": None,
        "nestingDepth": None,
        "imports": None,
        "analysisError": message,
    }


class _NestingDepthCounter(ast.NodeVisitor):
    NESTING_NODES = (
        ast.FunctionDef,
        ast.AsyncFunctionDef,
        ast.ClassDef,
        ast.If,
        ast.For,
        ast.AsyncFor,
        ast.While,
        ast.Try,
        ast.With,
        ast.AsyncWith,
        ast.Match,
    )

    def __init__(self) -> None:
        self.depth = 0
        self.maximum = 0

    def generic_visit(self, node: ast.AST) -> None:
        is_nested = isinstance(node, self.NESTING_NODES)
        if is_nested:
            self.depth += 1
            self.maximum = max(self.maximum, self.depth)
        super().generic_visit(node)
        if is_nested:
            self.depth -= 1


def _count_parameters(node: ast.FunctionDef | ast.AsyncFunctionDef) -> int:
    args = node.args
    total = len(args.args) + len(getattr(args, "posonlyargs", [])) + len(args.kwonlyargs)
    if args.vararg:
        total += 1
    if args.kwarg:
        total += 1
    return total


class _FunctionNestingVisitor(ast.NodeVisitor):
    NESTING_NODES = (
        ast.If,
        ast.For,
        ast.AsyncFor,
        ast.While,
        ast.Try,
        ast.With,
        ast.AsyncWith,
    )

    def __init__(self, root: ast.AST) -> None:
        self.root = root
        self.depth = 0
        self.max_depth = 0

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        if node is self.root:
            self.generic_visit(node)

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
        if node is self.root:
            self.generic_visit(node)

    def generic_visit(self, node: ast.AST) -> None:
        is_nesting = isinstance(node, self.NESTING_NODES)
        if hasattr(ast, "Match") and isinstance(node, ast.Match):
            is_nesting = True
        if is_nesting and node is not self.root:
            self.depth += 1
            self.max_depth = max(self.max_depth, self.depth)
        super().generic_visit(node)
        if is_nesting and node is not self.root:
            self.depth -= 1


def _extract_python_function_metrics(
    tree: ast.AST,
    source_lines: list[str],
    path: str,
) -> list[dict[str, Any]]:
    metrics: list[dict[str, Any]] = []

    def _walk_scope(node: ast.AST, scope: list[str], inside_function: bool) -> None:
        for child in ast.iter_child_nodes(node):
            if isinstance(child, ast.ClassDef):
                _walk_scope(child, scope + [child.name], inside_function)
            elif isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef)):
                fn_name = child.name
                qualified_name = ".".join(scope + [fn_name]) if scope else fn_name
                line_start = child.lineno
                line_end = getattr(child, "end_lineno", child.lineno)

                # Function LOC (nonblank noncomment)
                fn_loc = 0
                for idx in range(line_start - 1, min(line_end, len(source_lines))):
                    line_str = source_lines[idx].strip()
                    if line_str and not line_str.startswith("#"):
                        fn_loc += 1
                fn_loc = max(1, fn_loc)

                # Decisions for this function alone
                counter = DecisionCounter(root_function=child)
                counter.visit(child)
                fn_complexity = 1 + sum(counter.counts.values())

                # Nesting depth inside this function
                nesting_counter = _FunctionNestingVisitor(root=child)
                nesting_counter.visit(child)

                # Decision details
                details = []
                if counter.counts["conditionals"]:
                    details.append(f"{counter.counts['conditionals']} conditional branches")
                if counter.counts["loops"]:
                    details.append(f"{counter.counts['loops']} loops")
                if counter.counts["booleanOperators"]:
                    details.append(f"{counter.counts['booleanOperators']} boolean operators")
                if counter.counts["exceptionHandlers"]:
                    details.append(f"{counter.counts['exceptionHandlers']} exception handlers")
                if counter.counts["comprehensionConditions"]:
                    details.append(f"{counter.counts['comprehensionConditions']} comprehension filters")

                metrics.append(
                    {
                        "name": fn_name,
                        "qualifiedName": qualified_name,
                        "filePath": path,
                        "line": line_start,
                        "lineStart": line_start,
                        "lineEnd": line_end,
                        "loc": fn_loc,
                        "complexity": fn_complexity,
                        "complexityLevel": _complexity_level(fn_complexity),
                        "isAsync": isinstance(child, ast.AsyncFunctionDef),
                        "isNested": inside_function,
                        "parametersCount": _count_parameters(child),
                        "nestingDepth": nesting_counter.max_depth,
                        "conditionalBranches": counter.counts["conditionals"],
                        "loops": counter.counts["loops"],
                        "booleanOperators": counter.counts["booleanOperators"],
                        "decisionDetails": details,
                    }
                )

                _walk_scope(child, scope + [fn_name], inside_function=True)
            else:
                _walk_scope(child, scope, inside_function)

    _walk_scope(tree, [], inside_function=False)
    metrics.sort(key=lambda item: (item["lineStart"], item["name"]))
    return metrics


def analyze_source(path: str, source_bytes: bytes) -> dict[str, Any]:
    """Analyze one Python file without importing, compiling, or executing it."""
    language = language_for_path(path) or LANGUAGES[0]
    if is_binary_source(source_bytes):
        return unavailable_file(path, len(source_bytes), "Binary file skipped.", language)
    try:
        source = _decode_source(source_bytes)
    except (LookupError, UnicodeDecodeError, SyntaxError):
        return unavailable_file(path, len(source_bytes), "Source encoding could not be decoded.", language)

    physical, loc, blank, comments = _line_metrics(source)
    lines = (physical, loc, blank, comments)
    try:
        tree = ast.parse(source)
    except SyntaxError as error:
        location = f" at line {error.lineno}" if error.lineno else ""
        return unavailable_file(
            path,
            len(source_bytes),
            f"Unable to parse Python syntax{location}.",
            language,
            lines,
        )
    except (ValueError, TypeError, RecursionError):
        return unavailable_file(
            path,
            len(source_bytes),
            "Unable to analyze this Python file.",
            language,
            lines,
        )

    counter = DecisionCounter()
    counter.visit(tree)
    complexity = 1 + sum(counter.counts.values())
    nodes = list(ast.walk(tree))
    function_nodes = [
        node
        for node in nodes
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
    ]
    function_metrics = _extract_python_function_metrics(tree, source.splitlines(), path)
    nesting = _NestingDepthCounter()
    nesting.visit(tree)
    imports = sorted(
        {
            node.module or ""
            for node in nodes
            if isinstance(node, ast.ImportFrom)
        }
        | {
            alias.name
            for node in nodes
            if isinstance(node, ast.Import)
            for alias in node.names
        }
    )

    return {
        "path": path,
        "directory": path.rpartition("/")[0] or ".",
        "filename": path.rpartition("/")[2],
        "language": language.name,
        "capabilities": list(language.capabilities),
        "metricsUnavailable": [],
        "physicalLines": physical,
        "loc": loc,
        "blankLines": blank,
        "commentLines": comments,
        "sizeBytes": len(source_bytes),
        "relativeSize": 0.0,
        "functions": len(function_nodes),
        "asyncFunctions": sum(
            1 for node in function_nodes if isinstance(node, ast.AsyncFunctionDef)
        ),
        "classes": sum(1 for node in nodes if isinstance(node, ast.ClassDef)),
        "complexity": complexity,
        "complexityLevel": _complexity_level(complexity),
        "decisionCounts": counter.counts,
        "complexityReasons": _complexity_reasons(counter.counts),
        "functionMetrics": function_metrics,
        "nestingDepth": nesting.maximum,
        "imports": imports,
        "analysisError": None,
    }


class AnalyzerAdapter(Protocol):
    """Common contract implemented by each registered language analyzer."""

    def analyze(self, path: str, source_bytes: bytes) -> dict[str, Any]: ...


class PythonAstAdapter:
    def analyze(self, path: str, source_bytes: bytes) -> dict[str, Any]:
        return analyze_source(path, source_bytes)


class LexicalLineMetricsAdapter:
    def __init__(self, language: LanguageSpec) -> None:
        self.language = language

    def analyze(self, path: str, source_bytes: bytes) -> dict[str, Any]:
        if is_binary_source(source_bytes):
            return unavailable_file(path, len(source_bytes), "Binary file skipped.", self.language)
        try:
            from .line_metrics import decode_text

            source = decode_text(source_bytes)
        except (LookupError, UnicodeDecodeError):
            return unavailable_file(
                path,
                len(source_bytes),
                "Source encoding could not be decoded.",
                self.language,
            )

        result = unavailable_file(
            path,
            len(source_bytes),
            "",
            self.language,
            lexical_line_metrics(source, self.language),
        )
        result["analysisError"] = None
        return result


def analyze_file(path: str, source_bytes: bytes) -> dict[str, Any]:
    """Dispatch a recognized source file to its registered, non-executing adapter."""
    language = language_for_path(path)
    if language is None:
        raise ValueError(f"No language analyzer is registered for {path!r}.")
    if language.parser == "python-ast":
        adapter: AnalyzerAdapter = PythonAstAdapter()
    elif language.parser == "tree-sitter":
        from .tree_sitter_adapter import TreeSitterAdapter

        adapter = TreeSitterAdapter(language, unavailable_file)
    else:
        adapter = LexicalLineMetricsAdapter(language)
    return adapter.analyze(path, source_bytes)


def _directory_metrics(files: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for file in files:
        directory = file["directory"]
        if directory == ".":
            continue
        parts = directory.split("/")
        for index in range(1, len(parts) + 1):
            grouped["/".join(parts[:index])].append(file)

    output = []
    for path, children in sorted(grouped.items()):
        measured_complexity = [
            file["complexity"] for file in children if file["complexity"] is not None
        ]
        output.append(
            {
                "path": path,
                "files": len(children),
                "loc": sum(file["loc"] or 0 for file in children),
                "averageComplexity": (
                    round(sum(measured_complexity) / len(measured_complexity), 1)
                    if measured_complexity
                    else None
                ),
                "languages": sorted({file["language"] for file in children}),
            }
        )
    return output


def build_project_analysis(
    project_name: str,
    files: list[dict[str, Any]],
    *,
    is_demo: bool = False,
    warnings: list[str] | None = None,
    manifests: list[str] | None = None,
    excluded_directories: list[str] | None = None,
) -> dict[str, Any]:
    max_size = max((file["sizeBytes"] for file in files), default=0)
    for file in files:
        file["relativeSize"] = round(file["sizeBytes"] / max_size, 4) if max_size else 0.0

    valid_files = [file for file in files if file["analysisError"] is None]
    measured_files = [file for file in valid_files if file["complexity"] is not None]
    function_files = [file for file in valid_files if file["functions"] is not None]
    async_function_files = [
        file for file in valid_files if file["asyncFunctions"] is not None
    ]
    class_files = [file for file in valid_files if file["classes"] is not None]
    line_files = [file for file in files if file["physicalLines"] is not None]
    by_language: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for file in files:
        by_language[file["language"]].append(file)

    language_summaries = [
        {
            "language": language,
            "files": len(language_files),
            "analyzedFiles": sum(
                1 for file in language_files if file["analysisError"] is None
            ),
            "loc": sum(file["loc"] or 0 for file in language_files),
            "filesWithComplexity": sum(
                1 for file in language_files if file["complexity"] is not None
            ),
        }
        for language, language_files in sorted(by_language.items())
    ]
    unavailable_metric_count = sum(
        len(file["metricsUnavailable"]) for file in files
    )
    stats = {
        "pythonFiles": len(by_language.get("Python", [])),
        "sourceFiles": len(files),
        "analyzedFiles": len(valid_files),
        "languagesDetected": len(by_language),
        "filesWithLineMetrics": len(line_files),
        "filesWithComplexity": len(measured_files),
        "filesWithFunctionMetrics": len(function_files),
        "filesWithClassMetrics": len(class_files),
        "parsingErrors": sum(1 for file in files if file["analysisError"] is not None),
        "filesWithUnavailableMetrics": sum(
            1 for file in files if file["metricsUnavailable"]
        ),
        "unavailableMetricCount": unavailable_metric_count,
        "filesByLanguage": language_summaries,
        "totalLines": sum(file["physicalLines"] or 0 for file in files),
        "linesOfCode": sum(file["loc"] or 0 for file in files),
        "functions": (
            sum(file["functions"] or 0 for file in function_files)
            if function_files
            else None
        ),
        "asyncFunctions": (
            sum(file["asyncFunctions"] or 0 for file in async_function_files)
            if async_function_files
            else None
        ),
        "classes": (
            sum(file["classes"] or 0 for file in class_files)
            if class_files
            else None
        ),
        "averageComplexity": (
            round(
                sum(file["complexity"] for file in measured_files)
                / len(measured_files),
                1,
            )
            if measured_files
            else None
        ),
        "highComplexityFiles": sum(
            1 for file in measured_files if file["complexityLevel"] == "high"
        ),
    }

    support_warnings = [
        f"{language.name}: line metrics only; structural metrics are unavailable for this language."
        for language in LANGUAGES
        if language.name in by_language and language.parser == "lexical-lines"
    ]
    if is_demo:
        summary = "Deterministic sample analysis. These metrics describe the included demo project."
    elif not files:
        summary = "No supported source files were found in this archive."
    else:
        summary = (
            f"Analyzed {stats['analyzedFiles']} of {stats['sourceFiles']} source files across "
            f"{stats['languagesDetected']} languages; {stats['linesOfCode']:,} LOC and "
            f"complexity metrics for {stats['filesWithComplexity']} files."
        )

    all_functions = [
        fn
        for file in files
        if file.get("functionMetrics")
        for fn in file["functionMetrics"]
    ]
    all_functions.sort(key=lambda item: (item["filePath"].casefold(), item["lineStart"]))

    from .dependencies import build_dependency_graph
    from .refactoring import analyze_refactoring

    dependency_graph = build_dependency_graph(files)
    refactoring_summary = analyze_refactoring(files, dependency_graph)

    return {
        "projectName": project_name,
        "isDemo": is_demo,
        "summary": summary,
        "analyzedAt": datetime.now(UTC).isoformat(),
        "stats": stats,
        "files": sorted(files, key=lambda item: item["path"].casefold()),
        "directories": _directory_metrics(files),
        "warnings": [*(warnings or []), *support_warnings],
        "manifests": sorted(set(manifests or []), key=str.casefold),
        "excludedDirectories": sorted(set(excluded_directories or []), key=str.casefold),
        "languageCapabilities": default_capabilities(),
        "functions": all_functions,
        "dependencyGraph": dependency_graph,
        "refactoringSummary": refactoring_summary,
    }


SAMPLE_PROJECT: dict[str, str] = {
    "src/api/routes.py": '''"""HTTP route handlers for the demo service."""
from ..models.account import Account
from ..core.engine import choose_status

async def get_profile(user_id, repository, include_private=False):
    if not user_id:
        return {"error": "missing user"}
    profile = await repository.load(user_id)
    if profile is None:
        return {"error": "not found"}
    if include_private and profile.is_private:
        return {"error": "private"}
    return profile

def choose_status(result, retries):
    if result is None:
        return 404
    if retries > 3:
        return 503
    if result.ready and result.visible:
        return 200
    return 202
''',
    "src/core/engine.py": '''"""Example decision-heavy orchestration logic."""
from ..config import get_setting

def evaluate_pipeline(payload, rules, strict=False):
    if payload is None:
        return "empty"
    if strict and not payload.get("version"):
        return "missing version"
    if payload.get("archived"):
        return "archived"
    if payload.get("suspended"):
        return "suspended"
    if not rules:
        return "no rules"
    try:
        for rule in rules:
            if rule.enabled and rule.matches(payload):
                if rule.blocking:
                    return "blocked"
                if rule.requires_review:
                    return "review"
    except (ValueError, TypeError):
        return "invalid"
    if payload.get("score", 0) > 80:
        return "approved"
    return "pending"

def summarize(items):
    return [item.name for item in items if item.active and item.visible]
''',
    "src/models/account.py": '''"""Small account model used by the sample."""

class Account:
    def __init__(self, name, active=True):
        self.name = name
        self.active = active

    def label(self):
        if self.active:
            return self.name.strip()
        return "inactive"

    async def refresh(self, client):
        return await client.fetch(self.name)
''',
    "src/storage/cache.py": '''"""A compact cache adapter."""

def get_or_load(cache, key, loader):
    value = cache.get(key)
    if value is not None:
        return value
    value = loader()
    if value is not None:
        cache[key] = value
    return value

def clear_expired(entries, now):
    return {key: item for key, item in entries.items() if item.expires_at > now}
''',
    "src/worker/jobs.py": '''"""Background work examples."""
from ..storage.cache import get_or_load

async def process_batch(items, client):
    completed = []
    for item in items:
        if not item.ready:
            continue
        try:
            response = await client.send(item)
        except TimeoutError:
            if item.retryable:
                continue
            raise
        if response.ok:
            completed.append(item.id)
    return completed
''',
    "src/config.py": '''"""Configuration defaults."""

DEFAULTS = {"timeout": 10, "retries": 2}

def get_setting(settings, name):
    if name in settings:
        return settings[name]
    return DEFAULTS.get(name)
''',
    "tests/test_engine.py": '''"""Unit tests for the pipeline."""
from src.core.engine import evaluate_pipeline

def test_empty_payload():
    assert evaluate_pipeline(None, []) == "empty"

def test_review_required():
    result = evaluate_pipeline({"version": 1}, [review_rule])
    assert result == "review"
''',
    "scripts/maintenance.py": '''"""Maintenance command sample."""
from src.config import get_setting

def run(records, dry_run=False):
    updated = []
    for record in records:
        if not record.valid:
            continue
        if record.stale:
            if dry_run:
                continue
            record.refresh()
        updated.append(record.id)
    return updated
''',
}


def build_demo_analysis() -> dict[str, Any]:
    files = [
        analyze_source(path, source.encode("utf-8"))
        for path, source in SAMPLE_PROJECT.items()
    ]
    return build_project_analysis(
        "sample-fastapi-service",
        files,
        is_demo=True,
    )
