import { useRoute } from "wouter";
import { 
  useGetProject, 
  getGetProjectQueryKey,
  useGetBudgetVsActual,
  getGetBudgetVsActualQueryKey,
  useListBudgets,
  getListBudgetsQueryKey,
  useListAllocations,
  getListAllocationsQueryKey,
  useListActuals,
  getListActualsQueryKey,
  useListDemands,
  getListDemandsQueryKey
} from "@workspace/api-client-react";
import { useFy } from "@/components/fy-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Bar, Line, ComposedChart } from "recharts";

export default function ProjectDetail() {
  const [, params] = useRoute("/projects/:id");
  const projectId = params?.id ? parseInt(params.id) : 0;
  const { fy } = useFy();
  const year = fy;

  const { data: project, isLoading: loadingProject } = useGetProject(projectId, { 
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) } 
  });

  const { data: budgetVsActual, isLoading: loadingBva } = useGetBudgetVsActual(
    { year, projectId }, 
    { query: { enabled: !!projectId, queryKey: getGetBudgetVsActualQueryKey({ year, projectId }) } }
  );

  const { data: budgets, isLoading: loadingBudgets } = useListBudgets(
    { projectId }, 
    { query: { enabled: !!projectId, queryKey: getListBudgetsQueryKey({ projectId }) } }
  );

  const { data: allocations, isLoading: loadingAlloc } = useListAllocations(
    { projectId }, 
    { query: { enabled: !!projectId, queryKey: getListAllocationsQueryKey({ projectId }) } }
  );

  const { data: actuals, isLoading: loadingActuals } = useListActuals(
    { projectId }, 
    { query: { enabled: !!projectId, queryKey: getListActualsQueryKey({ projectId }) } }
  );

  const { data: demands, isLoading: loadingDemands } = useListDemands(
    { projectId }, 
    { query: { enabled: !!projectId, queryKey: getListDemandsQueryKey({ projectId }) } }
  );

  if (loadingProject) {
    return <div className="p-6 space-y-4"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!project) {
    return <div className="p-6 text-muted-foreground">Project not found</div>;
  }

  return (
    <div className="p-6 h-full flex flex-col space-y-6 overflow-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          <p className="text-muted-foreground">{project.code} &middot; {project.portfolio}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm px-3 py-1 bg-card">{project.phase}</Badge>
          <Badge className="text-sm px-3 py-1" variant={
            project.status === 'Active' ? 'default' : 
            project.status === 'Completed' ? 'secondary' : 
            project.status === 'Cancelled' ? 'destructive' : 'outline'
          }>
            {project.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(project.approvedBudget)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Owner</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">{project.budgetOwner}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Start Date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">{new Date(project.startDate).toLocaleDateString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">End Date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">{new Date(project.endDate).toLocaleDateString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Budget vs Actual ({year})</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          {loadingBva ? <Skeleton className="h-full w-full" /> : budgetVsActual && budgetVsActual.length > 0 ? (
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
          ) : <div className="flex h-full items-center justify-center text-muted-foreground">No financial data for {year}</div>}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budgets List */}
        <Card className="flex flex-col h-[400px]">
          <CardHeader>
            <CardTitle>Budget Plans</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-0">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="pl-6">Period</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Approved</TableHead>
                  <TableHead className="text-right pr-6">Forecast</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingBudgets ? (
                  <TableRow><TableCell colSpan={4}><Skeleton className="h-8 w-full m-4" /></TableCell></TableRow>
                ) : budgets?.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center h-24 text-muted-foreground">No budget plans.</TableCell></TableRow>
                ) : budgets?.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="pl-6">M{b.month} {b.year}</TableCell>
                    <TableCell><Badge variant="outline">{b.costType}</Badge></TableCell>
                    <TableCell className="text-right">{formatCurrency(b.approvedBudget)}</TableCell>
                    <TableCell className="text-right pr-6">{formatCurrency(b.forecastBudget)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Actuals List */}
        <Card className="flex flex-col h-[400px]">
          <CardHeader>
            <CardTitle>Actuals Tracking</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-0">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="pl-6">Period</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="pl-6">Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingActuals ? (
                  <TableRow><TableCell colSpan={3}><Skeleton className="h-8 w-full m-4" /></TableCell></TableRow>
                ) : actuals?.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center h-24 text-muted-foreground">No actuals logged.</TableCell></TableRow>
                ) : actuals?.map(a => {
                  const total = a.actualResourceCost + a.actualVendorCost + a.actualInvoiceCost;
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="pl-6">M{a.month} {a.year}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(total)}</TableCell>
                      <TableCell className="pl-6"><Badge variant="outline">{a.source}</Badge></TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Allocations List */}
        <Card className="flex flex-col h-[400px]">
          <CardHeader>
            <CardTitle>Resource Allocations</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-0">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="pl-6">Resource</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right pr-6">Alloc. %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingAlloc ? (
                  <TableRow><TableCell colSpan={3}><Skeleton className="h-8 w-full m-4" /></TableCell></TableRow>
                ) : allocations?.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center h-24 text-muted-foreground">No allocations.</TableCell></TableRow>
                ) : allocations?.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="pl-6 font-medium">{a.resourceName}</TableCell>
                    <TableCell>M{a.month} {a.year}</TableCell>
                    <TableCell className="text-right pr-6">{a.allocationPct}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Demands List */}
        <Card className="flex flex-col h-[400px]">
          <CardHeader>
            <CardTitle>Demand Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-0">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="pl-6">Role/Skill</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right pr-6">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingDemands ? (
                  <TableRow><TableCell colSpan={3}><Skeleton className="h-8 w-full m-4" /></TableCell></TableRow>
                ) : demands?.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center h-24 text-muted-foreground">No open demands.</TableCell></TableRow>
                ) : demands?.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="pl-6">
                      <div className="font-medium">{d.roleRequired}</div>
                      <div className="text-xs text-muted-foreground">{d.skillRequired}</div>
                    </TableCell>
                    <TableCell className="text-sm">{d.startMonth} to {d.endMonth}</TableCell>
                    <TableCell className="text-right pr-6"><Badge variant="outline">{d.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
