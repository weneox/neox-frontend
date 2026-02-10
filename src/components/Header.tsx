// src/components/Header.tsx
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { ChevronDown, X, Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LANGS, DEFAULT_LANG, type Lang } from "../i18n/lang";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

type MenuKey = "services" | "usecases" | "resources" | "lang" | null;

function isLang(x: string | undefined | null): x is Lang {
  return !!x && (LANGS as readonly string[]).includes(x as any);
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

type ItemDef = { id: string; label: string; to: string };

function langFullName(c: Lang) {
  switch (c) {
    case "az":
      return "Azərbaycan";
    case "tr":
      return "Türk";
    case "ru":
      return "Русский";
    case "en":
      return "English";
    case "es":
      return "Español";
    default:
      return c.toUpperCase();
  }
}

/** ResizeObserver safe helper */
function useStableHeaderHeight(headerRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    let last = -1;
    const apply = () => {
      const h = Math.round(el.getBoundingClientRect().height || 72);
      if (h !== last) {
        last = h;
        document.documentElement.style.setProperty("--hdrh", `${h}px`);
      }
    };

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    window.addEventListener("resize", apply, { passive: true });

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", apply as any);
    };
  }, [headerRef]);
}

export default function Header({ introReady }: { introReady: boolean }) {
  const reduced = usePrefersReducedMotion();

  const { i18n, t } = useTranslation();
  const { lang: paramLang } = useParams<{ lang?: string }>();
  const lang: Lang = isLang(paramLang) ? (paramLang as Lang) : DEFAULT_LANG;

  const location = useLocation();
  const navigate = useNavigate();
  const panelId = useId();

  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const headerRef = useRef<HTMLElement | null>(null);
  useStableHeaderHeight(headerRef);

  // scroll blur progress
  const [scrolled, setScrolled] = useState(false);

  // desktop dropdown open state (single)
  const [openMenu, setOpenMenu] = useState<MenuKey>(null);

  // hover open/close timers (smooth + fps-safe)
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  // mobile overlay
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSoft, setMobileSoft] = useState(false);

  // mobile accordions
  const [mSvc, setMSvc] = useState(false);
  const [mUc, setMUc] = useState(false);
  const [mRes, setMRes] = useState(false);

  const svcRef = useRef<HTMLDivElement | null>(null);
  const ucRef = useRef<HTMLDivElement | null>(null);
  const resRef = useRef<HTMLDivElement | null>(null);
  const langRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMounted(true), []);

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

  const SERVICES: ItemDef[] = useMemo(
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

  const USECASES: ItemDef[] = useMemo(
    () => [
      { id: "healthcare", label: "Healthcare", to: "/use-cases/healthcare" },
      { id: "logistics", label: "Logistics", to: "/use-cases/logistics" },
      { id: "finance", label: "Finance", to: "/use-cases/finance" },
      { id: "retail", label: "Retail", to: "/use-cases/retail" },
      { id: "hotels", label: "Hotels & Resorts", to: "/use-cases/hotels" },
    ],
    []
  );

  const RESOURCES: ItemDef[] = useMemo(
    () => [
      { id: "blog", label: t("nav.blog") || "Blog", to: "/blog" },
      { id: "contact", label: t("nav.contact") || "Contact", to: "/contact" },
    ],
    [t]
  );

  // scroll blur with css var --hdrp (RAF)
  useEffect(() => {
    let raf = 0;
    let prevOn = false;

    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY || document.documentElement.scrollTop || 0;
        const p = Math.max(0, Math.min(1, y / 220));
        if (headerRef.current) headerRef.current.style.setProperty("--hdrp", String(p));
        const on = p > 0.02;
        if (on !== prevOn) {
          prevOn = on;
          setScrolled(on);
        }
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

  // close on route change
  useEffect(() => {
    setOpenMenu(null);
    setMobileOpen(false);
    setMobileSoft(false);
    setMSvc(false);
    setMUc(false);
    setMRes(false);
  }, [location.pathname, location.search]);

  // lock body scroll for mobile overlay
  useEffect(() => {
    const root = document.documentElement;
    const prev = root.style.overflow;
    if (mobileOpen) root.style.overflow = "hidden";
    else root.style.overflow = "";
    return () => {
      root.style.overflow = prev;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) {
      setMobileSoft(false);
      return;
    }
    const r = requestAnimationFrame(() => setMobileSoft(true));
    return () => cancelAnimationFrame(r);
  }, [mobileOpen]);

  // click outside desktop dropdowns
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!openMenu) return;
      const target = e.target as Node;

      const map: Record<Exclude<MenuKey, null>, React.RefObject<HTMLDivElement>> = {
        services: svcRef,
        usecases: ucRef,
        resources: resRef,
        lang: langRef,
      };

      const wrap = map[openMenu]?.current;
      if (!wrap) return;
      if (!wrap.contains(target)) setOpenMenu(null);
    };

    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [openMenu]);

  const clearTimers = () => {
    if (openTimer.current) window.clearTimeout(openTimer.current);
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  };

  const openDrop = (k: Exclude<MenuKey, null>) => {
    // only one open at once
    clearTimers();
    openTimer.current = window.setTimeout(() => setOpenMenu(k), 20) as any;
  };

  const scheduleClose = (k: Exclude<MenuKey, null>) => {
    clearTimers();
    closeTimer.current = window.setTimeout(() => {
      setOpenMenu((cur) => (cur === k ? null : cur));
    }, 110) as any;
  };

  const closeMobile = () => {
    setMobileSoft(false);
    window.setTimeout(() => setMobileOpen(false), 160);
  };

  const isActivePath = (needle: string) => location.pathname.toLowerCase().includes(needle);

  /** ✅ Ultra-minimal “book” dropdown: only labels, panel same width as trigger */
  const MiniListPanel = ({ items, k }: { items: ItemDef[]; k: Exclude<MenuKey, null> }) => (
    <div className="miniPanel" role="menu" aria-hidden={openMenu !== k}>
      {items.map((it) => (
        <NavLink
          key={it.id}
          to={withLang(it.to)}
          role="menuitem"
          className={({ isActive }) => cx("miniItem", isActive && "is-active")}
          onClick={() => setOpenMenu(null)}
        >
          <span className="miniItem__txt">{it.label}</span>
          <span className="miniItem__arr" aria-hidden="true">
            →
          </span>
        </NavLink>
      ))}
    </div>
  );

  const LangPanel = (
    <div className="langPanel" role="menu" aria-label="Language menu" aria-hidden={openMenu !== "lang"}>
      {LANGS.map((code) => (
        <button
          key={code}
          type="button"
          role="menuitem"
          className={cx("langItem", code === lang && "is-active")}
          onClick={() => {
            switchLang(code);
            setOpenMenu(null);
          }}
        >
          <span className="langItem__code">{code.toUpperCase()}</span>
          <span className="langItem__name">{langFullName(code)}</span>
        </button>
      ))}
    </div>
  );

  const headerNode = (
    <header ref={headerRef} className={cx("luxHdr", introReady && "luxHdr--in", scrolled && "is-scrolled", mobileOpen && "is-open")}>
      <style>{`
        :root{ --hdrh: 72px; --hdrp: 0; }

        /* hard rules */
        .luxHdr, .luxHdr *{ box-sizing:border-box; }
        .luxHdr a, .luxHdr a:hover, .luxHdr a:focus, .luxHdr a:active{ text-decoration:none !important; }
        .luxHdr a{ color: inherit; }
        .luxHdr :focus-visible{ outline:none; box-shadow: 0 0 0 3px rgba(120,170,255,.18); border-radius: 14px; }

        /* ===== Header shell ===== */
        .luxHdr{
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 1200;
          width: 100%;
          background: rgba(10,12,18,0.02);
          border-bottom: 1px solid rgba(255,255,255,0.03);
          transform: translateZ(0);
          will-change: background-color, border-color, backdrop-filter;
          transition: background-color .20s ease, border-color .20s ease;
        }
        /* top = transparent; scroll = blur */
        .luxHdr.is-scrolled{
          background: rgba(10,12,18, calc(0.06 + 0.30 * var(--hdrp)));
          border-bottom-color: rgba(255,255,255, calc(0.05 + 0.07 * var(--hdrp)));
          -webkit-backdrop-filter: blur(calc(10px + 14px * var(--hdrp))) saturate(1.12);
          backdrop-filter: blur(calc(10px + 14px * var(--hdrp))) saturate(1.12);
        }
        /* when mobile open, lock to solid */
        .luxHdr.is-open{
          background: rgba(10,12,18,.92);
          border-bottom-color: rgba(255,255,255,.12);
          -webkit-backdrop-filter: blur(18px) saturate(1.16);
          backdrop-filter: blur(18px) saturate(1.16);
        }

        .luxC{ max-width: 1180px; margin: 0 auto; padding: 0 18px; }
        .luxI{
          height: var(--hdrh);
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 14px;
        }
        .luxL{ display:flex; align-items:center; min-width:0; }
        .luxM{ flex: 1 1 auto; display:flex; align-items:center; justify-content:center; gap: 14px; min-width:0; }
        .luxR{ display:flex; align-items:center; justify-content:flex-end; gap: 12px; }

        /* Brand (elite, minimal) */
        .luxBrand{
          display:inline-flex; align-items:center;
          padding: 10px 10px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.03);
          transition: transform .16s ease, background-color .16s ease, border-color .16s ease;
        }
        .luxBrand:hover{ transform: translateY(-1px); background: rgba(255,255,255,.05); border-color: rgba(255,255,255,.12); }

        /* Top nav buttons */
        .luxTop{
          position: relative;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          height: 40px;
          padding: 0 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0);
          background: transparent;
          color: rgba(255,255,255,.76);
          font-weight: 860;
          font-size: 13px;
          letter-spacing: .02em;
          cursor: pointer;
          user-select:none;
          transition: color .16s ease, background-color .16s ease, border-color .16s ease, transform .16s ease;
        }
        .luxTop:hover{ color: rgba(255,255,255,.93); background: rgba(255,255,255,.05); border-color: rgba(255,255,255,.06); transform: translateY(-1px); }
        .luxTop.is-active{ color: rgba(255,255,255,.96); background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.10); }

        .luxChev{ opacity:.78; transition: transform .16s ease; }
        .luxDD.is-open .luxChev{ transform: rotate(180deg); }

        /* Dropdown wrapper (panel width = trigger width) */
        .luxDD{ position: relative; display:inline-flex; }

        .luxPanelWrap{
          position:absolute;
          top: calc(100% + 10px);
          left: 0;
          width: 100%;
          min-width: 0;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(10,12,18,.90);
          -webkit-backdrop-filter: blur(18px) saturate(1.12);
          backdrop-filter: blur(18px) saturate(1.12);
          box-shadow: 0 24px 90px rgba(0,0,0,.70);
          transform-origin: top left;
          opacity: 0;
          pointer-events:none;
          transform: translateY(-8px) scale(.985);
          transition: opacity .16s ease, transform .16s ease;
          overflow:hidden;
        }
        /* “book-like” open animation */
        .luxDD.is-open .luxPanelWrap{
          opacity: 1;
          pointer-events:auto;
          transform: translateY(0) scale(1);
        }

        /* Mini panel items (no descriptions, no extra blocks) */
        .miniPanel{ padding: 8px; display:grid; gap: 6px; }
        .miniItem{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 10px;
          padding: 10px 10px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.03);
          color: rgba(255,255,255,.90);
          font-weight: 900;
          font-size: 13px;
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
          will-change: transform;
        }
        .miniItem:hover{ transform: translateY(-1px); background: rgba(255,255,255,.05); border-color: rgba(255,255,255,.10); }
        .miniItem.is-active{
          background: rgba(120,170,255,.10);
          border-color: rgba(120,170,255,.22);
        }
        .miniItem__arr{ opacity:.70; font-weight: 950; }

        /* Right side language */
        .langWrap{ position: relative; display:inline-flex; }
        .langBtn{
          display:inline-flex; align-items:center; gap: 8px;
          height: 40px;
          padding: 0 10px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.88);
          font-weight: 900;
          font-size: 12px;
          cursor:pointer;
          transition: transform .16s ease, background-color .16s ease, border-color .16s ease;
        }
        .langBtn:hover{ transform: translateY(-1px); background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.14); }
        .langDot{
          width: 8px; height: 8px; border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), rgba(120,170,255,.85));
          box-shadow: 0 0 0 3px rgba(120,170,255,.10);
        }
        .langCode{ letter-spacing: .12em; }

        .langPanel{
          position:absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 220px;
          padding: 10px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(10,12,18,.90);
          -webkit-backdrop-filter: blur(18px) saturate(1.12);
          backdrop-filter: blur(18px) saturate(1.12);
          box-shadow: 0 24px 90px rgba(0,0,0,.70);
          opacity: 0;
          pointer-events:none;
          transform: translateY(-8px) scale(.985);
          transform-origin: top right;
          transition: opacity .16s ease, transform .16s ease;
        }
        .luxDD.is-open .langPanel{ opacity:1; pointer-events:auto; transform: translateY(0) scale(1); }

        .langItem{
          width: 100%;
          display:flex; align-items:center; justify-content:space-between;
          gap: 10px;
          padding: 10px 10px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.03);
          color: rgba(255,255,255,.90);
          cursor:pointer;
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
          font-weight: 900;
        }
        .langItem + .langItem{ margin-top: 8px; }
        .langItem:hover{ transform: translateY(-1px); background: rgba(255,255,255,.05); border-color: rgba(255,255,255,.10); }
        .langItem.is-active{ background: rgba(120,170,255,.10); border-color: rgba(120,170,255,.22); }
        .langItem__code{ letter-spacing: .12em; opacity: .92; }
        .langItem__name{ opacity: .80; font-weight: 850; }

        /* Mobile */
        .burger{
          width: 46px; height: 40px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.88);
          display:none;
          align-items:center;
          justify-content:center;
          cursor:pointer;
          transition: transform .16s ease, background-color .16s ease, border-color .16s ease;
        }
        .burger:hover{ transform: translateY(-1px); background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.14); }

        .mOv{ position: fixed; inset: 0; z-index: 2200; opacity: 0; pointer-events: none; transition: opacity .16s ease; }
        .mOv.is-mounted{ display:block; }
        .mOv.is-open{ opacity: 1; pointer-events: auto; }
        .mBg{
          position:absolute; inset:0; border:0;
          background: rgba(0,0,0,.46);
          -webkit-backdrop-filter: blur(8px);
          backdrop-filter: blur(8px);
        }
        .mSheet{
          position:absolute; top: 12px; right: 12px; left: 12px;
          max-width: 520px; margin-left: auto;
          border-radius: 22px; border: 1px solid rgba(255,255,255,.10);
          overflow:hidden;
          transform: translateY(-10px) scale(.985);
          opacity: 0;
          transition: transform .16s ease, opacity .16s ease;
          background: rgba(10,12,18,.92);
          -webkit-backdrop-filter: blur(18px) saturate(1.12);
          backdrop-filter: blur(18px) saturate(1.12);
          box-shadow: 0 28px 90px rgba(0,0,0,.70);
        }
        .mSheet.is-open{ transform: translateY(0) scale(1); opacity: 1; }

        .mHead{
          display:flex; align-items:center; justify-content: space-between;
          padding: 14px 14px 10px;
          border-bottom: 1px solid rgba(255,255,255,.06);
        }
        .mTitle{
          font-weight: 950; letter-spacing: .18em; font-size: 11px; color: rgba(255,255,255,.70);
          display:flex; align-items:center; gap: 10px;
        }
        .mDot{
          width: 10px; height: 10px; border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), rgba(120,170,255,.85));
          box-shadow: 0 0 0 4px rgba(120,170,255,.10);
        }
        .mClose{
          width: 44px; height: 40px; border-radius: 14px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.05);
          color: rgba(255,255,255,.88);
          display:flex; align-items:center; justify-content:center;
          cursor: pointer;
          transition: transform .14s ease, background-color .14s ease;
        }
        .mClose:hover{ transform: translateY(-1px); background: rgba(255,255,255,.07); }

        .mBody{ padding: 12px 14px 14px; display:grid; gap: 10px; }

        .mRow{
          display:flex; align-items:center; justify-content: space-between; gap: 10px;
          padding: 12px 12px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.88);
          font-weight: 900;
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
        }
        .mRow:hover{ transform: translateY(-1px); background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.12); }

        .mAcc{
          border-radius: 18px;
          overflow:hidden;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.03);
        }
        .mAccHead{
          width:100%;
          display:flex; align-items:center; justify-content: space-between; gap: 10px;
          padding: 12px 12px;
          border:0; background: transparent;
          color: rgba(255,255,255,.90);
          cursor:pointer;
          font-weight: 950;
        }
        .mAccPanel{
          padding: 0 12px 12px;
          display:grid;
          gap: 8px;
          max-height: 0;
          overflow: hidden;
          transition: max-height .18s ease;
        }
        .mAccPanel.is-open{ max-height: 520px; }
        .mAccItem{
          display:flex; align-items:center; justify-content: space-between; gap: 10px;
          padding: 10px 10px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.86);
          font-weight: 900;
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
        }
        .mAccItem:hover{ transform: translateY(-1px); background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.10); }

        @media (max-width: 920px){
          .luxM{ display:none; }
          .burger{ display:inline-flex; }
        }
        @media (max-width: 520px){
          .luxC{ padding: 0 14px; }
        }

        /* Reduced motion: no transform animation */
        @media (prefers-reduced-motion: reduce){
          .luxTop, .luxBrand, .langBtn, .miniItem, .langItem, .burger, .mRow, .mAccItem{
            transition: none !important;
          }
          .luxPanelWrap, .langPanel, .mOv, .mSheet{
            transition: none !important;
          }
        }
      `}</style>

      <div className="luxC">
        <div className="luxI">
          {/* LEFT: Logo */}
          <div className="luxL">
            <Link to={`/${lang}`} className="luxBrand" aria-label="NEOX" data-wg-notranslate>
              <img
                src="/image/neox-logo.png"
                alt="NEOX"
                width={148}
                height={44}
                loading="eager"
                decoding="async"
                draggable={false}
                style={{
                  height: isMobile ? 18 : 26,
                  width: "auto",
                  maxWidth: isMobile ? "118px" : "156px",
                  objectFit: "contain",
                  display: "block",
                  userSelect: "none",
                  filter: "drop-shadow(0 8px 18px rgba(0,0,0,.38))",
                  transform: "translateZ(0)",
                }}
              />
            </Link>
          </div>

          {/* CENTER: Nav */}
          <nav className="luxM" aria-label="Primary navigation">
            <NavLink to={withLang("/")} end className={({ isActive }) => cx("luxTop", isActive && "is-active")}>
              {t("nav.home")}
            </NavLink>

            {/* Services */}
            <div
              ref={svcRef}
              className={cx("luxDD", openMenu === "services" && "is-open")}
              onMouseEnter={() => {
                setOpenMenu(null); // close others first
                openDrop("services");
              }}
              onMouseLeave={() => scheduleClose("services")}
            >
              <button
                type="button"
                className={cx("luxTop", (isActivePath("/services") || openMenu === "services") && "is-active")}
                aria-haspopup="menu"
                aria-expanded={openMenu === "services"}
                onClick={() => setOpenMenu((v) => (v === "services" ? null : "services"))}
              >
                {t("nav.services")}
                <span className="luxChev" aria-hidden="true">
                  <ChevronDown size={16} />
                </span>
              </button>

              <div className="luxPanelWrap">
                <MiniListPanel items={SERVICES} k="services" />
              </div>
            </div>

            {/* Use cases */}
            <div
              ref={ucRef}
              className={cx("luxDD", openMenu === "usecases" && "is-open")}
              onMouseEnter={() => {
                setOpenMenu(null);
                openDrop("usecases");
              }}
              onMouseLeave={() => scheduleClose("usecases")}
            >
              <button
                type="button"
                className={cx("luxTop", (isActivePath("/use-cases") || openMenu === "usecases") && "is-active")}
                aria-haspopup="menu"
                aria-expanded={openMenu === "usecases"}
                onClick={() => setOpenMenu((v) => (v === "usecases" ? null : "usecases"))}
              >
                {t("nav.useCases")}
                <span className="luxChev" aria-hidden="true">
                  <ChevronDown size={16} />
                </span>
              </button>

              <div className="luxPanelWrap">
                <MiniListPanel items={USECASES} k="usecases" />
              </div>
            </div>

            {/* Resources */}
            <div
              ref={resRef}
              className={cx("luxDD", openMenu === "resources" && "is-open")}
              onMouseEnter={() => {
                setOpenMenu(null);
                openDrop("resources");
              }}
              onMouseLeave={() => scheduleClose("resources")}
            >
              <button
                type="button"
                className={cx("luxTop", (isActivePath("/blog") || isActivePath("/contact") || openMenu === "resources") && "is-active")}
                aria-haspopup="menu"
                aria-expanded={openMenu === "resources"}
                onClick={() => setOpenMenu((v) => (v === "resources" ? null : "resources"))}
              >
                Resources
                <span className="luxChev" aria-hidden="true">
                  <ChevronDown size={16} />
                </span>
              </button>

              <div className="luxPanelWrap">
                <MiniListPanel items={RESOURCES} k="resources" />
              </div>
            </div>
          </nav>

          {/* RIGHT: Lang switcher + mobile */}
          <div className="luxR">
            <div
              ref={langRef}
              className={cx("luxDD", "langWrap", openMenu === "lang" && "is-open")}
              onMouseEnter={() => openDrop("lang")}
              onMouseLeave={() => scheduleClose("lang")}
              data-wg-notranslate
            >
              <button
                type="button"
                className="langBtn"
                aria-haspopup="menu"
                aria-expanded={openMenu === "lang"}
                onClick={() => setOpenMenu((v) => (v === "lang" ? null : "lang"))}
              >
                <span className="langDot" aria-hidden="true" />
                <span className="langCode">{lang.toUpperCase()}</span>
                <span aria-hidden="true" style={{ opacity: 0.78 }}>
                  <ChevronDown size={14} />
                </span>
              </button>

              {LangPanel}
            </div>

            <button
              className="burger"
              type="button"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls={panelId}
              onClick={() => {
                if (!mobileOpen) setMobileOpen(true);
                else closeMobile();
              }}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE OVERLAY */}
      {createPortal(
        <div className={cx("mOv", mobileOpen && "is-mounted", mobileSoft && "is-open")} aria-hidden={!mobileOpen}>
          <button className="mBg" type="button" aria-label="Close" onClick={closeMobile} />
          <div id={panelId} className={cx("mSheet", mobileSoft && "is-open")} role="dialog" aria-modal="true" aria-label="Menu">
            <div className="mHead">
              <div className="mTitle">
                <span className="mDot" aria-hidden="true" /> MENU
              </div>
              <button className="mClose" type="button" aria-label="Close" onClick={closeMobile}>
                <X size={18} />
              </button>
            </div>

            <div className="mBody">
              <NavLink to={withLang("/")} end className="mRow" onClick={closeMobile}>
                {t("nav.home")} <span aria-hidden="true">→</span>
              </NavLink>

              <div className="mAcc">
                <button className="mAccHead" type="button" onClick={() => setMSvc((v) => !v)} aria-expanded={mSvc}>
                  {t("nav.services")} <span aria-hidden="true">{mSvc ? "−" : "+"}</span>
                </button>
                <div className={cx("mAccPanel", mSvc && "is-open")} aria-hidden={!mSvc}>
                  {SERVICES.map((s) => (
                    <NavLink key={s.id} to={withLang(s.to)} className="mAccItem" onClick={closeMobile}>
                      {s.label} <span aria-hidden="true">→</span>
                    </NavLink>
                  ))}
                </div>
              </div>

              <div className="mAcc">
                <button className="mAccHead" type="button" onClick={() => setMUc((v) => !v)} aria-expanded={mUc}>
                  {t("nav.useCases")} <span aria-hidden="true">{mUc ? "−" : "+"}</span>
                </button>
                <div className={cx("mAccPanel", mUc && "is-open")} aria-hidden={!mUc}>
                  {USECASES.map((u) => (
                    <NavLink key={u.id} to={withLang(u.to)} className="mAccItem" onClick={closeMobile}>
                      {u.label} <span aria-hidden="true">→</span>
                    </NavLink>
                  ))}
                </div>
              </div>

              <div className="mAcc">
                <button className="mAccHead" type="button" onClick={() => setMRes((v) => !v)} aria-expanded={mRes}>
                  Resources <span aria-hidden="true">{mRes ? "−" : "+"}</span>
                </button>
                <div className={cx("mAccPanel", mRes && "is-open")} aria-hidden={!mRes}>
                  {RESOURCES.map((r) => (
                    <NavLink key={r.id} to={withLang(r.to)} className="mAccItem" onClick={closeMobile}>
                      {r.label} <span aria-hidden="true">→</span>
                    </NavLink>
                  ))}
                </div>
              </div>

              <div className="mAcc">
                <button className="mAccHead" type="button" onClick={() => setOpenMenu((v) => (v === "lang" ? null : "lang"))}>
                  Language ({lang.toUpperCase()}) <span aria-hidden="true">+</span>
                </button>
                <div className={cx("mAccPanel", openMenu === "lang" && "is-open")} aria-hidden={openMenu !== "lang"}>
                  {LANGS.map((code) => (
                    <button
                      key={code}
                      type="button"
                      className="mAccItem"
                      onClick={() => {
                        switchLang(code);
                        closeMobile();
                      }}
                      style={{ width: "100%", textAlign: "left" as any }}
                    >
                      {code.toUpperCase()} — {langFullName(code)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );

  if (!mounted) return null;
  return createPortal(headerNode, document.body);
}
