from __future__ import annotations

from threading import local
from typing import Any, Callable

from .language_registry import LanguageSpec
from .line_metrics import decode_text, is_binary_source, lexical_line_metrics

_PARSER_LOCAL = local()

_JS_FUNCTIONS = frozenset(
    {
        "function_declaration",
        "generator_function_declaration",
        "function_expression",
        "arrow_function",
        "method_definition",
    }
)
_COMMON_NESTING_NODES = frozenset(
    {
        "if_statement",
        "for_statement",
        "for_in_statement",
        "for_of_statement",
        "enhanced_for_statement",
        "for_range_loop",
        "while_statement",
        "do_statement",
        "switch_statement",
        "switch_expression",
        "try_statement",
        "try_with_resources_statement",
        "catch_clause",
        "synchronized_statement",
    }
)
_COMMON_LOOPS = frozenset(
    {
        "for_statement",
        "for_in_statement",
        "for_of_statement",
        "enhanced_for_statement",
        "for_range_loop",
        "while_statement",
        "do_statement",
    }
)

_PROFILES: dict[str, dict[str, frozenset[str]]] = {
    "javascript": {
        "functions": _JS_FUNCTIONS,
        "classes": frozenset({"class_declaration", "class_expression"}),
        "function_nesting": _JS_FUNCTIONS,
        "class_nesting": frozenset({"class_declaration", "class_expression"}),
        "if": frozenset({"if_statement"}),
        "loops": _COMMON_LOOPS,
        "ternary": frozenset({"ternary_expression"}),
        "cases": frozenset({"switch_case"}),
        "switches": frozenset({"switch_statement"}),
        "catches": frozenset({"catch_clause"}),
        "imports": frozenset({"import_statement", "export_statement"}),
    },
    "typescript": {
        "functions": _JS_FUNCTIONS,
        "classes": frozenset(
            {
                "class_declaration",
                "abstract_class_declaration",
                "class_expression",
                "interface_declaration",
                "enum_declaration",
                "type_alias_declaration",
            }
        ),
        "function_nesting": _JS_FUNCTIONS,
        "class_nesting": frozenset(
            {
                "class_declaration",
                "abstract_class_declaration",
                "class_expression",
                "interface_declaration",
                "enum_declaration",
            }
        ),
        "if": frozenset({"if_statement"}),
        "loops": _COMMON_LOOPS,
        "ternary": frozenset({"ternary_expression"}),
        "cases": frozenset({"switch_case"}),
        "switches": frozenset({"switch_statement"}),
        "catches": frozenset({"catch_clause"}),
        "imports": frozenset({"import_statement", "export_statement"}),
    },
    "java": {
        "functions": frozenset(
            {
                "method_declaration",
                "constructor_declaration",
                "compact_constructor_declaration",
                "lambda_expression",
            }
        ),
        "classes": frozenset(
            {
                "class_declaration",
                "interface_declaration",
                "enum_declaration",
                "record_declaration",
                "annotation_type_declaration",
            }
        ),
        "function_nesting": frozenset(
            {
                "method_declaration",
                "constructor_declaration",
                "compact_constructor_declaration",
                "lambda_expression",
            }
        ),
        "class_nesting": frozenset(
            {
                "class_declaration",
                "interface_declaration",
                "enum_declaration",
                "record_declaration",
                "annotation_type_declaration",
            }
        ),
        "if": frozenset({"if_statement"}),
        "loops": _COMMON_LOOPS,
        "ternary": frozenset({"ternary_expression"}),
        "cases": frozenset({"switch_label"}),
        "switches": frozenset({"switch_expression"}),
        "catches": frozenset({"catch_clause"}),
        "imports": frozenset({"import_declaration"}),
    },
    "c": {
        "functions": frozenset({"function_definition"}),
        "classes": frozenset(
            {"struct_specifier", "union_specifier", "enum_specifier"}
        ),
        "function_nesting": frozenset({"function_definition"}),
        "class_nesting": frozenset(
            {"struct_specifier", "union_specifier", "enum_specifier"}
        ),
        "if": frozenset({"if_statement"}),
        "loops": _COMMON_LOOPS,
        "ternary": frozenset({"conditional_expression"}),
        "cases": frozenset({"case_statement"}),
        "switches": frozenset({"switch_statement"}),
        "catches": frozenset(),
        "imports": frozenset({"preproc_include"}),
    },
    "cpp": {
        "functions": frozenset({"function_definition", "lambda_expression"}),
        "classes": frozenset(
            {
                "class_specifier",
                "struct_specifier",
                "union_specifier",
                "enum_specifier",
            }
        ),
        "function_nesting": frozenset(
            {"function_definition", "lambda_expression"}
        ),
        "class_nesting": frozenset(
            {
                "class_specifier",
                "struct_specifier",
                "union_specifier",
                "enum_specifier",
            }
        ),
        "if": frozenset({"if_statement"}),
        "loops": _COMMON_LOOPS,
        "ternary": frozenset({"conditional_expression"}),
        "cases": frozenset({"case_statement"}),
        "switches": frozenset({"switch_statement"}),
        "catches": frozenset({"catch_clause"}),
        "imports": frozenset({"preproc_include"}),
    },
}

_ALL_CAPABILITY_FIELDS = (
    ("functions", "functions"),
    ("asyncFunctions", "async_functions"),
    ("classes", "classes"),
    ("complexity", "cyclomatic_complexity"),
    ("nestingDepth", "nesting_depth"),
    ("imports", "imports"),
)


def _get_parser(grammar: str) -> Any:
    parsers = getattr(_PARSER_LOCAL, "parsers", None)
    if parsers is None:
        parsers = {}
        _PARSER_LOCAL.parsers = parsers
    parser = parsers.get(grammar)
    if parser is None:
        from tree_sitter_language_pack import get_parser

        parser = get_parser(grammar)
        parsers[grammar] = parser
    return parser


def _walk(root: Any):
    cursor = root.walk()
    reached_root = False
    while not reached_root:
        yield cursor.node
        if cursor.goto_first_child():
            continue
        if cursor.goto_next_sibling():
            continue
        while True:
            if not cursor.goto_parent():
                reached_root = True
                break
            if cursor.goto_next_sibling():
                break


def _grammar_for_path(language: LanguageSpec, path: str) -> str:
    if language.key == "typescript" and path.casefold().endswith(".tsx"):
        return "tsx"
    if language.grammar is None:
        raise ValueError(f"No Tree-sitter grammar configured for {language.name}.")
    return language.grammar


def _tree_line_metrics(
    source: str, encoded: bytes, comment_ranges: list[tuple[int, int]]
) -> tuple[int, int, int, int]:
    masked = bytearray(encoded)
    for start, end in comment_ranges:
        for index in range(start, min(end, len(masked))):
            if masked[index] not in (10, 13):
                masked[index] = 32

    clean_lines = bytes(masked).decode("utf-8").splitlines()
    original_lines = source.splitlines()
    physical = len(original_lines)
    blank = 0
    comments = 0
    for index in range(physical):
        original = original_lines[index] if index < len(original_lines) else ""
        clean = clean_lines[index] if index < len(clean_lines) else ""
        if clean.strip():
            continue
        if original.strip():
            comments += 1
        else:
            blank += 1
    return physical, physical - blank - comments, blank, comments


def _function_name(node: Any) -> str:
    name = node.child_by_field_name("name")
    if name is not None:
        return name.text.decode("utf-8", errors="replace")

    if node.type in {"function_definition"}:
        declarator = node.child_by_field_name("declarator")
        while declarator is not None:
            nested = declarator.child_by_field_name("declarator")
            if nested is None:
                return declarator.text.decode("utf-8", errors="replace")
            declarator = nested

    ancestor = node.parent
    while ancestor is not None:
        if ancestor.type == "variable_declarator":
            name = ancestor.child_by_field_name("name")
            if name is not None:
                return name.text.decode("utf-8", errors="replace")
        if ancestor.type == "assignment_expression":
            name = ancestor.child_by_field_name("left")
            if name is not None:
                return name.text.decode("utf-8", errors="replace")
        if ancestor.type in {
            "statement_block",
            "class_body",
            "class_declaration",
            "program",
            "translation_unit",
            "block",
        }:
            break
        ancestor = ancestor.parent
    return f"<anonymous@{node.start_point.row + 1}>"


def _class_name(node: Any) -> str | None:
    name = node.child_by_field_name("name")
    if name is not None:
        return name.text.decode("utf-8", errors="replace")
    return None


def _count_parameters_tree_sitter(node: Any, language: LanguageSpec) -> int:
    params_node = node.child_by_field_name("parameters")
    if params_node is None and language.key in ("c", "cpp"):
        declarator = node.child_by_field_name("declarator")
        while declarator is not None:
            params_node = declarator.child_by_field_name("parameters")
            if params_node is not None:
                break
            declarator = declarator.child_by_field_name("declarator")

    if params_node is None:
        param = node.child_by_field_name("parameter")
        if param is not None:
            return 1
        return 0

    count = 0
    param_types = {
        "identifier", "formal_parameter", "parameter_declaration", "spread_parameter",
        "rest_pattern", "assignment_pattern", "object_pattern", "array_pattern",
        "optional_parameter", "required_parameter", "single_pattern"
    }
    for child in params_node.named_children:
        if child.type in param_types or "parameter" in child.type:
            count += 1
        elif child.type not in {",", "(", ")", ";", "comment"}:
            count += 1
    return count


def _has_body(node: Any) -> bool:
    if node.type == "lambda_expression":
        return True
    if node.type in {
        "function_declaration",
        "generator_function_declaration",
        "function_expression",
        "arrow_function",
        "method_definition",
        "function_definition",
    }:
        return node.child_by_field_name("body") is not None
    if node.type in {
        "method_declaration",
        "constructor_declaration",
        "compact_constructor_declaration",
    }:
        return node.child_by_field_name("body") is not None
    return False


def _is_default_case(node: Any) -> bool:
    return node.text.lstrip().startswith(b"default")


def _import_value(node: Any, language: LanguageSpec) -> str | None:
    if language.key in {"javascript", "typescript"}:
        source = node.child_by_field_name("source")
        if source is None:
            return None
        value = source.text.decode("utf-8", errors="replace").strip()
        if len(value) >= 2 and value[0] in {"'", '"', "`"} and value[-1] == value[0]:
            return value[1:-1]
        return value
    if node.type == "import_declaration":
        value = node.text.decode("utf-8", errors="replace").strip()
        return value.removeprefix("import").removesuffix(";").strip()
    if node.type == "preproc_include":
        path = node.child_by_field_name("path")
        if path is not None:
            return path.text.decode("utf-8", errors="replace")
    return None


def _require_or_dynamic_import(node: Any) -> str | None:
    if node.type != "call_expression":
        return None
    function = node.child_by_field_name("function")
    if function is None or function.text not in {b"require", b"import"}:
        return None
    arguments = node.child_by_field_name("arguments")
    if arguments is None or not arguments.named_children:
        return None
    argument = arguments.named_children[0]
    if argument.type not in {"string", "template_string"}:
        return None
    value = argument.text.decode("utf-8", errors="replace").strip()
    if len(value) >= 2 and value[0] in {"'", '"', "`"} and value[-1] == value[0]:
        return value[1:-1]
    return value


def _operator(node: Any) -> str | None:
    operator = node.child_by_field_name("operator")
    if operator is not None:
        return operator.text.decode("utf-8", errors="replace")
    for i in range(node.child_count):
        child = node.child(i)
        if child is not None and child.type in {"&&", "||"}:
            return child.type
    return None


def _empty_counts() -> dict[str, int]:
    return {
        "conditionals": 0,
        "loops": 0,
        "exceptionHandlers": 0,
        "booleanOperators": 0,
        "comprehensionConditions": 0,
    }


def _decision_for_node(
    node: Any, profile: dict[str, frozenset[str]]
) -> dict[str, int]:
    counts = _empty_counts()
    if node.type in profile["if"] or node.type in profile["ternary"]:
        counts["conditionals"] += 1
    if node.type in profile["cases"] and not _is_default_case(node):
        counts["conditionals"] += 1
    if node.type in profile["loops"]:
        counts["loops"] += 1
    if node.type in profile["catches"]:
        counts["exceptionHandlers"] += 1
    if node.type in {"binary_expression", "logical_expression"}:
        if _operator(node) in {"&&", "||"}:
            counts["booleanOperators"] += 1
    return counts


def _complexity_level(score: int) -> str:
    if score <= 5:
        return "low"
    if score <= 10:
        return "medium"
    return "high"


def _complexity_reasons(counts: dict[str, int]) -> list[str]:
    labels = (
        ("conditionals", "conditional branches"),
        ("loops", "loops"),
        ("exceptionHandlers", "exception handlers"),
        ("booleanOperators", "additional boolean operators"),
    )
    reasons = [
        f"{counts[key]} {label}" for key, label in labels if counts[key] > 0
    ]
    if not reasons:
        return ["No decision points beyond the base complexity of 1."]
    return ["Base complexity 1 plus " + ", ".join(reasons) + "."]


def _parse_error_line(root: Any) -> int | None:
    for node in _walk(root):
        if node.is_error or node.is_missing:
            return node.start_point.row + 1
    return None


def _analyze_tree(
    root: Any,
    source: str,
    encoded: bytes,
    language: LanguageSpec,
    path: str,
) -> tuple[tuple[int, int, int, int], dict[str, Any], int | None]:
    profile = _PROFILES[language.key]
    source_lines = source.splitlines()
    comment_ranges: list[tuple[int, int]] = []
    counts = _empty_counts()
    function_rows: list[dict[str, Any]] = []
    function_counts: list[dict[str, int]] = []
    function_max_nesting: list[int] = []
    imports: set[str] = set()
    class_count = 0
    async_count = 0
    max_nesting = 0

    stack = [(root, None, 0, 0, ())]
    while stack:
        node, parent_function, parent_nesting, local_fn_nesting, scope_tuple = stack.pop()
        current_function = parent_function
        current_nesting = parent_nesting
        child_local_nesting = local_fn_nesting
        child_scope = scope_tuple

        if "comment" in node.type:
            comment_ranges.append((node.start_byte, node.end_byte))

        if node.type in profile["classes"]:
            if not node.type.endswith("_specifier") or node.child_by_field_name("body") is not None:
                class_count += 1
                c_name = _class_name(node)
                if c_name:
                    child_scope = scope_tuple + (c_name,)

        if node.type in profile["functions"] and _has_body(node):
            current_function = len(function_rows)
            fn_name = _function_name(node)
            is_async = False
            for i in range(node.child_count):
                c = node.child(i)
                if c is not None and c.type == "async":
                    is_async = True
                    break
            if is_async:
                async_count += 1
            line_start = node.start_point.row + 1
            line_end = node.end_point.row + 1

            fn_loc = 0
            for idx in range(line_start - 1, min(line_end, len(source_lines))):
                if source_lines[idx].strip():
                    fn_loc += 1
            fn_loc = max(1, fn_loc)

            qualified_name = ".".join(scope_tuple + (fn_name,)) if scope_tuple else fn_name
            params_count = _count_parameters_tree_sitter(node, language)
            is_nested = parent_function is not None

            function_rows.append(
                {
                    "name": fn_name,
                    "qualifiedName": qualified_name,
                    "filePath": path,
                    "line": line_start,
                    "lineStart": line_start,
                    "lineEnd": line_end,
                    "loc": fn_loc,
                    "complexity": 1,
                    "complexityLevel": "low",
                    "isAsync": is_async,
                    "isNested": is_nested,
                    "parametersCount": params_count,
                    "nestingDepth": 0,
                    "conditionalBranches": 0,
                    "loops": 0,
                    "booleanOperators": 0,
                    "decisionDetails": [],
                }
            )
            function_counts.append(_empty_counts())
            function_max_nesting.append(0)
            child_scope = scope_tuple + (fn_name,)
            child_local_nesting = 0

        node_decisions = _decision_for_node(node, profile)
        for key, value in node_decisions.items():
            counts[key] += value
            if current_function is not None:
                function_counts[current_function][key] += value

        if node.type in profile["imports"]:
            value = _import_value(node, language)
            if value:
                imports.add(value)
        if language.key in {"javascript", "typescript"}:
            required = _require_or_dynamic_import(node)
            if required:
                imports.add(required)

        is_nesting = (
            node.type in profile["function_nesting"]
            or node.type in profile["class_nesting"]
            or node.type in _COMMON_NESTING_NODES
            or (language.key == "cpp" and node.type == "namespace_definition")
        )
        if is_nesting:
            current_nesting += 1
            max_nesting = max(max_nesting, current_nesting)
            child_local_nesting += 1
            if current_function is not None:
                function_max_nesting[current_function] = max(
                    function_max_nesting[current_function], child_local_nesting
                )

        for i in range(node.child_count - 1, -1, -1):
            child = node.child(i)
            if child is not None:
                stack.append((child, current_function, current_nesting, child_local_nesting, child_scope))

    line_metrics = _tree_line_metrics(source, encoded, comment_ranges)
    parse_error_line = _parse_error_line(root) if root.has_error else None
    for index, row in enumerate(function_rows):
        cc = 1 + sum(function_counts[index].values())
        row["complexity"] = cc
        row["complexityLevel"] = _complexity_level(cc)
        row["nestingDepth"] = function_max_nesting[index]
        row["conditionalBranches"] = function_counts[index]["conditionals"]
        row["loops"] = function_counts[index]["loops"]
        row["booleanOperators"] = function_counts[index]["booleanOperators"]
        details = []
        if function_counts[index]["conditionals"]:
            details.append(f"{function_counts[index]['conditionals']} conditional branches")
        if function_counts[index]["loops"]:
            details.append(f"{function_counts[index]['loops']} loops")
        if function_counts[index]["booleanOperators"]:
            details.append(f"{function_counts[index]['booleanOperators']} boolean operators")
        if function_counts[index]["exceptionHandlers"]:
            details.append(f"{function_counts[index]['exceptionHandlers']} exception handlers")
        row["decisionDetails"] = details

    function_rows.sort(key=lambda item: (item["lineStart"], item["name"]))

    metrics = {
        "functions": len(function_rows),
        "asyncFunctions": async_count,
        "classes": class_count,
        "complexity": 1 + sum(counts.values()),
        "complexityLevel": _complexity_level(1 + sum(counts.values())),
        "decisionCounts": counts,
        "complexityReasons": _complexity_reasons(counts),
        "functionMetrics": function_rows,
        "nestingDepth": max_nesting,
        "imports": sorted(imports, key=str.casefold),
    }
    return line_metrics, metrics, parse_error_line


class TreeSitterAdapter:
    """Shared Tree-sitter syntax adapter with grammar-specific node profiles."""

    def __init__(
        self,
        language: LanguageSpec,
        unavailable_file: Callable[..., dict[str, Any]],
    ) -> None:
        self.language = language
        self.unavailable_file = unavailable_file

    def analyze(self, path: str, source_bytes: bytes) -> dict[str, Any]:
        language = self.language
        size_bytes = len(source_bytes)
        if is_binary_source(source_bytes):
            return self.unavailable_file(
                path, size_bytes, "Binary file skipped.", language
            )
        try:
            source = decode_text(source_bytes)
        except (LookupError, UnicodeDecodeError):
            return self.unavailable_file(
                path,
                size_bytes,
                "Source encoding could not be decoded.",
                language,
            )

        encoded = source.encode("utf-8")
        try:
            grammar = _grammar_for_path(language, path)
            tree = _get_parser(grammar).parse(encoded)
            if tree is None:
                return self.unavailable_file(
                    path,
                    size_bytes,
                    f"The {language.name} parser did not finish.",
                    language,
                    lexical_line_metrics(source, language),
                )
            line_metrics, metrics, error_line = _analyze_tree(
                tree.root_node, source, encoded, language, path
            )
        except (ImportError, OSError, RuntimeError, ValueError, TypeError, RecursionError):
            return self.unavailable_file(
                path,
                size_bytes,
                f"The {language.name} syntax parser is unavailable or could not analyze this file.",
                language,
                lexical_line_metrics(source, language),
            )

        if tree.root_node.has_error:
            location = f" at line {error_line}" if error_line is not None else ""
            return self.unavailable_file(
                path,
                size_bytes,
                f"Unable to parse {language.name} syntax{location}.",
                language,
                line_metrics,
            )

        unavailable = [
            field
            for field, capability in _ALL_CAPABILITY_FIELDS
            if capability not in language.capabilities
        ]
        if "async_functions" not in language.capabilities:
            metrics["asyncFunctions"] = None

        physical, loc, blank, comments = line_metrics
        return {
            "path": path,
            "directory": path.rpartition("/")[0] or ".",
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
            **metrics,
            "analysisError": None,
        }
