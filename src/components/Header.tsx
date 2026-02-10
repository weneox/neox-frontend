// src/components/Header.tsx
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { ChevronDown, X, Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DEFAULT_LANG, type Lang } from "../i18n/lang";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

type MenuKey = "services" | "scenarios" | "resources" | "lang" | null;

/** typed lang list (TS “never” fix) */
const LANG_MENU: Lang[] = ["az", "tr", "ru", "en", "es"];

function isLang(x: string | undefined | null): x is Lang {
  if (!x) return false;
  const v = String(x).toLowerCase();
  return (LANG_MENU as readonly string[]).includes(v);
}

function langFullName(c: Lang) {
  switch (c) {
    case "az":
      return "Azerbaijani";
    case "tr":
      return "Turkish";
    case "ru":
      return "Russian";
    case "en":
      return "English";
    case "es":
      return "Spanish";
    default:
      return String(c).toUpperCase();
  }
}

type ItemDef = { id: string; label: string; to: string; preview?: string };

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

  const svcRef = useRef<HTMLDivElement | null>(null);
  const scnRef = useRef<HTMLDivElement | null>(null);
  const resRef = useRef<HTMLDivElement | null>(null);
  const langRef = useRef<HTMLDivElement | null>(null);

  const [hoverPreview, setHoverPreview] = useState<string>("");

  // ---------- close scheduling (hover safe) ----------
  const closeT = useRef<number | null>(null);
  const scheduleClose = useCallback((k: MenuKey) => {
    if (closeT.current) window.clearTimeout(closeT.current);
    closeT.current = window.setTimeout(() => {
      setOpenMenu((cur) => (cur === k ? null : cur));
    }, 120);
  }, []);
  const cancelClose = useCallback(() => {
    if (closeT.current) window.clearTimeout(closeT.current);
    closeT.current = null;
  }, []);

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

  /** ✅ LANG SWITCH — hard-fix */
  const switchLang = useCallback(
    (next: Lang) => {
      if (next === lang) return;

      // 1) pathname-dən başlanğıcdakı /xx hissəsini çıxart
      // /az  | /az/xxx | /AZ/xxx -> hamısını tutur
      const rest = location.pathname.replace(/^\/[a-z]{2}(?=\/|$)/i, "");
      const cleaned = rest === "" ? "/" : rest;
      const target = cleaned === "/" ? `/${next}` : `/${next}${cleaned}`;

      cancelClose();
      setOpenMenu(null);
      setMobileOpen(false);

      // əvvəl i18n, sonra route (stabil)
      Promise.resolve(i18n.changeLanguage(next))
        .catch(() => {})
        .finally(() => {
          navigate(target + location.search + location.hash, { replace: false });
        });
    },
    [cancelClose, i18n, lang, location.hash, location.pathname, location.search, navigate]
  );

  const SERVICES: ItemDef[] = useMemo(
    () => [
      { id: "chatbot-24-7", label: "Chatbot 24/7", to: "/services/chatbot-24-7", preview: "> webhook • whatsapp • web • crm • operator" },
      { id: "business-workflows", label: "Business Workflows", to: "/services/business-workflows", preview: "> routing • approvals • sla • sync • reports" },
      { id: "websites", label: "Websites", to: "/services/websites", preview: "> landing • seo • performance • cms • analytics" },
      { id: "mobile-apps", label: "Mobile Apps", to: "/services/mobile-apps", preview: "> ios • android • push • auth • payments" },
      { id: "smm-automation", label: "SMM Automation", to: "/services/smm-automation", preview: "> scheduling • captions • dm flow • insights • ai" },
      { id: "technical-support", label: "Technical Support", to: "/services/technical-support", preview: "> tickets • triage • kb • escalation • monitoring" },
    ],
    []
  );

  const SCENARIOS: ItemDef[] = useMemo(
    () => [
      { id: "healthcare", label: "Healthcare", to: "/use-cases/healthcare", preview: "> intake • triage • reminders • follow-up" },
      { id: "logistics", label: "Logistics", to: "/use-cases/logistics", preview: "> tracking • dispatch • exceptions • proof" },
      { id: "finance", label: "Finance", to: "/use-cases/finance", preview: "> kyc • onboarding • support • compliance" },
      { id: "retail", label: "Retail", to: "/use-cases/retail", preview: "> cart • returns • upsell • support • crm" },
      { id: "hotels", label: "Hotels & Resorts", to: "/use-cases/hotels", preview: "> bookings • concierge • upsell • reviews" },
    ],
    []
  );

  const RESOURCES: ItemDef[] = useMemo(
    () => [
      { id: "docs", label: "Docs", to: "/resources/docs", preview: "> api • setup • integrations • reference" },
      { id: "guides", label: "Guides", to: "/resources/guides", preview: "> playbooks • templates • best practices" },
    ],
    []
  );

  // ----- Scroll blur (RAF, fps-safe) -----
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
  }, [location.pathname, location.search, location.hash]);

  // lock scroll on mobile overlay
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

  const openOnly = (k: Exclude<MenuKey, null>) => {
    cancelClose();
    setOpenMenu((cur) => (cur === k ? null : k));
  };

  // safer hover binding (lang da hover açılır, amma click də stabil)
  const bindHover = (k: Exclude<MenuKey, null>, ref: React.RefObject<HTMLDivElement>) => {
    return {
      onMouseEnter: () => {
        if (isMobile) return;
        cancelClose();
        setOpenMenu(k);
      },
      onMouseLeave: () => {
        if (isMobile) return;
        scheduleClose(k);
      },
      onPointerEnter: () => {
        if (isMobile) return;
        cancelClose();
        setOpenMenu(k);
      },
      onPointerLeave: () => {
        if (isMobile) return;
        scheduleClose(k);
      },
    } as const;
  };

  const ElitePanel = ({ items, k }: { items: ItemDef[]; k: Exclude<MenuKey, null> }) => {
    const open = openMenu === k;

    useEffect(() => {
      if (open) setHoverPreview(items[0]?.preview || "");
      else if (openMenu !== k) setHoverPreview("");
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    return (
      <div className="neoElitePanel" role="menu" aria-hidden={!open}>
        <div className="neoEliteGrid">
          <div className="neoEliteList" role="none">
            {items.map((it) => (
              <NavLink
                key={it.id}
                to={withLang(it.to)}
                role="menuitem"
                className={({ isActive }) => cx("neoEliteItem", isActive && "is-active")}
                onClick={() => setOpenMenu(null)}
                onMouseEnter={() => setHoverPreview(it.preview || "")}
                onPointerEnter={() => setHoverPreview(it.preview || "")}
              >
                <span className="neoEliteText">{it.label}</span>
                {/* oxları çıxartdıq — yalnız nöqtə */}
                <span className="neoEliteDot" aria-hidden="true" />
              </NavLink>
            ))}
          </div>

          <div className="neoEliteTicker" aria-hidden="true">
            <div className={cx("neoEliteTickerInner", !reduced && "is-anim")}>
              <span className="neoEliteTickerLine">{hoverPreview || "> ready"}</span>
              <span className="neoEliteTickerSep"> • </span>
              <span className="neoEliteTickerLine">{hoverPreview || "> ready"}</span>
              <span className="neoEliteTickerSep"> • </span>
              <span className="neoEliteTickerLine">{hoverPreview || "> ready"}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const LangPanel = (
    <div className="neoLangPanel" role="menu" aria-label="Language menu" aria-hidden={openMenu !== "lang"}>
      {LANG_MENU.map((code) => (
        <button
          key={code}
          type="button"
          role="menuitem"
          className={cx("neoLangItem", code === lang && "is-active")}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => switchLang(code)}
        >
          <span className="neoLangCode">{String(code).toUpperCase()}</span>
          <span className="neoLangName">{langFullName(code)}</span>
        </button>
      ))}
    </div>
  );

  const headerNode = (
    <header ref={headerRef} className={cx("neoHdr", introReady && "neoHdr--in", scrolled && "is-scrolled", mobileOpen && "is-open")}>
      <style>{`
        :root{ --hdrp: 0; }

        .neoHdr, .neoHdr *{ box-sizing:border-box; }
        .neoHdr a, .neoHdr a:hover, .neoHdr a:focus, .neoHdr a:active{ text-decoration:none !important; }
        .neoHdr a{ color: inherit; }
        .neoHdr :focus-visible{ outline:none; box-shadow: 0 0 0 3px rgba(120,170,255,.18); border-radius: 12px; }

        .neoHdr{
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 99999;
          isolation: isolate;
          background: rgba(10,12,18,0.00);
          border-bottom: 1px solid rgba(255,255,255,0.00);
          transform: translateZ(0);
          transition: background-color .18s ease, border-color .18s ease;
        }
        .neoHdr.is-scrolled{
          background: rgba(10,12,18, calc(0.06 + 0.28 * var(--hdrp)));
          border-bottom-color: rgba(255,255,255, calc(0.05 + 0.08 * var(--hdrp)));
          -webkit-backdrop-filter: blur(calc(10px + 14px * var(--hdrp))) saturate(1.10);
          backdrop-filter: blur(calc(10px + 14px * var(--hdrp))) saturate(1.10);
        }
        .neoHdr.is-open{
          background: rgba(10,12,18,.92);
          border-bottom-color: rgba(255,255,255,.12);
          -webkit-backdrop-filter: blur(18px) saturate(1.12);
          backdrop-filter: blur(18px) saturate(1.12);
        }

        /* premium hairline yalnız scroll olanda */
        .neoHdr::after{
          content:"";
          position:absolute;
          left: 0; right: 0; bottom: -1px;
          height: 1px;
          opacity: 0;
          pointer-events:none;
          background: linear-gradient(90deg,
            rgba(255,255,255,0),
            rgba(120,170,255,.22),
            rgba(255,255,255,.10),
            rgba(120,170,255,.18),
            rgba(255,255,255,0)
          );
          transform: translateX(35%);
          transition: opacity .18s ease;
        }
        .neoHdr.is-scrolled::after,
        .neoHdr.is-open::after{
          opacity: .95;
          animation: neoHair 2.8s linear infinite;
        }
        @keyframes neoHair{
          from{ transform: translateX(35%); }
          to{ transform: translateX(-35%); }
        }

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

        .neoNav{
          position:absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          display:flex;
          align-items:center;
          gap: 14px;
          white-space: nowrap;
        }

        .neoBrand{
          display:inline-flex; align-items:center;
          padding: 10px 10px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(255,255,255,.02);
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
          will-change: transform;
        }
        .neoBrand:hover{ transform: translateY(-1px); background: rgba(255,255,255,.04); border-color: rgba(255,255,255,.10); }

        .neoTop{
          position: relative;
          display:inline-flex;
          align-items:center;
          height: 40px;
          padding: 0 6px;
          background: transparent;
          border: 0;
          color: rgba(255,255,255,.78);
          font-weight: 760;
          font-size: 13px;
          letter-spacing: .01em;
          cursor:pointer;
          user-select:none;
          transition: color .14s ease, transform .14s ease;
        }
        .neoTop:hover{ color: rgba(255,255,255,.94); transform: translateY(-1px); }
        .neoTop.is-active{ color: rgba(255,255,255,.96); }

        .neoTop::after{
          content:"";
          position:absolute;
          left: 6px;
          right: 6px;
          bottom: 7px;
          height: 1px;
          background: rgba(120,170,255,.0);
          transform: scaleX(.55);
          transform-origin: center;
          transition: transform .16s ease, background-color .16s ease, opacity .16s ease;
          opacity: 0;
        }
        .neoTop:hover::after{
          opacity: 1;
          transform: scaleX(1);
          background: rgba(120,170,255,.35);
        }
        .neoTop.is-active::after{
          opacity: 1;
          transform: scaleX(1);
          background: rgba(120,170,255,.55);
        }

        .neoChev{
          opacity:.55;
          margin-left: 6px;
          transition: transform .14s ease, opacity .14s ease;
        }
        .neoDD.is-open .neoChev{ transform: rotate(180deg); opacity: .9; }

        .neoDD{ position: relative; display:inline-flex; }
        /* hover gap körpüsü */
        .neoDD::after{
          content:"";
          position:absolute;
          left: -10px;
          right: -10px;
          top: calc(100% - 2px);
          height: 14px;
          pointer-events: auto;
        }

        .neoPanelWrap{
          position:absolute;
          top: calc(100% + 6px);
          left: -12px;
          width: max-content;
          max-width: 520px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(10,12,18,.86);
          -webkit-backdrop-filter: blur(18px) saturate(1.10);
          backdrop-filter: blur(18px) saturate(1.10);
          box-shadow: 0 24px 90px rgba(0,0,0,.72);
          opacity: 0;
          pointer-events:none;
          transform: translateY(-8px) scale(.99);
          transform-origin: top left;
          transition: opacity .14s ease, transform .14s ease;
          overflow:hidden;
        }
        .neoDD.is-open .neoPanelWrap{
          opacity: 1;
          pointer-events:auto;
          transform: translateY(0) scale(1);
        }

        .neoElitePanel{ padding: 10px 10px 10px; }
        .neoEliteGrid{
          display:grid;
          grid-template-columns: auto 160px;
          gap: 10px;
          align-items: stretch;
        }
        .neoEliteList{
          display:grid;
          gap: 2px;
          padding: 4px 2px;
        }
        .neoEliteItem{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 12px;
          padding: 9px 10px;
          border-radius: 10px;
          color: rgba(255,255,255,.90);
          font-weight: 740;
          font-size: 13px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0);
          transition: transform .12s ease, color .12s ease, background-color .12s ease;
          will-change: transform;
        }
        .neoEliteItem:hover{
          transform: translateY(-1px);
          background: rgba(255,255,255,.035);
          color: rgba(255,255,255,.98);
        }
        .neoEliteItem.is-active{ background: rgba(120,170,255,.075); }
        .neoEliteText{ line-height: 1; letter-spacing: .01em; }
        .neoEliteDot{
          width: 8px; height: 8px;
          border-radius: 999px;
          background: rgba(255,255,255,.22);
          box-shadow: 0 0 0 4px rgba(120,170,255,.00);
          transition: background-color .14s ease, box-shadow .14s ease;
        }
        .neoEliteItem:hover .neoEliteDot{
          background: rgba(120,170,255,.72);
          box-shadow: 0 0 0 4px rgba(120,170,255,.10);
        }

        .neoEliteTicker{
          border-left: 1px solid rgba(255,255,255,.08);
          padding-left: 10px;
          display:flex;
          align-items:center;
          overflow:hidden;
          min-height: 42px;
          mask-image: linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent);
        }
        .neoEliteTickerInner{
          display:inline-flex;
          align-items:center;
          gap: 10px;
          white-space: nowrap;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 11px;
          letter-spacing: .14em;
          color: rgba(255,255,255,.62);
          transform: translateZ(0);
        }
        .neoEliteTickerInner.is-anim{ animation: neoTicker 5.4s linear infinite; }
        .neoEliteTickerLine{ opacity: .92; }
        .neoEliteTickerSep{ opacity: .35; }
        @keyframes neoTicker{ from{ transform: translateX(0%); } to{ transform: translateX(-34%); } }

        /* Language */
        .neoLangWrap{ position: relative; display:inline-flex; }
        .neoLangBtn{
          position: relative;
          display:inline-flex;
          align-items:center;
          gap: 8px;
          height: 40px;
          padding: 0 8px;
          border: 0;
          background: transparent;
          color: rgba(255,255,255,.86);
          font-weight: 820;
          font-size: 12px;
          cursor:pointer;
          transition: transform .14s ease, color .14s ease;
        }
        .neoLangBtn:hover{ transform: translateY(-1px); color: rgba(255,255,255,.96); }
        .neoLangBtn::after{
          content:"";
          position:absolute;
          left: 6px;
          right: 6px;
          bottom: 7px;
          height: 1px;
          opacity: 0;
          transform: scaleX(.55);
          transform-origin: center;
          background: rgba(120,170,255,.35);
          transition: opacity .16s ease, transform .16s ease;
        }
        .neoDD.is-open .neoLangBtn::after,
        .neoLangBtn:hover::after{ opacity: 1; transform: scaleX(1); }

        .neoLangPanel{
          position:absolute;
          top: calc(100% + 6px);
          right: -10px;
          width: 230px;
          padding: 10px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(10,12,18,.86);
          -webkit-backdrop-filter: blur(18px) saturate(1.10);
          backdrop-filter: blur(18px) saturate(1.10);
          box-shadow: 0 24px 90px rgba(0,0,0,.72);
          opacity: 0;
          pointer-events:none;
          transform: translateY(-8px) scale(.99);
          transform-origin: top right;
          transition: opacity .14s ease, transform .14s ease;
          overflow:hidden;
        }
        .neoDD.is-open .neoLangPanel{ opacity: 1; pointer-events:auto; transform: translateY(0) scale(1); }

        .neoLangItem{
          width: 100%;
          display:flex;
          align-items:center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 10px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0);
          background: transparent;
          color: rgba(255,255,255,.90);
          cursor:pointer;
          transition: background-color .12s ease, transform .12s ease, color .12s ease;
          font-weight: 740;
        }
        .neoLangItem + .neoLangItem{ margin-top: 6px; }
        .neoLangItem:hover{
          transform: translateY(-1px);
          background: rgba(255,255,255,.035);
          color: rgba(255,255,255,.98);
        }
        .neoLangItem.is-active{ background: rgba(120,170,255,.075); }
        .neoLangCode{ font-weight: 880; letter-spacing: .14em; opacity: .92; }
        .neoLangName{
          opacity: .70;
          font-size: 12px;
          transform: translateX(10px);
          transition: transform .14s ease, opacity .14s ease;
          white-space: nowrap;
        }
        .neoLangItem:hover .neoLangName{ transform: translateX(0); opacity: .90; }

        /* Mobile burger — futuristik 3 xətt -> X */
        .neoBurger{
          width: 46px; height: 40px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.88);
          display:none;
          align-items:center;
          justify-content:center;
          cursor:pointer;
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
          position: relative;
          overflow: hidden;
        }
        .neoBurger:hover{ transform: translateY(-1px); background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.14); }
        .neoBurgerGlow{
          position:absolute; inset:-40px;
          background: radial-gradient(circle at 30% 30%, rgba(120,170,255,.18), rgba(0,0,0,0) 55%);
          opacity: .85;
          pointer-events:none;
          transform: translateZ(0);
        }
        .neoBurgerLines{
          width: 18px; height: 12px;
          display:grid; gap: 4px;
          position: relative;
          z-index: 2;
        }
        .neoBurgerLines i{
          display:block;
          height: 2px;
          border-radius: 999px;
          background: rgba(255,255,255,.86);
          transition: transform .18s ease, opacity .18s ease;
          transform-origin: center;
        }
        .neoBurger.is-x .neoBurgerLines i:nth-child(1){ transform: translateY(6px) rotate(45deg); }
        .neoBurger.is-x .neoBurgerLines i:nth-child(2){ opacity: 0; }
        .neoBurger.is-x .neoBurgerLines i:nth-child(3){ transform: translateY(-6px) rotate(-45deg); }

        .neoMOv{ position: fixed; inset: 0; z-index: 100000; opacity: 0; pointer-events: none; transition: opacity .16s ease; }
        .neoMOv.is-open{ opacity: 1; pointer-events: auto; }
        .neoBg{ position:absolute; inset:0; border:0; background: rgba(0,0,0,.46); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); }

        .neoSheet{
          position:absolute; top: 12px; right: 12px; left: 12px;
          max-width: 520px; margin-left: auto;
          border-radius: 18px; border: 1px solid rgba(255,255,255,.10);
          overflow:hidden;
          transform: translateY(-10px) scale(.99);
          opacity: 0;
          transition: transform .16s ease, opacity .16s ease;
          background: rgba(10,12,18,.92);
          -webkit-backdrop-filter: blur(18px) saturate(1.10);
          backdrop-filter: blur(18px) saturate(1.10);
          box-shadow: 0 28px 90px rgba(0,0,0,.70);
        }
        .neoSheet.is-open{ transform: translateY(0) scale(1); opacity: 1; }

        /* Mobile terminal header */
        .neoHead{
          padding: 12px 14px 10px;
          border-bottom: 1px solid rgba(255,255,255,.06);
        }
        .neoHeadTop{
          display:flex; align-items:center; justify-content: space-between; gap: 10px;
        }
        .neoTermTitle{
          display:flex; align-items:center; gap: 10px;
          font-weight: 900;
          letter-spacing: .18em;
          font-size: 11px;
          color: rgba(255,255,255,.72);
        }
        .neoDot{
          width: 10px; height: 10px; border-radius: 999px;
          background: rgba(120,170,255,.90);
          box-shadow: 0 0 0 4px rgba(120,170,255,.10);
        }
        .neoClose{
          width: 44px; height: 40px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.05);
          color: rgba(255,255,255,.88);
          display:flex; align-items:center; justify-content:center;
          cursor: pointer;
        }

        .neoHeadTerm{
          margin-top: 10px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.03);
          padding: 10px 12px;
          overflow:hidden;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 11px;
          letter-spacing: .14em;
          color: rgba(255,255,255,.70);
          display:flex; align-items:center; gap: 8px;
        }
        .neoPrompt{ opacity: .65; }
        .neoTypeLine{
          white-space: nowrap;
          overflow:hidden;
          text-overflow: ellipsis;
        }
        .neoCursor{
          width: 9px; height: 12px;
          background: rgba(120,170,255,.85);
          border-radius: 2px;
          opacity: .9;
          animation: neoBlink 1s steps(1) infinite;
        }
        @keyframes neoBlink{ 50%{ opacity: .12; } }

        .neoBody{ padding: 12px 14px 14px; display:grid; gap: 10px; }

        .neoRow{
          display:flex; align-items:center; justify-content: space-between; gap: 10px;
          padding: 12px 12px; border-radius: 14px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.92);
          font-weight: 860;
        }
        .neoRow span{ opacity: .60; }

        .neoAcc{ border-radius: 16px; overflow:hidden; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.03); }
        .neoAccHead{
          width:100%;
          display:flex; align-items:center; justify-content: space-between; gap: 10px;
          padding: 12px 12px; border:0; background: transparent;
          color: rgba(255,255,255,.92);
          cursor:pointer;
          font-weight: 860;
        }
        .neoAccPanel{
          padding: 0 12px 12px;
          display:grid;
          gap: 8px;
          max-height: 0;
          overflow: hidden;
          transition: max-height .18s ease;
        }
        .neoAccPanel.is-open{ max-height: 520px; }

        .neoAccItem{
          display:flex; align-items:center; justify-content: space-between; gap: 10px;
          padding: 10px 10px; border-radius: 12px;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.90);
          font-weight: 860;
        }
        .neoAccItem span{ opacity: .60; }

        @media (max-width: 980px){
          .neoNav{ display:none; }
          .neoBurger{ display:inline-flex; }
        }

        @media (prefers-reduced-motion: reduce){
          .neoTop, .neoBrand, .neoLangBtn, .neoEliteItem, .neoLangItem, .neoBurger{ transition:none !important; }
          .neoPanelWrap, .neoLangPanel, .neoSheet{ transition:none !important; transform:none !important; }
          .neoEliteTickerInner{ animation: none !important; }
          .neoHdr::after{ animation:none !important; }
          .neoDD::after{ display:none !important; }
          .neoLangName{ transition:none !important; transform:none !important; }
          .neoCursor{ animation:none !important; opacity:.9 !important; }
        }
      `}</style>

      <div className="neoInner">
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
                height: isMobile ? 14 : 26,
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

        <nav className="neoNav" aria-label="Primary navigation">
          <NavLink to={withLang("/")} end className={({ isActive }) => cx("neoTop", isActive && "is-active")}>
            {t("nav.home") || "Ana səhifə"}
          </NavLink>

          <div ref={svcRef} className={cx("neoDD", openMenu === "services" && "is-open")} {...bindHover("services", svcRef)}>
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
            <div className="neoPanelWrap" onMouseEnter={cancelClose} onMouseLeave={() => scheduleClose("services")}>
              <ElitePanel items={SERVICES} k="services" />
            </div>
          </div>

          <div ref={scnRef} className={cx("neoDD", openMenu === "scenarios" && "is-open")} {...bindHover("scenarios", scnRef)}>
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
            <div className="neoPanelWrap" onMouseEnter={cancelClose} onMouseLeave={() => scheduleClose("scenarios")}>
              <ElitePanel items={SCENARIOS} k="scenarios" />
            </div>
          </div>

          <div ref={resRef} className={cx("neoDD", openMenu === "resources" && "is-open")} {...bindHover("resources", resRef)}>
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
            <div className="neoPanelWrap" onMouseEnter={cancelClose} onMouseLeave={() => scheduleClose("resources")}>
              <ElitePanel items={RESOURCES} k="resources" />
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

        <div className="neoRight">
          {/* LANG switcher: yalnız burada */}
          <div
            ref={langRef}
            className={cx("neoDD", "neoLangWrap", openMenu === "lang" && "is-open")}
            {...bindHover("lang", langRef)}
            data-wg-notranslate
          >
            <button
              type="button"
              className="neoLangBtn"
              aria-haspopup="menu"
              aria-expanded={openMenu === "lang"}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                cancelClose();
                setOpenMenu((cur) => (cur === "lang" ? null : "lang"));
              }}
            >
              {String(lang).toUpperCase()}
              <span aria-hidden="true" style={{ opacity: 0.72 }}>
                <ChevronDown size={14} />
              </span>
            </button>

            <div className="neoLangPanel" onMouseEnter={cancelClose} onMouseLeave={() => scheduleClose("lang")}>
              {LangPanel}
            </div>
          </div>

          {/* Futuristic burger */}
          <button
            className={cx("neoBurger", mobileOpen && "is-x")}
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls={panelId}
            onClick={() => {
              if (!mobileOpen) setMobileOpen(true);
              else closeMobile();
            }}
          >
            <span className="neoBurgerGlow" aria-hidden="true" />
            <span className="neoBurgerLines" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            {/* icon ehtiyat (aria), amma görünməsin */}
            <span style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}>
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </span>
          </button>
        </div>
      </div>

      {/* MOBILE OVERLAY */}
      {createPortal(
        <div className={cx("neoMOv", mobileOpen && "is-open")} aria-hidden={!mobileOpen}>
          <button className="neoBg" type="button" aria-label="Close" onClick={closeMobile} />
          <div id={panelId} className={cx("neoSheet", mobileSoft && "is-open")} role="dialog" aria-modal="true" aria-label="Menu">
            <div className="neoHead">
              <div className="neoHeadTop">
                <div className="neoTermTitle">
                  <span className="neoDot" aria-hidden="true" /> MENU
                </div>
                <button className="neoClose" type="button" aria-label="Close" onClick={closeMobile}>
                  <X size={18} />
                </button>
              </div>

              {/* Mobile terminal vibe */}
              <div className="neoHeadTerm" aria-hidden="true">
                <span className="neoPrompt">{">"}</span>
                <span className="neoTypeLine">
                  {mSvc ? "services/open" : mScn ? "scenarios/open" : mRes ? "resources/open" : "ready"}
                </span>
                <span className="neoCursor" />
              </div>
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

              {/* mobil overlay-də language YOX */}
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );

  useEffect(() => {
    return () => {
      if (closeT.current) window.clearTimeout(closeT.current);
    };
  }, []);

  if (!mounted) return null;
  return createPortal(headerNode, document.body);
}
