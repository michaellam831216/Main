export type Role = "ADMIN" | "USER" | "DASHBOARD";
export type Probability = "SIGNED" | "HIGH" | "MEDIUM" | "LOW";
export type SnapshotType = "WEEKLY" | "MONTHLY" | "MANUAL";
export type CompareType = "week" | "month";

export interface Region {
  id: string;
  name: string;
  currency: string;
}

export interface Brand {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface MonthlyEntry {
  id: string;
  dealId: string;
  year: number;
  month: number;
  mgPayment: number;
  royaltyAmount: number;
  updatedAt: string;
}

export interface Deal {
  id: string;
  licenseeName: string;
  brand: Brand;
  brandId: string;
  region: Region;
  regionId: string;
  probability: Probability;
  contractStartDate: string;
  totalContractMg: number;
  currency: string;
  notes?: string;
  isActive: boolean;
  createdBy: { id: string; name: string; email: string };
  createdById: string;
  categories: { dealId: string; categoryId: string; category: Category }[];
  monthlyEntries: MonthlyEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditEntry {
  id: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: string;
  changedBy: { name: string };
}

export interface Snapshot {
  id: string;
  name: string;
  type: SnapshotType;
  regionId: string | null;
  createdAt: string;
  createdBy: { name: string };
}

export interface DeltaMetric {
  current: number;
  previous: number;
  absolute: number;
  percent: number | null;
  direction: "up" | "down" | "same";
}

export interface ComparisonResult {
  available: boolean;
  message?: string;
  snapshotName?: string;
  snapshotDate?: string;
  totalMg?: DeltaMetric;
  totalRoyalties?: DeltaMetric;
  dealCount?: DeltaMetric;
  byProbability?: {
    SIGNED: DeltaMetric;
    HIGH: DeltaMetric;
    MEDIUM: DeltaMetric;
    LOW: DeltaMetric;
  };
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  regions: Region[];
}

export const PROBABILITY_LABELS: Record<Probability, string> = {
  SIGNED: "Signed",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

export const PROBABILITY_WEIGHTS: Record<Probability, number> = {
  SIGNED: 1.0,
  HIGH: 0.8,
  MEDIUM: 0.5,
  LOW: 0.2,
};

export const PROBABILITY_COLORS: Record<Probability, string> = {
  SIGNED: "bg-emerald-100 text-emerald-800 border border-emerald-300",
  HIGH: "bg-blue-100 text-blue-800 border border-blue-300",
  MEDIUM: "bg-amber-100 text-amber-800 border border-amber-300",
  LOW: "bg-rose-100 text-rose-800 border border-rose-300",
};
