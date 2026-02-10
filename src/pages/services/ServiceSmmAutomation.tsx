// src/pages/services/ServiceSmmAutomation.tsx
import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Megaphone, CalendarClock, BarChart3, CheckCircle2 } from "lucide-react";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

const RAW_VIDEO =
  "https://res.cloudinary.com/dppoomunj/video/upload/v1770677383/neox/media/asset_1770677379623_8928b0b249907.mp4";

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

/** Smooth reveal-on-scroll (slower + smoother) */
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
      { threshold: 0.14, rootMargin: "0px 0px -12% 0px" }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [disabled]);
}

function Feature({
  title,
  desc,
  reduced,
}: {
  title: string;
  desc: string;
  reduced: boolean;
}) {
  return (
    <div className="svc-feat" data-reveal>
      <div className={cx("svc-feat__tick", !reduced && "svc-feat__tick--breath")} aria-hidden="true">
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
 * ✅ Adaptive Rotator (pill width fits current text)
 * - 1s hold per item
 * - smooth vertical slide
 * - width animates to match text
 */
function PillRotator({
  items,
  disabled,
  holdMs = 1000,
  animMs = 520,
}: {
  items: string[];
  disabled: boolean;
  holdMs?: number;
  animMs?: number;
}) {
  const safe = items.length ? items : [""];
  const [i, setI] = useState(0);

  const measureRef = useRef<HTMLSpanElement | null>(null);
  const [w, setW] = useState<number | null>(null);

  // measure width of current label
  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;

    const doMeasure = () => {
      const r = el.getBoundingClientRect();
      const next = Math.ceil(r.width);
      if (next > 0) setW(next);
    };

    const raf = requestAnimationFrame(doMeasure);
    const ro = new ResizeObserver(doMeasure);
    ro.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [i]);

  // change item with “hold” cadence
  useEffect(() => {
    if (disabled) return;
    if (safe.length <= 1) return;

    let alive = true;
    let t1: number | null = null;

    const loop = () => {
      // hold
      t1 = window.setTimeout(() => {
        if (!alive) return;
        setI((p) => (p + 1) % safe.length);
        loop();
      }, holdMs + animMs); // hold + time to animate out/in
    };

    loop();
    return () => {
      alive = false;
      if (t1) window.clearTimeout(t1);
    };
  }, [disabled, safe.length, holdMs, animMs]);

  const step = 34;
  const y = -i * step;

  return (
    <span
      className="svc-pill svc-pill--rot"
      aria-label={safe[i]}
      style={
        w
          ? {
              width: `calc(${w}px + 32px)`, // text width + padding
            }
          : undefined
      }
    >
      {/* hidden measurer */}
      <span className="svc-pillMeasure" aria-hidden="true">
        <span ref={measureRef} className="svc-pillMeasureText">
          {safe[i]}
        </span>
      </span>

      <span className="svc-pillRot-clip">
        <span
          className="svc-pillRot-track"
          style={{
            transform: `translate3d(0, ${y}px, 0)`,
            transition: disabled ? "none" : `transform ${animMs}ms cubic-bezier(.2,.8,.2,1)`,
          }}
        >
          {safe.map((t, idx) => (
            <span className="svc-pillRot-item" key={`${t}-${idx}`}>
              {t}
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}

type OtherService = { label: string; path: string };

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
  otherServices,
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
  otherServices: OtherService[];
}) {
  const location = useLocation();
  const lang = useMemo(() => getLangFromPath(location.pathname), [location.pathname]);
  const reduced = usePrefersReducedMotion();
  useRevealOnScroll(reduced);

  const T = TINTS[tint];

  /** ✅ video plays only when visible */
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
            }, 520);
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

  const other =
    lang === "az"
      ? "Digər xidmətlər"
      : lang === "tr"
      ? "Diğer hizmetler"
      : lang === "ru"
      ? "Другие услуги"
      : lang === "es"
      ? "Otros servicios"
      : "Other services";

  const [open, setOpen] = useState(false);

  // close on outside click
  const dropRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const root = dropRef.current;
      if (!root) return;
      if (!root.contains(e.target as any)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <section
      className="svc"
      style={
        {
          ["--tA" as any]: T.a,
          ["--tB" as any]: T.b,
          ["--tC" as any]: T.c,
          ["--tD" as any]: T.d,
          ["--revealD" as any]: "720ms",
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

        /* reveal (slower) */
        [data-reveal]{
          opacity: 0;
          transform: translate3d(0,12px,0);
          transition: opacity var(--revealD) ease, transform var(--revealD) ease;
          will-change: opacity, transform;
        }
        .is-in{ opacity: 1 !important; transform: translate3d(0,0,0) !important; }
        @media (prefers-reduced-motion: reduce){
          [data-reveal]{ opacity: 1; transform: none; transition: none; }
        }

        /* title gradient */
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

        /* micro shimmer */
        .svc-shimmer{ position: relative; display:inline-block; isolation:isolate; }
        .svc-shimmer::after{
          content:"";
          position:absolute; inset: -12% -60%;
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
          ${reduced ? "" : "animation: svcShine 3.0s linear infinite;"}
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

        /* IMPORTANT: align-items: start => dropdown won’t resize the video panel */
        .svc-hero__inner{
          position:relative;
          padding: 28px 22px;
          display:grid;
          grid-template-columns: 1.02fr .98fr;
          gap: 18px;
          align-items: start;
          min-width:0;
        }
        @media (max-width: 980px){
          .svc-hero__inner{ grid-template-columns: 1fr; padding: 22px 16px; }
        }

        .svc-left{ min-width:0; }

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

        /* title + ribbon band (same behavior as your Mobile Apps page) */
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

        .svc-titleText::before{
          content:"";
          position:absolute;
          left: calc(-1 * (22px + 18px));
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

          -webkit-mask-image: linear-gradient(90deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 48%, rgba(0,0,0,.75) 60%, rgba(0,0,0,0) 76%);
          mask-image: linear-gradient(90deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 48%, rgba(0,0,0,.75) 60%, rgba(0,0,0,0) 76%);

          will-change: transform, opacity;
          ${reduced ? "" : "animation: svcRibbonLoop 3.2s linear infinite;"}
          z-index: 1;
        }
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

          -webkit-mask-image: linear-gradient(90deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 48%, rgba(0,0,0,.75) 60%, rgba(0,0,0,0) 76%);
          mask-image: linear-gradient(90deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 48%, rgba(0,0,0,.75) 60%, rgba(0,0,0,0) 76%);

          will-change: transform;
          ${reduced ? "" : "animation: svcRibbonShine 3.2s linear infinite;"}
          z-index: 1;
        }
        @keyframes svcRibbonLoop{
          0%   { transform: translate3d(-52%, -50%, 0); opacity: .92; }
          62%  { transform: translate3d(-6%,  -50%, 0); opacity: .92; }
          76%  { transform: translate3d(  2%,  -50%, 0); opacity: .00; }
          100% { transform: translate3d(-52%, -50%, 0); opacity: .92; }
        }
        @keyframes svcRibbonShine{
          0%   { transform: translate3d(-62%, -50%, 0); }
          62%  { transform: translate3d(-6%,  -50%, 0); }
          76%  { transform: translate3d(  2%,  -50%, 0); }
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
          padding: 0 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.05);
          color: rgba(255,255,255,.90);
          font-weight: 800;
          font-size: 12px;
          white-space: nowrap;
          transition: width .26s ease;
          overflow: hidden; /* never cut text with overflow in track */
        }

        .svc-pill--rot{
          padding: 0 14px;
          max-width: min(360px, 92vw);
          background:
            radial-gradient(120% 120% at 20% 10%, rgba(47,184,255,.18), transparent 60%),
            rgba(255,255,255,.05);
          border-color: rgba(47,184,255,.18);
        }

        .svc-pillMeasure{
          position:absolute;
          left:-9999px; top:-9999px;
          opacity:0;
          pointer-events:none;
          white-space:nowrap;
          font-weight: 800;
          font-size: 12px;
        }
        .svc-pillMeasureText{ display:inline-block; }

        .svc-pillRot-clip{
          height: 34px;
          overflow:hidden;
          display:block;
          width: 100%;
        }
        .svc-pillRot-track{
          display:block;
          will-change: transform;
        }
        .svc-pillRot-item{
          height: 34px;
          display:flex;
          align-items:center;
          justify-content:center;
          padding: 0 6px;
        }

        /* CTA row + hover “light sweep” (no underline, no arrow) */
        .svc-ctaRow{
          margin-top: 18px;
          display:flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items:center;
        }

        .svc-cta{
          position: relative;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          height: 44px;
          padding: 0 16px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background:
            radial-gradient(120% 120% at 20% 10%, var(--tA), transparent 60%),
            rgba(255,255,255,.06);
          color: rgba(255,255,255,.92);
          font-weight: 900;
          overflow:hidden;
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
          transform: translateZ(0);
        }
        .svc-cta::before{
          content:"";
          position:absolute;
          inset:-2px;
          background: linear-gradient(
            110deg,
            transparent 0%,
            transparent 35%,
            rgba(255,255,255,.18) 45%,
            rgba(170,225,255,.55) 50%,
            rgba(47,184,255,.42) 55%,
            transparent 65%,
            transparent 100%
          );
          transform: translate3d(-65%,0,0);
          opacity: .9;
          mix-blend-mode: screen;
          pointer-events:none;
          will-change: transform;
        }
        .svc-cta:hover{
          transform: translate3d(0,-1px,0);
          border-color: rgba(47,184,255,.24);
          background: rgba(255,255,255,.08);
        }
        .svc-cta:hover::before{
          ${reduced ? "" : "animation: svcBtnSweep 820ms ease-out 1;"}
        }
        @keyframes svcBtnSweep{
          0%{ transform: translate3d(-65%,0,0); }
          100%{ transform: translate3d(65%,0,0); }
        }
        @media (hover:none){
          .svc-cta:hover{ transform:none; }
          .svc-cta:hover::before{ animation:none !important; }
        }

        .svc-cta--ghost{
          background: rgba(255,255,255,.04);
        }

        /* Other services dropdown (normal flow under button => pushes ONLY the section below) */
        .svc-drop{
          position: relative;
          display:inline-block;
        }
        .svc-dropBtn{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap: 8px;
          height: 44px;
          padding: 0 16px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.92);
          font-weight: 900;
          cursor: pointer;
          user-select:none;
          position: relative;
          overflow:hidden;
        }
        .svc-dropBtn::before{
          content:"";
          position:absolute;
          inset:-2px;
          background: linear-gradient(
            110deg,
            transparent 0%,
            transparent 35%,
            rgba(255,255,255,.18) 45%,
            rgba(170,225,255,.55) 50%,
            rgba(47,184,255,.42) 55%,
            transparent 65%,
            transparent 100%
          );
          transform: translate3d(-65%,0,0);
          opacity: .9;
          mix-blend-mode: screen;
          pointer-events:none;
          will-change: transform;
        }
        .svc-dropBtn:hover{ border-color: rgba(47,184,255,.24); background: rgba(255,255,255,.06); }
        .svc-dropBtn:hover::before{ ${reduced ? "" : "animation: svcBtnSweep 820ms ease-out 1;"} }

        .svc-caret{
          width: 10px; height: 10px;
          border-right: 2px solid rgba(255,255,255,.70);
          border-bottom: 2px solid rgba(255,255,255,.70);
          transform: rotate(45deg) translateY(-1px);
          opacity:.9;
          transition: transform .18s ease;
        }
        .svc-caret.is-open{ transform: rotate(225deg) translateY(1px); }

        .svc-dropPanel{
          width: 100%;
          margin-top: 10px;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(12,14,20,.72);
          box-shadow: 0 20px 80px rgba(0,0,0,.55);
          overflow:hidden;

          /* animation */
          max-height: 0px;
          opacity: 0;
          transform: translate3d(0,-6px,0);
          transition: max-height 420ms cubic-bezier(.2,.8,.2,1), opacity 240ms ease, transform 240ms ease;
        }
        .svc-dropPanel.is-open{
          max-height: 420px; /* enough for 5 items */
          opacity: 1;
          transform: translate3d(0,0,0);
        }

        .svc-dropList{
          padding: 10px;
          display:flex;
          flex-direction: column;
          gap: 10px;
        }

        .svc-dropItem{
          position: relative;
          display:flex;
          align-items:center;
          justify-content:flex-start;
          width: 100%;
          min-height: 46px;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(0,0,0,.18);
          color: rgba(255,255,255,.92);
          font-weight: 900;
          overflow:hidden;
          transform: translateZ(0);
        }
        .svc-dropItem::before{
          content:"";
          position:absolute;
          inset:-2px;
          background: linear-gradient(
            110deg,
            transparent 0%,
            transparent 35%,
            rgba(255,255,255,.14) 45%,
            rgba(170,225,255,.48) 50%,
            rgba(47,184,255,.38) 55%,
            transparent 65%,
            transparent 100%
          );
          transform: translate3d(-70%,0,0);
          opacity: .9;
          mix-blend-mode: screen;
          pointer-events:none;
          will-change: transform;
        }
        .svc-dropItem:hover{
          border-color: rgba(47,184,255,.22);
          background: rgba(255,255,255,.04);
        }
        .svc-dropItem:hover::before{
          ${reduced ? "" : "animation: svcItemSweep 920ms ease-out 1;"}
        }
        @keyframes svcItemSweep{
          0%{ transform: translate3d(-70%,0,0); }
          100%{ transform: translate3d(70%,0,0); }
        }

        /* stagger “light up” on open */
        .svc-dropPanel.is-open .svc-dropItem{
          opacity: 0;
          transform: translate3d(0,8px,0);
          animation: svcItemIn 420ms cubic-bezier(.2,.8,.2,1) forwards;
        }
        .svc-dropPanel.is-open .svc-dropItem:nth-child(1){ animation-delay: 40ms; }
        .svc-dropPanel.is-open .svc-dropItem:nth-child(2){ animation-delay: 90ms; }
        .svc-dropPanel.is-open .svc-dropItem:nth-child(3){ animation-delay: 140ms; }
        .svc-dropPanel.is-open .svc-dropItem:nth-child(4){ animation-delay: 190ms; }
        .svc-dropPanel.is-open .svc-dropItem:nth-child(5){ animation-delay: 240ms; }

        @keyframes svcItemIn{
          to { opacity: 1; transform: translate3d(0,0,0); }
        }
        @media (prefers-reduced-motion: reduce){
          .svc-dropPanel, .svc-dropItem{ transition:none !important; animation:none !important; opacity:1 !important; transform:none !important; }
        }

        /* RIGHT VIDEO PANEL (fixed height so it won’t grow when dropdown opens) */
        .svc-right{
          min-width:0;
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,.08);
          overflow:hidden;
          position:relative;
          background: rgba(0,0,0,.22);
          contain: layout paint style;
          height: 380px; /* fixed desktop */
        }
        @media (max-width: 980px){
          .svc-right{ height: 280px; }
        }
        .svc-videoWrap{
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 22px;
          overflow:hidden;
          transform: translateZ(0);
          backface-visibility:hidden;
        }
        .svc-video{
          position:absolute; inset:0;
          width:100%; height:100%;
          object-fit: cover;
          display:block;
          transform: translateZ(0);
        }

        /* remove any “yellow tint” feel: keep scrim neutral */
        .svc-videoScrim{
          position:absolute; inset:0;
          background:
            radial-gradient(120% 90% at 20% 15%, rgba(47,184,255,.12), transparent 55%),
            linear-gradient(180deg, rgba(0,0,0,.12), rgba(0,0,0,.48) 92%);
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
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), rgba(47,184,255,.9));
          box-shadow: 0 0 0 4px rgba(47,184,255,.14);
          ${reduced ? "" : "animation: svcBreath 1.6s ease-in-out infinite;"}
        }
        @keyframes svcBreath{
          0%,100%{ transform: scale(1); opacity:.95; }
          50%{ transform: scale(1.18); opacity:.80; }
        }

        /* section cards */
        .svc-section{
          margin-top: 26px;
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          align-items: start;
        }
        @media (max-width: 980px){
          .svc-section{ grid-template-columns: 1fr; }
        }
        .svc-card{
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.03);
          padding: 16px 16px;
          box-shadow: 0 22px 90px rgba(0,0,0,.40);
          contain: layout paint style;
        }
        .svc-card__title{
          display:flex; align-items:center; gap:10px;
          font-weight: 600;
          color: rgba(255,255,255,.92);
          letter-spacing: -.01em;
          font-size: 22px;
        }
        @media (min-width: 640px){
          .svc-card__title{ font-size: 26px; }
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
          background: rgba(47,184,255,.10);
          color: rgba(255,255,255,.92);
          flex: 0 0 auto;
        }
        .svc-feat__tick--breath{
          animation: svcTickBreath 1.6s ease-in-out infinite;
          box-shadow: 0 0 0 4px rgba(47,184,255,.10);
        }
        @keyframes svcTickBreath{
          0%,100%{ transform: scale(1); filter: saturate(1); }
          50%{ transform: scale(1.08); filter: saturate(1.25); }
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

              <div className="svc-title" data-reveal style={{ transitionDelay: "60ms" }}>
                <span className="svc-titleText">
                  <span className="svc-grad svc-shimmer">{title}</span>
                </span>
              </div>

              <div className="svc-sub" data-reveal style={{ transitionDelay: "140ms" }}>
                {subtitle}
              </div>

              <div className="svc-pills" data-reveal style={{ transitionDelay: "210ms" }}>
                <PillRotator items={pills} disabled={reduced} holdMs={1000} animMs={520} />
              </div>

              <div className="svc-ctaRow" data-reveal style={{ transitionDelay: "280ms" }}>
                <Link to={withLang("/contact", lang)} className="svc-cta">
                  {contact}
                </Link>

                <div className="svc-drop" ref={dropRef}>
                  <button
                    type="button"
                    className="svc-dropBtn"
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                    aria-haspopup="true"
                  >
                    {other}
                    <span className={cx("svc-caret", open && "is-open")} aria-hidden="true" />
                  </button>

                  <div className={cx("svc-dropPanel", open && "is-open")}>
                    <div className="svc-dropList">
                      {otherServices.map((s) => (
                        <Link
                          key={s.path}
                          to={withLang(s.path, lang)}
                          className="svc-dropItem"
                          onClick={() => setOpen(false)}
                        >
                          {s.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div ref={rightRef} className="svc-right" data-reveal style={{ transitionDelay: "170ms" }}>
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
              <span className="svc-grad svc-shimmer">
                {lang === "az" ? "Plan & Paylaşım" : "Plan & Publish"}
              </span>
            </div>
            <div className="svc-card__desc">
              {lang === "az"
                ? "Kontent təqvimi, avtomatik paylaşım, təkrarlanan kampaniyalar və ardıcıl post axınları — hamısı bir yerdə."
                : "Content calendar, automated publishing and recurring campaigns in one flow."}
            </div>
            <div style={{ marginTop: 12 }}>
              {featuresLeft.map((f) => (
                <Feature key={f.title} title={f.title} desc={f.desc} reduced={reduced} />
              ))}
            </div>
          </div>

          <div className="svc-card" data-reveal style={{ transitionDelay: "90ms" }}>
            <div className="svc-card__title">
              <BarChart3 size={18} />
              <span className="svc-grad svc-shimmer">
                {lang === "az" ? "Analitika & Growth" : "Analytics & Growth"}
              </span>
            </div>
            <div className="svc-card__desc">
              {lang === "az"
                ? "Post performansı, lead dönüşümü, DM cavab sürəti — ölç, artır və optimallaşdır."
                : "Measure post performance, lead conversion and DM response speed — then optimize."}
            </div>
            <div style={{ marginTop: 12 }}>
              {featuresRight.map((f) => (
                <Feature key={f.title} title={f.title} desc={f.desc} reduced={reduced} />
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

  // labels in AZ (like your menu screenshot)
  const otherServices: OtherService[] = [
    { label: "Chatbot 24/7", path: "/services/chatbot-24-7" },
    { label: "Business Workflows", path: "/services/business-workflows" },
    { label: "Websaytlar", path: "/services/websites" },
    { label: "Mobile Apps", path: "/services/mobile-apps" },
    { label: "Technical Support", path: "/services/technical-support" },
  ];

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
      otherServices={otherServices}
    />
  );
});
