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
  // path: "/contact" və ya "contact"
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

/* ---------------- Media (perf safe) ---------------- */
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

/* ---------------- Scroll restore (harada qalmısansa ora) ---------------- */
function useScrollRestore(key: string) {
  // mount: restore
  useEffect(() => {
    const raw = sessionStorage.getItem(key);
    const y = raw ? Number(raw) : 0;

    // 1 frame gözlə: layout hazır olsun
    const raf = requestAnimationFrame(() => {
      if (Number.isFinite(y) && y > 0) window.scrollTo({ top: y, left: 0, behavior: "auto" });
    });

    return () => cancelAnimationFrame(raf);
  }, [key]);

  // unmount + scroll: save (throttle via rAF)
  useEffect(() => {
    let raf = 0;

    const save = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        sessionStorage.setItem(key, String(window.scrollY || 0));
      });
    };

    window.addEventListener("scroll", save, { passive: true });

    return () => {
      window.removeEventListener("scroll", save);
      if (raf) cancelAnimationFrame(raf);
      // son dəfə də save et
      sessionStorage.setItem(key, String(window.scrollY || 0));
    };
  }, [key]);
}

/* ---------------- Premium wheel scroll (PERF SAFE) ---------------- */
function usePremiumWheelScroll(enabled: boolean) {
  const rafRef = useRef<number | null>(null);
  const targetRef = useRef<number>(0);
  const currentRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (prefersReduced) return;
    if (window.innerWidth < 980) return;

    const fine = window.matchMedia?.("(pointer: fine)")?.matches;
    const hover = window.matchMedia?.("(hover: hover)")?.matches;
    if (!fine || !hover) return;

    const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

    const DIST_MULT = 1.25;
    const DAMPING = 0.14;
    const MAX_STEP = 1500;

    const onWheel = (e: WheelEvent) => {
      const raw = e.deltaY;
      if (Math.abs(raw) < 18) return;
      if (Math.abs((e as any).deltaX || 0) > Math.abs(raw)) return;

      e.preventDefault();

      const step = clamp(raw * DIST_MULT, -MAX_STEP, MAX_STEP);
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

      targetRef.current = clamp((targetRef.current || window.scrollY) + step, 0, maxScroll);

      if (rafRef.current) return;

      currentRef.current = window.scrollY;

      const tick = () => {
        const cur = currentRef.current;
        const tgt = targetRef.current;
        const next = cur + (tgt - cur) * DAMPING;

        if (Math.abs(tgt - next) < 0.75) {
          window.scrollTo(0, tgt);
          currentRef.current = tgt;
          rafRef.current = null;
          return;
        }

        window.scrollTo(0, next);
        currentRef.current = next;
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    };

    targetRef.current = window.scrollY;
    window.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      window.removeEventListener("wheel", onWheel as any);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [enabled]);
}

/* ---------------- Reveal IO (PERF SAFE) ---------------- */
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
      { threshold: 0.14, rootMargin: "0px 0px -12% 0px" }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [enabled]);
}

/* ========================= SOCIAL DEMO ========================= */
type SocialMsg = { from: "client" | "ai"; text: string };
type Plat = "WHATSAPP" | "FACEBOOK" | "INSTAGRAM";

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
          isTyping ? "is-typing is-typewrite" : "",
          isWA ? "neo-wa-bubble" : "",
        ].join(" ")}
      >
        <div className="neo-social-who">{who}</div>
        <div className="neo-social-text">
          {text} {isTyping && <span className="neo-caret" aria-hidden="true" />}
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
  const [typingText, setTypingText] = useState("");

  const timersRef = useRef<number[]>([]);
  const clearAll = () => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  };

  const rand = (a: number, b: number) => a + Math.random() * (b - a);
  const jitter = (ms: number, j = 240) => Math.max(200, Math.floor(ms + rand(-j, j)));

  const MAX_VISIBLE = useMemo(() => (platform === "WHATSAPP" ? 4 : 5), [platform]);
  const startIndex = Math.max(0, count - MAX_VISIBLE);

  const shown = useMemo(() => {
    const all = script.slice(0, count);
    return all.slice(-MAX_VISIBLE);
  }, [script, count, MAX_VISIBLE]);

  useEffect(() => {
    clearAll();

    if (!active) {
      setCount(0);
      setTyping(null);
      setTypingText("");
      return () => clearAll();
    }

    if (count >= script.length) {
      const t = window.setTimeout(() => {
        setTyping(null);
        setTypingText("");
        setCount(0);
      }, jitter(1500, 420));
      timersRef.current.push(t);
      return () => clearAll();
    }

    const next = script[count];

    const tStart = window.setTimeout(() => {
      setTyping(next.from);
      setTypingText("");

      let i = 0;
      const perChar = () => Math.max(12, Math.floor(rand(16, 28)));

      const tick = () => {
        i++;
        setTypingText(next.text.slice(0, i));

        if (i < next.text.length) {
          const t = window.setTimeout(tick, perChar());
          timersRef.current.push(t);
          return;
        }

        const tCommit = window.setTimeout(() => {
          setCount((c) => c + 1);
          setTyping(null);
          setTypingText("");
        }, jitter(320, 160));
        timersRef.current.push(tCommit);
      };

      const tFirst = window.setTimeout(tick, jitter(baseSpeedMs, 220));
      timersRef.current.push(tFirst);
    }, jitter(520, 220));

    timersRef.current.push(tStart);
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
        <img className="neo-pill-logo" src={src} alt={alt} />
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
        {shown.map((m, i) => {
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
        })}

        {typing && (
          <MsgBubble
            key="typing"
            side={typing === "ai" ? "right" : "left"}
            from={typing}
            who={typing === "client" ? clientName : agentName}
            text={typingText.length ? typingText : "…"}
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
function PipelineDiagram({
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
          <div
            className={`neo-pipe-pill neo-pipe-pill--${src.k}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 14px",
              borderRadius: 18,
              width: "fit-content",
              maxWidth: "fit-content",
              background: "rgba(255,255,255,.04)",
              border: "1px solid rgba(255,255,255,.10)",
              boxShadow: "0 18px 50px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.06)",
            }}
          >
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: 12,
                display: "grid",
                placeItems: "center",
                background: "rgba(255,255,255,.06)",
                border: "1px solid rgba(255,255,255,.10)",
                flex: "0 0 auto",
              }}
            >
              <img src={src.icon} alt={String(src.name)} style={{ width: 18, height: 18 }} />
            </span>
            <span style={{ fontWeight: 720, letterSpacing: ".01em" }}>{src.name}</span>
          </div>
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
}
const PipelineDiagramMemo = memo(PipelineDiagram);

/* ========================= SMM / OPS DIAGRAMS ========================= */
function SmmAutomationDiagram({ reduced, t }: { reduced: boolean; t: (k: string, o?: any) => any }) {
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
}
const SmmAutomationDiagramMemo = memo(SmmAutomationDiagram);

function OpsAutomationDiagram({ reduced, t }: { reduced: boolean; t: (k: string, o?: any) => any }) {
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
}
const OpsAutomationDiagramMemo = memo(OpsAutomationDiagram);

/* ========================= SOCIAL + PIPELINE + SMM + OPS + FINAL CTA ========================= */
function SocialAutomationSection({
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
    }, 3400);
    return () => window.clearInterval(tmr);
  }, [order, reducedMotion]);

  const visibleScript = useMemo(() => demos[platform].slice(-4), [demos, platform]);

  const meta = useMemo(() => {
    if (platform === "WHATSAPP")
      return { dot: "rgba(170,225,255,.95)", clientName: t("home.social.clientName.whatsapp") as string };
    if (platform === "FACEBOOK")
      return { dot: "rgba(47,184,255,.95)", clientName: t("home.social.clientName.default") as string };
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

            <div
              style={{
                width: "100%",
                maxWidth: BOX,
                justifySelf: isMobile ? "start" : "end",
                marginTop: isMobile ? 10 : 0,
                minWidth: 0,
              }}
            >
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
                        baseSpeedMs={920}
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

          <div
            className="neo-finalSystem-actions reveal reveal-top"
            style={{ marginTop: 18, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}
          >
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
}
const SocialAutomationSectionMemo = memo(SocialAutomationSection);

/* ========================= HOME CSS (updated) ========================= */
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
    text-shadow: 0 10px 30px rgba(0,0,0,.6);
  }

  .neo-kickerPill{
    display:inline-flex; align-items:center; gap:10px;
    padding:10px 14px; border-radius:999px;
    border:1px solid rgba(255,255,255,.12);
    background: rgba(255,255,255,.03);
    box-shadow: 0 14px 52px rgba(0,0,0,.60);
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
    box-shadow: 0 14px 52px rgba(0,0,0,.58) !important;
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

  .neo-hero-stagger{
    opacity:0;
    transform: translate3d(0, 14px, 0);
    filter: blur(6px);
    transition: opacity .72s ease, transform .85s cubic-bezier(.2,.9,.2,1), filter .85s ease;
    will-change: transform, opacity, filter;
  }
  .neo-page-enter .neo-hero-stagger{ opacity:1; transform: translate3d(0,0,0); filter: blur(0); }
  .neo-hero-stagger.s1{ transition-delay:.08s; }
  .neo-hero-stagger.s2{ transition-delay:.16s; }
  .neo-hero-stagger.s3{ transition-delay:.24s; }
  .neo-hero-stagger.s4{ transition-delay:.32s; }

  @media (max-width: 860px){
    .neo-hero-stagger{ transform: translate3d(0, 10px, 0); filter: blur(5px); transition-duration:.65s; }
    .neo-hero-stagger.s1{ transition-delay:.05s; }
    .neo-hero-stagger.s2{ transition-delay:.11s; }
    .neo-hero-stagger.s3{ transition-delay:.17s; }
    .neo-hero-stagger.s4{ transition-delay:.23s; }
    .neo-heroCopyGap{ margin-bottom: 16px !important; }
  }
  @media (prefers-reduced-motion: reduce){
    .neo-hero-stagger{ transition:none !important; opacity:1 !important; transform:none !important; filter:none !important; }
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
    animation: neoHomeMarquee 24s linear infinite;
    padding-left: 16px;
  }
  @media (max-width: 860px){ .neo-stripTrack{ animation-duration: 30s; } }
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
  @media (max-width: 860px){
    .neo-stripWord{ font-size: 13px; padding: 0 14px; letter-spacing: .20em; }
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
    box-shadow: 0 16px 56px rgba(0,0,0,.62);
    padding: 16px;
    position: relative;
    overflow: hidden;
    transform: translate3d(0,0,0) scale(1);
    transition: transform .20s ease, filter .20s ease, border-color .20s ease;
    will-change: transform;
  }
  .neo-finalBlock::before{
    content:"";
    position:absolute; inset:-40% -30%;
    opacity:0;
    transform: translate3d(-10px,0,0);
    transition: opacity .22s ease, transform .22s ease;
    background:
      radial-gradient(520px 220px at 20% 0%, rgba(255,255,255,.10), transparent 70%),
      radial-gradient(520px 220px at 80% 0%, rgba(47,184,255,.10), transparent 70%);
    pointer-events:none;
  }
  .neo-finalBlock:hover{
    transform: translate3d(0,-12px,0) scale(1.03);
    border-color: rgba(47,184,255,.22);
    filter: saturate(1.06);
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

  @keyframes neoHomeMarquee{
    from{ transform: translate3d(0,0,0); }
    to{ transform: translate3d(-50%,0,0); }
  }

  @keyframes neoFlowDash{ to{ stroke-dashoffset:-140; } }
`;

/* ========================= HOME ========================= */
export default function Home() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const lang = useMemo(() => getLangFromPath(pathname), [pathname]);

  const reduced = usePrefersReducedMotion();
  const isMobile = useMedia("(max-width: 860px)", false);

  // ✅ scroll restore key (route + lang)
  useScrollRestore(`neox_scroll:${pathname}`);

  // səndə false idi -> saxladım
  usePremiumWheelScroll(false);
  useRevealIO(!reduced);

  const [enter, setEnter] = useState(false);
  useEffect(() => {
    const tt = window.setTimeout(() => setEnter(true), 40);
    return () => window.clearTimeout(tt);
  }, []);

  const ticks = useMemo(() => {
    const arr = t("home.strip.ticks", { returnObjects: true }) as string[];
    return Array.isArray(arr) ? arr : [];
  }, [t]);

  // ✅ HERO: only desktop (mobil/reduced => 0)
  const heroIntensity = reduced || isMobile ? 0 : 1.05;

  // ✅ HERO: pause when not visible
  const heroRef = useRef<HTMLElement | null>(null);
  const [heroInView, setHeroInView] = useState(true);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;

    const io = new IntersectionObserver(([e]) => setHeroInView(e.isIntersecting), {
      threshold: 0.05,
      rootMargin: "120px 0px 120px 0px",
    });

    io.observe(el);
    return () => io.disconnect();
  }, []);

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
      <section ref={heroRef as any} className="neo-hero neo-hero--full">
        <div className="neo-heroMatrix" aria-hidden="true">
          <HeroSystemBackground className="neo-heroBg" intensity={heroIntensity} paused={!heroInView} maxFps={isMobile ? 30 : 60} />
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

      {/* flow (connectors removed) */}
      <div
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
      </div>
    </main>
  );
}
