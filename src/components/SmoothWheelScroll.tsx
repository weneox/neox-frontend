import React, { useEffect, useMemo, useRef } from "react";

type Props = {
  enabled?: boolean;
  minWidth?: number;
  locationKey?: string;
  ignoreSelectors?: string[];

  /** Wheel impulsu target-a nə qədər məsafə verir (böyük = daha uzaq “düşür”) */
  distanceFactor?: number; // 0.9 .. 1.6

  /** Target-a yaxınlaşma “gücü” (böyük = daha tez sürətlənir) */
  spring?: number; // 0.06 .. 0.16

  /** Sürətin sönməsi (böyük = daha tez dayanır) */
  damping?: number; // 0.78 .. 0.92

  /** Max sürət clamp (çox böyük olmasın) */
  maxVelocity?: number; // 30 .. 80

  /** böyük wheel spike-ları yumşalt */
  softCap?: number; // 60 .. 120

  /** trackpad xırda jitter-i kəssin */
  wheelDeadzone?: number; // 2.5 .. 6

  /** max target add per single wheel event */
  maxImpulsePx?: number; // 400 .. 1400
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
  return clamp(dy, -320, 320);
}

function soften(dy: number, softCap: number) {
  const s = Math.sign(dy);
  const a = Math.abs(dy);
  if (a <= softCap) return dy;
  const extra = a - softCap;
  return s * (softCap + extra * 0.22);
}

export default function SmoothWheelScroll({
  enabled = true,
  minWidth = 980,
  locationKey,
  ignoreSelectors,

  // ✅ “1 scroll → düşsün, sonra uzun yavaşlayıb dayansın”
  distanceFactor = 1.25,
  spring = 0.095,
  damping = 0.86,
  maxVelocity = 58,
  softCap = 80,
  wheelDeadzone = 3.5,
  maxImpulsePx = 980,
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

  // spring state
  const posRef = useRef(0);     // where we are animating to
  const targetRef = useRef(0);  // where we want to be
  const velRef = useRef(0);     // current velocity

  const lastNativeRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
    if (window.innerWidth < minWidth) return;

    const fine = window.matchMedia?.("(pointer: fine)")?.matches;
    const hover = window.matchMedia?.("(hover: hover)")?.matches;
    if (!fine || !hover) return;

    const docEl = document.documentElement;
    const maxScroll = () => Math.max(0, docEl.scrollHeight - window.innerHeight);

    const syncNative = () => {
      const y = window.scrollY || 0;
      posRef.current = y;
      targetRef.current = y;
      lastNativeRef.current = y;
    };

    const stop = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      velRef.current = 0;
    };

    const step = () => {
      const mx = maxScroll();

      // başqa kod/native scroll dəyişibsə, state-i tutuşdur
      const nativeY = window.scrollY || 0;
      if (Math.abs(nativeY - lastNativeRef.current) > 2) {
        posRef.current = nativeY;
        targetRef.current = clamp(targetRef.current, 0, mx);
      }

      // spring force: (target - pos) * spring
      const pos = posRef.current;
      const target = clamp(targetRef.current, 0, mx);
      const diff = target - pos;

      // accelerate towards target
      velRef.current += diff * spring;

      // damping (yavaş-yavaş dayansın)
      velRef.current *= damping;

      // clamp speed
      velRef.current = clamp(velRef.current, -maxVelocity, maxVelocity);

      // integrate
      let next = pos + velRef.current;
      next = clamp(next, 0, mx);

      posRef.current = next;
      lastNativeRef.current = next;
      window.scrollTo(0, next);

      // stop condition: close enough + very low velocity
      if (Math.abs(diff) < 0.5 && Math.abs(velRef.current) < 0.12) {
        stop();
        return;
      }

      // edges stop
      if (next <= 0 || next >= mx) {
        stop();
        return;
      }

      rafRef.current = requestAnimationFrame(step);
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;
      if (shouldIgnoreTarget(e.target, ignores)) return;

      const sp = getScrollableParent(e.target instanceof Element ? e.target : null);
      if (sp) return; // allow native scroll inside containers

      let dy = normalizeDelta(e);
      if (Math.abs(dy) < wheelDeadzone) return;

      const y = window.scrollY || 0;
      const mx = maxScroll();

      // edge: let native happen
      if ((y <= 0 && dy < 0) || (y >= mx && dy > 0)) {
        stop();
        syncNative();
        return;
      }

      e.preventDefault();

      // keep base synced before applying impulse
      const nativeY = window.scrollY || 0;
      posRef.current = nativeY;
      lastNativeRef.current = nativeY;

      dy = soften(dy, softCap);

      // ✅ main trick: wheel -> target jump (big “düşmə”)
      const impulse = clamp(dy * distanceFactor, -maxImpulsePx, maxImpulsePx);
      targetRef.current = clamp(targetRef.current + impulse, 0, mx);

      if (!rafRef.current) rafRef.current = requestAnimationFrame(step);
    };

    const onResize = () => {
      syncNative();
      const y = window.scrollY || 0;
      const mx = maxScroll();
      if (y <= 0 || y >= mx) stop();
    };

    syncNative();
    stop();

    window.addEventListener("wheel", onWheel, { passive: false });
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
    locationKey,
    JSON.stringify(ignores),

    distanceFactor,
    spring,
    damping,
    maxVelocity,
    softCap,
    wheelDeadzone,
    maxImpulsePx,
  ]);

  return null;
}
