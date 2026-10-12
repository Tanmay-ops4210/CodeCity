from __future__ import annotations

import io
import stat
import unittest
import zipfile

from code_city.analyzer import analyze_file, analyze_source, build_demo_analysis
from code_city.archive import (
    ArchiveValidationError,
    MAX_ARCHIVE_ENTRIES,
    analyze_zip_bytes,
)
from code_city.models import ProjectAnalysis


def make_zip(entries: list[tuple[str, bytes]], *, symlink: str | None = None) -> bytes:
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w") as archive:
        for name, contents in entries:
            archive.writestr(name, contents)
        if symlink:
            link = zipfile.ZipInfo(symlink)
            link.create_system = 3
            link.external_attr = (stat.S_IFLNK | 0o777) << 16
            archive.writestr(link, "target")
    return output.getvalue()


class AnalyzerTests(unittest.TestCase):
    def test_counts_lines_comments_functions_classes_and_decisions(self) -> None:
        source = b'''# file comment

class Service:
    async def run(self, values, enabled=True):
        # comment-only
        if enabled and values:
            for value in values:
                try:
                    if value:
                        pass
                except ValueError:
                    pass
        selected = [value for value in values if value]
        return selected
'''
        result = analyze_source("src/service.py", source)
        self.assertIsNone(result["analysisError"])
        self.assertEqual(result["physicalLines"], 14)
        self.assertEqual(result["blankLines"], 1)
        self.assertEqual(result["commentLines"], 2)
        self.assertEqual(result["classes"], 1)
        self.assertEqual(result["functions"], 1)
        self.assertEqual(result["asyncFunctions"], 1)
        self.assertEqual(result["decisionCounts"]["conditionals"], 2)
        self.assertEqual(result["decisionCounts"]["booleanOperators"], 1)
        self.assertEqual(result["decisionCounts"]["loops"], 2)
        self.assertEqual(result["decisionCounts"]["exceptionHandlers"], 1)
        self.assertEqual(result["decisionCounts"]["comprehensionConditions"], 1)
        self.assertEqual(result["complexity"], 8)
        self.assertEqual(result["functionMetrics"][0]["complexity"], 8)

    def test_inline_comments_do_not_count_as_comment_only_lines(self) -> None:
        result = analyze_source("inline.py", b"value = 1  # inline\n# only\n\n")
        self.assertEqual(result["physicalLines"], 3)
        self.assertEqual(result["loc"], 1)
        self.assertEqual(result["commentLines"], 1)

    def test_syntax_errors_are_per_file_and_do_not_expose_source(self) -> None:
        result = analyze_source("broken.py", b"password = 'secret'\ndef broken(:\n")
        self.assertIn("line 2", result["analysisError"])
        self.assertNotIn("secret", result["analysisError"])
        self.assertEqual(result["physicalLines"], 2)

    def test_unreadable_encodings_are_reported_without_source(self) -> None:
        result = analyze_source("encoding.py", b"\xff\xfe\xfd")
        self.assertEqual(result["analysisError"], "Source encoding could not be decoded.")

    def test_bom_marked_utf16_source_is_decoded_without_being_mistaken_for_binary(self) -> None:
        python = analyze_source(
            "unicode.py",
            "def greet():\n    return 'hi'\n".encode("utf-16"),
        )
        javascript = analyze_file(
            "unicode.js",
            "export function greet() { return 'hi'; }\n".encode("utf-16"),
        )
        self.assertIsNone(python["analysisError"])
        self.assertEqual(python["functions"], 1)
        self.assertIsNone(javascript["analysisError"])
        self.assertEqual(javascript["functions"], 1)

    def test_demo_results_are_explicitly_marked_and_repeat_metrics(self) -> None:
        first = build_demo_analysis()
        second = build_demo_analysis()
        self.assertTrue(first["isDemo"])
        self.assertEqual(first["projectName"], "sample-fastapi-service")
        self.assertEqual(first["stats"], second["stats"])
        self.assertEqual(first["files"], second["files"])
        self.assertTrue(any(item["complexityLevel"] == "high" for item in first["files"]))


class ApiSchemaTests(unittest.TestCase):
    def test_demo_payload_matches_documented_project_schema(self) -> None:
        payload = build_demo_analysis()
        serialized = ProjectAnalysis.model_validate(payload).model_dump(
            mode="json",
            by_alias=True,
        )
        self.assertTrue(serialized["isDemo"])
        self.assertEqual(serialized["projectName"], "sample-fastapi-service")
        self.assertIn("classes", serialized["files"][0])
        self.assertIn("complexityLevel", serialized["files"][0])
        self.assertEqual(serialized["files"][0]["language"], "Python")
        self.assertGreater(serialized["stats"]["filesWithComplexity"], 0)

    def test_fastapi_openapi_documents_response_shapes(self) -> None:
        from code_city.main import app

        document = app.openapi()
        schemas = document["components"]["schemas"]
        self.assertIn("ProjectAnalysis", schemas)
        self.assertIn("FileAnalysis", schemas)
        self.assertIn("DirectoryMetric", schemas)
        file_properties = schemas["FileAnalysis"]["properties"]
        self.assertIn("relativeSize", file_properties)
        self.assertIn("complexityReasons", file_properties)
        self.assertIn("language", file_properties)
        self.assertIn("metricsUnavailable", file_properties)
        self.assertEqual(document["paths"]["/api/analyze"]["post"]["responses"]["400"]["content"]["application/json"]["schema"]["$ref"], "#/components/schemas/ErrorMessage")


class ArchiveSecurityTests(unittest.TestCase):
    def test_valid_archive_analyzes_python_only_and_ignores_venv(self) -> None:
        archive = make_zip(
            [
                ("app.py", b"def run():\n    return 1\n"),
                (".venv/lib/python/site.py", b"def ignored():\n    pass\n"),
                ("README.md", b"not python"),
            ]
        )
        result = analyze_zip_bytes(archive, "demo")
        self.assertEqual(result["stats"]["pythonFiles"], 1)
        self.assertEqual(result["files"][0]["path"], "app.py")

    def test_empty_project_returns_zero_stats_and_warning(self) -> None:
        result = analyze_zip_bytes(make_zip([("README.md", b"hello")]), "empty")
        self.assertEqual(result["stats"]["pythonFiles"], 0)
        self.assertIsNone(result["stats"]["averageComplexity"])
        self.assertEqual(result["stats"]["sourceFiles"], 0)
        self.assertTrue(result["warnings"])

    def test_path_traversal_is_rejected(self) -> None:
        for unsafe_path in ("../outside.py", "src/../../outside.py", "/tmp/outside.py", "C:\\tmp\\outside.py"):
            with self.subTest(path=unsafe_path):
                with self.assertRaises(ArchiveValidationError):
                    analyze_zip_bytes(make_zip([(unsafe_path, b"pass")]), "bad")

    def test_symbolic_links_are_rejected(self) -> None:
        with self.assertRaises(ArchiveValidationError):
            analyze_zip_bytes(make_zip([], symlink="linked.py"), "bad")

    def test_duplicate_paths_are_rejected(self) -> None:
        from code_city.archive import _validate_entries

        with self.assertRaises(ArchiveValidationError):
            _validate_entries([zipfile.ZipInfo("same.py"), zipfile.ZipInfo("same.py")])

    def test_archive_entry_limit_is_enforced(self) -> None:
        entries = [zipfile.ZipInfo(f"{index}.txt") for index in range(MAX_ARCHIVE_ENTRIES + 1)]
        with self.assertRaises(ArchiveValidationError):
            from code_city.archive import _validate_entries

            _validate_entries(entries)

    def test_malformed_python_file_does_not_abort_project_analysis(self) -> None:
        archive = make_zip(
            [
                ("broken.py", b"def invalid(:\n"),
                ("healthy.py", b"def run():\n    return True\n"),
            ]
        )
        result = analyze_zip_bytes(archive, "working")
        self.assertEqual(result["stats"]["pythonFiles"], 2)
        self.assertIsNotNone(result["files"][0]["analysisError"])
        self.assertIsNone(result["files"][1]["analysisError"])

    def test_expanded_project_size_limit_is_enforced(self) -> None:
        from code_city.archive import MAX_EXTRACTED_BYTES, _validate_entries

        entry = zipfile.ZipInfo("large.txt")
        entry.file_size = MAX_EXTRACTED_BYTES + 1
        entry.compress_size = 1
        with self.assertRaisesRegex(ArchiveValidationError, "too large"):
            _validate_entries([entry])

    def test_oversized_python_source_is_reported_without_reading_it(self) -> None:
        from code_city.archive import MAX_SOURCE_BYTES

        payload = b"x" * (MAX_SOURCE_BYTES + 1)
        result = analyze_zip_bytes(make_zip([("large.py", payload)]), "large")
        file = result["files"][0]
        self.assertEqual(file["sizeBytes"], len(payload))
        self.assertIsNotNone(file["analysisError"])
        self.assertIsNone(file["complexity"])

    def test_invalid_zip_is_rejected(self) -> None:
        with self.assertRaisesRegex(ArchiveValidationError, "valid ZIP"):
            analyze_zip_bytes(b"not a zip archive", "invalid")


if __name__ == "__main__":
    unittest.main()
