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

/* ---------------- Slow reveal (scroll -> book opens) ---------------- */
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
          // allow per-element delay
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
type Tint = "lime" | "magenta" | "ice" | "amber";

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
    <div className="uc-bullet flex items-start gap-2">
      <CheckCircle className="w-5 h-5 uc-ink flex-shrink-0 mt-0.5" />
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

/* ---------------- Book Spread (kitab kimi) ---------------- */
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
      {/* left "page" */}
      <div className="uc-pageL" data-reveal data-delay="0">
        <div className="uc-pageHeader">
          <div className="uc-badgeTag">
            <span className="uc-dot" aria-hidden="true" />
            <span>{tCaseLabel}</span>
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
        </div>

        <div className="uc-pageBody">
          <h3 className="uc-h">{c.basliq}</h3>
          <p className="uc-p">{c.hekayə}</p>

          {/* “notes margin” like a book */}
          <div className="uc-marginNote" aria-hidden="true">
            <div className="uc-scribble" />
            <div className="uc-scribble" />
            <div className="uc-scribble" />
          </div>

          <div className="uc-list">
            {c.maddeler.map((m, i) => (
              <div key={`${m}-${i}`} data-reveal data-delay={String(80 + i * 90)}>
                <Bullet text={m} />
              </div>
            ))}
          </div>

          <div className="uc-actions" data-reveal data-delay="220">
            <Link to={toContact} className="uc-btnA">
              {ctaPrimary} <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <Link to={toServices} className="uc-btnB">
              {ctaSecondary}
            </Link>
          </div>
        </div>
      </div>

      {/* spine */}
      <div className="uc-spine" aria-hidden="true">
        <div className="uc-spineLine" />
        <div className="uc-spineGlow" />
      </div>

      {/* right "page" */}
      <div className="uc-pageR" data-reveal data-delay="90">
        <div className="uc-holoTop" aria-hidden="true">
          <div className="uc-holoLabel">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            <span>HOLO / ANALYTICS</span>
          </div>
          <div className="uc-holoBars">
            <span />
            <span />
            <span />
          </div>
        </div>

        <div className="uc-holoIcon" aria-hidden="true">
          <Icon className="w-40 h-40" />
        </div>

        <div className="uc-metrics">
          {c.neticeler.map((r) => (
            <Metric key={`${r.k}-${r.v}`} k={r.k} v={r.v} sub={r.sub} />
          ))}
        </div>

        {/* page corner fold */}
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

  const [enter, setEnter] = useState(false);
  useEffect(() => {
    const tt = window.setTimeout(() => setEnter(true), 240);
    return () => window.clearTimeout(tt);
  }, []);

  const toContact = withLang("/contact", lang);
  const toServices = withLang("/services", lang);

  const caseLabel = t("useCases.labels.case");
  const realScenario = t("useCases.labels.realScenario");

  const ctaOwnCase = t("useCases.cta.ownCase");
  const ctaServices = t("useCases.cta.services");
  const ctaSchedule = t("useCases.cta.schedule");

  // NEW tint palette (tam fərqli vibe)
  const CASE_META: Array<{ icon: LucideIcon; tint: Tint }> = useMemo(
    () => [
      { icon: ShoppingBag, tint: "lime" },
      { icon: Landmark, tint: "magenta" },
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
          USE CASES — BOOK MODE (Tam fərqli konsept)
          - page flip, spine, asymmetry, right holo page
        ========================================================= */

        html, body{
          background:#07060a !important;
          margin:0;
          padding:0;
          width:100%;
          overflow-x: clip;
          overscroll-behavior-x: none;
        }
        #root{ width:100%; overflow-x: clip; }

        .uc-page{
          background:
            radial-gradient(1400px 900px at 20% -10%, rgba(220,255,90,.10), transparent 60%),
            radial-gradient(1200px 800px at 80% 0%, rgba(255,80,220,.10), transparent 60%),
            radial-gradient(1200px 900px at 55% 110%, rgba(80,240,255,.08), transparent 60%),
            #07060a !important;
          color: rgba(255,255,255,.92);
          min-height: 100vh;
          width: 100%;
          overflow-x: clip;
          overscroll-behavior-x: none;
          isolation: isolate;
          text-rendering: geometricPrecision;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          position: relative;
        }
        .uc-page *{ min-width:0; max-width:100%; }

        /* subtle grain */
        .uc-page:before{
          content:"";
          position: fixed;
          inset: 0;
          pointer-events:none;
          opacity: .08;
          mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E");
          z-index: 0;
        }

        /* Tints (tam fərqli palitra) */
        [data-tint="lime"]{ --a: rgba(210,255,90,.80); --b: rgba(210,255,90,.18); --c: rgba(40,255,170,.10); }
        [data-tint="magenta"]{ --a: rgba(255,80,220,.85); --b: rgba(255,80,220,.18); --c: rgba(190,70,255,.10); }
        [data-tint="ice"]{ --a: rgba(80,240,255,.90); --b: rgba(80,240,255,.18); --c: rgba(110,180,255,.10); }
        [data-tint="amber"]{ --a: rgba(255,190,80,.88); --b: rgba(255,190,80,.16); --c: rgba(255,120,80,.10); }

        .uc-ink{ color: var(--a); }

        /* Scroll reveal — yavaş, “kitab açılır” */
        .uc-page.uc-io [data-reveal]{
          opacity: 0;
          transform:
            perspective(1100px)
            translate3d(0, 22px, 0)
            rotateX(6deg)
            scale(.985);
          filter: blur(12px);
          transition:
            opacity 1.15s cubic-bezier(.16,.88,.16,1),
            transform 1.15s cubic-bezier(.16,.88,.16,1),
            filter 1.15s cubic-bezier(.16,.88,.16,1);
          transition-delay: var(--d, 0ms);
          will-change: opacity, transform, filter;
        }
        .uc-page.uc-io [data-reveal].is-in{
          opacity: 1;
          transform:
            perspective(1100px)
            translate3d(0,0,0)
            rotateX(0deg)
            scale(1);
          filter: blur(0px);
        }

        @media (prefers-reduced-motion: reduce){
          .uc-page.uc-io [data-reveal]{
            opacity: 1 !important;
            transform:none !important;
            filter:none !important;
            transition:none !important;
          }
        }

        /* Layout shell */
        .uc-shell{
          position: relative;
          z-index: 1;
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 16px;
        }

        /* HERO — asym left heavy + right floating */
        .uc-hero{
          position: relative;
          z-index: 1;
          padding: 96px 0 44px;
          overflow: hidden;
        }
        .uc-hero:after{
          content:"";
          position:absolute;
          inset:0;
          pointer-events:none;
          background:
            radial-gradient(900px 420px at 20% 0%, rgba(210,255,90,.10), transparent 60%),
            radial-gradient(900px 420px at 80% 0%, rgba(255,80,220,.08), transparent 62%),
            radial-gradient(900px 520px at 55% 80%, rgba(80,240,255,.06), transparent 62%),
            linear-gradient(180deg, rgba(0,0,0,.35), rgba(0,0,0,.75));
          opacity: .95;
        }
        .uc-heroGrid{
          position: relative;
          z-index: 2;
          display:grid;
          grid-template-columns: 1.15fr .85fr;
          gap: 18px;
          align-items: center;
        }
        @media (max-width: 980px){
          .uc-hero{ padding-top: 88px; }
          .uc-heroGrid{ grid-template-columns: 1fr; }
        }

        .uc-kicker{
          display:inline-flex;
          align-items:center;
          gap:10px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.04);
          padding: 10px 14px;
          border-radius: 999px;
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }
        .uc-dot{
          width: 9px; height: 9px; border-radius: 999px;
          background: rgba(210,255,90,1);
          box-shadow: 0 0 0 5px rgba(210,255,90,.16), 0 0 24px rgba(210,255,90,.40);
          flex: 0 0 auto;
        }
        .uc-kText{
          font-size: 12px;
          letter-spacing: .16em;
          text-transform: uppercase;
          color: rgba(255,255,255,.72);
          white-space: nowrap;
        }

        .uc-h1{
          margin-top: 18px;
          font-size: clamp(42px, 5.6vw, 72px);
          line-height: 1.02;
          font-weight: 800;
          letter-spacing: -0.035em;
          color: rgba(255,255,255,.96);
        }
        .uc-grad{
          background: linear-gradient(90deg, rgba(210,255,90,1), rgba(255,80,220,1), rgba(80,240,255,1));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .uc-heroP{
          margin-top: 16px;
          color: rgba(255,255,255,.72);
          font-size: 16px;
          line-height: 1.85;
          max-width: 56ch;
        }

        .uc-ctaRow{
          margin-top: 22px;
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
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
          will-change: transform;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        .uc-btnA{
          border: 1px solid rgba(255,255,255,.10);
          background:
            radial-gradient(160px 60px at 20% 40%, rgba(210,255,90,.22), transparent 62%),
            radial-gradient(160px 60px at 80% 60%, rgba(255,80,220,.14), transparent 62%),
            linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02));
          box-shadow: 0 18px 60px rgba(0,0,0,.55);
          color: rgba(255,255,255,.92);
        }
        .uc-btnB{
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(0,0,0,.20);
          box-shadow: 0 18px 60px rgba(0,0,0,.45);
          color: rgba(255,255,255,.88);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .uc-btnA:hover, .uc-btnB:hover{ transform: translate3d(0,-2px,0); }
        @media (hover: none){
          .uc-btnA:hover, .uc-btnB:hover{ transform:none; }
        }

        /* right hero “floating dossier” */
        .uc-dossier{
          position: relative;
          border-radius: 26px;
          border: 1px solid rgba(255,255,255,.12);
          background:
            radial-gradient(720px 260px at 18% 10%, rgba(255,80,220,.16), transparent 62%),
            radial-gradient(720px 260px at 84% 18%, rgba(80,240,255,.12), transparent 64%),
            linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02));
          box-shadow: 0 26px 90px rgba(0,0,0,.68);
          overflow: hidden;
          min-height: 280px;
        }
        .uc-dossier:before{
          content:"";
          position:absolute;
          inset:0;
          background: repeating-linear-gradient(180deg, rgba(255,255,255,.05) 0px, rgba(255,255,255,.05) 1px, transparent 1px, transparent 14px);
          opacity: .10;
          pointer-events:none;
        }
        .uc-dossierIn{
          position: relative;
          z-index: 2;
          padding: 18px;
          display:grid;
          gap: 12px;
        }
        .uc-dossierTag{
          display:inline-flex;
          align-items:center;
          gap: 8px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(0,0,0,.22);
          padding: 9px 12px;
          border-radius: 999px;
          width: fit-content;
          letter-spacing: .14em;
          text-transform: uppercase;
          font-size: 11px;
          color: rgba(255,255,255,.78);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .uc-dossierTitle{
          font-weight: 800;
          font-size: 18px;
          color: rgba(255,255,255,.92);
          letter-spacing: -0.01em;
        }
        .uc-dossierText{
          color: rgba(255,255,255,.70);
          line-height: 1.8;
          font-size: 14px;
        }

        /* SECTION spacing */
        .uc-section{
          position: relative;
          z-index: 1;
          padding: 48px 0 84px;
        }

        /* BOOK SPREAD */
        .uc-spread{
          position: relative;
          z-index: 1;
          display:grid;
          grid-template-columns: 1fr 24px 1fr;
          gap: 18px;
          align-items: stretch;
          margin: 0 auto 28px;
          padding: 18px 0;
          transform-style: preserve-3d;
        }
        .uc-spread.is-flip{
          direction: rtl;
        }
        .uc-spread.is-flip > *{
          direction: ltr;
        }
        @media (max-width: 740px){
          .uc-spread{
            grid-template-columns: 1fr;
            gap: 12px;
            margin-bottom: 22px;
          }
          .uc-spine{ display:none; }
          .uc-spread.is-flip{ direction: ltr; }
        }

        .uc-pageL, .uc-pageR{
          position: relative;
          border-radius: 26px;
          border: 1px solid rgba(255,255,255,.12);
          overflow: hidden;
          box-shadow: 0 26px 100px rgba(0,0,0,.70);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }

        /* Left page = “paper + margin” */
        .uc-pageL{
          background:
            radial-gradient(900px 420px at 20% 0%, rgba(255,255,255,.07), transparent 62%),
            radial-gradient(700px 320px at 90% 10%, var(--b), transparent 62%),
            linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.018));
        }
        .uc-pageL:before{
          content:"";
          position:absolute;
          inset:0;
          background:
            linear-gradient(90deg, rgba(0,0,0,.16), transparent 18%),
            repeating-linear-gradient(180deg, rgba(255,255,255,.04) 0px, rgba(255,255,255,.04) 1px, transparent 1px, transparent 18px);
          opacity: .12;
          pointer-events:none;
        }
        .uc-pageL:after{
          content:"";
          position:absolute;
          top: 0; bottom: 0;
          left: 64px;
          width: 1px;
          background: linear-gradient(180deg, transparent, rgba(255,255,255,.10), transparent);
          opacity: .55;
          pointer-events:none;
        }

        .uc-pageHeader{
          position: relative;
          z-index: 2;
          padding: 16px 18px 0;
          display:flex;
          flex-direction: column;
          gap: 10px;
        }
        .uc-badgeTag{
          display:inline-flex;
          align-items:center;
          gap: 10px;
          padding: 9px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(0,0,0,.18);
          width: fit-content;
          color: rgba(255,255,255,.78);
          letter-spacing: .14em;
          text-transform: uppercase;
          font-size: 11px;
        }
        .uc-sector{
          display:flex;
          gap: 12px;
          align-items:center;
          min-width: 0;
        }
        .uc-ic{
          width: 40px; height: 40px;
          border-radius: 14px;
          display:grid;
          place-items:center;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(0,0,0,.18);
          box-shadow: 0 18px 70px rgba(0,0,0,.40);
          color: rgba(255,255,255,.88);
        }
        .uc-title{
          font-weight: 800;
          font-size: 18px;
          color: rgba(255,255,255,.94);
          letter-spacing: -0.01em;
        }
        .uc-sub{
          margin-top: 2px;
          font-size: 13px;
          color: rgba(255,255,255,.62);
        }

        .uc-pageBody{
          position: relative;
          z-index: 2;
          padding: 12px 18px 18px;
        }
        .uc-h{
          margin-top: 10px;
          font-weight: 900;
          font-size: 24px;
          letter-spacing: -0.02em;
          color: rgba(255,255,255,.96);
        }
        .uc-p{
          margin-top: 10px;
          color: rgba(255,255,255,.72);
          line-height: 1.9;
          font-size: 15px;
          max-width: 70ch;
        }
        .uc-list{
          margin-top: 14px;
          display:grid;
          gap: 10px;
        }

        .uc-bullet{}
        .uc-body{
          color: rgba(255,255,255,.74);
          line-height: 1.85;
          font-size: 15px;
        }
        .uc-bullet:before{
          content:"";
          position:absolute;
        }

        .uc-actions{
          margin-top: 18px;
          display:flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        /* margin notes (scribbles) */
        .uc-marginNote{
          position:absolute;
          right: 14px;
          top: 78px;
          width: 120px;
          opacity: .18;
          display:grid;
          gap: 10px;
          transform: rotate(-1deg);
          pointer-events:none;
        }
        @media (max-width: 740px){
          .uc-marginNote{ display:none; }
        }
        .uc-scribble{
          height: 10px;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(255,255,255,.50), transparent);
        }

        /* Spine */
        .uc-spine{
          position: relative;
          border-radius: 999px;
          overflow:hidden;
        }
        .uc-spineLine{
          position:absolute;
          inset: 0;
          background: linear-gradient(180deg, transparent, rgba(255,255,255,.10), transparent);
          opacity: .9;
        }
        .uc-spineGlow{
          position:absolute;
          inset: -20px;
          background: radial-gradient(60px 260px at 50% 50%, var(--b), transparent 70%);
          opacity: .9;
          filter: blur(12px);
        }

        /* Right page = “hologram sheet” */
        .uc-pageR{
          background:
            radial-gradient(820px 380px at 18% 10%, var(--b), transparent 62%),
            radial-gradient(720px 340px at 86% 16%, rgba(255,255,255,.06), transparent 64%),
            linear-gradient(180deg, rgba(255,255,255,.030), rgba(255,255,255,.012));
        }
        .uc-pageR:before{
          content:"";
          position:absolute;
          inset:0;
          background:
            repeating-linear-gradient(180deg, rgba(255,255,255,.05) 0px, rgba(255,255,255,.05) 1px, transparent 1px, transparent 12px),
            linear-gradient(90deg, rgba(0,0,0,.28), transparent 40%);
          opacity: .12;
          pointer-events:none;
        }

        .uc-holoTop{
          position: relative;
          z-index: 2;
          display:flex;
          align-items:center;
          justify-content: space-between;
          padding: 14px 16px 0;
          gap: 12px;
        }
        .uc-holoLabel{
          display:inline-flex;
          align-items:center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(0,0,0,.18);
          color: rgba(255,255,255,.75);
          letter-spacing: .14em;
          text-transform: uppercase;
          font-size: 11px;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .uc-holoBars{
          display:flex;
          gap: 6px;
        }
        .uc-holoBars span{
          width: 14px;
          height: 8px;
          border-radius: 999px;
          background: linear-gradient(90deg, var(--a), transparent);
          opacity: .55;
        }

        .uc-holoIcon{
          position: absolute;
          left: 50%;
          top: 46%;
          transform: translate(-50%, -50%);
          opacity: .12;
          color: rgba(255,255,255,.92);
          z-index: 1;
          pointer-events:none;
        }

        .uc-metrics{
          position: relative;
          z-index: 2;
          padding: 14px 16px 18px;
          display:grid;
          gap: 10px;
        }
        .uc-metric{
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,.12);
          background:
            radial-gradient(320px 120px at 18% 10%, rgba(255,255,255,.07), transparent 62%),
            radial-gradient(320px 120px at 82% 14%, var(--b), transparent 64%),
            rgba(0,0,0,.12);
          box-shadow: 0 18px 80px rgba(0,0,0,.36);
          padding: 12px 12px;
        }
        .uc-metricK{
          font-weight: 950;
          font-size: 20px;
          letter-spacing: -0.02em;
          color: rgba(255,255,255,.96);
        }
        .uc-metricV{
          margin-top: 4px;
          color: rgba(255,255,255,.82);
          font-weight: 800;
          font-size: 13px;
        }
        .uc-metricS{
          margin-top: 6px;
          color: rgba(255,255,255,.60);
          font-size: 12px;
          line-height: 1.55;
        }

        .uc-corner{
          position:absolute;
          right: 0;
          bottom: 0;
          width: 92px;
          height: 92px;
          background:
            linear-gradient(135deg, rgba(255,255,255,.12), rgba(255,255,255,0));
          opacity: .22;
          clip-path: polygon(100% 0, 0 100%, 100% 100%);
          pointer-events:none;
        }

        /* Page flip feel: left opens from spine, right opens from spine */
        @media (min-width: 741px){
          .uc-pageL{
            transform-origin: right center;
          }
          .uc-pageR{
            transform-origin: left center;
          }
          .uc-page.uc-io .uc-pageL[data-reveal]{
            transform:
              perspective(1400px)
              rotateY(-18deg)
              translate3d(-8px, 18px, 0)
              scale(.985);
          }
          .uc-page.uc-io .uc-pageR[data-reveal]{
            transform:
              perspective(1400px)
              rotateY(18deg)
              translate3d(8px, 18px, 0)
              scale(.985);
          }
          .uc-page.uc-io .uc-spread.is-flip .uc-pageL[data-reveal]{
            transform:
              perspective(1400px)
              rotateY(18deg)
              translate3d(8px, 18px, 0)
              scale(.985);
          }
          .uc-page.uc-io .uc-spread.is-flip .uc-pageR[data-reveal]{
            transform:
              perspective(1400px)
              rotateY(-18deg)
              translate3d(-8px, 18px, 0)
              scale(.985);
          }
          .uc-page.uc-io .uc-pageL[data-reveal].is-in,
          .uc-page.uc-io .uc-pageR[data-reveal].is-in{
            transform:
              perspective(1400px)
              rotateY(0deg)
              translate3d(0,0,0)
              scale(1);
          }
        }

        /* MORE section — not centered blocks; “side strip” feel */
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
          border-radius: 26px;
          border: 1px solid rgba(255,255,255,.12);
          background:
            radial-gradient(820px 340px at 18% 10%, rgba(80,240,255,.10), transparent 62%),
            radial-gradient(820px 340px at 86% 14%, rgba(255,80,220,.08), transparent 64%),
            linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.02));
          box-shadow: 0 26px 100px rgba(0,0,0,.65);
          overflow:hidden;
          padding: 18px;
        }
        @media (max-width: 980px){
          .uc-moreLeft{ position: relative; top: auto; }
        }
        .uc-moreLeft:before{
          content:"";
          position:absolute;
          inset:0;
          background: repeating-linear-gradient(180deg, rgba(255,255,255,.05) 0px, rgba(255,255,255,.05) 1px, transparent 1px, transparent 14px);
          opacity: .10;
          pointer-events:none;
        }
        .uc-moreKicker{
          display:inline-flex;
          align-items:center;
          gap: 8px;
          padding: 9px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(0,0,0,.18);
          width: fit-content;
          letter-spacing: .14em;
          text-transform: uppercase;
          font-size: 11px;
          color: rgba(255,255,255,.78);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .uc-moreTitle{
          margin-top: 12px;
          font-weight: 900;
          font-size: 30px;
          letter-spacing: -0.02em;
          color: rgba(255,255,255,.95);
          line-height: 1.1;
        }
        .uc-moreSub{
          margin-top: 10px;
          color: rgba(255,255,255,.72);
          line-height: 1.85;
        }

        .uc-moreRight{
          display:grid;
          gap: 12px;
        }
        .uc-mini{
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,.12);
          background:
            radial-gradient(520px 200px at 16% 10%, rgba(255,255,255,.06), transparent 60%),
            radial-gradient(520px 200px at 88% 14%, rgba(210,255,90,.10), transparent 62%),
            linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02));
          box-shadow: 0 26px 100px rgba(0,0,0,.55);
          padding: 16px;
          overflow:hidden;
          position: relative;
        }
        .uc-mini:before{
          content:"";
          position:absolute;
          inset:0;
          background: repeating-linear-gradient(180deg, rgba(255,255,255,.05) 0px, rgba(255,255,255,.05) 1px, transparent 1px, transparent 16px);
          opacity: .08;
          pointer-events:none;
        }
        .uc-miniTop{
          display:flex;
          align-items:center;
          gap: 10px;
        }
        .uc-miniTitle{
          font-weight: 850;
          color: rgba(255,255,255,.92);
        }
        .uc-miniText{
          margin-top: 10px;
          color: rgba(255,255,255,.70);
          line-height: 1.85;
        }

        /* FINAL CTA — asymmetric */
        .uc-final{
          display:grid;
          grid-template-columns: 1.1fr .9fr;
          gap: 14px;
          align-items:center;
          border-radius: 28px;
          border: 1px solid rgba(255,255,255,.12);
          background:
            radial-gradient(900px 360px at 18% 10%, rgba(210,255,90,.12), transparent 62%),
            radial-gradient(900px 360px at 86% 16%, rgba(255,80,220,.10), transparent 64%),
            linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.02));
          box-shadow: 0 30px 130px rgba(0,0,0,.70);
          overflow:hidden;
          padding: 18px;
          position: relative;
        }
        .uc-final:before{
          content:"";
          position:absolute;
          inset:0;
          background: repeating-linear-gradient(180deg, rgba(255,255,255,.05) 0px, rgba(255,255,255,.05) 1px, transparent 1px, transparent 14px);
          opacity: .08;
          pointer-events:none;
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
          color: rgba(255,255,255,.96);
        }
        @media (max-width: 980px){
          .uc-finalTitle{ font-size: 28px; }
        }
        .uc-finalSub{
          margin-top: 10px;
          color: rgba(255,255,255,.72);
          line-height: 1.9;
        }
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
              <div className="uc-kicker" data-reveal data-delay="0">
                <span className="uc-dot" aria-hidden="true" />
                <span className="uc-kText">{t("useCases.hero.crumb")}</span>
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
                  {ctaOwnCase} <span aria-hidden="true">→</span>
                </Link>
                <Link to={toServices} className="uc-btnB" aria-label={t("useCases.aria.services")}>
                  {ctaServices}
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

      {/* CASES — BOOK SPREADS */}
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

      {/* MORE — side sticky + right flowing list */}
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

      {/* FINAL CTA — asym */}
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

      {reduced ? null : null}
    </main>
  );
}
