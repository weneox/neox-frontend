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

/* ---------------- Reveal: scoped + batched (FPS safe) ---------------- */
function useRevealScopedBatched(
  rootRef: React.RefObject<HTMLElement>,
  opts?: { rootMargin?: string; batchSize?: number; batchDelayMs?: number }
) {
  const { rootMargin = "0px 0px -16% 0px", batchSize = 3, batchDelayMs = 90 } = opts || {};

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    root.classList.add("uc-io");

    const els = Array.from(root.querySelectorAll<HTMLElement>(".uc-reveal"));
    if (!els.length) return;

    const revealNow = (el: HTMLElement) => el.classList.add("is-in");

    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (prefersReduced || typeof IntersectionObserver === "undefined") {
      els.forEach(revealNow);
      return;
    }

    const queue = new Set<HTMLElement>();
    let flushing = false;
    let timer: number | null = null;

    const flush = () => {
      flushing = true;
      timer = window.setTimeout(() => {
        let n = 0;
        for (const el of queue) {
          revealNow(el);
          queue.delete(el);
          n++;
          if (n >= batchSize) break;
        }
        flushing = false;
        if (queue.size) flush();
      }, batchDelayMs);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          io.unobserve(el);
          queue.add(el);
        }
        if (queue.size && !flushing) flush();
      },
      { threshold: 0.12, rootMargin }
    );

    els.forEach((el) => io.observe(el));

    const fallback = window.setTimeout(() => {
      els.forEach(revealNow);
      io.disconnect();
    }, 2200);

    return () => {
      window.clearTimeout(fallback);
      if (timer) window.clearTimeout(timer);
      io.disconnect();
    };
  }, [rootRef, rootMargin, batchSize, batchDelayMs]);
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
type Tint = "cyan" | "violet" | "pink" | "amber";

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

/* ---------------- UI parts ---------------- */
const BreadcrumbPill = memo(function BreadcrumbPill({
  text,
  enter,
  delayMs,
}: {
  text: string;
  enter: boolean;
  delayMs: number;
}) {
  return (
    <div className={cx("uc-crumb uc-enter", enter && "uc-in")} style={{ ["--d" as any]: `${delayMs}ms` }} aria-label="Breadcrumb">
      <span className="uc-crumbDot" aria-hidden="true" />
      <span className="uc-crumbText">{text}</span>
    </div>
  );
});

const TintChip = memo(function TintChip({ t, label }: { t: Tint; label: string }) {
  const map: Record<Tint, string> = {
    cyan: "border-[rgba(47,184,255,.22)] bg-[rgba(47,184,255,.07)] text-[rgba(220,248,255,.92)]",
    violet: "border-[rgba(42,125,255,.22)] bg-[rgba(42,125,255,.07)] text-[rgba(224,242,255,.92)]",
    pink: "border-[rgba(170,225,255,.22)] bg-[rgba(170,225,255,.06)] text-[rgba(236,252,255,.92)]",
    amber: "border-[rgba(80,170,255,.22)] bg-[rgba(80,170,255,.06)] text-[rgba(230,248,255,.92)]",
  };
  return <span className={cx("text-[11px] px-3 py-1 rounded-full border tracking-[.08em] uppercase", map[t])}>{label}</span>;
});

const Bullet = memo(function Bullet({ text }: { text: string }) {
  return (
    <div className="uc-bullet flex items-start gap-2">
      <CheckCircle className="w-5 h-5 text-[rgba(170,225,255,.95)] flex-shrink-0 mt-0.5" />
      <span className="text-white/75 leading-[1.65] break-words">{text}</span>
    </div>
  );
});

const ResultTile = memo(function ResultTile({ k, v, sub }: { k: string; v: string; sub: string }) {
  return (
    <div className="uc-tile uc-pop uc-contain">
      <div className="uc-tileK">{k}</div>
      <div className="uc-tileV mt-1">{v}</div>
      <div className="text-white/55 text-[12px] mt-2 leading-[1.5]">{sub}</div>
    </div>
  );
});

const CreativeHUD = memo(function CreativeHUD({
  tint,
  icon: Icon,
  metric,
  chips,
  metricLabel,
  statusLabel,
  statusValue,
}: {
  tint: Tint;
  icon: LucideIcon;
  metric: string;
  chips: { a: string; b: string; c: string };
  metricLabel: string;
  statusLabel: string;
  statusValue: string;
}) {
  const tintMap: Record<Tint, { a: string; b: string; c: string }> = {
    cyan: { a: "rgba(47,184,255,.18)", b: "rgba(42,125,255,.14)", c: "rgba(170,225,255,.12)" },
    violet: { a: "rgba(42,125,255,.18)", b: "rgba(47,184,255,.12)", c: "rgba(170,225,255,.10)" },
    pink: { a: "rgba(170,225,255,.16)", b: "rgba(47,184,255,.12)", c: "rgba(42,125,255,.10)" },
    amber: { a: "rgba(80,170,255,.16)", b: "rgba(47,184,255,.12)", c: "rgba(42,125,255,.10)" },
  };
  const tt = tintMap[tint];

  return (
    <div
      className="uc-hud uc-pop uc-contain"
      data-tint={tint}
      style={{
        background: `
          radial-gradient(700px 360px at 35% 10%, ${tt.a}, transparent 60%),
          radial-gradient(700px 360px at 80% 20%, ${tt.b}, transparent 62%),
          radial-gradient(900px 460px at 50% 120%, rgba(255,255,255,.05), transparent 64%),
          rgba(255,255,255,.012)
        `,
        boxShadow: "0 14px 46px rgba(0,0,0,.55)",
      }}
      aria-label="Visual panel"
    >
      <div className="uc-hudGrid" aria-hidden="true" />
      <div className="uc-hudScan" aria-hidden="true" />

      <div className="uc-hudInner">
        <div className="uc-hudOrbit" aria-hidden="true" />
        <div className="uc-hudRing" aria-hidden="true" />
        <Icon className="uc-hudIcon" aria-hidden="true" />
        <div className="uc-hudChips" aria-hidden="true">
          <span className="uc-hudChip">{chips.a}</span>
          <span className="uc-hudChip">{chips.b}</span>
          <span className="uc-hudChip">{chips.c}</span>
        </div>

        <div className="uc-hudBadge">
          <div className="uc-hudBadgeTop">{metricLabel}</div>
          <div className="uc-hudBadgeVal">{metric}</div>
        </div>

        <div className="uc-hudBadge uc-hudBadge2">
          <div className="uc-hudBadgeTop">{statusLabel}</div>
          <div className="uc-hudBadgeVal">{statusValue}</div>
        </div>
      </div>
    </div>
  );
});

const CaseRow = memo(function CaseRow({
  c,
  flip,
  tCaseLabel,
  tRealScenario,
  toContact,
  toServices,
  ctaPrimary,
  ctaSecondary,
  hudChips,
  hudMetricLabel,
  hudStatusLabel,
  hudStatusValue,
}: {
  c: CaseItem;
  flip: boolean;
  tCaseLabel: string;
  tRealScenario: string;
  toContact: string;
  toServices: string;
  ctaPrimary: string;
  ctaSecondary: string;
  hudChips: { a: string; b: string; c: string };
  hudMetricLabel: string;
  hudStatusLabel: string;
  hudStatusValue: string;
}) {
  const Icon = c.icon;

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:items-center uc-stack" data-tint={c.tint}>
      {/* TEXT */}
      <div className={cx("uc-reveal", flip ? "reveal-right lg:order-2" : "reveal-left")}>
        <article className="uc-card uc-pop uc-contain" data-tint={c.tint} aria-label={`${c.sektor} use case`}>
          <header className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="uc-ic" aria-hidden="true">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-white font-semibold text-[18px] break-words">{c.sektor}</div>
                <div className="text-white/55 text-[13px] mt-1 break-words">{tRealScenario}</div>
              </div>
            </div>
            <TintChip t={c.tint} label={tCaseLabel} />
          </header>

          <div className="mt-4 uc-line" />

          <h3 className="mt-4 text-white text-[20px] sm:text-[22px] font-semibold break-words">{c.basliq}</h3>
          <p className="mt-3 text-white/70 leading-[1.75] break-words">{c.hekayə}</p>

          <div className="mt-5 space-y-3">
            {c.maddeler.map((b) => (
              <Bullet key={b} text={b} />
            ))}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            {c.neticeler.map((r) => (
              <ResultTile key={`${r.v}-${r.k}`} k={r.k} v={r.v} sub={r.sub} />
            ))}
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link to={toContact} className="uc-btn">
              {ctaPrimary} <span aria-hidden="true">→</span>
            </Link>
            <Link to={toServices} className="uc-btn uc-btnGhost">
              {ctaSecondary}
            </Link>
          </div>
        </article>
      </div>

      {/* VISUAL */}
      <div className={cx("uc-reveal", flip ? "reveal-left lg:order-1" : "reveal-right")}>
        <CreativeHUD
          tint={c.tint}
          icon={Icon}
          metric={c.neticeler[0]?.k || "+0%"}
          chips={hudChips}
          metricLabel={hudMetricLabel}
          statusLabel={hudStatusLabel}
          statusValue={hudStatusValue}
        />
      </div>
    </div>
  );
});

/* ---------------- page ---------------- */
export default function UseCases() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const lang = getLangFromPath(pathname);

  const reduced = usePrefersReducedMotion();
  const isMobile = useMedia("(max-width: 560px)", false);
  const rootRef = useRef<HTMLElement | null>(null);

  const [enter, setEnter] = useState(false);
  useEffect(() => {
    const tt = window.setTimeout(() => setEnter(true), 220);
    return () => window.clearTimeout(tt);
  }, []);
  const d = (ms: number) => ({ ["--d" as any]: `${isMobile ? Math.round(ms * 0.7) : ms}ms` });

  const toContact = withLang("/contact", lang);
  const toServices = withLang("/services", lang);

  const caseLabel = t("useCases.labels.case");
  const realScenario = t("useCases.labels.realScenario");

  const ctaOwnCase = t("useCases.cta.ownCase");
  const ctaServices = t("useCases.cta.services");
  const ctaSchedule = t("useCases.cta.schedule");

  const hudChips = {
    a: t("useCases.hud.chips.a"),
    b: t("useCases.hud.chips.b"),
    c: t("useCases.hud.chips.c"),
  };
  const hudMetricLabel = t("useCases.hud.metricLabel");
  const hudStatusLabel = t("useCases.hud.statusLabel");
  const hudStatusValue = t("useCases.hud.statusValue");

  const CASE_META: Array<{ icon: LucideIcon; tint: Tint }> = useMemo(
    () => [
      { icon: ShoppingBag, tint: "cyan" },
      { icon: Landmark, tint: "violet" },
      { icon: Stethoscope, tint: "pink" },
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

  useRevealScopedBatched(rootRef, { batchSize: 3, batchDelayMs: 90, rootMargin: "0px 0px -18% 0px" });

  // ✅ HERO background video (Cloudinary optimized)
  const HERO_VIDEO_URL =
    "https://res.cloudinary.com/dppoomunj/video/upload/q_auto,f_auto/v1770593337/neox/media/asset_1770593331791_6f5389053f2f9.mp4";

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
        /* ✅ ROOT-LEVEL FIX — eyni Blog/Contact kimi (kökdən bağlayır) */
        html, body{
          background:#000 !important;
          margin:0;
          padding:0;
          width:100%;
          overflow-x: clip;
          overscroll-behavior-x: none;
        }
        #root{
          width:100%;
          overflow-x: clip;
        }

        .uc-page{
          background:#000 !important;
          color: rgba(255,255,255,.92);
          min-height: 100vh;
          width: 100%;
          overflow-x: clip; /* ✅ hidden yox, clip */
          overscroll-behavior-x: none;
          word-break: break-word;
          overflow-wrap: anywhere;
          isolation: isolate;
          text-rendering: geometricPrecision;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .uc-page *{ min-width:0; max-width:100%; }

        /* ✅ hover scale daşımasın */
        .uc-stack{
          position: relative;
          isolation: isolate;
          overflow: clip; /* ✅ bu əsas fixlərdən biridir */
        }

        /* palette */
        .uc-page .uc-grad{
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

        .uc-contain{ contain: layout paint style; transform: translateZ(0); backface-visibility: hidden; }

        .uc-enter{
          opacity: 0;
          transform: translate3d(0, 16px, 0);
          filter: blur(7px);
          transition: opacity .62s ease, transform .62s ease, filter .62s ease;
          transition-delay: var(--d, 0ms);
          will-change: opacity, transform, filter;
        }
        .uc-enter.uc-in{ opacity:1; transform: translate3d(0,0,0); filter: blur(0px); }

        .uc-pop{
          position: relative;
          z-index: 1;
          transform: translate3d(0,0,0) scale(1);
          transition: transform .20s ease, border-color .20s ease, box-shadow .20s ease;
          will-change: transform;
        }
        .uc-pop:hover, .uc-pop:focus-within{
          z-index: 60;
          transform: translate3d(0,-10px,0) scale(1.03);
        }

        .uc-hero{ position: relative; padding: 22px 0 0; overflow: hidden; }
        .uc-heroInner{
          min-height: clamp(520px, 78vh, 860px);
          display: grid;
          place-items: center;
          padding: 64px 0 26px;
        }
        @media (max-width: 560px){
          .uc-heroInner{ min-height:auto; padding-top: 84px; padding-bottom: 18px; }
        }

        /* ✅ HERO background (video + gradients) */
        .uc-heroBG{
          pointer-events:none;
          position:absolute;
          inset:0;
          opacity: 1;
          overflow:hidden;
          z-index: 0;
        }
        .uc-heroVideo{
          position:absolute;
          inset:0;
          width:100%;
          height:100%;
          object-fit: cover;
          transform: translateZ(0);
          filter: saturate(1.05) contrast(1.05);
          opacity: .92;
          z-index: 1;
        }
        .uc-heroBG::before{
          content:"";
          position:absolute;
          inset:-10% -10%;
          background:
            radial-gradient(900px 520px at 50% 10%, rgba(47,184,255,.09), transparent 62%),
            radial-gradient(980px 560px at 20% 0%, rgba(42,125,255,.06), transparent 70%),
            radial-gradient(980px 560px at 80% 0%, rgba(170,225,255,.05), transparent 70%);
          opacity: .92;
          z-index: 2;
        }
        .uc-heroBG::after{
          content:"";
          position:absolute;
          inset:0;
          background:
            radial-gradient(900px 520px at 50% 0%, rgba(0,0,0,.20), rgba(0,0,0,.92));
          z-index: 3;
        }

        .uc-divider{
          height: 1px;
          width: 100%;
          max-width: 920px;
          margin: 42px auto 0;
          background: linear-gradient(90deg, transparent, rgba(47,184,255,.22), rgba(255,255,255,.08), rgba(42,125,255,.18), transparent);
          opacity: .95;
        }
        .uc-spacer{ height: 34px; }

        .uc-crumb{
          display:inline-flex;
          align-items:center;
          gap:10px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          padding: 10px 14px;
          border-radius: 999px;
        }
        .uc-crumbDot{
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: rgba(47,184,255,1);
          box-shadow: 0 0 0 4px rgba(47,184,255,.14), 0 0 18px rgba(47,184,255,.42);
          flex: 0 0 auto;
        }
        .uc-crumbText{
          font-size: 12px;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: rgba(255,255,255,.70);
          white-space: nowrap;
        }

        .uc-btn{
          display:inline-flex; align-items:center; justify-content:center; gap:10px;
          padding:12px 18px;
          border-radius:999px;
          font-weight:700;
          font-size:14px;
          letter-spacing:-.01em;
          border:1px solid rgba(47,184,255,.28);
          color:rgba(255,255,255,.92);
          background:
            radial-gradient(120px 60px at 30% 30%, rgba(170,225,255,.18), transparent 62%),
            linear-gradient(180deg, rgba(10,24,40,.72), rgba(5,10,18,.55));
          box-shadow: 0 10px 26px rgba(0,0,0,.55), 0 0 0 1px rgba(47,184,255,.10) inset;
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
          will-change: transform;
        }
        .uc-btn:hover{
          transform: translate3d(0,-2px,0);
          border-color: rgba(47,184,255,.46);
          box-shadow: 0 14px 34px rgba(0,0,0,.62), 0 0 22px rgba(47,184,255,.12);
        }
        .uc-btn:active{ transform: translate3d(0,-1px,0); }
        .uc-btnGhost{
          border-color: rgba(255,255,255,.14);
          background: rgba(255,255,255,.03);
          box-shadow: 0 10px 26px rgba(0,0,0,.55);
        }
        .uc-btnGhost:hover{
          border-color: rgba(47,184,255,.26);
          box-shadow: 0 14px 34px rgba(0,0,0,.62);
        }

        .uc-card{
          position: relative;
          border: 1px solid rgba(255,255,255,.10);
          background: linear-gradient(180deg, rgba(255,255,255,.030), rgba(255,255,255,.016));
          box-shadow: 0 16px 56px rgba(0,0,0,.60);
          border-radius: 22px;
          overflow: hidden;
          padding: 18px;
        }
        .uc-line{
          height: 1px;
          background: linear-gradient(90deg, rgba(47,184,255,.22), rgba(255,255,255,.08), rgba(42,125,255,.18));
          opacity: .95;
        }
        .uc-ic{
          width: 40px; height: 40px; border-radius: 14px;
          display: grid; place-items: center;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.03);
          box-shadow: 0 12px 36px rgba(0,0,0,.45);
          transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
        }
        .uc-pop:hover .uc-ic{
          transform: translate3d(0,-2px,0);
          border-color: rgba(47,184,255,.22);
          box-shadow: 0 16px 44px rgba(0,0,0,.60);
        }

        .uc-tile{
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.02);
          box-shadow: 0 12px 36px rgba(0,0,0,.45);
          padding: 12px 12px;
        }
        .uc-tileK{
          font-weight: 900;
          font-size: 22px;
          line-height: 1;
          background: linear-gradient(90deg, #fff 0%, rgba(47,184,255,.98) 60%, rgba(42,125,255,.95) 100%);
          -webkit-background-clip:text;
          background-clip:text;
          color:transparent;
        }
        .uc-tileV{ color: rgba(255,255,255,.86); font-weight: 700; font-size: 13px; }

        .uc-hud{
          position: relative;
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,.10);
          overflow: hidden;
          transform: translate3d(0,0,0);
        }
        .uc-hudInner{
          position: relative;
          min-height: 360px;
          display: grid;
          place-items: center;
          padding: 28px;
        }
        .uc-hudGrid{
          position:absolute; inset:0;
          background:
            linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px);
          background-size: 34px 34px;
          opacity: .10;
          mask-image: radial-gradient(120% 90% at 50% 10%, #000 56%, transparent 100%);
          -webkit-mask-image: radial-gradient(120% 90% at 50% 10%, #000 56%, transparent 100%);
          pointer-events:none;
        }
        .uc-hudScan{
          position:absolute; inset:-40px 0 0 0;
          background: repeating-linear-gradient(180deg, rgba(255,255,255,.05) 0px, rgba(255,255,255,.05) 1px, transparent 1px, transparent 10px);
          opacity: .07;
          pointer-events:none;
        }
        .uc-hudRing{
          position:absolute;
          width: 260px; height: 260px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.12);
          box-shadow: 0 0 0 8px rgba(47,184,255,.06), 0 0 0 1px rgba(0,0,0,.4) inset;
          opacity: .55;
          pointer-events:none;
        }
        .uc-hudOrbit{
          position:absolute;
          width: 320px; height: 320px;
          border-radius: 999px;
          border: 1px dashed rgba(255,255,255,.12);
          opacity: .22;
          pointer-events:none;
        }
        .uc-hudIcon{
          width: 168px; height: 168px;
          opacity: .12;
          color: rgba(255,255,255,.92);
        }
        .uc-hudChips{
          position:absolute;
          bottom: 18px; left: 18px;
          display:flex; gap: 8px; flex-wrap: wrap;
          max-width: 70%;
        }
        .uc-hudChip{
          font-size: 11px;
          letter-spacing: .10em;
          text-transform: uppercase;
          padding: 7px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.03);
          color: rgba(255,255,255,.76);
        }
        .uc-hudBadge{
          position:absolute;
          top: 18px; right: 18px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          padding: 12px 14px;
          box-shadow: 0 14px 44px rgba(0,0,0,.35);
          min-width: 120px;
        }
        .uc-hudBadge2{ top:auto; bottom: 18px; right: 18px; min-width: 110px; }
        .uc-hudBadgeTop{
          color: rgba(255,255,255,.66);
          font-size: 11px;
          letter-spacing: .12em;
          text-transform: uppercase;
        }
        .uc-hudBadgeVal{
          color: rgba(255,255,255,.92);
          font-weight: 700;
          margin-top: 6px;
          font-size: 16px;
        }
        @media (max-width: 560px){
          .uc-hudInner{ min-height: 320px; }
          .uc-hudIcon{ width: 150px; height: 150px; }
        }

        .uc-section{ background: transparent !important; }

        .uc-reveal{ opacity: 1; transform: none; }
        .uc-page.uc-io .uc-reveal{
          opacity: 0;
          transform: translate3d(var(--rx, 0px), var(--ry, 14px), 0);
          transition: opacity .45s ease, transform .45s ease;
          will-change: transform, opacity;
        }
        .uc-page.uc-io .uc-reveal.is-in{ opacity: 1; transform: translate3d(0,0,0); }
        .reveal-left{ --rx: -18px; --ry: 0px; }
        .reveal-right{ --rx: 18px; --ry: 0px; }
        .reveal-top{ --rx: 0px; --ry: 14px; }
        .reveal-bottom{ --rx: 0px; --ry: -14px; }

        @media (prefers-reduced-motion: reduce){
          .uc-enter{ opacity:1 !important; transform:none !important; filter:none !important; transition:none !important; }
          .uc-page.uc-io .uc-reveal{ opacity:1; transform:none; transition:none; }
          .uc-pop{ transition:none !important; transform:none !important; }
          .uc-btn{ transition:none !important; }
          .uc-hudOrbit{ animation: none !important; }
          .uc-heroVideo{ display:none !important; }
        }
        @media (hover: none){
          .uc-pop:hover{ transform:none !important; }
          .uc-btn:hover{ transform:none !important; }
        }

        /* Tint vars */
        [data-tint="cyan"]{ --tA: rgba(47,184,255,.62); --tB: rgba(170,225,255,.28); }
        [data-tint="violet"]{ --tA: rgba(42,125,255,.66); --tB: rgba(47,184,255,.22); }
        [data-tint="pink"]{ --tA: rgba(170,225,255,.55); --tB: rgba(47,184,255,.20); }
        [data-tint="amber"]{ --tA: rgba(80,170,255,.58); --tB: rgba(47,184,255,.20); }

        .uc-card::before{
          content:"";
          position:absolute;
          inset:-2px;
          border-radius: 24px;
          pointer-events:none;
          opacity: 0;
          transform: translate3d(-14px, 0, 0);
          transition: opacity .22s ease, transform .22s ease;
          background:
            radial-gradient(620px 220px at 14% 0%, rgba(255,255,255,.10), transparent 62%),
            radial-gradient(520px 240px at 80% 12%, var(--tB), transparent 62%),
            linear-gradient(90deg, transparent, rgba(255,255,255,.06), transparent);
          mix-blend-mode: screen;
        }
        .uc-pop:hover.uc-card::before,
        .uc-pop:focus-within.uc-card::before{
          opacity: 1;
          transform: translate3d(0,0,0);
        }

        .uc-card::after{
          content:"";
          position:absolute;
          inset:0;
          border-radius: 22px;
          pointer-events:none;
          opacity: 0;
          transition: opacity .22s ease;
          box-shadow: 0 0 0 1px rgba(255,255,255,.08) inset, 0 0 0 1px rgba(0,0,0,.35);
        }
        .uc-pop:hover.uc-card::after,
        .uc-pop:focus-within.uc-card::after{ opacity: 1; }

        .uc-bullet{ position: relative; padding-left: 2px; }
        .uc-bullet::before{
          content:"";
          position:absolute;
          left: 9px;
          top: 14px;
          width: 28px;
          height: 1px;
          background: linear-gradient(90deg, var(--tA), transparent);
          opacity: .65;
        }

        .uc-hud::before{
          content:"";
          position:absolute;
          inset:0;
          pointer-events:none;
          opacity:.65;
          background:
            radial-gradient(820px 260px at 20% 0%, var(--tB), transparent 60%),
            radial-gradient(700px 240px at 80% 10%, rgba(255,255,255,.06), transparent 62%);
          mix-blend-mode: screen;
        }

        @media (prefers-reduced-motion: no-preference){
          .uc-hudOrbit{ animation: uc-orbit 10.5s linear infinite; transform-origin: 50% 50%; }
        }
        @keyframes uc-orbit{ from{ transform: rotate(0deg); } to{ transform: rotate(360deg); } }

        @media (min-width: 1024px){
          .uc-stack::after{
            content:"";
            position:absolute;
            left: 50%;
            top: 50%;
            width: min(220px, 18vw);
            height: 1px;
            transform: translate3d(-50%, -50%, 0);
            background: linear-gradient(90deg, transparent, rgba(47,184,255,.18), transparent);
            opacity: .55;
            pointer-events:none;
            transition: opacity .18s ease;
          }
          .uc-stack:hover::after{
            opacity: .85;
            background: linear-gradient(90deg, transparent, var(--tA), transparent);
          }
        }
      `}</style>

      {/* HERO */}
      <section className="uc-hero uc-section" aria-label={t("useCases.aria.hero")}>
        <div className="uc-heroBG" aria-hidden="true">
          {reduced ? null : (
            <video className="uc-heroVideo" autoPlay muted loop playsInline preload="metadata">
              <source src={HERO_VIDEO_URL} type="video/mp4" />
            </video>
          )}
        </div>

        <div className="uc-heroInner">
          <div className="relative z-[1] mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 w-full">
            <div className="mx-auto max-w-[980px] text-center">
              <div className="flex justify-center">
                <BreadcrumbPill text={t("useCases.hero.crumb")} enter={enter} delayMs={0} />
              </div>

              <h1 className={cx("mt-6 text-white break-words uc-enter", enter && "uc-in")} style={d(90)}>
                <span className="block text-[40px] leading-[1.05] sm:text-[60px] font-semibold">
                  {t("useCases.hero.title.before")} <span className="uc-grad">{t("useCases.hero.title.highlight")}</span>
                  {t("useCases.hero.title.after")}
                </span>
              </h1>

              <p
                className={cx(
                  "mt-5 text-[16px] sm:text-[18px] leading-[1.7] text-white/70 break-words uc-enter",
                  enter && "uc-in"
                )}
                style={d(180)}
              >
                {t("useCases.hero.subtitle")}
              </p>

              <div className={cx("mt-8 flex flex-wrap items-center justify-center gap-3 uc-enter", enter && "uc-in")} style={d(270)}>
                <Link to={toContact} className="uc-btn" aria-label={t("useCases.aria.contact")}>
                  {ctaOwnCase} <span aria-hidden="true">→</span>
                </Link>
                <Link to={toServices} className="uc-btn uc-btnGhost" aria-label={t("useCases.aria.services")}>
                  {ctaServices}
                </Link>
              </div>

              <div className="uc-divider" />
            </div>
          </div>
        </div>

        <div className="uc-spacer" />
      </section>

      {/* CASES */}
      <section className="uc-section py-16 sm:py-20" aria-label={t("useCases.aria.caseStudies")}>
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="space-y-12">
            {CASES.map((c, idx) => (
              <CaseRow
                key={c.basliq || String(idx)}
                c={c}
                flip={idx % 2 === 1}
                tCaseLabel={caseLabel}
                tRealScenario={realScenario}
                toContact={toContact}
                toServices={toServices}
                ctaPrimary={ctaOwnCase}
                ctaSecondary={ctaServices}
                hudChips={hudChips}
                hudMetricLabel={hudMetricLabel}
                hudStatusLabel={hudStatusLabel}
                hudStatusValue={hudStatusValue}
              />
            ))}
          </div>
        </div>
      </section>

      {/* MORE */}
      <section className="uc-section py-16 sm:py-20" aria-label={t("useCases.aria.more")}>
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center">
              <div className={cx("uc-reveal reveal-top", "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2")}>
                <span className="uc-crumbDot" aria-hidden="true" style={{ width: 7, height: 7 }} />
                <span className="text-[12px] tracking-[0.14em] uppercase text-white/70">{t("useCases.moreSection.pill")}</span>
              </div>
            </div>

            <h2 className={cx("uc-reveal reveal-bottom", "mt-4 text-[28px] sm:text-[40px] font-semibold text-white")}>
              {t("useCases.moreSection.title")}
            </h2>
            <p className={cx("uc-reveal reveal-bottom", "mt-3 text-white/65 max-w-[820px] mx-auto leading-[1.7]")}>
              {t("useCases.moreSection.subtitle.before")} <span className="uc-grad">{t("useCases.moreSection.subtitle.highlight")}</span>
              {t("useCases.moreSection.subtitle.after")}
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-4 uc-stack">
            {MORE.map((m, i) => {
              const dir = i % 4 === 0 ? "reveal-left" : i % 4 === 1 ? "reveal-top" : i % 4 === 2 ? "reveal-bottom" : "reveal-right";
              const Icon = MORE_META[i]?.icon || Building2;
              return (
                <div key={m.title || String(i)} className={cx("uc-reveal", dir, "uc-card uc-pop uc-contain")} data-tint={i % 2 === 0 ? "cyan" : "violet"}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="uc-ic flex-shrink-0" aria-hidden="true">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="text-white font-semibold break-words">{m.title}</div>
                  </div>
                  <div className="mt-4 uc-line" />
                  <p className="mt-4 text-white/70 leading-[1.75] break-words">{m.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="uc-section py-16 sm:py-20" aria-label={t("useCases.aria.finalCta")}>
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className={cx("uc-reveal reveal-bottom", "uc-card uc-pop uc-contain")} style={{ padding: 22 }} data-tint="cyan">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="max-w-[740px] min-w-0">
                <div className="text-white/70 text-[12px] tracking-[0.14em] uppercase">{t("useCases.final.pill")}</div>
                <div className="mt-2 text-white text-[24px] sm:text-[32px] font-semibold break-words">
                  {t("useCases.final.title.before")} <span className="uc-grad">{t("useCases.final.title.highlight")}</span>
                  {t("useCases.final.title.after")}
                </div>
                <p className="mt-3 text-white/70 leading-[1.75] break-words">{t("useCases.final.subtitle")}</p>
              </div>

              <div className="flex items-center gap-3">
                <Link to={toContact} className="uc-btn">
                  {ctaSchedule} <span aria-hidden="true">→</span>
                </Link>
                <Link to={toServices} className="uc-btn uc-btnGhost">
                  {ctaServices}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {reduced ? null : null}
    </main>
  );
}
