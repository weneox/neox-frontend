// src/components/Header.tsx
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { X, Home, Sparkles, Layers, BookOpen, PhoneCall, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LANGS, DEFAULT_LANG, type Lang } from "../i18n/lang";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

type NavDef = { to: string; label: string; end?: boolean };
type MenuKey = "services" | "usecases" | "resources" | null;

type MegaItem = {
  id: string;
  label: string;
  sub?: string;
  to: string;
  // right panel content
  title: string;
  desc: string;
  cards: Array<{ k: string; title: string; desc: string; to: string; tag?: string }>;
  terminalLines: string[];
};

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}
function isLang(x: string | undefined | null): x is Lang {
  return !!x && (LANGS as readonly string[]).includes(x as any);
}
function getWindowScrollY() {
  return window.scrollY || document.documentElement.scrollTop || 0;
}

/* motion pref */
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

/* ===== Desktop language dropdown (hover, expands left with full name) ===== */
function LangMenu({ lang, onPick }: { lang: Lang; onPick: (l: Lang) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const closeT = useRef<number | null>(null);

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

  const openDrop = () => {
    if (closeT.current) {
      window.clearTimeout(closeT.current);
      closeT.current = null;
    }
    setOpen(true);
  };
  const scheduleClose = () => {
    if (closeT.current) window.clearTimeout(closeT.current);
    closeT.current = window.setTimeout(() => setOpen(false), 140) as any;
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
          <ChevronDown size={14} />
        </span>
      </button>

      <div className="langMenu__panel" role="menu" aria-hidden={!open}>
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

            {/* full name reveals to the LEFT on hover */}
            <span className="langMenu__reveal" aria-hidden="true">
              <span className="langMenu__revealInner">{nameOf(code)}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Header({ introReady }: { introReady: boolean }) {
  const prefersReduced = usePrefersReducedMotion();

  const { i18n, t } = useTranslation();
  const { lang: paramLang } = useParams<{ lang?: string }>();
  const lang: Lang = isLang(paramLang) ? (paramLang as Lang) : DEFAULT_LANG;

  const location = useLocation();
  const navigate = useNavigate();
  const panelId = useId();

  const headerRef = useRef<HTMLElement | null>(null);

  const [isMobile, setIsMobile] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hdrp, setHdrp] = useState(0);

  // desktop dropdown state (single open)
  const [openMenu, setOpenMenu] = useState<MenuKey>(null);
  const closeT = useRef<number | null>(null);

  // dropdown refs for click-outside
  const svcRef = useRef<HTMLDivElement | null>(null);
  const ucRef = useRef<HTMLDivElement | null>(null);
  const resRef = useRef<HTMLDivElement | null>(null);

  // hover active item (for right panel)
  const [svcActive, setSvcActive] = useState<string>("chatbot-24-7");
  const [ucActive, setUcActive] = useState<string>("finance");

  // mobile overlay
  const [open, setOpen] = useState(false);
  const [softOpen, setSoftOpen] = useState(false);

  const [mobileSvcOpen, setMobileSvcOpen] = useState(false);
  const [mobileUcOpen, setMobileUcOpen] = useState(false);
  const [mobileResOpen, setMobileResOpen] = useState(false);

  // matchMedia
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

  // ===== Data =====
  const SERVICES: MegaItem[] = useMemo(
    () => [
      {
        id: "chatbot-24-7",
        label: "Chatbot 24/7",
        sub: "Instant support, lead capture, smart routing",
        to: "/services/chatbot-24-7",
        title: "Always-on AI Chatbot",
        desc: "24/7 conversations, qualified leads, operator handoff — all in one widget.",
        cards: [
          {
            k: "handoff",
            title: "Live handoff",
            desc: "Operator çağırışı + admin panel reply",
            to: "/services/chatbot-24-7",
            tag: "POPULAR",
          },
          {
            k: "lead",
            title: "Lead capture",
            desc: "Soft capture after 2–3 messages",
            to: "/services/chatbot-24-7",
            tag: "CONVERSION",
          },
          {
            k: "multi",
            title: "Multilingual",
            desc: "Auto translate + admin language",
            to: "/services/chatbot-24-7",
          },
        ],
        terminalLines: [
          "incoming: user message",
          "detect_lang -> az",
          "intent: pricing_request",
          "lead_capture: queued",
          "handoff: operator_available=false",
          "auto_reply: enabled",
        ],
      },
      {
        id: "business-workflows",
        label: "Business Workflows",
        sub: "Automations, integrations, approvals",
        to: "/services/business-workflows",
        title: "Business Workflow Automation",
        desc: "Connect tools, route requests, approve actions — with visibility and control.",
        cards: [
          { k: "ops", title: "Ops routing", desc: "Tags, assignment, SLA timers", to: "/services/business-workflows" },
          { k: "int", title: "Integrations", desc: "CRM, forms, sheets, webhooks", to: "/services/business-workflows" },
          { k: "audit", title: "Audit trail", desc: "Events log + export", to: "/services/business-workflows" },
        ],
        terminalLines: [
          "webhook: form_submit",
          "validate -> ok",
          "route -> sales_queue",
          "notify -> telegram",
          "status -> in_progress",
          "sla -> ticking",
        ],
      },
      {
        id: "websites",
        label: "Websites",
        sub: "Premium landing pages + SEO speed",
        to: "/services/websites",
        title: "High-performance Websites",
        desc: "Fast, premium UI — built to convert with SEO-first structure.",
        cards: [
          { k: "seo", title: "SEO-ready", desc: "Structured pages + clean routing", to: "/services/websites" },
          { k: "speed", title: "Speed", desc: "Optimized assets + crisp video", to: "/services/websites" },
          { k: "ui", title: "Premium UI", desc: "Consistent components", to: "/services/websites" },
        ],
        terminalLines: [
          "render: hero",
          "video: preload=metadata",
          "lcp: optimized",
          "cls: stable",
          "assets: q_auto,f_auto",
          "score: 95+",
        ],
      },
      {
        id: "mobile-apps",
        label: "Mobile Apps",
        sub: "iOS/Android UX + backend integration",
        to: "/services/mobile-apps",
        title: "Mobile Apps",
        desc: "Clean UX, smooth performance, full backend integration.",
        cards: [
          { k: "ux", title: "UX", desc: "Native-feeling flows", to: "/services/mobile-apps" },
          { k: "api", title: "API", desc: "Secure data + sessions", to: "/services/mobile-apps" },
          { k: "release", title: "Release", desc: "Deploy-ready pipeline", to: "/services/mobile-apps" },
        ],
        terminalLines: [
          "session: token_ok",
          "sync: push_enabled",
          "api_call: /chat",
          "latency: low",
          "ui: 60fps",
          "release: ready",
        ],
      },
      {
        id: "smm-automation",
        label: "SMM Automation",
        sub: "Content plan, scheduling, analytics",
        to: "/services/smm-automation",
        title: "SMM Automation",
        desc: "Plan content, automate posting, measure what works.",
        cards: [
          { k: "plan", title: "Planning", desc: "Calendar + approvals", to: "/services/smm-automation" },
          { k: "sched", title: "Scheduling", desc: "Auto posting workflows", to: "/services/smm-automation" },
          { k: "ana", title: "Analytics", desc: "Track performance", to: "/services/smm-automation" },
        ],
        terminalLines: [
          "create: post_draft",
          "approve: pending",
          "schedule: 20:00",
          "publish: queued",
          "track: reach",
          "report: weekly",
        ],
      },
      {
        id: "technical-support",
        label: "Technical Support",
        sub: "Monitoring, fixes, uptime, security",
        to: "/services/technical-support",
        title: "Technical Support",
        desc: "Monitoring, incident response, hardening, and continuous improvements.",
        cards: [
          { k: "mon", title: "Monitoring", desc: "Alerts + dashboards", to: "/services/technical-support" },
          { k: "sla", title: "SLA", desc: "Response timers + escalation", to: "/services/technical-support" },
          { k: "sec", title: "Security", desc: "Rate limits + allowlists", to: "/services/technical-support" },
        ],
        terminalLines: [
          "health: ok",
          "latency: stable",
          "alert: none",
          "patch: applied",
          "backup: ok",
          "uptime: 99.9%",
        ],
      },
    ],
    []
  );

  const USECASES: MegaItem[] = useMemo(
    () => [
      {
        id: "finance",
        label: "Finance",
        sub: "KYC-safe routing, demo funnel, handoff",
        to: "/use-cases/finance",
        title: "Finance Automation",
        desc: "Route users safely, capture qualified leads, and streamline support.",
        cards: [
          { k: "kyc", title: "KYC-safe routing", desc: "Segment users + safe flows", to: "/use-cases/finance", tag: "SAFE" },
          { k: "demo", title: "Demo funnel", desc: "Structured conversion path", to: "/use-cases/finance" },
          { k: "handoff", title: "Operator handoff", desc: "When it matters most", to: "/use-cases/finance" },
        ],
        terminalLines: [
          "risk_check: pass",
          "intent: onboarding",
          "route: finance_flow",
          "lead: scored_high",
          "handoff: optional",
          "done",
        ],
      },
      {
        id: "healthcare",
        label: "Healthcare",
        sub: "Triage, booking, no-show reminders",
        to: "/use-cases/healthcare",
        title: "Healthcare Flows",
        desc: "Smart triage + booking, reminders, and privacy-first communication.",
        cards: [
          { k: "triage", title: "Smart triage", desc: "Route by symptoms", to: "/use-cases/healthcare", tag: "FAST" },
          { k: "book", title: "Auto booking", desc: "Collect info + schedule", to: "/use-cases/healthcare" },
          { k: "rem", title: "No-show reminders", desc: "Reduce missed visits", to: "/use-cases/healthcare" },
        ],
        terminalLines: [
          "symptoms: captured",
          "priority: medium",
          "slot: found",
          "confirm: sent",
          "reminder: scheduled",
          "privacy: ok",
        ],
      },
      {
        id: "retail",
        label: "Retail",
        sub: "Upsell, bundles, returns, tracking",
        to: "/use-cases/retail",
        title: "Retail Assist",
        desc: "Increase AOV with smart recommendations and reduce support load.",
        cards: [
          { k: "up", title: "Upsell assist", desc: "Best match suggestions", to: "/use-cases/retail", tag: "AOV" },
          { k: "ret", title: "Returns & support", desc: "Self-serve flows", to: "/use-cases/retail" },
          { k: "trk", title: "Order tracking", desc: "Instant status updates", to: "/use-cases/retail" },
        ],
        terminalLines: [
          "product: viewed",
          "bundle: suggested",
          "cart: updated",
          "order: placed",
          "tracking: enabled",
          "support: reduced",
        ],
      },
      {
        id: "logistics",
        label: "Logistics",
        sub: "ETA updates, delay escalation, tickets",
        to: "/use-cases/logistics",
        title: "Logistics Automation",
        desc: "Keep customers informed and ops teams focused.",
        cards: [
          { k: "eta", title: "ETA updates", desc: "Real-time notifications", to: "/use-cases/logistics", tag: "LIVE" },
          { k: "del", title: "Delay escalation", desc: "Auto escalate to ops", to: "/use-cases/logistics" },
          { k: "tic", title: "Ticket automation", desc: "Create + resolve faster", to: "/use-cases/logistics" },
        ],
        terminalLines: [
          "shipment: located",
          "eta: recalculated",
          "notify: sent",
          "delay: detected",
          "escalate: ops",
          "ticket: created",
        ],
      },
      {
        id: "hotels",
        label: "Hotels & Resorts",
        sub: "Reservations, concierge, upgrades",
        to: "/use-cases/hotels",
        title: "Hotel Concierge",
        desc: "Reservations, VIP flows, and instant answers — with a premium feel.",
        cards: [
          { k: "res", title: "Reservations", desc: "Collect details + confirm", to: "/use-cases/hotels", tag: "VIP" },
          { k: "con", title: "Concierge", desc: "Requests routed properly", to: "/use-cases/hotels" },
          { k: "up", title: "Upgrades", desc: "Smart suggestions", to: "/use-cases/hotels" },
        ],
        terminalLines: [
          "guest: identified",
          "request: late_checkout",
          "availability: ok",
          "confirm: sent",
          "upgrade: suggested",
          "handoff: vip",
        ],
      },
    ],
    []
  );

  const RES_LINKS: NavDef[] = useMemo(
    () => [
      { to: "/resources/docs", label: "Docs" },
      { to: "/resources/faq", label: "FAQ" },
      { to: "/resources/guides", label: "Guides" },
      { to: "/privacy", label: "Privacy Policy" },
    ],
    []
  );

  const isServicesActive = useMemo(
    () => location.pathname.toLowerCase().includes("/services"),
    [location.pathname]
  );
  const isUseCasesActive = useMemo(
    () => location.pathname.toLowerCase().includes("/use-cases"),
    [location.pathname]
  );
  const isResActive = useMemo(() => {
    const p = location.pathname.toLowerCase();
    return p.includes("/resources") || p.includes("/privacy");
  }, [location.pathname]);

  // header height var
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

  // scroll -> blur
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const y = getWindowScrollY();
        const p = clamp01(y / 180);
        if (headerRef.current) headerRef.current.style.setProperty("--hdrp", String(p));
        setHdrp(p);
        setScrolled(p > 0.02);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll as any);
      window.removeEventListener("resize", onScroll as any);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // route change reset
  useEffect(() => {
    setOpenMenu(null);
    setOpen(false);
    setSoftOpen(false);
    setMobileSvcOpen(false);
    setMobileUcOpen(false);
    setMobileResOpen(false);
  }, [location.pathname]);

  // lock body scroll when mobile open
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
    const r = requestAnimationFrame(() => setSoftOpen(true));
    return () => cancelAnimationFrame(r);
  }, [open]);

  // click outside desktop dropdowns
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!openMenu) return;
      const target = e.target as Node;

      const map: Record<Exclude<MenuKey, null>, React.RefObject<HTMLDivElement>> = {
        services: svcRef,
        usecases: ucRef,
        resources: resRef,
      };
      const el = map[openMenu]?.current;
      if (!el) return;
      if (!el.contains(target)) setOpenMenu(null);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [openMenu]);

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
    }, 140) as any;
  };

  const closeMobile = useCallback(() => {
    setSoftOpen(false);
    window.setTimeout(() => setOpen(false), 160);
  }, []);

  const navItem = ({ isActive }: { isActive: boolean }) => cx("nav-link", isActive && "is-active");

  const svcOpen = openMenu === "services";
  const ucOpen = openMenu === "usecases";
  const resOpen = openMenu === "resources";

  const activeSvc = useMemo(() => SERVICES.find((s) => s.id === svcActive) ?? SERVICES[0], [SERVICES, svcActive]);
  const activeUc = useMemo(() => USECASES.find((u) => u.id === ucActive) ?? USECASES[0], [USECASES, ucActive]);

  // mobile styles
  const mobileP = clamp01(hdrp);
  const mobileBgAlpha = open ? 0.92 : 0.06 + 0.72 * mobileP;
  const mobileBlurPx = open ? 18 : 5 + 14 * mobileP;
  const mobileSat = open ? 1.25 : 1 + 0.22 * mobileP;

  const headerInlineStyle: React.CSSProperties | undefined = isMobile
    ? {
        backgroundColor: `rgba(10, 12, 18, ${mobileBgAlpha.toFixed(3)})`,
        WebkitBackdropFilter: `blur(${mobileBlurPx.toFixed(1)}px) saturate(${mobileSat.toFixed(2)})`,
        backdropFilter: `blur(${mobileBlurPx.toFixed(1)}px) saturate(${mobileSat.toFixed(2)})`,
        borderBottom: `1px solid rgba(255,255,255,${(open ? 0.12 : 0.06 * mobileP).toFixed(3)})`,
      }
    : undefined;

  const logoH = isMobile ? 18 : 28;
  const logoMaxW = isMobile ? "118px" : "156px";

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

          {/* About — NO dropdown (only About page) */}
          <NavLink
            to={withLang("/about")}
            className={({ isActive }) => cx("nav-sheetLink", "nav-stagger", isActive && "is-active")}
            style={{ ["--i" as any]: 1 }}
            onClick={() => closeMobile()}
          >
            <span className="nav-sheetLink__left">
              <span className="nav-sheetLink__ico" aria-hidden="true">
                <BookOpen size={18} />
              </span>
              <span className="nav-sheetLink__label">{t("nav.about")}</span>
            </span>
            <span className="nav-sheetLink__chev" aria-hidden="true">
              →
            </span>
          </NavLink>

          {/* Services accordion */}
          <div className={cx("nav-acc", "nav-stagger")} style={{ ["--i" as any]: 2 }}>
            <button
              type="button"
              className={cx("nav-acc__head", mobileSvcOpen && "is-open")}
              onClick={() => setMobileSvcOpen((v) => !v)}
              aria-expanded={mobileSvcOpen}
            >
              <span className="nav-acc__headLeft">
                <span className="nav-acc__ico" aria-hidden="true">
                  <Sparkles size={18} />
                </span>
                <span className="nav-acc__label">{t("nav.services")}</span>
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
              <span className="nav-acc__headLeft">
                <span className="nav-acc__ico" aria-hidden="true">
                  <Layers size={18} />
                </span>
                <span className="nav-acc__label">{t("nav.useCases")}</span>
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
                <span className="nav-acc__arrow" aria-hidden="true">
                  →
                </span>
              </NavLink>

              {USECASES.map((u) => (
                <NavLink
                  key={u.id}
                  to={withLang(u.to)}
                  className={({ isActive }) => cx("nav-acc__item", isActive && "is-active")}
                  onClick={() => closeMobile()}
                >
                  <span className="nav-acc__text">{u.label}</span>
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
              <span className="nav-acc__headLeft">
                <span className="nav-acc__ico" aria-hidden="true">
                  <BookOpen size={18} />
                </span>
                <span className="nav-acc__label">Resources</span>
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
                  <span className="nav-acc__arrow" aria-hidden="true">
                    →
                  </span>
                </NavLink>
              ))}
            </div>
          </div>

          {/* Blog */}
          <NavLink
            to={withLang("/blog")}
            className={cx("nav-sheetLink", "nav-stagger")}
            style={{ ["--i" as any]: 5 }}
            onClick={() => closeMobile()}
          >
            <span className="nav-sheetLink__left">
              <span className="nav-sheetLink__ico" aria-hidden="true">
                <BookOpen size={18} />
              </span>
              <span className="nav-sheetLink__label">{t("nav.blog")}</span>
            </span>
            <span className="nav-sheetLink__chev" aria-hidden="true">
              →
            </span>
          </NavLink>

          {/* Contact */}
          <NavLink
            to={withLang("/contact")}
            className={cx("nav-sheetLink", "nav-sheetLink--contact", "nav-stagger")}
            style={{ ["--i" as any]: 6 }}
            onClick={() => closeMobile()}
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

  const Mega = ({
    items,
    active,
    setActive,
    kind,
  }: {
    items: MegaItem[];
    active: MegaItem;
    setActive: (id: string) => void;
    kind: "services" | "usecases";
  }) => {
    return (
      <div className={cx("mega")}>
        <div className="mega__left" role="menu" aria-label={`${kind} list`}>
          {items.map((it) => {
            const isActive = it.id === active.id;
            return (
              <NavLink
                key={it.id}
                to={withLang(it.to)}
                role="menuitem"
                className={({ isActive: rr }) => cx("megaRow", (rr || isActive) && "is-active")}
                onMouseEnter={() => setActive(it.id)}
                onFocus={() => setActive(it.id)}
                onClick={() => setOpenMenu(null)}
              >
                <span className="megaRow__label">{it.label}</span>
                {!!it.sub && <span className="megaRow__sub">{it.sub}</span>}
              </NavLink>
            );
          })}
        </div>

        <div className="mega__right" aria-label="details">
          <div className="megaTop">
            <div className="megaTop__title">{active.title}</div>
            <div className="megaTop__desc">{active.desc}</div>
          </div>

          <div className="megaCards">
            {active.cards.map((c) => (
              <NavLink
                key={c.k}
                to={withLang(c.to)}
                className="megaCard"
                onClick={() => setOpenMenu(null)}
              >
                <div className="megaCard__head">
                  <div className="megaCard__title">{c.title}</div>
                  {c.tag ? <div className="megaCard__tag">{c.tag}</div> : null}
                </div>
                <div className="megaCard__desc">{c.desc}</div>
                <div className="megaCard__cta">OPEN →</div>
              </NavLink>
            ))}
          </div>

          {/* Integrated terminal (NOT a separate “pasted” panel) */}
          <div className="megaTerm" aria-hidden={prefersReduced ? "true" : "false"}>
            <div className="megaTerm__scan" aria-hidden="true" />
            <div className="megaTerm__inner">
              {active.terminalLines.map((line, idx) => (
                <div
                  key={`${active.id}-${idx}`}
                  className={cx("termLine", prefersReduced && "is-reduced")}
                  style={{ ["--d" as any]: `${0.10 * idx}s` }}
                >
                  <span className="termPrompt">$</span>
                  <span className="termText">{line}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <header
      ref={headerRef}
      style={headerInlineStyle}
      className={cx("site-header", introReady && "site-header--in", scrolled && "is-scrolled", open && "is-open")}
      data-top={scrolled ? "0" : "1"}
    >
      <style>{`
        :root{ --hdrh: 72px; --hdrp: 0; }

        *{ text-decoration: none; }
        a{ text-decoration: none; }

        /* ===== Header shell ===== */
        .site-header{
          position: sticky; top: 0; z-index: 1100; width: 100%;
          transform: translateZ(0);
          will-change: backdrop-filter, background-color, border-color;
          background: rgba(10,12,18,0.02);
          border-bottom: 1px solid rgba(255,255,255,0.04);
          transition: background-color .18s ease, border-color .18s ease;
        }
        .site-header.is-scrolled{
          background: rgba(10, 12, 18, calc(0.08 + 0.26 * var(--hdrp)));
          border-bottom-color: rgba(255,255,255, calc(0.06 + 0.06 * var(--hdrp)));
          -webkit-backdrop-filter: blur(calc(8px + 10px * var(--hdrp))) saturate(1.14);
          backdrop-filter: blur(calc(8px + 10px * var(--hdrp))) saturate(1.14);
        }
        .site-header.is-open{
          background: rgba(10, 12, 18, 0.92);
          border-bottom-color: rgba(255,255,255,0.12);
          -webkit-backdrop-filter: blur(18px) saturate(1.18);
          backdrop-filter: blur(18px) saturate(1.18);
        }

        .container{ max-width: 1180px; margin: 0 auto; padding: 0 18px; }
        .header-inner{ height: var(--hdrh); display: grid; align-items: center; }
        .header-grid{ grid-template-columns: auto 1fr auto; gap: 14px; }
        .header-left{ display:flex; align-items:center; min-width:0; }
        .header-mid{ display:flex; align-items:center; justify-content:center; gap: 10px; }
        .header-right{ display:flex; align-items:center; justify-content:flex-end; gap: 12px; }

        /* ===== Brand ===== */
        .brand-link{ display:inline-flex; align-items:center; gap: 10px; min-width:0; }
        .headerBrand{ position: relative; display:flex; align-items:center; }
        .headerBrand__aura{
          position:absolute; inset:-10px -16px;
          background:
            radial-gradient(120px 44px at 22% 55%, rgba(47,184,255,.14), transparent 60%),
            radial-gradient(120px 44px at 78% 45%, rgba(63,227,196,.10), transparent 62%);
          filter: blur(10px); opacity: .70; pointer-events:none;
        }

        /* ===== Desktop top links ===== */
        .nav-link{
          position: relative;
          display: inline-flex; align-items: center; justify-content: center;
          height: 40px; padding: 0 12px; border-radius: 999px;
          color: rgba(255,255,255,.76);
          font-weight: 780; font-size: 13px; letter-spacing: .02em;
          transition: color .16s ease, background-color .16s ease, transform .16s ease;
        }
        .nav-link:hover{ color: rgba(255,255,255,.94); background: rgba(255,255,255,.06); }
        .nav-link.is-active{ color: rgba(255,255,255,.96); background: rgba(255,255,255,.09); }

        /* ===== Dropdown root ===== */
        .nav-dd{ position: relative; display:inline-flex; }
        .nav-dd__btn{
          position: relative; display:inline-flex; align-items:center; gap: 8px;
          height: 40px; padding: 0 12px; border-radius: 999px;
          color: rgba(255,255,255,.76); background: transparent; border: 0;
          cursor: pointer; font: inherit; font-weight: 780; letter-spacing: .02em;
          transition: color .16s ease, background-color .16s ease;
        }
        .nav-dd__btn:hover{ color: rgba(255,255,255,.94); background: rgba(255,255,255,.06); }
        .nav-dd__btn.is-active{ color: rgba(255,255,255,.96); background: rgba(255,255,255,.09); }

        .nav-dd__chev{ opacity: .85; transition: transform .14s ease; }
        .nav-dd.is-open .nav-dd__chev{ transform: rotate(180deg); }

        /* ✅ panel opens “from itself” (top-left), compact and aligned under the button */
        .nav-dd__panel{
          position:absolute; top: calc(100% + 10px); left: 0;
          transform: translateY(-8px) scale(.99);
          width: 760px;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,.10);
          background:
            radial-gradient(120% 120% at 16% 0%, rgba(47,184,255,.12), transparent 52%),
            radial-gradient(120% 120% at 92% 0%, rgba(63,227,196,.10), transparent 56%),
            rgba(10,12,18,.86);
          -webkit-backdrop-filter: blur(18px) saturate(1.12);
          backdrop-filter: blur(18px) saturate(1.12);
          box-shadow: 0 28px 90px rgba(0,0,0,.70);
          opacity: 0; pointer-events: none;
          transform-origin: top left;
          transition: opacity .16s ease, transform .16s ease;
          z-index: 1300;
          padding: 0;
          overflow: hidden;
        }
        .nav-dd.is-open .nav-dd__panel{
          opacity: 1; pointer-events: auto;
          transform: translateY(0) scale(1);
        }

        /* ===== Mega menu layout (like your sample) ===== */
        .mega{
          display:grid;
          grid-template-columns: 320px 1fr;
          min-height: 360px;
        }
        .mega__left{
          padding: 14px 12px;
          border-right: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.02);
        }
        .mega__right{
          padding: 16px 16px 14px;
          position: relative;
        }

        /* Left list rows — NO dots, NO pills, NO underlines */
        .megaRow{
          display:block;
          padding: 12px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.03);
          color: rgba(255,255,255,.90);
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
          outline: none;
        }
        .megaRow + .megaRow{ margin-top: 10px; }
        .megaRow:hover{
          transform: translateY(-1px);
          background: rgba(255,255,255,.05);
          border-color: rgba(255,255,255,.10);
        }
        .megaRow.is-active{
          background:
            radial-gradient(120% 120% at 12% 20%, rgba(47,184,255,.14), transparent 55%),
            rgba(255,255,255,.05);
          border-color: rgba(47,184,255,.22);
        }
        .megaRow__label{
          display:block;
          font-weight: 860;
          letter-spacing: .01em;
          font-size: 13px;
          color: rgba(255,255,255,.94);
        }
        .megaRow__sub{
          display:block;
          margin-top: 6px;
          font-size: 12px;
          line-height: 1.25;
          color: rgba(255,255,255,.62);
        }

        /* Right top */
        .megaTop__title{
          font-weight: 900;
          font-size: 22px;
          letter-spacing: .01em;
          color: rgba(255,255,255,.96);
        }
        .megaTop__desc{
          margin-top: 6px;
          font-size: 13px;
          line-height: 1.35;
          color: rgba(255,255,255,.70);
          max-width: 520px;
        }

        /* Cards */
        .megaCards{
          margin-top: 14px;
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .megaCard{
          display:block;
          padding: 14px 14px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.03);
          color: rgba(255,255,255,.88);
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
        }
        .megaCard:hover{
          transform: translateY(-1px);
          background: rgba(255,255,255,.05);
          border-color: rgba(255,255,255,.12);
        }
        .megaCard__head{ display:flex; align-items:center; justify-content: space-between; gap: 10px; }
        .megaCard__title{ font-weight: 860; font-size: 14px; color: rgba(255,255,255,.94); }
        .megaCard__tag{
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .10em;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.80);
          text-transform: uppercase;
        }
        .megaCard__desc{
          margin-top: 8px;
          font-size: 12.5px;
          color: rgba(255,255,255,.66);
          line-height: 1.3;
        }
        .megaCard__cta{
          margin-top: 10px;
          font-weight: 900;
          letter-spacing: .14em;
          font-size: 11px;
          color: rgba(255,255,255,.74);
        }

        /* Terminal integrated (thin, not “pasted”) */
        .megaTerm{
          margin-top: 12px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(0,0,0,.18);
          overflow: hidden;
          position: relative;
        }
        .megaTerm__scan{
          position:absolute; inset:-40px -20px;
          background: linear-gradient(90deg, transparent 0%, rgba(47,184,255,.10) 24%, transparent 52%, transparent 100%);
          transform: translateX(-40%);
          opacity: .70;
          filter: blur(1px);
          pointer-events:none;
          animation: megaScan 10s linear infinite;
        }
        @keyframes megaScan{ 0%{ transform: translateX(-55%);} 100%{ transform: translateX(55%);} }

        .megaTerm__inner{
          padding: 12px 12px;
          display:grid;
          gap: 8px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 12px;
          color: rgba(255,255,255,.82);
        }
        .termLine{
          display:flex; align-items:center; gap: 8px;
          opacity: 0;
          transform: translateX(10px);
          animation: termIn .35s ease forwards;
          animation-delay: var(--d, 0s);
        }
        .termLine.is-reduced{
          opacity: 1;
          transform: none;
          animation: none;
        }
        @keyframes termIn{
          to{ opacity: 1; transform: translateX(0); }
        }
        .termPrompt{
          color: rgba(47,184,255,.80);
          font-weight: 900;
        }
        /* subtle right-to-left “typing” reveal */
        .termText{
          position: relative;
          display:inline-block;
          white-space: nowrap;
          overflow: hidden;
          max-width: 100%;
          clip-path: inset(0 0 0 100%);
          animation: rtlReveal .55s ease forwards;
          animation-delay: var(--d, 0s);
        }
        .termLine.is-reduced .termText{ clip-path: none; animation: none; }
        @keyframes rtlReveal{
          from{ clip-path: inset(0 0 0 100%); }
          to{ clip-path: inset(0 0 0 0%); }
        }

        /* Resources simple compact list */
        .ddList{ padding: 12px; display:grid; gap: 10px; }
        .ddRow{
          display:flex; align-items:center;
          padding: 12px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.03);
          color: rgba(255,255,255,.88);
          font-weight: 860;
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
        }
        .ddRow:hover{ transform: translateY(-1px); background: rgba(255,255,255,.05); border-color: rgba(255,255,255,.10); }
        .ddRow.is-active{ border-color: rgba(47,184,255,.22); background: rgba(47,184,255,.08); }

        /* ===== CTA + toggle ===== */
        .nav-cta{
          display:inline-flex; align-items:center; justify-content:center;
          height: 38px; padding: 0 14px; border-radius: 999px;
          font-weight: 860; font-size: 13px; color: rgba(255,255,255,.92);
          border: 1px solid rgba(255,255,255,.10);
          background:
            radial-gradient(120% 120% at 20% 10%, rgba(47,184,255,.18), transparent 60%),
            rgba(255,255,255,.05);
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
        }
        .nav-cta:hover{ transform: translateY(-1px); border-color: rgba(255,255,255,.16); background: rgba(255,255,255,.07); }
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

        /* ===== Lang (hover) ===== */
        .langMenu{ position: relative; }
        .langMenu__btn{
          display:inline-flex; align-items:center; gap: 8px;
          height: 38px; padding: 0 10px; border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.86);
          font-weight: 860; font-size: 12px;
          cursor: pointer;
          transition: background-color .14s ease, border-color .14s ease, transform .14s ease;
        }
        .langMenu__btn:hover{ transform: translateY(-1px); background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.14); }
        .langMenu__dot{
          width: 8px; height: 8px; border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.9), rgba(47,184,255,.9));
          box-shadow: 0 0 0 3px rgba(47,184,255,.10);
        }
        .langMenu__code{ letter-spacing: .12em; }
        .langMenu__chev{ opacity: .75; }

        .langMenu__panel{
          position:absolute; top: calc(100% + 10px); right: 0;
          width: 210px; border-radius: 16px; padding: 10px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(10,12,18,.90);
          -webkit-backdrop-filter: blur(18px) saturate(1.12);
          backdrop-filter: blur(18px) saturate(1.12);
          box-shadow: 0 24px 80px rgba(0,0,0,.65);
          opacity: 0; pointer-events: none;
          transform: translateY(-8px) scale(.99);
          transform-origin: top right;
          transition: opacity .16s ease, transform .16s ease;
          z-index: 1500;
        }
        .langMenu.is-open .langMenu__panel{
          opacity: 1; pointer-events: auto;
          transform: translateY(0) scale(1);
        }
        .langMenu__item{
          width: 100%;
          display:flex; align-items:center; justify-content: flex-start;
          gap: 10px;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.03);
          color: rgba(255,255,255,.86);
          padding: 10px 10px;
          border-radius: 12px;
          cursor: pointer;
          transition: background-color .14s ease, border-color .14s ease, transform .14s ease;
          position: relative;
          overflow: visible;
        }
        .langMenu__item + .langMenu__item{ margin-top: 8px; }
        .langMenu__item:hover{ background: rgba(255,255,255,.05); border-color: rgba(255,255,255,.10); transform: translateY(-1px); }
        .langMenu__item.is-active{ background: rgba(47,184,255,.10); border-color: rgba(47,184,255,.22); }
        .langMenu__itemCode{ font-weight: 900; letter-spacing: .12em; width: 34px; text-align: left; }

        /* reveal to left */
        .langMenu__reveal{
          position:absolute;
          right: calc(100% + 10px);
          top: 50%;
          transform: translateY(-50%) translateX(6px);
          opacity: 0;
          pointer-events: none;
          transition: opacity .14s ease, transform .14s ease;
        }
        .langMenu__item:hover .langMenu__reveal{
          opacity: 1;
          transform: translateY(-50%) translateX(0);
        }
        .langMenu__revealInner{
          display:inline-flex;
          align-items:center;
          height: 34px;
          padding: 0 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(10,12,18,.90);
          -webkit-backdrop-filter: blur(14px) saturate(1.12);
          backdrop-filter: blur(14px) saturate(1.12);
          color: rgba(255,255,255,.86);
          font-weight: 860;
          white-space: nowrap;
          box-shadow: 0 18px 60px rgba(0,0,0,.55);
        }

        /* ===== Mobile overlay ===== */
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
          background: rgba(10,12,18,.92);
          -webkit-backdrop-filter: blur(18px) saturate(1.12);
          backdrop-filter: blur(18px) saturate(1.12);
          box-shadow: 0 28px 90px rgba(0,0,0,.70);
        }
        .nav-sheet.is-open{ transform: translateY(0) scale(1); opacity: 1; }

        .nav-sheet__bg{
          position:absolute; inset:0;
          background:
            radial-gradient(120% 90% at 20% 0%, rgba(47,184,255,.14), transparent 58%),
            radial-gradient(120% 90% at 90% 0%, rgba(63,227,196,.10), transparent 60%);
          pointer-events:none;
          opacity: .8;
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
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.86);
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
        .nav-sheetLink__label{ font-weight: 860; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .nav-sheetLink__chev{ opacity: .75; }

        .nav-sheetLink--contact{
          background:
            radial-gradient(120% 120% at 20% 10%, rgba(47,184,255,.18), transparent 60%),
            rgba(255,255,255,.05);
          border-color: rgba(255,255,255,.12);
        }

        .nav-acc{ border-radius: 18px; overflow:hidden; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.03); }
        .nav-acc__head{
          width: 100%;
          border:0; background: transparent;
          display:flex; align-items:center; justify-content: space-between;
          padding: 12px 12px;
          cursor:pointer; color: rgba(255,255,255,.88);
        }
        .nav-acc__headLeft{ display:flex; align-items:center; gap: 10px; }
        .nav-acc__ico{
          width: 32px; height: 32px;
          display:flex; align-items:center; justify-content:center;
          border-radius: 12px;
          background: rgba(255,255,255,.05);
          border: 1px solid rgba(255,255,255,.07);
        }
        .nav-acc__label{ font-weight: 860; }
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
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.84);
          transition: background-color .14s ease, border-color .14s ease, transform .14s ease;
        }
        .nav-acc__item:hover{ background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.10); transform: translateY(-1px); }
        .nav-acc__item.is-active{ background: rgba(47,184,255,.10); border-color: rgba(47,184,255,.22); }
        .nav-acc__text{ font-weight: 860; }
        .nav-acc__arrow{ opacity: .7; }

        @media (max-width: 1060px){
          .nav-dd__panel{ width: 720px; }
          .mega{ grid-template-columns: 300px 1fr; }
        }
        @media (max-width: 920px){
          .header-mid{ display:none; }
          .nav-toggle{ display:inline-flex; }
          .nav-cta--desktopOnly{ display:none; }
          .langMenu__btn{ height: 40px; }
          .nav-dd__panel{ display:none; }
        }
        @media (max-width: 520px){
          .container{ padding: 0 14px; }
          .header-right{ gap: 10px; }
          .langMenu__panel{ width: 200px; }
          .langMenu__reveal{ display:none; }
        }
      `}</style>

      <div className="container header-inner header-grid">
        <div className="header-left">
          <Link to={`/${lang}`} className="brand-link" aria-label="NEOX" data-wg-notranslate>
            <span className="headerBrand" aria-hidden="true">
              <span className="headerBrand__aura" aria-hidden="true" />
              <img
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
                  filter:
                    "drop-shadow(0 6px 16px rgba(0,0,0,.42)) drop-shadow(0 0 10px rgba(47,184,255,.06))",
                  transform: isMobile ? "translateY(1px) translateZ(0)" : "translateZ(0)",
                }}
              />
            </span>
          </Link>
        </div>

        {/* ===== Desktop nav ===== */}
        <nav className="header-mid" aria-label="Əsas menyu">
          <NavLink to={withLang("/")} end className={navItem}>
            {t("nav.home")}
          </NavLink>

          {/* About — ONLY link (no dropdown, no pricing) */}
          <NavLink to={withLang("/about")} className={navItem}>
            {t("nav.about")}
          </NavLink>

          {/* Services mega */}
          <div
            ref={svcRef}
            className={cx("nav-dd", svcOpen && "is-open")}
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
              {t("nav.services")}
              <span className="nav-dd__chev" aria-hidden="true">
                <ChevronDown size={16} />
              </span>
            </button>

            <div className="nav-dd__panel" role="menu" aria-hidden={!svcOpen}>
              <Mega
                kind="services"
                items={SERVICES}
                active={activeSvc}
                setActive={(id) => setSvcActive(id)}
              />
            </div>
          </div>

          {/* Use Cases mega */}
          <div
            ref={ucRef}
            className={cx("nav-dd", ucOpen && "is-open")}
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
              {t("nav.useCases")}
              <span className="nav-dd__chev" aria-hidden="true">
                <ChevronDown size={16} />
              </span>
            </button>

            <div className="nav-dd__panel" role="menu" aria-hidden={!ucOpen}>
              <Mega
                kind="usecases"
                items={USECASES}
                active={activeUc}
                setActive={(id) => setUcActive(id)}
              />
            </div>
          </div>

          {/* Resources (simple compact list) */}
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
              Resources
              <span className="nav-dd__chev" aria-hidden="true">
                <ChevronDown size={16} />
              </span>
            </button>

            <div className="nav-dd__panel" role="menu" aria-hidden={!resOpen} style={{ width: 320 }}>
              <div className="ddList">
                {RES_LINKS.map((s) => (
                  <NavLink
                    key={s.to}
                    to={withLang(s.to)}
                    className={({ isActive }) => cx("ddRow", isActive && "is-active")}
                    role="menuitem"
                    onClick={() => setOpenMenu(null)}
                  >
                    {s.label}
                  </NavLink>
                ))}
              </div>
            </div>
          </div>

          {/* Blog */}
          <NavLink to={withLang("/blog")} className={navItem}>
            {t("nav.blog")}
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
