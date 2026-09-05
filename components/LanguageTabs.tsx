"use client";

import { useState } from "react";
import { CodeBlock } from "@ubx/docs-ui";

type Lang = "go" | "typescript" | "python";

const LABELS: Record<Lang, string> = { go: "Go", typescript: "TypeScript", python: "Python" };

export function LanguageTabs({ examples }: { examples: Record<Lang, string> }) {
  const langs = Object.keys(examples) as Lang[];
  const [active, setActive] = useState<Lang>(langs[0]);

  return (
    <div>
      <div className="flex gap-1 border-b border-border">
        {langs.map((lang) => (
          <button
            key={lang}
            onClick={() => setActive(lang)}
            className={
              "px-4 py-2 text-sm font-medium transition-colors " +
              (active === lang
                ? "border-b-2 border-primary text-primary"
                : "text-foreground-muted hover:text-foreground")
            }
          >
            {LABELS[lang]}
          </button>
        ))}
      </div>
      {/* Height reservoir: all three panes stacked in one grid cell,
          purely to size the container to the tallest one so switching
          tabs never shifts content below it. Always invisible, never
          the interactive element -- confirmed real, documented Safari
          behavior is that toggling only `visibility` on an otherwise
          unchanged box (same position, same dimensions) can fail to
          repaint, and each pane's own overflow-x-auto additionally
          establishes its own stacking context, a second real, reported
          WebKit CSS Grid inconsistency on top of the first. Rather
          than chase the exact mechanism, the actual displayed pane
          below is a single, ordinary, un-stacked element instead --
          switching tabs mounts/unmounts it like any other conditional
          render, with no overlapping siblings and no visibility
          toggle in the interactive path at all. */}
      <div className="relative pt-3">
        <div className="invisible grid grid-cols-1" aria-hidden="true">
          {langs.map((lang) => (
            <div key={lang} className="col-start-1 row-start-1 min-w-0">
              <CodeBlock code={examples[lang]} lang={lang} />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 min-w-0">
          <CodeBlock code={examples[active]} lang={active} />
        </div>
      </div>
    </div>
  );
}
