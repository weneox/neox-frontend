import React, { useEffect, useMemo, useRef } from "react";

type Props = {
  enabled?: boolean;
  minWidth?: number;
  locationKey?: string;
  ignoreSelectors?: string[];

  // tuning
  strength?: number;     // wheel -> accel
  friction?: number;     // inertia decay (0.90..0.96)  (yuxarı = daha çox sürüşmə)
  maxVelocity?: number;  // clamp
  softCap?: number;      // yumuşatma həddi

  // ✅ "buzda sürüşmə" hissi
  iceTail?: number;      // 0..0.25 (0 = off). Dayanmanı daha “slippy” edir
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

  if (e.deltaMode === 1) dy *= 16;
  else if (e.deltaMode === 2) dy *= window.innerHeight;

  // free-spin wheel-ləri dərhal kəs (uçmasın)
  dy = clamp(dy, -260, 260);
  return dy;
}

// böyük dəyərləri yumşalt (uçuşu kəs)
function soften(v: number, softCap: number) {
  const s = Math.sign(v);
  const a = Math.abs(v);
  if (a <= softCap) return v;

  const extra = a - softCap;
  const damped = softCap + extra * 0.22;
  return s * damped;
}

export default function SmoothWheelScroll({
  enabled = true,
  minWidth = 980,
  locationKey,
  ignoreSelectors,

  // ✅ Buz effekti üçün yavaş impuls + uzun inertia
  strength = 0.10,
  friction = 0.93,
  maxVelocity = 40,
  softCap = 70,

  // ✅ sürüşərək dayanma
  iceTail = 0.16,
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

      // ✅ base inertia
      velocityRef.current *= friction;

      // ✅ "ice tail": sürət azaldıqca dayanma daha yumşaq olsun (buz hissi)
      // yəni sonda birdən kəsilməsin, sürüşə-sürüşə sönsün
      if (iceTail > 0) {
        const v = Math.abs(velocityRef.current);
        const tailBoost =
          v < 10 ? 1 + iceTail : v < 22 ? 1 + iceTail * 0.55 : 1; // yalnız son mərhələdə təsir etsin
        velocityRef.current *= tailBoost;
      }

      // dayandırma həddi (buzda belə “sonda” dayanır)
      if (Math.abs(velocityRef.current) < 0.10) {
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

      // trackpad noise -> native
      if (Math.abs(dy) < 3.5) return;

      const y = window.scrollY || 0;
      const mx = maxScroll();

      if ((y <= 0 && dy < 0) || (y >= mx && dy > 0)) {
        stop();
        syncToNative();
        return;
      }

      e.preventDefault();
      syncToNative();

      dy = soften(dy, softCap);

      const add = clamp(dy * strength, -maxVelocity, maxVelocity);

      const now = performance.now();
      const dt = now - (lastWheelTsRef.current || 0);
      lastWheelTsRef.current = now;

      // ardıcıl wheel-lərdə yığılmanı azalt
      const blend = dt < 80 ? 0.45 : dt < 140 ? 0.55 : 0.72;

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
  }, [
    enabled,
    minWidth,
    strength,
    friction,
    maxVelocity,
    softCap,
    iceTail,
    locationKey,
    JSON.stringify(ignores),
  ]);

  return null;
}
