import { useAuth, hasRole, type Role } from "@/components/auth-context";

export function RoleGate({ roles, children, fallback = null }: { roles: Role[]; children: React.ReactNode; fallback?: React.ReactNode }) {
  const { user } = useAuth();
  if (!hasRole(user, ...roles)) return <>{fallback}</>;
  return <>{children}</>;
}

export function useHasRole(...roles: Role[]): boolean {
  const { user } = useAuth();
  return hasRole(user, ...roles);
}
