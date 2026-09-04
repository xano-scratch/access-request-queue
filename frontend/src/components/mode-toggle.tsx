import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getMode, setMode, watchMode, type Mode } from "@/lib/theme";

const ICON: Record<Mode, typeof Moon> = { light: Sun, dark: Moon };

export function ModeToggle() {
  // Read on mount, not during render: the inline script in index.html has
  // already applied the class before first paint.
  const [mode, setLocal] = useState<Mode>("dark");
  useEffect(() => {
    setLocal(getMode());
    return watchMode(setLocal);
  }, []);

  const Icon = ICON[mode];
  const next: Mode = mode === "dark" ? "light" : "dark";
  const change = () => {
    setMode(next);
    setLocal(next);
  };

  return (
    <Button variant="ghost" size="icon" onClick={change} aria-label={`Switch to ${next} theme`}>
      <Icon />
    </Button>
  );
}
