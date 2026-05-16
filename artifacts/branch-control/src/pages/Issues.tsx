import { useListIssues, useResolveIssue, getListIssuesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { GHS } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, AlertTriangle, ShieldAlert } from "lucide-react";
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
        toast({ title: "Issue resolved", description: "Stock mismatch marked as resolved." });
      }
    });
  }

  const active = issues?.filter(i => !i.resolved) ?? [];
  const resolved = issues?.filter(i => i.resolved) ?? [];
  const totalRisk = active.reduce((s, i) => s + i.valueAtRisk, 0);

  const SEV = {
    high: { bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-900", text: "text-red-700 dark:text-red-300", badge: "bg-red-100 text-red-700", icon: ShieldAlert },
    medium: { bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-900", text: "text-amber-700 dark:text-amber-300", badge: "bg-amber-100 text-amber-700", icon: AlertTriangle },
    low: { bg: "bg-muted/50", border: "border-border", text: "text-foreground", badge: "bg-muted text-muted-foreground", icon: AlertTriangle },
  } as const;

  return (
    <div className="p-6 space-y-6 max-w-4xl" data-testid="page-issues">
      <div>
        <h1 className="text-2xl font-black text-foreground">Stock Mismatches</h1>
        <p className="text-sm text-muted-foreground">Discrepancies between physical counts and system records</p>
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
      ) : active.length === 0 ? (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 p-10 text-center">
          <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
          <p className="font-black text-emerald-800 dark:text-emerald-300 text-xl">All mismatches resolved!</p>
          <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">Great job keeping the inventory accurate.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {active.map(issue => {
            const sev = SEV[issue.severity as keyof typeof SEV] ?? SEV.low;
            const Icon = sev.icon;
            return (
              <div
                key={issue.id}
                data-testid={`card-issue-${issue.id}`}
                className={`rounded-2xl border p-5 ${sev.bg} ${sev.border}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`h-4 w-4 ${sev.text}`} />
                      <span className={`font-black text-sm ${sev.text}`}>{issue.productCode} · {issue.location}</span>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${sev.badge}`}>{issue.severity.toUpperCase()}</span>
                    </div>
                    <div className="flex gap-4 text-xs font-bold text-foreground/70 flex-wrap">
                      <span>System: <strong className="text-foreground">{issue.systemQty}</strong></span>
                      <span>Physical: <strong className="text-foreground">{issue.reportedQty}</strong></span>
                      <span className="text-red-600">Diff: <strong>{issue.diff}</strong></span>
                      <span>At risk: <strong>{GHS(issue.valueAtRisk)}</strong></span>
                    </div>
                  </div>
                  <button
                    data-testid={`button-resolve-${issue.id}`}
                    onClick={() => handleResolve(issue.id)}
                    disabled={resolve.isPending}
                    className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-bold text-foreground hover:bg-muted transition-all disabled:opacity-50 shrink-0"
                  >
                    <CheckCircle className="h-4 w-4" /> Mark Resolved
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resolved issues */}
      {resolved.length > 0 && (
        <div>
          <h3 className="font-black text-muted-foreground mb-3">Resolved Issues</h3>
          <div className="space-y-2">
            {resolved.map(issue => (
              <div key={issue.id} className="rounded-xl border border-border bg-muted/30 px-5 py-3 flex items-center justify-between opacity-60" data-testid={`card-resolved-${issue.id}`}>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-bold text-foreground">{issue.productCode} · {issue.location}</span>
                </div>
                <span className="text-xs font-bold text-emerald-600">Resolved</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
