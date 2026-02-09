// src/pages/services/ServiceChatbot247.tsx
import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bot, ShieldCheck, MessagesSquare, ArrowRight, CheckCircle2, Sparkles, Zap, Globe2 } from "lucide-react";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

const TINTS = {
  cyan: {
    a: "rgba(47,184,255,.22)",
    b: "rgba(47,184,255,.10)",
    c: "rgba(47,184,255,.06)",
    d: "rgba(47,184,255,.28)",
    glow: "rgba(47,184,255,.18)",
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

/** Cloudinary: upload/ -> upload/q_auto,f_auto/ (safe) */
function withCloudinaryAuto(url: string) {
  try {
    if (!url.includes("/upload/")) return url;
    if (url.includes("/upload/q_auto") || url.includes("/upload/f_auto")) return url;
    return url.replace("/upload/", "/upload/q_auto,f_auto/");
  } catch {
    return url;
  }
}

/** super light in-view reveal (once) */
function useInViewOnce<T extends HTMLElement>(options?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;

    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e && e.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { root: null, threshold: 0.15, rootMargin: "0px 0px -10% 0px", ...(options || {}) }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [inView, options]);

  return { ref, inView } as const;
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="svc-pill">{children}</span>;
}

function Feature({ title, desc, i = 0 }: { title: string; desc: string; i?: number }) {
  return (
    <div className="svc-feat" style={{ ["--i" as any]: i }}>
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
  const T = TINTS[tint];

  const HERO_VIDEO = useMemo(() => withCloudinaryAuto(videoUrl), [videoUrl]);

  const hero = useInViewOnce<HTMLDivElement>({ threshold: 0.12 });
  const sec1 = useInViewOnce<HTMLDivElement>({ threshold: 0.12 });
  const sec2 = useInViewOnce<HTMLDivElement>({ threshold: 0.12 });

  return (
    <section className="svc">
      <style>{`
        .svc{ padding: calc(var(--hdrh,72px) + 26px) 0 84px; overflow-x:hidden; }
        .svc *{ box-sizing:border-box; }
        .svc .container{ max-width: 1180px; margin:0 auto; padding:0 18px; }

        /* ===== reveal ===== */
        .reveal{ opacity: 0; transform: translateY(12px); filter: blur(6px); }
        .reveal.is-in{ opacity: 1; transform: translateY(0); filter: blur(0); transition: opacity .55s ease, transform .55s ease, filter .55s ease; }
        .stagger > *{ opacity: 0; transform: translateY(12px); filter: blur(6px); }
        .stagger.is-in > *{
          opacity: 1; transform: translateY(0); filter: blur(0);
          transition: opacity .55s ease, transform .55s ease, filter .55s ease;
          transition-delay: calc(.06s * var(--i, 0));
        }

        .svc-hero{
          position: relative;
          border-radius: 26px;
          border: 1px solid rgba(255,255,255,.08);
          background:
            radial-gradient(120% 90% at 18% 10%, ${T.a}, transparent 55%),
            radial-gradient(120% 90% at 86% 10%, rgba(167,89,255,.12), transparent 60%),
            rgba(10,12,18,.62);
          -webkit-backdrop-filter: blur(18px) saturate(1.15);
          backdrop-filter: blur(18px) saturate(1.15);
          box-shadow: 0 26px 120px rgba(0,0,0,.55);
          overflow:hidden;
          transform: translateZ(0);
        }
        .svc-hero::before{
          content:"";
          position:absolute; inset:-2px;
          background: radial-gradient(700px 280px at 22% 18%, ${T.b}, transparent 60%);
          opacity:.95;
          filter: blur(14px);
          pointer-events:none;
        }
        .svc-hero__inner{
          position:relative;
          padding: 28px 22px;
          display:grid;
          grid-template-columns: 1.05fr .95fr;
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
          font-weight:900;
          letter-spacing:.18em;
          font-size:11px;
          color: rgba(255,255,255,.70);
          text-transform:uppercase;
        }
        .svc-kdot{
          width:10px; height:10px; border-radius:999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), ${T.d});
          box-shadow: 0 0 0 4px ${T.c};
        }

        .svc-title{
          margin-top: 10px;
          font-size: clamp(28px, 3.2vw, 44px);
          line-height: 1.06;
          color: rgba(255,255,255,.94);
          font-weight: 900;
          letter-spacing: -0.02em;
        }
        .svc-sub{
          margin-top: 10px;
          color: rgba(255,255,255,.70);
          font-size: 15px;
          line-height: 1.65;
          max-width: 62ch;
        }

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
          color: rgba(255,255,255,.86);
          font-weight: 800;
          font-size: 12px;
          white-space: nowrap;
        }

        .svc-ctaRow{
          margin-top: 16px;
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
        }
        .svc-cta:hover{ transform: translateY(-1px); border-color: rgba(255,255,255,.16); background: rgba(255,255,255,.08); }
        .svc-cta--ghost{ background: rgba(255,255,255,.04); }

        /* ===== right video panel ===== */
        .svc-right{
          min-width:0;
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.03);
          overflow:hidden;
          position:relative;
          transform: translateZ(0);
        }
        .svc-right::after{
          content:"";
          position:absolute;
          inset:0;
          background:
            radial-gradient(120% 80% at 20% 20%, ${T.c}, transparent 60%),
            radial-gradient(120% 80% at 80% 10%, rgba(167,89,255,.10), transparent 60%);
          pointer-events:none;
          z-index: 2;
        }

        .svc-videoWrap{
          position:absolute;
          inset:0;
          z-index: 0;
          overflow:hidden;
          background: rgba(0,0,0,.25);
        }
        .svc-video{
          position:absolute; inset:0;
          width:100%; height:100%;
          object-fit: cover;
          transform: scale(1.03);
          filter: saturate(1.08) contrast(1.02);
          opacity: .92;
        }
        .svc-vignette{
          position:absolute; inset:0;
          background:
            radial-gradient(100% 70% at 50% 40%, transparent 0%, rgba(0,0,0,.18) 45%, rgba(0,0,0,.55) 100%),
            linear-gradient(180deg, rgba(0,0,0,.26), rgba(0,0,0,.55));
          z-index: 1;
          pointer-events:none;
        }

        .svc-panel{
          position:relative;
          z-index: 3;
          height: 100%;
          padding: 14px 14px 12px;
          display:flex;
          flex-direction: column;
          min-height: 280px;
        }
        .svc-panel__head{
          display:flex; align-items:center; justify-content: space-between; gap: 12px;
          padding: 10px 10px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(0,0,0,.26);
          -webkit-backdrop-filter: blur(10px) saturate(1.2);
          backdrop-filter: blur(10px) saturate(1.2);
        }
        .svc-panel__badge{
          display:inline-flex; align-items:center; gap: 10px;
          font-weight: 900;
          letter-spacing: .18em;
          font-size: 11px;
          color: rgba(255,255,255,.78);
        }
        .svc-chip{
          display:inline-flex; align-items:center; gap: 8px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.06);
          color: rgba(255,255,255,.86);
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }
        .svc-chipDot{
          width: 8px; height: 8px; border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), ${T.d});
          box-shadow: 0 0 0 4px ${T.c};
          ${reduced ? "" : "animation: svcBreath 1.65s ease-in-out infinite;"}
        }
        @keyframes svcBreath{
          0%,100%{ transform: scale(1); opacity:.95; }
          50%{ transform: scale(1.18); opacity:.82; }
        }

        /* terminal */
        .svc-term{
          margin-top: 12px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(0,0,0,.30);
          -webkit-backdrop-filter: blur(10px) saturate(1.2);
          backdrop-filter: blur(10px) saturate(1.2);
          padding: 12px 12px;
          color: rgba(255,255,255,.86);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 12.5px;
          line-height: 1.6;
          flex: 1;
          min-height: 170px;
          overflow:hidden;
          box-shadow: 0 22px 90px rgba(0,0,0,.35);
        }
        .svc-termLine{ display:flex; gap: 10px; margin: 0 0 6px; }
        .svc-termPrompt{ color: rgba(255,255,255,.52); }
        .svc-termAccent{ color: rgba(47,184,255,.92); }
        .svc-termMuted{ color: rgba(255,255,255,.66); }

        .svc-miniRow{
          margin-top: 10px;
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        @media (max-width: 980px){ .svc-miniRow{ grid-template-columns: 1fr; } }
        .svc-mini{
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(0,0,0,.22);
          -webkit-backdrop-filter: blur(10px) saturate(1.2);
          backdrop-filter: blur(10px) saturate(1.2);
          padding: 10px 10px;
          display:flex; align-items:flex-start; gap: 10px;
        }
        .svc-miniIco{
          width: 30px; height: 30px; border-radius: 12px;
          display:flex; align-items:center; justify-content:center;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.06);
          flex: 0 0 auto;
        }
        .svc-miniT{ font-weight: 900; color: rgba(255,255,255,.90); font-size: 13px; }
        .svc-miniD{ margin-top: 4px; color: rgba(255,255,255,.70); font-size: 12.5px; line-height: 1.5; }

        /* sections */
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
        }
        .svc-card__title{
          display:flex; align-items:center; gap: 10px;
          font-weight: 900;
          color: rgba(255,255,255,.90);
          letter-spacing: -.01em;
        }
        .svc-card__title svg{ opacity: .9; }
        .svc-card__desc{
          margin-top: 8px;
          color: rgba(255,255,255,.68);
          line-height: 1.7;
          font-size: 14px;
        }

        .svc-feat{
          display:flex; gap: 10px; align-items:flex-start;
          padding: 10px 10px; border-radius: 16px;
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(0,0,0,.18);
          opacity: 0;
          transform: translateY(12px);
          filter: blur(6px);
        }
        .svc-feat__tick{
          width: 30px; height: 30px; border-radius: 12px;
          display:flex; align-items:center; justify-content:center;
          border: 1px solid rgba(255,255,255,.10);
          background: ${T.c};
          color: rgba(255,255,255,.92);
          flex: 0 0 auto;
        }
        .svc-feat__t{ font-weight: 900; color: rgba(255,255,255,.90); }
        .svc-feat__d{ margin-top: 4px; color: rgba(255,255,255,.66); line-height: 1.65; font-size: 13.5px; }

        .svc-card.is-in .svc-feat{
          opacity: 1;
          transform: translateY(0);
          filter: blur(0);
          transition: opacity .55s ease, transform .55s ease, filter .55s ease;
          transition-delay: calc(.10s + .08s * var(--i, 0));
        }

        @media (max-width: 520px){
          .svc .container{ padding: 0 14px; }
          .svc-hero__inner{ padding: 18px 14px; }
          .svc-panel{ min-height: 300px; }
          .svc-title{ font-size: 30px; }
        }
      `}</style>

      <div className="container">
        <div ref={hero.ref} className={cx("svc-hero", "reveal", hero.inView && "is-in")}>
          <div className="svc-hero__inner">
            <div className="svc-left">
              <div className="svc-kicker">
                <span className="svc-kdot" aria-hidden="true" />
                <span>{kicker}</span>
              </div>

              <div className="svc-title">{title}</div>
              <div className="svc-sub">{subtitle}</div>

              <div className={cx("svc-pills", "stagger", hero.inView && "is-in")}>
                {pills.map((p, idx) => (
                  <span key={p} style={{ ["--i" as any]: idx }}>
                    <Pill>{p}</Pill>
                  </span>
                ))}
              </div>

              <div className={cx("svc-ctaRow", "stagger", hero.inView && "is-in")} style={{ marginTop: 16 }}>
                <span style={{ ["--i" as any]: 0 }}>
                  <Link to={withLang("/contact", lang)} className="svc-cta">
                    {lang === "az"
                      ? "Əlaqə saxla"
                      : lang === "tr"
                      ? "İletişim"
                      : lang === "ru"
                      ? "Связаться"
                      : lang === "es"
                      ? "Contacto"
                      : "Contact"}
                    <ArrowRight size={16} />
                  </Link>
                </span>
                <span style={{ ["--i" as any]: 1 }}>
                  <Link to={withLang("/pricing", lang)} className="svc-cta svc-cta--ghost">
                    {lang === "az"
                      ? "Qiymətlər"
                      : lang === "tr"
                      ? "Fiyatlar"
                      : lang === "ru"
                      ? "Цены"
                      : lang === "es"
                      ? "Precios"
                      : "Pricing"}
                  </Link>
                </span>
              </div>
            </div>

            <div className="svc-right" aria-hidden="false">
              <div className="svc-videoWrap" aria-hidden="true">
                <video
                  className="svc-video"
                  src={HERO_VIDEO}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                />
                <div className="svc-vignette" aria-hidden="true" />
              </div>

              <div className="svc-panel">
                <div className="svc-panel__head">
                  <div className="svc-panel__badge">
                    <Icon size={16} />
                    <span>NEOX OPS</span>
                  </div>

                  <div className="svc-chip" title="Always on">
                    <span className="svc-chipDot" aria-hidden="true" />
                    <span>24/7</span>
                  </div>
                </div>

                <div className={cx("svc-term", "reveal", hero.inView && "is-in")} role="region" aria-label="Terminal">
                  <div className="svc-termLine">
                    <span className="svc-termPrompt">$</span>
                    <span>
                      deploy <span className="svc-termAccent">chatbot</span> — fast answers
                    </span>
                  </div>
                  <div className="svc-termLine">
                    <span className="svc-termPrompt">$</span>
                    <span className="svc-termMuted">channels: website · whatsapp · instagram · telegram</span>
                  </div>
                  <div className="svc-termLine">
                    <span className="svc-termPrompt">$</span>
                    <span className="svc-termMuted">
                      handoff: operator → admin panel <span className="svc-termAccent">(magic link)</span>
                    </span>
                  </div>
                  <div className="svc-termLine">
                    <span className="svc-termPrompt">$</span>
                    <span className="svc-termMuted">
                      status: <span className="svc-termAccent">ready</span>
                    </span>
                  </div>
                </div>

                <div className={cx("svc-miniRow", "stagger", hero.inView && "is-in")}>
                  <div className="svc-mini" style={{ ["--i" as any]: 0 }}>
                    <div className="svc-miniIco" aria-hidden="true">
                      <Zap size={16} />
                    </div>
                    <div>
                      <div className="svc-miniT">{lang === "az" ? "Sürətli" : "Fast"}</div>
                      <div className="svc-miniD">
                        {lang === "az" ? "Qısa, satış yönümlü cavablar." : "Short, conversion-first responses."}
                      </div>
                    </div>
                  </div>

                  <div className="svc-mini" style={{ ["--i" as any]: 1 }}>
                    <div className="svc-miniIco" aria-hidden="true">
                      <Globe2 size={16} />
                    </div>
                    <div>
                      <div className="svc-miniT">{lang === "az" ? "Multi-lang" : "Multi-lang"}</div>
                      <div className="svc-miniD">
                        {lang === "az" ? "Avto tərcümə + admin dil seçimi." : "Auto translate + admin language select."}
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    inset: "-40px -40px auto auto",
                    width: 220,
                    height: 220,
                    borderRadius: 999,
                    background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,.16), ${T.glow} 48%, transparent 68%)`,
                    filter: "blur(10px)",
                    opacity: 0.55,
                    transform: "translateZ(0)",
                    pointerEvents: "none",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div ref={sec1.ref} className={cx("svc-section", "reveal", sec1.inView && "is-in")}>
          <div className={cx("svc-card", sec1.inView && "is-in")}>
            <div className="svc-card__title">
              <MessagesSquare size={18} />
              <span>{lang === "az" ? "Nə əldə edirsən?" : "What you get"}</span>
            </div>
            <div className="svc-card__desc">
              {lang === "az"
                ? "Müştəriləri itirməyən, satışa yönləndirən və çətin suallarda operatora problemsiz ötürən 24/7 AI çat."
                : "A 24/7 AI chat that converts, answers fast, and hands off to an operator when needed."}
            </div>
            <div style={{ marginTop: 12 }}>
              {features.map((f, idx) => (
                <Feature key={f.title} title={f.title} desc={f.desc} i={idx} />
              ))}
            </div>
          </div>

          <div className={cx("svc-card", sec1.inView && "is-in")}>
            <div className="svc-card__title">
              <Sparkles size={18} />
              <span>{lang === "az" ? "Satış axını" : "Sales flow"}</span>
            </div>
            <div className="svc-card__desc">
              {lang === "az"
                ? "Chatbot müştərinin niyyətini anlayır, doğru sualları verir və ən uyğun next-step təklif edir."
                : "The bot understands intent, asks the right questions, and proposes the best next step."}
            </div>

            <div style={{ marginTop: 12 }}>
              <Feature
                i={0}
                title={lang === "az" ? "Soft lead capture" : "Soft lead capture"}
                desc={lang === "az" ? "2–3 mesajdan sonra əlaqə məlumatı soruşur." : "Asks for contact after 2–3 messages."}
              />
              <Feature
                i={1}
                title={lang === "az" ? "Pricing → Demo" : "Pricing → Demo"}
                desc={lang === "az" ? "Paket seçimi və demo yönləndirməsi." : "Guides to packages and demo scheduling."}
              />
              <Feature
                i={2}
                title={lang === "az" ? "Operator handoff" : "Operator handoff"}
                desc={lang === "az" ? "Çətin sualda 1 kliklə admin paneldə açılır." : "One click opens the exact chat in Admin."}
              />
            </div>
          </div>
        </div>

        <div ref={sec2.ref} className={cx("svc-section", "reveal", sec2.inView && "is-in")} style={{ marginTop: 18 }}>
          <div className={cx("svc-card", sec2.inView && "is-in")}>
            <div className="svc-card__title">
              <ShieldCheck size={18} />
              <span>{lang === "az" ? "İdarəetmə & Təhlükəsizlik" : "Control & Security"}</span>
            </div>
            <div className="svc-card__desc">
              {lang === "az"
                ? "Admin panel, audit, operator handoff, multi-lang cavablar və konversiya analitikası."
                : "Admin panel, audit trail, operator handoff, multi-language responses and conversion analytics."}
            </div>

            <div style={{ marginTop: 12 }}>
              <Feature
                i={0}
                title={lang === "az" ? "Admin panel" : "Admin panel"}
                desc={lang === "az" ? "Çatları idarə et, filtr və axtarış et." : "Manage chats with filters and search."}
              />
              <Feature
                i={1}
                title={lang === "az" ? "Magic link" : "Magic link"}
                desc={lang === "az" ? "Telegramdan 1 kliklə həmin çata keç." : "Open the exact chat from Telegram in one click."}
              />
              <Feature
                i={2}
                title={lang === "az" ? "Audit & export" : "Audit & export"}
                desc={lang === "az" ? "Transkript və lead export imkanları." : "Transcripts and lead export."}
              />
            </div>
          </div>

          <div className={cx("svc-card", sec2.inView && "is-in")}>
            <div className="svc-card__title">
              <Bot size={18} />
              <span>{lang === "az" ? "Hansı kanallarda?" : "Where it runs"}</span>
            </div>
            <div className="svc-card__desc">
              {lang === "az"
                ? "NEOX chatbot həm saytda, həm messencerlərdə eyni cavab keyfiyyəti ilə işləyir."
                : "NEOX runs on-site and across messengers with consistent quality."}
            </div>

            <div style={{ marginTop: 12 }}>
              <Feature i={0} title="Website widget" desc={lang === "az" ? "Saytın üzərində AI widget." : "On-site AI widget."} />
              <Feature i={1} title="WhatsApp" desc={lang === "az" ? "WhatsApp mesajlarını cavabla." : "Handle WhatsApp inquiries."} />
              <Feature i={2} title="Instagram" desc={lang === "az" ? "DM-lər üçün sürətli cavab." : "Fast DM responses."} />
              <Feature i={3} title="Telegram" desc={lang === "az" ? "Operator ping + admin link." : "Operator ping + admin link."} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(function ServiceChatbot247() {
  const { t } = useTranslation();

  // ✅ sənin verdiyin URL — burda q_auto,f_auto avtomatik əlavə olunur
  const RAW_VIDEO =
    "https://res.cloudinary.com/dppoomunj/video/upload/v1770671661/neox/media/asset_1770671649523_16c8bc8278fcb.mp4";

  return (
    <ServicePage
      videoUrl={RAW_VIDEO}
      kicker={t("nav.services")}
      title={"24/7 Chatbot qoşulması"}
      subtitle={
        "Vebsayt, WhatsApp və sosial kanallarda müştəri suallarını dərhal cavablayan, satışa yönləndirən və lazım olduqda operatora ötürən AI sistem."
      }
      icon={Bot}
      pills={["24/7", "Operator handoff", "Multi-lang", "Lead capture"]}
      features={[
        { title: "Sürətli cavablar", desc: "Ən çox soruşulan suallar və satış yönümlü cavab axını." },
        { title: "Operatora ötürmə", desc: "Çətin suallarda 1 kliklə admin panelə keçid." },
        { title: "Kanallar", desc: "Website · WhatsApp · Instagram · Telegram inteqrasiya." },
      ]}
    />
  );
});
