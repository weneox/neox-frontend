// src/pages/Blog.tsx
import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { Calendar, User, ArrowRight, Clock, Search, Filter } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

type ApiPost = {
  id?: string | number;
  slug?: string;
  title?: string;
  excerpt?: string;
  author?: string;
  date?: string; // ISO
  read_time?: string;
  category?: string;
  image_url?: string;
  coverUrl?: string;
  cover_url?: string;
  published_at?: string;
  publishedAt?: string;
  createdAt?: string;
};

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  date: string; // ISO string
  read_time: string;
  category: string;
  image_url: string;
}

/* ---------------- helpers ---------------- */
function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

// App.tsx-dəki dillərin prefixi
const LANGS = ["az", "tr", "en", "ru", "es"] as const;
type Lang = (typeof LANGS)[number];

function getLangFromPath(pathname: string): Lang {
  const seg = (pathname.split("/")[1] || "").toLowerCase();
  return (LANGS as readonly string[]).includes(seg) ? (seg as Lang) : "en";
}
function withLang(lang: Lang, path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `/${lang}${p}`;
}

// tarix label-i dili görə
function safeDateLabel(d: string, lang: Lang) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;

  const map: Record<Lang, string> = {
    az: "az-AZ",
    tr: "tr-TR",
    en: "en-US",
    ru: "ru-RU",
    es: "es-ES",
  };

  return dt.toLocaleDateString(map[lang], { year: "numeric", month: "short", day: "2-digit" });
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

/* ---------------- Media ---------------- */
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

/**
 * Reveal (BATCH 3-3) — FPS FRIENDLY:
 * - yalnız container daxilində axtarır
 * - default görünür (IO aktivdirsə gizlənib reveal olur) => “yox olur” bug yoxdur
 * - filter/search dəyişəndə yenidən qurulur
 */
function useRevealWithinBatched(
  containerRef: React.RefObject<HTMLElement>,
  deps: any[] = [],
  opts?: { rootMargin?: string; batchSize?: number; batchDelayMs?: number }
) {
  const { rootMargin = "0px 0px -16% 0px", batchSize = 3, batchDelayMs = 90 } = opts || {};

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    root.classList.add("bl-io");

    const els = Array.from(root.querySelectorAll<HTMLElement>(".bl-reveal"));
    if (!els.length) return;

    const show = (el: HTMLElement) => el.classList.add("is-in");

    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (prefersReduced || typeof IntersectionObserver === "undefined") {
      els.forEach(show);
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
          show(el);
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
      els.forEach(show);
      io.disconnect();
    }, 2000);

    return () => {
      window.clearTimeout(fallback);
      if (timer) window.clearTimeout(timer);
      io.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, rootMargin, ...deps]);
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

function SkeletonCard() {
  return (
    <div className="bl-card bl-pop bl-contain">
      <div className="h-[168px] rounded-2xl border border-white/10 bg-white/[0.04] animate-pulse" />
      <div className="mt-4 h-4 w-1/2 rounded bg-white/[0.06] animate-pulse" />
      <div className="mt-3 h-5 w-5/6 rounded bg-white/[0.06] animate-pulse" />
      <div className="mt-2 h-5 w-4/6 rounded bg-white/[0.06] animate-pulse" />
      <div className="mt-5 h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] animate-pulse" />
    </div>
  );
}

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
    <div className={cx("bl-crumb bl-enter", enter && "bl-in")} style={{ ["--d" as any]: `${delayMs}ms` }}>
      <span className="bl-crumbDot" aria-hidden="true" />
      <span className="bl-crumbText">{text}</span>
    </div>
  );
});

function normalizePosts(rows: any[], fallbackLang: Lang): BlogPost[] {
  const out: BlogPost[] = [];
  for (const r of rows || []) {
    const a = (r || {}) as ApiPost;
    const title = String(a.title || "").trim();
    const slug = String(a.slug || "").trim();
    if (!title || !slug) continue;

    const date =
      a.published_at ||
      a.publishedAt ||
      a.date ||
      a.createdAt ||
      new Date().toISOString();

    const cover = a.coverUrl || a.cover_url || a.image_url || "";

    out.push({
      id: String(a.id ?? slug),
      slug,
      title,
      excerpt: String(a.excerpt || ""),
      author: String(a.author || "NEOX"),
      date: String(date),
      read_time: String(a.read_time || "5 dəq"),
      category: String(a.category || "General"),
      image_url: String(cover || ""),
    });
  }
  return out;
}

export default function Blog() {
  const { t } = useTranslation();
  const location = useLocation();
  const lang = getLangFromPath(location.pathname);

  const pageRef = useRef<HTMLElement | null>(null);
  const reduced = usePrefersReducedMotion();
  const isMobile = useMedia("(max-width: 560px)", false);

  const API_BASE_RAW = (import.meta as any)?.env?.VITE_API_BASE || "";
  const API_BASE = String(API_BASE_RAW || "").replace(/\/+$/, "");

  // page enter (hero top->down)
  const [enter, setEnter] = useState(false);
  useEffect(() => {
    const tt = window.setTimeout(() => setEnter(true), 220);
    return () => window.clearTimeout(tt);
  }, []);
  const d = (ms: number) => ({ ["--d" as any]: `${isMobile ? Math.round(ms * 0.7) : ms}ms` });

  // SEO (lang-aware)
  useSeo({
    title: t("blog.seo.title"),
    description: t("blog.seo.description"),
    canonicalPath: withLang(lang, "/blog"),
  });

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>(t("blog.filters.all"));

  // cat dili dəyişəndə “Hamısı” label-i də düzgün otursun
  useEffect(() => {
    setCat((prev) => (prev === t("blog.filters.all", { lng: "az" }) ? t("blog.filters.all") : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const fetchPosts = async () => {
    try {
      setLoading(true);

      // backend yoxdursa sample göstər
      if (!API_BASE) {
        setPosts([]);
        return;
      }

      const res = await fetch(`${API_BASE}/api/posts?lang=${encodeURIComponent(lang)}`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const j = await res.json();
      const rows = Array.isArray(j) ? j : (j?.posts || j?.data || []);
      const norm = normalizePosts(rows, lang);

      setPosts(norm);
    } catch (err) {
      console.error("Postları gətirərkən xəta:", err);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  // Sample posts (AZ-only content) — UI tərcümə olacaq, post kontenti yox
  const samplePosts: BlogPost[] = [
    {
      id: "ai-automation-trends-2024",
      slug: "ai-automation-trends-2024",
      title: "AI Avtomatlaşdırmanın Gələcəyi: 2024 Trendləri",
      excerpt: "AI avtomatlaşdırma sahəsində əsas trendlər və onların biznesə təsiri: real nümunələr və tətbiq yolları.",
      author: "Dr. Alexandra Chen",
      date: "2024-01-15",
      read_time: "5 dəq",
      category: "Sənaye İcmalı",
      image_url: "https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=1200",
    },
    {
      id: "ai-agents-support-5-ways",
      slug: "ai-agents-support-5-ways",
      title: "AI Agentlər Support-u Necə Dəyişir? 5 Praktik Yol",
      excerpt: "Agent axınlarını düzgün qurmaqla müştəri təcrübəsini artır və support xərclərini azalt.",
      author: "Marcus Johnson",
      date: "2024-01-10",
      read_time: "7 dəq",
      category: "Praktik Tövsiyə",
      image_url: "https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=1200",
    },
    {
      id: "retailco-2m-savings-case-study",
      slug: "retailco-2m-savings-case-study",
      title: "Case Study: RetailCo AI ilə $2M Qənaət Etdi",
      excerpt: "Bir e-commerce şirkətinin NEOX ilə proseslərini necə sistemləşdirib ölçülə bilən nəticə aldığını gör.",
      author: "Sarah Williams",
      date: "2024-01-05",
      read_time: "10 dəq",
      category: "Case Study",
      image_url: "https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1200",
    },
  ];

  const displayPosts = posts.length ? posts : samplePosts;

  // categories: "Hamısı" + uniq
  const categories = useMemo(() => {
    const s = new Set<string>();
    displayPosts.forEach((p) => s.add(p.category || t("blog.filters.general")));
    return [t("blog.filters.all"), ...Array.from(s)];
  }, [displayPosts, t]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    return displayPosts.filter((p) => {
      const c = p.category || t("blog.filters.general");

      const inCat = cat === t("blog.filters.all") ? true : c === cat;
      if (!inCat) return false;

      if (!qq) return true;
      const hay = `${p.title} ${p.excerpt} ${p.author} ${c}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [displayPosts, q, cat, t]);

  useRevealWithinBatched(pageRef as any, [loading, filtered.length, cat, q], {
    batchSize: 3,
    batchDelayMs: 90,
    rootMargin: "0px 0px -18% 0px",
  });

  return (
    <main ref={pageRef} className="bl-page">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            {
              "@context": "https://schema.org",
              "@type": "WebPage",
              name: t("blog.ld.name"),
              description: t("blog.ld.description"),
              inLanguage: lang,
            },
            null,
            0
          ),
        }}
      />

      <style>{`
        /* ✅ ROOT-LEVEL FIX (kökdən) — sağda ağ zolaq / horizontal scroll OFF */
        html, body{
          background:#000 !important;
          margin:0;
          padding:0;
          width:100%;
          overflow-x: clip;
        }
        #root{
          width:100%;
          overflow-x: clip;
        }

        .bl-page{
          background:#000 !important;
          color: rgba(255,255,255,.92);
          min-height: 100vh;
          width: 100%;
          overflow-x: clip; /* ✅ hidden yox, clip */
          word-break: break-word;
          overflow-wrap: anywhere;
          isolation: isolate;
          text-rendering: geometricPrecision;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .bl-page *{ min-width:0; max-width:100%; }

        /* ✅ hover scale grid-də daşmanı konteyner səviyyəsində kəs */
        .bl-stack{ position: relative; isolation: isolate; overflow: clip; }

        /* NEOX palette */
        .bl-page .bl-gradient{
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

        /* ---------- Enter (hero top->down) ---------- */
        .bl-enter{
          opacity: 0;
          transform: translate3d(0,16px,0);
          filter: blur(7px);
          transition: opacity .62s ease, transform .62s ease, filter .62s ease;
          transition-delay: var(--d, 0ms);
          will-change: opacity, transform, filter;
        }
        .bl-enter.bl-in{
          opacity: 1;
          transform: translate3d(0,0,0);
          filter: blur(0px);
        }

        /* ---------- Breadcrumb pill ---------- */
        .bl-crumb{
          display:inline-flex;
          align-items:center;
          gap:10px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          padding: 10px 14px;
          border-radius: 999px;
        }
        .bl-crumbDot{
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: rgba(47,184,255,1);
          box-shadow:
            0 0 0 4px rgba(47,184,255,.14),
            0 0 18px rgba(47,184,255,.42);
          flex: 0 0 auto;
        }
        .bl-crumbText{
          font-size: 12px;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: rgba(255,255,255,.70);
          white-space: nowrap;
        }

        /* ---------- Reveal ---------- */
        .bl-reveal{ opacity: 1; transform: none; }
        .bl-page.bl-io .bl-reveal{
          opacity: 0;
          transform: translate3d(var(--rx, 0px), var(--ry, 16px), 0);
          transition: opacity .45s ease, transform .45s ease;
          will-change: transform, opacity;
        }
        .bl-page.bl-io .bl-reveal.is-in{ opacity: 1; transform: translate3d(0,0,0); }
        .bl-reveal-left{ --rx: -18px; --ry: 0px; }
        .bl-reveal-right{ --rx: 18px; --ry: 0px; }
        .bl-reveal-top{ --rx: 0px; --ry: 14px; }
        .bl-reveal-bottom{ --rx: 0px; --ry: -14px; }

        /* ---------- Perf contain ---------- */
        .bl-contain{
          contain: layout paint style;
          transform: translateZ(0);
          backface-visibility: hidden;
        }

        /* ---------- Hero ---------- */
        .bl-hero{ position: relative; padding: 22px 0 0; overflow: hidden; }
        .bl-heroInner{
          min-height: clamp(520px, 78vh, 860px);
          display: grid;
          place-items: center;
          padding: 64px 0 26px;
        }
        @media (max-width: 560px){
          .bl-heroInner{
            min-height: auto;
            padding-top: 84px;
            padding-bottom: 18px;
          }
        }

        /* lightweight bg (no heavy blur) */
        .bl-heroBG{
          pointer-events:none;
          position:absolute;
          inset:0;
          opacity: 1;
        }
        .bl-heroBG::before{
          content:"";
          position:absolute;
          inset:-10% -10%;
          background:
            radial-gradient(900px 520px at 50% 10%, rgba(47,184,255,.09), transparent 62%),
            radial-gradient(980px 560px at 20% 0%, rgba(42,125,255,.06), transparent 70%),
            radial-gradient(980px 560px at 80% 0%, rgba(170,225,255,.05), transparent 70%);
          opacity: .92;
        }
        .bl-heroBG::after{
          content:"";
          position:absolute;
          inset:0;
          background: radial-gradient(900px 520px at 50% 0%, rgba(0,0,0,.20), rgba(0,0,0,.92));
        }

        .bl-divider{
          height: 1px;
          width: 100%;
          max-width: 920px;
          margin: 42px auto 0;
          background: linear-gradient(90deg, transparent, rgba(47,184,255,.22), rgba(255,255,255,.08), rgba(42,125,255,.18), transparent);
          opacity: .95;
        }
        .bl-spacer{ height: 34px; }

        /* ---------- Panels ---------- */
        .bl-panel{
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.03);
          box-shadow: 0 14px 52px rgba(0,0,0,.60);
          position: relative;
          overflow: hidden;
        }
        /* subtle aura (no blur) */
        .bl-panel::before{
          content:"";
          position:absolute;
          inset:-30% -40%;
          pointer-events:none;
          opacity: .18;
          background:
            radial-gradient(520px 220px at 20% 0%, rgba(47,184,255,.18), transparent 62%),
            radial-gradient(520px 220px at 85% 0%, rgba(42,125,255,.12), transparent 64%);
          transform: translate3d(0,0,0);
          transition: opacity .22s ease;
        }
        .bl-panel:hover::before{ opacity: .30; }

        /* ---------- Pop ---------- */
        .bl-pop{
          position: relative;
          z-index: 1;
          transform: translate3d(0,0,0) scale(1);
          transition: transform .20s ease, border-color .20s ease, box-shadow .20s ease;
          will-change: transform;
        }
        .bl-pop:hover,
        .bl-pop:focus-within{
          z-index: 60;
          transform: translate3d(0,-10px,0) scale(1.03);
        }

        /* ---------- Card (ELITE) ---------- */
        .bl-card{
          position: relative;
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,.10);
          background: linear-gradient(180deg, rgba(255,255,255,.032), rgba(255,255,255,.018));
          box-shadow: 0 16px 56px rgba(0,0,0,.62);
          padding: 16px;
          overflow: hidden;
        }

        /* specular sweep layer */
        .bl-card::before{
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
            radial-gradient(520px 240px at 80% 12%, rgba(47,184,255,.10), transparent 62%),
            linear-gradient(90deg, transparent, rgba(255,255,255,.05), transparent);
          mix-blend-mode: screen;
        }
        .bl-pop:hover.bl-card::before,
        .bl-pop:focus-within.bl-card::before{
          opacity: 1;
          transform: translate3d(0,0,0);
        }

        /* border glow */
        .bl-card::after{
          content:"";
          position:absolute;
          inset:0;
          border-radius: 22px;
          pointer-events:none;
          opacity: 0;
          transition: opacity .22s ease;
          box-shadow:
            0 0 0 1px rgba(255,255,255,.08) inset,
            0 0 24px rgba(47,184,255,.08);
        }
        .bl-pop:hover.bl-card::after,
        .bl-pop:focus-within.bl-card::after{
          opacity: 1;
        }

        /* image wrap */
        .bl-imgWrap{
          position: relative;
          overflow: hidden;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.03);
        }
        .bl-imgWrap::before{
          content:"";
          position:absolute; inset:0;
          background:
            radial-gradient(700px 420px at 60% 0%, rgba(255,255,255,.05), transparent 62%),
            radial-gradient(700px 420px at 20% 0%, rgba(47,184,255,.08), transparent 70%),
            linear-gradient(180deg, rgba(0,0,0,.05), rgba(0,0,0,.62));
          pointer-events:none;
          opacity: .95;
        }
        .bl-imgWrap::after{
          content:"";
          position:absolute; inset:0;
          box-shadow: inset 0 -90px 90px rgba(0,0,0,.55);
          pointer-events:none;
          opacity:.95;
        }

        /* chips */
        .bl-chip{
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding: 7px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(0,0,0,.28);
          color: rgba(255,255,255,.86);
          font-size: 12px;
          max-width: 100%;
          position: relative;
          overflow: hidden;
        }
        .bl-chip::before{
          content:"";
          position:absolute;
          inset:-30% -40%;
          opacity: .0;
          transition: opacity .20s ease;
          background: radial-gradient(260px 120px at 30% 20%, rgba(255,255,255,.10), transparent 70%);
          pointer-events:none;
        }
        .group:hover .bl-chip::before{ opacity: .55; }

        .bl-chip--soft{
          border-color: rgba(47,184,255,.22);
          background: rgba(47,184,255,.10);
        }

        /* buttons */
        .bl-btn{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:10px;
          width:100%;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.03);
          color: rgba(255,255,255,.90);
          text-decoration:none;
          transition: transform .18s ease, border-color .18s ease, background .18s ease, box-shadow .18s ease;
          will-change: transform;
          position: relative;
          overflow: hidden;
        }
        .bl-btn::before{
          content:"";
          position:absolute;
          inset:-40% -40%;
          opacity: 0;
          transform: translate3d(-12px,0,0);
          transition: opacity .22s ease, transform .22s ease;
          background:
            radial-gradient(420px 180px at 20% 0%, rgba(255,255,255,.10), transparent 70%),
            radial-gradient(420px 180px at 80% 0%, rgba(47,184,255,.10), transparent 70%);
          pointer-events:none;
        }
        .bl-btn:hover::before{
          opacity: 1;
          transform: translate3d(0,0,0);
        }

        .bl-btn:hover{
          transform: translate3d(0,-2px,0);
          border-color: rgba(47,184,255,.24);
          background: rgba(255,255,255,.045);
          box-shadow: 0 18px 60px rgba(0,0,0,.55);
        }
        .bl-btn--primary{
          border-color: rgba(47,184,255,.24);
          background: linear-gradient(180deg, rgba(47,184,255,.16), rgba(42,125,255,.10));
        }
        .bl-btn--primary:hover{
          border-color: rgba(47,184,255,.38);
          box-shadow: 0 20px 70px rgba(0,0,0,.70);
        }

        /* ONLY transform hover for images (fps) */
        .bl-img{
          transform: translate3d(0,0,0) scale(1);
          transition: transform .55s ease;
          will-change: transform;
        }
        .group:hover .bl-img{ transform: translate3d(0,-2px,0) scale(1.045); }

        /* select option color fix */
        .bl-select option{ color: #0b1020; }

        @media (prefers-reduced-motion: reduce){
          .bl-enter{ opacity:1 !important; transform:none !important; filter:none !important; transition:none !important; }
          .bl-page.bl-io .bl-reveal{ opacity:1 !important; transform:none !important; transition:none !important; }
          .bl-pop{ transform:none !important; transition:none !important; }
          .bl-card::before, .bl-card::after{ transition:none !important; opacity: 0 !important; }
          .bl-btn{ transition:none !important; }
          .bl-btn::before{ display:none !important; }
          .bl-img{ transition:none !important; transform:none !important; }
        }
        @media (hover: none){
          .bl-pop:hover{ transform:none !important; }
          .bl-btn:hover{ transform:none !important; }
          .group:hover .bl-img{ transform:none !important; }
        }
      `}</style>

      {/* HERO */}
      <section className="bl-hero" aria-label={t("blog.aria.hero")}>
        <div className="bl-heroBG" aria-hidden="true" />
        <div className="bl-heroInner">
          <div className="relative z-[1] mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 w-full">
            <div className="mx-auto max-w-[980px] text-center">
              <div className="flex justify-center">
                <BreadcrumbPill text={t("blog.hero.crumb")} enter={enter} delayMs={0} />
              </div>

              <h1 className={cx("mt-6 text-white break-words bl-enter", enter && "bl-in")} style={d(90)}>
                <span className="block text-[40px] leading-[1.05] sm:text-[60px] font-semibold">
                  {t("blog.hero.title.before")} <span className="bl-gradient">{t("blog.hero.title.highlight")}</span>
                </span>
              </h1>

              <p
                className={cx("mt-5 text-[16px] sm:text-[18px] leading-[1.7] text-white/70 break-words bl-enter", enter && "bl-in")}
                style={d(180)}
              >
                {t("blog.hero.subtitle")}
              </p>

              {/* Search + filter */}
              <div
                className={cx(
                  "mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 bl-enter",
                  enter && "bl-in"
                )}
                style={d(270)}
              >
                <div className="bl-panel bl-contain flex items-center gap-2 w-full sm:w-[420px]" style={{ padding: "12px 14px" }}>
                  <Search className="w-5 h-5 text-white/50 flex-shrink-0" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={t("blog.filters.searchPlaceholder")}
                    className="w-full bg-transparent outline-none text-white/85 placeholder:text-white/40"
                    aria-label={t("blog.filters.searchAria")}
                  />
                </div>

                <div className="bl-panel bl-contain flex items-center gap-2 w-full sm:w-[260px]" style={{ padding: "12px 14px" }}>
                  <Filter className="w-5 h-5 text-white/50 flex-shrink-0" />
                  <select
                    value={cat}
                    onChange={(e) => setCat(e.target.value)}
                    className="bl-select w-full bg-transparent outline-none text-white/85"
                    aria-label={t("blog.filters.categoryAria")}
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bl-divider" />
            </div>
          </div>
        </div>

        <div className="bl-spacer" />
      </section>

      {/* POSTS */}
      <section className="py-16 sm:py-20" aria-label={t("blog.aria.posts")}>
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 bl-stack">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : filtered.length ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 bl-stack">
              {filtered.map((post, idx) => {
                const dir = idx % 3 === 0 ? "bl-reveal-left" : idx % 3 === 1 ? "bl-reveal-bottom" : "bl-reveal-right";
                const catLabel = post.category || t("blog.filters.general");

                const coverSrc =
                  post.image_url ||
                  "https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=1200";

                return (
                  <article key={post.id} className={cx("bl-reveal", dir, "bl-card bl-pop bl-contain group")} aria-label={post.title}>
                    <div className="bl-imgWrap bl-contain">
                      <img
                        src={coverSrc}
                        alt={post.title}
                        loading="lazy"
                        decoding="async"
                        className="bl-img h-[168px] w-full object-cover opacity-[0.92]"
                      />
                      <div className="absolute left-3 top-3 flex items-center gap-2 flex-wrap max-w-[calc(100%-24px)]">
                        <span className="bl-chip bl-chip--soft truncate max-w-[200px]">{catLabel}</span>
                        <span className="bl-chip">
                          <Clock className="w-4 h-4" />
                          {post.read_time}
                        </span>
                      </div>
                    </div>

                    <h3 className="mt-4 text-white text-[18px] sm:text-[20px] font-semibold leading-[1.25] break-words">
                      {post.title}
                    </h3>

                    <p className="mt-3 text-white/70 leading-[1.7] break-words">{post.excerpt}</p>

                    <div className="mt-5 flex items-center justify-between gap-3 text-white/55 text-[13px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <User className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate max-w-[180px]">{post.author}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Calendar className="w-4 h-4" />
                        <span>{safeDateLabel(post.date, lang)}</span>
                      </div>
                    </div>

                    <div className="mt-5">
                      <Link
                        to={withLang(lang, `/blog/${post.slug}`)}
                        className="bl-btn bl-btn--primary"
                        aria-label={t("blog.actions.readAria")}
                      >
                        {t("blog.actions.read")} <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="bl-panel bl-contain text-center bl-reveal bl-reveal-bottom" style={{ padding: 18 }}>
              <div className="text-white font-semibold text-[18px]">{t("blog.empty.title")}</div>
              <div className="mt-2 text-white/70">{t("blog.empty.subtitle")}</div>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <button className="bl-btn" onClick={() => setQ("")} type="button" style={{ width: "auto", paddingInline: 16 }}>
                  {t("blog.empty.clearSearch")}
                </button>
                <button
                  className="bl-btn"
                  onClick={() => setCat(t("blog.filters.all"))}
                  type="button"
                  style={{ width: "auto", paddingInline: 16 }}
                >
                  {t("blog.empty.resetFilter")}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="py-16 sm:py-20" aria-label={t("blog.aria.newsletter")}>
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div
            className="bl-reveal bl-reveal-bottom bl-panel bl-pop bl-contain"
            style={{ padding: 18, display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}
          >
            <div className="max-w-[740px] min-w-0">
              <div className="text-white/70 text-[12px] tracking-[0.14em] uppercase">{t("blog.newsletter.pill")}</div>
              <div className="mt-2 text-white text-[24px] sm:text-[30px] font-semibold break-words">
                {t("blog.newsletter.title.before")} <span className="bl-gradient">{t("blog.newsletter.title.highlight")}</span>.
              </div>
              <p className="mt-3 text-white/70 leading-[1.75] break-words">{t("blog.newsletter.subtitle")}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <input
                type="email"
                placeholder={t("blog.newsletter.emailPlaceholder")}
                className="bl-panel bl-contain w-full sm:w-[320px] text-white/85 placeholder:text-white/40 outline-none"
                style={{ padding: "14px 14px", boxShadow: "none" }}
                aria-label={t("blog.newsletter.emailAria")}
              />
              <button className="bl-btn bl-btn--primary" type="button" style={{ width: "auto", paddingInline: 18 }}>
                {t("blog.newsletter.button")}
              </button>
            </div>
          </div>
        </div>
      </section>

      {reduced ? null : null}
    </main>
  );
}
