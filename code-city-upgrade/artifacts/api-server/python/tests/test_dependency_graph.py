from __future__ import annotations

import unittest

from code_city.dependencies import (
    build_dependency_graph,
    find_strongly_connected_components,
    resolve_import,
)


class DependencyGraphTests(unittest.TestCase):
    def test_python_relative_and_stdlib_imports(self) -> None:
        files = {
            "src/api/routes.py",
            "src/core/engine.py",
            "src/models/user.py",
        }
        # Python stdlib
        target, dep_type, resolved = resolve_import("src/api/routes.py", "os", "Python", files)
        self.assertEqual(dep_type, "standard_library")
        self.assertEqual(target, "os")
        self.assertTrue(resolved)

        # Python relative import
        target, dep_type, resolved = resolve_import("src/api/routes.py", "..core.engine", "Python", files)
        self.assertEqual(dep_type, "internal")
        self.assertEqual(target, "src/core/engine.py")
        self.assertTrue(resolved)

        # Python absolute package import
        target, dep_type, resolved = resolve_import("src/api/routes.py", "src.models.user", "Python", files)
        self.assertEqual(dep_type, "internal")
        self.assertEqual(target, "src/models/user.py")
        self.assertTrue(resolved)

        # External package
        target, dep_type, resolved = resolve_import("src/api/routes.py", "fastapi", "Python", files)
        self.assertEqual(dep_type, "external")
        self.assertEqual(target, "fastapi")

    def test_javascript_typescript_relative_and_npm_imports(self) -> None:
        files = {
            "src/components/Button.tsx",
            "src/utils/theme.ts",
            "src/index.ts",
        }
        # Node standard library
        target, dep_type, resolved = resolve_import("src/index.ts", "path", "TypeScript", files)
        self.assertEqual(dep_type, "standard_library")

        # Relative import with extension inference
        target, dep_type, resolved = resolve_import("src/components/Button.tsx", "../utils/theme", "TypeScript", files)
        self.assertEqual(dep_type, "internal")
        self.assertEqual(target, "src/utils/theme.ts")
        self.assertTrue(resolved)

        # External npm module
        target, dep_type, resolved = resolve_import("src/components/Button.tsx", "react", "TypeScript", files)
        self.assertEqual(dep_type, "external")
        self.assertEqual(target, "react")

    def test_circular_dependency_detection_2_nodes(self) -> None:
        adj = {
            "a.py": {"b.py"},
            "b.py": {"a.py"},
            "c.py": {"a.py"},
        }
        sccs = find_strongly_connected_components(adj)
        self.assertEqual(len(sccs), 1)
        self.assertEqual(set(sccs[0]), {"a.py", "b.py"})

    def test_circular_dependency_detection_3_nodes_and_self_loops(self) -> None:
        adj = {
            "x.py": {"y.py"},
            "y.py": {"z.py"},
            "z.py": {"x.py"},
            "self.py": {"self.py"},
            "leaf.py": set(),
        }
        sccs = find_strongly_connected_components(adj)
        self.assertEqual(len(sccs), 2)
        sizes = {len(c) for c in sccs}
        self.assertIn(3, sizes)
        self.assertIn(1, sizes)

    def test_acyclic_graph_reports_zero_cycles(self) -> None:
        adj = {
            "main.py": {"service.py", "config.py"},
            "service.py": {"database.py"},
            "database.py": {"config.py"},
            "config.py": set(),
        }
        sccs = find_strongly_connected_components(adj)
        self.assertEqual(len(sccs), 0)

    def test_build_dependency_graph_full_cycle_report(self) -> None:
        files = [
            {"path": "pkg/a.py", "filename": "a.py", "language": "Python", "loc": 20, "complexity": 2, "imports": [".b"]},
            {"path": "pkg/b.py", "filename": "b.py", "language": "Python", "loc": 30, "complexity": 3, "imports": [".c"]},
            {"path": "pkg/c.py", "filename": "c.py", "language": "Python", "loc": 40, "complexity": 4, "imports": [".a"]},
            {"path": "pkg/clean.py", "filename": "clean.py", "language": "Python", "loc": 10, "complexity": 1, "imports": ["math"]},
        ]
        graph = build_dependency_graph(files)
        self.assertEqual(len(graph["nodes"]), 5)  # 4 files + math stdlib node
        self.assertEqual(len(graph["cycles"]), 1)
        cycle = graph["cycles"][0]
        self.assertEqual(cycle["size"], 3)
        self.assertEqual(set(cycle["files"]), {"pkg/a.py", "pkg/b.py", "pkg/c.py"})
        self.assertGreater(len(cycle["suggestedSteps"]), 0)
