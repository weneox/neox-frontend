// src/pages/services/ServiceChatbot247.tsx
import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bot, ShieldCheck, MessagesSquare, ArrowRight, CheckCircle2 } from "lucide-react";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

const RAW_VIDEO =
  "https://res.cloudinary.com/dppoomunj/video/upload/v1770671661/neox/media/asset_1770671649523_16c8bc8278fcb.mp4";

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

/** Single rotating pill: 24/7 -> Operator handoff -> Multi-lang -> Lead capture */
function RotatingPill({
  items,
  reduced,
  intervalMs = 2200,
}: {
  items: string[];
  reduced: boolean;
  intervalMs?: number;
}) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (reduced) return; // no motion: keep first item
    if (!items.length) return;

    const t = window.setInterval(() => {
      setIdx((p) => (p + 1) % items.length);
    }, intervalMs);

    return () => window.clearInterval(t);
  }, [items.length, intervalMs, reduced]);

  const active = items[idx] || "";

  return (
    <span className="svc-pill svc-pill--rot" aria-label="Highlights">
      <span className="svc-pill__window">
        {/* This inner block animates top->down when text changes */}
        <span key={active} className={cx("svc-pill__item", reduced ? "svc-pill__item--static" : "svc-pill__item--in")}>
          {active}
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
  features,
  videoUrl,
}: {
  tint?: keyof typeof TINTS;
  kicker: string;
  title: string;
  subtitle: string;
  icon: any;
  pills: string[];
  features: Array<{ title: string; desc: string }>;
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
      } catch {
        // ignore (mobile may block until user gesture)
      }
    };
    tryPlay();
  }, []);

  const L = useMemo(() => {
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

    const leftCard = lang === "az" ? "Nə əldə edirsən?" : "What you get";
    const rightCard = lang === "az" ? "İdarəetmə & Təhlükəsizlik" : "Control & Security";
    const badgeRight = "24/7";
    return { contact, pricing, leftCard, rightCard, badgeRight };
  }, [lang]);

  return (
    <section className="svc">
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

        /* reveal (FPS-friendly: only opacity/transform) */
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

        /* ===== "Ağlı göy" gradient, snake-like flow (slow left->right) ===== */
        .svc-gradText{
          background: linear-gradient(
            90deg,
            #ffffff 0%,
            rgba(170,225,255,.96) 34%,
            rgba(47,184,255,.95) 68%,
            rgba(42,125,255,.95) 100%
          );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .svc-gradSnake{
          background-size: 320% 100%;
          background-position: 0% 50%;
          ${reduced ? "" : "animation: svcGradSnake 7.2s linear infinite;"}
          will-change: background-position;
        }
        @keyframes svcGradSnake{
          0%{ background-position: 0% 50%; }
          100%{ background-position: 100% 50%; }
        }
        @media (prefers-reduced-motion: reduce){
          .svc-gradSnake{ animation:none !important; }
        }

        /* HERO */
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

        /* kicker: Contact vibe */
        .svc-kicker{
          display:inline-flex; align-items:center; gap:10px;
          padding: 10px 14px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          font-size: 12px;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: rgba(255,255,255,.70);
          width: fit-content;
        }
        .svc-kdot{
          width: 8px; height: 8px; border-radius: 999px;
          background: rgba(47,184,255,1);
          box-shadow: 0 0 0 4px rgba(47,184,255,.14), 0 0 18px rgba(47,184,255,.42);
          flex: 0 0 auto;
        }

        /* Typography from Contact */
        .svc-title{
          margin-top: 14px;
          font-size: 40px;
          line-height: 1.05;
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
          max-width: 62ch;
        }
        @media (min-width: 640px){
          .svc-sub{ font-size: 18px; }
        }

        /* Rotating single pill */
        .svc-pills{
          margin-top: 14px;
          display:flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .svc-pill{
          display:inline-flex;
          align-items:center;
          height: 34px;
          padding: 0 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.05);
          color: rgba(255,255,255,.90);
          font-weight: 800;
          font-size: 12px;
          white-space: nowrap;
        }

        .svc-pill--rot{
          padding: 0 14px;
          border-color: rgba(47,184,255,.20);
          background:
            radial-gradient(120% 120% at 20% 10%, rgba(47,184,255,.14), transparent 60%),
            rgba(255,255,255,.05);
          box-shadow: 0 18px 70px rgba(0,0,0,.35);
        }
        .svc-pill__window{
          position: relative;
          display:inline-flex;
          align-items:center;
          height: 34px;
          overflow: hidden;
        }
        .svc-pill__item{
          display:inline-flex;
          align-items:center;
          height: 34px;
          line-height: 34px;
          padding: 0;
          will-change: transform, opacity;
        }
        /* slide from top -> settle (yuxarıdan aşağı) */
        .svc-pill__item--in{
          animation: svcPillDrop .42s cubic-bezier(.16,1,.25,1);
        }
        .svc-pill__item--static{
          animation: none !important;
          transform:none !important;
          opacity: 1 !important;
        }
        @keyframes svcPillDrop{
          0%{ transform: translate3d(0,-10px,0); opacity: 0; }
          100%{ transform: translate3d(0,0,0); opacity: 1; }
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
          background: rgba(255,255,255,.06);
          color: rgba(255,255,255,.92);
          font-weight: 900;
          text-decoration:none;
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
          transform: translateZ(0);
        }
        .svc-cta:hover{
          transform: translate3d(0,-1px,0);
          border-color: rgba(47,184,255,.22);
          background: rgba(255,255,255,.08);
        }
        @media (hover: none){
          .svc-cta:hover{ transform:none; }
        }
        .svc-cta--primary{
          border-color: rgba(47,184,255,.24);
          background: linear-gradient(180deg, rgba(47,184,255,.16), rgba(42,125,255,.10));
        }
        .svc-cta--ghost{ background: rgba(255,255,255,.04); }

        /* RIGHT VIDEO (crisp) */
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
            radial-gradient(900px 520px at 20% 10%, rgba(47,184,255,.12), transparent 55%),
            linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,.46) 92%);
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

        /* content */
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
          letter-spacing: -0.01em;
          font-size: 22px;
          line-height: 1.2;
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
          background: rgba(47,184,255,.10);
          color: rgba(170,225,255,.95);
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

              {/* ✅ Snake-like gradient flow on title (slow left->right) */}
              <h1
                className={cx("svc-title svc-gradText", reduced ? "" : "svc-gradSnake")}
                data-reveal
                style={{ transitionDelay: "40ms" }}
              >
                {title}
              </h1>

              <p className="svc-sub" data-reveal style={{ transitionDelay: "90ms" }}>
                {subtitle}
              </p>

              {/* ✅ 1 pill only: rotates items with slide-down */}
              <div className="svc-pills" data-reveal style={{ transitionDelay: "140ms" }}>
                <RotatingPill items={pills} reduced={reduced} intervalMs={2200} />
              </div>

              <div className="svc-ctaRow" data-reveal style={{ transitionDelay: "190ms" }}>
                <Link to={withLang("/contact", lang)} className="svc-cta svc-cta--primary">
                  {L.contact}
                  <ArrowRight size={16} />
                </Link>
                <Link to={withLang("/pricing", lang)} className="svc-cta svc-cta--ghost">
                  {L.pricing}
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
                    <span>{L.badgeRight}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="svc-section">
          <div className="svc-card" data-reveal>
            <div className="svc-card__title">
              <MessagesSquare size={18} />
              <span className={cx("svc-gradText", reduced ? "" : "svc-gradSnake")}>{L.leftCard}</span>
            </div>
            <div className="svc-card__desc">
              {lang === "az"
                ? "Müştəriləri itirməyən, satışa yönləndirən və çətin suallarda operatora problemsiz ötürən 24/7 AI çat."
                : "A 24/7 AI chat that converts, answers fast, and hands off to an operator when needed."}
            </div>
            <div style={{ marginTop: 12 }}>
              {features.map((f) => (
                <Feature key={f.title} title={f.title} desc={f.desc} />
              ))}
            </div>
          </div>

          <div className="svc-card" data-reveal style={{ transitionDelay: "60ms" }}>
            <div className="svc-card__title">
              <ShieldCheck size={18} />
              <span className={cx("svc-gradText", reduced ? "" : "svc-gradSnake")}>{L.rightCard}</span>
            </div>
            <div className="svc-card__desc">
              {lang === "az"
                ? "Admin panel, audit, operator handoff, multi-lang cavablar və konversiya analitikası."
                : "Admin panel, audit trail, operator handoff, multi-language responses and conversion analytics."}
            </div>
            <div style={{ marginTop: 12 }}>
              <Feature
                title={lang === "az" ? "Operator handoff" : "Operator handoff"}
                desc={lang === "az" ? "1 kliklə admin paneldə cavabla." : "One-click open the exact chat and reply."}
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
  const { t } = useTranslation();

  return (
    <ServicePage
      kicker={t("nav.services")}
      title={"24/7 Chatbot qoşulması"}
      subtitle={
        "Vebsayt, WhatsApp və sosial kanallarda müştəri suallarını dərhal cavablayan, satışa yönləndirən və lazım olduqda operatora ötürən AI sistem."
      }
      icon={Bot}
      /* ✅ 1 pill rotates these */
      pills={["24/7", "Operator handoff", "Multi-lang", "Lead capture"]}
      features={[
        { title: "Sürətli cavablar", desc: "Ən çox soruşulan suallar və satış yönümlü cavab axını." },
        { title: "Operatora ötürmə", desc: "Çətin suallarda 1 kliklə admin panelə keçid." },
        { title: "Kanallar", desc: "Website · WhatsApp · Instagram · Telegram inteqrasiya." },
      ]}
      videoUrl={VIDEO_URL}
    />
  );
});
