// src/pages/About.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Shield,
  Target,
  Workflow,
  Radar,
  Network,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Zap,
  Cpu,
} from "lucide-react";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

/* motion pref */
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

/** mobil break */
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
 * Reveal (BATCH) — MAX FPS friendly
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

    root.classList.add("ab-io");

    const els = Array.from(root.querySelectorAll<HTMLElement>(".ab-reveal"));
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
    }, 1800);

    return () => {
      window.clearTimeout(fallback);
      if (timer) window.clearTimeout(timer);
      io.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, rootMargin, ...deps]);
}

/**
 * Live “workflow electricity” lines between hero chips.
 * - Measures chip centers inside wrapper and draws SVG paths.
 * - Updates on resize + scroll (throttled via rAF).
 */
function useChipFlowLines(
  wrapRef: React.RefObject<HTMLElement>,
  count: number,
  disabled: boolean
) {
  const [paths, setPaths] = useState<string[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || disabled) {
      setPaths([]);
      return;
    }

    const nodes = () =>
      Array.from(wrap.querySelectorAll<HTMLElement>("[data-flow-node]")).slice(0, count);

    const compute = () => {
      const w = wrapRef.current;
      if (!w) return;
      const items = nodes();
      if (items.length < 2) return;

      const wRect = w.getBoundingClientRect();
      const pts = items.map((el) => {
        const r = el.getBoundingClientRect();
        return {
          x: r.left - wRect.left + r.width / 2,
          y: r.top - wRect.top + r.height / 2,
        };
      });

      // Build “alive” curved connections i -> i+1
      const ds: string[] = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        const dx = b.x - a.x;
        const dy = b.y - a.y;

        // Curvature: slight S-curve that feels like signal flow
        const c1 = { x: a.x + dx * 0.35, y: a.y + dy * 0.05 - 10 };
        const c2 = { x: a.x + dx * 0.65, y: a.y + dy * 0.95 + 10 };

        ds.push(`M ${a.x.toFixed(1)} ${a.y.toFixed(1)} C ${c1.x.toFixed(1)} ${c1.y.toFixed(1)}, ${c2.x.toFixed(
          1
        )} ${c2.y.toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`);
      }

      // Optional: close loop (last -> first) when layout is wide (gives “circuit” vibe)
      const wide = wrap.clientWidth > 640;
      if (wide && pts.length >= 3) {
        const a = pts[pts.length - 1];
        const b = pts[0];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const c1 = { x: a.x + dx * 0.35, y: a.y + dy * 0.05 - 14 };
        const c2 = { x: a.x + dx * 0.65, y: a.y + dy * 0.95 + 14 };
        ds.push(`M ${a.x.toFixed(1)} ${a.y.toFixed(1)} C ${c1.x.toFixed(1)} ${c1.y.toFixed(1)}, ${c2.x.toFixed(
          1
        )} ${c2.y.toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`);
      }

      setPaths(ds);
    };

    const schedule = () => {
      if (rafRef.current) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        compute();
      });
    };

    schedule();

    const ro = new ResizeObserver(schedule);
    ro.observe(wrap);

    const onScroll = () => schedule();
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", schedule, { passive: true });

    // fonts/layout settle
    const t = window.setTimeout(schedule, 220);

    return () => {
      window.clearTimeout(t);
      ro.disconnect();
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", schedule);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [wrapRef, count, disabled]);

  return paths;
}

type Pill = { icon: any; title: string; desc: string; bullets: string[] };
type Step = { n: string; title: string; desc: string; points: string[] };

const STRIP_WORDS_KEYS = [
  "foundation",
  "agents",
  "workflow",
  "rules",
  "monitoring",
  "integration",
  "crm",
  "sla",
] as const;

export default function About() {
  const { t } = useTranslation();
  const pageRef = useRef<HTMLElement | null>(null);

  const reduced = usePrefersReducedMotion();
  const isMobile = useMedia("(max-width: 860px)", false);

  // enter
  const [enter, setEnter] = useState(false);
  useEffect(() => {
    if (reduced) return;
    const tt = window.setTimeout(() => setEnter(true), 220);
    return () => window.clearTimeout(tt);
  }, [reduced]);

  useRevealWithinBatched(pageRef as any, [], {
    batchSize: 3,
    batchDelayMs: 85,
    rootMargin: "0px 0px -18% 0px",
  });

  const d = (ms: number) => ({ ["--d" as any]: `${isMobile ? Math.round(ms * 0.7) : ms}ms` });

  // Strip words (i18n)
  const stripWords = useMemo(() => STRIP_WORDS_KEYS.map((k) => t(`about.strip.${k}`)), [t]);
  const marquee = useMemo(() => [...stripWords, ...stripWords], [stripWords]);

  // Foundation (i18n)
  const foundation: Pill[] = useMemo(
    () => [
      {
        icon: Target,
        title: t("about.foundation.cards.resultFirst.title"),
        desc: t("about.foundation.cards.resultFirst.desc"),
        bullets: [
          t("about.foundation.cards.resultFirst.bullets.0"),
          t("about.foundation.cards.resultFirst.bullets.1"),
          t("about.foundation.cards.resultFirst.bullets.2"),
        ],
      },
      {
        icon: Workflow,
        title: t("about.foundation.cards.workflowEngineering.title"),
        desc: t("about.foundation.cards.workflowEngineering.desc"),
        bullets: [
          t("about.foundation.cards.workflowEngineering.bullets.0"),
          t("about.foundation.cards.workflowEngineering.bullets.1"),
          t("about.foundation.cards.workflowEngineering.bullets.2"),
        ],
      },
      {
        icon: Radar,
        title: t("about.foundation.cards.observability.title"),
        desc: t("about.foundation.cards.observability.desc"),
        bullets: [
          t("about.foundation.cards.observability.bullets.0"),
          t("about.foundation.cards.observability.bullets.1"),
          t("about.foundation.cards.observability.bullets.2"),
        ],
      },
      {
        icon: Shield,
        title: t("about.foundation.cards.security.title"),
        desc: t("about.foundation.cards.security.desc"),
        bullets: [
          t("about.foundation.cards.security.bullets.0"),
          t("about.foundation.cards.security.bullets.1"),
          t("about.foundation.cards.security.bullets.2"),
        ],
      },
    ],
    [t]
  );

  // Steps (i18n)
  const steps: Step[] = useMemo(
    () => [
      {
        n: "01",
        title: t("about.process.steps.0.title"),
        desc: t("about.process.steps.0.desc"),
        points: [
          t("about.process.steps.0.points.0"),
          t("about.process.steps.0.points.1"),
          t("about.process.steps.0.points.2"),
          t("about.process.steps.0.points.3"),
        ],
      },
      {
        n: "02",
        title: t("about.process.steps.1.title"),
        desc: t("about.process.steps.1.desc"),
        points: [
          t("about.process.steps.1.points.0"),
          t("about.process.steps.1.points.1"),
          t("about.process.steps.1.points.2"),
          t("about.process.steps.1.points.3"),
        ],
      },
      {
        n: "03",
        title: t("about.process.steps.2.title"),
        desc: t("about.process.steps.2.desc"),
        points: [
          t("about.process.steps.2.points.0"),
          t("about.process.steps.2.points.1"),
          t("about.process.steps.2.points.2"),
          t("about.process.steps.2.points.3"),
        ],
      },
    ],
    [t]
  );

  // HERO chips (5) + live connections
  const chipsWrapRef = useRef<HTMLDivElement | null>(null);
  const chipPaths = useChipFlowLines(chipsWrapRef as any, 5, reduced);

  return (
    <main ref={pageRef} className="ab-page" style={{ background: "#000", minHeight: "100vh" }}>
      <style>{`
        :root{
          --ab-bg:#000;
          --ab-stroke:rgba(255,255,255,.10);
          --ab-stroke2:rgba(255,255,255,.16);
          --ab-text:rgba(255,255,255,.94);
          --ab-dim:rgba(255,255,255,.74);
          --ab-shadow: 0 16px 56px rgba(0,0,0,.62);
          --ab-shadow2: 0 22px 70px rgba(0,0,0,.70);

          --ab-blue1: rgba(47,184,255,1);
          --ab-blue2: rgba(42,125,255,1);

          --ab-glow1: rgba(170,225,255,.20);
          --ab-glow2: rgba(47,184,255,.18);
          --ab-glow3: rgba(42,125,255,.16);

          /* header safety (mobilde üst-üstə düşməsin) */
          --ab-headerSafe: 86px;
        }

        html, body{
          background:#000 !important;
          margin:0;
          padding:0;
          width:100%;
          overflow-x: clip;
        }

        /* ✅ overlay heç vaxt kontenti örtməsin */
        .ab-page{
          position: relative;
          isolation: isolate;
          color: var(--ab-text);
          overflow-x: clip;
          word-break: break-word;
          overflow-wrap: anywhere;
          text-rendering: geometricPrecision;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .ab-page *{ min-width:0; max-width:100%; }

        /* ✅ background layer-ları iOS Safari üçün 100vw/100vh (sağdakı qara band gedir) */
        .ab-layer{
          position: fixed;
          top: 0; left: 50%;
          width: 100vw;
          height: 100vh;
          transform: translateX(-50%);
          pointer-events: none;
        }

        .ab-bgGlow{
          z-index: -3;
          background:
            radial-gradient(900px 520px at 18% 12%, rgba(47,184,255,.14), transparent 60%),
            radial-gradient(900px 520px at 82% 18%, rgba(42,125,255,.12), transparent 62%),
            radial-gradient(1200px 760px at 50% -10%, rgba(255,255,255,.05), transparent 62%),
            radial-gradient(1200px 760px at 50% 120%, rgba(0,0,0,0), rgba(0,0,0,.86));
          opacity: .92;
          filter: saturate(1.05);
        }

        .ab-drift{
          z-index: -3;
          opacity: .22;
          background:
            radial-gradient(420px 260px at 20% 30%, rgba(47,184,255,.18), transparent 70%),
            radial-gradient(460px 280px at 70% 40%, rgba(42,125,255,.16), transparent 72%),
            radial-gradient(520px 320px at 45% 75%, rgba(170,225,255,.14), transparent 72%);
          filter: blur(26px);
          animation: abDrift 9.5s ease-in-out infinite;
        }
        @keyframes abDrift{
          0%,100%{ transform: translateX(-50%) translate3d(0,0,0) scale(1); }
          50%{ transform: translateX(-50%) translate3d(-18px, 10px, 0) scale(1.04); }
        }

        .ab-noise{
          z-index: -2;
          opacity: .06;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E");
          mix-blend-mode: soft-light;
        }

        .ab-vignette{
          z-index: -1;
          background:
            radial-gradient(1200px 720px at 50% -10%, rgba(0,0,0,0), rgba(0,0,0,.55) 70%, rgba(0,0,0,.92) 100%),
            radial-gradient(800px 520px at 50% 120%, rgba(0,0,0,0), rgba(0,0,0,.78) 70%, rgba(0,0,0,.96) 100%);
          opacity: .82;
        }

        /* ✅ kontent üst qatda */
        .ab-container{
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
          position: relative;
          z-index: 5;
        }
        @media (max-width: 560px){
          .ab-container{ width: min(1180px, calc(100% - 28px)); }
        }

        .ab-gradient{
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

        .ab-glowWord{
          position: relative;
          display: inline-block;
          padding: 0 .04em;
        }
        .ab-glowWord::before{
          content:"";
          position:absolute;
          left:-.28em; right:-.28em;
          top: 58%;
          height: 0.9em;
          transform: translateY(-50%);
          background:
            radial-gradient(120px 40px at 20% 50%, var(--ab-glow1), transparent 70%),
            radial-gradient(140px 46px at 50% 50%, var(--ab-glow2), transparent 72%),
            radial-gradient(120px 40px at 80% 50%, var(--ab-glow3), transparent 70%);
          filter: blur(10px);
          opacity: .92;
          pointer-events:none;
          z-index: -1;
        }

        /* perf */
        .ab-section, .ab-arch, .ab-process, .ab-final, .ab-hero{
          content-visibility: auto;
          contain-intrinsic-size: 920px;
        }

        /* enter */
        .ab-enter{
          opacity: 0;
          transform: translate3d(0, 14px, 0);
          filter: blur(6px);
          transition: opacity .62s ease, transform .62s ease, filter .62s ease;
          transition-delay: var(--d, 0ms);
          will-change: opacity, transform, filter;
        }
        .ab-enter.ab-in{ opacity: 1; transform: translate3d(0,0,0); filter: blur(0px); }

        @media (prefers-reduced-motion: reduce){
          .ab-drift{ animation:none !important; }
          .ab-enter{ opacity:1 !important; transform:none !important; filter:none !important; transition:none !important; }
          .ab-glowWord::before{ filter:none; opacity:.55; }
        }

        /* reveal */
        .ab-reveal{ opacity: 1; transform: none; }
        .ab-page.ab-io .ab-reveal{
          opacity: 0;
          transform: translate3d(var(--rx, 0px), var(--ry, 16px), 0);
          transition: opacity .52s ease, transform .52s ease;
          will-change: transform, opacity;
        }
        .ab-page.ab-io .ab-reveal.is-in{ opacity: 1; transform: translate3d(0,0,0); }
        .ab-reveal-left{ --rx: -18px; --ry: 0px; }
        .ab-reveal-right{ --rx: 18px; --ry: 0px; }
        .ab-reveal-top{ --rx: 0px; --ry: -12px; }
        .ab-reveal-bottom{ --rx: 0px; --ry: 16px; }

        @media (prefers-reduced-motion: reduce){
          .ab-page.ab-io .ab-reveal{ opacity:1 !important; transform:none !important; transition:none !important; }
        }

        /* HERO */
        .ab-hero{
          position: relative;
          padding-top: calc(var(--ab-headerSafe) + env(safe-area-inset-top, 0px));
          padding-bottom: 66px;
          overflow: hidden;
        }
        @media (max-width: 860px){
          .ab-hero{
            padding-top: calc(104px + env(safe-area-inset-top, 0px));
            padding-bottom: 58px;
          }
        }

        .ab-heroGlass{
          position:absolute;
          inset: 0;
          pointer-events:none;
          z-index: 1;
          background:
            radial-gradient(1100px 680px at 50% -10%, rgba(255,255,255,.06), transparent 62%),
            radial-gradient(900px 520px at 34% -10%, rgba(47,184,255,.16), transparent 70%),
            radial-gradient(900px 520px at 74% -14%, rgba(42,125,255,.14), transparent 70%);
          opacity: .9;
          mix-blend-mode: screen;
        }

        .ab-heroFade{
          position:absolute; left:0; right:0; bottom:-1px; height:120px;
          background: linear-gradient(180deg, transparent, rgba(0,0,0,.74), rgba(0,0,0,1));
          pointer-events:none;
          z-index: 2;
        }

        /* ✅ title — requested copy + “top-to-bottom” feel */
        .ab-title{
          margin-top: 12px;
          font-size: clamp(30px, 7.2vw, 72px);
          line-height: 1.06;
          letter-spacing: -.02em;
          font-weight: 680;
          text-align:center;
          text-wrap: balance;
          max-width: 980px;
          margin-left: auto;
          margin-right: auto;
        }
        .ab-titleLine2{
          display:block;
          margin-top: 10px;
          font-weight: 720;
        }
        @media (max-width: 560px){
          .ab-title{
            max-width: 640px;
            font-size: clamp(28px, 7.1vw, 44px);
            line-height: 1.06;
          }
          .ab-titleLine2{ margin-top: 10px; }
        }
        @media (max-width: 420px){
          .ab-title{ font-size: 30px; line-height: 1.06; }
        }

        /* “gözəl görünsün” parçalanmasın */
        .ab-quoteWrap{
          display:inline-flex;
          align-items: baseline;
          gap: .06em;
          white-space: nowrap;
        }
        .ab-quote{
          display:inline-block;
          opacity:.92;
          transform: translateY(-.02em);
        }

        .ab-sub{
          margin: 14px auto 0;
          max-width: 980px;
          text-align:center;
          font-size: 15.5px;
          line-height: 1.68;
          color: var(--ab-dim);
          font-weight: 450;
        }
        @media (max-width: 420px){
          .ab-sub{ font-size: 15px; }
        }

        /* pill */
        .ab-kickerPill{
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.03);
          box-shadow: 0 14px 52px rgba(0,0,0,.60);
          max-width: min(560px, 100%);
          white-space: nowrap;
        }
        .ab-kdot{
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: linear-gradient(180deg, var(--ab-blue1), var(--ab-blue2));
          box-shadow: 0 0 0 3px rgba(47,184,255,.10);
          flex: 0 0 auto;
        }
        .ab-kickerText{
          font-weight: 650;
          text-transform: uppercase;
          color: rgba(255,255,255,.74);
          font-size: clamp(10px, 2.8vw, 12px);
          letter-spacing: .12em;
          white-space: nowrap;
        }

        /* buttons */
        .ab-actions{
          margin-top: 22px;
          display:flex;
          justify-content:center;
          gap: 12px;
          flex-wrap:wrap;
        }
        .ab-btn{
          display:inline-flex;
          align-items:center;
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
        .ab-btn::before{
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
        .ab-btn:hover::before{ opacity:1; transform: translate3d(0,0,0); }
        .ab-btn:hover{
          transform: translate3d(0,-2px,0);
          border-color: rgba(47,184,255,.22);
          background: rgba(255,255,255,.045);
          box-shadow: 0 16px 56px rgba(0,0,0,.55);
        }
        .ab-btn--primary{
          border-color: rgba(47,184,255,.26);
          background: linear-gradient(180deg, rgba(47,184,255,.16), rgba(42,125,255,.10));
        }
        .ab-btn--primary:hover{ border-color: rgba(47,184,255,.42); }

        /* HERO “workflow chips” + electric connections */
        .ab-chipsWrap{
          margin-top: 14px;
          position: relative;
          isolation: isolate;
          display:flex;
          justify-content:center;
        }
        .ab-flowSvg{
          position:absolute;
          inset: -12px;
          width: calc(100% + 24px);
          height: calc(100% + 24px);
          pointer-events:none;
          z-index: 1;
          overflow: visible;
          opacity: .96;
        }

        .ab-flowPath{
          fill: none;
          stroke: rgba(47,184,255,.48);
          stroke-width: 1.8;
          stroke-linecap: round;
          stroke-linejoin: round;
          filter: drop-shadow(0 0 10px rgba(47,184,255,.20)) drop-shadow(0 0 18px rgba(170,225,255,.12));
          opacity: .9;
        }
        .ab-flowPath--glow{
          stroke-width: 5.6;
          opacity: .20;
          filter: blur(1px) drop-shadow(0 0 18px rgba(47,184,255,.24));
        }
        .ab-flowDash{
          stroke-dasharray: 8 12;
          animation: abDash 1.45s linear infinite;
        }
        @keyframes abDash{
          from{ stroke-dashoffset: 0; }
          to{ stroke-dashoffset: -40; }
        }

        .ab-flowPulse{
          stroke-dasharray: 1 80;
          stroke-linecap: round;
          animation: abPulse 1.9s ease-in-out infinite;
          opacity: .78;
        }
        @keyframes abPulse{
          0%{ stroke-dashoffset: 0; opacity: .35; }
          45%{ opacity: .95; }
          100%{ stroke-dashoffset: -80; opacity: .35; }
        }

        .ab-chips{
          display:flex;
          gap: 10px;
          justify-content:center;
          flex-wrap:wrap;
          opacity:.98;
          position: relative;
          z-index: 2; /* above lines */
        }

        .ab-chip{
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding: 7px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(0,0,0,.28);
          color: rgba(255,255,255,.86);
          font-size: 12px;
          font-weight: 650;
          white-space: nowrap;
          box-shadow: 0 10px 28px rgba(0,0,0,.48);
          position: relative;
        }
        .ab-chip::after{
          content:"";
          position:absolute;
          inset:-1px;
          border-radius: 999px;
          pointer-events:none;
          opacity: .0;
          transition: opacity .18s ease;
          background: radial-gradient(220px 90px at 50% 50%, rgba(47,184,255,.12), transparent 70%);
        }
        .ab-chip:hover::after{ opacity: 1; }

        .ab-chip--soft{
          border-color: rgba(47,184,255,.22);
          background: rgba(47,184,255,.10);
        }

        @media (prefers-reduced-motion: reduce){
          .ab-flowSvg{ display:none !important; }
          .ab-flowDash, .ab-flowPulse{ animation:none !important; }
        }

        /* strip */
        .ab-afterHeroSpacer{ height: 18px; background:#000; }

        .ab-strip{
          background: #000;
          padding: 14px 0;
          position: relative;
          overflow:hidden;
          border-top: 1px solid rgba(255,255,255,.06);
          border-bottom: 1px solid rgba(255,255,255,.06);
        }
        .ab-stripTrack{
          display:inline-flex;
          width:max-content;
          white-space:nowrap;
          transform: translate3d(0,0,0);
          will-change: transform;
          animation: ab-marquee 24s linear infinite;
          padding-left: 16px;
        }
        .ab-stripWord{
          color: rgba(255,255,255,.56);
          font-size: 14px;
          font-weight: 700;
          letter-spacing: .22em;
          padding: 0 18px;
          flex: 0 0 auto;
          text-transform: uppercase;
        }
        .ab-stripFade{
          position:absolute; top:0; bottom:0; width: 130px; pointer-events:none;
          z-index: 2;
        }
        .ab-stripFade.l{ left:0; background: linear-gradient(90deg, #000, transparent); }
        .ab-stripFade.r{ right:0; background: linear-gradient(270deg, #000, transparent); }

        @keyframes ab-marquee{
          from{ transform: translate3d(0,0,0); }
          to{ transform: translate3d(-50%,0,0); }
        }
        @media (prefers-reduced-motion: reduce){
          .ab-stripTrack{ animation: none !important; }
        }

        /* sections */
        .ab-section{ padding: 78px 0; }
        .ab-arch{ padding: 84px 0; }
        .ab-process{ padding: 88px 0 94px; }
        .ab-final{ padding: 88px 0 102px; }

        .ab-head{ text-align:center; }
        .ab-kicker{
          letter-spacing:.16em;
          font-size: 12px;
          font-weight: 700;
          color: rgba(255,255,255,.78);
          text-align:center;
          text-transform: uppercase;
        }
        .ab-h2{
          margin-top: 10px;
          font-size: clamp(26px, 3.2vw, 40px);
          line-height: 1.18;
          font-weight: 700;
          letter-spacing: -.02em;
        }
        .ab-p{
          margin: 12px auto 0;
          max-width: 980px;
          color: rgba(255,255,255,.70);
          line-height: 1.72;
          font-weight: 450;
        }

        .ab-stack{ position: relative; isolation: isolate; }
        .ab-pop{
          position: relative;
          z-index: 1;
          transform: translate3d(0,0,0) scale(1);
          transition: transform .20s ease, filter .20s ease, border-color .20s ease;
          will-change: transform;
        }
        .ab-pop:hover, .ab-pop:focus-within{
          z-index: 60;
          transform: translate3d(0,-10px,0) scale(1.03);
          filter: saturate(1.06);
        }

        .ab-card{
          position: relative;
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,.10);
          background: linear-gradient(180deg, rgba(255,255,255,.034), rgba(255,255,255,.018));
          box-shadow: var(--ab-shadow);
          padding: 16px;
          overflow: hidden;
          contain: layout paint style;
          backface-visibility: hidden;
        }
        .ab-card::before{
          content:"";
          position:absolute; inset:-40% -30%;
          opacity:.0;
          transition: opacity .22s ease;
          background:
            radial-gradient(520px 220px at 18% 0%, rgba(255,255,255,.10), transparent 70%),
            radial-gradient(560px 240px at 85% 0%, rgba(47,184,255,.12), transparent 72%);
          pointer-events:none;
        }
        .ab-pop:hover.ab-card::before{ opacity: .9; }

        .ab-cardHead{ position:relative; display:flex; align-items:center; gap: 10px; }
        .ab-dot{
          width: 7px; height:7px; border-radius: 999px;
          background: linear-gradient(180deg, var(--ab-blue1), var(--ab-blue2));
          box-shadow: 0 0 0 3px rgba(47,184,255,.10);
          flex: 0 0 auto;
        }
        .ab-ic{
          width: 34px; height:34px;
          display:grid; place-items:center;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(0,0,0,.28);
          color: rgba(255,255,255,.92);
          flex: 0 0 auto;
        }
        .ab-cardTitle{ font-weight: 750; letter-spacing: -.01em; font-size: 16px; }
        .ab-cardDesc{
          margin-top: 10px;
          color: rgba(255,255,255,.72);
          line-height: 1.68;
          font-size: 13.8px;
          font-weight: 450;
        }

        .ab-miniList{
          margin-top: 14px;
          display:grid;
          gap: 8px;
          color: rgba(255,255,255,.78);
          font-size: 13px;
          font-weight: 450;
        }
        .ab-miniItem{ display:flex; align-items:flex-start; gap:10px; }
        .ab-miniDot{
          width: 7px; height:7px; border-radius: 50%;
          margin-top: 7px;
          background: linear-gradient(180deg, var(--ab-blue1), var(--ab-blue2));
          box-shadow: 0 0 0 3px rgba(47,184,255,.10);
          flex: 0 0 auto;
        }

        .ab-grid{
          margin-top: 18px;
          display:grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }
        @media (max-width: 920px){ .ab-grid{ grid-template-columns: 1fr; } }

        .ab-check{
          width: 18px;
          height: 18px;
          border-radius: 999px;
          border: 1px solid rgba(47,184,255,.30);
          background: linear-gradient(180deg, rgba(47,184,255,.18), rgba(42,125,255,.10));
          display: grid;
          place-items: center;
          box-shadow:
            0 10px 22px rgba(0,0,0,.55),
            0 0 0 3px rgba(47,184,255,.10);
          flex: 0 0 auto;
          margin-top: 1px;
        }
        .ab-check svg{
          width: 12px;
          height: 12px;
          color: rgba(255,255,255,.92);
          filter: drop-shadow(0 6px 10px rgba(0,0,0,.6));
        }

        /* arch */
        .ab-archGrid{
          display:grid;
          grid-template-columns: 1.05fr .95fr;
          gap: 22px;
          align-items:start;
        }
        @media (max-width: 980px){ .ab-archGrid{ grid-template-columns: 1fr; } }

        .ab-diagram{
          position: relative;
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,.10);
          background: linear-gradient(180deg, rgba(255,255,255,.034), rgba(255,255,255,.018));
          box-shadow: var(--ab-shadow2);
          padding: 16px;
          overflow:hidden;
          isolation:isolate;
          contain: layout paint style;
        }
        .ab-diagram::after{
          content:"";
          position:absolute; inset:0;
          pointer-events:none;
          background:
            radial-gradient(640px 220px at 20% 0%, rgba(255,255,255,.08), transparent 72%),
            radial-gradient(760px 260px at 85% 10%, rgba(47,184,255,.10), transparent 72%);
          opacity:.75;
        }

        .ab-diagTop{ position:relative; display:flex; gap: 8px; flex-wrap:wrap; z-index:1; }
        .ab-diagGrid{
          position:relative;
          z-index:1;
          margin-top: 14px;
          display:grid;
          grid-template-columns: 1fr 1.1fr 1fr;
          gap: 12px;
          align-items:stretch;
        }
        @media (max-width: 560px){ .ab-diagGrid{ grid-template-columns: 1fr; } }

        .ab-node{
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(0,0,0,.26);
          padding: 12px;
        }
        .ab-nodeName{ font-weight: 750; }
        .ab-nodeSub{
          color: rgba(255,255,255,.66);
          margin-top: 4px;
          font-size: 12.5px;
          line-height: 1.5;
          font-weight: 450;
        }

        .ab-core{
          border-radius: 18px;
          border: 1px solid rgba(47,184,255,.26);
          background: linear-gradient(180deg, rgba(47,184,255,.14), rgba(255,255,255,.02));
          padding: 12px;
          position: relative;
          overflow:hidden;
          contain: paint;
        }
        .ab-coreTop{
          font-weight: 750;
          letter-spacing: .10em;
          font-size: 12px;
          color: rgba(255,255,255,.84);
        }
        .ab-coreMid{ margin-top: 6px; font-weight: 750; font-size: 16px; }
        .ab-coreBot{ margin-top: 6px; color: rgba(255,255,255,.72); font-size: 13px; font-weight: 450; }

        .ab-pulse{
          position:absolute;
          width: 7px; height: 7px;
          border-radius: 999px;
          background: rgba(47,184,255,.92);
          box-shadow: 0 0 0 5px rgba(47,184,255,.10);
          opacity:.9;
          animation: ab-pulse 1.9s ease-in-out infinite;
        }
        .ab-pulse.p1{ left: 12px; top: 44px; }
        .ab-pulse.p2{ right: 18px; top: 66px; background: rgba(170,225,255,.90); box-shadow: 0 0 0 5px rgba(170,225,255,.08); }
        .ab-pulse.p3{ left: 44%; bottom: 18px; }
        @keyframes ab-pulse{
          0%,100%{ transform: translate3d(0,0,0) scale(1); opacity:.82; }
          50%{ transform: translate3d(0,-5px,0) scale(1.06); opacity:1; }
        }
        @media (prefers-reduced-motion: reduce){ .ab-pulse{ animation: none !important; } }

        .ab-diagFoot{
          position:relative;
          z-index:1;
          margin-top: 12px;
          display:flex;
          flex-wrap:wrap;
          gap: 8px;
          opacity:.98;
        }

        /* process */
        .ab-termHead{
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap: 14px;
          flex-wrap:wrap;
          margin-bottom: 12px;
        }
        .ab-termKicker{ letter-spacing:.16em; font-size:12px; font-weight: 750; color: rgba(255,255,255,.82); text-transform: uppercase; }
        .ab-termStatus{
          margin-top: 8px;
          display:inline-flex;
          align-items:center;
          gap: 10px;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(0,0,0,.26);
          color: rgba(255,255,255,.84);
          font-size: 12px;
          font-weight: 700;
          letter-spacing:.10em;
          text-transform: uppercase;
        }
        .ab-dot2{
          width: 7px; height:7px; border-radius:999px;
          background: linear-gradient(180deg, var(--ab-blue1), var(--ab-blue2));
          box-shadow: 0 0 0 3px rgba(47,184,255,.12);
        }

        .ab-termPanel{
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,.10);
          background: linear-gradient(180deg, rgba(255,255,255,.034), rgba(255,255,255,.018));
          box-shadow: var(--ab-shadow2);
          overflow:hidden;
          position: relative;
          isolation:isolate;
          contain: layout paint style;
        }
        .ab-termPanel::before{
          content:"";
          position:absolute; inset:0;
          pointer-events:none;
          background:
            radial-gradient(900px 520px at 20% 10%, rgba(47,184,255,.12), transparent 60%),
            radial-gradient(900px 520px at 82% 30%, rgba(42,125,255,.10), transparent 62%);
          opacity:.65;
        }

        .ab-termGrid{
          position: relative;
          z-index: 1;
          display:grid;
          grid-template-columns: 1.25fr .75fr;
          gap: 14px;
          padding: 16px;
        }
        @media (max-width: 980px){ .ab-termGrid{ grid-template-columns: 1fr; } }

        .ab-termLine{
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(0,0,0,.26);
          padding: 14px;
          display:flex;
          justify-content:space-between;
          gap: 12px;
        }
        .ab-k{ font-size: 12px; letter-spacing:.10em; font-weight: 750; color: rgba(255,255,255,.74); text-transform: uppercase; }
        .ab-v{ margin-top: 6px; color: rgba(255,255,255,.90); font-weight: 650; font-size: 14px; line-height: 1.5; }
        .ab-termMini{ margin-top: 10px; display:grid; gap: 8px; }
        .ab-termItem{
          display:flex;
          align-items:flex-start;
          gap: 10px;
          color: rgba(255,255,255,.80);
          font-size: 13px;
          line-height: 1.55;
          font-weight: 450;
        }
        .ab-termColR{ display:grid; gap: 12px; }

        .ab-metric{
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(0,0,0,.26);
          padding: 14px;
        }
        .ab-mLabel{ font-size: 12px; font-weight: 750; letter-spacing:.10em; color: rgba(255,255,255,.76); text-transform: uppercase; }
        .ab-mValue{ margin-top: 8px; font-size: 22px; font-weight: 750; letter-spacing: -.02em; }
        .ab-mChips{ margin-top: 10px; display:flex; flex-wrap:wrap; gap: 8px; }
        .ab-mChip{
          display:inline-flex;
          align-items:center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.02);
          color: rgba(255,255,255,.82);
          font-size: 12px;
          font-weight: 650;
          white-space: nowrap;
        }

        /* final */
        .ab-finalGrid{
          margin-top: 16px;
          display:grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }
        @media (max-width: 980px){ .ab-finalGrid{ grid-template-columns: 1fr; } }

        .ab-proof{
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,.10);
          background: linear-gradient(180deg, rgba(255,255,255,.034), rgba(255,255,255,.018));
          box-shadow: var(--ab-shadow);
          padding: 16px;
          position:relative;
          overflow:hidden;
          contain: layout paint style;
        }
        .ab-proof::before{
          content:"";
          position:absolute; inset:-40% -30%;
          opacity:0;
          transform: translate3d(-10px,0,0);
          transition: opacity .22s ease, transform .22s ease;
          background:
            radial-gradient(520px 220px at 20% 0%, rgba(255,255,255,.10), transparent 70%),
            radial-gradient(560px 240px at 85% 0%, rgba(47,184,255,.12), transparent 72%);
          pointer-events:none;
        }
        .ab-pop:hover.ab-proof::before{ opacity:1; transform: translate3d(0,0,0); }

        .ab-proofTop{ color: rgba(255,255,255,.72); font-weight: 750; letter-spacing:.14em; font-size:12px; text-transform: uppercase; }
        .ab-proofMid{ margin-top: 10px; font-weight: 750; font-size: 28px; letter-spacing: -.02em; }
        .ab-proofBot{ margin-top: 8px; color: rgba(255,255,255,.70); line-height: 1.6; font-size: 13.5px; font-weight: 450; }

        @media (hover: none){
          .ab-pop:hover{ transform:none; filter:none; }
          .ab-btn:hover{ transform:none; box-shadow:none; }
        }
      `}</style>

      {/* ✅ premium background layers (tam ekran, sağdakı qara band yoxdur) */}
      <div className="ab-layer ab-bgGlow" aria-hidden="true" />
      {!reduced && <div className="ab-layer ab-drift" aria-hidden="true" />}
      <div className="ab-layer ab-noise" aria-hidden="true" />
      <div className="ab-layer ab-vignette" aria-hidden="true" />

      {/* HERO */}
      <section className="ab-hero" aria-label={t("about.hero.aria")}>
        <div className="ab-heroGlass" aria-hidden="true" />
        <div className="ab-heroFade" aria-hidden="true" />

        <div className="ab-container">
          {/* Kicker pill */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: isMobile ? 18 : 10,
              ...d(0),
            }}
            className={cx("ab-enter", enter && "ab-in")}
          >
            <div className="ab-kickerPill">
              <span className="ab-kdot" aria-hidden="true" />
              <span className="ab-kickerText">{t("about.hero.kicker")}</span>
            </div>
          </div>

          {/* ✅ Title (requested exact copy + vertical spacing) */}
          <h1 style={d(90)} className={cx("ab-title", "ab-enter", enter && "ab-in")}>
            {"AI-nı sadəcə "}
            <span className="ab-quoteWrap" aria-label="gözəl görünsün">
              <span className="ab-quote" aria-hidden="true">
                “
              </span>
              <span className="ab-glowWord ab-gradient">gözəl görünsün</span>
              <span className="ab-quote" aria-hidden="true">
                ”
              </span>
            </span>
            {" deyə qurmuruq"}
            <span className="ab-titleLine2">
              {"Biz "}
              <span className="ab-glowWord ab-gradient">işləyən</span>,{" "}
              <span className="ab-glowWord ab-gradient">ölçülən</span>,{" "}
              <span className="ab-glowWord ab-gradient">nəzarətli</span> sistem qururuq.
            </span>
          </h1>

          {/* Sub */}
          <p style={d(180)} className={cx("ab-sub", "ab-enter", enter && "ab-in")}>
            {t("about.hero.sub")}
          </p>

          {/* Buttons */}
          <div style={d(270)} className={cx("ab-actions", "ab-enter", enter && "ab-in")}>
            <Link to="/contact" className="ab-btn ab-btn--primary">
              {t("about.hero.ctaPrimary")} <ArrowRight size={18} />
            </Link>
            <Link to="/services" className="ab-btn">
              {t("about.hero.ctaSecondary")} <ArrowRight size={18} />
            </Link>
          </div>

          {/* ✅ 5 chips + LIVE workflow electricity */}
          <div
            ref={chipsWrapRef}
            style={d(350)}
            className={cx("ab-chipsWrap", "ab-enter", enter && "ab-in")}
            aria-hidden="true"
          >
            {!reduced && chipPaths.length > 0 && (
              <svg className="ab-flowSvg" viewBox={`0 0 ${Math.max(1, chipsWrapRef.current?.clientWidth || 1)} ${Math.max(
                1,
                chipsWrapRef.current?.clientHeight || 1
              )}`}
              preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="abFlowGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="rgba(170,225,255,0.0)" />
                    <stop offset="20%" stopColor="rgba(170,225,255,0.75)" />
                    <stop offset="55%" stopColor="rgba(47,184,255,0.85)" />
                    <stop offset="85%" stopColor="rgba(42,125,255,0.65)" />
                    <stop offset="100%" stopColor="rgba(42,125,255,0.0)" />
                  </linearGradient>
                </defs>

                {chipPaths.map((d, i) => (
                  <g key={i}>
                    <path className="ab-flowPath ab-flowPath--glow" d={d} stroke="rgba(47,184,255,.22)" />
                    <path className="ab-flowPath ab-flowDash" d={d} stroke="url(#abFlowGrad)" />
                    <path className="ab-flowPath ab-flowPulse" d={d} stroke="rgba(255,255,255,.65)" />
                  </g>
                ))}
              </svg>
            )}

            <div className="ab-chips">
              <span className="ab-chip ab-chip--soft" data-flow-node="0">
                <Cpu size={14} /> {t("about.hero.chips.0")}
              </span>
              <span className="ab-chip" data-flow-node="1">
                {t("about.hero.chips.1")}
              </span>
              <span className="ab-chip" data-flow-node="2">
                {t("about.hero.chips.2")}
              </span>
              <span className="ab-chip" data-flow-node="3">
                {t("about.hero.chips.3")}
              </span>
              <span className="ab-chip" data-flow-node="4">
                {t("about.hero.chips.4")}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="ab-afterHeroSpacer" aria-hidden="true" />

      {/* STRIP */}
      <section className={cx("ab-strip", "ab-reveal", "ab-reveal-bottom")} aria-label={t("about.strip.aria")}>
        <div className="ab-stripFade l" />
        <div className="ab-stripFade r" />
        <div className="ab-stripTrack" aria-hidden="true">
          {marquee.map((txt, i) => (
            <span key={i} className="ab-stripWord">
              {txt}
            </span>
          ))}
        </div>
      </section>

      {/* FOUNDATION */}
      <section className="ab-section" aria-label={t("about.foundation.aria")}>
        <div className="ab-container">
          <header className="ab-head">
            <div className={cx("ab-kicker", "ab-reveal", "ab-reveal-top")}>{t("about.foundation.kicker")}</div>
            <h2 className={cx("ab-h2", "ab-reveal", "ab-reveal-top")}>
              {t("about.foundation.title.0")}{" "}
              <span className="ab-glowWord ab-gradient">{t("about.foundation.title.glowSystem")}</span>,{" "}
              <span className="ab-glowWord ab-gradient">{t("about.foundation.title.glowControl")}</span>{" "}
              {t("about.foundation.title.1")}{" "}
              <span className="ab-glowWord ab-gradient">{t("about.foundation.title.glowResult")}</span>
            </h2>
            <p className={cx("ab-p", "ab-reveal", "ab-reveal-top")} style={{ maxWidth: 920 }}>
              {t("about.foundation.sub")}
            </p>
          </header>

          <div className="ab-grid ab-stack" style={{ marginTop: 18 }}>
            {foundation.map((f, idx) => {
              const Icon = f.icon;
              const dir = idx % 2 === 0 ? "ab-reveal-left" : "ab-reveal-right";
              return (
                <article key={f.title} className={cx("ab-reveal", dir, "ab-card", "ab-pop")} aria-label={f.title}>
                  <div className="ab-cardHead">
                    <span className="ab-dot" aria-hidden="true" />
                    <span className="ab-ic" aria-hidden="true">
                      <Icon size={18} />
                    </span>
                    <span className="ab-cardTitle">{f.title}</span>
                  </div>

                  <p className="ab-cardDesc">{f.desc}</p>

                  <div className="ab-miniList">
                    {f.bullets.map((b) => (
                      <div key={b} className="ab-miniItem">
                        <span className="ab-miniDot" aria-hidden="true" /> <span>{b}</span>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>

          <div
            className={cx("ab-reveal", "ab-reveal-bottom")}
            style={{ marginTop: 18, display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}
          >
            <span className="ab-chip ab-chip--soft">
              <Cpu size={14} /> {t("about.foundation.badges.tools")}
            </span>
            <span className="ab-chip">
              <Radar size={14} /> {t("about.foundation.badges.metrics")}
            </span>
            <span className="ab-chip">
              <Shield size={14} /> {t("about.foundation.badges.policy")}
            </span>
            <span className="ab-chip">
              <Network size={14} /> {t("about.foundation.badges.integrations")}
            </span>
          </div>
        </div>
      </section>

      {/* ARCHITECTURE */}
      <section className="ab-arch" aria-label={t("about.arch.aria")}>
        <div className="ab-container">
          <div className="ab-archGrid">
            {/* diagram */}
            <div className={cx("ab-reveal", "ab-reveal-left")} style={{ minWidth: 0 }}>
              <div className={cx("ab-diagram", "ab-pop")} aria-hidden="true">
                <div className="ab-diagTop">
                  <span className="ab-chip ab-chip--soft">{t("about.arch.diagram.top.0")}</span>
                  <span className="ab-chip">{t("about.arch.diagram.top.1")}</span>
                  <span className="ab-chip">{t("about.arch.diagram.top.2")}</span>
                  <span className="ab-chip">{t("about.arch.diagram.top.3")}</span>
                </div>

                <div className="ab-diagGrid">
                  <div className="ab-node">
                    <div className="ab-nodeName">{t("about.arch.diagram.nodes.inbox.title")}</div>
                    <div className="ab-nodeSub">{t("about.arch.diagram.nodes.inbox.sub")}</div>
                  </div>

                  <div className="ab-core">
                    <div className="ab-coreTop">{t("about.arch.diagram.core.top")}</div>
                    <div className="ab-coreMid">{t("about.arch.diagram.core.mid")}</div>
                    <div className="ab-coreBot">{t("about.arch.diagram.core.bot")}</div>
                    {!reduced && (
                      <>
                        <span className="ab-pulse p1" />
                        <span className="ab-pulse p2" />
                        <span className="ab-pulse p3" />
                      </>
                    )}
                  </div>

                  <div className="ab-node">
                    <div className="ab-nodeName">{t("about.arch.diagram.nodes.crm.title")}</div>
                    <div className="ab-nodeSub">{t("about.arch.diagram.nodes.crm.sub")}</div>
                  </div>

                  <div className="ab-node">
                    <div className="ab-nodeName">{t("about.arch.diagram.nodes.ops.title")}</div>
                    <div className="ab-nodeSub">{t("about.arch.diagram.nodes.ops.sub")}</div>
                  </div>

                  <div className="ab-node">
                    <div className="ab-nodeName">{t("about.arch.diagram.nodes.rules.title")}</div>
                    <div className="ab-nodeSub">{t("about.arch.diagram.nodes.rules.sub")}</div>
                  </div>

                  <div className="ab-node">
                    <div className="ab-nodeName">{t("about.arch.diagram.nodes.integrations.title")}</div>
                    <div className="ab-nodeSub">{t("about.arch.diagram.nodes.integrations.sub")}</div>
                  </div>
                </div>

                <div className="ab-diagFoot" aria-hidden="true">
                  <span className="ab-chip">{t("about.arch.diagram.foot.0")}</span>
                  <span className="ab-chip">{t("about.arch.diagram.foot.1")}</span>
                  <span className="ab-chip">{t("about.arch.diagram.foot.2")}</span>
                  <span className="ab-chip">{t("about.arch.diagram.foot.3")}</span>
                </div>
              </div>
            </div>

            {/* copy */}
            <aside style={{ minWidth: 0 }} className={cx("ab-reveal", "ab-reveal-right")}>
              <div className="ab-kicker" style={{ textAlign: "left" }}>
                {t("about.arch.kicker")}
              </div>
              <h3 className="ab-h2" style={{ textAlign: "left" }}>
                {t("about.arch.title.0")} <span className="ab-glowWord ab-gradient">{t("about.arch.title.glow")}</span>
              </h3>
              <p className="ab-p" style={{ textAlign: "left", maxWidth: 820, marginInline: 0 }}>
                {t("about.arch.sub")}
              </p>

              <div className="ab-miniList" style={{ marginTop: 14 }}>
                <div className="ab-miniItem">
                  <span className="ab-miniDot" aria-hidden="true" /> <span>{t("about.arch.bullets.0")}</span>
                </div>
                <div className="ab-miniItem">
                  <span className="ab-miniDot" aria-hidden="true" /> <span>{t("about.arch.bullets.1")}</span>
                </div>
                <div className="ab-miniItem">
                  <span className="ab-miniDot" aria-hidden="true" /> <span>{t("about.arch.bullets.2")}</span>
                </div>
                <div className="ab-miniItem">
                  <span className="ab-miniDot" aria-hidden="true" /> <span>{t("about.arch.bullets.3")}</span>
                </div>
              </div>

              <div className="ab-actions" style={{ justifyContent: "flex-start" }}>
                <Link to="/services" className="ab-btn">
                  {t("about.arch.ctaServices")} <ArrowRight size={18} />
                </Link>
                <button
                  type="button"
                  className="ab-btn"
                  onClick={() => window.dispatchEvent(new CustomEvent("neox-ai:open"))}
                >
                  {t("about.arch.ctaAsk")}
                </button>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section className="ab-process" aria-label={t("about.process.aria")}>
        <div className="ab-container">
          <div className="ab-termHead">
            <div className={cx("ab-reveal", "ab-reveal-left")}>
              <div className="ab-termKicker">{t("about.process.kicker")}</div>
              <div className="ab-termStatus">
                <span className="ab-dot2" aria-hidden="true" />
                {t("about.process.status")}
              </div>
            </div>

            <Link to="/contact" className={cx("ab-btn", "ab-btn--primary", "ab-reveal", "ab-reveal-right")}>
              {t("about.process.ctaBrief")} <ArrowRight size={18} />
            </Link>
          </div>

          <div className={cx("ab-termPanel", "ab-reveal", "ab-reveal-bottom")}>
            <div className="ab-termGrid">
              <div style={{ display: "grid", gap: 12 }}>
                {steps.map((s, idx) => (
                  <div
                    key={s.n}
                    className={cx("ab-termLine", "ab-reveal", idx % 2 === 0 ? "ab-reveal-left" : "ab-reveal-right")}
                  >
                    <div>
                      <div className="ab-k">
                        {t("about.process.stepLabel")} {s.n} / {s.title}
                      </div>
                      <div className="ab-v">{s.desc}</div>

                      <div className="ab-termMini">
                        {s.points.map((p) => (
                          <div key={p} className="ab-termItem">
                            <span className="ab-check" aria-hidden="true">
                              <CheckCircle />
                            </span>
                            <span>{p}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Sparkles size={18} style={{ opacity: 0.75 }} />
                  </div>
                ))}
              </div>

              <div className={cx("ab-termColR", "ab-reveal", "ab-reveal-right")}>
                <div className="ab-metric">
                  <div className="ab-mLabel">{t("about.process.metrics.timeToValue.label")}</div>
                  <div className="ab-mValue">
                    <span className="ab-glowWord ab-gradient">{t("about.process.metrics.timeToValue.valueStrong")}</span>{" "}
                    {t("about.process.metrics.timeToValue.valueSuffix")}
                  </div>
                  <div className="ab-mChips">
                    <span className="ab-mChip">
                      <Zap size={16} /> {t("about.process.metrics.timeToValue.chips.0")}
                    </span>
                    <span className="ab-mChip">
                      <Radar size={16} /> {t("about.process.metrics.timeToValue.chips.1")}
                    </span>
                    <span className="ab-mChip">
                      <Network size={16} /> {t("about.process.metrics.timeToValue.chips.2")}
                    </span>
                  </div>
                </div>

                <div className="ab-metric">
                  <div className="ab-mLabel">{t("about.process.metrics.supportModel.label")}</div>
                  <div className="ab-mValue">
                    {t("about.process.metrics.supportModel.value.0")}{" "}
                    <span className="ab-glowWord ab-gradient">{t("about.process.metrics.supportModel.value.glow")}</span>
                  </div>
                  <div className="ab-mChips">
                    <span className="ab-mChip">
                      <CheckCircle size={16} /> {t("about.process.metrics.supportModel.chips.0")}
                    </span>
                    <span className="ab-mChip">
                      <CheckCircle size={16} /> {t("about.process.metrics.supportModel.chips.1")}
                    </span>
                    <span className="ab-mChip">
                      <CheckCircle size={16} /> {t("about.process.metrics.supportModel.chips.2")}
                    </span>
                  </div>
                </div>

                <div className="ab-metric">
                  <div className="ab-mLabel">{t("about.process.metrics.fit.label")}</div>
                  <div className="ab-mValue">{t("about.process.metrics.fit.value")}</div>
                  <div className="ab-mChips">
                    <span className="ab-mChip">{t("about.process.metrics.fit.chips.0")}</span>
                    <span className="ab-mChip">{t("about.process.metrics.fit.chips.1")}</span>
                    <span className="ab-mChip">{t("about.process.metrics.fit.chips.2")}</span>
                    <span className="ab-mChip">{t("about.process.metrics.fit.chips.3")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="ab-final" aria-label={t("about.final.aria")}>
        <div className="ab-container">
          <div className="ab-head">
            <div className={cx("ab-kicker", "ab-reveal", "ab-reveal-top")}>{t("about.final.kicker")}</div>
            <h3 className={cx("ab-h2", "ab-reveal", "ab-reveal-top")}>
              {t("about.final.title.0")}{" "}
              <span className="ab-glowWord ab-gradient">{t("about.final.title.glowTime")}</span>{" "}
              {t("about.final.title.1")}{" "}
              <span className="ab-glowWord ab-gradient">{t("about.final.title.glowBudget")}</span>{" "}
              {t("about.final.title.2")}
            </h3>
            <p className={cx("ab-p", "ab-reveal", "ab-reveal-top")} style={{ maxWidth: 860 }}>
              {t("about.final.sub")}
            </p>
          </div>

          <div className="ab-finalGrid ab-stack">
            <div className={cx("ab-proof", "ab-pop", "ab-reveal", "ab-reveal-left")}>
              <div className="ab-proofTop">{t("about.final.proofs.0.top")}</div>
              <div className="ab-proofMid">
                <span className="ab-glowWord ab-gradient">{t("about.final.proofs.0.midGlow")}</span>
              </div>
              <div className="ab-proofBot">{t("about.final.proofs.0.bot")}</div>
            </div>

            <div className={cx("ab-proof", "ab-pop", "ab-reveal", "ab-reveal-bottom")}>
              <div className="ab-proofTop">{t("about.final.proofs.1.top")}</div>
              <div className="ab-proofMid">
                <span className="ab-glowWord ab-gradient">{t("about.final.proofs.1.mid.0")}</span> +{" "}
                <span className="ab-glowWord ab-gradient">{t("about.final.proofs.1.mid.1")}</span>
              </div>
              <div className="ab-proofBot">{t("about.final.proofs.1.bot")}</div>
            </div>

            <div className={cx("ab-proof", "ab-pop", "ab-reveal", "ab-reveal-right")}>
              <div className="ab-proofTop">{t("about.final.proofs.2.top")}</div>
              <div className="ab-proofMid">
                <span className="ab-glowWord ab-gradient">{t("about.final.proofs.2.midGlow")}</span> ↑
              </div>
              <div className="ab-proofBot">{t("about.final.proofs.2.bot")}</div>
            </div>
          </div>

          <div className={cx("ab-actions", "ab-reveal", "ab-reveal-bottom")}>
            <Link to="/contact" className="ab-btn ab-btn--primary">
              {t("about.final.ctaPrimary")} <ArrowRight size={18} />
            </Link>
            <Link to="/services" className="ab-btn">
              {t("about.final.ctaSecondary")} <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
