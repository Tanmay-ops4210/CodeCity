from __future__ import annotations

import io
import unittest
import zipfile
from starlette.testclient import TestClient

from code_city.archive import MAX_ARCHIVE_BYTES
from code_city.main import app


def _create_zip(files: list[tuple[str, bytes]]) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for name, content in files:
            zf.writestr(name, content)
    return buf.getvalue()


class UploadEndpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.client = TestClient(app)

    def test_valid_zip_upload_multi_language(self) -> None:
        """Valid ZIP with Python, TS, and Java files returns 200 with full analysis."""
        valid_files = [
            (
                "src/main.py",
                b"def calculate(a, b, c):\n    if a > 0:\n        return b + c\n    return 0\n",
            ),
            (
                "src/service.ts",
                b"export function greet(name: string): string {\n    return 'Hello, ' + name;\n}\n",
            ),
            (
                "src/App.java",
                b"public class App {\n    public static void main(String[] args) {\n        System.out.println(1);\n    }\n}\n",
            ),
        ]
        archive_bytes = _create_zip(valid_files)

        response = self.client.post(
            "/api/analyze",
            files={"file": ("project.zip", archive_bytes, "application/zip")},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["projectName"], "project")
        self.assertFalse(data["isDemo"])
        self.assertEqual(data["stats"]["sourceFiles"], 3)
        self.assertEqual(data["stats"]["languagesDetected"], 3)
        self.assertGreaterEqual(len(data.get("functions", [])), 3)
        self.assertIn("dependencyGraph", data)
        self.assertIn("refactoringSummary", data)

    def test_invalid_zip_rejected_with_clear_message(self) -> None:
        """Corrupted/non-zip binary payload returns 400 Bad Request with clear message."""
        corrupted_bytes = b"This is definitely not a zip file content header 1234567890."

        response = self.client.post(
            "/api/analyze",
            files={"file": ("corrupted.zip", corrupted_bytes, "application/zip")},
        )
        self.assertEqual(response.status_code, 400)
        detail = response.json().get("detail", "")
        self.assertIn("not a valid ZIP archive", detail)

    def test_empty_zip_upload_returns_zero_stats_and_warning(self) -> None:
        """An empty ZIP (0 files) returns 200 with 0 source files and informative warning."""
        empty_zip_bytes = _create_zip([])

        response = self.client.post(
            "/api/analyze",
            files={"file": ("empty_repo.zip", empty_zip_bytes, "application/zip")},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["stats"]["sourceFiles"], 0)
        self.assertEqual(len(data["files"]), 0)
        self.assertTrue(len(data["warnings"]) > 0)

    def test_oversized_upload_rejected_with_413(self) -> None:
        """Upload exceeding configured 20,000 KB limit returns HTTP 413."""
        # Create a payload that is strictly larger than MAX_ARCHIVE_BYTES
        oversized_bytes = b"PK\x03\x04" + b"0" * (MAX_ARCHIVE_BYTES + 10)

        response = self.client.post(
            "/api/analyze",
            files={"file": ("huge.zip", oversized_bytes, "application/zip")},
        )
        self.assertEqual(response.status_code, 413)
        detail = response.json().get("detail", "")
        self.assertIn("20,000 KB", detail)

    def test_non_zip_filename_rejected(self) -> None:
        """Non-ZIP extension is rejected with HTTP 400."""
        response = self.client.post(
            "/api/analyze",
            files={"file": ("project.tar.gz", b"binary", "application/gzip")},
        )
        self.assertEqual(response.status_code, 400)
        detail = response.json().get("detail", "")
        self.assertIn(".zip filename", detail)

    def test_unsafe_path_traversal_rejected(self) -> None:
        """ZIP containing directory traversal is safely rejected with HTTP 400."""
        unsafe_files = [("../../etc/passwd", b"root:x:0:0")]
        archive_bytes = _create_zip(unsafe_files)

        response = self.client.post(
            "/api/analyze",
            files={"file": ("exploit.zip", archive_bytes, "application/zip")},
        )
        self.assertEqual(response.status_code, 400)
        detail = response.json().get("detail", "")
        self.assertIn("unsafe path", detail)


if __name__ == "__main__":
    unittest.main()
