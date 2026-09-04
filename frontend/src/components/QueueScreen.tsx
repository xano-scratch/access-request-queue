import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, Inbox, ArrowRight, Hash, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RiskTierBadge, StatusBadge } from "@/components/badges";
import { formatRelative } from "@/lib/format";
import {
  getPeople,
  getQueue,
  getSystems,
  submitRequest,
  ApiError,
  type AccessRequest,
  type AuthUser,
  type PersonRow,
  type QueueResult,
  type SystemRow,
} from "@/lib/api";

function scopeCopy(user: AuthUser, count: number): { title: string; description: string } {
  if (user.role === "security_admin")
    return {
      title: `All requests (${count})`,
      description: "As a security admin you see every request across all systems and tiers.",
    };
  if (user.role === "approver")
    return {
      title: `Awaiting your approval (${count})`,
      description: `Pending requests within your approval limit of ${user.approval_limit}. The API layer scopes this list, so a rebuilt frontend cannot widen it.`,
    };
  return {
    title: `Your requests (${count})`,
    description: "Requests you submitted. You cannot see or act on anyone else's.",
  };
}

export function QueueScreen({ user, onOpen }: { user: AuthUser; onOpen: (id: number) => void }) {
  const [queue, setQueue] = useState<QueueResult>({ role: "requester", requests: [] });
  const [systems, setSystems] = useState<SystemRow[]>([]);
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [systemId, setSystemId] = useState<string>("");
  const [justification, setJustification] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [routed, setRouted] = useState<AccessRequest | null>(null);
  const [openId, setOpenId] = useState("");

  const systemsById = useMemo(
    () => Object.fromEntries(systems.map((s) => [Number(s.id), s])),
    [systems],
  );
  const peopleById = useMemo(
    () => Object.fromEntries(people.map((p) => [Number(p.id), p])),
    [people],
  );

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [q, sys, ppl] = await Promise.all([getQueue(), getSystems(), getPeople()]);
      setQueue(q);
      setSystems(sys);
      setPeople(ppl);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load the queue.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!systemId || !justification.trim()) return;
    setSubmitting(true);
    setRouted(null);
    setError(null);
    try {
      const created = await submitRequest({
        system_id: Number(systemId),
        justification: justification.trim(),
      });
      setRouted(created);
      setJustification("");
      setSystemId("");
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not submit the request.");
    } finally {
      setSubmitting(false);
    }
  }

  const scope = scopeCopy(user, queue.requests.length);
  const canOpenAny = user.role !== "requester";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      {/* The queue */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold">{scope.title}</h2>
          <p className="text-sm text-muted-foreground">{scope.description}</p>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading requests...
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}

        {!loading && queue.requests.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
              <Inbox className="size-8" />
              <p>No requests in your queue right now.</p>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col gap-3">
          {queue.requests.map((r) => {
            const sys = systemsById[Number(r.system_id)];
            const requester = peopleById[Number(r.requester_id)];
            const mine = Number(r.requester_id) === Number(user.id);
            return (
              <button
                key={Number(r.id)}
                type="button"
                onClick={() => onOpen(Number(r.id))}
                className="group flex flex-col gap-2 rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary/50"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{sys?.name ?? `System #${r.system_id}`}</span>
                  <RiskTierBadge tier={Number(r.risk_tier)} />
                  <StatusBadge status={String(r.status)} />
                  {mine && (
                    <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      Submitted by you
                    </span>
                  )}
                  <span className="ms-auto inline-flex items-center gap-1 text-sm text-muted-foreground group-hover:text-primary">
                    Review <ArrowRight className="size-3.5" />
                  </span>
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">{String(r.justification)}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>#{Number(r.id)}</span>
                  <span>By {requester?.name ?? `User #${r.requester_id}`}</span>
                  <span>Needs approver limit {Number(r.required_approver_limit)}</span>
                  <span>{formatRelative(Number(r.created_at))}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit + open-by-id */}
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New access request</CardTitle>
            <CardDescription>
              Submitting routes the request through the active rule for the system's risk tier and
              captures which rule fired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-3" onSubmit={onSubmit}>
              <div className="grid gap-1.5">
                <Label htmlFor="system">System</Label>
                <Select value={systemId} onValueChange={setSystemId}>
                  <SelectTrigger id="system">
                    <SelectValue placeholder="Choose a system" />
                  </SelectTrigger>
                  <SelectContent>
                    {systems.map((s) => (
                      <SelectItem key={Number(s.id)} value={String(s.id)}>
                        {s.name} (Tier {Number(s.risk_tier)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="justification">Justification</Label>
                <Textarea
                  id="justification"
                  placeholder="Why do you need this access?"
                  rows={3}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={submitting || !systemId || !justification.trim()}>
                <Plus />
                {submitting ? "Submitting..." : "Submit request"}
              </Button>
            </form>
            {routed && (
              <div className="mt-3 rounded-md border border-primary/30 bg-primary/10 p-3 text-sm">
                <p className="font-medium text-primary">Request #{Number(routed.id)} routed</p>
                <p className="text-muted-foreground">
                  Captured as Tier {Number(routed.risk_tier)}, needs an approver with limit{" "}
                  {Number(routed.required_approver_limit)}.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {canOpenAny && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Open a request by number</CardTitle>
              <CardDescription>
                Any request is addressable by id. Open one above your limit to watch the backend
                force an escalation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="flex items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const n = Number(openId);
                  if (n > 0) onOpen(n);
                }}
              >
                <div className="grid flex-1 gap-1.5">
                  <Label htmlFor="openid">Request #</Label>
                  <Input
                    id="openid"
                    inputMode="numeric"
                    placeholder="1"
                    value={openId}
                    onChange={(e) => setOpenId(e.target.value.replace(/[^0-9]/g, ""))}
                  />
                </div>
                <Button type="submit" variant="outline" disabled={!openId}>
                  <Hash />
                  Open
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
