"""
Automated unit tests for Code City AST analyzer and metrics calculation.
"""

import os
import unittest
from backend.analyzer import ComplexityVisitor, calculate_loc, determine_risk, analyze_code_string, analyze_repository
import ast


class TestAnalyzer(unittest.TestCase):
    def test_loc_calculation(self):
        sample = """
        # Comment line
        def hello():
            print("world")

        # Blank line above
        return 42
        """
        loc = calculate_loc(sample)
        # Blank lines are excluded; 5 physical lines remain
        self.assertEqual(loc, 5)

    def test_cyclomatic_complexity_branches(self):
        code = """
def process(a, b, items):
    if a and b:
        for x in items:
            while x > 0:
                try:
                    with open('test') as f:
                        pass
                except Exception:
                    pass
    return True
"""
        tree = ast.parse(code)
        visitor = ComplexityVisitor()
        visitor.visit(tree)
        # base: 1
        # def: +1
        # if: +1, boolop 'and': +1
        # for: +1
        # while: +1
        # with: +1
        # except: +1
        # Total: 8
        self.assertEqual(visitor.complexity, 8)
        self.assertEqual(visitor.functions_count, 1)

    def test_risk_tiers(self):
        self.assertEqual(determine_risk(1), "LOW")
        self.assertEqual(determine_risk(5), "LOW")
        self.assertEqual(determine_risk(6), "MEDIUM")
        self.assertEqual(determine_risk(10), "MEDIUM")
        self.assertEqual(determine_risk(11), "HIGH")
        self.assertEqual(determine_risk(25), "HIGH")
        self.assertEqual(determine_risk(26), "CRITICAL")
        self.assertEqual(determine_risk(50), "CRITICAL")

    def test_analyze_code_string(self):
        code = """
class BillingManager:
    def charge(self, amount):
        if amount > 100:
            return amount * 0.9
        return amount
"""
        res = analyze_code_string(code, "services/billing.py", "")
        self.assertEqual(res["name"], "billing.py")
        self.assertEqual(res["folder"], "services")
        self.assertEqual(res["classes"], 1)
        self.assertEqual(res["functions"], 1)
        self.assertIn(res["risk"], ["LOW", "MEDIUM", "HIGH", "CRITICAL"])

    def test_analyze_demo_repo(self):
        demo_path = os.path.join(os.path.dirname(__file__), "..", "backend", "demo_repo")
        result = analyze_repository(demo_path)
        self.assertGreater(result["total_files"], 10)
        self.assertGreater(result["total_loc"], 400)
        self.assertGreater(len(result["districts"]), 3)
        self.assertTrue(any(f["name"] == "payment_service.py" for f in result["files"]))


if __name__ == "__main__":
    unittest.main()
