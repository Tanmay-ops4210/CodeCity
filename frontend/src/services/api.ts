import { AnalysisResult } from '../types';
import { DEMO_DATA } from '../data/demoData';

const API_BASE_URL = 'http://localhost:8000';

export interface HealthStatus {
  status: string;
  analyzer: string;
  version: string;
  demo_available?: boolean;
}

export async function checkServerHealth(): Promise<HealthStatus | null> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
    clearTimeout(id);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // Backend offline or unreachable
  }
  return null;
}

export async function fetchDemoAnalysis(): Promise<AnalysisResult> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${API_BASE_URL}/demo`, { signal: controller.signal });
    clearTimeout(id);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // Return bundled offline demo data
  }
  return DEMO_DATA;
}

export async function analyzeRepositoryPath(path: string): Promise<AnalysisResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Analysis failed');
    }
    return await res.json();
  } catch (err: any) {
    throw new Error(err.message || 'Cannot reach local analysis server on port 8000');
  }
}
