from __future__ import annotations

import io
import unittest
import zipfile
from unittest import mock

from code_city.analyzer import analyze_file, analyze_source
from code_city.archive import MAX_SOURCE_BYTES, analyze_zip_bytes
from code_city.language_registry import LANGUAGES, language_for_path
from code_city.models import ProjectAnalysis


def make_zip(entries: list[tuple[str, bytes | str]]) -> bytes:
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
        for path, contents in entries:
            archive.writestr(path, contents)
    return output.getvalue()


class LanguageRegistryTests(unittest.TestCase):
    def test_all_requested_extensions_are_registered(self) -> None:
        expected = {
            ".py", ".pyw",
            ".js", ".jsx", ".mjs", ".cjs",
            ".ts", ".tsx", ".mts", ".cts",
            ".java",
            ".c", ".h",
            ".cpp", ".cc", ".cxx", ".hpp", ".hh", ".hxx",
            ".cs", ".go", ".rs", ".php", ".rb", ".swift",
            ".kt", ".kts", ".dart", ".sql", ".html", ".htm",
            ".css", ".scss", ".sass", ".less", ".sh", ".bash",
            ".zsh", ".vue", ".svelte",
        }
        registered = {
            extension
            for language in LANGUAGES
            for extension in language.extensions
        }
        self.assertEqual(registered, expected)
        self.assertIsNone(language_for_path("docs/README.txt"))
        self.assertIsNone(language_for_path("package.json"))
        self.assertEqual(language_for_path("src/APP.TSX").name, "TypeScript")

    def test_project_manifests_are_metadata_not_sources(self) -> None:
        paths = [
            "package.json",
            "pyproject.toml",
            "Cargo.toml",
            "go.mod",
            "pom.xml",
            "build.gradle",
            "Dockerfile",
        ]
        for path in paths:
            with self.subTest(path=path):
                self.assertIsNone(language_for_path(path))


class LanguageLineMetricTests(unittest.TestCase):
    def assert_lines(self, path: str, source: bytes, expected: tuple[int, int, int, int]) -> None:
        result = analyze_file(path, source)
        self.assertIsNone(result["analysisError"])
        self.assertEqual(
            (
                result["physicalLines"],
                result["loc"],
                result["blankLines"],
                result["commentLines"],
            ),
            expected,
        )

    def test_python_comments_inline_comments_and_docstrings(self) -> None:
        result = analyze_source(
            "module.py",
            b'# standalone\nvalue = "# literal"\n"""docstring with # text"""\n\nvalue += 1 # inline\n',
        )
        self.assertEqual(result["physicalLines"], 5)
        self.assertEqual(result["loc"], 3)
        self.assertEqual(result["blankLines"], 1)
        self.assertEqual(result["commentLines"], 1)
        self.assertEqual(result["functions"], 0)
        self.assertEqual(result["complexity"], 1)

    def test_javascript_string_template_and_block_comments(self) -> None:
        self.assert_lines(
            "app.js",
            b'const url = "https://example.test";\n/* comment\n * continues\n */\nconst text = `// literal`;\n',
            (5, 2, 0, 3),
        )

    def test_c_family_preprocessor_and_string_comment_markers(self) -> None:
        self.assert_lines(
            "main.cpp",
            b'#define HEADER <x> // directive\nconst char* s = "/* literal */";\n/* comment */\nint f(){ return 0; }\n',
            (4, 3, 0, 1),
        )

    def test_sql_and_html_comments_are_not_confused_with_strings(self) -> None:
        self.assert_lines(
            "query.sql",
            b"SELECT '-- literal';\n-- real comment\n",
            (2, 1, 0, 1),
        )
        self.assert_lines(
            "index.html",
            b'<div title="<!-- literal -->">content</div>\n<!-- real comment -->\n',
            (2, 1, 0, 1),
        )

    def test_css_comment_markers_inside_string(self) -> None:
        self.assert_lines(
            "site.scss",
            b'.notice::before { content: "/* literal */"; }\n/* stylesheet note */\n',
            (2, 1, 0, 1),
        )

    def test_python_structure_and_capability_metrics(self) -> None:
        result = analyze_source(
            "src/core.py",
            b"import os\nfrom pathlib import Path\n\nclass Store:\n    def load(self, value):\n        if value:\n            return Path(value)\n        return None\n",
        )
        self.assertEqual(result["functions"], 1)
        self.assertEqual(result["classes"], 1)
        self.assertEqual(result["complexity"], 2)
        self.assertEqual(result["nestingDepth"], 3)
        self.assertEqual(result["imports"], ["os", "pathlib"])
        self.assertIn("cyclomatic_complexity", result["capabilities"])
        self.assertEqual(result["metricsUnavailable"], [])

    def test_non_python_reports_structural_metrics_as_unavailable(self) -> None:
        result = analyze_file("app.go", b"package main\n")
        self.assertEqual(result["loc"], 1)
        self.assertIsNone(result["functions"])
        self.assertIsNone(result["complexity"])
        self.assertIsNone(result["complexityLevel"])
        self.assertIsNone(result["decisionCounts"])
        self.assertIn("complexity", result["metricsUnavailable"])
        self.assertEqual(result["capabilities"], ["line_metrics"])

    def test_tree_sitter_capabilities_are_registered_for_priority_languages(self) -> None:
        for extension in (".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts"):
            with self.subTest(extension=extension):
                language = language_for_path("src/file" + extension)
                self.assertEqual(language.parser, "tree-sitter")
                self.assertIn("cyclomatic_complexity", language.capabilities)
                self.assertIn("async_functions", language.capabilities)
        for extension in (".java", ".c", ".h", ".cpp", ".cc", ".cxx", ".hpp", ".hh", ".hxx"):
            with self.subTest(extension=extension):
                language = language_for_path("src/file" + extension)
                self.assertEqual(language.parser, "tree-sitter")
                self.assertIn("cyclomatic_complexity", language.capabilities)
                self.assertNotIn("async_functions", language.capabilities)


class TreeSitterAnalyzerTests(unittest.TestCase):
    def test_javascript_metrics_use_syntax_not_comment_like_string_text(self) -> None:
        result = analyze_file(
            "src/app.js",
            b'''import dependency from "pkg"; // inline comment
const literal = "if (wrong && false) { /* text */ }";
/* comment only
 * across lines
 */
export async function choose(value) {
  if (value && ready) return import("lazy");
  return dependency;
}
class Widget { draw() { return 1; } }
''',
        )
        self.assertIsNone(result["analysisError"])
        self.assertEqual(
            (
                result["physicalLines"],
                result["loc"],
                result["blankLines"],
                result["commentLines"],
            ),
            (10, 7, 0, 3),
        )
        self.assertEqual(result["functions"], 2)
        self.assertEqual(result["asyncFunctions"], 1)
        self.assertEqual(result["classes"], 1)
        self.assertEqual(result["complexity"], 3)
        self.assertEqual(result["functionMetrics"][0]["name"], "choose")
        self.assertEqual(result["functionMetrics"][0]["complexity"], 3)
        self.assertEqual(result["imports"], ["lazy", "pkg"])
        self.assertEqual(result["metricsUnavailable"], [])

    def test_typescript_tsx_counts_type_declarations_methods_and_imports(self) -> None:
        result = analyze_file(
            "src/View.tsx",
            b'''import React from "react";
interface Props { label: string }
type Id = string;
export default function View(props: Props) {
  if (props.label) return <div>{props.label}</div>;
  return null;
}
''',
        )
        self.assertIsNone(result["analysisError"])
        self.assertEqual(result["functions"], 1)
        self.assertEqual(result["classes"], 2)
        self.assertEqual(result["complexity"], 2)
        self.assertEqual(result["imports"], ["react"])
        self.assertIn("async_functions", result["capabilities"])

    def test_java_c_and_cpp_structural_metrics_and_imports(self) -> None:
        cases = [
            (
                "src/Main.java",
                b'''import java.util.List;
interface Readable {}
class Main {
  int run(boolean first, boolean second) {
    if (first && second) return 1;
    return 0;
  }
}
''',
                1,
                2,
                ["java.util.List"],
            ),
            (
                "src/main.c",
                b'''#include <stdio.h>
struct Item { int value; };
int run(int value) {
  if (value) return 1;
  return 0;
}
''',
                1,
                1,
                ["<stdio.h>"],
            ),
            (
                "src/main.cpp",
                b'''#include <vector>
class Runner { public: int run(int value) { return value ? 1 : 0; } };
''',
                1,
                1,
                ["<vector>"],
            ),
        ]
        for path, source, expected_functions, expected_classes, expected_imports in cases:
            with self.subTest(path=path):
                result = analyze_file(path, source)
                self.assertIsNone(result["analysisError"])
                self.assertEqual(result["functions"], expected_functions)
                self.assertEqual(result["classes"], expected_classes)
                self.assertIsInstance(result["complexity"], int)
                self.assertEqual(result["imports"], expected_imports)
                self.assertIsNone(result["asyncFunctions"])
                self.assertIn("asyncFunctions", result["metricsUnavailable"])

    def test_template_literal_comment_text_and_real_interpolation_comment(self) -> None:
        result = analyze_file(
            "template.js",
            b'''const example = `// string content
${(() => {
  // a real line comment inside the expression
  return 1;
})()}`;
''',
        )
        self.assertIsNone(result["analysisError"])
        self.assertEqual(result["commentLines"], 1)
        self.assertEqual(result["functions"], 1)
        self.assertEqual(result["complexity"], 1)

    def test_nested_functions_and_switch_cases_have_separate_complexity(self) -> None:
        result = analyze_file(
            "flow.js",
            b'''function outer(value) {
  if (value) {
    const inner = () => {
      for (const item of items) use(item);
    };
  }
}
function select(value) {
  switch (value) { case 1: return 1; case 2: return 2; default: return 0; }
}
''',
        )
        self.assertIsNone(result["analysisError"])
        self.assertEqual(result["complexity"], 5)
        metrics = {item["name"]: item["complexity"] for item in result["functionMetrics"]}
        self.assertEqual(metrics["outer"], 2)
        self.assertEqual(metrics["inner"], 2)
        self.assertEqual(metrics["select"], 3)

    def test_malformed_tree_sitter_file_keeps_line_metrics_and_isolated(self) -> None:
        result = analyze_file("broken.java", b"class Broken { void run( {\n  // still counted\n}\n")
        self.assertIn("Unable to parse Java syntax", result["analysisError"])
        self.assertEqual(result["physicalLines"], 3)
        self.assertEqual(result["commentLines"], 1)
        self.assertIsNone(result["functions"])
        self.assertIsNone(result["complexity"])

    def test_missing_parser_keeps_lexical_metrics_without_fabricating_structure(self) -> None:
        with mock.patch(
            "code_city.tree_sitter_adapter._get_parser",
            side_effect=ImportError("parser unavailable"),
        ):
            result = analyze_file("app.js", b"const value = 1;\n")
        self.assertIsNotNone(result["analysisError"])
        self.assertEqual(result["loc"], 1)
        self.assertIsNone(result["functions"])
        self.assertIsNone(result["complexity"])


class MixedProjectArchiveTests(unittest.TestCase):
    def test_one_archive_aggregates_all_six_priority_languages(self) -> None:
        payload = make_zip(
            [
                ("services/api.py", "def serve():\n    return True\n"),
                ("web/src/index.js", "export function greet(name) { if (name) return name; return ''; }\n"),
                ("web/src/calc.ts", "export const twice = (n: number) => n * 2;\n"),
                ("desktop/src/Main.java", "class Main { int run() { if (true) return 1; return 0; } }\n"),
                ("native/src/main.c", "int run(int value) { if (value) return 1; return 0; }\n"),
                ("native/src/engine.cpp", "struct Item {}; int run(int value) { return value ? 1 : 0; }\n"),
            ]
        )
        result = analyze_zip_bytes(payload, "six-language-project")
        self.assertEqual(result["stats"]["sourceFiles"], 6)
        self.assertEqual(result["stats"]["analyzedFiles"], 6)
        self.assertEqual(result["stats"]["languagesDetected"], 6)
        self.assertEqual(result["stats"]["filesWithComplexity"], 6)
        self.assertEqual(result["stats"]["functions"], 6)
        self.assertEqual(result["stats"]["classes"], 2)
        self.assertEqual(result["stats"]["asyncFunctions"], 0)
        self.assertEqual(
            {item["language"] for item in result["stats"]["filesByLanguage"]},
            {"Python", "JavaScript", "TypeScript", "Java", "C", "C++"},
        )
        self.assertTrue(all(file["analysisError"] is None for file in result["files"]))
        self.assertTrue(any(file["path"] == "native/src/engine.cpp" for file in result["files"]))
        ProjectAnalysis.model_validate(result)

    def test_nested_mixed_project_stats_paths_manifests_and_exclusions(self) -> None:
        payload = make_zip(
            [
                ("package.json", '{"name":"sample"}'),
                ("pyproject.toml", "[project]"),
                ("Cargo.toml", "[package]"),
                ("go.mod", "module sample"),
                ("pom.xml", "<project/>"),
                ("build.gradle", "plugins {}"),
                ("Dockerfile", "FROM scratch"),
                ("packages/api/service.py", "def serve():\n    return True\n"),
                ("packages/web/src/app.tsx", 'const endpoint = "// text";\n'),
                ("packages/core/src/Main.java", "class Main {}\n"),
                ("native/src/main.cpp", 'int main() { return 0; }\n'),
                ("node_modules/dep/index.js", "ignored();\n"),
                ("vendor/generated/foreign.go", "ignored()\n"),
                ("dist/bundle.js", "ignored();\n"),
                ("README.md", "not source"),
            ]
        )
        result = analyze_zip_bytes(payload, "mixed-sample")
        self.assertEqual(result["stats"]["sourceFiles"], 4)
        self.assertEqual(result["stats"]["analyzedFiles"], 4)
        self.assertEqual(result["stats"]["languagesDetected"], 4)
        self.assertEqual(result["stats"]["linesOfCode"], 5)
        self.assertEqual(result["stats"]["filesWithComplexity"], 4)
        self.assertEqual(result["stats"]["functions"], 2)
        self.assertEqual(result["stats"]["classes"], 1)
        self.assertEqual(
            {item["language"]: item["files"] for item in result["stats"]["filesByLanguage"]},
            {"C++": 1, "Java": 1, "Python": 1, "TypeScript": 1},
        )
        self.assertEqual(
            {file["path"] for file in result["files"]},
            {
                "packages/api/service.py",
                "packages/web/src/app.tsx",
                "packages/core/src/Main.java",
                "native/src/main.cpp",
            },
        )
        self.assertIn("package.json", result["manifests"])
        self.assertIn("packages/web/src", {item["path"] for item in result["directories"]})
        self.assertIn("node_modules", result["excludedDirectories"])
        self.assertIn("vendor", result["excludedDirectories"])
        self.assertIn("dist", result["excludedDirectories"])
        ProjectAnalysis.model_validate(result)

    def test_malformed_binary_invalid_encoding_and_oversized_files_are_isolated(self) -> None:
        payload = make_zip(
            [
                ("broken.py", "def invalid(:\n"),
                ("good.js", "const good = 1;\n"),
                ("binary.go", b"package main\x00\x01"),
                ("encoding.rs", b"\xff\xfe\xfd"),
                ("large.kt", b"x" * (MAX_SOURCE_BYTES + 1)),
            ]
        )
        result = analyze_zip_bytes(payload, "errors")
        by_path = {file["path"]: file for file in result["files"]}
        self.assertIsNotNone(by_path["broken.py"]["analysisError"])
        self.assertIsNone(by_path["broken.py"]["complexity"])
        self.assertIsNone(by_path["binary.go"]["loc"])
        self.assertIsNotNone(by_path["binary.go"]["analysisError"])
        self.assertIsNotNone(by_path["encoding.rs"]["analysisError"])
        self.assertIsNone(by_path["large.kt"]["functions"])
        self.assertIsNotNone(by_path["large.kt"]["analysisError"])
        self.assertIsNone(by_path["good.js"]["analysisError"])
        self.assertEqual(result["stats"]["sourceFiles"], 5)
        self.assertEqual(result["stats"]["analyzedFiles"], 1)
        self.assertEqual(result["stats"]["parsingErrors"], 4)
        self.assertEqual(result["stats"]["filesWithComplexity"], 1)

    def test_unknown_text_files_are_not_classified_as_source(self) -> None:
        result = analyze_zip_bytes(
            make_zip([("notes.txt", "plain text"), ("image.png", b"\x89PNG")]),
            "non-source",
        )
        self.assertEqual(result["files"], [])
        self.assertEqual(result["stats"]["sourceFiles"], 0)


if __name__ == "__main__":
    unittest.main()
