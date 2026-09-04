/**
 * Color mode, persisted. The inline script in index.html applies the stored
 * value before first paint; this module is what changes it afterwards.
 *
 * This app defaults to dark (a governance console reads well dark, and it keeps
 * the template set visually consistent). An explicit "light" choice opts out and
 * is remembered.
 */
export type Mode = "light" | "dark";

const KEY = "theme";

/** The stored preference, defaulting to dark when there is none. */
export function getMode(): Mode {
  return localStorage.getItem(KEY) === "light" ? "light" : "dark";
}

/** Whether `mode` renders dark. */
export function isDark(mode: Mode): boolean {
  return mode === "dark";
}

/** Persist a mode and apply it. */
export function setMode(mode: Mode): void {
  localStorage.setItem(KEY, mode);
  document.documentElement.classList.toggle("dark", isDark(mode));
}

/**
 * Re-apply on changes made in another tab. Returns an unsubscribe function —
 * call it from your framework's cleanup hook.
 */
export function watchMode(onChange: (mode: Mode) => void): () => void {
  const apply = () => {
    const mode = getMode();
    document.documentElement.classList.toggle("dark", isDark(mode));
    onChange(mode);
  };
  window.addEventListener("storage", apply);
  return () => window.removeEventListener("storage", apply);
}
