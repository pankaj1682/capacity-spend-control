import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { FYProvider } from "@/components/fy-context";
import { AuthProvider } from "@/components/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import ProjectDetail from "@/pages/project-detail";
import Resources from "@/pages/resources";
import Demands from "@/pages/demands";
import Allocations from "@/pages/allocations";
import Budgets from "@/pages/budgets";
import Actuals from "@/pages/actuals";
import Analytics from "@/pages/analytics";
import AdminUsers from "@/pages/admin-users";
import AdminFxRates from "@/pages/admin-fx-rates";
import AdminFunctions from "@/pages/admin-functions";
import AuditLogs from "@/pages/audit-logs";

const queryClient = new QueryClient();

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col h-screen overflow-hidden">{children}</main>
      </div>
    </SidebarProvider>
  );
}

function AppRouter() {
  const [location] = useLocation();
  const isAuthRoute = location === "/login" || location === "/signup";

  if (isAuthRoute) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
      </Switch>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/projects" component={Projects} />
          <Route path="/projects/:id" component={ProjectDetail} />
          <Route path="/resources" component={Resources} />
          <Route path="/demands" component={Demands} />
          <Route path="/allocations" component={Allocations} />
          <Route path="/budgets" component={Budgets} />
          <Route path="/actuals" component={Actuals} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/admin/users">
            <ProtectedRoute requireAnyRole={["Admin"]}>
              <AdminUsers />
            </ProtectedRoute>
          </Route>
          <Route path="/admin/functions">
            <ProtectedRoute requireAnyRole={["Admin"]}>
              <AdminFunctions />
            </ProtectedRoute>
          </Route>
          <Route path="/admin/fx-rates">
            <ProtectedRoute requireAnyRole={["Admin", "Finance Controller"]}>
              <AdminFxRates />
            </ProtectedRoute>
          </Route>
          <Route path="/admin/audit-logs">
            <ProtectedRoute requireAnyRole={["Admin", "PMO Lead", "Finance Controller"]}>
              <AuditLogs />
            </ProtectedRoute>
          </Route>
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <FYProvider>
              <AppRouter />
              <Toaster />
            </FYProvider>
          </AuthProvider>
        </WouterRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
