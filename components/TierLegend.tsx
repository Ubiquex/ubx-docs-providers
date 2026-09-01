import { TierBadge } from "./TierBadge";

const TIERS = [
  { tier: "official", description: "Maintained by the ubx project itself." },
  { tier: "verified", description: "Maintained by a confirmed, named third party." },
  { tier: "community", description: "Published by anyone, unverified." },
];

export function TierLegend() {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-foreground-muted">
      {TIERS.map((t) => (
        <div key={t.tier} className="flex items-center gap-2">
          <TierBadge tier={t.tier} />
          <span>{t.description}</span>
        </div>
      ))}
    </div>
  );
}
