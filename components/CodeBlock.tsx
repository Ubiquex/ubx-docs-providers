// CodeBlock is a real, hand-rolled tokenizer, not a placeholder --
// scoped honestly to the three languages this site actually renders
// (Go/TypeScript/Python starter examples), not a general-purpose
// highlighter. UBI-240's own recorded palette: green for keywords and
// type names, red for string literals, yellow for property names. Red
// also carries the required badge elsewhere on this site, which the
// design pass flagged as worth watching since strings and that badge
// then share a color -- true here too, a deliberate, recorded choice,
// not an oversight.
//
// A real syntax-highlighting library (Shiki, tied to a real Persian
// green/red/yellow theme) is the honest long-term answer once this
// goes wide across seven providers and far more language variety --
// this slice proves the palette and the page shape, not the final
// tokenizer.

const GO_KEYWORDS = new Set([
  "func", "package", "import", "return", "var", "const", "type", "struct",
  "if", "else", "for", "range", "defer", "go", "chan", "select", "case",
  "switch", "default", "interface", "map",
]);

const TS_KEYWORDS = new Set([
  "import", "from", "const", "let", "function", "return", "new", "as",
  "type", "interface", "export", "default",
]);

const PY_KEYWORDS = new Set([
  "import", "from", "def", "return", "class", "as", "with", "if", "else",
]);

type Lang = "go" | "typescript" | "python";

const KEYWORDS: Record<Lang, Set<string>> = {
  go: GO_KEYWORDS,
  typescript: TS_KEYWORDS,
  python: PY_KEYWORDS,
};

type Token = { text: string; kind: "keyword" | "type" | "string" | "property" | "plain" };

function tokenizeLine(line: string, lang: Lang): Token[] {
  const tokens: Token[] = [];
  // Order matters: strings first (so a keyword-looking word inside a
  // string is never re-tokenized), then property-name-before-colon
  // (struct literal / object literal fields), then identifiers.
  const pattern =
    /("(?:[^"\\]|\\.)*")|([A-Za-z_][A-Za-z0-9_]*)(\s*:)|([A-Za-z_][A-Za-z0-9_.]*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(line)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ text: line.slice(lastIndex, match.index), kind: "plain" });
    }
    const [full, stringLit, propName, propColon, ident] = match;
    if (stringLit) {
      tokens.push({ text: stringLit, kind: "string" });
    } else if (propName && propColon) {
      tokens.push({ text: propName, kind: "property" });
      tokens.push({ text: propColon, kind: "plain" });
    } else if (ident) {
      if (KEYWORDS[lang].has(ident)) {
        tokens.push({ text: ident, kind: "keyword" });
      } else if (/^[A-Z]/.test(ident)) {
        tokens.push({ text: ident, kind: "type" });
      } else {
        tokens.push({ text: ident, kind: "plain" });
      }
    }
    lastIndex = match.index + full.length;
  }
  if (lastIndex < line.length) {
    tokens.push({ text: line.slice(lastIndex), kind: "plain" });
  }
  return tokens;
}

const KIND_CLASS: Record<Token["kind"], string> = {
  keyword: "text-primary",
  type: "text-primary",
  string: "text-accent-red",
  property: "text-accent-yellow",
  plain: "text-foreground",
};

export function CodeBlock({ code, lang }: { code: string; lang: Lang }) {
  const lines = code.replace(/\n$/, "").split("\n");
  return (
    <pre className="overflow-x-auto rounded-2xl bg-code p-4 text-sm leading-relaxed">
      <code className="font-mono-tabular">
        {lines.map((line, i) => (
          <div key={i}>
            {tokenizeLine(line, lang).map((tok, j) => (
              <span key={j} className={KIND_CLASS[tok.kind]}>
                {tok.text}
              </span>
            ))}
            {line === "" ? " " : null}
          </div>
        ))}
      </code>
    </pre>
  );
}
