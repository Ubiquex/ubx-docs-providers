// TierBadge: official/verified/community, per UBI-240's own design pass.
// Everything is "official" today -- UBI-205 (provider tiers with a real
// subject) is deliberately deferred until a third party actually
// publishes, so this component exists and renders correctly, but only
// ever shows one real value right now.
//
// Persian yellow, not primary green -- a tier badge sits right next to
// the provider name, which is already green, and reading the same
// color as its own neighbor made it disappear as a distinct signal.
// The same accent-yellow token argument types now use (globals.css's
// own real, checked-both-themes contrast fix applies here too, and
// this badge never shares a page with CodeBlock's own yellow property
// names or a resource page's own yellow argument types, so there's no
// real ambiguity from reusing it).

const LABEL: Record<string, string> = {
  official: "Official",
  verified: "Verified",
  community: "Community",
};

export function TierBadge({ tier }: { tier: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-accent-yellow/10 px-2.5 py-0.5 text-xs font-medium text-accent-yellow">
      {LABEL[tier] ?? tier}
    </span>
  );
}
