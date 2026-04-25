import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useListFunctions,
  getListUsersQueryKey,
  getListFunctionsQueryKey,
} from "@workspace/api-client-react";
import { ALL_ROLES } from "@/components/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: users, isLoading } = useListUsers({ query: { queryKey: getListUsersQueryKey() } });
  const { data: functions } = useListFunctions({ query: { queryKey: getListFunctionsQueryKey() } });
  const createMut = useCreateUser();
  const updateMut = useUpdateUser();
  const deleteMut = useDeleteUser();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>("Viewer");
  const [functionId, setFunctionId] = useState<string>("none");

  const refresh = () => queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMut.mutateAsync({
        data: {
          name,
          email,
          password,
          role: role as any,
          functionId: functionId === "none" ? null : Number(functionId),
        },
      });
      await refresh();
      toast({ title: "User created" });
      setName(""); setEmail(""); setPassword(""); setRole("Viewer"); setFunctionId("none"); setOpen(false);
    } catch (err: any) {
      toast({ title: "Failed", description: err?.message ?? "", variant: "destructive" });
    }
  };

  const changeRole = async (id: number, newRole: string) => {
    try {
      await updateMut.mutateAsync({ id, data: { role: newRole as any } });
      await refresh();
    } catch (err: any) {
      toast({ title: "Failed", description: err?.message ?? "", variant: "destructive" });
    }
  };

  const changeFunction = async (id: number, newFunctionId: string) => {
    try {
      await updateMut.mutateAsync({
        id,
        data: { functionId: newFunctionId === "none" ? null : Number(newFunctionId) },
      });
      await refresh();
    } catch (err: any) {
      toast({ title: "Failed", description: err?.message ?? "", variant: "destructive" });
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this user?")) return;
    try {
      await deleteMut.mutateAsync({ id });
      await refresh();
      toast({ title: "User deleted" });
    } catch (err: any) {
      toast({ title: "Failed", description: err?.message ?? "", variant: "destructive" });
    }
  };

  return (
    <div className="p-6 h-full flex flex-col space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Assign users to a Business Function to restrict their view to that function's data. Users with no function see everything.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New User</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create User</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-1"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
              <div className="space-y-1"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
              <div className="space-y-1"><Label>Password (min 8)</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} /></div>
              <div className="space-y-1">
                <Label>Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALL_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Business Function</Label>
                <Select value={functionId} onValueChange={setFunctionId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Global (all functions)</SelectItem>
                    {(functions ?? []).map((fn) => <SelectItem key={fn.id} value={String(fn.id)}>{fn.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Global users see all data. Function-scoped users see only their function.</p>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMut.isPending}>{createMut.isPending ? "Creating…" : "Create"}</Button>
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
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Function</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : (users ?? []).length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No users yet.</TableCell></TableRow>
            ) : (
              users!.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Select value={u.role} onValueChange={(v) => changeRole(u.id, v)}>
                      <SelectTrigger className="h-8 w-[180px]"><SelectValue><Badge variant="outline">{u.role}</Badge></SelectValue></SelectTrigger>
                      <SelectContent>
                        {ALL_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={u.functionId != null ? String(u.functionId) : "none"}
                      onValueChange={(v) => changeFunction(u.id, v)}
                    >
                      <SelectTrigger className="h-8 w-[160px]">
                        <SelectValue>
                          {u.functionId != null
                            ? <Badge className="bg-blue-100 text-blue-800 border-blue-200">{(u as any).functionName ?? `Fn #${u.functionId}`}</Badge>
                            : <span className="text-muted-foreground text-xs">Global</span>}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Global (all)</SelectItem>
                        {(functions ?? []).map((fn) => <SelectItem key={fn.id} value={String(fn.id)}>{fn.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => remove(u.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
