// src/pages/services/ServiceWebsites.tsx
import React, { memo, useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
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
        <CheckCircle2 size={18} strokeWidth={2.8} />
      </div>
      <div className="svc-feat__body">
        <div className="svc-feat__t">{title}</div>
        <div className="svc-feat__d">{desc}</div>
      </div>
    </div>
  );
}

/** ✅ Rotator pill — width hugs text (SEO daha da kiçik) */
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
  const track = safe.length > 1 ? [...safe, safe[0]] : safe;

  const [i, setI] = useState(0);
  const [noTrans, setNoTrans] = useState(false);

  const measureRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const [w, setW] = useState<number | null>(null);

  const curIdx = Math.min(i, safe.length - 1);

  const doMeasure = () => {
    const el = measureRefs.current[curIdx];
    if (!el) return;

    const textW = Math.ceil(el.getBoundingClientRect().width);

    const PAD = 28; // 14 + 14
    const MIN = 76; // ✅ SEO üçün daha “tight”
    const MAX = 420;

    const next = Math.max(MIN, Math.min(MAX, textW + PAD));
    setW(next);
  };

  useLayoutEffect(() => {
    doMeasure();
    const fonts = (document as any).fonts;
    if (fonts?.ready?.then) fonts.ready.then(() => doMeasure()).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curIdx]);

  useEffect(() => {
    if (disabled) return;
    const on = () => doMeasure();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, curIdx]);

  useEffect(() => {
    if (disabled) return;
    if (safe.length <= 1) return;
    const t = window.setInterval(() => setI((p) => p + 1), intervalMs);
    return () => window.clearInterval(t);
  }, [disabled, intervalMs, safe.length]);

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

  const step = 34;
  const y = -i * step;

  return (
    <span className="svc-pill svc-pill--rot" aria-label={safe[curIdx]} style={w ? ({ width: `${w}px` } as any) : undefined}>
      <span className="svc-pillMeasure" aria-hidden="true">
        {safe.map((t, idx) => (
          <span
            key={`${t}-${idx}`}
            ref={(node) => {
              measureRefs.current[idx] = node;
            }}
            className="svc-pillMeasureItem"
          >
            {t}
          </span>
        ))}
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
  useRevealOnScroll(reduced);

  const T = TINTS[tint];

  const vidRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const v = vidRef.current;
    if (!v) return;
    v.loop = true;
    const tryPlay = async () => {
      try {
        await v.play();
      } catch {}
    };
    tryPlay();
  }, []);

  const [softIn, setSoftIn] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setSoftIn(true));
    return () => cancelAnimationFrame(raf);
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
      className={cx("svc", softIn && "svc--in")}
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

        .svc{ opacity: 0.01; transform: translate3d(0,6px,0); transition: opacity .55s ease, transform .55s ease; }
        .svc.svc--in{ opacity: 1; transform: translate3d(0,0,0); }

        [data-reveal]{
          opacity: 0;
          transform: translate3d(0,10px,0);
          transition: opacity .55s ease, transform .55s ease;
          will-change: opacity, transform;
        }
        .svc--in [data-reveal].is-in{ opacity: 1 !important; transform: translate3d(0,0,0) !important; }
        .svc--in .is-in{ opacity: 1 !important; transform: translate3d(0,0,0) !important; }
        @media (prefers-reduced-motion: reduce){
          .svc{ opacity: 1; transform:none; transition:none; }
          [data-reveal]{ opacity: 1; transform: none; transition: none; }
        }

        /* sweep text */
        .svc-sweepText{
          display:inline-block;
          background-image:
            linear-gradient(90deg,#fff 0%, rgba(170,225,255,.98) 34%, rgba(47,184,255,1) 68%, rgba(42,125,255,1) 100%),
            linear-gradient(110deg, transparent 0%, transparent 34%, rgba(255,255,255,.30) 44%, rgba(255,255,255,.92) 50%, rgba(170,225,255,.70) 53%, rgba(47,184,255,.45) 56%, transparent 66%, transparent 100%);
          background-size: 100% 100%, 360% 100%;
          background-position: 0 0, -220% 0;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          will-change: background-position;
          ${reduced ? "" : "animation: svcTextSweep 2.2s linear infinite;"}
        }
        @keyframes svcTextSweep{ 0%{background-position:0 0,-220% 0} 100%{background-position:0 0,220% 0} }
        @media (prefers-reduced-motion: reduce){ .svc-sweepText{ animation:none !important; } }

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
          overflow:hidden; /* ✅ ölçünü sabit saxlayır */
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
          padding: 28px 22px;  /* ✅ əvvəlki ölçü */
          display:grid;
          grid-template-columns: 1.02fr .98fr;
          gap: 18px;
          align-items: stretch;
          min-width:0;
        }
        @media (max-width: 980px){
          .svc-hero__inner{ grid-template-columns: 1fr; padding: 22px 16px; }
        }

        .svc-left{ min-width:0; }

        /* ✅ SERVICES pill — bir az yuxarı, amma hero içində, LENT onu kəsmir */
        .svc-kicker{
          display:inline-flex;
          align-items:center;
          gap:10px;
          padding: 10px 14px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(0,0,0,.42); /* glow bleed olmasın */
          color: rgba(255,255,255,.76);
          font-size: 12px;
          letter-spacing:.14em;
          text-transform: uppercase;

          /* ✅ sadəcə azca yuxarı */
          transform: translate3d(0,-8px,0);
          position: relative;
          z-index: 10; /* ✅ title shimmer layer-dən yuxarı */
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        .svc-kdot{
          width: 8px; height: 8px; border-radius: 999px;
          background: rgba(47,184,255,1);
          box-shadow: 0 0 0 4px rgba(47,184,255,.14), 0 0 18px rgba(47,184,255,.42);
        }

        /* title */
        .svc-title{
          margin-top: 10px; /* ✅ kicker yuxarı qalxdığı üçün balans */
          font-size: 40px;
          line-height: 1.05;
          font-weight: 600;
          letter-spacing: -0.02em;
          color: rgba(255,255,255,.94);
        }
        @media (min-width: 640px){ .svc-title{ font-size: 60px; } }

        .svc-grad{
          background: linear-gradient(90deg,#fff 0%, rgba(170,225,255,.96) 34%, rgba(47,184,255,.95) 68%, rgba(42,125,255,.95) 100%);
          -webkit-background-clip:text;
          background-clip:text;
          color:transparent;
          position: relative;
          display: inline-block;
          isolation: isolate;
          z-index: 2;
        }

        /* ✅ shimmer band ONLY on title, and always under kicker (kicker z=10) */
        .svc-grad.svc-shimmer::after{
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
          z-index: 1;
        }
        @keyframes svcShine{
          0%{ transform: translate3d(-55%,0,0); }
          100%{ transform: translate3d(55%,0,0); }
        }
        @media (prefers-reduced-motion: reduce){
          .svc-grad.svc-shimmer::after{ animation:none !important; display:none; }
        }

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
          display:inline-flex; align-items:center; justify-content:center;
          height: 34px;
          padding: 0 14px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.05);
          color: rgba(255,255,255,.86);
          font-weight: 800;
          font-size: 12px;
          white-space: nowrap;
          position: relative;
        }
        .svc-pill--rot{
          width: auto;
          max-width: min(420px, 92vw);
          transition: width 220ms cubic-bezier(.2,.8,.2,1);
        }
        .svc-pillMeasure{
          position:absolute;
          left:-9999px; top:-9999px;
          opacity:0; pointer-events:none;
          white-space: nowrap;
          font-size: 12px;
          font-weight: 800;
        }
        .svc-pillMeasureItem{ display:inline-block; }
        .svc-pillRot-clip{ height: 34px; overflow:hidden; display:block; width:100%; }
        .svc-pillRot-track{ display:block; will-change: transform; }
        .svc-pillRot-item{
          height: 34px;
          line-height: 34px;
          display:flex;
          align-items:center;
          justify-content:center;
          width: 100%;
          padding: 0 2px;
        }

        /* buttons (unchanged) */
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
          transform: translateZ(0);
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
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
        .svc-cta::before{
          content:"";
          position:absolute;
          inset:-55% -70%;
          background: linear-gradient(
            110deg,
            transparent 0%,
            transparent 34%,
            rgba(255,255,255,.30) 44%,
            rgba(255,255,255,.95) 50%,
            rgba(170,225,255,.72) 54%,
            rgba(47,184,255,.45) 58%,
            transparent 68%,
            transparent 100%
          );
          transform: translate3d(-70%,0,0);
          opacity: 0;
          will-change: transform, opacity;
          pointer-events:none;
        }
        .svc-cta:hover{
          transform: translate3d(0,-1px,0);
          border-color: rgba(47,184,255,.24);
          background: rgba(255,255,255,.08);
        }
        .svc-cta:hover::before{
          opacity: .98;
          ${reduced ? "transform: translate3d(70%,0,0);" : "animation: svcBtnSweep 820ms linear 1;"}
        }
        @keyframes svcBtnSweep{ 0%{transform:translate3d(-70%,0,0)} 100%{transform:translate3d(70%,0,0)} }
        @media (hover: none){
          .svc-cta:hover{ transform:none; }
          .svc-cta:hover::before{ opacity:0; animation:none; }
        }
        .svc-cta--ghost{ background: rgba(255,255,255,.04); border-color: rgba(255,255,255,.10); }

        /* video */
        .svc-right{
          min-width:0;
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,.08);
          overflow:hidden;
          position:relative;
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
          ${reduced ? "" : "animation: svcBreath 1.6s ease-in-out infinite;"}
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
          ${reduced ? "" : "animation: svcTickBreath 1.55s ease-in-out infinite;"}
          will-change: transform, filter;
        }
        @keyframes svcTickBreath{
          0%,100%{ transform: translateZ(0) scale(1); filter: drop-shadow(0 0 0 rgba(0,0,0,0)); }
          50%{ transform: translateZ(0) scale(1.12); filter: drop-shadow(0 0 12px rgba(47,184,255,.60)); }
        }
        .svc-feat__t{ font-weight: 600; color: rgba(255,255,255,.92); }
        .svc-feat__d{ margin-top: 4px; color: rgba(255,255,255,.66); line-height: 1.65; font-size: 13.5px; }

        .svc, .svc .container, .svc-hero, .svc-card { overflow-wrap:anywhere; }
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
                <span className="svc-grad svc-shimmer">{title}</span>
              </div>

              <div className="svc-sub" data-reveal style={{ transitionDelay: "90ms" }}>
                {subtitle}
              </div>

              <div className="svc-pills" data-reveal style={{ transitionDelay: "140ms" }}>
                <PillRotator items={pills} disabled={reduced} />
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
                <video ref={vidRef} className="svc-video" src={videoUrl} autoPlay muted loop playsInline preload="metadata" />
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
