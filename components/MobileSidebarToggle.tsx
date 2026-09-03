"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ProviderSidebar } from "./ProviderSidebar";

// Opens from the header, since the desktop sidebar (ProviderSidebar's
// own "hidden lg:block" rail) contributes nothing below that
// breakpoint -- without this, a reader on mobile has no way to reach
// a provider's service groups or resources at all once past the
// provider home page. Renders the identical ProviderSidebar (same
// fetch, same filter, same tree) inside a drawer rather than a
// second, parallel mobile nav that could drift from the real one.
//
// Two-state open/close (mounted + visible, not a single boolean) so
// the close transition has time to actually play: closing flips
// `visible` off immediately (the CSS transition animates toward the
// closed position) and only removes the drawer from the DOM once that
// transition has had time to finish, rather than the element
// vanishing the instant the tap registers.
const TRANSITION_MS = 200;

export function MobileSidebarToggle({
  providerKey,
  version,
  current,
}: {
  providerKey: string;
  version: string;
  current?: { service: string; localName: string; isDataSource: boolean };
}) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const isFirstPathname = useRef(true);

  function clearCloseTimer() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function open() {
    clearCloseTimer();
    setMounted(true);
    // Mounts in the closed visual position first -- flipping to
    // `visible` one frame later gives the browser an actual "from"
    // state to transition out of, rather than painting already open.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
  }

  function close() {
    setVisible(false);
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setMounted(false), TRANSITION_MS);
  }

  useEffect(() => clearCloseTimer, []);

  // Explicit close-on-navigation rather than relying on this
  // component happening to remount between routes -- Header sits
  // directly in each page.tsx, not behind a shared layout boundary
  // between different resource pages, so whether React actually tears
  // this instance down on every navigation isn't guaranteed. Skips
  // the very first render (mount already starts closed) so this only
  // ever fires on a real route change.
  useEffect(() => {
    if (isFirstPathname.current) {
      isFirstPathname.current = false;
      return;
    }
    close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label="Open service navigation"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded text-foreground-muted hover:bg-surface hover:text-primary lg:hidden"
      >
        <svg viewBox="0 0 20 20" width="20" height="20" fill="none" aria-hidden="true">
          <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      {mounted && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close service navigation"
            onClick={close}
            className={
              "absolute inset-0 bg-foreground/40 transition-opacity duration-200 motion-reduce:transition-none " +
              (visible ? "opacity-100" : "opacity-0")
            }
          />
          <div
            className={
              "absolute inset-y-0 left-0 flex w-80 max-w-[85vw] flex-col overflow-y-auto bg-background p-4 shadow-lg " +
              "transition-transform duration-200 ease-out motion-reduce:transition-none " +
              (visible ? "translate-x-0" : "-translate-x-full")
            }
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Services</span>
              <button
                type="button"
                onClick={close}
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
