"use client";

import { useState } from "react";
import { CodeBlock } from "./CodeBlock";

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
      {/* All tabs render at once, stacked in the same grid cell, so the
          container's own height sizes to the tallest one -- switching
          tabs no longer changes the block's height and shifts content
          below it. Inactive tabs stay in the layout (invisible, not
          hidden) purely so their height still counts toward that max. */}
      <div className="pt-3 grid">
        {langs.map((lang) => (
          <div
            key={lang}
            className={"col-start-1 row-start-1 min-w-0 " + (lang === active ? "visible" : "invisible")}
            aria-hidden={lang !== active}
          >
            <CodeBlock code={examples[lang]} lang={lang} />
          </div>
        ))}
      </div>
    </div>
  );
}
