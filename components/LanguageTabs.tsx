import { CodeBlock, CodeTabs } from "@ubx/docs-ui";
import type { CodeTab } from "@ubx/docs-ui";

// A SERVER component now, deliberately, and the reason is the bug it
// used to have.
//
// This file carried "use client" and rendered <CodeBlock> itself.
// CodeBlock is an async server component, so that worked on first paint
// and threw the instant a tab was pressed: "An unknown Component is an
// async Client Component." Next's error boundary then replaced the whole
// route with its generic load failure, on all 26,490 resource and
// data-source pages, at every viewport.
//
// The tab strip is @ubx/docs-ui's CodeTabs, which takes panels as nodes
// rather than data. So the three CodeBlocks are awaited here, on the
// server, where they belong, and the client shell only ever toggles
// which already-rendered node is shown. Both call sites of this
// component are server components, so nothing had to move.
//
// The appearance is unchanged from what this file used to draw. Only the
// switching moved.

type Lang = "go" | "typescript" | "python";

const ORDER: Lang[] = ["typescript", "go", "python"];
const LABELS: Record<Lang, string> = { go: "Go", typescript: "TypeScript", python: "Python" };

// TypeScript opens by default. The tab used to be Object.keys()[0] of
// the examples file, which made the default whatever the generator
// happened to serialise first rather than anyone's decision.
const DEFAULT_LANG: Lang = "typescript";

export async function LanguageTabs({ examples }: { examples: Record<Lang, string> }) {
  const tabs: CodeTab[] = await Promise.all(
    ORDER.filter((lang) => examples[lang]).map(async (lang) => ({
      label: LABELS[lang],
      panel: await CodeBlock({ code: examples[lang], lang }),
    })),
  );

  return (
    <CodeTabs
      tabs={tabs}
      defaultLabel={LABELS[DEFAULT_LANG]}
      // The reservoir: the box is sized to the tallest panel so
      // switching never shifts the content below it.
      reserveHeight
      classNames={{
        list: "flex gap-1 border-b border-border",
        tab: "px-4 py-2 text-sm font-medium transition-colors text-foreground-muted hover:text-foreground",
        tabActive: "px-4 py-2 text-sm font-medium transition-colors border-b-2 border-primary text-primary",
      }}
    />
  );
}
