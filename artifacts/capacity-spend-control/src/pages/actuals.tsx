import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Search, MoreHorizontal, Edit, Trash2 } from "lucide-react";

import { 
  useListActuals, 
  useCreateActual, 
  useUpdateActual, 
  useDeleteActual, 
  getListActualsQueryKey,
  useListProjects
} from "@workspace/api-client-react";
import { CreateActualBody } from "@workspace/api-zod";

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

export default function Actuals() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { fy } = useFy();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingActual, setEditingActual] = useState<number | null>(null);

  const { data: actuals, isLoading } = useListActuals(
    { fy }, 
    { query: { queryKey: getListActualsQueryKey({ fy }) } }
  );
  const { data: projects } = useListProjects({});

  const createMutation = useCreateActual();
  const updateMutation = useUpdateActual();
  const deleteMutation = useDeleteActual();

  const filteredActuals = actuals?.filter(a => 
    a.projectName.toLowerCase().includes(search.toLowerCase())
  );

  const form = useForm<z.infer<typeof CreateActualBody>>({
    resolver: zodResolver(CreateActualBody),
    defaultValues: {
      projectId: 0,
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      actualResourceCost: 0,
      actualVendorCost: 0,
      actualInvoiceCost: 0,
      source: "Manual",
    }
  });

  const onSubmit = (data: z.infer<typeof CreateActualBody>) => {
    if (editingActual) {
      updateMutation.mutate({ id: editingActual, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListActualsQueryKey({ fy }) });
          setIsCreateOpen(false);
          setEditingActual(null);
          form.reset();
          toast({ title: "Actual updated" });
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        }
      });
    } else {
      createMutation.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListActualsQueryKey({ fy }) });
          setIsCreateOpen(false);
          form.reset();
          toast({ title: "Actual logged" });
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        }
      });
    }
  };

  const handleEdit = (actual: any) => {
    form.reset({
      projectId: actual.projectId,
      year: actual.year,
      month: actual.month,
      actualResourceCost: actual.actualResourceCost,
      actualVendorCost: actual.actualVendorCost,
      actualInvoiceCost: actual.actualInvoiceCost,
      source: actual.source,
    });
    setEditingActual(actual.id);
    setIsCreateOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this actual record?")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListActualsQueryKey({ fy }) });
          toast({ title: "Actual deleted" });
        }
      });
    }
  };

  return (
    <div className="p-6 h-full flex flex-col space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Actuals Tracking</h1>
        <div className="flex items-center gap-2"><ImportDialog title="Import Actuals CSV" description="Upload SAP CSV with actuals. Existing rows are upserted by project + period." endpoint="/api/imports/actuals" templateColumns={["projectCode", "year", "month", "actualResourceCost", "actualVendorCost", "actualInvoiceCost", "source"]} invalidateKeys={[getListActualsQueryKey({ fy }), getListActualsQueryKey({})]} /><RoleGate roles={["Admin", "Finance Controller", "PMO Lead"]}><Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            setEditingActual(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Log Actuals</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingActual ? "Edit Actuals" : "Log Actuals"}</DialogTitle>
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
                  <FormField control={form.control} name="source" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Manual">Manual</SelectItem>
                          <SelectItem value="ExcelUpload">Excel Upload</SelectItem>
                          <SelectItem value="SAP">SAP</SelectItem>
                          <SelectItem value="Timesheet">Timesheet</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="actualResourceCost" render={({ field }) => (
                    <FormItem><FormLabel>Resource Cost</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="actualVendorCost" render={({ field }) => (
                    <FormItem><FormLabel>Vendor Cost</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="actualInvoiceCost" render={({ field }) => (
                    <FormItem><FormLabel>Invoice Cost</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
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
            placeholder="Search actuals..." 
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
              <TableHead className="text-right">Resource Cost</TableHead>
              <TableHead className="text-right">Vendor Cost</TableHead>
              <TableHead className="text-right">Invoice Cost</TableHead>
              <TableHead className="text-right font-bold">Total</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                  <TableCell></TableCell>
                </TableRow>
              ))
            ) : filteredActuals?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  No actuals found.
                </TableCell>
              </TableRow>
            ) : (
              filteredActuals?.map(actual => {
                const total = actual.actualResourceCost + actual.actualVendorCost + actual.actualInvoiceCost;
                return (
                  <TableRow key={actual.id} className="hover:bg-muted/30">
                    <TableCell className="font-semibold">{actual.projectName}</TableCell>
                    <TableCell>M{actual.month} {actual.year}</TableCell>
                    <TableCell className="text-right">{formatCurrency(actual.actualResourceCost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(actual.actualVendorCost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(actual.actualInvoiceCost)}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(total)}</TableCell>
                    <TableCell><Badge variant="outline">{actual.source}</Badge></TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(actual)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(actual.id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
