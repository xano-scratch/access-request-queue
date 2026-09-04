import { useState } from "react";
import { ShieldCheck, LogOut, RefreshCw, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ModeToggle } from "@/components/mode-toggle";
import { RoleBadge } from "@/components/badges";
import { reseed, type AuthUser } from "@/lib/api";

export function AppHeader({
  user,
  onSwitchUser,
  onReseeded,
}: {
  user: AuthUser;
  onSwitchUser: () => void;
  onReseeded: () => void;
}) {
  const [resetting, setResetting] = useState(false);

  async function handleReset() {
    setResetting(true);
    try {
      await reseed();
      onReseeded();
    } finally {
      setResetting(false);
    }
  }

  return (
    <header className="border-b bg-card/50">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="size-5" />
          </div>
          <div className="leading-tight">
            <div className="font-semibold">Access Request Queue</div>
            <div className="text-xs text-muted-foreground">Governed approval backend</div>
          </div>
        </div>

        <div className="ms-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5">
            <UserRound className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">{user.name}</span>
            <RoleBadge role={user.role} />
            <span className="text-xs text-muted-foreground">limit {user.approval_limit}</span>
          </div>
          <Separator orientation="vertical" className="mx-1 h-6" />
          <Button variant="outline" size="sm" onClick={handleReset} disabled={resetting}>
            <RefreshCw className={resetting ? "animate-spin" : ""} />
            Reset demo data
          </Button>
          <Button variant="ghost" size="sm" onClick={onSwitchUser}>
            <LogOut />
            Switch user
          </Button>
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
