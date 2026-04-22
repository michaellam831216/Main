import client from "./client";
import { AuthUser } from "../types";

export const authApi = {
  login: async (email: string, password: string) => {
    const { data } = await client.post<{ token: string; user: AuthUser }>("/auth/login", { email, password });
    return data;
  },
  logout: async () => {
    await client.post("/auth/logout");
  },
  me: async () => {
    const { data } = await client.get<AuthUser>("/auth/me");
    return data;
  },
};
