// Builds the shadcn registry items for matt-ui.
// Run: node build-registry.mjs   →  writes r/*.json
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const HOMEPAGE = "https://matthewjmortimer11.github.io/matt-ui";

const source = readFileSync("components/liquid-glass.tsx", "utf8");

const item = {
  $schema: "https://ui.shadcn.com/schema/registry-item.json",
  name: "liquid-glass",
  type: "registry:component",
  title: "Liquid Glass",
  description:
    "Interactive liquid-glass surface: velocity-reactive SVG displacement, cursor rim light, specular highlight, 3D tilt, living turbulence. Zero dependencies. Chromium gets full displacement; other browsers degrade to frosted glass.",
  author: "matthewjmortimer11 (techniques studied from Kokonut UI, MIT)",
  dependencies: [],
  registryDependencies: [],
  files: [
    {
      path: "components/liquid-glass.tsx",
      type: "registry:component",
      content: source,
    },
  ],
};

mkdirSync("r", { recursive: true });
writeFileSync("r/liquid-glass.json", JSON.stringify(item, null, 2));

const index = {
  $schema: "https://ui.shadcn.com/schema/registry.json",
  name: "matt-ui",
  homepage: HOMEPAGE,
  items: [
    {
      name: item.name,
      type: item.type,
      title: item.title,
      description: item.description,
      files: [{ path: item.files[0].path, type: item.files[0].type }],
    },
  ],
};
writeFileSync("r/registry.json", JSON.stringify(index, null, 2));

console.log(`built r/liquid-glass.json (${source.length} bytes of source embedded)`);
