import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Search, MoreHorizontal, Edit, Trash2 } from "lucide-react";

import { 
  useListAllocations, 
  useCreateAllocation, 
  useUpdateAllocation, 
  useDeleteAllocation, 
  getListAllocationsQueryKey,
  useListProjects,
  useListResources
} from "@workspace/api-client-react";
import { CreateAllocationBody } from "@workspace/api-zod";

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

export default function Allocations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { fy } = useFy();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<number | null>(null);

  const { data: allocations, isLoading } = useListAllocations(
    { fy }, 
    { query: { queryKey: getListAllocationsQueryKey({ fy }) } }
  );
  const { data: projects } = useListProjects({});
  const { data: resources } = useListResources({});

  const createMutation = useCreateAllocation();
  const updateMutation = useUpdateAllocation();
  const deleteMutation = useDeleteAllocation();

  const filteredAllocations = allocations?.filter(a => 
    a.projectName.toLowerCase().includes(search.toLowerCase()) || 
    a.resourceName.toLowerCase().includes(search.toLowerCase())
  );

  const form = useForm<z.infer<typeof CreateAllocationBody>>({
    resolver: zodResolver(CreateAllocationBody),
    defaultValues: {
      projectId: 0,
      resourceId: 0,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      plannedDays: 0,
      allocationPct: 100,
      rate: 0,
      opexPct: 0,
      capexPct: 100,
      wbsCode: "",
    }
  });

  const onSubmit = (data: z.infer<typeof CreateAllocationBody>) => {
    if (editingAllocation) {
      updateMutation.mutate({ id: editingAllocation, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAllocationsQueryKey({ fy }) });
          setIsCreateOpen(false);
          setEditingAllocation(null);
          form.reset();
          toast({ title: "Allocation updated" });
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        }
      });
    } else {
      createMutation.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAllocationsQueryKey({ fy }) });
          setIsCreateOpen(false);
          form.reset();
          toast({ title: "Allocation created" });
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        }
      });
    }
  };

  const handleEdit = (allocation: any) => {
    form.reset({
      projectId: allocation.projectId,
      resourceId: allocation.resourceId,
      month: allocation.month,
      year: allocation.year,
      plannedDays: allocation.plannedDays,
      allocationPct: allocation.allocationPct,
      rate: allocation.rate,
      opexPct: allocation.opexPct,
      capexPct: allocation.capexPct,
      wbsCode: allocation.wbsCode || "",
    });
    setEditingAllocation(allocation.id);
    setIsCreateOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this allocation?")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAllocationsQueryKey({ fy }) });
          toast({ title: "Allocation deleted" });
        }
      });
    }
  };

  return (
    <div className="p-6 h-full flex flex-col space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Allocations</h1>
        <RoleGate roles={["Admin", "Resource Manager", "PMO Lead"]}><Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            setEditingAllocation(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Allocation</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingAllocation ? "Edit Allocation" : "Create Allocation"}</DialogTitle>
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
                  <FormField control={form.control} name="resourceId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Resource</FormLabel>
                      <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value ? field.value.toString() : ""}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select resource" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {resources?.map(r => (
                            <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="month" render={({ field }) => (
                    <FormItem><FormLabel>Month (1-12)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="year" render={({ field }) => (
                    <FormItem><FormLabel>Year</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="plannedDays" render={({ field }) => (
                    <FormItem><FormLabel>Planned Days</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="allocationPct" render={({ field }) => (
                    <FormItem><FormLabel>Allocation %</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="rate" render={({ field }) => (
                    <FormItem><FormLabel>Rate</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="wbsCode" render={({ field }) => (
                    <FormItem><FormLabel>WBS Code</FormLabel><FormControl><Input placeholder="WBS-123" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="opexPct" render={({ field }) => (
                    <FormItem><FormLabel>Opex %</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="capexPct" render={({ field }) => (
                    <FormItem><FormLabel>Capex %</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
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
        </Dialog></RoleGate>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search allocations..." 
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
              <TableHead>Resource</TableHead>
              <TableHead>Month/Year</TableHead>
              <TableHead className="text-right">Planned Days</TableHead>
              <TableHead className="text-right">Alloc. %</TableHead>
              <TableHead className="text-right">Planned Cost</TableHead>
              <TableHead>Opex/Capex %</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell></TableCell>
                </TableRow>
              ))
            ) : filteredAllocations?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  No allocations found.
                </TableCell>
              </TableRow>
            ) : (
              filteredAllocations?.map(alloc => (
                <TableRow key={alloc.id} className="hover:bg-muted/30">
                  <TableCell className="font-semibold">{alloc.projectName}</TableCell>
                  <TableCell>{alloc.resourceName}</TableCell>
                  <TableCell>{alloc.month}/{alloc.year}</TableCell>
                  <TableCell className="text-right">{alloc.plannedDays}</TableCell>
                  <TableCell className="text-right">{alloc.allocationPct}%</TableCell>
                  <TableCell className="text-right">{formatCurrency(alloc.plannedCost)}</TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">{alloc.opexPct}% / {alloc.capexPct}%</span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(alloc)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(alloc.id)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
