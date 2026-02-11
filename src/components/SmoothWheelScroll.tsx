import React, { useEffect, useMemo, useRef } from "react";

type Props = {
  enabled?: boolean;
  minWidth?: number;
  locationKey?: string;
  ignoreSelectors?: string[];

  /** wheel -> impulse */
  strength?: number;

  /** inertia decay (normal) */
  friction?: number;

  /** clamp */
  maxVelocity?: number;

  /** soften wheel spikes */
  softCap?: number;

  /** travel budget limit (per gesture) */
  maxTravelPerWheel?: number;

  /** idle extra brake start */
  idleBrakeMs?: number;

  /** glide tail durations */
  coastMs?: number;     // travel bitəndən sonra qısa “gediş”
  stopEaseMs?: number;  // sonra uzun “sönmə”

  /** ignore tiny deltas */
  wheelDeadzone?: number;
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
  return clamp(dy, -320, 320);
}

function softenDelta(dy: number, softCap: number) {
  const s = Math.sign(dy);
  const a = Math.abs(dy);
  if (a <= softCap) return dy;

  // extra hissəni daha çox sıx → mouse “sert atma” azalsın
  const extra = a - softCap;
  return s * (softCap + extra * 0.18);
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

  // ✅ hissiyat preset (səndə istənən: yumşaq + kontrollu)
  strength = 0.11,
  friction = 0.905,
  maxVelocity = 38,
  softCap = 85,

  maxTravelPerWheel = 1150,
  idleBrakeMs = 140,

  coastMs = 150,
  stopEaseMs = 380,

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

  // travel budget (gesture-lə idarə edirik)
  const travelBudgetRef = useRef(0);
  const lastWheelTsRef = useRef(0);

  // tail stop state
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

    const startTailStop = () => {
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

        // ✅ 1) əvvəlcə qısa “coast” → buraxanda azca da getsin
        if (dt < coastMs) {
          vRef.current *= (friction * 0.99);
          if (Math.abs(vRef.current) < 0.07) {
            stopHard();
            return;
          }
        } else {
          // ✅ 2) sonra uzun ease-out → yumşaq sönsün
          const t = clamp((dt - coastMs) / stopEaseMs, 0, 1);
          const k = 1 - easeOutCubic(t);

          // birdən kəsilməsin deyə azca tail saxla
          const eased = stopRef.current.v0 * k;
          vRef.current = eased * 0.985;

          if (t >= 1 || Math.abs(vRef.current) < 0.07) {
            stopHard();
            return;
          }
        }
      } else {
        // normal inertia
        const idleFor = now - (lastWheelTsRef.current || 0);
        const extraBrake = idleFor > idleBrakeMs ? 0.90 : 1;

        vRef.current *= friction * extraBrake;

        // travel budget consume
        const va = Math.abs(vRef.current);
        if (va > 0) {
          travelBudgetRef.current = Math.max(0, travelBudgetRef.current - va);

          // ✅ travel bitən kimi hard stop yox — tail-stop
          if (travelBudgetRef.current <= 0 && Math.abs(vRef.current) > 0.20) {
            startTailStop();
          }
        }

        if (Math.abs(vRef.current) < 0.07) {
          stopHard();
          return;
        }
      }

      const next = posRef.current + vRef.current;
      const clamped = clamp(next, 0, mx);

      posRef.current = clamped;
      lastNativeYRef.current = clamped;
      window.scrollTo(0, clamped);

      if (clamped <= 0 || clamped >= mx) {
        stopHard();
        return;
      }

      rafRef.current = requestAnimationFrame(step);
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;

      if (shouldIgnoreTarget(e.target, ignores)) return;

      // if wheel over scrollable container → native
      const sp = getScrollableParent(e.target instanceof Element ? e.target : null);
      if (sp) return;

      let dy = normalizeWheelDelta(e);
      if (Math.abs(dy) < wheelDeadzone) return;

      const y = window.scrollY || 0;
      const mx = maxScroll();

      // edges → native
      if ((y <= 0 && dy < 0) || (y >= mx && dy > 0)) {
        stopHard();
        syncNative();
        return;
      }

      e.preventDefault();
      syncNative();

      // new gesture cancels tail-stop
      stopRef.current.active = false;

      dy = softenDelta(dy, softCap);

      // impulse to velocity
      const add = clamp(dy * strength, -maxVelocity, maxVelocity);

      const now = performance.now();
      const dt = now - (lastWheelTsRef.current || 0);
      lastWheelTsRef.current = now;

      // carry prevents stacking too hard
      const carry = dt < 90 ? 0.25 : dt < 160 ? 0.35 : 0.45;
      vRef.current = clamp(vRef.current * carry + add, -maxVelocity, maxVelocity);

      // ✅ KEY FIX: travel budget adaptiv olsun
      // kiçik dy → qısa glide (buz effekti olmasın)
      // böyük dy → uzun glide (yumşaq dayanma)
      const a = Math.abs(dy);
      const budgetAdd =
        a < 18
          ? clamp(a * 8.5, 90, 180)
          : a < 55
          ? clamp(a * 5.2, 180, 520)
          : clamp(a * 3.0, 520, 1100);

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

    // init
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
    coastMs,
    stopEaseMs,
    wheelDeadzone,
  ]);

  return null;
}
