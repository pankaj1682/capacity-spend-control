import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  ClipboardList,
  CalendarDays,
  DollarSign,
  ReceiptText,
  BarChart4,
  ShieldCheck,
  Coins,
  LogOut,
  ScrollText,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFy, fyLabel } from "@/components/fy-context";
import { useAuth, hasRole } from "@/components/auth-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Resources", href: "/resources", icon: Users },
  { name: "Demands", href: "/demands", icon: ClipboardList },
  { name: "Allocations", href: "/allocations", icon: CalendarDays },
  { name: "Budgets", href: "/budgets", icon: DollarSign },
  { name: "Actuals", href: "/actuals", icon: ReceiptText },
  { name: "Analytics", href: "/analytics", icon: BarChart4 },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { fy, setFy } = useFy();
  const { user, logout } = useAuth();

  const fyOptions = [];
  for (let i = -1; i <= 3; i++) fyOptions.push(fy + i);

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <h2 className="text-lg font-bold tracking-tight text-sidebar-foreground">
          CapSpend<span className="text-primary-foreground">Ctrl</span>
        </h2>
        <div className="mt-3">
          <Select value={String(fy)} onValueChange={(v) => setFy(Number(v))}>
            <SelectTrigger className="h-8 w-full" data-testid="select-fy">
              <SelectValue placeholder="Fiscal Year">{fyLabel(fy)} <span className="text-xs text-muted-foreground ml-1">(Jul {fy - 1}–Jun {fy})</span></SelectValue>
            </SelectTrigger>
            <SelectContent>
              {[...new Set(fyOptions)].sort((a, b) => a - b).map((y) => (
                <SelectItem key={y} value={String(y)}>{fyLabel(y)} (Jul {y - 1}–Jun {y})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Portfolio</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.href || (item.href !== "/" && location.startsWith(item.href))}
                    tooltip={item.name}
                  >
                    <Link href={item.href} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {(hasRole(user, "Admin") || hasRole(user, "Finance Controller") || hasRole(user, "PMO Lead")) && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {hasRole(user, "Admin") && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/admin/users")} tooltip="Users">
                      <Link href="/admin/users" className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" />
                        <span>Users</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {hasRole(user, "Admin") && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/admin/functions")} tooltip="Business Functions">
                      <Link href="/admin/functions" className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <span>Functions</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {(hasRole(user, "Admin") || hasRole(user, "Finance Controller")) && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/admin/fx-rates")} tooltip="FX Rates">
                      <Link href="/admin/fx-rates" className="flex items-center gap-2">
                        <Coins className="h-4 w-4" />
                        <span>FX Rates</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.startsWith("/admin/audit-logs")} tooltip="Audit Log">
                    <Link href="/admin/audit-logs" className="flex items-center gap-2">
                      <ScrollText className="h-4 w-4" />
                      <span>Audit Log</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4 space-y-2">
        {user && (
          <div className="text-xs space-y-0.5">
            <div className="font-medium text-sidebar-foreground truncate">{user.name}</div>
            <div className="text-sidebar-foreground/60 truncate">{user.email}</div>
            <div className="text-sidebar-foreground/60">{user.role}</div>
            {user.functionName && (
              <div className="text-primary font-medium truncate">📍 {user.functionName}</div>
            )}
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => { void logout(); }}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-2" /> Sign out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
