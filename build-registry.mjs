// Builds the shadcn registry items for matt-ui.
// Run: node build-registry.mjs   →  writes r/*.json
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const HOMEPAGE = "https://matthewjmortimer11.github.io/matt-ui";

const COMPONENTS = [
  {
    name: "liquid-glass",
    title: "Liquid Glass",
    description:
      "Interactive liquid-glass surface: velocity-reactive SVG displacement, cursor rim light, specular highlight, 3D tilt, living turbulence. Zero dependencies. Chromium gets full displacement; other browsers degrade to frosted glass.",
  },
  {
    name: "card-flip",
    title: "Card Flip",
    description:
      "3D flip card: perspective + preserve-3d + backface-visibility, staggered content cascade on the back face, accent-colored orb animation on the front. Hover, tap, and keyboard accessible. Zero dependencies.",
  },
  {
    name: "ai-voice",
    title: "AI Voice",
    description:
      "Voice-recording UI with a genuinely audio-reactive waveform: getUserMedia → AnalyserNode frequency data driving bar heights via rAF. Falls back to a demo signal without a mic, calms under prefers-reduced-motion. Zero dependencies.",
  },
];

mkdirSync("r", { recursive: true });

const indexItems = [];
for (const c of COMPONENTS) {
  const source = readFileSync(`components/${c.name}.tsx`, "utf8");
  const item = {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: c.name,
    type: "registry:component",
    title: c.title,
    description: c.description,
    author: "matthewjmortimer11 (techniques studied from Kokonut UI, MIT)",
    dependencies: [],
    registryDependencies: [],
    files: [
      { path: `components/${c.name}.tsx`, type: "registry:component", content: source },
    ],
  };
  writeFileSync(`r/${c.name}.json`, JSON.stringify(item, null, 2));
  indexItems.push({
    name: c.name,
    type: item.type,
    title: c.title,
    description: c.description,
    files: [{ path: item.files[0].path, type: "registry:component" }],
  });
  console.log(`built r/${c.name}.json (${source.length} bytes of source embedded)`);
}

const index = {
  $schema: "https://ui.shadcn.com/schema/registry.json",
  name: "matt-ui",
  homepage: HOMEPAGE,
  items: indexItems,
};
writeFileSync("r/registry.json", JSON.stringify(index, null, 2));
