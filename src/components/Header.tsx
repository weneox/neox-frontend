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

/* ===== Desktop language dropdown (single button) ===== */
function LangMenu({ lang, onPick }: { lang: Lang; onPick: (l: Lang) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

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
    <div ref={rootRef} className={cx("langMenu", open && "is-open")} data-wg-notranslate>
      <button
        type="button"
        className="langMenu__btn"
        aria-label="Dil seçimi"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
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

/* =========================
   Header
========================= */
export default function Header({ introReady }: { introReady: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [hdrp, setHdrp] = useState(0); // mobil blur driver
  const [isMobile, setIsMobile] = useState(false);

  const [open, setOpen] = useState(false);
  const [softOpen, setSoftOpen] = useState(false);

  // Desktop dropdown state
  const [scDropOpen, setScDropOpen] = useState(false);
  const scDropCloseT = useRef<number | null>(null);
  const scDropRef = useRef<HTMLDivElement | null>(null);

  // Mobile accordion state
  const [mobileScOpen, setMobileScOpen] = useState(false);

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

  const links: NavDef[] = useMemo(
    () => [
      { to: "/", label: t("nav.home"), end: true },
      { to: "/about", label: t("nav.about") },
      { to: "/services", label: t("nav.services") },
      { to: "/use-cases", label: t("nav.useCases") },
      { to: "/blog", label: t("nav.blog") },
    ],
    [t]
  );

  // ✅ Use cases alt ssenarilər
  const scenarioLinks: NavDef[] = useMemo(
    () => [
      { to: "/use-cases/healthcare", label: "Healthcare" },
      { to: "/use-cases/logistics", label: "Logistics" },
      { to: "/use-cases/finance", label: "Finance" },
      { to: "/use-cases/retail", label: "Retail" },
      { to: "/use-cases/hotels", label: "Hotels & Resorts" }, // ✅ NEW
    ],
    []
  );

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

  useEffect(() => {
    setOpen(false);
    setSoftOpen(false);
    setScDropOpen(false);
    setMobileScOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeMobile();
        setScDropOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeMobile]);

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

  // click outside desktop dropdown
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const el = scDropRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setScDropOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  const navItem = ({ isActive }: { isActive: boolean }) => cx("nav-link", isActive && "is-active");

  const openScDrop = () => {
    if (scDropCloseT.current) {
      window.clearTimeout(scDropCloseT.current);
      scDropCloseT.current = null;
    }
    setScDropOpen(true);
  };
  const scheduleCloseScDrop = () => {
    if (scDropCloseT.current) window.clearTimeout(scDropCloseT.current);
    scDropCloseT.current = window.setTimeout(() => setScDropOpen(false), 120) as any;
  };

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
          {links.map((l, i) => {
            const isUseCases = l.to === "/use-cases";
            const Icon =
              l.to === "/"
                ? Home
                : l.to === "/about"
                ? Info
                : l.to === "/services"
                ? Sparkles
                : l.to === "/use-cases"
                ? Layers
                : BookOpen;

            if (isUseCases) {
              return (
                <div key={l.to} className={cx("nav-acc", "nav-stagger")} style={{ ["--i" as any]: i }}>
                  <button
                    type="button"
                    className={cx("nav-acc__head", mobileScOpen && "is-open")}
                    onClick={() => setMobileScOpen((v) => !v)}
                    aria-expanded={mobileScOpen}
                  >
                    <span className="nav-sheetLink__left">
                      <span className="nav-sheetLink__ico" aria-hidden="true">
                        <Icon size={18} />
                      </span>
                      <span className="nav-sheetLink__label">{l.label}</span>
                    </span>
                    <span className="nav-acc__chev" aria-hidden="true">
                      <ChevronDown size={16} />
                    </span>
                  </button>

                  <div className={cx("nav-acc__panel", mobileScOpen && "is-open")} aria-hidden={!mobileScOpen}>
                    {scenarioLinks.map((s) => (
                      <NavLink
                        key={s.to}
                        to={withLang(s.to)}
                        className={({ isActive }) => cx("nav-acc__item", isActive && "is-active")}
                        onClick={() => {
                          window.scrollTo({ top: 0, left: 0, behavior: "auto" });
                          closeMobile();
                        }}
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
              );
            }

            return (
              <NavLink
                key={l.to}
                to={withLang(l.to)}
                end={!!l.end}
                className={({ isActive }) => cx("nav-sheetLink", "nav-stagger", isActive && "is-active")}
                style={{ ["--i" as any]: i }}
                onClick={() => {
                  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
                  closeMobile();
                }}
              >
                <span className="nav-sheetLink__left">
                  <span className="nav-sheetLink__ico" aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <span className="nav-sheetLink__label">{l.label}</span>
                </span>
                <span className="nav-sheetLink__chev" aria-hidden="true">
                  →
                </span>
              </NavLink>
            );
          })}

          <NavLink
            to={withLang("/contact")}
            className={cx("nav-sheetLink", "nav-sheetLink--contact", "nav-stagger")}
            style={{ ["--i" as any]: links.length }}
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

  const isUseCasesActive = useMemo(() => {
    const p = location.pathname.toLowerCase();
    return p.includes("/use-cases");
  }, [location.pathname]);

  return (
    <header
      ref={headerRef}
      style={headerInlineStyle}
      className={cx("site-header", introReady && "site-header--in", scrolled && "is-scrolled", open && "is-open")}
      data-top={scrolled ? "0" : "1"}
    >
      {/* ✅ FULL CSS INJECT — yekun */}
      <style>{`
        :root{
          --hdrh: 72px;
          --hdrp: 0;
        }

        .site-header{
          position: sticky;
          top: 0;
          z-index: 1100;
          width: 100%;
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

        .container{
          max-width: 1180px;
          margin: 0 auto;
          padding: 0 18px;
        }

        .header-inner{
          height: var(--hdrh);
          display: grid;
          align-items: center;
        }

        .header-grid{
          grid-template-columns: auto 1fr auto;
          gap: 16px;
        }

        .header-left{ display:flex; align-items:center; }
        .header-mid{ display:flex; align-items:center; justify-content:center; gap: 10px; }
        .header-right{ display:flex; align-items:center; justify-content:flex-end; gap: 12px; }

        .brand-link{
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }

        .headerBrand{ position: relative; display:flex; align-items:center; }
        .headerBrand__aura{
          position:absolute;
          inset:-10px -16px;
          background:
            radial-gradient(120px 44px at 28% 60%, rgba(47,184,255,.16), transparent 60%),
            radial-gradient(120px 44px at 70% 40%, rgba(167,89,255,.12), transparent 62%);
          filter: blur(10px);
          opacity: .7;
          pointer-events:none;
        }

        /* Desktop links */
        .nav-link{
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 40px;
          padding: 0 12px;
          border-radius: 999px;
          text-decoration: none;
          color: rgba(255,255,255,.72);
          font-weight: 600;
          font-size: 13px;
          letter-spacing: .02em;
          transition: color .16s ease, background-color .16s ease, transform .16s ease;
        }
        .nav-link:hover{
          color: rgba(255,255,255,.90);
          background: rgba(255,255,255,.06);
        }
        .nav-link.is-active{
          color: rgba(255,255,255,.94);
          background: rgba(255,255,255,.09);
        }

        .nav-label--short{ display:none; }

        /* Use Cases dropdown */
        .nav-dd{ position: relative; display:inline-flex; }
        .nav-dd__btn{
          position: relative;
          display:inline-flex;
          align-items:center;
          gap: 8px;
          height: 40px;
          padding: 0 12px;
          border-radius: 999px;
          color: rgba(255,255,255,.72);
          background: transparent;
          border: 0;
          cursor: pointer;
          font: inherit;
          font-weight: 700;
          letter-spacing: .02em;
          transition: color .16s ease, background-color .16s ease;
        }
        .nav-dd__btn:hover{ color: rgba(255,255,255,.90); background: rgba(255,255,255,.06); }
        .nav-dd__btn.is-active{ color: rgba(255,255,255,.94); background: rgba(255,255,255,.09); }

        .nav-dd__chev{
          opacity: .8;
          transition: transform .14s ease;
        }
        .nav-dd.is-open .nav-dd__chev{ transform: rotate(180deg); }

        .nav-dd__panel{
          position:absolute;
          top: calc(100% + 10px);
          left: 50%;
          transform: translateX(-50%);
          width: 360px;
          border-radius: 18px;
          padding: 14px;
          border: 1px solid rgba(255,255,255,.10);
          background:
            radial-gradient(120% 90% at 20% 10%, rgba(47,184,255,.14), transparent 55%),
            radial-gradient(120% 90% at 90% 10%, rgba(167,89,255,.12), transparent 60%),
            rgba(10,12,18,.88);
          -webkit-backdrop-filter: blur(18px) saturate(1.25);
          backdrop-filter: blur(18px) saturate(1.25);
          box-shadow: 0 24px 80px rgba(0,0,0,.65);
          opacity: 0;
          pointer-events: none;
          transform-origin: top center;
          transform: translateX(-50%) translateY(-6px) scale(.98);
          transition: opacity .14s ease, transform .14s ease;
        }
        .nav-dd.is-open .nav-dd__panel{
          opacity: 1;
          pointer-events: auto;
          transform: translateX(-50%) translateY(0) scale(1);
        }
        .nav-dd__title{
          font-size: 11px;
          letter-spacing: .18em;
          color: rgba(255,255,255,.55);
          padding: 2px 6px 10px;
        }
        .nav-dd__grid{
          display:grid;
          gap: 8px;
        }
        .nav-dd__item{
          display:flex;
          align-items:center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 10px;
          border-radius: 14px;
          text-decoration:none;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.82);
          transition: background-color .14s ease, border-color .14s ease, transform .14s ease;
        }
        .nav-dd__item:hover{
          background: rgba(255,255,255,.06);
          border-color: rgba(255,255,255,.10);
          transform: translateY(-1px);
        }
        .nav-dd__item.is-active{
          background: rgba(47,184,255,.10);
          border-color: rgba(47,184,255,.22);
        }
        .nav-dd__left{ display:flex; align-items:center; gap: 10px; }
        .nav-dd__dot{
          width: 8px; height: 8px; border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), rgba(47,184,255,.85));
          box-shadow: 0 0 0 3px rgba(47,184,255,.10);
        }
        .nav-dd__label{ font-weight: 700; font-size: 13px; }
        .nav-dd__arrow{ opacity: .7; }

        /* CTA */
        .nav-cta{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          height: 38px;
          padding: 0 14px;
          border-radius: 999px;
          text-decoration:none;
          font-weight: 800;
          font-size: 13px;
          color: rgba(255,255,255,.92);
          border: 1px solid rgba(255,255,255,.10);
          background:
            radial-gradient(120% 120% at 20% 10%, rgba(47,184,255,.22), transparent 60%),
            rgba(255,255,255,.06);
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
        }
        .nav-cta:hover{ transform: translateY(-1px); border-color: rgba(255,255,255,.16); background: rgba(255,255,255,.08); }

        .nav-cta--desktopOnly{ display:inline-flex; }

        /* Hamburger */
        .nav-toggle{
          width: 44px;
          height: 40px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          display:none;
          align-items:center;
          justify-content:center;
          flex-direction: column;
          gap: 5px;
          cursor: pointer;
          transition: background-color .14s ease, border-color .14s ease, transform .14s ease;
        }
        .nav-toggle:hover{ transform: translateY(-1px); background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.14); }
        .nav-toggle__bar{
          width: 18px;
          height: 2px;
          border-radius: 999px;
          background: rgba(255,255,255,.86);
          opacity: .9;
        }

        /* Lang menu */
        .langMenu{ position: relative; }
        .langMenu__btn{
          display:inline-flex;
          align-items:center;
          gap: 8px;
          height: 38px;
          padding: 0 10px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.86);
          font-weight: 800;
          font-size: 12px;
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
          position:absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 210px;
          border-radius: 16px;
          padding: 10px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(10,12,18,.90);
          -webkit-backdrop-filter: blur(18px) saturate(1.2);
          backdrop-filter: blur(18px) saturate(1.2);
          box-shadow: 0 24px 80px rgba(0,0,0,.65);
          opacity: 0;
          pointer-events: none;
          transform: translateY(-6px) scale(.98);
          transition: opacity .14s ease, transform .14s ease;
        }
        .langMenu.is-open .langMenu__panel{
          opacity: 1;
          pointer-events: auto;
          transform: translateY(0) scale(1);
        }
        .langMenu__item{
          width: 100%;
          display:flex;
          align-items:center;
          justify-content: space-between;
          gap: 10px;
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

        /* Mobile overlay */
        .nav-overlay{
          position: fixed;
          inset: 0;
          z-index: 2000;
          opacity: 0;
          pointer-events: none;
          transition: opacity .16s ease;
        }
        .nav-overlay.is-mounted{ display:block; }
        .nav-overlay.is-open{ opacity: 1; pointer-events: auto; }
        .nav-overlay__backdrop{
          position:absolute;
          inset:0;
          border:0;
          background: rgba(0,0,0,.45);
          -webkit-backdrop-filter: blur(8px);
          backdrop-filter: blur(8px);
          cursor: pointer;
        }

        .nav-sheet{
          position:absolute;
          top: 12px;
          right: 12px;
          left: 12px;
          max-width: 520px;
          margin-left: auto;
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,.10);
          overflow: hidden;
          transform: translateY(-10px) scale(.985);
          opacity: .0;
          transition: transform .16s ease, opacity .16s ease;
        }
        .nav-sheet.is-open{
          transform: translateY(0) scale(1);
          opacity: 1;
        }
        .nav-sheet__bg{
          position:absolute;
          inset:0;
          background:
            radial-gradient(120% 90% at 20% 0%, rgba(47,184,255,.16), transparent 55%),
            radial-gradient(120% 90% at 90% 0%, rgba(167,89,255,.14), transparent 60%),
            rgba(10,12,18,.92);
          -webkit-backdrop-filter: blur(18px) saturate(1.25);
          backdrop-filter: blur(18px) saturate(1.25);
        }
        .nav-sheet__noise{
          position:absolute;
          inset:0;
          opacity: .06;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E");
          background-size: 160px 160px;
          pointer-events:none;
          mix-blend-mode: overlay;
        }

        .nav-sheet__head{
          position: relative;
          z-index: 2;
          display:flex;
          align-items:center;
          justify-content: space-between;
          padding: 14px 14px 10px;
        }
        .nav-sheet__brand{
          display:flex;
          align-items:center;
          gap: 10px;
        }
        .nav-sheet__dot{
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), rgba(47,184,255,.85));
          box-shadow: 0 0 0 4px rgba(47,184,255,.10);
        }
        .nav-sheet__title{
          font-weight: 900;
          letter-spacing: .18em;
          font-size: 11px;
          color: rgba(255,255,255,.70);
        }
        .nav-sheet__close{
          width: 40px;
          height: 38px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.05);
          color: rgba(255,255,255,.88);
          display:flex;
          align-items:center;
          justify-content:center;
          cursor: pointer;
          transition: transform .14s ease, background-color .14s ease;
        }
        .nav-sheet__close:hover{ transform: translateY(-1px); background: rgba(255,255,255,.07); }

        .nav-sheet__list{
          position: relative;
          z-index: 2;
          padding: 8px 14px 14px;
          display:grid;
          gap: 10px;
        }

        .nav-stagger{
          transform: translateY(6px);
          opacity: 0;
          animation: navIn .24s ease forwards;
          animation-delay: calc(0.03s * var(--i, 0));
        }
        @keyframes navIn{
          to{ transform: translateY(0); opacity: 1; }
        }

        .nav-sheetLink{
          display:flex;
          align-items:center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 12px;
          border-radius: 16px;
          text-decoration:none;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.84);
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
        }
        .nav-sheetLink:hover{
          transform: translateY(-1px);
          background: rgba(255,255,255,.06);
          border-color: rgba(255,255,255,.12);
        }
        .nav-sheetLink.is-active{
          background: rgba(47,184,255,.10);
          border-color: rgba(47,184,255,.22);
        }

        .nav-sheetLink__left{ display:flex; align-items:center; gap: 10px; min-width: 0; }
        .nav-sheetLink__ico{
          width: 32px; height: 32px;
          display:flex;
          align-items:center;
          justify-content:center;
          border-radius: 12px;
          background: rgba(255,255,255,.05);
          border: 1px solid rgba(255,255,255,.07);
          flex: 0 0 auto;
        }
        .nav-sheetLink__label{
          font-weight: 800;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .nav-sheetLink__chev{ opacity: .75; }

        .nav-sheetLink--contact{
          background:
            radial-gradient(120% 120% at 20% 10%, rgba(47,184,255,.22), transparent 60%),
            rgba(255,255,255,.05);
          border-color: rgba(255,255,255,.12);
        }

        /* Mobile accordion for use-cases */
        .nav-acc{ border-radius: 18px; overflow:hidden; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.03); }
        .nav-acc__head{
          width: 100%;
          border:0;
          background: transparent;
          display:flex;
          align-items:center;
          justify-content: space-between;
          padding: 12px 12px;
          cursor:pointer;
          color: rgba(255,255,255,.86);
        }
        .nav-acc__chev{ opacity: .75; transition: transform .14s ease; }
        .nav-acc__head.is-open .nav-acc__chev{ transform: rotate(180deg); }
        .nav-acc__panel{
          display:grid;
          gap: 8px;
          padding: 0 12px 12px;
          max-height: 0;
          overflow: hidden;
          transition: max-height .18s ease;
        }
        .nav-acc__panel.is-open{ max-height: 520px; }
        .nav-acc__item{
          display:flex;
          align-items:center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 10px;
          border-radius: 14px;
          text-decoration:none;
          border: 1px solid rgba(255,255,255,.06);
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

        /* Responsive */
        @media (max-width: 920px){
          .header-grid{ grid-template-columns: auto 1fr auto; }
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
          {links.map((l) => {
            const isUseCases = l.to === "/use-cases";
            if (!isUseCases) {
              return (
                <NavLink key={l.to} to={withLang(l.to)} end={!!l.end} className={navItem}>
                  <span className="nav-label nav-label--full">{l.label}</span>
                  <span className="nav-label nav-label--short">{l.label}</span>
                </NavLink>
              );
            }

            return (
              <div
                key={l.to}
                ref={scDropRef}
                className={cx("nav-dd", scDropOpen && "is-open")}
                onMouseEnter={openScDrop}
                onMouseLeave={scheduleCloseScDrop}
              >
                <button
                  type="button"
                  className={cx("nav-dd__btn", (isUseCasesActive || scDropOpen) && "is-active")}
                  aria-haspopup="menu"
                  aria-expanded={scDropOpen}
                  onClick={() => setScDropOpen((v) => !v)}
                  onFocus={openScDrop}
                >
                  <span className="nav-label nav-label--full">{l.label}</span>
                  <span className="nav-label nav-label--short">{l.label}</span>
                  <span className="nav-dd__chev" aria-hidden="true">
                    <ChevronDown size={16} />
                  </span>
                </button>

                <div className="nav-dd__panel" role="menu" aria-hidden={!scDropOpen}>
                  <div className="nav-dd__title">SCENARIOS</div>
                  <div className="nav-dd__grid">
                    {scenarioLinks.map((s) => (
                      <NavLink
                        key={s.to}
                        to={withLang(s.to)}
                        className={({ isActive }) => cx("nav-dd__item", isActive && "is-active")}
                        role="menuitem"
                        onClick={() => {
                          setScDropOpen(false);
                          window.scrollTo({ top: 0, left: 0, behavior: "auto" });
                        }}
                      >
                        <span className="nav-dd__left">
                          <span className="nav-dd__dot" aria-hidden="true" />
                          <span className="nav-dd__label">{s.label}</span>
                        </span>
                        <span className="nav-dd__arrow" aria-hidden="true">
                          →
                        </span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
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
