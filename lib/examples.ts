// lib/examples.ts: real generated-code import paths, shared by the
// resource page, the data source page, and the provider home page's own
// "Get started" example -- one implementation, not three that could
// quietly diverge (UBI-240 slice 2's own "one implementation, not two"
// discipline for lib/docs.ts's getResourceOrDataSource, applied again
// here). goModule defaults to every provider's own real, observed
// go.mod shape (github.com/ubiquex/ubx-sdk-<provider>/sdk/go) -- AWS is
// the one real exception (confirmed directly against its own
// sdk/go/go.mod, not assumed), recorded in config/providers.json rather
// than special-cased here by provider name.
export function goModuleFor(providerKey: string, goModule: string | undefined): string {
  return goModule ?? `github.com/ubiquex/ubx-sdk-${providerKey}/sdk/go`;
}

export type LanguageExamples = { go: string; typescript: string; python: string };

export function resourceExample(
  providerKey: string,
  goModule: string | undefined,
  service: string,
  localName: string,
  pascal: string,
): LanguageExamples {
  const base = goModuleFor(providerKey, goModule);
  return {
    go: `import "${base}/${providerKey}/${service}"

sdk.Resource(${service}.${pascal}, "example", ${service}.${pascal}Config{
	// ...
})
`,
    typescript: `import { ${pascal} } from "@ubx/sdk-${providerKey}/${service}";

resource(${pascal}, "example", {
  // ...
});
`,
    python: `from ubx.${providerKey}.${service}.${localName} import ${pascal}

resource(${pascal}, "example", {
    # ...
})
`,
  };
}

export function dataSourceExample(
  providerKey: string,
  goModule: string | undefined,
  service: string,
  localName: string,
  pascal: string,
): LanguageExamples {
  const base = goModuleFor(providerKey, goModule);
  return {
    go: `import "${base}/${providerKey}/data/${service}"

sdk.Data(${service}.${pascal}, "example", ${service}.${pascal}Lookup{
	// ...
})
`,
    typescript: `import { ${pascal} } from "@ubx/sdk-${providerKey}/data/${service}";

data(${pascal}, "example", {
  // ...
});
`,
    python: `from ubx.${providerKey}.data.${service}.${localName} import ${pascal}

data(${pascal}, "example", {
    # ...
})
`,
  };
}

// starterExample wraps resourceExample's own import + call shape in a
// full runnable program -- the provider home page's "Get started"
// section, generalized off slice 1/2's own hardcoded Kubernetes
// Namespace example. Real resource name and real import path, but the
// field body stays the same "// ..." placeholder every other example
// on the site uses, deliberately: fabricating a plausible-looking real
// field value here, generalized across arbitrary field types and three
// languages, risks generating something that reads as correct but
// isn't -- worse than an honest placeholder.
export function starterExample(
  providerKey: string,
  goModule: string | undefined,
  service: string,
  localName: string,
  pascal: string,
): LanguageExamples {
  const base = goModuleFor(providerKey, goModule);
  return {
    go: `package main

import (
	sdk "github.com/ubiquex/ubx-sdk-go/runtime"
	"${base}/${providerKey}/${service}"
)

func main() {
	sdk.Main(sdk.Stack("platform", func() {
		sdk.Intent(sdk.IntentInfo{Summary: "a starter ${pascal.toLowerCase()}"})
		sdk.Resource(${service}.${pascal}, "example", ${service}.${pascal}Config{
			// ...
		})
	}))
}
`,
    typescript: `import { stack, resource, intent } from "@ubx/sdk";
import { ${pascal} } from "@ubx/sdk-${providerKey}/${service}";

stack("platform", () => {
  intent("a starter ${pascal.toLowerCase()}");
  resource(${pascal}, "example", {
    // ...
  });
});
`,
    python: `from ubx_sdk import stack, resource, intent
from ubx.${providerKey}.${service}.${localName} import ${pascal}

stack("platform", lambda: [
    intent("a starter ${pascal.toLowerCase()}"),
    resource(${pascal}, "example", {
        # ...
    }),
])
`,
  };
}
