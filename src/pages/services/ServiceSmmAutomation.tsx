// src/pages/services/ServiceSmmAutomation.tsx
import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Megaphone, CalendarClock, BarChart3, ArrowRight, CheckCircle2 } from "lucide-react";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

const RAW_VIDEO =
  "https://res.cloudinary.com/dppoomunj/video/upload/v1770677383/neox/media/asset_1770677379623_8928b0b249907.mp4";

// Cloudinary transform: insert q_auto,f_auto right after /upload/
function cloudinaryAuto(url: string) {
  try {
    if (!url.includes("/upload/")) return url;
    if (url.includes("/upload/q_auto") || url.includes("/upload/f_auto")) return url;
    return url.replace("/upload/", "/upload/q_auto,f_auto/");
  } catch {
    return url;
  }
}
const VIDEO_URL = cloudinaryAuto(RAW_VIDEO);

const TINTS = {
  amber: {
    a: "rgba(255,184,47,.22)",
    b: "rgba(255,184,47,.10)",
    c: "rgba(255,184,47,.06)",
    d: "rgba(255,184,47,.28)",
  },
} as const;

type Lang = "az" | "en" | "tr" | "ru" | "es";
const LANGS: Lang[] = ["az", "en", "tr", "ru", "es"];

function getLangFromPath(pathname: string): Lang {
  const seg = (pathname.split("/")[1] || "").toLowerCase() as Lang;
  return LANGS.includes(seg) ? seg : "az";
}
function withLang(path: string, lang: Lang) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `/${lang}${p}`;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const on = () => setReduced(!!mq.matches);
    on();
    mq.addEventListener ? mq.addEventListener("change", on) : (mq as any).addListener(on);
    return () => {
      mq.removeEventListener ? mq.removeEventListener("change", on) : (mq as any).removeListener(on);
    };
  }, []);
  return reduced;
}

/** Smooth reveal-on-scroll (very light, FPS-friendly) */
function useRevealOnScroll(disabled: boolean) {
  useEffect(() => {
    if (disabled) return;

    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.16, rootMargin: "0px 0px -10% 0px" }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [disabled]);
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="svc-feat" data-reveal>
      <div className="svc-feat__tick" aria-hidden="true">
        <CheckCircle2 size={16} />
      </div>
      <div className="svc-feat__body">
        <div className="svc-feat__t">{title}</div>
        <div className="svc-feat__d">{desc}</div>
      </div>
    </div>
  );
}

/**
 * ✅ Single pill rotator:
 * - 1 pill only
 * - text swaps with vertical motion (current goes DOWN, next comes from ABOVE)
 * - pill width adapts to the active text
 * - text uses the same “smart blue” palette
 */
function PillRotator({
  items,
  intervalMs = 2200,
  disabled,
}: {
  items: string[];
  intervalMs?: number;
  disabled: boolean;
}) {
  const safe = items.length ? items : [""];
  const [i, setI] = useState(0);
  const [prev, setPrev] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  const measureRef = useRef<HTMLSpanElement | null>(null);
  const [w, setW] = useState<number | null>(null);

  // rotate index
  useEffect(() => {
    if (disabled) return;
    if (safe.length <= 1) return;
    const t = window.setInterval(() => {
      setPrev((p) => {
        const next = (i + 1) % safe.length;
        // prev should be current i, so store it before changing i
        return i;
      });
      setI((p) => (p + 1) % safe.length);
      setAnimKey((k) => k + 1);
    }, intervalMs);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, intervalMs, safe.length, i]);

  // measure width of current label
  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;

    const doMeasure = () => {
      const r = el.getBoundingClientRect();
      const next = Math.ceil(r.width);
      if (next > 0) setW(next);
    };

    const raf = requestAnimationFrame(() => doMeasure());
    const ro = new ResizeObserver(() => doMeasure());
    ro.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [i, animKey]);

  const current = safe[i];
  const previous = safe[prev];

  return (
    <span
      className="svc-pill svc-pill--rot"
      aria-label={current}
      style={w ? { width: `calc(${w}px + 34px)` } : undefined} // text width + padding
    >
      {/* hidden measurer */}
      <span className="svc-pillMeasure" aria-hidden="true">
        <span ref={measureRef} className="svc-pillMeasureText">
          {current}
        </span>
      </span>

      <span className="svc-pillRot-clip" aria-hidden="false">
        {disabled || safe.length <= 1 ? (
          <span className="svc-pillRot-static">
            <span className="svc-pillRot-text">{current}</span>
          </span>
        ) : (
          <span className="svc-pillRot-stage" key={animKey}>
            {/* previous slides DOWN + fades */}
            <span className="svc-pillRot-item svc-pillRot-item--out">
              <span className="svc-pillRot-text">{previous}</span>
            </span>
            {/* current comes from ABOVE -> center */}
            <span className="svc-pillRot-item svc-pillRot-item--in">
              <span className="svc-pillRot-text">{current}</span>
            </span>
          </span>
        )}
      </span>
    </span>
  );
}

function ServicePage({
  tint = "amber",
  kicker,
  title,
  subtitle,
  icon: Icon,
  pills,
  featuresLeft,
  featuresRight,
  videoUrl,
}: {
  tint?: keyof typeof TINTS;
  kicker: string;
  title: string;
  subtitle: string;
  icon: any;
  pills: string[];
  featuresLeft: Array<{ title: string; desc: string }>;
  featuresRight: Array<{ title: string; desc: string }>;
  videoUrl: string;
}) {
  const location = useLocation();
  const lang = useMemo(() => getLangFromPath(location.pathname), [location.pathname]);
  const reduced = usePrefersReducedMotion();
  useRevealOnScroll(reduced);

  const T = TINTS[tint];

  /** ✅ FPS-friendly video:
   * - play only when visible
   * - pause when out of view
   */
  const vidRef = useRef<HTMLVideoElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);
  const [canPlay, setCanPlay] = useState(false);

  useEffect(() => {
    const el = rightRef.current;
    if (!el) return;

    let started = false;
    let startTimer: number | null = null;

    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.some((e) => e.isIntersecting);
        const v = vidRef.current;

        if (vis) {
          if (!started) {
            if (startTimer) window.clearTimeout(startTimer);
            startTimer = window.setTimeout(() => {
              started = true;
              setCanPlay(true);
              if (v) v.play().catch(() => {});
            }, 420);
          } else {
            setCanPlay(true);
            if (v) v.play().catch(() => {});
          }
        } else {
          setCanPlay(false);
          if (v) v.pause();
        }
      },
      { threshold: 0.25, rootMargin: "0px 0px -10% 0px" }
    );

    io.observe(el);
    return () => {
      if (startTimer) window.clearTimeout(startTimer);
      io.disconnect();
    };
  }, []);

  const contact =
    lang === "az"
      ? "Əlaqə saxla"
      : lang === "tr"
      ? "İletişim"
      : lang === "ru"
      ? "Связаться"
      : lang === "es"
      ? "Contacto"
      : "Contact";

  const pricing =
    lang === "az"
      ? "Qiymətlər"
      : lang === "tr"
      ? "Fiyatlar"
      : lang === "ru"
      ? "Цены"
      : lang === "es"
      ? "Precios"
      : "Pricing";

  return (
    <section
      className="svc"
      style={
        {
          ["--tA" as any]: T.a,
          ["--tB" as any]: T.b,
          ["--tC" as any]: T.c,
          ["--tD" as any]: T.d,
        } as React.CSSProperties
      }
    >
      <style>{`
        html, body { background:#000 !important; }

        .svc{
          padding: calc(var(--hdrh,72px) + 28px) 0 84px;
          overflow-x:hidden;
          color: rgba(255,255,255,.92);
          background:#000;
          text-rendering: geometricPrecision;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .svc *{ box-sizing:border-box; }
        .svc .container{ max-width: 1180px; margin:0 auto; padding:0 18px; }
        .svc a{ text-decoration:none !important; }
        .svc a:hover{ text-decoration:none !important; }

        /* reveal */
        [data-reveal]{
          opacity: 0;
          transform: translate3d(0,10px,0);
          transition: opacity .55s ease, transform .55s ease;
          will-change: opacity, transform;
        }
        .is-in{ opacity: 1 !important; transform: translate3d(0,0,0) !important; }
        @media (prefers-reduced-motion: reduce){
          [data-reveal]{ opacity: 1; transform: none; transition: none; }
        }

        /* =========================
           ✅ “Smart blue” gradient text
        ========================= */
        .svc-grad{
          background: linear-gradient(
            90deg,
            #ffffff 0%,
            rgba(170,225,255,.96) 34%,
            rgba(47,184,255,.95) 68%,
            rgba(42,125,255,.95) 100%
          );
          -webkit-background-clip:text;
          background-clip:text;
          color:transparent;
        }
        .svc-shimmer{
          position: relative;
          display: inline-block;
          isolation: isolate;
        }
        .svc-shimmer::after{
          content:"";
          position:absolute;
          inset: -12% -60%;
          pointer-events:none;
          background: linear-gradient(
            110deg,
            transparent 0%,
            transparent 35%,
            rgba(255,255,255,.30) 45%,
            rgba(170,225,255,.55) 50%,
            rgba(47,184,255,.45) 55%,
            transparent 65%,
            transparent 100%
          );
          mix-blend-mode: screen;
          opacity: .9;
          transform: translate3d(-40%,0,0);
          will-change: transform;
          ${reduced ? "" : "animation: svcShine 2.8s linear infinite;"}
        }
        @keyframes svcShine{
          0%{ transform: translate3d(-55%,0,0); }
          100%{ transform: translate3d(55%,0,0); }
        }
        @media (prefers-reduced-motion: reduce){
          .svc-shimmer::after{ animation:none !important; display:none; }
        }

        .svc-hero{
          position: relative;
          border-radius: 26px;
          border: 1px solid rgba(255,255,255,.08);
          background:
            radial-gradient(120% 90% at 18% 10%, var(--tA), transparent 55%),
            radial-gradient(120% 90% at 86% 10%, rgba(47,184,255,.12), transparent 60%),
            rgba(10,12,18,.55);
          box-shadow: 0 26px 120px rgba(0,0,0,.55);
          overflow:hidden;
          contain: layout paint style;
        }
        .svc-hero::before{
          content:"";
          position:absolute; inset:-2px;
          background: radial-gradient(620px 260px at 22% 18%, var(--tB), transparent 60%);
          opacity:.85;
          filter: blur(14px);
          pointer-events:none;
        }

        .svc-hero__inner{
          position:relative;
          padding: 28px 22px;
          display:grid;
          grid-template-columns: 1.02fr .98fr;
          gap: 18px;
          align-items: stretch;
          min-width:0;
          isolation: isolate;
        }
        @media (max-width: 980px){
          .svc-hero__inner{ grid-template-columns: 1fr; padding: 22px 16px; }
        }

        .svc-left{ min-width:0; position:relative; z-index: 2; }

        .svc-kicker{
          display:inline-flex; align-items:center; gap:10px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          padding: 10px 14px;
          border-radius: 999px;
          font-size: 12px;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: rgba(255,255,255,.70);
        }
        .svc-kdot{
          width: 8px; height: 8px; border-radius: 999px;
          background: rgba(47,184,255,1);
          box-shadow: 0 0 0 4px rgba(47,184,255,.14), 0 0 18px rgba(47,184,255,.42);
        }

        /* =========================
           ✅ TITLE ribbon behavior
           - goes under the title
           - then "dives behind" the VIDEO panel and disappears there
           - IMPORTANT: it does NOT go all the way to panel end
        ========================= */
        .svc-title{
          position: relative;
          margin-top: 14px;
          font-size: 40px;
          line-height: 1.05;
          color: rgba(255,255,255,.94);
          font-weight: 600;
          letter-spacing: -0.02em;
          z-index: 2;
        }
        @media (min-width: 640px){ .svc-title{ font-size: 60px; } }

        .svc-titleText{
          position: relative;
          display: inline-block;
          isolation: isolate;
          z-index: 2;
        }

        /* thick ribbon under title */
        .svc-titleText::before{
          content:"";
          position:absolute;
          left: calc(-1 * (22px + 18px)); /* start from panel edge */
          right: -22px;
          top: 58%;
          height: 56px;
          border-radius: 18px;
          transform: translate3d(0,-50%,0);
          background: linear-gradient(90deg,
            rgba(255,255,255,.12) 0%,
            rgba(170,225,255,.26) 28%,
            rgba(47,184,255,.32) 55%,
            rgba(42,125,255,.28) 100%
          );
          box-shadow:
            0 14px 60px rgba(0,0,0,.36),
            0 0 0 1px rgba(255,255,255,.06) inset;
          opacity: .95;
          pointer-events:none;

          /* fade earlier so it "vanishes behind" the start of the video panel */
          -webkit-mask-image: linear-gradient(
            90deg,
            rgba(0,0,0,1) 0%,
            rgba(0,0,0,1) 44%,
            rgba(0,0,0,.55) 52%,
            rgba(0,0,0,0) 62%
          );
          mask-image: linear-gradient(
            90deg,
            rgba(0,0,0,1) 0%,
            rgba(0,0,0,1) 44%,
            rgba(0,0,0,.55) 52%,
            rgba(0,0,0,0) 62%
          );

          will-change: transform, opacity;
          ${reduced ? "" : "animation: svcRibbonLoop 3.2s linear infinite;"}
          z-index: 1;
        }

        /* shine on top of ribbon */
        .svc-titleText::after{
          content:"";
          position:absolute;
          left: calc(-1 * (22px + 18px));
          right: -22px;
          top: 58%;
          height: 56px;
          border-radius: 18px;
          transform: translate3d(-60%, -50%, 0);
          background: linear-gradient(
            110deg,
            transparent 0%,
            transparent 35%,
            rgba(255,255,255,.22) 45%,
            rgba(170,225,255,.55) 50%,
            rgba(47,184,255,.45) 55%,
            transparent 65%,
            transparent 100%
          );
          opacity: .85;
          mix-blend-mode: screen;
          pointer-events:none;

          -webkit-mask-image: linear-gradient(
            90deg,
            rgba(0,0,0,1) 0%,
            rgba(0,0,0,1) 44%,
            rgba(0,0,0,.55) 52%,
            rgba(0,0,0,0) 62%
          );
          mask-image: linear-gradient(
            90deg,
            rgba(0,0,0,1) 0%,
            rgba(0,0,0,1) 44%,
            rgba(0,0,0,.55) 52%,
            rgba(0,0,0,0) 62%
          );

          will-change: transform;
          ${reduced ? "" : "animation: svcRibbonShine 3.2s linear infinite;"}
          z-index: 1;
        }

        @keyframes svcRibbonLoop{
          0%   { transform: translate3d(-52%, -50%, 0); opacity: .92; }
          62%  { transform: translate3d(-6%,  -50%, 0); opacity: .92; }
          78%  { transform: translate3d(  2%,  -50%, 0); opacity: .00; }
          100% { transform: translate3d(-52%, -50%, 0); opacity: .92; }
        }
        @keyframes svcRibbonShine{
          0%   { transform: translate3d(-62%, -50%, 0); }
          62%  { transform: translate3d(-6%,  -50%, 0); }
          78%  { transform: translate3d(  2%,  -50%, 0); }
          100% { transform: translate3d(-62%, -50%, 0); }
        }

        @media (max-width: 980px){
          .svc-titleText::before, .svc-titleText::after{ left: -16px; }
        }
        @media (prefers-reduced-motion: reduce){
          .svc-titleText::before, .svc-titleText::after{ animation:none !important; }
          .svc-titleText::after{ display:none; }
        }

        .svc-sub{
          margin-top: 14px;
          color: rgba(255,255,255,.70);
          font-size: 16px;
          line-height: 1.7;
          max-width: 72ch;
        }
        @media (min-width: 640px){ .svc-sub{ font-size: 18px; } }

        .svc-pills{
          margin-top: 14px;
          display:flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items:center;
        }

        .svc-pill{
          display:inline-flex; align-items:center; justify-content:center;
          height: 34px;
          padding: 0 14px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.05);
          font-weight: 900;
          font-size: 12px;
          white-space: nowrap;
          transition: width .26s ease;
          position: relative;
          overflow: hidden;
          transform: translateZ(0);
        }

        /* ✅ single adaptive pill look (smart blue palette) */
        .svc-pill--rot{
          max-width: min(380px, 92vw);
          border-color: rgba(47,184,255,.20);
          background:
            radial-gradient(120% 140% at 20% 20%, rgba(47,184,255,.22), transparent 58%),
            radial-gradient(120% 140% at 70% 85%, rgba(42,125,255,.18), transparent 56%),
            rgba(255,255,255,.05);
          box-shadow:
            0 18px 60px rgba(0,0,0,.35),
            0 0 0 1px rgba(255,255,255,.06) inset;
        }

        .svc-pillMeasure{
          position:absolute;
          left:-9999px; top:-9999px;
          opacity:0;
          pointer-events:none;
          white-space:nowrap;
          font-weight: 900;
          font-size: 12px;
        }
        .svc-pillMeasureText{ display:inline-block; }

        .svc-pillRot-clip{
          height: 34px;
          overflow:hidden;
          display:block;
          width: 100%;
        }

        .svc-pillRot-static{
          height: 34px;
          display:flex;
          align-items:center;
          justify-content:center;
        }

        /* stage holds 2 items (prev + current) */
        .svc-pillRot-stage{
          position: relative;
          height: 34px;
          width: 100%;
        }

        .svc-pillRot-item{
          position:absolute;
          inset:0;
          height: 34px;
          display:flex;
          align-items:center;
          justify-content:center;
          will-change: transform, opacity;
        }

        /* previous goes DOWN and fades */
        .svc-pillRot-item--out{
          transform: translate3d(0,0,0);
          opacity: 1;
          ${reduced ? "" : "animation: pillOut 520ms cubic-bezier(.2,.8,.2,1) forwards;"}
        }

        /* new one comes from ABOVE */
        .svc-pillRot-item--in{
          transform: translate3d(0,-34px,0);
          opacity: 0;
          ${reduced ? "" : "animation: pillIn 520ms cubic-bezier(.2,.8,.2,1) forwards;"}
          animation-delay: 10ms;
        }

        @keyframes pillOut{
          0%{ transform: translate3d(0,0,0); opacity: 1; }
          100%{ transform: translate3d(0,34px,0); opacity: 0; }
        }
        @keyframes pillIn{
          0%{ transform: translate3d(0,-34px,0); opacity: 0; }
          100%{ transform: translate3d(0,0,0); opacity: 1; }
        }

        .svc-pillRot-text{
          font-weight: 950;
          letter-spacing: .01em;
          background: linear-gradient(
            90deg,
            rgba(255,255,255,.96) 0%,
            rgba(170,225,255,.96) 38%,
            rgba(47,184,255,.96) 70%,
            rgba(42,125,255,.96) 100%
          );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          text-shadow: 0 0 22px rgba(47,184,255,.10);
        }

        @media (prefers-reduced-motion: reduce){
          .svc-pillRot-item--out, .svc-pillRot-item--in{ animation:none !important; transform:none !important; opacity:1 !important; }
        }

        .svc-ctaRow{
          margin-top: 18px;
          display:flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .svc-cta{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap: 10px;
          height: 44px;
          padding: 0 16px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background:
            radial-gradient(120% 120% at 20% 10%, var(--tA), transparent 60%),
            rgba(255,255,255,.06);
          color: rgba(255,255,255,.92);
          font-weight: 900;
          text-decoration:none;
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
          transform: translateZ(0);
        }
        .svc-cta:hover{ transform: translate3d(0,-1px,0); border-color: rgba(47,184,255,.22); background: rgba(255,255,255,.08); }
        @media (hover:none){ .svc-cta:hover{ transform:none; } }
        .svc-cta--ghost{ background: rgba(255,255,255,.04); }

        /* right video */
        .svc-right{
          min-width:0;
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,.08);
          overflow:hidden;
          position:relative;
          background: rgba(0,0,0,.35);
          contain: layout paint style;
          z-index: 3; /* ✅ makes title ribbon feel like it goes BEHIND this panel */
        }
        .svc-videoWrap{
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 320px;
          border-radius: 22px;
          overflow:hidden;
          transform: translateZ(0);
          backface-visibility:hidden;
        }
        @media (max-width: 980px){ .svc-videoWrap{ min-height: 260px; } }

        .svc-video{
          position:absolute; inset:0;
          width:100%; height:100%;
          object-fit: cover;
          display:block;
          transform: translateZ(0);
        }
        .svc-videoScrim{
          position:absolute; inset:0;
          background:
            radial-gradient(120% 90% at 20% 15%, rgba(255,184,47,.14), transparent 55%),
            linear-gradient(180deg, rgba(0,0,0,.12), rgba(0,0,0,.46) 92%);
          pointer-events:none;
        }
        .svc-badge{
          position:absolute; top:12px; left:12px; right:12px;
          display:flex; align-items:center; justify-content: space-between; gap:10px;
          pointer-events:none;
        }
        .svc-badgeLeft{
          display:inline-flex; align-items:center; gap:10px;
          padding: 9px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(0,0,0,.28);
          color: rgba(255,255,255,.88);
          font-weight: 900;
          letter-spacing: .12em;
          font-size: 11px;
        }
        .svc-badgeRight{
          display:inline-flex; align-items:center; gap:8px;
          padding: 9px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(0,0,0,.28);
          color: rgba(255,255,255,.86);
          font-weight: 900;
          font-size: 12px;
        }
        .svc-dot{
          width: 8px; height: 8px; border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), var(--tD));
          box-shadow: 0 0 0 4px var(--tC);
          ${reduced ? "" : "animation: svcBreath 1.6s ease-in-out infinite;"}
        }
        @keyframes svcBreath{
          0%,100%{ transform: scale(1); opacity:.95; }
          50%{ transform: scale(1.18); opacity:.80; }
        }

        .svc-section{
          margin-top: 26px;
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          align-items: start;
        }
        @media (max-width: 980px){ .svc-section{ grid-template-columns: 1fr; } }

        .svc-card{
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.03);
          padding: 16px 16px;
          box-shadow: 0 22px 90px rgba(0,0,0,.40);
          contain: layout paint style;
          overflow: hidden;
        }
        .svc-card__title{
          display:flex; align-items:center; gap:10px;
          font-weight: 600;
          color: rgba(255,255,255,.92);
          letter-spacing: -.01em;
          font-size: 22px;
          position: relative;
          min-width: 0;
        }
        @media (min-width: 640px){ .svc-card__title{ font-size: 26px; } }

        /* ✅ Lower cards ribbon: goes to the END and feels like it "enters" the edge (does not fade out) */
        .svc-cardTitleText{
          position: relative;
          display: inline-block;
          isolation: isolate;
          min-width: 0;
        }
        .svc-cardTitleText::before{
          content:"";
          position:absolute;
          left: -16px;
          right: -16px; /* full card width */
          top: 58%;
          height: 46px;
          border-radius: 16px;
          transform: translate3d(0,-50%,0);
          background: linear-gradient(
            90deg,
            rgba(255,255,255,.10) 0%,
            rgba(170,225,255,.22) 30%,
            rgba(47,184,255,.26) 62%,
            rgba(42,125,255,.18) 100%
          );
          opacity: .95;
          pointer-events:none;

          /* “entering end” illusion: keep visible to the end, but darken & sink into the last 12% */
          box-shadow:
            inset -22px 0 26px rgba(0,0,0,.58),
            0 10px 46px rgba(0,0,0,.32),
            0 0 0 1px rgba(255,255,255,.06) inset;
          will-change: transform;
          ${reduced ? "" : "animation: cardRibbon 3.0s linear infinite;"}
          z-index: 0;
        }
        .svc-cardTitleText > *{ position: relative; z-index: 1; }

        @keyframes cardRibbon{
          0%   { transform: translate3d(-52%, -50%, 0); }
          65%  { transform: translate3d(-6%,  -50%, 0); }
          100% { transform: translate3d(-52%, -50%, 0); }
        }
        @media (prefers-reduced-motion: reduce){
          .svc-cardTitleText::before{ animation:none !important; }
        }

        .svc-card__desc{
          margin-top: 10px;
          color: rgba(255,255,255,.70);
          line-height: 1.7;
          font-size: 14px;
        }

        .svc-feat{
          display:flex; gap:10px; align-items:flex-start;
          padding:10px 10px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(0,0,0,.18);
        }
        .svc-feat + .svc-feat{ margin-top: 10px; }
        .svc-feat__tick{
          width:30px; height:30px; border-radius:12px;
          display:flex; align-items:center; justify-content:center;
          border: 1px solid rgba(255,255,255,.10);
          background: var(--tC);
          color: rgba(255,255,255,.92);
          flex: 0 0 auto;
        }
        .svc-feat__t{ font-weight: 600; color: rgba(255,255,255,.92); }
        .svc-feat__d{ margin-top: 4px; color: rgba(255,255,255,.66); line-height: 1.65; font-size: 13.5px; }
      `}</style>

      <div className="container">
        <div className="svc-hero">
          <div className="svc-hero__inner">
            <div className="svc-left">
              <div className="svc-kicker" data-reveal>
                <span className="svc-kdot" aria-hidden="true" />
                <span>{kicker}</span>
              </div>

              <div className="svc-title" data-reveal style={{ transitionDelay: "40ms" }}>
                <span className="svc-titleText">
                  <span className="svc-grad svc-shimmer">{title}</span>
                </span>
              </div>

              <div className="svc-sub" data-reveal style={{ transitionDelay: "90ms" }}>
                {subtitle}
              </div>

              <div className="svc-pills" data-reveal style={{ transitionDelay: "140ms" }}>
                <PillRotator items={pills} disabled={reduced} />
              </div>

              <div className="svc-ctaRow" data-reveal style={{ transitionDelay: "190ms" }}>
                <Link to={withLang("/contact", lang)} className="svc-cta">
                  {contact} <ArrowRight size={16} />
                </Link>
                <Link to={withLang("/pricing", lang)} className="svc-cta svc-cta--ghost">
                  {pricing}
                </Link>
              </div>
            </div>

            <div ref={rightRef} className="svc-right" data-reveal style={{ transitionDelay: "120ms" }}>
              <div className="svc-videoWrap">
                <video
                  ref={vidRef}
                  className="svc-video"
                  src={videoUrl}
                  autoPlay={false}
                  muted
                  loop
                  playsInline
                  preload="none"
                />
                <div className="svc-videoScrim" aria-hidden="true" />

                <div className="svc-badge" aria-hidden="true">
                  <div className="svc-badgeLeft">
                    <Icon size={14} />
                    <span>NEOX</span>
                  </div>
                  <div className="svc-badgeRight">
                    <span className="svc-dot" />
                    <span>{canPlay ? "LIVE" : "READY"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="svc-section">
          <div className="svc-card" data-reveal>
            <div className="svc-card__title">
              <CalendarClock size={18} />
              <span className="svc-cardTitleText">
                <span className="svc-grad svc-shimmer">Plan &amp; Publish</span>
              </span>
            </div>
            <div className="svc-card__desc">
              {lang === "az"
                ? "Kontent təqvimi, avtomatik paylaşım, təkrarlanan kampaniyalar və ardıcıl post axınları — hamısı bir yerdə."
                : "Content calendar, automated publishing and recurring campaigns in one flow."}
            </div>
            <div style={{ marginTop: 12 }}>
              {featuresLeft.map((f) => (
                <Feature key={f.title} title={f.title} desc={f.desc} />
              ))}
            </div>
          </div>

          <div className="svc-card" data-reveal style={{ transitionDelay: "60ms" }}>
            <div className="svc-card__title">
              <BarChart3 size={18} />
              <span className="svc-cardTitleText">
                <span className="svc-grad svc-shimmer">Analytics &amp; Growth</span>
              </span>
            </div>
            <div className="svc-card__desc">
              {lang === "az"
                ? "Post performansı, lead dönüşümü, DM cavab sürəti — ölç, artır və optimallaşdır."
                : "Measure post performance, lead conversion and DM response speed — then optimize."}
            </div>
            <div style={{ marginTop: 12 }}>
              {featuresRight.map((f) => (
                <Feature key={f.title} title={f.title} desc={f.desc} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(function ServiceSmmAutomation() {
  useTranslation();

  return (
    <ServicePage
      tint="amber"
      kicker={"SERVICES"}
      title={"SMM avtomatlaşdırılması"}
      subtitle={
        "Kontent planı, paylaşım avtomatikası, DM/lead axını, analitika və müştəri suallarını AI ilə cavablandırma — hamısı bir sistemdə."
      }
      icon={Megaphone}
      pills={["Plan", "Auto publish", "DM/Leads", "Analytics", "AI replies"]}
      featuresLeft={[
        { title: "Automation", desc: "Schedule, repost, multi-channel publishing." },
        { title: "Campaigns", desc: "Funnel üçün ardıcıl post axınları və təkrarlanan kampaniyalar." },
        { title: "Content system", desc: "Kontent bankı, şablonlar, həftəlik plan və təsdiq prosesi." },
      ]}
      featuresRight={[
        { title: "Metrics", desc: "Engagement, CTR, conversion, cost və trend izləmə." },
        { title: "Optimize", desc: "A/B test, audit, təkmilləşdirmə və təkliflər." },
        { title: "DM → Lead", desc: "DM-lərdən lead çıxarma, etiketləmə və sürətli cavab axını." },
      ]}
      videoUrl={VIDEO_URL}
    />
  );
});
