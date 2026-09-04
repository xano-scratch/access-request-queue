import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { titleCase } from "@/lib/format";
import type { Role } from "@/lib/api";

// Status semaphores. These use explicit status hues (not theme tokens) on
// purpose: a queue reads faster when approved, pending, and denied are distinct
// colors. All are tinted so they sit well on the dark surface.
const STATUS_STYLES: Record<string, string> = {
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-500",
  approved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
  denied: "border-red-500/30 bg-red-500/10 text-red-500",
  escalated: "border-orange-500/30 bg-orange-500/10 text-orange-500",
  expired: "border-border bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", STATUS_STYLES[status])}>
      {titleCase(status)}
    </Badge>
  );
}

const ACTION_STYLES: Record<string, string> = {
  approve: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
  deny: "border-red-500/30 bg-red-500/10 text-red-500",
  escalate: "border-orange-500/30 bg-orange-500/10 text-orange-500",
  expire: "border-border bg-muted text-muted-foreground",
};

export function ActionBadge({ action }: { action: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", ACTION_STYLES[action])}>
      {titleCase(action)}
    </Badge>
  );
}

// Risk tier: higher tier, hotter color.
const TIER_STYLES: Record<number, string> = {
  1: "border-sky-500/30 bg-sky-500/10 text-sky-500",
  2: "border-amber-500/30 bg-amber-500/10 text-amber-500",
  3: "border-red-500/30 bg-red-500/10 text-red-500",
};

export function RiskTierBadge({ tier }: { tier: number }) {
  return (
    <Badge variant="outline" className={cn("font-medium", TIER_STYLES[tier] ?? "")}>
      Tier {tier}
    </Badge>
  );
}

export function RoleBadge({ role }: { role: Role | string | null | undefined }) {
  const label =
    role === "security_admin" ? "Security admin" : role === "approver" ? "Approver" : "Requester";
  return (
    <Badge variant="secondary" className="font-medium">
      {label}
    </Badge>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
      Active
    </Badge>
  ) : (
    <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
      Superseded
    </Badge>
  );
}
