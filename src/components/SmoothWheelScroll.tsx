import React, { useEffect, useMemo, useRef } from "react";

type Props = {
  enabled?: boolean;
  minWidth?: number;
  locationKey?: string;
  ignoreSelectors?: string[];

  // tuning
  strength?: number;       // wheel -> accel
  friction?: number;       // inertia decay (0.86..0.92)  (yuxarı = daha çox sürüşmə)
  maxVelocity?: number;    // clamp
  softCap?: number;        // yumuşatma həddi

  // ✅ “1 scroll = azca sürüşüb dayansın” üçün limitlər
  maxTravelPerWheel?: number; // px — bir wheel jestində maksimum neçə px "sürüşə" bilər
  idleBrakeMs?: number;       // ms — wheel gəlməsə əlavə əyləc başlasın
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

  // free-spin wheel spike-ləri kəs
  dy = clamp(dy, -240, 240);
  return dy;
}

// böyük dəyərləri yumşalt (uçmasın)
function soften(v: number, softCap: number) {
  const s = Math.sign(v);
  const a = Math.abs(v);
  if (a <= softCap) return v;

  const extra = a - softCap;
  // cap-dən sonra artım yavaşıyır
  const damped = softCap + extra * 0.22;
  return s * damped;
}

export default function SmoothWheelScroll({
  enabled = true,
  minWidth = 980,
  locationKey,
  ignoreSelectors,

  // ✅ sürət: səndə “ela” olan kimi — yavaş, kontrollu
  strength = 0.12,
  friction = 0.90,
  maxVelocity = 42,
  softCap = 70,

  // ✅ 1 scroll jestində maksimum məsafə (buz kimi azca sürüşüb dayansın)
  maxTravelPerWheel = 420, // px (istəsən 320/500 eləyə bilərsən)
  idleBrakeMs = 110,
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

  // ✅ “1 wheel jestinin” qalan məsafə büdcəsi
  const travelLeftRef = useRef(0);
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
      travelLeftRef.current = 0;
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

      // ✅ idle əyləc: wheel gəlmirsə daha tez dayansın
      const now = performance.now();
      const idleFor = now - (lastWheelTsRef.current || 0);
      const extraBrake = idleFor > idleBrakeMs ? 0.86 : 1; // idle olanda əlavə friction
      velocityRef.current *= friction * extraBrake;

      // ✅ travel budget: qalan məsafə bitdisə STOP (səndəki “dayanmır” burda qırılır)
      const vAbs = Math.abs(velocityRef.current);
      if (vAbs > 0) {
        travelLeftRef.current = Math.max(0, travelLeftRef.current - vAbs);
        if (travelLeftRef.current <= 0) {
          stop();
          return;
        }
      }

      // dayandırma həddi
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

      dy = soften(dy, softCap);

      const add = clamp(dy * strength, -maxVelocity, maxVelocity);

      const now = performance.now();
      const dt = now - (lastWheelTsRef.current || 0);
      lastWheelTsRef.current = now;

      // ✅ əsas fix: velocity yığılmasın
      // dt kiçikdirsə (ard-arda wheel), köhnə sürəti çox saxlamırıq
      const carry = dt < 90 ? 0.25 : dt < 160 ? 0.35 : 0.45;

      velocityRef.current = clamp(velocityRef.current * carry + add, -maxVelocity, maxVelocity);

      // ✅ hər wheel jestinə maksimum “sürüşmə məsafəsi” əlavə et
      // ard-arda wheel vursan, bu budget yığılır, amma limitlidir
      const budgetAdd = clamp(Math.abs(dy) * 1.6, 140, 520); // dy böyükdürsə bir az çox, amma nəzarətli
      travelLeftRef.current = clamp(travelLeftRef.current + budgetAdd, 0, maxTravelPerWheel);

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
    maxTravelPerWheel,
    idleBrakeMs,
    locationKey,
    JSON.stringify(ignores),
  ]);

  return null;
}
