// src/pages/UseCases.tsx
// FIX: Faster reveal (3/4 entered) + Mobile visible + Videos work (1 active by visibility)

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

function optimizeCloudinaryVideo(url: string) {
  if (!url) return url;
  if (
    url.includes("/video/upload/q_auto") ||
    url.includes("/video/upload/f_auto") ||
    url.includes("/video/upload/q_")
  ) {
    return url;
  }
  return url.replace("/video/upload/", "/video/upload/q_auto,f_auto/");
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

/* ------------------------------------------------------------------
   ✅ REVEAL when ~3/4 entered (IO)
   - starts earlier (not center)
   - keeps revealed (no flicker)
   - seq children animate in order
------------------------------------------------------------------ */
function useRevealOnEnter(
  rootRef: React.RefObject<HTMLElement>,
  opts?: { threshold?: number; rootMargin?: string; seqDelayMs?: number }
) {
  const threshold = opts?.threshold ?? 0.62; // ~60-70% visible => “3/4 girəndə” hissi
  const rootMargin = opts?.rootMargin ?? "0px 0px -10% 0px";
  const seqDelayMs = opts?.seqDelayMs ?? 80;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    root.classList.add("uc-io");

    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!items.length) return;

    // seq delays
    items.forEach((wrap) => {
      const seq = Array.from(wrap.querySelectorAll<HTMLElement>(".uc-seq"));
      seq.forEach((el, i) => el.style.setProperty("--sd", `${i * seqDelayMs}ms`));
    });

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduced || typeof IntersectionObserver === "undefined") {
      items.forEach((el) => el.classList.add("is-in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          if (el.classList.contains("is-in")) continue;
          // yalnız yetərincə görünəndə
          if ((e.intersectionRatio || 0) >= threshold) {
            el.classList.add("is-in");
            io.unobserve(el); // revealed = done
          }
        }
      },
      { threshold: [0, 0.25, 0.4, 0.55, 0.62, 0.75, 0.9], rootMargin }
    );

    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [rootRef, threshold, rootMargin, seqDelayMs]);
}

/* ------------------------------------------------------------------
   ✅ GLOBAL VIDEO PICKER (fix: only Retail bug)
   - each video panel reports its intersectionRatio
   - globally choose best visible panel
   - only best plays; others pause + src removed
------------------------------------------------------------------ */
type VideoReg = { id: string; setAllow: (v: boolean) => void };
const VIDEO_REG_KEY = "__neox_uc_video_regs__";
const VIDEO_PICK_KEY = "__neox_uc_video_pick__";

function useBestVisibleVideo(elRef: React.RefObject<HTMLElement>, enabled: boolean) {
  const [allow, setAllow] = useState(false);
  const idRef = useRef<string>(Math.random().toString(16).slice(2) + Date.now().toString(16));

  useEffect(() => {
    const el = elRef.current;
    if (!el || !enabled) return;

    const w = window as any;
    if (!w[VIDEO_REG_KEY]) w[VIDEO_REG_KEY] = new Map<string, VideoReg>();
    const regs: Map<string, VideoReg> = w[VIDEO_REG_KEY];

    regs.set(idRef.current, { id: idRef.current, setAllow });

    if (!w[VIDEO_PICK_KEY]) {
      w[VIDEO_PICK_KEY] = { io: null as IntersectionObserver | null, ratio: new Map<string, number>() };

      w[VIDEO_PICK_KEY].io = new IntersectionObserver(
        (entries: IntersectionObserverEntry[]) => {
          for (const e of entries) {
            const target = e.target as HTMLElement;
            const vid = target.getAttribute("data-vid") || "";
            if (!vid) continue;
            w[VIDEO_PICK_KEY].ratio.set(vid, e.isIntersecting ? (e.intersectionRatio || 0) : 0);
          }

          // pick best
          let bestId = "";
          let bestRatio = 0;
          regs.forEach((r) => {
            const rr = w[VIDEO_PICK_KEY].ratio.get(r.id) || 0;
            if (rr > bestRatio) {
              bestRatio = rr;
              bestId = r.id;
            }
          });

          // only allow if meaningful visible
          regs.forEach((r) => {
            const rr = w[VIDEO_PICK_KEY].ratio.get(r.id) || 0;
            r.setAllow(r.id === bestId && rr >= 0.35);
          });
        },
        {
          threshold: [0, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95],
          rootMargin: "0px 0px 0px 0px",
        }
      );
    }

    el.setAttribute("data-vid", idRef.current);
    (w[VIDEO_PICK_KEY].io as IntersectionObserver).observe(el);

    return () => {
      const w2 = window as any;
      regs.delete(idRef.current);
      try {
        (w2[VIDEO_PICK_KEY]?.io as IntersectionObserver | undefined)?.unobserve?.(el);
      } catch {}

      // cleanup
      if (regs.size === 0) {
        try {
          (w2[VIDEO_PICK_KEY]?.io as IntersectionObserver | undefined)?.disconnect?.();
        } catch {}
        delete w2[VIDEO_PICK_KEY];
        delete w2[VIDEO_REG_KEY];
      }
    };
  }, [elRef, enabled]);

  return allow;
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
    <div className="uc-bullet uc-seq flex items-start gap-2">
      <CheckCircle className="w-5 h-5 text-[rgba(170,225,255,.95)] flex-shrink-0 mt-0.5" />
      <span className="text-white/75 leading-[1.65] break-words">{text}</span>
    </div>
  );
});

const ResultTile = memo(function ResultTile({ k, v, sub }: { k: string; v: string; sub: string }) {
  return (
    <div className="uc-tile uc-seq">
      <div className="uc-tileK">{k}</div>
      <div className="uc-tileV mt-1">{v}</div>
      <div className="text-white/55 text-[12px] mt-2 leading-[1.5]">{sub}</div>
    </div>
  );
});

/* ---------------- VIDEO HUD (video only) ---------------- */
const VideoHUD = memo(function VideoHUD({
  tint,
  videoUrl,
  play,
}: {
  tint: Tint;
  videoUrl?: string;
  play: boolean;
}) {
  const tintMap: Record<Tint, { a: string; b: string }> = {
    cyan: { a: "rgba(47,184,255,.18)", b: "rgba(42,125,255,.12)" },
    violet: { a: "rgba(42,125,255,.18)", b: "rgba(47,184,255,.10)" },
    pink: { a: "rgba(170,225,255,.16)", b: "rgba(47,184,255,.10)" },
    amber: { a: "rgba(80,170,255,.16)", b: "rgba(47,184,255,.10)" },
  };
  const tt = tintMap[tint];

  const hudRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // ✅ best visible video (global)
  const allow = useBestVisibleVideo(hudRef as any, !!videoUrl);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !videoUrl) return;

    // only attach src when allowed AND wrapper says play allowed
    const shouldPlay = !!play && !!allow;

    if (shouldPlay) {
      if (v.src !== videoUrl) {
        v.preload = "metadata";
        v.src = videoUrl;
        try { v.load(); } catch {}
      }
      const p = v.play?.();
      if (p && typeof (p as any).catch === "function") (p as any).catch(() => {});
    } else {
      try { v.pause?.(); } catch {}
      v.removeAttribute("src");
      v.preload = "none";
      try { v.load(); } catch {}
    }
  }, [allow, play, videoUrl]);

  return (
    <div
      ref={hudRef}
      className="uc-hud uc-monitor"
      data-tint={tint}
      style={{
        background: `
          radial-gradient(700px 360px at 35% 10%, ${tt.a}, transparent 60%),
          radial-gradient(700px 360px at 80% 20%, ${tt.b}, transparent 62%),
          rgba(255,255,255,.010)
        `,
        boxShadow: "0 14px 46px rgba(0,0,0,.55)",
      }}
      aria-label="Video panel"
    >
      <div className="uc-hudInner" aria-hidden="true" />
      <div className="uc-screen" aria-hidden="true">
        <video ref={videoRef} className="uc-screenVideo" autoPlay muted loop playsInline preload="none" />
      </div>
      <div className="uc-screenVignette" aria-hidden="true" />
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
  videoUrl,
}: {
  c: CaseItem;
  flip: boolean;
  tCaseLabel: string;
  tRealScenario: string;
  toContact: string;
  toServices: string;
  ctaPrimary: string;
  ctaSecondary: string;
  videoUrl?: string;
}) {
  const Icon = c.icon;

  return (
    <div data-reveal className={cx("uc-wrap", flip ? "flip" : "noflip")} data-tint={c.tint}>
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        {/* TEXT */}
        <div className={cx("uc-panel", flip ? "from-right lg:order-2" : "from-left")}>
          <article className="uc-card" data-tint={c.tint} aria-label={`${c.sektor} use case`}>
            <header className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="uc-ic" aria-hidden="true">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-white font-semibold text-[18px] break-words uc-seq">{c.sektor}</div>
                  <div className="text-white/55 text-[13px] mt-1 break-words uc-seq">{tRealScenario}</div>
                </div>
              </div>
              <div className="uc-seq">
                <TintChip t={c.tint} label={tCaseLabel} />
              </div>
            </header>

            <div className="mt-4 uc-line uc-seq" />

            <h3 className="mt-4 text-white text-[20px] sm:text-[22px] font-semibold break-words uc-seq">{c.basliq}</h3>
            <p className="mt-3 text-white/70 leading-[1.75] break-words uc-seq">{c.hekayə}</p>

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

            <div className="mt-7 flex flex-wrap gap-3 uc-seq">
              <Link to={toContact} className="uc-btn">
                {ctaPrimary} <span aria-hidden="true">→</span>
              </Link>
              <Link to={toServices} className="uc-btn uc-btnGhost">
                {ctaSecondary}
              </Link>
            </div>
          </article>
        </div>

        {/* VIDEO */}
        <div className={cx("uc-panel", flip ? "from-left lg:order-1" : "from-right")}>
          {/* play flag = reveal olmuş wrapper */}
          <VideoHUD tint={c.tint} videoUrl={videoUrl} play={true} />
        </div>
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

  // ✅ videos
  const VIDEOS = useMemo(
    () => [
      optimizeCloudinaryVideo("https://res.cloudinary.com/dppoomunj/video/upload/v1770594527/neox/media/asset_1770594489151_13bb67859a0f3.mp4"),
      optimizeCloudinaryVideo("https://res.cloudinary.com/dppoomunj/video/upload/v1770597752/neox/media/asset_1770597746529_36e8f6de7d5d8.mp4"),
      optimizeCloudinaryVideo("https://res.cloudinary.com/dppoomunj/video/upload/v1770597820/neox/media/asset_1770597818950_bf62d9ddeca91.mp4"),
      optimizeCloudinaryVideo("https://res.cloudinary.com/dppoomunj/video/upload/v1770597681/neox/media/asset_1770597676765_677c534eb962b.mp4"),
    ],
    []
  );

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

  // ✅ reveal earlier (3/4)
  useRevealOnEnter(rootRef, {
    threshold: isMobile ? 0.55 : 0.62,
    rootMargin: "0px 0px -10% 0px",
    seqDelayMs: isMobile ? 70 : 85,
  });

  return (
    <main ref={rootRef as any} className="uc-page">
      <style>{`
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
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .uc-page *{ min-width:0; max-width:100%; }

        .uc-page .uc-grad{
          background: linear-gradient(90deg, #ffffff 0%, rgba(170,225,255,.96) 34%, rgba(47,184,255,.95) 68%, rgba(42,125,255,.95) 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .uc-enter{
          opacity: 0;
          transform: translate3d(0, 14px, 0);
          filter: blur(6px);
          transition: opacity .55s ease, transform .55s ease, filter .55s ease;
          transition-delay: var(--d, 0ms);
        }
        .uc-enter.uc-in{ opacity:1; transform: translate3d(0,0,0); filter: blur(0px); }

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
          transition: transform .16s ease;
        }
        .uc-btn:hover{ transform: translate3d(0,-2px,0); }
        .uc-btnGhost{ border-color: rgba(255,255,255,.14); background: rgba(255,255,255,.03); }

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

        /* ✅ Reveal system */
        .uc-wrap{ position: relative; isolation: isolate; overflow: clip; }

        .uc-page.uc-io [data-reveal] .uc-panel{
          opacity: 0;
          filter: blur(8px);
          transition: opacity .38s ease, transform .38s cubic-bezier(.2,.85,.2,1), filter .38s ease;
          will-change: transform, opacity, filter;
        }
        .uc-page.uc-io [data-reveal] .uc-panel.from-left{ transform: translate3d(-34px, 0, 0); }
        .uc-page.uc-io [data-reveal] .uc-panel.from-right{ transform: translate3d(34px, 0, 0); }

        .uc-page.uc-io [data-reveal].is-in .uc-panel{
          opacity: 1;
          transform: translate3d(0,0,0);
          filter: blur(0px);
        }

        /* ✅ Seq (sözlər/bullets/tiles) */
        .uc-page.uc-io [data-reveal] .uc-seq{
          opacity: 0;
          transform: translate3d(0, 10px, 0);
          filter: blur(6px);
          transition: opacity .42s ease, transform .42s ease, filter .42s ease;
          transition-delay: var(--sd, 0ms);
        }
        .uc-page.uc-io [data-reveal].is-in .uc-seq{
          opacity: 1;
          transform: translate3d(0,0,0);
          filter: blur(0px);
        }

        /* Bullets connector */
        .uc-bullet{ position: relative; padding-left: 2px; }
        .uc-bullet::before{
          content:"";
          position:absolute;
          left: 9px;
          top: 14px;
          width: 28px;
          height: 1px;
          background: linear-gradient(90deg, rgba(47,184,255,.62), transparent);
          opacity: .55;
        }

        /* ✅ VIDEO MONITOR (mobile-safe) */
        .uc-monitor{
          border-radius: 28px;
          border: 1px solid rgba(255,255,255,.12);
          background: linear-gradient(180deg, rgba(255,255,255,.020), rgba(255,255,255,.010));
          overflow: hidden;
        }
        .uc-hud{ position: relative; overflow: hidden; }
        .uc-hudInner{ width:100%; aspect-ratio: 16 / 10; }
        @media (max-width: 560px){
          .uc-hudInner{ aspect-ratio: 16 / 11; }
          .uc-monitor{ border-radius: 24px; }
        }
        .uc-screen{
          position:absolute;
          inset: 12px;
          border-radius: 22px;
          overflow: hidden;
          background:#000;
          pointer-events:none;
        }
        @media (max-width: 560px){
          .uc-screen{ inset: 10px; border-radius: 18px; }
        }
        .uc-screenVideo{
          position:absolute;
          inset:0;
          width:100%;
          height:100%;
          display:block;
          object-fit: cover;
          background:#000;
        }
        .uc-screenVignette{
          position:absolute;
          inset:0;
          pointer-events:none;
          background: radial-gradient(120% 90% at 50% 20%, rgba(0,0,0,.10), rgba(0,0,0,.70));
          opacity: .75;
        }

        @media (prefers-reduced-motion: reduce){
          .uc-page.uc-io [data-reveal] .uc-panel,
          .uc-page.uc-io [data-reveal] .uc-seq{
            opacity: 1 !important;
            transform:none !important;
            filter:none !important;
            transition:none !important;
          }
        }
      `}</style>

      {/* HERO */}
      <section className="uc-hero" aria-label={t("useCases.aria.hero")}>
        <div className="uc-heroBG" aria-hidden="true" />
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

              <p className={cx("mt-5 text-[16px] sm:text-[18px] leading-[1.7] text-white/70 break-words uc-enter", enter && "uc-in")} style={d(180)}>
                {t("useCases.hero.subtitle")}
              </p>

              <div className={cx("mt-8 flex flex-wrap items-center justify-center gap-3 uc-enter", enter && "uc-in")} style={d(270)}>
                <Link to={withLang("/contact", lang)} className="uc-btn" aria-label={t("useCases.aria.contact")}>
                  {ctaOwnCase} <span aria-hidden="true">→</span>
                </Link>
                <Link to={withLang("/services", lang)} className="uc-btn uc-btnGhost" aria-label={t("useCases.aria.services")}>
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
      <section className="py-16 sm:py-20" aria-label={t("useCases.aria.caseStudies")}>
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
                videoUrl={VIDEOS[idx]}
              />
            ))}
          </div>
        </div>
      </section>

      {/* MORE */}
      <section className="py-16 sm:py-20" aria-label={t("useCases.aria.more")}>
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="mt-4 text-[28px] sm:text-[40px] font-semibold text-white">
              {t("useCases.moreSection.title")}
            </h2>
            <p className="mt-3 text-white/65 max-w-[820px] mx-auto leading-[1.7]">
              {t("useCases.moreSection.subtitle.before")} <span className="uc-grad">{t("useCases.moreSection.subtitle.highlight")}</span>
              {t("useCases.moreSection.subtitle.after")}
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {MORE.map((m, i) => {
              const Icon = MORE_META[i]?.icon || Building2;
              return (
                <div key={m.title || String(i)} className="uc-card">
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
      <section className="py-16 sm:py-20" aria-label={t("useCases.aria.finalCta")}>
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="uc-card" style={{ padding: 22 }}>
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
 