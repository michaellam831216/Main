import client from "./client";
import { Deal, MonthlyEntry } from "../types";

export const dealsApi = {
  list: async (regionId: string) => {
    const { data } = await client.get<Deal[]>("/deals", { params: { regionId } });
    return data;
  },

  get: async (id: string) => {
    const { data } = await client.get<Deal & { auditLog: unknown[] }>(`/deals/${id}`);
    return data;
  },

  create: async (payload: {
    licenseeName: string;
    brandId: string;
    regionId: string;
    probability: string;
    contractStartDate: string;
    totalContractMg: number;
    categoryIds: string[];
    notes?: string;
  }) => {
    const { data } = await client.post<Deal>("/deals", payload);
    return data;
  },

  update: async (
    id: string,
    payload: Partial<{
      licenseeName: string;
      brandId: string;
      probability: string;
      contractStartDate: string;
      totalContractMg: number;
      categoryIds: string[];
      notes: string;
    }>
  ) => {
    const { data } = await client.patch<Deal>(`/deals/${id}`, payload);
    return data;
  },

  remove: async (id: string) => {
    await client.delete(`/deals/${id}`);
  },

  saveMonthly: async (dealId: string, entries: { year: number; month: number; royaltyAmount: number }[]) => {
    const { data } = await client.put<MonthlyEntry[]>(`/deals/${dealId}/monthly`, entries);
    return data;
  },
};
