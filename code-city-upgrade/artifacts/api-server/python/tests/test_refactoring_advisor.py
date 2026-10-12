from __future__ import annotations

import unittest

from code_city.refactoring import analyze_refactoring


class RefactoringAdvisorTests(unittest.TestCase):
    def test_rules_trigger_at_and_above_thresholds(self) -> None:
        files = [
            {
                "path": "complex.py",
                "filename": "complex.py",
                "language": "Python",
                "capabilities": ["line_metrics", "functions", "cyclomatic_complexity", "nesting_depth"],
                "metricsUnavailable": [],
                "loc": 350,  # exceeds large-file threshold (300)
                "imports": ["math", "math"],  # duplicate imports
                "functionMetrics": [
                    {
                        "name": "monster_function",
                        "qualifiedName": "monster_function",
                        "filePath": "complex.py",
                        "lineStart": 10,
                        "lineEnd": 120,
                        "loc": 80,             # exceeds long-function threshold (50)
                        "complexity": 16,      # exceeds high-complexity threshold (10, critical >= 15)
                        "parametersCount": 6,  # exceeds excessive-parameters (4)
                        "nestingDepth": 5,     # exceeds deep-nesting threshold (4)
                        "decisionDetails": ["15 conditional branches"],
                    }
                ],
            }
        ]
        dep_graph = {
            "nodes": [
                {"nodeType": "file", "path": "complex.py", "incomingCount": 4, "outgoingCount": 4}  # degree 8 > threshold 6
            ],
            "cycles": [
                {
                    "cycleId": "cycle-1",
                    "files": ["complex.py", "other.py"],
                    "size": 2,
                    "paths": ["complex.py -> other.py -> complex.py"],
                }
            ],
        }

        result = analyze_refactoring(files, dep_graph)
        rule_ids = {f["ruleId"] for f in result["findings"]}
        self.assertIn("high-complexity", rule_ids)
        self.assertIn("long-function", rule_ids)
        self.assertIn("deep-nesting", rule_ids)
        self.assertIn("large-file", rule_ids)
        self.assertIn("excessive-parameters", rule_ids)
        self.assertIn("circular-dependency", rule_ids)
        self.assertIn("high-coupling", rule_ids)
        self.assertIn("duplicate-dependencies", rule_ids)
        self.assertGreaterEqual(result["criticalCount"], 1)

    def test_clean_code_produces_zero_critical_or_warning_findings(self) -> None:
        files = [
            {
                "path": "clean.py",
                "filename": "clean.py",
                "language": "Python",
                "capabilities": ["line_metrics", "functions", "cyclomatic_complexity"],
                "metricsUnavailable": [],
                "loc": 45,
                "imports": ["math"],
                "functionMetrics": [
                    {
                        "name": "clean_fn",
                        "loc": 10,
                        "complexity": 2,
                        "parametersCount": 2,
                        "nestingDepth": 1,
                    }
                ],
            }
        ]
        dep_graph = {
            "nodes": [
                {"nodeType": "file", "path": "clean.py", "incomingCount": 1, "outgoingCount": 1}
            ],
            "cycles": [],
        }
        result = analyze_refactoring(files, dep_graph)
        self.assertEqual(result["totalFindings"], 0)
        self.assertEqual(result["criticalCount"], 0)
        self.assertEqual(result["warningCount"], 0)

    def test_unsupported_language_metrics_do_not_produce_false_findings(self) -> None:
        files = [
            {
                "path": "script.sh",
                "filename": "script.sh",
                "language": "Shell",
                "capabilities": ["line_metrics"],
                "metricsUnavailable": ["functions", "complexity", "nestingDepth"],
                "loc": 40,
                "imports": None,
                "functionMetrics": None,
            }
        ]
        result = analyze_refactoring(files)
        self.assertEqual(result["totalFindings"], 0)
