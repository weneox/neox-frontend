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

.uc-stack{ position: relative; isolation: isolate; overflow: clip; }

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

.uc-heroBG{ pointer-events:none; position:absolute; inset:0; opacity: 1; }
.uc-heroBG::before{
  content:"";
  position:absolute;
  inset:-10% -10%;
  background:
    radial-gradient(900px 520px at 50% 10%, rgba(47,184,255,.09), transparent 62%),
    radial-gradient(980px 560px at 20% 0%, rgba(42,125,255,.06), transparent 70%),
    radial-gradient(980px 560px at 80% 0%, rgba(170,225,255,.05), transparent 70%);
  opacity: .92;
}
.uc-heroBG::after{
  content:"";
  position:absolute;
  inset:0;
  background: radial-gradient(900px 520px at 50% 0%, rgba(0,0,0,.20), rgba(0,0,0,.92));
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

/* tiles */
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

/* Visual panel */
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
@media (max-width: 560px){
  .uc-hudInner{ min-height: 320px; }
}

/* =========================
   ✅ VIDEO PANEL — HOLO RIGHT EDGE
========================= */
.uc-video{
  position: relative;
  border-radius: 22px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(0,0,0,.22);
  transform: translate3d(0,0,0);
  overflow: visible;
}
.uc-videoInner{
  position: relative;
  min-height: 360px;
  display: grid;
  place-items: center;
  border-radius: 22px;
  overflow: hidden;
}
@media (max-width: 560px){
  .uc-videoInner{ min-height: 320px; }
}
.uc-videoEl{
  width: 100%;
  height: 100%;
  min-height: 360px;
  object-fit: cover;
  display: block;
  transform: translateZ(0);
}
@media (max-width: 560px){
  .uc-videoEl{ min-height: 320px; }
}
.uc-videoShade{
  pointer-events: none;
  position: absolute;
  inset: 0;
  background:
    radial-gradient(900px 520px at 50% 0%, rgba(0,0,0,.08), rgba(0,0,0,.70)),
    linear-gradient(180deg, rgba(0,0,0,.00), rgba(0,0,0,.52));
  opacity: .92;
}

/* holo protrusion */
.uc-video::after{
  content:"";
  position:absolute;
  top: 10px;
  bottom: 10px;
  right: -44px;
  width: 120px;
  border-radius: 26px;
  background:
    linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.015)),
    radial-gradient(120px 160px at 40% 30%, rgba(47,184,255,.18), transparent 60%),
    radial-gradient(120px 180px at 60% 80%, rgba(42,125,255,.14), transparent 62%);
  border: 1px solid rgba(255,255,255,.10);
  box-shadow:
    0 18px 70px rgba(0,0,0,.55),
    0 0 0 1px rgba(47,184,255,.10) inset,
    0 0 40px rgba(47,184,255,.08);
  backdrop-filter: blur(14px) saturate(1.15);
  -webkit-backdrop-filter: blur(14px) saturate(1.15);
  opacity: .95;
  pointer-events: none;
}
.uc-video::before{
  content:"";
  position:absolute;
  top: 0;
  bottom: 0;
  right: -90px;
  width: 220px;
  background: radial-gradient(180px 380px at 20% 50%, rgba(47,184,255,.14), transparent 62%);
  filter: blur(6px);
  opacity: .65;
  pointer-events: none;
}

@media (max-width: 560px){
  .uc-video{ overflow:hidden; }
  .uc-video::before, .uc-video::after{ display:none; }
}

/* LIVE dot only */
.uc-liveBadge{
  position: absolute;
  left: 14px;
  top: 14px;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(10,12,18,.52);
  backdrop-filter: blur(14px) saturate(1.2);
  -webkit-backdrop-filter: blur(14px) saturate(1.2);
  display: grid;
  place-items: center;
  pointer-events: none;
}
.uc-liveDot{
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: rgba(47,184,255,.98);
  box-shadow: 0 0 0 6px rgba(47,184,255,.14), 0 0 22px rgba(47,184,255,.30);
  animation: ucBreath 1.35s ease-in-out infinite;
  transform: translateZ(0);
}
@keyframes ucBreath{
  0%   { transform: scale(0.88); opacity: .72; box-shadow: 0 0 0 5px rgba(47,184,255,.12), 0 0 16px rgba(47,184,255,.22); }
  50%  { transform: scale(1.10); opacity: 1;    box-shadow: 0 0 0 8px rgba(47,184,255,.16), 0 0 30px rgba(47,184,255,.42); }
  100% { transform: scale(0.88); opacity: .72; box-shadow: 0 0 0 5px rgba(47,184,255,.12), 0 0 16px rgba(47,184,255,.22); }
}

/* Reveal */
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
  .uc-liveDot{ animation:none !important; }
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
`;

/* ---------- UI parts ---------- */
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
    <div className="uc-bullet flex items-start gap-2">
      <CheckCircle className="w-5 h-5 text-[rgba(170,225,255,.95)] flex-shrink-0 mt-0.5" />
      <span className="text-white/75 leading-[1.65] break-words">{text}</span>
    </div>
  );
});

export const ResultTile = memo(function ResultTile({ k, v, sub }: { k: string; v: string; sub: string }) {
  return (
    <div className="uc-tile uc-pop uc-contain">
      <div className="uc-tileK">{k}</div>
      <div className="uc-tileV mt-1">{v}</div>
      <div className="text-white/55 text-[12px] mt-2 leading-[1.5]">{sub}</div>
    </div>
  );
});

export const CreativeHUD = memo(function CreativeHUD({
  tint,
  icon: Icon,
  title,
  subtitle,
  hint,
}: {
  tint: Tint;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  hint: string;
}) {
  return (
    <div className="uc-hud uc-pop uc-contain" data-tint={tint} aria-label="Visual panel">
      <div className="uc-hudInner">
        <div className="text-center max-w-[520px]">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl border border-white/10 bg-white/[0.04] grid place-items-center">
            <Icon className="w-6 h-6 text-white/80" />
          </div>

          <div className="text-white text-[22px] sm:text-[26px] font-semibold">{title}</div>
          <div className="mt-2 text-white/65 leading-[1.7]">{subtitle}</div>

          <div className="mt-6 text-white/55 text-[12px] tracking-[.14em] uppercase">{hint}</div>
          <div className="mt-2 text-white/40 text-[12px]">(Burada sonra video qoyacağıq — sən linkləri göndərəndə mən HUD-u video ilə əvəz edəcəm.)</div>
        </div>
      </div>
    </div>
  );
});

// ✅ new prop: videoUrl
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

            <span className="text-[11px] px-3 py-1 rounded-full border border-white/10 bg-white/[0.04] tracking-[.08em] uppercase text-white/80">
              Case
            </span>
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
            <a href={toContact} className="uc-btn">
              {ctaPrimary} <span aria-hidden="true">→</span>
            </a>
            <a href={toServices} className="uc-btn uc-btnGhost">
              {ctaSecondary}
            </a>
          </div>
        </article>
      </div>

      {/* VISUAL */}
      <div className={cx("uc-reveal", flip ? "reveal-left lg:order-1" : "reveal-right")}>
        {videoUrl ? (
          <div className="uc-video uc-pop uc-contain" data-tint={c.tint} aria-label="Scenario video">
            <div className="uc-videoInner">
              <video className="uc-videoEl" src={videoUrl} autoPlay muted loop playsInline preload="metadata" />
              <div className="uc-videoShade" aria-hidden="true" />

              {/* ✅ only LIVE dot */}
              <div className="uc-liveBadge" aria-hidden="true">
                <span className="uc-liveDot" />
              </div>
            </div>
          </div>
        ) : (
          <CreativeHUD tint={c.tint} icon={Icon} title="Scenario Visual" subtitle="Bu paneli az sonra video ilə əvəz edəcəyik." hint="VIDEO PLACEHOLDER" />
        )}
      </div>
    </div>
  );
});
