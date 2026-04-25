import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListFunctions,
  useCreateFunction,
  useUpdateFunction,
  useDeleteFunction,
  getListFunctionsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export default function AdminFunctions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: functions, isLoading } = useListFunctions({ query: { queryKey: getListFunctionsQueryKey() } });
  const createMut = useCreateFunction();
  const updateMut = useUpdateFunction();
  const deleteMut = useDeleteFunction();

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const refresh = () => queryClient.invalidateQueries({ queryKey: getListFunctionsQueryKey() });

  const openCreate = () => { setEditId(null); setName(""); setSlug(""); setOpen(true); };
  const openEdit = (fn: { id: number; name: string; slug: string }) => {
    setEditId(fn.id); setName(fn.name); setSlug(fn.slug); setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId !== null) {
        await updateMut.mutateAsync({ id: editId, data: { name, slug } });
        toast({ title: "Function updated" });
      } else {
        await createMut.mutateAsync({ data: { name, slug } });
        toast({ title: "Function created" });
      }
      await refresh();
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Failed", description: err?.message ?? "", variant: "destructive" });
    }
  };

  const remove = async (id: number, fname: string) => {
    if (!confirm(`Delete "${fname}"? This will remove the function assignment from all projects, resources, and users.`)) return;
    try {
      await deleteMut.mutateAsync({ id });
      await refresh();
      toast({ title: "Function deleted" });
    } catch (err: any) {
      toast({ title: "Failed", description: err?.message ?? "", variant: "destructive" });
    }
  };

  return (
    <div className="p-6 h-full flex flex-col space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Business Functions</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Define the organizational functions that own projects and resources. Users, projects, and resources can be scoped to a function for filtered visibility.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> New Function</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId !== null ? "Edit Function" : "Create Function"}</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => { setName(e.target.value); if (!editId) setSlug(slugify(e.target.value)); }}
                  placeholder="e.g. Marketing"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Slug</Label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. marketing"
                  required
                />
                <p className="text-xs text-muted-foreground">Lowercase, hyphens only. Auto-generated from name.</p>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                  {createMut.isPending || updateMut.isPending ? "Saving…" : editId !== null ? "Save" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="border rounded-md flex-1 overflow-auto bg-card">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : (functions ?? []).length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No functions yet.</TableCell></TableRow>
            ) : (
              (functions ?? []).map((fn) => (
                <TableRow key={fn.id}>
                  <TableCell className="font-medium">{fn.name}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm">{fn.slug}</TableCell>
                  <TableCell className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(fn)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(fn.id, fn.name)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
