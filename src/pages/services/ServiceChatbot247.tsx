// src/pages/services/ServiceChatbot247.tsx
import React, { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bot, ShieldCheck, MessagesSquare, CheckCircle2, ChevronDown } from "lucide-react";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

const RAW_VIDEO =
  "https://res.cloudinary.com/dppoomunj/video/upload/v1770671661/neox/media/asset_1770671649523_16c8bc8278fcb.mp4";

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
      { threshold: 0.14, rootMargin: "0px 0px -12% 0px" }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [disabled]);
}

/* ---------------- Rotating pill: NO overlap, 1s hold between words ---------------- */
function RotatingPill({ items, reduced }: { items: string[]; reduced: boolean }) {
  const [idx, setIdx] = useState(0);
  const [w, setW] = useState<number | null>(null);
  const spanRef = useRef<HTMLSpanElement | null>(null);

  const current = items[idx % items.length] || "";

  useLayoutEffect(() => {
    const measure = () => {
      const el = spanRef.current;
      if (!el) return;
      const raw = Math.ceil(el.scrollWidth || el.getBoundingClientRect().width || 0);
      if (!raw) return;
      const pad = 44;
      const max = Math.min(window.innerWidth * 0.86, 620);
      const min = 96;
      setW(Math.max(min, Math.min(max, raw + pad)));
    };
    const r = requestAnimationFrame(() => {
      measure();
      requestAnimationFrame(measure);
    });
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(r);
      window.removeEventListener("resize", onResize);
    };
  }, [current]);

  useEffect(() => {
    if (reduced) return;
    if (!items.length) return;

    let alive = true;
    let t1: number | null = null;
    let t2: number | null = null;

    const step = () => {
      if (!alive) return;

      t1 = window.setTimeout(() => {
        if (!alive) return;
        const el = spanRef.current;
        if (el) el.classList.add("is-out");

        t2 = window.setTimeout(() => {
          if (!alive) return;
          setIdx((v) => (v + 1) % items.length);
          requestAnimationFrame(() => {
            const el2 = spanRef.current;
            if (el2) {
              el2.classList.remove("is-out");
              el2.classList.add("is-in");
              window.setTimeout(() => el2.classList.remove("is-in"), 240);
            }
          });
          step();
        }, 240);
      }, 1000);
    };

    step();
    return () => {
      alive = false;
      if (t1) window.clearTimeout(t1);
      if (t2) window.clearTimeout(t2);
    };
  }, [items.length, reduced]);

  return (
    <span className="svc-rotPill" style={{ width: w ?? undefined }}>
      <span ref={spanRef} className="svc-rotText">
        {current}
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

type ServiceLink = { id: string; path: string; title: (lang: Lang) => string };

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

    // ✅ no loop; when ends, stay on last frame
    const onEnded = () => {
      try {
        v.pause();
        // keep currentTime at end => last frame stays
      } catch {}
    };
    v.addEventListener("ended", onEnded);
    return () => v.removeEventListener("ended", onEnded);
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
      { id: "chatbot-24-7", path: "/services/chatbot-24-7", title: () => "Chatbot 24/7" },
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
          l === "az"
            ? "Websaytlar"
            : l === "ru"
            ? "Сайты"
            : l === "tr"
            ? "Web Siteleri"
            : l === "es"
            ? "Websites"
            : "Websites",
      },
      {
        id: "mobile-apps",
        path: "/services/mobile-apps",
        title: (l) =>
          l === "az"
            ? "Mobil tətbiqlər"
            : l === "ru"
            ? "Мобильные приложения"
            : l === "tr"
            ? "Mobil Uygulamalar"
            : l === "es"
            ? "Apps móviles"
            : "Mobile Apps",
      },
      {
        id: "smm-automation",
        path: "/services/smm-automation",
        title: (l) =>
          l === "az"
            ? "SMM Automation"
            : l === "ru"
            ? "SMM Автоматизация"
            : l === "tr"
            ? "SMM Otomasyon"
            : l === "es"
            ? "Automatización SMM"
            : "SMM Automation",
      },
      {
        id: "technical-support",
        path: "/services/technical-support",
        title: (l) =>
          l === "az"
            ? "Technical Support"
            : l === "ru"
            ? "Техподдержка"
            : l === "tr"
            ? "Teknik Destek"
            : l === "es"
            ? "Soporte técnico"
            : "Technical Support",
      },
    ],
    []
  );

  const dropdownItems = useMemo(
    () =>
      services
        .filter((s) => s.path !== "/services/chatbot-24-7")
        .filter((s) => !location.pathname.includes(s.path)),
    [services, location.pathname]
  );

  const [svcOpen, setSvcOpen] = useState(false);

  const [openSeq, setOpenSeq] = useState(0);
  useEffect(() => {
    if (!svcOpen) {
      setOpenSeq(0);
      return;
    }
    const total = dropdownItems.length;
    let i = 0;
    setOpenSeq(0);
    const t = window.setInterval(() => {
      i += 1;
      setOpenSeq(i);
      if (i >= total) window.clearInterval(t);
    }, 95);
    return () => window.clearInterval(t);
  }, [svcOpen, dropdownItems.length]);

  const ddInnerRef = useRef<HTMLDivElement | null>(null);
  const [ddH, setDdH] = useState(0);
  useLayoutEffect(() => {
    if (!svcOpen) {
      setDdH(0);
      return;
    }
    const el = ddInnerRef.current;
    if (!el) return;
    const h = Math.ceil(el.scrollHeight || 0);
    setDdH(h);
  }, [svcOpen, openSeq, dropdownItems.length]);

  const otherBtnRef = useRef<HTMLButtonElement | null>(null);
  const ddSlotRef = useRef<HTMLDivElement | null>(null);

  const [ddW, setDdW] = useState<number | null>(null);
  const [ddX, setDdX] = useState<number>(0);

  const measureDD = () => {
    const btn = otherBtnRef.current;
    const slot = ddSlotRef.current;
    if (!btn || !slot) return;

    const b = btn.getBoundingClientRect();
    const s = slot.getBoundingClientRect();

    setDdW(Math.max(240, Math.min(520, Math.ceil(b.width))));
    setDdX(Math.max(0, Math.round(b.left - s.left)));
  };

  useLayoutEffect(() => {
    measureDD();
    window.addEventListener("resize", measureDD);
    window.addEventListener("scroll", measureDD, true);
    return () => {
      window.removeEventListener("resize", measureDD);
      window.removeEventListener("scroll", measureDD, true);
    };
  }, []);

  useEffect(() => {
    setSvcOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!svcOpen) return;
    requestAnimationFrame(() => {
      measureDD();
      requestAnimationFrame(measureDD);
    });
  }, [svcOpen]);

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

        .svc{ padding: calc(var(--hdrh,72px) + 28px) 0 84px; overflow-x:hidden; color: rgba(255,255,255,.92); background:#000; }
        .svc *{ box-sizing:border-box; }
        .svc .container{ max-width: 1180px; margin:0 auto; padding:0 18px; }

        [data-reveal]{ opacity: 0; transform: translate3d(0,14px,0); transition: opacity .78s ease, transform .78s ease; will-change: opacity, transform; }
        .is-in{ opacity: 1 !important; transform: translate3d(0,0,0) !important; }
        @media (prefers-reduced-motion: reduce){ [data-reveal]{ opacity: 1; transform: none; transition: none; } }

        :root{ --svcShineDur: 2.95s; }
        .svc-grad{
          background: linear-gradient(90deg,#ffffff 0%,rgba(170,225,255,.96) 34%,rgba(47,184,255,.95) 68%,rgba(42,125,255,.95) 100%);
          -webkit-background-clip:text; background-clip:text; color:transparent;
        }
        .svc-shimmer{ position: relative; display: inline-block; isolation: isolate; }
        .svc-shimmer::after{
          content:""; position:absolute; inset: -12% -70%; pointer-events:none;
          background: linear-gradient(110deg,transparent 0%,transparent 35%,rgba(255,255,255,.22) 45%,rgba(170,225,255,.55) 50%,rgba(47,184,255,.42) 55%,transparent 65%,transparent 100%);
          mix-blend-mode: screen; opacity: .92; transform: translate3d(-86%,0,0); will-change: transform;
          -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 8%, #000 92%, transparent 100%);
          mask-image: linear-gradient(90deg, transparent 0%, #000 8%, #000 92%, transparent 100%);
          ${reduced ? "" : "animation: svcShine var(--svcShineDur) linear infinite;"}
        }
        @keyframes svcShine{ 0%{ transform: translate3d(-86%,0,0);} 100%{ transform: translate3d(86%,0,0);} }
        @media (prefers-reduced-motion: reduce){ .svc-shimmer::after{ animation:none !important; display:none; } }

        .svc-hero{
          position: relative; border-radius: 26px; border: 1px solid rgba(255,255,255,.08);
          background: radial-gradient(120% 90% at 18% 10%, rgba(47,184,255,.22), transparent 55%),
                      radial-gradient(120% 90% at 86% 10%, rgba(47,184,255,.08), transparent 60%),
                      rgba(10,12,18,.55);
          box-shadow: 0 26px 120px rgba(0,0,0,.55);
          overflow:hidden; contain: layout paint style;
        }
        .svc-hero::before{
          content:""; position:absolute; inset:-2px;
          background: radial-gradient(600px 260px at 22% 18%, rgba(47,184,255,.10), transparent 60%);
          opacity:.85; filter: blur(14px); pointer-events:none;
        }

        .svc-hero__inner{
          position:relative; padding: 28px 22px;
          display:grid; grid-template-columns: 1.02fr .98fr;
          gap: 18px; align-items: stretch; min-width:0;
        }
        @media (max-width: 980px){ .svc-hero__inner{ grid-template-columns: 1fr; padding: 22px 16px; align-items: start; } }

        .svc-left{ min-width:0; }
        .svc-right{
          min-width:0; border-radius: 22px; border: 1px solid rgba(255,255,255,.08);
          overflow:hidden; position:relative; background: rgba(0,0,0,.22);
          contain: layout paint style; height: 100%;
        }

        /* ✅ VIDEO: no crop + a bit bigger (scale), stays inside box */
        .svc-videoWrap{
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 320px;
          border-radius: 22px;
          overflow:hidden;
          isolation:isolate;
          background: rgba(0,0,0,.22);

          /* optional: reduces empty look while keeping contain */
          padding: 8px;
        }
        @media (max-width: 980px){
          .svc-videoWrap{ min-height: 260px; height: 260px; }
        }
        .svc-video{
          position:absolute;
          inset: 8px; /* match padding so it fills nicely */
          width: calc(100% - 16px);
          height: calc(100% - 16px);
          display:block;

          object-fit: contain;
          object-position: center top;

          /* ✅ “biraz dartıb uzatma” (kəsmir) */
          transform: translate3d(0,0,0) scale(1.12);
          transform-origin: top center;

          background: rgba(0,0,0,.18);
          max-width:100%;
          max-height:100%;
        }
        .svc-videoScrim{
          position:absolute; inset:0;
          background: radial-gradient(120% 90% at 20% 15%, rgba(47,184,255,.10), transparent 58%),
                      linear-gradient(180deg, rgba(0,0,0,.06), rgba(0,0,0,.34) 92%);
          pointer-events:none;
          z-index: 2;
        }

        .svc-kicker{
          display:inline-flex; align-items:center; gap:10px;
          border: 1px solid rgba(255,255,255,.10); background: rgba(255,255,255,.04);
          padding: 10px 14px; border-radius: 999px;
          font-size: 12px; letter-spacing: .14em; text-transform: uppercase;
          color: rgba(255,255,255,.70);
        }
        .svc-kdot{
          width: 8px; height: 8px; border-radius: 999px;
          background: rgba(47,184,255,1);
          box-shadow: 0 0 0 4px rgba(47,184,255,.14), 0 0 18px rgba(47,184,255,.42);
        }

        .svc-title{ margin-top: 14px; font-size: 40px; line-height: 1.05; color: rgba(255,255,255,.94); font-weight: 600; letter-spacing: -0.02em; }
        @media (min-width: 640px){ .svc-title{ font-size: 60px; } }

        .svc-sub{ margin-top: 14px; color: rgba(255,255,255,.70); font-size: 16px; line-height: 1.7; max-width: 70ch; }
        @media (min-width: 640px){ .svc-sub{ font-size: 18px; } }

        .svc-pills{ margin-top: 14px; display:flex; gap: 10px; align-items:center; flex-wrap: wrap; }
        .svc-rotPill{
          position: relative; display:inline-flex; align-items:center; justify-content:center;
          height: 34px; border-radius: 999px;
          border: 1px solid rgba(47,184,255,.22);
          background: radial-gradient(120% 120% at 20% 10%, rgba(47,184,255,.22), transparent 60%), rgba(255,255,255,.04);
          box-shadow: 0 10px 40px rgba(0,0,0,.35);
          font-weight: 900; font-size: 12px; white-space: nowrap;
          transition: width .26s ease;
          overflow: hidden; padding: 0 16px; min-width: 96px;
        }
        .svc-rotText{
          display:block;
          background: linear-gradient(90deg, rgba(255,255,255,.95), rgba(170,225,255,.96), rgba(47,184,255,.95));
          -webkit-background-clip:text; background-clip:text; color: transparent;
          font-weight: 900; font-size: 12px; white-space: nowrap;
          will-change: transform, opacity, filter;
          transition: transform .24s ease, opacity .24s ease, filter .24s ease;
        }
        .svc-rotText.is-out{ opacity: 0; transform: translate3d(0,8px,0); filter: blur(1px); }
        .svc-rotText.is-in{ opacity: 1; transform: translate3d(0,0,0); filter: blur(0px); }

        .svc-ctaRow{ margin-top: 18px; display:flex; flex-wrap: wrap; gap: 10px; align-items: flex-start; }
        .svc-cta{
          position: relative; display:inline-flex; align-items:center; justify-content:center; gap: 10px;
          height: 44px; padding: 0 16px; border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: radial-gradient(120% 120% at 20% 10%, rgba(47,184,255,.22), transparent 60%), rgba(255,255,255,.06);
          color: rgba(255,255,255,.92); font-weight: 900; text-decoration:none !important;
          outline: none; transition: transform .14s ease, border-color .14s ease, background-color .14s ease;
          overflow: hidden;
        }
        .svc-cta:visited{ color: rgba(255,255,255,.92); }
        .svc-cta *{ text-decoration:none !important; }
        .svc a, .svc a:hover{ text-decoration:none !important; }
        .svc a::after{ display:none !important; }

        .svc-cta::before{
          content:""; position:absolute; inset: -2px -45%;
          background: linear-gradient(110deg,transparent 0%,rgba(255,255,255,.00) 35%,rgba(170,225,255,.22) 45%,rgba(47,184,255,.38) 50%,rgba(170,225,255,.22) 55%,transparent 70%,transparent 100%);
          transform: translate3d(-60%,0,0); opacity: 0; transition: opacity .18s ease;
          pointer-events:none; mix-blend-mode: screen; will-change: transform, opacity;
        }
        .svc-cta:hover{ transform: translate3d(0,-1px,0); border-color: rgba(47,184,255,.22); background: rgba(255,255,255,.08); }
        .svc-cta:hover::before{ opacity: .95; ${reduced ? "" : "animation: svcBtnSweep .85s ease-out 1;"} }
        @keyframes svcBtnSweep{ 0%{ transform: translate3d(-70%,0,0);} 100%{ transform: translate3d(70%,0,0);} }
        @media (hover:none){ .svc-cta:hover{ transform:none; } .svc-cta:hover::before{ animation:none; } }

        .svc-ctaBtn{ cursor:pointer; appearance:none; border: 1px solid rgba(255,255,255,.10); background: rgba(255,255,255,.04); }
        .svc-ctaIcon{ opacity:.92; }

        .svc-below{ margin-top: 18px; display:grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: start; }
        @media (max-width: 980px){ .svc-below{ grid-template-columns: 1fr; } }

        .svc-ddSlot{ position: relative; width: 100%; height: auto; margin-top: 0; }
        .svc-ddFrame{
          position: relative; left: 0;
          width: var(--ddw, 260px); max-width: min(92vw, 520px); margin-left: var(--ddx, 0px);
          border-radius: 16px; border: 1px solid rgba(255,255,255,.10);
          background: rgba(10,12,18,.72);
          box-shadow: 0 26px 120px rgba(0,0,0,.65);
          overflow: hidden; backdrop-filter: blur(10px);

          max-height: 0; opacity: 0; transform: translate3d(0,-6px,0); margin-top: 0;
          transition: max-height .34s ease, opacity .22s ease, transform .22s ease, margin-top .22s ease;
          will-change: max-height, opacity, transform;
        }
        .svc-ddFrame.is-open{ opacity: 1; transform: translate3d(0,0,0); max-height: var(--ddh, 360px); margin-top: 12px; }
        .svc-ddInner{ padding: 10px; display:flex; flex-direction:column; gap: 10px; }
        .svc-ddItem{
          position: relative; display:inline-flex; align-items:center; justify-content:flex-start;
          padding: 12px 12px; border-radius: 14px; border: 1px solid rgba(255,255,255,.08);
          background: radial-gradient(120% 120% at 18% 10%, rgba(47,184,255,.10), transparent 60%), rgba(255,255,255,.03);
          text-decoration:none !important; color: rgba(255,255,255,.92); font-weight: 900; font-size: 14px;
          overflow: hidden; white-space: nowrap;

          opacity: 0; transform: translate3d(0,8px,0);
          transition: opacity .24s ease, transform .24s ease, border-color .14s ease, background-color .14s ease;
        }
        .svc-ddItem.is-on{ opacity: 1; transform: translate3d(0,0,0); }
        .svc-ddItem:hover{ border-color: rgba(47,184,255,.22); background: rgba(255,255,255,.05); }

        .svc-card{
          border-radius: 22px; border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.03);
          padding: 16px 16px;
          box-shadow: 0 22px 90px rgba(0,0,0,.40);
          contain: layout paint style;
        }
        .svc-card__title{ display:flex; align-items:center; gap: 10px; font-weight: 600; color: rgba(255,255,255,.92); letter-spacing: -.01em; font-size: 22px; }
        @media (min-width: 640px){ .svc-card__title{ font-size: 26px; } }
        .svc-card__desc{ margin-top: 10px; color: rgba(255,255,255,.70); line-height: 1.7; font-size: 14px; }

        .svc-feat{ display:flex; gap: 10px; align-items:flex-start; padding: 10px 10px; border-radius: 16px; border: 1px solid rgba(255,255,255,.07); background: rgba(0,0,0,.18); }
        .svc-feat + .svc-feat{ margin-top: 10px; }
        .svc-feat__tick{
          width: 30px; height: 30px; border-radius: 12px;
          display:flex; align-items:center; justify-content:center;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(47,184,255,.06);
          color: rgba(170,225,255,.95);
          flex: 0 0 auto;
          ${reduced ? "" : "animation: svcTickBreath 1.35s ease-in-out infinite;"}
        }
        @keyframes svcTickBreath{
          0%,100%{ transform: scale(1); box-shadow:none; opacity:.98; }
          50%{ transform: scale(1.07); box-shadow: 0 0 0 6px rgba(47f,184,255,.10), 0 0 24px rgba(47,184,255,.22); opacity:.92; }
        }
        @media (prefers-reduced-motion: reduce){ .svc-feat__tick{ animation:none !important; } }
        .svc-feat__t{ font-weight: 600; color: rgba(255,255,255,.92); }
        .svc-feat__d{ margin-top: 4px; color: rgba(255,255,255,.66); line-height: 1.65; font-size: 13.5px; }

        .svc-badge{
          position:absolute; top: 12px; left: 12px; right: 12px;
          display:flex; align-items:center; justify-content: space-between; gap: 10px;
          pointer-events:none;
          z-index: 3;
        }
        .svc-badgeLeft{
          display:inline-flex; align-items:center; gap: 10px;
          padding: 9px 12px; border-radius: 999px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(0,0,0,.28);
          color: rgba(255,255,255,.88);
          font-weight: 900; letter-spacing: .12em; font-size: 11px;
        }
        .svc-badgeRight{
          display:inline-flex; align-items:center; gap: 8px;
          padding: 9px 12px; border-radius: 999px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(0,0,0,.28);
          color: rgba(255,255,255,.86);
          font-weight: 900; font-size: 12px;
        }
        .svc-dot{
          width: 8px; height: 8px; border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), rgba(47,184,255,.28));
          box-shadow: 0 0 0 4px rgba(47,184,255,.06);
          ${reduced ? "" : "animation: svcBreath 1.6s ease-in-out infinite;"}
        }
        @keyframes svcBreath{ 0%,100%{ transform: scale(1); opacity:.95; } 50%{ transform: scale(1.18); opacity:.80; } }
      `}</style>

      <div className="container">
        <div className="svc-hero">
          <div className="svc-hero__inner">
            <div className="svc-left">
              <div className="svc-kicker" data-reveal>
                <span className="svc-kdot" aria-hidden="true" />
                <span>{kicker}</span>
              </div>

              <div className="svc-title" data-reveal style={{ transitionDelay: "80ms" }}>
                <span className="svc-grad svc-shimmer">{title}</span>
              </div>

              <div className="svc-sub" data-reveal style={{ transitionDelay: "150ms" }}>
                {subtitle}
              </div>

              <div className="svc-pills" data-reveal style={{ transitionDelay: "220ms" }}>
                <RotatingPill items={pills} reduced={reduced} />
              </div>

              <div className="svc-ctaRow" data-reveal style={{ transitionDelay: "290ms" }}>
                <Link to={withLang("/contact", lang)} className="svc-cta">
                  {contact}
                </Link>

                <button
                  ref={otherBtnRef}
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
            </div>

            <div className="svc-right" data-reveal style={{ transitionDelay: "160ms" }}>
              <div className="svc-videoWrap">
                <video
                  ref={vidRef}
                  className="svc-video"
                  src={videoUrl}
                  autoPlay
                  muted
                  playsInline
                  preload="metadata"
                  loop={false}
                />
                <div className="svc-videoScrim" aria-hidden="true" />

                <div className="svc-badge" aria-hidden="true">
                  <div className="svc-badgeLeft">
                    <Icon size={14} />
                    <span>NEOX</span>
                  </div>
                  <div className="svc-badgeRight">
                    <span className="svc-dot" />
                    <span>24/7</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="svc-below">
          <div>
            <div ref={ddSlotRef} className="svc-ddSlot">
              <div
                className={cx("svc-ddFrame", svcOpen && "is-open")}
                style={
                  {
                    ["--ddh" as any]: `${Math.max(0, ddH + 20)}px`,
                    ["--ddw" as any]: ddW ? `${ddW}px` : undefined,
                    ["--ddx" as any]: `${ddX}px`,
                  } as any
                }
              >
                <div ref={ddInnerRef} className="svc-ddInner" role="menu" aria-label="Services">
                  {dropdownItems.map((s, i) => (
                    <Link
                      key={s.id}
                      to={withLang(s.path, lang)}
                      className={cx("svc-ddItem", svcOpen && i < openSeq && "is-on")}
                      onClick={() => setSvcOpen(false)}
                    >
                      {s.title(lang)}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className="svc-card" data-reveal style={{ marginTop: 14 }}>
              <div className="svc-card__title">
                <MessagesSquare size={18} />
                <span className="svc-grad svc-shimmer">{lang === "az" ? "Nə əldə edirsən?" : "What you get"}</span>
              </div>
              <div className="svc-card__desc">
                {lang === "az"
                  ? "Müştəriləri itirməyən, satışa yönləndirən və çətin suallarda operatora problemsiz ötürən 24/7 AI çat."
                  : "A 24/7 AI chat that converts, answers fast, and hands off to an operator when needed."}
              </div>
              <div style={{ marginTop: 12 }}>
                <Feature
                  title={lang === "az" ? "Sürətli cavablar" : "Fast replies"}
                  desc={lang === "az" ? "Ən çox soruşulan suallar və satış yönümlü cavab axını." : "FAQ + sales-oriented answer flow."}
                />
                <Feature
                  title={lang === "az" ? "Operatora ötürmə" : "Operator handoff"}
                  desc={lang === "az" ? "Çətin suallarda 1 kliklə admin panelə keçid." : "One-click open the exact chat and reply."}
                />
                <Feature
                  title={lang === "az" ? "Kanallar" : "Channels"}
                  desc={lang === "az" ? "Website · WhatsApp · Instagram · Telegram inteqrasiya." : "Website · WhatsApp · Instagram · Telegram integration."}
                />
              </div>
            </div>
          </div>

          <div className="svc-card" data-reveal style={{ marginTop: 14 }}>
            <div className="svc-card__title">
              <ShieldCheck size={18} />
              <span className="svc-grad svc-shimmer">{lang === "az" ? "İdarəetmə & Təhlükəsizlik" : "Control & Security"}</span>
            </div>
            <div className="svc-card__desc">
              {lang === "az"
                ? "Admin panel, audit, operator handoff, multi-lang cavablar və konversiya analitikası."
                : "Admin panel, audit trail, operator handoff, multi-language responses and conversion analytics."}
            </div>
            <div style={{ marginTop: 12 }}>
              <Feature
                title={lang === "az" ? "Operator handoff" : "Operator handoff"}
                desc={lang === "az" ? "1 kliklə admin paneldə cavabla." : "Open the exact ticket and reply from admin."}
              />
              <Feature
                title={lang === "az" ? "Multi-lang" : "Multi-lang"}
                desc={lang === "az" ? "Avto tərcümə + admin dil seçimi." : "Auto translate + admin language select."}
              />
              <Feature
                title={lang === "az" ? "Lead capture" : "Lead capture"}
                desc={lang === "az" ? "2–3 mesajdan sonra yumşaq lead." : "Soft lead capture after 2–3 messages."}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(function ServiceChatbot247() {
  useTranslation();

  return (
    <ServicePage
      tint="cyan"
      kicker={"SERVICES"}
      title={"24/7 Chatbot qoşulması"}
      subtitle={
        "Vebsayt, WhatsApp və sosial kanallarda müştəri suallarını dərhal cavablayan, satışa yönləndirən və lazım olduqda operatora ötürən AI sistem."
      }
      icon={Bot}
      pills={["24/7", "Operator handoff", "Multi-lang", "Lead capture"]}
      videoUrl={VIDEO_URL}
    />
  );
});
