"use client";

import { useSyncExternalStore } from "react";

// Three real states: "light"/"dark" (an explicit, persisted choice --
// see the inline script in app/layout.tsx for how it's applied before
// paint) and "system" (no [data-theme] attribute at all, the original
// prefers-color-scheme-only behavior this toggle adds onto rather than
// replaces).
type ThemeChoice = "system" | "light" | "dark";

const STORAGE_KEY = "ubx-docs-theme";

function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
}

// localStorage is real external state, not React state -- read through
// useSyncExternalStore rather than mirrored into a useState via a
// useEffect (the latter renders "system" first, then immediately
// re-renders to whatever was actually stored, a real extra render this
// avoids). getServerSnapshot returns "system" unconditionally: the
// server has no localStorage at all, and it's also the correct answer
// for a first client render before the "ubx-theme-change" listener
// below has run once -- the inline head script in app/layout.tsx has
// already set the real data-theme attribute on the DOM by then, so the
// page never actually shows the wrong theme, only this control's own
// active-state highlight briefly lags by one render on a genuinely
// fresh mount.
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("ubx-theme-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("ubx-theme-change", callback);
  };
}

function getSnapshot(): ThemeChoice {
  // Same real risk app/layout.tsx's own inline THEME_INIT_SCRIPT
  // already guards against for the identical read -- private
  // browsing, a restrictive mobile browser or in-app-browser storage
  // policy, or a managed device can make localStorage throw rather
  // than return null. This runs inside useSyncExternalStore, during
  // React's render pass, in a component mounted in Header on every
  // page -- an uncaught throw here, with no error boundary anywhere
  // in this app, can fail hydration for the whole page, not just this
  // control.
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

function getServerSnapshot(): ThemeChoice {
  return "system";
}

function SystemIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
      <rect x="1.5" y="2.5" width="13" height="8.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.5 14h5M8 11v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M8 1v1.5M8 13.5V15M15 8h-1.5M2.5 8H1M12.7 3.3l-1 1M4.3 11.7l-1 1M12.7 12.7l-1-1M4.3 4.3l-1-1"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
      <path
        d="M13.5 9.5A5.8 5.8 0 0 1 6.5 2.5 5.8 5.8 0 1 0 13.5 9.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const OPTIONS: { choice: ThemeChoice; label: string; Icon: () => React.ReactElement }[] = [
  { choice: "system", label: "System", Icon: SystemIcon },
  { choice: "light", label: "Light", Icon: SunIcon },
  { choice: "dark", label: "Dark", Icon: MoonIcon },
];

// A three-way segmented control, one icon per real state, all three
// always visible -- replaces the earlier single cycling button (whose
// current state was legible only from its text label, distinct icons
// were the whole point of this pass).
export function ThemeToggle() {
  const choice = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function choose(next: ThemeChoice) {
    applyTheme(next);
    try {
      if (next === "system") window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage blocked -- the choice still applies to this page via
      // applyTheme/data-theme above, it just will not persist across
      // a reload. Never let a blocked write crash the click handler.
    }
    window.dispatchEvent(new Event("ubx-theme-change"));
  }

  return (
    <div role="radiogroup" aria-label="Theme" className="inline-flex rounded-md border border-border p-0.5">
      {OPTIONS.map(({ choice: c, label, Icon }) => {
        const active = c === choice;
        return (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => choose(c)}
            className={
              active
                ? "flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground"
                : "flex h-6 w-6 items-center justify-center rounded text-foreground-muted hover:text-primary"
            }
          >
            <Icon />
          </button>
        );
      })}
    </div>
  );
}
