#!/usr/bin/env node
// build-examples.mjs: real, complete, runnable example programs -- a
// faithful port of ubiquex-docs' own real generator
// (scripts/resource-reference-gen/gen_provider_docs.py's
// build_resource_page_complete and gen_data_source_pages.py's
// build_data_source_page), the reference this site's examples must
// match, per the founder's own explicit instruction to read that
// generator rather than reconstruct it from scratch. Runs after
// fetch-docs.mjs in the prebuild step, reads .docs-cache/ same as
// every other build script, writes .docs-cache/<provider>/<version>/
// examples.json (one file per version, keyed by wireType) for
// lib/examples.ts to read at page-render time -- generation happens
// exactly once per build, not once per page.
//
// Two real, disclosed gaps against the reference, both accepted
// explicitly by the founder rather than silently approximated:
//
// 1. Python nested-object class names. The reference's own real
//    generator resolves these against _PY_NESTED_FIELD_MAP, ground
//    truth read directly out of the real generated .py source per SDK
//    repo by extract_idents.py's own parse_nested_fields -- data this
//    site's docs artifact (docs.tar.gz: schema + descriptions/
//    categories/exclusions/intros) does not carry at all. This port
//    reconstructs a class name by path convention instead
//    (pyClassNameForPath, below) -- the reference's own doc comment
//    explicitly calls this convention "only matches by coincidence"
//    against its real dedup algorithm. Accepted as a real, disclosed
//    approximation, not a bug to chase further -- closing it for real
//    means extending each of the 7 SDK repos' own publish workflow to
//    emit ident data into the docs artifact, out of scope here.
//
// 2. Go/TS import paths. The reference resolves a real per-file import
//    path from real ident data (go["service_dir"], go["package"],
//    ts["file"], keyword-escaped where the real generated source needs
//    it). This site has never had that data for ANY example (see the
//    prior goModuleFor/resourceExample this file replaces) -- kept as
//    the same real, working, already-shipped construction
//    (<goModule>/<provider>/<service>, @ubx/sdk-<provider>/<service>),
//    not a new risk this pass introduces.
//
// What IS ported faithfully: real field selection (pickRicherExampleFields,
// MAX_RICH_FIELDS-budgeted optional extras), real per-field literal
// heuristics (JSON trust/access policy preambles, arn/duration/path/
// description name-pattern detection, recursive list/set/map/object
// literal construction), the real full-program shape (package main/
// import/func main/ubx.Main/ubx.Stack/ubx.Intent for Go; stack()/
// intent()/resource() for TypeScript; describe()/ubx.run() for
// Python), and -- for Go and TypeScript specifically, matching the
// reference's own real gofmt_lines/deno_fmt_lines -- real gofmt/deno
// fmt verification. Batched (one gofmt invocation, one deno fmt
// invocation, across every example in the whole build) rather than
// once per page: the reference runs per-page because it's a one-off
// content-authoring script: run once per resource, ever. This site
// regenerates on every build (every `next dev`, every CI deploy), so
// thousands of individual subprocess spawns per build would be a real,
// separate cost the reference never had to pay -- gofmt and deno fmt
// both format an entire directory tree in one process, used here as a
// single real verification pass over the whole site's own examples.
// Python has no equivalent real-toolchain verification step in the
// reference either (gen_provider_docs.py never runs black/ruff on its
// own py_lines) -- matched here by not inventing one.

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const cacheRoot = join(repoRoot, ".docs-cache");
const configPath = join(repoRoot, "config", "providers.json");

const KIND_SCALAR = 1, KIND_LIST = 2, KIND_SET = 3, KIND_MAP = 4, KIND_OBJECT = 5;
const SCALAR_STRING = 1, SCALAR_NUMBER = 2, SCALAR_BOOL = 3;
const MAX_RICH_FIELDS = 8;

// --- name helpers, matching gen_provider_docs.py's own pascal/camel/
// python_identifier exactly, including Python str.capitalize()'s real
// "first char up, REST down" semantics (not just "first char up") ---
const PYTHON_KEYWORDS = new Set([
  "and", "as", "assert", "async", "await", "break", "class", "continue", "def", "del",
  "elif", "else", "except", "finally", "for", "from", "global", "if", "import", "in",
  "is", "lambda", "nonlocal", "not", "or", "pass", "raise", "return", "try", "while",
  "with", "yield",
]);

function pythonIdentifier(wire) {
  return PYTHON_KEYWORDS.has(wire) ? wire + "_" : wire;
}

function pyCapitalize(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function pascal(wire) {
  return wire.split("_").filter(Boolean).map(pyCapitalize).join("");
}

function camel(wire) {
  const parts = wire.split("_").filter(Boolean);
  if (parts.length === 0) return wire;
  return parts[0] + parts.slice(1).map(pyCapitalize).join("");
}

function byWireName(a, b) {
  return a.WireName < b.WireName ? -1 : a.WireName > b.WireName ? 1 : 0;
}

function effOptional(f) {
  const allFalse = !f.Required && !f.Optional && !f.Computed;
  return f.Optional || allFalse;
}

// --- field selection, matching pick_richer_example_fields /
// pick_inner_example_fields exactly ---
function pickRicherExampleFields(fields) {
  const required = fields.filter((f) => f.Required).sort(byWireName);
  const nameField = fields.filter((f) => f.WireName === "name" && f.Optional && !f.Required);
  const optionalPure = fields
    .filter((f) => f.Optional && !f.Computed && !f.Required && f.WireName !== "name")
    .sort(byWireName);
  const extra = [...nameField, ...optionalPure];
  const budget = Math.max(0, MAX_RICH_FIELDS - required.length);
  const picked = [...required, ...extra.slice(0, budget)];
  if (picked.length) return picked;
  if (fields.length) return [[...fields].sort(byWireName)[0]];
  return [];
}

function pickInnerExampleFields(innerFields) {
  const settable = innerFields.filter((f) => f.Required || effOptional(f));
  if (!settable.length) return [];
  const required = settable.filter((f) => f.Required).sort(byWireName);
  if (required.length) return required;
  const byName = settable.find((f) => f.WireName === "name");
  if (byName) return [byName];
  return [[...settable].sort(byWireName)[0]];
}

// --- name-pattern heuristics, matching is_json_policy_field etc. exactly ---
const isJsonPolicyField = (wire) => wire === "assume_role_policy";
const isGenericPolicyField = (wire) => wire === "policy";
const isArnLikeField = (wire) => wire.endsWith("_arn") || wire === "arn" || wire === "permissions_boundary";
const isDurationField = (wire) => wire.includes("seconds") || wire.includes("duration");
const isPathField = (wire) => wire === "path";
const isDescriptionField = (wire) => wire === "description";

const TRUST_POLICY_PREAMBLE_GO = `trustPolicy, _ := json.Marshal(map[string]any{
	"Version": "2012-10-17",
	"Statement": []map[string]any{{
		"Effect":    "Allow",
		"Principal": map[string]string{"Service": "ec2.amazonaws.com"},
		"Action":    "sts:AssumeRole",
	}},
})`;
const TRUST_POLICY_PREAMBLE_TS = `const trustPolicy = JSON.stringify({
  Version: "2012-10-17",
  Statement: [{
    Effect: "Allow",
    Principal: { Service: "ec2.amazonaws.com" },
    Action: "sts:AssumeRole",
  }],
});`;
const TRUST_POLICY_PREAMBLE_PY = `trust_policy = json.dumps({
    "Version": "2012-10-17",
    "Statement": [{
        "Effect": "Allow",
        "Principal": {"Service": "ec2.amazonaws.com"},
        "Action": "sts:AssumeRole",
    }],
})`;
const ACCESS_POLICY_PREAMBLE_GO = `accessPolicy, _ := json.Marshal(map[string]any{
	"Version": "2012-10-17",
	"Statement": []map[string]any{{
		"Effect":   "Allow",
		"Action":   "*",
		"Resource": "*",
	}},
})`;
const ACCESS_POLICY_PREAMBLE_TS = `const accessPolicy = JSON.stringify({
  Version: "2012-10-17",
  Statement: [{
    Effect: "Allow",
    Action: "*",
    Resource: "*",
  }],
});`;
const ACCESS_POLICY_PREAMBLE_PY = `access_policy = json.dumps({
    "Version": "2012-10-17",
    "Statement": [{
        "Effect": "Allow",
        "Action": "*",
        "Resource": "*",
    }],
})`;

// --- literal construction, matching literal_go/literal_ts/literal_py
// plus _scalar_element_literal/_object_literal exactly. Python nested-
// object naming is the one real, disclosed approximation (see the file
// header) -- pyPathStack/pyNestedClassesUsed/pyBindingPascal are module
// state cleared per resource, mirroring the reference's own
// _PY_PATH_STACK/_PY_NESTED_CLASSES_USED globals exactly. ---
let pyPathStack = [];
let pyNestedClassesUsed = [];
let pyBindingPascal = "";

function pyClassNameForPath(wire) {
  return [pyBindingPascal, ...pyPathStack, wire].map(pascal).join("_");
}

function pyClassLiteral(className, innerFields) {
  if (!pyNestedClassesUsed.includes(className)) pyNestedClassesUsed.push(className);
  if (!innerFields.length) return `${className}()`;
  const pairs = innerFields.map((i) => `${pythonIdentifier(i.WireName)}=${literalPy(i)}`).join(", ");
  return `${className}(${pairs})`;
}

function scalarElementLiteral(scalarKind, lang) {
  if (scalarKind === SCALAR_NUMBER) return "1";
  if (scalarKind === SCALAR_BOOL) return lang === "py" ? "True" : "true";
  return '"example"';
}

function objectLiteral(innerFields, renderOne, lang) {
  if (!innerFields.length) return lang === "go" ? "map[string]any{}" : "{}";
  if (lang === "go") {
    const pairs = innerFields.map((i) => `"${i.WireName}": ${renderOne(i)}`).join(", ");
    return `map[string]any{${pairs}}`;
  }
  if (lang === "ts") {
    const pairs = innerFields.map((i) => `${camel(i.WireName)}: ${renderOne(i)}`).join(", ");
    return `{ ${pairs} }`;
  }
  const pairs = innerFields.map((i) => `"${i.WireName}": ${renderOne(i)}`).join(", ");
  return `{${pairs}}`;
}

function literalGo(f) {
  const t = f.Type, wire = f.WireName;
  if (t.Kind === KIND_SCALAR) {
    const s = t.Scalar;
    if (s === SCALAR_STRING) {
      if (wire === "name" || wire.endsWith("_name")) return `"example-${wire.replace(/_/g, "-")}"`;
      return '"example"';
    }
    if (s === SCALAR_NUMBER) return "1";
    if (s === SCALAR_BOOL) return "true";
    return '"example"';
  }
  if (t.Kind === KIND_LIST || t.Kind === KIND_SET) {
    const el = t.Element;
    if (el.Kind === KIND_SCALAR) {
      if (el.Scalar === SCALAR_STRING) return '[]string{"example"}';
      return `[]any{${scalarElementLiteral(el.Scalar, "go")}}`;
    }
    if (el.Kind === KIND_OBJECT) {
      const inner = pickInnerExampleFields(el.Object);
      const pairs = inner.map((i) => `"${i.WireName}": ${literalGo(i)}`).join(", ");
      return `[]map[string]any{{${pairs}}}`;
    }
    return '[]string{"example"}';
  }
  if (t.Kind === KIND_MAP) {
    const el = t.Element;
    if (el.Kind === KIND_SCALAR && el.Scalar === SCALAR_STRING) return 'map[string]string{"key": "value"}';
    if (el.Kind === KIND_OBJECT) {
      const inner = pickInnerExampleFields(el.Object);
      const pairs = inner.map((i) => `"${i.WireName}": ${literalGo(i)}`).join(", ");
      return `map[string]any{"key": map[string]any{${pairs}}}`;
    }
    return 'map[string]any{"key": "value"}';
  }
  if (t.Kind === KIND_OBJECT) {
    const inner = pickInnerExampleFields(t.Object);
    return objectLiteral(inner, literalGo, "go");
  }
  return '"example"';
}

function literalTs(f) {
  const t = f.Type, wire = f.WireName;
  if (t.Kind === KIND_SCALAR) {
    const s = t.Scalar;
    if (s === SCALAR_STRING) {
      if (wire === "name" || wire.endsWith("_name")) return `"example-${wire.replace(/_/g, "-")}"`;
      return '"example"';
    }
    if (s === SCALAR_NUMBER) return "1";
    if (s === SCALAR_BOOL) return "true";
    return '"example"';
  }
  if (t.Kind === KIND_LIST || t.Kind === KIND_SET) {
    const el = t.Element;
    if (el.Kind === KIND_SCALAR) return `[${scalarElementLiteral(el.Scalar, "ts")}]`;
    if (el.Kind === KIND_OBJECT) {
      const inner = pickInnerExampleFields(el.Object);
      return `[${objectLiteral(inner, literalTs, "ts")}]`;
    }
    return '["example"]';
  }
  if (t.Kind === KIND_MAP) {
    const el = t.Element;
    if (el.Kind === KIND_OBJECT) {
      const inner = pickInnerExampleFields(el.Object);
      return `{ key: ${objectLiteral(inner, literalTs, "ts")} }`;
    }
    return '{ key: "value" }';
  }
  if (t.Kind === KIND_OBJECT) {
    const inner = pickInnerExampleFields(t.Object);
    return objectLiteral(inner, literalTs, "ts");
  }
  return '"example"';
}

function literalPy(f) {
  const t = f.Type, wire = f.WireName;
  if (t.Kind === KIND_SCALAR) {
    const s = t.Scalar;
    if (s === SCALAR_STRING) {
      if (wire === "name" || wire.endsWith("_name")) return `"example-${wire.replace(/_/g, "-")}"`;
      return '"example"';
    }
    if (s === SCALAR_NUMBER) return "1";
    if (s === SCALAR_BOOL) return "True";
    return '"example"';
  }
  if (t.Kind === KIND_LIST || t.Kind === KIND_SET) {
    const el = t.Element;
    if (el.Kind === KIND_SCALAR) return `[${scalarElementLiteral(el.Scalar, "py")}]`;
    if (el.Kind === KIND_OBJECT) {
      const className = pyClassNameForPath(wire);
      const inner = pickInnerExampleFields(el.Object);
      pyPathStack.push(wire);
      try {
        return `[${pyClassLiteral(className, inner)}]`;
      } finally {
        pyPathStack.pop();
      }
    }
    return '["example"]';
  }
  if (t.Kind === KIND_MAP) {
    const el = t.Element;
    if (el.Kind === KIND_OBJECT) {
      const className = pyClassNameForPath(wire);
      const inner = pickInnerExampleFields(el.Object);
      pyPathStack.push(wire);
      try {
        return `{"key": ${pyClassLiteral(className, inner)}}`;
      } finally {
        pyPathStack.pop();
      }
    }
    return '{"key": "value"}';
  }
  if (t.Kind === KIND_OBJECT) {
    const className = pyClassNameForPath(wire);
    const inner = pickInnerExampleFields(t.Object);
    pyPathStack.push(wire);
    try {
      return pyClassLiteral(className, inner);
    } finally {
      pyPathStack.pop();
    }
  }
  return '"example"';
}

// matching field_literal_with_preamble exactly
function fieldLiteralWithPreamble(f, lang) {
  const wire = f.WireName, t = f.Type;
  const isString = t.Kind === KIND_SCALAR && t.Scalar === SCALAR_STRING;
  const isNumber = t.Kind === KIND_SCALAR && t.Scalar === SCALAR_NUMBER;
  const isMap = t.Kind === KIND_MAP;

  if (isString && isJsonPolicyField(wire)) {
    if (lang === "go") return [TRUST_POLICY_PREAMBLE_GO, "string(trustPolicy)"];
    if (lang === "ts") return [TRUST_POLICY_PREAMBLE_TS, "trustPolicy"];
    return [TRUST_POLICY_PREAMBLE_PY, "trust_policy"];
  }
  if (isString && wire === "name") return [null, '"example"'];
  if (isString && isGenericPolicyField(wire)) {
    if (lang === "go") return [ACCESS_POLICY_PREAMBLE_GO, "string(accessPolicy)"];
    if (lang === "ts") return [ACCESS_POLICY_PREAMBLE_TS, "accessPolicy"];
    return [ACCESS_POLICY_PREAMBLE_PY, "access_policy"];
  }
  if (isString && isDescriptionField(wire)) return [null, '"Managed by ubx."'];
  if (isString && isArnLikeField(wire)) return [null, '"arn:aws:iam::123456789012:policy/example"'];
  if (isString && isPathField(wire)) return [null, '"/example/"'];
  if (isNumber && isDurationField(wire)) return [null, "7200"];
  if (isMap && t.Element.Kind === KIND_SCALAR) {
    if (lang === "go") return [null, 'map[string]string{"managed-by": "ubx"}'];
    if (lang === "ts") return [null, '{ "managed-by": "ubx" }'];
    return [null, '{"managed-by": "ubx"}'];
  }
  const fn = lang === "go" ? literalGo : lang === "ts" ? literalTs : literalPy;
  return [null, fn(f)];
}

function goModuleFor(providerKey, goModule) {
  return goModule ?? `github.com/ubiquex/ubx-sdk-${providerKey}/sdk/go`;
}

// A real, found-running-gofmt bug: several real AWS/Azure service dirs
// are literally named after a Go reserved word ("case", "default",
// "import", "package", "type", ...) -- used bare as the import alias
// and as the `<alias>.<Binding>` reference, that's a real Go syntax
// error, not a formatting nit (gofmt itself refused these with
// "expected operand, found 'case'" and similar). sdk/codegen's own real
// generated package names carry a trailing underscore for exactly this
// collision (see this file's header, gap 2) -- this site has no ident
// data to know the REAL escaped package name, so it escapes only the
// LOCAL alias this example itself declares, which is always valid Go
// regardless of what the real generated package is actually named.
const GO_KEYWORDS = new Set([
  "break", "case", "chan", "const", "continue", "default", "defer", "else",
  "fallthrough", "for", "func", "go", "goto", "if", "import", "interface",
  "map", "package", "range", "return", "select", "struct", "switch", "type", "var",
]);

function goSafeAlias(service) {
  return GO_KEYWORDS.has(service) ? `${service}_` : service;
}

// --- full-program builders, matching build_resource_page_complete /
// build_data_source_page's own real shape exactly (imports, ubx.Main/
// ubx.Stack/ubx.Intent, stack()/intent()/resource(), describe()/
// ubx.run()) -- see the file header for the two disclosed gaps
// (Python nested class names, Go/TS import paths). ---
function buildResourceRaw({ providerKey, goModule, service, localName, pascalName, fields }) {
  const stackName = "example";
  const intentSummary = `${stackName} own ${localName.replace(/_/g, " ")}`;
  const exampleFields = pickRicherExampleFields(fields);

  const goPreambles = [], goAssigns = [];
  for (const f of exampleFields) {
    const [pre, val] = fieldLiteralWithPreamble(f, "go");
    if (pre && !goPreambles.includes(pre)) goPreambles.push(pre);
    goAssigns.push(`\t\t\t${pascal(f.WireName)}: ${val},`);
  }
  const needsJson = goPreambles.some((p) => p.includes("json.Marshal("));
  const goAlias = goSafeAlias(service);
  const goImportPath = `${goModuleFor(providerKey, goModule)}/${providerKey}/${service}`;
  const goLines = ["package main", "", "import ("];
  if (needsJson) goLines.push('\t"encoding/json"', "");
  goLines.push(`\tubx "github.com/ubiquex/ubx-sdk-go/runtime"`);
  goLines.push(`\t${goAlias} "${goImportPath}"`);
  goLines.push(")", "", "func main() {");
  goLines.push(`\tubx.Main(ubx.Stack(${JSON.stringify(stackName)}, func() {`);
  goLines.push(`\t\tubx.Intent(ubx.IntentInfo{Summary: ${JSON.stringify(intentSummary)}})`);
  for (const pre of goPreambles) {
    goLines.push("", "\t\t" + pre.replace(/\n/g, "\n\t\t"));
  }
  goLines.push("");
  goLines.push(`\t\tubx.Resource(${goAlias}.${pascalName}, "example", ${goAlias}.${pascalName}Config{`);
  goLines.push(...goAssigns);
  goLines.push("\t\t})", "\t}))", "}");

  const tsPreambles = [], tsAssigns = [];
  for (const f of exampleFields) {
    const [pre, val] = fieldLiteralWithPreamble(f, "ts");
    if (pre && !tsPreambles.includes(pre)) tsPreambles.push(pre);
    tsAssigns.push(`    ${camel(f.WireName)}: ${val},`);
  }
  const tsImportPath = `@ubx/sdk-${providerKey}/${service}`;
  const tsLines = [
    'import { intent, resource, stack } from "@ubx/sdk";',
    `import { ${pascalName} } from "${tsImportPath}";`,
    "",
    `export default stack(${JSON.stringify(stackName)}, () => {`,
    `  intent({ summary: ${JSON.stringify(intentSummary)} });`,
  ];
  for (const pre of tsPreambles) {
    tsLines.push("", "  " + pre.replace(/\n/g, "\n  "));
  }
  tsLines.push("");
  tsLines.push(`  resource(${pascalName}, "example", {`);
  tsLines.push(...tsAssigns);
  tsLines.push("  });", "});");

  pyPathStack = [];
  pyNestedClassesUsed = [];
  pyBindingPascal = pascalName;
  const pyPreambles = [], pyAssigns = [];
  for (const f of exampleFields) {
    const [pre, val] = fieldLiteralWithPreamble(f, "py");
    if (pre && !pyPreambles.includes(pre)) pyPreambles.push(pre);
    pyAssigns.push(`        ${pythonIdentifier(f.WireName)}=${val},`);
  }
  const needsJsonPy = pyPreambles.some((p) => p.includes("json.dumps("));
  const pyImportPath = `ubx.${providerKey}.${service}.${localName}`;
  const pyLines = [];
  if (needsJsonPy) pyLines.push("import json");
  pyLines.push("import ubx_sdk as ubx");
  pyLines.push(`from ${pyImportPath} import ${pascalName}, ${pascalName}Config`);
  if (pyNestedClassesUsed.length) pyLines.push(`from ${pyImportPath} import ${pyNestedClassesUsed.join(", ")}`);
  pyLines.push("", "def describe():");
  pyLines.push(`    ubx.intent(${JSON.stringify(intentSummary)})`);
  for (const pre of pyPreambles) {
    pyLines.push("", "    " + pre.replace(/\n/g, "\n    "));
  }
  pyLines.push("");
  pyLines.push(`    ubx.resource(${pascalName}, "example", ${pascalName}Config(`);
  pyLines.push(...pyAssigns);
  pyLines.push("    ))", "");
  pyLines.push('if __name__ == "__main__":');
  pyLines.push(`    ubx.run(${JSON.stringify(stackName)}, describe)`);

  return { go: goLines.join("\n"), ts: tsLines.join("\n"), python: pyLines.join("\n") };
}

function buildDataSourceRaw({ providerKey, goModule, service, localName, pascalName, wireType, fields }) {
  const lookupFields = fields.filter((f) => f.Required || !f.Computed).sort(byWireName);
  const exampleFields = pickRicherExampleFields(lookupFields);
  const intentSummary = `look up ${wireType}`;

  const goPreambles = [], goAssigns = [];
  for (const f of exampleFields) {
    const [pre, val] = fieldLiteralWithPreamble(f, "go");
    if (pre && !goPreambles.includes(pre)) goPreambles.push(pre);
    goAssigns.push(`\t\t\t${pascal(f.WireName)}: ${val},`);
  }
  const goAlias = goSafeAlias(service);
  const goImportPath = `${goModuleFor(providerKey, goModule)}/${providerKey}/data/${service}`;
  const goLines = [
    "package main", "", "import (",
    `\t${goAlias} "${goImportPath}"`,
    `\tubx "github.com/ubiquex/ubx-sdk-go/runtime"`,
    ")", "", "func main() {",
    '\tubx.Main(ubx.Stack("example", func() {',
    `\t\tubx.Intent(ubx.IntentInfo{Summary: ${JSON.stringify(intentSummary)}})`,
  ];
  for (const pre of goPreambles) {
    goLines.push("", "\t\t" + pre.replace(/\n/g, "\n\t\t"));
  }
  goLines.push("");
  goLines.push(`\t\tubx.Data(${goAlias}.${pascalName}, "example", ${goAlias}.${pascalName}Config{`);
  goLines.push(...goAssigns);
  goLines.push("\t\t})", "\t}))", "}");

  const tsPreambles = [], tsAssigns = [];
  for (const f of exampleFields) {
    const [pre, val] = fieldLiteralWithPreamble(f, "ts");
    if (pre && !tsPreambles.includes(pre)) tsPreambles.push(pre);
    tsAssigns.push(`    ${camel(f.WireName)}: ${val},`);
  }
  const tsImportPath = `@ubx/sdk-${providerKey}/data/${service}`;
  const tsLines = [
    'import { data, intent, stack } from "@ubx/sdk";',
    `import { ${pascalName} } from "${tsImportPath}";`,
    "",
    'export default stack("example", () => {',
    `  intent({ summary: ${JSON.stringify(intentSummary)} });`,
  ];
  for (const pre of tsPreambles) {
    tsLines.push("", "  " + pre.replace(/\n/g, "\n  "));
  }
  tsLines.push("");
  tsLines.push(`  data(${pascalName}, "example", {`);
  tsLines.push(...tsAssigns);
  tsLines.push("  });", "});");

  pyPathStack = [];
  pyNestedClassesUsed = [];
  pyBindingPascal = pascalName;
  const pyPreambles = [], pyAssigns = [];
  for (const f of exampleFields) {
    const [pre, val] = fieldLiteralWithPreamble(f, "py");
    if (pre && !pyPreambles.includes(pre)) pyPreambles.push(pre);
    pyAssigns.push(`        ${pythonIdentifier(f.WireName)}=${val},`);
  }
  const needsJsonPy = pyPreambles.some((p) => p.includes("json.dumps("));
  const pyImportPath = `ubx.${providerKey}.data.${service}.${localName}`;
  const pyLines = [];
  if (needsJsonPy) pyLines.push("import json");
  pyLines.push("import ubx_sdk as ubx");
  pyLines.push(`from ${pyImportPath} import ${pascalName}, ${pascalName}Config`);
  if (pyNestedClassesUsed.length) pyLines.push(`from ${pyImportPath} import ${pyNestedClassesUsed.join(", ")}`);
  pyLines.push("", "def describe():");
  pyLines.push(`    ubx.intent(${JSON.stringify(intentSummary)})`);
  for (const pre of pyPreambles) {
    pyLines.push("", "    " + pre.replace(/\n/g, "\n    "));
  }
  pyLines.push("");
  pyLines.push(`    ubx.data(${pascalName}, "example", ${pascalName}Config(`);
  pyLines.push(...pyAssigns);
  pyLines.push("    ))", "");
  pyLines.push('if __name__ == "__main__":');
  pyLines.push('    ubx.run("example", describe)');

  return { go: goLines.join("\n"), ts: tsLines.join("\n"), python: pyLines.join("\n") };
}

function pascalCase(localName) {
  return localName
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function versionDir(providerKey, version) {
  return join(cacheRoot, providerKey, version);
}

function listCachedVersions(providerKey) {
  const dir = join(cacheRoot, providerKey);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

// --- real gofmt/deno fmt verification, batched across the whole build
// (see file header for why) -- writes every raw Go/TS program to a
// scratch tree, formats the whole tree in one real subprocess call
// each, reads the results back. Any real syntax error fails the build
// loud, naming the exact file, matching the reference's own
// "raise RuntimeError" discipline rather than shipping a plausible-
// looking but unverified program. ---
function formatBatch(entries, ext, formatFn) {
  const scratch = mkdtempSync(join(tmpdir(), "ubx-docs-examples-"));
  const pathFor = (id) => join(scratch, `${id}.${ext}`);
  for (const [id, source] of entries) {
    writeFileSync(pathFor(id), source);
  }
  try {
    formatFn(scratch);
    const out = new Map();
    for (const [id] of entries) {
      out.set(id, readFileSync(pathFor(id), "utf8").replace(/\n$/, ""));
    }
    return out;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

function gofmtDir(dir) {
  try {
    execFileSync("gofmt", ["-w", dir], { stdio: ["ignore", "pipe", "pipe"] });
  } catch (err) {
    throw new Error(`gofmt rejected generated Go source in ${dir}:\n${err.stderr}`);
  }
}

function denoFmtDir(dir) {
  try {
    execFileSync("deno", ["fmt", "--ext", "ts", dir], { stdio: ["ignore", "pipe", "pipe"] });
  } catch (err) {
    throw new Error(`deno fmt rejected generated TS source in ${dir}:\n${err.stderr}`);
  }
}

function main() {
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const rawGo = [];
  const rawTs = [];
  // pyOut/versionOut accumulate directly (Python needs no formatter pass)
  const perVersionOut = new Map(); // "<provider>@<version>" -> { wireType: {go, ts, python} }
  const idByEntry = []; // [{key: "<provider>@<version>", wireType, kind}]

  for (const [providerKey, cfg] of Object.entries(config.providers)) {
    for (const version of listCachedVersions(providerKey)) {
      const schemaPath = join(versionDir(providerKey, version), "schema", "schema.json");
      if (!existsSync(schemaPath)) continue;
      const schemaIndex = JSON.parse(readFileSync(schemaPath, "utf8"));
      const key = `${providerKey}@${version}`;
      perVersionOut.set(key, {});

      for (const [wireType, entry] of Object.entries(schemaIndex)) {
        const isDataSource = wireType.startsWith("data_");
        const fieldsPath = join(versionDir(providerKey, version), "schema", `${wireType}.json`);
        const fields = JSON.parse(readFileSync(fieldsPath, "utf8"));
        const pascalName = pascalCase(entry.localName);
        const ctx = {
          providerKey,
          goModule: cfg.goModule,
          service: entry.service,
          localName: entry.localName,
          pascalName,
          wireType,
          fields,
        };
        const raw = isDataSource ? buildDataSourceRaw(ctx) : buildResourceRaw(ctx);
        const id = idByEntry.length;
        idByEntry.push({ key, wireType });
        rawGo.push([id, raw.go]);
        rawTs.push([id, raw.ts]);
        perVersionOut.get(key)[wireType] = { python: raw.python };
      }
    }
  }

  console.log(`[build-examples] ${idByEntry.length} resource/data-source example(s) generated, formatting...`);

  const formattedGo = formatBatch(rawGo, "go", gofmtDir);
  const formattedTs = formatBatch(rawTs, "ts", denoFmtDir);

  for (let id = 0; id < idByEntry.length; id++) {
    const { key, wireType } = idByEntry[id];
    const entry = perVersionOut.get(key)[wireType];
    entry.go = formattedGo.get(id);
    entry.typescript = formattedTs.get(id);
  }

  for (const [key, examples] of perVersionOut) {
    const [providerKey, version] = key.split("@");
    const outPath = join(versionDir(providerKey, version), "examples.json");
    writeFileSync(outPath, JSON.stringify(examples));
    console.log(`[build-examples] ${key}: ${Object.keys(examples).length} example(s) -> ${outPath}`);
  }
}

main();
