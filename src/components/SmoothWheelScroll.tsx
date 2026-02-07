import React, { useEffect, useMemo, useRef } from "react";

type Props = {
  enabled?: boolean;
  minWidth?: number;
  locationKey?: string;
  ignoreSelectors?: string[];

  // tuning
  strength?: number;     // wheel -> accel
  friction?: number;     // inertia decay (0.86..0.93)
  maxVelocity?: number;  // clamp
  softCap?: number;      // yumuşatma həddi
};

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function getScrollableParent(el: Element | null) {
  let cur: Element | null = el;
  while (cur && cur !== document.documentElement) {
    const st = getComputedStyle(cur);
    const oy = st.overflowY;
    const canScroll =
      (oy === "auto" || oy === "scroll") &&
      (cur as HTMLElement).scrollHeight > (cur as HTMLElement).clientHeight + 2;
    if (canScroll) return cur as HTMLElement;
    cur = cur.parentElement;
  }
  return null;
}

function shouldIgnoreTarget(target: EventTarget | null, ignoreSelectors: string[]) {
  const el = target instanceof Element ? target : null;
  if (!el) return false;
  return ignoreSelectors.some((sel) => {
    try {
      return !!el.closest(sel);
    } catch {
      return false;
    }
  });
}

function normalizeDelta(e: WheelEvent) {
  let dy = e.deltaY;
  if (e.deltaMode === 1) dy *= 16; // lines -> px
  else if (e.deltaMode === 2) dy *= window.innerHeight; // page -> px
  return dy;
}

// velocity yumşaltma: böyük dəyərləri “kivam”a salır
function soften(v: number, softCap: number) {
  const s = Math.sign(v);
  const a = Math.abs(v);

  if (a <= softCap) return v;

  // soft knee: cap-dən sonra artım yavaşıyır (log-like)
  const extra = a - softCap;
  const damped = softCap + extra * 0.35; // 0.35 = daha ağır hiss
  return s * damped;
}

export default function SmoothWheelScroll({
  enabled = true,
  minWidth = 980,
  locationKey,
  ignoreSelectors,

  // ✅ default: “hezin-hezin”
  strength = 0.22,     // çox aşağı
  friction = 0.92,     // yavaş sönmə
  maxVelocity = 85,    // çox aşağı clamp
  softCap = 120,       // wheel böyük gəlsə yumşalt
}: Props) {
  const ignores = useMemo(
    () =>
      ignoreSelectors?.length
        ? ignoreSelectors
        : [
            ".neox-ai",
            ".neox-ai-modal",
            ".admin",
            ".admin-layout",
            ".admin-main",
            "[data-scroll-lock]",
            "[data-native-scroll]",
          ],
    [ignoreSelectors]
  );

  const rafRef = useRef<number | null>(null);
  const velocityRef = useRef(0);
  const posRef = useRef(0);
  const lastYRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (prefersReduced) return;

    if (window.innerWidth < minWidth) return;

    const fine = window.matchMedia?.("(pointer: fine)")?.matches;
    const hover = window.matchMedia?.("(hover: hover)")?.matches;
    if (!fine || !hover) return;

    const docEl = document.documentElement;
    const maxScroll = () => Math.max(0, docEl.scrollHeight - window.innerHeight);

    const stop = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      velocityRef.current = 0;
    };

    const syncToNative = () => {
      const y = window.scrollY || 0;
      posRef.current = y;
      lastYRef.current = y;
    };

    // route dəyişəndə reset
    syncToNative();
    stop();

    const step = () => {
      const nativeY = window.scrollY || 0;
      if (Math.abs(nativeY - lastYRef.current) > 2) {
        posRef.current = nativeY;
      }

      // inertia
      velocityRef.current *= friction;

      // dayandırma həddi (çox yumşaq)
      if (Math.abs(velocityRef.current) < 0.08) {
        stop();
        return;
      }

      const next = posRef.current + velocityRef.current;
      const mx = maxScroll();
      const clamped = clamp(next, 0, mx);

      posRef.current = clamped;
      lastYRef.current = clamped;
      window.scrollTo(0, clamped);

      // sərhəddə tam dayansın
      if (clamped <= 0 || clamped >= mx) {
        stop();
        return;
      }

      rafRef.current = requestAnimationFrame(step);
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;

      if (shouldIgnoreTarget(e.target, ignores)) return;

      const sp = getScrollableParent(e.target instanceof Element ? e.target : null);
      if (sp) return;

      let dy = normalizeDelta(e);

      // xırda trackpad noise -> native
      if (Math.abs(dy) < 2.5) return;

      const y = window.scrollY || 0;
      const mx = maxScroll();

      // top/bottom-da native
      if ((y <= 0 && dy < 0) || (y >= mx && dy > 0)) {
        stop();
        syncToNative();
        return;
      }

      // ✅ smooth only here
      e.preventDefault();

      syncToNative();

      // ✅ wheel impulsunu yumşalt
      dy = soften(dy, softCap);

      // accel çox az
      const add = clamp(dy * strength, -maxVelocity, maxVelocity);

      // ✅ toplama yox, “blend” (birdən sürətlənməsin)
      // yeni velocity = köhnənin 70%-i + add
      velocityRef.current = clamp(velocityRef.current * 0.70 + add, -maxVelocity, maxVelocity);

      if (!rafRef.current) rafRef.current = requestAnimationFrame(step);
    };

    window.addEventListener("wheel", onWheel, { passive: false });

    const onResize = () => {
      syncToNative();
      const y = window.scrollY || 0;
      if (y <= 0 || y >= maxScroll()) stop();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("wheel", onWheel as any);
      window.removeEventListener("resize", onResize);
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, minWidth, strength, friction, maxVelocity, softCap, locationKey, JSON.stringify(ignores)]);

  return null;
}
