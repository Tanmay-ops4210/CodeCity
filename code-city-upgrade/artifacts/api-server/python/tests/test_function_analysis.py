from __future__ import annotations

import unittest

from code_city.analyzer import analyze_file, analyze_source


class FunctionLevelAnalysisTests(unittest.TestCase):
    def test_python_methods_parameters_nesting_and_loc(self) -> None:
        source = b'''class Calculator:
    def compute(self, x, y, multiplier=1, *extra, **opts):
        """Compute values with conditionals."""
        if x > 0:
            if y > 0:
                for i in range(multiplier):
                    pass
        return x + y
'''
        result = analyze_source("calc.py", source)
        self.assertIsNone(result["analysisError"])
        self.assertEqual(len(result["functionMetrics"]), 1)
        fn = result["functionMetrics"][0]
        self.assertEqual(fn["name"], "compute")
        self.assertEqual(fn["qualifiedName"], "Calculator.compute")
        self.assertEqual(fn["filePath"], "calc.py")
        self.assertEqual(fn["lineStart"], 2)
        self.assertEqual(fn["lineEnd"], 8)
        self.assertEqual(fn["parametersCount"], 6)  # self, x, y, multiplier, *extra, **opts
        self.assertEqual(fn["nestingDepth"], 3)     # if -> if -> for
        self.assertEqual(fn["conditionalBranches"], 2)
        self.assertEqual(fn["loops"], 1)
        self.assertEqual(fn["complexity"], 4)      # base 1 + 2 conditionals + 1 loop
        self.assertFalse(fn["isNested"])
        self.assertFalse(fn["isAsync"])
        self.assertGreater(fn["loc"], 0)

    def test_python_nested_functions_prevent_double_counting(self) -> None:
        source = b'''def outer(val):
    if val:
        def inner(sub):
            if sub:
                for _ in range(5):
                    pass
            return sub * 2
        return inner(val)
    return 0
'''
        result = analyze_source("nested.py", source)
        self.assertIsNone(result["analysisError"])
        self.assertEqual(len(result["functionMetrics"]), 2)
        outer_fn = result["functionMetrics"][0]
        inner_fn = result["functionMetrics"][1]

        self.assertEqual(outer_fn["name"], "outer")
        self.assertEqual(outer_fn["qualifiedName"], "outer")
        self.assertFalse(outer_fn["isNested"])
        # outer only has 1 if; inner's decisions must NOT be counted into outer!
        self.assertEqual(outer_fn["conditionalBranches"], 1)
        self.assertEqual(outer_fn["loops"], 0)
        self.assertEqual(outer_fn["complexity"], 2)

        self.assertEqual(inner_fn["name"], "inner")
        self.assertEqual(inner_fn["qualifiedName"], "outer.inner")
        self.assertTrue(inner_fn["isNested"])
        self.assertEqual(inner_fn["conditionalBranches"], 1)
        self.assertEqual(inner_fn["loops"], 1)
        self.assertEqual(inner_fn["complexity"], 3)

    def test_javascript_and_typescript_function_metrics(self) -> None:
        source = b'''export class Service {
  async process(req, res, next) {
    if (req.valid && req.auth) {
      for (const item of req.items) {
        if (item.active) handle(item);
      }
    }
  }
}
export const helper = (a, b) => a + b;
'''
        result = analyze_file("service.ts", source)
        self.assertIsNone(result["analysisError"])
        self.assertEqual(len(result["functionMetrics"]), 2)

        method = result["functionMetrics"][0]
        self.assertEqual(method["name"], "process")
        self.assertEqual(method["qualifiedName"], "Service.process")
        self.assertTrue(method["isAsync"])
        self.assertEqual(method["parametersCount"], 3)
        self.assertEqual(method["conditionalBranches"], 2) # 2 if statements
        self.assertEqual(method["booleanOperators"], 1)     # && operator
        self.assertEqual(method["loops"], 1)                # for loop
        self.assertEqual(method["complexity"], 5)           # 1 + 2 + 1 + 1 = 5
        self.assertGreater(method["nestingDepth"], 1)

        arrow = result["functionMetrics"][1]
        self.assertEqual(arrow["name"], "helper")
        self.assertEqual(arrow["parametersCount"], 2)
        self.assertEqual(arrow["complexity"], 1)
        self.assertFalse(arrow["isAsync"])

    def test_java_method_and_constructor_metrics(self) -> None:
        source = b'''package com.example;

public class Manager {
    private int id;
    public Manager(int id) {
        this.id = id;
    }
    public int dispatch(int action, boolean flag) {
        if (flag) {
            switch (action) {
                case 1: return 10;
                case 2: return 20;
                default: return 0;
            }
        }
        return -1;
    }
}
'''
        result = analyze_file("src/com/example/Manager.java", source)
        self.assertIsNone(result["analysisError"])
        self.assertEqual(len(result["functionMetrics"]), 2)

        ctor = result["functionMetrics"][0]
        self.assertEqual(ctor["name"], "Manager")
        self.assertEqual(ctor["qualifiedName"], "Manager.Manager")
        self.assertEqual(ctor["parametersCount"], 1)
        self.assertEqual(ctor["complexity"], 1)

        method = result["functionMetrics"][1]
        self.assertEqual(method["name"], "dispatch")
        self.assertEqual(method["qualifiedName"], "Manager.dispatch")
        self.assertEqual(method["parametersCount"], 2)
        # if + 2 non-default switch labels = 3 decision branches -> CC = 4
        self.assertEqual(method["complexity"], 4)
        self.assertEqual(method["conditionalBranches"], 3)

    def test_c_and_cpp_function_metrics(self) -> None:
        c_source = b'''#include <stdio.h>

int compute_total(int* items, int length, int base_tax) {
    int total = base_tax;
    for (int i = 0; i < length; i++) {
        if (items[i] > 0) {
            total += items[i];
        }
    }
    return total;
}
'''
        result = analyze_file("calc.c", c_source)
        self.assertIsNone(result["analysisError"])
        self.assertEqual(len(result["functionMetrics"]), 1)
        fn = result["functionMetrics"][0]
        self.assertEqual(fn["name"], "compute_total")
        self.assertEqual(fn["parametersCount"], 3)
        self.assertEqual(fn["loops"], 1)
        self.assertEqual(fn["conditionalBranches"], 1)
        self.assertEqual(fn["complexity"], 3)
        self.assertEqual(fn["lineStart"], 3)
        self.assertEqual(fn["lineEnd"], 11)

    def test_unsupported_language_honestly_reports_function_metrics_unavailable(self) -> None:
        go_source = b'''package main
func helper(x int) int {
    if x > 0 { return x }
    return 0
}
'''
        result = analyze_file("main.go", go_source)
        self.assertIsNone(result["analysisError"])
        self.assertIsNone(result["functions"])
        self.assertIsNone(result["functionMetrics"])
        self.assertIn("functions", result["metricsUnavailable"])
