import { RequiredBadge } from "./RequiredBadge";
import type { Field } from "@/lib/docs";
import { fieldDescription, fieldShapeSignature, formatFieldType, isObjectIsh, objectFieldsOf } from "@/lib/docs";

// Depth caps match ubiquex-docs's own real Mintlify generator exactly
// (MAX_RESPONSE_FIELD_DEPTH there is 8 for resources, a bare 6 for data
// sources) -- not new numbers, the same ones already proven against
// this real corpus.
export const MAX_DEPTH_RESOURCE = 8;
export const MAX_DEPTH_DATA_SOURCE = 6;

type Ancestor = { name: string; signature: string };

// FieldRow renders one field and, for an object-ish type with real
// children, a native <details> holding its nested fields -- a
// collapsible toggle per object, matching how the Mintlify pages this
// site replaces already present nesting, rather than a flat expansion
// that dumps every depth at once. No client JS: <details> is the
// browser's own disclosure widget.
function FieldRow({
  field,
  provider,
  version,
  wireType,
  path,
  depth,
  maxDepth,
  ancestors,
  topLevel,
}: {
  field: Field;
  provider: string;
  version: string;
  wireType: string;
  path: string;
  depth: number;
  maxDepth: number;
  ancestors: Ancestor[];
  topLevel: boolean;
}) {
  const desc = field.Description || fieldDescription(provider, version, wireType, path);
  const nested = isObjectIsh(field.Type) ? objectFieldsOf(field.Type) : [];
  const signature = nested.length > 0 ? fieldShapeSignature(field.Type) : "";
  const isCycle = nested.length > 0 && ancestors.some((a) => a.name === field.WireName && a.signature === signature);
  const atMaxDepth = nested.length > 0 && depth >= maxDepth;

  return (
    <div className="py-3" id={topLevel ? `arg-${field.WireName}` : undefined}>
      <dt className="flex items-center gap-2">
        <span className="font-mono-tabular text-sm font-medium text-primary">{field.WireName}</span>
        <span className="text-xs text-accent-yellow">{formatFieldType(field.Type)}</span>
        {field.Required && <RequiredBadge />}
      </dt>
      <dd className="mt-1 text-sm leading-relaxed text-foreground">
        {desc || <span className="text-foreground-muted">No description available.</span>}
      </dd>
      {nested.length > 0 && (
        <details className="mt-2 ml-1 border-l border-border pl-4">
          <summary className="cursor-pointer text-xs font-medium text-foreground-muted hover:text-primary">
            {nested.length} propert{nested.length === 1 ? "y" : "ies"}
          </summary>
          {isCycle ? (
            <p className="mt-2 text-sm text-foreground-muted">
              {field.WireName} recurs here; see its own properties above for the repeating pattern.
            </p>
          ) : atMaxDepth ? (
            <p className="mt-2 text-sm text-foreground-muted">
              Nested structure continues beyond {maxDepth} levels of depth; further properties omitted for
              readability.
            </p>
          ) : (
            <dl className="mt-2 divide-y divide-border">
              {[...nested]
                .sort((a, b) => a.WireName.localeCompare(b.WireName))
                .map((child) => (
                  <FieldRow
                    key={child.WireName}
                    field={child}
                    provider={provider}
                    version={version}
                    wireType={wireType}
                    path={`${path}.${child.WireName}`}
                    depth={depth + 1}
                    maxDepth={maxDepth}
                    ancestors={[...ancestors, { name: field.WireName, signature }]}
                    topLevel={false}
                  />
                ))}
            </dl>
          )}
        </details>
      )}
    </div>
  );
}

export function FieldSection({
  title,
  headingId,
  fields,
  provider,
  version,
  wireType,
  maxDepth,
}: {
  title: string;
  headingId?: string;
  fields: Field[];
  provider: string;
  version: string;
  wireType: string;
  maxDepth: number;
}) {
  if (fields.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 id={headingId} className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">
        {title}
      </h2>
      <dl className="mt-3 divide-y divide-border">
        {fields.map((f) => (
          <FieldRow
            key={f.WireName}
            field={f}
            provider={provider}
            version={version}
            wireType={wireType}
            path={f.WireName}
            depth={0}
            maxDepth={maxDepth}
            ancestors={[]}
            topLevel
          />
        ))}
      </dl>
    </section>
  );
}
