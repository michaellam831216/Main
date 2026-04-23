import client from "./client";

export interface DashboardKpi {
  dealCount: number;
  totalMg: number;
  weightedMg: number;
  totalCollected: number;
  totalMgScheduled: number;
}

export interface BrandRow {
  name: string;
  dealCount: number;
  totalMg: number;
  weightedMg: number;
  collected: number;
}

export interface RegionRow {
  name: string;
  currency: string;
  dealCount: number;
  totalMg: number;
  weightedMg: number;
  collected: number;
}

export interface PersonRow {
  name: string;
  email: string;
  dealCount: number;
  totalMg: number;
  weightedMg: number;
  collected: number;
}

export interface ProbabilityRow {
  probability: string;
  dealCount: number;
  totalMg: number;
  weightedMg: number;
  collected: number;
}

export interface TrendPoint {
  label: string;
  year: number;
  month: number;
  mgScheduled: number;
  collected: number;
}

export interface DashboardSummary {
  kpi: DashboardKpi;
  byBrand: BrandRow[];
  byRegion: RegionRow[];
  byPerson: PersonRow[];
  byProbability: ProbabilityRow[];
  trend: TrendPoint[];
}

export const dashboardApi = {
  summary: async (): Promise<DashboardSummary> => {
    const { data } = await client.get<DashboardSummary>("/dashboard/summary");
    return data;
  },
  ask: async (question: string): Promise<string> => {
    const { data } = await client.post<{ answer: string }>("/dashboard/ask", { question });
    return data.answer;
  },
};
