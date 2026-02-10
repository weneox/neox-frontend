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
type ServiceDef = { id: string; label: string; to: string };
type UseCaseDef = {
  id: string;
  label: string;
  to: string;
  // “hologram stream” — kliklənən axan linklər
  stream: Array<{ id: string; label: string; to: string }>;
};

type MenuKey = "about" | "services" | "usecases" | "resources" | null;

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

/* ===== Desktop language dropdown (single button) ===== */
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
  const aboutRef = useRef<HTMLDivElement | null>(null);
  const svcRef = useRef<HTMLDivElement | null>(null);
  const ucRef = useRef<HTMLDivElement | null>(null);
  const resRef = useRef<HTMLDivElement | null>(null);

  // usecases hover active item (for hologram stream)
  const [ucActive, setUcActive] = useState<string>("finance");

  // mobile overlay
  const [open, setOpen] = useState(false);
  const [softOpen, setSoftOpen] = useState(false);

  const [mobileAboutOpen, setMobileAboutOpen] = useState(false);
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

  // Routes lists
  const SERVICES: ServiceDef[] = useMemo(
    () => [
      { id: "chatbot-24-7", label: "Chatbot 24/7", to: "/services/chatbot-24-7" },
      { id: "business-workflows", label: "Business Workflows", to: "/services/business-workflows" },
      { id: "websites", label: "Websites", to: "/services/websites" },
      { id: "mobile-apps", label: "Mobile Apps", to: "/services/mobile-apps" },
      { id: "smm-automation", label: "SMM Automation", to: "/services/smm-automation" },
      { id: "technical-support", label: "Technical Support", to: "/services/technical-support" },
    ],
    []
  );

  const ABOUT_LINKS: NavDef[] = useMemo(() => [{ to: "/about", label: "About NEOX" }], []);

  const RES_LINKS: NavDef[] = useMemo(
    () => [
      { to: "/resources/docs", label: "Docs" },
      { to: "/resources/faq", label: "FAQ" },
      { to: "/resources/guides", label: "Guides" },
      { to: "/privacy", label: "Privacy Policy" },
    ],
    []
  );

  // ✅ Use Cases — sənin 5 əsas səhifən + hər biri üçün “hologram stream”
  // Business Workflows-a aid 5 əsas “scenario” linkləri: finance/healthcare/retail/logistics/hotels.
  // Digərlərinə də premium uyğun əlavə etdik.
  const USECASES: UseCaseDef[] = useMemo(
    () => [
      {
        id: "finance",
        label: "Finance",
        to: "/use-cases/finance",
        stream: [
          { id: "lead", label: "Lead Capture", to: "/use-cases/finance" },
          { id: "score", label: "KYC-safe Routing", to: "/use-cases/finance" },
          { id: "demo", label: "Demo Funnel", to: "/use-cases/finance" },
          { id: "handoff", label: "Operator Handoff", to: "/use-cases/finance" },
        ],
      },
      {
        id: "healthcare",
        label: "Healthcare",
        to: "/use-cases/healthcare",
        stream: [
          { id: "triage", label: "Smart Triage", to: "/use-cases/healthcare" },
          { id: "booking", label: "Auto Booking", to: "/use-cases/healthcare" },
          { id: "remind", label: "No-Show Reminders", to: "/use-cases/healthcare" },
          { id: "secure", label: "Privacy-first Flow", to: "/use-cases/healthcare" },
        ],
      },
      {
        id: "retail",
        label: "Retail",
        to: "/use-cases/retail",
        stream: [
          { id: "upsell", label: "Upsell Assist", to: "/use-cases/retail" },
          { id: "bundle", label: "Bundles", to: "/use-cases/retail" },
          { id: "support", label: "Returns & Support", to: "/use-cases/retail" },
          { id: "track", label: "Order Tracking", to: "/use-cases/retail" },
        ],
      },
      {
        id: "logistics",
        label: "Logistics",
        to: "/use-cases/logistics",
        stream: [
          { id: "eta", label: "ETA Updates", to: "/use-cases/logistics" },
          { id: "delay", label: "Delay Escalation", to: "/use-cases/logistics" },
          { id: "ticket", label: "Ticket Automation", to: "/use-cases/logistics" },
          { id: "notify", label: "Auto Notifications", to: "/use-cases/logistics" },
        ],
      },
      {
        id: "hotels",
        label: "Hotels & Resorts",
        to: "/use-cases/hotels",
        stream: [
          { id: "booking", label: "Reservations", to: "/use-cases/hotels" },
          { id: "concierge", label: "Concierge", to: "/use-cases/hotels" },
          { id: "upgrade", label: "Upgrades", to: "/use-cases/hotels" },
          { id: "handoff", label: "VIP Handoff", to: "/use-cases/hotels" },
        ],
      },
    ],
    []
  );

  const isUseCasesActive = useMemo(
    () => location.pathname.toLowerCase().includes("/use-cases"),
    [location.pathname]
  );
  const isServicesActive = useMemo(
    () => location.pathname.toLowerCase().includes("/services"),
    [location.pathname]
  );
  const isAboutActive = useMemo(() => location.pathname.toLowerCase().includes("/about"), [location.pathname]);
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
    setMobileAboutOpen(false);
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
        about: aboutRef,
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
    }, 110) as any;
  };

  const closeMobile = useCallback(() => {
    setSoftOpen(false);
    window.setTimeout(() => setOpen(false), 140);
  }, []);

  const navItem = ({ isActive }: { isActive: boolean }) => cx("nav-link", isActive && "is-active");

  const aboutOpen = openMenu === "about";
  const svcOpen = openMenu === "services";
  const ucOpen = openMenu === "usecases";
  const resOpen = openMenu === "resources";

  const activeUC = useMemo(() => USECASES.find((u) => u.id === ucActive) ?? USECASES[0], [USECASES, ucActive]);

  // mobile styles
  const mobileP = clamp01(hdrp);
  const mobileBgAlpha = open ? 0.90 : 0.06 + 0.70 * mobileP;
  const mobileBlurPx = open ? 18 : 4 + 14 * mobileP;
  const mobileSat = open ? 1.3 : 1 + 0.25 * mobileP;

  const headerInlineStyle: React.CSSProperties | undefined = isMobile
    ? {
        backgroundColor: `rgba(10, 12, 18, ${mobileBgAlpha.toFixed(3)})`,
        WebkitBackdropFilter: `blur(${mobileBlurPx.toFixed(1)}px) saturate(${mobileSat.toFixed(2)})`,
        backdropFilter: `blur(${mobileBlurPx.toFixed(1)}px) saturate(${mobileSat.toFixed(2)})`,
        borderBottom: `1px solid rgba(255,255,255,${(open ? 0.10 : 0.06 * mobileP).toFixed(3)})`,
      }
    : undefined;

  const logoH = isMobile ? 18 : 28;
  const logoMaxW = isMobile ? "118px" : "156px";

  // Mobile Overlay
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
              {ABOUT_LINKS.map((s) => (
                <NavLink
                  key={s.to}
                  to={withLang(s.to)}
                  className={({ isActive }) => cx("nav-acc__item", isActive && "is-active")}
                  onClick={() => closeMobile()}
                >
                  <span className="nav-acc__dot" aria-hidden="true" />
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
                  <span className="nav-acc__dot" aria-hidden="true" />
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
                <span className="nav-acc__dot" aria-hidden="true" />
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
                  <span className="nav-acc__dot" aria-hidden="true" />
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
                  <span className="nav-acc__dot" aria-hidden="true" />
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
  );

  return (
    <header
      ref={headerRef}
      style={headerInlineStyle}
      className={cx("site-header", introReady && "site-header--in", scrolled && "is-scrolled", open && "is-open")}
      data-top={scrolled ? "0" : "1"}
    >
      <style>{`
        :root{ --hdrh: 72px; --hdrp: 0; }

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

        /* ===== Brand (mobile left small) ===== */
        .brand-link{ display:inline-flex; align-items:center; gap: 10px; text-decoration: none; min-width:0; }
        .headerBrand{ position: relative; display:flex; align-items:center; }
        .headerBrand__aura{
          position:absolute; inset:-10px -16px;
          background:
            radial-gradient(120px 44px at 22% 55%, rgba(47,184,255,.16), transparent 60%),
            radial-gradient(120px 44px at 78% 45%, rgba(63,227,196,.10), transparent 62%);
          filter: blur(10px); opacity: .75; pointer-events:none;
        }

        /* ===== Desktop top links ===== */
        .nav-link{
          position: relative;
          display: inline-flex; align-items: center; justify-content: center;
          gap: 8px; height: 40px; padding: 0 12px; border-radius: 999px;
          text-decoration: none; color: rgba(255,255,255,.74);
          font-weight: 760; font-size: 13px; letter-spacing: .02em;
          transition: color .16s ease, background-color .16s ease, transform .16s ease;
        }
        .nav-link:hover{ color: rgba(255,255,255,.92); background: rgba(255,255,255,.06); }
        .nav-link.is-active{ color: rgba(255,255,255,.94); background: rgba(255,255,255,.09); }

        /* ===== Dropdown root ===== */
        .nav-dd{ position: relative; display:inline-flex; }
        .nav-dd__btn{
          position: relative; display:inline-flex; align-items:center; gap: 8px;
          height: 40px; padding: 0 12px; border-radius: 999px;
          color: rgba(255,255,255,.74); background: transparent; border: 0;
          cursor: pointer; font: inherit; font-weight: 780; letter-spacing: .02em;
          transition: color .16s ease, background-color .16s ease;
        }
        .nav-dd__btn:hover{ color: rgba(255,255,255,.92); background: rgba(255,255,255,.06); }
        .nav-dd__btn.is-active{ color: rgba(255,255,255,.94); background: rgba(255,255,255,.09); }

        /* ✅ arrow (hover/open => rotate) */
        .nav-dd__chev{ opacity: .85; transition: transform .14s ease; }
        .nav-dd.is-open .nav-dd__chev{ transform: rotate(180deg); }

        /* ✅ panel should be compact — not huge */
        .nav-dd__panel{
          position:absolute; top: calc(100% + 10px); left: 50%;
          transform: translateX(-50%) translateY(-6px) scale(.99);
          width: 300px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.10);
          background:
            radial-gradient(120% 90% at 20% 10%, rgba(47,184,255,.14), transparent 58%),
            radial-gradient(120% 90% at 90% 10%, rgba(63,227,196,.10), transparent 60%),
            rgba(10,12,18,.88);
          -webkit-backdrop-filter: blur(18px) saturate(1.18);
          backdrop-filter: blur(18px) saturate(1.18);
          box-shadow: 0 24px 80px rgba(0,0,0,.65);
          opacity: 0; pointer-events: none;
          transform-origin: top center;
          transition: opacity .14s ease, transform .14s ease;
          z-index: 1300;
          padding: 10px;
        }
        .nav-dd.is-open .nav-dd__panel{
          opacity: 1; pointer-events: auto;
          transform: translateX(-50%) translateY(0) scale(1);
        }

        /* ===== Minimal rows (NO hints) ===== */
        .ddList{ display:grid; gap: 8px; }
        .ddRow{
          position: relative;
          display:flex; align-items:center; justify-content: space-between; gap: 12px;
          width: 100%;
          padding: 12px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(255,255,255,.035);
          text-decoration:none;
          color: rgba(255,255,255,.90);
          font-weight: 860;
          font-size: 13px;
          letter-spacing: .01em;
          transition: background-color .16s ease, border-color .16s ease, transform .16s ease;
        }
        .ddRow:hover{ background: rgba(255,255,255,.055); border-color: rgba(255,255,255,.12); transform: translateY(-1px); }
        .ddRow.is-active{ background: rgba(47,184,255,.10); border-color: rgba(47,184,255,.22); }

        .ddLeft{ display:flex; align-items:center; gap: 10px; min-width: 0; }
        .ddDot{
          width: 8px; height: 8px; border-radius: 999px; flex: 0 0 auto;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.92), rgba(47,184,255,.86));
          box-shadow: 0 0 0 3px rgba(47,184,255,.10);
        }
        .ddText{ min-width:0; }
        .ddLabel{ display:block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        /* ✅ no arrows inside row (you only wanted arrows on main triggers) */
        .ddArrow{ display:none !important; }

        /* ===== UseCases special: compact + hologram stream appears ONLY when hovering a row ===== */
        .nav-dd--uc .nav-dd__panel{ width: 320px; }
        .ucFloat{
          position:absolute;
          left: calc(100% + 10px);
          top: 50%;
          transform: translateY(-50%) translateX(-6px) scale(.99);
          width: 320px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.10);
          background:
            radial-gradient(120% 90% at 18% 8%, rgba(47,184,255,.14), transparent 58%),
            radial-gradient(120% 90% at 82% 10%, rgba(63,227,196,.10), transparent 60%),
            rgba(10,12,18,.86);
          -webkit-backdrop-filter: blur(16px) saturate(1.18);
          backdrop-filter: blur(16px) saturate(1.18);
          box-shadow: 0 26px 90px rgba(0,0,0,.70);
          padding: 10px;
          opacity: 0;
          pointer-events: none;
          transition: opacity .16s ease, transform .16s ease;
          overflow: hidden;
        }
        .ddRow:hover .ucFloat,
        .ddRow:focus-within .ucFloat{
          opacity: 1;
          transform: translateY(-50%) translateX(0) scale(1);
          pointer-events: auto;
        }

        .ucStream{
          position: relative;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(0,0,0,.18);
          padding: 10px 10px;
          overflow: hidden;
          min-height: 54px;
        }
        .ucScan{
          position:absolute; inset:-40px -20px;
          background: linear-gradient(90deg, transparent 0%, rgba(47,184,255,.12) 22%, transparent 44%, transparent 100%);
          transform: translateX(-30%);
          opacity: .72;
          filter: blur(1px);
          pointer-events:none;
          animation: ucScan 9s linear infinite;
        }
        @keyframes ucScan{ 0%{ transform: translateX(-50%);} 100%{ transform: translateX(50%);} }

        /* ✅ “qeryri adi”, pillsiz, yazısız — axan ghost links */
        .ucFlow{
          display:flex; gap: 18px; align-items: center;
          width: max-content;
          animation: ucFlow 14s linear infinite;
          will-change: transform;
        }
        .ucFlow.is-reduced{ animation: none; }
        @keyframes ucFlow{
          0%{ transform: translateX(18%); }
          100%{ transform: translateX(-62%); }
        }
        .ucGhost{
          text-decoration:none;
          color: rgba(255,255,255,.86);
          font-weight: 860;
          font-size: 12px;
          letter-spacing: .10em;
          text-transform: uppercase;
          padding: 6px 2px;
          position: relative;
          white-space: nowrap;
          opacity: .90;
          transition: opacity .16s ease, transform .16s ease;
        }
        .ucGhost::after{
          content:"";
          position:absolute; left:0; right:0; bottom:-4px; height:1px;
          background: linear-gradient(90deg, transparent, rgba(47,184,255,.55), transparent);
          opacity: 0;
          transform: scaleX(.75);
          transition: opacity .16s ease, transform .16s ease;
        }
        .ucGhost:hover{
          opacity: 1;
          transform: translateY(-1px);
        }
        .ucGhost:hover::after{
          opacity: 1;
          transform: scaleX(1);
        }

        /* ===== CTA + toggle ===== */
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

        /* ===== Lang ===== */
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
        .langMenu__chev{ opacity: .75; }

        .langMenu__panel{
          position:absolute; top: calc(100% + 10px); right: 0;
          width: 210px; border-radius: 16px; padding: 10px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(10,12,18,.90);
          -webkit-backdrop-filter: blur(18px) saturate(1.15);
          backdrop-filter: blur(18px) saturate(1.15);
          box-shadow: 0 24px 80px rgba(0,0,0,.65);
          opacity: 0; pointer-events: none;
          transform: translateY(-6px) scale(.98);
          transition: opacity .14s ease, transform .14s ease;
          z-index: 1500;
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
        .langMenu__item.is-active{ background: rgba(47,184,255,.12); border-color: rgba(47,184,255,.22); }
        .langMenu__itemCode{ font-weight: 900; letter-spacing: .10em; }
        .langMenu__itemName{ opacity: .85; font-weight: 740; }

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
        }
        .nav-sheet.is-open{ transform: translateY(0) scale(1); opacity: 1; }

        .nav-sheet__bg{
          position:absolute; inset:0;
          background:
            radial-gradient(120% 90% at 20% 0%, rgba(47,184,255,.16), transparent 58%),
            radial-gradient(120% 90% at 90% 0%, rgba(63,227,196,.12), transparent 60%),
            rgba(10,12,18,.92);
          -webkit-backdrop-filter: blur(18px) saturate(1.18);
          backdrop-filter: blur(18px) saturate(1.18);
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
        .nav-sheetLink__label{ font-weight: 820; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .nav-sheetLink__chev{ opacity: .75; }

        .nav-sheetLink--contact{
          background:
            radial-gradient(120% 120% at 20% 10%, rgba(47,184,255,.20), transparent 60%),
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
        .nav-acc__item.is-active{ background: rgba(47,184,255,.10); border-color: rgba(47,184,255,.22); }
        .nav-acc__dot{
          width: 8px; height: 8px; border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), rgba(47,184,255,.85));
          box-shadow: 0 0 0 3px rgba(47,184,255,.10);
          flex: 0 0 auto;
        }
        .nav-acc__text{ font-weight: 820; }
        .nav-acc__arrow{ opacity: .7; }

        @media (max-width: 920px){
          .header-mid{ display:none; }
          .nav-toggle{ display:inline-flex; }
          .nav-cta--desktopOnly{ display:none; }
          .langMenu__btn{ height: 40px; }
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

          {/* About */}
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
              {t("nav.about")}
              <span className="nav-dd__chev" aria-hidden="true">
                <ChevronDown size={16} />
              </span>
            </button>

            <div className="nav-dd__panel" role="menu" aria-hidden={!aboutOpen}>
              <div className="ddList">
                {ABOUT_LINKS.map((s) => (
                  <NavLink
                    key={s.to}
                    to={withLang(s.to)}
                    className={({ isActive }) => cx("ddRow", isActive && "is-active")}
                    role="menuitem"
                    onClick={() => setOpenMenu(null)}
                  >
                    <span className="ddLeft">
                      <span className="ddDot" aria-hidden="true" />
                      <span className="ddText">
                        <span className="ddLabel">{s.label}</span>
                      </span>
                    </span>
                  </NavLink>
                ))}
              </div>
            </div>
          </div>

          {/* Services (only list — no hologram here) */}
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
              <div className="ddList">
                {SERVICES.map((s) => (
                  <NavLink
                    key={s.id}
                    to={withLang(s.to)}
                    className={({ isActive }) => cx("ddRow", isActive && "is-active")}
                    role="menuitem"
                    onClick={() => setOpenMenu(null)}
                  >
                    <span className="ddLeft">
                      <span className="ddDot" aria-hidden="true" />
                      <span className="ddText">
                        <span className="ddLabel">{s.label}</span>
                      </span>
                    </span>
                  </NavLink>
                ))}
              </div>
            </div>
          </div>

          {/* Use Cases (hologram stream ONLY here) */}
          <div
            ref={ucRef}
            className={cx("nav-dd", "nav-dd--uc", ucOpen && "is-open")}
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
              <div className="ddList">
                {USECASES.map((u) => (
                  <div
                    key={u.id}
                    onMouseEnter={() => setUcActive(u.id)}
                    onFocus={() => setUcActive(u.id)}
                  >
                    <NavLink
                      to={withLang(u.to)}
                      className={({ isActive }) => cx("ddRow", isActive && "is-active")}
                      role="menuitem"
                      onClick={() => setOpenMenu(null)}
                    >
                      <span className="ddLeft">
                        <span className="ddDot" aria-hidden="true" />
                        <span className="ddText">
                          <span className="ddLabel">{u.label}</span>
                        </span>
                      </span>

                      {/* ✅ hover -> hologram stream (no title, no pills, compact) */}
                      <div className="ucFloat" aria-hidden={ucActive !== u.id}>
                        <div className="ucStream">
                          <div className="ucScan" aria-hidden="true" />
                          <div className={cx("ucFlow", prefersReduced && "is-reduced")}>
                            {(u.id === activeUC.id ? activeUC.stream : u.stream)
                              .concat(u.stream)
                              .map((p, idx) => (
                                <NavLink
                                  key={`${u.id}-${p.id}-${idx}`}
                                  to={withLang(p.to)}
                                  className="ucGhost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenu(null);
                                  }}
                                >
                                  {p.label}
                                </NavLink>
                              ))}
                          </div>
                        </div>
                      </div>
                    </NavLink>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Resources */}
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

            <div className="nav-dd__panel" role="menu" aria-hidden={!resOpen}>
              <div className="ddList">
                {RES_LINKS.map((s) => (
                  <NavLink
                    key={s.to}
                    to={withLang(s.to)}
                    className={({ isActive }) => cx("ddRow", isActive && "is-active")}
                    role="menuitem"
                    onClick={() => setOpenMenu(null)}
                  >
                    <span className="ddLeft">
                      <span className="ddDot" aria-hidden="true" />
                      <span className="ddText">
                        <span className="ddLabel">{s.label}</span>
                      </span>
                    </span>
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
