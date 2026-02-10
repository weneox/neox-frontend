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
type MenuKey = "about" | "services" | "usecases" | "resources" | null;

type ServiceDef = { id: string; label: string; to: string; hint: string };
type ScenarioPill = { id: string; label: string; to: string };

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

/* ===== Desktop language dropdown (hover opens) ===== */
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
    closeT.current = window.setTimeout(() => setOpen(false), 120) as any;
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

      <div className="langMenu__panel" role="menu" aria-hidden={!open} onMouseEnter={openDrop} onMouseLeave={scheduleClose}>
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

export default function Header({ introReady }: { introReady: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [hdrp, setHdrp] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const [open, setOpen] = useState(false);
  const [softOpen, setSoftOpen] = useState(false);

  const prefersReduced = usePrefersReducedMotion();

  // ✅ single-open dropdown
  const [openMenu, setOpenMenu] = useState<MenuKey>(null);
  const closeT = useRef<number | null>(null);

  const aboutRef = useRef<HTMLDivElement | null>(null);
  const svcRef = useRef<HTMLDivElement | null>(null);
  const ucRef = useRef<HTMLDivElement | null>(null);
  const resRef = useRef<HTMLDivElement | null>(null);

  // UseCases hover (service → hologram scenarios)
  const [ucActiveSvc, setUcActiveSvc] = useState<string>("business-workflows");

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

  // ✅ routes-a uyğun 6 services
  const SERVICES: ServiceDef[] = useMemo(
    () => [
      { id: "chatbot-24-7", label: "Chatbot 24/7", to: "/services/chatbot-24-7", hint: "Always-on chat that converts leads and answers fast." },
      { id: "business-workflows", label: "Business Workflows", to: "/services/business-workflows", hint: "Trigger → route → act. End-to-end automation flows." },
      { id: "websites", label: "Websites", to: "/services/websites", hint: "Premium, fast websites with modern UX." },
      { id: "mobile-apps", label: "Mobile Apps", to: "/services/mobile-apps", hint: "iOS/Android apps with clean UI and scalable backend." },
      { id: "smm-automation", label: "SMM Automation", to: "/services/smm-automation", hint: "Content, scheduling, funnels and automation." },
      { id: "technical-support", label: "Technical Support", to: "/services/technical-support", hint: "Monitoring, fixes, deployments, and ongoing support." },
    ],
    []
  );

  const ABOUT_LINKS: NavDef[] = useMemo(
    () => [{ to: "/about", label: "About NEOX", hint: "Company, mission, technology" }],
    []
  );

  const RES_LINKS: NavDef[] = useMemo(
    () => [
      { to: "/resources/docs", label: "Docs", hint: "Documentation & references" },
      { to: "/resources/faq", label: "FAQ", hint: "Most asked questions" },
      { to: "/resources/guides", label: "Guides", hint: "Step-by-step tutorials" },
      { to: "/privacy", label: "Privacy Policy", hint: "Policy & data handling" },
    ],
    []
  );

  // ✅ UseCases = services list + hover hologram scenarios (NO big blocks)
  const USECASE_SCENARIOS_BY_SERVICE: Record<string, ScenarioPill[]> = useMemo(
    () => ({
      "business-workflows": [
        { id: "finance", label: "Finance", to: "/use-cases/finance" },
        { id: "healthcare", label: "Healthcare", to: "/use-cases/healthcare" },
        { id: "retail", label: "Retail", to: "/use-cases/retail" },
        { id: "logistics", label: "Logistics", to: "/use-cases/logistics" },
        { id: "hotels", label: "Hotels", to: "/use-cases/hotels" },
      ],
      "chatbot-24-7": [
        { id: "lead-capture", label: "Lead Capture", to: "/use-cases/retail" },
        { id: "instant-answers", label: "Instant Answers", to: "/use-cases/healthcare" },
        { id: "handoff", label: "Smart Handoff", to: "/use-cases/logistics" },
        { id: "demo-booking", label: "Demo Booking", to: "/use-cases/finance" },
      ],
      websites: [
        { id: "landing", label: "Landing + CTA", to: "/use-cases/finance" },
        { id: "multi-lang", label: "Multi-Language", to: "/use-cases/hotels" },
        { id: "speed", label: "Speed Upgrade", to: "/use-cases/retail" },
      ],
      "mobile-apps": [
        { id: "onboarding", label: "Onboarding", to: "/use-cases/retail" },
        { id: "push", label: "Smart Notifications", to: "/use-cases/logistics" },
        { id: "secure", label: "Secure Flows", to: "/use-cases/healthcare" },
      ],
      "smm-automation": [
        { id: "content", label: "Content Pipeline", to: "/use-cases/retail" },
        { id: "auto-dm", label: "Auto DM Flows", to: "/use-cases/finance" },
        { id: "campaigns", label: "Campaign Ops", to: "/use-cases/hotels" },
        { id: "analytics", label: "Analytics Loop", to: "/use-cases/finance" },
      ],
      "technical-support": [
        { id: "monitoring", label: "Monitoring", to: "/use-cases/logistics" },
        { id: "deploy", label: "Deploy & Fix", to: "/use-cases/finance" },
        { id: "incidents", label: "Incident Response", to: "/use-cases/logistics" },
      ],
    }),
    []
  );

  const activeUsecasePills =
    USECASE_SCENARIOS_BY_SERVICE[ucActiveSvc] ?? USECASE_SCENARIOS_BY_SERVICE["business-workflows"];

  const isUseCasesActive = useMemo(() => location.pathname.toLowerCase().includes("/use-cases"), [location.pathname]);
  const isServicesActive = useMemo(() => location.pathname.toLowerCase().includes("/services"), [location.pathname]);
  const isAboutActive = useMemo(() => location.pathname.toLowerCase().includes("/about"), [location.pathname]);
  const isResActive = useMemo(() => {
    const p = location.pathname.toLowerCase();
    return p.includes("/resources") || p.includes("/privacy");
  }, [location.pathname]);

  const navItem = ({ isActive }: { isActive: boolean }) => cx("nav-link", isActive && "is-active");

  // header height css var
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

  // click outside desktop dropdowns
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

      const ref = map[openMenu];
      const el = ref?.current;
      if (!el) return;
      if (!el.contains(target)) setOpenMenu(null);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [openMenu]);

  // hover open/close with tiny delay (close others)
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
    }, 120) as any;
  };

  // mobile blur driver
  const mobileP = clamp01(hdrp);
  const base = 0.03;
  const mobileBgAlpha = open ? 0.92 : base + 0.70 * mobileP;
  const mobileBlurPx = open ? 18 : 3 + 15 * mobileP;
  const mobileSat = open ? 1.35 : 1 + 0.30 * mobileP;

  const headerInlineStyle: React.CSSProperties | undefined = isMobile
    ? {
        backgroundColor: `rgba(10, 12, 18, ${mobileBgAlpha.toFixed(3)})`,
        WebkitBackdropFilter: `blur(${mobileBlurPx.toFixed(1)}px) saturate(${mobileSat.toFixed(2)})`,
        backdropFilter: `blur(${mobileBlurPx.toFixed(1)}px) saturate(${mobileSat.toFixed(2)})`,
        borderBottom: `1px solid rgba(255,255,255,${(open ? 0.10 : 0.06 * mobileP).toFixed(3)})`,
      }
    : undefined;

  const logoH = isMobile ? 16 : 28;
  const logoMaxW = isMobile ? "108px" : "156px";

  const MobileOverlay = (
    <div className={cx("nav-overlay", open && "is-mounted", softOpen && "is-open")} aria-hidden={!open}>
      <button className="nav-overlay__backdrop" type="button" aria-label="Bağla" onClick={closeMobile} />

      <div id={panelId} className={cx("nav-sheet", softOpen && "is-open")} role="dialog" aria-modal="true" aria-label="Menyu">
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

        <div className="nav-sheet__scroll">
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
                  <span className="nav-acc__text">All Use Cases</span>
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
              </div>
            </div>

            {/* Blog */}
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
              <span className="nav-sheetLink__chev" aria-hidden="true">
                →
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
              <span className="nav-sheetLink__chev" aria-hidden="true">
                →
              </span>
            </NavLink>
          </div>
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
    >
      <style>{`
        :root{ --hdrh: 72px; --hdrp: 0; }

        /* ===== header base ===== */
        .site-header{
          --c: rgba(47,184,255,1);
          --c2: rgba(63,227,196,1);
          position: sticky; top: 0; z-index: 1100; width: 100%;
          transform: translateZ(0);
          will-change: backdrop-filter, background-color, border-color;
          background: rgba(10,12,18,0.02);
          border-bottom: 1px solid rgba(255,255,255,0.04);
          transition: background-color .18s ease, border-color .18s ease;
        }
        .site-header.is-scrolled{
          background: rgba(10, 12, 18, calc(0.06 + 0.26 * var(--hdrp)));
          border-bottom-color: rgba(255,255,255, calc(0.06 + 0.06 * var(--hdrp)));
          -webkit-backdrop-filter: blur(calc(8px + 10px * var(--hdrp))) saturate(1.18);
          backdrop-filter: blur(calc(8px + 10px * var(--hdrp))) saturate(1.18);
        }
        .site-header.is-open{
          background: rgba(10, 12, 18, 0.92);
          border-bottom-color: rgba(255,255,255,0.10);
          -webkit-backdrop-filter: blur(18px) saturate(1.25);
          backdrop-filter: blur(18px) saturate(1.25);
        }

        .container{ max-width: 1180px; margin: 0 auto; padding: 0 18px; }
        .header-inner{ height: var(--hdrh); display: grid; align-items: center; }
        .header-grid{ grid-template-columns: auto 1fr auto; gap: 14px; }
        .header-left{ display:flex; align-items:center; }
        .header-mid{ display:flex; align-items:center; justify-content:center; gap: 10px; }
        .header-right{ display:flex; align-items:center; justify-content:flex-end; gap: 12px; }

        .brand-link{ display: inline-flex; align-items: center; gap: 10px; text-decoration: none; }
        .headerBrand{ position: relative; display:flex; align-items:center; }
        .headerBrand__aura{
          position:absolute; inset:-12px -18px;
          background:
            radial-gradient(140px 52px at 22% 60%, rgba(47,184,255,.16), transparent 60%),
            radial-gradient(120px 48px at 70% 40%, rgba(63,227,196,.10), transparent 62%);
          filter: blur(12px); opacity: .72; pointer-events:none;
        }

        /* ===== desktop nav buttons ===== */
        .nav-link{
          position: relative;
          display: inline-flex; align-items: center; justify-content: center;
          height: 40px; padding: 0 12px; border-radius: 999px;
          text-decoration: none; color: rgba(255,255,255,.74);
          font-weight: 750; font-size: 13px; letter-spacing: .02em;
          transition: color .16s ease, background-color .16s ease, transform .16s ease;
        }
        .nav-link:hover{ color: rgba(255,255,255,.92); background: rgba(255,255,255,.06); }
        .nav-link.is-active{ color: rgba(255,255,255,.96); background: rgba(255,255,255,.09); }

        .nav-dd{ position: relative; display:inline-flex; }
        .nav-dd__btn{
          position: relative; display:inline-flex; align-items:center; gap: 8px;
          height: 40px; padding: 0 12px; border-radius: 999px;
          color: rgba(255,255,255,.74); background: transparent; border: 0;
          cursor: pointer;
          font: inherit;
          font-weight: 780;
          letter-spacing: .02em;
          transition: color .16s ease, background-color .16s ease;
        }
        .nav-dd__btn:hover{ color: rgba(255,255,255,.92); background: rgba(255,255,255,.06); }
        .nav-dd__btn.is-active{ color: rgba(255,255,255,.96); background: rgba(255,255,255,.09); }
        .nav-dd__chev{ opacity: .82; transition: transform .16s ease; }
        .nav-dd.is-open .nav-dd__chev{ transform: rotate(180deg); }

        /* ===== dropdown panel: SMALLER + not tall ===== */
        .nav-dd__panel{
          position:absolute;
          top: calc(100% + 10px);
          left: 50%;
          transform: translateX(-50%);
          width: 500px;             /* ✅ smaller (was 560) */
          max-height: 340px;         /* ✅ limit height */
          overflow: auto;            /* ✅ scroll if ever needed */
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,.10);
          background:
            radial-gradient(120% 80% at 18% 8%, rgba(47,184,255,.14), transparent 58%),
            radial-gradient(120% 80% at 82% 10%, rgba(63,227,196,.10), transparent 60%),
            rgba(10,12,18,.86);
          -webkit-backdrop-filter: blur(18px) saturate(1.22);
          backdrop-filter: blur(18px) saturate(1.22);
          box-shadow: 0 28px 100px rgba(0,0,0,.70);
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

        .dropShell{ padding: 10px; }
        .dropShell__bar{
          display:flex; align-items:center; justify-content: space-between;
          padding: 8px 10px 6px;  /* tighter */
        }
        .dropShell__title{
          font-size: 11px;
          letter-spacing: .18em;
          color: rgba(255,255,255,.66);
          font-weight: 900;
        }
        .dropShell__hint{
          font-size: 11px;
          color: rgba(255,255,255,.50);
          font-weight: 700;
          letter-spacing: .02em;
        }
        .dropShell__body{
          padding: 2px 4px 6px;
          display: grid;
          gap: 8px;
        }

        /* ===== ✅ item: normal size title, description CLOSED by default, opens under itself on hover ===== */
        .dropItem{
          position: relative;
          display:flex; align-items:flex-start; justify-content: space-between; gap: 12px;
          padding: 10px 12px;                 /* tighter */
          border-radius: 14px;
          text-decoration:none;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.88);
          transition: background-color .16s ease, border-color .16s ease, transform .16s ease;
        }
        .dropItem:hover{
          background: rgba(255,255,255,.06);
          border-color: rgba(255,255,255,.10);
          transform: translateY(-1px);
        }
        .dropItem.is-active{
          background: rgba(47,184,255,.10);
          border-color: rgba(47,184,255,.22);
        }

        .dropItem__left{ display:flex; align-items:flex-start; gap: 10px; min-width: 0; }
        .dropDot{
          width: 8px; height: 8px; border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), rgba(47,184,255,.82));
          box-shadow: 0 0 0 4px rgba(47,184,255,.10);
          margin-top: 6px;
          flex: 0 0 auto;
        }
        .dropItem__labelWrap{ display:flex; flex-direction:column; min-width: 0; }
        .dropItem__label{
          font-weight: 860;
          font-size: 13px;     /* ✅ not huge */
          line-height: 1.12;
          letter-spacing: .01em;
        }

        /* ✅ hint collapsed by default (so panel is not long) */
        .dropItem__hint{
          margin-top: 6px;
          font-size: 12px;
          line-height: 1.25;
          color: rgba(255,255,255,.58);
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          transform: translateY(-4px);
          transition: max-height .18s ease, opacity .18s ease, transform .18s ease;
          white-space: normal; /* allow 2 lines if needed */
        }
        .dropItem:hover .dropItem__hint,
        .dropItem:focus-within .dropItem__hint{
          max-height: 44px; /* ✅ opens under itself */
          opacity: 1;
          transform: translateY(0);
        }

        /* arrow: DOWN on hover */
        .dropItem__chev{
          opacity: .75;
          transform: rotate(-90deg);
          transition: transform .18s ease, opacity .18s ease;
          margin-top: 2px;
          flex: 0 0 auto;
        }
        .dropItem:hover .dropItem__chev{
          transform: rotate(0deg);
          opacity: .92;
        }

        /* ===== UseCases dropdown width a bit bigger but still compact ===== */
        .nav-dd--usecases .nav-dd__panel{ width: 680px; max-height: 360px; }

        .ucWrap{
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          padding: 6px 10px 12px;
        }
        .ucList{
          display:grid;
          gap: 8px;
          align-content: start;
        }

        .ucHolo{
          position: relative;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.08);
          background:
            radial-gradient(120% 90% at 25% 10%, rgba(47,184,255,.16), transparent 58%),
            radial-gradient(120% 90% at 80% 0%, rgba(63,227,196,.10), transparent 60%),
            rgba(255,255,255,.03);
          overflow: hidden;
          padding: 12px 12px 10px;
          min-height: 156px; /* slightly smaller */
          transform: translateZ(0);
        }
        .ucHoloTop{
          display:flex; align-items:center; justify-content: space-between;
          padding-bottom: 6px;
        }
        .ucHoloTitle{
          font-size: 11px;
          letter-spacing: .18em;
          font-weight: 900;
          color: rgba(255,255,255,.64);
        }
        .ucHoloSub{
          font-size: 11px;
          font-weight: 700;
          color: rgba(255,255,255,.48);
          letter-spacing: .02em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 220px;
        }

        .ucStream{
          position: relative;
          margin-top: 8px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(0,0,0,.20);
          overflow: hidden;
          padding: 10px 8px;
        }
        .ucScan{
          position:absolute;
          inset:-40px -20px;
          background:
            linear-gradient(90deg, transparent 0%, rgba(47,184,255,.12) 20%, transparent 40%, transparent 100%);
          transform: translateX(-30%);
          opacity: .75;
          filter: blur(1px);
          pointer-events:none;
          animation: ucScan 8.2s linear infinite;
        }
        @keyframes ucScan{ 0%{ transform: translateX(-45%); } 100%{ transform: translateX(45%); } }

        .ucMarquee{
          display:flex; gap: 10px;
          width: max-content; align-items: center;
          animation: ucMarq 14s linear infinite;
          will-change: transform;
        }
        .ucMarquee.is-reduced{ animation: none; }
        @keyframes ucMarq{ 0%{ transform: translateX(12%); } 100%{ transform: translateX(-52%); } }

        .ucPill{
          display:inline-flex; align-items:center; gap: 8px;
          text-decoration:none;
          padding: 9px 11px;   /* slightly smaller */
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background:
            radial-gradient(120% 120% at 20% 20%, rgba(47,184,255,.16), transparent 60%),
            rgba(255,255,255,.05);
          color: rgba(255,255,255,.88);
          font-weight: 830;
          font-size: 12px;
          letter-spacing: .01em;
          transition: transform .16s ease, border-color .16s ease, background-color .16s ease;
          white-space: nowrap;
        }
        .ucPill:hover{ transform: translateY(-1px); border-color: rgba(47,184,255,.26); background: rgba(255,255,255,.06); }
        .ucPillDot{
          width: 7px; height: 7px; border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), rgba(63,227,196,.85));
          box-shadow: 0 0 0 4px rgba(63,227,196,.10);
          flex: 0 0 auto;
        }

        .ucFadeL, .ucFadeR{ position:absolute; top:0; bottom:0; width: 42px; pointer-events:none; }
        .ucFadeL{ left:0; background: linear-gradient(90deg, rgba(10,12,18,.88), transparent); }
        .ucFadeR{ right:0; background: linear-gradient(270deg, rgba(10,12,18,.88), transparent); }

        .ucFoot{
          margin-top: 8px;
          display:flex; align-items:center; justify-content: space-between; gap: 10px;
          color: rgba(255,255,255,.58);
          font-size: 12px;
          font-weight: 700;
        }
        .ucOpenAll{
          text-decoration:none;
          color: rgba(255,255,255,.88);
          font-weight: 860;
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          transition: transform .16s ease, background-color .16s ease, border-color .16s ease;
          white-space: nowrap;
        }
        .ucOpenAll:hover{ transform: translateY(-1px); background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.14); }

        /* ===== CTA + toggle ===== */
        .nav-cta{
          display:inline-flex; align-items:center; justify-content:center;
          height: 38px; padding: 0 14px; border-radius: 999px; text-decoration:none;
          font-weight: 850; font-size: 13px; color: rgba(255,255,255,.92);
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
        .nav-toggle__bar{ width: 18px; height: 2px; border-radius: 999px; background: rgba(255,255,255,.90); opacity: .9; }

        /* ===== Lang ===== */
        .langMenu{ position: relative; }
        .langMenu__btn{
          display:inline-flex; align-items:center; gap: 8px;
          height: 38px; padding: 0 10px; border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.88);
          font-weight: 850; font-size: 12px;
          cursor: pointer;
          transition: background-color .16s ease, border-color .16s ease, transform .16s ease;
        }
        .langMenu__btn:hover{ transform: translateY(-1px); background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.14); }
        .langMenu__dot{
          width: 8px; height: 8px; border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.9), rgba(47,184,255,.90));
          box-shadow: 0 0 0 4px rgba(47,184,255,.10);
        }
        .langMenu__code{ letter-spacing: .08em; }
        .langMenu__chev{ opacity: .75; }

        .langMenu__panel{
          position:absolute; top: calc(100% + 10px); right: 0;
          width: 210px; border-radius: 16px; padding: 10px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(10,12,18,.92);
          -webkit-backdrop-filter: blur(18px) saturate(1.18);
          backdrop-filter: blur(18px) saturate(1.18);
          box-shadow: 0 24px 80px rgba(0,0,0,.65);
          opacity: 0; pointer-events: none;
          transform: translateY(-6px) scale(.985);
          transition: opacity .16s ease, transform .16s ease;
          z-index: 1500;
        }
        .langMenu.is-open .langMenu__panel{ opacity: 1; pointer-events: auto; transform: translateY(0) scale(1); }
        .langMenu__item{
          width: 100%;
          display:flex; align-items:center; justify-content: space-between; gap: 10px;
          border: 0;
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.06);
          color: rgba(255,255,255,.88);
          padding: 10px 10px;
          border-radius: 12px;
          cursor: pointer;
          transition: background-color .16s ease, border-color .16s ease, transform .16s ease;
        }
        .langMenu__item + .langMenu__item{ margin-top: 8px; }
        .langMenu__item:hover{ background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.10); transform: translateY(-1px); }
        .langMenu__item.is-active{ background: rgba(47,184,255,.12); border-color: rgba(47,184,255,.22); }
        .langMenu__itemCode{ font-weight: 900; letter-spacing: .10em; }
        .langMenu__itemName{ opacity: .86; font-weight: 750; }

        /* ===== Mobile overlay (unchanged) ===== */
        .nav-overlay{ position: fixed; inset: 0; z-index: 2000; opacity: 0; pointer-events: none; transition: opacity .16s ease; }
        .nav-overlay.is-mounted{ display:block; }
        .nav-overlay.is-open{ opacity: 1; pointer-events: auto; }
        .nav-overlay__backdrop{
          position:absolute; inset:0; border:0;
          background: rgba(0,0,0,.48);
          -webkit-backdrop-filter: blur(8px);
          backdrop-filter: blur(8px);
          cursor: pointer;
        }
        .nav-sheet{
          position:absolute; top: 10px; right: 10px; left: 10px;
          max-width: 560px; margin-left: auto;
          border-radius: 22px; border: 1px solid rgba(255,255,255,.10);
          overflow: hidden;
          transform: translateY(-10px) scale(.985);
          opacity: 0;
          transition: transform .16s ease, opacity .16s ease;
          max-height: calc(100dvh - 20px);
          display:flex;
          flex-direction: column;
        }
        .nav-sheet.is-open{ transform: translateY(0) scale(1); opacity: 1; }

        .nav-sheet__bg{
          position:absolute; inset:0;
          background:
            radial-gradient(120% 90% at 18% 0%, rgba(47,184,255,.16), transparent 58%),
            radial-gradient(120% 90% at 82% 0%, rgba(63,227,196,.12), transparent 60%),
            rgba(10,12,18,.94);
          -webkit-backdrop-filter: blur(18px) saturate(1.20);
          backdrop-filter: blur(18px) saturate(1.20);
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
        .nav-sheet__title{ font-weight: 950; letter-spacing: .18em; font-size: 11px; color: rgba(255,255,255,.72); }
        .nav-sheet__close{
          width: 40px; height: 38px; border-radius: 12px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.05);
          color: rgba(255,255,255,.90);
          display:flex; align-items:center; justify-content:center;
          cursor: pointer;
          transition: transform .16s ease, background-color .16s ease;
        }
        .nav-sheet__close:hover{ transform: translateY(-1px); background: rgba(255,255,255,.07); }
        .nav-sheet__scroll{ position: relative; z-index: 2; overflow: auto; -webkit-overflow-scrolling: touch; padding: 0 0 12px; }
        .nav-sheet__list{ padding: 8px 14px 0; display:grid; gap: 10px; }

        /* ===== responsive ===== */
        @media (max-width: 920px){
          .header-mid{ display:none; }
          .nav-toggle{ display:inline-flex; }
          .nav-cta--desktopOnly{ display:none; }
          .nav-dd__panel{ display:none; }
        }
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
                  filter: "drop-shadow(0 6px 16px rgba(0,0,0,.42)) drop-shadow(0 0 12px rgba(47,184,255,.08))",
                  transform: "translateZ(0)",
                }}
              />
            </span>
          </Link>
        </div>

        {/* ===== Desktop Nav ===== */}
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
              <div className="dropShell">
                <div className="dropShell__bar">
                  <div className="dropShell__title">ABOUT</div>
                  <div className="dropShell__hint">hover → expand</div>
                </div>
                <div className="dropShell__body">
                  {ABOUT_LINKS.map((s) => (
                    <NavLink
                      key={s.to}
                      to={withLang(s.to)}
                      className={({ isActive }) => cx("dropItem", isActive && "is-active")}
                      role="menuitem"
                      onClick={() => setOpenMenu(null)}
                    >
                      <span className="dropItem__left">
                        <span className="dropDot" aria-hidden="true" />
                        <span className="dropItem__labelWrap">
                          <span className="dropItem__label">{s.label}</span>
                          {s.hint ? <span className="dropItem__hint">{s.hint}</span> : null}
                        </span>
                      </span>
                      <span className="dropItem__chev" aria-hidden="true">
                        <ChevronDown size={16} />
                      </span>
                    </NavLink>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SERVICES */}
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
              <span className="nav-label nav-label--full">{t("nav.services")}</span>
              <span className="nav-dd__chev" aria-hidden="true">
                <ChevronDown size={16} />
              </span>
            </button>

            <div className="nav-dd__panel" role="menu" aria-hidden={!svcOpen}>
              <div className="dropShell">
                <div className="dropShell__bar">
                  <div className="dropShell__title">SERVICES</div>
                  <div className="dropShell__hint">hover → expand</div>
                </div>
                <div className="dropShell__body">
                  {SERVICES.map((s) => (
                    <NavLink
                      key={s.id}
                      to={withLang(s.to)}
                      className={({ isActive }) => cx("dropItem", isActive && "is-active")}
                      role="menuitem"
                      onClick={() => setOpenMenu(null)}
                    >
                      <span className="dropItem__left">
                        <span className="dropDot" aria-hidden="true" />
                        <span className="dropItem__labelWrap">
                          <span className="dropItem__label">{s.label}</span>
                          <span className="dropItem__hint">{s.hint}</span>
                        </span>
                      </span>
                      <span className="dropItem__chev" aria-hidden="true">
                        <ChevronDown size={16} />
                      </span>
                    </NavLink>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* USE CASES */}
          <div
            ref={ucRef}
            className={cx("nav-dd", "nav-dd--usecases", ucOpen && "is-open")}
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
              <div className="dropShell">
                <div className="dropShell__bar">
                  <div className="dropShell__title">USE CASES</div>
                  <div className="dropShell__hint">hover service → hologram scenarios</div>
                </div>

                <div className="ucWrap">
                  <div className="ucList">
                    {SERVICES.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className={cx("dropItem", s.id === ucActiveSvc && "is-active")}
                        onMouseEnter={() => setUcActiveSvc(s.id)}
                        onFocus={() => setUcActiveSvc(s.id)}
                        onClick={() => {
                          setOpenMenu(null);
                          navigate(withLang(s.to));
                          window.scrollTo({ top: 0, left: 0, behavior: "auto" });
                        }}
                        style={{ textAlign: "left", cursor: "pointer" }}
                      >
                        <span className="dropItem__left">
                          <span className="dropDot" aria-hidden="true" />
                          <span className="dropItem__labelWrap">
                            <span className="dropItem__label">{s.label}</span>
                            <span className="dropItem__hint">{s.hint}</span>
                          </span>
                        </span>
                        <span className="dropItem__chev" aria-hidden="true">
                          <ChevronDown size={16} />
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="ucHolo" aria-label="Scenarios">
                    <div className="ucHoloTop">
                      <div className="ucHoloTitle">SCENARIOS</div>
                      <div className="ucHoloSub">{SERVICES.find((s) => s.id === ucActiveSvc)?.label ?? "Business Workflows"}</div>
                    </div>

                    <div className="ucStream">
                      <div className="ucScan" aria-hidden="true" />
                      <div className="ucFadeL" aria-hidden="true" />
                      <div className="ucFadeR" aria-hidden="true" />

                      <div className={cx("ucMarquee", prefersReduced && "is-reduced")}>
                        {activeUsecasePills.concat(activeUsecasePills).map((p, idx) => (
                          <NavLink
                            key={`${p.id}-${idx}`}
                            to={withLang(p.to)}
                            className="ucPill"
                            onClick={() => setOpenMenu(null)}
                          >
                            <span className="ucPillDot" aria-hidden="true" />
                            <span>{p.label}</span>
                          </NavLink>
                        ))}
                      </div>
                    </div>

                    <div className="ucFoot">
                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        Click a scenario → open page
                      </span>
                      <NavLink to={withLang("/use-cases")} className="ucOpenAll" onClick={() => setOpenMenu(null)}>
                        Open {t("nav.useCases")}
                      </NavLink>
                    </div>
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
              <div className="dropShell">
                <div className="dropShell__bar">
                  <div className="dropShell__title">RESOURCES</div>
                  <div className="dropShell__hint">hover → expand</div>
                </div>
                <div className="dropShell__body">
                  {RES_LINKS.map((s) => (
                    <NavLink
                      key={s.to}
                      to={withLang(s.to)}
                      className={({ isActive }) => cx("dropItem", isActive && "is-active")}
                      role="menuitem"
                      onClick={() => setOpenMenu(null)}
                    >
                      <span className="dropItem__left">
                        <span className="dropDot" aria-hidden="true" />
                        <span className="dropItem__labelWrap">
                          <span className="dropItem__label">{s.label}</span>
                          {s.hint ? <span className="dropItem__hint">{s.hint}</span> : null}
                        </span>
                      </span>
                      <span className="dropItem__chev" aria-hidden="true">
                        <ChevronDown size={16} />
                      </span>
                    </NavLink>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* BLOG */}
          <NavLink to={withLang("/blog")} className={navItem}>
            <span className="nav-label nav-label--full">{t("nav.blog")}</span>
          </NavLink>
        </nav>

        {/* ===== Right ===== */}
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
