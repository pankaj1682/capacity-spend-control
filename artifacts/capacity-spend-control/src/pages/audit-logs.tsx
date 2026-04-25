import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronRight } from "lucide-react";

interface AuditLogEntry {
  id: number;
  userId: number | null;
  userEmail: string;
  userName: string;
  action: string;
  entity: string;
  entityId: number | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  createdAt: string;
}

interface Filters {
  entity: string;
  action: string;
  from: string;
  to: string;
}

const ENTITIES = ["project", "budget", "actual", "resource", "demand", "allocation"];
const ACTIONS = ["CREATE", "UPDATE", "DELETE"];

function actionBadgeVariant(action: string) {
  if (action === "CREATE") return "default";
  if (action === "UPDATE") return "secondary";
  return "destructive";
}

function DiffTable({ oldValues, newValues }: { oldValues: Record<string, unknown> | null; newValues: Record<string, unknown> | null }) {
  const allKeys = Array.from(new Set([...Object.keys(oldValues ?? {}), ...Object.keys(newValues ?? {})])).filter((k) => k !== "id");
  if (allKeys.length === 0) return <div className="text-sm text-muted-foreground px-2 py-1">No details</div>;

  const changedKeys = oldValues && newValues
    ? allKeys.filter((k) => JSON.stringify(oldValues[k]) !== JSON.stringify(newValues[k]))
    : allKeys;

  const keysToShow = changedKeys.length > 0 ? changedKeys : allKeys.slice(0, 8);

  return (
    <table className="text-xs w-full">
      <thead>
        <tr className="text-muted-foreground">
          <th className="text-left py-1 pr-3 font-medium w-32">Field</th>
          {oldValues && <th className="text-left py-1 pr-3 font-medium">Before</th>}
          {newValues && <th className="text-left py-1 font-medium">After</th>}
        </tr>
      </thead>
      <tbody>
        {keysToShow.map((k) => (
          <tr key={k} className="border-t border-border/40">
            <td className="py-1 pr-3 text-muted-foreground font-mono">{k}</td>
            {oldValues && (
              <td className="py-1 pr-3 font-mono text-red-600 dark:text-red-400 max-w-xs truncate">
                {oldValues[k] != null ? String(oldValues[k]) : <span className="text-muted-foreground">—</span>}
              </td>
            )}
            {newValues && (
              <td className="py-1 font-mono text-emerald-700 dark:text-emerald-400 max-w-xs truncate">
                {newValues[k] != null ? String(newValues[k]) : <span className="text-muted-foreground">—</span>}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AuditRow({ entry }: { entry: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = entry.oldValues || entry.newValues;

  return (
    <>
      <TableRow className="group">
        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
          {new Date(entry.createdAt).toLocaleString()}
        </TableCell>
        <TableCell>
          <div className="text-sm font-medium">{entry.userName}</div>
          <div className="text-xs text-muted-foreground">{entry.userEmail}</div>
        </TableCell>
        <TableCell>
          <Badge variant={actionBadgeVariant(entry.action) as "default" | "secondary" | "destructive"}>
            {entry.action}
          </Badge>
        </TableCell>
        <TableCell>
          <span className="capitalize text-sm">{entry.entity}</span>
          {entry.entityId != null && (
            <span className="ml-1 text-xs text-muted-foreground">#{entry.entityId}</span>
          )}
        </TableCell>
        <TableCell>
          {hasDetails ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
              {expanded ? "Hide" : "Show"}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </TableCell>
      </TableRow>
      {expanded && hasDetails && (
        <TableRow className="bg-muted/30">
          <TableCell colSpan={5} className="py-3 px-4">
            <DiffTable oldValues={entry.oldValues} newValues={entry.newValues} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function AuditLogsPage() {
  const [filters, setFilters] = useState<Filters>({ entity: "", action: "", from: "", to: "" });
  const [applied, setApplied] = useState<Filters>(filters);

  const queryKey = ["audit-logs", applied];
  const { data, isLoading } = useQuery<AuditLogEntry[]>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (applied.entity) params.set("entity", applied.entity);
      if (applied.action) params.set("action", applied.action);
      if (applied.from) params.set("from", new Date(applied.from).toISOString());
      if (applied.to) params.set("to", new Date(applied.to + "T23:59:59").toISOString());
      params.set("limit", "300");
      const resp = await fetch(`/api/audit-logs?${params.toString()}`, { credentials: "include" });
      if (!resp.ok) throw new Error("Failed to load audit logs");
      return resp.json() as Promise<AuditLogEntry[]>;
    },
  });

  const handleApply = () => setApplied({ ...filters });
  const handleReset = () => {
    const empty: Filters = { entity: "", action: "", from: "", to: "" };
    setFilters(empty);
    setApplied(empty);
  };

  return (
    <div className="p-6 h-full flex flex-col space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Entity</label>
              <Select value={filters.entity || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, entity: v === "all" ? "" : v }))}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="All entities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All entities</SelectItem>
                  {ENTITIES.map((e) => (
                    <SelectItem key={e} value={e} className="capitalize">{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Action</label>
              <Select value={filters.action || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, action: v === "all" ? "" : v }))}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  {ACTIONS.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">From</label>
              <Input
                type="date"
                className="h-8 text-sm"
                value={filters.from}
                onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">To</label>
              <Input
                type="date"
                className="h-8 text-sm"
                value={filters.to}
                onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Button size="sm" onClick={handleApply}>Apply filters</Button>
            <Button size="sm" variant="outline" onClick={handleReset}>Reset</Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex-1 overflow-auto rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40">Date / Time</TableHead>
              <TableHead>User</TableHead>
              <TableHead className="w-28">Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead className="w-24">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : data && data.length > 0 ? (
              data.map((entry) => <AuditRow key={entry.id} entry={entry} />)
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                  No audit log entries found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {data && (
        <div className="text-xs text-muted-foreground text-right">
          Showing {data.length} {data.length === 300 ? "(limit 300 — narrow date range to see more)" : "entries"}
        </div>
      )}
    </div>
  );
}
