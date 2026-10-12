from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class LanguageSpec:
    key: str
    name: str
    extensions: tuple[str, ...]
    line_comments: tuple[str, ...] = ()
    block_comments: tuple[tuple[str, str], ...] = ()
    parser: str = "lexical-lines"
    capabilities: tuple[str, ...] = ("line_metrics",)
    nested_block_comments: bool = False
    grammar: str | None = None


_PYTHON_CAPABILITIES = (
    "line_metrics",
    "functions",
    "async_functions",
    "classes",
    "cyclomatic_complexity",
    "nesting_depth",
    "imports",
)

_STRUCTURAL_CAPABILITIES = (
    "line_metrics",
    "functions",
    "classes",
    "cyclomatic_complexity",
    "nesting_depth",
    "imports",
)
_JS_TS_CAPABILITIES = (
    *_STRUCTURAL_CAPABILITIES,
    "async_functions",
)

LANGUAGES: tuple[LanguageSpec, ...] = (
    LanguageSpec("python", "Python", (".py", ".pyw"), ("#",), parser="python-ast", capabilities=_PYTHON_CAPABILITIES),
    LanguageSpec(
        "javascript",
        "JavaScript",
        (".js", ".jsx", ".mjs", ".cjs"),
        ("//",),
        (("/*", "*/"),),
        parser="tree-sitter",
        capabilities=_JS_TS_CAPABILITIES,
        grammar="javascript",
    ),
    LanguageSpec(
        "typescript",
        "TypeScript",
        (".ts", ".tsx", ".mts", ".cts"),
        ("//",),
        (("/*", "*/"),),
        parser="tree-sitter",
        capabilities=_JS_TS_CAPABILITIES,
        grammar="typescript",
    ),
    LanguageSpec(
        "java",
        "Java",
        (".java",),
        ("//",),
        (("/*", "*/"),),
        parser="tree-sitter",
        capabilities=_STRUCTURAL_CAPABILITIES,
        grammar="java",
    ),
    LanguageSpec(
        "c",
        "C",
        (".c", ".h"),
        ("//",),
        (("/*", "*/"),),
        parser="tree-sitter",
        capabilities=_STRUCTURAL_CAPABILITIES,
        grammar="c",
    ),
    LanguageSpec(
        "cpp",
        "C++",
        (".cpp", ".cc", ".cxx", ".hpp", ".hh", ".hxx"),
        ("//",),
        (("/*", "*/"),),
        parser="tree-sitter",
        capabilities=_STRUCTURAL_CAPABILITIES,
        grammar="cpp",
    ),
    LanguageSpec("csharp", "C#", (".cs",), ("//",), (("/*", "*/"),)),
    LanguageSpec("go", "Go", (".go",), ("//",), (("/*", "*/"),)),
    LanguageSpec("rust", "Rust", (".rs",), ("//",), (("/*", "*/"),), nested_block_comments=True),
    LanguageSpec("php", "PHP", (".php",), ("//", "#"), (("/*", "*/"),)),
    LanguageSpec("ruby", "Ruby", (".rb",), ("#",)),
    LanguageSpec("swift", "Swift", (".swift",), ("//",), (("/*", "*/"),), nested_block_comments=True),
    LanguageSpec("kotlin", "Kotlin", (".kt", ".kts"), ("//",), (("/*", "*/"),), nested_block_comments=True),
    LanguageSpec("dart", "Dart", (".dart",), ("//",), (("/*", "*/"),)),
    LanguageSpec("sql", "SQL", (".sql",), ("--",), (("/*", "*/"),)),
    LanguageSpec("html", "HTML", (".html", ".htm"), (), (("<!--", "-->"),)),
    LanguageSpec("css", "CSS", (".css", ".scss", ".sass", ".less"), (), (("/*", "*/"),)),
    LanguageSpec("shell", "Shell", (".sh", ".bash", ".zsh"), ("#",)),
    LanguageSpec("vue", "Vue", (".vue",), ("//",), (("<!--", "-->"), ("/*", "*/"))),
    LanguageSpec("svelte", "Svelte", (".svelte",), ("//",), (("<!--", "-->"), ("/*", "*/"))),
)

LANGUAGE_BY_EXTENSION = {
    extension: language
    for language in LANGUAGES
    for extension in language.extensions
}

PROJECT_MANIFESTS = frozenset(
    {
        "package.json",
        "pyproject.toml",
        "cargo.toml",
        "go.mod",
        "pom.xml",
        "build.gradle",
        "dockerfile",
    }
)


def language_for_path(path: str) -> LanguageSpec | None:
    lowered = path.casefold()
    if lowered.rsplit("/", 1)[-1] == "dockerfile":
        return None
    extension = "." + lowered.rsplit(".", 1)[-1] if "." in lowered.rsplit("/", 1)[-1] else ""
    return LANGUAGE_BY_EXTENSION.get(extension)


def is_project_manifest(path: str) -> bool:
    return path.casefold().rsplit("/", 1)[-1] in PROJECT_MANIFESTS


def default_capabilities() -> dict[str, list[str]]:
    return {language.name: list(language.capabilities) for language in LANGUAGES}
