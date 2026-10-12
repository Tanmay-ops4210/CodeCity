from __future__ import annotations

import io
import stat
import time
import zipfile
from pathlib import PurePosixPath, PureWindowsPath
from typing import Any

from .analyzer import analyze_file, build_project_analysis, unavailable_file
from .language_registry import is_project_manifest, language_for_path

MAX_ARCHIVE_BYTES = 20_000 * 1024  # 20,000 KB configured upload limit
MAX_ARCHIVE_ENTRIES = 2_000
MAX_EXTRACTED_BYTES = 100 * 1024 * 1024
MAX_SOURCE_BYTES = 10 * 1024 * 1024
MAX_ANALYSIS_SECONDS = 60

IGNORED_PARTS = {
    ".git",
    ".hg",
    ".svn",
    ".venv",
    "venv",
    "virtualenv",
    "env",
    "site-packages",
    "node_modules",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    ".tox",
    ".nox",
    ".idea",
    ".vscode",
    ".next",
    ".nuxt",
    ".output",
    ".turbo",
    "vendor",
    "third_party",
    "third-party",
    "bower_components",
    "target",
    "build",
    "dist",
    "out",
    "coverage",
    "bin",
    "obj",
    "generated",
    "gen",
}
GENERATED_SUFFIXES = (
    ".generated.py",
    ".gen.py",
    "_autogen.py",
    "_pb2.py",
    "_pb2_grpc.py",
    ".min.js",
    ".min.css",
    ".pb.go",
    ".g.cs",
    ".designer.cs",
    ".generated.ts",
    ".generated.js",
)


class ArchiveValidationError(ValueError):
    """An archive-level validation failure safe to show to an end user."""


def _safe_archive_path(raw_path: str) -> str:
    if not raw_path or "\x00" in raw_path or any(ord(char) < 32 for char in raw_path):
        raise ArchiveValidationError("The ZIP archive contains an unsafe path.")

    normalized = raw_path.replace("\\", "/")
    windows_path = PureWindowsPath(raw_path)
    posix_path = PurePosixPath(normalized)
    if (
        normalized.startswith("/")
        or posix_path.is_absolute()
        or windows_path.is_absolute()
        or windows_path.drive
        or any(part == ".." for part in normalized.split("/"))
    ):
        raise ArchiveValidationError("The ZIP archive contains an unsafe path.")

    parts = [part for part in normalized.split("/") if part not in ("", ".")]
    if not parts:
        return ""
    return "/".join(parts)


def _is_ignored(path: str) -> bool:
    parts = path.casefold().split("/")
    filename = parts[-1]
    return any(part in IGNORED_PARTS for part in parts) or filename.endswith(
        GENERATED_SUFFIXES
    )


def _unavailable_file(path: str, size_bytes: int, message: str) -> dict[str, Any]:
    return unavailable_file(path, size_bytes, message, language_for_path(path))


def _validate_entries(entries: list[zipfile.ZipInfo]) -> list[tuple[zipfile.ZipInfo, str]]:
    if len(entries) > MAX_ARCHIVE_ENTRIES:
        raise ArchiveValidationError(
            f"The ZIP archive contains too many entries (limit: {MAX_ARCHIVE_ENTRIES})."
        )

    total_uncompressed = 0
    normalized_entries: list[tuple[zipfile.ZipInfo, str]] = []
    seen_paths: set[str] = set()

    for entry in entries:
        path = _safe_archive_path(entry.filename)
        if not path:
            continue
        mode = entry.external_attr >> 16
        file_type = stat.S_IFMT(mode)
        if stat.S_ISLNK(mode) or file_type not in (0, stat.S_IFREG, stat.S_IFDIR):
            raise ArchiveValidationError("The ZIP archive contains an unsupported link or special file.")
        if file_type == stat.S_IFDIR and not entry.is_dir():
            raise ArchiveValidationError("The ZIP archive contains inconsistent directory metadata.")
        if entry.flag_bits & 0x1:
            raise ArchiveValidationError("Encrypted ZIP archives are not supported.")
        if path in seen_paths:
            raise ArchiveValidationError("The ZIP archive contains duplicate paths.")
        seen_paths.add(path)

        if not entry.is_dir():
            total_uncompressed += entry.file_size
            if total_uncompressed > MAX_EXTRACTED_BYTES:
                raise ArchiveValidationError(
                    "The extracted project is too large (limit: 100 MiB)."
                )
        normalized_entries.append((entry, path))

    return normalized_entries


def analyze_zip_bytes(archive_bytes: bytes, project_name: str) -> dict[str, Any]:
    if len(archive_bytes) > MAX_ARCHIVE_BYTES:
        raise ArchiveValidationError("The ZIP archive exceeds the configured 20,000 KB upload limit.")
    if not zipfile.is_zipfile(io.BytesIO(archive_bytes)):
        raise ArchiveValidationError("The uploaded file is not a valid ZIP archive.")

    try:
        archive = zipfile.ZipFile(io.BytesIO(archive_bytes))
    except (OSError, zipfile.BadZipFile):
        raise ArchiveValidationError("The uploaded file is not a valid ZIP archive.") from None

    with archive:
        entries = _validate_entries(archive.infolist())
        source_files: list[dict[str, Any]] = []
        warnings: list[str] = []
        excluded_paths: set[str] = set()
        manifests = [
            path
            for entry, path in entries
            if not entry.is_dir() and is_project_manifest(path) and not _is_ignored(path)
        ]
        source_entries = [
            (entry, path)
            for entry, path in entries
            if not entry.is_dir() and language_for_path(path) is not None
        ]

        eligible_entries = []
        for entry, path in source_entries:
            if _is_ignored(path):
                cumulative: list[str] = []
                for part in path.split("/")[:-1]:
                    cumulative.append(part)
                    if part.casefold() in IGNORED_PARTS:
                        excluded_paths.add("/".join(cumulative))
                continue
            eligible_entries.append((entry, path))

        started_at = time.monotonic()
        for index, (entry, path) in enumerate(eligible_entries):
            language = language_for_path(path)
            assert language is not None
            if time.monotonic() - started_at > MAX_ANALYSIS_SECONDS:
                source_files.extend(
                    _unavailable_file(
                        pending_path,
                        pending_entry.file_size,
                        "Analysis time limit reached; this file was not analyzed.",
                    )
                    for pending_entry, pending_path in eligible_entries[index:]
                )
                warnings.append(
                    f"Analysis stopped after the {MAX_ANALYSIS_SECONDS}-second processing limit."
                )
                break
            if entry.file_size > MAX_SOURCE_BYTES:
                source_files.append(
                    _unavailable_file(
                        path,
                        entry.file_size,
                        "Source file exceeds the 5 MiB per-file limit.",
                    )
                )
                warnings.append(f"{path}: skipped because it exceeds the per-file analysis limit.")
                continue
            try:
                with archive.open(entry, "r") as source:
                    contents = source.read(MAX_SOURCE_BYTES + 1)
                if len(contents) > MAX_SOURCE_BYTES:
                    source_files.append(
                        _unavailable_file(
                            path,
                            entry.file_size,
                            "Source file exceeds the 5 MiB per-file limit.",
                        )
                    )
                    warnings.append(f"{path}: skipped because it exceeds the per-file analysis limit.")
                    continue
                result = analyze_file(path, contents)
                source_files.append(result)
                if result["analysisError"] is not None:
                    warnings.append(f"{path}: {result['analysisError']}")
            except (OSError, RuntimeError, ValueError, RecursionError, zipfile.BadZipFile):
                source_files.append(
                    _unavailable_file(
                        path,
                        entry.file_size,
                        "The file could not be read from the archive.",
                    )
                )
                warnings.append(f"{path}: the file could not be read from the archive.")

    if not source_files:
        warnings.append(
            "No supported source files were found after applying generated-code and dependency-directory exclusions."
        )
    return build_project_analysis(
        project_name,
        source_files,
        warnings=warnings,
        manifests=manifests,
        excluded_directories=sorted(excluded_paths, key=str.casefold),
    )
