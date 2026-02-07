import React, { useEffect, useRef } from "react";

/**
 * Global inertial mouse-wheel scroll (desktop only).
 * - Works on all pages (wrap your app once)
 * - Skips mobile/touch devices
 * - Respects prefers-reduced-motion
 */
export default function SmoothWheelScroll({
  enabled = true,
  minWidth = 980,
}: {
  enabled?: boolean;
  minWidth?: number;
}) {
  const rafRef = useRef<number | null>(null);
  const velRef = useRef<number>(0);
  const lastTsRef = useRef<number>(0);
  const runningRef = useRef<boolean>(false);

  useEffect(() => {
    if (!enabled) return;

    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (prefersReduced) return;

    // desktop only
    if (window.innerWidth < minWidth) return;

    const fine = window.matchMedia?.("(pointer: fine)")?.matches;
    const hover = window.matchMedia?.("(hover: hover)")?.matches;
    if (!fine || !hover) return;

    const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
    const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;

    // --- tuning (feel) ---
    const BOOST = 1.05;     // wheel input multiplier
    const MAX_V = 2400;     // max velocity
    const FRICTION = 0.86;  // per frame friction
    const STOP_V = 0.15;    // stop threshold

    const stop = () => {
      runningRef.current = false;
      lastTsRef.current = 0;
      velRef.current = 0;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };

    const tick = (ts: number) => {
      if (!runningRef.current) return;

      const last = lastTsRef.current || ts;
      const dt = Math.min(34, ts - last); // cap dt to avoid jump
      lastTsRef.current = ts;

      // normalize friction by dt (so 60/120hz feels similar)
      const f = Math.pow(FRICTION, dt / 16.67);

      const v = velRef.current;
      if (Math.abs(v) < STOP_V) {
        stop();
        return;
      }

      const y = window.scrollY;
      const next = clamp(y + v * (dt / 16.67), 0, maxScroll());
      window.scrollTo(0, next);

      // if hit boundaries → stop
      if (next <= 0 || next >= maxScroll() - 0.5) {
        stop();
        return;
      }

      velRef.current = v * f;
      rafRef.current = requestAnimationFrame(tick);
    };

    const start = () => {
      if (runningRef.current) return;
      runningRef.current = true;
      lastTsRef.current = 0;
      rafRef.current = requestAnimationFrame(tick);
    };

    const onWheel = (e: WheelEvent) => {
      // ignore horizontal wheel dominance
      if (Math.abs((e as any).deltaX || 0) > Math.abs(e.deltaY)) return;

      // IMPORTANT: we take over scrolling
      e.preventDefault();

      // normalize delta (trackpad vs wheel)
      let dy = e.deltaY;

      // if deltaMode is lines (1) or pages (2), scale it
      if ((e as any).deltaMode === 1) dy *= 16;
      if ((e as any).deltaMode === 2) dy *= window.innerHeight;

      // add to velocity (accumulate)
      const v = velRef.current + dy * BOOST;

      // clamp velocity
      velRef.current = clamp(v, -MAX_V, MAX_V);

      // start inertial rAF
      start();
    };

    // If user starts dragging scrollbar / touching, stop inertia
    const onPointerDown = () => stop();
    const onKeyDown = (ev: KeyboardEvent) => {
      // allow keyboard scroll to behave normally; just stop inertia
      const keys = ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "];
      if (keys.includes(ev.key)) stop();
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("keydown", onKeyDown, { passive: true });

    return () => {
      window.removeEventListener("wheel", onWheel as any);
      window.removeEventListener("pointerdown", onPointerDown as any);
      window.removeEventListener("keydown", onKeyDown as any);
      stop();
    };
  }, [enabled, minWidth]);

  return null;
}
