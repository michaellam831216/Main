import client from "./client";
import { Brand, Category, Region, Snapshot, ComparisonResult, CompareType } from "../types";

export const metaApi = {
  brands: async () => {
    const { data } = await client.get<Brand[]>("/brands");
    return data;
  },
  createBrand: async (name: string) => {
    const { data } = await client.post<Brand>("/brands", { name });
    return data;
  },

  categories: async () => {
    const { data } = await client.get<Category[]>("/categories");
    return data;
  },
  createCategory: async (name: string) => {
    const { data } = await client.post<Category>("/categories", { name });
    return data;
  },

  regions: async () => {
    const { data } = await client.get<Region[]>("/regions");
    return data;
  },
  createRegion: async (name: string, currency: string) => {
    const { data } = await client.post<Region>("/regions", { name, currency });
    return data;
  },
  assignUserToRegion: async (regionId: string, userId: string) => {
    await client.post(`/regions/${regionId}/users`, { userId });
  },
  removeUserFromRegion: async (regionId: string, userId: string) => {
    await client.delete(`/regions/${regionId}/users/${userId}`);
  },

  snapshots: async (regionId: string) => {
    const { data } = await client.get<Snapshot[]>("/snapshots", { params: { regionId } });
    return data;
  },
  createSnapshot: async (regionId: string, name: string) => {
    const { data } = await client.post<Snapshot>("/snapshots", { regionId, name });
    return data;
  },
  compare: async (regionId: string, type: CompareType) => {
    const { data } = await client.get<ComparisonResult>("/snapshots/compare", { params: { regionId, type } });
    return data;
  },

  adminUsers: async () => {
    const { data } = await client.get("/admin/users");
    return data;
  },
  createUser: async (payload: { email: string; name: string; password: string; role?: string }) => {
    const { data } = await client.post("/admin/users", payload);
    return data;
  },
};
