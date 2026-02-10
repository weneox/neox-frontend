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
type FlowDef = { id: string; label: string; to: string };

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

/* ===== Desktop language dropdown (hover opens; click works) ===== */
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

  // Single open desktop dropdown
  const [openMenu, setOpenMenu] = useState<MenuKey>(null);
  const closeT = useRef<number | null>(null);

  const svcRef = useRef<HTMLDivElement | null>(null);
  const aboutRef = useRef<HTMLDivElement | null>(null);
  const resRef = useRef<HTMLDivElement | null>(null);
  const ucRef = useRef<HTMLDivElement | null>(null);

  // UseCases hover state
  const [ucSvcActive, setUcSvcActive] = useState<string>("business-workflows");
  const [ucFlowPhase, setUcFlowPhase] = useState(0); // for soft fade on hover change

  // Mobile accordion state
  const [mobileSvcOpen, setMobileSvcOpen] = useState(false);
  const [mobileUcOpen, setMobileUcOpen] = useState(false);
  const [mobileAboutOpen, setMobileAboutOpen] = useState(false);
  const [mobileResOpen, setMobileResOpen] = useState(false);

  const { i18n, t } = useTranslation();
  const { lang: paramLang } = useParams<{ lang?: string }>();
  const lang: Lang = isLang(paramLang) ? (paramLang as Lang) : DEFAULT_LANG;

  const location = useLocation();
  const navigate = useNavigate();
  const panelId = useId();

  const headerRef = useRef<HTMLElement | null>(null);
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

  // ✅ Services (6)
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

  // ✅ Hologram flows (ONLY Use Cases)
  // Business Workflows: the 5 you said (finance/healthcare/retail/logistics/hotels)
  const FLOWS_BY_SERVICE: Record<string, FlowDef[]> = useMemo(
    () => ({
      "business-workflows": [
        { id: "bw-f", label: "Finance", to: "/use-cases/finance" },
        { id: "bw-h", label: "Healthcare", to: "/use-cases/healthcare" },
        { id: "bw-r", label: "Retail", to: "/use-cases/retail" },
        { id: "bw-l", label: "Logistics", to: "/use-cases/logistics" },
        { id: "bw-ho", label: "Hotels & Resorts", to: "/use-cases/hotels" },
      ],
      "chatbot-24-7": [
        { id: "c1", label: "Lead Capture", to: "/use-cases/finance" },
        { id: "c2", label: "Smart Triage", to: "/use-cases/healthcare" },
        { id: "c3", label: "Upsell Assistant", to: "/use-cases/retail" },
        { id: "c4", label: "Reservation Help", to: "/use-cases/hotels" },
      ],
      websites: [
        { id: "w1", label: "Conversion Funnels", to: "/use-cases/finance" },
        { id: "w2", label: "Product Discovery", to: "/use-cases/retail" },
        { id: "w3", label: "Booking UX", to: "/use-cases/healthcare" },
      ],
      "mobile-apps": [
        { id: "m1", label: "Tracking + Alerts", to: "/use-cases/logistics" },
        { id: "m2", label: "In-app Support", to: "/use-cases/healthcare" },
        { id: "m3", label: "Loyalty & Offers", to: "/use-cases/retail" },
      ],
      "smm-automation": [
        { id: "s1", label: "DM → Lead Flow", to: "/use-cases/finance" },
        { id: "s2", label: "Campaign Assist", to: "/use-cases/retail" },
        { id: "s3", label: "Concierge Promo", to: "/use-cases/hotels" },
      ],
      "technical-support": [
        { id: "t1", label: "SLA + Incidents", to: "/use-cases/logistics" },
        { id: "t2", label: "Release Ops", to: "/use-cases/finance" },
        { id: "t3", label: "Secure Handoff", to: "/use-cases/healthcare" },
      ],
    }),
    []
  );

  const activeFlows = useMemo(() => {
    return FLOWS_BY_SERVICE[ucSvcActive] ?? FLOWS_BY_SERVICE["business-workflows"];
  }, [FLOWS_BY_SERVICE, ucSvcActive]);

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

  // Header height var
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

  // scroll blur
  const computeScrolled = useCallback(() => {
    const y = getWindowScrollY();
    const p = clamp01(y / 180);
    if (headerRef.current) headerRef.current.style.setProperty("--hdrp", String(p));
    if (Math.abs(p - lastPRef.current) > 0.001) {
      lastPRef.current = p;
      setHdrp(p);
      setScrolled(p > 0.02);
    }
  }, []);

  useEffect(() => {
    computeScrolled();
    const schedule = () => {
      if (rafPending.current) return;
      rafPending.current = true;
      requestAnimationFrame(() => {
        rafPending.current = false;
        computeScrolled();
      });
    };
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("scroll", schedule, { passive: true });
    const tick = window.setInterval(() => schedule(), 180);
    return () => {
      window.removeEventListener("resize", schedule as any);
      window.removeEventListener("scroll", schedule as any);
      window.clearInterval(tick);
    };
  }, [computeScrolled]);

  // route change reset
  useEffect(() => {
    setOpen(false);
    setSoftOpen(false);
    setOpenMenu(null);
    setMobileSvcOpen(false);
    setMobileUcOpen(false);
    setMobileAboutOpen(false);
    setMobileResOpen(false);
  }, [location.pathname]);

  // lock body scroll on mobile overlay
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

  // click outside desktop dropdown
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

  // Mobile style driver
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

  const logoH = isMobile ? 16 : 26;
  const logoMaxW = isMobile ? "112px" : "156px";

  // UseCases hover → soft fade phase
  const bumpUcPhase = useCallback(() => {
    setUcFlowPhase((p) => p + 1);
  }, []);

  const aboutOpen = openMenu === "about";
  const svcOpen = openMenu === "services";
  const ucOpen = openMenu === "usecases";
  const resOpen = openMenu === "resources";

  // ===== Mobile Overlay (kept premium + scrollable) =====
  const MobileOverlay = (
    <div className={cx("mnav", open && "is-mounted", softOpen && "is-open")} aria-hidden={!open}>
      <button className="mnav__backdrop" type="button" aria-label="Bağla" onClick={closeMobile} />

      <div id={useId()} className={cx("mnav__sheet", softOpen && "is-open")} role="dialog" aria-modal="true">
        <div className="mnav__bg" aria-hidden="true" />
        <div className="mnav__head">
          <Link
            to={`/${lang}`}
            className="mnav__brand"
            onClick={() => {
              window.scrollTo({ top: 0, left: 0, behavior: "auto" });
              closeMobile();
            }}
          >
            <span className="mnav__brandDot" aria-hidden="true" />
            <span className="mnav__brandTxt">NEOX</span>
          </Link>

          <button className="mnav__close" type="button" aria-label="Bağla" onClick={closeMobile}>
            <X size={18} />
          </button>
        </div>

        <div className="mnav__body">
          <NavLink
            to={withLang("/")}
            end
            className={({ isActive }) => cx("mnavLink", isActive && "is-active")}
            onClick={() => {
              window.scrollTo({ top: 0, left: 0, behavior: "auto" });
              closeMobile();
            }}
          >
            <span className="mnavLink__left">
              <span className="mnavLink__ico" aria-hidden="true">
                <Home size={18} />
              </span>
              <span className="mnavLink__label">{t("nav.home")}</span>
            </span>
          </NavLink>

          <div className={cx("macc", mobileSvcOpen && "is-open")}>
            <button
              type="button"
              className="macc__head"
              onClick={() => setMobileSvcOpen((v) => !v)}
              aria-expanded={mobileSvcOpen}
            >
              <span className="mnavLink__left">
                <span className="mnavLink__ico" aria-hidden="true">
                  <Sparkles size={18} />
                </span>
                <span className="mnavLink__label">{t("nav.services")}</span>
              </span>
              <span className="macc__chev" aria-hidden="true">
                <ChevronDown size={18} />
              </span>
            </button>
            <div className="macc__panel" aria-hidden={!mobileSvcOpen}>
              {SERVICES.map((s) => (
                <NavLink
                  key={s.id}
                  to={withLang(s.to)}
                  className={({ isActive }) => cx("macc__item", isActive && "is-active")}
                  onClick={() => closeMobile()}
                >
                  <span className="macc__dot" aria-hidden="true" />
                  <span className="macc__text">{s.label}</span>
                </NavLink>
              ))}
            </div>
          </div>

          <div className={cx("macc", mobileUcOpen && "is-open")}>
            <button
              type="button"
              className="macc__head"
              onClick={() => setMobileUcOpen((v) => !v)}
              aria-expanded={mobileUcOpen}
            >
              <span className="mnavLink__left">
                <span className="mnavLink__ico" aria-hidden="true">
                  <Layers size={18} />
                </span>
                <span className="mnavLink__label">{t("nav.useCases")}</span>
              </span>
              <span className="macc__chev" aria-hidden="true">
                <ChevronDown size={18} />
              </span>
            </button>
            <div className="macc__panel" aria-hidden={!mobileUcOpen}>
              <NavLink to={withLang("/use-cases")} className="macc__item" onClick={() => closeMobile()}>
                <span className="macc__dot" aria-hidden="true" />
                <span className="macc__text">All Use Cases</span>
              </NavLink>
              {/* keep simple on mobile (hologram is desktop hover) */}
              {SERVICES.map((s) => (
                <NavLink
                  key={`uc-m-${s.id}`}
                  to={withLang("/use-cases")}
                  className="macc__item"
                  onClick={() => closeMobile()}
                >
                  <span className="macc__dot" aria-hidden="true" />
                  <span className="macc__text">{s.label}</span>
                </NavLink>
              ))}
            </div>
          </div>

          <div className={cx("macc", mobileAboutOpen && "is-open")}>
            <button
              type="button"
              className="macc__head"
              onClick={() => setMobileAboutOpen((v) => !v)}
              aria-expanded={mobileAboutOpen}
            >
              <span className="mnavLink__left">
                <span className="mnavLink__ico" aria-hidden="true">
                  <Info size={18} />
                </span>
                <span className="mnavLink__label">{t("nav.about")}</span>
              </span>
              <span className="macc__chev" aria-hidden="true">
                <ChevronDown size={18} />
              </span>
            </button>
            <div className="macc__panel" aria-hidden={!mobileAboutOpen}>
              {ABOUT_LINKS.map((s) => (
                <NavLink key={s.to} to={withLang(s.to)} className="macc__item" onClick={() => closeMobile()}>
                  <span className="macc__dot" aria-hidden="true" />
                  <span className="macc__text">{s.label}</span>
                </NavLink>
              ))}
            </div>
          </div>

          <div className={cx("macc", mobileResOpen && "is-open")}>
            <button
              type="button"
              className="macc__head"
              onClick={() => setMobileResOpen((v) => !v)}
              aria-expanded={mobileResOpen}
            >
              <span className="mnavLink__left">
                <span className="mnavLink__ico" aria-hidden="true">
                  <BookOpen size={18} />
                </span>
                <span className="mnavLink__label">Resources</span>
              </span>
              <span className="macc__chev" aria-hidden="true">
                <ChevronDown size={18} />
              </span>
            </button>
            <div className="macc__panel" aria-hidden={!mobileResOpen}>
              {RES_LINKS.map((s) => (
                <NavLink key={s.to} to={withLang(s.to)} className="macc__item" onClick={() => closeMobile()}>
                  <span className="macc__dot" aria-hidden="true" />
                  <span className="macc__text">{s.label}</span>
                </NavLink>
              ))}
            </div>
          </div>

          <NavLink
            to={withLang("/blog")}
            className={({ isActive }) => cx("mnavLink", isActive && "is-active")}
            onClick={() => {
              window.scrollTo({ top: 0, left: 0, behavior: "auto" });
              closeMobile();
            }}
          >
            <span className="mnavLink__left">
              <span className="mnavLink__ico" aria-hidden="true">
                <BookOpen size={18} />
              </span>
              <span className="mnavLink__label">{t("nav.blog")}</span>
            </span>
          </NavLink>

          <NavLink
            to={withLang("/contact")}
            className={({ isActive }) => cx("mnavLink", "mnavLink--cta", isActive && "is-active")}
            onClick={() => {
              window.scrollTo({ top: 0, left: 0, behavior: "auto" });
              closeMobile();
            }}
          >
            <span className="mnavLink__left">
              <span className="mnavLink__ico" aria-hidden="true">
                <PhoneCall size={18} />
              </span>
              <span className="mnavLink__label">{t("nav.contact")}</span>
            </span>
          </NavLink>

          <div className="mnavLangRow" data-wg-notranslate>
            {LANGS.map((code) => (
              <button
                key={code}
                type="button"
                className={cx("mnavLang", code === lang && "is-active")}
                onClick={() => switchLang(code)}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
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

        .site-header, .site-header *{
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji";
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

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
          -webkit-backdrop-filter: blur(calc(8px + 10px * var(--hdrp))) saturate(1.18);
          backdrop-filter: blur(calc(8px + 10px * var(--hdrp))) saturate(1.18);
        }
        .site-header.is-open{
          background: rgba(10, 12, 18, 0.92);
          border-bottom-color: rgba(255,255,255,0.10);
          -webkit-backdrop-filter: blur(18px) saturate(1.30);
          backdrop-filter: blur(18px) saturate(1.30);
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
          position:absolute; inset:-10px -16px;
          background:
            radial-gradient(120px 44px at 28% 60%, rgba(47,184,255,.18), transparent 60%),
            radial-gradient(120px 44px at 72% 40%, rgba(47,184,255,.10), transparent 62%);
          filter: blur(11px); opacity: .75; pointer-events:none;
        }

        .nav-link{
          display: inline-flex; align-items: center; justify-content: center;
          height: 40px; padding: 0 12px; border-radius: 999px;
          text-decoration: none; color: rgba(255,255,255,.72);
          font-weight: 760; font-size: 13px; letter-spacing: .01em;
          transition: color .16s ease, background-color .16s ease, transform .16s ease;
          outline: none;
        }
        .nav-link:hover{ color: rgba(255,255,255,.92); background: rgba(255,255,255,.06); }
        .nav-link.is-active{ color: rgba(255,255,255,.94); background: rgba(255,255,255,.08); }

        .nav-dd{ position: relative; display:inline-flex; }
        .nav-dd__btn{
          display:inline-flex; align-items:center; gap: 8px;
          height: 40px; padding: 0 12px; border-radius: 999px;
          color: rgba(255,255,255,.72); background: transparent; border: 0;
          cursor: pointer; font: inherit; font-weight: 780; letter-spacing: .01em;
          transition: color .16s ease, background-color .16s ease;
          outline: none;
        }
        .nav-dd__btn:hover{ color: rgba(255,255,255,.92); background: rgba(255,255,255,.06); }
        .nav-dd__btn.is-active{ color: rgba(255,255,255,.94); background: rgba(255,255,255,.08); }
        .nav-dd__chev{ opacity: .75; transition: transform .14s ease; }
        .nav-dd.is-open .nav-dd__chev{ transform: rotate(180deg); }

        .nav-dd__panel{
          position:absolute; top: calc(100% + 10px); left: 50%;
          transform: translateX(-50%);
          width: 392px; border-radius: 18px; padding: 14px;
          border: 1px solid rgba(255,255,255,.10);
          background:
            radial-gradient(120% 90% at 18% 10%, rgba(47,184,255,.16), transparent 55%),
            radial-gradient(120% 90% at 82% 10%, rgba(47,184,255,.09), transparent 60%),
            rgba(10,12,18,.90);
          -webkit-backdrop-filter: blur(18px) saturate(1.22);
          backdrop-filter: blur(18px) saturate(1.22);
          box-shadow: 0 24px 80px rgba(0,0,0,.66);
          opacity: 0; pointer-events: none;
          transform-origin: top center;
          transform: translateX(-50%) translateY(-6px) scale(.985);
          transition: opacity .14s ease, transform .14s ease;
          z-index: 1300;
        }
        .nav-dd.is-open .nav-dd__panel{
          opacity: 1; pointer-events: auto;
          transform: translateX(-50%) translateY(0) scale(1);
        }
        .nav-dd__title{
          font-size: 11px; letter-spacing: .18em;
          color: rgba(255,255,255,.55);
          padding: 2px 6px 10px;
          font-weight: 900;
        }

        /* ===== Simple Services panel ONLY (no right side, no flows) ===== */
        .ddGrid{ display:grid; gap: 8px; }
        .ddItem{
          display:flex; align-items:flex-start; justify-content: space-between; gap: 12px;
          padding: 11px 11px; border-radius: 14px;
          text-decoration:none; border: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.86);
          transition: background-color .14s ease, border-color .14s ease, transform .14s ease;
        }
        .ddItem:hover{ background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.11); transform: translateY(-1px); }
        .ddItem.is-active{ background: rgba(47,184,255,.10); border-color: rgba(47,184,255,.22); }

        .ddLeft{ display:flex; align-items:flex-start; gap: 10px; min-width: 0; }
        .ddDot{
          width: 8px; height: 8px; border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), rgba(47,184,255,.88));
          box-shadow: 0 0 0 3px rgba(47,184,255,.10);
          margin-top: 6px; flex: 0 0 auto;
        }
        .ddLabelWrap{ display:flex; flex-direction:column; min-width: 0; }
        .ddLabel{ font-weight: 880; font-size: 13px; line-height: 1.15; }
        .ddHint{
          margin-top: 4px; font-size: 12px; line-height: 1.25;
          color: rgba(255,255,255,.56);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          max-width: 260px;
          font-weight: 600;
        }

        /* ===== Use Cases: services list + Hologram flows (not a huge panel) ===== */
        .nav-dd--uc .nav-dd__panel{ width: 860px; border-radius: 20px; padding: 14px; }
        .ucWrap{
          display:grid;
          grid-template-columns: 1fr 1.05fr;
          gap: 12px;
          align-items: start;
        }

        .ucLeft{
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.03);
          overflow: hidden;
        }
        .ucLeftHead{
          padding: 10px 12px;
          font-size: 11px;
          letter-spacing: .18em;
          color: rgba(255,255,255,.60);
          border-bottom: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.02);
          font-weight: 900;
        }
        .ucList{ display:grid; gap: 2px; padding: 6px; }
        .ucSvc{
          width: 100%;
          text-align: left;
          border: 0;
          cursor: pointer;
          border-radius: 14px;
          padding: 10px 10px;
          background: transparent;
          color: rgba(255,255,255,.90);
          transition: background-color .18s ease, transform .18s ease;
          outline: none;
        }
        .ucSvc:hover{ background: rgba(255,255,255,.05); transform: translateY(-1px); }
        .ucSvc.is-active{ background: rgba(47,184,255,.11); }
        .ucSvc__label{ display:block; font-weight: 900; font-size: 13px; letter-spacing: .01em; }
        .ucSvc__hint{ display:block; margin-top: 3px; font-size: 12px; color: rgba(255,255,255,.56); font-weight: 600; }

        /* Hologram area (minimal, not “big terminal”) */
        .ucHolo{
          position: relative;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.10);
          background:
            radial-gradient(120% 90% at 20% 0%, rgba(47,184,255,.14), transparent 55%),
            radial-gradient(120% 90% at 85% 0%, rgba(47,184,255,.08), transparent 60%),
            rgba(0,0,0,.18);
          overflow: hidden;
        }

        .ucHoloTop{
          padding: 10px 12px;
          border-bottom: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.02);
          display:flex;
          align-items:center;
          justify-content: space-between;
          gap: 10px;
        }
        .ucHoloTitle{
          font-size: 11px;
          letter-spacing: .16em;
          font-weight: 920;
          color: rgba(255,255,255,.72);
          text-transform: uppercase;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ucHoloSub{
          font-size: 11px;
          color: rgba(255,255,255,.52);
          font-weight: 700;
          white-space: nowrap;
        }

        .ucHoloBody{
          padding: 10px 12px 12px;
        }

        .holoStage{
          position: relative;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.03);
          overflow: hidden;
          padding: 12px 12px;
          min-height: 120px;
        }

        /* Soft hologram beams */
        .holoBeam{
          position:absolute;
          inset: -40% -20%;
          background:
            radial-gradient(60% 40% at 30% 30%, rgba(47,184,255,.18), transparent 58%),
            radial-gradient(60% 40% at 70% 70%, rgba(47,184,255,.12), transparent 62%),
            linear-gradient(180deg, rgba(255,255,255,.06), transparent 40%, rgba(255,255,255,.04));
          filter: blur(10px);
          opacity: .55;
          pointer-events:none;
          transform: rotate(-6deg);
          mix-blend-mode: screen;
        }

        /* Flow marquee (very slow + soft) */
        .holoRow{
          position: relative;
          display:flex;
          align-items:center;
          gap: 10px;
          width: max-content;
          will-change: transform, opacity;
          animation: holoMarquee 36s linear infinite;
          padding-right: 22px;
        }
        .holoRow.is-static{ animation: none; flex-wrap: wrap; width: 100%; }

        @keyframes holoMarquee{
          from{ transform: translateX(10px); }
          to{ transform: translateX(-33.333%); }
        }

        .holoFadeSwap{
          animation: holoSwap .42s ease both;
        }
        @keyframes holoSwap{
          from{ opacity: 0; transform: translateY(4px); }
          to{ opacity: 1; transform: translateY(0); }
        }

        .holoPill{
          display:inline-flex;
          align-items:center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 999px;
          text-decoration:none;
          border: 1px solid rgba(255,255,255,.10);
          background:
            linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.03));
          color: rgba(255,255,255,.90);
          font-weight: 820;
          font-size: 12px;
          letter-spacing: .01em;
          white-space: nowrap;
          transition: transform .16s ease, background-color .16s ease, border-color .16s ease, filter .16s ease;
        }
        .holoPill:hover{
          transform: translateY(-1px);
          border-color: rgba(47,184,255,.24);
          background:
            radial-gradient(120% 140% at 25% 10%, rgba(47,184,255,.14), transparent 60%),
            linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
          filter: drop-shadow(0 10px 22px rgba(0,0,0,.45));
        }
        .holoDot{
          width: 7px; height: 7px; border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), rgba(47,184,255,.90));
          box-shadow: 0 0 0 3px rgba(47,184,255,.10);
          flex: 0 0 auto;
        }

        .nav-cta{
          display:inline-flex; align-items:center; justify-content:center;
          height: 38px; padding: 0 14px; border-radius: 999px; text-decoration:none;
          font-weight: 860; font-size: 13px; color: rgba(255,255,255,.92);
          border: 1px solid rgba(255,255,255,.10);
          background:
            radial-gradient(120% 120% at 20% 10%, rgba(47,184,255,.24), transparent 60%),
            rgba(255,255,255,.06);
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
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
          transition: background-color .14s ease, border-color .14s ease, transform .14s ease;
        }
        .nav-toggle:hover{ transform: translateY(-1px); background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.14); }
        .nav-toggle__bar{ width: 18px; height: 2px; border-radius: 999px; background: rgba(255,255,255,.86); opacity: .9; }

        /* Lang menu (cyan) */
        .langMenu{ position: relative; }
        .langMenu__btn{
          display:inline-flex; align-items:center; gap: 8px;
          height: 38px; padding: 0 10px; border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.88);
          font-weight: 860; font-size: 12px;
          cursor: pointer;
          transition: background-color .14s ease, border-color .14s ease, transform .14s ease;
        }
        .langMenu__btn:hover{ transform: translateY(-1px); background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.14); }
        .langMenu__dot{
          width: 8px; height: 8px; border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.92), rgba(47,184,255,.92));
          box-shadow: 0 0 0 3px rgba(47,184,255,.10);
        }
        .langMenu__code{ letter-spacing: .08em; }
        .langMenu__chev{ opacity: .75; }

        .langMenu__panel{
          position:absolute; top: calc(100% + 10px); right: 0;
          width: 210px; border-radius: 16px; padding: 10px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(10,12,18,.92);
          -webkit-backdrop-filter: blur(18px) saturate(1.2);
          backdrop-filter: blur(18px) saturate(1.2);
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
          color: rgba(255,255,255,.88);
          padding: 10px 10px;
          border-radius: 12px;
          cursor: pointer;
          transition: background-color .14s ease, border-color .14s ease, transform .14s ease;
        }
        .langMenu__item + .langMenu__item{ margin-top: 8px; }
        .langMenu__item:hover{ background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.10); transform: translateY(-1px); }
        .langMenu__item.is-active{ background: rgba(47,184,255,.12); border-color: rgba(47,184,255,.24); }
        .langMenu__itemCode{ font-weight: 900; letter-spacing: .10em; }
        .langMenu__itemName{ opacity: .85; font-weight: 700; }

        /* ===== Mobile overlay ===== */
        .mnav{ position: fixed; inset: 0; z-index: 2200; opacity: 0; pointer-events: none; transition: opacity .16s ease; }
        .mnav.is-mounted{ display:block; }
        .mnav.is-open{ opacity: 1; pointer-events: auto; }
        .mnav__backdrop{
          position:absolute; inset:0; border:0;
          background: rgba(0,0,0,.52);
          -webkit-backdrop-filter: blur(8px);
          backdrop-filter: blur(8px);
          cursor: pointer;
        }
        .mnav__sheet{
          position:absolute; inset: 10px 10px auto 10px;
          max-width: 560px; margin-left: auto;
          border-radius: 22px; border: 1px solid rgba(255,255,255,.10);
          overflow: hidden;
          transform: translateY(-10px) scale(.985);
          opacity: 0;
          transition: transform .16s ease, opacity .16s ease;
        }
        .mnav__sheet.is-open{ transform: translateY(0) scale(1); opacity: 1; }
        .mnav__bg{
          position:absolute; inset:0;
          background:
            radial-gradient(120% 90% at 20% 0%, rgba(47,184,255,.18), transparent 55%),
            radial-gradient(120% 90% at 90% 0%, rgba(47,184,255,.10), transparent 60%),
            rgba(10,12,18,.94);
          -webkit-backdrop-filter: blur(18px) saturate(1.25);
          backdrop-filter: blur(18px) saturate(1.25);
        }
        .mnav__head{
          position: relative; z-index: 2;
          display:flex; align-items:center; justify-content: space-between;
          padding: calc(12px + env(safe-area-inset-top)) 12px 10px;
          border-bottom: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.02);
        }
        .mnav__brand{
          display:inline-flex; align-items:center; gap: 10px;
          text-decoration:none; color: rgba(255,255,255,.92);
          font-weight: 920; letter-spacing: .12em; font-size: 12px;
        }
        .mnav__brandDot{
          width: 10px; height: 10px; border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), rgba(47,184,255,.88));
          box-shadow: 0 0 0 4px rgba(47,184,255,.10);
        }
        .mnav__brandTxt{ opacity: .92; }
        .mnav__close{
          width: 42px; height: 40px; border-radius: 14px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.05);
          color: rgba(255,255,255,.90);
          display:flex; align-items:center; justify-content:center;
          cursor: pointer;
          transition: transform .14s ease, background-color .14s ease;
        }
        .mnav__close:hover{ transform: translateY(-1px); background: rgba(255,255,255,.07); }
        .mnav__body{
          position: relative; z-index: 2;
          padding: 10px 12px calc(14px + env(safe-area-inset-bottom));
          display:grid; gap: 10px;
          max-height: calc(100dvh - 24px - 70px);
          overflow: auto;
          -webkit-overflow-scrolling: touch;
        }
        .mnavLink{
          display:flex; align-items:center; justify-content: space-between;
          padding: 12px 12px;
          border-radius: 16px;
          text-decoration:none;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.90);
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
        }
        .mnavLink:hover{ transform: translateY(-1px); background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.12); }
        .mnavLink.is-active{ background: rgba(47,184,255,.10); border-color: rgba(47,184,255,.22); }
        .mnavLink__left{ display:flex; align-items:center; gap: 10px; min-width: 0; }
        .mnavLink__ico{
          width: 34px; height: 34px;
          display:flex; align-items:center; justify-content:center;
          border-radius: 14px;
          background: rgba(255,255,255,.05);
          border: 1px solid rgba(255,255,255,.07);
          flex: 0 0 auto;
        }
        .mnavLink__label{ font-weight: 860; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .mnavLink--cta{
          background:
            radial-gradient(120% 120% at 20% 10%, rgba(47,184,255,.24), transparent 60%),
            rgba(255,255,255,.05);
          border-color: rgba(255,255,255,.12);
        }
        .macc{
          border-radius: 18px; overflow:hidden;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.03);
        }
        .macc__head{
          width: 100%;
          border:0; background: transparent;
          display:flex; align-items:center; justify-content: space-between;
          padding: 12px 12px;
          cursor:pointer; color: rgba(255,255,255,.92);
        }
        .macc__chev{ opacity: .75; transition: transform .16s ease; }
        .macc.is-open .macc__chev{ transform: rotate(180deg); }
        .macc__panel{
          display:grid; gap: 8px;
          padding: 0 12px 12px;
          max-height: 0; overflow: hidden;
          transition: max-height .20s ease;
        }
        .macc.is-open .macc__panel{ max-height: 820px; }
        .macc__item{
          display:flex; align-items:center; gap: 10px;
          padding: 11px 10px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.90);
          text-decoration:none;
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
        }
        .macc__item:hover{ transform: translateY(-1px); background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.10); }
        .macc__item.is-active{ background: rgba(47,184,255,.10); border-color: rgba(47,184,255,.22); }
        .macc__dot{
          width: 8px; height: 8px; border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), rgba(47,184,255,.88));
          box-shadow: 0 0 0 3px rgba(47,184,255,.10);
          flex: 0 0 auto;
        }
        .macc__text{ font-weight: 840; }

        .mnavLangRow{ margin-top: 2px; display:flex; gap: 8px; flex-wrap: wrap; padding: 2px; }
        .mnavLang{
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.86);
          border-radius: 999px;
          padding: 9px 12px;
          font-weight: 860;
          letter-spacing: .08em;
          font-size: 12px;
          cursor: pointer;
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
        }
        .mnavLang:hover{ transform: translateY(-1px); background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.14); }
        .mnavLang.is-active{ background: rgba(47,184,255,.12); border-color: rgba(47,184,255,.24); }

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
                  filter:
                    "drop-shadow(0 8px 18px rgba(0,0,0,.50)) drop-shadow(0 0 10px rgba(47,184,255,.08))",
                  transform: "translateZ(0)",
                }}
              />
            </span>
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="header-mid" aria-label="Əsas menyu">
          <NavLink to={withLang("/")} end className={({ isActive }) => cx("nav-link", isActive && "is-active")}>
            {t("nav.home")}
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
              {t("nav.about")}
              <span className="nav-dd__chev" aria-hidden="true">
                <ChevronDown size={16} />
              </span>
            </button>

            <div className="nav-dd__panel" role="menu" aria-hidden={!aboutOpen}>
              <div className="nav-dd__title">ABOUT</div>
              <div className="ddGrid">
                {ABOUT_LINKS.map((s) => (
                  <NavLink
                    key={s.to}
                    to={withLang(s.to)}
                    className={({ isActive }) => cx("ddItem", isActive && "is-active")}
                    role="menuitem"
                    onClick={() => setOpenMenu(null)}
                  >
                    <span className="ddLeft">
                      <span className="ddDot" aria-hidden="true" />
                      <span className="ddLabelWrap">
                        <span className="ddLabel">{s.label}</span>
                        <span className="ddHint">{s.hint ?? "About page"}</span>
                      </span>
                    </span>
                  </NavLink>
                ))}
              </div>
            </div>
          </div>

          {/* SERVICES (simple panel ONLY) */}
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
              <div className="nav-dd__title">SERVICES</div>
              <div className="ddGrid">
                {SERVICES.map((s) => (
                  <NavLink
                    key={s.id}
                    to={withLang(s.to)}
                    className={({ isActive }) => cx("ddItem", isActive && "is-active")}
                    role="menuitem"
                    onClick={() => setOpenMenu(null)}
                  >
                    <span className="ddLeft">
                      <span className="ddDot" aria-hidden="true" />
                      <span className="ddLabelWrap">
                        <span className="ddLabel">{s.label}</span>
                        <span className="ddHint">{s.hint}</span>
                      </span>
                    </span>
                  </NavLink>
                ))}
              </div>
            </div>
          </div>

          {/* USE CASES (services list + hologram scenarios) */}
          <div
            ref={ucRef}
            className={cx("nav-dd", "nav-dd--uc", ucOpen && "is-open")}
            onMouseEnter={() => {
              openDrop("usecases");
              if (!ucSvcActive) setUcSvcActive("business-workflows");
            }}
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
              <div className="nav-dd__title">USE CASES</div>

              <div className="ucWrap">
                <div className="ucLeft">
                  <div className="ucLeftHead">SELECT A SERVICE</div>
                  <div className="ucList">
                    {SERVICES.map((s) => {
                      const active = s.id === ucSvcActive;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          className={cx("ucSvc", active && "is-active")}
                          onMouseEnter={() => {
                            setUcSvcActive(s.id);
                            bumpUcPhase();
                          }}
                          onFocus={() => {
                            setUcSvcActive(s.id);
                            bumpUcPhase();
                          }}
                          onClick={() => {
                            // keep click on service simple: open /use-cases (as you said, we'll wire links later)
                            setOpenMenu(null);
                            navigate(withLang("/use-cases"));
                            window.scrollTo({ top: 0, left: 0, behavior: "auto" });
                          }}
                        >
                          <span className="ucSvc__label">{s.label}</span>
                          <span className="ucSvc__hint">{s.hint}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="ucHolo">
                  <div className="ucHoloTop">
                    <div className="ucHoloTitle">SCENARIOS</div>
                    <div className="ucHoloSub">hover → hologram stream</div>
                  </div>

                  <div className="ucHoloBody">
                    <div className="holoStage">
                      <div className="holoBeam" aria-hidden="true" />
                      {/* very slow, soft “hologram” stream */}
                      <div
                        className={cx(
                          "holoRow",
                          prefersReduced && "is-static",
                          // key-like phase class for subtle swap
                          !prefersReduced && "holoFadeSwap"
                        )}
                        key={`${ucSvcActive}:${ucFlowPhase}`}
                        aria-label="Scenario hologram"
                      >
                        {(prefersReduced ? activeFlows : [...activeFlows, ...activeFlows, ...activeFlows]).map(
                          (f, idx) => (
                            <NavLink
                              key={`${f.id}-${idx}`}
                              to={withLang(f.to)}
                              className="holoPill"
                              onClick={() => setOpenMenu(null)}
                            >
                              <span className="holoDot" aria-hidden="true" />
                              {f.label}
                            </NavLink>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* bottom mini link */}
              <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                <NavLink
                  to={withLang("/use-cases")}
                  className="nav-cta"
                  onClick={() => setOpenMenu(null)}
                  style={{ height: 36, fontSize: 12, padding: "0 12px" }}
                >
                  Open {t("nav.useCases")}
                </NavLink>
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
              Resources
              <span className="nav-dd__chev" aria-hidden="true">
                <ChevronDown size={16} />
              </span>
            </button>

            <div className="nav-dd__panel" role="menu" aria-hidden={!resOpen}>
              <div className="nav-dd__title">RESOURCES</div>
              <div className="ddGrid">
                {RES_LINKS.map((s) => (
                  <NavLink
                    key={s.to}
                    to={withLang(s.to)}
                    className={({ isActive }) => cx("ddItem", isActive && "is-active")}
                    role="menuitem"
                    onClick={() => setOpenMenu(null)}
                  >
                    <span className="ddLeft">
                      <span className="ddDot" aria-hidden="true" />
                      <span className="ddLabelWrap">
                        <span className="ddLabel">{s.label}</span>
                        <span className="ddHint">{s.hint ?? "Guides, docs, policy"}</span>
                      </span>
                    </span>
                  </NavLink>
                ))}
              </div>
            </div>
          </div>

          {/* BLOG */}
          <NavLink to={withLang("/blog")} className={({ isActive }) => cx("nav-link", isActive && "is-active")}>
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
