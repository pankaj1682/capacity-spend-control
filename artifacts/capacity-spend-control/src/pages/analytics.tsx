import { useFy } from "@/components/fy-context";
import { 
  useGetUtilization, 
  useGetOverallocated, 
  useGetDemandVsCapacity, 
  useGetOpexCapex, 
  useGetMultiYearBudget, 
  useGetSkillShortage, 
  useGetBurnRate,
  getGetUtilizationQueryKey,
  getGetOverallocatedQueryKey,
  getGetDemandVsCapacityQueryKey,
  getGetOpexCapexQueryKey,
  getGetMultiYearBudgetQueryKey,
  getGetSkillShortageQueryKey,
  getGetBurnRateQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Area } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const AreaChart = ({ children, data }: any) => {
  return (
    <ComposedChart data={data}>
      {children}
    </ComposedChart>
  )
}

export default function Analytics() {
  const { fy } = useFy();

  const { data: demandVsCapacity, isLoading: loadingDvc } = useGetDemandVsCapacity({ fy }, { query: { queryKey: getGetDemandVsCapacityQueryKey({ fy }) } });
  const { data: multiYear, isLoading: loadingMy } = useGetMultiYearBudget({ query: { queryKey: getGetMultiYearBudgetQueryKey() } });
  const { data: opexCapex, isLoading: loadingOc } = useGetOpexCapex({ fy }, { query: { queryKey: getGetOpexCapexQueryKey({ fy }) } });
  const { data: utilization, isLoading: loadingUtil } = useGetUtilization({ fy }, { query: { queryKey: getGetUtilizationQueryKey({ fy }) } });
  const { data: overallocated, isLoading: loadingOver } = useGetOverallocated({ query: { queryKey: getGetOverallocatedQueryKey() } });
  const { data: skillShortage, isLoading: loadingShort } = useGetSkillShortage({ fy }, { query: { queryKey: getGetSkillShortageQueryKey({ fy }) } });
  const { data: burnRate, isLoading: loadingBurn } = useGetBurnRate({ query: { queryKey: getGetBurnRateQueryKey() } });

  return (
    <div className="p-6 h-full flex flex-col space-y-6 overflow-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Deep Analytics</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        
        {/* Demand vs Capacity (BarChart) */}
        <Card className="col-span-1 lg:col-span-2 xl:col-span-1">
          <CardHeader>
            <CardTitle>Demand vs Capacity by Skill</CardTitle>
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
                  <Bar dataKey="capacityFte" name="Capacity" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="demandFte" name="Demand" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </CardContent>
        </Card>

        {/* Multi-Year Budget */}
        <Card className="col-span-1 xl:col-span-1">
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

        {/* Opex vs Capex */}
        <Card className="col-span-1 xl:col-span-1">
          <CardHeader>
            <CardTitle>Opex vs Capex ({year})</CardTitle>
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

        {/* Utilization Table */}
        <Card className="col-span-1 lg:col-span-2 xl:col-span-2">
          <CardHeader>
            <CardTitle>Resource Utilization ({year})</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingUtil ? <Skeleton className="h-[200px] w-full" /> : utilization && utilization.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Resource</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Allocated %</TableHead>
                      <TableHead className="text-right">Capacity %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {utilization.map((u, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{u.resourceName}</TableCell>
                        <TableCell>Month {u.month}</TableCell>
                        <TableCell className="text-right">{u.allocationPct}%</TableCell>
                        <TableCell className="text-right">{u.capacityPct}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : <div className="text-muted-foreground p-4 text-center">No utilization data</div>}
          </CardContent>
        </Card>

        {/* Overallocated Resources Table */}
        <Card className="col-span-1 xl:col-span-1">
          <CardHeader>
            <CardTitle className="text-destructive">Overallocated Resources</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingOver ? <Skeleton className="h-[200px] w-full" /> : overallocated && overallocated.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Resource</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Over By %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overallocated.map((o, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{o.resourceName}</TableCell>
                        <TableCell>{o.year}-M{o.month}</TableCell>
                        <TableCell className="text-right text-destructive font-bold">+{o.overBy}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : <div className="text-muted-foreground p-4 text-center">No overallocated resources</div>}
          </CardContent>
        </Card>

        {/* Skill Shortage Table */}
        <Card className="col-span-1 xl:col-span-1">
          <CardHeader>
            <CardTitle>Skill Shortages</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingShort ? <Skeleton className="h-[200px] w-full" /> : skillShortage && skillShortage.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Skill</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Shortage (FTE)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {skillShortage.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{s.skill}</TableCell>
                        <TableCell>Month {s.month}</TableCell>
                        <TableCell className="text-right text-destructive font-bold">{s.shortageFte}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : <div className="text-muted-foreground p-4 text-center">No projected skill shortages</div>}
          </CardContent>
        </Card>

        {/* Burn Rate Table */}
        <Card className="col-span-1 lg:col-span-2 xl:col-span-2">
          <CardHeader>
            <CardTitle>Project Burn Rate</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingBurn ? <Skeleton className="h-[200px] w-full" /> : burnRate && burnRate.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead className="text-right">Approved</TableHead>
                      <TableHead className="text-right">Actual to Date</TableHead>
                      <TableHead className="text-right">Burn %</TableHead>
                      <TableHead className="text-right">Elapsed Months</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {burnRate.map((b, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{b.projectName}</TableCell>
                        <TableCell className="text-right">{formatCurrency(b.approvedBudget)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(b.actualToDate)}</TableCell>
                        <TableCell className="text-right">
                          <span className={b.burnPct > 100 ? "text-destructive font-bold" : ""}>
                            {b.burnPct.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{b.monthsElapsed}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : <div className="text-muted-foreground p-4 text-center">No burn rate data available</div>}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
