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

type MenuKey = "about" | "services" | "usecases" | "resources" | null;
type NavDef = { to: string; label: string; hint?: string };
type ServiceDef = { id: string; label: string; to: string; hint: string };
type ScenarioPill = { id: string; label: string; to: string };

function isLang(x: string | undefined | null): x is Lang {
  return !!x && (LANGS as readonly string[]).includes(x as any);
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
  const prefersReduced = usePrefersReducedMotion();
  const { i18n, t } = useTranslation();
  const { lang: paramLang } = useParams<{ lang?: string }>();
  const lang: Lang = isLang(paramLang) ? (paramLang as Lang) : DEFAULT_LANG;

  const location = useLocation();
  const navigate = useNavigate();

  const [scrolled, setScrolled] = useState(false);
  const [hdrp, setHdrp] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const [open, setOpen] = useState(false);
  const [softOpen, setSoftOpen] = useState(false);

  const [openMenu, setOpenMenu] = useState<MenuKey>(null);
  const closeT = useRef<number | null>(null);

  const aboutRef = useRef<HTMLDivElement | null>(null);
  const svcRef = useRef<HTMLDivElement | null>(null);
  const ucRef = useRef<HTMLDivElement | null>(null);
  const resRef = useRef<HTMLDivElement | null>(null);

  const headerRef = useRef<HTMLElement | null>(null);
  const scrollElRef = useRef<HTMLElement | Window | null>(null);

  const panelId = useId();

  const [mobileUcOpen, setMobileUcOpen] = useState(false);
  const [mobileSvcOpen, setMobileSvcOpen] = useState(false);
  const [mobileAboutOpen, setMobileAboutOpen] = useState(false);
  const [mobileResOpen, setMobileResOpen] = useState(false);

  // UseCases hover: show “mini hologram” only for hovered row
  const [ucActiveSvc, setUcActiveSvc] = useState<string>("business-workflows");

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
      { id: "chatbot-24-7", label: "Chatbot 24/7", to: "/services/chatbot-24-7", hint: "Always-on chat that converts leads and answers fast." },
      { id: "business-workflows", label: "Business Workflows", to: "/services/business-workflows", hint: "Trigger → route → act. End-to-end automation flows." },
      { id: "websites", label: "Websites", to: "/services/websites", hint: "Premium, fast websites with modern UX." },
      { id: "mobile-apps", label: "Mobile Apps", to: "/services/mobile-apps", hint: "iOS/Android apps with clean UI and scalable backend." },
      { id: "smm-automation", label: "SMM Automation", to: "/services/smm-automation", hint: "Content, scheduling, funnels and automation." },
      { id: "technical-support", label: "Technical Support", to: "/services/technical-support", hint: "Monitoring, fixes, deployments, and ongoing support." },
    ],
    []
  );

  const ABOUT_LINKS: NavDef[] = useMemo(() => [{ to: "/about", label: "About NEOX", hint: "Company, mission, technology" }], []);
  const RES_LINKS: NavDef[] = useMemo(
    () => [
      { to: "/resources/docs", label: "Docs", hint: "Documentation & references" },
      { to: "/resources/faq", label: "FAQ", hint: "Most asked questions" },
      { to: "/resources/guides", label: "Guides", hint: "Step-by-step tutorials" },
      { to: "/privacy", label: "Privacy Policy", hint: "Policy & data handling" },
    ],
    []
  );

  // ✅ UseCases = same 6 services list, but mini hologram stream appears to the RIGHT of hovered row.
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

  // active flags
  const isUseCasesActive = useMemo(() => location.pathname.toLowerCase().includes("/use-cases"), [location.pathname]);
  const isServicesActive = useMemo(() => location.pathname.toLowerCase().includes("/services"), [location.pathname]);
  const isAboutActive = useMemo(() => location.pathname.toLowerCase().includes("/about"), [location.pathname]);
  const isResActive = useMemo(() => {
    const p = location.pathname.toLowerCase();
    return p.includes("/resources") || p.includes("/privacy");
  }, [location.pathname]);

  // responsive
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
    const sc = getScrollableEl();
    scrollElRef.current = sc;

    const read = () => {
      let y = 0;
      if (sc === window) y = window.scrollY || 0;
      else y = (sc as HTMLElement).scrollTop || 0;

      const p = Math.max(0, Math.min(1, y / 180));
      if (headerRef.current) headerRef.current.style.setProperty("--hdrp", String(p));
      setHdrp(p);
      setScrolled(p > 0.02);
    };

    read();

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        read();
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    if (sc !== window) (sc as HTMLElement).addEventListener("scroll", onScroll, { passive: true });

    const tick = window.setInterval(onScroll, 180);

    return () => {
      window.removeEventListener("scroll", onScroll as any);
      window.removeEventListener("resize", onScroll as any);
      if (sc !== window) (sc as HTMLElement).removeEventListener("scroll", onScroll as any);
      window.clearInterval(tick);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // route change resets
  useEffect(() => {
    setOpen(false);
    setSoftOpen(false);
    setOpenMenu(null);

    setMobileUcOpen(false);
    setMobileSvcOpen(false);
    setMobileAboutOpen(false);
    setMobileResOpen(false);
  }, [location.pathname]);

  // body lock for mobile menu
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
        usecases: ucRef,
        resources: resRef,
      };

      const ref = map[openMenu];
      const el = ref?.current;
      if (!el) return;
      if (!el.contains(target)) setOpenMenu(null);
    };
    window.addEventListener("mousedown", onDown);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
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

  const mobileP = Math.max(0, Math.min(1, hdrp));
  const mobileBgAlpha = open ? 0.92 : 0.03 + 0.70 * mobileP;
  const mobileBlurPx = open ? 18 : 3 + 15 * mobileP;

  const headerInlineStyle: React.CSSProperties | undefined = isMobile
    ? {
        backgroundColor: `rgba(10, 12, 18, ${mobileBgAlpha.toFixed(3)})`,
        WebkitBackdropFilter: `blur(${mobileBlurPx.toFixed(1)}px) saturate(1.22)`,
        backdropFilter: `blur(${mobileBlurPx.toFixed(1)}px) saturate(1.22)`,
        borderBottom: `1px solid rgba(255,255,255,${(open ? 0.10 : 0.06 * mobileP).toFixed(3)})`,
      }
    : undefined;

  const aboutOpen = openMenu === "about";
  const svcOpen = openMenu === "services";
  const ucOpen = openMenu === "usecases";
  const resOpen = openMenu === "resources";

  const activeUsecasePills =
    USECASE_SCENARIOS_BY_SERVICE[ucActiveSvc] ?? USECASE_SCENARIOS_BY_SERVICE["business-workflows"];

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
            <NavLink to={withLang("/")} end className={({ isActive }) => cx("nav-sheetLink", isActive && "is-active")} onClick={closeMobile}>
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

            {/* Mobile accordions (simple) */}
            <div className={cx("nav-acc", mobileAboutOpen && "is-open")}>
              <button type="button" className={cx("nav-acc__head", mobileAboutOpen && "is-open")} onClick={() => setMobileAboutOpen((v) => !v)}>
                <span className="nav-acc__label">{t("nav.about")}</span>
                <span className="nav-acc__chev" aria-hidden="true">
                  <ChevronDown size={16} />
                </span>
              </button>
              <div className={cx("nav-acc__panel", mobileAboutOpen && "is-open")}>
                {ABOUT_LINKS.map((s) => (
                  <NavLink key={s.to} to={withLang(s.to)} className="nav-acc__item" onClick={closeMobile}>
                    <span className="nav-acc__bullet" aria-hidden="true" />
                    <span className="nav-acc__text">{s.label}</span>
                    <span className="nav-acc__arrow" aria-hidden="true">
                      →
                    </span>
                  </NavLink>
                ))}
              </div>
            </div>

            <div className={cx("nav-acc", mobileSvcOpen && "is-open")}>
              <button type="button" className={cx("nav-acc__head", mobileSvcOpen && "is-open")} onClick={() => setMobileSvcOpen((v) => !v)}>
                <span className="nav-acc__label">{t("nav.services")}</span>
                <span className="nav-acc__chev" aria-hidden="true">
                  <ChevronDown size={16} />
                </span>
              </button>
              <div className={cx("nav-acc__panel", mobileSvcOpen && "is-open")}>
                {SERVICES.map((s) => (
                  <NavLink key={s.id} to={withLang(s.to)} className="nav-acc__item" onClick={closeMobile}>
                    <span className="nav-acc__bullet" aria-hidden="true" />
                    <span className="nav-acc__text">{s.label}</span>
                    <span className="nav-acc__arrow" aria-hidden="true">
                      →
                    </span>
                  </NavLink>
                ))}
              </div>
            </div>

            <div className={cx("nav-acc", mobileUcOpen && "is-open")}>
              <button type="button" className={cx("nav-acc__head", mobileUcOpen && "is-open")} onClick={() => setMobileUcOpen((v) => !v)}>
                <span className="nav-acc__label">{t("nav.useCases")}</span>
                <span className="nav-acc__chev" aria-hidden="true">
                  <ChevronDown size={16} />
                </span>
              </button>
              <div className={cx("nav-acc__panel", mobileUcOpen && "is-open")}>
                <NavLink to={withLang("/use-cases")} className="nav-acc__item" onClick={closeMobile}>
                  <span className="nav-acc__bullet" aria-hidden="true" />
                  <span className="nav-acc__text">All Use Cases</span>
                  <span className="nav-acc__arrow" aria-hidden="true">
                    →
                  </span>
                </NavLink>
                {SERVICES.map((s) => (
                  <NavLink key={s.id} to={withLang(s.to)} className="nav-acc__item" onClick={closeMobile}>
                    <span className="nav-acc__bullet" aria-hidden="true" />
                    <span className="nav-acc__text">{s.label}</span>
                    <span className="nav-acc__arrow" aria-hidden="true">
                      →
                    </span>
                  </NavLink>
                ))}
              </div>
            </div>

            <div className={cx("nav-acc", mobileResOpen && "is-open")}>
              <button type="button" className={cx("nav-acc__head", mobileResOpen && "is-open")} onClick={() => setMobileResOpen((v) => !v)}>
                <span className="nav-acc__label">Resources</span>
                <span className="nav-acc__chev" aria-hidden="true">
                  <ChevronDown size={16} />
                </span>
              </button>
              <div className={cx("nav-acc__panel", mobileResOpen && "is-open")}>
                {RES_LINKS.map((s) => (
                  <NavLink key={s.to} to={withLang(s.to)} className="nav-acc__item" onClick={closeMobile}>
                    <span className="nav-acc__bullet" aria-hidden="true" />
                    <span className="nav-acc__text">{s.label}</span>
                    <span className="nav-acc__arrow" aria-hidden="true">
                      →
                    </span>
                  </NavLink>
                ))}
              </div>
            </div>

            <NavLink to={withLang("/blog")} className="nav-sheetLink" onClick={closeMobile}>
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

            <NavLink to={withLang("/contact")} className="nav-sheetLink nav-sheetLink--contact" onClick={closeMobile}>
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
          position: sticky; top: 0; z-index: 1100; width: 100%;
          transform: translateZ(0);
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
        .nav-link{
          display: inline-flex; align-items: center; justify-content: center;
          height: 40px; padding: 0 12px; border-radius: 999px;
          text-decoration: none; color: rgba(255,255,255,.74);
          font-weight: 780; font-size: 13px; letter-spacing: .02em;
          transition: color .16s ease, background-color .16s ease, transform .16s ease;
        }
        .nav-link:hover{ color: rgba(255,255,255,.92); background: rgba(255,255,255,.06); }
        .nav-link.is-active{ color: rgba(255,255,255,.96); background: rgba(255,255,255,.09); }

        /* ===== ✅ dropdown: NOT long, NOT inside a big block — just a compact list under the word ===== */
        .nav-dd{ position: relative; display:inline-flex; }
        .nav-dd__btn{
          display:inline-flex; align-items:center; gap: 8px;
          height: 40px; padding: 0 12px; border-radius: 999px;
          color: rgba(255,255,255,.74); background: transparent; border: 0;
          cursor: pointer; font: inherit; font-weight: 800;
          transition: color .16s ease, background-color .16s ease;
        }
        .nav-dd__btn:hover{ color: rgba(255,255,255,.92); background: rgba(255,255,255,.06); }
        .nav-dd__btn.is-active{ color: rgba(255,255,255,.96); background: rgba(255,255,255,.09); }
        .nav-dd__chev{ opacity: .82; transition: transform .16s ease; }
        .nav-dd.is-open .nav-dd__chev{ transform: rotate(180deg); }

        .nav-dd__panel{
          position:absolute;
          top: calc(100% + 10px);
          left: 50%;
          transform: translateX(-50%);
          width: max-content;               /* ✅ only as big as content */
          min-width: 280px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(10,12,18,.86);
          -webkit-backdrop-filter: blur(16px) saturate(1.18);
          backdrop-filter: blur(16px) saturate(1.18);
          box-shadow: 0 28px 100px rgba(0,0,0,.70);
          opacity: 0; pointer-events: none;
          transform-origin: top center;
          transform: translateX(-50%) translateY(-8px) scale(.985);
          transition: opacity .16s ease, transform .16s ease;
          z-index: 1300;
          padding: 6px;                     /* ✅ small padding */
          overflow: visible;                 /* ✅ no scrollbar */
        }
        .nav-dd.is-open .nav-dd__panel{
          opacity: 1; pointer-events: auto;
          transform: translateX(-50%) translateY(0) scale(1);
        }

        /* item row (single-line by default) */
        .ddRow{
          position: relative;
          display:flex; align-items:center; justify-content: space-between; gap: 12px;
          width: 100%;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.04);
          text-decoration:none;
          color: rgba(255,255,255,.90);
          font-weight: 840;
          font-size: 13px;
          letter-spacing: .01em;
          transition: background-color .16s ease, border-color .16s ease, transform .16s ease;
          min-width: 300px;
        }
        .ddRow:hover{ background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.10); transform: translateY(-1px); }
        .ddRow.is-active{ background: rgba(47,184,255,.10); border-color: rgba(47,184,255,.22); }

        .ddRow + .ddRow{ margin-top: 6px; }

        .ddLeft{ display:flex; align-items:center; gap: 10px; min-width: 0; }
        .ddDot{
          width: 8px; height: 8px; border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), rgba(47,184,255,.82));
          box-shadow: 0 0 0 4px rgba(47,184,255,.10);
          flex: 0 0 auto;
        }
        .ddText{ min-width: 0; display:flex; flex-direction: column; }
        .ddLabel{ line-height: 1.12; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 260px; }

        /* ✅ hint opens DOWN under the SAME row (compact), so panel never becomes huge */
        .ddHint{
          margin-top: 6px;
          font-weight: 700;
          font-size: 12px;
          color: rgba(255,255,255,.58);
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          transform: translateY(-4px);
          transition: max-height .18s ease, opacity .18s ease, transform .18s ease;
          white-space: normal;
        }
        .ddRow:hover .ddHint,
        .ddRow:focus-within .ddHint{
          max-height: 40px; /* 1–2 line */
          opacity: 1;
          transform: translateY(0);
        }

        /* arrow down on hover */
        .ddChev{
          opacity: .75;
          transform: rotate(-90deg);
          transition: transform .18s ease, opacity .18s ease;
          flex: 0 0 auto;
        }
        .ddRow:hover .ddChev{ transform: rotate(0deg); opacity: .92; }

        /* ===== ✅ UseCases: mini hologram stream appears to the RIGHT only when hovering that row ===== */
        .nav-dd--usecases .nav-dd__panel{ min-width: 320px; }

        .ucFloat{
          position:absolute;
          left: calc(100% + 10px);          /* ✅ opens to the right */
          top: 50%;
          transform: translateY(-50%) translateX(-6px) scale(.985);
          width: 340px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.10);
          background:
            radial-gradient(120% 90% at 18% 8%, rgba(47,184,255,.16), transparent 58%),
            radial-gradient(120% 90% at 82% 10%, rgba(63,227,196,.12), transparent 60%),
            rgba(10,12,18,.86);
          -webkit-backdrop-filter: blur(16px) saturate(1.20);
          backdrop-filter: blur(16px) saturate(1.20);
          box-shadow: 0 26px 90px rgba(0,0,0,.70);
          padding: 10px 10px;
          opacity: 0;
          pointer-events: none;             /* only row is clickable */
          transition: opacity .16s ease, transform .16s ease;
          overflow: hidden;
        }
        .ddRow:hover .ucFloat,
        .ddRow:focus-within .ucFloat{
          opacity: 1;
          transform: translateY(-50%) translateX(0) scale(1);
          pointer-events: auto;             /* ✅ allow click pills */
        }

        .ucFloatTop{
          display:flex; align-items:center; justify-content: space-between;
          margin-bottom: 8px;
        }
        .ucFloatTitle{
          font-size: 11px;
          letter-spacing: .18em;
          font-weight: 950;
          color: rgba(255,255,255,.64);
        }
        .ucFloatHint{
          font-size: 11px;
          font-weight: 750;
          color: rgba(255,255,255,.50);
          white-space: nowrap;
        }

        .ucStream{
          position: relative;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(0,0,0,.22);
          padding: 10px 8px;
          overflow: hidden;
        }
        .ucFadeL, .ucFadeR{ position:absolute; top:0; bottom:0; width: 38px; pointer-events:none; }
        .ucFadeL{ left:0; background: linear-gradient(90deg, rgba(10,12,18,.92), transparent); }
        .ucFadeR{ right:0; background: linear-gradient(270deg, rgba(10,12,18,.92), transparent); }
        .ucScan{
          position:absolute; inset:-40px -20px;
          background: linear-gradient(90deg, transparent 0%, rgba(47,184,255,.14) 22%, transparent 44%, transparent 100%);
          transform: translateX(-30%);
          opacity: .75;
          filter: blur(1px);
          pointer-events:none;
          animation: ucScan 8.2s linear infinite;
        }
        @keyframes ucScan{ 0%{ transform: translateX(-45%);} 100%{ transform: translateX(45%);} }

        /* ✅ right-open + right-to-left motion (as you asked) */
        .ucMarquee{
          display:flex; gap: 10px;
          width: max-content; align-items: center;
          animation: ucMarq 12.5s linear infinite;
          will-change: transform;
        }
        .ucMarquee.is-reduced{ animation: none; }
        @keyframes ucMarq{
          0%{ transform: translateX(18%); }
          100%{ transform: translateX(-58%); } /* right → left */
        }

        .ucPill{
          display:inline-flex; align-items:center; gap: 8px;
          text-decoration:none;
          padding: 9px 11px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background:
            radial-gradient(120% 120% at 20% 20%, rgba(47,184,255,.16), transparent 60%),
            rgba(255,255,255,.05);
          color: rgba(255,255,255,.88);
          font-weight: 840;
          font-size: 12px;
          white-space: nowrap;
          transition: transform .16s ease, border-color .16s ease, background-color .16s ease;
        }
        .ucPill:hover{ transform: translateY(-1px); border-color: rgba(47,184,255,.26); background: rgba(255,255,255,.06); }
        .ucPillDot{
          width: 7px; height: 7px; border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), rgba(63,227,196,.85));
          box-shadow: 0 0 0 4px rgba(63,227,196,.10);
          flex: 0 0 auto;
        }

        /* CTA + toggle */
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

        /* Lang */
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

        /* Mobile overlay (same) */
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
          display:flex; flex-direction: column;
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

        .nav-sheetLink{
          display:flex; align-items:center; justify-content: space-between;
          padding: 12px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.04);
          text-decoration:none;
          color: rgba(255,255,255,.90);
          font-weight: 840;
        }
        .nav-sheetLink__left{ display:flex; align-items:center; gap: 10px; }
        .nav-sheetLink__ico{ opacity: .88; }
        .nav-sheetLink__chev{ opacity: .85; }
        .nav-sheetLink--contact{ background: rgba(47,184,255,.10); border-color: rgba(47,184,255,.22); }

        .nav-acc{ border: 1px solid rgba(255,255,255,.08); border-radius: 16px; background: rgba(255,255,255,.03); overflow:hidden; }
        .nav-acc__head{
          width:100%; display:flex; align-items:center; justify-content: space-between;
          padding: 12px 12px;
          border:0; background: transparent;
          color: rgba(255,255,255,.92);
          font-weight: 900;
          cursor:pointer;
        }
        .nav-acc__chev{ opacity: .78; transition: transform .18s ease; }
        .nav-acc__panel{
          display: grid;
          gap: 8px;
          padding: 0 12px 12px;
          max-height: 0;
          overflow: hidden;
          opacity: 0;
          transition: max-height .20s ease, opacity .20s ease;
        }
        .nav-acc__panel.is-open{ max-height: 520px; opacity: 1; }
        .nav-acc__item{
          display:flex; align-items:center; justify-content: space-between;
          text-decoration:none;
          padding: 10px 10px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.90);
          font-weight: 820;
        }
        .nav-acc__bullet{
          width: 8px; height: 8px; border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), rgba(47,184,255,.82));
          box-shadow: 0 0 0 4px rgba(47,184,255,.10);
          margin-right: 10px;
        }
        .nav-acc__text{ flex: 1; }
        .nav-acc__arrow{ opacity: .85; }

        @media (max-width: 920px){
          .header-mid{ display:none; }
          .nav-toggle{ display:inline-flex; }
          .nav-cta--desktopOnly{ display:none; }
          .nav-dd__panel{ display:none; }
        }
      `}</style>

      <div className="container header-inner header-grid">
        <div className="header-left">
          <Link to={`/${lang}`} className="brand-link" aria-label="NEOX" data-wg-notranslate>
            <img
              src="/image/neox-logo.png"
              alt="NEOX"
              width={148}
              height={44}
              loading="eager"
              decoding="async"
              draggable={false}
              style={{
                height: 28,
                width: "auto",
                maxWidth: "156px",
                objectFit: "contain",
                display: "block",
                userSelect: "none",
                filter: "drop-shadow(0 6px 16px rgba(0,0,0,.42)) drop-shadow(0 0 12px rgba(47,184,255,.08))",
                transform: "translateZ(0)",
              }}
            />
          </Link>
        </div>

        {/* ===== Desktop Nav ===== */}
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
                      {s.hint ? <span className="ddHint">{s.hint}</span> : null}
                    </span>
                  </span>
                  <span className="ddChev" aria-hidden="true">
                    <ChevronDown size={16} />
                  </span>
                </NavLink>
              ))}
            </div>
          </div>

          {/* SERVICES (compact list only) */}
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
                      <span className="ddHint">{s.hint}</span>
                    </span>
                  </span>
                  <span className="ddChev" aria-hidden="true">
                    <ChevronDown size={16} />
                  </span>
                </NavLink>
              ))}
            </div>
          </div>

          {/* USE CASES (same list; hologram appears only on hovered row, opens to the right, scrolls right->left) */}
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
              {t("nav.useCases")}
              <span className="nav-dd__chev" aria-hidden="true">
                <ChevronDown size={16} />
              </span>
            </button>

            <div className="nav-dd__panel" role="menu" aria-hidden={!ucOpen}>
              {SERVICES.map((s) => {
                const pills = USECASE_SCENARIOS_BY_SERVICE[s.id] ?? USECASE_SCENARIOS_BY_SERVICE["business-workflows"];
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={cx("ddRow", s.id === ucActiveSvc && "is-active")}
                    onMouseEnter={() => setUcActiveSvc(s.id)}
                    onFocus={() => setUcActiveSvc(s.id)}
                    onClick={() => {
                      setOpenMenu(null);
                      navigate(withLang(s.to));
                      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
                    }}
                    style={{ textAlign: "left", cursor: "pointer" }}
                  >
                    <span className="ddLeft">
                      <span className="ddDot" aria-hidden="true" />
                      <span className="ddText">
                        <span className="ddLabel">{s.label}</span>
                        <span className="ddHint">{s.hint}</span>
                      </span>
                    </span>
                    <span className="ddChev" aria-hidden="true">
                      <ChevronDown size={16} />
                    </span>

                    {/* ✅ mini hologram */}
                    <div className="ucFloat" aria-hidden={false}>
                      <div className="ucFloatTop">
                        <div className="ucFloatTitle">SCENARIOS</div>
                        <div className="ucFloatHint">hover → hologram</div>
                      </div>

                      <div className="ucStream">
                        <div className="ucScan" aria-hidden="true" />
                        <div className="ucFadeL" aria-hidden="true" />
                        <div className="ucFadeR" aria-hidden="true" />

                        <div className={cx("ucMarquee", prefersReduced && "is-reduced")}>
                          {pills.concat(pills).map((p, idx) => (
                            <NavLink
                              key={`${s.id}-${p.id}-${idx}`}
                              to={withLang(p.to)}
                              className="ucPill"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenu(null);
                              }}
                            >
                              <span className="ucPillDot" aria-hidden="true" />
                              <span>{p.label}</span>
                            </NavLink>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* quick access */}
              <NavLink
                to={withLang("/use-cases")}
                className="ddRow"
                role="menuitem"
                onClick={() => setOpenMenu(null)}
              >
                <span className="ddLeft">
                  <span className="ddDot" aria-hidden="true" />
                  <span className="ddText">
                    <span className="ddLabel">Open all Use Cases</span>
                    <span className="ddHint">Browse scenarios by industry</span>
                  </span>
                </span>
                <span className="ddChev" aria-hidden="true">
                  <ChevronDown size={16} />
                </span>
              </NavLink>
            </div>
          </div>

          {/* RESOURCES (compact list only) */}
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
                      {s.hint ? <span className="ddHint">{s.hint}</span> : null}
                    </span>
                  </span>
                  <span className="ddChev" aria-hidden="true">
                    <ChevronDown size={16} />
                  </span>
                </NavLink>
              ))}
            </div>
          </div>

          <NavLink to={withLang("/blog")} className={({ isActive }) => cx("nav-link", isActive && "is-active")}>
            {t("nav.blog")}
          </NavLink>
        </nav>

        {/* right */}
        <div className="header-right">
          <LangMenu lang={lang} onPick={switchLang} />

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
