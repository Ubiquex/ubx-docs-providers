// RequiredBadge: red, per UBI-240's own recorded palette -- the same
// red string literals use in CodeBlock, a deliberate, recorded overlap
// the design pass flagged as worth watching, not an accident.
export function RequiredBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-accent-red/10 px-2 py-0.5 text-xs font-medium text-accent-red">
      required
    </span>
  );
}
