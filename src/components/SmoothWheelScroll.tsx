import React, { useEffect, useMemo, useRef } from "react";

type Props = {
  enabled?: boolean;
  minWidth?: number;
  locationKey?: string;
  ignoreSelectors?: string[];

  // tuning
  strength?: number;     // wheel -> accel
  friction?: number;     // inertia decay (0.80..0.92)  (aşağı = tez dayanır)
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

  // firefox / line-mode
  if (e.deltaMode === 1) dy *= 16;
  // page-mode
  else if (e.deltaMode === 2) dy *= window.innerHeight;

  // ultra böyük wheel-ləri (free-spin) dərhal kəs
  dy = clamp(dy, -260, 260);

  return dy;
}

// böyük dəyərləri daha sərt yumşalt (sürət “uçmasın”)
function soften(v: number, softCap: number) {
  const s = Math.sign(v);
  const a = Math.abs(v);

  if (a <= softCap) return v;

  // cap-dən sonra artım çox yavaşıyır
  const extra = a - softCap;
  const damped = softCap + extra * 0.22; // əvvəl 0.35 idi -> daha yavaş
  return s * damped;
}

export default function SmoothWheelScroll({
  enabled = true,
  minWidth = 980,
  locationKey,
  ignoreSelectors,

  // ✅ YEKUN: daha yavaş, daha kontrollu
  strength = 0.12,    // daha az impuls
  friction = 0.88,    // daha tez dayanır
  maxVelocity = 45,   // maksimum sürət aşağı
  softCap = 70,       // böyük delta yumşaldılır
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

  // əlavə: wheel ardıcıllığı sürəti yığmasın deyə “qapı”
  const lastWheelTsRef = useRef(0);

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

    syncToNative();
    stop();

    const step = () => {
      const nativeY = window.scrollY || 0;
      if (Math.abs(nativeY - lastYRef.current) > 2) {
        posRef.current = nativeY;
      }

      // inertia
      velocityRef.current *= friction;

      // dayandırma həddi
      if (Math.abs(velocityRef.current) < 0.12) {
        stop();
        return;
      }

      const next = posRef.current + velocityRef.current;
      const mx = maxScroll();
      const clamped = clamp(next, 0, mx);

      posRef.current = clamped;
      lastYRef.current = clamped;
      window.scrollTo(0, clamped);

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
      if (Math.abs(dy) < 3.5) return;

      const y = window.scrollY || 0;
      const mx = maxScroll();

      // top/bottom-da native
      if ((y <= 0 && dy < 0) || (y >= mx && dy > 0)) {
        stop();
        syncToNative();
        return;
      }

      e.preventDefault();

      syncToNative();

      // ✅ yumşalt
      dy = soften(dy, softCap);

      // ✅ impuls daha aşağı
      const add = clamp(dy * strength, -maxVelocity, maxVelocity);

      // ✅ ardıcıl wheel-lərdə sürət yığılmasını azalt (cooldown blend)
      const now = performance.now();
      const dt = now - (lastWheelTsRef.current || 0);
      lastWheelTsRef.current = now;

      // dt kiçikdirsə (ard-arda), köhnə sürəti daha çox “kəs”
      // 0ms..80ms => 0.45; 200ms+ => 0.70
      const blend = dt < 80 ? 0.45 : dt < 140 ? 0.55 : 0.70;

      velocityRef.current = clamp(velocityRef.current * blend + add, -maxVelocity, maxVelocity);

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
