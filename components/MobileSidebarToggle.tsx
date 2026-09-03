"use client";

import { useState } from "react";
import { ProviderSidebar } from "./ProviderSidebar";

// Opens from the header, since the desktop sidebar (ProviderSidebar's
// own "hidden lg:block" rail) contributes nothing below that
// breakpoint -- without this, a reader on mobile has no way to reach
// a provider's service groups or resources at all once past the
// provider home page. Renders the identical ProviderSidebar (same
// fetch, same filter, same tree) inside a drawer rather than a
// second, parallel mobile nav that could drift from the real one.
//
// State lives here, not in Header -- Header stays the same generic,
// provider-agnostic component the plain landing page also uses (which
// has no sidebar to open at all). Each provider-scoped page mounts a
// fresh instance of this component, so the drawer starts closed again
// on every navigation without needing an explicit close-on-link
// handler.
export function MobileSidebarToggle({
  providerKey,
  version,
  current,
}: {
  providerKey: string;
  version: string;
  current?: { service: string; localName: string; isDataSource: boolean };
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open service navigation"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded text-foreground-muted hover:bg-surface hover:text-primary lg:hidden"
      >
        <svg viewBox="0 0 20 20" width="20" height="20" fill="none" aria-hidden="true">
          <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close service navigation"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-foreground/40"
          />
          <div className="absolute inset-y-0 left-0 flex w-80 max-w-[85vw] flex-col overflow-y-auto bg-background p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Services</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close service navigation"
                className="flex h-8 w-8 items-center justify-center rounded text-foreground-muted hover:bg-surface hover:text-primary"
              >
                <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <ProviderSidebar providerKey={providerKey} version={version} current={current} className="block" />
          </div>
        </div>
      )}
    </>
  );
}
