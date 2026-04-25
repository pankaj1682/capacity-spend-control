import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Search, MoreHorizontal, Edit, Trash2 } from "lucide-react";

import { 
  useListDemands, 
  useCreateDemand, 
  useUpdateDemand, 
  useDeleteDemand, 
  getListDemandsQueryKey,
  useListProjects
} from "@workspace/api-client-react";
import { CreateDemandBody, UpdateDemandBody } from "@workspace/api-zod";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleGate } from "@/components/role-gate";

export default function Demands() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDemand, setEditingDemand] = useState<number | null>(null);

  const { data: demands, isLoading } = useListDemands({}, { query: { queryKey: getListDemandsQueryKey({}) } });
  const { data: projects } = useListProjects({});

  const createMutation = useCreateDemand();
  const updateMutation = useUpdateDemand();
  const deleteMutation = useDeleteDemand();

  const filteredDemands = demands?.filter(d => 
    d.projectName.toLowerCase().includes(search.toLowerCase()) || 
    d.skillRequired.toLowerCase().includes(search.toLowerCase()) ||
    d.roleRequired.toLowerCase().includes(search.toLowerCase())
  );

  const form = useForm<z.infer<typeof CreateDemandBody>>({
    resolver: zodResolver(CreateDemandBody),
    defaultValues: {
      projectId: 0,
      skillRequired: "",
      roleRequired: "",
      startMonth: "",
      endMonth: "",
      requiredFte: 1,
      priority: "Medium",
      status: "Draft",
    }
  });

  const onSubmit = (data: z.infer<typeof CreateDemandBody>) => {
    if (editingDemand) {
      updateMutation.mutate({ id: editingDemand, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDemandsQueryKey({}) });
          setIsCreateOpen(false);
          setEditingDemand(null);
          form.reset();
          toast({ title: "Demand updated" });
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        }
      });
    } else {
      createMutation.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDemandsQueryKey({}) });
          setIsCreateOpen(false);
          form.reset();
          toast({ title: "Demand created" });
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        }
      });
    }
  };

  const handleEdit = (demand: any) => {
    form.reset({
      projectId: demand.projectId,
      skillRequired: demand.skillRequired,
      roleRequired: demand.roleRequired,
      startMonth: demand.startMonth,
      endMonth: demand.endMonth,
      requiredFte: demand.requiredFte,
      priority: demand.priority,
      status: demand.status,
    });
    setEditingDemand(demand.id);
    setIsCreateOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this demand?")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDemandsQueryKey({}) });
          toast({ title: "Demand deleted" });
        }
      });
    }
  };

  return (
    <div className="p-6 h-full flex flex-col space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Demand Pipeline</h1>
        <RoleGate roles={["Admin", "PMO Lead", "Project Manager", "Demand Owner"]}><Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            setEditingDemand(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Demand</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingDemand ? "Edit Demand" : "Create Demand"}</DialogTitle>
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
                  <FormField control={form.control} name="skillRequired" render={({ field }) => (
                    <FormItem><FormLabel>Skill Required</FormLabel><FormControl><Input placeholder="Java" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="roleRequired" render={({ field }) => (
                    <FormItem><FormLabel>Role Required</FormLabel><FormControl><Input placeholder="Senior Dev" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="startMonth" render={({ field }) => (
                    <FormItem><FormLabel>Start Month (YYYY-MM)</FormLabel><FormControl><Input placeholder="2024-01" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="endMonth" render={({ field }) => (
                    <FormItem><FormLabel>End Month (YYYY-MM)</FormLabel><FormControl><Input placeholder="2024-12" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="requiredFte" render={({ field }) => (
                    <FormItem><FormLabel>Required FTE</FormLabel><FormControl><Input type="number" step="0.1" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="priority" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Draft">Draft</SelectItem>
                          <SelectItem value="Submitted">Submitted</SelectItem>
                          <SelectItem value="Approved">Approved</SelectItem>
                          <SelectItem value="Fulfilled">Fulfilled</SelectItem>
                          <SelectItem value="Rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
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
            placeholder="Search demands..." 
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
              <TableHead>Skill</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead className="text-right">Req. FTE</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                  <TableCell></TableCell>
                </TableRow>
              ))
            ) : filteredDemands?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                  No demands found.
                </TableCell>
              </TableRow>
            ) : (
              filteredDemands?.map(demand => (
                <TableRow key={demand.id} className="hover:bg-muted/30">
                  <TableCell className="font-semibold">{demand.projectName}</TableCell>
                  <TableCell>{demand.skillRequired}</TableCell>
                  <TableCell>{demand.roleRequired}</TableCell>
                  <TableCell>{demand.startMonth}</TableCell>
                  <TableCell>{demand.endMonth}</TableCell>
                  <TableCell className="text-right">{demand.requiredFte}</TableCell>
                  <TableCell>
                    <Badge variant={demand.priority === 'Critical' ? 'destructive' : demand.priority === 'High' ? 'default' : 'secondary'}>
                      {demand.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{demand.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(demand)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(demand.id)}>
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
