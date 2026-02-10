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

type ServiceId =
  | "chatbot-24-7"
  | "business-workflows"
  | "websites"
  | "mobile-apps"
  | "smm-automation"
  | "technical-support";

type ScenarioId = "finance" | "healthcare" | "retail" | "logistics" | "hotels";

type ItemDef = {
  id: string;
  label: string;
  sub: string;
  to: string;
};

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

/** ✅ Sənin əlavə etdiyin 5 ikon (public/social/*) — hələlik yalnız Chatbot 24/7 üçün */
const CHATBOT_SOCIAL_LOGOS = [
  "/social/whatsapp.svg",
  "/social/telegram.svg",
  "/social/messenger.svg",
  "/social/instagram.svg",
  "/social/linkedin.svg",
];

/** Row-level holo marquee: yalnız hover olunan sətirdə çalışır (FPS safe). */
function RowHolo({
  logos,
  active,
  reduced,
}: {
  logos: string[];
  active: boolean;
  reduced: boolean;
}) {
  const list = logos?.length ? logos : [];
  const doubled = useMemo(() => (list.length ? [...list, ...list] : []), [list]);

  if (!list.length) return null;

  return (
    <div className={cx("svcHolo", active && "is-on")} aria-hidden={!active}>
      <div className={cx("svcHolo__track", reduced && "is-reduced", active && "is-run")}>
        {doubled.map((src, i) => {
          const isLinkedIn = src.includes("/linkedin.svg");
          return (
            <span className={cx("svcHolo__cell", isLinkedIn && "is-li")} key={`${src}-${i}`}>
              <img className="svcHolo__img" src={src} alt="" loading="lazy" decoding="async" />
            </span>
          );
        })}
      </div>
      <span className="svcHolo__glow" />
    </div>
  );
}

function HoloStrip({ logos, reduced }: { logos: string[]; reduced: boolean }) {
  const list = logos?.length ? logos : [];
  const doubled = useMemo(() => [...list, ...list], [list]);

  if (!list.length) return null;

  return (
    <div className="hHolo" aria-hidden="true">
      <div className={cx("hHolo__track", reduced && "is-reduced")}>
        {doubled.map((src, i) => (
          <div className="hHolo__cell" key={`${src}-${i}`}>
            <img className="hHolo__img" src={src} alt="" loading="lazy" decoding="async" />
          </div>
        ))}
      </div>
      <div className="hHolo__glow" />
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
  const panelId = useId();

  // portal mount
  const [mounted, setMounted] = useState(false);

  // responsive
  const [isMobile, setIsMobile] = useState(false);

  // header blur on scroll (no loop)
  const headerRef = useRef<HTMLElement | null>(null);
  const [scrolled, setScrolled] = useState(false);

  // desktop dropdown open state (single)
  const [openMenu, setOpenMenu] = useState<MenuKey>(null);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  // active hovered item inside dropdowns
  const [svcActive, setSvcActive] = useState<ServiceId>("chatbot-24-7");
  const [ucActive, setUcActive] = useState<ScenarioId>("finance");

  // mobile overlay
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSoft, setMobileSoft] = useState(false);
  const [mSvc, setMSvc] = useState(false);
  const [mUc, setMUc] = useState(false);
  const [mRes, setMRes] = useState(false);

  // refs for click-outside desktop
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
      { id: "chatbot-24-7", label: "Chatbot 24/7", sub: "Instant support • lead capture • handoff", to: "/services/chatbot-24-7" },
      { id: "business-workflows", label: "Business Workflows", sub: "Automations • integrations • approvals", to: "/services/business-workflows" },
      { id: "websites", label: "Websites", sub: "Premium landing pages • SEO • speed", to: "/services/websites" },
      { id: "mobile-apps", label: "Mobile Apps", sub: "iOS/Android • UX • backend integration", to: "/services/mobile-apps" },
      { id: "smm-automation", label: "SMM Automation", sub: "Content plan • scheduling • analytics", to: "/services/smm-automation" },
      { id: "technical-support", label: "Technical Support", sub: "Monitoring • fixes • security • uptime", to: "/services/technical-support" },
    ],
    []
  );

  /**
   * Use Cases: səndə hazırda query-lidir
   *   /:lang/use-cases?scenario=finance
   */
  const USECASES: ItemDef[] = useMemo(
    () => [
      { id: "finance", label: "Finance", sub: "KYC-safe routing • demo funnel • handoff", to: "/use-cases?scenario=finance" },
      { id: "healthcare", label: "Healthcare", sub: "Triage • booking • reminders", to: "/use-cases?scenario=healthcare" },
      { id: "retail", label: "Retail", sub: "Upsell • bundles • returns • tracking", to: "/use-cases?scenario=retail" },
      { id: "logistics", label: "Logistics", sub: "ETA updates • escalation • tickets", to: "/use-cases?scenario=logistics" },
      { id: "hotels", label: "Hotels & Resorts", sub: "Reservations • concierge • upgrades", to: "/use-cases?scenario=hotels" },
    ],
    []
  );

  const RESOURCES: ItemDef[] = useMemo(
    () => [
      { id: "docs", label: "Docs", sub: "Technical docs & API guides", to: "/resources/docs" },
      { id: "faq", label: "FAQ", sub: "Most asked questions", to: "/resources/faq" },
      { id: "guides", label: "Guides", sub: "Step-by-step tutorials", to: "/resources/guides" },
    ],
    []
  );

  // scroll blur with css var --hdrp
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

  // set --hdrh
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
    clearTimers();
    openTimer.current = window.setTimeout(() => setOpenMenu(k), 0) as any;
  };

  const scheduleClose = (k: Exclude<MenuKey, null>) => {
    clearTimers();
    closeTimer.current = window.setTimeout(() => {
      setOpenMenu((cur) => (cur === k ? null : cur));
    }, 120) as any;
  };

  const closeMobile = () => {
    setMobileSoft(false);
    window.setTimeout(() => setMobileOpen(false), 160);
  };

  const isActivePath = (needle: string) => location.pathname.toLowerCase().includes(needle);

  /**
   * ✅ SERVICES PANEL (YENİ):
   * - Böyük sağ panel YOX
   * - Dropdown list qalır
   * - Yalnız Chatbot 24/7 hover olanda, həmin sətirdə sağda holo logo axını çıxır
   */
  const ServicesPanel = (
    <div className="hPanel hPanel--svcSimple" role="menu" aria-label="Services menu" aria-hidden={openMenu !== "services"}>
      <div className="svcList" role="presentation">
        {SERVICES.map((s) => {
          const active = s.id === svcActive;
          const showHolo = active && s.id === "chatbot-24-7";
          return (
            <NavLink
              key={s.id}
              to={withLang(s.to)}
              role="menuitem"
              className={({ isActive }) => cx("svcRow", (isActive || active) && "is-active")}
              onMouseEnter={() => setSvcActive(s.id as ServiceId)}
              onFocus={() => setSvcActive(s.id as ServiceId)}
              onClick={() => setOpenMenu(null)}
            >
              <span className="svcRow__left">
                <span className="svcRow__top">
                  <span className="svcRow__label">{s.label}</span>
                </span>
                <span className="svcRow__sub">{s.sub}</span>
              </span>

              <span className="svcRow__right" aria-hidden="true">
                <RowHolo logos={CHATBOT_SOCIAL_LOGOS} active={showHolo} reduced={prefersReduced} />
                <span className="svcRow__arrow">→</span>
              </span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );

  // ✅ Hələlik toxunmuruq (sonra istəyə görə eyni sistemə salarıq)
  const UseCasesPanel = (
    <div className="hPanel" role="menu" aria-label="Use cases menu" aria-hidden={openMenu !== "usecases"}>
      <div className="hPanel__grid">
        <div className="hPanel__list" role="presentation">
          {USECASES.map((u) => {
            const active = u.id === ucActive;
            return (
              <NavLink
                key={u.id}
                to={withLang(u.to)}
                role="menuitem"
                className={({ isActive }) => cx("hItem", (isActive || active) && "is-active")}
                onMouseEnter={() => setUcActive(u.id as ScenarioId)}
                onFocus={() => setUcActive(u.id as ScenarioId)}
                onClick={() => setOpenMenu(null)}
              >
                <span className="hItem__top">
                  <span className="hItem__label">{u.label}</span>
                  <span className="hItem__arrow" aria-hidden="true">
                    →
                  </span>
                </span>
                <span className="hItem__sub">{u.sub}</span>
              </NavLink>
            );
          })}
        </div>

        <div className="hPanel__detail" role="presentation">
          <div className="hDetailTop">
            <div className="hDetailTop__kicker">USE CASES</div>
            <div className="hDetailTop__title">{USECASES.find((x) => x.id === ucActive)?.label}</div>
            <div className="hDetailTop__desc">{USECASES.find((x) => x.id === ucActive)?.sub}</div>
          </div>

          <div className="hTermLite" aria-hidden={prefersReduced ? "true" : "false"}>
            <div className={cx("hTermLite__track", prefersReduced && "is-reduced")}>
              {[
                `scenario=${ucActive}`,
                "incoming: user message",
                "detect_lang: auto",
                "intent: route",
                "lead_capture: soft",
                "handoff: optional",
                "reply: instant",
                "export: CRM",
              ].map((txt, i) => (
                <div className="hTermLite__cell" key={`${txt}-${i}`}>
                  <span className="hTermLite__prompt">$</span>
                  <span className="hTermLite__txt">{txt}</span>
                </div>
              ))}
            </div>
          </div>

          {/* əvvəlki kimi qalır (sonra istəsən HOLO_LOGOS-ları da düzəldərik) */}
          <HoloStrip logos={[]} reduced={prefersReduced} />

          <div className="hDetailCTA">
            <NavLink to={withLang(`/use-cases?scenario=${ucActive}`)} className="hBtn" onClick={() => setOpenMenu(null)}>
              Open scenario <span className="hBtn__arr">→</span>
            </NavLink>
            <NavLink to={withLang("/contact")} className="hBtn hBtn--ghost" onClick={() => setOpenMenu(null)}>
              Contact <span className="hBtn__arr">→</span>
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  );

  const ResourcesPanel = (
    <div className="hPanel hPanel--small" role="menu" aria-label="Resources menu" aria-hidden={openMenu !== "resources"}>
      <div className="hPanel__grid hPanel__grid--small">
        <div className="hPanel__list hPanel__list--small" role="presentation">
          {RESOURCES.map((r) => (
            <NavLink
              key={r.id}
              to={withLang(r.to)}
              role="menuitem"
              className={({ isActive }) => cx("hItem", isActive && "is-active")}
              onClick={() => setOpenMenu(null)}
            >
              <span className="hItem__top">
                <span className="hItem__label">{r.label}</span>
                <span className="hItem__arrow" aria-hidden="true">
                  →
                </span>
              </span>
              <span className="hItem__sub">{r.sub}</span>
            </NavLink>
          ))}
        </div>

        <div className="hPanel__detail hPanel__detail--small" role="presentation">
          <div className="hDetailTop">
            <div className="hDetailTop__kicker">RESOURCES</div>
            <div className="hDetailTop__title">Docs • FAQ • Guides</div>
            <div className="hDetailTop__desc">Everything your team needs to onboard and ship faster.</div>
          </div>

          <div className="hDetailCTA">
            <NavLink to={withLang("/blog")} className="hBtn hBtn--ghost" onClick={() => setOpenMenu(null)}>
              Blog <span className="hBtn__arr">→</span>
            </NavLink>
            <NavLink to={withLang("/contact")} className="hBtn" onClick={() => setOpenMenu(null)}>
              Contact <span className="hBtn__arr">→</span>
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  );

  const LangPanel = (
    <div className="hLangPanel" role="menu" aria-label="Language menu" aria-hidden={openMenu !== "lang"}>
      {LANGS.map((code) => (
        <button
          key={code}
          type="button"
          role="menuitem"
          className={cx("hLangItem", code === lang && "is-active")}
          onClick={() => {
            switchLang(code);
            setOpenMenu(null);
          }}
        >
          <span className="hLangItem__code">{code.toUpperCase()}</span>
          <span className="hLangItem__reveal" aria-hidden="true">
            <span className="hLangItem__pill">{langFullName(code)}</span>
          </span>
        </button>
      ))}
    </div>
  );

  const headerNode = (
    <header ref={headerRef} className={cx("hX", introReady && "hX--in", scrolled && "is-scrolled", mobileOpen && "is-open")}>
      <style>{`
        :root{ --hdrh: 72px; --hdrp: 0; }

        /* hard rules */
        .hX, .hX *{ box-sizing:border-box; }
        .hX a, .hX a:hover, .hX a:focus, .hX a:active{ text-decoration:none !important; }
        .hX a{ color: inherit; }
        .hX :focus-visible{ outline: none; box-shadow: 0 0 0 3px rgba(120,170,255,.18); border-radius: 14px; }

        /* fixed, portal-safe */
        .hX{
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 1200;
          width: 100%;
          transform: translateZ(0);
          will-change: backdrop-filter, background-color, border-color;
          background: rgba(10,12,18,0.01);
          border-bottom: 1px solid rgba(255,255,255,0.03);
          transition: background-color .18s ease, border-color .18s ease;
        }
        .hX.is-scrolled{
          background: rgba(10,12,18, calc(0.06 + 0.28 * var(--hdrp)));
          border-bottom-color: rgba(255,255,255, calc(0.05 + 0.07 * var(--hdrp)));
          -webkit-backdrop-filter: blur(calc(10px + 12px * var(--hdrp))) saturate(1.12);
          backdrop-filter: blur(calc(10px + 12px * var(--hdrp))) saturate(1.12);
        }
        .hX.is-open{
          background: rgba(10,12,18,0.92);
          border-bottom-color: rgba(255,255,255,0.12);
          -webkit-backdrop-filter: blur(18px) saturate(1.16);
          backdrop-filter: blur(18px) saturate(1.16);
        }

        .hX__c{ max-width: 1180px; margin: 0 auto; padding: 0 18px; }
        .hX__i{ height: var(--hdrh); display:flex; align-items:center; justify-content: space-between; gap: 14px; }
        .hX__l{ display:flex; align-items:center; min-width: 0; gap: 12px; }
        .hX__m{ flex: 1 1 auto; display:flex; align-items:center; justify-content:center; gap: 10px; min-width:0; }
        .hX__r{ display:flex; align-items:center; justify-content:flex-end; gap: 12px; }

        .hBrand{
          display:inline-flex; align-items:center; gap: 10px;
          padding: 10px 10px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.03);
          transition: transform .14s ease, border-color .14s ease, background-color .14s ease;
        }
        .hBrand:hover{ transform: translateY(-1px); background: rgba(255,255,255,.05); border-color: rgba(255,255,255,.12); }
        .hLogoWrap{ position:relative; display:flex; align-items:center; }
        .hLogoAura{
          position:absolute; inset:-10px -18px;
          background:
            radial-gradient(120px 44px at 20% 55%, rgba(120,170,255,.12), transparent 60%),
            radial-gradient(120px 44px at 78% 45%, rgba(63,227,196,.08), transparent 62%);
          filter: blur(12px);
          opacity: .55;
          pointer-events:none;
        }

        /* top links / titles */
        .hTop{
          position: relative;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          height: 40px;
          padding: 0 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.00);
          background: transparent;
          color: rgba(255,255,255,.74);
          font-weight: 820;
          font-size: 13px;
          letter-spacing: .02em;
          cursor: pointer;
          transition: color .14s ease, background-color .14s ease, border-color .14s ease, transform .14s ease;
          user-select:none;
        }
        .hTop:hover{ color: rgba(255,255,255,.92); background: rgba(255,255,255,.05); border-color: rgba(255,255,255,.06); transform: translateY(-1px); }
        .hTop.is-active{ color: rgba(255,255,255,.95); background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.10); }
        .hTop__chev{ opacity: .78; transition: transform .14s ease; }
        .hDD.is-open .hTop__chev{ transform: rotate(180deg); }

        .hDD{ position: relative; display:inline-flex; }
        .hDD__panelWrap{
          position:absolute;
          top: calc(100% + 12px);
          left: 50%;
          transform: translateX(-50%);
          width: 860px;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,.10);
          background:
            radial-gradient(120% 120% at 18% 0%, rgba(120,170,255,.10), transparent 55%),
            radial-gradient(120% 120% at 92% 0%, rgba(63,227,196,.08), transparent 60%),
            rgba(10,12,18,.88);
          -webkit-backdrop-filter: blur(20px) saturate(1.12);
          backdrop-filter: blur(20px) saturate(1.12);
          box-shadow: 0 30px 110px rgba(0,0,0,.72);
          opacity: 0;
          pointer-events:none;
          transform-origin: top center;
          transition: opacity .14s ease, transform .14s ease;
          overflow:hidden;
          z-index: 1400;
        }
        .hDD.is-open .hDD__panelWrap{
          opacity: 1;
          pointer-events:auto;
          transform: translateX(-50%) translateY(0) scale(1);
        }

        /* ✅ Services dropdown: daha dar, “mega panel” hissi yox */
        .hDD__panelWrap--svc{ width: 520px; }

        /* panel layout (default) */
        .hPanel{ width: 100%; }
        .hPanel__grid{ display:grid; grid-template-columns: 360px 1fr; min-height: 360px; }
        .hPanel__list{
          padding: 14px 12px;
          border-right: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.02);
        }
        .hPanel__detail{ padding: 16px 16px 14px; position: relative; overflow:hidden; }

        .hPanel--small .hPanel__grid{ min-height: 260px; }
        .hPanel__grid--small{ grid-template-columns: 380px 1fr; }
        .hPanel__list--small{ padding: 14px 12px; }
        .hPanel__detail--small{ padding: 16px 16px 14px; }

        /* ✅ Services simple list */
        .hPanel--svcSimple{ padding: 12px; }
        .svcList{ display:flex; flex-direction:column; gap: 10px; }

        .svcRow{
          display:flex;
          align-items:stretch;
          justify-content:space-between;
          gap: 12px;
          padding: 12px 12px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.025);
          color: rgba(255,255,255,.92);
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
          will-change: transform;
        }
        .svcRow:hover{ transform: translateY(-1px); background: rgba(255,255,255,.04); border-color: rgba(255,255,255,.10); }
        .svcRow.is-active{
          background:
            radial-gradient(120% 120% at 12% 20%, rgba(120,170,255,.12), transparent 55%),
            rgba(255,255,255,.04);
          border-color: rgba(120,170,255,.24);
        }

        .svcRow__left{ min-width: 0; display:flex; flex-direction:column; }
        .svcRow__top{ display:flex; align-items:center; justify-content:space-between; gap: 10px; }
        .svcRow__label{ font-weight: 950; font-size: 13px; color: rgba(255,255,255,.95); }
        .svcRow__sub{ display:block; margin-top: 6px; font-size: 12px; line-height: 1.25; color: rgba(255,255,255,.62); }

        .svcRow__right{
          flex: 0 0 auto;
          display:flex;
          align-items:center;
          gap: 10px;
          min-width: 0;
        }
        .svcRow__arrow{
          opacity:.78;
          font-weight: 950;
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(0,0,0,.18);
        }

        /* Row holo marquee (only on active row => FPS) */
        .svcHolo{
          width: 180px;
          height: 36px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(0,0,0,.16);
          overflow:hidden;
          position:relative;
          opacity: 0;
          transform: translateX(6px);
          transition: opacity .14s ease, transform .14s ease;
          pointer-events:none;
        }
        .svcHolo.is-on{ opacity: 1; transform: translateX(0); }
        .svcHolo__glow{
          position:absolute; inset:-40px -70px;
          background:
            radial-gradient(220px 80px at 20% 30%, rgba(120,170,255,.18), transparent 60%),
            radial-gradient(220px 80px at 78% 60%, rgba(63,227,196,.12), transparent 65%);
          filter: blur(12px);
          opacity: .75;
          pointer-events:none;
        }

        .svcHolo__track{
          position:absolute; inset:0;
          display:flex;
          gap: 10px;
          padding: 8px 10px;
          align-items:center;
          will-change: transform;
          transform: translate3d(0,0,0);
        }
        /* default: no animation unless active */
        .svcHolo__track{ animation: none; }
        .svcHolo__track.is-run{ animation: svcMove 6.5s linear infinite; }
        .svcHolo__track.is-reduced{ animation: none !important; }

        @keyframes svcMove{
          from{ transform: translate3d(0,0,0); }
          to{ transform: translate3d(-50%,0,0); }
        }

        .svcHolo__cell{
          width: 22px; height: 22px;
          display:flex; align-items:center; justify-content:center;
          border-radius: 10px;
        }
        /* hamısı eyni ölçü */
        .svcHolo__img{
          width: 22px;
          height: 22px;
          display:block;
          object-fit: contain;
          opacity: .98;
          filter: drop-shadow(0 10px 18px rgba(0,0,0,.35));
        }
        /* LinkedIn optik kompensasiya */
        .svcHolo__cell.is-li .svcHolo__img{ transform: scale(1.08); transform-origin:center; }

        .hItem{
          display:block;
          padding: 12px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.025);
          color: rgba(255,255,255,.92);
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
        }
        .hItem + .hItem{ margin-top: 10px; }
        .hItem:hover{ transform: translateY(-1px); background: rgba(255,255,255,.04); border-color: rgba(255,255,255,.10); }
        .hItem.is-active{
          background:
            radial-gradient(120% 120% at 12% 20%, rgba(120,170,255,.12), transparent 55%),
            rgba(255,255,255,.04);
          border-color: rgba(120,170,255,.24);
        }
        .hItem__top{ display:flex; align-items:center; justify-content: space-between; gap: 10px; }
        .hItem__label{ font-weight: 900; font-size: 13px; color: rgba(255,255,255,.95); }
        .hItem__arrow{ opacity:.75; font-weight: 900; }
        .hItem__sub{ display:block; margin-top: 6px; font-size: 12px; line-height: 1.25; color: rgba(255,255,255,.62); }

        .hDetailTop__kicker{
          font-size: 11px;
          font-weight: 950;
          letter-spacing: .18em;
          color: rgba(255,255,255,.62);
        }
        .hDetailTop__title{
          margin-top: 10px;
          font-weight: 950;
          font-size: 22px;
          letter-spacing: .01em;
          color: rgba(255,255,255,.96);
        }
        .hDetailTop__desc{
          margin-top: 8px;
          font-size: 13px;
          line-height: 1.35;
          color: rgba(255,255,255,.70);
          max-width: 520px;
        }

        /* premium buttons */
        .hBtn{
          display:inline-flex; align-items:center; justify-content:center;
          height: 40px;
          padding: 0 14px;
          border-radius: 999px;
          font-weight: 900;
          font-size: 13px;
          color: rgba(255,255,255,.92);
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.06);
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
        }
        .hBtn:hover{ transform: translateY(-1px); border-color: rgba(255,255,255,.16); background: rgba(255,255,255,.08); }
        .hBtn--ghost{ background: rgba(255,255,255,.03); }
        .hBtn__arr{ margin-left: 8px; opacity: .85; }
        .hDetailCTA{ margin-top: 14px; display:flex; gap: 10px; flex-wrap: wrap; }

        /* hologram logo marquee (existing) */
        .hHolo{
          position: relative;
          margin-top: 12px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(0,0,0,.18);
          overflow:hidden;
        }
        .hHolo__track{
          display:flex;
          gap: 14px;
          padding: 12px 12px;
          align-items:center;
          animation: holoMove 9s linear infinite;
          will-change: transform;
        }
        .hHolo__track.is-reduced{ animation: none; }
        @keyframes holoMove{
          from{ transform: translateX(0); }
          to{ transform: translateX(-50%); }
        }
        .hHolo__cell{
          width: 38px; height: 38px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.03);
          display:flex; align-items:center; justify-content:center;
          box-shadow: 0 0 0 1px rgba(120,170,255,.10) inset;
        }
        .hHolo__img{
          width: 20px;
          height: 20px;
          object-fit: contain;
          filter: drop-shadow(0 10px 20px rgba(0,0,0,.35));
          opacity: .92;
        }
        .hHolo__glow{
          position:absolute; inset:0;
          background:
            radial-gradient(220px 80px at 20% 10%, rgba(120,170,255,.18), transparent 60%),
            radial-gradient(220px 80px at 80% 20%, rgba(63,227,196,.12), transparent 65%);
          pointer-events:none;
          opacity: .55;
          filter: blur(10px);
        }

        /* Usecases “terminal strip” */
        .hTermLite{
          margin-top: 12px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.03);
          overflow:hidden;
        }
        .hTermLite__track{
          display:flex;
          gap: 16px;
          padding: 10px 12px;
          align-items:center;
          white-space: nowrap;
          overflow:hidden;
          animation: termFlow 10s linear infinite;
          will-change: transform;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 12px;
          color: rgba(255,255,255,.80);
        }
        .hTermLite__track.is-reduced{ animation:none; }
        @keyframes termFlow{
          from{ transform: translateX(12px); }
          to{ transform: translateX(-40%); }
        }
        .hTermLite__cell{ display:inline-flex; align-items:center; gap: 8px; opacity:.95; }
        .hTermLite__prompt{ color: rgba(120,170,255,.82); font-weight: 900; }
        .hTermLite__txt{ opacity:.92; }

        /* right side */
        .hLangWrap{ position: relative; display:inline-flex; }
        .hLangBtn{
          display:inline-flex; align-items:center; gap: 8px;
          height: 40px;
          padding: 0 10px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.86);
          font-weight: 900;
          font-size: 12px;
          cursor:pointer;
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
        }
        .hLangBtn:hover{ transform: translateY(-1px); background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.14); }
        .hLangDot{
          width: 8px; height: 8px; border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.9), rgba(120,170,255,.9));
          box-shadow: 0 0 0 3px rgba(120,170,255,.10);
        }
        .hLangCode{ letter-spacing: .12em; }
        .hLangPanel{
          position:absolute;
          top: calc(100% + 12px);
          right: 0;
          width: 210px;
          padding: 10px;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(10,12,18,.90);
          -webkit-backdrop-filter: blur(18px) saturate(1.12);
          backdrop-filter: blur(18px) saturate(1.12);
          box-shadow: 0 24px 80px rgba(0,0,0,.65);
          opacity: 0;
          pointer-events:none;
          transform: translateY(-8px) scale(.99);
          transform-origin: top right;
          transition: opacity .16s ease, transform .16s ease;
          z-index: 1500;
        }
        .hDD.is-open .hLangPanel{ opacity:1; pointer-events:auto; transform: translateY(0) scale(1); }

        .hLangItem{
          width: 100%;
          display:flex; align-items:center; justify-content:flex-start;
          gap: 10px;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.03);
          color: rgba(255,255,255,.86);
          padding: 10px 10px;
          border-radius: 14px;
          cursor:pointer;
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
          position: relative;
        }
        .hLangItem + .hLangItem{ margin-top: 8px; }
        .hLangItem:hover{ transform: translateY(-1px); background: rgba(255,255,255,.05); border-color: rgba(255,255,255,.10); }
        .hLangItem.is-active{ background: rgba(120,170,255,.10); border-color: rgba(120,170,255,.22); }
        .hLangItem__code{ font-weight: 950; letter-spacing: .12em; width: 34px; text-align:left; }

        /* hover reveal pill to the LEFT */
        .hLangItem__reveal{
          position:absolute;
          right: calc(100% + 10px);
          top: 50%;
          transform: translateY(-50%) translateX(6px);
          opacity: 0;
          pointer-events:none;
          transition: opacity .14s ease, transform .14s ease;
        }
        .hLangItem:hover .hLangItem__reveal{ opacity:1; transform: translateY(-50%) translateX(0); }
        .hLangItem__pill{
          display:inline-flex; align-items:center;
          height: 34px;
          padding: 0 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(10,12,18,.90);
          -webkit-backdrop-filter: blur(14px) saturate(1.12);
          backdrop-filter: blur(14px) saturate(1.12);
          color: rgba(255,255,255,.86);
          font-weight: 900;
          white-space: nowrap;
          box-shadow: 0 18px 60px rgba(0,0,0,.55);
        }

        /* mobile */
        .hBurger{
          width: 46px; height: 40px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.88);
          display:none;
          align-items:center;
          justify-content:center;
          cursor:pointer;
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
        }
        .hBurger:hover{ transform: translateY(-1px); background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.14); }

        .hMOv{ position: fixed; inset: 0; z-index: 2200; opacity: 0; pointer-events: none; transition: opacity .16s ease; }
        .hMOv.is-mounted{ display:block; }
        .hMOv.is-open{ opacity: 1; pointer-events: auto; }
        .hMOv__bg{
          position:absolute; inset:0; border:0;
          background: rgba(0,0,0,.46);
          -webkit-backdrop-filter: blur(8px);
          backdrop-filter: blur(8px);
        }
        .hSheet{
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
        .hSheet.is-open{ transform: translateY(0) scale(1); opacity: 1; }

        .hSheet__head{
          display:flex; align-items:center; justify-content: space-between;
          padding: 14px 14px 10px;
          border-bottom: 1px solid rgba(255,255,255,.06);
        }
        .hSheet__title{
          font-weight: 950; letter-spacing: .18em; font-size: 11px; color: rgba(255,255,255,.70);
          display:flex; align-items:center; gap: 10px;
        }
        .hSheet__dot{
          width: 10px; height: 10px; border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), rgba(120,170,255,.85));
          box-shadow: 0 0 0 4px rgba(120,170,255,.10);
        }
        .hSheet__close{
          width: 44px; height: 40px; border-radius: 14px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.05);
          color: rgba(255,255,255,.88);
          display:flex; align-items:center; justify-content:center;
          cursor: pointer;
          transition: transform .14s ease, background-color .14s ease;
        }
        .hSheet__close:hover{ transform: translateY(-1px); background: rgba(255,255,255,.07); }

        .hSheet__body{ padding: 12px 14px 14px; display:grid; gap: 10px; }

        .hMRow{
          display:flex; align-items:center; justify-content: space-between; gap: 10px;
          padding: 12px 12px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.88);
          font-weight: 900;
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
        }
        .hMRow:hover{ transform: translateY(-1px); background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.12); }

        .hAcc{
          border-radius: 18px;
          overflow:hidden;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.03);
        }
        .hAcc__head{
          width:100%;
          display:flex; align-items:center; justify-content: space-between; gap: 10px;
          padding: 12px 12px;
          border:0; background: transparent;
          color: rgba(255,255,255,.90);
          cursor:pointer;
          font-weight: 950;
        }
        .hAcc__panel{
          padding: 0 12px 12px;
          display:grid;
          gap: 8px;
          max-height: 0;
          overflow: hidden;
          transition: max-height .18s ease;
        }
        .hAcc__panel.is-open{ max-height: 740px; }
        .hAcc__item{
          display:flex; align-items:center; justify-content: space-between; gap: 10px;
          padding: 10px 10px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.86);
          font-weight: 900;
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
        }
        .hAcc__item:hover{ transform: translateY(-1px); background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.10); }

        @media (max-width: 1060px){
          .hDD__panelWrap{ width: 780px; }
          .hDD__panelWrap--svc{ width: 500px; }
          .hPanel__grid{ grid-template-columns: 340px 1fr; }
        }
        @media (max-width: 920px){
          .hX__m{ display:none; }
          .hBurger{ display:inline-flex; }
          .hDD__panelWrap{ display:none; }
        }
        @media (max-width: 520px){
          .hX__c{ padding: 0 14px; }
          .hLangItem__reveal{ display:none; }
        }
      `}</style>

      <div className="hX__c">
        <div className="hX__i">
          <div className="hX__l">
            <Link to={`/${lang}`} className="hBrand" aria-label="NEOX" data-wg-notranslate>
              <span className="hLogoWrap" aria-hidden="true">
                <span className="hLogoAura" aria-hidden="true" />
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
              </span>
            </Link>
          </div>

          {/* DESKTOP TITLES */}
          <nav className="hX__m" aria-label="Primary navigation">
            <NavLink to={withLang("/")} end className={({ isActive }) => cx("hTop", isActive && "is-active")}>
              {t("nav.home")}
            </NavLink>

            <div
              ref={svcRef}
              className={cx("hDD", openMenu === "services" && "is-open")}
              onMouseEnter={() => openDrop("services")}
              onMouseLeave={() => scheduleClose("services")}
            >
              <button
                type="button"
                className={cx("hTop", (isActivePath("/services") || openMenu === "services") && "is-active")}
                aria-haspopup="menu"
                aria-expanded={openMenu === "services"}
                onClick={() => setOpenMenu((v) => (v === "services" ? null : "services"))}
              >
                {t("nav.services")}
                <span className="hTop__chev" aria-hidden="true">
                  <ChevronDown size={16} />
                </span>
              </button>

              {/* ✅ Services: small panel (no big detail) */}
              <div className="hDD__panelWrap hDD__panelWrap--svc">{ServicesPanel}</div>
            </div>

            <div
              ref={ucRef}
              className={cx("hDD", openMenu === "usecases" && "is-open")}
              onMouseEnter={() => openDrop("usecases")}
              onMouseLeave={() => scheduleClose("usecases")}
            >
              <button
                type="button"
                className={cx("hTop", (isActivePath("/use-cases") || openMenu === "usecases") && "is-active")}
                aria-haspopup="menu"
                aria-expanded={openMenu === "usecases"}
                onClick={() => setOpenMenu((v) => (v === "usecases" ? null : "usecases"))}
              >
                {t("nav.useCases")}
                <span className="hTop__chev" aria-hidden="true">
                  <ChevronDown size={16} />
                </span>
              </button>

              <div className="hDD__panelWrap">{UseCasesPanel}</div>
            </div>

            <div
              ref={resRef}
              className={cx("hDD", openMenu === "resources" && "is-open")}
              onMouseEnter={() => openDrop("resources")}
              onMouseLeave={() => scheduleClose("resources")}
            >
              <button
                type="button"
                className={cx("hTop", (isActivePath("/resources") || openMenu === "resources") && "is-active")}
                aria-haspopup="menu"
                aria-expanded={openMenu === "resources"}
                onClick={() => setOpenMenu((v) => (v === "resources" ? null : "resources"))}
              >
                Resources
                <span className="hTop__chev" aria-hidden="true">
                  <ChevronDown size={16} />
                </span>
              </button>

              <div className="hDD__panelWrap" style={{ width: 720 }}>
                {ResourcesPanel}
              </div>
            </div>

            <NavLink to={withLang("/blog")} className={({ isActive }) => cx("hTop", isActive && "is-active")}>
              {t("nav.blog")}
            </NavLink>

            <NavLink to={withLang("/contact")} className={({ isActive }) => cx("hTop", isActive && "is-active")}>
              {t("nav.contact")}
            </NavLink>
          </nav>

          {/* RIGHT */}
          <div className="hX__r">
            {/* LANG (hover open) */}
            <div
              ref={langRef}
              className={cx("hDD", "hLangWrap", openMenu === "lang" && "is-open")}
              onMouseEnter={() => openDrop("lang")}
              onMouseLeave={() => scheduleClose("lang")}
              data-wg-notranslate
            >
              <button
                type="button"
                className="hLangBtn"
                aria-haspopup="menu"
                aria-expanded={openMenu === "lang"}
                onClick={() => setOpenMenu((v) => (v === "lang" ? null : "lang"))}
              >
                <span className="hLangDot" aria-hidden="true" />
                <span className="hLangCode">{lang.toUpperCase()}</span>
                <span aria-hidden="true" style={{ opacity: 0.78 }}>
                  <ChevronDown size={14} />
                </span>
              </button>

              {LangPanel}
            </div>

            {/* MOBILE BUTTON */}
            <button
              className="hBurger"
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

      {/* MOBILE OVERLAY (same links, same structure) */}
      {createPortal(
        <div className={cx("hMOv", mobileOpen && "is-mounted", mobileSoft && "is-open")} aria-hidden={!mobileOpen}>
          <button className="hMOv__bg" type="button" aria-label="Close" onClick={closeMobile} />
          <div id={panelId} className={cx("hSheet", mobileSoft && "is-open")} role="dialog" aria-modal="true" aria-label="Menu">
            <div className="hSheet__head">
              <div className="hSheet__title">
                <span className="hSheet__dot" aria-hidden="true" /> MENU
              </div>
              <button className="hSheet__close" type="button" aria-label="Close" onClick={closeMobile}>
                <X size={18} />
              </button>
            </div>

            <div className="hSheet__body">
              <NavLink to={withLang("/")} end className="hMRow" onClick={closeMobile}>
                {t("nav.home")} <span aria-hidden="true">→</span>
              </NavLink>

              <div className="hAcc">
                <button className="hAcc__head" type="button" onClick={() => setMSvc((v) => !v)} aria-expanded={mSvc}>
                  {t("nav.services")} <span aria-hidden="true">{mSvc ? "−" : "+"}</span>
                </button>
                <div className={cx("hAcc__panel", mSvc && "is-open")} aria-hidden={!mSvc}>
                  {SERVICES.map((s) => (
                    <NavLink key={s.id} to={withLang(s.to)} className="hAcc__item" onClick={closeMobile}>
                      {s.label} <span aria-hidden="true">→</span>
                    </NavLink>
                  ))}
                </div>
              </div>

              <div className="hAcc">
                <button className="hAcc__head" type="button" onClick={() => setMUc((v) => !v)} aria-expanded={mUc}>
                  {t("nav.useCases")} <span aria-hidden="true">{mUc ? "−" : "+"}</span>
                </button>
                <div className={cx("hAcc__panel", mUc && "is-open")} aria-hidden={!mUc}>
                  {USECASES.map((u) => (
                    <NavLink key={u.id} to={withLang(u.to)} className="hAcc__item" onClick={closeMobile}>
                      {u.label} <span aria-hidden="true">→</span>
                    </NavLink>
                  ))}
                </div>
              </div>

              <div className="hAcc">
                <button className="hAcc__head" type="button" onClick={() => setMRes((v) => !v)} aria-expanded={mRes}>
                  Resources <span aria-hidden="true">{mRes ? "−" : "+"}</span>
                </button>
                <div className={cx("hAcc__panel", mRes && "is-open")} aria-hidden={!mRes}>
                  {RESOURCES.map((r) => (
                    <NavLink key={r.id} to={withLang(r.to)} className="hAcc__item" onClick={closeMobile}>
                      {r.label} <span aria-hidden="true">→</span>
                    </NavLink>
                  ))}
                  <NavLink to={withLang("/blog")} className="hAcc__item" onClick={closeMobile}>
                    {t("nav.blog")} <span aria-hidden="true">→</span>
                  </NavLink>
                </div>
              </div>

              <NavLink to={withLang("/blog")} className="hMRow" onClick={closeMobile}>
                {t("nav.blog")} <span aria-hidden="true">→</span>
              </NavLink>

              <NavLink to={withLang("/contact")} className="hMRow" onClick={closeMobile}>
                {t("nav.contact")} <span aria-hidden="true">→</span>
              </NavLink>

              {/* Lang quick row (desktop hover; mobile click) */}
              <div className="hAcc">
                <button className="hAcc__head" type="button" onClick={() => setOpenMenu((v) => (v === "lang" ? null : "lang"))}>
                  Language ({lang.toUpperCase()}) <span aria-hidden="true">+</span>
                </button>
                <div className={cx("hAcc__panel", openMenu === "lang" && "is-open")} aria-hidden={openMenu !== "lang"}>
                  {LANGS.map((code) => (
                    <button
                      key={code}
                      type="button"
                      className="hAcc__item"
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
