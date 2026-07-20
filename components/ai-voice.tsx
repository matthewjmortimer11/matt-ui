"use client";

/**
 * AIVoice — voice-recording UI with an audio-reactive waveform.
 *
 * Kokonut UI's ai-voice fakes its waveform (Math.random heights + staggered
 * CSS pulse). This version is real: getUserMedia → AnalyserNode →
 * getByteFrequencyData() in a rAF loop, writing bar heights straight to DOM
 * refs (zero re-renders at 60fps). Three tiers:
 *   1. mic granted  → live frequency spectrum
 *   2. mic denied / unavailable → smoothed pseudo-signal (their trick, our fallback)
 *   3. prefers-reduced-motion → calm static bars
 *
 * Zero dependencies — drops into any React 18+ project, Tailwind or not.
 */

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
} from "react";

export interface AIVoiceProps extends HTMLAttributes<HTMLDivElement> {
  /** Any CSS color for the active bars/timer. Default inherits (white-ish). */
  accent?: string;
  /** Number of waveform bars. Default 48. */
  barCount?: number;
  /** Called with the live MediaStream when real recording starts. */
  onStart?: (stream: MediaStream | null) => void;
  /** Called when recording stops. */
  onStop?: () => void;
  /** Labels. */
  idleLabel?: string;
  activeLabel?: string;
  demoLabel?: string;
}

const MicIcon = ({ size = 24, style }: { size?: number; style?: CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" x2="12" y1="19" y2="22" />
  </svg>
);

export function AIVoice({
  accent = "rgba(255,255,255,0.6)",
  barCount = 48,
  onStart,
  onStop,
  idleLabel = "Click to speak",
  activeLabel = "Listening...",
  demoLabel = "Listening (no mic — demo signal)",
  style,
  ...props
}: AIVoiceProps) {
  const [recording, setRecording] = useState(false);
  const [demo, setDemo] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const barsRef = useRef<(HTMLDivElement | null)[]>([]);
  const audioRef = useRef<{
    ctx: AudioContext | null;
    analyser: AnalyserNode | null;
    stream: MediaStream | null;
  }>({ ctx: null, analyser: null, stream: null });
  const rafRef = useRef(0);

  /* timer */
  useEffect(() => {
    if (!recording) {
      setSeconds(0);
      return;
    }
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  /* waveform loop — real spectrum or pseudo-signal, same render path */
  useEffect(() => {
    const bars = barsRef.current;
    const setHeights = (fn: (i: number) => number) => {
      for (let i = 0; i < bars.length; i++) {
        const el = bars[i];
        if (el) el.style.height = `${Math.max(6, Math.min(100, fn(i)))}%`;
      }
    };

    if (!recording) {
      setHeights(() => 6); // resting nubs
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setHeights(() => 40); // calm static bars
      return;
    }

    const analyser = audioRef.current.analyser;
    const freq = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    const heights = new Float32Array(barCount).fill(6);
    let t = 0;

    const tick = () => {
      t += 0.016;
      if (analyser && freq) {
        /* tier 1: real microphone spectrum */
        analyser.getByteFrequencyData(freq);
        for (let i = 0; i < barCount; i++) {
          // skip the near-DC bins, spread the rest across the bars
          const bin = 2 + Math.floor((i / barCount) * (freq.length * 0.7));
          const target = (freq[bin] / 255) * 100;
          heights[i] += (target - heights[i]) * 0.3; // lerp for smoothness
        }
      } else {
        /* tier 2: pseudo-signal — layered traveling sines + noise */
        for (let i = 0; i < barCount; i++) {
          const wave =
            Math.sin(t * 4 + i * 0.35) * 22 +
            Math.sin(t * 7 + i * 0.15) * 14 +
            Math.sin(t * 1.7 - i * 0.5) * 10;
          const target = 38 + wave + Math.random() * 10;
          heights[i] += (target - heights[i]) * 0.2;
        }
      }
      for (let i = 0; i < barCount; i++) {
        const el = bars[i];
        if (el) el.style.height = `${Math.max(6, Math.min(100, heights[i]))}%`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [recording, demo, barCount]);

  const activeRef = useRef(false);

  const stop = () => {
    activeRef.current = false;
    const a = audioRef.current;
    a.stream?.getTracks().forEach((tr) => tr.stop());
    a.ctx?.close().catch(() => {});
    audioRef.current = { ctx: null, analyser: null, stream: null };
    setRecording(false);
    setDemo(false);
    onStop?.();
  };

  const start = () => {
    /* start the demo signal immediately — instant feedback even while the
       mic permission prompt is open (getUserMedia can stay pending forever) */
    activeRef.current = true;
    setDemo(true);
    setRecording(true);

    if (!navigator.mediaDevices?.getUserMedia) {
      onStart?.(null);
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        if (!activeRef.current) {
          /* user hit stop before the prompt resolved */
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.6;
        ctx.createMediaStreamSource(stream).connect(analyser);
        audioRef.current = { ctx, analyser, stream };
        setDemo(false); /* upgrade tier: pseudo-signal → real spectrum */
        onStart?.(stream);
      })
      .catch(() => {
        if (activeRef.current) onStart?.(null);
      });
  };

  /* cleanup on unmount */
  useEffect(() => () => {
    audioRef.current.stream?.getTracks().forEach((tr) => tr.stop());
    audioRef.current.ctx?.close().catch(() => {});
    cancelAnimationFrame(rafRef.current);
  }, []);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        padding: 16,
        color: "#fafafa",
        fontFamily: "inherit",
        ...style,
      }}
      {...props}
    >
      <button
        type="button"
        aria-label={recording ? "Stop recording" : "Start recording"}
        aria-pressed={recording}
        onClick={recording ? stop : start}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 64,
          height: 64,
          borderRadius: 14,
          border: "none",
          background: "transparent",
          color: "inherit",
          cursor: "pointer",
        }}
      >
        {recording ? (
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 4,
              background: accent,
              animationName: "aiv-spin",
              animationDuration: "3s",
              animationTimingFunction: "linear",
              animationIterationCount: "infinite",
            }}
          />
        ) : (
          <MicIcon style={{ opacity: 0.9 }} />
        )}
      </button>

      <span
        style={{
          fontFamily: "ui-monospace, monospace",
          fontSize: 13,
          fontVariantNumeric: "tabular-nums",
          color: recording ? accent : "rgba(255,255,255,0.3)",
          transition: "color 0.3s",
        }}
      >
        {formatTime(seconds)}
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: 2, width: 256, height: 24 }}>
        {Array.from({ length: barCount }, (_, i) => (
          <div
            key={i}
            ref={(el) => {
              barsRef.current[i] = el;
            }}
            style={{
              flex: 1,
              height: "6%",
              minHeight: 2,
              borderRadius: 99,
              background: recording ? accent : "rgba(255,255,255,0.15)",
              transition: "background 0.3s",
            }}
          />
        ))}
      </div>

      <p style={{ margin: 0, fontSize: 12, height: 16, color: "rgba(255,255,255,0.6)" }}>
        {recording ? (demo ? demoLabel : activeLabel) : idleLabel}
      </p>

      <style>{`
        @keyframes aiv-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default AIVoice;
