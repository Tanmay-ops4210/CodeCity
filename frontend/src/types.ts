export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RefactoringSuggestion {
  type: string;
  recommendation: string;
  potential_modules: string[];
}

export interface CodeFile {
  name: string;
  path: string;
  folder: string;
  loc: number;
  complexity: number;
  risk: RiskLevel;
  functions: number;
  classes: number;
  branches: number;
  issues: string[];
  refactoring?: RefactoringSuggestion | null;
}

export interface AnalysisResult {
  repository: string;
  root_path?: string;
  total_files: number;
  total_loc: number;
  total_complexity: number;
  avg_complexity: number;
  total_functions: number;
  total_classes: number;
  high_risk_files: number;
  districts: string[];
  files: CodeFile[];
  top_risk_files: CodeFile[];
}

export interface FilterState {
  risk: 'ALL' | RiskLevel;
  district: string;
  searchQuery: string;
  minLoc: number;
  maxLoc: number;
}
