"use client";

import { useSyncExternalStore } from "react";

// Three real states: "light"/"dark" (an explicit, persisted choice --
// see the inline script in app/layout.tsx for how it's applied before
// paint) and "system" (no [data-theme] attribute at all, the original
// prefers-color-scheme-only behavior this toggle adds onto rather than
// replaces). Cycles system -> light -> dark -> system so a reader can
// always get back to "just follow the OS" without a separate control.
type ThemeChoice = "system" | "light" | "dark";

const STORAGE_KEY = "ubx-docs-theme";

function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
}

const NEXT: Record<ThemeChoice, ThemeChoice> = {
  system: "light",
  light: "dark",
  dark: "system",
};

const LABEL: Record<ThemeChoice, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

// localStorage is real external state, not React state -- read through
// useSyncExternalStore rather than mirrored into a useState via a
// useEffect (the latter renders "system" first, then immediately
// re-renders to whatever was actually stored, a real extra render this
// avoids). getServerSnapshot returns "system" unconditionally: the
// server has no localStorage at all, and it's also the correct answer
// for a first client render before the "ubx-theme-change" listener
// below has run once -- the inline head script in app/layout.tsx has
// already set the real data-theme attribute on the DOM by then, so the
// page never actually shows the wrong theme, only this button's own
// label briefly lags by one render on a genuinely fresh mount.
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("ubx-theme-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("ubx-theme-change", callback);
  };
}

function getSnapshot(): ThemeChoice {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

function getServerSnapshot(): ThemeChoice {
  return "system";
}

export function ThemeToggle() {
  const choice = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function cycle() {
    const next = NEXT[choice];
    applyTheme(next);
    if (next === "system") window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event("ubx-theme-change"));
  }

  return (
    <button
      type="button"
      onClick={cycle}
      className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground-muted hover:border-primary hover:text-primary"
      aria-label={`Theme: ${LABEL[choice]}. Click to change.`}
    >
      {LABEL[choice]}
    </button>
  );
}
