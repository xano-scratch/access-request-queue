import { useEffect, useMemo, useState } from "react";
import { GitBranch, Loader2, Timer, Users2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ActiveBadge, RiskTierBadge } from "@/components/badges";
import {
  getRules,
  getSystems,
  runExpireSweep,
  ApiError,
  type AuthUser,
  type RuleRow,
  type SystemRow,
} from "@/lib/api";

export function RulesScreen({ user }: { user: AuthUser }) {
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [systems, setSystems] = useState<SystemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sweeping, setSweeping] = useState(false);
  const [sweepResult, setSweepResult] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [r, s] = await Promise.all([getRules(), getSystems()]);
      setRules(r);
      setSystems(s);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load the rules.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const grouped = useMemo(() => {
    const byId = Object.fromEntries(systems.map((s) => [Number(s.id), s]));
    const map = new Map<number, { system: SystemRow | undefined; rules: RuleRow[] }>();
    for (const rule of rules) {
      const sid = Number(rule.system_id);
      if (!map.has(sid)) map.set(sid, { system: byId[sid], rules: [] });
      map.get(sid)!.rules.push(rule);
    }
    return [...map.values()];
  }, [rules, systems]);

  async function onSweep() {
    setSweeping(true);
    setSweepResult(null);
    try {
      const res = await runExpireSweep();
      const n = res.expired?.length ?? 0;
      setSweepResult(
        n === 0
          ? "No approved requests were past their expiry window."
          : `Expired ${n} request${n === 1 ? "" : "s"} and wrote an audit entry for each.`,
      );
    } catch (e) {
      setSweepResult(e instanceof ApiError ? e.message : "The sweep failed.");
    } finally {
      setSweeping(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Approval rules</h2>
        <p className="text-sm text-muted-foreground">
          The governed logic a human audits. Rules are versioned: only one rule per system and tier
          is active, and superseded versions are kept so the history is visible, not overwritten.
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading rules...
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {grouped.map(({ system, rules }) => (
        <Card key={Number(system?.id ?? Math.random())}>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">{system?.name ?? "Unknown system"}</CardTitle>
              {system && <RiskTierBadge tier={Number(system.risk_tier)} />}
              {system?.key && (
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                  {system.key}
                </code>
              )}
            </div>
            {system?.description && <CardDescription>{system.description}</CardDescription>}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Min approver limit</TableHead>
                  <TableHead>Second approver</TableHead>
                  <TableHead>Auto expiry</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={Number(rule.id)}>
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-1">
                        <GitBranch className="size-3.5 text-muted-foreground" /> v{Number(rule.version)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <ActiveBadge active={Boolean(rule.is_active)} />
                    </TableCell>
                    <TableCell>{Number(rule.risk_tier)}</TableCell>
                    <TableCell>{Number(rule.min_approver_limit)}</TableCell>
                    <TableCell>
                      {rule.require_second_approver ? (
                        <span className="inline-flex items-center gap-1 text-foreground">
                          <Users2 className="size-3.5" /> Required
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Not required</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1">
                        <Timer className="size-3.5 text-muted-foreground" />
                        {Number(rule.auto_expire_days)} days
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      {user.role === "security_admin" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expiry sweep</CardTitle>
            <CardDescription>
              Auto-expiry lives in the backend. In production this runs as a scheduled task; here a
              security admin runs it by hand. It moves approved requests past their expiry window to
              "expired" and appends an audit entry for each.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div>
              <Button onClick={onSweep} disabled={sweeping} variant="outline">
                <Timer className={sweeping ? "animate-spin" : ""} />
                {sweeping ? "Running sweep..." : "Run expiry sweep"}
              </Button>
            </div>
            {sweepResult && <p className="text-sm text-muted-foreground">{sweepResult}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
