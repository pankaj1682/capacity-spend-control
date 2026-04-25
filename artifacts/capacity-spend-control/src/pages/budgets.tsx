import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Search, MoreHorizontal, Edit, Trash2 } from "lucide-react";

import { 
  useListBudgets, 
  useCreateBudget, 
  useUpdateBudget, 
  useDeleteBudget, 
  getListBudgetsQueryKey,
  useListProjects
} from "@workspace/api-client-react";
import { CreateBudgetBody } from "@workspace/api-zod";

import { useFy } from "@/components/fy-context";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleGate } from "@/components/role-gate";
import { ImportDialog } from "@/components/import-dialog";

export default function Budgets() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { fy } = useFy();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<number | null>(null);

  const { data: budgets, isLoading } = useListBudgets(
    { fy }, 
    { query: { queryKey: getListBudgetsQueryKey({ fy }) } }
  );
  const { data: projects } = useListProjects({});

  const createMutation = useCreateBudget();
  const updateMutation = useUpdateBudget();
  const deleteMutation = useDeleteBudget();

  const filteredBudgets = budgets?.filter(b => 
    b.projectName.toLowerCase().includes(search.toLowerCase())
  );

  const form = useForm<z.infer<typeof CreateBudgetBody>>({
    resolver: zodResolver(CreateBudgetBody),
    defaultValues: {
      projectId: 0,
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      costType: "Opex",
      approvedBudget: 0,
      forecastBudget: 0,
      plannedResourceCost: 0,
      nonResourceCost: 0,
    }
  });

  const onSubmit = (data: z.infer<typeof CreateBudgetBody>) => {
    if (editingBudget) {
      updateMutation.mutate({ id: editingBudget, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListBudgetsQueryKey({ fy }) });
          setIsCreateOpen(false);
          setEditingBudget(null);
          form.reset();
          toast({ title: "Budget updated" });
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        }
      });
    } else {
      createMutation.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListBudgetsQueryKey({ fy }) });
          setIsCreateOpen(false);
          form.reset();
          toast({ title: "Budget created" });
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        }
      });
    }
  };

  const handleEdit = (budget: any) => {
    form.reset({
      projectId: budget.projectId,
      year: budget.year,
      month: budget.month,
      costType: budget.costType,
      approvedBudget: budget.approvedBudget,
      forecastBudget: budget.forecastBudget,
      plannedResourceCost: budget.plannedResourceCost,
      nonResourceCost: budget.nonResourceCost,
    });
    setEditingBudget(budget.id);
    setIsCreateOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this budget plan?")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListBudgetsQueryKey({ fy }) });
          toast({ title: "Budget plan deleted" });
        }
      });
    }
  };

  return (
    <div className="p-6 h-full flex flex-col space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Budget Planning</h1>
        <div className="flex items-center gap-2"><ImportDialog title="Import Budgets CSV" description="Upload SAP CSV with budget plans. Existing rows are upserted by project + period + cost type." endpoint="/api/imports/budgets" templateColumns={["projectCode", "year", "month", "costType", "approvedBudget", "forecastBudget", "plannedResourceCost", "nonResourceCost"]} invalidateKeys={[getListBudgetsQueryKey({ fy }), getListBudgetsQueryKey({})]} /><RoleGate roles={["Admin", "Finance Controller", "PMO Lead", "Project Manager"]}><Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            setEditingBudget(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Budget Plan</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingBudget ? "Edit Budget Plan" : "Create Budget Plan"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="projectId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project</FormLabel>
                      <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value ? field.value.toString() : ""}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {projects?.map(p => (
                            <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="year" render={({ field }) => (
                    <FormItem><FormLabel>Year</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="month" render={({ field }) => (
                    <FormItem><FormLabel>Month (1-12)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="costType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Opex">Opex</SelectItem>
                          <SelectItem value="Capex">Capex</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="approvedBudget" render={({ field }) => (
                    <FormItem><FormLabel>Approved Budget</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="forecastBudget" render={({ field }) => (
                    <FormItem><FormLabel>Forecast Budget</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="plannedResourceCost" render={({ field }) => (
                    <FormItem><FormLabel>Planned Resource Cost</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="nonResourceCost" render={({ field }) => (
                    <FormItem><FormLabel>Non-Resource Cost</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog></RoleGate></div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search budgets..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="pl-8 w-[300px]" 
          />
        </div>
      </div>

      <div className="border rounded-md flex-1 overflow-auto bg-card">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10">
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Approved</TableHead>
              <TableHead className="text-right">Forecast</TableHead>
              <TableHead className="text-right">Resource Cost</TableHead>
              <TableHead className="text-right">Non-Resource</TableHead>
              <TableHead className="text-right font-bold">Remaining</TableHead>
              <TableHead className="text-right font-bold">Variance</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell></TableCell>
                </TableRow>
              ))
            ) : filteredBudgets?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                  No budget plans found.
                </TableCell>
              </TableRow>
            ) : (
              filteredBudgets?.map(budget => {
                const remaining = budget.approvedBudget - (budget.plannedResourceCost + budget.nonResourceCost);
                const variance = budget.forecastBudget - budget.approvedBudget;
                return (
                  <TableRow key={budget.id} className="hover:bg-muted/30">
                    <TableCell className="font-semibold">{budget.projectName}</TableCell>
                    <TableCell>M{budget.month} {budget.year}</TableCell>
                    <TableCell><Badge variant="outline">{budget.costType}</Badge></TableCell>
                    <TableCell className="text-right">{formatCurrency(budget.approvedBudget)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(budget.forecastBudget)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(budget.plannedResourceCost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(budget.nonResourceCost)}</TableCell>
                    <TableCell className={`text-right font-bold ${remaining < 0 ? 'text-destructive' : 'text-primary'}`}>
                      {formatCurrency(remaining)}
                    </TableCell>
                    <TableCell className={`text-right font-bold ${variance > 0 ? 'text-destructive' : ''}`}>
                      {formatCurrency(variance)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(budget)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(budget.id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
