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
    c === "az" ? "Azərbaycan" : c === "tr" ? "Türk" : c === "en" ? "English" : c === "ru" ? "Русский" : "Español";

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
      className={cx("hLang", open && "is-open")}
      data-wg-notranslate
      onMouseEnter={openDrop}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        className="hLang__btn"
        aria-label="Dil seçimi"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onFocus={openDrop}
      >
        <span className="hLang__dot" aria-hidden="true" />
        <span className="hLang__code">{lang.toUpperCase()}</span>
        <span className="hLang__chev" aria-hidden="true">
          <ChevronDown size={14} />
        </span>
      </button>

      <div className="hLang__panel" role="menu" aria-hidden={!open}>
        {LANGS.map((code) => (
          <button
            key={code}
            type="button"
            role="menuitem"
            className={cx("hLang__item", code === lang && "is-active")}
            onClick={() => {
              onPick(code);
              setOpen(false);
            }}
          >
            <span className="hLang__itemCode">{code.toUpperCase()}</span>
            <span className="hLang__reveal" aria-hidden="true">
              <span className="hLang__revealInner">{nameOf(code)}</span>
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

  // hover active item
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
          { k: "handoff", title: "Live handoff", desc: "Operator çağırışı + admin panel reply", to: "/services/chatbot-24-7", tag: "POPULAR" },
          { k: "lead", title: "Lead capture", desc: "Soft capture after 2–3 messages", to: "/services/chatbot-24-7", tag: "CONVERSION" },
          { k: "multi", title: "Multilingual", desc: "Auto translate + admin language", to: "/services/chatbot-24-7" },
        ],
        terminalLines: ["incoming: user message", "detect_lang -> az", "intent: pricing_request", "lead_capture: queued", "handoff: operator_available=false", "auto_reply: enabled"],
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
        terminalLines: ["webhook: form_submit", "validate -> ok", "route -> sales_queue", "notify -> telegram", "status -> in_progress", "sla -> ticking"],
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
        terminalLines: ["render: hero", "video: preload=metadata", "lcp: optimized", "cls: stable", "assets: q_auto,f_auto", "score: 95+"],
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
        terminalLines: ["session: token_ok", "sync: push_enabled", "api_call: /chat", "latency: low", "ui: 60fps", "release: ready"],
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
        terminalLines: ["create: post_draft", "approve: pending", "schedule: 20:00", "publish: queued", "track: reach", "report: weekly"],
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
        terminalLines: ["health: ok", "latency: stable", "alert: none", "patch: applied", "backup: ok", "uptime: 99.9%"],
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
        terminalLines: ["risk_check: pass", "intent: onboarding", "route: finance_flow", "lead: scored_high", "handoff: optional", "done"],
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
        terminalLines: ["symptoms: captured", "priority: medium", "slot: found", "confirm: sent", "reminder: scheduled", "privacy: ok"],
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
        terminalLines: ["product: viewed", "bundle: suggested", "cart: updated", "order: placed", "tracking: enabled", "support: reduced"],
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
        terminalLines: ["shipment: located", "eta: recalculated", "notify: sent", "delay: detected", "escalate: ops", "ticket: created"],
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
        terminalLines: ["guest: identified", "request: late_checkout", "availability: ok", "confirm: sent", "upgrade: suggested", "handoff: vip"],
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

  const isServicesActive = useMemo(() => location.pathname.toLowerCase().includes("/services"), [location.pathname]);
  const isUseCasesActive = useMemo(() => location.pathname.toLowerCase().includes("/use-cases"), [location.pathname]);
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
        const p = clamp01(y / 220);
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

  const navItem = ({ isActive }: { isActive: boolean }) => cx("hLink", isActive && "is-active");

  const svcOpen = openMenu === "services";
  const ucOpen = openMenu === "usecases";
  const resOpen = openMenu === "resources";

  const activeSvc = useMemo(() => SERVICES.find((s) => s.id === svcActive) ?? SERVICES[0], [SERVICES, svcActive]);
  const activeUc = useMemo(() => USECASES.find((u) => u.id === ucActive) ?? USECASES[0], [USECASES, ucActive]);

  // mobile styles
  const mobileP = clamp01(hdrp);
  const mobileBgAlpha = open ? 0.92 : 0.04 + 0.66 * mobileP;
  const mobileBlurPx = open ? 18 : 6 + 14 * mobileP;
  const mobileSat = open ? 1.22 : 1 + 0.22 * mobileP;

  const headerInlineStyle: React.CSSProperties | undefined = isMobile
    ? {
        backgroundColor: `rgba(10, 12, 18, ${mobileBgAlpha.toFixed(3)})`,
        WebkitBackdropFilter: `blur(${mobileBlurPx.toFixed(1)}px) saturate(${mobileSat.toFixed(2)})`,
        backdropFilter: `blur(${mobileBlurPx.toFixed(1)}px) saturate(${mobileSat.toFixed(2)})`,
        borderBottom: `1px solid rgba(255,255,255,${(open ? 0.12 : 0.05 * mobileP).toFixed(3)})`,
      }
    : undefined;

  const logoH = isMobile ? 18 : 26;
  const logoMaxW = isMobile ? "118px" : "156px";

  const MobileOverlay = (
    <div className={cx("hMOv", open && "is-mounted", softOpen && "is-open")} aria-hidden={!open}>
      <button className="hMOv__backdrop" type="button" aria-label="Bağla" onClick={closeMobile} />
      <div id={panelId} className={cx("hSheet", softOpen && "is-open")} role="dialog" aria-modal="true" aria-label="Menyu">
        <div className="hSheet__bg" aria-hidden="true" />
        <div className="hSheet__head">
          <div className="hSheet__brand">
            <span className="hSheet__dot" aria-hidden="true" />
            <span className="hSheet__title">MENU</span>
          </div>
          <button className="hSheet__close" type="button" aria-label="Bağla" onClick={closeMobile}>
            <X size={18} />
          </button>
        </div>

        <div className="hSheet__list">
          <NavLink
            to={withLang("/")}
            end
            className={({ isActive }) => cx("hMRow", "hStg", isActive && "is-active")}
            style={{ ["--i" as any]: 0 }}
            onClick={() => {
              window.scrollTo({ top: 0, left: 0, behavior: "auto" });
              closeMobile();
            }}
          >
            <span className="hMRow__left">
              <span className="hMRow__ico" aria-hidden="true">
                <Home size={18} />
              </span>
              <span className="hMRow__label">{t("nav.home")}</span>
            </span>
            <span className="hMRow__chev" aria-hidden="true">
              →
            </span>
          </NavLink>

          <NavLink
            to={withLang("/about")}
            className={({ isActive }) => cx("hMRow", "hStg", isActive && "is-active")}
            style={{ ["--i" as any]: 1 }}
            onClick={() => closeMobile()}
          >
            <span className="hMRow__left">
              <span className="hMRow__ico" aria-hidden="true">
                <BookOpen size={18} />
              </span>
              <span className="hMRow__label">{t("nav.about")}</span>
            </span>
            <span className="hMRow__chev" aria-hidden="true">
              →
            </span>
          </NavLink>

          {/* Services accordion */}
          <div className={cx("hAcc", "hStg")} style={{ ["--i" as any]: 2 }}>
            <button
              type="button"
              className={cx("hAcc__head", mobileSvcOpen && "is-open")}
              onClick={() => setMobileSvcOpen((v) => !v)}
              aria-expanded={mobileSvcOpen}
            >
              <span className="hAcc__headLeft">
                <span className="hAcc__ico" aria-hidden="true">
                  <Sparkles size={18} />
                </span>
                <span className="hAcc__label">{t("nav.services")}</span>
              </span>
              <span className="hAcc__chev" aria-hidden="true">
                <ChevronDown size={16} />
              </span>
            </button>

            <div className={cx("hAcc__panel", mobileSvcOpen && "is-open")} aria-hidden={!mobileSvcOpen}>
              {SERVICES.map((s) => (
                <NavLink
                  key={s.id}
                  to={withLang(s.to)}
                  className={({ isActive }) => cx("hAcc__item", isActive && "is-active")}
                  onClick={() => closeMobile()}
                >
                  <span className="hAcc__text">{s.label}</span>
                  <span className="hAcc__arrow" aria-hidden="true">
                    →
                  </span>
                </NavLink>
              ))}
            </div>
          </div>

          {/* Use Cases accordion */}
          <div className={cx("hAcc", "hStg")} style={{ ["--i" as any]: 3 }}>
            <button
              type="button"
              className={cx("hAcc__head", mobileUcOpen && "is-open")}
              onClick={() => setMobileUcOpen((v) => !v)}
              aria-expanded={mobileUcOpen}
            >
              <span className="hAcc__headLeft">
                <span className="hAcc__ico" aria-hidden="true">
                  <Layers size={18} />
                </span>
                <span className="hAcc__label">{t("nav.useCases")}</span>
              </span>
              <span className="hAcc__chev" aria-hidden="true">
                <ChevronDown size={16} />
              </span>
            </button>

            <div className={cx("hAcc__panel", mobileUcOpen && "is-open")} aria-hidden={!mobileUcOpen}>
              <NavLink
                to={withLang("/use-cases")}
                className={({ isActive }) => cx("hAcc__item", isActive && "is-active")}
                onClick={() => closeMobile()}
              >
                <span className="hAcc__text">All Use Cases</span>
                <span className="hAcc__arrow" aria-hidden="true">
                  →
                </span>
              </NavLink>

              {USECASES.map((u) => (
                <NavLink
                  key={u.id}
                  to={withLang(u.to)}
                  className={({ isActive }) => cx("hAcc__item", isActive && "is-active")}
                  onClick={() => closeMobile()}
                >
                  <span className="hAcc__text">{u.label}</span>
                  <span className="hAcc__arrow" aria-hidden="true">
                    →
                  </span>
                </NavLink>
              ))}
            </div>
          </div>

          {/* Resources accordion */}
          <div className={cx("hAcc", "hStg")} style={{ ["--i" as any]: 4 }}>
            <button
              type="button"
              className={cx("hAcc__head", mobileResOpen && "is-open")}
              onClick={() => setMobileResOpen((v) => !v)}
              aria-expanded={mobileResOpen}
            >
              <span className="hAcc__headLeft">
                <span className="hAcc__ico" aria-hidden="true">
                  <BookOpen size={18} />
                </span>
                <span className="hAcc__label">Resources</span>
              </span>
              <span className="hAcc__chev" aria-hidden="true">
                <ChevronDown size={16} />
              </span>
            </button>

            <div className={cx("hAcc__panel", mobileResOpen && "is-open")} aria-hidden={!mobileResOpen}>
              {RES_LINKS.map((s) => (
                <NavLink
                  key={s.to}
                  to={withLang(s.to)}
                  className={({ isActive }) => cx("hAcc__item", isActive && "is-active")}
                  onClick={() => closeMobile()}
                >
                  <span className="hAcc__text">{s.label}</span>
                  <span className="hAcc__arrow" aria-hidden="true">
                    →
                  </span>
                </NavLink>
              ))}
            </div>
          </div>

          {/* Blog */}
          <NavLink to={withLang("/blog")} className={cx("hMRow", "hStg")} style={{ ["--i" as any]: 5 }} onClick={closeMobile}>
            <span className="hMRow__left">
              <span className="hMRow__ico" aria-hidden="true">
                <BookOpen size={18} />
              </span>
              <span className="hMRow__label">{t("nav.blog")}</span>
            </span>
            <span className="hMRow__chev" aria-hidden="true">
              →
            </span>
          </NavLink>

          {/* Contact */}
          <NavLink
            to={withLang("/contact")}
            className={cx("hMRow", "hMRow--contact", "hStg")}
            style={{ ["--i" as any]: 6 }}
            onClick={closeMobile}
          >
            <span className="hMRow__left">
              <span className="hMRow__ico" aria-hidden="true">
                <PhoneCall size={18} />
              </span>
              <span className="hMRow__label">{t("nav.contact")}</span>
            </span>
            <span className="hMRow__chev" aria-hidden="true">
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
      <div className="hMega">
        <div className="hMega__left" role="menu" aria-label={`${kind} list`}>
          {items.map((it) => {
            const isActive = it.id === active.id;
            return (
              <NavLink
                key={it.id}
                to={withLang(it.to)}
                role="menuitem"
                className={({ isActive: rr }) => cx("hMegaRow", (rr || isActive) && "is-active")}
                onMouseEnter={() => setActive(it.id)}
                onFocus={() => setActive(it.id)}
                onClick={() => setOpenMenu(null)}
              >
                <span className="hMegaRow__label">{it.label}</span>
                {!!it.sub && <span className="hMegaRow__sub">{it.sub}</span>}
              </NavLink>
            );
          })}
        </div>

        <div className="hMega__right" aria-label="details">
          <div className="hMegaTop">
            <div className="hMegaTop__title">{active.title}</div>
            <div className="hMegaTop__desc">{active.desc}</div>
          </div>

          <div className="hMegaCards">
            {active.cards.map((c) => (
              <NavLink key={c.k} to={withLang(c.to)} className="hCard" onClick={() => setOpenMenu(null)}>
                <div className="hCard__head">
                  <div className="hCard__title">{c.title}</div>
                  {c.tag ? <div className="hCard__tag">{c.tag}</div> : null}
                </div>
                <div className="hCard__desc">{c.desc}</div>
                <div className="hCard__cta">OPEN →</div>
              </NavLink>
            ))}
          </div>

          <div className="hTerm" aria-hidden={prefersReduced ? "true" : "false"}>
            <div className="hTerm__inner">
              {active.terminalLines.map((line, idx) => (
                <div
                  key={`${active.id}-${idx}`}
                  className={cx("hLine", prefersReduced && "is-reduced")}
                  style={{ ["--d" as any]: `${0.10 * idx}s` }}
                >
                  <span className="hPrompt">$</span>
                  <span className="hText">{line}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ===== IMPORTANT: render Header into document.body so it can't be affected by parent transforms =====
  const HeaderUI = (
    <header
      ref={headerRef}
      style={headerInlineStyle}
      className={cx("h", introReady && "h--in", scrolled && "is-scrolled", open && "is-open")}
      data-top={scrolled ? "0" : "1"}
    >
      <style>{`
        :root{ --hdrh: 72px; --hdrp: 0; }

        /* SCOPE RESET (header only) */
        .h, .h *{ box-sizing:border-box; }
        .h a, .h a:hover, .h a:focus, .h a:active{ text-decoration:none !important; }
        .h a{ color: inherit; }
        .h button{ font: inherit; }
        .h :focus-visible{ outline: none; box-shadow: 0 0 0 3px rgba(120,170,255,.18); border-radius: 14px; }

        /* Header shell (hard-fixed, independent) */
        .h{
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 2147482000;
          width: 100%;
          transform: translate3d(0,0,0);
          will-change: backdrop-filter, background-color, border-color;
          background: rgba(10,12,18,0.01);
          border-bottom: 1px solid rgba(255,255,255,0.03);
          transition: background-color .18s ease, border-color .18s ease;
        }
        .h.is-scrolled{
          background: rgba(10,12,18, calc(0.06 + 0.28 * var(--hdrp)));
          border-bottom-color: rgba(255,255,255, calc(0.05 + 0.07 * var(--hdrp)));
          -webkit-backdrop-filter: blur(calc(10px + 12px * var(--hdrp))) saturate(1.12);
          backdrop-filter: blur(calc(10px + 12px * var(--hdrp))) saturate(1.12);
        }
        .h.is-open{
          background: rgba(10,12,18,0.92);
          border-bottom-color: rgba(255,255,255,0.12);
          -webkit-backdrop-filter: blur(18px) saturate(1.16);
          backdrop-filter: blur(18px) saturate(1.16);
        }

        .hC{ max-width: 1180px; margin: 0 auto; padding: 0 18px; }
        .hI{ height: var(--hdrh); display: grid; align-items: center; }
        .hG{ grid-template-columns: auto 1fr auto; gap: 14px; }
        .hL{ display:flex; align-items:center; min-width:0; }
        .hM{ display:flex; align-items:center; justify-content:center; gap: 10px; }
        .hR{ display:flex; align-items:center; justify-content:flex-end; gap: 12px; }

        .hBrand{ display:inline-flex; align-items:center; gap: 10px; min-width:0; }
        .hLogoWrap{ position: relative; display:flex; align-items:center; }
        .hLogoAura{
          position:absolute; inset:-10px -18px;
          background:
            radial-gradient(120px 44px at 20% 55%, rgba(120,170,255,.12), transparent 60%),
            radial-gradient(120px 44px at 78% 45%, rgba(63,227,196,.08), transparent 62%);
          filter: blur(12px);
          opacity: .55;
          pointer-events:none;
        }

        .hLink{
          position: relative;
          display: inline-flex; align-items: center; justify-content: center;
          height: 40px; padding: 0 12px; border-radius: 999px;
          color: rgba(255,255,255,.74);
          font-weight: 760; font-size: 13px; letter-spacing: .02em;
          transition: color .14s ease, background-color .14s ease, transform .14s ease;
        }
        .hLink:hover{ color: rgba(255,255,255,.92); background: rgba(255,255,255,.05); }
        .hLink.is-active{ color: rgba(255,255,255,.95); background: rgba(255,255,255,.08); }

        .hDD{ position: relative; display:inline-flex; }
        .hDD__btn{
          position: relative; display:inline-flex; align-items:center; gap: 8px;
          height: 40px; padding: 0 12px; border-radius: 999px;
          color: rgba(255,255,255,.74); background: transparent; border: 0;
          cursor: pointer; font-weight: 760; letter-spacing: .02em;
          transition: color .14s ease, background-color .14s ease;
        }
        .hDD__btn:hover{ color: rgba(255,255,255,.92); background: rgba(255,255,255,.05); }
        .hDD__btn.is-active{ color: rgba(255,255,255,.95); background: rgba(255,255,255,.08); }
        .hDD__chev{ opacity: .8; transition: transform .14s ease; }
        .hDD.is-open .hDD__chev{ transform: rotate(180deg); }

        .hDD__panel{
          position:absolute; top: calc(100% + 10px); left: 0;
          width: 780px;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,.10);
          background:
            radial-gradient(120% 120% at 18% 0%, rgba(120,170,255,.10), transparent 55%),
            radial-gradient(120% 120% at 92% 0%, rgba(63,227,196,.08), transparent 60%),
            rgba(10,12,18,.88);
          -webkit-backdrop-filter: blur(20px) saturate(1.12);
          backdrop-filter: blur(20px) saturate(1.12);
          box-shadow: 0 30px 110px rgba(0,0,0,.72);
          opacity: 0; pointer-events: none;
          transform: translateY(-8px) scale(.99);
          transform-origin: top left;
          transition: opacity .14s ease, transform .14s ease;
          z-index: 1300;
          overflow: hidden;
        }
        .hDD.is-open .hDD__panel{
          opacity: 1; pointer-events: auto;
          transform: translateY(0) scale(1);
        }

        .hMega{ display:grid; grid-template-columns: 320px 1fr; min-height: 360px; }
        .hMega__left{
          padding: 14px 12px;
          border-right: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.02);
        }
        .hMega__right{ padding: 16px 16px 14px; position: relative; }

        .hMegaRow{
          display:block;
          padding: 12px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.025);
          color: rgba(255,255,255,.92);
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
        }
        .hMegaRow + .hMegaRow{ margin-top: 10px; }
        .hMegaRow:hover{ transform: translateY(-1px); background: rgba(255,255,255,.04); border-color: rgba(255,255,255,.10); }
        .hMegaRow.is-active{
          background:
            radial-gradient(120% 120% at 12% 20%, rgba(120,170,255,.12), transparent 55%),
            rgba(255,255,255,.04);
          border-color: rgba(120,170,255,.24);
        }
        .hMegaRow__label{ display:block; font-weight: 840; font-size: 13px; color: rgba(255,255,255,.95); }
        .hMegaRow__sub{ display:block; margin-top: 6px; font-size: 12px; line-height: 1.25; color: rgba(255,255,255,.62); }

        .hMegaTop__title{ font-weight: 920; font-size: 22px; letter-spacing: .01em; color: rgba(255,255,255,.96); }
        .hMegaTop__desc{ margin-top: 6px; font-size: 13px; line-height: 1.35; color: rgba(255,255,255,.70); max-width: 540px; }

        .hMegaCards{ margin-top: 14px; display:grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .hCard{
          display:block;
          padding: 14px 14px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.025);
          color: rgba(255,255,255,.90);
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
        }
        .hCard:hover{ transform: translateY(-1px); background: rgba(255,255,255,.04); border-color: rgba(255,255,255,.12); }
        .hCard__head{ display:flex; align-items:center; justify-content: space-between; gap: 10px; }
        .hCard__title{ font-weight: 860; font-size: 14px; color: rgba(255,255,255,.95); }
        .hCard__tag{
          font-size: 11px; font-weight: 900; letter-spacing: .10em;
          padding: 6px 10px; border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.78);
          text-transform: uppercase;
        }
        .hCard__desc{ margin-top: 8px; font-size: 12.5px; color: rgba(255,255,255,.66); line-height: 1.3; }
        .hCard__cta{ margin-top: 10px; font-weight: 900; letter-spacing: .14em; font-size: 11px; color: rgba(255,255,255,.72); }

        .hTerm{
          margin-top: 12px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(0,0,0,.18);
          overflow: hidden;
        }
        .hTerm__inner{
          padding: 12px 12px;
          display:grid;
          gap: 8px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 12px;
          color: rgba(255,255,255,.82);
        }
        .hLine{
          display:flex; align-items:center; gap: 8px;
          opacity: 0;
          transform: translateX(10px);
          animation: hLineIn .34s ease forwards;
          animation-delay: var(--d, 0s);
        }
        .hLine.is-reduced{ opacity: 1; transform: none; animation: none; }
        @keyframes hLineIn{ to{ opacity: 1; transform: translateX(0); } }
        .hPrompt{ color: rgba(120,170,255,.82); font-weight: 900; }
        .hText{
          display:inline-block;
          white-space: nowrap;
          overflow: hidden;
          max-width: 100%;
          clip-path: inset(0 0 0 100%);
          animation: hReveal .55s ease forwards;
          animation-delay: var(--d, 0s);
        }
        .hLine.is-reduced .hText{ clip-path: none; animation: none; }
        @keyframes hReveal{ from{ clip-path: inset(0 0 0 100%);} to{ clip-path: inset(0 0 0 0%);} }

        .hList{ padding: 12px; display:grid; gap: 10px; }
        .hRow{
          display:flex; align-items:center;
          padding: 12px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.025);
          color: rgba(255,255,255,.90);
          font-weight: 860;
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
        }
        .hRow:hover{ transform: translateY(-1px); background: rgba(255,255,255,.04); border-color: rgba(255,255,255,.10); }
        .hRow.is-active{ border-color: rgba(120,170,255,.22); background: rgba(120,170,255,.08); }

        .hCTA{
          display:inline-flex; align-items:center; justify-content:center;
          height: 38px; padding: 0 14px; border-radius: 999px;
          font-weight: 860; font-size: 13px; color: rgba(255,255,255,.92);
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.05);
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
        }
        .hCTA:hover{ transform: translateY(-1px); border-color: rgba(255,255,255,.16); background: rgba(255,255,255,.07); }
        .hCTA--desktopOnly{ display:inline-flex; }

        .hTgl{
          width: 44px; height: 40px; border-radius: 12px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          display:none; align-items:center; justify-content:center;
          flex-direction: column; gap: 5px;
          cursor: pointer;
          transition: background-color .14s ease, border-color .14s ease, transform .14s ease;
        }
        .hTgl:hover{ transform: translateY(-1px); background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.14); }
        .hTgl__bar{ width: 18px; height: 2px; border-radius: 999px; background: rgba(255,255,255,.86); opacity: .9; }

        .hLang{ position: relative; }
        .hLang__btn{
          display:inline-flex; align-items:center; gap: 8px;
          height: 38px; padding: 0 10px; border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.86);
          font-weight: 860; font-size: 12px;
          cursor: pointer;
          transition: background-color .14s ease, border-color .14s ease, transform .14s ease;
        }
        .hLang__btn:hover{ transform: translateY(-1px); background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.14); }
        .hLang__dot{
          width: 8px; height: 8px; border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.9), rgba(120,170,255,.9));
          box-shadow: 0 0 0 3px rgba(120,170,255,.10);
        }
        .hLang__code{ letter-spacing: .12em; }
        .hLang__chev{ opacity: .75; }

        .hLang__panel{
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
        .hLang.is-open .hLang__panel{ opacity: 1; pointer-events: auto; transform: translateY(0) scale(1); }
        .hLang__item{
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
        .hLang__item + .hLang__item{ margin-top: 8px; }
        .hLang__item:hover{ background: rgba(255,255,255,.05); border-color: rgba(255,255,255,.10); transform: translateY(-1px); }
        .hLang__item.is-active{ background: rgba(120,170,255,.10); border-color: rgba(120,170,255,.22); }
        .hLang__itemCode{ font-weight: 900; letter-spacing: .12em; width: 34px; text-align: left; }

        .hLang__reveal{
          position:absolute;
          right: calc(100% + 10px);
          top: 50%;
          transform: translateY(-50%) translateX(6px);
          opacity: 0;
          pointer-events: none;
          transition: opacity .14s ease, transform .14s ease;
        }
        .hLang__item:hover .hLang__reveal{ opacity: 1; transform: translateY(-50%) translateX(0); }
        .hLang__revealInner{
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

        .hMOv{ position: fixed; inset: 0; z-index: 2147483000; opacity: 0; pointer-events: none; transition: opacity .16s ease; }
        .hMOv.is-mounted{ display:block; }
        .hMOv.is-open{ opacity: 1; pointer-events: auto; }
        .hMOv__backdrop{
          position:absolute; inset:0; border:0;
          background: rgba(0,0,0,.46);
          -webkit-backdrop-filter: blur(8px);
          backdrop-filter: blur(8px);
          cursor: pointer;
        }

        .hSheet{
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
        .hSheet.is-open{ transform: translateY(0) scale(1); opacity: 1; }

        .hSheet__bg{
          position:absolute; inset:0;
          background:
            radial-gradient(120% 90% at 20% 0%, rgba(120,170,255,.14), transparent 58%),
            radial-gradient(120% 90% at 90% 0%, rgba(63,227,196,.10), transparent 60%);
          pointer-events:none;
          opacity: .75;
        }
        .hSheet__head{ position: relative; z-index: 2; display:flex; align-items:center; justify-content: space-between; padding: 14px 14px 10px; }
        .hSheet__brand{ display:flex; align-items:center; gap: 10px; }
        .hSheet__dot{
          width: 10px; height: 10px; border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), rgba(120,170,255,.85));
          box-shadow: 0 0 0 4px rgba(120,170,255,.10);
        }
        .hSheet__title{ font-weight: 900; letter-spacing: .18em; font-size: 11px; color: rgba(255,255,255,.70); }
        .hSheet__close{
          width: 40px; height: 38px; border-radius: 12px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.05);
          color: rgba(255,255,255,.88);
          display:flex; align-items:center; justify-content:center;
          cursor: pointer;
          transition: transform .14s ease, background-color .14s ease;
        }
        .hSheet__close:hover{ transform: translateY(-1px); background: rgba(255,255,255,.07); }
        .hSheet__list{ position: relative; z-index: 2; padding: 8px 14px 14px; display:grid; gap: 10px; }

        .hStg{ transform: translateY(6px); opacity: 0; animation: hIn .24s ease forwards; animation-delay: calc(0.03s * var(--i, 0)); }
        @keyframes hIn{ to{ transform: translateY(0); opacity: 1; } }

        .hMRow{
          display:flex; align-items:center; justify-content: space-between; gap: 12px;
          padding: 12px 12px; border-radius: 16px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.86);
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
        }
        .hMRow:hover{ transform: translateY(-1px); background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.12); }
        .hMRow.is-active{ background: rgba(120,170,255,.10); border-color: rgba(120,170,255,.22); }
        .hMRow__left{ display:flex; align-items:center; gap: 10px; min-width: 0; }
        .hMRow__ico{
          width: 32px; height: 32px;
          display:flex; align-items:center; justify-content:center;
          border-radius: 12px;
          background: rgba(255,255,255,.05);
          border: 1px solid rgba(255,255,255,.07);
          flex: 0 0 auto;
        }
        .hMRow__label{ font-weight: 860; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .hMRow__chev{ opacity: .75; }

        .hMRow--contact{
          background:
            radial-gradient(120% 120% at 20% 10%, rgba(120,170,255,.18), transparent 60%),
            rgba(255,255,255,.05);
          border-color: rgba(255,255,255,.12);
        }

        .hAcc{ border-radius: 18px; overflow:hidden; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.03); }
        .hAcc__head{
          width: 100%;
          border:0; background: transparent;
          display:flex; align-items:center; justify-content: space-between;
          padding: 12px 12px;
          cursor:pointer; color: rgba(255,255,255,.88);
        }
        .hAcc__headLeft{ display:flex; align-items:center; gap: 10px; }
        .hAcc__ico{
          width: 32px; height: 32px;
          display:flex; align-items:center; justify-content:center;
          border-radius: 12px;
          background: rgba(255,255,255,.05);
          border: 1px solid rgba(255,255,255,.07);
        }
        .hAcc__label{ font-weight: 860; }
        .hAcc__chev{ opacity: .75; transition: transform .14s ease; }
        .hAcc__head.is-open .hAcc__chev{ transform: rotate(180deg); }
        .hAcc__panel{
          display:grid; gap: 8px;
          padding: 0 12px 12px;
          max-height: 0; overflow: hidden;
          transition: max-height .18s ease;
        }
        .hAcc__panel.is-open{ max-height: 720px; }
        .hAcc__item{
          display:flex; align-items:center; justify-content: space-between; gap: 10px;
          padding: 10px 10px; border-radius: 14px;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.84);
          transition: background-color .14s ease, border-color .14s ease, transform .14s ease;
        }
        .hAcc__item:hover{ background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.10); transform: translateY(-1px); }
        .hAcc__item.is-active{ background: rgba(120,170,255,.10); border-color: rgba(120,170,255,.22); }
        .hAcc__text{ font-weight: 860; }
        .hAcc__arrow{ opacity: .7; }

        @media (max-width: 1060px){
          .hDD__panel{ width: 720px; }
          .hMega{ grid-template-columns: 300px 1fr; }
        }
        @media (max-width: 920px){
          .hM{ display:none; }
          .hTgl{ display:inline-flex; }
          .hCTA--desktopOnly{ display:none; }
          .hLang__btn{ height: 40px; }
          .hDD__panel{ display:none; }
        }
        @media (max-width: 520px){
          .hC{ padding: 0 14px; }
          .hR{ gap: 10px; }
          .hLang__panel{ width: 200px; }
          .hLang__reveal{ display:none; }
        }
      `}</style>

      <div className="hC hI hG">
        <div className="hL">
          <Link to={`/${lang}`} className="hBrand" aria-label="NEOX" data-wg-notranslate>
            <span className="hLogoWrap" aria-hidden="true">
              <span className="hLogoAura" aria-hidden="true" />
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
                  filter: "drop-shadow(0 8px 18px rgba(0,0,0,.38))",
                  transform: isMobile ? "translateY(1px) translateZ(0)" : "translateZ(0)",
                }}
              />
            </span>
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="hM" aria-label="Əsas menyu">
          <NavLink to={withLang("/")} end className={navItem}>
            {t("nav.home")}
          </NavLink>

          <NavLink to={withLang("/about")} className={navItem}>
            {t("nav.about")}
          </NavLink>

          {/* Services mega */}
          <div
            ref={svcRef}
            className={cx("hDD", svcOpen && "is-open")}
            onMouseEnter={() => openDrop("services")}
            onMouseLeave={() => scheduleCloseDrop("services")}
          >
            <button
              type="button"
              className={cx("hDD__btn", (isServicesActive || svcOpen) && "is-active")}
              aria-haspopup="menu"
              aria-expanded={svcOpen}
              onClick={() => setOpenMenu((v) => (v === "services" ? null : "services"))}
              onFocus={() => openDrop("services")}
            >
              {t("nav.services")}
              <span className="hDD__chev" aria-hidden="true">
                <ChevronDown size={16} />
              </span>
            </button>

            <div className="hDD__panel" role="menu" aria-hidden={!svcOpen}>
              <Mega kind="services" items={SERVICES} active={activeSvc} setActive={(id) => setSvcActive(id)} />
            </div>
          </div>

          {/* Use Cases mega */}
          <div
            ref={ucRef}
            className={cx("hDD", ucOpen && "is-open")}
            onMouseEnter={() => openDrop("usecases")}
            onMouseLeave={() => scheduleCloseDrop("usecases")}
          >
            <button
              type="button"
              className={cx("hDD__btn", (isUseCasesActive || ucOpen) && "is-active")}
              aria-haspopup="menu"
              aria-expanded={ucOpen}
              onClick={() => setOpenMenu((v) => (v === "usecases" ? null : "usecases"))}
              onFocus={() => openDrop("usecases")}
            >
              {t("nav.useCases")}
              <span className="hDD__chev" aria-hidden="true">
                <ChevronDown size={16} />
              </span>
            </button>

            <div className="hDD__panel" role="menu" aria-hidden={!ucOpen}>
              <Mega kind="usecases" items={USECASES} active={activeUc} setActive={(id) => setUcActive(id)} />
            </div>
          </div>

          {/* Resources */}
          <div
            ref={resRef}
            className={cx("hDD", resOpen && "is-open")}
            onMouseEnter={() => openDrop("resources")}
            onMouseLeave={() => scheduleCloseDrop("resources")}
          >
            <button
              type="button"
              className={cx("hDD__btn", (isResActive || resOpen) && "is-active")}
              aria-haspopup="menu"
              aria-expanded={resOpen}
              onClick={() => setOpenMenu((v) => (v === "resources" ? null : "resources"))}
              onFocus={() => openDrop("resources")}
            >
              Resources
              <span className="hDD__chev" aria-hidden="true">
                <ChevronDown size={16} />
              </span>
            </button>

            <div className="hDD__panel" role="menu" aria-hidden={!resOpen} style={{ width: 320 }}>
              <div className="hList">
                {RES_LINKS.map((s) => (
                  <NavLink
                    key={s.to}
                    to={withLang(s.to)}
                    className={({ isActive }) => cx("hRow", isActive && "is-active")}
                    role="menuitem"
                    onClick={() => setOpenMenu(null)}
                  >
                    {s.label}
                  </NavLink>
                ))}
              </div>
            </div>
          </div>

          <NavLink to={withLang("/blog")} className={navItem}>
            {t("nav.blog")}
          </NavLink>
        </nav>

        <div className="hR">
          <LangMenu lang={lang} onPick={(c) => switchLang(c)} />

          <Link to={withLang("/contact")} className="hCTA hCTA--desktopOnly">
            {t("nav.contact")}
          </Link>

          <button
            className="hTgl"
            type="button"
            aria-label={open ? "Menyunu bağla" : "Menyunu aç"}
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => {
              if (!open) setOpen(true);
              else closeMobile();
            }}
          >
            <span className="hTgl__bar" />
            <span className="hTgl__bar" />
            <span className="hTgl__bar" />
          </button>
        </div>
      </div>

      {createPortal(MobileOverlay, document.body)}
    </header>
  );

  // If SSR, just return.
  if (typeof document === "undefined") return HeaderUI;

  // Portal header into <body> => parent transforms can't move it
  return createPortal(HeaderUI, document.body);
}
