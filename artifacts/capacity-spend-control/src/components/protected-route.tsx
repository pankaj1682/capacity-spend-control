import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth, hasRole, type Role } from "@/components/auth-context";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ children, requireAnyRole }: { children: React.ReactNode; requireAnyRole?: Role[] }) {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [isLoading, user, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return null;
  if (requireAnyRole && !hasRole(user, ...requireAnyRole)) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold mb-2">Access denied</h1>
        <p className="text-muted-foreground">You don't have permission to view this page.</p>
      </div>
    );
  }
  return <>{children}</>;
}
