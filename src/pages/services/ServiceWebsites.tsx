// src/pages/services/ServiceWebsites.tsx
import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Globe2, ShieldCheck, CheckCircle2 } from "lucide-react";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

const RAW_VIDEO =
  "https://res.cloudinary.com/dppoomunj/video/upload/v1770678248/neox/media/asset_1770678235050_bcbf2f1916183.mp4";

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

/** ✅ TechSupport palette (CYAN) */
const TINTS = {
  cyan: {
    a: "rgba(47,184,255,.22)",
    b: "rgba(47,184,255,.10)",
    c: "rgba(47,184,255,.06)",
    d: "rgba(47,184,255,.28)",
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

/** ✅ Soft mount: refresh zamanı ağır animasiyalar dərhal başlamasın */
function useSoftMount(disabled: boolean) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (disabled) {
      setReady(true);
      return;
    }
    // 2x rAF — ilk paint + layout stabil olandan sonra start
    const r1 = requestAnimationFrame(() => {
      const r2 = requestAnimationFrame(() => setReady(true));
      return () => cancelAnimationFrame(r2);
    });
    return () => cancelAnimationFrame(r1);
  }, [disabled]);
  return ready;
}

/** Smooth reveal-on-scroll — ONLY within this section (perf-friendly) */
function useRevealOnScroll(rootRef: React.RefObject<HTMLElement>, disabled: boolean, ready: boolean) {
  useEffect(() => {
    if (disabled) return;
    if (!ready) return;

    const root = rootRef.current;
    if (!root) return;

    const els = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!els.length) return;

    // Above-the-fold: mountdan sonra yumşaq “fade-in”
    // (IO callback-larında jank olmasın)
    const immediate = els.filter((el) => el.getBoundingClientRect().top < window.innerHeight * 0.9);
    immediate.forEach((el) => el.classList.add("is-in"));

    const rest = els.filter((el) => !el.classList.contains("is-in"));
    if (!rest.length) return;

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

    rest.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [disabled, ready, rootRef]);
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="svc-feat" data-reveal>
      <div className="svc-feat__tick" aria-hidden="true">
        <CheckCircle2 size={18} strokeWidth={2.8} />
      </div>
      <div className="svc-feat__body">
        <div className="svc-feat__t">{title}</div>
        <div className="svc-feat__d">{desc}</div>
      </div>
    </div>
  );
}

/**
 * ✅ Rotator + ✅ Dynamic width (pill sözə görə ölçü alır)
 * - ghost last item == first item
 * - snap to 0
 * - width adapts to current label
 */
function PillRotator({
  items,
  intervalMs = 2200,
  disabled,
  ready,
}: {
  items: string[];
  intervalMs?: number;
  disabled: boolean;
  ready: boolean;
}) {
  const safe = items.length ? items : [""];
  const track = safe.length > 1 ? [...safe, safe[0]] : safe;

  const [i, setI] = useState(0);
  const [noTrans, setNoTrans] = useState(false);

  const measureRef = useRef<HTMLSpanElement | null>(null);
  const [w, setW] = useState<number | null>(null);

  useEffect(() => {
    if (disabled) return;
    if (!ready) return;
    if (safe.length <= 1) return;
    const t = window.setInterval(() => setI((p) => p + 1), intervalMs);
    return () => window.clearInterval(t);
  }, [disabled, ready, intervalMs, safe.length]);

  useEffect(() => {
    if (safe.length <= 1) return;
    if (i === safe.length) {
      const snap = window.setTimeout(() => {
        setNoTrans(true);
        setI(0);
        requestAnimationFrame(() => setNoTrans(false));
      }, 560);
      return () => window.clearTimeout(snap);
    }
  }, [i, safe.length]);

  const label = safe[Math.min(i, safe.length - 1)];

  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      setW(Math.ceil(rect.width));
    });
    return () => cancelAnimationFrame(raf);
  }, [label]);

  const step = 34;
  const y = -i * step;

  return (
    <span
      className="svc-pill svc-pill--rot"
      aria-label={label}
      style={{
        width: w ? `${w + 34}px` : undefined, // padding buffer
        transition: disabled ? "none" : "width 260ms ease",
      }}
    >
      {/* hidden measurer */}
      <span
        ref={measureRef}
        style={{
          position: "absolute",
          visibility: "hidden",
          pointerEvents: "none",
          whiteSpace: "nowrap",
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        {label}
      </span>

      <span className="svc-pillRot-clip">
        <span
          className="svc-pillRot-track"
          style={{
            transform: `translate3d(0, ${y}px, 0)`,
            transition: disabled || noTrans ? "none" : "transform 520ms cubic-bezier(.2,.8,.2,1)",
          }}
        >
          {track.map((t, idx) => (
            <span className="svc-pillRot-item" key={`${t}-${idx}`}>
              <span className="svc-sweepText">{t}</span>
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}

function ServicePage({
  tint = "cyan",
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
  const ready = useSoftMount(reduced);

  const rootRef = useRef<HTMLElement | null>(null);
  useRevealOnScroll(rootRef as any, reduced, ready);

  const T = TINTS[tint];

  const vidRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const v = vidRef.current;
    if (!v) return;
    v.loop = true;
    const tryPlay = async () => {
      try {
        await v.play();
      } catch {
        // ignore
      }
    };
    tryPlay();
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
      ref={rootRef as any}
      className={cx("svc", ready && "svc-ready")}
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
        .svc{
          padding: calc(var(--hdrh,72px) + 28px) 0 84px;
          overflow-x:hidden;
          background:#000;
          color: rgba(255,255,255,.92);
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
           TEXT SWEEP (pills + section headings)
           ✅ only starts when .svc-ready (prevents refresh jank)
        ========================= */
        .svc-sweepText{
          display:inline-block;
          background-image:
            linear-gradient(
              90deg,
              #ffffff 0%,
              rgba(170,225,255,.98) 34%,
              rgba(47,184,255,1) 68%,
              rgba(42,125,255,1) 100%
            ),
            linear-gradient(
              110deg,
              transparent 0%,
              transparent 34%,
              rgba(255,255,255,.30) 44%,
              rgba(255,255,255,.92) 50%,
              rgba(170,225,255,.70) 53%,
              rgba(47,184,255,.45) 56%,
              transparent 66%,
              transparent 100%
            );
          background-size: 100% 100%, 360% 100%;
          background-position: 0 0, -220% 0;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          will-change: background-position;
          animation: none;
        }
        .svc.svc-ready .svc-sweepText{
          animation: svcTextSweep 2.2s linear infinite;
        }
        @keyframes svcTextSweep{
          0%   { background-position: 0 0, -220% 0; }
          100% { background-position: 0 0,  220% 0; }
        }
        @media (prefers-reduced-motion: reduce){
          .svc-sweepText{ animation:none !important; }
        }

        /* TITLE gradient (text itself) */
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

        .svc-hero{
          position: relative;
          border-radius: 26px;
          border: 1px solid rgba(255,255,255,.08);
          background:
            radial-gradient(900px 520px at 50% 0%, rgba(47,184,255,.08), transparent 62%),
            radial-gradient(980px 560px at 20% 0%, rgba(42,125,255,.06), transparent 70%),
            radial-gradient(980px 560px at 80% 0%, rgba(170,225,255,.05), transparent 70%),
            rgba(10,12,18,.55);
          box-shadow: 0 26px 120px rgba(0,0,0,.55);
          overflow:hidden;
          contain: layout paint style;
        }
        .svc-hero::after{
          content:"";
          position:absolute; inset:0;
          pointer-events:none;
          background: radial-gradient(900px 520px at 50% 0%, rgba(0,0,0,.18), rgba(0,0,0,.72));
          opacity:.9;
        }

        .svc-hero__inner{
          position:relative;
          z-index:1;
          padding: 34px 22px 28px;
          display:grid;
          grid-template-columns: 1.02fr .98fr;
          gap: 18px;
          align-items: stretch;
          min-width:0;
        }
        @media (max-width: 980px){
          .svc-hero__inner{ grid-template-columns: 1fr; padding: 30px 16px 22px; }
        }

        /* =========================
           ✅ RIBBON LAYER (BLOCK-BASED, not text-based)
           - starts from block left edge
           - slides across and goes behind video (z-index)
           - fades out as it enters video area (mask), speed DOES NOT change
           - restarts from beginning
        ========================= */
        .svc-ribbonLayer{
          position:absolute;
          left:0;
          right:0;
          /* align roughly with title line */
          top: 84px;
          height: 70px;
          pointer-events:none;
          z-index: 1; /* behind content, in front of background */
          overflow:hidden;
        }
        @media (max-width: 980px){
          .svc-ribbonLayer{ top: 96px; height: 62px; }
        }

        .svc-ribbon{
          position:absolute;
          left:-35%;
          width: 170%;
          top: 50%;
          height: 44px;
          transform: translate3d(-60%, -50%, 0);
          filter: blur(0.2px);
          mix-blend-mode: screen;
          opacity: .92;

          background: linear-gradient(
            110deg,
            transparent 0%,
            transparent 32%,
            rgba(255,255,255,.22) 42%,
            rgba(170,225,255,.55) 50%,
            rgba(47,184,255,.45) 56%,
            transparent 66%,
            transparent 100%
          );

          /* mask: visible on left, vanishes towards video (right) */
          -webkit-mask-image: linear-gradient(
            90deg,
            rgba(0,0,0,1) 0%,
            rgba(0,0,0,1) 56%,
            rgba(0,0,0,.65) 70%,
            rgba(0,0,0,.18) 82%,
            rgba(0,0,0,0) 92%,
            rgba(0,0,0,0) 100%
          );
          mask-image: linear-gradient(
            90deg,
            rgba(0,0,0,1) 0%,
            rgba(0,0,0,1) 56%,
            rgba(0,0,0,.65) 70%,
            rgba(0,0,0,.18) 82%,
            rgba(0,0,0,0) 92%,
            rgba(0,0,0,0) 100%
          );

          animation: none;
          will-change: transform;
        }

        /* ✅ start animation only after ready (prevents refresh FPS drop) */
        .svc.svc-ready .svc-ribbon{
          animation: svcRibbonMove 2.35s linear infinite;
        }
        @keyframes svcRibbonMove{
          0%   { transform: translate3d(-60%, -50%, 0); }
          100% { transform: translate3d(34%,  -50%, 0); }
        }
        @media (prefers-reduced-motion: reduce){
          .svc-ribbon{ animation:none !important; display:none; }
        }

        .svc-left{ min-width:0; position:relative; z-index:2; } /* content above ribbon */
        .svc-right{ position:relative; z-index:3; }            /* video ABOVE ribbon => ribbon goes behind video */

        /* SERVICES pill */
        .svc-kicker{
          display:inline-flex;
          align-items:center;
          gap:10px;
          padding: 9px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.04);
          font-weight: 900;
          letter-spacing:.18em;
          font-size: 11px;
          color: rgba(255,255,255,.72);
          text-transform:uppercase;
          margin-top: -14px;
          transform: translate3d(0,-14px,0);
        }
        .svc-kdot{
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: rgba(47,184,255,1);
          box-shadow: 0 0 0 4px rgba(47,184,255,.14), 0 0 14px rgba(47,184,255,.42);
          flex: 0 0 auto;
        }

        .svc-title{
          position: relative;
          margin-top: 14px;
          font-size: 40px;
          line-height: 1.05;
          font-weight: 600;
          letter-spacing: -0.02em;
          color: rgba(255,255,255,.94);
        }
        @media (min-width: 640px){ .svc-title{ font-size: 60px; } }

        .svc-sub{
          margin-top: 14px;
          color: rgba(255,255,255,.70);
          font-size: 16px;
          line-height: 1.7;
          max-width: 68ch;
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
          position: relative;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          height: 34px;
          padding: 0 14px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.05);
          color: rgba(255,255,255,.86);
          font-weight: 800;
          font-size: 12px;
          white-space: nowrap;
        }
        .svc-pill--rot{
          min-width: 0;
          width: fit-content;
          max-width: 100%;
        }

        .svc-pillRot-clip{ height: 34px; overflow:hidden; display:block; }
        .svc-pillRot-track{ display:block; will-change: transform; }
        .svc-pillRot-item{
          height: 34px;
          line-height: 34px;
          display:flex;
          align-items:center;
          justify-content:center;
          white-space: nowrap;
        }

        /* CTA */
        .svc-ctaRow{
          margin-top: 18px;
          display:flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .svc-cta{
          position: relative;
          overflow:hidden;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap: 10px;
          height: 46px;
          padding: 0 18px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.12);
          background:
            radial-gradient(120% 120% at 20% 10%, var(--tA), transparent 60%),
            rgba(255,255,255,.06);
          color: rgba(255,255,255,.92);
          font-weight: 700;
          letter-spacing: .02em;
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
          transform: translateZ(0);
        }
        .svc-ctaText{
          display:inline-flex;
          align-items:center;
          gap: 8px;
          font-size: 13px;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: rgba(255,255,255,.92);
        }
        .svc-cta--ghost{
          background: rgba(255,255,255,.04);
          border-color: rgba(255,255,255,.10);
        }

        /* VIDEO (no bleed) */
        .svc-right{
          min-width:0;
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,.08);
          overflow:hidden;
          background: rgba(0,0,0,.22);
          contain: layout paint style;
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
          contain: paint;
        }
        @media (max-width: 980px){ .svc-videoWrap{ min-height: 260px; } }

        .svc-video{
          position:absolute; inset:0;
          width:100%;
          height:100%;
          object-fit: cover;
          object-position: center;
          display:block;
          border-radius: inherit;
          transform: translateZ(0);
        }
        .svc-videoScrim{
          position:absolute; inset:0;
          background:
            radial-gradient(120% 90% at 20% 15%, rgba(47,184,255,.12), transparent 55%),
            linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,.46) 92%);
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
          background: rgba(47,184,255,1);
          box-shadow: 0 0 0 4px rgba(47,184,255,.14), 0 0 18px rgba(47,184,255,.42);
          animation: none;
        }
        .svc.svc-ready .svc-dot{
          animation: svcBreath 1.6s ease-in-out infinite;
        }
        @keyframes svcBreath{
          0%,100%{ transform: scale(1); opacity:.95; }
          50%{ transform: scale(1.18); opacity:.80; }
        }

        /* section */
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
        }
        .svc-card__title{
          display:flex; align-items:center; gap:10px;
          font-weight: 600;
          color: rgba(255,255,255,.92);
          letter-spacing: -0.01em;
          font-size: 22px;
          line-height: 1.2;
        }
        @media (min-width: 640px){ .svc-card__title{ font-size: 26px; } }

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
          border: 1px solid rgba(255,255,255,.12);
          background: var(--tC);
          color: rgba(170,225,255,.98);
          flex: 0 0 auto;
          animation: none;
          will-change: transform, filter;
        }
        .svc.svc-ready .svc-feat__tick{
          animation: svcTickBreath 1.55s ease-in-out infinite;
        }
        @keyframes svcTickBreath{
          0%,100%{ transform: translateZ(0) scale(1); filter: drop-shadow(0 0 0 rgba(0,0,0,0)); }
          50%{ transform: translateZ(0) scale(1.12); filter: drop-shadow(0 0 12px rgba(47,184,255,.60)); }
        }

        .svc-feat__t{ font-weight: 600; color: rgba(255,255,255,.92); }
        .svc-feat__d{ margin-top: 4px; color: rgba(255,255,255,.66); line-height: 1.65; font-size: 13.5px; }
      `}</style>

      <div className="container">
        <div className="svc-hero">
          {/* ✅ ribbon is BLOCK-based and goes behind video */}
          {!reduced && (
            <div className="svc-ribbonLayer" aria-hidden="true">
              <div className="svc-ribbon" />
            </div>
          )}

          <div className="svc-hero__inner">
            <div className="svc-left">
              <div className="svc-kicker" data-reveal>
                <span className="svc-kdot" aria-hidden="true" />
                <span>{kicker}</span>
              </div>

              <h1 className="svc-title" data-reveal style={{ transitionDelay: "40ms" }}>
                <span className="svc-grad">{title}</span>
              </h1>

              <p className="svc-sub" data-reveal style={{ transitionDelay: "90ms" }}>
                {subtitle}
              </p>

              <div className="svc-pills" data-reveal style={{ transitionDelay: "140ms" }}>
                <PillRotator items={pills} disabled={reduced} ready={ready} />
              </div>

              <div className="svc-ctaRow" data-reveal style={{ transitionDelay: "190ms" }}>
                <Link to={withLang("/contact", lang)} className="svc-cta">
                  <span className="svc-ctaText">{contact}</span>
                </Link>
                <Link to={withLang("/pricing", lang)} className="svc-cta svc-cta--ghost">
                  <span className="svc-ctaText">{pricing}</span>
                </Link>
              </div>
            </div>

            <div className="svc-right" data-reveal style={{ transitionDelay: "120ms" }}>
              <div className="svc-videoWrap">
                <video
                  ref={vidRef}
                  className="svc-video"
                  src={videoUrl}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                />
                <div className="svc-videoScrim" aria-hidden="true" />
                <div className="svc-badge" aria-hidden="true">
                  <div className="svc-badgeLeft">
                    <Icon size={14} />
                    <span>NEOX</span>
                  </div>
                  <div className="svc-badgeRight">
                    <span className="svc-dot" />
                    <span>Web</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="svc-section">
          <div className="svc-card" data-reveal>
            <div className="svc-card__title">
              <Globe2 size={18} />
              <span className="svc-sweepText">Frontend & UX</span>
            </div>
            <div className="svc-card__desc">
              Mobil-first premium dizayn, smooth animasiyalar və yüksək performans məqsədi (Lighthouse 9/10+).
            </div>
            <div style={{ marginTop: 12 }}>
              {featuresLeft.map((f) => (
                <Feature key={f.title} title={f.title} desc={f.desc} />
              ))}
            </div>
          </div>

          <div className="svc-card" data-reveal style={{ transitionDelay: "60ms" }}>
            <div className="svc-card__title">
              <ShieldCheck size={18} />
              <span className="svc-sweepText">Backend & Admin</span>
            </div>
            <div className="svc-card__desc">
              Leads, blog, media library, multi-lang və deploy flow (Netlify/Cloudflare + Railway) — hamısı hazır sistem.
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

export default memo(function ServiceWebsites() {
  useTranslation();

  return (
    <ServicePage
      tint="cyan"
      kicker={"SERVICES"}
      title={"Veb saytların hazırlanması"}
      subtitle={
        "Premium dizayn + sürətli performans + SEO əsasları + konversiya yönümlü struktur. İstəsən blog, admin panel və AI widget da əlavə edirik."
      }
      icon={Globe2}
      pills={["Premium UX", "High Performance", "SEO", "Blog/Admin", "AI widget"]}
      featuresLeft={[
        { title: "Performance", desc: "Video optimizasiya, lazy load, caching və minimal JS." },
        { title: "SEO", desc: "Meta, struktur, sitemap, clean URL və OpenGraph." },
        { title: "Conversion UX", desc: "CTA, pricing flow, lead capture və A/B-ready struktur." },
      ]}
      featuresRight={[
        { title: "Deploy", desc: "CI/CD, env vars, domain, SSL və monitoring." },
        { title: "Security", desc: "JWT, rate limit, admin allowlist, audit log." },
        { title: "Admin tools", desc: "Blog, media library, leads, multi-lang kontent idarəsi." },
      ]}
      videoUrl={VIDEO_URL}
    />
  );
});
