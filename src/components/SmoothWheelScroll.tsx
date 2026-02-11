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

  // ✅ travel bitəndə “sürüşərək dayanma”
  stopEaseMs?: number; // 120..220
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
  dy = clamp(dy, -240, 240);
  return dy;
}

function soften(v: number, softCap: number) {
  const s = Math.sign(v);
  const a = Math.abs(v);
  if (a <= softCap) return v;
  const extra = a - softCap;
  const damped = softCap + extra * 0.22;
  return s * damped;
}

// 0..1 -> easeOutCubic
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export default function SmoothWheelScroll({
  enabled = true,
  minWidth = 980,
  locationKey,
  ignoreSelectors,

  // ✅ sürət yavaşdır
  strength = 0.12,
  friction = 0.90,
  maxVelocity = 42,
  softCap = 70,

  // ✅ 1 scrollda limit
  maxTravelPerWheel = 420,
  idleBrakeMs = 110,

  // ✅ “sürüşərək dayan”
  stopEaseMs = 170,
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

  const travelLeftRef = useRef(0);
  const lastWheelTsRef = useRef(0);

  // ✅ slip-stop state
  const easingStopRef = useRef<{
    active: boolean;
    t0: number;
    v0: number;
  }>({ active: false, t0: 0, v0: 0 });

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

    const stopHard = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      velocityRef.current = 0;
      travelLeftRef.current = 0;
      easingStopRef.current.active = false;
    };

    const startSlipStop = () => {
      const now = performance.now();
      easingStopRef.current = { active: true, t0: now, v0: velocityRef.current };
      // travelLeftRef bitdi deyə artıq “yeni” məsafə vermirik
      travelLeftRef.current = 0;
    };

    const syncToNative = () => {
      const y = window.scrollY || 0;
      posRef.current = y;
      lastYRef.current = y;
    };

    syncToNative();
    stopHard();

    const step = () => {
      const nativeY = window.scrollY || 0;
      if (Math.abs(nativeY - lastYRef.current) > 2) {
        posRef.current = nativeY;
      }

      const now = performance.now();

      // ✅ Slip-stop aktivdirsə: velocity-ni 0-a ease-out ilə gətir
      if (easingStopRef.current.active) {
        const t = clamp((now - easingStopRef.current.t0) / stopEaseMs, 0, 1);
        const k = 1 - easeOutCubic(t); // 1->0
        velocityRef.current = easingStopRef.current.v0 * k;

        if (t >= 1 || Math.abs(velocityRef.current) < 0.10) {
          stopHard();
          return;
        }
      } else {
        // normal inertia
        const idleFor = now - (lastWheelTsRef.current || 0);
        const extraBrake = idleFor > idleBrakeMs ? 0.86 : 1;
        velocityRef.current *= friction * extraBrake;

        // travel budget azalması
        const vAbs = Math.abs(velocityRef.current);
        if (vAbs > 0) {
          travelLeftRef.current = Math.max(0, travelLeftRef.current - vAbs);
          if (travelLeftRef.current <= 0 && Math.abs(velocityRef.current) > 0.25) {
            // ✅ HARD STOP YOX — slip-stop başlat
            startSlipStop();
          }
        }

        if (Math.abs(velocityRef.current) < 0.10) {
          stopHard();
          return;
        }
      }

      const next = posRef.current + velocityRef.current;
      const mx = maxScroll();
      const clamped = clamp(next, 0, mx);

      posRef.current = clamped;
      lastYRef.current = clamped;
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

      const sp = getScrollableParent(e.target instanceof Element ? e.target : null);
      if (sp) return;

      let dy = normalizeDelta(e);

      if (Math.abs(dy) < 3.5) return;

      const y = window.scrollY || 0;
      const mx = maxScroll();

      if ((y <= 0 && dy < 0) || (y >= mx && dy > 0)) {
        stopHard();
        syncToNative();
        return;
      }

      e.preventDefault();
      syncToNative();

      // yeni wheel gəlirsə slip-stop-u ləğv et (yeni jest başladı)
      easingStopRef.current.active = false;

      dy = soften(dy, softCap);

      const add = clamp(dy * strength, -maxVelocity, maxVelocity);

      const now = performance.now();
      const dt = now - (lastWheelTsRef.current || 0);
      lastWheelTsRef.current = now;

      // velocity yığılmasın
      const carry = dt < 90 ? 0.25 : dt < 160 ? 0.35 : 0.45;
      velocityRef.current = clamp(velocityRef.current * carry + add, -maxVelocity, maxVelocity);

      // travel budget: limitli, amma 1 scrollda “azca sürüşmə” üçün kifayət
      const budgetAdd = clamp(Math.abs(dy) * 1.6, 140, 520);
      travelLeftRef.current = clamp(travelLeftRef.current + budgetAdd, 0, maxTravelPerWheel);

      if (!rafRef.current) rafRef.current = requestAnimationFrame(step);
    };

    window.addEventListener("wheel", onWheel, { passive: false });

    const onResize = () => {
      syncToNative();
      const y = window.scrollY || 0;
      if (y <= 0 || y >= maxScroll()) stopHard();
    };
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
    strength,
    friction,
    maxVelocity,
    softCap,
    maxTravelPerWheel,
    idleBrakeMs,
    stopEaseMs,
    locationKey,
    JSON.stringify(ignores),
  ]);

  return null;
}
