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
  terminal: string[]; // terminalda axacaq sözlər
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

/* ===== Desktop language dropdown ===== */
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

  // usecases hover active
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

  // Use Cases: terminal üçün sözlər (sən istəyən “qeyri-adi” vibe)
  const USECASES: UseCaseDef[] = useMemo(
    () => [
      {
        id: "finance",
        label: "Finance",
        to: "/use-cases/finance",
        terminal: ["LEAD CAPTURE", "KYC SAFE ROUTING", "DEMO FUNNEL", "OPERATOR HANDOFF", "AUDIT LOGS"],
      },
      {
        id: "healthcare",
        label: "Healthcare",
        to: "/use-cases/healthcare",
        terminal: ["SMART TRIAGE", "AUTO BOOKING", "NO-SHOW REMINDERS", "PRIVACY FIRST", "ESCALATE TO STAFF"],
      },
      {
        id: "retail",
        label: "Retail",
        to: "/use-cases/retail",
        terminal: ["UPSELL ASSIST", "BUNDLES", "RETURNS FLOW", "ORDER TRACKING", "PAYMENT READY"],
      },
      {
        id: "logistics",
        label: "Logistics",
        to: "/use-cases/logistics",
        terminal: ["ETA UPDATES", "DELAY ESCALATION", "TICKET AUTOMATION", "AUTO NOTIFICATIONS", "ROUTE STATUS"],
      },
      {
        id: "hotels",
        label: "Hotels & Resorts",
        to: "/use-cases/hotels",
        terminal: ["RESERVATIONS", "CONCIERGE", "UPGRADES", "VIP HANDOFF", "CHECK-IN FLOW"],
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
  const mobileBgAlpha = open ? 0.9 : 0.06 + 0.7 * mobileP;
  const mobileBlurPx = open ? 18 : 4 + 14 * mobileP;
  const mobileSat = open ? 1.3 : 1 + 0.25 * mobileP;

  const headerInlineStyle: React.CSSProperties | undefined = isMobile
    ? {
        backgroundColor: `rgba(10, 12, 18, ${mobileBgAlpha.toFixed(3)})`,
        WebkitBackdropFilter: `blur(${mobileBlurPx.toFixed(1)}px) saturate(${mobileSat.toFixed(2)})`,
        backdropFilter: `blur(${mobileBlurPx.toFixed(1)}px) saturate(${mobileSat.toFixed(2)})`,
        borderBottom: `1px solid rgba(255,255,255,${(open ? 0.1 : 0.06 * mobileP).toFixed(3)})`,
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

  const termLine = useMemo(() => {
    const parts = activeUC.terminal;
    const base = parts.join("   ·   ");
    // iki dəfə təkrarla ki, loop seamless olsun
    return `${base}   ·   ${base}`;
  }, [activeUC]);

  return (
    <header
      ref={headerRef}
      style={headerInlineStyle}
      className={cx("site-header", introReady && "site-header--in", scrolled && "is-scrolled", open && "is-open")}
      data-top={scrolled ? "0" : "1"}
    >
      <style>{`
        :root{ --hdrh: 72px; --hdrp: 0; }

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

        .brand-link{ display:inline-flex; align-items:center; gap: 10px; text-decoration: none; min-width:0; }
        .headerBrand{ position: relative; display:flex; align-items:center; }
        .headerBrand__aura{
          position:absolute; inset:-10px -16px;
          background:
            radial-gradient(120px 44px at 22% 55%, rgba(47,184,255,.16), transparent 60%),
            radial-gradient(120px 44px at 78% 45%, rgba(63,227,196,.10), transparent 62%);
          filter: blur(10px); opacity: .75; pointer-events:none;
        }

        /* Top links */
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

        /* Dropdown trigger */
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

        /* ===== PREMIUM panel (book-like, compact, not "long") ===== */
        .nav-dd__panel{
          position:absolute;
          top: calc(100% + 10px);
          left: 0;
          width: 320px;               /* Services/About/Resources default */
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,.10);
          background:
            radial-gradient(120% 90% at 18% 6%, rgba(47,184,255,.12), transparent 58%),
            radial-gradient(120% 90% at 84% 6%, rgba(63,227,196,.10), transparent 62%),
            rgba(10,12,18,.86);
          -webkit-backdrop-filter: blur(16px) saturate(1.16);
          backdrop-filter: blur(16px) saturate(1.16);
          box-shadow: 0 24px 80px rgba(0,0,0,.62);
          padding: 10px;
          opacity: 0;
          pointer-events: none;
          transform-origin: top left;
          transform: translateY(-10px) rotateX(8deg) scaleY(.92);
          transition: opacity .16s ease, transform .16s ease;
          z-index: 1300;
          overflow: hidden;
        }
        .nav-dd.is-open .nav-dd__panel{
          opacity: 1;
          pointer-events: auto;
          transform: translateY(0) rotateX(0deg) scaleY(1);
        }

        /* page-fold vibe */
        .nav-dd__panel::before{
          content:"";
          position:absolute; inset:0;
          background:
            linear-gradient(180deg, rgba(255,255,255,.10), transparent 26%),
            radial-gradient(600px 260px at 20% 0%, rgba(47,184,255,.10), transparent 60%);
          opacity:.55;
          pointer-events:none;
        }
        .nav-dd__panel::after{
          content:"";
          position:absolute;
          top: 10px; left: 10px; right: 10px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.10), transparent);
          opacity:.55;
          pointer-events:none;
        }

        /* Right align helper */
        .nav-dd.nav-dd--right .nav-dd__panel{
          left: auto;
          right: 0;
          transform-origin: top right;
        }

        /* ===== LIST: no dots, no pills, no underline ===== */
        .ddList{ position: relative; z-index: 1; display:grid; gap: 6px; padding: 4px; }
        .ddRow{
          position: relative;
          display:flex;
          align-items:center;
          justify-content: flex-start;
          width: 100%;
          padding: 10px 10px;
          border-radius: 12px;
          text-decoration:none;
          color: rgba(255,255,255,.88);
          font-weight: 820;
          font-size: 13px;
          letter-spacing: .01em;
          background: transparent;
          border: 1px solid rgba(255,255,255,.06);
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease, color .14s ease;
          outline: none;
        }
        .ddRow:hover{
          background: rgba(255,255,255,.04);
          border-color: rgba(255,255,255,.10);
          transform: translateY(-1px);
        }
        .ddRow.is-active{
          background: rgba(47,184,255,.08);
          border-color: rgba(47,184,255,.18);
        }
        .ddRow:focus-visible{
          box-shadow: 0 0 0 3px rgba(47,184,255,.16);
        }

        /* subtle "unusual" hover: left glow bar */
        .ddRow::before{
          content:"";
          position:absolute;
          left: 8px;
          top: 10px;
          bottom: 10px;
          width: 2px;
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(47,184,255,.65), rgba(63,227,196,.25));
          opacity: 0;
          transform: scaleY(.7);
          transition: opacity .14s ease, transform .14s ease;
        }
        .ddRow:hover::before{
          opacity: .9;
          transform: scaleY(1);
        }

        .ddLabel{
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          padding-left: 14px; /* left glow space */
        }

        /* ===== UseCases: single integrated panel (list + terminal) ===== */
        .nav-dd--uc .nav-dd__panel{
          width: 560px;               /* integrated */
          padding: 12px;
        }
        .ucPanel{
          position: relative;
          z-index: 1;
          display:grid;
          grid-template-columns: 240px 1fr;
          gap: 12px;
          align-items: stretch;
        }
        .ucList{ display:grid; gap: 6px; padding: 4px; }
        .ucList .ddRow{ border-color: rgba(255,255,255,.06); }

        /* Terminal: NO extra thick border, looks like panel’s own section */
        .ucTerm{
          border-radius: 14px;
          background: rgba(0,0,0,.18);
          border: 1px solid rgba(255,255,255,.06);
          overflow: hidden;
          display:flex;
          flex-direction: column;
          min-height: 196px;
          position: relative;
        }
        .ucTerm::before{
          content:"";
          position:absolute; inset:0;
          background:
            radial-gradient(420px 180px at 20% 10%, rgba(47,184,255,.10), transparent 60%),
            radial-gradient(420px 180px at 85% 0%, rgba(63,227,196,.08), transparent 62%);
          opacity:.55;
          pointer-events:none;
        }

        .ucTermHead{
          position: relative;
          display:flex;
          align-items:center;
          justify-content: space-between;
          padding: 10px 12px;
          border-bottom: 1px solid rgba(255,255,255,.06);
          color: rgba(255,255,255,.72);
          font-weight: 860;
          letter-spacing: .12em;
          text-transform: uppercase;
          font-size: 11px;
        }
        .ucTermHeadLeft{
          display:flex; align-items:center; gap: 8px; min-width: 0;
        }
        .ucPulse{
          width: 8px; height: 8px; border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.92), rgba(47,184,255,.82));
          box-shadow: 0 0 0 3px rgba(47,184,255,.10);
          opacity:.9;
          animation: ucPulse 1.9s ease-in-out infinite;
        }
        @keyframes ucPulse{
          0%,100%{ transform: scale(1); opacity:.9; }
          50%{ transform: scale(1.18); opacity: 1; }
        }
        .ucTag{
          opacity:.85;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ucHint{
          opacity:.55;
          font-weight: 780;
          letter-spacing: .10em;
          font-size: 10px;
        }

        .ucTermBody{
          position: relative;
          flex: 1;
          padding: 10px 12px 12px;
          display:flex;
          flex-direction: column;
          gap: 10px;
        }

        /* “unusual” cursor + scan */
        .ucScan{
          position:absolute;
          inset:-40px -20px;
          background: linear-gradient(90deg, transparent 0%, rgba(47,184,255,.12) 22%, transparent 44%, transparent 100%);
          transform: translateX(-35%);
          opacity: .65;
          filter: blur(1px);
          pointer-events:none;
          animation: ucScan 8.6s linear infinite;
        }
        @keyframes ucScan{ 0%{ transform: translateX(-55%);} 100%{ transform: translateX(55%);} }

        /* Marquee line: RIGHT -> LEFT (smooth), not thick */
        .ucMarquee{
          width: 100%;
          overflow: hidden;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(0,0,0,.16);
          padding: 10px 10px;
          position: relative;
        }
        .ucMarqueeInner{
          display: inline-flex;
          white-space: nowrap;
          gap: 36px;
          font-weight: 900;
          letter-spacing: .18em;
          text-transform: uppercase;
          font-size: 11px;
          color: rgba(255,255,255,.86);
          will-change: transform;
          animation: ucMar 13s linear infinite;
        }
        .ucMarqueeInner.is-reduced{ animation: none; }
        @keyframes ucMar{
          0%{ transform: translateX(15%); }
          100%{ transform: translateX(-55%); }
        }

        /* below: compact “preview lines” (no pills) */
        .ucMini{
          display:grid;
          gap: 6px;
          opacity: .86;
          font-size: 12px;
          font-weight: 780;
          color: rgba(255,255,255,.74);
        }
        .ucMiniRow{
          display:flex; align-items:center; gap: 10px;
        }
        .ucMiniTick{
          width: 6px; height: 6px; border-radius: 999px;
          background: rgba(47,184,255,.75);
          box-shadow: 0 0 0 3px rgba(47,184,255,.08);
          opacity:.9;
          flex: 0 0 auto;
        }
        .ucMiniText{
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* CTA + toggle */
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
          transform-origin: top right;
          transform: translateY(-10px) rotateX(8deg) scaleY(.92);
          transition: opacity .16s ease, transform .16s ease;
          z-index: 1500;
        }
        .langMenu.is-open .langMenu__panel{
          opacity: 1; pointer-events: auto;
          transform: translateY(0) rotateX(0deg) scaleY(1);
        }
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
        .langMenu__itemCode{ font-weight: 900; letter-spacing: .10em; }
        .langMenu__itemName{ opacity: .85; font-weight: 740; }

        /* Mobile overlay (sənin köhnə hissə saxlanıldı) */
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

        /* mobile accordions */
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
        .nav-acc__text{ font-weight: 820; }
        .nav-acc__arrow{ opacity: .7; }

        @media (max-width: 920px){
          .header-mid{ display:none; }
          .nav-toggle{ display:inline-flex; }
          .nav-cta--desktopOnly{ display:none; }
          .langMenu__btn{ height: 40px; }
        }
        @media (max-width: 620px){
          /* uc panel on smaller screens: terminal below list */
          .nav-dd--uc .nav-dd__panel{ width: 360px; }
          .ucPanel{ grid-template-columns: 1fr; }
          .ucTerm{ min-height: 170px; }
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

        {/* Desktop nav */}
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
                    <span className="ddLabel">{s.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          </div>

          {/* Services */}
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
                    <span className="ddLabel">{s.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          </div>

          {/* Use Cases: integrated terminal */}
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
              <div className="ucPanel">
                <div className="ucList" aria-label="Use cases list">
                  {USECASES.map((u) => (
                    <NavLink
                      key={u.id}
                      to={withLang(u.to)}
                      className={({ isActive }) => cx("ddRow", isActive && "is-active")}
                      role="menuitem"
                      onMouseEnter={() => setUcActive(u.id)}
                      onFocus={() => setUcActive(u.id)}
                      onClick={() => setOpenMenu(null)}
                    >
                      <span className="ddLabel">{u.label}</span>
                    </NavLink>
                  ))}
                </div>

                <div className="ucTerm" aria-label="Use case terminal preview">
                  <div className="ucTermHead">
                    <div className="ucTermHeadLeft">
                      <span className="ucPulse" aria-hidden="true" />
                      <span className="ucTag">{activeUC.label}</span>
                    </div>
                    <span className="ucHint">LIVE STREAM</span>
                  </div>

                  <div className="ucTermBody">
                    <div className="ucScan" aria-hidden="true" />
                    <div className="ucMarquee" aria-hidden={false}>
                      <div className={cx("ucMarqueeInner", prefersReduced && "is-reduced")}>{termLine}</div>
                    </div>

                    <div className="ucMini" aria-hidden="true">
                      {activeUC.terminal.slice(0, 4).map((x) => (
                        <div className="ucMiniRow" key={x}>
                          <span className="ucMiniTick" aria-hidden="true" />
                          <span className="ucMiniText">{x}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Resources (right-aligned) */}
          <div
            ref={resRef}
            className={cx("nav-dd", "nav-dd--right", resOpen && "is-open")}
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
                    <span className="ddLabel">{s.label}</span>
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
