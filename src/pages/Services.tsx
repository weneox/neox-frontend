// src/pages/Services.tsx
import React, { memo, useEffect, useMemo, useRef, useState, useDeferredValue } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { LucideIcon } from "lucide-react";
import {
  MessageSquare,
  Workflow,
  Database,
  BarChart3,
  Shield,
  Sparkles,
  ArrowRight,
  Plug,
  FileText,
  Receipt,
  Users,
  Briefcase,
  PhoneCall,
  Calendar,
  ShoppingCart,
  Wrench,
  Bell,
  Server,
  Mail,
  Layers,
  Search,
} from "lucide-react";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
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

/**
 * Reveal (BATCH) — FPS friendly
 * - yalnız container daxilində axtarır
 * - IO yoxdursa: hamısı görünür
 * - filter/search dəyişəndə yenilənir
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

    root.classList.add("svc-io");

    const els = Array.from(root.querySelectorAll<HTMLElement>(".svc-reveal"));
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
    }, 1400);

    return () => {
      window.clearTimeout(fallback);
      if (timer) window.clearTimeout(timer);
      io.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, rootMargin, ...deps]);
}

/* ---------------- Stable IDs ---------------- */
type ServiceGroupId =
  | "inbox_support"
  | "crm_sales_ops"
  | "workflow_approvals"
  | "rpa_docs"
  | "marketing_smm"
  | "analytics_ops"
  | "integrations"
  | "industry_packs";

type ServiceDef = {
  id: string; // stable
  icon: LucideIcon;
  groupId: ServiceGroupId;
  tagKey?: string; // translated key
};

/* ---------------- SEO (native) ---------------- */
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
      return el;
    };

    const setMetaProp = (property: string, content: string) => {
      const el = ensureMeta(`meta[property="${property}"]`, () => {
        const m = document.createElement("meta");
        m.setAttribute("property", property);
        return m;
      });
      el.setAttribute("content", content);
      return el;
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

/* ========================= STYLES ========================= */
const SERVICES_CSS = `
:root{
  --svc-bg:#000000;
  --svc-blue:#2fb8ff;
  --svc-blue2:#2a7dff;
  --svc-blue3:rgba(170,225,255,.96);
  --svc-stroke:rgba(255,255,255,.10);
  --svc-stroke2:rgba(255,255,255,.16);
  --svc-text:rgba(255,255,255,.92);
  --svc-dim:rgba(255,255,255,.74);
  --svc-shadow: 0 14px 44px rgba(0,0,0,.52);
  --svc-shadow2: 0 22px 70px rgba(0,0,0,.68);
}

/* ✅ mobil sağ ağ boşluq fix */
html, body{
  background:#000 !important;
  margin:0;
  padding:0;
  width:100%;
  overflow-x: clip;
}

.svc-page{
  background: var(--svc-bg);
  color: var(--svc-text);
  min-height: 100vh;
  width: 100%;
  overflow-x: clip;
  word-break: break-word;
  overflow-wrap: anywhere;
  text-rendering: geometricPrecision;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
.svc-page *{ min-width:0; max-width:100%; }

.neo-gradient{
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

/* ✅ Offscreen render skip (FPS) */
.svc-hero, .svc-section{
  content-visibility: auto;
  contain-intrinsic-size: 920px;
}

.svc-container{
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
}
@media (max-width: 560px){
  .svc-container{ width: min(1180px, calc(100% - 28px)); }
}

/* ===================== PAGE ENTER ===================== */
.svc-enter{
  opacity: 0;
  transform: translate3d(0, 16px, 0);
  filter: blur(7px);
  transition: opacity .62s ease, transform .62s ease, filter .62s ease;
  transition-delay: var(--d, 0ms);
  will-change: opacity, transform, filter;
}
.svc-enter.svc-in{
  opacity: 1;
  transform: translate3d(0,0,0);
  filter: blur(0px);
}
@media (prefers-reduced-motion: reduce){
  .svc-enter{ opacity:1 !important; transform:none !important; filter:none !important; transition:none !important; }
}

/* ===================== Reveal (scroll) ===================== */
.svc-reveal{ opacity: 1; transform: none; }
.svc-page.svc-io .svc-reveal{
  opacity: 0;
  transform: translate3d(var(--rx, 0px), var(--ry, 14px), 0);
  transition: opacity .45s ease, transform .45s ease;
  will-change: transform, opacity;
}
.svc-page.svc-io .svc-reveal.is-in{
  opacity: 1;
  transform: translate3d(0,0,0);
}
@media (prefers-reduced-motion: reduce){
  .svc-page.svc-io .svc-reveal{ opacity:1 !important; transform:none !important; transition:none !important; }
}

/* ===================== HERO ===================== */
.svc-hero{
  position: relative;
  background:#000;
  padding: 22px 0 0;
  overflow: hidden;
}
.svc-heroInner{
  min-height: clamp(520px, 78vh, 860px);
  display:flex;
  align-items:center;
  justify-content:center;
  padding: 64px 0 26px;
}
@media (max-width: 560px){
  .svc-heroInner{ min-height:auto; padding-top: 84px; padding-bottom: 18px; }
}

.svc-heroBG{ pointer-events:none; position:absolute; inset:0; }
.svc-heroBG::before{
  content:"";
  position:absolute;
  inset:-10% -10%;
  background:
    radial-gradient(900px 520px at 50% 10%, rgba(47,184,255,.09), transparent 62%),
    radial-gradient(980px 560px at 20% 0%, rgba(42,125,255,.06), transparent 70%),
    radial-gradient(980px 560px at 80% 0%, rgba(170,225,255,.05), transparent 70%);
  opacity:.92;
}
.svc-heroBG::after{
  content:"";
  position:absolute;
  inset:0;
  background: radial-gradient(900px 520px at 50% 0%, rgba(0,0,0,.20), rgba(0,0,0,.92));
}

.svc-divider{
  height: 1px;
  width: 100%;
  max-width: 920px;
  margin: 42px auto 0;
  background: linear-gradient(90deg, transparent, rgba(47,184,255,.22), rgba(255,255,255,.08), rgba(42,125,255,.18), transparent);
  opacity: .95;
}
.svc-spacer{ height: 34px; }

/* breadcrumb pill */
.svc-crumb{
  display:inline-flex;
  align-items:center;
  gap:10px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.04);
  padding: 10px 14px;
  border-radius: 999px;
}
.svc-crumbDot{
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: rgba(47,184,255,1);
  box-shadow: 0 0 0 4px rgba(47,184,255,.14), 0 0 18px rgba(47,184,255,.42);
  flex: 0 0 auto;
}
.svc-crumbText{
  font-size: 12px;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: rgba(255,255,255,.70);
  white-space: nowrap;
}

.svc-title{
  margin-top: 18px;
  font-size: clamp(40px, 6.2vw, 64px);
  line-height: 1.05;
  letter-spacing: -.02em;
  font-weight: 600;
  text-align:center;
  text-wrap: balance;
}
@media (max-width: 560px){
  .svc-title{ font-size: clamp(32px, 8.6vw, 44px); margin-top: 16px; }
}
.svc-sub{
  margin: 16px auto 0;
  max-width: 980px;
  text-align:center;
  font-size: 16px;
  line-height:1.70;
  color: rgba(255,255,255,.70);
  font-weight: 450;
}
@media (max-width: 560px){
  .svc-sub{ font-size: 15.2px; margin-top: 14px; }
}

.svc-actions{
  margin-top: 22px;
  display:flex;
  gap: 12px;
  justify-content:center;
  flex-wrap:wrap;
}
@media (max-width: 560px){
  .svc-actions{ margin-top: 18px; gap: 10px; }
}

.svc-btn{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:10px;
  padding: 12px 16px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.03);
  color: rgba(255,255,255,.92);
  text-decoration:none;
  font-weight: 650;
  transition: transform .16s ease, border-color .16s ease, background .16s ease, box-shadow .16s ease;
  will-change: transform;
  transform: translate3d(0,0,0);
  position: relative;
  overflow: hidden;
}
.svc-btn::before{
  content:"";
  position:absolute; inset:-40% -40%;
  opacity:0;
  transform: translate3d(-10px,0,0);
  transition: opacity .22s ease, transform .22s ease;
  background:
    radial-gradient(420px 180px at 20% 0%, rgba(255,255,255,.10), transparent 70%),
    radial-gradient(420px 180px at 80% 0%, rgba(47,184,255,.10), transparent 70%);
  pointer-events:none;
}
.svc-btn:hover::before{ opacity:1; transform: translate3d(0,0,0); }
.svc-btn:hover{
  transform: translate3d(0,-2px,0);
  border-color: rgba(47,184,255,.22);
  background: rgba(255,255,255,.045);
  box-shadow: 0 16px 56px rgba(0,0,0,.55);
}
.svc-btn--primary{
  border-color: rgba(47,184,255,.26);
  background: linear-gradient(180deg, rgba(47,184,255,.16), rgba(42,125,255,.10));
}
.svc-btn--primary:hover{
  border-color: rgba(47,184,255,.42);
}

.svc-chips{
  margin-top: 14px;
  display:flex;
  gap:10px;
  justify-content:center;
  flex-wrap:wrap;
  opacity:.92;
}
.svc-chip{
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.02);
  color: rgba(255,255,255,.70);
  font-size: 12px;
  letter-spacing:.10em;
  font-weight: 650;
  text-transform: lowercase;
}
@media (max-width: 560px){
  .svc-chip{ font-size: 11.5px; padding: 7px 10px; letter-spacing: .08em; }
}

/* ===================== CATALOG ===================== */
.svc-section{
  padding: 92px 0 92px;
  background:#000;
}
@media (max-width: 560px){
  .svc-section{ padding: 78px 0 82px; }
}

.svc-head{ text-align:center; }
.svc-h2{
  margin-top: 10px;
  font-size: clamp(26px, 3.2vw, 40px);
  line-height:1.18;
  font-weight: 650;
  letter-spacing:-.02em;
}
.svc-p{
  margin: 12px auto 0;
  max-width: 980px;
  color: rgba(255,255,255,.66);
  line-height:1.70;
  font-weight: 450;
}

/* hub */
.svc-hub{
  margin-top: 18px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap: 14px;
  padding: 12px 12px;
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.02);
  box-shadow: 0 14px 52px rgba(0,0,0,.55);
}

.svc-tabs{ display:flex; gap:8px; flex-wrap:wrap; }
.svc-tab{
  appearance:none;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.02);
  color: rgba(255,255,255,.78);
  padding: 9px 12px;
  border-radius: 999px;
  cursor:pointer;
  font-size: 12.5px;
  font-weight: 650;
  transition: transform .18s ease, border-color .18s ease, background .18s ease;
  white-space: nowrap;
}
.svc-tab:hover{
  transform: translate3d(0,-1px,0);
  border-color: rgba(255,255,255,.16);
  background: rgba(255,255,255,.03);
}
.svc-tab.is-active{
  border-color: rgba(47,184,255,.42);
  background: linear-gradient(180deg, rgba(47,184,255,.16), rgba(42,125,255,.10));
  color: rgba(255,255,255,.95);
}

.svc-search{
  display:flex;
  align-items:center;
  gap:10px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.02);
  min-width: min(420px, 100%);
}
.svc-search input{
  width:100%;
  border: none;
  outline:none;
  background: transparent;
  color: rgba(255,255,255,.90);
  font-size: 13.5px;
  font-weight: 520;
}

/* grid */
.svc-grid{
  margin-top: 18px;
  display:grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  position: relative;
  isolation: isolate;
}
@media (max-width: 1040px){
  .svc-grid{ grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .svc-search{ min-width: 280px; }
}
@media (max-width: 640px){
  .svc-hub{ flex-direction:column; align-items:stretch; }
  .svc-grid{ grid-template-columns: 1fr; }
}

/* cards */
.svc-card{
  position: relative;
  border-radius: 22px;
  border: 1px solid rgba(255,255,255,.10);
  background: linear-gradient(180deg, rgba(255,255,255,.035), rgba(255,255,255,.018));
  box-shadow: var(--svc-shadow);
  padding: 16px 16px 14px;
  min-height: 260px;
  transform: translate3d(0,0,0);
  transition: transform .22s ease, border-color .22s ease, background .22s ease, box-shadow .22s ease;
  will-change: transform;
  outline: none;
  overflow: hidden;
  contain: layout paint style;
  backface-visibility: hidden;
  z-index: 1;
}
.svc-card:hover,
.svc-card:focus-visible{
  z-index: 80;
  transform: translate3d(0,-12px,0) scale(1.03);
  border-color: rgba(47,184,255,.30);
  background: linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.02));
  box-shadow: var(--svc-shadow2);
}

.svc-card__layer,
.svc-card__layer2,
.svc-card__layer3{
  position:absolute; inset:-2px;
  border-radius: 22px;
  pointer-events:none;
}
.svc-card__layer{
  background:
    radial-gradient(520px 220px at 18% 0%, rgba(47,184,255,.16), transparent 62%),
    radial-gradient(520px 220px at 92% 10%, rgba(42,125,255,.12), transparent 64%);
  opacity:.52;
  mask-image: radial-gradient(120% 100% at 50% 0%, #000 52%, transparent 100%);
  -webkit-mask-image: radial-gradient(120% 100% at 50% 0%, #000 52%, transparent 100%);
}
.svc-card__layer2{
  background:
    linear-gradient(90deg, rgba(47,184,255,.08), transparent 40%, rgba(42,125,255,.08)),
    radial-gradient(700px 260px at 50% 110%, rgba(255,255,255,.06), transparent 60%);
  opacity:.34;
  mix-blend-mode: screen;
  transform: translate3d(0,0,0);
  transition: transform .35s ease;
}
.svc-card__layer3{
  background:
    repeating-linear-gradient(
      135deg,
      rgba(255,255,255,.05) 0px,
      rgba(255,255,255,.05) 1px,
      transparent 1px,
      transparent 10px
    );
  opacity: .10;
  transform: translate3d(0,0,0);
  transition: transform .35s ease;
}
.svc-card:hover .svc-card__layer2{ transform: translate3d(-10px,0,0); }
.svc-card:hover .svc-card__layer3{ transform: translate3d(8px,0,0); }

.svc-card__top{
  position: relative;
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap: 12px;
}
.svc-ico{
  width: 36px; height:36px;
  display:grid; place-items:center;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.02);
  color: rgba(255,255,255,.92);
  flex: 0 0 auto;
  box-shadow: 0 10px 28px rgba(0,0,0,.40);
}
.svc-topmeta{ display:flex; align-items:center; gap:10px; flex-wrap:wrap; justify-content:flex-end; }
.svc-group{
  font-size: 11.5px;
  letter-spacing:.12em;
  color: rgba(255,255,255,.66);
  text-transform: uppercase;
  font-weight: 750;
}
.svc-badge{
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.02);
  color: rgba(255,255,255,.86);
  font-weight: 650;
}
.svc-badge--soft{
  border-color: rgba(47,184,255,.26);
  background: rgba(47,184,255,.10);
}

.svc-card__title{
  position: relative;
  margin-top: 12px;
  font-size: 18px;
  font-weight: 750;
  letter-spacing: -.01em;
}
.svc-card__desc{
  position: relative;
  margin-top: 8px;
  color: rgba(255,255,255,.70);
  line-height: 1.60;
  font-size: 13.8px;
  font-weight: 450;
}

.svc-list{
  position: relative;
  margin-top: 12px;
  display:grid;
  gap: 8px;
  color: rgba(255,255,255,.74);
  font-size: 13px;
  font-weight: 450;
}
.svc-li{ display:flex; align-items:flex-start; gap:10px; }
.svc-dot{
  width: 7px; height:7px; border-radius: 50%;
  margin-top: 7px;
  background: linear-gradient(180deg, var(--svc-blue), var(--svc-blue2));
  box-shadow: 0 0 0 3px rgba(47,184,255,.10);
  flex: 0 0 auto;
}

.svc-cta{
  position: relative;
  margin-top: 14px;
  display:flex;
  gap: 10px;
  flex-wrap:wrap;
}

/* touch cihazlarda hover yüngülləşdir */
@media (hover: none){
  .svc-card:hover{ transform:none; box-shadow: var(--svc-shadow); z-index:1; }
  .svc-card:hover .svc-card__layer2,
  .svc-card:hover .svc-card__layer3{ transform:none; }
  .svc-btn:hover{ transform:none; box-shadow:none; }
}

@media (prefers-reduced-motion: reduce){
  .svc-btn, .svc-card{ transition:none !important; }
  .svc-btn::before{ display:none !important; }
  .svc-card__layer2, .svc-card__layer3{ transition:none !important; }
}
`;

/* ---------------- Card ---------------- */
const ServiceCard = memo(function ServiceCard({
  def,
  idx,
  t,
  lang,
}: {
  def: ServiceDef;
  idx: number;
  t: (key: string, opts?: any) => any;
  lang: string;
}) {
  const I = def.icon;

  const dir = idx % 4; // 0=r,1=l,2=down,3=up
  const from =
    dir === 0 ? { x: 18, y: 0 } : dir === 1 ? { x: -18, y: 0 } : dir === 2 ? { x: 0, y: 16 } : { x: 0, y: -16 };

  const withLang = (path: string) => {
    if (!path) return path;
    if (path.startsWith("#")) return path;
    const clean = path.startsWith("/") ? path : `/${path}`;
    const pref = `/${lang}`;
    if (clean.startsWith(pref + "/") || clean === pref) return clean;
    return pref + clean;
  };

  const groupLabel = t(`services.groups.${def.groupId}`);
  const title = t(`services.list.${def.id}.title`);
  const desc = t(`services.list.${def.id}.desc`);
  const bullets = (t(`services.list.${def.id}.bullets`, { returnObjects: true }) || []) as string[];
  const tag = def.tagKey ? t(def.tagKey) : "";

  return (
    <article
      className={cx("svc-card", "svc-reveal")}
      style={{
        ["--rx" as any]: `${from.x}px`,
        ["--ry" as any]: `${from.y}px`,
      }}
      tabIndex={0}
      aria-label={title}
    >
      <div className="svc-card__layer" aria-hidden="true" />
      <div className="svc-card__layer2" aria-hidden="true" />
      <div className="svc-card__layer3" aria-hidden="true" />

      <div className="svc-card__top">
        <span className="svc-ico" aria-hidden="true">
          <I size={18} />
        </span>

        <div className="svc-topmeta">
          <div className="svc-group">{groupLabel}</div>
          {!!tag && <div className="svc-badge svc-badge--soft">{tag}</div>}
        </div>
      </div>

      <div className={cx("svc-card__title", "neo-gradient")}>{title}</div>
      <div className="svc-card__desc">{desc}</div>

      <div className="svc-list">
        {bullets.map((b) => (
          <div key={b} className="svc-li">
            <span className="svc-dot" /> {b}
          </div>
        ))}
      </div>

      <div className="svc-cta">
        <Link
          className="svc-btn svc-btn--primary"
          to={withLang("/contact")}
          aria-label={t("services.cards.connectModuleAria", { title })}
        >
          {t("services.cards.connectModule")} <ArrowRight size={18} />
        </Link>
        <Link className="svc-btn" to={withLang("/about")} aria-label={t("services.cards.whyNeoxAria")}>
          {t("services.cards.whyNeox")}
        </Link>
      </div>
    </article>
  );
});

/* ========================= PAGE ========================= */
export default function Services() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage || i18n.language || "az").split("-")[0];

  const pageRef = useRef<HTMLElement | null>(null);
  const reduced = usePrefersReducedMotion();
  const isMobile = useMedia("(max-width: 560px)", false);

  const [enter, setEnter] = useState(false);
  useEffect(() => {
    if (reduced) return;
    const tt = window.setTimeout(() => setEnter(true), 220);
    return () => window.clearTimeout(tt);
  }, [reduced]);

  const d = (ms: number) => ({ ["--d" as any]: `${isMobile ? Math.round(ms * 0.7) : ms}ms` });

  const withLang = (path: string) => {
    if (!path) return path;
    if (path.startsWith("#")) return path;
    const clean = path.startsWith("/") ? path : `/${path}`;
    const pref = `/${lang}`;
    if (clean.startsWith(pref + "/") || clean === pref) return clean;
    return pref + clean;
  };

  useSeo({
    title: t("services.seo.title"),
    description: t("services.seo.description"),
    canonicalPath: withLang("/services"),
  });

  type Active = ServiceGroupId | "all";
  const [activeGroup, setActiveGroup] = useState<Active>("all");
  const [q, setQ] = useState("");
  const qDeferred = useDeferredValue(q);

  const groups: Array<ServiceGroupId> = useMemo(
    () => [
      "inbox_support",
      "crm_sales_ops",
      "workflow_approvals",
      "rpa_docs",
      "marketing_smm",
      "analytics_ops",
      "integrations",
      "industry_packs",
    ],
    []
  );

  const serviceDefs: ServiceDef[] = useMemo(
    () => [
      { id: "inbox_unify", icon: MessageSquare, groupId: "inbox_support", tagKey: "services.tags.alwaysOn" },
      { id: "call_triage", icon: PhoneCall, groupId: "inbox_support", tagKey: "services.tags.triage" },

      { id: "crm_writeback", icon: Database, groupId: "crm_sales_ops", tagKey: "services.tags.sales" },
      { id: "quote_to_cash_lite", icon: Briefcase, groupId: "crm_sales_ops", tagKey: "services.tags.ops" },

      { id: "approvals", icon: Workflow, groupId: "workflow_approvals", tagKey: "services.tags.approval" },
      { id: "it_ops_automations", icon: Server, groupId: "workflow_approvals", tagKey: "services.tags.it" },

      { id: "invoice_docs", icon: Receipt, groupId: "rpa_docs", tagKey: "services.tags.rpa" },
      { id: "doc_routing", icon: FileText, groupId: "rpa_docs", tagKey: "services.tags.idp" },

      { id: "marketing_ops", icon: Mail, groupId: "marketing_smm", tagKey: "services.tags.growth" },
      { id: "smm_factory", icon: Sparkles, groupId: "marketing_smm", tagKey: "services.tags.content" },

      { id: "dashboards", icon: BarChart3, groupId: "analytics_ops", tagKey: "services.tags.kpi" },
      { id: "alerts_observability", icon: Bell, groupId: "analytics_ops", tagKey: "services.tags.alert" },
      { id: "security_guardrails", icon: Shield, groupId: "analytics_ops", tagKey: "services.tags.secure" },

      { id: "integrations", icon: Plug, groupId: "integrations", tagKey: "services.tags.api" },
      { id: "data_sync", icon: Layers, groupId: "integrations", tagKey: "services.tags.sync" },

      { id: "ecom_pack", icon: ShoppingCart, groupId: "industry_packs", tagKey: "services.tags.pack" },
      { id: "clinic_pack", icon: Calendar, groupId: "industry_packs", tagKey: "services.tags.pack" },
      { id: "service_pack", icon: Wrench, groupId: "industry_packs", tagKey: "services.tags.pack" },
      { id: "hr_pack", icon: Users, groupId: "industry_packs", tagKey: "services.tags.pack" },
    ],
    []
  );

  const filtered = useMemo(() => {
    const qq = qDeferred.trim().toLowerCase();

    return serviceDefs.filter((def) => {
      const okGroup = activeGroup === "all" ? true : def.groupId === activeGroup;
      if (!okGroup) return false;

      if (!qq) return true;

      const title = String(t(`services.list.${def.id}.title`));
      const desc = String(t(`services.list.${def.id}.desc`));
      const bullets = (t(`services.list.${def.id}.bullets`, { returnObjects: true }) || []) as string[];

      const hay = (title + " " + desc + " " + bullets.join(" ")).toLowerCase();
      return hay.includes(qq);
    });
  }, [serviceDefs, activeGroup, qDeferred, t]);

  useRevealWithinBatched(pageRef as any, reduced ? [] : [filtered.length, activeGroup, qDeferred, lang], {
    batchSize: 3,
    batchDelayMs: 90,
    rootMargin: "0px 0px -16% 0px",
  });

  const chips = (t("services.hero.chips", { returnObjects: true }) || []) as string[];

  return (
    <main ref={pageRef} className="svc-page">
      <style>{SERVICES_CSS}</style>

      {/* ✅ Structured data (SEO) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            {
              "@context": "https://schema.org",
              "@type": "WebPage",
              name: t("services.structuredData.name"),
              description: t("services.structuredData.description"),
              inLanguage: lang,
            },
            null,
            0
          ),
        }}
      />

      {/* ================= HERO ================= */}
      <section className="svc-hero" aria-label={t("services.hero.aria")}>
        <div className="svc-heroBG" aria-hidden="true" />
        <div className="svc-heroInner">
          <div className="relative z-[1] mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 w-full">
            <div className="mx-auto max-w-[980px] text-center">
              {/* breadcrumb pill */}
              <div className={cx("flex justify-center", "svc-enter", enter && "svc-in")} style={d(0)}>
                <div className="svc-crumb" aria-label={t("services.hero.breadcrumbAria")}>
                  <span className="svc-crumbDot" aria-hidden="true" />
                  <span className="svc-crumbText">{t("services.hero.breadcrumbText")}</span>
                </div>
              </div>

              <h1 className={cx("svc-title", "svc-enter", enter && "svc-in")} style={d(90)}>
                {t("services.hero.titleBefore")} <span className="neo-gradient">{t("services.hero.titleHighlight")}</span>
                {t("services.hero.titleAfter")}
              </h1>

              <p className={cx("svc-sub", "svc-enter", enter && "svc-in")} style={d(180)}>
                {t("services.hero.sub")}
              </p>

              <div className={cx("svc-actions", "svc-enter", enter && "svc-in")} style={d(270)}>
                <Link className="svc-btn svc-btn--primary" to={withLang("/contact")} aria-label={t("services.hero.primaryAria")}>
                  {t("services.hero.primaryCta")} <ArrowRight size={18} />
                </Link>
                <a className="svc-btn" href="#catalog" aria-label={t("services.hero.secondaryAria")}>
                  {t("services.hero.secondaryCta")}
                </a>
              </div>

              <div className={cx("svc-chips", "svc-enter", enter && "svc-in")} style={d(350)} aria-hidden="true">
                {chips.map((c) => (
                  <span key={c} className="svc-chip">
                    {c}
                  </span>
                ))}
              </div>

              <div className="svc-divider" />
            </div>
          </div>
        </div>
        <div className="svc-spacer" />
      </section>

      {/* ================= CATALOG ================= */}
      <section id="catalog" className="svc-section" aria-label={t("services.catalog.aria")}>
        <div className="svc-container">
          <header className="svc-head">
            <div className="svc-reveal" style={{ ["--rx" as any]: "-14px", ["--ry" as any]: "0px" }}>
              <div className="svc-crumb" style={{ paddingInline: 16 }}>
                <span className="svc-crumbDot" aria-hidden="true" />
                <span className="svc-crumbText">{t("services.catalog.crumb")}</span>
              </div>
            </div>

            <h2 className={cx("svc-h2", "svc-reveal")} style={{ ["--rx" as any]: "14px", ["--ry" as any]: "0px" }}>
              {t("services.catalog.headingBefore")} <span className="neo-gradient">{t("services.catalog.headingHighlight")}</span>
              {t("services.catalog.headingAfter")}
            </h2>

            <p className="svc-p svc-reveal" style={{ ["--rx" as any]: "0px", ["--ry" as any]: "14px" }}>
              {t("services.catalog.desc")}
            </p>
          </header>

          <div className="svc-hub svc-reveal" style={{ ["--rx" as any]: "0px", ["--ry" as any]: "14px" }}>
            <div className="svc-tabs" role="tablist" aria-label={t("services.catalog.tabsAria")}>
              <button
                className={cx("svc-tab", activeGroup === "all" && "is-active")}
                type="button"
                onClick={() => setActiveGroup("all")}
              >
                {t("services.catalog.tabsAll")}
              </button>

              {groups.map((gid) => (
                <button
                  key={gid}
                  className={cx("svc-tab", activeGroup === gid && "is-active")}
                  type="button"
                  onClick={() => setActiveGroup(gid)}
                >
                  {t(`services.groups.${gid}`)}
                </button>
              ))}
            </div>

            <div className="svc-search" aria-label={t("services.catalog.searchAria")}>
              <Search size={16} style={{ opacity: 0.9 }} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("services.catalog.searchPlaceholder")}
              />
            </div>
          </div>

          <div className="svc-grid" style={{ marginTop: 16 }}>
            {filtered.map((def, idx) => (
              <ServiceCard key={def.id} def={def} idx={idx} t={t} lang={lang} />
            ))}
          </div>

          <div className="svc-actions svc-reveal" style={{ marginTop: 22, ["--rx" as any]: "0px", ["--ry" as any]: "14px" }}>
            <Link className="svc-btn svc-btn--primary" to={withLang("/contact")} aria-label={t("services.bottom.primaryAria")}>
              {t("services.bottom.primaryCta")} <ArrowRight size={18} />
            </Link>
            <Link className="svc-btn" to={withLang("/about")} aria-label={t("services.bottom.secondaryAria")}>
              {t("services.bottom.secondaryCta")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
