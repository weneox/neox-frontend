import React, { useEffect, useMemo, useRef } from "react";

type Props = {
  enabled?: boolean;
  minWidth?: number;
  locationKey?: string;
  ignoreSelectors?: string[];

  strength?: number;
  friction?: number;
  maxVelocity?: number;
  softCap?: number;

  maxTravelPerWheel?: number;
  idleBrakeMs?: number;

  stopEaseMs?: number;
  wheelDeadzone?: number;

  coastMs?: number;
};

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function normalizeWheelDelta(e: WheelEvent) {
  let dy = e.deltaY;
  if (e.deltaMode === 1) dy *= 16;
  else if (e.deltaMode === 2) dy *= window.innerHeight;
  return clamp(dy, -260, 260);
}

function softenDelta(dy: number, softCap: number) {
  const s = Math.sign(dy);
  const a = Math.abs(dy);
  if (a <= softCap) return dy;
  const extra = a - softCap;
  return s * (softCap + extra * 0.22);
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

export default function SmoothWheelScroll({
  enabled = true,
  minWidth = 980,
  locationKey,
  ignoreSelectors,

  // ✅ bir scroll = daha “düşsün”, amma yavaş hisslə
  strength = 0.11,
  friction = 0.905,
  maxVelocity = 36,
  softCap = 75,

  // ✅ daha çox “glide”
  maxTravelPerWheel = 980,
  idleBrakeMs = 140,

  // ✅ daha yumşaq dayanma
  coastMs = 180,
  stopEaseMs = 420,

  wheelDeadzone = 3.2,
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
            "textarea",
            "input",
            "select",
          ],
    [ignoreSelectors]
  );

  const rafRef = useRef<number | null>(null);

  const posRef = useRef(0);
  const lastNativeYRef = useRef(0);

  const vRef = useRef(0);

  const travelBudgetRef = useRef(0);
  const lastWheelTsRef = useRef(0);

  const stopRef = useRef<{ active: boolean; t0: number; v0: number }>({
    active: false,
    t0: 0,
    v0: 0,
  });

  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;

    const fine = window.matchMedia?.("(pointer: fine)")?.matches;
    const hover = window.matchMedia?.("(hover: hover)")?.matches;
    if (!fine || !hover) return;

    if (window.innerWidth < minWidth) return;

    const docEl = document.documentElement;
    const maxScroll = () => Math.max(0, docEl.scrollHeight - window.innerHeight);

    const syncNative = () => {
      const y = window.scrollY || 0;
      posRef.current = y;
      lastNativeYRef.current = y;
    };

    const stopHard = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      vRef.current = 0;
      travelBudgetRef.current = 0;
      stopRef.current.active = false;
    };

    const startGlideStop = () => {
      const now = performance.now();
      stopRef.current = { active: true, t0: now, v0: vRef.current };
      travelBudgetRef.current = 0;
    };

    const step = () => {
      const nativeY = window.scrollY || 0;
      if (Math.abs(nativeY - lastNativeYRef.current) > 2) {
        posRef.current = nativeY;
      }

      const now = performance.now();
      const mx = maxScroll();

      if (stopRef.current.active) {
        const dt = now - stopRef.current.t0;

        // ✅ daha uzun “coast”
        if (dt < coastMs) {
          // coast zamanı yavaş-yavaş sönsün (tam kəsməsin)
          vRef.current *= (friction * 0.985);
          if (Math.abs(vRef.current) < 0.08) {
            stopHard();
            return;
          }
        } else {
          // ✅ daha uzun ease-out
          const t = clamp((dt - coastMs) / stopEaseMs, 0, 1);
          const k = 1 - easeOutCubic(t);

          // ease ilə yanaşı azca friction da veririk → daha təbii “glide”
          const eased = stopRef.current.v0 * k;
          vRef.current = eased * (friction * 0.995);

          if (t >= 1 || Math.abs(vRef.current) < 0.08) {
            stopHard();
            return;
          }
        }
      } else {
        const idleFor = now - (lastWheelTsRef.current || 0);
        const extraBrake = idleFor > idleBrakeMs ? 0.90 : 1;

        vRef.current *= friction * extraBrake;

        const va = Math.abs(vRef.current);
        if (va > 0) {
          travelBudgetRef.current = Math.max(0, travelBudgetRef.current - va);

          // ✅ travel bitəndə glide-stop
          if (travelBudgetRef.current <= 0 && Math.abs(vRef.current) > 0.22) {
            startGlideStop();
          }
        }

        if (Math.abs(vRef.current) < 0.08) {
          stopHard();
          return;
        }
      }

      const next = posRef.current + vRef.current;
      const mx2 = maxScroll();
      const clamped = clamp(next, 0, mx2);

      posRef.current = clamped;
      lastNativeYRef.current = clamped;
      window.scrollTo(0, clamped);

      if (clamped <= 0 || clamped >= mx2) {
        stopHard();
        return;
      }

      rafRef.current = requestAnimationFrame(step);
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;
      if (shouldIgnoreTarget(e.target, ignores)) return;

      const sp = getScrollableParent(e.target instanceof Element ? e.target : null);
      if (sp) return;

      let dy = normalizeWheelDelta(e);
      if (Math.abs(dy) < wheelDeadzone) return;

      const y = window.scrollY || 0;
      const mx = maxScroll();
      if ((y <= 0 && dy < 0) || (y >= mx && dy > 0)) {
        stopHard();
        syncNative();
        return;
      }

      e.preventDefault();
      syncNative();

      // ✅ yeni jest gəldi → glide-stop ləğv
      stopRef.current.active = false;

      dy = softenDelta(dy, softCap);

      // impulse
      const add = clamp(dy * strength, -maxVelocity, maxVelocity);

      const now = performance.now();
      const dt = now - (lastWheelTsRef.current || 0);
      lastWheelTsRef.current = now;

      const carry = dt < 90 ? 0.25 : dt < 160 ? 0.35 : 0.45;
      vRef.current = clamp(vRef.current * carry + add, -maxVelocity, maxVelocity);

      // ✅ travel daha çox əlavə: 1 scroll gedib-yavaşlayıb dayansın
      const budgetAdd = clamp(Math.abs(dy) * 2.35, 260, 980);
      travelBudgetRef.current = clamp(
        travelBudgetRef.current + budgetAdd,
        0,
        maxTravelPerWheel
      );

      if (!rafRef.current) rafRef.current = requestAnimationFrame(step);
    };

    const onResize = () => {
      syncNative();
      const y = window.scrollY || 0;
      const mx = maxScroll();
      if (y <= 0 || y >= mx) stopHard();
    };

    syncNative();
    stopHard();

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("wheel", onWheel as any);
      window.removeEventListener("resize", onResize);
      stopHard();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    enabled,
    minWidth,
    locationKey,
    JSON.stringify(ignores),
    strength,
    friction,
    maxVelocity,
    softCap,
    maxTravelPerWheel,
    idleBrakeMs,
    stopEaseMs,
    wheelDeadzone,
    coastMs,
  ]);

  return null;
}
