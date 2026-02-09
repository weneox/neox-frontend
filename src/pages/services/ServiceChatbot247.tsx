import React, { memo, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bot, ShieldCheck, Clock, MessagesSquare, ArrowRight, CheckCircle2 } from "lucide-react";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

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

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="svc-pill">{children}</span>;
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="svc-feat">
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
}: {
  tint?: keyof typeof TINTS;
  kicker: string;
  title: string;
  subtitle: string;
  icon: any;
  pills: string[];
  features: Array<{ title: string; desc: string }>;
}) {
  const location = useLocation();
  const lang = useMemo(() => getLangFromPath(location.pathname), [location.pathname]);
  const reduced = usePrefersReducedMotion();
  const T = TINTS[tint];

  return (
    <section className="svc">
      <style>{`
        .svc{ padding: calc(var(--hdrh,72px) + 28px) 0 84px; overflow-x:hidden; }
        .svc *{ box-sizing:border-box; }
        .svc .container{ max-width: 1180px; margin:0 auto; padding:0 18px; }

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
        }
        .svc-hero::before{
          content:"";
          position:absolute; inset:-2px;
          background: radial-gradient(600px 260px at 22% 18%, ${T.b}, transparent 60%);
          opacity:.9;
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

        .svc-right{
          min-width:0;
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.03);
          overflow:hidden;
          position:relative;
        }
        .svc-right::after{
          content:"";
          position:absolute;
          inset:0;
          background:
            radial-gradient(120% 80% at 20% 20%, ${T.c}, transparent 60%),
            radial-gradient(120% 80% at 80% 10%, rgba(167,89,255,.10), transparent 60%);
          pointer-events:none;
        }

        .svc-panel{
          position:relative;
          height: 100%;
          padding: 14px 14px 12px;
          display:flex;
          flex-direction: column;
          min-height: 260px;
        }
        .svc-panel__head{
          display:flex; align-items:center; justify-content: space-between; gap: 12px;
          padding: 10px 10px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(0,0,0,.22);
        }
        .svc-panel__badge{
          display:inline-flex; align-items:center; gap: 10px;
          font-weight: 900;
          letter-spacing: .18em;
          font-size: 11px;
          color: rgba(255,255,255,.72);
        }
        .svc-live{
          display:inline-flex; align-items:center; gap: 8px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.82);
          font-size: 12px;
          font-weight: 800;
        }
        .svc-liveDot{
          width: 8px; height: 8px; border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), ${T.d});
          box-shadow: 0 0 0 4px ${T.c};
          ${reduced ? "" : "animation: svcBreath 1.65s ease-in-out infinite;"}
        }
        @keyframes svcBreath{
          0%,100%{ transform: scale(1); opacity:.95; }
          50%{ transform: scale(1.20); opacity:.80; }
        }

        .svc-term{
          margin-top: 12px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(0,0,0,.28);
          padding: 12px 12px;
          color: rgba(255,255,255,.86);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 12.5px;
          line-height: 1.6;
          flex: 1;
          min-height: 168px;
          overflow:hidden;
        }
        .svc-termLine{ display:flex; gap: 10px; }
        .svc-termPrompt{ color: rgba(255,255,255,.50); }
        .svc-termAccent{ color: rgba(47,184,255,.92); }
        .svc-termMuted{ color: rgba(255,255,255,.56); }

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

        .svc-feat{ display:flex; gap: 10px; align-items:flex-start; padding: 10px 10px; border-radius: 16px; border: 1px solid rgba(255,255,255,.07); background: rgba(0,0,0,.18); }
        .svc-feat + .svc-feat{ margin-top: 10px; }
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
        }
        .svc-cta:hover{ transform: translateY(-1px); border-color: rgba(255,255,255,.16); background: rgba(255,255,255,.08); }

        .svc-cta--ghost{
          background: rgba(255,255,255,.04);
        }
      `}</style>

      <div className="container">
        <div className="svc-hero">
          <div className="svc-hero__inner">
            <div className="svc-left">
              <div className="svc-kicker">
                <span className="svc-kdot" aria-hidden="true" />
                <span>{kicker}</span>
              </div>

              <div className="svc-title">{title}</div>
              <div className="svc-sub">{subtitle}</div>

              <div className="svc-pills">
                {pills.map((p) => (
                  <Pill key={p}>{p}</Pill>
                ))}
              </div>

              <div className="svc-ctaRow">
                <Link to={withLang("/contact", lang)} className="svc-cta">
                  {lang === "az" ? "Əlaqə saxla" : lang === "tr" ? "İletişim" : lang === "ru" ? "Связаться" : lang === "es" ? "Contacto" : "Contact"}
                  <ArrowRight size={16} />
                </Link>
                <Link to={withLang("/pricing", lang)} className="svc-cta svc-cta--ghost">
                  {lang === "az" ? "Qiymətlər" : lang === "tr" ? "Fiyatlar" : lang === "ru" ? "Цены" : lang === "es" ? "Precios" : "Pricing"}
                </Link>
              </div>
            </div>

            <div className="svc-right" aria-hidden="false">
              <div className="svc-panel">
                <div className="svc-panel__head">
                  <div className="svc-panel__badge">
                    <Icon size={16} />
                    <span>NEOX OPS</span>
                  </div>
                  <div className="svc-live">
                    <span className="svc-liveDot" aria-hidden="true" />
                    <span>LIVE</span>
                  </div>
                </div>

                <div className="svc-term" role="region" aria-label="Terminal">
                  <div className="svc-termLine">
                    <span className="svc-termPrompt">$</span>
                    <span>
                      deploy <span className="svc-termAccent">24/7</span> chatbot
                    </span>
                  </div>
                  <div className="svc-termLine">
                    <span className="svc-termPrompt">$</span>
                    <span className="svc-termMuted">routes: website · whatsapp · instagram · telegram</span>
                  </div>
                  <div className="svc-termLine">
                    <span className="svc-termPrompt">$</span>
                    <span className="svc-termMuted">handoff: operator → admin panel (magic link)</span>
                  </div>
                  <div className="svc-termLine">
                    <span className="svc-termPrompt">$</span>
                    <span className="svc-termMuted">status: <span className="svc-termAccent">ready</span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="svc-section">
          <div className="svc-card">
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
              {features.map((f) => (
                <Feature key={f.title} title={f.title} desc={f.desc} />
              ))}
            </div>
          </div>

          <div className="svc-card">
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
      pills={["24/7", "Operator handoff", "Multi-lang", "Lead capture"]}
      features={[
        { title: "Sürətli cavablar", desc: "Ən çox soruşulan suallar və satış yönümlü cavab axını." },
        { title: "Operatora ötürmə", desc: "Çətin suallarda 1 kliklə admin panelə keçid." },
        { title: "Kanallar", desc: "Website · WhatsApp · Instagram · Telegram inteqrasiya." },
      ]}
    />
  );
});
