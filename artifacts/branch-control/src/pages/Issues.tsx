import { useListIssues, useResolveIssue, getListIssuesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { GHS } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, ShieldAlert, CheckSquare, Square } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Issues() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: issues, isLoading } = useListIssues({ query: { queryKey: getListIssuesQueryKey() } });
  const resolve = useResolveIssue();

  function handleResolve(id: number) {
    resolve.mutate({ id }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListIssuesQueryKey() });
        toast({ title: "Mismatch resolved", description: "Stock mismatch ticked off and marked as resolved." });
      }
    });
  }

  const active = issues?.filter(i => !i.resolved) ?? [];
  const resolved = issues?.filter(i => i.resolved) ?? [];
  const totalRisk = active.reduce((s, i) => s + i.valueAtRisk, 0);

  const SEV = {
    high: { bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-900", text: "text-red-700", badge: "bg-red-100 text-red-700", icon: ShieldAlert },
    medium: { bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-900", text: "text-amber-700", badge: "bg-amber-100 text-amber-700", icon: AlertTriangle },
    low: { bg: "bg-muted/50", border: "border-border", text: "text-foreground", badge: "bg-muted text-muted-foreground", icon: AlertTriangle },
  } as const;

  return (
    <div className="p-6 space-y-6 max-w-4xl" data-testid="page-issues">
      <div>
        <h1 className="text-2xl font-black text-foreground">Stock Mismatches</h1>
        <p className="text-sm text-muted-foreground">Discrepancies between physical counts and system records. Tick a box to resolve.</p>
      </div>

      {/* Summary */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Active Issues</p>
          <p className="mt-2 text-3xl font-black text-red-600" data-testid="count-active-issues">{active.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">At Risk Value</p>
          <p className="mt-2 text-3xl font-black text-amber-600" data-testid="value-at-risk">{GHS(totalRisk)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Resolved</p>
          <p className="mt-2 text-3xl font-black text-emerald-600" data-testid="count-resolved-issues">{resolved.length}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
        </div>
      ) : active.length === 0 && resolved.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">No stock mismatches found.</p>
        </div>
      ) : null}

      {/* Active issues */}
      {active.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-black text-foreground">Active Mismatches</h3>
          {active.map(issue => {
            const sev = SEV[issue.severity as keyof typeof SEV] ?? SEV.low;
            const Icon = sev.icon;
            return (
              <div
                key={issue.id}
                data-testid={`card-issue-${issue.id}`}
                className={`rounded-2xl border p-5 ${sev.bg} ${sev.border}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Checkbox */}
                    <button
                      data-testid={`button-resolve-${issue.id}`}
                      onClick={() => handleResolve(issue.id)}
                      disabled={resolve.isPending}
                      className="mt-0.5 shrink-0 text-muted-foreground hover:text-emerald-600 transition-colors disabled:opacity-50"
                      title="Tick to resolve"
                    >
                      <Square className="h-6 w-6" />
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <Icon className={`h-4 w-4 ${sev.text}`} />
                        <span className={`font-black text-sm ${sev.text}`}>{issue.productCode} · {issue.location}</span>
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${sev.badge}`}>{issue.severity.toUpperCase()}</span>
                      </div>
                      <div className="flex gap-4 text-xs font-bold flex-wrap">
                        <span className="text-foreground/70">System: <strong className="text-foreground">{issue.systemQty}</strong></span>
                        <span className="text-foreground/70">Physical: <strong className="text-foreground">{issue.reportedQty}</strong></span>
                        <span className="text-red-600">Diff: <strong>{issue.diff}</strong> units</span>
                        <span className="text-foreground/70">At risk: <strong>{GHS(issue.valueAtRisk)}</strong></span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground shrink-0 hidden sm:block">Click box to resolve</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resolved issues */}
      {resolved.length > 0 && (
        <div>
          <h3 className="font-black text-muted-foreground mb-3">Resolved</h3>
          <div className="space-y-2">
            {resolved.map(issue => (
              <div key={issue.id} className="rounded-xl border border-border bg-muted/30 px-5 py-3 flex items-center gap-3 opacity-50" data-testid={`card-resolved-${issue.id}`}>
                <CheckSquare className="h-5 w-5 text-emerald-500 shrink-0" />
                <span className="text-sm font-bold text-foreground">{issue.productCode} · {issue.location}</span>
                <span className="text-xs font-bold text-emerald-600 ml-auto">Resolved</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {active.length === 0 && resolved.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 p-8 text-center">
          <CheckSquare className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
          <p className="font-black text-emerald-800 dark:text-emerald-300 text-xl">All mismatches resolved!</p>
          <p className="text-sm text-emerald-600 mt-1">Great job keeping the inventory accurate.</p>
        </div>
      )}
    </div>
  );
}
