// TierBadge: official/verified/community, per UBI-240's own design pass.
// Everything is "official" today -- UBI-205 (provider tiers with a real
// subject) is deliberately deferred until a third party actually
// publishes, so this component exists and renders correctly, but only
// ever shows one real value right now.

const LABEL: Record<string, string> = {
  official: "Official",
  verified: "Verified",
  community: "Community",
};

export function TierBadge({ tier }: { tier: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-primary px-2.5 py-0.5 text-xs font-medium text-primary">
      {LABEL[tier] ?? tier}
    </span>
  );
}
