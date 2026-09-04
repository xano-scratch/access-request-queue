import { useState } from "react";
import { ClipboardList, ScrollText } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppHeader } from "@/components/AppHeader";
import { LoginScreen } from "@/components/LoginScreen";
import { QueueScreen } from "@/components/QueueScreen";
import { RulesScreen } from "@/components/RulesScreen";
import { RequestDetailScreen } from "@/components/RequestDetailScreen";
import { clearSession, getStoredUser, type AuthUser } from "@/lib/api";

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [tab, setTab] = useState<"queue" | "rules">("queue");
  const [detailId, setDetailId] = useState<number | null>(null);
  // Bumped to force the list screens to refetch (after a decision or a reseed).
  const [contentKey, setContentKey] = useState(0);

  if (!user) return <LoginScreen onLogin={setUser} />;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        user={user}
        onSwitchUser={() => {
          clearSession();
          setUser(null);
          setDetailId(null);
        }}
        onReseeded={() => {
          setDetailId(null);
          setContentKey((k) => k + 1);
        }}
      />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {detailId != null ? (
          <RequestDetailScreen
            id={detailId}
            user={user}
            onBack={() => setDetailId(null)}
            onChanged={() => setContentKey((k) => k + 1)}
          />
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as "queue" | "rules")}>
            <TabsList>
              <TabsTrigger value="queue">
                <ClipboardList className="size-4" /> Queue
              </TabsTrigger>
              <TabsTrigger value="rules">
                <ScrollText className="size-4" /> Rules
              </TabsTrigger>
            </TabsList>
            <TabsContent value="queue" className="mt-4">
              <QueueScreen key={`q${contentKey}`} user={user} onOpen={(id) => setDetailId(id)} />
            </TabsContent>
            <TabsContent value="rules" className="mt-4">
              <RulesScreen key={`r${contentKey}`} user={user} />
            </TabsContent>
          </Tabs>
        )}
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
        <p className="text-xs text-muted-foreground">
          Every rule, guard, and audit entry lives in the Xano API layer. This React frontend only
          calls it, so rebuilding the frontend cannot weaken the controls.
        </p>
      </footer>
    </div>
  );
}
