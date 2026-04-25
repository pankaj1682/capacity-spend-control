import { useFy } from "@/components/fy-context";
import { 
  useGetDashboardSummary, 
  useGetBudgetVsActual, 
  useGetBurnRate, 
  useGetDemandVsCapacity, 
  useGetMultiYearBudget, 
  useGetOpexCapex, 
  useGetOverallocated, 
  useGetSkillShortage,
  getGetDashboardSummaryQueryKey,
  getGetBudgetVsActualQueryKey,
  getGetBurnRateQueryKey,
  getGetDemandVsCapacityQueryKey,
  getGetMultiYearBudgetQueryKey,
  getGetOpexCapexQueryKey,
  getGetOverallocatedQueryKey,
  getGetSkillShortageQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ComposedChart, Area } from "recharts";
import { formatCurrency } from "@/lib/utils";

export default function Dashboard() {
  const { fy, setFy } = useFy();

  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary({ fy }, { query: { queryKey: getGetDashboardSummaryQueryKey({ fy }) } });
  const { data: budgetVsActual, isLoading: loadingBva } = useGetBudgetVsActual({ fy }, { query: { queryKey: getGetBudgetVsActualQueryKey({ fy }) } });
  const { data: burnRate, isLoading: loadingBurn } = useGetBurnRate({ query: { queryKey: getGetBurnRateQueryKey() } });
  const { data: demandVsCapacity, isLoading: loadingDvc } = useGetDemandVsCapacity({ fy }, { query: { queryKey: getGetDemandVsCapacityQueryKey({ fy }) } });
  const { data: multiYear, isLoading: loadingMy } = useGetMultiYearBudget({ query: { queryKey: getGetMultiYearBudgetQueryKey() } });
  const { data: opexCapex, isLoading: loadingOc } = useGetOpexCapex({ fy }, { query: { queryKey: getGetOpexCapexQueryKey({ fy }) } });
  const { data: overallocated, isLoading: loadingOver } = useGetOverallocated({ query: { queryKey: getGetOverallocatedQueryKey() } });
  const { data: skillShortage, isLoading: loadingShort } = useGetSkillShortage({ fy }, { query: { queryKey: getGetSkillShortageQueryKey({ fy }) } });

  return (
    <div className="p-6 overflow-y-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="text-sm text-muted-foreground">FY{String(fy).slice(-2)} (Jul {fy - 1} – Jun {fy})</div>
      </div>

      {loadingSummary ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] w-full rounded-xl" />
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved Budget</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalApprovedBudget)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Forecast Budget</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalForecastBudget)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Actual Spend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalActualSpend)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Remaining Budget</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalRemaining)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.activeProjects}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalResources}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Demands</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.openDemands}</div>
            </CardContent>
          </Card>
          <Card className={summary.overallocatedCount > 0 ? "border-destructive/50 bg-destructive/5" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-destructive">Overallocated Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{summary.overallocatedCount}</div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Budget vs Actual (Monthly)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loadingBva ? <Skeleton className="h-full w-full" /> : budgetVsActual ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={budgetVsActual}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickFormatter={(m) => ({1:"Jan",2:"Feb",3:"Mar",4:"Apr",5:"May",6:"Jun",7:"Jul",8:"Aug",9:"Sep",10:"Oct",11:"Nov",12:"Dec"} as Record<number,string>)[m] ?? `M${m}`} />
                  <YAxis tickFormatter={(val) => `$${val/1000}k`} />
                  <Tooltip formatter={(val: number) => formatCurrency(val)} labelFormatter={(m) => `Month ${m}`} />
                  <Legend />
                  <Bar dataKey="actual" name="Actual" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="forecast" name="Forecast" stroke="hsl(var(--chart-2))" strokeWidth={2} />
                  <Line type="step" dataKey="approved" name="Approved" stroke="hsl(var(--chart-3))" strokeDasharray="5 5" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : null}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Demand vs Capacity</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loadingDvc ? <Skeleton className="h-full w-full" /> : demandVsCapacity ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={demandVsCapacity}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="skill" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="capacityFte" name="Capacity (FTE)" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="demandFte" name="Demand (FTE)" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Multi-Year Budget</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loadingMy ? <Skeleton className="h-full w-full" /> : multiYear ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={multiYear}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(val) => `$${val/1000}k`} />
                  <Tooltip formatter={(val: number) => formatCurrency(val)} />
                  <Legend />
                  <Bar dataKey="approved" name="Approved" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="forecast" name="Forecast" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" name="Actual" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Opex vs Capex Split</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loadingOc ? <Skeleton className="h-full w-full" /> : opexCapex ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={opexCapex}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickFormatter={(m) => ({1:"Jan",2:"Feb",3:"Mar",4:"Apr",5:"May",6:"Jun",7:"Jul",8:"Aug",9:"Sep",10:"Oct",11:"Nov",12:"Dec"} as Record<number,string>)[m] ?? `M${m}`} />
                  <YAxis tickFormatter={(val) => `$${val/1000}k`} />
                  <Tooltip formatter={(val: number) => formatCurrency(val)} labelFormatter={(m) => `Month ${m}`} />
                  <Legend />
                  <Area type="monotone" dataKey="opex" name="Opex" stackId="1" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" />
                  <Area type="monotone" dataKey="capex" name="Capex" stackId="1" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" />
                </AreaChart>
              </ResponsiveContainer>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Temporary internal AreaChart wrapper since it wasn't imported from recharts above
const AreaChart = ({ children, data }: any) => {
  return (
    <ComposedChart data={data}>
      {children}
    </ComposedChart>
  )
}
