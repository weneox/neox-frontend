// src/pages/usecases/_ucShared.tsx
import React, { memo, useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { CheckCircle } from "lucide-react";

export function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export const LANGS = ["az", "tr", "en", "ru", "es"] as const;
export type Lang = (typeof LANGS)[number];

export function getLangFromPath(pathname: string): Lang {
  const seg = (pathname || "/").split("/")[1] || "az";
  return (LANGS as readonly string[]).includes(seg) ? (seg as Lang) : "az";
}

export function withLang(path: string, lang: Lang) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `/${lang}${p}`;
}

export function usePrefersReducedMotion() {
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

export function useMedia(query: string, initial = false) {
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

/* Reveal: scoped + batched (FPS safe) */
export function useRevealScopedBatched(
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

/* SEO */
export function useSeo(opts: { title: string; description: string; canonicalPath: string; ogImage?: string }) {
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
export type Tint = "cyan" | "violet" | "pink" | "amber";

export type CaseItem = {
  icon: LucideIcon;
  sektor: string;
  basliq: string;
  hekayə: string;
  maddeler: string[];
  neticeler: Array<{ k: string; v: string; sub: string }>;
  tint: Tint;
};

export const UC_STYLES = `
html, body{
  background:#000 !important;
  margin:0;
  padding:0;
  width:100%;
  overflow-x: clip;
  overscroll-behavior-x: none;
}
#root{ width:100%; overflow-x: clip; }

.uc-page{
  background:#000 !important;
  color: rgba(255,255,255,.92);
  min-height: 100vh;
  width: 100%;
  overflow-x: clip;
  overscroll-behavior-x: none;
  word-break: break-word;
  overflow-wrap: anywhere;
  isolation: isolate;
  text-rendering: geometricPrecision;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
.uc-page *{ min-width:0; max-width:100%; }

.uc-page .uc-grad{
  background: linear-gradient(90deg,#fff 0%, rgba(170,225,255,.96) 34%, rgba(47,184,255,.95) 68%, rgba(42,125,255,.95) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.uc-contain{ contain: layout paint style; transform: translateZ(0); backface-visibility: hidden; }

/* hero enter */
.uc-enter{
  opacity: 0;
  transform: translate3d(0, 16px, 0);
  filter: blur(7px);
  transition: opacity .62s ease, transform .62s ease, filter .62s ease;
  transition-delay: var(--d, 0ms);
  will-change: opacity, transform, filter;
}
.uc-enter.uc-in{ opacity:1; transform: translate3d(0,0,0); filter: blur(0px); }

/* Reveal (FPS safe): transform+opacity only */
.uc-reveal{ opacity: 1; transform: none; }
.uc-page.uc-io .uc-reveal{
  opacity: 0;
  transform: translate3d(var(--rx, 0px), var(--ry, 14px), 0);
  transition: opacity .50s ease, transform .50s ease;
  will-change: transform, opacity;
}
.uc-page.uc-io .uc-reveal.is-in{ opacity: 1; transform: translate3d(0,0,0); }
.reveal-left{ --rx: -18px; --ry: 0px; }
.reveal-right{ --rx: 18px; --ry: 0px; }
.reveal-bottom{ --rx: 0px; --ry: 14px; }

/* ✅ drop/rise for media */
.reveal-drop{ --rx: 0px; --ry: -26px; }
.reveal-rise{ --rx: 0px; --ry: 26px; }

/* ===== Canva-like HERO GRID (left text + right tall media) ===== */
.uc-canva{
  display:grid;
  grid-template-columns: minmax(320px, 520px) 1fr;
  gap: 26px;
  align-items: start;
}
@media (max-width: 980px){
  .uc-canva{ grid-template-columns: 1fr; }
}

.uc-canvaLeft{ padding-top: 10px; }

.uc-canvaTitle{
  font-size: clamp(40px, 4.4vw, 64px);
  line-height: 1.05;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.uc-canvaSub{
  margin-top: 14px;
  color: rgba(255,255,255,.70);
  font-size: 16px;
  line-height: 1.7;
  max-width: 46ch;
}

.uc-canvaList{
  margin-top: 18px;
  display: grid;
  gap: 12px;
  max-width: 52ch;
}

.uc-canvaCtas{
  margin-top: 22px;
  display:flex;
  flex-wrap: wrap;
  gap: 10px;
}

.uc-canvaMedia{
  position: relative;
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: start;
}
@media (max-width: 980px){
  .uc-canvaMedia{ grid-template-columns: 1fr; }
}

/* tall cards like Canva */
.uc-mediaCard{
  position: relative;
  border-radius: 22px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.04);
  overflow: hidden;
  height: clamp(360px, 55vh, 620px);
  transform: translateZ(0);
  will-change: transform, opacity;
}
@media (max-width: 560px){
  .uc-mediaCard{ height: clamp(420px, 62vh, 680px); }
}

/* ✅ make video crisp + FPS friendly */
.uc-mediaVideo{
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transform: translateZ(0);
}

.uc-canvaBar{
  grid-column: 1 / -1;
  margin-top: 16px;
  height: 92px;
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,.08);
  background: linear-gradient(180deg, rgba(42,125,255,.64), rgba(42,125,255,.30));
  box-shadow: 0 18px 60px rgba(0,0,0,.55);
}

/* breadcrumb */
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

/* buttons */
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
.uc-btnGhost{
  border-color: rgba(255,255,255,.14);
  background: rgba(255,255,255,.03);
  box-shadow: 0 10px 26px rgba(0,0,0,.55);
}
.uc-btnGhost:hover{
  border-color: rgba(47,184,255,.26);
  box-shadow: 0 14px 34px rgba(0,0,0,.62);
}

@media (prefers-reduced-motion: reduce){
  .uc-enter{ opacity:1 !important; transform:none !important; filter:none !important; transition:none !important; }
  .uc-page.uc-io .uc-reveal{ opacity:1; transform:none; transition:none; }
}
`;

export const BreadcrumbPill = memo(function BreadcrumbPill({
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

export const Bullet = memo(function Bullet({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle className="w-5 h-5 text-[rgba(170,225,255,.95)] flex-shrink-0 mt-0.5" />
      <span className="text-white/75 leading-[1.65] break-words">{text}</span>
    </div>
  );
});

/* ✅ keep CaseRow exported so Cloudflare build does not fail */
export const CaseRow = memo(function CaseRow({
  c,
  flip,
  tRealScenario,
  toContact,
  toServices,
  ctaPrimary,
  ctaSecondary,
  videoUrl,
}: {
  c: CaseItem;
  flip: boolean;
  tRealScenario: string;
  toContact: string;
  toServices: string;
  ctaPrimary: string;
  ctaSecondary: string;
  videoUrl?: string;
}) {
  const Icon = c.icon;

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:items-center" data-tint={c.tint}>
      <div className={cx("uc-reveal", flip ? "reveal-right lg:order-2" : "reveal-left")}>
        <div className="p-5 rounded-[22px] border border-white/10 bg-white/[0.03]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] border border-white/10 bg-white/[0.04] grid place-items-center">
              <Icon className="w-5 h-5 text-white/85" />
            </div>
            <div className="min-w-0">
              <div className="text-white font-semibold">{c.sektor}</div>
              <div className="text-white/55 text-[13px]">{tRealScenario}</div>
            </div>
          </div>

          <div className="h-px my-4 bg-white/10" />

          <div className="text-white text-[20px] sm:text-[22px] font-semibold">{c.basliq}</div>
          <div className="mt-2 text-white/70 leading-[1.7]">{c.hekayə}</div>

          <div className="mt-4 grid gap-3">
            {c.maddeler.map((m) => (
              <Bullet key={m} text={m} />
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-10">
            <a href={toContact} className="uc-btn">
              {ctaPrimary} <span aria-hidden="true">→</span>
            </a>
            <a href={toServices} className="uc-btn uc-btnGhost">
              {ctaSecondary}
            </a>
          </div>
        </div>
      </div>

      <div className={cx("uc-reveal", flip ? "reveal-left lg:order-1" : "reveal-right")}>
        <div className="rounded-[22px] border border-white/10 bg-white/[0.04] overflow-hidden h-[420px] sm:h-[520px]">
          {videoUrl ? (
            <video
              src={videoUrl}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <div className="w-full h-full grid place-items-center text-white/55 text-[12px] tracking-[.18em] uppercase">
              VISUAL PLACEHOLDER
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
