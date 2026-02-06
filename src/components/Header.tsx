// src/components/Header.tsx
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { X, Home, Info, Sparkles, Layers, BookOpen, PhoneCall } from "lucide-react";
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

export default function Header({ introReady }: { introReady: boolean }) {
  const [scrolled, setScrolled] = useState(false);

  const [open, setOpen] = useState(false);
  const [softOpen, setSoftOpen] = useState(false);

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
    if (sc === window)
      y = window.scrollY || document.documentElement.scrollTop || (document.body && document.body.scrollTop) || 0;
    else y = (sc as HTMLElement).scrollTop || 0;

    const p = clamp01(y / 180);

    // ✅ həm desktop, həm mobil eyni effekt üçün: scroll progress CSS var
    if (headerRef.current) headerRef.current.style.setProperty("--hdrp", String(p));

    if (Math.abs(p - lastPRef.current) > 0.002) {
      lastPRef.current = p;
      setScrolled(p > 0.02);
    }
  }, []);

  // Scroll listener + rAF throttle
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

    const sc = scrollElRef.current;
    if (sc && sc !== window) (sc as HTMLElement).addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("resize", onResize as any);
      window.removeEventListener("scroll", onScroll as any);
      if (sc && sc !== window) (sc as HTMLElement).removeEventListener("scroll", onScroll as any);

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
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMobile();
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

  const navItem = ({ isActive }: { isActive: boolean }) => cx("nav-link", isActive && "is-active");

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

  return (
    <header
      ref={headerRef}
      className={cx(
        "site-header",
        introReady && "site-header--in",
        scrolled && "is-scrolled",
        open && "is-open",
        !scrolled && "is-top" // ✅ yuxarıda olanda (hero)
      )}
      data-top={scrolled ? "0" : "1"}
    >
      {/* ✅ Mobil-də də: yuxarıda şəffaf, aşağıda blur glass */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
/* link underline off */
.site-header a,
.site-header a:hover,
.site-header a:focus,
.site-header a:active{ text-decoration:none; }

/* Layout vars (logo ölçüsü sən bəyəndiyin kimi saxlanıldı) */
.site-header{
  --logoH: 28px;   /* desktop */
  --hdrPadY: 16px;
  --hdrPadX: 14px;

  /* scroll progress var: 0 (top) → 1 (scrolled) */
  --hdrp: 0;

  /* glass tuning */
  --glassA: calc(.00 + (var(--hdrp) * .70));  /* overlay opacity */
  --blur:  calc(0px + (var(--hdrp) * 12px));  /* blur */
  --sat:   calc(100% + (var(--hdrp) * 55%));  /* saturation */
  --bdA:   calc(.00 + (var(--hdrp) * .16));   /* border alpha */
}

/* Mobil logo ölçüsü (bəyəndiyin kimi) */
@media (max-width: 920px){
  .site-header{
    --logoH: 18px;
    --hdrPadY: 8px;
    --hdrPadX: 10px;
  }
}
@media (max-width: 380px){
  .site-header{
    --logoH: 16px;
    --hdrPadY: 7px;
    --hdrPadX: 8px;
  }
}

/* Header inner padding */
.site-header .header-inner{
  padding-top: var(--hdrPadY);
  padding-bottom: var(--hdrPadY);
  padding-left: var(--hdrPadX);
  padding-right: var(--hdrPadX);
}

/* ✅ GLASS BACKGROUND (mobil+desktop eyni) */
.site-header{
  position: sticky;
  top: 0;
  z-index: 60;
  background: rgba(0,0,0, var(--glassA)); /* topda 0, scroll-da artır */
  -webkit-backdrop-filter: blur(var(--blur)) saturate(var(--sat));
  backdrop-filter: blur(var(--blur)) saturate(var(--sat));
  border-bottom: 1px solid rgba(255,255,255, var(--bdA));
  transition: background .18s ease, border-color .18s ease, -webkit-backdrop-filter .18s ease, backdrop-filter .18s ease;
}

/* Top state: tam şəffaf + border yox (hero üstündə) */
.site-header.is-top{
  background: rgba(0,0,0,0);
  border-bottom-color: rgba(255,255,255,0);
  -webkit-backdrop-filter: blur(0px) saturate(100%);
  backdrop-filter: blur(0px) saturate(100%);
}

/* LEFT align */
.site-header .header-left{
  display:flex;
  align-items:flex-start;
  justify-content:flex-start;
}

/* Brand link */
.brand-link{
  display:inline-flex;
  align-items:flex-start;
  justify-content:flex-start;
  padding: 2px 0;
  line-height:0;
  max-width: 55vw;
}

/* Logo wrap */
.headerBrand{
  position:relative;
  display:inline-flex;
  align-items:flex-start;
  justify-content:flex-start;
  padding:0;
  border-radius:0;
  border:none;
  background:transparent;
  box-shadow:none;
  overflow:visible;
  transform:translateY(0);
  transition:transform .18s ease;
  -webkit-tap-highlight-color: transparent;
}
.headerBrand:hover{ transform:translateY(-1px); }

/* aura */
.headerBrand__aura{
  position:absolute;
  inset:-10px;
  pointer-events:none;
  background:
    radial-gradient(closest-side at 40% 50%, rgba(47,184,255,.08), transparent 65%),
    radial-gradient(closest-side at 70% 55%, rgba(42,125,255,.06), transparent 70%);
  opacity:.14;
  filter:blur(14px);
  transition:opacity .18s ease;
}
.headerBrand:hover .headerBrand__aura{ opacity:.20; }

@media (max-width: 920px){
  .headerBrand__aura{
    inset:-6px;
    filter:blur(10px);
    opacity:.10;
  }
  .headerBrand:hover .headerBrand__aura{ opacity:.13; }
}

.headerBrand__glint{ display:none !important; }

/* ✅ force logo size */
.headerBrand__img{
  display:block !important;
  height: var(--logoH) !important;
  max-height: var(--logoH) !important;
  width:auto !important;
  max-width: 150px !important;
  object-fit:contain !important;
  user-select:none !important;
  transform:translateZ(0) !important;
  filter:
    drop-shadow(0 6px 16px rgba(0,0,0,.42))
    drop-shadow(0 0 10px rgba(47,184,255,.05));
}
@media (max-width: 920px){
  .headerBrand__img{ max-width: 120px !important; }
}
@media (max-width: 380px){
  .headerBrand__img{ max-width: 105px !important; }
}

/* right spacing */
@media (max-width: 920px){
  .site-header .header-right{ gap: 10px; }
  .site-header .nav-toggle{ margin-left: 2px; }
  .site-header .langMenu__btn{ padding: 8px 10px; }
}

@media (prefers-reduced-motion:reduce){
  .site-header{ transition:none !important; }
  .headerBrand,
  .headerBrand__aura{ transition:none !important; }
}
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
              />
            </span>
          </Link>
        </div>

        {/* CENTER */}
        <nav className="header-mid" aria-label="Əsas menyu">
          {links.map((l) => (
            <NavLink key={l.to} to={withLang(l.to)} end={!!l.end} className={navItem}>
              <span className="nav-label nav-label--full">{l.label}</span>
              <span className="nav-label nav-label--short">{l.label}</span>
            </NavLink>
          ))}
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
