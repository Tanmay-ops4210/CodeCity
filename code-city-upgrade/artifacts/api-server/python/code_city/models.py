from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


def _to_camel(value: str) -> str:
    first, *remaining = value.split("_")
    return first + "".join(part.capitalize() for part in remaining)


class ApiModel(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)


class HealthStatus(BaseModel):
    status: Literal["ok"]


class ErrorMessage(BaseModel):
    detail: str


class DecisionCounts(ApiModel):
    conditionals: int
    loops: int
    exception_handlers: int
    boolean_operators: int
    comprehension_conditions: int


class FunctionMetric(ApiModel):
    name: str
    qualified_name: str = ""
    file_path: str = ""
    line: int
    line_start: int = 1
    line_end: int = 1
    loc: int = 0
    complexity: int = 1
    complexity_level: Literal["low", "medium", "high"] = "low"
    is_async: bool = False
    is_nested: bool = False
    parameters_count: int = 0
    nesting_depth: int = 0
    conditional_branches: int = 0
    loops: int = 0
    boolean_operators: int = 0
    decision_details: list[str] = Field(default_factory=list)


class DependencyNode(ApiModel):
    id: str
    label: str
    node_type: Literal["file", "package", "external", "standard_library"]
    language: str | None = None
    path: str | None = None
    loc: int | None = None
    complexity: float | None = None
    incoming_count: int = 0
    outgoing_count: int = 0


class DependencyEdge(ApiModel):
    source: str
    target: str
    dependency_type: Literal["internal", "external", "standard_library", "unresolved"]
    statement: str | None = None
    resolved: bool = True


class DependencyCycle(ApiModel):
    cycle_id: str
    files: list[str]
    size: int
    paths: list[str]
    edges: list[list[str]] = Field(default_factory=list)
    suggested_steps: list[str] = Field(default_factory=list)


class DependencyGraph(ApiModel):
    nodes: list[DependencyNode] = Field(default_factory=list)
    edges: list[DependencyEdge] = Field(default_factory=list)
    cycles: list[DependencyCycle] = Field(default_factory=list)
    total_internal_edges: int = 0
    total_external_edges: int = 0
    unresolved_dependencies: list[str] = Field(default_factory=list)


class RefactoringFinding(ApiModel):
    id: str
    rule_id: str
    rule_name: str
    severity: Literal["critical", "warning", "info"]
    file_path: str
    language: str
    function_name: str | None = None
    line_start: int | None = None
    line_end: int | None = None
    actual_value: float | int | str
    threshold: float | int | str
    issue_explanation: str
    recommendation: str
    target_type: Literal["function", "file", "cycle", "module"]


class RefactoringSummary(ApiModel):
    findings: list[RefactoringFinding] = Field(default_factory=list)
    total_findings: int = 0
    critical_count: int = 0
    warning_count: int = 0
    info_count: int = 0
    rule_counts: dict[str, int] = Field(default_factory=dict)


class FileAnalysis(ApiModel):
    path: str
    directory: str
    filename: str
    language: str
    capabilities: list[str]
    metrics_unavailable: list[str]
    physical_lines: int | None
    loc: int | None
    blank_lines: int | None
    comment_lines: int | None
    size_bytes: int
    relative_size: float = Field(
        description="File byte size divided by the largest supported source file's byte size, from 0 to 1."
    )
    functions: int | None
    async_functions: int | None
    classes: int | None
    complexity: int | None
    complexity_level: Literal["low", "medium", "high"] | None
    decision_counts: DecisionCounts | None
    complexity_reasons: list[str] | None
    function_metrics: list[FunctionMetric] | None
    nesting_depth: int | None
    imports: list[str] | None
    analysis_error: str | None


class DirectoryMetric(ApiModel):
    path: str
    files: int
    loc: int
    average_complexity: float | None
    languages: list[str]


class LanguageSummary(ApiModel):
    language: str
    files: int
    analyzed_files: int
    loc: int
    files_with_complexity: int


class AnalysisStats(ApiModel):
    python_files: int
    source_files: int
    analyzed_files: int
    languages_detected: int
    files_with_line_metrics: int
    files_with_complexity: int
    files_with_function_metrics: int
    files_with_class_metrics: int
    parsing_errors: int
    files_with_unavailable_metrics: int
    unavailable_metric_count: int
    files_by_language: list[LanguageSummary]
    total_lines: int
    lines_of_code: int
    functions: int | None
    async_functions: int | None
    classes: int | None
    average_complexity: float | None
    high_complexity_files: int


class ProjectAnalysis(ApiModel):
    project_name: str
    is_demo: bool
    summary: str
    analyzed_at: datetime
    stats: AnalysisStats
    files: list[FileAnalysis]
    directories: list[DirectoryMetric]
    warnings: list[str]
    manifests: list[str]
    excluded_directories: list[str]
    language_capabilities: dict[str, list[str]]
    functions: list[FunctionMetric] = Field(default_factory=list)
    dependency_graph: DependencyGraph | None = None
    refactoring_summary: RefactoringSummary | None = None
