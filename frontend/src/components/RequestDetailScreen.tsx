import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import {
  ArrowLeft,
  Check,
  X,
  ArrowUpFromLine,
  ShieldAlert,
  Info,
  Lock,
  Clock,
  GitBranch,
  Timer,
  Users2,
  ScrollText,
  Loader2,
  CheckCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ActionBadge, ActiveBadge, RiskTierBadge, RoleBadge, StatusBadge } from "@/components/badges";
import { cn } from "@/lib/utils";
import { formatDateTime, formatRelative } from "@/lib/format";
import {
  decide,
  getRequest,
  ApiError,
  type AuthUser,
  type DecideAction,
  type DetailResult,
} from "@/lib/api";

type Tone = "warn" | "danger" | "info" | "success" | "muted";

const TONES: Record<Tone, string> = {
  warn: "border-amber-500/30 bg-amber-500/10",
  danger: "border-red-500/30 bg-red-500/10",
  info: "border-sky-500/30 bg-sky-500/10",
  success: "border-emerald-500/30 bg-emerald-500/10",
  muted: "border-border bg-muted",
};
const TONE_ICON: Record<Tone, string> = {
  warn: "text-amber-500",
  danger: "text-red-500",
  info: "text-sky-500",
  success: "text-emerald-500",
  muted: "text-muted-foreground",
};

function Notice({
  tone,
  icon: Icon,
  title,
  children,
}: {
  tone: Tone;
  icon: ComponentType<{ className?: string }>;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("flex gap-3 rounded-md border p-3", TONES[tone])}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", TONE_ICON[tone])} />
      <div className="text-sm">
        <p className="font-medium">{title}</p>
        {children && <div className="mt-0.5 text-muted-foreground">{children}</div>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

export function RequestDetailScreen({
  id,
  user,
  onBack,
  onChanged,
}: {
  id: number;
  user: AuthUser;
  onBack: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<DetailResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [deciding, setDeciding] = useState<DecideAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setDetail(await getRequest(id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load the request.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    setOutcome(null);
    setActionError(null);
    setNote("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function act(action: DecideAction) {
    setDeciding(action);
    setActionError(null);
    setOutcome(null);
    try {
      const res = await decide(id, action, note);
      setOutcome(String(res.outcome));
      setNote("");
      await load();
      onChanged();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "The decision was rejected.");
    } finally {
      setDeciding(null);
    }
  }

  if (loading)
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading request...
      </div>
    );

  if (error || !detail)
    return (
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="self-start">
          <ArrowLeft /> Back to queue
        </Button>
        <Notice tone="danger" icon={ShieldAlert} title={error ?? "Request not found."} />
      </div>
    );

  const { request: r, system, requester, rule, trail } = detail;
  if (!r)
    return (
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="self-start">
          <ArrowLeft /> Back to queue
        </Button>
        <Notice tone="danger" icon={ShieldAlert} title="Request not found." />
      </div>
    );
  const status = String(r.status);
  const isPending = status === "pending";
  const isRequester = Number(r.requester_id) === Number(user.id);
  const canDecideRole = user.role === "approver" || user.role === "security_admin";
  const belowLimit = Number(user.approval_limit) < Number(r.required_approver_limit);
  const busy = deciding !== null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft /> Back to queue
        </Button>
        <span className="text-sm text-muted-foreground">Request #{Number(r.id)}</span>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-xl">{system?.name ?? `System #${r.system_id}`}</CardTitle>
            <RiskTierBadge tier={Number(r.risk_tier)} />
            <StatusBadge status={status} />
          </div>
          <CardDescription>{String(r.justification)}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Requester">
              <span className="flex items-center gap-1.5">
                {requester?.name ?? `User #${r.requester_id}`}
                {requester && <RoleBadge role={String(requester.role)} />}
              </span>
            </Field>
            <Field label="Required approver limit">{Number(r.required_approver_limit)}</Field>
            <Field label="Submitted">{formatDateTime(Number(r.created_at))}</Field>
            <Field label="Access expires">
              {r.expires_at ? formatDateTime(Number(r.expires_at)) : "—"}
            </Field>
          </dl>
        </CardContent>
      </Card>

      {/* The rule that fired */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch className="size-4 text-muted-foreground" /> The rule that fired
          </CardTitle>
          <CardDescription>
            Captured at routing, not recomputed later. This exact rule version governs the decision.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Version">
              <span className="flex items-center gap-1.5">
                v{Number(rule?.version)} <ActiveBadge active={Boolean(rule?.is_active)} />
              </span>
            </Field>
            <Field label="Min approver limit">{Number(rule?.min_approver_limit)}</Field>
            <Field label="Second approver">
              {rule?.require_second_approver ? (
                <span className="inline-flex items-center gap-1">
                  <Users2 className="size-3.5" /> Required
                </span>
              ) : (
                "Not required"
              )}
            </Field>
            <Field label="Auto expiry">
              <span className="inline-flex items-center gap-1">
                <Timer className="size-3.5" /> {Number(rule?.auto_expire_days)} days
              </span>
            </Field>
          </dl>
        </CardContent>
      </Card>

      {/* Decision panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Decision</CardTitle>
          <CardDescription>
            Every guard below runs in the API layer, so the same rules hold no matter which frontend
            calls them.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {!isPending && (
            <Notice
              tone={status === "approved" ? "success" : status === "denied" ? "danger" : "muted"}
              icon={CheckCircle2}
              title={`This request is ${status}.`}
            >
              A decided request cannot be acted on again. The trail below is the full record.
            </Notice>
          )}

          {isPending && !canDecideRole && (
            <Notice tone="muted" icon={Lock} title="You cannot decide this request.">
              Only an approver or a security admin can decide. Your role is checked in the backend,
              so the action is refused even if a frontend showed the buttons.
            </Notice>
          )}

          {isPending && canDecideRole && (
            <>
              {isRequester && (
                <Notice tone="warn" icon={ShieldAlert} title="Segregation of duties">
                  You submitted this request. The backend blocks self-approval, so Approve, Deny, and
                  Escalate here will be refused. Try it and watch the API say no.
                </Notice>
              )}
              {!isRequester && belowLimit && (
                <Notice tone="info" icon={Info} title="Above your approval limit">
                  Your approval limit ({Number(user.approval_limit)}) is below this request's
                  required limit ({Number(r.required_approver_limit)}). The backend will record an
                  Approve as an Escalation instead of granting access.
                </Notice>
              )}
              {!isRequester && !belowLimit && rule?.require_second_approver && (
                <Notice tone="info" icon={Users2} title="Two sign-offs required">
                  This rule needs a second approver. The first eligible sign-off keeps the request
                  pending; the second one grants access and stamps the expiry.
                </Notice>
              )}

              <div className="grid gap-1.5">
                <Label htmlFor="note">Note (optional)</Label>
                <Textarea
                  id="note"
                  rows={2}
                  placeholder="Add a note to the audit trail"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => act("approve")} disabled={busy}>
                  {deciding === "approve" ? <Loader2 className="animate-spin" /> : <Check />}
                  Approve
                </Button>
                <Button variant="outline" onClick={() => act("escalate")} disabled={busy}>
                  {deciding === "escalate" ? <Loader2 className="animate-spin" /> : <ArrowUpFromLine />}
                  Escalate
                </Button>
                <Button variant="destructive" onClick={() => act("deny")} disabled={busy}>
                  {deciding === "deny" ? <Loader2 className="animate-spin" /> : <X />}
                  Deny
                </Button>
              </div>
            </>
          )}

          {actionError && (
            <Notice tone="danger" icon={ShieldAlert} title="Blocked by the backend">
              {actionError}
            </Notice>
          )}
          {outcome && !actionError && (
            <Notice tone="success" icon={CheckCircle2} title={`Recorded outcome: ${outcome}`}>
              The decision was written to the append-only trail.
            </Notice>
          )}
        </CardContent>
      </Card>

      {/* The audit trail */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ScrollText className="size-4 text-muted-foreground" /> Decision trail
          </CardTitle>
          <CardDescription>Append-only. Every action is recorded with its actor and time.</CardDescription>
        </CardHeader>
        <CardContent>
          {trail.length === 0 ? (
            <p className="text-sm text-muted-foreground">No decisions recorded yet.</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {trail.map((entry, i) => (
                <li key={Number(entry.id)} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex size-7 items-center justify-center rounded-full border bg-background text-xs text-muted-foreground">
                      {i + 1}
                    </div>
                    {i < trail.length - 1 && <Separator orientation="vertical" className="mt-1 flex-1" />}
                  </div>
                  <div className="flex flex-col gap-1 pb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <ActionBadge action={String(entry.action)} />
                      <span className="text-sm font-medium">{String(entry.actor_name)}</span>
                      <span className="text-xs text-muted-foreground" title={formatDateTime(Number(entry.at))}>
                        {formatRelative(Number(entry.at))}
                      </span>
                    </div>
                    {entry.note && <p className="text-sm text-muted-foreground">{String(entry.note)}</p>}
                  </div>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" /> Rows here are only ever inserted, never updated.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
