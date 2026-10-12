from __future__ import annotations

import posixpath
import sys
from collections import defaultdict
from typing import Any

from .language_registry import LANGUAGES, language_for_path

# Standard library module sets
PYTHON_STDLIB = frozenset(
    getattr(
        sys,
        "stdlib_module_names",
        frozenset(
            {
                "abc", "argparse", "array", "ast", "asyncio", "base64", "binascii",
                "bisect", "builtins", "bz2", "calendar", "cmath", "cmd", "code",
                "codecs", "collections", "colorsys", "compileall", "concurrent",
                "configparser", "contextlib", "contextvars", "copy", "copyreg",
                "csv", "ctypes", "curses", "dataclasses", "datetime", "dbm",
                "decimal", "difflib", "dis", "distutils", "doctest", "email",
                "encodings", "ensurepip", "enum", "errno", "faulthandler", "fcntl",
                "filecmp", "fileinput", "fnmatch", "fractions", "ftplib", "functools",
                "gc", "getopt", "getpass", "gettext", "glob", "graphlib", "gzip",
                "hashlib", "heapq", "hmac", "html", "http", "idlelib", "imaplib",
                "imghdr", "importlib", "inspect", "io", "ipaddress", "itertools",
                "json", "keyword", "lib2to3", "linecache", "locale", "logging",
                "lzma", "mailbox", "mailcap", "marshal", "math", "mimetypes",
                "mmap", "modulefinder", "msilib", "msvcrt", "multiprocessing",
                "netrc", "nntplib", "numbers", "operator", "optparse", "os",
                "ossaudiodev", "pathlib", "pdb", "pickle", "pickletools", "pipes",
                "pkgutil", "platform", "plistlib", "poplib", "posix", "posixpath",
                "pprint", "profile", "pstats", "pty", "pwd", "py_compile", "pyclbr",
                "pydoc", "queue", "quopri", "random", "re", "readline", "reprlib",
                "resource", "rlcompleter", "runpy", "sched", "secrets", "select",
                "selectors", "shelve", "shlex", "shutil", "signal", "site",
                "smtpd", "smtplib", "sndhdr", "socket", "socketserver", "spwd",
                "sqlite3", "ssl", "stat", "statistics", "string", "stringprep",
                "struct", "subprocess", "sunau", "symtable", "sys", "sysconfig",
                "syslog", "tabnanny", "tarfile", "telnetlib", "tempfile", "termios",
                "textwrap", "threading", "time", "timeit", "tkinter", "token",
                "tokenize", "tomllib", "trace", "traceback", "tracemalloc", "tty",
                "turtle", "turtledemo", "types", "typing", "unicodedata", "unittest",
                "urllib", "uu", "uuid", "venv", "warnings", "wave", "weakref",
                "webbrowser", "winreg", "winsound", "wsgiref", "xdrlib", "xml",
                "xmlrpc", "zipapp", "zipfile", "zipimport", "zlib", "zoneinfo",
            }
        ),
    )
)

NODE_STDLIB = frozenset(
    {
        "assert", "async_hooks", "buffer", "child_process", "cluster",
        "console", "constants", "crypto", "dgram", "diagnostics_channel",
        "dns", "domain", "events", "fs", "fs/promises", "http", "http2",
        "https", "inspector", "module", "net", "os", "path", "path/posix",
        "path/win32", "perf_hooks", "process", "punycode", "querystring",
        "readline", "repl", "stream", "stream/consumers", "stream/promises",
        "stream/web", "string_decoder", "timers", "timers/promises", "tls",
        "trace_events", "tty", "url", "util", "util/types", "v8", "vm",
        "wasi", "worker_threads", "zlib",
    }
)

C_CPP_STDLIB_HEADERS = frozenset(
    {
        "assert.h", "complex.h", "ctype.h", "errno.h", "fenv.h", "float.h",
        "inttypes.h", "iso646.h", "limits.h", "locale.h", "math.h", "setjmp.h",
        "signal.h", "stdalign.h", "stdarg.h", "stdatomic.h", "stdbool.h",
        "stddef.h", "stdint.h", "stdio.h", "stdlib.h", "stdnoreturn.h",
        "string.h", "tgmath.h", "threads.h", "time.h", "uchar.h", "wchar.h",
        "wctype.h", "algorithm", "any", "array", "atomic", "barrier", "bit",
        "bitset", "charconv", "chrono", "codecvt", "compare", "complex",
        "concepts", "condition_variable", "coroutine", "deque", "exception",
        "execution", "expected", "filesystem", "format", "forward_list",
        "fstream", "functional", "future", "generator", "initializer_list",
        "iomanip", "ios", "iosfwd", "iostream", "istream", "iterator",
        "latch", "limits", "list", "locale", "map", "mdspan", "memory",
        "memory_resource", "mutex", "new", "numbers", "numeric", "optional",
        "ostream", "print", "queue", "random", "ranges", "ratio", "regex",
        "scoped_allocator", "semaphore", "set", "shared_mutex", "source_location",
        "span", "spanstream", "sstream", "stack", "stacktrace", "stdexcept",
        "stdfloat", "stop_token", "streambuf", "string", "string_view",
        "strstream", "syncstream", "system_error", "thread", "tuple",
        "type_traits", "typeindex", "typeinfo", "unordered_map",
        "unordered_set", "utility", "valarray", "variant", "vector", "version",
    }
)


def _normalize_path(path: str) -> str:
    parts = [p for p in path.replace("\\", "/").split("/") if p and p != "."]
    return "/".join(parts)


def resolve_import(
    source_file: str,
    raw_specifier: str,
    language_name: str,
    all_file_paths: set[str],
) -> tuple[str, str, bool]:
    """
    Resolve an import statement against project files, standard library, or external packages.
    Returns: (target_id, dependency_type, resolved)
    dependency_type in: "internal", "external", "standard_library", "unresolved"
    """
    spec = raw_specifier.strip().strip("'\"`")
    if not spec:
        return (raw_specifier, "unresolved", False)

    # 1. Python resolution
    if language_name == "Python":
        base_mod = spec.split(".", 1)[0]
        if base_mod in PYTHON_STDLIB:
            return (base_mod, "standard_library", True)

        # Check relative or project-internal import
        # spec might be "src.core.engine" or ".engine" or "core.engine"
        source_dir = posixpath.dirname(source_file)
        parts = spec.split(".")

        # Relative import syntax indicator (e.g., from leading dots)
        leading_dots = 0
        cleaned_spec = spec
        while cleaned_spec.startswith("."):
            leading_dots += 1
            cleaned_spec = cleaned_spec[1:]

        candidates: list[str] = []
        if leading_dots > 0:
            # relative to source_dir
            curr = source_dir
            for _ in range(leading_dots - 1):
                curr = posixpath.dirname(curr)
            rel_path = posixpath.join(curr, cleaned_spec.replace(".", "/"))
            candidates.append(rel_path + ".py")
            candidates.append(posixpath.join(rel_path, "__init__.py"))
        else:
            as_path = spec.replace(".", "/")
            candidates.append(as_path + ".py")
            candidates.append(posixpath.join(as_path, "__init__.py"))
            # Also try relative to current file's directory
            candidates.append(posixpath.join(source_dir, as_path + ".py"))
            candidates.append(posixpath.join(source_dir, as_path, "__init__.py"))
            # Also try stripping leading common directory (e.g. if root is src/)
            if "/" in source_dir:
                top_dir = source_dir.split("/", 1)[0]
                candidates.append(posixpath.join(top_dir, as_path + ".py"))
                candidates.append(posixpath.join(top_dir, as_path, "__init__.py"))

        for cand in candidates:
            norm = _normalize_path(cand)
            if norm in all_file_paths:
                return (norm, "internal", True)

        return (base_mod, "external", False)

    # 2. JavaScript / TypeScript resolution
    if language_name in ("JavaScript", "TypeScript"):
        clean_spec = spec.removeprefix("node:")
        if clean_spec in NODE_STDLIB or spec.startswith("node:"):
            return (f"node:{clean_spec}", "standard_library", True)

        if spec.startswith("./") or spec.startswith("../") or spec.startswith("/"):
            source_dir = posixpath.dirname(source_file)
            base_cand = posixpath.normpath(posixpath.join(source_dir, spec.lstrip("/")))
            extensions = [
                "", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
                "/index.ts", "/index.tsx", "/index.js", "/index.jsx",
            ]
            for ext in extensions:
                cand = _normalize_path(base_cand + ext)
                if cand in all_file_paths:
                    return (cand, "internal", True)
            return (spec, "unresolved", False)

        # External package (e.g. "react", "@workspace/...", "lodash")
        pkg_name = spec.split("/", 2)[:2]
        if pkg_name[0].startswith("@") and len(pkg_name) > 1:
            pkg = f"{pkg_name[0]}/{pkg_name[1]}"
        else:
            pkg = pkg_name[0]
        return (pkg, "external", True)

    # 3. Java resolution
    if language_name == "Java":
        if spec.startswith(("java.", "javax.", "jakarta.")):
            prefix = ".".join(spec.split(".")[:2])
            return (prefix, "standard_library", True)

        # Check internal class match
        # com.example.model.User -> com/example/model/User.java
        as_path = spec.replace(".", "/") + ".java"
        for p in all_file_paths:
            if p.endswith(as_path) or _normalize_path(p) == _normalize_path(as_path):
                return (p, "internal", True)

        # Check package wildcard or package match
        pkg_base = spec.rsplit(".", 1)[0].replace(".", "/")
        for p in all_file_paths:
            if pkg_base in p and p.endswith(".java"):
                return (p, "internal", True)

        pkg = ".".join(spec.split(".")[:2])
        return (pkg, "external", False)

    # 4. C / C++ resolution
    if language_name in ("C", "C++"):
        clean = spec.strip("<>\"'")
        if clean in C_CPP_STDLIB_HEADERS or (spec.startswith("<") and spec.endswith(">")):
            return (f"<{clean}>", "standard_library", True)

        # Quoted include or relative include
        source_dir = posixpath.dirname(source_file)
        cand = _normalize_path(posixpath.join(source_dir, clean))
        if cand in all_file_paths:
            return (cand, "internal", True)

        # Try matching anywhere in project
        for p in all_file_paths:
            if p.endswith("/" + clean) or p == clean:
                return (p, "internal", True)

        return (clean, "unresolved", False)

    # 5. Go resolution
    if language_name == "Go":
        if "/" not in spec and "." not in spec:
            return (spec, "standard_library", True)
        if spec in ("net/http", "os/exec", "sync/atomic", "io/ioutil", "database/sql", "encoding/json"):
            return (spec, "standard_library", True)
        for p in all_file_paths:
            if p.startswith(spec) or spec in p:
                return (p, "internal", True)
        return (spec, "external", False)

    # 6. Rust resolution
    if language_name == "Rust":
        if spec.startswith(("std::", "core::", "alloc::")):
            return (spec.split("::")[0], "standard_library", True)
        clean = spec.removeprefix("crate::").replace("::", "/")
        source_dir = posixpath.dirname(source_file)
        candidates = [
            posixpath.join(source_dir, clean + ".rs"),
            posixpath.join(source_dir, clean, "mod.rs"),
            posixpath.join("src", clean + ".rs"),
            posixpath.join("src", clean, "mod.rs"),
        ]
        for c in candidates:
            norm = _normalize_path(c)
            if norm in all_file_paths:
                return (norm, "internal", True)
        return (spec.split("::")[0], "external", False)

    # Default fallback
    return (spec, "unresolved", False)


def find_strongly_connected_components(
    adjacency: dict[str, set[str]],
) -> list[list[str]]:
    """
    Tarjan's algorithm for detecting strongly connected components.
    Returns all SCCs with 2+ nodes, or 1 node with a self-loop.
    """
    index = 0
    indices: dict[str, int] = {}
    lowlink: dict[str, int] = {}
    stack: list[str] = []
    on_stack: set[str] = set()
    sccs: list[list[str]] = []

    def strongconnect(v: str) -> None:
        nonlocal index
        indices[v] = index
        lowlink[v] = index
        index += 1
        stack.append(v)
        on_stack.add(v)

        for w in adjacency.get(v, set()):
            if w not in indices:
                strongconnect(w)
                lowlink[v] = min(lowlink[v], lowlink[w])
            elif w in on_stack:
                lowlink[v] = min(lowlink[v], indices[w])

        if lowlink[v] == indices[v]:
            scc: list[str] = []
            while True:
                w = stack.pop()
                on_stack.remove(w)
                scc.append(w)
                if w == v:
                    break
            # Only keep non-trivial components: >1 nodes or 1 node with self-loop
            if len(scc) > 1 or (len(scc) == 1 and v in adjacency.get(v, set())):
                sccs.append(sorted(scc))

    for node in sorted(adjacency.keys()):
        if node not in indices:
            strongconnect(node)

    return sorted(sccs, key=lambda comp: (-len(comp), comp[0]))


def extract_cycle_path(
    nodes: list[str],
    adjacency: dict[str, set[str]],
) -> list[str]:
    """Find elementary cycle path representations within an SCC."""
    node_set = set(nodes)
    if len(nodes) == 1:
        n = nodes[0]
        return [f"{n} -> {n}"]

    start = nodes[0]
    visited = set()
    path = [start]

    def dfs(curr: str) -> list[str] | None:
        visited.add(curr)
        for nxt in sorted(adjacency.get(curr, set())):
            if nxt not in node_set:
                continue
            if nxt == start and len(path) > 1:
                return path + [start]
            if nxt not in visited:
                path.append(nxt)
                result = dfs(nxt)
                if result:
                    return result
                path.pop()
        return None

    res = dfs(start)
    if res:
        return [" -> ".join(res)]

    # Fallback pairwise cycle summary
    pairs = [f"{u} -> {v}" for u in nodes for v in sorted(adjacency.get(u, set())) if v in node_set]
    return pairs[:5]


def build_dependency_graph(
    files: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Construct the full multi-language dependency graph, resolve dependencies,
    and detect circular dependencies using Tarjan's SCC algorithm.
    """
    all_file_paths = {f["path"] for f in files}
    file_by_path = {f["path"]: f for f in files}

    raw_edges: list[dict[str, Any]] = []
    internal_adj: dict[str, set[str]] = defaultdict(set)
    external_nodes: dict[str, dict[str, Any]] = {}
    unresolved: set[str] = set()

    for file_info in files:
        src_path = file_info["path"]
        lang = file_info["language"]
        file_imports = file_info.get("imports") or []

        for imp in file_imports:
            target_id, dep_type, resolved = resolve_import(src_path, imp, lang, all_file_paths)
            raw_edges.append(
                {
                    "source": src_path,
                    "target": target_id,
                    "dependencyType": dep_type,
                    "statement": imp,
                    "resolved": resolved,
                }
            )

            if dep_type == "internal":
                internal_adj[src_path].add(target_id)
            elif dep_type in ("external", "standard_library"):
                if target_id not in external_nodes:
                    external_nodes[target_id] = {
                        "id": target_id,
                        "label": target_id,
                        "nodeType": dep_type,
                        "language": lang,
                        "path": None,
                        "loc": None,
                        "complexity": None,
                        "incomingCount": 0,
                        "outgoingCount": 0,
                    }
                external_nodes[target_id]["incomingCount"] += 1
            else:
                unresolved.add(f"{src_path}: {imp}")

    # Deduplicate edges by (source, target)
    unique_edges_map: dict[tuple[str, str], dict[str, Any]] = {}
    for edge in raw_edges:
        key = (edge["source"], edge["target"])
        if key not in unique_edges_map:
            unique_edges_map[key] = edge
    unique_edges = list(unique_edges_map.values())

    # Calculate in/out degrees for internal file nodes
    incoming_counts: dict[str, int] = defaultdict(int)
    outgoing_counts: dict[str, int] = defaultdict(int)
    for edge in unique_edges:
        outgoing_counts[edge["source"]] += 1
        incoming_counts[edge["target"]] += 1

    nodes: list[dict[str, Any]] = []
    for file_info in files:
        p = file_info["path"]
        nodes.append(
            {
                "id": p,
                "label": file_info["filename"],
                "nodeType": "file",
                "language": file_info["language"],
                "path": p,
                "loc": file_info.get("loc"),
                "complexity": file_info.get("complexity"),
                "incomingCount": incoming_counts[p],
                "outgoingCount": outgoing_counts[p],
            }
        )

    # Add external and stdlib nodes
    for ext_node in external_nodes.values():
        nodes.append(ext_node)

    # Detect cycles via Tarjan's SCC algorithm on internal dependency graph
    sccs = find_strongly_connected_components(internal_adj)
    cycles: list[dict[str, Any]] = []

    for index, scc in enumerate(sccs):
        cycle_edges = [
            [u, v]
            for u in scc
            for v in sorted(internal_adj.get(u, set()))
            if v in scc
        ]
        paths = extract_cycle_path(scc, internal_adj)
        suggested_steps = [
            f"Review circular dependency between {len(scc)} files: {', '.join(scc[:3])}{'...' if len(scc) > 3 else ''}.",
            "Identify shared type definitions, interfaces, or utility functions causing the mutual dependency.",
            "Extract shared abstractions into an independent module or leaf package to break the cycle.",
            "Apply Dependency Inversion (pass dependencies via arguments or dependency injection).",
        ]
        cycles.append(
            {
                "cycleId": f"cycle-{index + 1}",
                "files": scc,
                "size": len(scc),
                "paths": paths,
                "edges": cycle_edges,
                "suggestedSteps": suggested_steps,
            }
        )

    total_internal = sum(1 for e in unique_edges if e["dependencyType"] == "internal")
    total_external = sum(1 for e in unique_edges if e["dependencyType"] in ("external", "standard_library"))

    return {
        "nodes": sorted(nodes, key=lambda n: n["id"]),
        "edges": sorted(unique_edges, key=lambda e: (e["source"], e["target"])),
        "cycles": cycles,
        "totalInternalEdges": total_internal,
        "totalExternalEdges": total_external,
        "unresolvedDependencies": sorted(unresolved),
    }
