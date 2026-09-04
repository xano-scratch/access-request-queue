import { useState } from "react";
import { ShieldCheck, LogIn, ArrowRight, Database } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModeToggle } from "@/components/mode-toggle";
import { RoleBadge } from "@/components/badges";
import { DEMO_ACCOUNTS, type DemoAccount } from "@/lib/demo";
import { login, reseed, setSession, ApiError, type AuthUser } from "@/lib/api";

export function LoginScreen({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);

  async function loadDemoData() {
    setSeeding(true);
    setSeedMsg(null);
    setError(null);
    try {
      await reseed();
      setSeedMsg("Demo data loaded. Pick a role below to sign in.");
    } catch (e) {
      setSeedMsg(e instanceof ApiError ? e.message : "Could not load the demo data.");
    } finally {
      setSeeding(false);
    }
  }

  async function signIn(creds: { email: string; password: string }, key: string) {
    setBusy(key);
    setError(null);
    try {
      const res = await login(creds);
      setSession(res.token, res.user);
      onLogin(res.user);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Sign in failed. Is the backend seeded?");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="size-5" />
          </div>
          <div className="leading-tight">
            <div className="font-semibold">Access Request Queue</div>
            <div className="text-xs text-muted-foreground">Governed approval backend</div>
          </div>
        </div>
        <ModeToggle />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl tracking-tight">Sign in as a demo role</CardTitle>
          <CardDescription>
            The approval rules, the segregation-of-duties checks, and the RBAC all live in the Xano
            API layer. Pick a role to see the same governed backend from each point of view.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed bg-muted/40 p-3 sm:col-span-2">
            <p className="text-sm text-muted-foreground">
              On a fresh deploy the tables are empty. Load the demo data to create the accounts
              below (this is also the in-app reset).
            </p>
            <Button variant="secondary" size="sm" onClick={loadDemoData} disabled={seeding}>
              <Database className={seeding ? "animate-spin" : ""} />
              {seeding ? "Loading..." : "Load demo data"}
            </Button>
          </div>
          {seedMsg && <p className="text-sm text-muted-foreground sm:col-span-2">{seedMsg}</p>}
          {DEMO_ACCOUNTS.map((acct: DemoAccount) => (
            <button
              key={acct.email}
              type="button"
              disabled={busy !== null}
              onClick={() => signIn({ email: acct.email, password: acct.password }, acct.email)}
              className="group flex flex-col gap-2 rounded-lg border bg-background p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent disabled:opacity-60"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{acct.name}</span>
                <RoleBadge role={acct.role} />
              </div>
              <p className="text-sm text-muted-foreground">{acct.blurb}</p>
              <span className="mt-1 inline-flex items-center gap-1 text-sm text-primary opacity-0 transition-opacity group-hover:opacity-100">
                {busy === acct.email ? "Signing in..." : "Sign in"} <ArrowRight className="size-3.5" />
              </span>
            </button>
          ))}
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-3 border-t">
          <p className="text-sm text-muted-foreground">
            Or sign in with an email and password (all demo accounts use{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">password123</code>).
          </p>
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              signIn({ email, password }, "manual");
            }}
          >
            <div className="grid flex-1 gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="riley.requester@northwind-bank.test"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid flex-1 gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="password123"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={busy !== null || !email || !password}>
              <LogIn />
              Sign in
            </Button>
          </form>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardFooter>
      </Card>
    </main>
  );
}
