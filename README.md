# matt-ui

A tiny [shadcn-style component registry](https://ui.shadcn.com/docs/registry). Live demo: **[matthewjmortimer11.github.io/matt-ui](https://matthewjmortimer11.github.io/matt-ui)**

## Components

### Liquid Glass

Interactive liquid-glass surface for React — velocity-reactive SVG displacement, cursor-tracking rim light, specular highlight, 3D tilt, and living turbulence. Zero dependencies; works with or without Tailwind.

```bash
npx shadcn@latest add https://matthewjmortimer11.github.io/matt-ui/r/liquid-glass.json
```

```tsx
import { LiquidGlass, LiquidButton } from "@/components/liquid-glass";

<LiquidGlass maxScale={140} maxTilt={10} radius="26px">
  ...content
</LiquidGlass>

<LiquidGlass interactive={false} maxTilt={0}>calm variant</LiquidGlass>
<LiquidButton pressScale={160}>Press for surge</LiquidButton>
```

| Prop | Default | Does |
|---|---|---|
| `interactive` | `true` | velocity surge + tilt + cursor rim light |
| `baseScale` / `maxScale` | 18 / 140 | resting vs full-churn displacement |
| `maxTilt` | 10 | tilt degrees, `0` disables |
| `radius`, `parallax` | `"26px"`, 34 | corner radius, content lift (px) |

**Browser note:** the liquid displacement (`backdrop-filter: url(#svg-filter)`) is Chromium-only. Safari and Firefox degrade gracefully to frosted glass.

### Card Flip

3D flip card — `perspective` + `preserve-3d` + `backface-visibility`, staggered content cascade on the back face, accent-colored orb animation on the front. Flips on hover, tap, and keyboard (Enter/Space). Zero dependencies.

```bash
npx shadcn@latest add https://matthewjmortimer11.github.io/matt-ui/r/card-flip.json
```

```tsx
import { CardFlip } from "@/components/card-flip";

<CardFlip
  title="Design Systems"
  subtitle="Hover or tap to flip"
  description="Dive into modern UI/UX."
  features={["UI/UX", "Modern Design", "Zero deps"]}
  accent="#34d399"          // any CSS color — drives glow, icons, hover
  actionLabel="Start today"
  onAction={() => {}}
/>
```

| Prop | Default | Does |
|---|---|---|
| `title` / `subtitle` | — | front face text |
| `description` / `features` | — | back face text + staggered list |
| `accent` | `"#f97316"` | any CSS color for glow/icons/hover |
| `actionLabel` / `onAction` | `"Start today"` | back-face action row |
| `width` / `height` | 280 / 320 | card size |

## Namespace install

Add to your project's `components.json`:

```json
"registries": { "@matt-ui": "https://matthewjmortimer11.github.io/matt-ui/r/{name}.json" }
```

then:

```bash
npx shadcn@latest add @matt-ui/liquid-glass
```

## Development

Component source lives in `components/`. After editing, rebuild the registry:

```bash
node build-registry.mjs
```

## Credits

Techniques reverse-engineered from [Kokonut UI](https://kokonutui.com) (MIT), then extended with interactive physics.
