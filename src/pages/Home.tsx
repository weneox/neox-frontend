// src/pages/Home.tsx
import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import HeroSystemBackground from "../components/HeroSystemBackground";

/* ---------------- helpers ---------------- */
function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

const LANGS = ["az", "en", "tr", "ru", "es"] as const;
type Lang = (typeof LANGS)[number];

function getLangFromPath(pathname: string): Lang {
  const seg = (pathname.split("/")[1] || "").toLowerCase();
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

/* ---------------- Always start at top when page opens ---------------- */
function useScrollTopOnMount() {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);
}

/* ---------------- Reveal IO (cheap) ---------------- */
function useRevealIO(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal:not(.is-in)"));
    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -14% 0px" }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [enabled]);
}

/* ========================= SOCIAL DEMO (FPS MAX) =========================
   BIG CHANGE:
   - NO per-character setState.
   - We simulate "typing" as a CSS shimmer + 3 dots.
   - We only add full messages at intervals.
*/
type SocialMsg = { from: "client" | "ai"; text: string };
type Plat = "WHATSAPP" | "FACEBOOK" | "INSTAGRAM";

/** ultra-light bubble */
const MsgBubble = memo(function MsgBubble({
  side,
  from,
  who,
  text,
  isTyping,
  isWA,
  typingLabel,
  nowLabel,
}: {
  side: "left" | "right";
  from: "client" | "ai";
  who: string;
  text: string;
  isTyping: boolean;
  isWA: boolean;
  typingLabel: string;
  nowLabel: string;
}) {
  return (
    <div className={`neo-msg-row is-${side}`}>
      <div
        className={[
          "neo-social-bubble",
          from === "ai" ? "is-ai" : "is-client",
          isTyping ? "is-typing" : "",
          isWA ? "neo-wa-bubble" : "",
        ].join(" ")}
      >
        <div className="neo-social-who">{who}</div>

        <div className="neo-social-text">
          {isTyping ? (
            <span className="neo-typingDots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          ) : (
            text
          )}
        </div>

        <div className="neo-social-time">{isTyping ? typingLabel : nowLabel}</div>
      </div>
    </div>
  );
});

function SocialThread({
  platform,
  script,
  baseSpeedMs = 900,
  clientName,
  agentName,
  active = true,
  ariaLabel,
  typingLabel,
  nowLabel,
}: {
  platform: Plat;
  script: SocialMsg[];
  baseSpeedMs?: number;
  clientName: string;
  agentName: string;
  active?: boolean;
  ariaLabel: string;
  typingLabel: string;
  nowLabel: string;
}) {
  const isWA = platform === "WHATSAPP";
  const platformLower = platform.toLowerCase();

  const [count, setCount] = useState(0);
  const [typing, setTyping] = useState<"client" | "ai" | null>(null);

  const timersRef = useRef<number[]>([]);
  const clearAll = () => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  };

  const rand = (a: number, b: number) => a + Math.random() * (b - a);
  const jitter = (ms: number, j = 220) => Math.max(200, Math.floor(ms + rand(-j, j)));

  const MAX_VISIBLE = useMemo(() => (platform === "WHATSAPP" ? 4 : 5), [platform]);
  const startIndex = Math.max(0, count - MAX_VISIBLE);

  const shown = useMemo(() => {
    const all = script.slice(0, count);
    return all.slice(-MAX_VISIBLE);
  }, [script, count, MAX_VISIBLE]);

  // Pre-render list once per "shown" change (typing does NOT re-render this list)
  const renderedShown = useMemo(() => {
    return shown.map((m, i) => {
      const side = m.from === "ai" ? "right" : "left";
      const who = m.from === "client" ? clientName : agentName;
      const idx = startIndex + i;
      return (
        <MsgBubble
          key={`${platform}-${idx}`}
          side={side}
          from={m.from}
          who={who}
          text={m.text}
          isTyping={false}
          isWA={isWA}
          typingLabel={typingLabel}
          nowLabel={nowLabel}
        />
      );
    });
  }, [shown, startIndex, platform, clientName, agentName, isWA, typingLabel, nowLabel]);

  useEffect(() => {
    clearAll();

    if (!active) {
      setCount(0);
      setTyping(null);
      return () => clearAll();
    }

    if (count >= script.length) {
      // reset loop
      const tReset = window.setTimeout(() => {
        setTyping(null);
        setCount(0);
      }, jitter(1400, 360));
      timersRef.current.push(tReset);
      return () => clearAll();
    }

    const next = script[count];

    // 1) show typing indicator briefly
    const tTyping = window.setTimeout(() => {
      setTyping(next.from);
    }, jitter(420, 180));

    // 2) commit message as a whole (no per-char)
    const typingDur = Math.min(1100, Math.max(420, Math.floor(next.text.length * 18)));
    const tCommit = window.setTimeout(() => {
      setTyping(null);
      setCount((c) => c + 1);
    }, jitter(420 + typingDur + baseSpeedMs * 0.2, 240));

    timersRef.current.push(tTyping, tCommit);
    return () => clearAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, script, baseSpeedMs, active]);

  const Pill = () => {
    const src =
      platform === "WHATSAPP"
        ? "/image/photo.1.webp"
        : platform === "FACEBOOK"
          ? "/image/photo.2.png"
          : "/image/photo.3.png";

    const alt =
      platform === "WHATSAPP"
        ? "WhatsApp Business"
        : platform === "FACEBOOK"
          ? "Facebook Messenger"
          : "Instagram DM";

    return (
      <div className={`neo-pill neo-pill--logo neo-pill-${platformLower}`} aria-label={alt} title={alt}>
        <img className="neo-pill-logo" src={src} alt={alt} loading="lazy" decoding="async" />
      </div>
    );
  };

  return (
    <div className={`neo-social-card is-${platformLower}`} style={{ position: "relative" }}>
      <div className="neo-social-card-head">
        <Pill />
        <div className={`neo-auto neo-auto-${platformLower}`}>
          <span className="neo-auto-dot" /> AVTOMAT
        </div>
      </div>

      <div className="neo-social-card-body" role="log" aria-label={ariaLabel}>
        {renderedShown}

        {typing && (
          <MsgBubble
            key="typing"
            side={typing === "ai" ? "right" : "left"}
            from={typing}
            who={typing === "client" ? clientName : agentName}
            text=""
            isTyping={true}
            isWA={isWA}
            typingLabel={typingLabel}
            nowLabel={nowLabel}
          />
        )}
      </div>
    </div>
  );
}
const SocialThreadMemo = memo(SocialThread);

/* ========================= PIPELINE DIAGRAM ========================= */
const PipelineDiagramMemo = memo(function PipelineDiagram({
  reduced,
  platform,
  t,
}: {
  reduced: boolean;
  platform: Plat;
  t: (key: string, opts?: any) => any;
}) {
  const src = useMemo(() => {
    if (platform === "WHATSAPP")
      return { k: "wa", name: t("home.pipeline.platforms.whatsapp"), icon: "/image/photo.1.webp" };
    if (platform === "FACEBOOK")
      return { k: "ms", name: t("home.pipeline.platforms.messenger"), icon: "/image/photo.2.png" };
    return { k: "ig", name: t("home.pipeline.platforms.instagram"), icon: "/image/photo.3.png" };
  }, [platform, t]);

  return (
    <div className={`neo-pipe ${reduced ? "neo-pipe--still" : ""}`} aria-hidden="true">
      <div className="neo-pipe-row neo-pipe-row--src" style={{ display: "flex", justifyContent: "center" }}>
        <div style={{ position: "relative", display: "inline-flex", justifyContent: "center" }}>
          <div className={`neo-pipe-pill neo-pipe-pill--${src.k}`}>
            <span className="neo-pipe-icon">
              <img src={src.icon} alt={String(src.name)} style={{ width: 18, height: 18 }} loading="lazy" decoding="async" />
            </span>
            <span className="neo-pipe-name">{src.name}</span>
          </div>

          <span data-connector="in-active" aria-hidden="true" className="neo-connectorDot" />
        </div>
      </div>

      <div className="neo-pipe-rails">
        <div className="neo-pipe-rail neo-pipe-rail--m" />
        {!reduced && <span className="neo-pipe-dot neo-pipe-dot--m" />}
      </div>

      <div className="neo-pipe-processor">
        <div className="neo-pipe-core">
          <div className="neo-pipe-coreTop">NEOX</div>
          <div className="neo-pipe-coreMid">{t("home.pipeline.core.mid")}</div>
          <div className="neo-pipe-coreBot">{t("home.pipeline.core.bot")}</div>
        </div>
        {!reduced && (
          <>
            <span className="neo-pipe-pulse neo-pipe-pulse--1" />
            <span className="neo-pipe-pulse neo-pipe-pulse--2" />
          </>
        )}
      </div>

      <div className="neo-pipe-out">
        <div className="neo-pipe-outRail neo-pipe-outRail--crm" />
        <div className="neo-pipe-outRail neo-pipe-outRail--ops" />
        {!reduced && (
          <>
            <span className="neo-pipe-outDot neo-pipe-outDot--crm" />
            <span className="neo-pipe-outDot neo-pipe-outDot--ops" />
          </>
        )}
      </div>

      <div className="neo-pipe-row neo-pipe-row--sink">
        <div className="neo-pipe-node neo-pipe-node--sink neo-pipe-node--crm">
          <div className="neo-pipe-sinkTitle">{t("home.pipeline.sinks.crm.title")}</div>
          <div className="neo-pipe-sinkSub">{t("home.pipeline.sinks.crm.sub")}</div>
          <div className="neo-pipe-sinkMini">{t("home.pipeline.sinks.crm.mini")}</div>
        </div>

        <div className="neo-pipe-node neo-pipe-node--sink neo-pipe-node--ops">
          <div className="neo-pipe-sinkTitle">{t("home.pipeline.sinks.ops.title")}</div>
          <div className="neo-pipe-sinkSub">{t("home.pipeline.sinks.ops.sub")}</div>
          <div className="neo-pipe-sinkMini">{t("home.pipeline.sinks.ops.mini")}</div>
        </div>
      </div>
    </div>
  );
});

/* ========================= CONNECTOR OVERLAY (FPS MAX) =========================
   - Removed SVG blur filters + removed dash animation
   - Throttled harder
   - Recalc only when needed
*/
type P2 = { x: number; y: number };
const ConnectorOverlayMemo = memo(function ConnectorOverlay({
  enabled,
  rootRef,
}: {
  enabled: boolean;
  rootRef: React.RefObject<HTMLDivElement>;
}) {
  const [paths, setPaths] = useState<Array<{ id: string; d: string; a: P2; b: P2 }>>([]);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 1, h: 1 });

  const rafRef = useRef<number>(0);
  const roRef = useRef<ResizeObserver | null>(null);
  const lastRef = useRef<{ w: number; h: number; d: string } | null>(null);
  const lastRunRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const root = rootRef.current;
    if (!root) return;

    const pick = (sel: string) => rootRef.current?.querySelector<HTMLElement>(sel) ?? null;

    const snap = (n: number) => Math.round(n); // integer snap = cheaper
    const THROTTLE_MS = 160;

    const clear = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      roRef.current?.disconnect();
      roRef.current = null;
      lastRef.current = null;
      setPaths([]);
    };

    const calc = () => {
      const rootEl = rootRef.current;
      const elA = pick('[data-connector="tablet-out"]');
      const elB = pick('[data-connector="in-active"]');

      if (!rootEl || !elA || !elB) {
        if (lastRef.current?.d !== "") {
          lastRef.current = { w: 1, h: 1, d: "" };
          setPaths([]);
        }
        return;
      }

      const ww = Math.max(1, rootEl.clientWidth);
      const hh = Math.max(1, rootEl.clientHeight);

      const rr = rootEl.getBoundingClientRect();
      const ar = elA.getBoundingClientRect();
      const br = elB.getBoundingClientRect();

      const ax = snap(ar.left + ar.width / 2 - rr.left);
      const ay = snap(ar.top + ar.height / 2 - rr.top);

      const bx = snap(br.left + br.width / 2 - rr.left);
      const by = snap(br.top + br.height / 2 - rr.top);

      const midY = snap(ay + (by - ay) * 0.45);
      const d = `M ${ax} ${ay} L ${ax} ${midY} L ${bx} ${midY} L ${bx} ${by}`;

      const last = lastRef.current;
      if (last && last.w === ww && last.h === hh && last.d === d) return;

      lastRef.current = { w: ww, h: hh, d };
      setSize((s) => (s.w === ww && s.h === hh ? s : { w: ww, h: hh }));
      setPaths([{ id: "tablet-to-pipe", d, a: { x: ax, y: ay }, b: { x: bx, y: by } }]);
    };

    const schedule = () => {
      const now = performance.now();
      if (now - lastRunRef.current < THROTTLE_MS) return;
      lastRunRef.current = now;

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(calc);
    };

    schedule();
    const t1 = window.setTimeout(schedule, 140);
    const t2 = window.setTimeout(schedule, 360);

    window.addEventListener("resize", schedule);

    roRef.current = new ResizeObserver(() => schedule());
    roRef.current.observe(root);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("resize", schedule);
      clear();
    };
  }, [enabled, rootRef]);

  if (!enabled || paths.length === 0) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 60,
        width: "100%",
        height: "100%",
        background: "transparent",
        overflow: "hidden",
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${size.w} ${size.h}`}
        preserveAspectRatio="none"
        style={{ display: "block" }}
      >
        <defs>
          <linearGradient id="neoLineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="rgba(255,255,255,.90)" />
            <stop offset="0.5" stopColor="rgba(47,184,255,.95)" />
            <stop offset="1" stopColor="rgba(42,125,255,.95)" />
          </linearGradient>
        </defs>

        {paths.map((p) => {
          const a = p.a;
          const b = p.b;

          return (
            <g key={p.id}>
              {/* soft underglow (cheap) */}
              <path
                d={p.d}
                fill="none"
                stroke="rgba(47,184,255,.10)"
                strokeWidth={5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* main line */}
              <path
                d={p.d}
                fill="none"
                stroke="url(#neoLineGrad)"
                strokeWidth={2.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* endpoints */}
              <g>
                <circle cx={a.x} cy={a.y} r={10} fill="rgba(47,184,255,.10)" />
                <circle cx={a.x} cy={a.y} r={6.2} fill="rgba(0,0,0,0)" stroke="rgba(170,225,255,.88)" strokeWidth={2} />
                <circle cx={a.x} cy={a.y} r={2.8} fill="rgba(255,255,255,.92)" />
              </g>

              <g>
                <circle cx={b.x} cy={b.y} r={10} fill="rgba(42,125,255,.12)" />
                <circle cx={b.x} cy={b.y} r={6.6} fill="rgba(0,0,0,0)" stroke="rgba(170,225,255,.92)" strokeWidth={2} />
                <circle cx={b.x} cy={b.y} r={2.9} fill="rgba(255,255,255,.95)" />
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
});

/* ========================= SMM / OPS DIAGRAMS ========================= */
const SmmAutomationDiagramMemo = memo(function SmmAutomationDiagram({
  reduced,
  t,
}: {
  reduced: boolean;
  t: (k: string, o?: any) => any;
}) {
  return (
    <div className={`neo-diagramcard ${reduced ? "is-still" : ""}`} aria-hidden="true">
      <div className="neo-diag-top">
        <div className="neo-diag-chip">{t("home.smm.diagram.top.idea")}</div>
        <div className="neo-diag-chip">{t("home.smm.diagram.top.prepare")}</div>
        <div className="neo-diag-chip">{t("home.smm.diagram.top.publish")}</div>
      </div>

      <div className="neo-diag-grid">
        <div className="neo-diag-node neo-diag-node--src">
          <div className="neo-diag-ico">
            <span className="neo-icoDot neo-icoDot--ig" />
          </div>
          <div className="neo-diag-name">Instagram</div>
          <div className="neo-diag-sub">{t("home.smm.diagram.src.instagram")}</div>
        </div>

        <div className="neo-diag-node neo-diag-node--src">
          <div className="neo-diag-ico">
            <span className="neo-icoDot neo-icoDot--yt" />
          </div>
          <div className="neo-diag-name">YouTube</div>
          <div className="neo-diag-sub">{t("home.smm.diagram.src.youtube")}</div>
        </div>

        <div className="neo-diag-node neo-diag-node--src">
          <div className="neo-diag-ico">
            <span className="neo-icoDot neo-icoDot--fb" />
          </div>
          <div className="neo-diag-name">Facebook</div>
          <div className="neo-diag-sub">{t("home.smm.diagram.src.facebook")}</div>
        </div>

        <div className="neo-diag-core">
          <div className="neo-diag-coreTop">NEOX AI</div>
          <div className="neo-diag-coreMid">{t("home.smm.diagram.core.mid")}</div>
          <div className="neo-diag-coreBot">{t("home.smm.diagram.core.bot")}</div>
          {!reduced && (
            <>
              <span className="neo-diag-p neo-diag-p--1" />
              <span className="neo-diag-p neo-diag-p--2" />
              <span className="neo-diag-p neo-diag-p--3" />
            </>
          )}
        </div>

        <div className="neo-diag-node neo-diag-node--sink">
          <div className="neo-diag-name">{t("home.smm.diagram.sinks.calendar.title")}</div>
          <div className="neo-diag-sub">{t("home.smm.diagram.sinks.calendar.sub")}</div>
        </div>

        <div className="neo-diag-node neo-diag-node--sink">
          <div className="neo-diag-name">{t("home.smm.diagram.sinks.brand.title")}</div>
          <div className="neo-diag-sub">{t("home.smm.diagram.sinks.brand.sub")}</div>
        </div>

        <div className="neo-diag-node neo-diag-node--sink">
          <div className="neo-diag-name">{t("home.smm.diagram.sinks.report.title")}</div>
          <div className="neo-diag-sub">{t("home.smm.diagram.sinks.report.sub")}</div>
        </div>
      </div>

      <div className="neo-diag-foot" aria-hidden="true">
        <span className="neo-tchip">{t("home.smm.diagram.foot.caption")}</span>
        <span className="neo-tchip">{t("home.smm.diagram.foot.hashtag")}</span>
        <span className="neo-tchip">{t("home.smm.diagram.foot.plan")}</span>
        <span className="neo-tchip">{t("home.smm.diagram.foot.report")}</span>
      </div>
    </div>
  );
});

const OpsAutomationDiagramMemo = memo(function OpsAutomationDiagram({
  reduced,
  t,
}: {
  reduced: boolean;
  t: (k: string, o?: any) => any;
}) {
  return (
    <div className={`neo-diagramcard neo-diagramcard--ops ${reduced ? "is-still" : ""}`} aria-hidden="true">
      <div className="neo-opsline">
        <div className="neo-ops-pill">{t("home.ops.diagram.line.audit")}</div>
        <div className="neo-ops-pill">{t("home.ops.diagram.line.build")}</div>
        <div className="neo-ops-pill">{t("home.ops.diagram.line.monitor")}</div>
      </div>

      <div className="neo-ops-grid">
        <div className="neo-ops-box">
          <div className="neo-ops-k">{t("home.ops.diagram.boxes.signals.k")}</div>
          <div className="neo-ops-v">{t("home.ops.diagram.boxes.signals.v")}</div>
        </div>

        <div className="neo-ops-box neo-ops-box--core">
          <div className="neo-ops-k">NEOX</div>
          <div className="neo-ops-v">{t("home.ops.diagram.boxes.core.v")}</div>
          <div className="neo-ops-mini">{t("home.ops.diagram.boxes.core.mini")}</div>
          {!reduced && (
            <>
              <span className="neo-ops-p neo-ops-p--a" />
              <span className="neo-ops-p neo-ops-p--b" />
              <span className="neo-ops-p neo-ops-p--c" />
            </>
          )}
        </div>

        <div className="neo-ops-box">
          <div className="neo-ops-k">{t("home.ops.diagram.boxes.result.k")}</div>
          <div className="neo-ops-v">{t("home.ops.diagram.boxes.result.v")}</div>
        </div>
      </div>

      <div className="neo-ops-metrics" aria-hidden="true">
        <div className="neo-metric">
          <div className="neo-metricTop">{t("home.ops.diagram.metrics.sla.top")}</div>
          <div className="neo-metricMid">↑</div>
          <div className="neo-metricBot">{t("home.ops.diagram.metrics.sla.bot")}</div>
        </div>
        <div className="neo-metric">
          <div className="neo-metricTop">{t("home.ops.diagram.metrics.quality.top")}</div>
          <div className="neo-metricMid">↑</div>
          <div className="neo-metricBot">{t("home.ops.diagram.metrics.quality.bot")}</div>
        </div>
        <div className="neo-metric">
          <div className="neo-metricTop">{t("home.ops.diagram.metrics.cost.top")}</div>
          <div className="neo-metricMid">↓</div>
          <div className="neo-metricBot">{t("home.ops.diagram.metrics.cost.bot")}</div>
        </div>
      </div>
    </div>
  );
});

/* ========================= SOCIAL + PIPELINE + SMM + OPS + FINAL CTA ========================= */
const SocialAutomationSectionMemo = memo(function SocialAutomationSection({
  reducedMotion = false,
  isMobile = false,
  t,
  lang,
}: {
  reducedMotion?: boolean;
  isMobile?: boolean;
  t: (k: string, o?: any) => any;
  lang: Lang;
}) {
  const demos = useMemo(() => {
    const obj = t("home.social.demos", { returnObjects: true }) as Record<string, SocialMsg[]>;
    return obj as Record<Plat, SocialMsg[]>;
  }, [t]);

  const order = useMemo(() => ["WHATSAPP", "FACEBOOK", "INSTAGRAM"] as const, []);
  const [platform, setPlatform] = useState<Plat>("WHATSAPP");

  useEffect(() => {
    if (reducedMotion) return;
    const tmr = window.setInterval(() => {
      setPlatform((p) => {
        const i = order.indexOf(p);
        return order[(i + 1) % order.length];
      });
    }, 3600);
    return () => window.clearInterval(tmr);
  }, [order, reducedMotion]);

  const visibleScript = useMemo(() => demos[platform].slice(-4), [demos, platform]);

  const meta = useMemo(() => {
    if (platform === "WHATSAPP") return { dot: "rgba(170,225,255,.95)", clientName: t("home.social.clientName.whatsapp") as string };
    if (platform === "FACEBOOK") return { dot: "rgba(47,184,255,.95)", clientName: t("home.social.clientName.default") as string };
    return { dot: "rgba(42,125,255,.95)", clientName: t("home.social.clientName.default") as string };
  }, [platform, t]);

  const BOX = isMobile ? 360 : 520;

  const socialGridStyle = useMemo<React.CSSProperties>(
    () => ({
      display: "grid",
      gridTemplateColumns: isMobile ? "minmax(0, 1fr)" : "minmax(340px, 1fr) minmax(0, 540px)",
      gap: "clamp(18px, 3vw, 34px)",
      alignItems: "start",
    }),
    [isMobile]
  );

  const pipelineGridStyle = useMemo<React.CSSProperties>(
    () => ({
      display: "grid",
      gridTemplateColumns: isMobile ? "minmax(0, 1fr)" : "minmax(0, 1fr) minmax(0, 440px)",
      gap: "clamp(16px, 2.8vw, 32px)",
      alignItems: "center",
    }),
    [isMobile]
  );

  return (
    <>
      {/* SOCIAL */}
      <section className="neo-social neo-social--premium" aria-label={t("home.social.aria")}>
        <div className="container" style={{ overflowX: "visible" }}>
          <div className="neo-social-grid" style={socialGridStyle}>
            <header className="neo-sectionHead" style={{ textAlign: "left", minWidth: 0 }}>
              <div className="neo-kickerPill reveal reveal-top">
                <span className="neo-kdot" aria-hidden="true" />
                <span className="neo-kickerPillText">{t("home.social.kicker")}</span>
              </div>

              <h2 className="neo-h2 neo-h2-premium reveal reveal-top">
                {t("home.social.title.p1")} <span className="neo-gradient">{t("home.social.title.grad1")}</span>{" "}
                <span className="neo-plusWhite" aria-hidden="true">
                  +
                </span>{" "}
                {t("home.social.title.p2")} <span className="neo-gradient">{t("home.social.title.grad2")}</span>{" "}
                {t("home.social.title.p3")}
              </h2>

              <p className="neo-p neo-p--lead reveal reveal-top" style={{ marginBottom: 18 }}>
                {t("home.social.lead")}
              </p>

              <div className="neo-actions reveal reveal-top" style={{ justifyContent: "flex-start", flexWrap: "wrap", gap: 10 }}>
                <Link className="neo-btn neo-btn-primary neo-btn--premium neo-btn--unified" to={withLang("/contact", lang)}>
                  {t("home.cta.demo")}
                </Link>
                <a className="neo-btn neo-btn--premium neo-btn--unified" href="#pipeline">
                  {t("home.cta.how")}
                </a>
              </div>
            </header>

            <div style={{ width: "100%", maxWidth: BOX, justifySelf: isMobile ? "start" : "end", marginTop: isMobile ? 10 : 0, minWidth: 0 }}>
              <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", minWidth: 0 }}>
                <div className="neo-tabletCard neo-tabletCard--premium" style={{ width: "100%", height: "100%" } as React.CSSProperties}>
                  <div className="neo-tabletTop" aria-hidden="true">
                    <span className="neo-tabletCamPill">
                      <i className="neo-tabletCamDot" />
                    </span>
                    <span className="neo-tabletStatus" aria-hidden="true">
                      <i className="neo-tabletLiveDot" style={{ background: meta.dot }} />
                    </span>
                  </div>

                  <div className="neo-tabletScreen">
                    <div className="neo-tabletScreenInner">
                      <SocialThreadMemo
                        platform={platform}
                        script={visibleScript}
                        baseSpeedMs={900}
                        clientName={meta.clientName}
                        agentName={t("home.social.agentName")}
                        active={!reducedMotion}
                        ariaLabel={t("home.social.threadAria", { platform })}
                        typingLabel={t("home.social.typing")}
                        nowLabel={t("home.social.now")}
                      />
                    </div>
                  </div>

                  <div className="neo-tabletBottom" aria-hidden="true">
                    <span className="neo-tabletPort" />
                    <span className="neo-tabletHome" />
                  </div>

                  <div className="neo-tabletVignette" aria-hidden="true" />
                  <div className="neo-tabletShine" aria-hidden="true" />
                </div>

                <span data-connector="tablet-out" aria-hidden="true" className="neo-connectorDot neo-connectorDot--tablet" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PIPELINE */}
      <section id="pipeline" className="neo-pipeline neo-pipeline--premium" aria-label={t("home.pipeline.aria")}>
        <div className="container" style={{ overflowX: "visible" }}>
          <div className="neo-pipeline-grid neo-pipeline-grid--tight" style={pipelineGridStyle}>
            <div className="neo-pipeline-left" style={{ minWidth: 0 }}>
              <PipelineDiagramMemo reduced={reducedMotion} platform={platform} t={t} />
            </div>

            <aside className="neo-pipeline-right neo-pipeline-right--center" style={{ minWidth: 0 }}>
              <div className="neo-kickerPill neo-kickerPill--fit reveal reveal-top">
                <span className="neo-kdot" aria-hidden="true" />
                <span className="neo-kickerPillText">{t("home.pipeline.kicker")}</span>
              </div>

              <h3 className="neo-h3 neo-h3--tight reveal reveal-top">
                {t("home.pipeline.title.p1")} <span className="neo-gradient">{t("home.pipeline.title.grad")}</span>{" "}
                {t("home.pipeline.title.p2")}
              </h3>

              <p className="neo-p neo-p--tight reveal reveal-top">{t("home.pipeline.copy")}</p>

              <button
                type="button"
                className="neo-ai-ask reveal reveal-top neo-btn--premium neo-btn--unified"
                onClick={() => window.dispatchEvent(new CustomEvent("neox-ai:open"))}
              >
                {t("home.pipeline.brief")}
              </button>
            </aside>
          </div>
        </div>
      </section>

      {/* SMM */}
      <section className="neo-splitsec neo-splitsec--premium" aria-label={t("home.smm.aria")}>
        <div className="container" style={{ overflowX: "visible" }}>
          <div className="neo-splitsec-grid">
            <div className="neo-splitsec-copy" style={{ minWidth: 0 }}>
              <div className="neo-kickerPill reveal reveal-top">
                <span className="neo-kdot" aria-hidden="true" />
                <span className="neo-kickerPillText">{t("home.smm.kicker")}</span>
              </div>

              <h3 className="neo-h3 reveal reveal-top">
                {t("home.smm.title.p1")} <span className="neo-gradient">{t("home.smm.title.grad")}</span>
              </h3>

              <p className="neo-p reveal reveal-top">{t("home.smm.copy")}</p>

              <div className="neo-actions reveal reveal-top" style={{ justifyContent: "flex-start", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
                <Link className="neo-btn neo-btn-primary neo-btn--premium neo-btn--unified" to={withLang("/contact", lang)}>
                  {t("home.smm.cta.primary")}
                </Link>
                <button
                  type="button"
                  className="neo-btn neo-btn--premium neo-btn--unified"
                  onClick={() => window.dispatchEvent(new CustomEvent("neox-ai:open"))}
                >
                  {t("home.smm.cta.secondary")}
                </button>
              </div>
            </div>

            <div className="neo-splitsec-visual reveal reveal-bottom" style={{ minWidth: 0 }}>
              <SmmAutomationDiagramMemo reduced={reducedMotion} t={t} />
            </div>
          </div>
        </div>
      </section>

      {/* OPS */}
      <section className="neo-splitsec neo-splitsec--alt neo-splitsec--premium" aria-label={t("home.ops.aria")}>
        <div className="container" style={{ overflowX: "visible" }}>
          <div className="neo-splitsec-grid neo-splitsec-grid--flip">
            <div className="neo-splitsec-copy" style={{ minWidth: 0 }}>
              <div className="neo-kickerPill reveal reveal-top">
                <span className="neo-kdot" aria-hidden="true" />
                <span className="neo-kickerPillText">{t("home.ops.kicker")}</span>
              </div>

              <h3 className="neo-h3 reveal reveal-top">
                {t("home.ops.title.p1")} <span className="neo-gradient">{t("home.ops.title.grad")}</span>{" "}
                {t("home.ops.title.p2")}
              </h3>

              <p className="neo-p reveal reveal-top">{t("home.ops.copy")}</p>

              <button
                type="button"
                className="neo-ai-ask reveal reveal-top neo-btn--premium neo-btn--unified"
                onClick={() => window.dispatchEvent(new CustomEvent("neox-ai:open"))}
              >
                {t("home.ops.cta")}
              </button>
            </div>

            <div className="neo-splitsec-visual reveal reveal-bottom" style={{ minWidth: 0 }}>
              <OpsAutomationDiagramMemo reduced={reducedMotion} t={t} />
            </div>
          </div>
        </div>
      </section>

      {/* FINAL */}
      <section className="neo-finalSystem" aria-label={t("home.final.aria")}>
        <div className="container" style={{ overflowX: "visible" }}>
          <div className="neo-finalSystem-head reveal reveal-top">
            <div className="neo-kickerPill">
              <span className="neo-kdot" aria-hidden="true" />
              <span className="neo-kickerPillText">{t("home.final.kicker")}</span>
            </div>

            <h3 className="neo-h2 neo-h2-premium" style={{ marginTop: 12 }}>
              {t("home.final.title.p1")} <span className="neo-gradient">{t("home.final.title.grad1")}</span>{" "}
              {t("home.final.title.p2")} <span className="neo-gradient">{t("home.final.title.grad2")}</span>{" "}
              {t("home.final.title.p3")}
            </h3>

            <p className="neo-p neo-p--lead reveal reveal-top" style={{ maxWidth: 920, margin: "12px auto 0" }}>
              {t("home.final.copy")}
            </p>
          </div>

          <div className="neo-finalBlocks reveal reveal-bottom" style={{ marginTop: 18 }}>
            <div className="neo-finalBlock neo-finalBlock--a">
              <div className="neo-finalBlockTop">{t("home.final.blocks.a.top")}</div>
              <div className="neo-finalBlockMid">
                {t("home.final.blocks.a.mid.p1")} <span className="neo-gradient">{t("home.final.blocks.a.mid.grad")}</span>
              </div>
              <div className="neo-finalBlockBot">{t("home.final.blocks.a.bot")}</div>
            </div>

            <div className="neo-finalBlock neo-finalBlock--b">
              <div className="neo-finalBlockTop">{t("home.final.blocks.b.top")}</div>
              <div className="neo-finalBlockMid">
                {t("home.final.blocks.b.mid.p1")} <span className="neo-gradient">{t("home.final.blocks.b.mid.grad")}</span>{" "}
                {t("home.final.blocks.b.mid.p2")}
              </div>
              <div className="neo-finalBlockBot">{t("home.final.blocks.b.bot")}</div>
            </div>

            <div className="neo-finalBlock neo-finalBlock--c">
              <div className="neo-finalBlockTop">{t("home.final.blocks.c.top")}</div>
              <div className="neo-finalBlockMid">
                {t("home.final.blocks.c.mid.p1")} <span className="neo-gradient">{t("home.final.blocks.c.mid.grad")}</span>{" "}
                {t("home.final.blocks.c.mid.p2")}
              </div>
              <div className="neo-finalBlockBot">{t("home.final.blocks.c.bot")}</div>
            </div>
          </div>

          <div className="neo-finalSystem-actions reveal reveal-top" style={{ marginTop: 18, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link className="neo-btn neo-btn-primary neo-btn--premium neo-btn--unified" to={withLang("/contact", lang)}>
              {t("home.final.cta.primary")}
            </Link>

            <button
              type="button"
              className="neo-btn neo-btn--premium neo-btn--unified"
              onClick={() => window.dispatchEvent(new CustomEvent("neox-ai:open"))}
            >
              {t("home.final.cta.secondary")}
            </button>
          </div>
        </div>
      </section>
    </>
  );
});

/* ========================= HOME CSS (FPS MAX) =========================
   - removed heavy blur transitions
   - reduced shadows
   - added content-visibility for below-fold sections
   - typing dots pure CSS
*/
const HOME_CSS = `
  .neox-home.neox-home--black{ background:#000 !important; }
  .neox-home{
    --neo-c2: rgba(47,184,255,1);
    --neo-c3: rgba(42,125,255,1);
    background:#000 !important;
  }

  .neo-gradient{
    background: linear-gradient(90deg,#ffffff 0%,rgba(170,225,255,.96) 34%,rgba(47,184,255,.95) 68%,rgba(42,125,255,.95) 100%);
    -webkit-background-clip:text;
    background-clip:text;
    color: transparent;
  }

  .neo-plusWhite{
    color: rgba(255,255,255,.92);
    font-weight: 720;
    text-shadow: 0 10px 24px rgba(0,0,0,.55);
  }

  .neo-kickerPill{
    display:inline-flex; align-items:center; gap:10px;
    padding:10px 14px; border-radius:999px;
    border:1px solid rgba(255,255,255,.12);
    background: rgba(255,255,255,.03);
    box-shadow: 0 10px 34px rgba(0,0,0,.52);
    width: fit-content;
    max-width: 100%;
  }
  .neo-kickerPill--fit{ padding: 9px 12px; }

  .neo-kickerPillText{
    font-size:12px; font-weight:460; letter-spacing:.14em;
    text-transform:uppercase; color: rgba(255,255,255,.74);
    white-space: nowrap;
  }
  .neo-kdot{
    width:8px; height:8px; border-radius:999px;
    background: linear-gradient(180deg, var(--neo-c2), var(--neo-c3));
    box-shadow: 0 0 0 3px rgba(47,184,255,.10);
    flex:0 0 auto;
  }

  :root{ --neo-header-h: 80px; }

  .neo-btn--unified{
    border: 1px solid rgba(255,255,255,.12) !important;
    background: rgba(255,255,255,.03) !important;
    color: rgba(255,255,255,.92) !important;
    box-shadow: 0 10px 34px rgba(0,0,0,.52) !important;
    border-radius: 999px !important;
  }
  .neo-btn--unified.neo-btn-primary{
    border-color: rgba(47,184,255,.26) !important;
    background: linear-gradient(180deg, rgba(47,184,255,.16), rgba(42,125,255,.10)) !important;
  }
  .neo-btn--unified:hover{
    border-color: rgba(47,184,255,.30) !important;
    background: rgba(255,255,255,.045) !important;
  }
  .neo-btn--unified.neo-btn-primary:hover{
    border-color: rgba(47,184,255,.42) !important;
  }

  /* HERO */
  .neo-hero.neo-hero--full{
    height:100vh; min-height:100vh;
    display:grid; align-items:start;
    padding-top: calc(var(--neo-header-h) + clamp(34px, 6.5vh, 104px));
    padding-bottom: clamp(24px, 4vh, 44px);
    position:relative;
    background:#000;
    overflow: visible !important;
  }
  .neo-hero-inner{ position:relative; z-index:5; }

  .neo-title-main{ color: rgba(255,255,255,.96); font-weight:640; }
  .neo-sub{ font-weight:420; color: rgba(255,255,255,.74); max-width: 980px; margin: 14px auto 0; }
  .neo-heroCopyGap{ margin-bottom: 18px !important; }

  /* CHEAP enter: only opacity + transform (NO blur/filter) */
  .neo-hero-stagger{
    opacity:0;
    transform: translate3d(0, 12px, 0);
    transition: opacity .55s ease, transform .70s cubic-bezier(.2,.9,.2,1);
    will-change: transform, opacity;
  }
  .neo-page-enter .neo-hero-stagger{ opacity:1; transform: translate3d(0,0,0); }
  .neo-hero-stagger.s1{ transition-delay:.06s; }
  .neo-hero-stagger.s2{ transition-delay:.12s; }
  .neo-hero-stagger.s3{ transition-delay:.18s; }
  .neo-hero-stagger.s4{ transition-delay:.24s; }

  @media (prefers-reduced-motion: reduce){
    .neo-hero-stagger{ transition:none !important; opacity:1 !important; transform:none !important; }
  }

  .neo-afterHeroSpacer{ height: clamp(110px, 14vh, 180px); background:#000; }
  @media (max-width: 860px){ .neo-afterHeroSpacer{ height: clamp(130px, 18vh, 220px); } }

  /* Terminal strip */
  .neo-strip{ background:#000; padding:14px 0; position:relative; overflow:hidden; border-top: 1px solid rgba(255,255,255,.06); border-bottom: 1px solid rgba(255,255,255,.06); }
  .neo-stripFade{ position:absolute; top:0; bottom:0; width:130px; pointer-events:none; z-index:2; }
  .neo-stripFade.l{ left:0; background: linear-gradient(90deg, #000, transparent); }
  .neo-stripFade.r{ right:0; background: linear-gradient(270deg, #000, transparent); }

  .neo-stripTrack{
    position:relative; z-index:1;
    display:inline-flex; width:max-content; white-space:nowrap;
    transform: translate3d(0,0,0);
    will-change: transform;
    animation: neoHomeMarquee 26s linear infinite;
    padding-left: 16px;
  }
  @media (max-width: 860px){ .neo-stripTrack{ animation-duration: 32s; } }
  @media (prefers-reduced-motion: reduce){ .neo-stripTrack{ animation:none !important; } }

  .neo-stripWord{
    color: rgba(255,255,255,.56);
    font-size: 14px;
    font-weight: 700;
    letter-spacing: .22em;
    padding: 0 18px;
    text-transform: uppercase;
    flex: 0 0 auto;
  }

  /* content-visibility => HUGE fps gain on long sections */
  .neo-social, .neo-pipeline, .neo-splitsec, .neo-finalSystem{
    content-visibility: auto;
    contain-intrinsic-size: 900px;
  }

  /* pipeline bits */
  .neo-pipe-pill{
    display:inline-flex;
    align-items:center;
    gap:12px;
    padding:12px 14px;
    border-radius:18px;
    background: rgba(255,255,255,.04);
    border: 1px solid rgba(255,255,255,.10);
    box-shadow: 0 12px 34px rgba(0,0,0,.54), inset 0 1px 0 rgba(255,255,255,.06);
  }
  .neo-pipe-icon{
    width:34px; height:34px; border-radius:12px;
    display:grid; place-items:center;
    background: rgba(255,255,255,.06);
    border: 1px solid rgba(255,255,255,.10);
    flex:0 0 auto;
  }
  .neo-pipe-name{ font-weight: 720; letter-spacing: .01em; }

  /* connector dots */
  .neo-connectorDot{
    position:absolute;
    left:50%;
    width:12px;
    height:12px;
    transform: translateX(-50%);
    border-radius:999px;
    background: rgba(255,255,255,.95);
    box-shadow: 0 0 0 2px rgba(47,184,255,.24), 0 0 18px rgba(47,184,255,.40);
    pointer-events:none;
    z-index:5;
  }
  .neo-connectorDot{ top:-8px; }
  .neo-connectorDot--tablet{ bottom:-10px; top:auto; }

  /* typing dots (no JS) */
  .neo-typingDots{
    display:inline-flex;
    align-items:center;
    gap:6px;
    transform: translate3d(0,0,0);
  }
  .neo-typingDots i{
    width:6px; height:6px; border-radius:999px;
    background: rgba(255,255,255,.70);
    opacity:.45;
    animation: neoDot 1.05s ease-in-out infinite;
  }
  .neo-typingDots i:nth-child(2){ animation-delay: .12s; }
  .neo-typingDots i:nth-child(3){ animation-delay: .24s; }

  @media (prefers-reduced-motion: reduce){
    .neo-typingDots i{ animation:none !important; opacity:.65; }
  }

  /* final blocks */
  .neo-finalBlocks{
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
  }
  @media (max-width: 980px){ .neo-finalBlocks{ grid-template-columns: 1fr; } }

  .neo-finalBlock{
    border-radius: 22px;
    border: 1px solid rgba(255,255,255,.10);
    background: linear-gradient(180deg, rgba(255,255,255,.032), rgba(255,255,255,.018));
    box-shadow: 0 12px 40px rgba(0,0,0,.56);
    padding: 16px;
    position: relative;
    overflow: hidden;
    transform: translate3d(0,0,0) scale(1);
    transition: transform .18s ease, border-color .18s ease;
    will-change: transform;
  }
  .neo-finalBlock::before{
    content:"";
    position:absolute; inset:-40% -30%;
    opacity:0;
    transform: translate3d(-10px,0,0);
    transition: opacity .18s ease, transform .18s ease;
    background:
      radial-gradient(520px 220px at 20% 0%, rgba(255,255,255,.10), transparent 70%),
      radial-gradient(520px 220px at 80% 0%, rgba(47,184,255,.10), transparent 70%);
    pointer-events:none;
  }
  .neo-finalBlock:hover{
    transform: translate3d(0,-10px,0) scale(1.02);
    border-color: rgba(47,184,255,.22);
  }
  .neo-finalBlock:hover::before{ opacity:1; transform: translate3d(0,0,0); }

  .neo-finalBlockTop{
    color: rgba(255,255,255,.70);
    font-weight: 750;
    letter-spacing:.14em;
    font-size:12px;
    text-transform: uppercase;
  }
  .neo-finalBlockMid{
    margin-top: 10px;
    font-weight: 750;
    font-size: 26px;
    letter-spacing: -.02em;
    line-height: 1.18;
  }
  .neo-finalBlockBot{
    margin-top: 8px;
    color: rgba(255,255,255,.64);
    line-height: 1.6;
    font-size: 13.5px;
    font-weight: 450;
  }

  /* marquee */
  @keyframes neoHomeMarquee{
    from{ transform: translate3d(0,0,0); }
    to{ transform: translate3d(-50%,0,0); }
  }
  @keyframes neoDot{
    0%, 100%{ transform: translateY(0); opacity:.38; }
    50%{ transform: translateY(-2px); opacity:.85; }
  }
`;

/* ========================= HOME ========================= */
export default function Home() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const lang = useMemo(() => getLangFromPath(pathname), [pathname]);

  const reduced = usePrefersReducedMotion();
  const isMobile = useMedia("(max-width: 860px)", false);
  useScrollTopOnMount();
  useRevealIO(!reduced);

  const [enter, setEnter] = useState(false);
  useEffect(() => {
    const tt = window.setTimeout(() => setEnter(true), 40);
    return () => window.clearTimeout(tt);
  }, []);

  const flowRef = useRef<HTMLDivElement>(null);

  const ticks = useMemo(() => {
    const arr = t("home.strip.ticks", { returnObjects: true }) as string[];
    return Array.isArray(arr) ? arr : [];
  }, [t]);

  // FPS MAX RULES:
  // - Overlay only on big desktop, and no expensive filters
  const overlayEnabled = !reduced && !isMobile && window.innerWidth >= 1100;

  // Hero background intensity lower = smoother
  const heroIntensity = reduced || isMobile ? 0 : 0.78;

  return (
    <main
      className={cx("neox-home neox-home--black", enter ? "neo-page-enter" : "")}
      style={{
        width: "100%",
        background: "#000",
        overflowX: "clip",
        overflowY: "visible",
        position: "relative",
      }}
    >
      <style>{HOME_CSS}</style>

      {/* HERO */}
      <section className="neo-hero neo-hero--full">
        <div className="neo-heroMatrix" aria-hidden="true">
          <HeroSystemBackground className="neo-heroBg" intensity={heroIntensity} />
        </div>

        <div className="container neo-hero-inner">
          <div className="neo-hero-copy neo-hero-copy--center">
            <div style={{ display: "flex", justifyContent: "center" }} className="neo-hero-stagger s1">
              <div className="neo-kickerPill">
                <span className="neo-kdot" aria-hidden="true" />
                <span className="neo-kickerPillText">{t("home.hero.kicker")}</span>
              </div>
            </div>

            <h1 className="neo-title neo-title-premium neo-title--stack neo-hero-stagger s2" style={{ marginTop: 16 }}>
              <span className="neo-title-main">{t("home.hero.title.line1")}</span>
              <span className="neo-title-main">
                <span className="neo-gradient">{t("home.hero.title.line2")}</span>
              </span>
            </h1>

            <p className="neo-sub neo-hero-stagger s3 neo-heroCopyGap">{t("home.hero.sub")}</p>

            <div className="neo-actions neo-hero-stagger s4" style={{ justifyContent: "center", flexWrap: "wrap", gap: 10 }}>
              <Link className="neo-btn neo-btn-primary neo-btn--premium neo-btn--unified" to={withLang("/contact", lang)}>
                {t("home.cta.start")}
              </Link>
              <a className="neo-btn neo-btn--premium neo-btn--unified" href="#pipeline">
                {t("home.cta.how")}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* spacer */}
      <div className="neo-afterHeroSpacer" aria-hidden="true" />

      {/* terminal strip */}
      <section className="neo-strip" aria-label={t("home.strip.aria")}>
        <div className="neo-stripFade l" />
        <div className="neo-stripFade r" />

        <div className="neo-stripTrack" aria-hidden="true" style={reduced ? { animation: "none" } : undefined}>
          {ticks.map((tt, i) => (
            <span key={`s1-${i}`} className="neo-stripWord">
              {tt}
            </span>
          ))}
          {ticks.map((tt, i) => (
            <span key={`s2-${i}`} className="neo-stripWord">
              {tt}
            </span>
          ))}
        </div>
      </section>

      <div style={{ height: "clamp(22px, 3.5vh, 46px)", background: "#000" }} />

      {/* flow + connector */}
      <div
        ref={flowRef}
        className="neo-flowWrap"
        style={{
          position: "relative",
          overflowX: "clip",
          overflowY: "visible",
          background: "#000",
          border: 0,
          boxShadow: "none",
          zIndex: 2,
        }}
      >
        <div style={{ position: "relative", zIndex: 2 }}>
          <SocialAutomationSectionMemo reducedMotion={reduced} isMobile={isMobile} t={t} lang={lang} />
        </div>
        <ConnectorOverlayMemo enabled={overlayEnabled} rootRef={flowRef} />
      </div>
    </main>
  );
}
 