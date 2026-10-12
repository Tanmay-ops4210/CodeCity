from __future__ import annotations

from typing import Any

DEFAULT_THRESHOLDS = {
    "high-complexity": 10,
    "long-function": 50,
    "deep-nesting": 4,
    "large-file": 300,
    "excessive-parameters": 4,
    "high-coupling": 6,
}


def analyze_refactoring(
    files: list[dict[str, Any]],
    dependency_graph: dict[str, Any] | None = None,
    thresholds: dict[str, int] | None = None,
) -> dict[str, Any]:
    """
    Deterministic rule-based refactoring advisor.
    Generates actionable findings prioritized by severity based on actual metrics.
    Only evaluates rules when the corresponding capability is supported by the language parser.
    """
    cfg = {**DEFAULT_THRESHOLDS, **(thresholds or {})}
    findings: list[dict[str, Any]] = []

    # Map node degrees from dependency graph
    node_coupling: dict[str, tuple[int, int]] = {}
    if dependency_graph:
        for node in dependency_graph.get("nodes", []):
            if node.get("nodeType") == "file" and node.get("path"):
                node_coupling[node["path"]] = (
                    node.get("incomingCount", 0),
                    node.get("outgoingCount", 0),
                )

    # 1. Circular dependencies from graph
    if dependency_graph:
        for cycle in dependency_graph.get("cycles", []):
            cycle_size = cycle.get("size", len(cycle.get("files", [])))
            path_str = " -> ".join(cycle.get("files", [])[:4])
            if cycle_size > 4:
                path_str += " -> ..."
            for file_path in cycle.get("files", []):
                findings.append(
                    {
                        "id": f"refactor-cycle-{file_path}-{cycle['cycleId']}",
                        "ruleId": "circular-dependency",
                        "ruleName": "Circular Dependency Detected",
                        "severity": "critical",
                        "filePath": file_path,
                        "language": "Multi-language",
                        "functionName": None,
                        "lineStart": None,
                        "lineEnd": None,
                        "actualValue": f"{cycle_size} files in cycle",
                        "threshold": "0 circular cycles",
                        "issueExplanation": (
                            f"File '{file_path}' participates in a directed dependency cycle of {cycle_size} files ({path_str})."
                        ),
                        "recommendation": (
                            "Break circular coupling by extracting shared data models or interfaces into a separate leaf module, "
                            "or apply dependency injection to decouple runtime callers."
                        ),
                        "targetType": "cycle",
                    }
                )

    # 2. File and Function level checks
    for file_info in files:
        file_path = file_info["path"]
        lang = file_info["language"]
        capabilities = set(file_info.get("capabilities", []))
        unavailable = set(file_info.get("metricsUnavailable", []))

        # Check: Large file
        file_loc = file_info.get("loc")
        if file_loc is not None and "line_metrics" in capabilities:
            limit = cfg["large-file"]
            if file_loc > limit:
                sev = "critical" if file_loc > limit * 2 else "warning"
                findings.append(
                    {
                        "id": f"refactor-large-file-{file_path}",
                        "ruleId": "large-file",
                        "ruleName": "Excessive File Length",
                        "severity": sev,
                        "filePath": file_path,
                        "language": lang,
                        "functionName": None,
                        "lineStart": 1,
                        "lineEnd": file_info.get("physicalLines", file_loc),
                        "actualValue": f"{file_loc} LOC",
                        "threshold": f"{limit} LOC",
                        "issueExplanation": (
                            f"File '{file_info['filename']}' contains {file_loc} lines of code, exceeding the threshold of {limit} LOC."
                        ),
                        "recommendation": (
                            "Decompose this file into cohesive, modular components grouped by domain responsibility."
                        ),
                        "targetType": "file",
                    }
                )

        # Check: High coupling
        if file_path in node_coupling:
            inc, outg = node_coupling[file_path]
            tot_degree = inc + outg
            c_limit = cfg["high-coupling"]
            if tot_degree > c_limit:
                sev = "critical" if tot_degree > c_limit * 1.6 else "warning"
                findings.append(
                    {
                        "id": f"refactor-coupling-{file_path}",
                        "ruleId": "high-coupling",
                        "ruleName": "Highly Coupled Module",
                        "severity": sev,
                        "filePath": file_path,
                        "language": lang,
                        "functionName": None,
                        "lineStart": None,
                        "lineEnd": None,
                        "actualValue": f"{tot_degree} connections ({inc} in, {outg} out)",
                        "threshold": f"{c_limit} connections",
                        "issueExplanation": (
                            f"Module '{file_info['filename']}' is heavily coupled with {inc} incoming dependents and {outg} outgoing dependencies."
                        ),
                        "recommendation": (
                            "Introduce a facade or mediator, or extract shared utility responsibilities to reduce bidirectional coupling."
                        ),
                        "targetType": "module",
                    }
                )

        # Check: Redundant / duplicate imports
        raw_imports = file_info.get("imports") or []
        if len(raw_imports) > len(set(raw_imports)):
            seen = set()
            duplicates = []
            for imp in raw_imports:
                if imp in seen and imp not in duplicates:
                    duplicates.append(imp)
                seen.add(imp)
            if duplicates:
                findings.append(
                    {
                        "id": f"refactor-dup-imports-{file_path}",
                        "ruleId": "duplicate-dependencies",
                        "ruleName": "Duplicate Import Declarations",
                        "severity": "info",
                        "filePath": file_path,
                        "language": lang,
                        "functionName": None,
                        "lineStart": None,
                        "lineEnd": None,
                        "actualValue": f"{len(duplicates)} repeated imports",
                        "threshold": "0 duplicates",
                        "issueExplanation": (
                            f"File '{file_info['filename']}' contains repeated import declarations for: {', '.join(duplicates)}."
                        ),
                        "recommendation": (
                            "Consolidate duplicate import statements to keep module dependencies clean and maintainable."
                        ),
                        "targetType": "file",
                    }
                )

        # Check: Function-level metrics (only if functions capability is available and complexity is supported)
        has_function_support = "functions" in capabilities and "complexity" not in unavailable
        if has_function_support and file_info.get("functionMetrics"):
            for fn in file_info["functionMetrics"]:
                fn_name = fn.get("qualifiedName") or fn.get("name")
                fn_loc = fn.get("loc", 0)
                fn_cc = fn.get("complexity", 1)
                fn_params = fn.get("parametersCount", 0)
                fn_nesting = fn.get("nestingDepth", 0)
                fn_line = fn.get("lineStart") or fn.get("line", 1)
                fn_end = fn.get("lineEnd", fn_line)

                # Rule 1: High complexity
                cc_limit = cfg["high-complexity"]
                if fn_cc > cc_limit:
                    sev = "critical" if fn_cc >= 15 else "warning"
                    details_str = ", ".join(fn.get("decisionDetails", [])) or "multiple decision branches"
                    findings.append(
                        {
                            "id": f"refactor-complexity-{file_path}-{fn_name}-{fn_line}",
                            "ruleId": "high-complexity",
                            "ruleName": "High Cyclomatic Complexity",
                            "severity": sev,
                            "filePath": file_path,
                            "language": lang,
                            "functionName": fn_name,
                            "lineStart": fn_line,
                            "lineEnd": fn_end,
                            "actualValue": f"CC {fn_cc}",
                            "threshold": f"CC {cc_limit}",
                            "issueExplanation": (
                                f"Function '{fn_name}' has high cyclomatic complexity (CC={fn_cc}, threshold={cc_limit}) driven by {details_str}."
                            ),
                            "recommendation": (
                                "Inspect decision branches and extract cohesive helper methods, or replace complex conditionals with lookup tables or strategy pattern."
                            ),
                            "targetType": "function",
                        }
                    )

                # Rule 2: Long function
                loc_limit = cfg["long-function"]
                if fn_loc > loc_limit:
                    sev = "critical" if fn_loc > loc_limit * 2 else "warning"
                    findings.append(
                        {
                            "id": f"refactor-long-fn-{file_path}-{fn_name}-{fn_line}",
                            "ruleId": "long-function",
                            "ruleName": "Excessive Function Length",
                            "severity": sev,
                            "filePath": file_path,
                            "language": lang,
                            "functionName": fn_name,
                            "lineStart": fn_line,
                            "lineEnd": fn_end,
                            "actualValue": f"{fn_loc} LOC",
                            "threshold": f"{loc_limit} LOC",
                            "issueExplanation": (
                                f"Function '{fn_name}' spans {fn_loc} lines of code, exceeding the threshold of {loc_limit} LOC."
                            ),
                            "recommendation": (
                                "Separate distinct responsibilities into smaller, focused single-purpose functions."
                            ),
                            "targetType": "function",
                        }
                    )

                # Rule 3: Deep nesting
                nesting_limit = cfg["deep-nesting"]
                if fn_nesting >= nesting_limit:
                    sev = "critical" if fn_nesting >= nesting_limit + 2 else "warning"
                    findings.append(
                        {
                            "id": f"refactor-nesting-{file_path}-{fn_name}-{fn_line}",
                            "ruleId": "deep-nesting",
                            "ruleName": "Deeply Nested Logic",
                            "severity": sev,
                            "filePath": file_path,
                            "language": lang,
                            "functionName": fn_name,
                            "lineStart": fn_line,
                            "lineEnd": fn_end,
                            "actualValue": f"Depth {fn_nesting}",
                            "threshold": f"Depth {nesting_limit}",
                            "issueExplanation": (
                                f"Function '{fn_name}' reaches a nesting depth of {fn_nesting} (threshold: {nesting_limit})."
                            ),
                            "recommendation": (
                                "Apply guard clauses, early returns, or extract nested loops/conditions into helper functions to flatten control flow."
                            ),
                            "targetType": "function",
                        }
                    )

                # Rule 5: Excessive parameters
                param_limit = cfg["excessive-parameters"]
                if fn_params > param_limit:
                    sev = "critical" if fn_params >= param_limit + 3 else "warning"
                    findings.append(
                        {
                            "id": f"refactor-params-{file_path}-{fn_name}-{fn_line}",
                            "ruleId": "excessive-parameters",
                            "ruleName": "Excessive Function Parameters",
                            "severity": sev,
                            "filePath": file_path,
                            "language": lang,
                            "functionName": fn_name,
                            "lineStart": fn_line,
                            "lineEnd": fn_end,
                            "actualValue": f"{fn_params} parameters",
                            "threshold": f"{param_limit} parameters",
                            "issueExplanation": (
                                f"Function '{fn_name}' takes {fn_params} parameters, exceeding the threshold of {param_limit}."
                            ),
                            "recommendation": (
                                "Bundle related parameters into a configuration object, data class, or options struct."
                            ),
                            "targetType": "function",
                        }
                    )

    # Deterministic prioritization: Critical > Warning > Info, then by ruleId, then filePath, then line
    severity_rank = {"critical": 0, "warning": 1, "info": 2}
    sorted_findings = sorted(
        findings,
        key=lambda f: (
            severity_rank.get(f["severity"], 3),
            f["ruleId"],
            f["filePath"],
            f.get("lineStart") or 0,
        ),
    )

    rule_counts: dict[str, int] = {}
    critical_count = 0
    warning_count = 0
    info_count = 0
    for f in sorted_findings:
        rule_counts[f["ruleId"]] = rule_counts.get(f["ruleId"], 0) + 1
        if f["severity"] == "critical":
            critical_count += 1
        elif f["severity"] == "warning":
            warning_count += 1
        else:
            info_count += 1

    return {
        "findings": sorted_findings,
        "totalFindings": len(sorted_findings),
        "criticalCount": critical_count,
        "warningCount": warning_count,
        "infoCount": info_count,
        "ruleCounts": rule_counts,
    }
