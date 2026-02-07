import React, { useEffect, useMemo, useRef } from "react";

type Props = {
  enabled?: boolean;
  minWidth?: number;          // desktop only
  strength?: number;          // wheel -> velocity multiplier
  friction?: number;          // inertia decay (0.80..0.92 yaxşı)
  maxVelocity?: number;       // clamp
  locationKey?: string;       // route dəyişəndə reset üçün
  ignoreSelectors?: string[]; // iç-scroll olan yerlər
};

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function getScrollableParent(el: Element | null) {
  let cur: Element | null = el;
  while (cur && cur !== document.documentElement) {
    const st = getComputedStyle(cur);
    const oy = st.overflowY;
    const canScroll = (oy === "auto" || oy === "scroll") && (cur as HTMLElement).scrollHeight > (cur as HTMLElement).clientHeight + 2;
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
  // deltaMode: 0=pixel, 1=line, 2=page
  let dy = e.deltaY;

  // trackpad çox kiçik dəyərlər göndərə bilir — normal saxlayırıq
  if (e.deltaMode === 1) dy *= 16; // lines -> px
  else if (e.deltaMode === 2) dy *= window.innerHeight;

  return dy;
}

export default function SmoothWheelScroll({
  enabled = true,
  minWidth = 980,
  strength = 0.85,
  friction = 0.88,
  maxVelocity = 240,
  locationKey,
  ignoreSelectors,
}: Props) {
  const ignores = useMemo(
    () =>
      ignoreSelectors?.length
        ? ignoreSelectors
        : [
            // widget/admin kimi iç-scroll yerləri
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

    // reduced motion -> off
    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (prefersReduced) return;

    // mobile -> off (touch native)
    if (window.innerWidth < minWidth) return;

    // yalnız mouse wheel (fine pointer) üçün
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
      const y = window.scrollY || window.pageYOffset || 0;
      posRef.current = y;
      lastYRef.current = y;
    };

    // route dəyişəndə “sürət yığılması” olmasın
    syncToNative();
    stop();

    const step = () => {
      // native scroll başqa yerdən dəyişibsə (keyboard, drag, etc) sync et
      const nativeY = window.scrollY || 0;
      if (Math.abs(nativeY - lastYRef.current) > 2) {
        posRef.current = nativeY;
      }

      // inertia
      velocityRef.current *= friction;

      // çox kiçikdirsə dayandır
      if (Math.abs(velocityRef.current) < 0.1) {
        stop();
        return;
      }

      const next = posRef.current + velocityRef.current;
      const clamped = clamp(next, 0, maxScroll());

      posRef.current = clamped;
      lastYRef.current = clamped;
      window.scrollTo(0, clamped);

      // sərhədə dəyibsə velocity-ni öldür (top/bottom “donma” olmasın)
      if (clamped <= 0 || clamped >= maxScroll()) {
        velocityRef.current = 0;
        stop();
        return;
      }

      rafRef.current = requestAnimationFrame(step);
    };

    const onWheel = (e: WheelEvent) => {
      // zoom gesture / ctrl+wheel -> native
      if (e.ctrlKey) return;

      // iç scroll olan elementlərdə native saxla
      if (shouldIgnoreTarget(e.target, ignores)) return;

      // əgər mouse iç-scroll konteynerin üstündədirsə (closest scrollable) native olsun
      const sp = getScrollableParent(e.target instanceof Element ? e.target : null);
      if (sp) return;

      const dyRaw = normalizeDelta(e);

      // çox xırda (trackpad noise) -> native
      if (Math.abs(dyRaw) < 2.5) return;

      const y = window.scrollY || 0;
      const mx = maxScroll();

      // TOP/BOTTOM sərhədlərində native scroll-a icazə ver:
      //  - top-da yuxarı (dy<0) gəlirsə preventDefault ETMƏ
      //  - bottom-da aşağı (dy>0) gəlirsə preventDefault ETMƏ
      if ((y <= 0 && dyRaw < 0) || (y >= mx && dyRaw > 0)) {
        // inertia varsa sıfırla ki, sərhəddə “tutulma” olmasın
        stop();
        syncToNative();
        return;
      }

      // burada artıq smooth edəcəyik
      e.preventDefault();

      // native scroll ilə sinxron saxla
      syncToNative();

      // wheel -> velocity (aşırı sürətlənməsin)
      const add = clamp(dyRaw * strength, -maxVelocity, maxVelocity);

      // ardıcıl wheel-lərdə yüngül toplanma, amma clamp var
      velocityRef.current = clamp(velocityRef.current + add, -maxVelocity, maxVelocity);

      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    // passive:false lazımdır ki preventDefault işləsin
    window.addEventListener("wheel", onWheel, { passive: false });

    // resize zamanı maxScroll dəyişir -> sync
    const onResize = () => {
      syncToNative();
      // sərhədə düşübsə velocity-ni öldür
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
  }, [enabled, minWidth, strength, friction, maxVelocity, locationKey, JSON.stringify(ignores)]);

  return null;
}
