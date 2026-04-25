import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListFxRates,
  useUpsertFxRate,
  useDeleteFxRate,
  getListFxRatesQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminFxRates() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: rates, isLoading } = useListFxRates({ query: { queryKey: getListFxRatesQueryKey() } });
  const upsertMut = useUpsertFxRate();
  const deleteMut = useDeleteFxRate();

  const [open, setOpen] = useState(false);
  const [currency, setCurrency] = useState("");
  const [rate, setRate] = useState<string>("");

  const refresh = () => queryClient.invalidateQueries({ queryKey: getListFxRatesQueryKey() });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = parseFloat(rate);
    if (!Number.isFinite(r) || r <= 0) {
      toast({ title: "Invalid rate", variant: "destructive" });
      return;
    }
    try {
      await upsertMut.mutateAsync({ data: { currency: currency.toUpperCase(), rateToUsd: r } });
      await refresh();
      toast({ title: "FX rate saved" });
      setCurrency(""); setRate(""); setOpen(false);
    } catch (err: any) {
      toast({ title: "Failed", description: err?.message ?? "", variant: "destructive" });
    }
  };

  const remove = async (cur: string) => {
    if (!confirm(`Delete FX rate for ${cur}?`)) return;
    try {
      await deleteMut.mutateAsync({ currency: cur });
      await refresh();
      toast({ title: "Deleted" });
    } catch (err: any) {
      toast({ title: "Failed", description: err?.message ?? "", variant: "destructive" });
    }
  };

  return (
    <div className="p-6 h-full flex flex-col space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">FX Rates</h1>
          <p className="text-sm text-muted-foreground">Currency conversion rates to USD for reporting.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Upsert Rate</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Upsert FX Rate</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-1"><Label>Currency (3-letter code)</Label><Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} required maxLength={3} /></div>
              <div className="space-y-1"><Label>Rate to USD (1 unit = X USD)</Label><Input type="number" step="0.000001" value={rate} onChange={(e) => setRate(e.target.value)} required /></div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={upsertMut.isPending}>{upsertMut.isPending ? "Saving…" : "Save"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="border rounded-md flex-1 overflow-auto bg-card">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10">
            <TableRow>
              <TableHead>Currency</TableHead>
              <TableHead className="text-right">Rate to USD</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : (rates ?? []).length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No FX rates yet. USD defaults to 1.0.</TableCell></TableRow>
            ) : (
              rates!.map((r) => (
                <TableRow key={r.currency}>
                  <TableCell className="font-mono font-bold">{r.currency}</TableCell>
                  <TableCell className="text-right font-mono">{Number(r.rateToUsd).toFixed(6)}</TableCell>
                  <TableCell>{r.updatedAt ? new Date(r.updatedAt).toLocaleString() : ""}</TableCell>
                  <TableCell><Button variant="ghost" size="sm" onClick={() => remove(r.currency)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
