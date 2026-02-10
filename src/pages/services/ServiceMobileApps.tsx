// src/pages/services/ServiceMobileApps.tsx
import React, { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Smartphone, ShieldCheck, CheckCircle2, ChevronDown } from "lucide-react";

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

/* ✅ Single pill swaps texts, resizes perfectly */
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
  const [w, setW] = useState<number | null>(null);

  const activeRef = useRef<HTMLSpanElement | null>(null);

  const current = items[idx % items.length] || "";
  const next = items[(idx + 1) % items.length] || "";

  useLayoutEffect(() => {
    const measure = () => {
      const el = activeRef.current;
      if (!el) return;
      const raw = Math.ceil(el.scrollWidth || el.getBoundingClientRect().width || 0);
      if (!raw) return;

      const pad = 34; // safer padding so it NEVER clips
      const max = Math.min(window.innerWidth * 0.84, 560);
      const min = 92;
      const nextW = Math.max(min, Math.min(max, raw + pad));
      setW(nextW);
    };

    const r1 = requestAnimationFrame(() => {
      measure();
      requestAnimationFrame(measure);
      const t = window.setTimeout(measure, 90);
      (measure as any)._t = t;
    });

    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(r1);
      window.removeEventListener("resize", onResize);
      const t = (measure as any)._t;
      if (t) clearTimeout(t);
    };
  }, [current]);

  useEffect(() => {
    if (reduced) return;
    if (!items.length) return;

    const t = window.setInterval(() => {
      setPhase("out");
      window.setTimeout(() => {
        setIdx((v) => (v + 1) % items.length);
        setPhase("in");
        window.setTimeout(() => setPhase("idle"), 520);
      }, 420);
    }, intervalMs);

    return () => window.clearInterval(t);
  }, [items.length, intervalMs, reduced]);

  if (reduced) {
    return (
      <span className="svc-rotPill">
        <span className="svc-rotText">{items[0] || ""}</span>
      </span>
    );
  }

  return (
    <span className="svc-rotPill" style={{ width: w ?? undefined }}>
      <span className={cx("svc-rotViewport", phase === "out" && "is-out", phase === "in" && "is-in")}>
        <span className="svc-rotStack">
          <span ref={activeRef} className="svc-rotLine is-a">
            {current}
          </span>
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

type ServiceLink = {
  id: string;
  path: string;
  title: (lang: Lang) => string;
  desc?: (lang: Lang) => string;
};

function ServicePage({
  tint = "cyan",
  kicker,
  title,
  subtitle,
  icon: Icon,
  pills,
  videoUrl,
}: {
  tint?: keyof typeof TINTS;
  kicker: string;
  title: string;
  subtitle: string;
  icon: any;
  pills: string[];
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

  const otherServicesLabel =
    lang === "az"
      ? "Digər xidmətlər"
      : lang === "tr"
      ? "Diğer hizmetler"
      : lang === "ru"
      ? "Другие услуги"
      : lang === "es"
      ? "Otros servicios"
      : "Other services";

  const services: ServiceLink[] = useMemo(
    () => [
      {
        id: "chatbot-24-7",
        path: "/services/chatbot-24-7",
        title: (l) => (l === "az" ? "Chatbot 24/7" : "Chatbot 24/7"),
      },
      {
        id: "business-workflows",
        path: "/services/business-workflows",
        title: (l) =>
          l === "az"
            ? "Business Workflows"
            : l === "ru"
            ? "Бизнес-воркфлоу"
            : l === "tr"
            ? "İş Akışları"
            : l === "es"
            ? "Workflows"
            : "Business Workflows",
      },
      {
        id: "websites",
        path: "/services/websites",
        title: (l) =>
          l === "az" ? "Websaytlar" : l === "ru" ? "Сайты" : l === "tr" ? "Web Siteleri" : l === "es" ? "Websites" : "Websites",
      },
      {
        id: "mobile-apps",
        path: "/services/mobile-apps",
        title: (l) =>
          l === "az" ? "Mobil tətbiqlər" : l === "ru" ? "Мобильные приложения" : l === "tr" ? "Mobil Uygulamalar" : l === "es" ? "Apps móviles" : "Mobile Apps",
      },
      {
        id: "smm-automation",
        path: "/services/smm-automation",
        title: (l) =>
          l === "az" ? "SMM Automation" : l === "ru" ? "SMM Автоматизация" : l === "tr" ? "SMM Otomasyon" : l === "es" ? "Automatización SMM" : "SMM Automation",
      },
      {
        id: "technical-support",
        path: "/services/technical-support",
        title: (l) =>
          l === "az" ? "Technical Support" : l === "ru" ? "Техподдержка" : l === "tr" ? "Teknik Destek" : l === "es" ? "Soporte técnico" : "Technical Support",
      },
    ],
    []
  );

  const dropdownItems = useMemo(
    () => services.filter((s) => !location.pathname.includes(s.path)).filter((s) => s.path !== "/services/mobile-apps"),
    [services, location.pathname]
  );

  const [svcOpen, setSvcOpen] = useState(false);

  // ✅ Keep the video panel size fixed when dropdown opens
  // We do this by reserving consistent min-height for left column block area.
  const LEFT_MIN = svcOpen ? 0 : 0; // (we keep fixed via CSS min-height below)

  // ✅ Smooth in/out animation (height + opacity) for dropdown
  const ddInnerRef = useRef<HTMLDivElement | null>(null);
  const [ddH, setDdH] = useState<number>(0);

  useLayoutEffect(() => {
    const el = ddInnerRef.current;
    if (!el) return;
    const h = Math.ceil(el.scrollHeight || 0);
    setDdH(h);
  }, [svcOpen, dropdownItems.length]);

  // ✅ “short, text-sized” panel: width fits content
  const panelWrapRef = useRef<HTMLDivElement | null>(null);
  const [panelW, setPanelW] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!svcOpen) return;
    const wrap = panelWrapRef.current;
    if (!wrap) return;

    const compute = () => {
      // measure inner content width and clamp
      const inner = wrap.querySelector<HTMLElement>(".svc-ddInner");
      if (!inner) return;
      const raw = Math.ceil(inner.scrollWidth || inner.getBoundingClientRect().width || 0);
      const max = Math.min(window.innerWidth * 0.92, 520);
      const min = 220;
      setPanelW(Math.max(min, Math.min(max, raw)));
    };

    const r1 = requestAnimationFrame(() => {
      compute();
      requestAnimationFrame(compute);
    });

    const onResize = () => compute();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(r1);
      window.removeEventListener("resize", onResize);
    };
  }, [svcOpen, dropdownItems.length]);

  // ✅ close dropdown when route changes
  useEffect(() => {
    setSvcOpen(false);
  }, [location.pathname]);

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

        /* ===== Contact blue palette ===== */
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

        /* ===== Shimmer (make ALL titles identical behavior) ===== */
        .svc-shimmer{
          position: relative;
          display: inline-block;
          isolation: isolate;
        }
        .svc-shimmer::after{
          content:"";
          position:absolute;
          inset: -12% -70%;
          pointer-events:none;

          background: linear-gradient(
            110deg,
            transparent 0%,
            transparent 35%,
            rgba(255,255,255,.22) 45%,
            rgba(170,225,255,.55) 50%,
            rgba(47,184,255,.42) 55%,
            transparent 65%,
            transparent 100%
          );

          mix-blend-mode: screen;
          opacity: .92;

          transform: translate3d(-78%,0,0);
          will-change: transform;

          /* IMPORTANT: fade only on extreme edges so it “enters” the end */
          -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 8%, #000 92%, transparent 100%);
          mask-image: linear-gradient(90deg, transparent 0%, #000 8%, #000 92%, transparent 100%);

          ${reduced ? "" : "animation: svcShine 2.9s linear infinite;"}
        }
        @keyframes svcShine{
          0%{ transform: translate3d(-86%,0,0); }
          100%{ transform: translate3d(86%,0,0); }
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
            radial-gradient(120% 90% at 86% 10%, rgba(47,184,255,.08), transparent 60%),
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

        /* ✅ make right panel stable */
        .svc-right{
          min-width:0;
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,.08);
          overflow:hidden;
          position:relative;
          background: rgba(0,0,0,.22);
          contain: layout paint style;
          align-self: stretch;
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
        /* ✅ remove yellow-ish tint behind video */
        .svc-videoScrim{
          position:absolute; inset:0;
          background:
            radial-gradient(120% 90% at 20% 15%, rgba(47,184,255,.12), transparent 58%),
            linear-gradient(180deg, rgba(0,0,0,.10), rgba(0,0,0,.52) 92%);
          pointer-events:none;
        }

        .svc-left{
          min-width:0;
          /* ✅ reserve stable height so opening dropdown doesn't resize video column */
          min-height: 340px;
        }
        @media (max-width: 980px){
          .svc-left{ min-height: 0; }
        }

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

        /* Rotating pill */
        .svc-pills{
          margin-top: 14px;
          display:flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }
        .svc-rotPill{
          position: relative;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          height: 34px;
          border-radius: 999px;
          border: 1px solid rgba(47,184,255,.22);
          background:
            radial-gradient(120% 120% at 20% 10%, ${T.a}, transparent 60%),
            rgba(255,255,255,.04);
          box-shadow: 0 10px 40px rgba(0,0,0,.35);
          font-weight: 900;
          font-size: 12px;
          white-space: nowrap;
          transition: width .26s ease;
          transform: translateZ(0);
          overflow: hidden;
          padding: 0 16px;
          min-width: 92px;
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
          background: linear-gradient(90deg, rgba(255,255,255,.95), rgba(170,225,255,.96), rgba(47,184,255,.95));
          -webkit-background-clip:text;
          background-clip:text;
          color: transparent;
          font-weight: 900;
          font-size: 12px;
          white-space: nowrap;
          padding: 0 4px; /* ✅ extra safety so it never touches edges */
        }
        .svc-rotViewport.is-out .svc-rotStack{ transform: translate3d(0,-18px,0); opacity: .92; filter: blur(.2px); }
        .svc-rotViewport.is-in .svc-rotStack{ transform: translate3d(0,-18px,0); opacity: 1; filter: none; }

        /* CTAs */
        .svc-ctaRow{
          margin-top: 18px;
          display:flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: flex-start;
        }

        .svc-cta{
          position: relative;
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
          text-decoration:none !important;
          outline: none;
          transition: transform .14s ease, border-color .14s ease, background-color .14s ease;
          transform: translateZ(0);
          overflow: hidden;
        }
        .svc-cta:visited{ color: rgba(255,255,255,.92); }
        .svc-cta *{ text-decoration:none !important; }
        .svc a, .svc a:hover{ text-decoration:none !important; }
        .svc a::after{ display:none !important; }

        .svc-cta::before{
          content:"";
          position:absolute;
          inset: -2px -45%;
          background: linear-gradient(
            110deg,
            transparent 0%,
            rgba(255,255,255,.00) 35%,
            rgba(170,225,255,.22) 45%,
            rgba(47,184,255,.38) 50%,
            rgba(170,225,255,.22) 55%,
            transparent 70%,
            transparent 100%
          );
          transform: translate3d(-60%,0,0);
          opacity: 0;
          transition: opacity .18s ease;
          pointer-events:none;
          mix-blend-mode: screen;
          will-change: transform, opacity;
        }
        .svc-cta:hover{ transform: translate3d(0,-1px,0); border-color: rgba(47,184,255,.22); background: rgba(255,255,255,.08); }
        .svc-cta:hover::before{
          opacity: .95;
          ${reduced ? "" : "animation: svcBtnSweep .85s ease-out 1;"}
        }
        @keyframes svcBtnSweep{ 0%{ transform: translate3d(-70%,0,0);} 100%{ transform: translate3d(70%,0,0);} }
        @media (hover:none){
          .svc-cta:hover{ transform:none; }
          .svc-cta:hover::before{ animation:none; }
        }

        .svc-ctaIcon{ opacity:.92; transform: translateZ(0); }

        /* ✅ “Other services” as compact button; dropdown is compact too */
        .svc-ctaBtn{
          cursor:pointer;
          appearance:none;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
        }

        /* ✅ In-flow dropdown with smooth open (no arrow icons, no long width) */
        .svc-ddFlow{
          margin-top: 10px;
          /* keeps it text-sized */
          width: fit-content;
          max-width: min(92vw, 520px);
        }
        .svc-ddFrame{
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(10,12,18,.72);
          box-shadow: 0 26px 120px rgba(0,0,0,.65);
          overflow: hidden;
          backdrop-filter: blur(10px);

          /* animation container */
          max-height: 0;
          opacity: 0;
          transform: translate3d(0,-6px,0);
          transition: max-height .32s ease, opacity .22s ease, transform .22s ease;
          will-change: max-height, opacity, transform;
        }
        .svc-ddFlow.is-open .svc-ddFrame{
          opacity: 1;
          transform: translate3d(0,0,0);
          max-height: var(--ddh, 360px);
        }

        .svc-ddInner{ padding: 10px; display:flex; flex-direction:column; gap: 10px; }

        .svc-ddItem{
          position: relative;
          display:flex;
          align-items:center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.08);
          background:
            radial-gradient(120% 120% at 18% 10%, rgba(47,184,255,.10), transparent 60%),
            rgba(255,255,255,.03);
          text-decoration:none !important;
          color: rgba(255,255,255,.90);
          transition: transform .14s ease, border-color .14s ease, background-color .14s ease;
          overflow: hidden;
          white-space: nowrap;
        }

        /* ✅ shine sweep on hover for each item (left->right) */
        .svc-ddItem::before{
          content:"";
          position:absolute;
          inset: -2px -55%;
          background: linear-gradient(
            110deg,
            transparent 0%,
            rgba(255,255,255,0) 35%,
            rgba(170,225,255,.18) 46%,
            rgba(47,184,255,.30) 50%,
            rgba(170,225,255,.18) 54%,
            transparent 70%,
            transparent 100%
          );
          transform: translate3d(-60%,0,0);
          opacity: 0;
          pointer-events:none;
          mix-blend-mode: screen;
          will-change: transform, opacity;
        }
        .svc-ddItem:hover{
          transform: translate3d(0,-1px,0);
          border-color: rgba(47,184,255,.22);
          background: rgba(255,255,255,.05);
        }
        .svc-ddItem:hover::before{
          opacity: .95;
          ${reduced ? "" : "animation: svcItemSweep .85s ease-out 1;"}
        }
        @keyframes svcItemSweep{
          0%{ transform: translate3d(-70%,0,0); }
          100%{ transform: translate3d(70%,0,0); }
        }
        @media (hover:none){
          .svc-ddItem:hover{ transform:none; }
          .svc-ddItem:hover::before{ animation:none; }
        }

        .svc-ddTitle{
          font-weight: 900;
          font-size: 14px;
          color: rgba(255,255,255,.92);
          padding-right: 4px;
        }

        /* remove any arrow icon (none rendered now) */

        /* badge */
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

        .svc-feat__tick{
          width: 30px; height: 30px; border-radius: 12px;
          display:flex; align-items:center; justify-content:center;
          border: 1px solid rgba(255,255,255,.10);
          background: ${T.c};
          color: rgba(170,225,255,.95);
          flex: 0 0 auto;
          transform: translateZ(0);
          ${reduced ? "" : "animation: svcTickBreath 1.35s ease-in-out infinite;"}
        }
        @keyframes svcTickBreath{
          0%,100%{ transform: translateZ(0) scale(1); box-shadow:none; opacity:.98; }
          50%{ transform: translateZ(0) scale(1.07); box-shadow: 0 0 0 6px rgba(47,184,255,.10), 0 0 24px rgba(47,184,255,.22); opacity:.92; }
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

              <div className="svc-title" data-reveal style={{ transitionDelay: "40ms" }}>
                <span className="svc-grad svc-shimmer">{title}</span>
              </div>

              <div className="svc-sub" data-reveal style={{ transitionDelay: "90ms" }}>
                {subtitle}
              </div>

              <div className="svc-pills" data-reveal style={{ transitionDelay: "140ms" }}>
                <RotatingPill items={pills} reduced={reduced} />
              </div>

              <div className="svc-ctaRow" data-reveal style={{ transitionDelay: "190ms" }}>
                <Link to={withLang("/contact", lang)} className="svc-cta">
                  {contact}
                  {/* (no arrow icon) */}
                </Link>

                <button
                  type="button"
                  className="svc-cta svc-ctaBtn"
                  onClick={() => setSvcOpen((v) => !v)}
                  aria-expanded={svcOpen ? "true" : "false"}
                  aria-haspopup="menu"
                >
                  {otherServicesLabel}
                  <ChevronDown className="svc-ctaIcon" size={16} />
                </button>
              </div>

              {/* ✅ compact, animated, text-sized dropdown */}
              <div
                ref={panelWrapRef}
                className={cx("svc-ddFlow", svcOpen && "is-open")}
                style={
                  svcOpen
                    ? ({ ["--ddh" as any]: `${Math.max(120, ddH + 2)}px`, width: panelW ?? undefined } as any)
                    : undefined
                }
              >
                <div className="svc-ddFrame" aria-hidden={svcOpen ? "false" : "true"}>
                  <div ref={ddInnerRef} className="svc-ddInner" role="menu" aria-label="Services">
                    {dropdownItems.map((s) => (
                      <Link
                        key={s.id}
                        to={withLang(s.path, lang)}
                        className="svc-ddItem"
                        onClick={() => setSvcOpen(false)}
                      >
                        <span className="svc-ddTitle">{s.title(lang)}</span>
                      </Link>
                    ))}
                  </div>
                </div>
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
              <span className="svc-grad svc-shimmer">{lang === "az" ? "UX & Performans" : "UX & Performance"}</span>
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
              <span className="svc-grad svc-shimmer">{lang === "az" ? "Backend & Təhlükəsizlik" : "Backend & Security"}</span>
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
      videoUrl={VIDEO_URL}
    />
  );
});
