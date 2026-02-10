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

type MenuKey = "services" | "scenarios" | "resources" | "lang" | null;

function isLang(x: string | undefined | null): x is Lang {
  return !!x && (LANGS as readonly string[]).includes(x as any);
}

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

type ItemDef = { id: string; label: string; to: string };

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

export default function Header({ introReady }: { introReady: boolean }) {
  const reduced = usePrefersReducedMotion();
  const { i18n, t } = useTranslation();
  const { lang: paramLang } = useParams<{ lang?: string }>();
  const lang: Lang = isLang(paramLang) ? (paramLang as Lang) : DEFAULT_LANG;

  const location = useLocation();
  const navigate = useNavigate();

  const panelId = useId();
  const headerRef = useRef<HTMLElement | null>(null);

  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [openMenu, setOpenMenu] = useState<MenuKey>(null);
  const [scrolled, setScrolled] = useState(false);

  // mobile overlay
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSoft, setMobileSoft] = useState(false);
  const [mSvc, setMSvc] = useState(false);
  const [mScn, setMScn] = useState(false);
  const [mRes, setMRes] = useState(false);
  const [mLang, setMLang] = useState(false);

  const svcRef = useRef<HTMLDivElement | null>(null);
  const scnRef = useRef<HTMLDivElement | null>(null);
  const resRef = useRef<HTMLDivElement | null>(null);
  const langRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 980px)");
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

  // ===== MENU DATA =====
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

  const SCENARIOS: ItemDef[] = useMemo(
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
      { id: "resources", label: "Resurslar", to: "/resources" },
      { id: "docs", label: "Docs", to: "/resources/docs" },
      { id: "guides", label: "Guides", to: "/resources/guides" },
    ],
    []
  );

  // ===== Scroll blur (RAF, fps-safe) =====
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
    setMScn(false);
    setMRes(false);
    setMLang(false);
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
        scenarios: scnRef,
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

  const closeMobile = () => {
    setMobileSoft(false);
    window.setTimeout(() => setMobileOpen(false), 160);
  };

  const openOnly = (k: Exclude<MenuKey, null>) => setOpenMenu((cur) => (cur === k ? null : k));

  const MiniPanel = ({ items, k }: { items: ItemDef[]; k: Exclude<MenuKey, null> }) => (
    <div className="neoMini" role="menu" aria-hidden={openMenu !== k}>
      {items.map((it) => (
        <NavLink
          key={it.id}
          to={withLang(it.to)}
          role="menuitem"
          className={({ isActive }) => cx("neoMiniItem", isActive && "is-active")}
          onClick={() => setOpenMenu(null)}
        >
          <span className="neoMiniDot" aria-hidden="true" />
          <span className="neoMiniTxt">{it.label}</span>
        </NavLink>
      ))}
    </div>
  );

  const LangPanel = (
    <div className="neoLangPanel" role="menu" aria-label="Language menu" aria-hidden={openMenu !== "lang"}>
      {LANGS.map((code) => (
        <button
          key={code}
          type="button"
          role="menuitem"
          className={cx("neoLangItem", code === lang && "is-active")}
          onClick={() => {
            switchLang(code);
            setOpenMenu(null);
          }}
        >
          <span className="neoLangCodePill">{code.toUpperCase()}</span>
          <span className="neoLangName">{langFullName(code)}</span>
        </button>
      ))}
    </div>
  );

  const headerNode = (
    <header
      ref={headerRef}
      className={cx("neoHdr", introReady && "neoHdr--in", scrolled && "is-scrolled", mobileOpen && "is-open")}
    >
      <style>{`
        :root{ --hdrp: 0; }

        .neoHdr, .neoHdr *{ box-sizing:border-box; }
        .neoHdr a, .neoHdr a:hover, .neoHdr a:focus, .neoHdr a:active{ text-decoration:none !important; }
        .neoHdr a{ color: inherit; }
        .neoHdr :focus-visible{ outline:none; box-shadow: 0 0 0 3px rgba(120,170,255,.18); border-radius: 14px; }

        /* ===== CLICK FIX: header always on top & clickable ===== */
        .neoHdr{
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 99999;
          pointer-events: auto;
          isolation: isolate;
          background: rgba(10,12,18,0.02);
          border-bottom: 1px solid rgba(255,255,255,0.03);
          transform: translateZ(0);
          transition: background-color .20s ease, border-color .20s ease;
        }
        .neoHdr.is-scrolled{
          background: rgba(10,12,18, calc(0.06 + 0.30 * var(--hdrp)));
          border-bottom-color: rgba(255,255,255, calc(0.05 + 0.07 * var(--hdrp)));
          -webkit-backdrop-filter: blur(calc(10px + 14px * var(--hdrp))) saturate(1.12);
          backdrop-filter: blur(calc(10px + 14px * var(--hdrp))) saturate(1.12);
        }
        .neoHdr.is-open{
          background: rgba(10,12,18,.92);
          border-bottom-color: rgba(255,255,255,.12);
          -webkit-backdrop-filter: blur(18px) saturate(1.16);
          backdrop-filter: blur(18px) saturate(1.16);
        }

        /* FULL-WIDTH inner */
        .neoInner{
          position: relative;
          width: 100%;
          padding: 0 22px;
          height: 72px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 14px;
        }
        .neoLeft{ display:flex; align-items:center; min-width:0; }
        .neoRight{ display:flex; align-items:center; justify-content:flex-end; gap: 10px; }

        /* Center nav: premium spacing */
        .neoNav{
          position:absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          display:flex;
          align-items:center;
          gap: 12px;
          white-space: nowrap;
        }

        /* Brand */
        .neoBrand{
          display:inline-flex; align-items:center;
          padding: 10px 10px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.03);
          transition: transform .16s ease, background-color .16s ease, border-color .16s ease;
          will-change: transform;
        }
        .neoBrand:hover{ transform: translateY(-1px); background: rgba(255,255,255,.05); border-color: rgba(255,255,255,.12); }

        /* Top links: cleaner, more premium */
        .neoTop{
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
          font-weight: 900;
          font-size: 13px;
          letter-spacing: .02em;
          cursor:pointer;
          user-select:none;
          transition: color .16s ease, background-color .16s ease, border-color .16s ease, transform .16s ease;
        }
        .neoTop:hover{ color: rgba(255,255,255,.94); background: rgba(255,255,255,.05); border-color: rgba(255,255,255,.06); transform: translateY(-1px); }
        .neoTop.is-active{ color: rgba(255,255,255,.96); background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.10); }

        /* Chevron subtle */
        .neoChev{ opacity:.65; margin-left: 6px; transition: transform .16s ease, opacity .16s ease; }
        .neoDD.is-open .neoChev{ transform: rotate(180deg); opacity: .9; }

        /* Dropdown wrapper */
        .neoDD{ position: relative; display:inline-flex; }

        /* Small premium panel: auto width by content */
        .neoPanel{
          position:absolute;
          top: calc(100% + 10px);
          left: 0;
          width: max-content;
          min-width: 210px;
          max-width: 320px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(10,12,18,.88);
          -webkit-backdrop-filter: blur(18px) saturate(1.10);
          backdrop-filter: blur(18px) saturate(1.10);
          box-shadow: 0 26px 90px rgba(0,0,0,.72);
          transform-origin: top left;
          opacity: 0;
          pointer-events:none;
          transform: translateY(-8px) scale(.985);
          transition: opacity .16s ease, transform .16s ease;
          overflow:hidden;
        }
        .neoDD.is-open .neoPanel{
          opacity: 1;
          pointer-events:auto;
          transform: translateY(0) scale(1);
        }

        .neoMini{ padding: 10px; display:grid; gap: 6px; }
        .neoMiniItem{
          display:flex; align-items:center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.03);
          color: rgba(255,255,255,.90);
          font-weight: 900;
          font-size: 13px;
          white-space: nowrap;
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
          will-change: transform;
        }
        .neoMiniItem:hover{ transform: translateY(-1px); background: rgba(255,255,255,.05); border-color: rgba(255,255,255,.10); }
        .neoMiniItem.is-active{ background: rgba(120,170,255,.10); border-color: rgba(120,170,255,.22); }

        /* remove arrows — use tiny dot */
        .neoMiniDot{
          width: 7px; height: 7px; border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), rgba(120,170,255,.75));
          box-shadow: 0 0 0 3px rgba(120,170,255,.10);
          flex: 0 0 auto;
        }
        .neoMiniTxt{ line-height: 1; }

        /* Language: compact premium, expand name on hover (desktop dropdown) */
        .neoLangWrap{ position: relative; display:inline-flex; }
        .neoLangBtn{
          display:inline-flex; align-items:center; gap: 8px;
          height: 40px;
          padding: 0 10px 0 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.90);
          font-weight: 950;
          font-size: 12px;
          cursor:pointer;
          transition: transform .16s ease, background-color .16s ease, border-color .16s ease;
        }
        .neoLangBtn:hover{ transform: translateY(-1px); background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.14); }
        .neoLangDot{
          width: 8px; height: 8px; border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), rgba(120,170,255,.85));
          box-shadow: 0 0 0 3px rgba(120,170,255,.10);
        }
        .neoLangCode{ letter-spacing: .14em; }

        .neoLangPanel{
          position:absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 250px;
          padding: 10px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(10,12,18,.88);
          -webkit-backdrop-filter: blur(18px) saturate(1.10);
          backdrop-filter: blur(18px) saturate(1.10);
          box-shadow: 0 26px 90px rgba(0,0,0,.72);
          opacity: 0;
          pointer-events:none;
          transform: translateY(-8px) scale(.985);
          transform-origin: top right;
          transition: opacity .16s ease, transform .16s ease;
          overflow:hidden;
        }
        .neoDD.is-open .neoLangPanel{ opacity:1; pointer-events:auto; transform: translateY(0) scale(1); }

        .neoLangItem{
          width: 100%;
          display:flex; align-items:center; justify-content:flex-start;
          gap: 10px;
          padding: 10px 10px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.03);
          color: rgba(255,255,255,.90);
          cursor:pointer;
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
          font-weight: 950;
          overflow:hidden;
        }
        .neoLangItem + .neoLangItem{ margin-top: 8px; }
        .neoLangItem:hover{ transform: translateY(-1px); background: rgba(255,255,255,.05); border-color: rgba(255,255,255,.10); }
        .neoLangItem.is-active{ background: rgba(120,170,255,.10); border-color: rgba(120,170,255,.22); }

        .neoLangCodePill{
          display:inline-flex; align-items:center; justify-content:center;
          height: 28px;
          min-width: 44px;
          padding: 0 10px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(0,0,0,.20);
          letter-spacing: .14em;
          font-size: 12px;
          flex: 0 0 auto;
        }
        .neoLangName{
          opacity:.86;
          font-weight: 900;
          white-space: nowrap;
          transform: translateX(14px);
          transition: transform .16s ease, opacity .16s ease;
        }
        .neoLangItem:hover .neoLangName{ transform: translateX(0); opacity: .95; }

        /* Mobile burger */
        .neoBurger{
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
        .neoBurger:hover{ transform: translateY(-1px); background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.14); }

        /* Mobile overlay */
        .neoMOv{ position: fixed; inset: 0; z-index: 100000; opacity: 0; pointer-events: none; transition: opacity .16s ease; }
        .neoMOv.is-open{ opacity: 1; pointer-events: auto; }
        .neoBg{ position:absolute; inset:0; border:0; background: rgba(0,0,0,.46); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); }
        .neoSheet{
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
        .neoSheet.is-open{ transform: translateY(0) scale(1); opacity: 1; }
        .neoHead{ display:flex; align-items:center; justify-content: space-between; padding: 14px 14px 10px; border-bottom: 1px solid rgba(255,255,255,.06); }
        .neoTitle{ font-weight: 950; letter-spacing: .18em; font-size: 11px; color: rgba(255,255,255,.70); display:flex; align-items:center; gap: 10px; }
        .neoDot{ width: 10px; height: 10px; border-radius: 999px; background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), rgba(120,170,255,.85)); box-shadow: 0 0 0 4px rgba(120,170,255,.10); }
        .neoClose{ width: 44px; height: 40px; border-radius: 14px; border: 1px solid rgba(255,255,255,.10); background: rgba(255,255,255,.05); color: rgba(255,255,255,.88); display:flex; align-items:center; justify-content:center; cursor: pointer; }
        .neoBody{ padding: 12px 14px 14px; display:grid; gap: 10px; }

        .neoRow{
          display:flex; align-items:center; justify-content: space-between; gap: 10px;
          padding: 12px 12px; border-radius: 16px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.90);
          font-weight: 950;
        }
        .neoRow span{ opacity: .65; }

        .neoAcc{ border-radius: 18px; overflow:hidden; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.03); }
        .neoAccHead{ width:100%; display:flex; align-items:center; justify-content: space-between; gap: 10px; padding: 12px 12px; border:0; background: transparent; color: rgba(255,255,255,.92); cursor:pointer; font-weight: 950; }
        .neoAccPanel{ padding: 0 12px 12px; display:grid; gap: 8px; max-height: 0; overflow: hidden; transition: max-height .18s ease; }
        .neoAccPanel.is-open{ max-height: 520px; }

        .neoAccItem{
          display:flex; align-items:center; justify-content: space-between; gap: 10px;
          padding: 10px 10px; border-radius: 14px;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.90);
          font-weight: 950;
        }
        .neoAccItem span{ opacity: .65; }

        @media (max-width: 980px){
          .neoNav{ display:none; }
          .neoBurger{ display:inline-flex; }
        }

        @media (prefers-reduced-motion: reduce){
          .neoTop, .neoBrand, .neoLangBtn, .neoMiniItem, .neoLangItem{ transition:none !important; }
          .neoPanel, .neoLangPanel, .neoSheet{ transition:none !important; transform:none !important; }
          .neoLangName{ transition:none !important; }
        }
      `}</style>

      <div className="neoInner">
        {/* LEFT */}
        <div className="neoLeft">
          <Link to={`/${lang}`} className="neoBrand" aria-label="NEOX" data-wg-notranslate>
            <img
              src="/image/neox-logo.png"
              alt="NEOX"
              width={160}
              height={44}
              loading="eager"
              decoding="async"
              draggable={false}
              style={{
                height: isMobile ? 18 : 26,
                width: "auto",
                objectFit: "contain",
                display: "block",
                userSelect: "none",
                filter: "drop-shadow(0 8px 18px rgba(0,0,0,.38))",
                transform: "translateZ(0)",
              }}
            />
          </Link>
        </div>

        {/* CENTER */}
        <nav className="neoNav" aria-label="Primary navigation">
          <NavLink to={withLang("/")} end className={({ isActive }) => cx("neoTop", isActive && "is-active")}>
            {t("nav.home") || "Ana səhifə"}
          </NavLink>

          {/* Services */}
          <div
            ref={svcRef}
            className={cx("neoDD", openMenu === "services" && "is-open")}
            onMouseEnter={() => setOpenMenu("services")}
            onMouseLeave={() => setOpenMenu((cur) => (cur === "services" ? null : cur))}
          >
            <button
              type="button"
              className={cx("neoTop", openMenu === "services" && "is-active")}
              aria-haspopup="menu"
              aria-expanded={openMenu === "services"}
              onClick={() => openOnly("services")}
            >
              {t("nav.services") || "Xidmətlər"}
              <span className="neoChev" aria-hidden="true">
                <ChevronDown size={16} />
              </span>
            </button>
            <div className="neoPanel">
              <MiniPanel items={SERVICES} k="services" />
            </div>
          </div>

          {/* Scenarios */}
          <div
            ref={scnRef}
            className={cx("neoDD", openMenu === "scenarios" && "is-open")}
            onMouseEnter={() => setOpenMenu("scenarios")}
            onMouseLeave={() => setOpenMenu((cur) => (cur === "scenarios" ? null : cur))}
          >
            <button
              type="button"
              className={cx("neoTop", openMenu === "scenarios" && "is-active")}
              aria-haspopup="menu"
              aria-expanded={openMenu === "scenarios"}
              onClick={() => openOnly("scenarios")}
            >
              {t("nav.useCases") || "Ssenarilər"}
              <span className="neoChev" aria-hidden="true">
                <ChevronDown size={16} />
              </span>
            </button>
            <div className="neoPanel">
              <MiniPanel items={SCENARIOS} k="scenarios" />
            </div>
          </div>

          {/* Resources */}
          <div
            ref={resRef}
            className={cx("neoDD", openMenu === "resources" && "is-open")}
            onMouseEnter={() => setOpenMenu("resources")}
            onMouseLeave={() => setOpenMenu((cur) => (cur === "resources" ? null : cur))}
          >
            <button
              type="button"
              className={cx("neoTop", openMenu === "resources" && "is-active")}
              aria-haspopup="menu"
              aria-expanded={openMenu === "resources"}
              onClick={() => openOnly("resources")}
            >
              Resources
              <span className="neoChev" aria-hidden="true">
                <ChevronDown size={16} />
              </span>
            </button>
            <div className="neoPanel">
              <MiniPanel items={RESOURCES} k="resources" />
            </div>
          </div>

          <NavLink to={withLang("/faq")} className={({ isActive }) => cx("neoTop", isActive && "is-active")}>
            FAQ
          </NavLink>

          <NavLink to={withLang("/blog")} className={({ isActive }) => cx("neoTop", isActive && "is-active")}>
            {t("nav.blog") || "Blog"}
          </NavLink>

          <NavLink to={withLang("/contact")} className={({ isActive }) => cx("neoTop", isActive && "is-active")}>
            {t("nav.contact") || "Əlaqə"}
          </NavLink>
        </nav>

        {/* RIGHT */}
        <div className="neoRight">
          <div
            ref={langRef}
            className={cx("neoDD", "neoLangWrap", openMenu === "lang" && "is-open")}
            onMouseEnter={() => setOpenMenu("lang")}
            onMouseLeave={() => setOpenMenu((cur) => (cur === "lang" ? null : cur))}
            data-wg-notranslate
          >
            <button
              type="button"
              className="neoLangBtn"
              aria-haspopup="menu"
              aria-expanded={openMenu === "lang"}
              onClick={() => openOnly("lang")}
            >
              <span className="neoLangDot" aria-hidden="true" />
              <span className="neoLangCode">{lang.toUpperCase()}</span>
              <span aria-hidden="true" style={{ opacity: 0.72 }}>
                <ChevronDown size={14} />
              </span>
            </button>
            {LangPanel}
          </div>

          <button
            className="neoBurger"
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

      {/* MOBILE OVERLAY */}
      {createPortal(
        <div className={cx("neoMOv", mobileOpen && "is-open")} aria-hidden={!mobileOpen}>
          <button className="neoBg" type="button" aria-label="Close" onClick={closeMobile} />
          <div
            id={panelId}
            className={cx("neoSheet", mobileSoft && "is-open")}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <div className="neoHead">
              <div className="neoTitle">
                <span className="neoDot" aria-hidden="true" /> MENU
              </div>
              <button className="neoClose" type="button" aria-label="Close" onClick={closeMobile}>
                <X size={18} />
              </button>
            </div>

            <div className="neoBody">
              <NavLink to={withLang("/")} end className="neoRow" onClick={closeMobile}>
                {t("nav.home") || "Ana səhifə"} <span aria-hidden="true">•</span>
              </NavLink>

              <div className="neoAcc">
                <button className="neoAccHead" type="button" onClick={() => setMSvc((v) => !v)} aria-expanded={mSvc}>
                  {t("nav.services") || "Xidmətlər"} <span aria-hidden="true">{mSvc ? "−" : "+"}</span>
                </button>
                <div className={cx("neoAccPanel", mSvc && "is-open")} aria-hidden={!mSvc}>
                  {SERVICES.map((s) => (
                    <NavLink key={s.id} to={withLang(s.to)} className="neoAccItem" onClick={closeMobile}>
                      {s.label} <span aria-hidden="true">•</span>
                    </NavLink>
                  ))}
                </div>
              </div>

              <div className="neoAcc">
                <button className="neoAccHead" type="button" onClick={() => setMScn((v) => !v)} aria-expanded={mScn}>
                  {t("nav.useCases") || "Ssenarilər"} <span aria-hidden="true">{mScn ? "−" : "+"}</span>
                </button>
                <div className={cx("neoAccPanel", mScn && "is-open")} aria-hidden={!mScn}>
                  {SCENARIOS.map((u) => (
                    <NavLink key={u.id} to={withLang(u.to)} className="neoAccItem" onClick={closeMobile}>
                      {u.label} <span aria-hidden="true">•</span>
                    </NavLink>
                  ))}
                </div>
              </div>

              <div className="neoAcc">
                <button className="neoAccHead" type="button" onClick={() => setMRes((v) => !v)} aria-expanded={mRes}>
                  Resources <span aria-hidden="true">{mRes ? "−" : "+"}</span>
                </button>
                <div className={cx("neoAccPanel", mRes && "is-open")} aria-hidden={!mRes}>
                  {RESOURCES.map((r) => (
                    <NavLink key={r.id} to={withLang(r.to)} className="neoAccItem" onClick={closeMobile}>
                      {r.label} <span aria-hidden="true">•</span>
                    </NavLink>
                  ))}
                </div>
              </div>

              <NavLink to={withLang("/faq")} className="neoRow" onClick={closeMobile}>
                FAQ <span aria-hidden="true">•</span>
              </NavLink>

              <NavLink to={withLang("/blog")} className="neoRow" onClick={closeMobile}>
                {t("nav.blog") || "Blog"} <span aria-hidden="true">•</span>
              </NavLink>

              <NavLink to={withLang("/contact")} className="neoRow" onClick={closeMobile}>
                {t("nav.contact") || "Əlaqə"} <span aria-hidden="true">•</span>
              </NavLink>

              <div className="neoAcc" data-wg-notranslate>
                <button className="neoAccHead" type="button" onClick={() => setMLang((v) => !v)} aria-expanded={mLang}>
                  Language ({lang.toUpperCase()}) <span aria-hidden="true">{mLang ? "−" : "+"}</span>
                </button>
                <div className={cx("neoAccPanel", mLang && "is-open")} aria-hidden={!mLang}>
                  {LANGS.map((code) => (
                    <button
                      key={code}
                      type="button"
                      className="neoAccItem"
                      onClick={() => {
                        switchLang(code);
                        closeMobile();
                      }}
                      style={{ width: "100%", textAlign: "left" as any }}
                    >
                      {code.toUpperCase()} — {langFullName(code)} <span aria-hidden="true">•</span>
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
