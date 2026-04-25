import React, { createContext, useContext } from "react";
import { useGetMe, getGetMeQueryKey, useLogout } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
export type MeResponseUser = {
  id: number;
  email: string;
  name: string;
  role: string;
  createdAt: Date | string;
  functionId?: number | null;
  functionName?: string | null;
};

type AuthCtx = {
  user: MeResponseUser | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      retry: false,
      staleTime: 30_000,
    },
  });

  const logoutMutation = useLogout();

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
    await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    queryClient.clear();
  };

  const user = (data && (data as any).user) ?? null;
  return (
    <AuthContext.Provider value={{ user, isLoading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export const ALL_ROLES = [
  "Admin",
  "PMO Lead",
  "Project Manager",
  "Finance Controller",
  "Resource Manager",
  "Demand Owner",
  "Viewer",
] as const;
export type Role = (typeof ALL_ROLES)[number];

export function hasRole(user: MeResponseUser | null, ...roles: Role[]): boolean {
  if (!user) return false;
  return roles.includes(user.role as Role);
}
