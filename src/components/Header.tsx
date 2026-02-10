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

type NavDef = { to: string; label: string; end?: boolean; hint?: string };

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
   ✅ Hover opens, click still works.
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

type MenuKey = "about" | "services" | "usecases" | "resources" | null;

type ServiceDef = { id: string; label: string; to: string; hint: string };

type ScenarioDef = {
  id: string;
  label: string;
  to: string;
  subtitle: string;
  terminal: string[];
};

type ServiceUseCaseLink = { label: string; to: string; hint?: string };

/* =========================
   Header
========================= */
export default function Header({ introReady }: { introReady: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [hdrp, setHdrp] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const [open, setOpen] = useState(false);
  const [softOpen, setSoftOpen] = useState(false);

  const prefersReduced = usePrefersReducedMotion();

  // ✅ SINGLE OPEN MENU
  const [openMenu, setOpenMenu] = useState<MenuKey>(null);
  const closeT = useRef<number | null>(null);

  const svcRef = useRef<HTMLDivElement | null>(null);
  const aboutRef = useRef<HTMLDivElement | null>(null);
  const resRef = useRef<HTMLDivElement | null>(null);
  const ucRef = useRef<HTMLDivElement | null>(null);

  // UseCases terminal typing state
  const [ucActive, setUcActive] = useState<string>("healthcare");
  const [termText, setTermText] = useState<string>("");
  const [termCursor, setTermCursor] = useState(true);

  // Services mega state (NEW)
  const [svcActive, setSvcActive] = useState<string>("business-workflows");
  const [svcCursor, setSvcCursor] = useState(true);

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

  // ✅ App.tsx ROUTES-una uyğun 6 services
  const SERVICES: ServiceDef[] = useMemo(
    () => [
      {
        id: "chatbot-24-7",
        label: "Chatbot 24/7",
        to: "/services/chatbot-24-7",
        hint: "Always-on chat that converts leads and answers fast.",
      },
      {
        id: "business-workflows",
        label: "Business Workflows",
        to: "/services/business-workflows",
        hint: "Trigger → route → act. End-to-end automation flows.",
      },
      {
        id: "websites",
        label: "Websites",
        to: "/services/websites",
        hint: "Premium, fast websites with modern UX.",
      },
      {
        id: "mobile-apps",
        label: "Mobile Apps",
        to: "/services/mobile-apps",
        hint: "iOS/Android apps with clean UI and scalable backend.",
      },
      {
        id: "smm-automation",
        label: "SMM Automation",
        to: "/services/smm-automation",
        hint: "Content, scheduling, funnels and automation.",
      },
      {
        id: "technical-support",
        label: "Technical Support",
        to: "/services/technical-support",
        hint: "Monitoring, fixes, deployments, and ongoing support.",
      },
    ],
    []
  );

  // ✅ /about subpage yoxdur
  const ABOUT_LINKS: NavDef[] = useMemo(
    () => [{ to: "/about", label: "About NEOX", hint: "Company, mission, technology (single page)" }],
    []
  );

  // ✅ resources: /resources/docs /resources/faq /resources/guides /privacy
  const RES_LINKS: NavDef[] = useMemo(
    () => [
      { to: "/resources/docs", label: "Docs", hint: "Documentation & references" },
      { to: "/resources/faq", label: "FAQ", hint: "Most asked questions" },
      { to: "/resources/guides", label: "Guides", hint: "Step-by-step tutorials" },
      { to: "/privacy", label: "Privacy Policy", hint: "Policy & data handling" },
    ],
    []
  );

  // ✅ Use Cases (5 ssenari)
  const SCENARIOS: ScenarioDef[] = useMemo(
    () => [
      {
        id: "healthcare",
        label: "Healthcare",
        to: "/use-cases/healthcare",
        subtitle: "Patient intake, scheduling, triage, secure flows",
        terminal: [
          "boot: neox/usecases/healthcare",
          "init: intake → classify → route",
          "flow: appointment booking + reminders",
          "guard: privacy-first, minimal data, secure handoff",
          "ops: reduce call load, faster response",
          "ok: satisfaction ↑, waiting ↓",
        ],
      },
      {
        id: "logistics",
        label: "Logistics",
        to: "/use-cases/logistics",
        subtitle: "Tracking, customer updates, support automation",
        terminal: [
          "boot: neox/usecases/logistics",
          "init: order_id → status lookup",
          "flow: ETA → notify customer → escalate if delayed",
          "tool: ticket creation + transcript to operator",
          "ops: fewer manual calls",
          "ok: delivery transparency ↑",
        ],
      },
      {
        id: "finance",
        label: "Finance",
        to: "/use-cases/finance",
        subtitle: "Lead capture, compliance-aware flows, conversion",
        terminal: [
          "boot: neox/usecases/finance",
          "init: intent → risk flags → safe response",
          "flow: pricing → demo → conversion pipeline",
          "guard: business-only focus, safe responses",
          "tool: lead → follow-up summary",
          "ok: qualified leads ↑",
        ],
      },
      {
        id: "retail",
        label: "Retail",
        to: "/use-cases/retail",
        subtitle: "Product help, upsell, order questions, support",
        terminal: [
          "boot: neox/usecases/retail",
          "init: product query → recommend bundles",
          "flow: sizing/availability → checkout CTA",
          "support: returns + shipping status",
          "ops: faster answers, higher AOV",
          "ok: conversion ↑",
        ],
      },
      {
        id: "hotels",
        label: "Hotels & Resorts",
        to: "/use-cases/hotels",
        subtitle: "Reservations, concierge, guest experience automation",
        terminal: [
          "boot: neox/usecases/hotels",
          "init: dates → availability → pricing",
          "flow: booking request → confirmation → reminders",
          "concierge: services, upgrades, local guide",
          "handoff: operator for complex requests",
          "ok: booking rate ↑, workload ↓",
        ],
      },
    ],
    []
  );

  // ✅ Services -> “Use cases” links panel (NEW)
  // Business Workflows: user said your 5 use-cases belong here → we put those 5.
  // Others: 3-4 ideas (routes can be created later; you said problem deyil).
  const SERVICE_USECASES: Record<string, ServiceUseCaseLink[]> = useMemo(
    () => ({
      "business-workflows": [
        { label: "Healthcare Automation", to: "/use-cases/healthcare", hint: "Routing, scheduling, triage flows" },
        { label: "Logistics Tracking Ops", to: "/use-cases/logistics", hint: "ETA, status, escalation" },
        { label: "Finance Conversion Flow", to: "/use-cases/finance", hint: "Lead capture, safe pipeline" },
        { label: "Retail Assist & Upsell", to: "/use-cases/retail", hint: "Bundles, checkout CTAs" },
        { label: "Hotels Concierge Ops", to: "/use-cases/hotels", hint: "Bookings + concierge automation" },
      ],
      "chatbot-24-7": [
        { label: "Lead Qualification", to: "/use-cases/lead-qualification", hint: "Capture → qualify → route" },
        { label: "Support Deflection", to: "/use-cases/support-deflection", hint: "Instant answers, fewer calls" },
        { label: "Sales Concierge", to: "/use-cases/sales-concierge", hint: "Packages, demos, upsell" },
        { label: "Multilingual Chat", to: "/use-cases/multilingual", hint: "Auto-translate conversations" },
      ],
      websites: [
        { label: "High-Conversion Landing", to: "/use-cases/landing", hint: "Fast pages, strong CTAs" },
        { label: "Product Showcase", to: "/use-cases/showcase", hint: "Premium UI + content blocks" },
        { label: "SEO + Performance", to: "/use-cases/seo-performance", hint: "Core Web Vitals focus" },
      ],
      "mobile-apps": [
        { label: "Booking App", to: "/use-cases/booking-app", hint: "Flows, reminders, payments" },
        { label: "Customer Portal", to: "/use-cases/portal", hint: "Tickets, status, profile" },
        { label: "Push Automation", to: "/use-cases/push", hint: "Smart notifications & triggers" },
      ],
      "smm-automation": [
        { label: "Content Scheduler", to: "/use-cases/scheduler", hint: "Plan → schedule → publish" },
        { label: "DM Auto-Reply", to: "/use-cases/dm", hint: "Instant replies, lead capture" },
        { label: "Funnel Automation", to: "/use-cases/funnel", hint: "Click → lead → follow-up" },
        { label: "Analytics Summary", to: "/use-cases/analytics", hint: "Weekly insights & actions" },
      ],
      "technical-support": [
        { label: "Monitoring & Alerts", to: "/use-cases/monitoring", hint: "Uptime, errors, alerts" },
        { label: "Deployments", to: "/use-cases/deploy", hint: "CI/CD, rollbacks, releases" },
        { label: "Incident Response", to: "/use-cases/incidents", hint: "Triage → fix → report" },
      ],
    }),
    []
  );

  // Active checks
  const isUseCasesActive = useMemo(
    () => location.pathname.toLowerCase().includes("/use-cases"),
    [location.pathname]
  );
  const isServicesActive = useMemo(
    () => location.pathname.toLowerCase().includes("/services"),
    [location.pathname]
  );
  const isAboutActive = useMemo(
    () => location.pathname.toLowerCase().includes("/about"),
    [location.pathname]
  );
  const isResActive = useMemo(() => {
    const p = location.pathname.toLowerCase();
    return p.includes("/resources") || p.includes("/privacy");
  }, [location.pathname]);

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
    setOpenMenu(null);

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

  // click outside for desktop dropdowns (single openMenu)
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!openMenu) return;
      const target = e.target as Node;

      const map: Record<Exclude<MenuKey, null>, React.RefObject<HTMLDivElement>> = {
        about: aboutRef,
        services: svcRef,
        resources: resRef,
        usecases: ucRef,
      };

      const ref = map[openMenu];
      const el = ref?.current;
      if (!el) return;
      if (!el.contains(target)) setOpenMenu(null);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [openMenu]);

  // hover open/close with tiny delay (✅ closes others)
  const openDrop = (menu: Exclude<MenuKey, null>) => {
    if (closeT.current) {
      window.clearTimeout(closeT.current);
      closeT.current = null;
    }
    setOpenMenu(menu);
  };
  const scheduleCloseDrop = (menu: Exclude<MenuKey, null>) => {
    if (closeT.current) window.clearTimeout(closeT.current);
    closeT.current = window.setTimeout(() => {
      setOpenMenu((cur) => (cur === menu ? null : cur));
    }, 110) as any;
  };

  // ======= UseCases TERMINAL typing =======
  const activeScenario = useMemo(
    () => SCENARIOS.find((s) => s.id === ucActive) ?? SCENARIOS[0],
    [SCENARIOS, ucActive]
  );

  useEffect(() => {
    if (openMenu !== "usecases") return;
    const tmr = window.setInterval(() => setTermCursor((v) => !v), 520);
    return () => window.clearInterval(tmr);
  }, [openMenu]);

  useEffect(() => {
    if (openMenu !== "usecases") return;

    const full = activeScenario.terminal.join("\n");
    if (prefersReduced) {
      setTermText(full);
      return;
    }

    let i = 0;
    setTermText("");

    let cancelled = false;

    const step = () => {
      if (cancelled) return;
      i += 1;
      setTermText(full.slice(0, i));
      if (i >= full.length) return;

      const ch = full[i] || "";
      const base = ch === "\n" ? 260 : 46;
      const jitter = ch === "\n" ? 120 : 32;
      const delay = base + Math.round(Math.random() * jitter);

      window.setTimeout(step, delay);
    };

    const start = window.setTimeout(step, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(start);
    };
  }, [activeScenario, openMenu, prefersReduced]);

  // ======= Services mega subtle cursor blink =======
  useEffect(() => {
    if (openMenu !== "services") return;
    const tmr = window.setInterval(() => setSvcCursor((v) => !v), 560);
    return () => window.clearInterval(tmr);
  }, [openMenu]);

  const svcActiveDef = useMemo(
    () => SERVICES.find((s) => s.id === svcActive) ?? SERVICES[1],
    [SERVICES, svcActive]
  );
  const svcUseCases = useMemo(() => SERVICE_USECASES[svcActiveDef.id] ?? [], [SERVICE_USECASES, svcActiveDef.id]);

  // mobile styles
  const mobileP = clamp01(hdrp);
  const base = 0.03;
  const mobileBgAlpha = open ? 0.90 : base + 0.70 * mobileP;
  const mobileBlurPx = open ? 20 : 3 + 15 * mobileP;
  const mobileSat = open ? 1.35 : 1 + 0.30 * mobileP;

  const headerInlineStyle: React.CSSProperties | undefined = isMobile
    ? {
        backgroundColor: `rgba(10, 12, 18, ${mobileBgAlpha.toFixed(3)})`,
        WebkitBackdropFilter: `blur(${mobileBlurPx.toFixed(1)}px) saturate(${mobileSat.toFixed(2)})`,
        backdropFilter: `blur(${mobileBlurPx.toFixed(1)}px) saturate(${mobileSat.toFixed(2)})`,
        borderBottom: `1px solid rgba(255,255,255,${(open ? 0.10 : 0.06 * mobileP).toFixed(3)})`,
      }
    : undefined;

  // ✅ Logo: mobile-də balaca, yuxarı sol
  const logoH = isMobile ? 16 : 28;
  const logoMaxW = isMobile ? "104px" : "156px";

  // ===== Mobile Overlay (same links as desktop) =====
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
            <span className="nav-sheet__title">MENU</span>
          </div>

          <button className="nav-sheet__close" type="button" aria-label="Bağla" onClick={closeMobile}>
            <X size={18} />
          </button>
        </div>

        <div className="nav-sheet__list" role="navigation" aria-label="Mobil menyu">
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
              {ABOUT_LINKS.map((s) => (
                <NavLink
                  key={s.to}
                  to={withLang(s.to)}
                  className={({ isActive }) => cx("nav-acc__item", isActive && "is-active")}
                  onClick={() => closeMobile()}
                >
                  <span className="nav-acc__text">{s.label}</span>
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
              {SERVICES.map((s) => (
                <NavLink
                  key={s.id}
                  to={withLang(s.to)}
                  className={({ isActive }) => cx("nav-acc__item", isActive && "is-active")}
                  onClick={() => closeMobile()}
                >
                  <span className="nav-acc__text">{s.label}</span>
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
                <span className="nav-acc__text">All Use Cases</span>
              </NavLink>

              {SCENARIOS.map((s) => (
                <NavLink
                  key={s.id}
                  to={withLang(s.to)}
                  className={({ isActive }) => cx("nav-acc__item", isActive && "is-active")}
                  onClick={() => closeMobile()}
                >
                  <span className="nav-acc__text">{s.label}</span>
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
                  <span className="nav-acc__text">{s.label}</span>
                </NavLink>
              ))}
            </div>
          </div>

          {/* Blog direct */}
          <NavLink
            to={withLang("/blog")}
            className={cx("nav-sheetLink", "nav-stagger")}
            style={{ ["--i" as any]: 5 }}
            onClick={() => {
              window.scrollTo({ top: 0, left: 0, behavior: "auto" });
              closeMobile();
            }}
          >
            <span className="nav-sheetLink__left">
              <span className="nav-sheetLink__ico" aria-hidden="true">
                <BookOpen size={18} />
              </span>
              <span className="nav-sheetLink__label">{t("nav.blog")}</span>
            </span>
          </NavLink>

          {/* Contact */}
          <NavLink
            to={withLang("/contact")}
            className={cx("nav-sheetLink", "nav-sheetLink--contact", "nav-stagger")}
            style={{ ["--i" as any]: 6 }}
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
          </NavLink>
        </div>
      </div>
    </div>
  );

  const aboutOpen = openMenu === "about";
  const svcOpen = openMenu === "services";
  const ucOpen = openMenu === "usecases";
  const resOpen = openMenu === "resources";

  return (
    <header
      ref={headerRef}
      style={headerInlineStyle}
      className={cx("site-header", introReady && "site-header--in", scrolled && "is-scrolled", open && "is-open")}
      data-top={scrolled ? "0" : "1"}
    >
      {/* ✅ FULL CSS INJECT — Premium, NO purple, NO arrows/underlines, mobile scroll fix */}
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
          background: rgba(8, 10, 16, calc(0.10 + 0.26 * var(--hdrp)));
          border-bottom-color: rgba(255,255,255, calc(0.07 + 0.06 * var(--hdrp)));
          -webkit-backdrop-filter: blur(calc(10px + 12px * var(--hdrp))) saturate(1.22);
          backdrop-filter: blur(calc(10px + 12px * var(--hdrp))) saturate(1.22);
        }
        .site-header.is-open{
          background: rgba(8, 10, 16, 0.92);
          border-bottom-color: rgba(255,255,255,0.10);
          -webkit-backdrop-filter: blur(20px) saturate(1.35);
          backdrop-filter: blur(20px) saturate(1.35);
        }

        .container{ max-width: 1180px; margin: 0 auto; padding: 0 18px; }
        .header-inner{ height: var(--hdrh); display: grid; align-items: center; }
        .header-grid{ grid-template-columns: auto 1fr auto; gap: 16px; }
        .header-left{ display:flex; align-items:center; min-width: 0; }
        .header-mid{ display:flex; align-items:center; justify-content:center; gap: 10px; }
        .header-right{ display:flex; align-items:center; justify-content:flex-end; gap: 12px; }

        .brand-link{ display: inline-flex; align-items: center; gap: 10px; text-decoration: none; user-select: none; }
        .headerBrand{ position: relative; display:flex; align-items:center; }
        .headerBrand__aura{
          position:absolute; inset:-10px -16px;
          background:
            radial-gradient(120px 44px at 28% 60%, rgba(47,184,255,.18), transparent 60%),
            radial-gradient(120px 44px at 70% 40%, rgba(47,184,255,.10), transparent 62%);
          filter: blur(10px); opacity: .75; pointer-events:none;
        }

        /* premium nav typography */
        .nav-link{
          position: relative;
          display: inline-flex; align-items: center; justify-content: center;
          gap: 8px; height: 40px; padding: 0 12px; border-radius: 999px;
          text-decoration: none;
          color: rgba(255,255,255,.72);
          font-weight: 650;
          font-size: 13px;
          letter-spacing: .015em;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
          transition: color .16s ease, background-color .16s ease, transform .16s ease, border-color .16s ease;
        }
        .nav-link:hover{ color: rgba(255,255,255,.92); background: rgba(255,255,255,.06); }
        .nav-link.is-active{ color: rgba(255,255,255,.96); background: rgba(255,255,255,.08); }

        .nav-dd{ position: relative; display:inline-flex; }
        .nav-dd__btn{
          position: relative; display:inline-flex; align-items:center; gap: 8px;
          height: 40px; padding: 0 12px; border-radius: 999px;
          color: rgba(255,255,255,.72); background: transparent; border: 0;
          cursor: pointer;
          font: inherit;
          font-weight: 700;
          letter-spacing: .015em;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
          transition: color .16s ease, background-color .16s ease, transform .16s ease;
        }
        .nav-dd__btn:hover{ color: rgba(255,255,255,.92); background: rgba(255,255,255,.06); transform: translateY(-1px); }
        .nav-dd__btn.is-active{ color: rgba(255,255,255,.96); background: rgba(255,255,255,.08); }

        .nav-dd__chev{ opacity: .78; transition: transform .14s ease; }
        .nav-dd.is-open .nav-dd__chev{ transform: rotate(180deg); }

        /* panel – no purple, cleaner */
        .nav-dd__panel{
          position:absolute; top: calc(100% + 10px); left: 50%;
          transform: translateX(-50%);
          width: 390px; border-radius: 18px; padding: 14px;
          border: 1px solid rgba(255,255,255,.09);
          background:
            radial-gradient(120% 90% at 18% 12%, rgba(47,184,255,.14), transparent 55%),
            radial-gradient(120% 90% at 88% 10%, rgba(47,184,255,.08), transparent 60%),
            rgba(8,10,16,.88);
          -webkit-backdrop-filter: blur(20px) saturate(1.25);
          backdrop-filter: blur(20px) saturate(1.25);
          box-shadow: 0 28px 90px rgba(0,0,0,.70);
          opacity: 0; pointer-events: none;
          transform-origin: top center;
          transform: translateX(-50%) translateY(-8px) scale(.985);
          transition: opacity .16s ease, transform .16s ease;
          z-index: 1300;
        }
        .nav-dd.is-open .nav-dd__panel{
          opacity: 1; pointer-events: auto;
          transform: translateX(-50%) translateY(0) scale(1);
        }
        .nav-dd__title{
          font-size: 10px;
          letter-spacing: .20em;
          color: rgba(255,255,255,.55);
          padding: 2px 6px 10px;
          font-weight: 800;
        }
        .nav-dd__grid{ display:grid; gap: 8px; }

        .nav-dd__item{
          display:flex; align-items:flex-start; justify-content: space-between; gap: 12px;
          padding: 10px 10px; border-radius: 14px;
          text-decoration:none;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.035);
          color: rgba(255,255,255,.86);
          transition: background-color .16s ease, border-color .16s ease, transform .16s ease;
        }
        .nav-dd__item:hover{
          background: rgba(255,255,255,.055);
          border-color: rgba(255,255,255,.10);
          transform: translateY(-1px);
        }
        .nav-dd__item.is-active{
          background: rgba(47,184,255,.10);
          border-color: rgba(47,184,255,.22);
        }

        .nav-dd__left{ display:flex; align-items:flex-start; gap: 10px; min-width: 0; }
        .nav-dd__dot{
          width: 8px; height: 8px; border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), rgba(47,184,255,.88));
          box-shadow: 0 0 0 3px rgba(47,184,255,.10);
          margin-top: 5px; flex: 0 0 auto;
        }
        .nav-dd__labelWrap{ display:flex; flex-direction:column; min-width: 0; }
        .nav-dd__label{
          font-weight: 820;
          font-size: 13px;
          line-height: 1.15;
          letter-spacing: .01em;
        }
        .nav-dd__hint{
          margin-top: 4px;
          font-size: 12px;
          line-height: 1.25;
          color: rgba(255,255,255,.58);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          max-width: 260px;
        }
        /* ❌ remove arrow visuals */
        .nav-dd__arrow{ display:none; }

        /* ===== Mega (UseCases + Services) ===== */
        .nav-dd--mega .nav-dd__panel{ width: 900px; padding: 14px; border-radius: 20px; }

        /* ---- UseCases mega ---- */
        .uc-mega{ display:grid; grid-template-columns: 1fr 1.2fr; gap: 12px; align-items: stretch; }
        .uc-left{
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.03);
          overflow: hidden;
        }
        .uc-leftHead{
          padding: 10px 12px;
          font-size: 10px;
          letter-spacing: .22em;
          color: rgba(255,255,255,.58);
          border-bottom: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.02);
          font-weight: 850;
        }
        .uc-item{
          width: 100%;
          display:flex; align-items:flex-start; justify-content: space-between; gap: 12px;
          padding: 12px 12px; border: 0; cursor: pointer; text-align: left;
          background: transparent; color: rgba(255,255,255,.90);
          transition: background-color .16s ease, transform .16s ease;
        }
        .uc-item:hover{ background: rgba(255,255,255,.05); transform: translateY(-1px); }
        .uc-item.is-active{ background: rgba(47,184,255,.10); }
        .uc-itemTitle{ font-weight: 880; font-size: 13px; line-height: 1.15; }
        .uc-itemSub{ margin-top: 4px; font-size: 12px; color: rgba(255,255,255,.58); line-height: 1.2; }
        .uc-itemIcon{ opacity: .7; margin-top: 2px; flex: 0 0 auto; }

        .uc-right{
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.10);
          background:
            radial-gradient(120% 80% at 10% 0%, rgba(47,184,255,.12), transparent 55%),
            radial-gradient(120% 80% at 90% 0%, rgba(47,184,255,.06), transparent 60%),
            rgba(0,0,0,.22);
          overflow: hidden; position: relative;
        }
        .uc-termTop{
          padding: 10px 12px; display:flex; align-items:center; justify-content: space-between;
          border-bottom: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.02);
        }
        .uc-termTitle{
          font-size: 10px;
          letter-spacing: .22em;
          color: rgba(255,255,255,.66);
          font-weight: 900;
          text-transform: uppercase;
        }
        .uc-termBadge{
          font-size: 10px;
          letter-spacing: .18em;
          color: rgba(255,255,255,.55);
          font-weight: 850;
        }
        .uc-termBody{
          padding: 12px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 12px; line-height: 1.5; color: rgba(255,255,255,.86);
          min-height: 230px;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .uc-prompt{ color: rgba(47,184,255,.94); font-weight: 900; }
        .uc-cursor{
          display:inline-block; width: 9px; height: 14px; margin-left: 6px;
          transform: translateY(2px); background: rgba(255,255,255,.86);
          border-radius: 2px;
        }
        .uc-footer{
          padding: 10px 12px;
          border-top: 1px solid rgba(255,255,255,.06);
          display:flex; align-items:center; justify-content: space-between; gap: 10px;
          background: rgba(255,255,255,.02);
        }
        .uc-miniLink{
          display:inline-flex; align-items:center; gap: 8px;
          text-decoration:none; font-weight: 850; font-size: 12px;
          color: rgba(255,255,255,.90);
          padding: 8px 10px; border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          transition: transform .16s ease, background-color .16s ease, border-color .16s ease;
        }
        .uc-miniLink:hover{
          transform: translateY(-1px);
          background: rgba(255,255,255,.06);
          border-color: rgba(255,255,255,.14);
        }
        .uc-miniHint{ font-size: 12px; color: rgba(255,255,255,.58); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        /* ---- Services mega (NEW: services list + right-to-left usecase links) ---- */
        .svc-mega{ display:grid; grid-template-columns: 1fr 1.2fr; gap: 12px; align-items: stretch; }
        .svc-left{
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.03);
          overflow: hidden;
        }
        .svc-leftHead{
          padding: 10px 12px;
          font-size: 10px;
          letter-spacing: .22em;
          color: rgba(255,255,255,.58);
          border-bottom: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.02);
          font-weight: 850;
        }
        .svc-item{
          width: 100%;
          display:flex; align-items:flex-start; justify-content: space-between; gap: 12px;
          padding: 12px 12px;
          border: 0;
          cursor: pointer;
          text-align: left;
          background: transparent;
          color: rgba(255,255,255,.90);
          transition: background-color .16s ease, transform .16s ease;
        }
        .svc-item:hover{ background: rgba(255,255,255,.05); transform: translateY(-1px); }
        .svc-item.is-active{ background: rgba(47,184,255,.10); }
        .svc-itemTitle{ font-weight: 880; font-size: 13px; line-height: 1.15; }
        .svc-itemSub{ margin-top: 4px; font-size: 12px; color: rgba(255,255,255,.58); line-height: 1.2; }
        .svc-itemIcon{ opacity: .7; margin-top: 2px; flex: 0 0 auto; }

        .svc-right{
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.10);
          background:
            radial-gradient(120% 80% at 10% 0%, rgba(47,184,255,.12), transparent 55%),
            radial-gradient(120% 80% at 90% 0%, rgba(47,184,255,.06), transparent 60%),
            rgba(0,0,0,.22);
          overflow: hidden;
          position: relative;
        }
        .svc-rightTop{
          padding: 10px 12px;
          display:flex; align-items:center; justify-content: space-between;
          border-bottom: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.02);
        }
        .svc-rightTitle{
          font-size: 10px;
          letter-spacing: .22em;
          color: rgba(255,255,255,.66);
          font-weight: 900;
          text-transform: uppercase;
        }
        .svc-rightHint{
          font-size: 10px;
          letter-spacing: .18em;
          color: rgba(255,255,255,.55);
          font-weight: 850;
          display:flex; align-items:center; gap: 8px;
        }
        .svc-blink{
          display:inline-block; width: 8px; height: 10px;
          background: rgba(255,255,255,.86);
          border-radius: 2px;
          transform: translateY(1px);
        }

        .svc-rightBody{ padding: 12px; }
        .svc-rail{
          display:grid;
          gap: 10px;
        }
        .svc-ucLink{
          text-decoration:none;
          display:flex;
          align-items:center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.035);
          color: rgba(255,255,255,.90);
          position: relative;
          overflow:hidden;
          transform: translateX(18px);
          opacity: 0;
          animation: svcIn .26s ease forwards;
          animation-delay: calc(0.03s * var(--i, 0));
          will-change: transform, opacity;
        }
        @keyframes svcIn{
          to{ transform: translateX(0); opacity: 1; }
        }
        .svc-ucLink:hover{
          background: rgba(255,255,255,.055);
          border-color: rgba(255,255,255,.12);
          transform: translateX(0) translateY(-1px);
          transition: transform .16s ease, background-color .16s ease, border-color .16s ease;
        }
        .svc-ucLabel{
          font-weight: 880;
          font-size: 13px;
          letter-spacing: .01em;
          line-height: 1.15;
        }
        .svc-ucHint{
          margin-top: 4px;
          font-size: 12px;
          color: rgba(255,255,255,.58);
          line-height: 1.25;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 420px;
        }
        .svc-ucDot{
          width: 8px; height: 8px; border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), rgba(47,184,255,.88));
          box-shadow: 0 0 0 3px rgba(47,184,255,.10);
          flex: 0 0 auto;
        }

        .nav-cta{
          display:inline-flex; align-items:center; justify-content:center;
          height: 38px; padding: 0 14px; border-radius: 999px;
          text-decoration:none;
          font-weight: 850; font-size: 13px;
          color: rgba(255,255,255,.94);
          border: 1px solid rgba(255,255,255,.10);
          background:
            radial-gradient(120% 120% at 20% 10%, rgba(47,184,255,.22), transparent 60%),
            rgba(255,255,255,.06);
          transition: transform .16s ease, background-color .16s ease, border-color .16s ease;
        }
        .nav-cta:hover{ transform: translateY(-1px); border-color: rgba(255,255,255,.16); background: rgba(255,255,255,.08); }
        .nav-cta--desktopOnly{ display:inline-flex; }

        .nav-toggle{
          width: 44px; height: 40px; border-radius: 14px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          display:none; align-items:center; justify-content:center;
          flex-direction: column; gap: 5px;
          cursor: pointer;
          transition: background-color .16s ease, border-color .16s ease, transform .16s ease;
        }
        .nav-toggle:hover{ transform: translateY(-1px); background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.14); }
        .nav-toggle__bar{ width: 18px; height: 2px; border-radius: 999px; background: rgba(255,255,255,.86); opacity: .9; }

        /* Language (NO purple) */
        .langMenu{ position: relative; }
        .langMenu__btn{
          display:inline-flex; align-items:center; gap: 8px;
          height: 38px; padding: 0 10px; border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.90);
          font-weight: 850; font-size: 12px;
          cursor: pointer;
          transition: background-color .16s ease, border-color .16s ease, transform .16s ease;
        }
        .langMenu__btn:hover{ transform: translateY(-1px); background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.14); }
        .langMenu__dot{
          width: 8px; height: 8px; border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.92), rgba(47,184,255,.88));
          box-shadow: 0 0 0 3px rgba(47,184,255,.10);
        }
        .langMenu__code{ letter-spacing: .08em; }
        .langMenu__chev{ opacity: .75; }

        .langMenu__panel{
          position:absolute; top: calc(100% + 10px); right: 0;
          width: 210px; border-radius: 16px; padding: 10px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(8,10,16,.92);
          -webkit-backdrop-filter: blur(20px) saturate(1.2);
          backdrop-filter: blur(20px) saturate(1.2);
          box-shadow: 0 26px 90px rgba(0,0,0,.70);
          opacity: 0; pointer-events: none;
          transform: translateY(-8px) scale(.985);
          transition: opacity .16s ease, transform .16s ease;
          z-index: 1500;
        }
        .langMenu.is-open .langMenu__panel{
          opacity: 1; pointer-events: auto;
          transform: translateY(0) scale(1);
        }
        .langMenu__item{
          width: 100%;
          display:flex; align-items:center; justify-content: space-between; gap: 10px;
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.90);
          padding: 10px 10px;
          border-radius: 12px;
          cursor: pointer;
          transition: background-color .16s ease, border-color .16s ease, transform .16s ease;
        }
        .langMenu__item + .langMenu__item{ margin-top: 8px; }
        .langMenu__item:hover{ background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.10); transform: translateY(-1px); }
        .langMenu__item.is-active{ background: rgba(47,184,255,.12); border-color: rgba(47,184,255,.22); }
        .langMenu__itemCode{ font-weight: 900; letter-spacing: .10em; }
        .langMenu__itemName{ opacity: .88; font-weight: 750; }

        /* ===== Mobile overlay (scroll FIX + premium) ===== */
        .nav-overlay{ position: fixed; inset: 0; z-index: 2000; opacity: 0; pointer-events: none; transition: opacity .18s ease; }
        .nav-overlay.is-mounted{ display:block; }
        .nav-overlay.is-open{ opacity: 1; pointer-events: auto; }
        .nav-overlay__backdrop{
          position:absolute; inset:0; border:0;
          background: rgba(0,0,0,.52);
          -webkit-backdrop-filter: blur(10px);
          backdrop-filter: blur(10px);
          cursor: pointer;
        }

        .nav-sheet{
          position:absolute; top: 12px; right: 12px; left: 12px;
          max-width: 520px; margin-left: auto;
          height: calc(100dvh - 24px);
          border-radius: 22px; border: 1px solid rgba(255,255,255,.10);
          overflow: hidden;
          transform: translateY(-12px) scale(.985);
          opacity: 0;
          transition: transform .18s ease, opacity .18s ease;
          display:flex;
          flex-direction: column;
        }
        .nav-sheet.is-open{ transform: translateY(0) scale(1); opacity: 1; }

        .nav-sheet__bg{
          position:absolute; inset:0;
          background:
            radial-gradient(120% 90% at 18% 0%, rgba(47,184,255,.16), transparent 55%),
            radial-gradient(120% 90% at 88% 0%, rgba(47,184,255,.08), transparent 60%),
            rgba(8,10,16,.94);
          -webkit-backdrop-filter: blur(20px) saturate(1.25);
          backdrop-filter: blur(20px) saturate(1.25);
        }
        .nav-sheet__noise{
          position:absolute; inset:0;
          opacity: .06;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E");
          background-size: 160px 160px;
          pointer-events:none;
          mix-blend-mode: overlay;
        }

        .nav-sheet__head{
          position: relative; z-index: 2;
          display:flex; align-items:center; justify-content: space-between;
          padding: 14px 14px 10px;
          flex: 0 0 auto;
        }
        .nav-sheet__brand{ display:flex; align-items:center; gap: 10px; }
        .nav-sheet__dot{
          width: 10px; height: 10px; border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), rgba(47,184,255,.88));
          box-shadow: 0 0 0 4px rgba(47,184,255,.10);
        }
        .nav-sheet__title{
          font-weight: 900;
          letter-spacing: .22em;
          font-size: 11px;
          color: rgba(255,255,255,.72);
        }
        .nav-sheet__close{
          width: 40px; height: 38px; border-radius: 14px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.05);
          color: rgba(255,255,255,.90);
          display:flex; align-items:center; justify-content:center;
          cursor: pointer;
          transition: transform .16s ease, background-color .16s ease;
        }
        .nav-sheet__close:hover{ transform: translateY(-1px); background: rgba(255,255,255,.07); }

        /* ✅ scrollable list */
        .nav-sheet__list{
          position: relative; z-index: 2;
          padding: 8px 14px 14px;
          display:grid;
          gap: 10px;
          overflow: auto;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          flex: 1 1 auto;
          min-height: 0;
        }

        .nav-stagger{ transform: translateY(8px); opacity: 0; animation: navIn .24s ease forwards; animation-delay: calc(0.03s * var(--i, 0)); }
        @keyframes navIn{ to{ transform: translateY(0); opacity: 1; } }

        .nav-sheetLink{
          display:flex; align-items:center; justify-content: space-between; gap: 12px;
          padding: 12px 12px; border-radius: 16px;
          text-decoration:none;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.88);
          transition: transform .16s ease, background-color .16s ease, border-color .16s ease;
        }
        .nav-sheetLink:hover{ transform: translateY(-1px); background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.12); }
        .nav-sheetLink.is-active{ background: rgba(47,184,255,.10); border-color: rgba(47,184,255,.22); }

        .nav-sheetLink__left{ display:flex; align-items:center; gap: 10px; min-width: 0; }
        .nav-sheetLink__ico{
          width: 34px; height: 34px;
          display:flex; align-items:center; justify-content:center;
          border-radius: 14px;
          background: rgba(255,255,255,.05);
          border: 1px solid rgba(255,255,255,.07);
          flex: 0 0 auto;
        }
        .nav-sheetLink__label{
          font-weight: 850;
          letter-spacing: .01em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .nav-sheetLink--contact{
          background:
            radial-gradient(120% 120% at 20% 10%, rgba(47,184,255,.22), transparent 60%),
            rgba(255,255,255,.05);
          border-color: rgba(255,255,255,.12);
        }

        .nav-acc{
          border-radius: 18px;
          overflow:hidden;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.03);
        }
        .nav-acc__head{
          width: 100%;
          border:0; background: transparent;
          display:flex; align-items:center; justify-content: space-between;
          padding: 12px 12px;
          cursor:pointer;
          color: rgba(255,255,255,.90);
        }
        .nav-acc__chev{ opacity: .80; transition: transform .16s ease; }
        .nav-acc__head.is-open .nav-acc__chev{ transform: rotate(180deg); }

        .nav-acc__panel{
          display:grid; gap: 8px;
          padding: 0 12px 12px;
          max-height: 0; overflow: hidden;
          transition: max-height .20s ease;
        }
        .nav-acc__panel.is-open{ max-height: 900px; }

        .nav-acc__item{
          display:flex; align-items:center; justify-content: space-between; gap: 10px;
          padding: 10px 10px; border-radius: 14px;
          text-decoration:none;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.86);
          transition: background-color .16s ease, border-color .16s ease, transform .16s ease;
        }
        .nav-acc__item:hover{ background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.10); transform: translateY(-1px); }
        .nav-acc__item.is-active{ background: rgba(47,184,255,.12); border-color: rgba(47,184,255,.22); }
        .nav-acc__text{ font-weight: 850; letter-spacing: .01em; }

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
                  filter: "drop-shadow(0 6px 16px rgba(0,0,0,.42)) drop-shadow(0 0 10px rgba(47,184,255,.08))",
                  transform: isMobile ? "translateY(0px) translateZ(0)" : "translateZ(0)",
                }}
              />
            </span>
          </Link>
        </div>

        <nav className="header-mid" aria-label="Əsas menyu">
          <NavLink to={withLang("/")} end className={navItem}>
            <span className="nav-label nav-label--full">{t("nav.home")}</span>
          </NavLink>

          {/* ABOUT */}
          <div
            ref={aboutRef}
            className={cx("nav-dd", aboutOpen && "is-open")}
            onMouseEnter={() => openDrop("about")}
            onMouseLeave={() => scheduleCloseDrop("about")}
          >
            <button
              type="button"
              className={cx("nav-dd__btn", (isAboutActive || aboutOpen) && "is-active")}
              aria-haspopup="menu"
              aria-expanded={aboutOpen}
              onClick={() => setOpenMenu((v) => (v === "about" ? null : "about"))}
              onFocus={() => openDrop("about")}
            >
              <span className="nav-label nav-label--full">{t("nav.about")}</span>
              <span className="nav-dd__chev" aria-hidden="true">
                <ChevronDown size={16} />
              </span>
            </button>

            <div className="nav-dd__panel" role="menu" aria-hidden={!aboutOpen}>
              <div className="nav-dd__title">ABOUT</div>
              <div className="nav-dd__grid">
                {ABOUT_LINKS.map((s) => (
                  <NavLink
                    key={s.to}
                    to={withLang(s.to)}
                    className={({ isActive }) => cx("nav-dd__item", isActive && "is-active")}
                    role="menuitem"
                    onClick={() => setOpenMenu(null)}
                  >
                    <span className="nav-dd__left">
                      <span className="nav-dd__dot" aria-hidden="true" />
                      <span className="nav-dd__labelWrap">
                        <span className="nav-dd__label">{s.label}</span>
                        <span className="nav-dd__hint">{s.hint ?? "About page"}</span>
                      </span>
                    </span>
                  </NavLink>
                ))}
              </div>
            </div>
          </div>

          {/* SERVICES mega (NEW) */}
          <div
            ref={svcRef}
            className={cx("nav-dd", "nav-dd--mega", svcOpen && "is-open")}
            onMouseEnter={() => openDrop("services")}
            onMouseLeave={() => scheduleCloseDrop("services")}
          >
            <button
              type="button"
              className={cx("nav-dd__btn", (isServicesActive || svcOpen) && "is-active")}
              aria-haspopup="menu"
              aria-expanded={svcOpen}
              onClick={() => setOpenMenu((v) => (v === "services" ? null : "services"))}
              onFocus={() => openDrop("services")}
            >
              <span className="nav-label nav-label--full">{t("nav.services")}</span>
              <span className="nav-dd__chev" aria-hidden="true">
                <ChevronDown size={16} />
              </span>
            </button>

            <div className="nav-dd__panel" role="menu" aria-hidden={!svcOpen}>
              <div className="nav-dd__title">SERVICES</div>

              <div className="svc-mega">
                <div className="svc-left">
                  <div className="svc-leftHead">SELECT A SERVICE</div>

                  {SERVICES.map((s) => {
                    const active = s.id === svcActiveDef.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        className={cx("svc-item", active && "is-active")}
                        onMouseEnter={() => setSvcActive(s.id)}
                        onFocus={() => setSvcActive(s.id)}
                        onClick={() => {
                          setOpenMenu(null);
                          navigate(withLang(s.to));
                          window.scrollTo({ top: 0, left: 0, behavior: "auto" });
                        }}
                      >
                        <span style={{ minWidth: 0 }}>
                          <div className="svc-itemTitle">{s.label}</div>
                          <div className="svc-itemSub">{s.hint}</div>
                        </span>
                        <span className="svc-itemIcon" aria-hidden="true">
                          <span style={{ opacity: 0.85 }}>⋯</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="svc-right">
                  <div className="svc-rightTop">
                    <div className="svc-rightTitle">{svcActiveDef.label}</div>
                    <div className="svc-rightHint">
                      USE CASES
                      <span className="svc-blink" style={{ opacity: svcCursor ? 0.85 : 0.15 }} aria-hidden="true" />
                    </div>
                  </div>

                  <div className="svc-rightBody">
                    <div key={svcActiveDef.id} className="svc-rail" aria-label="Service use cases">
                      {svcUseCases.map((u, idx) => (
                        <NavLink
                          key={`${svcActiveDef.id}:${u.to}:${idx}`}
                          to={withLang(u.to)}
                          className="svc-ucLink"
                          style={{ ["--i" as any]: idx }}
                          onClick={() => setOpenMenu(null)}
                        >
                          <span style={{ minWidth: 0 }}>
                            <div className="svc-ucLabel">{u.label}</div>
                            <div className="svc-ucHint">{u.hint ?? "Open scenario page"}</div>
                          </span>
                          <span className="svc-ucDot" aria-hidden="true" />
                        </NavLink>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* USE CASES mega */}
          <div
            ref={ucRef}
            className={cx("nav-dd", "nav-dd--mega", ucOpen && "is-open")}
            onMouseEnter={() => openDrop("usecases")}
            onMouseLeave={() => scheduleCloseDrop("usecases")}
          >
            <button
              type="button"
              className={cx("nav-dd__btn", (isUseCasesActive || ucOpen) && "is-active")}
              aria-haspopup="menu"
              aria-expanded={ucOpen}
              onClick={() => setOpenMenu((v) => (v === "usecases" ? null : "usecases"))}
              onFocus={() => openDrop("usecases")}
            >
              <span className="nav-label nav-label--full">{t("nav.useCases")}</span>
              <span className="nav-dd__chev" aria-hidden="true">
                <ChevronDown size={16} />
              </span>
            </button>

            <div className="nav-dd__panel" role="menu" aria-hidden={!ucOpen}>
              <div className="nav-dd__title">USE CASES</div>

              <div className="uc-mega">
                <div className="uc-left">
                  <div className="uc-leftHead">SELECT A SCENARIO</div>

                  {SCENARIOS.map((s) => {
                    const active = s.id === ucActive;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        className={cx("uc-item", active && "is-active")}
                        onMouseEnter={() => setUcActive(s.id)}
                        onFocus={() => setUcActive(s.id)}
                        onClick={() => {
                          setOpenMenu(null);
                          navigate(withLang(s.to));
                          window.scrollTo({ top: 0, left: 0, behavior: "auto" });
                        }}
                      >
                        <span style={{ minWidth: 0 }}>
                          <div className="uc-itemTitle">{s.label}</div>
                          <div className="uc-itemSub">{s.subtitle}</div>
                        </span>
                        <span className="uc-itemIcon" aria-hidden="true">
                          <span style={{ opacity: 0.85 }}>⋯</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="uc-right">
                  <div className="uc-termTop">
                    <div className="uc-termTitle">{activeScenario.label}</div>
                    <div className="uc-termBadge">TERMINAL</div>
                  </div>

                  <div className="uc-termBody" aria-live="polite">
                    <span className="uc-prompt">$</span>{" "}
                    {termText}
                    <span className="uc-cursor" style={{ opacity: termCursor ? 0.9 : 0.2 }} aria-hidden="true" />
                  </div>

                  <div className="uc-footer">
                    <NavLink to={withLang("/use-cases")} className="uc-miniLink" onClick={() => setOpenMenu(null)}>
                      Open {t("nav.useCases")}
                    </NavLink>
                    <div className="uc-miniHint">{activeScenario.subtitle}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RESOURCES */}
          <div
            ref={resRef}
            className={cx("nav-dd", resOpen && "is-open")}
            onMouseEnter={() => openDrop("resources")}
            onMouseLeave={() => scheduleCloseDrop("resources")}
          >
            <button
              type="button"
              className={cx("nav-dd__btn", (isResActive || resOpen) && "is-active")}
              aria-haspopup="menu"
              aria-expanded={resOpen}
              onClick={() => setOpenMenu((v) => (v === "resources" ? null : "resources"))}
              onFocus={() => openDrop("resources")}
            >
              <span className="nav-label nav-label--full">Resources</span>
              <span className="nav-dd__chev" aria-hidden="true">
                <ChevronDown size={16} />
              </span>
            </button>

            <div className="nav-dd__panel" role="menu" aria-hidden={!resOpen}>
              <div className="nav-dd__title">RESOURCES</div>
              <div className="nav-dd__grid">
                {RES_LINKS.map((s) => (
                  <NavLink
                    key={s.to}
                    to={withLang(s.to)}
                    className={({ isActive }) => cx("nav-dd__item", isActive && "is-active")}
                    role="menuitem"
                    onClick={() => setOpenMenu(null)}
                  >
                    <span className="nav-dd__left">
                      <span className="nav-dd__dot" aria-hidden="true" />
                      <span className="nav-dd__labelWrap">
                        <span className="nav-dd__label">{s.label}</span>
                        <span className="nav-dd__hint">{s.hint ?? "Guides, docs, policy"}</span>
                      </span>
                    </span>
                  </NavLink>
                ))}
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
