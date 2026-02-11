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

const LANG_MENU: Lang[] = ["az", "tr", "ru", "en", "es"];

function isLang(x: string | undefined | null): x is Lang {
  if (!x) return false;
  const v = String(x).toLowerCase();
  return (LANG_MENU as readonly string[]).includes(v);
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

  // desktop menus
  const [openDD, setOpenDD] = useState<"services" | "scenarios" | "resources" | null>(null);
  const [langOpen, setLangOpen] = useState(false);

  // mobile
  const [mOpen, setMOpen] = useState(false);
  const [mSoft, setMSoft] = useState(false);
  const [mTab, setMTab] = useState<"main" | "services" | "scenarios">("main");

  const [scrolled, setScrolled] = useState(false);

  const ddSvcRef = useRef<HTMLDivElement | null>(null);
  const ddScnRef = useRef<HTMLDivElement | null>(null);
  const ddResRef = useRef<HTMLDivElement | null>(null);
  const ddLangRef = useRef<HTMLDivElement | null>(null);

  const [hoverPreview, setHoverPreview] = useState<string>("");

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

      const rest = location.pathname.replace(/^\/[a-z]{2}(?=\/|$)/i, "");
      const cleaned = rest === "" ? "/" : rest;
      const target = cleaned === "/" ? `/${next}` : `/${next}${cleaned}`;

      setLangOpen(false);
      setOpenDD(null);
      setMOpen(false);

      Promise.resolve(i18n.changeLanguage(next))
        .catch(() => {})
        .finally(() => navigate(target + location.search + location.hash, { replace: false }));
    },
    [i18n, lang, location.hash, location.pathname, location.search, navigate]
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

  // scroll blur (raf)
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
    setOpenDD(null);
    setLangOpen(false);
    setMOpen(false);
    setMSoft(false);
    setMTab("main");
  }, [location.pathname, location.search, location.hash]);

  // lock scroll for mobile sheet
  useEffect(() => {
    const root = document.documentElement;
    const prev = root.style.overflow;
    if (mOpen) root.style.overflow = "hidden";
    else root.style.overflow = "";
    return () => {
      root.style.overflow = prev;
    };
  }, [mOpen]);

  useEffect(() => {
    if (!mOpen) {
      setMSoft(false);
      return;
    }
    const r = requestAnimationFrame(() => setMSoft(true));
    return () => cancelAnimationFrame(r);
  }, [mOpen]);

  // click outside desktop dropdowns (lightweight)
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const tnode = e.target as Node;

      // lang
      if (langOpen && ddLangRef.current && !ddLangRef.current.contains(tnode)) setLangOpen(false);

      // dd
      if (!openDD) return;
      const ref =
        openDD === "services" ? ddSvcRef.current : openDD === "scenarios" ? ddScnRef.current : ddResRef.current;
      if (ref && !ref.contains(tnode)) setOpenDD(null);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [langOpen, openDD]);

  const closeMobile = () => {
    setMSoft(false);
    window.setTimeout(() => setMOpen(false), 180);
  };

  const ElitePanel = ({ items }: { items: ItemDef[] }) => {
    useEffect(() => {
      setHoverPreview(items[0]?.preview || "");
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return (
      <div className="neoElitePanel" role="menu">
        <div className="neoEliteGrid">
          <div className="neoEliteList" role="none">
            {items.map((it) => (
              <NavLink
                key={it.id}
                to={withLang(it.to)}
                role="menuitem"
                className={({ isActive }) => cx("neoEliteItem", isActive && "is-active")}
                onClick={() => setOpenDD(null)}
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

  const LangPanel = (
    <div className="neoLangPanel" role="menu" aria-label="Language menu" aria-hidden={!langOpen}>
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
    <header ref={headerRef} className={cx("neoHdr", introReady && "neoHdr--in", scrolled && "is-scrolled", mOpen && "is-open")}>
      <style>{`
        :root{ --hdrp:0; }

        .neoHdr, .neoHdr *{ box-sizing:border-box; }
        .neoHdr a, .neoHdr a:hover, .neoHdr a:focus, .neoHdr a:active{ text-decoration:none !important; }
        .neoHdr a{ color: inherit; }

        .neoHdr{
          position: fixed;
          top:0; left:0; right:0;
          z-index: 99999;
          isolation: isolate;
          background: rgba(10,12,18,0);
          border-bottom: 1px solid rgba(255,255,255,0);
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
          background: rgba(10,12,18,.86);
          border-bottom-color: rgba(255,255,255,.10);
          -webkit-backdrop-filter: blur(18px) saturate(1.10);
          backdrop-filter: blur(18px) saturate(1.10);
        }

        /* hairline only when scrolled/open */
        .neoHdr::after{
          content:"";
          position:absolute;
          left:0; right:0; bottom:-1px;
          height: 1px;
          opacity: 0;
          pointer-events:none;
          background: linear-gradient(90deg, rgba(255,255,255,0), rgba(120,170,255,.22), rgba(255,255,255,.08), rgba(120,170,255,.16), rgba(255,255,255,0));
          transform: translateX(35%);
          transition: opacity .18s ease;
        }
        .neoHdr.is-scrolled::after,
        .neoHdr.is-open::after{
          opacity: .9;
          animation: neoHair 2.8s linear infinite;
        }
        @keyframes neoHair{
          from{ transform: translateX(35%); }
          to{ transform: translateX(-35%); }
        }

        .neoInner{
          position: relative;
          width:100%;
          padding: 0 22px;
          height: 76px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 14px;
        }

        .neoNav{
          position:absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%,-50%);
          display:flex;
          align-items:center;
          gap: 18px;
          white-space: nowrap;
        }

        .neoBrand{
          display:inline-flex;
          align-items:center;
          padding: 10px 10px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(255,255,255,.02);
          transition: transform .22s cubic-bezier(.2,.8,.2,1), background-color .18s ease, border-color .18s ease;
        }
        .neoBrand:hover{ transform: translateY(-1px); background: rgba(255,255,255,.04); border-color: rgba(255,255,255,.10); }

        /* ✅ Desktop nav text: daha premium + neon sweep hover (pill YOX) */
        .neoTop{
          position: relative;
          display:inline-flex;
          align-items:center;
          height: 44px;
          padding: 0 10px;
          border: 0;
          background: transparent;
          color: rgba(255,255,255,.84);
          font-weight: 700;            /* gombul yox */
          font-size: 15.5px;           /* daha böyük */
          letter-spacing: .01em;
          cursor:pointer;
          user-select:none;
          border-radius: 10px;
          transition:
            transform .28s cubic-bezier(.2,.8,.2,1),
            color .20s ease;
          will-change: transform;
        }
        .neoTop:hover{
          color: rgba(255,255,255,.96);
          transform: translateY(-0.5px); /* maksimum yumşaq */
        }
        .neoTop.is-active{ color: rgba(255,255,255,.98); }

        /* Neon sweep: altdan soldan-sağa işıq */
        .neoTop::after{
          content:"";
          position:absolute;
          left: 6px;
          right: 6px;
          bottom: 6px;
          height: 2px;
          border-radius: 999px;
          background: linear-gradient(90deg,
            rgba(0,240,255,0),
            rgba(120,170,255,.55),
            rgba(0,240,255,.35),
            rgba(255,255,255,.10),
            rgba(0,240,255,0)
          );
          opacity: 0;
          transform: translateX(-24%);
          filter: blur(.2px);
          transition: opacity .18s ease;
          pointer-events:none;
        }
        .neoTop:hover::after{
          opacity: 1;
          animation: neoSweep .62s cubic-bezier(.2,.8,.2,1) both;
        }
        @keyframes neoSweep{
          from{ transform: translateX(-38%); }
          to{ transform: translateX(38%); }
        }

        .neoChev{ opacity:.55; margin-left: 8px; transition: transform .18s ease, opacity .18s ease; }
        .neoDD.is-open .neoChev{ transform: rotate(180deg); opacity:.9; }

        .neoDD{ position: relative; display:inline-flex; }

        .neoPanelWrap{
          position:absolute;
          top: calc(100% + 10px);
          left: 0;
          width: max-content;
          max-width: 560px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(10,12,18,.86);
          -webkit-backdrop-filter: blur(16px) saturate(1.08);
          backdrop-filter: blur(16px) saturate(1.08);
          box-shadow: 0 24px 90px rgba(0,0,0,.68);
          opacity: 0;
          pointer-events:none;
          transform: translateY(-10px) scale(.99);
          transition: opacity .18s ease, transform .18s ease;
          overflow:hidden;
        }
        .neoDD.is-open .neoPanelWrap{
          opacity: 1;
          pointer-events:auto;
          transform: translateY(0) scale(1);
        }

        .neoElitePanel{ padding: 10px; }
        .neoEliteGrid{
          display:grid;
          grid-template-columns: auto 170px;
          gap: 10px;
        }
        .neoEliteList{ display:grid; gap: 6px; padding: 6px 4px; }
        .neoEliteItem{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 14px;
          padding: 10px 12px;
          border-radius: 12px;
          color: rgba(255,255,255,.92);
          font-weight: 700;
          font-size: 13.5px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0);
          transition: transform .22s cubic-bezier(.2,.8,.2,1), background-color .18s ease, color .18s ease;
          will-change: transform;
        }
        .neoEliteItem:hover{
          transform: translateY(-1px);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.98);
        }
        .neoEliteItem.is-active{ background: rgba(120,170,255,.085); }
        .neoEliteDot{
          width: 8px; height: 8px; border-radius: 999px;
          background: rgba(255,255,255,.22);
          transition: background-color .18s ease;
        }
        .neoEliteItem:hover .neoEliteDot{ background: rgba(120,170,255,.85); }

        .neoEliteTicker{
          border-left: 1px solid rgba(255,255,255,.08);
          padding-left: 10px;
          display:flex; align-items:center;
          overflow:hidden;
          min-height: 44px;
          mask-image: linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent);
        }
        .neoEliteTickerInner{
          display:inline-flex; align-items:center; gap: 10px; white-space: nowrap;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 11px;
          letter-spacing: .14em;
          color: rgba(255,255,255,.62);
          transform: translateZ(0);
        }
        .neoEliteTickerInner.is-anim{ animation: neoTicker 5.6s linear infinite; }
        @keyframes neoTicker{ from{ transform: translateX(0%); } to{ transform: translateX(-34%); } }

        /* Lang button: premium + yüngül */
        .neoLangWrap{ position: relative; display:inline-flex; }
        .neoLangBtn{
          display:inline-flex; align-items:center; gap: 10px;
          height: 44px; padding: 0 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.03);
          color: rgba(255,255,255,.92);
          font-weight: 700;     /* gombul yox */
          font-size: 12.5px;
          cursor:pointer;
          transition: transform .22s cubic-bezier(.2,.8,.2,1), background-color .18s ease, border-color .18s ease;
        }
        .neoLangBtn:hover{ transform: translateY(-0.5px); background: rgba(255,255,255,.05); border-color: rgba(255,255,255,.14); }

        .neoLangPanel{
          position:absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 240px;
          padding: 10px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(10,12,18,.90);
          -webkit-backdrop-filter: blur(16px) saturate(1.08);
          backdrop-filter: blur(16px) saturate(1.08);
          box-shadow: 0 24px 90px rgba(0,0,0,.70);
          opacity: 0;
          pointer-events:none;
          transform: translateY(-10px) scale(.99);
          transition: opacity .18s ease, transform .18s ease;
          overflow:hidden;
        }
        .neoLangWrap.is-open .neoLangPanel{ opacity: 1; pointer-events:auto; transform: translateY(0) scale(1); }

        .neoLangItem{
          width:100%;
          display:flex; align-items:center; justify-content: space-between;
          gap: 10px;
          padding: 11px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0);
          background: transparent;
          color: rgba(255,255,255,.90);
          cursor:pointer;
          transition: transform .22s cubic-bezier(.2,.8,.2,1), background-color .18s ease;
          font-weight: 650;
        }
        .neoLangItem + .neoLangItem{ margin-top: 6px; }
        .neoLangItem:hover{ transform: translateY(-1px); background: rgba(255,255,255,.04); }
        .neoLangItem.is-active{ background: rgba(120,170,255,.10); }
        .neoLangCode{ font-weight: 800; letter-spacing: .14em; opacity: .95; }
        .neoLangName{ opacity: .75; font-size: 12px; white-space: nowrap; }

        /* Mobile button (SUPER light) */
        .neoBurger{
          width: 48px; height: 44px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.92);
          display:none;
          align-items:center; justify-content:center;
          cursor:pointer;
          transition: transform .22s cubic-bezier(.2,.8,.2,1), background-color .18s ease, border-color .18s ease;
        }
        .neoBurger:hover{ transform: translateY(-0.5px); background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.16); }
        .neoBurgerLines{
          width: 18px; height: 12px; display:grid; gap: 4px;
        }
        .neoBurgerLines i{ height: 2px; border-radius: 999px; background: rgba(255,255,255,.90); display:block; }

        @media (max-width: 980px){
          .neoNav{ display:none; }
          .neoBurger{ display:inline-flex; }
          .neoInner{ height: 70px; padding: 0 16px; }
        }

        /* MOBILE SHEET — transform-only (fps-safe) */
        .neoMOv{ position: fixed; inset: 0; z-index: 100000; opacity: 0; pointer-events: none; transition: opacity .18s ease; }
        .neoMOv.is-open{ opacity: 1; pointer-events: auto; }
        .neoBg{ position:absolute; inset:0; border:0; background: rgba(0,0,0,.55); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); }

        .neoSheet{
          position:absolute;
          left: 10px; right: 10px; bottom: 10px;
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(10,12,18,.94);
          -webkit-backdrop-filter: blur(18px) saturate(1.08);
          backdrop-filter: blur(18px) saturate(1.08);
          box-shadow: 0 40px 120px rgba(0,0,0,.75);
          transform: translateY(24px);
          opacity: 0;
          transition: transform .24s cubic-bezier(.2,.8,.2,1), opacity .22s ease;
          overflow:hidden;
          will-change: transform;
        }
        .neoSheet.is-open{ transform: translateY(0); opacity: 1; }

        .neoMTop{
          padding: 14px 14px 12px;
          border-bottom: 1px solid rgba(255,255,255,.07);
          display:flex; align-items:center; justify-content: space-between;
          gap: 12px;
        }
        .neoMTitle{
          font-weight: 800;
          font-size: 12px;
          letter-spacing: .16em;
          color: rgba(255,255,255,.72);
          display:flex; align-items:center; gap: 10px;
        }
        .neoMDot{ width: 9px; height: 9px; border-radius: 999px; background: rgba(120,170,255,.92); box-shadow: 0 0 0 4px rgba(120,170,255,.12); }
        .neoMClose{
          width: 40px; height: 40px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.92);
          display:flex; align-items:center; justify-content:center;
          cursor: pointer;
        }

        .neoMTabs{
          padding: 12px 12px 0;
          display:flex; gap: 8px;
        }
        .neoTab{
          flex: 1;
          height: 44px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.03);
          color: rgba(255,255,255,.90);
          font-weight: 820;
          font-size: 14px;
          cursor:pointer;
          transition: transform .22s cubic-bezier(.2,.8,.2,1), background-color .18s ease, border-color .18s ease;
        }
        .neoTab:active{ transform: scale(.99); }
        .neoTab.is-on{
          background: rgba(120,170,255,.12);
          border-color: rgba(120,170,255,.22);
        }

        .neoMBody{
          padding: 12px 12px 14px;
          display:grid;
          gap: 10px;
          max-height: min(62vh, 560px);
          overflow: auto;
          -webkit-overflow-scrolling: touch;
        }

        .neoMItem{
          display:flex; align-items:center; justify-content: space-between;
          gap: 12px;
          padding: 14px 14px;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.94);
          font-weight: 860;
          font-size: 15px;
          transition: transform .22s cubic-bezier(.2,.8,.2,1), background-color .18s ease;
        }
        .neoMItem:hover{ transform: translateY(-1px); background: rgba(255,255,255,.06); }
        .neoMItem span{ opacity: .55; font-weight: 850; }

        @media (prefers-reduced-motion: reduce){
          .neoTop, .neoBrand, .neoLangBtn, .neoEliteItem, .neoLangItem, .neoBurger, .neoSheet, .neoMItem, .neoTab{
            transition:none !important;
            transform:none !important;
          }
          .neoEliteTickerInner{ animation:none !important; }
          .neoHdr::after{ animation:none !important; }
          .neoTop:hover::after{ animation:none !important; opacity: 1 !important; transform:none !important; }
        }
      `}</style>

      <div className="neoInner">
        <div style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
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
                height: isMobile ? 10 : 26,
                width: "auto",
                objectFit: "contain",
                display: "block",
                userSelect: "none",
                filter: "drop-shadow(0 6px 14px rgba(0,0,0,.28))",
              }}
            />
          </Link>
        </div>

        {/* DESKTOP NAV */}
        <nav className="neoNav" aria-label="Primary navigation">
          <NavLink to={withLang("/")} end className={({ isActive }) => cx("neoTop", isActive && "is-active")}>
            {t("nav.home") || "Ana səhifə"}
          </NavLink>

          <div ref={ddSvcRef} className={cx("neoDD", openDD === "services" && "is-open")}>
            <button
              type="button"
              className={cx("neoTop", openDD === "services" && "is-active")}
              aria-haspopup="menu"
              aria-expanded={openDD === "services"}
              onClick={() => setOpenDD((c) => (c === "services" ? null : "services"))}
            >
              {t("nav.services") || "Xidmətlər"}
              <span className="neoChev" aria-hidden="true">
                <ChevronDown size={16} />
              </span>
            </button>
            <div className="neoPanelWrap">{openDD === "services" ? <ElitePanel items={SERVICES} /> : null}</div>
          </div>

          <div ref={ddScnRef} className={cx("neoDD", openDD === "scenarios" && "is-open")}>
            <button
              type="button"
              className={cx("neoTop", openDD === "scenarios" && "is-active")}
              aria-haspopup="menu"
              aria-expanded={openDD === "scenarios"}
              onClick={() => setOpenDD((c) => (c === "scenarios" ? null : "scenarios"))}
            >
              {t("nav.useCases") || "Ssenarilər"}
              <span className="neoChev" aria-hidden="true">
                <ChevronDown size={16} />
              </span>
            </button>
            <div className="neoPanelWrap">{openDD === "scenarios" ? <ElitePanel items={SCENARIOS} /> : null}</div>
          </div>

          <div ref={ddResRef} className={cx("neoDD", openDD === "resources" && "is-open")}>
            <button
              type="button"
              className={cx("neoTop", openDD === "resources" && "is-active")}
              aria-haspopup="menu"
              aria-expanded={openDD === "resources"}
              onClick={() => setOpenDD((c) => (c === "resources" ? null : "resources"))}
            >
              Resources
              <span className="neoChev" aria-hidden="true">
                <ChevronDown size={16} />
              </span>
            </button>
            <div className="neoPanelWrap">{openDD === "resources" ? <ElitePanel items={RESOURCES} /> : null}</div>
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

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* LANG (click-only, stable) */}
          <div ref={ddLangRef} className={cx("neoLangWrap", langOpen && "is-open")} data-wg-notranslate>
            <button
              type="button"
              className="neoLangBtn"
              aria-haspopup="menu"
              aria-expanded={langOpen}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setLangOpen((v) => !v)}
            >
              {String(lang).toUpperCase()}
              <span aria-hidden="true" style={{ opacity: 0.75 }}>
                <ChevronDown size={14} />
              </span>
            </button>
            {LangPanel}
          </div>

          {/* MOBILE BTN */}
          <button
            className="neoBurger"
            type="button"
            aria-label={mOpen ? "Close menu" : "Open menu"}
            aria-expanded={mOpen}
            aria-controls={panelId}
            onClick={() => {
              if (!mOpen) {
                setMTab("main");
                setMOpen(true);
              } else closeMobile();
            }}
          >
            <span className="neoBurgerLines" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </button>
        </div>
      </div>

      {/* MOBILE SHEET */}
      {createPortal(
        <div className={cx("neoMOv", mOpen && "is-open")} aria-hidden={!mOpen}>
          <button className="neoBg" type="button" aria-label="Close" onClick={closeMobile} />
          <div id={panelId} className={cx("neoSheet", mSoft && "is-open")} role="dialog" aria-modal="true" aria-label="Menu">
            <div className="neoMTop">
              <div className="neoMTitle">
                <span className="neoMDot" aria-hidden="true" /> NEOX
              </div>
              <button className="neoMClose" type="button" aria-label="Close" onClick={closeMobile}>
                <X size={18} />
              </button>
            </div>

            {/* tabs */}
            <div className="neoMTabs">
              <button className={cx("neoTab", mTab === "main" && "is-on")} onClick={() => setMTab("main")} type="button">
                Menu
              </button>
              <button className={cx("neoTab", mTab === "services" && "is-on")} onClick={() => setMTab("services")} type="button">
                Services
              </button>
              <button className={cx("neoTab", mTab === "scenarios" && "is-on")} onClick={() => setMTab("scenarios")} type="button">
                Scenarios
              </button>
            </div>

            <div className="neoMBody">
              {mTab === "main" ? (
                <>
                  <NavLink to={withLang("/")} end className="neoMItem" onClick={closeMobile}>
                    {t("nav.home") || "Ana səhifə"} <span aria-hidden="true">↵</span>
                  </NavLink>
                  <NavLink to={withLang("/faq")} className="neoMItem" onClick={closeMobile}>
                    FAQ <span aria-hidden="true">↵</span>
                  </NavLink>
                  <NavLink to={withLang("/blog")} className="neoMItem" onClick={closeMobile}>
                    {t("nav.blog") || "Blog"} <span aria-hidden="true">↵</span>
                  </NavLink>
                  <NavLink to={withLang("/contact")} className="neoMItem" onClick={closeMobile}>
                    {t("nav.contact") || "Əlaqə"} <span aria-hidden="true">↵</span>
                  </NavLink>
                  {/* ✅ Resources mobil menyudan çıxarıldı — fps + sadəlik */}
                </>
              ) : mTab === "services" ? (
                <>
                  {SERVICES.map((s) => (
                    <NavLink key={s.id} to={withLang(s.to)} className="neoMItem" onClick={closeMobile}>
                      {s.label} <span aria-hidden="true">↵</span>
                    </NavLink>
                  ))}
                </>
              ) : (
                <>
                  {SCENARIOS.map((u) => (
                    <NavLink key={u.id} to={withLang(u.to)} className="neoMItem" onClick={closeMobile}>
                      {u.label} <span aria-hidden="true">↵</span>
                    </NavLink>
                  ))}
                </>
              )}
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
