import { AnalysisResult } from '../types';

export const DEMO_DATA: AnalysisResult = {
  "repository": "demo_repo",
  "root_path": "/Users/maclab8/Documents/codecity/backend/demo_repo",
  "total_files": 15,
  "total_loc": 635,
  "total_complexity": 140,
  "avg_complexity": 9.3,
  "total_functions": 46,
  "total_classes": 11,
  "high_risk_files": 3,
  "districts": [
    "src/api",
    "src/models",
    "src/pipeline",
    "src/services",
    "tests",
    "utils"
  ],
  "files": [
    {
      "name": "test_services.py",
      "path": "tests/test_services.py",
      "folder": "tests",
      "loc": 9,
      "complexity": 5,
      "risk": "LOW",
      "functions": 4,
      "classes": 0,
      "branches": 0,
      "issues": [
        "Well-scoped module"
      ],
      "refactoring": null
    },
    {
      "name": "test_api.py",
      "path": "tests/test_api.py",
      "folder": "tests",
      "loc": 7,
      "complexity": 4,
      "risk": "LOW",
      "functions": 3,
      "classes": 0,
      "branches": 0,
      "issues": [
        "Well-scoped module"
      ],
      "refactoring": null
    },
    {
      "name": "parser.py",
      "path": "utils/parser.py",
      "folder": "utils",
      "loc": 19,
      "complexity": 7,
      "risk": "MEDIUM",
      "functions": 3,
      "classes": 1,
      "branches": 3,
      "issues": [
        "Well-scoped module"
      ],
      "refactoring": null
    },
    {
      "name": "crypto.py",
      "path": "utils/crypto.py",
      "folder": "utils",
      "loc": 7,
      "complexity": 3,
      "risk": "LOW",
      "functions": 2,
      "classes": 0,
      "branches": 0,
      "issues": [
        "Well-scoped module"
      ],
      "refactoring": null
    },
    {
      "name": "helpers.py",
      "path": "utils/helpers.py",
      "folder": "utils",
      "loc": 9,
      "complexity": 5,
      "risk": "LOW",
      "functions": 2,
      "classes": 0,
      "branches": 2,
      "issues": [
        "Well-scoped module"
      ],
      "refactoring": null
    },
    {
      "name": "etl_stream.py",
      "path": "src/pipeline/etl_stream.py",
      "folder": "src/pipeline",
      "loc": 41,
      "complexity": 18,
      "risk": "HIGH",
      "functions": 4,
      "classes": 1,
      "branches": 13,
      "issues": [
        "Prime candidate for refactoring"
      ],
      "refactoring": {
        "type": "HIGH COMPLEXITY MODULE",
        "recommendation": "Split into smaller cohesive sub-modules",
        "potential_modules": [
          "__init___module",
          "_cleanse_record_module"
        ]
      }
    },
    {
      "name": "normalizer.py",
      "path": "src/pipeline/normalizer.py",
      "folder": "src/pipeline",
      "loc": 14,
      "complexity": 6,
      "risk": "MEDIUM",
      "functions": 2,
      "classes": 1,
      "branches": 3,
      "issues": [
        "Well-scoped module"
      ],
      "refactoring": null
    },
    {
      "name": "user.py",
      "path": "src/models/user.py",
      "folder": "src/models",
      "loc": 12,
      "complexity": 2,
      "risk": "LOW",
      "functions": 1,
      "classes": 1,
      "branches": 0,
      "issues": [
        "Well-scoped module"
      ],
      "refactoring": null
    },
    {
      "name": "cart.py",
      "path": "src/models/cart.py",
      "folder": "src/models",
      "loc": 10,
      "complexity": 5,
      "risk": "LOW",
      "functions": 3,
      "classes": 1,
      "branches": 1,
      "issues": [
        "Well-scoped module"
      ],
      "refactoring": null
    },
    {
      "name": "transaction.py",
      "path": "src/models/transaction.py",
      "folder": "src/models",
      "loc": 10,
      "complexity": 1,
      "risk": "LOW",
      "functions": 0,
      "classes": 1,
      "branches": 0,
      "issues": [
        "Well-scoped module"
      ],
      "refactoring": null
    },
    {
      "name": "auth.py",
      "path": "src/api/auth.py",
      "folder": "src/api",
      "loc": 33,
      "complexity": 11,
      "risk": "HIGH",
      "functions": 3,
      "classes": 1,
      "branches": 7,
      "issues": [
        "Well-scoped module"
      ],
      "refactoring": null
    },
    {
      "name": "routes.py",
      "path": "src/api/routes.py",
      "folder": "src/api",
      "loc": 26,
      "complexity": 10,
      "risk": "MEDIUM",
      "functions": 5,
      "classes": 1,
      "branches": 4,
      "issues": [
        "Well-scoped module"
      ],
      "refactoring": null
    },
    {
      "name": "order_service.py",
      "path": "src/services/order_service.py",
      "folder": "src/services",
      "loc": 35,
      "complexity": 9,
      "risk": "MEDIUM",
      "functions": 2,
      "classes": 1,
      "branches": 6,
      "issues": [
        "Well-scoped module"
      ],
      "refactoring": null
    },
    {
      "name": "payment_service.py",
      "path": "src/services/payment_service.py",
      "folder": "src/services",
      "loc": 383,
      "complexity": 45,
      "risk": "CRITICAL",
      "functions": 9,
      "classes": 1,
      "branches": 35,
      "issues": [
        "High branching logic",
        "Difficult to unit test",
        "Prime candidate for refactoring"
      ],
      "refactoring": {
        "type": "HIGH COMPLEXITY MODULE",
        "recommendation": "Split into smaller cohesive sub-modules",
        "potential_modules": [
          "__init___module",
          "_fallback_gateway_module",
          "_charge_paypal_module"
        ]
      }
    },
    {
      "name": "user_service.py",
      "path": "src/services/user_service.py",
      "folder": "src/services",
      "loc": 20,
      "complexity": 9,
      "risk": "MEDIUM",
      "functions": 3,
      "classes": 1,
      "branches": 5,
      "issues": [
        "Well-scoped module"
      ],
      "refactoring": null
    }
  ],
  "top_risk_files": [
    {
      "name": "payment_service.py",
      "path": "src/services/payment_service.py",
      "folder": "src/services",
      "loc": 383,
      "complexity": 45,
      "risk": "CRITICAL",
      "functions": 9,
      "classes": 1,
      "branches": 35,
      "issues": [
        "High branching logic",
        "Difficult to unit test",
        "Prime candidate for refactoring"
      ],
      "refactoring": {
        "type": "HIGH COMPLEXITY MODULE",
        "recommendation": "Split into smaller cohesive sub-modules",
        "potential_modules": [
          "__init___module",
          "_fallback_gateway_module",
          "_charge_paypal_module"
        ]
      }
    },
    {
      "name": "etl_stream.py",
      "path": "src/pipeline/etl_stream.py",
      "folder": "src/pipeline",
      "loc": 41,
      "complexity": 18,
      "risk": "HIGH",
      "functions": 4,
      "classes": 1,
      "branches": 13,
      "issues": [
        "Prime candidate for refactoring"
      ],
      "refactoring": {
        "type": "HIGH COMPLEXITY MODULE",
        "recommendation": "Split into smaller cohesive sub-modules",
        "potential_modules": [
          "__init___module",
          "_cleanse_record_module"
        ]
      }
    },
    {
      "name": "auth.py",
      "path": "src/api/auth.py",
      "folder": "src/api",
      "loc": 33,
      "complexity": 11,
      "risk": "HIGH",
      "functions": 3,
      "classes": 1,
      "branches": 7,
      "issues": [
        "Well-scoped module"
      ],
      "refactoring": null
    },
    {
      "name": "routes.py",
      "path": "src/api/routes.py",
      "folder": "src/api",
      "loc": 26,
      "complexity": 10,
      "risk": "MEDIUM",
      "functions": 5,
      "classes": 1,
      "branches": 4,
      "issues": [
        "Well-scoped module"
      ],
      "refactoring": null
    },
    {
      "name": "order_service.py",
      "path": "src/services/order_service.py",
      "folder": "src/services",
      "loc": 35,
      "complexity": 9,
      "risk": "MEDIUM",
      "functions": 2,
      "classes": 1,
      "branches": 6,
      "issues": [
        "Well-scoped module"
      ],
      "refactoring": null
    },
    {
      "name": "user_service.py",
      "path": "src/services/user_service.py",
      "folder": "src/services",
      "loc": 20,
      "complexity": 9,
      "risk": "MEDIUM",
      "functions": 3,
      "classes": 1,
      "branches": 5,
      "issues": [
        "Well-scoped module"
      ],
      "refactoring": null
    },
    {
      "name": "parser.py",
      "path": "utils/parser.py",
      "folder": "utils",
      "loc": 19,
      "complexity": 7,
      "risk": "MEDIUM",
      "functions": 3,
      "classes": 1,
      "branches": 3,
      "issues": [
        "Well-scoped module"
      ],
      "refactoring": null
    },
    {
      "name": "normalizer.py",
      "path": "src/pipeline/normalizer.py",
      "folder": "src/pipeline",
      "loc": 14,
      "complexity": 6,
      "risk": "MEDIUM",
      "functions": 2,
      "classes": 1,
      "branches": 3,
      "issues": [
        "Well-scoped module"
      ],
      "refactoring": null
    },
    {
      "name": "cart.py",
      "path": "src/models/cart.py",
      "folder": "src/models",
      "loc": 10,
      "complexity": 5,
      "risk": "LOW",
      "functions": 3,
      "classes": 1,
      "branches": 1,
      "issues": [
        "Well-scoped module"
      ],
      "refactoring": null
    },
    {
      "name": "test_services.py",
      "path": "tests/test_services.py",
      "folder": "tests",
      "loc": 9,
      "complexity": 5,
      "risk": "LOW",
      "functions": 4,
      "classes": 0,
      "branches": 0,
      "issues": [
        "Well-scoped module"
      ],
      "refactoring": null
    }
  ]
};
