// src/components/Header.tsx
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { ChevronDown, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LANGS, DEFAULT_LANG, type Lang } from "../i18n/lang";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function isLang(x: string | undefined | null): x is Lang {
  return !!x && (LANGS as readonly string[]).includes(x as any);
}

/* motion pref */
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

/* ===== Desktop language dropdown (hover) ===== */
function LangMenu({ lang, onPick }: { lang: Lang; onPick: (l: Lang) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const closeT = useRef<number | null>(null);

  const nameOf = (c: Lang) =>
    c === "az" ? "Azərbaycan" : c === "tr" ? "Türk" : c === "en" ? "English" : c === "ru" ? "Русский" : "Español";

  const openDrop = () => {
    if (closeT.current) window.clearTimeout(closeT.current);
    closeT.current = null;
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

  return (
    <div
      ref={rootRef}
      className={cx("nxLang", open && "is-open")}
      data-wg-notranslate
      onMouseEnter={openDrop}
      onMouseLeave={scheduleClose}
    >
      <button type="button" className="nxLang__btn" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="nxLang__dot" aria-hidden="true" />
        <span className="nxLang__code">{lang.toUpperCase()}</span>
        <span className="nxLang__chev" aria-hidden="true">
          <ChevronDown size={14} />
        </span>
      </button>

      <div className="nxLang__panel" role="menu" aria-hidden={!open}>
        {LANGS.map((code) => (
          <button
            key={code}
            type="button"
            role="menuitem"
            className={cx("nxLang__item", code === lang && "is-active")}
            onClick={() => {
              onPick(code);
              setOpen(false);
            }}
          >
            <span className="nxLang__itemCode">{code.toUpperCase()}</span>
            <span className="nxLang__itemName">{nameOf(code)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

type DrawerKey = "services" | "usecases" | "resources" | null;

type Category = {
  id: string;
  label: string;
  sub: string;
  kind: DrawerKey; // which view to render on right
  badge?: string;
};

export default function Header({ introReady }: { introReady: boolean }) {
  const prefersReduced = usePrefersReducedMotion();

  const { i18n, t } = useTranslation();
  const { lang: paramLang } = useParams<{ lang?: string }>();
  const lang: Lang = isLang(paramLang) ? (paramLang as Lang) : DEFAULT_LANG;

  const location = useLocation();
  const navigate = useNavigate();
  const panelId = useId();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const headerRef = useRef<HTMLElement | null>(null);

  const [isMobile, setIsMobile] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // “3 xett” drawer (works on desktop + mobile)
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSoft, setDrawerSoft] = useState(false);

  // which category selected (left column)
  const [activeCat, setActiveCat] = useState<string>("it");
  const [activeView, setActiveView] = useState<DrawerKey>("services");

  // inside views
  const [svcActive, setSvcActive] = useState<string>("chatbot-24-7");
  const [ucActive, setUcActive] = useState<string>("finance");

  // matchMedia
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

  // stable hdr height var (no loops)
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    let last = -1;
    const apply = () => {
      const h = Math.round(el.getBoundingClientRect().height || 72);
      if (h !== last) {
        last = h;
        document.documentElement.style.setProperty("--nxHdrH", `${h}px`);
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

  // scroll -> scrolled class (only toggles when threshold changes)
  useEffect(() => {
    let raf = 0;
    let prev = false;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY || document.documentElement.scrollTop || 0;
        const on = y > 8;
        if (on !== prev) {
          prev = on;
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

  // route change close
  useEffect(() => {
    setDrawerOpen(false);
    setDrawerSoft(false);
  }, [location.pathname]);

  // drawer soft-open animation
  useEffect(() => {
    if (!drawerOpen) {
      setDrawerSoft(false);
      return;
    }
    const r = requestAnimationFrame(() => setDrawerSoft(true));
    return () => cancelAnimationFrame(r);
  }, [drawerOpen]);

  // lock body scroll when drawer open (desktop+mobile)
  useEffect(() => {
    const root = document.documentElement;
    const prev = root.style.overflow;
    if (drawerOpen) root.style.overflow = "hidden";
    else root.style.overflow = "";
    return () => {
      root.style.overflow = prev;
    };
  }, [drawerOpen]);

  const CATS: Category[] = useMemo(
    () => [
      { id: "it", label: "IT Equipment and Solutions", sub: "Office supplies and digital solutions", kind: "services", badge: "New" },
      { id: "software", label: "Software", sub: "Best solutions for business", kind: "services" },
      { id: "projects", label: "Projects", sub: "Our clients take the best step with us", kind: "usecases" },
      { id: "services", label: "Services", sub: "Get acquainted with our services", kind: "services" },
      { id: "resources", label: "Resources", sub: "Docs, FAQ, Guides, Privacy", kind: "resources" },
    ],
    []
  );

  const SERVICES = useMemo(
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

  const USECASES = useMemo(
    () => [
      { id: "finance", label: "Finance", to: "/use-cases/finance", line: "risk_check: pass → route: finance_flow → lead: scored_high" },
      { id: "healthcare", label: "Healthcare", to: "/use-cases/healthcare", line: "triage: smart → booking: confirmed → reminder: scheduled" },
      { id: "retail", label: "Retail", to: "/use-cases/retail", line: "intent: upsell → bundle: suggested → aov: increased" },
      { id: "logistics", label: "Logistics", to: "/use-cases/logistics", line: "shipment: located → eta: recalculated → notify: sent" },
      { id: "hotels", label: "Hotels & Resorts", to: "/use-cases/hotels", line: "guest: vip → request: concierge → upgrade: suggested" },
    ],
    []
  );

  const RES_LINKS = useMemo(
    () => [
      { label: "Docs", to: "/resources/docs" },
      { label: "FAQ", to: "/resources/faq" },
      { label: "Guides", to: "/resources/guides" },
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Blog", to: "/blog" },
    ],
    []
  );

  // Offer logos (marquee) — you can replace later with your own
  const BRAND_LOGOS = useMemo(
    () => [
      { k: "hpe", label: "Hewlett Packard Enterprise" },
      { k: "dell", label: "Dell" },
      { k: "lenovo", label: "Lenovo" },
      { k: "hp", label: "HP" },
      { k: "cloudflare", label: "Cloudflare" },
      { k: "microsoft", label: "Microsoft" },
      { k: "onescreen", label: "OneScreen" },
      { k: "brands", label: "BRANDEFENCE" },
      { k: "dnssense", label: "DNSSense" },
      { k: "fileorbis", label: "fileorbis" },
    ],
    []
  );

  const closeDrawer = useCallback(() => {
    setDrawerSoft(false);
    window.setTimeout(() => setDrawerOpen(false), 160);
  }, []);

  // keep active view synced to selected category
  useEffect(() => {
    const cat = CATS.find((c) => c.id === activeCat) || CATS[0];
    setActiveView(cat.kind);
  }, [activeCat, CATS]);

  const logoH = isMobile ? 18 : 24;

  const Drawer = (
    <div className={cx("nxDv", drawerOpen && "is-mounted", drawerSoft && "is-open")} aria-hidden={!drawerOpen}>
      <button className="nxDv__backdrop" type="button" aria-label="Close menu" onClick={closeDrawer} />
      <div id={panelId} className={cx("nxDrawer", drawerSoft && "is-open")} role="dialog" aria-modal="true" aria-label="Menu">
        <div className="nxDrawer__bg" aria-hidden="true" />
        <div className="nxDrawer__top">
          <div className="nxDrawer__title">
            <span className="nxDot" aria-hidden="true" />
            <span className="nxTitleTxt">OUR PRODUCTS & SERVICES</span>
          </div>
          <button className="nxClose" type="button" aria-label="Close" onClick={closeDrawer}>
            <X size={18} />
          </button>
        </div>

        <div className="nxDrawer__grid">
          {/* LEFT LIST */}
          <div className="nxLeft">
            {CATS.map((c) => {
              const active = c.id === activeCat;
              return (
                <button
                  key={c.id}
                  type="button"
                  className={cx("nxCat", active && "is-active")}
                  onMouseEnter={() => !isMobile && setActiveCat(c.id)}
                  onFocus={() => setActiveCat(c.id)}
                  onClick={() => setActiveCat(c.id)}
                >
                  <span className="nxCat__ico" aria-hidden="true">
                    <span className="nxIcoGlyph" />
                  </span>
                  <span className="nxCat__txt">
                    <span className="nxCat__label">
                      {c.label}
                      {c.badge ? <span className="nxBadge">{c.badge}</span> : null}
                    </span>
                    <span className="nxCat__sub">{c.sub}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* RIGHT PANEL */}
          <div className="nxRight" aria-label="details">
            {activeView === "services" ? (
              <div className="nxRight__inner">
                <div className="nxHero">
                  <div className="nxHero__kicker">Global Partnership</div>
                  <div className="nxHero__desc">Your trusted partner in building, supporting, and securing your IT infrastructure.</div>
                  <div className="nxHero__line" aria-hidden="true" />
                </div>

                <div className="nxOffers">
                  <div className="nxOffers__head">
                    <span className="nxOffers__title">Our Offers</span>
                    <span className="nxOffers__hint">→</span>
                  </div>

                  {/* logo marquee */}
                  <div className={cx("nxMarq", prefersReduced && "is-reduced")} aria-label="logos">
                    <div className="nxMarq__fade" aria-hidden="true" />
                    <div className="nxMarq__track">
                      {[0, 1].map((rep) => (
                        <div className="nxMarq__row" key={rep}>
                          {BRAND_LOGOS.map((b) => (
                            <div key={`${rep}-${b.k}`} className="nxLogo">
                              {b.label}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="nxCards">
                    <NavLink to={withLang("/services/websites")} className="nxCard" onClick={closeDrawer}>
                      <div className="nxCard__top">
                        <div className="nxCard__mini">Equipment</div>
                        <div className="nxCard__arr" aria-hidden="true">
                          →
                        </div>
                      </div>
                      <div className="nxCard__sub">Devices, setup, office IT</div>
                    </NavLink>

                    <NavLink to={withLang("/services/business-workflows")} className="nxCard" onClick={closeDrawer}>
                      <div className="nxCard__top">
                        <div className="nxCard__mini">Solutions</div>
                        <div className="nxCard__arr" aria-hidden="true">
                          →
                        </div>
                      </div>
                      <div className="nxCard__sub">Automation, integrations</div>
                    </NavLink>

                    <NavLink to={withLang("/services/technical-support")} className="nxCard" onClick={closeDrawer}>
                      <div className="nxCard__top">
                        <div className="nxCard__mini">Cybersecurity</div>
                        <div className="nxCard__arr" aria-hidden="true">
                          →
                        </div>
                      </div>
                      <div className="nxCard__sub">Hardening, monitoring</div>
                    </NavLink>
                  </div>

                  {/* slim “quick list” (no big blocks) */}
                  <div className="nxQuick">
                    {SERVICES.map((s) => (
                      <NavLink
                        key={s.id}
                        to={withLang(s.to)}
                        className={({ isActive }) => cx("nxQuick__item", (isActive || s.id === svcActive) && "is-active")}
                        onMouseEnter={() => setSvcActive(s.id)}
                        onFocus={() => setSvcActive(s.id)}
                        onClick={closeDrawer}
                      >
                        <span className="nxQuick__txt">{s.label}</span>
                        <span className="nxQuick__go" aria-hidden="true">
                          →
                        </span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>
            ) : activeView === "usecases" ? (
              <div className="nxRight__inner">
                <div className="nxHero">
                  <div className="nxHero__kicker">Use Cases</div>
                  <div className="nxHero__desc">Click a scenario. Right side “terminal” lines slide in — not huge blocks.</div>
                  <div className="nxHero__line" aria-hidden="true" />
                </div>

                <div className="nxUC">
                  <div className="nxUC__left">
                    {USECASES.map((u) => (
                      <NavLink
                        key={u.id}
                        to={withLang(u.to)}
                        className={({ isActive }) => cx("nxUC__item", (isActive || u.id === ucActive) && "is-active")}
                        onMouseEnter={() => setUcActive(u.id)}
                        onFocus={() => setUcActive(u.id)}
                        onClick={closeDrawer}
                      >
                        <span className="nxUC__label">{u.label}</span>
                        <span className="nxUC__go" aria-hidden="true">
                          →
                        </span>
                      </NavLink>
                    ))}
                  </div>

                  <div className={cx("nxTerm", prefersReduced && "is-reduced")} aria-label="terminal">
                    <div className="nxTerm__cap">
                      <span className="nxTerm__dot" aria-hidden="true" />
                      <span className="nxTerm__t">live</span>
                    </div>

                    <div className="nxTerm__body">
                      {USECASES.filter((u) => u.id === ucActive).map((u) => (
                        <div key={u.id} className="nxTerm__line" style={{ ["--spd" as any]: prefersReduced ? "0s" : "8.8s" }}>
                          <span className="nxTerm__prompt">$</span>
                          <span className="nxTerm__marq">{u.line} • {u.line} • {u.line}</span>
                        </div>
                      ))}
                    </div>

                    <div className="nxTerm__hint">select → route → capture → handoff</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="nxRight__inner">
                <div className="nxHero">
                  <div className="nxHero__kicker">Resources</div>
                  <div className="nxHero__desc">Docs, FAQ, Guides and privacy — clean, fast, no heavy panels.</div>
                  <div className="nxHero__line" aria-hidden="true" />
                </div>

                <div className="nxRes">
                  {RES_LINKS.map((r) => (
                    <NavLink key={r.to} to={withLang(r.to)} className="nxRes__item" onClick={closeDrawer}>
                      <span className="nxRes__txt">{r.label}</span>
                      <span className="nxRes__go" aria-hidden="true">
                        →
                      </span>
                    </NavLink>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* bottom strip */}
        <div className="nxBottom">
          <NavLink to={withLang("/")} end className="nxBLink" onClick={closeDrawer}>
            {t("nav.home")}
          </NavLink>
          <NavLink to={withLang("/about")} className="nxBLink" onClick={closeDrawer}>
            {t("nav.about")}
          </NavLink>
          <NavLink to={withLang("/blog")} className="nxBLink" onClick={closeDrawer}>
            {t("nav.blog")}
          </NavLink>
          <NavLink to={withLang("/contact")} className="nxBLink nxBLink--cta" onClick={closeDrawer}>
            {t("nav.contact")}
          </NavLink>
        </div>
      </div>
    </div>
  );

  const headerNode = (
    <header ref={headerRef} className={cx("nxH", introReady && "nxH--in", scrolled && "is-scrolled")}>
      <style>{`
        :root{ --nxHdrH: 72px; }
        .nxH, .nxH *{ box-sizing:border-box; }
        .nxH a, .nxH a:hover, .nxH a:focus, .nxH a:active{ text-decoration:none !important; }
        .nxH a{ color: inherit; }
        .nxH button{ font: inherit; }
        .nxH :focus-visible{ outline: none; box-shadow: 0 0 0 3px rgba(120,170,255,.18); border-radius: 14px; }

        /* header fixed */
        .nxH{
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 1200;
          width: 100%;
          background: rgba(10,12,18,.02);
          border-bottom: 1px solid rgba(255,255,255,.05);
          -webkit-backdrop-filter: blur(10px) saturate(1.05);
          backdrop-filter: blur(10px) saturate(1.05);
          transform: translateZ(0);
          will-change: backdrop-filter, background-color, border-color;
          transition: background-color .18s ease, border-color .18s ease, backdrop-filter .18s ease;
        }
        .nxH.is-scrolled{
          background: rgba(10,12,18,.72);
          border-bottom-color: rgba(255,255,255,.10);
          -webkit-backdrop-filter: blur(16px) saturate(1.14);
          backdrop-filter: blur(16px) saturate(1.14);
        }

        .nxC{ max-width: 1180px; margin: 0 auto; padding: 0 18px; height: var(--nxHdrH); display:flex; align-items:center; gap: 12px; }
        .nxL{ display:flex; align-items:center; gap: 12px; min-width:0; }
        .nxM{ flex: 1 1 auto; display:flex; align-items:center; justify-content:center; min-width:0; }
        .nxR{ display:flex; align-items:center; justify-content:flex-end; gap: 12px; }

        /* LEFT hamburger (unique) */
        .nxHamb{
          width: 44px; height: 40px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          display:flex; flex-direction: column; align-items:center; justify-content:center; gap: 6px;
          cursor: pointer;
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
        }
        .nxHamb:hover{ transform: translateY(-1px); background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.14); }
        .nxHamb__bar{
          width: 18px; height: 2px; border-radius: 999px;
          background: rgba(255,255,255,.88);
          opacity: .92;
          transform-origin: left center;
        }
        /* “signature” look */
        .nxHamb__bar:nth-child(2){ width: 14px; opacity: .78; }
        .nxHamb__bar:nth-child(3){ width: 20px; opacity: .86; }

        /* brand */
        .nxBrand{ display:inline-flex; align-items:center; gap: 10px; min-width:0; }
        .nxLogoAura{
          position:absolute; inset:-10px -18px;
          background:
            radial-gradient(120px 44px at 20% 55%, rgba(120,170,255,.14), transparent 60%),
            radial-gradient(120px 44px at 78% 45%, rgba(63,227,196,.10), transparent 62%);
          filter: blur(12px);
          opacity: .55;
          pointer-events:none;
        }
        .nxLogoWrap{ position:relative; display:flex; align-items:center; }
        .nxTopLinks{ display:flex; align-items:center; gap: 10px; min-width:0; }
        .nxTopLink{
          height: 40px;
          padding: 0 12px;
          border-radius: 999px;
          color: rgba(255,255,255,.74);
          font-weight: 780;
          font-size: 13px;
          letter-spacing: .02em;
          display:inline-flex; align-items:center; justify-content:center;
          transition: color .14s ease, background-color .14s ease;
        }
        .nxTopLink:hover{ color: rgba(255,255,255,.92); background: rgba(255,255,255,.05); }
        .nxTopLink.is-active{ color: rgba(255,255,255,.95); background: rgba(255,255,255,.08); }

        .nxCTA{
          height: 38px; padding: 0 14px; border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.05);
          color: rgba(255,255,255,.92);
          font-weight: 860; font-size: 13px;
          display:inline-flex; align-items:center; justify-content:center;
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
        }
        .nxCTA:hover{ transform: translateY(-1px); background: rgba(255,255,255,.07); border-color: rgba(255,255,255,.14); }

        /* LANG */
        .nxLang{ position:relative; }
        .nxLang__btn{
          display:inline-flex; align-items:center; gap: 8px;
          height: 38px; padding: 0 10px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.86);
          font-weight: 860; font-size: 12px;
          cursor: pointer;
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
        }
        .nxLang__btn:hover{ transform: translateY(-1px); background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.14); }
        .nxLang__dot{
          width: 8px; height: 8px; border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.9), rgba(120,170,255,.9));
          box-shadow: 0 0 0 3px rgba(120,170,255,.10);
        }
        .nxLang__code{ letter-spacing: .12em; }
        .nxLang__chev{ opacity: .75; }

        .nxLang__panel{
          position:absolute; top: calc(100% + 10px); right: 0;
          width: 210px; border-radius: 16px; padding: 10px;
          border: 1px solid rgba(255,255,255,.10);
          background:
            radial-gradient(120% 120% at 18% 0%, rgba(120,170,255,.12), transparent 56%),
            rgba(10,12,18,.92);
          -webkit-backdrop-filter: blur(18px) saturate(1.12);
          backdrop-filter: blur(18px) saturate(1.12);
          box-shadow: 0 24px 90px rgba(0,0,0,.70);
          opacity: 0; pointer-events: none;
          transform: translateY(-8px) scale(.99);
          transform-origin: top right;
          transition: opacity .16s ease, transform .16s ease;
          z-index: 2000;
        }
        .nxLang.is-open .nxLang__panel{ opacity: 1; pointer-events: auto; transform: translateY(0) scale(1); }
        .nxLang__item{
          width: 100%;
          display:flex; align-items:center; justify-content:flex-start;
          gap: 10px;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.03);
          color: rgba(255,255,255,.88);
          padding: 10px 10px;
          border-radius: 12px;
          cursor: pointer;
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
        }
        .nxLang__item + .nxLang__item{ margin-top: 8px; }
        .nxLang__item:hover{ transform: translateY(-1px); background: rgba(255,255,255,.05); border-color: rgba(255,255,255,.10); }
        .nxLang__item.is-active{ background: rgba(120,170,255,.10); border-color: rgba(120,170,255,.22); }
        .nxLang__itemCode{ width: 36px; font-weight: 900; letter-spacing: .12em; }
        .nxLang__itemName{ font-weight: 820; opacity: .88; }

        /* Drawer overlay */
        .nxDv{ position: fixed; inset:0; z-index: 3000; opacity: 0; pointer-events:none; transition: opacity .16s ease; }
        .nxDv.is-mounted{ display:block; }
        .nxDv.is-open{ opacity: 1; pointer-events: auto; }
        .nxDv__backdrop{
          position:absolute; inset:0; border:0;
          background: rgba(0,0,0,.46);
          -webkit-backdrop-filter: blur(8px);
          backdrop-filter: blur(8px);
          cursor: pointer;
        }

        /* Drawer panel (centered like your screenshot, but responsive) */
        .nxDrawer{
          position:absolute;
          top: 14px; left: 14px; right: 14px;
          max-width: 1040px;
          margin: 0 auto;
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,.12);
          overflow: hidden;
          background: rgba(10,12,18,.90);
          -webkit-backdrop-filter: blur(20px) saturate(1.12);
          backdrop-filter: blur(20px) saturate(1.12);
          box-shadow: 0 40px 150px rgba(0,0,0,.78);
          transform: translateY(-10px) scale(.992);
          opacity: 0;
          transition: transform .16s ease, opacity .16s ease;
        }
        .nxDrawer.is-open{ transform: translateY(0) scale(1); opacity: 1; }

        .nxDrawer__bg{
          position:absolute; inset:0;
          background:
            radial-gradient(120% 100% at 14% 0%, rgba(120,170,255,.14), transparent 58%),
            radial-gradient(120% 100% at 92% 0%, rgba(63,227,196,.10), transparent 60%),
            linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,0));
          pointer-events:none;
          opacity: .85;
        }

        .nxDrawer__top{
          position: relative; z-index: 2;
          display:flex; align-items:center; justify-content: space-between;
          padding: 14px 16px 12px;
          border-bottom: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.02);
        }
        .nxDrawer__title{ display:flex; align-items:center; gap: 10px; }
        .nxDot{
          width: 10px; height: 10px; border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), rgba(120,170,255,.85));
          box-shadow: 0 0 0 4px rgba(120,170,255,.10);
        }
        .nxTitleTxt{
          font-weight: 920;
          letter-spacing: .16em;
          font-size: 11px;
          color: rgba(255,255,255,.72);
        }
        .nxClose{
          width: 42px; height: 40px; border-radius: 14px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.05);
          color: rgba(255,255,255,.90);
          display:flex; align-items:center; justify-content:center;
          cursor: pointer;
          transition: transform .14s ease, background-color .14s ease;
        }
        .nxClose:hover{ transform: translateY(-1px); background: rgba(255,255,255,.07); }

        .nxDrawer__grid{
          position: relative; z-index: 2;
          display:grid;
          grid-template-columns: 360px 1fr;
          min-height: 520px;
        }

        /* LEFT column (categories) */
        .nxLeft{
          background: rgba(255,255,255,.03);
          border-right: 1px solid rgba(255,255,255,.08);
          padding: 14px;
          display:grid;
          gap: 10px;
        }
        .nxCat{
          width: 100%;
          text-align:left;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.03);
          border-radius: 16px;
          padding: 14px 14px;
          display:flex;
          gap: 12px;
          cursor: pointer;
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
          color: rgba(255,255,255,.90);
        }
        .nxCat:hover{ transform: translateY(-1px); background: rgba(255,255,255,.05); border-color: rgba(255,255,255,.12); }
        .nxCat.is-active{
          background:
            radial-gradient(120% 120% at 12% 20%, rgba(120,170,255,.14), transparent 58%),
            rgba(255,255,255,.05);
          border-color: rgba(120,170,255,.26);
        }
        .nxCat__ico{
          width: 44px; height: 44px; border-radius: 16px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          display:flex; align-items:center; justify-content:center;
          flex: 0 0 auto;
        }
        .nxIcoGlyph{
          width: 18px; height: 18px; border-radius: 6px;
          background: linear-gradient(135deg, rgba(120,170,255,.92), rgba(63,227,196,.86));
          box-shadow: 0 10px 24px rgba(0,0,0,.40);
        }
        .nxCat__txt{ min-width:0; display:flex; flex-direction:column; gap: 6px; }
        .nxCat__label{ font-weight: 900; font-size: 15px; letter-spacing: -.01em; display:flex; align-items:center; gap: 10px; }
        .nxCat__sub{ color: rgba(255,255,255,.65); font-size: 12.5px; line-height: 1.25; }

        .nxBadge{
          font-size: 11px;
          font-weight: 900;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(63,227,196,.22);
          background: rgba(63,227,196,.10);
          color: rgba(255,255,255,.86);
        }

        /* RIGHT */
        .nxRight{ padding: 16px; }
        .nxRight__inner{ height: 100%; display:flex; flex-direction:column; }
        .nxHero{ padding: 8px 6px 12px; }
        .nxHero__kicker{ font-weight: 920; font-size: 20px; color: rgba(255,255,255,.95); }
        .nxHero__desc{ margin-top: 6px; color: rgba(255,255,255,.68); font-size: 13px; line-height: 1.35; max-width: 560px; }
        .nxHero__line{ margin-top: 14px; height: 1px; background: rgba(255,255,255,.10); max-width: 420px; }

        .nxOffers{ margin-top: 4px; flex: 1 1 auto; display:flex; flex-direction:column; }
        .nxOffers__head{ display:flex; align-items:center; justify-content: space-between; padding: 0 6px; margin-bottom: 10px; }
        .nxOffers__title{ font-weight: 900; color: rgba(255,255,255,.82); }
        .nxOffers__hint{ opacity: .7; }

        /* Marquee logos */
        .nxMarq{
          position: relative;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.03);
          overflow: hidden;
          padding: 12px 10px;
          margin: 0 6px 14px;
        }
        .nxMarq__fade{
          position:absolute; inset:0;
          background: linear-gradient(90deg, rgba(10,12,18,1), rgba(10,12,18,0) 18%, rgba(10,12,18,0) 82%, rgba(10,12,18,1));
          pointer-events:none;
          opacity: .85;
        }
        .nxMarq__track{ display:flex; gap: 18px; }
        .nxMarq__row{
          display:flex;
          gap: 18px;
          align-items:center;
          min-width: max-content;
          animation: nxMarqMove 18s linear infinite;
        }
        .nxMarq.is-reduced .nxMarq__row{ animation: none; }
        @keyframes nxMarqMove{
          from{ transform: translateX(0); }
          to{ transform: translateX(-50%); }
        }
        .nxLogo{
          font-weight: 900;
          font-size: 12px;
          color: rgba(255,255,255,.78);
          padding: 10px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.03);
          white-space: nowrap;
        }

        /* Offer cards (like screenshot) */
        .nxCards{ display:grid; gap: 12px; padding: 0 6px; grid-template-columns: 1fr; }
        .nxCard{
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.03);
          padding: 16px 16px;
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
          color: rgba(255,255,255,.90);
        }
        .nxCard:hover{ transform: translateY(-1px); background: rgba(255,255,255,.05); border-color: rgba(255,255,255,.12); }
        .nxCard__top{ display:flex; align-items:center; justify-content: space-between; gap: 10px; }
        .nxCard__mini{ font-weight: 920; font-size: 18px; color: rgba(255,255,255,.94); }
        .nxCard__arr{ font-weight: 900; opacity: .8; }
        .nxCard__sub{ margin-top: 8px; font-size: 13px; color: rgba(255,255,255,.66); }

        /* Quick list (slim) */
        .nxQuick{ margin-top: 14px; padding: 0 6px; display:grid; gap: 8px; grid-template-columns: 1fr 1fr; }
        .nxQuick__item{
          display:flex; align-items:center; justify-content: space-between; gap: 10px;
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.03);
          color: rgba(255,255,255,.84);
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
          min-width:0;
        }
        .nxQuick__item:hover{ transform: translateY(-1px); background: rgba(255,255,255,.05); border-color: rgba(255,255,255,.10); }
        .nxQuick__item.is-active{ border-color: rgba(120,170,255,.22); background: rgba(120,170,255,.10); }
        .nxQuick__txt{ font-weight: 860; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .nxQuick__go{ opacity: .75; }

        /* Use cases view */
        .nxUC{ display:grid; grid-template-columns: 320px 1fr; gap: 14px; margin-top: 6px; }
        .nxUC__left{ display:grid; gap: 8px; padding: 0 6px; }
        .nxUC__item{
          display:flex; align-items:center; justify-content: space-between; gap: 10px;
          padding: 12px 12px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.03);
          color: rgba(255,255,255,.88);
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
        }
        .nxUC__item:hover{ transform: translateY(-1px); background: rgba(255,255,255,.05); border-color: rgba(255,255,255,.10); }
        .nxUC__item.is-active{ border-color: rgba(120,170,255,.24); background: rgba(120,170,255,.10); }
        .nxUC__label{ font-weight: 900; }
        .nxUC__go{ opacity: .7; }

        /* Terminal-like, BUT not big blocks: single slim rail with moving line */
        .nxTerm{
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(0,0,0,.18);
          overflow: hidden;
          position: relative;
          padding: 12px 12px 10px;
        }
        .nxTerm__cap{
          display:flex; align-items:center; gap: 8px;
          font-weight: 900; letter-spacing: .16em;
          font-size: 11px;
          color: rgba(255,255,255,.62);
          text-transform: uppercase;
        }
        .nxTerm__dot{
          width: 8px; height: 8px; border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), rgba(120,170,255,.85));
          box-shadow: 0 0 0 4px rgba(120,170,255,.10);
          animation: nxBreath 1.8s ease-in-out infinite;
        }
        @keyframes nxBreath{ 0%,100%{ transform: scale(.92); opacity:.75;} 50%{ transform: scale(1.05); opacity:1;} }

        .nxTerm__body{ margin-top: 10px; }
        .nxTerm__line{
          display:flex; align-items:center; gap: 10px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 12px;
          color: rgba(255,255,255,.82);
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.03);
          padding: 10px 12px;
          overflow:hidden;
        }
        .nxTerm__prompt{ color: rgba(120,170,255,.82); font-weight: 900; }
        .nxTerm__marq{
          display:inline-block;
          white-space: nowrap;
          min-width: max-content;
          animation: nxTermMove var(--spd, 8.8s) linear infinite;
        }
        .nxTerm.is-reduced .nxTerm__marq{ animation: none; }
        @keyframes nxTermMove{ from{ transform: translateX(0); } to{ transform: translateX(-50%); } }
        .nxTerm__hint{
          margin-top: 10px;
          font-size: 12px;
          color: rgba(255,255,255,.62);
          opacity: .9;
        }

        /* resources view */
        .nxRes{ margin-top: 8px; padding: 0 6px; display:grid; gap: 10px; max-width: 520px; }
        .nxRes__item{
          display:flex; align-items:center; justify-content: space-between; gap: 10px;
          padding: 12px 12px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.03);
          color: rgba(255,255,255,.86);
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
        }
        .nxRes__item:hover{ transform: translateY(-1px); background: rgba(255,255,255,.05); border-color: rgba(255,255,255,.12); }
        .nxRes__txt{ font-weight: 880; }
        .nxRes__go{ opacity: .75; }

        /* bottom strip */
        .nxBottom{
          position: relative; z-index: 2;
          padding: 12px 14px 14px;
          border-top: 1px solid rgba(255,255,255,.08);
          display:flex; flex-wrap: wrap; gap: 10px;
          background: rgba(255,255,255,.02);
        }
        .nxBLink{
          height: 36px;
          padding: 0 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.03);
          color: rgba(255,255,255,.82);
          font-weight: 860;
          display:inline-flex; align-items:center; justify-content:center;
          transition: transform .14s ease, background-color .14s ease, border-color .14s ease;
        }
        .nxBLink:hover{ transform: translateY(-1px); background: rgba(255,255,255,.05); border-color: rgba(255,255,255,.12); }
        .nxBLink--cta{
          background:
            radial-gradient(120% 120% at 20% 10%, rgba(120,170,255,.18), transparent 60%),
            rgba(255,255,255,.04);
          border-color: rgba(255,255,255,.12);
          color: rgba(255,255,255,.92);
        }

        /* responsive */
        @media (max-width: 920px){
          .nxM{ display:none; }
          .nxDrawer__grid{ grid-template-columns: 1fr; }
          .nxLeft{ border-right: 0; border-bottom: 1px solid rgba(255,255,255,.08); }
          .nxUC{ grid-template-columns: 1fr; }
          .nxQuick{ grid-template-columns: 1fr; }
          .nxDrawer{ top: 10px; left: 10px; right: 10px; }
        }
        @media (max-width: 520px){
          .nxC{ padding: 0 14px; }
          .nxCTA{ display:none; }
          .nxDrawer{ border-radius: 18px; }
        }
      `}</style>

      <div className="nxC">
        {/* LEFT: hamburger + brand */}
        <div className="nxL">
          <button
            className="nxHamb"
            type="button"
            aria-label={drawerOpen ? "Close menu" : "Open menu"}
            aria-expanded={drawerOpen}
            aria-controls={panelId}
            onClick={() => (drawerOpen ? closeDrawer() : setDrawerOpen(true))}
          >
            <span className="nxHamb__bar" />
            <span className="nxHamb__bar" />
            <span className="nxHamb__bar" />
          </button>

          <Link to={`/${lang}`} className="nxBrand" aria-label="NEOX" data-wg-notranslate>
            <span className="nxLogoWrap" aria-hidden="true">
              <span className="nxLogoAura" aria-hidden="true" />
              <img
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
                  maxWidth: isMobile ? 118 : 156,
                  objectFit: "contain",
                  display: "block",
                  userSelect: "none",
                  filter: "drop-shadow(0 10px 22px rgba(0,0,0,.42))",
                  transform: "translateZ(0)",
                }}
              />
            </span>
          </Link>
        </div>

        {/* CENTER: minimal pills (fast) */}
        <div className="nxM" aria-label="Top links">
          <div className="nxTopLinks">
            <NavLink to={withLang("/")} end className={({ isActive }) => cx("nxTopLink", isActive && "is-active")}>
              {t("nav.home")}
            </NavLink>
            <NavLink to={withLang("/about")} className={({ isActive }) => cx("nxTopLink", isActive && "is-active")}>
              {t("nav.about")}
            </NavLink>
            <NavLink to={withLang("/use-cases")} className={({ isActive }) => cx("nxTopLink", isActive && "is-active")}>
              {t("nav.useCases")}
            </NavLink>
            <NavLink to={withLang("/services/chatbot-24-7")} className={({ isActive }) => cx("nxTopLink", isActive && "is-active")}>
              {t("nav.services")}
            </NavLink>
          </div>
        </div>

        {/* RIGHT: lang + contact */}
        <div className="nxR">
          <LangMenu lang={lang} onPick={(c) => switchLang(c)} />
          <Link to={withLang("/contact")} className="nxCTA">
            {t("nav.contact")}
          </Link>
        </div>
      </div>

      {createPortal(Drawer, document.body)}
    </header>
  );

  if (!mounted) return null;
  return createPortal(headerNode, document.body);
}
