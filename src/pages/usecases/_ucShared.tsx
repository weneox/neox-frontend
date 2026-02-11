// src/pages/usecases/_ucShared.tsx
import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { CheckCircle } from "lucide-react";

/* tiny helper */
export function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

/* langs */
export const LANGS = ["az", "tr", "en", "ru", "es"] as const;
export type Lang = (typeof LANGS)[number];

export function getLangFromPath(pathname: string): Lang {
  const seg = (pathname || "/").split("/")[1] || "az";
  return (LANGS as readonly string[]).includes(seg as any) ? (seg as Lang) : "az";
}

export function withLang(path: string, lang: Lang) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `/${lang}${p}`;
}

/* motion pref */
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

/* media query */
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

/* ---------------- styles ---------------- */
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

/* hero enter (only for hero) */
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

.uc-ic{
  width: 40px; height: 40px; border-radius: 14px;
  display: grid; place-items: center;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.03);
  box-shadow: 0 12px 36px rgba(0,0,0,.45);
  transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
}

/* Reveal (FPS safe): only transform+opacity */
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
.reveal-bottom{ --rx: 0px; --ry: 14px; }

/* ===== NEW: Canva-like about section ===== */
.uc-aboutGrid{
  display:grid;
  grid-template-columns: 1.05fr .95fr;
  gap: 24px;
  align-items: start;
}
@media (max-width: 960px){
  .uc-aboutGrid{ grid-template-columns: 1fr; }
}

.uc-aboutText{
  border: 1px solid rgba(255,255,255,.10);
  background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.015));
  border-radius: 22px;
  padding: 22px;
}

.uc-aboutTitle{
  font-size: 34px;
  line-height: 1.05;
  font-weight: 800;
  letter-spacing: .02em;
}

.uc-aboutList{
  margin-top: 16px;
  display:grid;
  gap: 12px;
}

.uc-imgWrap{
  position: relative;
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  align-items: start;
}
@media (max-width: 960px){
  .uc-imgWrap{ grid-template-columns: 1fr; }
}

.uc-imgCard{
  position: relative;
  border-radius: 22px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.04);
  overflow: hidden;
  min-height: 280px;
  transform: translateZ(0);
  will-change: transform, opacity;
}

.uc-imgPh{
  position:absolute;
  inset:0;
  display:grid;
  place-items:center;
  color: rgba(255,255,255,.55);
  font-size: 13px;
  letter-spacing:.14em;
  text-transform: uppercase;
  background:
    radial-gradient(600px 300px at 50% 0%, rgba(47,184,255,.10), transparent 60%),
    linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.00));
}

/* soldakı yuxarıdan düşür, sağdakı aşağıdan qalxır */
.reveal-drop{ --rx: 0px; --ry: -22px; }
.reveal-rise{ --rx: 0px; --ry: 22px; }

/* Canva-like bottom bar */
.uc-barWrap{
  grid-column: 1 / -1;
}
.uc-bar{
  height: 78px;
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,.08);
  background: linear-gradient(180deg, rgba(42,125,255,.55), rgba(42,125,255,.35));
  box-shadow: 0 18px 60px rgba(0,0,0,.55);
}

/* ====== NEW: healthcare-style hero (text + media) ====== */
.uc-hHero{
  position: relative;
  padding: 110px 0 28px;
  overflow: hidden;
}
@media (max-width: 560px){
  .uc-hHero{ padding-top: 92px; }
}

.uc-hHeroBG{ pointer-events:none; position:absolute; inset:0; opacity: 1; }
.uc-hHeroBG::before{
  content:"";
  position:absolute;
  inset:-12% -12%;
  background:
    radial-gradient(900px 520px at 30% 0%, rgba(47,184,255,.10), transparent 64%),
    radial-gradient(900px 520px at 70% 0%, rgba(42,125,255,.08), transparent 66%),
    radial-gradient(1100px 600px at 50% 10%, rgba(170,225,255,.06), transparent 70%);
  opacity: .95;
}
.uc-hHeroBG::after{
  content:"";
  position:absolute;
  inset:0;
  background: radial-gradient(900px 520px at 50% 0%, rgba(0,0,0,.22), rgba(0,0,0,.92));
}

.uc-hGrid{
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: 1fr 1.25fr;
  gap: 34px;
  align-items: start;
}
@media (max-width: 960px){
  .uc-hGrid{ grid-template-columns: 1fr; gap: 22px; }
}

.uc-hLeft{
  max-width: 620px;
}

.uc-hBullets{
  margin-top: 18px;
  display: grid;
  gap: 12px;
}
.uc-hBullet{
  display:flex;
  align-items:flex-start;
  gap: 10px;
  color: rgba(255,255,255,.75);
  line-height: 1.65;
}
.uc-hBulletIcon{
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  margin-top: 4px;
  color: rgba(170,225,255,.95);
}

.uc-hCTA{
  margin-top: 22px;
  display:flex;
  gap: 10px;
  flex-wrap: wrap;
}

/* media cards */
.uc-mediaCard{
  border-radius: 22px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.04);
  overflow: hidden;
  box-shadow: 0 20px 70px rgba(0,0,0,.55);
}
.uc-mediaInner{
  position: relative;
  width: 100%;
  height: clamp(380px, 46vh, 560px);
  overflow: hidden;
  transform: translateZ(0);
}
@media (max-width: 560px){
  .uc-mediaInner{ height: clamp(300px, 38vh, 520px); }
}

.uc-mediaVideo{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  object-fit: cover;
  transform: translateZ(0);
}
.uc-mediaShade{
  position:absolute;
  inset:0;
  background: radial-gradient(900px 520px at 50% 10%, rgba(47,184,255,.10), transparent 62%),
              linear-gradient(180deg, rgba(0,0,0,.06), rgba(0,0,0,.35));
  pointer-events:none;
}

/* two media grid (healthcare) */
.uc-hMediaGrid{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}
@media (max-width: 560px){
  .uc-hMediaGrid{ grid-template-columns: 1fr; gap: 14px; }
}

/* ---- rect media (single video pages) ---- */
.uc-mediaInner--rect{ height: clamp(360px, 44vh, 540px); }
@media (max-width: 560px){
  .uc-mediaInner--rect{ height: clamp(320px, 46vh, 560px); }
}

@media (prefers-reduced-motion: reduce){
  .uc-enter{ opacity:1 !important; transform:none !important; filter:none !important; transition:none !important; }
  .uc-page.uc-io .uc-reveal{ opacity:1; transform:none; transition:none; }
  .uc-pop{ transition:none !important; transform:none !important; }
  .uc-btn{ transition:none !important; }
}
`;

/* ---------------- UI bits ---------------- */
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
    <div
      className={cx("uc-crumb uc-enter", enter && "uc-in")}
      style={{ ["--d" as any]: `${delayMs}ms` }}
      aria-label="Breadcrumb"
    >
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

/* ======================================================================================
   CaseRow — Köhnə səhifələr sındırılmasın deyə saxlanır.
   Sən indi yeni “Healthcare-style” səhifələrdən istifadə edirsən,
   amma build error-u bağlamaq üçün export olmalıdır.
====================================================================================== */

function tintToHex(t: Tint) {
  switch (t) {
    case "amber":
      return "#ffbe6e";
    case "pink":
      return "#ff4fd8";
    case "violet":
      return "#7b68ff";
    case "cyan":
    default:
      return "#00f0ff";
  }
}

function autoCloudinary(url: string) {
  if (!url) return url;
  if (!url.includes("/upload/")) return url;
  if (url.includes("/upload/q_auto,f_auto/")) return url;
  return url.replace("/upload/", "/upload/q_auto,f_auto/");
}

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
  flip?: boolean;
  tRealScenario: string;
  toContact: string;
  toServices: string;
  ctaPrimary: string;
  ctaSecondary: string;
  videoUrl?: string;
}) {
  const Icon = c.icon;
  const accent = tintToHex(c.tint);
  const v = autoCloudinary(videoUrl || "");
  const leftFirst = !flip;

  return (
    <section
      className="uc-reveal reveal-bottom"
      style={{
        borderRadius: 26,
        border: "1px solid rgba(255,255,255,.10)",
        background: "linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.015))",
        boxShadow: "0 18px 70px rgba(0,0,0,.55)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 18,
          padding: 18,
          alignItems: "stretch",
        }}
      >
        {/* left */}
        <div style={{ order: leftFirst ? 1 : 2, minWidth: 0 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              border: "1px solid rgba(255,255,255,.10)",
              background: "rgba(255,255,255,.04)",
              padding: "10px 14px",
              borderRadius: 999,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: accent,
                boxShadow: `0 0 0 4px ${accent}22, 0 0 18px ${accent}55`,
              }}
            />
            <span style={{ fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,.70)" }}>
              {tRealScenario}
            </span>
          </div>

          <h2 style={{ marginTop: 14, fontSize: 34, lineHeight: 1.05, fontWeight: 800, color: "rgba(255,255,255,.95)" }}>
            {c.basliq}
          </h2>

          <p style={{ marginTop: 10, color: "rgba(255,255,255,.72)", lineHeight: 1.7 }}>{c.hekayə}</p>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {c.maddeler.map((m) => (
              <div key={m} style={{ display: "flex", gap: 10, alignItems: "flex-start", color: "rgba(255,255,255,.76)", lineHeight: 1.6 }}>
                <CheckCircle style={{ width: 18, height: 18, marginTop: 3, color: "rgba(170,225,255,.95)" }} />
                <span>{m}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a className="uc-btn" href={toContact}>
              {ctaPrimary} <span aria-hidden="true">→</span>
            </a>
            <a className="uc-btn uc-btnGhost" href={toServices}>
              {ctaSecondary}
            </a>
          </div>
        </div>

        {/* right media */}
        <div style={{ order: leftFirst ? 2 : 1, minWidth: 0 }}>
          <div className="uc-mediaCard uc-contain">
            <div className="uc-mediaInner uc-mediaInner--rect">
              {v ? (
                <video className="uc-mediaVideo" src={v} autoPlay muted loop playsInline preload="metadata" />
              ) : (
                <div className="uc-imgPh">MEDIA</div>
              )}
              <div className="uc-mediaShade" aria-hidden="true" />
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            {c.neticeler.map((r) => (
              <div
                key={r.v}
                style={{
                  borderRadius: 18,
                  border: "1px solid rgba(255,255,255,.10)",
                  background: "rgba(0,0,0,.22)",
                  padding: 14,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 14,
                      display: "grid",
                      placeItems: "center",
                      border: "1px solid rgba(255,255,255,.10)",
                      background: "rgba(255,255,255,.03)",
                    }}
                  >
                    <Icon style={{ width: 18, height: 18, color: "rgba(170,225,255,.95)" }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 18, color: "rgba(255,255,255,.95)" }}>{r.k}</div>
                    <div style={{ fontWeight: 700, color: "rgba(255,255,255,.78)" }}>{r.v}</div>
                  </div>
                </div>
                <div style={{ marginTop: 8, color: "rgba(255,255,255,.62)", lineHeight: 1.55 }}>{r.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 960px){
          .uc-page section > div{ grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
});
