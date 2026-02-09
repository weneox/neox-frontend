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
    c === "az" ? "Azərbaycan" : c === "tr" ? "Türk" : c === "en" ? "English" : c === "ru" ? "Русский" : "Español";

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

  // ✅ Use cases alt ssenarilər (4–5 hissə)
  const scenarioLinks: NavDef[] = useMemo(
    () => [
      { to: "/use-cases/healthcare", label: "Healthcare" },
      { to: "/use-cases/logistics", label: "Logistics" },
      { to: "/use-cases/finance", label: "Finance" },
      { to: "/use-cases/retail", label: "Retail" },
      // { to: "/use-cases/education", label: "Education" },
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

    // desktop üçün CSS var
    if (headerRef.current) headerRef.current.style.setProperty("--hdrp", String(p));

    // mobil üçün state-driven
    if (Math.abs(p - lastPRef.current) > 0.001) {
      lastPRef.current = p;
      setHdrp(p);
      setScrolled(p > 0.02);
    }
  }, []);

  // Scroll listener + rAF throttle (+ iOS fallback)
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

    const tick = window.setInterval(() => {
      schedule();
    }, 180);

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

  // Route dəyişən kimi menyu bağlansın
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

  // Body scroll lock
  useEffect(() => {
    const root = document.documentElement;
    const prev = root.style.overflow;
    if (open) root.style.overflow = "hidden";
    else root.style.overflow = "";
    return () => {
      root.style.overflow = prev;
    };
  }, [open]);

  // Soft open animation
  useEffect(() => {
    if (!open) {
      setSoftOpen(false);
      return;
    }
    const raf = requestAnimationFrame(() => setSoftOpen(true));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Desktop dropdown: click-outside
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

  // desktop dropdown open/close helpers (no flicker)
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

            // ✅ Mobil: Use cases → accordion
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

            // Default mobile link
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

  // ✅ Mobil blur / bg — desktop kimi davranış
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

  // ✅ Logo ölçüsü
  const logoH = isMobile ? 18 : 28;
  const logoMaxW = isMobile ? "124px" : "156px";

  // Active detection for desktop: treat /use-cases/* as active
  const isUseCasesActive = useMemo(() => {
    const p = location.pathname.toLowerCase();
    // expects /:lang/use-cases...
    return p.includes("/use-cases");
  }, [location.pathname]);

  return (
    <header
      ref={headerRef}
      style={headerInlineStyle}
      className={cx("site-header", introReady && "site-header--in", scrolled && "is-scrolled", open && "is-open")}
      data-top={scrolled ? "0" : "1"}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
.site-header a,
.site-header a:hover,
.site-header a:focus,
.site-header a:active{ text-decoration:none; }

/* Mobil layout */
@media (max-width: 920px){
  .site-header .header-grid{
    grid-template-columns: 1fr auto;
    column-gap: 10px;
    align-items:center;
  }
  .site-header .header-mid{ display:none !important; }

  .site-header .header-left{
    margin-left:-6px;
    display:flex;
    align-items:center;
  }
  .site-header .header-right{
    gap: 10px;
    align-items:center;
  }
  .site-header .nav-toggle{ margin-left: 2px; }
}

/* Brand */
.brand-link{
  display:inline-flex;
  align-items:center;
  justify-content:flex-start;
  padding: 4px 0;
  line-height:0;
  min-width:0;
}
@media (max-width: 920px){
  .brand-link{ max-width: calc(100vw - 176px); }
}
@media (max-width: 420px){
  .brand-link{ max-width: calc(100vw - 162px); }
}

.headerBrand{
  position:relative;
  display:inline-flex;
  align-items:center;
  justify-content:flex-start;
  padding:0;
  border:none;
  background:transparent;
  box-shadow:none;
  overflow:visible;
  -webkit-tap-highlight-color: transparent;
  max-width: 100%;
}

.headerBrand__aura{
  position:absolute;
  inset:-8px;
  pointer-events:none;
  background:
    radial-gradient(closest-side at 40% 50%, rgba(47,184,255,.10), transparent 65%),
    radial-gradient(closest-side at 70% 55%, rgba(42,125,255,.07), transparent 70%);
  opacity:.10;
  filter:blur(12px);
}

@media (max-width: 920px){
  img.headerBrand__img{
    height: 18px !important;
    width: auto !important;
    max-width: 124px !important;
    transform: translateY(1px) translateZ(0) !important;
  }
}

/* =========================
   Desktop "Use cases" dropdown (premium)
========================= */
.nav-dd{
  position: relative;
  display: inline-flex;
  align-items: center;
}

.nav-dd__btn{
  display:inline-flex;
  align-items:center;
  gap:8px;
  padding: 10px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(12,14,20,.35);
  color: rgba(255,255,255,.86);
  font: inherit;
  cursor: pointer;
  transition: transform .12s ease, background .12s ease, border-color .12s ease;
}
.site-header.is-scrolled .nav-dd__btn{ background: rgba(12,14,20,.55); }
.nav-dd__btn:hover{ background: rgba(16,18,26,.58); border-color: rgba(255,255,255,.16); transform: translateY(-1px); }
.nav-dd__btn.is-active{ border-color: rgba(47,184,255,.35); box-shadow: 0 0 0 3px rgba(47,184,255,.08); }
.nav-dd__chev{ opacity:.75; transition: transform .16s ease; }
.nav-dd.is-open .nav-dd__chev{ transform: rotate(180deg); }

.nav-dd__panel{
  position: absolute;
  top: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  width: 320px;
  padding: 10px;
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,.12);
  background:
    radial-gradient(900px 400px at 20% 0%, rgba(47,184,255,.12), transparent 60%),
    linear-gradient(180deg, rgba(10,12,18,.92), rgba(6,8,12,.90));
  box-shadow: 0 26px 90px rgba(0,0,0,.68);
  backdrop-filter: blur(18px) saturate(1.2);
  opacity: 0;
  pointer-events: none;
  translate: 0 -6px;
  transition: opacity .14s ease, translate .14s ease;
  z-index: 60;
}

.nav-dd.is-open .nav-dd__panel{
  opacity: 1;
  pointer-events: auto;
  translate: 0 0;
}

.nav-dd__title{
  padding: 8px 10px 10px;
  font-size: 11px;
  letter-spacing: .16em;
  text-transform: uppercase;
  color: rgba(255,255,255,.58);
}

.nav-dd__grid{
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.nav-dd__item{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap: 12px;
  padding: 12px 12px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.04);
  color: rgba(255,255,255,.88);
  transition: transform .12s ease, background .12s ease, border-color .12s ease;
}

.nav-dd__item:hover{
  transform: translateY(-1px);
  background: rgba(255,255,255,.06);
  border-color: rgba(47,184,255,.20);
}

.nav-dd__left{ display:flex; align-items:center; gap:10px; min-width:0; }
.nav-dd__dot{
  width: 8px; height: 8px; border-radius: 999px;
  background: rgba(47,184,255,.85);
  box-shadow: 0 0 0 3px rgba(47,184,255,.14), 0 0 22px rgba(47,184,255,.22);
  flex: 0 0 auto;
}
.nav-dd__label{
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.nav-dd__arrow{ opacity:.7; }

/* =========================
   Mobile accordion for scenarios
========================= */
.nav-acc{ margin: 6px 0; }
.nav-acc__head{
  width: 100%;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap: 12px;
  padding: 14px 14px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.04);
  color: rgba(255,255,255,.90);
  cursor:pointer;
}
.nav-acc__head:hover{ background: rgba(255,255,255,.06); }
.nav-acc__chev{ opacity:.8; transition: transform .16s ease; }
.nav-acc__head.is-open .nav-acc__chev{ transform: rotate(180deg); }

.nav-acc__panel{
  max-height: 0;
  overflow: hidden;
  transition: max-height .22s ease;
  margin-top: 8px;
}
.nav-acc__panel.is-open{
  max-height: 520px;
}

.nav-acc__item{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap: 12px;
  padding: 12px 14px;
  margin: 6px 0;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.09);
  background: rgba(10,12,18,.35);
  color: rgba(255,255,255,.88);
}
.nav-acc__item:hover{ background: rgba(10,12,18,.46); border-color: rgba(47,184,255,.18); }
.nav-acc__item.is-active{ border-color: rgba(47,184,255,.34); box-shadow: 0 0 0 3px rgba(47,184,255,.08); }
.nav-acc__bullet{
  width: 8px; height: 8px; border-radius: 999px;
  background: rgba(255,255,255,.35);
  box-shadow: 0 0 0 3px rgba(255,255,255,.08);
  flex: 0 0 auto;
}
.nav-acc__text{ flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.nav-acc__arrow{ opacity:.7; }
          `,
        }}
      />

      <div className="container header-inner header-grid">
        {/* LEFT */}
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
                    "drop-shadow(0 6px 16px rgba(0,0,0,.42)) drop-shadow(0 0 10px rgba(47,184,255,.06))",
                  transform: isMobile ? "translateY(1px) translateZ(0)" : "translateZ(0)",
                }}
              />
            </span>
          </Link>
        </div>

        {/* CENTER (Desktop nav) */}
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

            // ✅ Desktop dropdown for scenarios
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

        {/* RIGHT */}
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
