// src/components/Header.tsx
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { ChevronDown, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DEFAULT_LANG, type Lang } from "../i18n/lang";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

type MenuKey = "services" | "scenarios" | "resources" | "lang" | null;

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

  // mobile overlay (new system)
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSoft, setMobileSoft] = useState(false);
  const [mSvc, setMSvc] = useState(false);
  const [mScn, setMScn] = useState(false);

  const svcRef = useRef<HTMLDivElement | null>(null);
  const scnRef = useRef<HTMLDivElement | null>(null);
  const resRef = useRef<HTMLDivElement | null>(null);
  const langRef = useRef<HTMLDivElement | null>(null);

  const [hoverPreview, setHoverPreview] = useState<string>("");

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

  /** ✅ LANG SWITCH — stabil (i18n + route) */
  const switchLang = useCallback(
    (next: Lang) => {
      if (next === lang) return;

      // /az | /az/... -> rest
      const rest = location.pathname.replace(/^\/[a-z]{2}(?=\/|$)/i, "");
      const cleaned = rest === "" ? "/" : rest;
      const target = cleaned === "/" ? `/${next}` : `/${next}${cleaned}`;

      cancelClose();
      setOpenMenu(null);
      setMobileOpen(false);

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
    window.setTimeout(() => setMobileOpen(false), 180);
  };

  const openOnly = (k: Exclude<MenuKey, null>) => {
    cancelClose();
    setOpenMenu((cur) => (cur === k ? null : k));
  };

  const bindHover = (k: Exclude<MenuKey, null>) => {
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

  /** ✅ LANG PANEL — tək instans (səndə problem burdan idi) */
  const LangPanel = (
    <div className="neoLangPanel" role="menu" aria-label="Language menu" aria-hidden={openMenu !== "lang"}>
      {LANG_MENU.map((code) => (
        <button
          key={code}
          type="button"
          role="menuitem"
          className={cx("neoLangItem", code === lang && "is-active")}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            switchLang(code);
            setOpenMenu(null);
          }}
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
        .neoHdr :focus-visible{ outline:none; box-shadow: 0 0 0 3px rgba(120,170,255,.18); border-radius: 14px; }

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
          height: 76px;
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
          gap: 16px;
          white-space: nowrap;
        }

        .neoBrand{
          display:inline-flex; align-items:center;
          padding: 10px 10px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(255,255,255,.02);
          transition: transform .22s cubic-bezier(.2,.8,.2,1), background-color .22s ease, border-color .22s ease;
          will-change: transform;
        }
        .neoBrand:hover{ transform: translateY(-1px); background: rgba(255,255,255,.04); border-color: rgba(255,255,255,.10); }

        /* ✅ Desktop yazılar daha premium: böyük + yumşaq hover lift */
        .neoTop{
          position: relative;
          display:inline-flex;
          align-items:center;
          height: 44px;
          padding: 0 10px;
          background: rgba(255,255,255,.00);
          border: 0;
          color: rgba(255,255,255,.82);
          font-weight: 780;
          font-size: 14.5px;
          letter-spacing: .01em;
          cursor:pointer;
          user-select:none;
          border-radius: 999px;
          transition:
            transform .26s cubic-bezier(.2,.8,.2,1),
            color .22s ease,
            background-color .22s ease,
            box-shadow .22s ease;
          will-change: transform;
        }
        .neoTop:hover{
          color: rgba(255,255,255,.96);
          transform: translateY(-2px);
          background: rgba(255,255,255,.035);
          box-shadow: 0 10px 30px rgba(0,0,0,.22);
        }
        .neoTop.is-active{
          color: rgba(255,255,255,.97);
          background: rgba(120,170,255,.10);
          box-shadow: 0 12px 34px rgba(0,0,0,.26);
        }

        /* ❌ underline xətt TAM ləğv (istəmirdin) */
        .neoTop::after{ display:none !important; }

        .neoChev{
          opacity:.55;
          margin-left: 8px;
          transition: transform .18s ease, opacity .18s ease;
        }
        .neoDD.is-open .neoChev{ transform: rotate(180deg); opacity: .9; }

        .neoDD{ position: relative; display:inline-flex; }
        .neoDD::after{
          content:"";
          position:absolute;
          left: -12px;
          right: -12px;
          top: calc(100% - 2px);
          height: 16px;
          pointer-events: auto;
        }

        .neoPanelWrap{
          position:absolute;
          top: calc(100% + 8px);
          left: 0;
          width: max-content;
          max-width: 560px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(10,12,18,.86);
          -webkit-backdrop-filter: blur(18px) saturate(1.10);
          backdrop-filter: blur(18px) saturate(1.10);
          box-shadow: 0 24px 90px rgba(0,0,0,.72);
          opacity: 0;
          pointer-events:none;
          transform: translateY(-10px) scale(.99);
          transform-origin: top left;
          transition: opacity .18s ease, transform .18s ease;
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
          grid-template-columns: auto 170px;
          gap: 10px;
          align-items: stretch;
        }
        .neoEliteList{
          display:grid;
          gap: 4px;
          padding: 6px 4px;
        }
        .neoEliteItem{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 14px;
          padding: 10px 12px;
          border-radius: 12px;
          color: rgba(255,255,255,.92);
          font-weight: 760;
          font-size: 13.5px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0);
          transition: transform .22s cubic-bezier(.2,.8,.2,1), color .16s ease, background-color .16s ease;
          will-change: transform;
        }
        .neoEliteItem:hover{
          transform: translateY(-2px);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.98);
        }
        .neoEliteItem.is-active{ background: rgba(120,170,255,.085); }
        .neoEliteText{ line-height: 1; letter-spacing: .01em; }

        .neoEliteDot{
          width: 8px; height: 8px;
          border-radius: 999px;
          background: rgba(255,255,255,.22);
          box-shadow: 0 0 0 4px rgba(120,170,255,.00);
          transition: background-color .18s ease, box-shadow .18s ease;
          flex: 0 0 auto;
        }
        .neoEliteItem:hover .neoEliteDot{
          background: rgba(120,170,255,.80);
          box-shadow: 0 0 0 4px rgba(120,170,255,.10);
        }

        .neoEliteTicker{
          border-left: 1px solid rgba(255,255,255,.08);
          padding-left: 10px;
          display:flex;
          align-items:center;
          overflow:hidden;
          min-height: 44px;
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
        .neoEliteTickerInner.is-anim{ animation: neoTicker 5.6s linear infinite; }
        .neoEliteTickerSep{ opacity: .35; }
        @keyframes neoTicker{ from{ transform: translateX(0%); } to{ transform: translateX(-34%); } }

        /* Language */
        .neoLangWrap{ position: relative; display:inline-flex; }
        .neoLangBtn{
          position: relative;
          display:inline-flex;
          align-items:center;
          gap: 10px;
          height: 44px;
          padding: 0 12px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.03);
          color: rgba(255,255,255,.92);
          font-weight: 860;
          font-size: 12.5px;
          border-radius: 999px;
          cursor:pointer;
          transition: transform .22s cubic-bezier(.2,.8,.2,1), background-color .18s ease, border-color .18s ease;
        }
        .neoLangBtn:hover{
          transform: translateY(-2px);
          background: rgba(255,255,255,.05);
          border-color: rgba(255,255,255,.14);
        }

        .neoLangPanel{
          position:absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 240px;
          padding: 10px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(10,12,18,.88);
          -webkit-backdrop-filter: blur(18px) saturate(1.10);
          backdrop-filter: blur(18px) saturate(1.10);
          box-shadow: 0 24px 90px rgba(0,0,0,.72);
          opacity: 0;
          pointer-events:none;
          transform: translateY(-10px) scale(.99);
          transform-origin: top right;
          transition: opacity .18s ease, transform .18s ease;
          overflow:hidden;
        }
        .neoDD.is-open .neoLangPanel{
          opacity: 1;
          pointer-events:auto;
          transform: translateY(0) scale(1);
        }

        .neoLangItem{
          width: 100%;
          display:flex;
          align-items:center;
          justify-content: space-between;
          gap: 10px;
          padding: 11px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0);
          background: transparent;
          color: rgba(255,255,255,.90);
          cursor:pointer;
          transition: background-color .16s ease, transform .22s cubic-bezier(.2,.8,.2,1), color .16s ease;
          font-weight: 780;
        }
        .neoLangItem + .neoLangItem{ margin-top: 6px; }
        .neoLangItem:hover{
          transform: translateY(-2px);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.98);
        }
        .neoLangItem.is-active{ background: rgba(120,170,255,.10); }
        .neoLangCode{ font-weight: 920; letter-spacing: .14em; opacity: .95; }
        .neoLangName{
          opacity: .70;
          font-size: 12px;
          transform: translateX(10px);
          transition: transform .18s ease, opacity .18s ease;
          white-space: nowrap;
        }
        .neoLangItem:hover .neoLangName{ transform: translateX(0); opacity: .92; }

        /* Mobile: tam yeni premium entry */
        .neoBurger{
          width: 46px; height: 44px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.92);
          display:none;
          align-items:center;
          justify-content:center;
          cursor:pointer;
          transition: transform .22s cubic-bezier(.2,.8,.2,1), background-color .18s ease, border-color .18s ease;
          position: relative;
          overflow: hidden;
        }
        .neoBurger:hover{ transform: translateY(-2px); background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.16); }
        .neoBurgerGlow{
          position:absolute; inset:-44px;
          background: radial-gradient(circle at 35% 30%, rgba(120,170,255,.18), rgba(0,0,0,0) 58%);
          opacity: .9;
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
          background: rgba(255,255,255,.88);
          transition: transform .20s cubic-bezier(.2,.8,.2,1), opacity .18s ease;
          transform-origin: center;
        }
        .neoBurger.is-x .neoBurgerLines i:nth-child(1){ transform: translateY(6px) rotate(45deg); }
        .neoBurger.is-x .neoBurgerLines i:nth-child(2){ opacity: 0; }
        .neoBurger.is-x .neoBurgerLines i:nth-child(3){ transform: translateY(-6px) rotate(-45deg); }

        /* Mobile overlay (new “command menu”) */
        .neoMOv{ position: fixed; inset: 0; z-index: 100000; opacity: 0; pointer-events: none; transition: opacity .18s ease; }
        .neoMOv.is-open{ opacity: 1; pointer-events: auto; }
        .neoBg{ position:absolute; inset:0; border:0; background: rgba(0,0,0,.56); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); }

        .neoSheet{
          position:absolute; inset: 0;
          border-radius: 0;
          border: 0;
          overflow:hidden;
          transform: translateY(14px);
          opacity: 0;
          transition: transform .22s cubic-bezier(.2,.8,.2,1), opacity .22s ease;
          background: rgba(7,8,12,.94);
          -webkit-backdrop-filter: blur(18px) saturate(1.08);
          backdrop-filter: blur(18px) saturate(1.08);
        }
        .neoSheet.is-open{ transform: translateY(0); opacity: 1; }

        .neoMTop{
          padding: 18px 16px 14px;
          border-bottom: 1px solid rgba(255,255,255,.07);
          display:flex;
          align-items:flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        .neoMBrand{
          display:flex;
          flex-direction: column;
          gap: 10px;
          min-width: 0;
        }
        .neoMTitle{
          display:flex;
          align-items:center;
          gap: 10px;
          font-weight: 900;
          letter-spacing: .16em;
          font-size: 11px;
          color: rgba(255,255,255,.72);
        }
        .neoMDot{
          width: 10px; height: 10px; border-radius: 999px;
          background: rgba(120,170,255,.92);
          box-shadow: 0 0 0 4px rgba(120,170,255,.12);
        }
        .neoMLine{
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.03);
          padding: 12px 12px;
          display:flex; align-items:center; gap: 8px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 11px;
          letter-spacing: .14em;
          color: rgba(255,255,255,.72);
          overflow:hidden;
          max-width: 360px;
        }
        .neoMPrompt{ opacity: .65; }
        .neoMCursor{
          width: 9px; height: 12px;
          background: rgba(120,170,255,.85);
          border-radius: 2px;
          opacity: .9;
          animation: neoBlink 1s steps(1) infinite;
        }
        @keyframes neoBlink{ 50%{ opacity: .12; } }

        .neoMClose{
          width: 46px; height: 46px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.92);
          display:flex; align-items:center; justify-content:center;
          cursor: pointer;
          transition: transform .22s cubic-bezier(.2,.8,.2,1), background-color .18s ease, border-color .18s ease;
          flex: 0 0 auto;
        }
        .neoMClose:hover{ transform: translateY(-2px); background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.16); }

        .neoMBody{
          padding: 18px 16px 26px;
          display:grid;
          gap: 14px;
        }

        /* Mobile big premium buttons */
        .neoMMain{
          display:flex;
          align-items:center;
          justify-content: space-between;
          gap: 12px;
          padding: 16px 16px;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.96);
          font-weight: 880;
          font-size: 16px;
          letter-spacing: .01em;
          transition: transform .22s cubic-bezier(.2,.8,.2,1), background-color .18s ease, border-color .18s ease;
        }
        .neoMMain:hover{ transform: translateY(-2px); background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.14); }
        .neoMMain span{ opacity: .55; font-weight: 800; }

        .neoMAcc{
          border-radius: 20px;
          overflow:hidden;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.03);
        }
        .neoMAccHead{
          width:100%;
          display:flex;
          align-items:center;
          justify-content: space-between;
          gap: 12px;
          padding: 16px 16px;
          border:0;
          background: transparent;
          color: rgba(255,255,255,.96);
          cursor:pointer;
          font-weight: 900;
          font-size: 16px;
        }
        .neoMAccHead span{ opacity: .55; font-weight: 900; }
        .neoMAccPanel{
          padding: 0 16px 16px;
          display:grid;
          gap: 10px;
          max-height: 0;
          overflow: hidden;
          transition: max-height .22s cubic-bezier(.2,.8,.2,1);
        }
        .neoMAccPanel.is-open{ max-height: 880px; }

        .neoMItem{
          display:flex;
          align-items:center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 14px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.92);
          font-weight: 860;
          font-size: 14px;
          transition: transform .22s cubic-bezier(.2,.8,.2,1), background-color .18s ease, border-color .18s ease;
        }
        .neoMItem:hover{ transform: translateY(-2px); background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.12); }
        .neoMItem span{ opacity: .55; font-weight: 850; }

        @media (max-width: 980px){
          .neoNav{ display:none; }
          .neoBurger{ display:inline-flex; }
          .neoInner{ height: 70px; padding: 0 16px; }
        }

        @media (prefers-reduced-motion: reduce){
          .neoTop, .neoBrand, .neoLangBtn, .neoEliteItem, .neoLangItem, .neoBurger, .neoMMain, .neoMItem, .neoMClose{
            transition:none !important;
            transform:none !important;
          }
          .neoPanelWrap, .neoLangPanel, .neoSheet{ transition:none !important; transform:none !important; }
          .neoEliteTickerInner{ animation: none !important; }
          .neoHdr::after{ animation:none !important; }
          .neoDD::after{ display:none !important; }
          .neoLangName{ transition:none !important; transform:none !important; }
          .neoMCursor{ animation:none !important; opacity:.9 !important; }
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
                // ✅ logo mobil daha balaca
                height: isMobile ? 11 : 26,
                width: "auto",
                objectFit: "contain",
                display: "block",
                userSelect: "none",
                // ağır filterləri azaldırıq (fps üçün)
                filter: "drop-shadow(0 6px 14px rgba(0,0,0,.30))",
                transform: "translateZ(0)",
              }}
            />
          </Link>
        </div>

        {/* DESKTOP NAV */}
        <nav className="neoNav" aria-label="Primary navigation">
          <NavLink to={withLang("/")} end className={({ isActive }) => cx("neoTop", isActive && "is-active")}>
            {t("nav.home") || "Ana səhifə"}
          </NavLink>

          <div ref={svcRef} className={cx("neoDD", openMenu === "services" && "is-open")} {...bindHover("services")}>
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

          <div ref={scnRef} className={cx("neoDD", openMenu === "scenarios" && "is-open")} {...bindHover("scenarios")}>
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

          <div ref={resRef} className={cx("neoDD", openMenu === "resources" && "is-open")} {...bindHover("resources")}>
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

          {/* ❗ ayrıca “Resurslar” linki YOX — Blog qalır */}
          <NavLink to={withLang("/blog")} className={({ isActive }) => cx("neoTop", isActive && "is-active")}>
            {t("nav.blog") || "Blog"}
          </NavLink>

          <NavLink to={withLang("/contact")} className={({ isActive }) => cx("neoTop", isActive && "is-active")}>
            {t("nav.contact") || "Əlaqə"}
          </NavLink>
        </nav>

        <div className="neoRight">
          {/* LANG switcher (desktop+mobile) */}
          <div ref={langRef} className={cx("neoDD", "neoLangWrap", openMenu === "lang" && "is-open")} {...bindHover("lang")} data-wg-notranslate>
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
              <span aria-hidden="true" style={{ opacity: 0.75 }}>
                <ChevronDown size={14} />
              </span>
            </button>

            {/* ✅ burada outer wrapper YOX — düz panel */}
            {LangPanel}
          </div>

          {/* Mobile Futuristic Button */}
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
          </button>
        </div>
      </div>

      {/* MOBILE OVERLAY — NEW COMMAND MENU */}
      {createPortal(
        <div className={cx("neoMOv", mobileOpen && "is-open")} aria-hidden={!mobileOpen}>
          <button className="neoBg" type="button" aria-label="Close" onClick={closeMobile} />
          <div id={panelId} className={cx("neoSheet", mobileSoft && "is-open")} role="dialog" aria-modal="true" aria-label="Menu">
            <div className="neoMTop">
              <div className="neoMBrand">
                <div className="neoMTitle">
                  <span className="neoMDot" aria-hidden="true" /> NEOX MENU
                </div>
                <div className="neoMLine" aria-hidden="true">
                  <span className="neoMPrompt">{">"}</span>
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {mSvc ? "services/open" : mScn ? "scenarios/open" : "ready"}
                  </span>
                  <span className="neoMCursor" />
                </div>
              </div>

              <button className="neoMClose" type="button" aria-label="Close" onClick={closeMobile}>
                <X size={18} />
              </button>
            </div>

            <div className="neoMBody">
              <NavLink to={withLang("/")} end className="neoMMain" onClick={closeMobile}>
                {t("nav.home") || "Ana səhifə"} <span aria-hidden="true">↵</span>
              </NavLink>

              <div className="neoMAcc">
                <button className="neoMAccHead" type="button" onClick={() => setMSvc((v) => !v)} aria-expanded={mSvc}>
                  {t("nav.services") || "Xidmətlər"} <span aria-hidden="true">{mSvc ? "−" : "+"}</span>
                </button>
                <div className={cx("neoMAccPanel", mSvc && "is-open")} aria-hidden={!mSvc}>
                  {SERVICES.map((s) => (
                    <NavLink key={s.id} to={withLang(s.to)} className="neoMItem" onClick={closeMobile}>
                      {s.label} <span aria-hidden="true">↵</span>
                    </NavLink>
                  ))}
                </div>
              </div>

              <div className="neoMAcc">
                <button className="neoMAccHead" type="button" onClick={() => setMScn((v) => !v)} aria-expanded={mScn}>
                  {t("nav.useCases") || "Ssenarilər"} <span aria-hidden="true">{mScn ? "−" : "+"}</span>
                </button>
                <div className={cx("neoMAccPanel", mScn && "is-open")} aria-hidden={!mScn}>
                  {SCENARIOS.map((u) => (
                    <NavLink key={u.id} to={withLang(u.to)} className="neoMItem" onClick={closeMobile}>
                      {u.label} <span aria-hidden="true">↵</span>
                    </NavLink>
                  ))}
                </div>
              </div>

              {/* resources mobil overlay-də ayrıca bölmə istəmirsənsə: çıxara bilərik.
                  Amma saxladım — çox premium və təmizdir */}
              <div className="neoMAcc">
                <button className="neoMAccHead" type="button" onClick={() => setOpenMenu(null)} aria-expanded={false}>
                  Resources <span aria-hidden="true">•</span>
                </button>
                <div className={cx("neoMAccPanel", true && "is-open")} aria-hidden={false} style={{ maxHeight: 420 }}>
                  {RESOURCES.map((r) => (
                    <NavLink key={r.id} to={withLang(r.to)} className="neoMItem" onClick={closeMobile}>
                      {r.label} <span aria-hidden="true">↵</span>
                    </NavLink>
                  ))}
                </div>
              </div>

              <NavLink to={withLang("/faq")} className="neoMMain" onClick={closeMobile}>
                FAQ <span aria-hidden="true">↵</span>
              </NavLink>

              <NavLink to={withLang("/blog")} className="neoMMain" onClick={closeMobile}>
                {t("nav.blog") || "Blog"} <span aria-hidden="true">↵</span>
              </NavLink>

              <NavLink to={withLang("/contact")} className="neoMMain" onClick={closeMobile}>
                {t("nav.contact") || "Əlaqə"} <span aria-hidden="true">↵</span>
              </NavLink>
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
