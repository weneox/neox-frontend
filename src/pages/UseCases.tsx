// src/pages/UseCases.tsx
import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  ShoppingBag,
  Stethoscope,
  GraduationCap,
  Landmark,
  Truck,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

/* ---------------- helpers ---------------- */
function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

const LANGS = ["az", "tr", "en", "ru", "es"] as const;
type Lang = (typeof LANGS)[number];

function getLangFromPath(pathname: string): Lang {
  const seg = (pathname || "/").split("/")[1] || "az";
  return (LANGS as readonly string[]).includes(seg) ? (seg as Lang) : "az";
}
function withLang(path: string, lang: Lang) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `/${lang}${p}`;
}

/* ---------------- Motion pref ---------------- */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const on = () => setReduced(!!mq.matches);
    on();
    mq.addEventListener ? mq.addEventListener("change", on) : mq.addListener(on);
    return () => {
      mq.removeEventListener ? mq.removeEventListener("change", on) : mq.removeListener(on);
    };
  }, []);
  return reduced;
}

/* ---------------- Mobile break ---------------- */
function useMedia(query: string, initial = false) {
  const [v, setV] = useState(initial);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const on = () => setV(!!mq.matches);
    on();
    mq.addEventListener ? mq.addEventListener("change", on) : mq.addListener(on);
    return () => {
      mq.removeEventListener ? mq.removeEventListener("change", on) : mq.removeListener(on);
    };
  }, [query]);
  return v;
}

/* ---------------- Scroll reveal (max FPS) ----------------
   - only opacity + transform (no blur, no filters)
   - slow, smooth
---------------------------------------------------------- */
function useReveal(rootRef: React.RefObject<HTMLElement>, opts?: { rootMargin?: string; threshold?: number }) {
  const { rootMargin = "0px 0px -12% 0px", threshold = 0.18 } = opts || {};
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    root.classList.add("uc-io");

    const els = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!els.length) return;

    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (prefersReduced || typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          io.unobserve(el);

          const delay = el.getAttribute("data-delay");
          if (delay) el.style.setProperty("--d", `${delay}ms`);

          el.classList.add("is-in");
        }
      },
      { threshold, rootMargin }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [rootRef, rootMargin, threshold]);
}

/* ---------------- SEO (native head inject) ---------------- */
function useSeo(opts: { title: string; description: string; canonicalPath: string; ogImage?: string }) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = opts.title;

    const ensureMeta = (selector: string, create: () => HTMLMetaElement) => {
      let el = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = create();
        document.head.appendChild(el);
      }
      return el;
    };
    const ensureLink = (selector: string, create: () => HTMLLinkElement) => {
      let el = document.head.querySelector(selector) as HTMLLinkElement | null;
      if (!el) {
        el = create();
        document.head.appendChild(el);
      }
      return el;
    };
    const setMetaName = (name: string, content: string) => {
      const el = ensureMeta(`meta[name="${name}"]`, () => {
        const m = document.createElement("meta");
        m.setAttribute("name", name);
        return m;
      });
      el.setAttribute("content", content);
    };
    const setMetaProp = (property: string, content: string) => {
      const el = ensureMeta(`meta[property="${property}"]`, () => {
        const m = document.createElement("meta");
        m.setAttribute("property", property);
        return m;
      });
      el.setAttribute("content", content);
    };

    const base = window.location.origin;
    const canonicalUrl = base + opts.canonicalPath;

    const canonical = ensureLink(`link[rel="canonical"]`, () => {
      const l = document.createElement("link");
      l.setAttribute("rel", "canonical");
      return l;
    });
    canonical.setAttribute("href", canonicalUrl);

    setMetaName("description", opts.description);

    setMetaProp("og:type", "website");
    setMetaProp("og:title", opts.title);
    setMetaProp("og:description", opts.description);
    setMetaProp("og:url", canonicalUrl);
    if (opts.ogImage) setMetaProp("og:image", base + opts.ogImage);

    setMetaName("twitter:card", "summary_large_image");
    setMetaName("twitter:title", opts.title);
    setMetaName("twitter:description", opts.description);
    if (opts.ogImage) setMetaName("twitter:image", base + opts.ogImage);

    return () => {
      document.title = prevTitle;
    };
  }, [opts.title, opts.description, opts.canonicalPath, opts.ogImage]);
}

/* ---------------- types ---------------- */
type Tint = "cyan" | "violet" | "ice" | "amber";

type CaseItem = {
  icon: LucideIcon;
  sektor: string;
  basliq: string;
  hekayə: string;
  maddeler: string[];
  neticeler: Array<{ k: string; v: string; sub: string }>;
  tint: Tint;
};

type CaseText = {
  sektor: string;
  basliq: string;
  hekayə: string;
  maddeler: string[];
  neticeler: Array<{ k: string; v: string; sub: string }>;
};

type MoreText = { title: string; text: string };

/* ---------------- UI atoms ---------------- */
const Bullet = memo(function Bullet({ text }: { text: string }) {
  return (
    <div className="uc-bullet">
      <CheckCircle className="uc-bulletIcon" aria-hidden="true" />
      <span className="uc-body">{text}</span>
    </div>
  );
});

const Metric = memo(function Metric({ k, v, sub }: { k: string; v: string; sub: string }) {
  return (
    <div className="uc-metric" data-reveal data-delay="120">
      <div className="uc-metricK">{k}</div>
      <div className="uc-metricV">{v}</div>
      <div className="uc-metricS">{sub}</div>
    </div>
  );
});

/* ---------------- Book Spread (max FPS version) ---------------- */
const BookSpread = memo(function BookSpread({
  c,
  flip,
  tCaseLabel,
  tRealScenario,
  toContact,
  toServices,
  ctaPrimary,
  ctaSecondary,
}: {
  c: CaseItem;
  flip: boolean;
  tCaseLabel: string;
  tRealScenario: string;
  toContact: string;
  toServices: string;
  ctaPrimary: string;
  ctaSecondary: string;
}) {
  const Icon = c.icon;

  return (
    <section className={cx("uc-spread", flip && "is-flip")} data-tint={c.tint} aria-label={`${c.sektor} spread`}>
      {/* left “paper” page */}
      <div className="uc-pageL" data-reveal data-delay="0">
        <header className="uc-pageHeader">
          <div className="uc-tag">
            <span className="uc-dot" aria-hidden="true" />
            <span className="uc-tagText">{tCaseLabel}</span>
          </div>

          <div className="uc-sector">
            <div className="uc-ic" aria-hidden="true">
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="uc-title">{c.sektor}</div>
              <div className="uc-sub">{tRealScenario}</div>
            </div>
          </div>
        </header>

        <div className="uc-pageBody">
          <h3 className="uc-h">{c.basliq}</h3>
          <p className="uc-p">{c.hekayə}</p>

          <div className="uc-list">
            {c.maddeler.map((m, i) => (
              <div key={`${m}-${i}`} data-reveal data-delay={String(80 + i * 90)}>
                <Bullet text={m} />
              </div>
            ))}
          </div>

          <div className="uc-actions" data-reveal data-delay="260">
            <Link to={toContact} className="uc-btnA">
              {ctaPrimary} <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <Link to={toServices} className="uc-btnB">
              {ctaSecondary}
            </Link>
          </div>
        </div>

        {/* cheap page edge (no blur) */}
        <div className="uc-edge" aria-hidden="true" />
      </div>

      {/* spine */}
      <div className="uc-spine" aria-hidden="true">
        <div className="uc-spineLine" />
      </div>

      {/* right “holo” page */}
      <div className="uc-pageR" data-reveal data-delay="90">
        <div className="uc-holoTop" aria-hidden="true">
          <div className="uc-holoLabel">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            <span>HOLO</span>
          </div>
          <div className="uc-bars">
            <span />
            <span />
            <span />
          </div>
        </div>

        <div className="uc-holoIcon" aria-hidden="true">
          <Icon className="w-40 h-40" />
        </div>

        <div className="uc-metrics">{c.neticeler.map((r) => <Metric key={`${r.k}-${r.v}`} {...r} />)}</div>

        <div className="uc-corner" aria-hidden="true" />
      </div>
    </section>
  );
});

/* ---------------- page ---------------- */
export default function UseCases() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const lang = getLangFromPath(pathname);

  const reduced = usePrefersReducedMotion();
  const isMobile = useMedia("(max-width: 740px)", false);
  const rootRef = useRef<HTMLElement | null>(null);

  const toContact = withLang("/contact", lang);
  const toServices = withLang("/services", lang);

  const caseLabel = t("useCases.labels.case");
  const realScenario = t("useCases.labels.realScenario");

  const ctaOwnCase = t("useCases.cta.ownCase");
  const ctaServices = t("useCases.cta.services");
  const ctaSchedule = t("useCases.cta.schedule");

  // Keep diagram/tint freedom but preserve AV text tone
  const CASE_META: Array<{ icon: LucideIcon; tint: Tint }> = useMemo(
    () => [
      { icon: ShoppingBag, tint: "cyan" },
      { icon: Landmark, tint: "violet" },
      { icon: Stethoscope, tint: "ice" },
      { icon: Truck, tint: "amber" },
    ],
    []
  );

  const casesText = useMemo(() => {
    const v = t("useCases.cases", { returnObjects: true }) as unknown;
    return (Array.isArray(v) ? v : []) as CaseText[];
  }, [t, lang]);

  const CASES: CaseItem[] = useMemo(() => {
    const n = Math.min(CASE_META.length, casesText.length);
    const out: CaseItem[] = [];
    for (let i = 0; i < n; i++) {
      const meta = CASE_META[i];
      const txt = casesText[i];
      out.push({
        icon: meta.icon,
        tint: meta.tint,
        sektor: txt?.sektor || "",
        basliq: txt?.basliq || "",
        hekayə: txt?.hekayə || "",
        maddeler: Array.isArray(txt?.maddeler) ? txt.maddeler : [],
        neticeler: Array.isArray(txt?.neticeler) ? txt.neticeler : [],
      });
    }
    return out;
  }, [CASE_META, casesText]);

  const MORE_META: Array<{ icon: LucideIcon }> = useMemo(
    () => [{ icon: Building2 }, { icon: GraduationCap }, { icon: TrendingUp }, { icon: Building2 }],
    []
  );

  const moreText = useMemo(() => {
    const v = t("useCases.more", { returnObjects: true }) as unknown;
    return (Array.isArray(v) ? v : []) as MoreText[];
  }, [t, lang]);

  const MORE = useMemo(() => {
    const n = Math.min(MORE_META.length, moreText.length);
    const out: Array<{ icon: LucideIcon; title: string; text: string }> = [];
    for (let i = 0; i < n; i++) {
      const meta = MORE_META[i];
      const txt = moreText[i];
      out.push({ icon: meta.icon, title: txt?.title || "", text: txt?.text || "" });
    }
    return out;
  }, [MORE_META, moreText]);

  useSeo({
    title: t("useCases.seo.title"),
    description: t("useCases.seo.description"),
    canonicalPath: withLang("/use-cases", lang),
  });

  useReveal(rootRef, { rootMargin: "0px 0px -12% 0px", threshold: 0.18 });

  return (
    <main ref={rootRef as any} className="uc-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            {
              "@context": "https://schema.org",
              "@type": "WebPage",
              name: t("useCases.ld.name"),
              description: t("useCases.ld.description"),
              inLanguage: lang,
            },
            null,
            0
          ),
        }}
      />

      <style>{`
        /* =========================================================
          USE CASES — BOOK MODE (MAX FPS)
          - no backdrop-filter
          - no blur filters
          - no fixed grain
          - fewer gradients, lighter shadows
          - content-visibility for offscreen
        ========================================================= */

        html, body{
          background:#000 !important;
          margin:0; padding:0;
          width:100%;
          overflow-x: clip;
          overscroll-behavior-x: none;
        }
        #root{ width:100%; overflow-x: clip; }

        .uc-page{
          background:
            radial-gradient(1100px 700px at 20% -10%, rgba(47,184,255,.08), transparent 60%),
            radial-gradient(900px 600px at 80% 0%, rgba(42,125,255,.06), transparent 60%),
            radial-gradient(900px 700px at 55% 110%, rgba(170,225,255,.05), transparent 60%),
            #000 !important;
          color: rgba(255,255,255,.92);
          min-height: 100vh;
          width: 100%;
          overflow-x: clip;
          isolation: isolate;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: geometricPrecision;
        }
        .uc-page *{ min-width:0; max-width:100%; }

        /* AV TEXT TONE (your original vibe) */
        .uc-title, .uc-h1, .uc-h, .uc-moreTitle, .uc-finalTitle{
          color: rgba(255,255,255,.94);
        }
        .uc-sub, .uc-heroP, .uc-p, .uc-body, .uc-moreSub, .uc-miniText, .uc-finalSub{
          color: rgba(170,225,255,.72);
        }
        .uc-metricK{ color: rgba(255,255,255,.94); }
        .uc-metricV{ color: rgba(170,225,255,.82); }
        .uc-metricS{ color: rgba(170,225,255,.62); }

        /* Tint variables (for diagrams / holo only) */
        [data-tint="cyan"]{ --a: rgba(47,184,255,.92); --b: rgba(47,184,255,.14); }
        [data-tint="violet"]{ --a: rgba(42,125,255,.92); --b: rgba(42,125,255,.14); }
        [data-tint="ice"]{ --a: rgba(170,225,255,.95); --b: rgba(170,225,255,.14); }
        [data-tint="amber"]{ --a: rgba(255,190,80,.92); --b: rgba(255,190,80,.12); }

        /* Reveal (slow + FPS friendly) */
        .uc-page.uc-io [data-reveal]{
          opacity: 0;
          transform: translate3d(0, 18px, 0) scale(.992);
          transition:
            opacity 0.95s cubic-bezier(.16,.88,.16,1),
            transform 0.95s cubic-bezier(.16,.88,.16,1);
          transition-delay: var(--d, 0ms);
          will-change: opacity, transform;
        }
        .uc-page.uc-io [data-reveal].is-in{
          opacity: 1;
          transform: translate3d(0,0,0) scale(1);
        }

        @media (prefers-reduced-motion: reduce){
          .uc-page.uc-io [data-reveal]{
            opacity: 1 !important;
            transform:none !important;
            transition:none !important;
          }
        }

        .uc-shell{
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 16px;
        }

        /* HERO */
        .uc-hero{
          padding: 92px 0 44px;
        }
        .uc-heroGrid{
          display:grid;
          grid-template-columns: 1.1fr .9fr;
          gap: 18px;
          align-items: center;
        }
        @media (max-width: 980px){
          .uc-hero{ padding-top: 84px; }
          .uc-heroGrid{ grid-template-columns: 1fr; }
        }

        .uc-tag{
          display:inline-flex;
          align-items:center;
          gap:10px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.04);
          padding: 10px 14px;
          border-radius: 999px;
        }
        .uc-dot{
          width: 9px; height: 9px;
          border-radius: 999px;
          background: rgba(47,184,255,1);
          box-shadow: 0 0 0 5px rgba(47,184,255,.14);
          flex: 0 0 auto;
        }
        .uc-tagText{
          font-size: 12px;
          letter-spacing: .16em;
          text-transform: uppercase;
          color: rgba(255,255,255,.72);
          white-space: nowrap;
        }

        .uc-h1{
          margin-top: 18px;
          font-size: clamp(40px, 5.4vw, 70px);
          line-height: 1.03;
          font-weight: 900;
          letter-spacing: -0.035em;
        }
        .uc-grad{
          background: linear-gradient(90deg, #fff 0%, rgba(170,225,255,.96) 35%, rgba(47,184,255,.95) 68%, rgba(42,125,255,.95) 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .uc-heroP{
          margin-top: 14px;
          font-size: 16px;
          line-height: 1.9;
          max-width: 62ch;
        }

        .uc-ctaRow{
          margin-top: 20px;
          display:flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items:center;
        }
        .uc-btnA, .uc-btnB{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:10px;
          padding: 12px 18px;
          border-radius: 999px;
          font-weight: 900;
          font-size: 14px;
          letter-spacing: -0.01em;
          user-select:none;
          -webkit-tap-highlight-color: transparent;
          transition: transform .16s ease, border-color .16s ease;
          will-change: transform;
        }
        .uc-btnA{
          border: 1px solid rgba(47,184,255,.28);
          color: rgba(255,255,255,.92);
          background: rgba(255,255,255,.04);
        }
        .uc-btnB{
          border: 1px solid rgba(255,255,255,.14);
          color: rgba(255,255,255,.88);
          background: rgba(255,255,255,.03);
        }
        .uc-btnA:hover, .uc-btnB:hover{ transform: translate3d(0,-2px,0); }
        @media (hover: none){
          .uc-btnA:hover, .uc-btnB:hover{ transform:none; }
        }

        /* right hero “dossier” (light) */
        .uc-dossier{
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,.12);
          background:
            radial-gradient(760px 260px at 20% 10%, rgba(47,184,255,.10), transparent 62%),
            radial-gradient(720px 240px at 86% 16%, rgba(42,125,255,.08), transparent 64%),
            rgba(255,255,255,.02);
          box-shadow: 0 18px 70px rgba(0,0,0,.55);
          overflow: hidden;
        }
        .uc-dossierIn{
          padding: 16px;
          display:grid;
          gap: 12px;
        }
        .uc-dossierTag{
          display:inline-flex;
          align-items:center;
          gap: 8px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.03);
          padding: 9px 12px;
          border-radius: 999px;
          width: fit-content;
          letter-spacing: .14em;
          text-transform: uppercase;
          font-size: 11px;
          color: rgba(255,255,255,.78);
        }
        .uc-dossierTitle{
          font-weight: 900;
          font-size: 18px;
          color: rgba(255,255,255,.92);
          letter-spacing: -0.01em;
        }
        .uc-dossierText{
          color: rgba(170,225,255,.70);
          line-height: 1.9;
          font-size: 14px;
        }

        /* SECTION */
        .uc-section{
          padding: 44px 0 80px;
        }

        /* BOOK SPREAD */
        .uc-spread{
          display:grid;
          grid-template-columns: 1fr 22px 1fr;
          gap: 16px;
          align-items: stretch;
          margin: 0 auto 22px;
          padding: 14px 0;
          /* perf */
          content-visibility: auto;
          contain-intrinsic-size: 860px;
        }
        .uc-spread.is-flip{ direction: rtl; }
        .uc-spread.is-flip > *{ direction: ltr; }

        @media (max-width: 740px){
          .uc-spread{ grid-template-columns: 1fr; gap: 12px; }
          .uc-spine{ display:none; }
          .uc-spread.is-flip{ direction:ltr; }
        }

        .uc-pageL, .uc-pageR{
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,.12);
          overflow: hidden;
          background: rgba(255,255,255,.02);
          box-shadow: 0 18px 70px rgba(0,0,0,.60);
          position: relative;
        }

        /* Left page (paper feeling, no heavy layers) */
        .uc-pageL{
          background:
            radial-gradient(860px 280px at 20% 10%, rgba(255,255,255,.06), transparent 62%),
            radial-gradient(720px 240px at 86% 16%, rgba(47,184,255,.08), transparent 64%),
            rgba(255,255,255,.02);
        }
        .uc-edge{
          position:absolute;
          top:0; bottom:0;
          right:0;
          width: 18px;
          background: linear-gradient(90deg, transparent, rgba(0,0,0,.20));
          pointer-events:none;
          opacity: .9;
        }

        .uc-pageHeader{
          padding: 16px 16px 0;
          display:flex;
          flex-direction: column;
          gap: 10px;
        }

        .uc-sector{
          display:flex;
          gap: 12px;
          align-items:center;
          min-width:0;
        }
        .uc-ic{
          width: 40px; height: 40px;
          border-radius: 14px;
          display:grid;
          place-items:center;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.03);
          color: rgba(255,255,255,.86);
        }

        .uc-title{ font-weight: 900; font-size: 18px; }
        .uc-sub{ margin-top: 2px; font-size: 13px; }

        .uc-pageBody{ padding: 12px 16px 16px; }
        .uc-h{
          margin-top: 10px;
          font-weight: 950;
          font-size: 24px;
          letter-spacing: -0.02em;
        }
        .uc-p{
          margin-top: 10px;
          line-height: 1.95;
          font-size: 15px;
          max-width: 72ch;
        }

        .uc-list{
          margin-top: 14px;
          display:grid;
          gap: 10px;
        }

        .uc-bullet{
          display:flex;
          align-items:flex-start;
          gap: 10px;
        }
        .uc-bulletIcon{
          width: 18px;
          height: 18px;
          margin-top: 2px;
          color: rgba(47,184,255,.95);
          flex: 0 0 auto;
        }
        .uc-body{
          font-size: 15px;
          line-height: 1.9;
          word-break: break-word;
          overflow-wrap: anywhere;
        }

        .uc-actions{
          margin-top: 16px;
          display:flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        /* Spine */
        .uc-spine{
          border-radius: 999px;
          position: relative;
          overflow:hidden;
        }
        .uc-spineLine{
          position:absolute;
          inset:0;
          background: linear-gradient(180deg, transparent, rgba(255,255,255,.12), transparent);
          opacity: .9;
        }

        /* Right page (holo) — keep cool but light */
        .uc-pageR{
          background:
            radial-gradient(820px 280px at 18% 10%, var(--b), transparent 62%),
            radial-gradient(720px 240px at 86% 16%, rgba(255,255,255,.06), transparent 64%),
            rgba(255,255,255,.015);
        }
        .uc-holoTop{
          display:flex;
          align-items:center;
          justify-content: space-between;
          padding: 14px 14px 0;
          gap: 12px;
        }
        .uc-holoLabel{
          display:inline-flex;
          align-items:center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.03);
          color: rgba(255,255,255,.72);
          letter-spacing: .14em;
          text-transform: uppercase;
          font-size: 11px;
        }
        .uc-bars{ display:flex; gap: 6px; }
        .uc-bars span{
          width: 14px; height: 8px;
          border-radius: 999px;
          background: linear-gradient(90deg, var(--a), transparent);
          opacity: .55;
        }

        .uc-holoIcon{
          position:absolute;
          left: 50%;
          top: 48%;
          transform: translate(-50%, -50%);
          opacity: .11;
          color: rgba(255,255,255,.92);
          pointer-events:none;
        }

        .uc-metrics{
          padding: 14px 14px 16px;
          display:grid;
          gap: 10px;
          position: relative;
          z-index: 1;
        }

        .uc-metric{
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,.12);
          background:
            radial-gradient(420px 130px at 18% 10%, rgba(255,255,255,.06), transparent 62%),
            radial-gradient(420px 130px at 86% 14%, var(--b), transparent 64%),
            rgba(255,255,255,.02);
          padding: 12px;
        }
        .uc-metricK{ font-weight: 950; font-size: 20px; letter-spacing: -0.02em; }
        .uc-metricV{ margin-top: 4px; font-weight: 800; font-size: 13px; }
        .uc-metricS{ margin-top: 6px; font-size: 12px; line-height: 1.55; }

        .uc-corner{
          position:absolute;
          right: 0; bottom: 0;
          width: 86px; height: 86px;
          background: linear-gradient(135deg, rgba(255,255,255,.10), rgba(255,255,255,0));
          opacity: .20;
          clip-path: polygon(100% 0, 0 100%, 100% 100%);
          pointer-events:none;
        }

        /* Slight “book opening” feel (still cheap)
           - only transform, no perspective on mobile */
        @media (min-width: 741px){
          .uc-page.uc-io .uc-pageL[data-reveal]{
            transform: translate3d(-6px, 18px, 0) rotateY(-10deg) scale(.992);
            transform-origin: right center;
          }
          .uc-page.uc-io .uc-pageR[data-reveal]{
            transform: translate3d(6px, 18px, 0) rotateY(10deg) scale(.992);
            transform-origin: left center;
          }
          .uc-page.uc-io .uc-spread.is-flip .uc-pageL[data-reveal]{
            transform: translate3d(6px, 18px, 0) rotateY(10deg) scale(.992);
          }
          .uc-page.uc-io .uc-spread.is-flip .uc-pageR[data-reveal]{
            transform: translate3d(-6px, 18px, 0) rotateY(-10deg) scale(.992);
          }
          .uc-page.uc-io .uc-pageL[data-reveal].is-in,
          .uc-page.uc-io .uc-pageR[data-reveal].is-in{
            transform: translate3d(0,0,0) rotateY(0deg) scale(1);
          }
        }

        /* MORE — asymmetric: left sticky lite + right list */
        .uc-more{
          display:grid;
          grid-template-columns: .95fr 1.05fr;
          gap: 14px;
          align-items:start;
        }
        @media (max-width: 980px){
          .uc-more{ grid-template-columns: 1fr; }
        }
        .uc-moreLeft{
          position: sticky;
          top: 92px;
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,.12);
          background:
            radial-gradient(820px 280px at 18% 10%, rgba(47,184,255,.10), transparent 62%),
            radial-gradient(720px 240px at 86% 16%, rgba(42,125,255,.08), transparent 64%),
            rgba(255,255,255,.02);
          box-shadow: 0 18px 70px rgba(0,0,0,.55);
          padding: 16px;
          overflow:hidden;
        }
        @media (max-width: 980px){
          .uc-moreLeft{ position: relative; top: auto; }
        }
        .uc-moreKicker{
          display:inline-flex;
          align-items:center;
          gap: 8px;
          padding: 9px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.03);
          width: fit-content;
          letter-spacing: .14em;
          text-transform: uppercase;
          font-size: 11px;
          color: rgba(255,255,255,.78);
        }
        .uc-moreTitle{
          margin-top: 12px;
          font-weight: 950;
          font-size: 30px;
          letter-spacing: -0.02em;
          line-height: 1.12;
        }
        .uc-moreSub{ margin-top: 10px; line-height: 1.9; }

        .uc-moreRight{
          display:grid;
          gap: 12px;
        }
        .uc-mini{
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,.12);
          background:
            radial-gradient(720px 240px at 18% 10%, rgba(255,255,255,.05), transparent 62%),
            radial-gradient(620px 220px at 86% 16%, rgba(47,184,255,.08), transparent 64%),
            rgba(255,255,255,.02);
          box-shadow: 0 18px 70px rgba(0,0,0,.55);
          padding: 16px;
        }
        .uc-miniTop{
          display:flex;
          align-items:center;
          gap: 10px;
        }
        .uc-miniTitle{
          font-weight: 900;
          color: rgba(255,255,255,.92);
        }
        .uc-miniText{
          margin-top: 10px;
          line-height: 1.9;
        }

        /* FINAL CTA */
        .uc-final{
          display:grid;
          grid-template-columns: 1.1fr .9fr;
          gap: 14px;
          align-items:center;
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,.12);
          background:
            radial-gradient(900px 300px at 18% 10%, rgba(47,184,255,.10), transparent 62%),
            radial-gradient(820px 280px at 86% 16%, rgba(42,125,255,.08), transparent 64%),
            rgba(255,255,255,.02);
          box-shadow: 0 18px 70px rgba(0,0,0,.60);
          padding: 16px;
        }
        @media (max-width: 980px){
          .uc-final{ grid-template-columns: 1fr; }
        }
        .uc-finalPill{
          color: rgba(255,255,255,.72);
          letter-spacing: .14em;
          text-transform: uppercase;
          font-size: 12px;
        }
        .uc-finalTitle{
          margin-top: 10px;
          font-weight: 950;
          font-size: 34px;
          line-height: 1.08;
          letter-spacing: -0.03em;
        }
        @media (max-width: 980px){
          .uc-finalTitle{ font-size: 28px; }
        }
        .uc-finalSub{ margin-top: 10px; line-height: 1.9; }
        .uc-finalActions{
          display:flex;
          justify-content:flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }
        @media (max-width: 980px){
          .uc-finalActions{ justify-content:flex-start; }
        }
      `}</style>

      {/* HERO */}
      <section className="uc-hero" aria-label={t("useCases.aria.hero")}>
        <div className="uc-shell">
          <div className="uc-heroGrid">
            <div>
              <div className="uc-tag" data-reveal data-delay="0">
                <span className="uc-dot" aria-hidden="true" />
                <span className="uc-tagText">{t("useCases.hero.crumb")}</span>
              </div>

              <h1 className="uc-h1" data-reveal data-delay="120">
                {t("useCases.hero.title.before")}{" "}
                <span className="uc-grad">{t("useCases.hero.title.highlight")}</span>
                {t("useCases.hero.title.after")}
              </h1>

              <p className="uc-heroP" data-reveal data-delay="220">
                {t("useCases.hero.subtitle")}
              </p>

              <div className="uc-ctaRow" data-reveal data-delay="320">
                <Link to={toContact} className="uc-btnA" aria-label={t("useCases.aria.contact")}>
                  {t("useCases.cta.ownCase")} <span aria-hidden="true">→</span>
                </Link>
                <Link to={toServices} className="uc-btnB" aria-label={t("useCases.aria.services")}>
                  {t("useCases.cta.services")}
                </Link>
              </div>
            </div>

            <div className="uc-dossier" data-reveal data-delay="180">
              <div className="uc-dossierIn">
                <div className="uc-dossierTag">
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                  <span>BOOK MODE</span>
                </div>
                <div className="uc-dossierTitle">{t("useCases.moreSection.title")}</div>
                <div className="uc-dossierText">
                  {t("useCases.moreSection.subtitle.before")}{" "}
                  <span className="uc-grad">{t("useCases.moreSection.subtitle.highlight")}</span>
                  {t("useCases.moreSection.subtitle.after")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CASES */}
      <section className="uc-section" aria-label={t("useCases.aria.caseStudies")}>
        <div className="uc-shell">
          <div className="space-y-2">
            {CASES.map((c, idx) => (
              <BookSpread
                key={c.basliq || String(idx)}
                c={c}
                flip={idx % 2 === 1}
                tCaseLabel={caseLabel}
                tRealScenario={realScenario}
                toContact={toContact}
                toServices={toServices}
                ctaPrimary={ctaOwnCase}
                ctaSecondary={ctaServices}
              />
            ))}
          </div>
        </div>
      </section>

      {/* MORE */}
      <section className="uc-section" aria-label={t("useCases.aria.more")}>
        <div className="uc-shell">
          <div className="uc-more">
            <div className="uc-moreLeft" data-reveal data-delay="0">
              <div className="uc-moreKicker">
                <span className="uc-dot" aria-hidden="true" style={{ width: 8, height: 8 }} />
                <span>{t("useCases.moreSection.pill")}</span>
              </div>
              <div className="uc-moreTitle" data-reveal data-delay="120">
                {t("useCases.moreSection.title")}
              </div>
              <p className="uc-moreSub" data-reveal data-delay="220">
                {t("useCases.moreSection.subtitle.before")}{" "}
                <span className="uc-grad">{t("useCases.moreSection.subtitle.highlight")}</span>
                {t("useCases.moreSection.subtitle.after")}
              </p>
            </div>

            <div className="uc-moreRight">
              {MORE.map((m, i) => {
                const Icon = MORE_META[i]?.icon || Building2;
                return (
                  <div key={m.title || String(i)} className="uc-mini" data-reveal data-delay={String(80 + i * 110)}>
                    <div className="uc-miniTop">
                      <div className="uc-ic" aria-hidden="true">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="uc-miniTitle">{m.title}</div>
                    </div>
                    <div className="uc-miniText">{m.text}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="uc-section" aria-label={t("useCases.aria.finalCta")}>
        <div className="uc-shell">
          <div className="uc-final" data-reveal data-delay="0">
            <div>
              <div className="uc-finalPill">{t("useCases.final.pill")}</div>
              <div className="uc-finalTitle">
                {t("useCases.final.title.before")} <span className="uc-grad">{t("useCases.final.title.highlight")}</span>
                {t("useCases.final.title.after")}
              </div>
              <p className="uc-finalSub">{t("useCases.final.subtitle")}</p>
            </div>

            <div className="uc-finalActions">
              <Link to={toContact} className="uc-btnA">
                {ctaSchedule} <span aria-hidden="true">→</span>
              </Link>
              <Link to={toServices} className="uc-btnB">
                {ctaServices}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {reduced || isMobile ? null : null}
    </main>
  );
}
