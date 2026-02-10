// src/pages/services/ServiceMobileApps.tsx
import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Smartphone, ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

const RAW_VIDEO =
  "https://res.cloudinary.com/dppoomunj/video/upload/v1770675145/neox/media/asset_1770675134359_b91c8b8d8927a.mp4";

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

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="svc-pill">{children}</span>;
}

/** Single pill that swaps texts (vertical wipe) and resizes to content width */
function RotatingPill({
  items,
  reduced,
  intervalMs = 2400,
}: {
  items: string[];
  reduced: boolean;
  intervalMs?: number;
}) {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"idle" | "out" | "in">("idle");
  const measureRef = useRef<HTMLSpanElement | null>(null);
  const [w, setW] = useState<number | null>(null);

  const current = items[idx % items.length] || "";
  const next = items[(idx + 1) % items.length] || "";

  // Measure current text width (so pill shrinks/grows naturally)
  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    // measure after paint
    const raf = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      const nextW = Math.ceil(rect.width);
      setW(nextW);
    });
    return () => cancelAnimationFrame(raf);
  }, [current]);

  useEffect(() => {
    if (reduced) return;
    if (!items.length) return;

    const t = setInterval(() => {
      // out -> switch -> in
      setPhase("out");
      window.setTimeout(() => {
        setIdx((v) => (v + 1) % items.length);
        setPhase("in");
        window.setTimeout(() => setPhase("idle"), 520);
      }, 420);
    }, intervalMs);

    return () => clearInterval(t);
  }, [items.length, intervalMs, reduced]);

  // Reduced motion: just show first item
  if (reduced) {
    const first = items[0] || "";
    return (
      <span className="svc-rotPill" style={{ width: undefined }}>
        <span className="svc-rotText">{first}</span>
      </span>
    );
  }

  // width = measured text + padding budget (left/right = 12+12)
  const width = w != null ? w + 24 : undefined;

  return (
    <span className="svc-rotPill" style={{ width }}>
      {/* hidden measurer (same font/weight) */}
      <span className="svc-rotMeasure" ref={measureRef} aria-hidden="true">
        {current}
      </span>

      <span className={cx("svc-rotViewport", phase === "out" && "is-out", phase === "in" && "is-in")}>
        <span className="svc-rotStack">
          <span className="svc-rotLine is-a">{current}</span>
          <span className="svc-rotLine is-b">{next}</span>
        </span>
      </span>
    </span>
  );
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
    const tryPlay = async () => {
      try {
        await v.play();
      } catch {}
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
    <section className="svc">
      <style>{`
        html, body { background:#000 !important; }

        .svc{ padding: calc(var(--hdrh,72px) + 28px) 0 84px; overflow-x:hidden; color: rgba(255,255,255,.92); background:#000; }
        .svc *{ box-sizing:border-box; }
        .svc .container{ max-width: 1180px; margin:0 auto; padding:0 18px; }

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

        /* ===== Contact blue palette (text gradient base) ===== */
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

        /* ===== Shimmer / Shine =====
           We provide 2 variants:
           - .svc-shimmer--cut: disappears earlier (feels like it goes behind the video panel)
           - .svc-shimmer--into: keeps going to the end, fades only at the very edge (feels like it “enters”)
        */
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
            rgba(255,255,255,.26) 45%,
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

        /* CUT variant: fade-out earlier to simulate “goes behind the video panel” */
        .svc-shimmer--cut::after{
          /* mask fades earlier (before the right edge) */
          -webkit-mask-image: linear-gradient(90deg, #000 0%, #000 62%, transparent 78%, transparent 100%);
          mask-image: linear-gradient(90deg, #000 0%, #000 62%, transparent 78%, transparent 100%);
        }

        /* INTO variant: fade only at very end (feels like it enters) */
        .svc-shimmer--into::after{
          -webkit-mask-image: linear-gradient(90deg, #000 0%, #000 86%, rgba(0,0,0,.9) 92%, transparent 100%);
          mask-image: linear-gradient(90deg, #000 0%, #000 86%, rgba(0,0,0,.9) 92%, transparent 100%);
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
            radial-gradient(120% 90% at 18% 10%, ${T.a}, transparent 55%),
            radial-gradient(120% 90% at 86% 10%, rgba(255,184,47,.12), transparent 60%),
            rgba(10,12,18,.55);
          box-shadow: 0 26px 120px rgba(0,0,0,.55);
          overflow:hidden;
          contain: layout paint style;
        }
        .svc-hero::before{
          content:"";
          position:absolute; inset:-2px;
          background: radial-gradient(600px 260px at 22% 18%, ${T.b}, transparent 60%);
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

        /* Title */
        .svc-title{
          margin-top: 14px;
          font-size: 40px;
          line-height: 1.05;
          color: rgba(255,255,255,.94);
          font-weight: 600;
          letter-spacing: -0.02em;
        }
        @media (min-width: 640px){
          .svc-title{ font-size: 60px; }
        }

        .svc-sub{
          margin-top: 14px;
          color: rgba(255,255,255,.70);
          font-size: 16px;
          line-height: 1.7;
          max-width: 70ch;
        }
        @media (min-width: 640px){
          .svc-sub{ font-size: 18px; }
        }

        /* ===== Rotating pill row (single pill) ===== */
        .svc-pills{
          margin-top: 14px;
          display:flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
        }

        .svc-pill{
          display:inline-flex; align-items:center;
          height: 34px; padding: 0 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.05);
          color: rgba(255,255,255,.86);
          font-weight: 800;
          font-size: 12px;
          white-space: nowrap;
        }

        .svc-rotPill{
          position: relative;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          height: 34px;
          padding: 0 12px;
          border-radius: 999px;
          border: 1px solid rgba(47,184,255,.22);
          background:
            radial-gradient(120% 120% at 20% 10%, ${T.a}, transparent 60%),
            rgba(255,255,255,.04);
          box-shadow: 0 10px 40px rgba(0,0,0,.35);
          color: rgba(255,255,255,.92);
          font-weight: 900;
          font-size: 12px;
          white-space: nowrap;
          transition: width .26s ease;
          transform: translateZ(0);
          overflow: hidden;
        }

        .svc-rotMeasure{
          position:absolute;
          left:-9999px; top:-9999px;
          font-weight: 900;
          font-size: 12px;
          white-space: nowrap;
          padding: 0;
          visibility: hidden;
        }

        .svc-rotViewport{
          position: relative;
          height: 18px;
          overflow: hidden;
          display:block;
        }
        .svc-rotStack{
          position: relative;
          display:block;
          transform: translate3d(0,0,0);
          transition: transform .42s ease, opacity .42s ease, filter .42s ease;
          will-change: transform, opacity;
        }
        .svc-rotLine{
          display:block;
          height: 18px;
          line-height: 18px;
          text-align:center;
        }

        /* wipe: current goes up, next comes from below */
        .svc-rotViewport.is-out .svc-rotStack{
          transform: translate3d(0,-18px,0);
          opacity: .92;
          filter: blur(.2px);
        }
        .svc-rotViewport.is-in .svc-rotStack{
          transform: translate3d(0,-18px,0);
          opacity: 1;
          filter: none;
        }

        /* Make rotating pill text tinted (same palette) */
        .svc-rotLine{
          background: linear-gradient(90deg, rgba(255,255,255,.95), rgba(170,225,255,.96), rgba(47,184,255,.95));
          -webkit-background-clip:text;
          background-clip:text;
          color: transparent;
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
            radial-gradient(120% 120% at 20% 10%, ${T.a}, transparent 60%),
            rgba(255,255,255,.06);
          color: rgba(255,255,255,.92);
          font-weight: 900;
          text-decoration:none;
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
          transform: translateZ(0);
        }
        .svc-cta:hover{ transform: translate3d(0,-1px,0); border-color: rgba(47,184,255,.22); background: rgba(255,255,255,.08); }
        @media (hover: none){ .svc-cta:hover{ transform:none; } }
        .svc-cta--ghost{ background: rgba(255,255,255,.04); }

        /* RIGHT = CLEAN VIDEO */
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
        @media (max-width: 980px){
          .svc-videoWrap{ min-height: 260px; }
        }
        .svc-video{
          position:absolute; inset:0;
          width: 100%; height: 100%;
          object-fit: cover;
          display:block;
          transform: translateZ(0);
        }
        .svc-videoScrim{
          position:absolute; inset:0;
          background:
            radial-gradient(120% 90% at 20% 15%, rgba(47,184,255,.14), transparent 55%),
            linear-gradient(180deg, rgba(0,0,0,.12), rgba(0,0,0,.46) 92%);
          pointer-events:none;
        }

        .svc-badge{
          position:absolute; top: 12px; left: 12px; right: 12px;
          display:flex; align-items:center; justify-content: space-between; gap: 10px;
          pointer-events:none;
        }
        .svc-badgeLeft{
          display:inline-flex; align-items:center; gap: 10px;
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
          display:inline-flex; align-items:center; gap: 8px;
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
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), ${T.d});
          box-shadow: 0 0 0 4px ${T.c};
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
          display:flex; align-items:center; gap: 10px;
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
          display:flex; gap: 10px; align-items:flex-start;
          padding: 10px 10px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(0,0,0,.18);
        }
        .svc-feat + .svc-feat{ margin-top: 10px; }

        /* ✅ “breathing” check icon */
        .svc-feat__tick{
          width: 30px; height: 30px; border-radius: 12px;
          display:flex; align-items:center; justify-content:center;
          border: 1px solid rgba(255,255,255,.10);
          background: ${T.c};
          color: rgba(170,225,255,.95);
          flex: 0 0 auto;
          transform: translateZ(0);
          box-shadow: 0 0 0 0 rgba(47,184,255,.0);
          ${reduced ? "" : "animation: svcTickBreath 1.35s ease-in-out infinite;"}
        }
        @keyframes svcTickBreath{
          0%,100%{
            transform: translateZ(0) scale(1);
            box-shadow: 0 0 0 0 rgba(47,184,255,.0), 0 0 0 0 rgba(47,184,255,.0);
            filter: saturate(1);
            opacity: .98;
          }
          50%{
            transform: translateZ(0) scale(1.07);
            box-shadow: 0 0 0 6px rgba(47,184,255,.10), 0 0 24px rgba(47,184,255,.22);
            filter: saturate(1.15);
            opacity: .92;
          }
        }
        @media (prefers-reduced-motion: reduce){
          .svc-feat__tick{ animation:none !important; }
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

              {/* ✅ Title shimmer: CUT (feels like it goes behind the video panel) */}
              <div className="svc-title" data-reveal style={{ transitionDelay: "40ms" }}>
                <span className="svc-grad svc-shimmer svc-shimmer--cut">{title}</span>
              </div>

              <div className="svc-sub" data-reveal style={{ transitionDelay: "90ms" }}>
                {subtitle}
              </div>

              {/* ✅ One pill that swaps texts + resizes */}
              <div className="svc-pills" data-reveal style={{ transitionDelay: "140ms" }}>
                <RotatingPill items={pills} reduced={reduced} />
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
                    <span>Mobile</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="svc-section">
          <div className="svc-card" data-reveal>
            <div className="svc-card__title">
              <Smartphone size={18} />
              {/* ✅ cards shimmer: INTO (goes to the end, feels like it “enters”) */}
              <span className="svc-grad svc-shimmer svc-shimmer--into">
                {lang === "az" ? "UX & Performans" : "UX & Performance"}
              </span>
            </div>
            <div className="svc-card__desc">
              {lang === "az"
                ? "iOS/Android üçün sürətli açılış, smooth animasiya və premium UX. Offline-ready strukturlar və stabil arxitektura."
                : "Premium mobile UX with fast load, smooth animation and offline-ready architecture."}
            </div>
            <div style={{ marginTop: 12 }}>
              <Feature
                title={lang === "az" ? "Fast" : "Fast"}
                desc={
                  lang === "az"
                    ? "Optimized bundle, caching, minimal latency və sürətli açılış."
                    : "Optimized bundle, caching, minimal latency."
                }
              />
              <Feature
                title={lang === "az" ? "Scalable" : "Scalable"}
                desc={lang === "az" ? "Modular arxitektura, rahat genişlənmə və clean code." : "Modular architecture, easy to extend."}
              />
              <Feature
                title={lang === "az" ? "Offline-ready" : "Offline-ready"}
                desc={lang === "az" ? "Smart cache, queue və zəif internetdə belə stabil iş." : "Smart cache and queues for poor connections."}
              />
            </div>
          </div>

          <div className="svc-card" data-reveal style={{ transitionDelay: "60ms" }}>
            <div className="svc-card__title">
              <ShieldCheck size={18} />
              {/* ✅ cards shimmer: INTO */}
              <span className="svc-grad svc-shimmer svc-shimmer--into">
                {lang === "az" ? "Backend & Təhlükəsizlik" : "Backend & Security"}
              </span>
            </div>
            <div className="svc-card__desc">
              {lang === "az"
                ? "Auth, rate-limit, audit və secure API. Deploy + monitoring, analitika və push bildirişləri."
                : "Secure APIs with auth, rate-limits, auditing, plus deploy/monitoring, analytics and push."}
            </div>
            <div style={{ marginTop: 12 }}>
              <Feature
                title={lang === "az" ? "Secure" : "Secure"}
                desc={lang === "az" ? "JWT, roles, logging, rate-limit və qorunma layer-ləri." : "JWT, roles, logging, rate-limits."}
              />
              <Feature
                title={lang === "az" ? "Push / Events" : "Push / Events"}
                desc={lang === "az" ? "Bildirişlər, event tracking, funnel və analitika." : "Notifications, event tracking, funnel analytics."}
              />
              <Feature
                title={lang === "az" ? "Deploy & Monitor" : "Deploy & Monitor"}
                desc={lang === "az" ? "Release flow, crash monitoring, performance izləmə." : "Release flow, crash monitoring, performance tracking."}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(function ServiceMobileApps() {
  useTranslation();

  return (
    <ServicePage
      tint="cyan"
      kicker={"SERVICES"}
      title={"Mobil app-lərin hazırlanması"}
      subtitle={
        "iOS/Android üçün sürətli, stabil və premium UX-li tətbiqlər. İstəsən backend, admin panel, analitika və push bildirişlərini də qururuq."
      }
      icon={Smartphone}
      pills={["iOS/Android", "Premium UX", "Fast", "Secure API", "Push/Events"]}
      featuresLeft={[]}
      featuresRight={[]}
      videoUrl={VIDEO_URL}
    />
  );
});
