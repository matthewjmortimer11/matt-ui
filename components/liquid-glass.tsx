"use client";

/**
 * LiquidGlass — interactive liquid-glass surface for React.
 *
 * Techniques (reverse-engineered from Kokonut UI, then extended):
 * - feTurbulence → feDisplacementMap applied via backdrop-filter: url(#id)
 *   warps whatever renders BEHIND the element (Chromium; degrades to frosted
 *   blur elsewhere).
 * - Velocity-reactive displacement: pointer speed surges the map's `scale`,
 *   which decays back to rest. SVG filter attributes are live — updating them
 *   re-renders every backdrop that references the filter.
 * - Living turbulence: baseFrequency breathes asymmetrically so the glass
 *   writhes subtly even at rest.
 * - Cursor rim light: conic-gradient masked to a hairline ring, rotated via
 *   atan2 so the bright edge always faces the cursor.
 * - Specular highlight + 3D tilt with parallax content (translateZ).
 *
 * Zero dependencies — drops into any React 18+ project, Tailwind or not.
 */

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type ButtonHTMLAttributes,
} from "react";

/* ---------------------------------- filter ---------------------------------- */

interface GlassFilterHandles {
  turbulence: SVGFETurbulenceElement | null;
  displacement: SVGFEDisplacementMapElement | null;
}

function GlassFilter({
  id,
  scale,
  handles,
}: {
  id: string;
  scale: number;
  handles?: React.MutableRefObject<GlassFilterHandles>;
}) {
  return (
    <svg style={{ position: "absolute", width: 0, height: 0 }} aria-hidden="true">
      <defs>
        <filter id={id} x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
          <feTurbulence
            ref={(el) => {
              if (handles) handles.current.turbulence = el;
            }}
            type="fractalNoise"
            baseFrequency="0.05 0.05"
            numOctaves={1}
            seed={3}
            result="noise"
          />
          <feGaussianBlur in="noise" stdDeviation={2} result="soft" />
          <feDisplacementMap
            ref={(el) => {
              if (handles) handles.current.displacement = el;
            }}
            in="SourceGraphic"
            in2="soft"
            scale={scale}
            xChannelSelector="R"
            yChannelSelector="B"
            result="displaced"
          />
          <feGaussianBlur in="displaced" stdDeviation={3} />
        </filter>
      </defs>
    </svg>
  );
}

/* ------------------------------- shared styles ------------------------------ */

const rimStyle = (radius: string): CSSProperties => ({
  position: "absolute",
  inset: 0,
  borderRadius: radius,
  padding: 1.5,
  background: `conic-gradient(
    from var(--lg-angle, 135deg),
    rgba(255,255,255,0.95) 0deg,
    rgba(255,255,255,0.12) 70deg,
    rgba(255,255,255,0.35) 180deg,
    rgba(255,255,255,0.12) 290deg,
    rgba(255,255,255,0.95) 360deg
  )`,
  WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
  WebkitMaskComposite: "xor",
  mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
  maskComposite: "exclude",
  pointerEvents: "none",
});

const specStyle = (radius: string): CSSProperties => ({
  position: "absolute",
  inset: 0,
  borderRadius: radius,
  background: `radial-gradient(
    240px circle at var(--lg-mx, 50%) var(--lg-my, 50%),
    rgba(255,255,255,0.14),
    rgba(255,255,255,0.045) 40%,
    transparent 65%
  )`,
  opacity: "var(--lg-spec, 0)" as unknown as number,
  transition: "opacity 0.35s ease",
  pointerEvents: "none",
});

/* --------------------------------- component -------------------------------- */

export interface LiquidGlassProps extends HTMLAttributes<HTMLDivElement> {
  /** Velocity surge + tilt + cursor rim light. Default true. */
  interactive?: boolean;
  /** Resting displacement scale. Default 18. */
  baseScale?: number;
  /** Displacement cap during a fast swipe. Default 140. */
  maxScale?: number;
  /** Max tilt in degrees (0 disables tilt). Default 10. */
  maxTilt?: number;
  /** Corner radius. Default "26px". */
  radius?: string;
  /** Lift content above the glass plane for parallax. Default 34 (px). */
  parallax?: number;
}

export function LiquidGlass({
  interactive = true,
  baseScale = 18,
  maxScale = 140,
  maxTilt = 10,
  radius = "26px",
  parallax = 34,
  children,
  style,
  ...props
}: LiquidGlassProps) {
  const filterId = `lg-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
  const cardRef = useRef<HTMLDivElement>(null);
  const filterHandles = useRef<GlassFilterHandles>({ turbulence: null, displacement: null });

  // Mutable physics state — lives outside React renders entirely.
  const phys = useRef({
    dispScale: baseScale,
    dispTarget: baseScale,
    velocity: 0,
    rx: 0, ry: 0, rxT: 0, ryT: 0,
    lastX: null as number | null,
    lastY: null as number | null,
    t: 0,
  });

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const p = phys.current;

    const onMove = (e: PointerEvent) => {
      if (!interactive) return;
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;

      if (p.lastX !== null && p.lastY !== null) {
        const v = Math.hypot(e.clientX - p.lastX, e.clientY - p.lastY);
        p.velocity = p.velocity * 0.8 + v * 0.2;
        p.dispTarget = Math.min(maxScale, baseScale + p.velocity * 4);
      }
      p.lastX = e.clientX;
      p.lastY = e.clientY;

      p.rxT = Math.max(-maxTilt, Math.min(maxTilt, (0.5 - py) * maxTilt));
      p.ryT = Math.max(-maxTilt * 1.2, Math.min(maxTilt * 1.2, (px - 0.5) * maxTilt * 1.2));

      card.style.setProperty("--lg-mx", `${px * 100}%`);
      card.style.setProperty("--lg-my", `${py * 100}%`);
      card.style.setProperty("--lg-spec", "1");

      // conic-gradient 0deg = up, clockwise; atan2 from center → light faces cursor
      const deg = Math.atan2(px - 0.5, -(py - 0.5)) * (180 / Math.PI);
      card.style.setProperty("--lg-angle", `${deg}deg`);
    };

    const onLeave = () => {
      p.lastX = p.lastY = null;
      p.rxT = p.ryT = 0;
      p.dispTarget = baseScale;
      card.style.setProperty("--lg-angle", "135deg");
      card.style.setProperty("--lg-spec", "0");
    };

    card.addEventListener("pointermove", onMove);
    card.addEventListener("pointerleave", onLeave);

    let raf = 0;
    let frame = 0;
    const tick = () => {
      frame++;
      p.t += 0.016;

      // decay surge toward rest; inputs only ever set targets
      p.dispTarget += (baseScale - p.dispTarget) * 0.03;
      p.velocity *= 0.92;
      p.dispScale += (p.dispTarget - p.dispScale) * 0.12;
      p.rx += (p.rxT - p.rx) * 0.1;
      p.ry += (p.ryT - p.ry) * 0.1;

      card.style.transform =
        maxTilt > 0
          ? `perspective(1100px) rotateX(${p.rx.toFixed(2)}deg) rotateY(${p.ry.toFixed(2)}deg)`
          : "";

      // filter regeneration is the expensive bit — 30Hz is imperceptible
      if (frame % 2 === 0) {
        filterHandles.current.displacement?.setAttribute("scale", p.dispScale.toFixed(1));
        if (!reduceMotion) {
          const bfx = 0.05 + Math.sin(p.t * 0.7) * 0.006;
          const bfy = 0.05 + Math.cos(p.t * 0.9) * 0.006;
          filterHandles.current.turbulence?.setAttribute(
            "baseFrequency",
            `${bfx.toFixed(4)} ${bfy.toFixed(4)}`
          );
        }
      }
      raf = requestAnimationFrame(tick);
    };

    if (!reduceMotion || interactive) raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      card.removeEventListener("pointermove", onMove);
      card.removeEventListener("pointerleave", onLeave);
    };
  }, [interactive, baseScale, maxScale, maxTilt]);

  return (
    <>
      <div
        ref={cardRef}
        style={{
          position: "relative",
          borderRadius: radius,
          background: "rgba(255,255,255,0.055)",
          backdropFilter: `blur(1.5px) url("#${filterId}") saturate(1.25) brightness(1.05)`,
          WebkitBackdropFilter: `blur(1.5px) url("#${filterId}") saturate(1.25) brightness(1.05)`,
          boxShadow: [
            "0 2px 6px rgba(0,0,0,0.2)",
            "0 16px 40px -12px rgba(0,0,0,0.5)",
            "inset 0 0 6px 6px rgba(255,255,255,0.09)",
            "inset 0 0 2px 2px rgba(255,255,255,0.05)",
          ].join(", "),
          transformStyle: "preserve-3d",
          willChange: "transform",
          touchAction: "none",
          ...style,
        }}
        {...props}
      >
        <div style={rimStyle(radius)} />
        <div style={specStyle(radius)} />
        <div style={{ position: "relative", transform: `translateZ(${parallax}px)` }}>
          {children}
        </div>
      </div>
      <GlassFilter id={filterId} scale={baseScale} handles={filterHandles} />
    </>
  );
}

/* ---------------------------------- button ---------------------------------- */

export interface LiquidButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Resting displacement. Default 70 (small surfaces want more wobble). */
  baseScale?: number;
  /** Displacement while pressed. Default 160. */
  pressScale?: number;
}

export function LiquidButton({
  baseScale = 70,
  pressScale = 160,
  children,
  style,
  ...props
}: LiquidButtonProps) {
  const filterId = `lgb-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
  const handles = useRef<GlassFilterHandles>({ turbulence: null, displacement: null });
  const target = useRef(baseScale);
  const current = useRef(baseScale);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      current.current += (target.current - current.current) * 0.18;
      handles.current.displacement?.setAttribute("scale", current.current.toFixed(1));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      <button
        onPointerDown={() => (target.current = pressScale)}
        onPointerUp={() => (target.current = baseScale)}
        onPointerLeave={() => (target.current = baseScale)}
        style={{
          position: "relative",
          padding: "10px 24px",
          border: "none",
          borderRadius: 999,
          background: "rgba(255,255,255,0.08)",
          backdropFilter: `url("#${filterId}")`,
          WebkitBackdropFilter: `url("#${filterId}")`,
          color: "inherit",
          font: "inherit",
          fontWeight: 500,
          cursor: "pointer",
          boxShadow: [
            "inset 3px 3px 0.5px -3.5px rgba(255,255,255,0.09)",
            "inset -3px -3px 0.5px -3.5px rgba(255,255,255,0.85)",
            "inset 1px 1px 1px -0.5px rgba(255,255,255,0.6)",
            "inset -1px -1px 1px -0.5px rgba(255,255,255,0.6)",
            "inset 0 0 6px 6px rgba(255,255,255,0.12)",
            "0 0 12px rgba(0,0,0,0.15)",
          ].join(", "),
          transition: "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
          ...style,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.06)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.94)")}
        onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1.06)")}
        {...props}
      >
        {children}
      </button>
      <GlassFilter id={filterId} scale={baseScale} handles={handles} />
    </>
  );
}
