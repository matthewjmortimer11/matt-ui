"use client";

/**
 * CardFlip — 3D flip card for React.
 *
 * Technique (studied from Kokonut UI, rebuilt dependency-free):
 * - perspective on the container, preserve-3d on an inner wrapper that
 *   rotates 180° on hover/tap, two faces with backface-visibility: hidden
 *   (the back pre-rotated 180°). Face opacity toggles too, which kills
 *   backface shimmer on some GPUs.
 * - Back-face features cascade in with translateX + opacity and a
 *   per-item transitionDelay.
 * - Front face runs a decorative orb cascade (pure CSS keyframes,
 *   color driven by the accent prop via a CSS variable).
 *
 * Zero dependencies — drops into any React 18+ project, Tailwind or not.
 */

import { useState, type CSSProperties, type HTMLAttributes, type KeyboardEvent } from "react";

export interface CardFlipProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  description?: string;
  features?: string[];
  actionLabel?: string;
  /** Any CSS color. Drives glow, icons, and action hover. Default orange. */
  accent?: string;
  width?: number | string;
  height?: number | string;
  onAction?: () => void;
  /** Custom front-face content. Replaces the default orb animation. */
  children?: React.ReactNode;
}

const ArrowIcon = ({ size = 14, style }: { size?: number; style?: CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
  </svg>
);

const FlipIcon = ({ size = 16, style }: { size?: number; style?: CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
    <path d="m2 9 3-3 3 3" /><path d="M13 18H7a2 2 0 0 1-2-2V6" />
    <path d="m22 15-3 3-3-3" /><path d="M11 6h6a2 2 0 0 1 2 2v10" />
  </svg>
);

export function CardFlip({
  title = "Card Flip",
  subtitle = "Hover or tap to flip",
  description = "A 3D flip card with staggered content reveal.",
  features = ["Zero dependencies", "3D transform", "Staggered reveal", "Keyboard accessible"],
  actionLabel = "Start today",
  accent = "#f97316",
  width = 280,
  height = 320,
  onAction,
  children,
  style,
  ...props
}: CardFlipProps) {
  const [flipped, setFlipped] = useState(false);
  const [actionHover, setActionHover] = useState(false);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setFlipped((f) => !f);
    }
  };

  const face: CSSProperties = {
    position: "absolute",
    inset: 0,
    borderRadius: 18,
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    border: "1px solid rgba(255,255,255,0.1)",
    background: "linear-gradient(to bottom, #18181b, #09090b)",
    overflow: "hidden",
    transition: "opacity 0.7s",
    color: "#fafafa",
  };

  const muted: CSSProperties = { fontSize: 13, lineHeight: 1.5, color: "rgba(255,255,255,0.55)" };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
      onClick={() => setFlipped((f) => !f)}
      onKeyDown={onKeyDown}
      style={{
        position: "relative",
        width,
        height,
        perspective: 2000,
        cursor: "pointer",
        outline: "none",
        fontFamily: "inherit",
        ["--cf-glow" as string]: `color-mix(in srgb, ${accent} 50%, transparent)`,
        ...style,
      }}
      {...props}
    >
      <style>{`
        @keyframes cf-orb {
          0%   { transform: scale(2);                  opacity: 0; box-shadow: 0 0 50px var(--cf-glow); }
          50%  { transform: translateY(-5px) scale(1); opacity: 1; box-shadow: 0 8px 20px var(--cf-glow); }
          100% { transform: translateY(5px) scale(.1); opacity: 0; box-shadow: 0 10px 20px transparent; }
        }
        @media (prefers-reduced-motion: reduce) {
          .cf-orb { animation: none !important; }
        }
      `}</style>

      {/* rotating wrapper */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transition: "transform 0.7s cubic-bezier(0.4, 0.2, 0.2, 1)",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* ---------- front ---------- */}
        <div style={{ ...face, transform: "rotateY(0deg)", opacity: flipped ? 0 : 1 }}>
          {children ? (
            /* custom front content */
            <div style={{ position: "absolute", inset: 0, padding: 22, paddingBottom: 76, overflow: "hidden" }}>
              {children}
            </div>
          ) : (
            /* default: decorative orb cascade */
            <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center", paddingTop: 90 }}>
              <div style={{ position: "relative", width: 200, height: 100 }}>
                {Array.from({ length: 10 }, (_, i) => (
                  <div
                    key={i}
                    className="cf-orb"
                    style={{
                      position: "absolute",
                      inset: "25px 75px",
                      width: 50,
                      height: 50,
                      borderRadius: "50%",
                      opacity: 0,
                      /* longhands only — mixing the `animation` shorthand with
                         animationDelay makes React warn on rerender */
                      animationName: "cf-orb",
                      animationDuration: `${flipped ? 2 : 3}s`,
                      animationTimingFunction: "linear",
                      animationIterationCount: "infinite",
                      animationDelay: `${i * 0.3}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 20, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em" }}>{title}</h3>
              <p style={{ ...muted, margin: "4px 0 0" }}>{subtitle}</p>
            </div>
            <FlipIcon style={{ color: accent, flexShrink: 0 }} />
          </div>
        </div>

        {/* ---------- back (pre-rotated) ---------- */}
        <div
          style={{
            ...face,
            transform: "rotateY(180deg)",
            opacity: flipped ? 1 : 0,
            padding: 22,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em" }}>{title}</h3>
            <p style={{ ...muted, margin: "6px 0 18px" }}>{description}</p>

            {features.map((feature, i) => (
              <div
                key={feature}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  color: "rgba(255,255,255,0.75)",
                  marginBottom: 8,
                  /* staggered cascade — the signature move */
                  transform: flipped ? "translateX(0)" : "translateX(-10px)",
                  opacity: flipped ? 1 : 0,
                  transition: "transform 0.5s, opacity 0.5s",
                  transitionDelay: `${i * 100 + 200}ms`,
                }}
              >
                <ArrowIcon size={12} style={{ color: accent, flexShrink: 0 }} />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 14, marginTop: 14 }}>
            <div
              onMouseEnter={() => setActionHover(true)}
              onMouseLeave={() => setActionHover(false)}
              onClick={(e) => {
                e.stopPropagation();
                onAction?.();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                margin: -10,
                padding: 10,
                borderRadius: 12,
                background: actionHover
                  ? `linear-gradient(to right, color-mix(in srgb, ${accent} 15%, transparent), transparent)`
                  : "transparent",
                transform: actionHover ? "scale(1.02)" : "scale(1)",
                transition: "background 0.3s, transform 0.3s",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 500, color: actionHover ? accent : "#fafafa", transition: "color 0.3s" }}>
                {actionLabel}
              </span>
              <ArrowIcon
                style={{
                  color: accent,
                  transform: actionHover ? "translateX(3px) scale(1.1)" : "none",
                  transition: "transform 0.3s",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CardFlip;
