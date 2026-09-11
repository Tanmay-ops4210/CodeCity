import { AnalysisResult } from '../types';
import { DEMO_DATA } from './demoData';

export interface PresetItem {
  id: string;
  name: string;
  description: string;
  badge: string;
  data: AnalysisResult;
}

const MONOLITH_DATA: AnalysisResult = {
  repository: "enterprise-legacy-monolith",
  total_files: 28,
  total_loc: 4820,
  total_complexity: 580,
  avg_complexity: 20.7,
  total_functions: 312,
  total_classes: 64,
  high_risk_files: 14,
  districts: ["core", "legacy_billing", "reports", "auth_v1", "db_engine", "integrations"],
  top_risk_files: [
    {
      name: "billing_engine.py",
      path: "legacy_billing/billing_engine.py",
      folder: "legacy_billing",
      loc: 1420,
      complexity: 64,
      risk: "CRITICAL",
      functions: 28,
      classes: 4,
      branches: 52,
      issues: ["High branching logic", "Large monolithic file", "Difficult to unit test", "Prime candidate for refactoring"],
      refactoring: {
        type: "MONSTER FILE",
        recommendation: "Split into billing_calculator, tax_rules, invoice_generator, and ledger_sync",
        potential_modules: ["billing_calculator", "tax_rules", "invoice_generator", "ledger_sync"]
      }
    },
    {
      name: "report_generator.py",
      path: "reports/report_generator.py",
      folder: "reports",
      loc: 890,
      complexity: 41,
      risk: "CRITICAL",
      functions: 19,
      classes: 2,
      branches: 36,
      issues: ["Large monolithic file", "High branching logic", "Prime candidate for refactoring"],
      refactoring: {
        type: "MONSTER FILE",
        recommendation: "Extract CSV, PDF, and XLS export formatters into separate strategies",
        potential_modules: ["pdf_exporter", "csv_formatter", "chart_renderer"]
      }
    },
    {
      name: "query_builder.py",
      path: "db_engine/query_builder.py",
      folder: "db_engine",
      loc: 650,
      complexity: 28,
      risk: "CRITICAL",
      functions: 14,
      classes: 3,
      branches: 24,
      issues: ["High branching logic", "Difficult to unit test"],
      refactoring: {
        type: "HIGH COMPLEXITY MODULE",
        recommendation: "Decouple AST expression builder from dialect transpiler",
        potential_modules: ["ast_compiler", "postgres_dialect", "mysql_dialect"]
      }
    }
  ],
  files: [
    {
      name: "billing_engine.py",
      path: "legacy_billing/billing_engine.py",
      folder: "legacy_billing",
      loc: 1420,
      complexity: 64,
      risk: "CRITICAL",
      functions: 28,
      classes: 4,
      branches: 52,
      issues: ["High branching logic", "Large monolithic file", "Difficult to unit test"],
      refactoring: {
        type: "MONSTER FILE",
        recommendation: "Split into billing_calculator and tax_rules",
        potential_modules: ["billing_calculator", "tax_rules", "invoice_generator"]
      }
    },
    {
      name: "report_generator.py",
      path: "reports/report_generator.py",
      folder: "reports",
      loc: 890,
      complexity: 41,
      risk: "CRITICAL",
      functions: 19,
      classes: 2,
      branches: 36,
      issues: ["Large monolithic file", "High branching logic"],
      refactoring: {
        type: "MONSTER FILE",
        recommendation: "Extract CSV and PDF export formatters",
        potential_modules: ["pdf_exporter", "csv_formatter"]
      }
    },
    {
      name: "query_builder.py",
      path: "db_engine/query_builder.py",
      folder: "db_engine",
      loc: 650,
      complexity: 28,
      risk: "CRITICAL",
      functions: 14,
      classes: 3,
      branches: 24,
      issues: ["High branching logic"],
      refactoring: {
        type: "HIGH COMPLEXITY MODULE",
        recommendation: "Decouple AST expression builder",
        potential_modules: ["ast_compiler", "dialect_parser"]
      }
    },
    {
      name: "auth_ldap.py",
      path: "auth_v1/auth_ldap.py",
      folder: "auth_v1",
      loc: 380,
      complexity: 19,
      risk: "HIGH",
      functions: 8,
      classes: 2,
      branches: 16,
      issues: ["Prime candidate for refactoring"]
    },
    {
      name: "session_store.py",
      path: "auth_v1/session_store.py",
      folder: "auth_v1",
      loc: 240,
      complexity: 9,
      risk: "MEDIUM",
      functions: 6,
      classes: 1,
      branches: 8,
      issues: ["Well-scoped module"]
    },
    {
      name: "salesforce_sync.py",
      path: "integrations/salesforce_sync.py",
      folder: "integrations",
      loc: 520,
      complexity: 24,
      risk: "HIGH",
      functions: 12,
      classes: 2,
      branches: 20,
      issues: ["High method density"]
    },
    {
      name: "slack_webhook.py",
      path: "integrations/slack_webhook.py",
      folder: "integrations",
      loc: 110,
      complexity: 4,
      risk: "LOW",
      functions: 3,
      classes: 1,
      branches: 2,
      issues: ["Well-scoped module"]
    },
    {
      name: "app_kernel.py",
      path: "core/app_kernel.py",
      folder: "core",
      loc: 310,
      complexity: 12,
      risk: "HIGH",
      functions: 9,
      classes: 2,
      branches: 10,
      issues: ["Prime candidate for refactoring"]
    },
    {
      name: "config_loader.py",
      path: "core/config_loader.py",
      folder: "core",
      loc: 140,
      complexity: 5,
      risk: "LOW",
      functions: 4,
      classes: 1,
      branches: 3,
      issues: ["Well-scoped module"]
    }
  ]
};

export const REPOSITORY_PRESETS: PresetItem[] = [
  {
    id: "default-ecommerce",
    name: "Modern E-Commerce Engine",
    description: "Multi-district architecture: API routes, payment gateway, ETL pipeline, models, and tests.",
    badge: "Balanced Topology",
    data: DEMO_DATA
  },
  {
    id: "legacy-monolith",
    name: "Enterprise Legacy Monolith",
    description: "High-density technical debt: heavy billing monster files, AST query builders, and integrations.",
    badge: "High Debt Target",
    data: MONOLITH_DATA
  }
];
