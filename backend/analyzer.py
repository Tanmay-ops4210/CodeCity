"""
Code City Static Code Analyzer.
Uses Python's built-in `ast` module to extract structural metrics, lines of code,
cyclomatic complexity, and risk analysis without executing target code.
"""

import ast
import os
from typing import Dict, Any, List, Optional


class ComplexityVisitor(ast.NodeVisitor):
    """
    Traverses the AST to calculate cyclomatic complexity and structural counts.
    Base complexity starts at 1.
    Each control-flow branch increases complexity by 1.
    """

    def __init__(self):
        self.complexity = 1
        self.functions_count = 0
        self.classes_count = 0
        self.branches_count = 0
        self.function_names = []
        self.class_names = []

    def visit_FunctionDef(self, node):
        self.functions_count += 1
        self.function_names.append(node.name)
        self.complexity += 1
        self.generic_visit(node)

    def visit_AsyncFunctionDef(self, node):
        self.functions_count += 1
        self.function_names.append(node.name)
        self.complexity += 1
        self.generic_visit(node)

    def visit_ClassDef(self, node):
        self.classes_count += 1
        self.class_names.append(node.name)
        self.generic_visit(node)

    def visit_If(self, node):
        self.complexity += 1
        self.branches_count += 1
        self.generic_visit(node)

    def visit_IfExp(self, node):
        # Ternary conditional expressions (a if cond else b)
        self.complexity += 1
        self.branches_count += 1
        self.generic_visit(node)

    def visit_For(self, node):
        self.complexity += 1
        self.branches_count += 1
        self.generic_visit(node)

    def visit_AsyncFor(self, node):
        self.complexity += 1
        self.branches_count += 1
        self.generic_visit(node)

    def visit_While(self, node):
        self.complexity += 1
        self.branches_count += 1
        self.generic_visit(node)

    def visit_ExceptHandler(self, node):
        self.complexity += 1
        self.branches_count += 1
        self.generic_visit(node)

    def visit_With(self, node):
        self.complexity += 1
        self.branches_count += 1
        self.generic_visit(node)

    def visit_AsyncWith(self, node):
        self.complexity += 1
        self.branches_count += 1
        self.generic_visit(node)

    def visit_BoolOp(self, node):
        # e.g., if a and b and c -> 2 additional decision points
        extra = len(node.values) - 1
        self.complexity += extra
        self.branches_count += extra
        self.generic_visit(node)

    def visit_ListComp(self, node):
        self.complexity += len(node.generators)
        self.branches_count += len(node.generators)
        self.generic_visit(node)

    def visit_SetComp(self, node):
        self.complexity += len(node.generators)
        self.branches_count += len(node.generators)
        self.generic_visit(node)

    def visit_DictComp(self, node):
        self.complexity += len(node.generators)
        self.branches_count += len(node.generators)
        self.generic_visit(node)

    def visit_GeneratorExp(self, node):
        self.complexity += len(node.generators)
        self.branches_count += len(node.generators)
        self.generic_visit(node)

    def visit_Match(self, node):
        # Python 3.10+ pattern matching
        cases = getattr(node, 'cases', [])
        self.complexity += len(cases)
        self.branches_count += len(cases)
        self.generic_visit(node)


def calculate_loc(source_text: str) -> int:
    """Calculates physical source lines excluding blank lines."""
    lines = source_text.splitlines()
    loc = 0
    for line in lines:
        stripped = line.strip()
        if stripped:
            loc += 1
    return max(loc, 1)


def determine_risk(complexity: int) -> str:
    """
    Determines risk level based on cyclomatic complexity:
    LOW: 1 - 5
    MEDIUM: 6 - 10
    HIGH: 11 - 25
    CRITICAL: 26+
    """
    if complexity <= 5:
        return "LOW"
    elif complexity <= 10:
        return "MEDIUM"
    elif complexity <= 25:
        return "HIGH"
    else:
        return "CRITICAL"


def analyze_code_string(source_text: str, file_path: str, root_dir: str = "") -> Dict[str, Any]:
    """Analyzes Python code content using AST and returns structured file metrics."""
    rel_path = os.path.relpath(file_path, root_dir) if root_dir else file_path
    rel_path = rel_path.replace("\\", "/")
    
    # Extract district/folder
    folder = os.path.dirname(rel_path)
    if not folder or folder == ".":
        folder = "root"
    
    name = os.path.basename(file_path)
    loc = calculate_loc(source_text)

    try:
        tree = ast.parse(source_text, filename=file_path)
        visitor = ComplexityVisitor()
        visitor.visit(tree)
        complexity = visitor.complexity
        functions = visitor.functions_count
        classes = visitor.classes_count
        branches = visitor.branches_count
        func_names = visitor.function_names
        class_names = visitor.class_names
    except SyntaxError:
        # Fallback for syntax errors in invalid files
        complexity = max(1, loc // 30)
        functions = 0
        classes = 0
        branches = 0
        func_names = []
        class_names = []

    risk = determine_risk(complexity)

    # Diagnose potential issues
    issues = []
    if branches > 20:
        issues.append("High branching logic")
    if loc > 400:
        issues.append("Large monolithic file")
    if complexity >= 20:
        issues.append("Difficult to unit test")
    if complexity >= 15 or loc >= 350:
        issues.append("Prime candidate for refactoring")
    if functions > 12:
        issues.append("High method density")
    if classes > 3:
        issues.append("Multiple classes in single file")
    if not issues:
        issues.append("Well-scoped module")

    # Generate heuristic refactoring recommendations
    refactoring = None
    if complexity >= 18 or loc >= 450 or branches >= 22:
        potential_modules = []
        if func_names:
            chunk_size = max(2, len(func_names) // 3)
            for i in range(0, min(len(func_names), 9), chunk_size):
                chunk = func_names[i:i + chunk_size]
                if chunk:
                    potential_modules.append(f"{chunk[0]}_module")
        if not potential_modules:
            base_slug = name.replace(".py", "")
            potential_modules = [
                f"{base_slug}_handlers",
                f"{base_slug}_validation",
                f"{base_slug}_orchestrator"
            ]

        refactoring = {
            "type": "MONSTER FILE" if loc > 500 else "HIGH COMPLEXITY MODULE",
            "recommendation": "Split into smaller cohesive sub-modules",
            "potential_modules": potential_modules[:4]
        }

    return {
        "name": name,
        "path": rel_path,
        "folder": folder,
        "loc": loc,
        "complexity": complexity,
        "risk": risk,
        "functions": functions,
        "classes": classes,
        "branches": branches,
        "issues": issues,
        "refactoring": refactoring
    }


def analyze_repository(repo_path: str, ignore_patterns: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Recursively analyzes a Python repository directory.
    Never executes source code.
    """
    if ignore_patterns is None:
        ignore_patterns = [
            ".git", "__pycache__", "node_modules", ".venv", "venv",
            ".env", ".pytest_cache", ".ruff_cache", ".mypy_cache",
            "dist", "build", ".egg-info", ".idea", ".vscode"
        ]

    repo_path = os.path.abspath(repo_path)
    if not os.path.exists(repo_path):
        raise FileNotFoundError(f"Repository path not found: {repo_path}")

    files_data: List[Dict[str, Any]] = []
    districts_set = set()

    for root, dirs, files in os.walk(repo_path):
        # Filter directories in-place to avoid descending into ignored dirs
        dirs[:] = [d for d in dirs if d not in ignore_patterns and not d.startswith(".")]

        for file in files:
            if file.endswith(".py"):
                file_full_path = os.path.join(root, file)
                try:
                    with open(file_full_path, "r", encoding="utf-8", errors="replace") as f:
                        content = f.read()
                    file_info = analyze_code_string(content, file_full_path, repo_path)
                    files_data.append(file_info)
                    districts_set.add(file_info["folder"])
                except Exception as e:
                    print(f"Skipping {file_full_path}: {e}")

    total_files = len(files_data)
    total_loc = sum(f["loc"] for f in files_data)
    total_complexity = sum(f["complexity"] for f in files_data)
    total_functions = sum(f["functions"] for f in files_data)
    total_classes = sum(f["classes"] for f in files_data)
    avg_complexity = round(total_complexity / total_files, 1) if total_files > 0 else 0.0
    high_risk_files = sum(1 for f in files_data if f["risk"] in ("HIGH", "CRITICAL"))

    # Sort files by complexity descending for risk leaderboard
    top_risk_files = sorted(files_data, key=lambda x: (x["complexity"], x["loc"]), reverse=True)[:10]

    repo_name = os.path.basename(repo_path.rstrip("/\\")) or "repository"

    return {
        "repository": repo_name,
        "root_path": repo_path,
        "total_files": total_files,
        "total_loc": total_loc,
        "total_complexity": total_complexity,
        "avg_complexity": avg_complexity,
        "total_functions": total_functions,
        "total_classes": total_classes,
        "high_risk_files": high_risk_files,
        "districts": sorted(list(districts_set)),
        "files": files_data,
        "top_risk_files": top_risk_files
    }
