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
      <div className="pt-3">
        <CodeBlock code={examples[active]} lang={active} />
      </div>
    </div>
  );
}
