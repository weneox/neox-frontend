// src/components/Header.tsx
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { X, Home, Info, Sparkles, Layers, BookOpen, PhoneCall, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LANGS, DEFAULT_LANG, type Lang } from "../i18n/lang";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

type NavDef = { to: string; label: string; end?: boolean };

function getScrollableEl(): HTMLElement | Window {
  const se = (document.scrollingElement as HTMLElement | null) ?? document.documentElement;

  const candidates: Array<HTMLElement | null> = [
    document.querySelector("main"),
    document.querySelector("#root"),
    document.querySelector("#app"),
    document.querySelector(".app"),
    document.querySelector(".layout"),
    document.querySelector(".site"),
    document.querySelector("[data-scroll]"),
    document.querySelector("[data-scroll-container]"),
  ];

  const isScrollable = (el: HTMLElement) => {
    const st = getComputedStyle(el);
    const oy = st.overflowY;
    return (oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 2;
  };

  for (const el of candidates) if (el && isScrollable(el)) return el;
  if (se && isScrollable(se)) return se;

  return window;
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function isLang(x: string | undefined | null): x is Lang {
  return !!x && (LANGS as readonly string[]).includes(x as any);
}

function getWindowScrollY() {
  return (
    window.scrollY ||
    document.documentElement.scrollTop ||
    (document.body && (document.body as any).scrollTop) ||
    0
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const on = () => setReduced(!!mq.matches);
    on();
    mq.addEventListener ? mq.addEventListener("change", on) : (mq as any).addListener(on);
    return () => {
      mq.removeEventListener ? mq.removeEventListener("change", on) : (mq as any).removeListener(on);
    };
  }, []);
  return reduced;
}

/* ===== Desktop language dropdown (single button) =====
   ✅ UPDATED: Hover opens (like other dropdowns), click still works.
*/
function LangMenu({ lang, onPick }: { lang: Lang; onPick: (l: Lang) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const closeT = useRef<number | null>(null);

  const openDrop = () => {
    if (closeT.current) {
      window.clearTimeout(closeT.current);
      closeT.current = null;
    }
    setOpen(true);
  };

  const scheduleClose = () => {
    if (closeT.current) window.clearTimeout(closeT.current);
    closeT.current = window.setTimeout(() => setOpen(false), 110) as any;
  };

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (closeT.current) window.clearTimeout(closeT.current);
    };
  }, []);

  const nameOf = (c: Lang) =>
    c === "az"
      ? "Azərbaycan"
      : c === "tr"
      ? "Türk"
      : c === "en"
      ? "English"
      : c === "ru"
      ? "Русский"
      : "Español";

  return (
    <div
      ref={rootRef}
      className={cx("langMenu", open && "is-open")}
      data-wg-notranslate
      onMouseEnter={openDrop}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        className="langMenu__btn"
        aria-label="Dil seçimi"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onFocus={openDrop}
      >
        <span className="langMenu__dot" aria-hidden="true" />
        <span className="langMenu__code">{lang.toUpperCase()}</span>
        <span className="langMenu__chev" aria-hidden="true">
          ▾
        </span>
      </button>

      <div
        className="langMenu__panel"
        role="menu"
        aria-hidden={!open}
        onMouseEnter={openDrop}
        onMouseLeave={scheduleClose}
      >
        {LANGS.map((code) => (
          <button
            key={code}
            type="button"
            role="menuitem"
            className={cx("langMenu__item", code === lang && "is-active")}
            onClick={() => {
              onPick(code);
              setOpen(false);
            }}
          >
            <span className="langMenu__itemCode">{code.toUpperCase()}</span>
            <span className="langMenu__itemName">{nameOf(code)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

type ServiceId = "agents" | "automation" | "analytics" | "support" | "integrations" | "security";
type ServiceDef = { id: ServiceId; label: string; to: string; hint: string };

type UseCaseDef = {
  id: ServiceId;
  title: string;
  subtitle: string;
  lines: string[];
};

/* =========================
   Header
========================= */
export default function Header({ introReady }: { introReady: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [hdrp, setHdrp] = useState(0); // mobil blur driver
  const [isMobile, setIsMobile] = useState(false);

  const [open, setOpen] = useState(false);
  const [softOpen, setSoftOpen] = useState(false);

  const prefersReduced = usePrefersReducedMotion();

  // Desktop dropdown state
  const [svcDropOpen, setSvcDropOpen] = useState(false);
  const [aboutDropOpen, setAboutDropOpen] = useState(false);
  const [resDropOpen, setResDropOpen] = useState(false);
  const [ucDropOpen, setUcDropOpen] = useState(false);

  const closeT = useRef<number | null>(null);
  const svcRef = useRef<HTMLDivElement | null>(null);
  const aboutRef = useRef<HTMLDivElement | null>(null);
  const resRef = useRef<HTMLDivElement | null>(null);
  const ucRef = useRef<HTMLDivElement | null>(null);

  // UseCases mega internal state
  const [ucActive, setUcActive] = useState<ServiceId>("automation");
  const [ucRendered, setUcRendered] = useState<string[]>([]);
  const [ucCursor, setUcCursor] = useState(true);

  // Mobile accordion state
  const [mobileUcOpen, setMobileUcOpen] = useState(false);
  const [mobileSvcOpen, setMobileSvcOpen] = useState(false);
  const [mobileAboutOpen, setMobileAboutOpen] = useState(false);
  const [mobileResOpen, setMobileResOpen] = useState(false);

  const { i18n, t } = useTranslation();
  const { lang: paramLang } = useParams<{ lang?: string }>();
  const lang: Lang = isLang(paramLang) ? (paramLang as Lang) : DEFAULT_LANG;

  const location = useLocation();
  const navigate = useNavigate();
  const panelId = useId();

  const headerRef = useRef<HTMLElement | null>(null);
  const scrollElRef = useRef<HTMLElement | Window | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const rafPending = useRef(false);
  const lastPRef = useRef<number>(-1);

  // matchMedia: mobil olub-olmadığını bilək
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 920px)");
    const apply = () => setIsMobile(!!mq.matches);
    apply();
    if ("addEventListener" in mq) mq.addEventListener("change", apply);
    else (mq as any).addListener(apply);
    return () => {
      if ("removeEventListener" in mq) mq.removeEventListener("change", apply);
      else (mq as any).removeListener(apply);
    };
  }, []);

  const withLang = useCallback(
    (to: string) => {
      if (to === "/") return `/${lang}`;
      return `/${lang}${to.startsWith("/") ? to : `/${to}`}`;
    },
    [lang]
  );

  const closeMobile = useCallback(() => {
    setSoftOpen(false);
    window.setTimeout(() => setOpen(false), 140);
  }, []);

  const switchLang = useCallback(
    (next: Lang) => {
      if (next === lang) return;
      const rest = location.pathname.replace(/^\/[a-z]{2}(\/|$)/i, "/");
      const cleaned = rest.endsWith("/") && rest !== "/" ? rest.slice(0, -1) : rest;
      const target = cleaned === "/" ? `/${next}` : `/${next}${cleaned}`;
      i18n.changeLanguage(next);
      navigate(target, { replace: false });
    },
    [i18n, lang, location.pathname, navigate]
  );

  const SERVICES: ServiceDef[] = useMemo(
    () => [
      { id: "automation", label: "Automation Workflows", to: "/services/automation", hint: "Trigger → route → act → confirm. End-to-end automation." },
      { id: "agents", label: "AI Agents", to: "/services/ai-agents", hint: "Sales & ops agents that act, not just chat." },
      { id: "analytics", label: "Insights & Analytics", to: "/services/analytics", hint: "Real-time dashboards, anomaly detection, KPI automation." },
      { id: "support", label: "Support & Handoff", to: "/services/support", hint: "Smart escalation, SLA alerts, operator handoff." },
      { id: "integrations", label: "Integrations", to: "/services/integrations", hint: "CRM/ERP, Telegram/WhatsApp, payments, webhooks." },
      { id: "security", label: "Security & Deploy", to: "/services/security", hint: "Auth, rate-limit, audit logs, secure production deploy." },
    ],
    []
  );

  const ABOUT_LINKS: NavDef[] = useMemo(
    () => [
      { to: "/about/company", label: "Company" },
      { to: "/about/mission", label: "Mission" },
      { to: "/about/technology", label: "Technology" },
      { to: "/about/partners", label: "Partners" },
      { to: "/about/careers", label: "Careers" },
    ],
    []
  );

  // ✅ FIX: Blog burdan çıxarıldı (Blog ayrıca nav link olaraq qalır)
  const RES_LINKS: NavDef[] = useMemo(
    () => [
      { to: "/resources/docs", label: "Docs" },
      { to: "/resources/faq", label: "FAQ" },
      { to: "/resources/guides", label: "Guides" },
      { to: "/privacy", label: "Privacy Policy" },
    ],
    []
  );

  const USE_CASES: UseCaseDef[] = useMemo(() => {
    return [
      {
        id: "automation",
        title: "Automation Workflows",
        subtitle: "Business-ready flows that run 24/7",
        lines: [
          "boot: neox/usecases/automation",
          "init: event triggers → router → actions",
          "load: crm.sync, lead.capture, sla.timer",
          "rule: if no-reply > 5m → nudge + alert operator",
          "route: finance inquiry → pricing flow → checkout",
          "deploy: versioned workflow + audit log",
          "ok: conversion ↑, response time ↓",
        ],
      },
      {
        id: "agents",
        title: "AI Agents",
        subtitle: "Sales-first assistants that execute tasks",
        lines: [
          "boot: neox/usecases/agents",
          "init: persona=sales, tone=clear, length=short",
          "cap: understand intent → propose next action",
          "tool: create lead → schedule demo → send summary",
          "guard: refuse off-topic + keep business focus",
          "handoff: operator button / keyword → instant takeover",
          "ok: higher qualified leads",
        ],
      },
      {
        id: "analytics",
        title: "Insights & Analytics",
        subtitle: "Dashboards + anomaly detection in real time",
        lines: [
          "boot: neox/usecases/analytics",
          "ingest: chats, leads, conversions, channels",
          "metric: daily chats, operator requests, lead rate",
          "detect: anomalies → notify → suggest actions",
          "export: csv / weekly summary",
          "ok: decisions faster, waste lower",
        ],
      },
      {
        id: "support",
        title: "Support & Handoff",
        subtitle: "SLA, tags, assignments, escalation",
        lines: [
          "boot: neox/usecases/support",
          "sla: start timer at first message",
          "tag: billing | onboarding | bug | urgent",
          "assign: 'I took it' ownership flow",
          "alert: long no-reply → telegram ping + admin link",
          "ok: support load balanced",
        ],
      },
      {
        id: "integrations",
        title: "Integrations",
        subtitle: "Connect your stack without friction",
        lines: [
          "boot: neox/usecases/integrations",
          "connect: CRM, ERP, webhooks, email, telegram",
          "sync: contact + notes + conversation transcript",
          "action: payment link, booking, ticket creation",
          "ok: one system, no manual copy-paste",
        ],
      },
      {
        id: "security",
        title: "Security & Deploy",
        subtitle: "Production hardening & scalable deploy",
        lines: [
          "boot: neox/usecases/security",
          "auth: jwt sessions + admin magic links",
          "limit: rate-limit + ip allowlist",
          "store: postgres migration + indexes",
          "deploy: railway/render + cloudinary media",
          "ok: stable, safe, auditable",
        ],
      },
    ];
  }, []);

  const navItem = ({ isActive }: { isActive: boolean }) => cx("nav-link", isActive && "is-active");

  // Header height → CSS var
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const apply = () => {
      const h = Math.round(el.getBoundingClientRect().height || 72);
      document.documentElement.style.setProperty("--hdrh", `${h}px`);
    };
    apply();

    const ro = new ResizeObserver(apply);
    ro.observe(el);
    window.addEventListener("resize", apply, { passive: true });

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", apply as any);
    };
  }, []);

  const ensureSentinel = useCallback(() => {
    if (sentinelRef.current) return;

    const el = document.createElement("div");
    el.setAttribute("data-header-sentinel", "1");
    el.style.position = "absolute";
    el.style.top = "0";
    el.style.left = "0";
    el.style.width = "1px";
    el.style.height = "1px";
    el.style.pointerEvents = "none";
    el.style.opacity = "0";
    el.style.zIndex = "-1";

    const sc = scrollElRef.current ?? getScrollableEl();
    scrollElRef.current = sc;

    if (sc === window) document.body.appendChild(el);
    else {
      const host = sc as HTMLElement;
      const st = getComputedStyle(host);
      if (st.position === "static") host.style.position = "relative";
      host.appendChild(el);
    }

    sentinelRef.current = el;
  }, []);

  const computeScrolled = useCallback(() => {
    const sc = scrollElRef.current ?? getScrollableEl();
    scrollElRef.current = sc;

    let y = 0;
    if (sc === window) y = getWindowScrollY();
    else y = (sc as HTMLElement).scrollTop || 0;

    const p = clamp01(y / 180);

    if (headerRef.current) headerRef.current.style.setProperty("--hdrp", String(p));

    if (Math.abs(p - lastPRef.current) > 0.001) {
      lastPRef.current = p;
      setHdrp(p);
      setScrolled(p > 0.02);
    }
  }, []);

  useEffect(() => {
    scrollElRef.current = getScrollableEl();
    ensureSentinel();
    computeScrolled();

    const schedule = () => {
      if (rafPending.current) return;
      rafPending.current = true;
      requestAnimationFrame(() => {
        rafPending.current = false;
        computeScrolled();
      });
    };

    const onResize = () => schedule();
    const onScroll = () => schedule();

    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("scroll", onScroll, { passive: true } as any);

    const sc = scrollElRef.current;
    if (sc && sc !== window) (sc as HTMLElement).addEventListener("scroll", onScroll, { passive: true });

    const tick = window.setInterval(() => schedule(), 180);

    return () => {
      window.removeEventListener("resize", onResize as any);
      window.removeEventListener("scroll", onScroll as any);
      document.removeEventListener("scroll", onScroll as any);
      if (sc && sc !== window) (sc as HTMLElement).removeEventListener("scroll", onScroll as any);
      window.clearInterval(tick);

      if (sentinelRef.current) {
        sentinelRef.current.remove();
        sentinelRef.current = null;
      }
    };
  }, [ensureSentinel, computeScrolled]);

  // route change reset
  useEffect(() => {
    setOpen(false);
    setSoftOpen(false);
    setSvcDropOpen(false);
    setAboutDropOpen(false);
    setResDropOpen(false);
    setUcDropOpen(false);

    setMobileUcOpen(false);
    setMobileSvcOpen(false);
    setMobileAboutOpen(false);
    setMobileResOpen(false);
  }, [location.pathname]);

  // lock body scroll when mobile menu open
  useEffect(() => {
    const root = document.documentElement;
    const prev = root.style.overflow;
    if (open) root.style.overflow = "hidden";
    else root.style.overflow = "";
    return () => {
      root.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSoftOpen(false);
      return;
    }
    const raf = requestAnimationFrame(() => setSoftOpen(true));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // click outside for desktop dropdowns
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const targets: Array<{ open: boolean; ref: React.RefObject<HTMLDivElement>; close: () => void }> = [
        { open: svcDropOpen, ref: svcRef, close: () => setSvcDropOpen(false) },
        { open: aboutDropOpen, ref: aboutRef, close: () => setAboutDropOpen(false) },
        { open: resDropOpen, ref: resRef, close: () => setResDropOpen(false) },
        { open: ucDropOpen, ref: ucRef, close: () => setUcDropOpen(false) },
      ];

      for (const t of targets) {
        if (!t.open) continue;
        const el = t.ref.current;
        if (!el) continue;
        if (!el.contains(e.target as Node)) t.close();
      }
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [svcDropOpen, aboutDropOpen, resDropOpen, ucDropOpen]);

  // small helper for hover open/close with tiny delay
  const openDrop = (set: (v: boolean) => void) => {
    if (closeT.current) {
      window.clearTimeout(closeT.current);
      closeT.current = null;
    }
    set(true);
  };
  const scheduleCloseDrop = (set: (v: boolean) => void) => {
    if (closeT.current) window.clearTimeout(closeT.current);
    closeT.current = window.setTimeout(() => set(false), 110) as any;
  };

  const isUseCasesActive = useMemo(() => location.pathname.toLowerCase().includes("/use-cases"), [location.pathname]);
  const isServicesActive = useMemo(() => location.pathname.toLowerCase().includes("/services"), [location.pathname]);
  const isAboutActive = useMemo(() => location.pathname.toLowerCase().includes("/about"), [location.pathname]);
  const isResActive = useMemo(() => {
    const p = location.pathname.toLowerCase();
    return p.includes("/resources") || p.includes("/privacy");
  }, [location.pathname]);

  const ucActiveDef = useMemo(() => USE_CASES.find((x) => x.id === ucActive) ?? USE_CASES[0], [USE_CASES, ucActive]);

  useEffect(() => {
    if (!ucDropOpen) return;
    const tmr = window.setInterval(() => setUcCursor((v) => !v), 520);
    return () => window.clearInterval(tmr);
  }, [ucDropOpen]);

  useEffect(() => {
    if (!ucDropOpen) return;
    const lines = ucActiveDef.lines;
    if (prefersReduced) {
      setUcRendered(lines);
      return;
    }

    let i = 0;
    setUcRendered([]);

    const step = () => {
      i += 1;
      setUcRendered(lines.slice(0, i));
      if (i >= lines.length) return;
      window.setTimeout(step, 520 + Math.round(Math.random() * 160));
    };

    const timer = window.setTimeout(step, 220);
    return () => window.clearTimeout(timer);
  }, [ucActiveDef, ucDropOpen, prefersReduced]);

  // mobile styles
  const mobileP = clamp01(hdrp);
  const base = 0.03;
  const mobileBgAlpha = open ? 0.88 : base + 0.68 * mobileP;
  const mobileBlurPx = open ? 18 : 3 + 15 * mobileP;
  const mobileSat = open ? 1.35 : 1 + 0.30 * mobileP;

  const headerInlineStyle: React.CSSProperties | undefined = isMobile
    ? {
        backgroundColor: `rgba(10, 12, 18, ${mobileBgAlpha.toFixed(3)})`,
        WebkitBackdropFilter: `blur(${mobileBlurPx.toFixed(1)}px) saturate(${mobileSat.toFixed(2)})`,
        backdropFilter: `blur(${mobileBlurPx.toFixed(1)}px) saturate(${mobileSat.toFixed(2)})`,
        borderBottom: `1px solid rgba(255,255,255,${(open ? 0.09 : 0.06 * mobileP).toFixed(3)})`,
      }
    : undefined;

  const logoH = isMobile ? 18 : 28;
  const logoMaxW = isMobile ? "124px" : "156px";

  const MobileOverlay = (
    <div className={cx("nav-overlay", open && "is-mounted", softOpen && "is-open")} aria-hidden={!open}>
      <button className="nav-overlay__backdrop" type="button" aria-label="Bağla" onClick={closeMobile} />

      <div
        id={panelId}
        className={cx("nav-sheet", softOpen && "is-open")}
        role="dialog"
        aria-modal="true"
        aria-label="Menyu"
      >
        <div className="nav-sheet__bg" aria-hidden="true" />
        <div className="nav-sheet__noise" aria-hidden="true" />

        <div className="nav-sheet__head">
          <div className="nav-sheet__brand">
            <span className="nav-sheet__dot" aria-hidden="true" />
            <span className="nav-sheet__title">MENYU</span>
          </div>

          <button className="nav-sheet__close" type="button" aria-label="Bağla" onClick={closeMobile}>
            <X size={18} />
          </button>
        </div>

        <div className="nav-sheet__list">
          <NavLink
            to={withLang("/")}
            end
            className={({ isActive }) => cx("nav-sheetLink", "nav-stagger", isActive && "is-active")}
            style={{ ["--i" as any]: 0 }}
            onClick={() => {
              window.scrollTo({ top: 0, left: 0, behavior: "auto" });
              closeMobile();
            }}
          >
            <span className="nav-sheetLink__left">
              <span className="nav-sheetLink__ico" aria-hidden="true">
                <Home size={18} />
              </span>
              <span className="nav-sheetLink__label">{t("nav.home")}</span>
            </span>
            <span className="nav-sheetLink__chev" aria-hidden="true">
              →
            </span>
          </NavLink>

          {/* About accordion */}
          <div className={cx("nav-acc", "nav-stagger")} style={{ ["--i" as any]: 1 }}>
            <button
              type="button"
              className={cx("nav-acc__head", mobileAboutOpen && "is-open")}
              onClick={() => setMobileAboutOpen((v) => !v)}
              aria-expanded={mobileAboutOpen}
            >
              <span className="nav-sheetLink__left">
                <span className="nav-sheetLink__ico" aria-hidden="true">
                  <Info size={18} />
                </span>
                <span className="nav-sheetLink__label">{t("nav.about")}</span>
              </span>
              <span className="nav-acc__chev" aria-hidden="true">
                <ChevronDown size={16} />
              </span>
            </button>

            <div className={cx("nav-acc__panel", mobileAboutOpen && "is-open")} aria-hidden={!mobileAboutOpen}>
              <NavLink
                to={withLang("/about")}
                className={({ isActive }) => cx("nav-acc__item", isActive && "is-active")}
                onClick={() => closeMobile()}
              >
                <span className="nav-acc__bullet" aria-hidden="true" />
                <span className="nav-acc__text">Overview</span>
                <span className="nav-acc__arrow" aria-hidden="true">
                  →
                </span>
              </NavLink>

              {ABOUT_LINKS.map((s) => (
                <NavLink
                  key={s.to}
                  to={withLang(s.to)}
                  className={({ isActive }) => cx("nav-acc__item", isActive && "is-active")}
                  onClick={() => closeMobile()}
                >
                  <span className="nav-acc__bullet" aria-hidden="true" />
                  <span className="nav-acc__text">{s.label}</span>
                  <span className="nav-acc__arrow" aria-hidden="true">
                    →
                  </span>
                </NavLink>
              ))}
            </div>
          </div>

          {/* Services accordion */}
          <div className={cx("nav-acc", "nav-stagger")} style={{ ["--i" as any]: 2 }}>
            <button
              type="button"
              className={cx("nav-acc__head", mobileSvcOpen && "is-open")}
              onClick={() => setMobileSvcOpen((v) => !v)}
              aria-expanded={mobileSvcOpen}
            >
              <span className="nav-sheetLink__left">
                <span className="nav-sheetLink__ico" aria-hidden="true">
                  <Sparkles size={18} />
                </span>
                <span className="nav-sheetLink__label">{t("nav.services")}</span>
              </span>
              <span className="nav-acc__chev" aria-hidden="true">
                <ChevronDown size={16} />
              </span>
            </button>

            <div className={cx("nav-acc__panel", mobileSvcOpen && "is-open")} aria-hidden={!mobileSvcOpen}>
              <NavLink
                to={withLang("/services")}
                className={({ isActive }) => cx("nav-acc__item", isActive && "is-active")}
                onClick={() => closeMobile()}
              >
                <span className="nav-acc__bullet" aria-hidden="true" />
                <span className="nav-acc__text">All Services</span>
                <span className="nav-acc__arrow" aria-hidden="true">
                  →
                </span>
              </NavLink>

              {SERVICES.map((s) => (
                <NavLink
                  key={s.id}
                  to={withLang(s.to)}
                  className={({ isActive }) => cx("nav-acc__item", isActive && "is-active")}
                  onClick={() => closeMobile()}
                >
                  <span className="nav-acc__bullet" aria-hidden="true" />
                  <span className="nav-acc__text">{s.label}</span>
                  <span className="nav-acc__arrow" aria-hidden="true">
                    →
                  </span>
                </NavLink>
              ))}
            </div>
          </div>

          {/* Use Cases accordion */}
          <div className={cx("nav-acc", "nav-stagger")} style={{ ["--i" as any]: 3 }}>
            <button
              type="button"
              className={cx("nav-acc__head", mobileUcOpen && "is-open")}
              onClick={() => setMobileUcOpen((v) => !v)}
              aria-expanded={mobileUcOpen}
            >
              <span className="nav-sheetLink__left">
                <span className="nav-sheetLink__ico" aria-hidden="true">
                  <Layers size={18} />
                </span>
                <span className="nav-sheetLink__label">{t("nav.useCases")}</span>
              </span>
              <span className="nav-acc__chev" aria-hidden="true">
                <ChevronDown size={16} />
              </span>
            </button>

            <div className={cx("nav-acc__panel", mobileUcOpen && "is-open")} aria-hidden={!mobileUcOpen}>
              <NavLink
                to={withLang("/use-cases")}
                className={({ isActive }) => cx("nav-acc__item", isActive && "is-active")}
                onClick={() => closeMobile()}
              >
                <span className="nav-acc__bullet" aria-hidden="true" />
                <span className="nav-acc__text">Open Use Cases</span>
                <span className="nav-acc__arrow" aria-hidden="true">
                  →
                </span>
              </NavLink>

              {SERVICES.map((s) => (
                <NavLink
                  key={s.id}
                  to={withLang(`/use-cases?svc=${encodeURIComponent(s.id)}`)}
                  className={({ isActive }) => cx("nav-acc__item", isActive && "is-active")}
                  onClick={() => closeMobile()}
                >
                  <span className="nav-acc__bullet" aria-hidden="true" />
                  <span className="nav-acc__text">{s.label}</span>
                  <span className="nav-acc__arrow" aria-hidden="true">
                    →
                  </span>
                </NavLink>
              ))}
            </div>
          </div>

          {/* Resources accordion */}
          <div className={cx("nav-acc", "nav-stagger")} style={{ ["--i" as any]: 4 }}>
            <button
              type="button"
              className={cx("nav-acc__head", mobileResOpen && "is-open")}
              onClick={() => setMobileResOpen((v) => !v)}
              aria-expanded={mobileResOpen}
            >
              <span className="nav-sheetLink__left">
                <span className="nav-sheetLink__ico" aria-hidden="true">
                  <BookOpen size={18} />
                </span>
                <span className="nav-sheetLink__label">Resources</span>
              </span>
              <span className="nav-acc__chev" aria-hidden="true">
                <ChevronDown size={16} />
              </span>
            </button>

            <div className={cx("nav-acc__panel", mobileResOpen && "is-open")} aria-hidden={!mobileResOpen}>
              {RES_LINKS.map((s) => (
                <NavLink
                  key={s.to}
                  to={withLang(s.to)}
                  className={({ isActive }) => cx("nav-acc__item", isActive && "is-active")}
                  onClick={() => closeMobile()}
                >
                  <span className="nav-acc__bullet" aria-hidden="true" />
                  <span className="nav-acc__text">{s.label}</span>
                  <span className="nav-acc__arrow" aria-hidden="true">
                    →
                  </span>
                </NavLink>
              ))}

              <NavLink
                to={withLang("/store")}
                className={({ isActive }) => cx("nav-acc__item", isActive && "is-active")}
                onClick={() => closeMobile()}
              >
                <span className="nav-acc__bullet" aria-hidden="true" />
                <span className="nav-acc__text">NEOX Store</span>
                <span className="nav-acc__arrow" aria-hidden="true">
                  →
                </span>
              </NavLink>
            </div>
          </div>

          {/* Contact */}
          <NavLink
            to={withLang("/contact")}
            className={cx("nav-sheetLink", "nav-sheetLink--contact", "nav-stagger")}
            style={{ ["--i" as any]: 5 }}
            onClick={() => {
              window.scrollTo({ top: 0, left: 0, behavior: "auto" });
              closeMobile();
            }}
          >
            <span className="nav-sheetLink__left">
              <span className="nav-sheetLink__ico" aria-hidden="true">
                <PhoneCall size={18} />
              </span>
              <span className="nav-sheetLink__label">{t("nav.contact")}</span>
            </span>
            <span className="nav-sheetLink__chev" aria-hidden="true">
              →
            </span>
          </NavLink>
        </div>
      </div>
    </div>
  );

  return (
    <header
      ref={headerRef}
      style={headerInlineStyle}
      className={cx("site-header", introReady && "site-header--in", scrolled && "is-scrolled", open && "is-open")}
      data-top={scrolled ? "0" : "1"}
    >
      {/* ✅ FULL CSS INJECT — yekun */}
      <style>{`
        :root{ --hdrh: 72px; --hdrp: 0; }

        .site-header{
          position: sticky; top: 0; z-index: 1100; width: 100%;
          transform: translateZ(0);
          will-change: backdrop-filter, background-color, border-color;
          background: rgba(10, 12, 18, 0.02);
          border-bottom: 1px solid rgba(255,255,255,0.04);
          transition: background-color .18s ease, border-color .18s ease;
        }
        .site-header.is-scrolled{
          background: rgba(10, 12, 18, calc(0.08 + 0.26 * var(--hdrp)));
          border-bottom-color: rgba(255,255,255, calc(0.06 + 0.06 * var(--hdrp)));
          -webkit-backdrop-filter: blur(calc(8px + 10px * var(--hdrp))) saturate(1.2);
          backdrop-filter: blur(calc(8px + 10px * var(--hdrp))) saturate(1.2);
        }
        .site-header.is-open{
          background: rgba(10, 12, 18, 0.88);
          border-bottom-color: rgba(255,255,255,0.10);
          -webkit-backdrop-filter: blur(18px) saturate(1.35);
          backdrop-filter: blur(18px) saturate(1.35);
        }

        .container{ max-width: 1180px; margin: 0 auto; padding: 0 18px; }
        .header-inner{ height: var(--hdrh); display: grid; align-items: center; }
        .header-grid{ grid-template-columns: auto 1fr auto; gap: 16px; }
        .header-left{ display:flex; align-items:center; }
        .header-mid{ display:flex; align-items:center; justify-content:center; gap: 10px; }
        .header-right{ display:flex; align-items:center; justify-content:flex-end; gap: 12px; }

        .brand-link{ display: inline-flex; align-items: center; gap: 10px; text-decoration: none; }
        .headerBrand{ position: relative; display:flex; align-items:center; }
        .headerBrand__aura{
          position:absolute; inset:-10px -16px;
          background:
            radial-gradient(120px 44px at 28% 60%, rgba(47,184,255,.16), transparent 60%),
            radial-gradient(120px 44px at 70% 40%, rgba(167,89,255,.12), transparent 62%);
          filter: blur(10px); opacity: .7; pointer-events:none;
        }

        .nav-link{
          position: relative;
          display: inline-flex; align-items: center; justify-content: center;
          gap: 8px; height: 40px; padding: 0 12px; border-radius: 999px;
          text-decoration: none; color: rgba(255,255,255,.72);
          font-weight: 600; font-size: 13px; letter-spacing: .02em;
          transition: color .16s ease, background-color .16s ease, transform .16s ease;
        }
        .nav-link:hover{ color: rgba(255,255,255,.90); background: rgba(255,255,255,.06); }
        .nav-link.is-active{ color: rgba(255,255,255,.94); background: rgba(255,255,255,.09); }

        .nav-dd{ position: relative; display:inline-flex; }
        .nav-dd__btn{
          position: relative; display:inline-flex; align-items:center; gap: 8px;
          height: 40px; padding: 0 12px; border-radius: 999px;
          color: rgba(255,255,255,.72); background: transparent; border: 0;
          cursor: pointer; font: inherit; font-weight: 700; letter-spacing: .02em;
          transition: color .16s ease, background-color .16s ease;
        }
        .nav-dd__btn:hover{ color: rgba(255,255,255,.90); background: rgba(255,255,255,.06); }
        .nav-dd__btn.is-active{ color: rgba(255,255,255,.94); background: rgba(255,255,255,.09); }

        .nav-dd__chev{ opacity: .8; transition: transform .14s ease; }
        .nav-dd.is-open .nav-dd__chev{ transform: rotate(180deg); }

        .nav-dd__panel{
          position:absolute; top: calc(100% + 10px); left: 50%;
          transform: translateX(-50%);
          width: 380px; border-radius: 18px; padding: 14px;
          border: 1px solid rgba(255,255,255,.10);
          background:
            radial-gradient(120% 90% at 20% 10%, rgba(47,184,255,.14), transparent 55%),
            radial-gradient(120% 90% at 90% 10%, rgba(167,89,255,.12), transparent 60%),
            rgba(10,12,18,.88);
          -webkit-backdrop-filter: blur(18px) saturate(1.25);
          backdrop-filter: blur(18px) saturate(1.25);
          box-shadow: 0 24px 80px rgba(0,0,0,.65);
          opacity: 0; pointer-events: none;
          transform-origin: top center;
          transform: translateX(-50%) translateY(-6px) scale(.98);
          transition: opacity .14s ease, transform .14s ease;
        }
        .nav-dd.is-open .nav-dd__panel{
          opacity: 1; pointer-events: auto;
          transform: translateX(-50%) translateY(0) scale(1);
        }
        .nav-dd__title{ font-size: 11px; letter-spacing: .18em; color: rgba(255,255,255,.55); padding: 2px 6px 10px; }
        .nav-dd__grid{ display:grid; gap: 8px; }
        .nav-dd__item{
          display:flex; align-items:flex-start; justify-content: space-between; gap: 12px;
          padding: 10px 10px; border-radius: 14px;
          text-decoration:none; border: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.82);
          transition: background-color .14s ease, border-color .14s ease, transform .14s ease;
        }
        .nav-dd__item:hover{ background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.10); transform: translateY(-1px); }
        .nav-dd__item.is-active{ background: rgba(47,184,255,.10); border-color: rgba(47,184,255,.22); }

        .nav-dd__left{ display:flex; align-items:flex-start; gap: 10px; min-width: 0; }
        .nav-dd__dot{
          width: 8px; height: 8px; border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), rgba(47,184,255,.85));
          box-shadow: 0 0 0 3px rgba(47,184,255,.10);
          margin-top: 5px; flex: 0 0 auto;
        }
        .nav-dd__labelWrap{ display:flex; flex-direction:column; min-width: 0; }
        .nav-dd__label{ font-weight: 800; font-size: 13px; line-height: 1.15; }
        .nav-dd__hint{
          margin-top: 4px; font-size: 12px; line-height: 1.25;
          color: rgba(255,255,255,.56);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          max-width: 240px;
        }
        .nav-dd__arrow{ opacity: .7; margin-top: 2px; }

        .nav-dd--mega .nav-dd__panel{ width: 820px; padding: 14px; border-radius: 20px; }
        .uc-mega{ display:grid; grid-template-columns: 1fr 1.15fr; gap: 12px; align-items: stretch; }

        .uc-left{ border-radius: 16px; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.03); overflow: hidden; }
        .uc-leftHead{
          padding: 10px 12px; font-size: 11px; letter-spacing: .18em;
          color: rgba(255,255,255,.55);
          border-bottom: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.02);
        }
        .uc-item{
          width: 100%;
          display:flex; align-items:flex-start; justify-content: space-between; gap: 12px;
          padding: 12px 12px; border: 0; cursor: pointer; text-align: left;
          background: transparent; color: rgba(255,255,255,.84);
          transition: background-color .14s ease, transform .14s ease;
        }
        .uc-item:hover{ background: rgba(255,255,255,.05); transform: translateY(-1px); }
        .uc-item.is-active{ background: rgba(47,184,255,.10); }
        .uc-itemTitle{ font-weight: 900; font-size: 13px; line-height: 1.15; }
        .uc-itemSub{ margin-top: 4px; font-size: 12px; color: rgba(255,255,255,.56); line-height: 1.2; }
        .uc-itemIcon{ opacity: .7; margin-top: 2px; flex: 0 0 auto; }

        .uc-right{
          border-radius: 16px; border: 1px solid rgba(255,255,255,.10);
          background:
            radial-gradient(120% 80% at 10% 0%, rgba(47,184,255,.10), transparent 55%),
            radial-gradient(120% 80% at 90% 0%, rgba(167,89,255,.08), transparent 60%),
            rgba(0,0,0,.20);
          overflow: hidden; position: relative;
        }
        .uc-termTop{
          padding: 10px 12px; display:flex; align-items:center; justify-content: space-between;
          border-bottom: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.02);
        }
        .uc-termTitle{ font-size: 11px; letter-spacing: .18em; color: rgba(255,255,255,.60); font-weight: 900; }
        .uc-live{ display:inline-flex; align-items:center; gap: 8px; font-size: 11px; letter-spacing: .12em; color: rgba(255,255,255,.64); }
        .uc-liveDot{
          width: 8px; height: 8px; border-radius: 999px;
          background: rgba(47,184,255,.95);
          box-shadow: 0 0 0 6px rgba(47,184,255,.10);
          animation: ucBreath 1.6s ease-in-out infinite;
        }
        @keyframes ucBreath{ 0%,100%{ transform: scale(1); opacity: .9; } 50%{ transform: scale(1.25); opacity: 1; } }

        .uc-termBody{
          padding: 12px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 12px; line-height: 1.45; color: rgba(255,255,255,.82);
          min-height: 210px;
        }
        .uc-line{ display:block; margin: 0 0 6px; white-space: pre-wrap; word-break: break-word; }
        .uc-prompt{ color: rgba(47,184,255,.92); }
        .uc-cursor{
          display:inline-block; width: 9px; height: 14px; margin-left: 4px;
          transform: translateY(2px); background: rgba(255,255,255,.82); opacity: .9;
        }

        .uc-footer{
          padding: 10px 12px; border-top: 1px solid rgba(255,255,255,.06);
          display:flex; align-items:center; justify-content: space-between; gap: 10px;
          background: rgba(255,255,255,.02);
        }
        .uc-miniLink{
          display:inline-flex; align-items:center; gap: 8px;
          text-decoration:none; font-weight: 800; font-size: 12px;
          color: rgba(255,255,255,.86);
          padding: 8px 10px; border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
        }
        .uc-miniLink:hover{ transform: translateY(-1px); background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.14); }
        .uc-miniHint{ font-size: 12px; color: rgba(255,255,255,.55); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .nav-cta{
          display:inline-flex; align-items:center; justify-content:center;
          height: 38px; padding: 0 14px; border-radius: 999px; text-decoration:none;
          font-weight: 800; font-size: 13px; color: rgba(255,255,255,.92);
          border: 1px solid rgba(255,255,255,.10);
          background:
            radial-gradient(120% 120% at 20% 10%, rgba(47,184,255,.22), transparent 60%),
            rgba(255,255,255,.06);
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
        }
        .nav-cta:hover{ transform: translateY(-1px); border-color: rgba(255,255,255,.16); background: rgba(255,255,255,.08); }
        .nav-cta--desktopOnly{ display:inline-flex; }

        .nav-toggle{
          width: 44px; height: 40px; border-radius: 12px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          display:none; align-items:center; justify-content:center;
          flex-direction: column; gap: 5px;
          cursor: pointer;
          transition: background-color .14s ease, border-color .14s ease, transform .14s ease;
        }
        .nav-toggle:hover{ transform: translateY(-1px); background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.14); }
        .nav-toggle__bar{ width: 18px; height: 2px; border-radius: 999px; background: rgba(255,255,255,.86); opacity: .9; }

        .langMenu{ position: relative; }
        .langMenu__btn{
          display:inline-flex; align-items:center; gap: 8px;
          height: 38px; padding: 0 10px; border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.86);
          font-weight: 800; font-size: 12px;
          cursor: pointer;
          transition: background-color .14s ease, border-color .14s ease, transform .14s ease;
        }
        .langMenu__btn:hover{ transform: translateY(-1px); background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.14); }
        .langMenu__dot{
          width: 8px; height: 8px; border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.9), rgba(167,89,255,.9));
          box-shadow: 0 0 0 3px rgba(167,89,255,.10);
        }
        .langMenu__code{ letter-spacing: .08em; }
        .langMenu__chev{ opacity: .75; }

        .langMenu__panel{
          position:absolute; top: calc(100% + 10px); right: 0;
          width: 210px; border-radius: 16px; padding: 10px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(10,12,18,.90);
          -webkit-backdrop-filter: blur(18px) saturate(1.2);
          backdrop-filter: blur(18px) saturate(1.2);
          box-shadow: 0 24px 80px rgba(0,0,0,.65);
          opacity: 0; pointer-events: none;
          transform: translateY(-6px) scale(.98);
          transition: opacity .14s ease, transform .14s ease;
        }
        .langMenu.is-open .langMenu__panel{
          opacity: 1; pointer-events: auto;
          transform: translateY(0) scale(1);
        }
        .langMenu__item{
          width: 100%;
          display:flex; align-items:center; justify-content: space-between; gap: 10px;
          border: 0;
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.06);
          color: rgba(255,255,255,.86);
          padding: 10px 10px;
          border-radius: 12px;
          cursor: pointer;
          transition: background-color .14s ease, border-color .14s ease, transform .14s ease;
        }
        .langMenu__item + .langMenu__item{ margin-top: 8px; }
        .langMenu__item:hover{ background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.10); transform: translateY(-1px); }
        .langMenu__item.is-active{ background: rgba(167,89,255,.12); border-color: rgba(167,89,255,.22); }
        .langMenu__itemCode{ font-weight: 900; letter-spacing: .10em; }
        .langMenu__itemName{ opacity: .85; font-weight: 700; }

        .nav-overlay{ position: fixed; inset: 0; z-index: 2000; opacity: 0; pointer-events: none; transition: opacity .16s ease; }
        .nav-overlay.is-mounted{ display:block; }
        .nav-overlay.is-open{ opacity: 1; pointer-events: auto; }
        .nav-overlay__backdrop{
          position:absolute; inset:0; border:0;
          background: rgba(0,0,0,.45);
          -webkit-backdrop-filter: blur(8px);
          backdrop-filter: blur(8px);
          cursor: pointer;
        }

        .nav-sheet{
          position:absolute; top: 12px; right: 12px; left: 12px;
          max-width: 520px; margin-left: auto;
          border-radius: 22px; border: 1px solid rgba(255,255,255,.10);
          overflow: hidden;
          transform: translateY(-10px) scale(.985);
          opacity: 0;
          transition: transform .16s ease, opacity .16s ease;
        }
        .nav-sheet.is-open{ transform: translateY(0) scale(1); opacity: 1; }

        .nav-sheet__bg{
          position:absolute; inset:0;
          background:
            radial-gradient(120% 90% at 20% 0%, rgba(47,184,255,.16), transparent 55%),
            radial-gradient(120% 90% at 90% 0%, rgba(167,89,255,.14), transparent 60%),
            rgba(10,12,18,.92);
          -webkit-backdrop-filter: blur(18px) saturate(1.25);
          backdrop-filter: blur(18px) saturate(1.25);
        }
        .nav-sheet__noise{
          position:absolute; inset:0;
          opacity: .06;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E");
          background-size: 160px 160px;
          pointer-events:none;
          mix-blend-mode: overlay;
        }

        .nav-sheet__head{ position: relative; z-index: 2; display:flex; align-items:center; justify-content: space-between; padding: 14px 14px 10px; }
        .nav-sheet__brand{ display:flex; align-items:center; gap: 10px; }
        .nav-sheet__dot{
          width: 10px; height: 10px; border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), rgba(47,184,255,.85));
          box-shadow: 0 0 0 4px rgba(47,184,255,.10);
        }
        .nav-sheet__title{ font-weight: 900; letter-spacing: .18em; font-size: 11px; color: rgba(255,255,255,.70); }
        .nav-sheet__close{
          width: 40px; height: 38px; border-radius: 12px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.05);
          color: rgba(255,255,255,.88);
          display:flex; align-items:center; justify-content:center;
          cursor: pointer;
          transition: transform .14s ease, background-color .14s ease;
        }
        .nav-sheet__close:hover{ transform: translateY(-1px); background: rgba(255,255,255,.07); }

        .nav-sheet__list{ position: relative; z-index: 2; padding: 8px 14px 14px; display:grid; gap: 10px; }

        .nav-stagger{ transform: translateY(6px); opacity: 0; animation: navIn .24s ease forwards; animation-delay: calc(0.03s * var(--i, 0)); }
        @keyframes navIn{ to{ transform: translateY(0); opacity: 1; } }

        .nav-sheetLink{
          display:flex; align-items:center; justify-content: space-between; gap: 12px;
          padding: 12px 12px; border-radius: 16px;
          text-decoration:none; border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.84);
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
        }
        .nav-sheetLink:hover{ transform: translateY(-1px); background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.12); }
        .nav-sheetLink.is-active{ background: rgba(47,184,255,.10); border-color: rgba(47,184,255,.22); }
        .nav-sheetLink__left{ display:flex; align-items:center; gap: 10px; min-width: 0; }
        .nav-sheetLink__ico{
          width: 32px; height: 32px;
          display:flex; align-items:center; justify-content:center;
          border-radius: 12px;
          background: rgba(255,255,255,.05);
          border: 1px solid rgba(255,255,255,.07);
          flex: 0 0 auto;
        }
        .nav-sheetLink__label{ font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .nav-sheetLink__chev{ opacity: .75; }

        .nav-sheetLink--contact{
          background:
            radial-gradient(120% 120% at 20% 10%, rgba(47,184,255,.22), transparent 60%),
            rgba(255,255,255,.05);
          border-color: rgba(255,255,255,.12);
        }

        .nav-acc{ border-radius: 18px; overflow:hidden; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.03); }
        .nav-acc__head{
          width: 100%;
          border:0; background: transparent;
          display:flex; align-items:center; justify-content: space-between;
          padding: 12px 12px;
          cursor:pointer; color: rgba(255,255,255,.86);
        }
        .nav-acc__chev{ opacity: .75; transition: transform .14s ease; }
        .nav-acc__head.is-open .nav-acc__chev{ transform: rotate(180deg); }
        .nav-acc__panel{
          display:grid; gap: 8px;
          padding: 0 12px 12px;
          max-height: 0; overflow: hidden;
          transition: max-height .18s ease;
        }
        .nav-acc__panel.is-open{ max-height: 720px; }
        .nav-acc__item{
          display:flex; align-items:center; justify-content: space-between; gap: 10px;
          padding: 10px 10px; border-radius: 14px;
          text-decoration:none; border: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.82);
          transition: background-color .14s ease, border-color .14s ease, transform .14s ease;
        }
        .nav-acc__item:hover{ background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.10); transform: translateY(-1px); }
        .nav-acc__item.is-active{ background: rgba(167,89,255,.12); border-color: rgba(167,89,255,.22); }
        .nav-acc__bullet{
          width: 8px; height: 8px; border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), rgba(167,89,255,.85));
          box-shadow: 0 0 0 3px rgba(167,89,255,.10);
          flex: 0 0 auto;
          margin-right: 8px;
        }
        .nav-acc__text{ font-weight: 800; }
        .nav-acc__arrow{ opacity: .7; }

        @media (max-width: 920px){
          .header-mid{ display:none; }
          .nav-toggle{ display:inline-flex; }
          .nav-cta--desktopOnly{ display:none; }
          .langMenu__btn{ height: 40px; }
        }
        @media (max-width: 920px){ .nav-dd__panel{ display:none; } }
        @media (max-width: 520px){
          .container{ padding: 0 14px; }
          .header-right{ gap: 10px; }
          .langMenu__panel{ width: 200px; }
        }
      `}</style>

      <div className="container header-inner header-grid">
        <div className="header-left">
          <Link to={`/${lang}`} className="brand-link" aria-label="NEOX" data-wg-notranslate>
            <span className="headerBrand" aria-hidden="true">
              <span className="headerBrand__aura" aria-hidden="true" />
              <img
                className="headerBrand__img"
                src="/image/neox-logo.png"
                alt="NEOX"
                width={148}
                height={44}
                loading="eager"
                decoding="async"
                draggable={false}
                style={{
                  height: logoH,
                  width: "auto",
                  maxWidth: logoMaxW,
                  objectFit: "contain",
                  display: "block",
                  userSelect: "none",
                  filter: "drop-shadow(0 6px 16px rgba(0,0,0,.42)) drop-shadow(0 0 10px rgba(47,184,255,.06))",
                  transform: isMobile ? "translateY(1px) translateZ(0)" : "translateZ(0)",
                }}
              />
            </span>
          </Link>
        </div>

        <nav className="header-mid" aria-label="Əsas menyu">
          <NavLink to={withLang("/")} end className={navItem}>
            <span className="nav-label nav-label--full">{t("nav.home")}</span>
          </NavLink>

          {/* ABOUT dropdown */}
          <div
            ref={aboutRef}
            className={cx("nav-dd", aboutDropOpen && "is-open")}
            onMouseEnter={() => openDrop(setAboutDropOpen)}
            onMouseLeave={() => scheduleCloseDrop(setAboutDropOpen)}
          >
            <button
              type="button"
              className={cx("nav-dd__btn", (isAboutActive || aboutDropOpen) && "is-active")}
              aria-haspopup="menu"
              aria-expanded={aboutDropOpen}
              onClick={() => setAboutDropOpen((v) => !v)}
              onFocus={() => openDrop(setAboutDropOpen)}
            >
              <span className="nav-label nav-label--full">{t("nav.about")}</span>
              <span className="nav-dd__chev" aria-hidden="true">
                <ChevronDown size={16} />
              </span>
            </button>

            <div className="nav-dd__panel" role="menu" aria-hidden={!aboutDropOpen}>
              <div className="nav-dd__title">ABOUT</div>
              <div className="nav-dd__grid">
                <NavLink
                  to={withLang("/about")}
                  className={({ isActive }) => cx("nav-dd__item", isActive && "is-active")}
                  role="menuitem"
                  onClick={() => setAboutDropOpen(false)}
                >
                  <span className="nav-dd__left">
                    <span className="nav-dd__dot" aria-hidden="true" />
                    <span className="nav-dd__labelWrap">
                      <span className="nav-dd__label">Overview</span>
                      <span className="nav-dd__hint">What NEOX is and why it matters</span>
                    </span>
                  </span>
                  <span className="nav-dd__arrow" aria-hidden="true">
                    →
                  </span>
                </NavLink>

                {ABOUT_LINKS.map((s) => (
                  <NavLink
                    key={s.to}
                    to={withLang(s.to)}
                    className={({ isActive }) => cx("nav-dd__item", isActive && "is-active")}
                    role="menuitem"
                    onClick={() => setAboutDropOpen(false)}
                  >
                    <span className="nav-dd__left">
                      <span className="nav-dd__dot" aria-hidden="true" />
                      <span className="nav-dd__labelWrap">
                        <span className="nav-dd__label">{s.label}</span>
                        <span className="nav-dd__hint">Premium accordion page</span>
                      </span>
                    </span>
                    <span className="nav-dd__arrow" aria-hidden="true">
                      →
                    </span>
                  </NavLink>
                ))}
              </div>
            </div>
          </div>

          {/* SERVICES dropdown */}
          <div
            ref={svcRef}
            className={cx("nav-dd", svcDropOpen && "is-open")}
            onMouseEnter={() => openDrop(setSvcDropOpen)}
            onMouseLeave={() => scheduleCloseDrop(setSvcDropOpen)}
          >
            <button
              type="button"
              className={cx("nav-dd__btn", (isServicesActive || svcDropOpen) && "is-active")}
              aria-haspopup="menu"
              aria-expanded={svcDropOpen}
              onClick={() => setSvcDropOpen((v) => !v)}
              onFocus={() => openDrop(setSvcDropOpen)}
            >
              <span className="nav-label nav-label--full">{t("nav.services")}</span>
              <span className="nav-dd__chev" aria-hidden="true">
                <ChevronDown size={16} />
              </span>
            </button>

            <div className="nav-dd__panel" role="menu" aria-hidden={!svcDropOpen}>
              <div className="nav-dd__title">SERVICES</div>
              <div className="nav-dd__grid">
                {SERVICES.map((s) => (
                  <NavLink
                    key={s.id}
                    to={withLang(s.to)}
                    className={({ isActive }) => cx("nav-dd__item", isActive && "is-active")}
                    role="menuitem"
                    onClick={() => setSvcDropOpen(false)}
                  >
                    <span className="nav-dd__left">
                      <span className="nav-dd__dot" aria-hidden="true" />
                      <span className="nav-dd__labelWrap">
                        <span className="nav-dd__label">{s.label}</span>
                        <span className="nav-dd__hint">{s.hint}</span>
                      </span>
                    </span>
                    <span className="nav-dd__arrow" aria-hidden="true">
                      →
                    </span>
                  </NavLink>
                ))}
              </div>
            </div>
          </div>

          {/* USE CASES mega dropdown */}
          <div
            ref={ucRef}
            className={cx("nav-dd", "nav-dd--mega", ucDropOpen && "is-open")}
            onMouseEnter={() => openDrop(setUcDropOpen)}
            onMouseLeave={() => scheduleCloseDrop(setUcDropOpen)}
          >
            <button
              type="button"
              className={cx("nav-dd__btn", (isUseCasesActive || ucDropOpen) && "is-active")}
              aria-haspopup="menu"
              aria-expanded={ucDropOpen}
              onClick={() => setUcDropOpen((v) => !v)}
              onFocus={() => openDrop(setUcDropOpen)}
            >
              <span className="nav-label nav-label--full">{t("nav.useCases")}</span>
              <span className="nav-dd__chev" aria-hidden="true">
                <ChevronDown size={16} />
              </span>
            </button>

            <div className="nav-dd__panel" role="menu" aria-hidden={!ucDropOpen}>
              <div className="nav-dd__title">USE CASES</div>

              <div className="uc-mega">
                <div className="uc-left">
                  <div className="uc-leftHead">SELECT A SERVICE</div>

                  {SERVICES.map((s) => {
                    const active = s.id === ucActive;
                    const uc = USE_CASES.find((x) => x.id === s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        className={cx("uc-item", active && "is-active")}
                        onMouseEnter={() => setUcActive(s.id)}
                        onFocus={() => setUcActive(s.id)}
                        onClick={() => {
                          setUcDropOpen(false);
                          navigate(withLang(`/use-cases?svc=${encodeURIComponent(s.id)}`));
                          window.scrollTo({ top: 0, left: 0, behavior: "auto" });
                        }}
                      >
                        <span style={{ minWidth: 0 }}>
                          <div className="uc-itemTitle">{s.label}</div>
                          <div className="uc-itemSub">{uc?.subtitle ?? s.hint}</div>
                        </span>
                        <span className="uc-itemIcon" aria-hidden="true">
                          →
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="uc-right">
                  <div className="uc-termTop">
                    <div className="uc-termTitle">{ucActiveDef.title}</div>
                    <div className="uc-live">
                      <span className="uc-liveDot" aria-hidden="true" />
                      LIVE
                    </div>
                  </div>

                  <div className="uc-termBody" aria-live="polite">
                    {ucRendered.map((ln, idx) => (
                      <span key={idx} className="uc-line">
                        <span className="uc-prompt">$</span> {ln}
                      </span>
                    ))}
                    <span className="uc-line" aria-hidden="true">
                      <span className="uc-prompt">$</span>{" "}
                      <span className="uc-cursor" style={{ opacity: ucCursor ? 0.9 : 0.2 }} />
                    </span>
                  </div>

                  <div className="uc-footer">
                    <NavLink
                      to={withLang(`/use-cases?svc=${encodeURIComponent(ucActive)}`)}
                      className="uc-miniLink"
                      onClick={() => setUcDropOpen(false)}
                    >
                      Open {t("nav.useCases")} →
                    </NavLink>
                    <div className="uc-miniHint">{ucActiveDef.subtitle}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RESOURCES dropdown */}
          <div
            ref={resRef}
            className={cx("nav-dd", resDropOpen && "is-open")}
            onMouseEnter={() => openDrop(setResDropOpen)}
            onMouseLeave={() => scheduleCloseDrop(setResDropOpen)}
          >
            <button
              type="button"
              className={cx("nav-dd__btn", (isResActive || resDropOpen) && "is-active")}
              aria-haspopup="menu"
              aria-expanded={resDropOpen}
              onClick={() => setResDropOpen((v) => !v)}
              onFocus={() => openDrop(setResDropOpen)}
            >
              <span className="nav-label nav-label--full">Resources</span>
              <span className="nav-dd__chev" aria-hidden="true">
                <ChevronDown size={16} />
              </span>
            </button>

            <div className="nav-dd__panel" role="menu" aria-hidden={!resDropOpen}>
              <div className="nav-dd__title">RESOURCES</div>
              <div className="nav-dd__grid">
                {RES_LINKS.map((s) => (
                  <NavLink
                    key={s.to}
                    to={withLang(s.to)}
                    className={({ isActive }) => cx("nav-dd__item", isActive && "is-active")}
                    role="menuitem"
                    onClick={() => setResDropOpen(false)}
                  >
                    <span className="nav-dd__left">
                      <span className="nav-dd__dot" aria-hidden="true" />
                      <span className="nav-dd__labelWrap">
                        <span className="nav-dd__label">{s.label}</span>
                        <span className="nav-dd__hint">Guides, docs, policy</span>
                      </span>
                    </span>
                    <span className="nav-dd__arrow" aria-hidden="true">
                      →
                    </span>
                  </NavLink>
                ))}

                <NavLink
                  to={withLang("/store")}
                  className={({ isActive }) => cx("nav-dd__item", isActive && "is-active")}
                  role="menuitem"
                  onClick={() => setResDropOpen(false)}
                >
                  <span className="nav-dd__left">
                    <span className="nav-dd__dot" aria-hidden="true" />
                    <span className="nav-dd__labelWrap">
                      <span className="nav-dd__label">NEOX Store</span>
                      <span className="nav-dd__hint">Products, packages, add-ons</span>
                    </span>
                  </span>
                  <span className="nav-dd__arrow" aria-hidden="true">
                    →
                  </span>
                </NavLink>
              </div>
            </div>
          </div>

          {/* BLOG direct */}
          <NavLink to={withLang("/blog")} className={navItem}>
            <span className="nav-label nav-label--full">{t("nav.blog")}</span>
          </NavLink>
        </nav>

        <div className="header-right">
          <LangMenu lang={lang} onPick={(c) => switchLang(c)} />

          <Link to={withLang("/contact")} className="nav-cta nav-cta--desktopOnly">
            {t("nav.contact")}
          </Link>

          <button
            className="nav-toggle"
            type="button"
            aria-label={open ? "Menyunu bağla" : "Menyunu aç"}
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => {
              if (!open) setOpen(true);
              else closeMobile();
            }}
          >
            <span className="nav-toggle__bar" />
            <span className="nav-toggle__bar" />
            <span className="nav-toggle__bar" />
          </button>
        </div>
      </div>

      {createPortal(MobileOverlay, document.body)}
    </header>
  );
}
