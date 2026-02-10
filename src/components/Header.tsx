// src/components/Header.tsx
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  X,
  Home,
  Info,
  Sparkles,
  Layers,
  BookOpen,
  PhoneCall,
  ChevronDown,
  Bot,
  Workflow,
  Globe2,
  Smartphone,
  Megaphone,
  Headset,
  Landmark,
  Stethoscope,
  ShoppingBag,
  Truck,
  Hotel,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { LANGS, DEFAULT_LANG, type Lang } from "../i18n/lang";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}
function isLang(x: string | undefined | null): x is Lang {
  return !!x && (LANGS as readonly string[]).includes(x as any);
}
function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}
function getScrollY() {
  return window.scrollY || document.documentElement.scrollTop || 0;
}
function cloudinaryAuto(url: string) {
  try {
    if (!url.includes("/upload/")) return url;
    if (url.includes("/upload/q_auto") || url.includes("/upload/f_auto")) return url;
    return url.replace("/upload/", "/upload/q_auto,f_auto/");
  } catch {
    return url;
  }
}

/* ===== Language dropdown (hover) ===== */
function LangMenu({ lang, onPick }: { lang: Lang; onPick: (l: Lang) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const closeT = useRef<number | null>(null);

  const openDrop = () => {
    if (closeT.current) window.clearTimeout(closeT.current);
    closeT.current = null;
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
    c === "az" ? "Azərbaycan" : c === "tr" ? "Türk" : c === "en" ? "English" : c === "ru" ? "Русский" : "Español";

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
            <span className="langMenu__itemName">{nameOf(code)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ===== Mega menu types ===== */
type MegaItem = {
  id: string;
  label: string;
  desc: string;
  to: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  // right side content
  headline: string;
  blurb: string;
  cards: Array<{
    title: string;
    desc: string;
    to: string;
    tag?: string;
  }>;
  // optional background video preview (Cloudinary)
  video?: string;
};

type MenuKey = "about" | "services" | "usecases" | "resources" | null;

export default function Header({ introReady }: { introReady: boolean }) {
  const { t, i18n } = useTranslation();
  const { lang: paramLang } = useParams<{ lang?: string }>();
  const lang: Lang = isLang(paramLang) ? (paramLang as Lang) : DEFAULT_LANG;

  const location = useLocation();
  const navigate = useNavigate();

  const headerRef = useRef<HTMLElement | null>(null);
  const panelId = useId();

  const [isMobile, setIsMobile] = useState(false);
  const [hdrp, setHdrp] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  const [openMenu, setOpenMenu] = useState<MenuKey>(null);
  const closeT = useRef<number | null>(null);

  const [open, setOpen] = useState(false);
  const [softOpen, setSoftOpen] = useState(false);
  const [mobileSvcOpen, setMobileSvcOpen] = useState(false);
  const [mobileUcOpen, setMobileUcOpen] = useState(false);
  const [mobileResOpen, setMobileResOpen] = useState(false);
  const [mobileAboutOpen, setMobileAboutOpen] = useState(false);

  const aboutRef = useRef<HTMLDivElement | null>(null);
  const svcRef = useRef<HTMLDivElement | null>(null);
  const ucRef = useRef<HTMLDivElement | null>(null);
  const resRef = useRef<HTMLDivElement | null>(null);

  const [svcActive, setSvcActive] = useState("chatbot-24-7");
  const [ucActive, setUcActive] = useState("finance");

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 920px)");
    const apply = () => setIsMobile(!!mq.matches);
    apply();
    mq.addEventListener ? mq.addEventListener("change", apply) : (mq as any).addListener(apply);
    return () => {
      mq.removeEventListener ? mq.removeEventListener("change", apply) : (mq as any).removeListener(apply);
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

  // scroll -> blur progress
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const y = getScrollY();
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
    setMobileAboutOpen(false);
  }, [location.pathname]);

  // lock body scroll for mobile overlay
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

  // click outside desktop mega
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!openMenu) return;
      const target = e.target as Node;
      const map: Record<Exclude<MenuKey, null>, React.RefObject<HTMLDivElement>> = {
        about: aboutRef,
        services: svcRef,
        usecases: ucRef,
        resources: resRef,
      };
      const el = map[openMenu]?.current;
      if (!el) return;
      if (!el.contains(target)) setOpenMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [openMenu]);

  const openDrop = (menu: Exclude<MenuKey, null>) => {
    if (closeT.current) window.clearTimeout(closeT.current);
    closeT.current = null;
    setOpenMenu(menu);
  };
  const scheduleCloseDrop = (menu: Exclude<MenuKey, null>) => {
    if (closeT.current) window.clearTimeout(closeT.current);
    closeT.current = window.setTimeout(() => {
      setOpenMenu((cur) => (cur === menu ? null : cur));
    }, 120) as any;
  };

  const closeMobile = useCallback(() => {
    setSoftOpen(false);
    window.setTimeout(() => setOpen(false), 140);
  }, []);

  /* ===== Data ===== */
  const ABOUT_LINKS = useMemo(
    () => [
      { to: "/about", label: "Haqqımızda" },
      { to: "/pricing", label: "Qiymətlər" },
    ],
    []
  );

  const RES_LINKS = useMemo(
    () => [
      { to: "/resources/docs", label: "Docs" },
      { to: "/resources/faq", label: "FAQ" },
      { to: "/resources/guides", label: "Guides" },
      { to: "/privacy", label: "Privacy Policy" },
    ],
    []
  );

  const SERVICES: MegaItem[] = useMemo(
    () => [
      {
        id: "chatbot-24-7",
        label: "Chatbot 24/7",
        desc: "Instant support, lead capture, smart routing",
        to: "/services/chatbot-24-7",
        Icon: Bot,
        headline: "Always-on AI Chatbot",
        blurb: "24/7 conversations, qualified leads, operator handoff — all in one widget.",
        cards: [
          { title: "Live handoff", desc: "Operator çağırışı + admin panel reply", to: "/services/chatbot-24-7", tag: "Popular" },
          { title: "Lead capture", desc: "Soft capture after 2–3 messages", to: "/pricing", tag: "Conversion" },
          { title: "Multilingual", desc: "Auto translate + admin language", to: "/services/chatbot-24-7" },
        ],
      },
      {
        id: "business-workflows",
        label: "Business Workflows",
        desc: "Automations, integrations, approvals",
        to: "/services/business-workflows",
        Icon: Workflow,
        headline: "Workflow Automation",
        blurb: "Turn repetitive ops into reliable flows with alerts, rules, and integrations.",
        cards: [
          { title: "Approvals", desc: "SLA, routing, escalation", to: "/services/business-workflows" },
          { title: "Integrations", desc: "CRM, Telegram, Email, Webhooks", to: "/services/business-workflows", tag: "Fast" },
          { title: "Dashboards", desc: "Track conversions & operations", to: "/services/business-workflows" },
        ],
      },
      {
        id: "websites",
        label: "Websites",
        desc: "Premium landing pages + SEO speed",
        to: "/services/websites",
        Icon: Globe2,
        headline: "Modern Websites",
        blurb: "Fast UI, clean animations, Cloudinary media, SEO-ready structure.",
        cards: [
          { title: "Performance", desc: "High FPS, lazy media, smooth UX", to: "/services/websites", tag: "FPS" },
          { title: "Design system", desc: "Premium components & spacing", to: "/services/websites" },
          { title: "Deployment", desc: "Netlify/CF Pages + Railway", to: "/services/websites" },
        ],
      },
      {
        id: "mobile-apps",
        label: "Mobile Apps",
        desc: "iOS/Android UX + backend integration",
        to: "/services/mobile-apps",
        Icon: Smartphone,
        headline: "Mobile Apps",
        blurb: "Apps that feel premium: smooth navigation, clean UI, reliable APIs.",
        cards: [
          { title: "Native-like UX", desc: "Fast transitions & layout", to: "/services/mobile-apps" },
          { title: "Auth & Admin", desc: "Magic link + mobile admin", to: "/services/mobile-apps", tag: "Pro" },
          { title: "Media", desc: "Cloudinary upload pipeline", to: "/services/mobile-apps" },
        ],
      },
      {
        id: "smm-automation",
        label: "SMM Automation",
        desc: "Content plan, scheduling, analytics",
        to: "/services/smm-automation",
        Icon: Megaphone,
        headline: "Social Automation",
        blurb: "Publish faster with templates, schedules, and measurable results.",
        cards: [
          { title: "Scheduling", desc: "Plan posts & campaigns", to: "/services/smm-automation" },
          { title: "Templates", desc: "Canva/CapCut pro workflow", to: "/services/smm-automation", tag: "Creator" },
          { title: "Analytics", desc: "Measure conversion & reach", to: "/services/smm-automation" },
        ],
      },
      {
        id: "technical-support",
        label: "Technical Support",
        desc: "Monitoring, fixes, uptime, security",
        to: "/services/technical-support",
        Icon: Headset,
        headline: "Technical Support",
        blurb: "Keep systems healthy: monitoring, fixes, security hardening, and rapid response.",
        cards: [
          { title: "Monitoring", desc: "Track uptime & errors", to: "/services/technical-support" },
          { title: "Security", desc: "Rate limit, allowlist, tokens", to: "/services/technical-support", tag: "Secure" },
          { title: "Ops", desc: "Backups, updates, deploy pipeline", to: "/services/technical-support" },
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
        desc: "KYC flows, onboarding, routing",
        to: "/use-cases/finance",
        Icon: Landmark,
        headline: "Finance Automation",
        blurb: "From lead → KYC → demo → operator handoff. Clean and compliant routing.",
        cards: [
          { title: "KYC safe routing", desc: "Segment users & escalate", to: "/use-cases/finance", tag: "Compliance" },
          { title: "Demo funnel", desc: "Convert with guided flows", to: "/use-cases/finance" },
          { title: "Audit logs", desc: "Track interactions & outcomes", to: "/use-cases/finance" },
        ],
      },
      {
        id: "healthcare",
        label: "Healthcare",
        desc: "Triage, booking, reminders",
        to: "/use-cases/healthcare",
        Icon: Stethoscope,
        headline: "Healthcare Assistant",
        blurb: "Smart triage, appointment flows, no-show reminders and staff escalation.",
        cards: [
          { title: "Smart triage", desc: "Route by symptoms & urgency", to: "/use-cases/healthcare", tag: "Fast" },
          { title: "Booking", desc: "Automate appointment scheduling", to: "/use-cases/healthcare" },
          { title: "Privacy-first", desc: "Safe handling for sensitive info", to: "/use-cases/healthcare" },
        ],
      },
      {
        id: "retail",
        label: "Retail",
        desc: "Orders, upsells, support",
        to: "/use-cases/retail",
        Icon: ShoppingBag,
        headline: "Retail Conversion",
        blurb: "Upsell, bundles, tracking, returns — all inside one assistant.",
        cards: [
          { title: "Upsell assist", desc: "Recommend add-ons instantly", to: "/use-cases/retail", tag: "Revenue" },
          { title: "Order tracking", desc: "Reduce support tickets", to: "/use-cases/retail" },
          { title: "Returns flow", desc: "Step-by-step resolution", to: "/use-cases/retail" },
        ],
      },
      {
        id: "logistics",
        label: "Logistics",
        desc: "ETA updates, delays, tickets",
        to: "/use-cases/logistics",
        Icon: Truck,
        headline: "Logistics Operations",
        blurb: "ETA updates, delay escalation, automated notifications and ticketing.",
        cards: [
          { title: "ETA updates", desc: "Proactive delivery status", to: "/use-cases/logistics", tag: "Ops" },
          { title: "Delay escalation", desc: "Auto notify & handoff", to: "/use-cases/logistics" },
          { title: "Ticket automation", desc: "Create/close loops", to: "/use-cases/logistics" },
        ],
      },
      {
        id: "hotels",
        label: "Hotels & Resorts",
        desc: "Reservations, concierge, upgrades",
        to: "/use-cases/hotels",
        Icon: Hotel,
        headline: "Hospitality Concierge",
        blurb: "Reservations, upgrades, concierge requests, VIP handoff — premium flow.",
        cards: [
          { title: "Reservations", desc: "Instant booking answers", to: "/use-cases/hotels", tag: "VIP" },
          { title: "Concierge", desc: "Requests & routing", to: "/use-cases/hotels" },
          { title: "Upgrades", desc: "Upsell rooms & services", to: "/use-cases/hotels" },
        ],
      },
    ],
    []
  );

  const svcActiveItem = useMemo(() => SERVICES.find((x) => x.id === svcActive) ?? SERVICES[0], [SERVICES, svcActive]);
  const ucActiveItem = useMemo(() => USECASES.find((x) => x.id === ucActive) ?? USECASES[0], [USECASES, ucActive]);

  // smooth “terminal line” (right -> left) integrated, not thick
  const terminalLine = useMemo(() => {
    const parts = ucActiveItem.cards.map((c) => c.title.toUpperCase());
    const base = parts.join("   ·   ");
    return `${base}   ·   ${base}`;
  }, [ucActiveItem]);

  const isServicesActive = useMemo(() => location.pathname.toLowerCase().includes("/services"), [location.pathname]);
  const isUseCasesActive = useMemo(() => location.pathname.toLowerCase().includes("/use-cases"), [location.pathname]);
  const isAboutActive = useMemo(() => location.pathname.toLowerCase().includes("/about"), [location.pathname]);
  const isResActive = useMemo(() => {
    const p = location.pathname.toLowerCase();
    return p.includes("/resources") || p.includes("/privacy");
  }, [location.pathname]);

  const navItem = ({ isActive }: { isActive: boolean }) => cx("nav-link", isActive && "is-active");

  // mobile dynamic style
  const mobileP = clamp01(hdrp);
  const mobileBgAlpha = open ? 0.9 : 0.06 + 0.7 * mobileP;
  const mobileBlurPx = open ? 18 : 4 + 14 * mobileP;

  const headerInlineStyle: React.CSSProperties | undefined = isMobile
    ? {
        backgroundColor: `rgba(10, 12, 18, ${mobileBgAlpha.toFixed(3)})`,
        WebkitBackdropFilter: `blur(${mobileBlurPx.toFixed(1)}px) saturate(1.22)`,
        backdropFilter: `blur(${mobileBlurPx.toFixed(1)}px) saturate(1.22)`,
        borderBottom: `1px solid rgba(255,255,255,${(open ? 0.1 : 0.06 * mobileP).toFixed(3)})`,
      }
    : undefined;

  /* ===== Mobile overlay ===== */
  const MobileOverlay = (
    <div className={cx("nav-overlay", open && "is-mounted", softOpen && "is-open")} aria-hidden={!open}>
      <button className="nav-overlay__backdrop" type="button" aria-label="Bağla" onClick={closeMobile} />
      <div id={panelId} className={cx("nav-sheet", softOpen && "is-open")} role="dialog" aria-modal="true">
        <div className="nav-sheet__bg" aria-hidden="true" />
        <div className="nav-sheet__head">
          <div className="nav-sheet__brand">
            <span className="nav-sheet__dot" />
            <span className="nav-sheet__title">MENYU</span>
          </div>
          <button className="nav-sheet__close" type="button" aria-label="Bağla" onClick={closeMobile}>
            <X size={18} />
          </button>
        </div>

        <div className="nav-sheet__list">
          <NavLink to={withLang("/")} end className={({ isActive }) => cx("nav-sheetLink", isActive && "is-active")} onClick={closeMobile}>
            <span className="nav-sheetLink__left">
              <span className="nav-sheetLink__ico"><Home size={18} /></span>
              <span className="nav-sheetLink__label">{t?.("nav.home") ?? "Ana səhifə"}</span>
            </span>
            <span className="nav-sheetLink__chev">→</span>
          </NavLink>

          {/* About */}
          <div className="nav-acc">
            <button type="button" className={cx("nav-acc__head", mobileAboutOpen && "is-open")} onClick={() => setMobileAboutOpen((v) => !v)}>
              <span className="nav-sheetLink__left">
                <span className="nav-sheetLink__ico"><Info size={18} /></span>
                <span className="nav-sheetLink__label">{t?.("nav.about") ?? "Haqqımızda"}</span>
              </span>
              <ChevronDown size={16} className="nav-acc__chev" />
            </button>
            <div className={cx("nav-acc__panel", mobileAboutOpen && "is-open")}>
              {ABOUT_LINKS.map((a) => (
                <NavLink key={a.to} to={withLang(a.to)} className={({ isActive }) => cx("nav-acc__item", isActive && "is-active")} onClick={closeMobile}>
                  <span className="nav-acc__text">{a.label}</span><span className="nav-acc__arrow">→</span>
                </NavLink>
              ))}
            </div>
          </div>

          {/* Services */}
          <div className="nav-acc">
            <button type="button" className={cx("nav-acc__head", mobileSvcOpen && "is-open")} onClick={() => setMobileSvcOpen((v) => !v)}>
              <span className="nav-sheetLink__left">
                <span className="nav-sheetLink__ico"><Sparkles size={18} /></span>
                <span className="nav-sheetLink__label">{t?.("nav.services") ?? "Xidmətlər"}</span>
              </span>
              <ChevronDown size={16} className="nav-acc__chev" />
            </button>
            <div className={cx("nav-acc__panel", mobileSvcOpen && "is-open")}>
              {SERVICES.map((s) => (
                <NavLink key={s.id} to={withLang(s.to)} className={({ isActive }) => cx("nav-acc__item", isActive && "is-active")} onClick={closeMobile}>
                  <span className="nav-acc__text">{s.label}</span><span className="nav-acc__arrow">→</span>
                </NavLink>
              ))}
            </div>
          </div>

          {/* Use cases */}
          <div className="nav-acc">
            <button type="button" className={cx("nav-acc__head", mobileUcOpen && "is-open")} onClick={() => setMobileUcOpen((v) => !v)}>
              <span className="nav-sheetLink__left">
                <span className="nav-sheetLink__ico"><Layers size={18} /></span>
                <span className="nav-sheetLink__label">{t?.("nav.useCases") ?? "Ssenarilər"}</span>
              </span>
              <ChevronDown size={16} className="nav-acc__chev" />
            </button>
            <div className={cx("nav-acc__panel", mobileUcOpen && "is-open")}>
              <NavLink to={withLang("/use-cases")} className={({ isActive }) => cx("nav-acc__item", isActive && "is-active")} onClick={closeMobile}>
                <span className="nav-acc__text">All Use Cases</span><span className="nav-acc__arrow">→</span>
              </NavLink>
              {USECASES.map((u) => (
                <NavLink key={u.id} to={withLang(u.to)} className={({ isActive }) => cx("nav-acc__item", isActive && "is-active")} onClick={closeMobile}>
                  <span className="nav-acc__text">{u.label}</span><span className="nav-acc__arrow">→</span>
                </NavLink>
              ))}
            </div>
          </div>

          {/* Resources */}
          <div className="nav-acc">
            <button type="button" className={cx("nav-acc__head", mobileResOpen && "is-open")} onClick={() => setMobileResOpen((v) => !v)}>
              <span className="nav-sheetLink__left">
                <span className="nav-sheetLink__ico"><BookOpen size={18} /></span>
                <span className="nav-sheetLink__label">Resources</span>
              </span>
              <ChevronDown size={16} className="nav-acc__chev" />
            </button>
            <div className={cx("nav-acc__panel", mobileResOpen && "is-open")}>
              {RES_LINKS.map((r) => (
                <NavLink key={r.to} to={withLang(r.to)} className={({ isActive }) => cx("nav-acc__item", isActive && "is-active")} onClick={closeMobile}>
                  <span className="nav-acc__text">{r.label}</span><span className="nav-acc__arrow">→</span>
                </NavLink>
              ))}
            </div>
          </div>

          <NavLink to={withLang("/blog")} className={({ isActive }) => cx("nav-sheetLink", isActive && "is-active")} onClick={closeMobile}>
            <span className="nav-sheetLink__left">
              <span className="nav-sheetLink__ico"><BookOpen size={18} /></span>
              <span className="nav-sheetLink__label">{t?.("nav.blog") ?? "Blog"}</span>
            </span>
            <span className="nav-sheetLink__chev">→</span>
          </NavLink>

          <NavLink to={withLang("/contact")} className={({ isActive }) => cx("nav-sheetLink", "nav-sheetLink--contact", isActive && "is-active")} onClick={closeMobile}>
            <span className="nav-sheetLink__left">
              <span className="nav-sheetLink__ico"><PhoneCall size={18} /></span>
              <span className="nav-sheetLink__label">{t?.("nav.contact") ?? "Əlaqə"}</span>
            </span>
            <span className="nav-sheetLink__chev">→</span>
          </NavLink>
        </div>
      </div>
    </div>
  );

  return (
    <header ref={headerRef} style={headerInlineStyle} className={cx("site-header", introReady && "site-header--in", scrolled && "is-scrolled", open && "is-open")}>
      <style>{`
        :root{ --hdrh: 72px; --hdrp: 0; }
        .site-header{
          position: sticky; top: 0; z-index: 1100; width: 100%;
          transform: translateZ(0);
          background: rgba(10,12,18,0.02);
          border-bottom: 1px solid rgba(255,255,255,0.04);
          transition: background-color .18s ease, border-color .18s ease;
        }
        .site-header.is-scrolled{
          background: rgba(10, 12, 18, calc(0.09 + 0.26 * var(--hdrp)));
          border-bottom-color: rgba(255,255,255, calc(0.06 + 0.06 * var(--hdrp)));
          -webkit-backdrop-filter: blur(calc(8px + 10px * var(--hdrp))) saturate(1.18);
          backdrop-filter: blur(calc(8px + 10px * var(--hdrp))) saturate(1.18);
        }
        .site-header.is-open{
          background: rgba(10, 12, 18, 0.90);
          border-bottom-color: rgba(255,255,255,0.10);
          -webkit-backdrop-filter: blur(18px) saturate(1.25);
          backdrop-filter: blur(18px) saturate(1.25);
        }

        .container{ max-width: 1180px; margin: 0 auto; padding: 0 18px; }
        .header-inner{ height: var(--hdrh); display: grid; align-items: center; }
        .header-grid{ grid-template-columns: auto 1fr auto; gap: 14px; }
        .header-left{ display:flex; align-items:center; min-width:0; }
        .header-mid{ display:flex; align-items:center; justify-content:center; gap: 10px; }
        .header-right{ display:flex; align-items:center; justify-content:flex-end; gap: 12px; }

        .brand-link{ display:inline-flex; align-items:center; gap: 10px; text-decoration: none; min-width:0; }
        .headerBrand{ position: relative; display:flex; align-items:center; }
        .headerBrand__aura{
          position:absolute; inset:-10px -16px;
          background:
            radial-gradient(120px 44px at 22% 55%, rgba(47,184,255,.16), transparent 60%),
            radial-gradient(120px 44px at 78% 45%, rgba(63,227,196,.10), transparent 62%);
          filter: blur(10px); opacity: .75; pointer-events:none;
        }

        /* top links */
        .nav-link{
          display: inline-flex; align-items: center; justify-content: center;
          gap: 8px; height: 40px; padding: 0 12px; border-radius: 999px;
          text-decoration: none;
          color: rgba(255,255,255,.72);
          font-weight: 760; font-size: 13px; letter-spacing: .02em;
          transition: color .16s ease, background-color .16s ease;
        }
        .nav-link:hover{ color: rgba(255,255,255,.92); background: rgba(255,255,255,.06); }
        .nav-link.is-active{ color: rgba(255,255,255,.94); background: rgba(255,255,255,.09); }

        /* dropdown trigger */
        .nav-dd{ position: relative; display:inline-flex; }
        .nav-dd__btn{
          display:inline-flex; align-items:center; gap: 8px;
          height: 40px; padding: 0 12px; border-radius: 999px;
          color: rgba(255,255,255,.72);
          background: transparent; border: 0; cursor: pointer;
          font: inherit; font-weight: 780; letter-spacing: .02em;
          transition: color .16s ease, background-color .16s ease;
        }
        .nav-dd__btn:hover{ color: rgba(255,255,255,.92); background: rgba(255,255,255,.06); }
        .nav-dd__btn.is-active{ color: rgba(255,255,255,.94); background: rgba(255,255,255,.09); }
        .nav-dd__chev{ opacity: .85; transition: transform .14s ease; }
        .nav-dd.is-open .nav-dd__chev{ transform: rotate(180deg); }

        /* ===== Mega panel (like blink-bi.az) ===== */
        .nav-dd__panel{
          position:absolute;
          top: calc(100% + 12px);
          left: 0;
          width: 860px;
          max-width: min(860px, calc(100vw - 40px));
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,.10);
          background:
            radial-gradient(120% 90% at 18% 6%, rgba(47,184,255,.10), transparent 58%),
            radial-gradient(120% 90% at 84% 6%, rgba(63,227,196,.09), transparent 62%),
            rgba(10,12,18,.86);
          -webkit-backdrop-filter: blur(18px) saturate(1.18);
          backdrop-filter: blur(18px) saturate(1.18);
          box-shadow: 0 26px 90px rgba(0,0,0,.68);
          opacity: 0;
          pointer-events: none;
          transform-origin: top left;
          transform: translateY(-10px) rotateX(8deg) scale(.985);
          transition: opacity .16s ease, transform .16s ease;
          z-index: 1400;
          overflow: hidden;
        }
        .nav-dd.is-open .nav-dd__panel{
          opacity: 1;
          pointer-events: auto;
          transform: translateY(0) rotateX(0deg) scale(1);
        }
        .nav-dd.nav-dd--right .nav-dd__panel{
          left: auto;
          right: 0;
          transform-origin: top right;
        }

        .mega{
          display:grid;
          grid-template-columns: 330px 1fr;
          min-height: 360px;
        }

        /* LEFT rail */
        .megaLeft{
          background: linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.02));
          border-right: 1px solid rgba(255,255,255,.08);
          padding: 14px;
        }
        .megaLeftTitle{
          display:flex; align-items:center; justify-content: space-between;
          color: rgba(255,255,255,.80);
          font-weight: 900;
          letter-spacing: .10em;
          text-transform: uppercase;
          font-size: 11px;
          padding: 6px 8px 12px;
        }
        .megaLeftList{ display:grid; gap: 8px; }
        .megaItem{
          display:grid;
          grid-template-columns: 34px 1fr;
          gap: 10px;
          padding: 12px 12px;
          border-radius: 14px;
          text-decoration:none;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.03);
          color: rgba(255,255,255,.86);
          transition: background-color .14s ease, border-color .14s ease, transform .14s ease;
          position: relative;
          outline: none;
        }
        .megaItem:hover{
          background: rgba(255,255,255,.05);
          border-color: rgba(255,255,255,.10);
          transform: translateY(-1px);
        }
        .megaItem.is-active{
          background: rgba(47,184,255,.10);
          border-color: rgba(47,184,255,.22);
        }
        .megaItem:focus-visible{ box-shadow: 0 0 0 3px rgba(47,184,255,.18); }
        .megaIcon{
          width: 34px; height: 34px;
          display:flex; align-items:center; justify-content:center;
          border-radius: 12px;
          background: rgba(0,0,0,.22);
          border: 1px solid rgba(255,255,255,.08);
        }
        .megaText{ min-width:0; }
        .megaLabel{
          font-weight: 920;
          letter-spacing: .01em;
          font-size: 13px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .megaDesc{
          margin-top: 3px;
          font-size: 12px;
          font-weight: 720;
          color: rgba(255,255,255,.62);
          line-height: 1.25;
        }

        /* RIGHT preview */
        .megaRight{
          padding: 16px;
          display:flex;
          flex-direction: column;
          gap: 14px;
        }
        .megaTop{
          padding: 4px 4px 0;
        }
        .megaHeadline{
          font-size: 18px;
          font-weight: 980;
          color: rgba(255,255,255,.92);
          letter-spacing: .01em;
        }
        .megaBlurb{
          margin-top: 6px;
          color: rgba(255,255,255,.68);
          font-weight: 720;
          font-size: 13px;
          line-height: 1.35;
          max-width: 540px;
        }

        .megaCards{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          padding: 0 4px 6px;
        }
        .megaCard{
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.03);
          padding: 14px 14px;
          text-decoration:none;
          color: rgba(255,255,255,.88);
          transition: transform .14s ease, border-color .14s ease, background-color .14s ease;
          position: relative;
          overflow:hidden;
        }
        .megaCard:hover{
          transform: translateY(-1px);
          background: rgba(255,255,255,.05);
          border-color: rgba(255,255,255,.12);
        }
        .megaCardTitleRow{ display:flex; align-items:center; justify-content: space-between; gap: 10px; }
        .megaCardTitle{
          font-weight: 950;
          letter-spacing: .01em;
          font-size: 14px;
        }
        .megaTag{
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .08em;
          text-transform: uppercase;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(47,184,255,.22);
          background: rgba(47,184,255,.10);
          color: rgba(255,255,255,.86);
          white-space: nowrap;
        }
        .megaCardDesc{
          margin-top: 8px;
          color: rgba(255,255,255,.64);
          font-size: 13px;
          font-weight: 720;
          line-height: 1.3;
        }
        .megaArrow{
          margin-top: 12px;
          display:inline-flex;
          color: rgba(255,255,255,.76);
          font-weight: 900;
          letter-spacing: .12em;
          text-transform: uppercase;
          font-size: 11px;
        }

        /* integrated "terminal strip" for Use Cases (NOT separate thick panel) */
        .megaTerminal{
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(0,0,0,.16);
          overflow:hidden;
          margin: 2px 4px 0;
          position: relative;
        }
        .megaTerminalHead{
          display:flex; align-items:center; justify-content: space-between;
          padding: 10px 12px;
          border-bottom: 1px solid rgba(255,255,255,.06);
          color: rgba(255,255,255,.70);
          font-weight: 920;
          letter-spacing: .14em;
          text-transform: uppercase;
          font-size: 11px;
        }
        .megaPulse{
          width: 8px; height: 8px; border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.92), rgba(47,184,255,.82));
          box-shadow: 0 0 0 3px rgba(47,184,255,.10);
          animation: pulse 1.9s ease-in-out infinite;
        }
        @keyframes pulse{ 0%,100%{ transform: scale(1); opacity:.9; } 50%{ transform: scale(1.18); opacity: 1; } }

        .megaMarquee{
          padding: 10px 12px;
          overflow:hidden;
        }
        .megaMarqueeInner{
          display:inline-flex;
          white-space: nowrap;
          gap: 34px;
          font-weight: 950;
          letter-spacing: .20em;
          text-transform: uppercase;
          font-size: 11px;
          color: rgba(255,255,255,.86);
          will-change: transform;
          animation: mar 12s linear infinite;
        }
        @keyframes mar{
          0%{ transform: translateX(18%); }
          100%{ transform: translateX(-55%); }
        }

        /* CTA / toggle */
        .nav-cta{
          display:inline-flex; align-items:center; justify-content:center;
          height: 38px; padding: 0 14px; border-radius: 999px; text-decoration:none;
          font-weight: 820; font-size: 13px; color: rgba(255,255,255,.92);
          border: 1px solid rgba(255,255,255,.10);
          background:
            radial-gradient(120% 120% at 20% 10%, rgba(47,184,255,.20), transparent 60%),
            rgba(255,255,255,.06);
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
        }
        .nav-cta:hover{ transform: translateY(-1px); border-color: rgba(255,255,255,.16); background: rgba(255,255,255,.08); }

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

        /* Lang */
        .langMenu{ position: relative; }
        .langMenu__btn{
          display:inline-flex; align-items:center; gap: 8px;
          height: 38px; padding: 0 10px; border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.86);
          font-weight: 820; font-size: 12px;
          cursor: pointer;
          transition: background-color .14s ease, border-color .14s ease, transform .14s ease;
        }
        .langMenu__btn:hover{ transform: translateY(-1px); background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.14); }
        .langMenu__dot{
          width: 8px; height: 8px; border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.9), rgba(47,184,255,.9));
          box-shadow: 0 0 0 3px rgba(47,184,255,.10);
        }
        .langMenu__code{ letter-spacing: .08em; }
        .langMenu__panel{
          position:absolute; top: calc(100% + 10px); right: 0;
          width: 210px; border-radius: 16px; padding: 10px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(10,12,18,.90);
          -webkit-backdrop-filter: blur(18px) saturate(1.15);
          backdrop-filter: blur(18px) saturate(1.15);
          box-shadow: 0 24px 80px rgba(0,0,0,.65);
          opacity: 0; pointer-events: none;
          transform-origin: top right;
          transform: translateY(-10px) rotateX(8deg) scaleY(.92);
          transition: opacity .16s ease, transform .16s ease;
          z-index: 1500;
        }
        .langMenu.is-open .langMenu__panel{ opacity: 1; pointer-events: auto; transform: translateY(0) rotateX(0deg) scaleY(1); }
        .langMenu__item{
          width: 100%;
          display:flex; align-items:center; justify-content: space-between; gap: 10px;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.86);
          padding: 10px 10px;
          border-radius: 12px;
          cursor: pointer;
          transition: background-color .14s ease, border-color .14s ease, transform .14s ease;
        }
        .langMenu__item + .langMenu__item{ margin-top: 8px; }
        .langMenu__item:hover{ background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.10); transform: translateY(-1px); }
        .langMenu__item.is-active{ background: rgba(47,184,255,.12); border-color: rgba(47,184,255,.22); }

        /* mobile overlay */
        .nav-overlay{ position: fixed; inset: 0; z-index: 2000; opacity: 0; pointer-events: none; transition: opacity .16s ease; }
        .nav-overlay.is-open{ opacity: 1; pointer-events: auto; }
        .nav-overlay__backdrop{ position:absolute; inset:0; border:0; background: rgba(0,0,0,.45); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); }
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
        .nav-sheet__bg{ position:absolute; inset:0; background: rgba(10,12,18,.92); -webkit-backdrop-filter: blur(18px) saturate(1.18); backdrop-filter: blur(18px) saturate(1.18); }
        .nav-sheet__head{ position: relative; z-index: 2; display:flex; align-items:center; justify-content: space-between; padding: 14px 14px 10px; }
        .nav-sheet__brand{ display:flex; align-items:center; gap: 10px; }
        .nav-sheet__dot{ width: 10px; height: 10px; border-radius: 999px; background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), rgba(47,184,255,.85)); box-shadow: 0 0 0 4px rgba(47,184,255,.10); }
        .nav-sheet__title{ font-weight: 900; letter-spacing: .18em; font-size: 11px; color: rgba(255,255,255,.70); }
        .nav-sheet__close{ width: 40px; height: 38px; border-radius: 12px; border: 1px solid rgba(255,255,255,.10); background: rgba(255,255,255,.05); color: rgba(255,255,255,.88); display:flex; align-items:center; justify-content:center; }
        .nav-sheet__list{ position: relative; z-index: 2; padding: 8px 14px 14px; display:grid; gap: 10px; }
        .nav-sheetLink{
          display:flex; align-items:center; justify-content: space-between; gap: 12px;
          padding: 12px 12px; border-radius: 16px;
          text-decoration:none; border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.84);
        }
        .nav-sheetLink__left{ display:flex; align-items:center; gap: 10px; min-width: 0; }
        .nav-sheetLink__ico{ width: 32px; height: 32px; display:flex; align-items:center; justify-content:center; border-radius: 12px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.07); }
        .nav-sheetLink__label{ font-weight: 820; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .nav-sheetLink--contact{ background: rgba(47,184,255,.10); border-color: rgba(47,184,255,.22); }

        .nav-acc{ border-radius: 18px; overflow:hidden; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.03); }
        .nav-acc__head{ width: 100%; border:0; background: transparent; display:flex; align-items:center; justify-content: space-between; padding: 12px 12px; cursor:pointer; color: rgba(255,255,255,.86); }
        .nav-acc__panel{ display:grid; gap: 8px; padding: 0 12px 12px; max-height: 0; overflow: hidden; transition: max-height .18s ease; }
        .nav-acc__panel.is-open{ max-height: 720px; }
        .nav-acc__item{ display:flex; align-items:center; justify-content: space-between; gap: 10px; padding: 10px 10px; border-radius: 14px; text-decoration:none; border: 1px solid rgba(255,255,255,.06); background: rgba(255,255,255,.04); color: rgba(255,255,255,.82); }
        .nav-acc__text{ font-weight: 820; }
        .nav-acc__arrow{ opacity: .7; }

        @media (max-width: 920px){
          .header-mid{ display:none; }
          .nav-toggle{ display:inline-flex; }
          .nav-cta{ display:none; }
        }
        @media (max-width: 980px){
          .nav-dd__panel{ width: 760px; }
          .mega{ grid-template-columns: 310px 1fr; }
        }
        @media (max-width: 720px){
          .nav-dd__panel{ width: 560px; }
          .mega{ grid-template-columns: 1fr; }
          .megaLeft{ border-right: 0; border-bottom: 1px solid rgba(255,255,255,.08); }
          .megaCards{ grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="container header-inner header-grid">
        <div className="header-left">
          <Link to={`/${lang}`} className="brand-link" aria-label="NEOX" data-wg-notranslate>
            <span className="headerBrand" aria-hidden="true">
              <span className="headerBrand__aura" />
              <img
                src="/image/neox-logo.png"
                alt="NEOX"
                width={148}
                height={44}
                loading="eager"
                decoding="async"
                draggable={false}
                style={{
                  height: isMobile ? 18 : 28,
                  width: "auto",
                  maxWidth: isMobile ? "118px" : "156px",
                  objectFit: "contain",
                  display: "block",
                  userSelect: "none",
                  filter: "drop-shadow(0 6px 16px rgba(0,0,0,.42)) drop-shadow(0 0 10px rgba(47,184,255,.06))",
                }}
              />
            </span>
          </Link>
        </div>

        <nav className="header-mid" aria-label="Əsas menyu">
          <NavLink to={withLang("/")} end className={navItem}>
            {t?.("nav.home") ?? "Ana səhifə"}
          </NavLink>

          {/* About */}
          <div
            ref={aboutRef}
            className={cx("nav-dd", openMenu === "about" && "is-open")}
            onMouseEnter={() => openDrop("about")}
            onMouseLeave={() => scheduleCloseDrop("about")}
          >
            <button
              type="button"
              className={cx("nav-dd__btn", (isAboutActive || openMenu === "about") && "is-active")}
              aria-haspopup="menu"
              aria-expanded={openMenu === "about"}
              onClick={() => setOpenMenu((v) => (v === "about" ? null : "about"))}
              onFocus={() => openDrop("about")}
            >
              {t?.("nav.about") ?? "Haqqımızda"}
              <span className="nav-dd__chev"><ChevronDown size={16} /></span>
            </button>

            <div className="nav-dd__panel" role="menu" aria-hidden={openMenu !== "about"}>
              <div className="mega" style={{ gridTemplateColumns: "330px 1fr" }}>
                <div className="megaLeft">
                  <div className="megaLeftTitle">Company</div>
                  <div className="megaLeftList">
                    {ABOUT_LINKS.map((a) => (
                      <NavLink
                        key={a.to}
                        to={withLang(a.to)}
                        className={({ isActive }) => cx("megaItem", isActive && "is-active")}
                        onClick={() => setOpenMenu(null)}
                      >
                        <span className="megaIcon"><Info size={18} /></span>
                        <span className="megaText">
                          <div className="megaLabel">{a.label}</div>
                          <div className="megaDesc">Learn about NEOX, our mission & approach</div>
                        </span>
                      </NavLink>
                    ))}
                  </div>
                </div>

                <div className="megaRight">
                  <div className="megaTop">
                    <div className="megaHeadline">NEOX Company</div>
                    <div className="megaBlurb">Premium automation, AI systems, and product-grade engineering — built to convert and scale.</div>
                  </div>

                  <div className="megaCards">
                    <NavLink to={withLang("/about")} className="megaCard" onClick={() => setOpenMenu(null)}>
                      <div className="megaCardTitleRow">
                        <div className="megaCardTitle">About NEOX</div>
                        <span className="megaTag">Overview</span>
                      </div>
                      <div className="megaCardDesc">What we build, how we work, and why it converts.</div>
                      <div className="megaArrow">Open →</div>
                    </NavLink>

                    <NavLink to={withLang("/pricing")} className="megaCard" onClick={() => setOpenMenu(null)}>
                      <div className="megaCardTitleRow">
                        <div className="megaCardTitle">Pricing</div>
                        <span className="megaTag">Plans</span>
                      </div>
                      <div className="megaCardDesc">Packages and integration options for your business.</div>
                      <div className="megaArrow">Open →</div>
                    </NavLink>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Services mega */}
          <div
            ref={svcRef}
            className={cx("nav-dd", openMenu === "services" && "is-open")}
            onMouseEnter={() => openDrop("services")}
            onMouseLeave={() => scheduleCloseDrop("services")}
          >
            <button
              type="button"
              className={cx("nav-dd__btn", (isServicesActive || openMenu === "services") && "is-active")}
              aria-haspopup="menu"
              aria-expanded={openMenu === "services"}
              onClick={() => setOpenMenu((v) => (v === "services" ? null : "services"))}
              onFocus={() => openDrop("services")}
            >
              {t?.("nav.services") ?? "Xidmətlər"}
              <span className="nav-dd__chev"><ChevronDown size={16} /></span>
            </button>

            <div className="nav-dd__panel" role="menu" aria-hidden={openMenu !== "services"}>
              <div className="mega">
                <div className="megaLeft">
                  <div className="megaLeftTitle">Our Services</div>
                  <div className="megaLeftList">
                    {SERVICES.map((s) => {
                      const Icon = s.Icon;
                      const active = s.id === svcActive;
                      return (
                        <NavLink
                          key={s.id}
                          to={withLang(s.to)}
                          className={({ isActive }) => cx("megaItem", (active || isActive) && "is-active")}
                          onMouseEnter={() => setSvcActive(s.id)}
                          onFocus={() => setSvcActive(s.id)}
                          onClick={(e) => {
                            // click navigates immediately
                            setOpenMenu(null);
                          }}
                        >
                          <span className="megaIcon"><Icon size={18} /></span>
                          <span className="megaText">
                            <div className="megaLabel">{s.label}</div>
                            <div className="megaDesc">{s.desc}</div>
                          </span>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>

                <div className="megaRight">
                  <div className="megaTop">
                    <div className="megaHeadline">{svcActiveItem.headline}</div>
                    <div className="megaBlurb">{svcActiveItem.blurb}</div>
                  </div>

                  <div className="megaCards">
                    {svcActiveItem.cards.map((c) => (
                      <NavLink key={c.title} to={withLang(c.to)} className="megaCard" onClick={() => setOpenMenu(null)}>
                        <div className="megaCardTitleRow">
                          <div className="megaCardTitle">{c.title}</div>
                          {c.tag ? <span className="megaTag">{c.tag}</span> : null}
                        </div>
                        <div className="megaCardDesc">{c.desc}</div>
                        <div className="megaArrow">Open →</div>
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Use Cases mega (integrated terminal strip) */}
          <div
            ref={ucRef}
            className={cx("nav-dd", openMenu === "usecases" && "is-open")}
            onMouseEnter={() => openDrop("usecases")}
            onMouseLeave={() => scheduleCloseDrop("usecases")}
          >
            <button
              type="button"
              className={cx("nav-dd__btn", (isUseCasesActive || openMenu === "usecases") && "is-active")}
              aria-haspopup="menu"
              aria-expanded={openMenu === "usecases"}
              onClick={() => setOpenMenu((v) => (v === "usecases" ? null : "usecases"))}
              onFocus={() => openDrop("usecases")}
            >
              {t?.("nav.useCases") ?? "Ssenarilər"}
              <span className="nav-dd__chev"><ChevronDown size={16} /></span>
            </button>

            <div className="nav-dd__panel" role="menu" aria-hidden={openMenu !== "usecases"}>
              <div className="mega">
                <div className="megaLeft">
                  <div className="megaLeftTitle">Use Cases</div>
                  <div className="megaLeftList">
                    {USECASES.map((u) => {
                      const Icon = u.Icon;
                      const active = u.id === ucActive;
                      return (
                        <NavLink
                          key={u.id}
                          to={withLang(u.to)}
                          className={({ isActive }) => cx("megaItem", (active || isActive) && "is-active")}
                          onMouseEnter={() => setUcActive(u.id)}
                          onFocus={() => setUcActive(u.id)}
                          onClick={() => setOpenMenu(null)}
                        >
                          <span className="megaIcon"><Icon size={18} /></span>
                          <span className="megaText">
                            <div className="megaLabel">{u.label}</div>
                            <div className="megaDesc">{u.desc}</div>
                          </span>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>

                <div className="megaRight">
                  <div className="megaTop">
                    <div className="megaHeadline">{ucActiveItem.headline}</div>
                    <div className="megaBlurb">{ucActiveItem.blurb}</div>
                  </div>

                  {/* terminal strip – part of the same panel, not a separate thick block */}
                  <div className="megaTerminal" aria-hidden={false}>
                    <div className="megaTerminalHead">
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                        <span className="megaPulse" />
                        <span>{ucActiveItem.label}</span>
                      </span>
                      <span style={{ opacity: 0.65 }}>LIVE</span>
                    </div>
                    <div className="megaMarquee">
                      <div className="megaMarqueeInner">{terminalLine}</div>
                    </div>
                  </div>

                  <div className="megaCards">
                    {ucActiveItem.cards.map((c) => (
                      <NavLink key={c.title} to={withLang(c.to)} className="megaCard" onClick={() => setOpenMenu(null)}>
                        <div className="megaCardTitleRow">
                          <div className="megaCardTitle">{c.title}</div>
                          {c.tag ? <span className="megaTag">{c.tag}</span> : null}
                        </div>
                        <div className="megaCardDesc">{c.desc}</div>
                        <div className="megaArrow">Open →</div>
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Resources mega (right aligned like screenshot) */}
          <div
            ref={resRef}
            className={cx("nav-dd", "nav-dd--right", openMenu === "resources" && "is-open")}
            onMouseEnter={() => openDrop("resources")}
            onMouseLeave={() => scheduleCloseDrop("resources")}
          >
            <button
              type="button"
              className={cx("nav-dd__btn", (isResActive || openMenu === "resources") && "is-active")}
              aria-haspopup="menu"
              aria-expanded={openMenu === "resources"}
              onClick={() => setOpenMenu((v) => (v === "resources" ? null : "resources"))}
              onFocus={() => openDrop("resources")}
            >
              Resources
              <span className="nav-dd__chev"><ChevronDown size={16} /></span>
            </button>

            <div className="nav-dd__panel" role="menu" aria-hidden={openMenu !== "resources"}>
              <div className="mega" style={{ gridTemplateColumns: "330px 1fr" }}>
                <div className="megaLeft">
                  <div className="megaLeftTitle">Resources</div>
                  <div className="megaLeftList">
                    {RES_LINKS.map((r) => (
                      <NavLink key={r.to} to={withLang(r.to)} className={({ isActive }) => cx("megaItem", isActive && "is-active")} onClick={() => setOpenMenu(null)}>
                        <span className="megaIcon"><BookOpen size={18} /></span>
                        <span className="megaText">
                          <div className="megaLabel">{r.label}</div>
                          <div className="megaDesc">Help, docs, policies & guides</div>
                        </span>
                      </NavLink>
                    ))}
                  </div>
                </div>

                <div className="megaRight">
                  <div className="megaTop">
                    <div className="megaHeadline">Knowledge Base</div>
                    <div className="megaBlurb">Everything your team needs: docs, FAQs, guides, and policies.</div>
                  </div>

                  <div className="megaCards">
                    <NavLink to={withLang("/resources/docs")} className="megaCard" onClick={() => setOpenMenu(null)}>
                      <div className="megaCardTitleRow">
                        <div className="megaCardTitle">Docs</div>
                        <span className="megaTag">Start</span>
                      </div>
                      <div className="megaCardDesc">Setup, integration, and best practices.</div>
                      <div className="megaArrow">Open →</div>
                    </NavLink>

                    <NavLink to={withLang("/privacy")} className="megaCard" onClick={() => setOpenMenu(null)}>
                      <div className="megaCardTitleRow">
                        <div className="megaCardTitle">Privacy Policy</div>
                        <span className="megaTag">Legal</span>
                      </div>
                      <div className="megaCardDesc">Policies and data protection.</div>
                      <div className="megaArrow">Open →</div>
                    </NavLink>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <NavLink to={withLang("/blog")} className={navItem}>
            {t?.("nav.blog") ?? "Blog"}
          </NavLink>
        </nav>

        <div className="header-right">
          <LangMenu lang={lang} onPick={switchLang} />

          <Link to={withLang("/contact")} className="nav-cta">
            {t?.("nav.contact") ?? "Əlaqə"}
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
