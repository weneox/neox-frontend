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
  return window;
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function isLang(x: string | undefined | null): x is Lang {
  return !!x && (LANGS as readonly string[]).includes(x as any);
}

/* ===== Lang Menu ===== */
function LangMenu({ lang, onPick }: { lang: Lang; onPick: (l: Lang) => void }) {
  return (
    <button
      className="langMenu__btn"
      style={{
        background: "rgba(255,255,255,.06)",
        borderRadius: 999,
        padding: "6px 10px",
        color: "#fff",
        border: "1px solid rgba(255,255,255,.12)",
      }}
      onClick={() => onPick(lang === "az" ? "en" : "az")}
    >
      {lang.toUpperCase()}
    </button>
  );
}

export default function Header({ introReady }: { introReady: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [hdrp, setHdrp] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [open, setOpen] = useState(false);

  const { i18n, t } = useTranslation();
  const { lang: paramLang } = useParams<{ lang?: string }>();
  const lang: Lang = isLang(paramLang) ? paramLang : DEFAULT_LANG;

  const location = useLocation();
  const navigate = useNavigate();
  const panelId = useId();
  const headerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 920px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const withLang = useCallback(
    (to: string) => (to === "/" ? `/${lang}` : `/${lang}${to.startsWith("/") ? to : `/${to}`}`),
    [lang]
  );

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      const p = clamp01(y / 160);
      setHdrp(p);
      setScrolled(p > 0.02);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const mobileBgAlpha = open ? 0.9 : 0.8 * hdrp;
  const mobileBlurPx = open ? 16 : 2 + 14 * hdrp;

  const headerStyle: React.CSSProperties | undefined = isMobile
    ? {
        backgroundColor: `rgba(10,12,18,${mobileBgAlpha.toFixed(2)})`,
        WebkitBackdropFilter: `blur(${mobileBlurPx.toFixed(1)}px) saturate(1.3)`,
        backdropFilter: `blur(${mobileBlurPx.toFixed(1)}px) saturate(1.3)`,
        borderBottom: `1px solid rgba(255,255,255,${(0.06 * hdrp).toFixed(2)})`,
      }
    : undefined;

  return (
    <header
      ref={headerRef}
      style={headerStyle}
      className={cx("site-header", scrolled && "is-scrolled", open && "is-open")}
      data-build="H-0207-FINAL"
    >
      {/* DEBUG BUILD LABEL (mütləq görünməlidir) */}
      <div style={{ position: "fixed", bottom: 8, left: 8, fontSize: 11, color: "#6cf", zIndex: 9999 }}>
        BUILD: H-0207-FINAL
      </div>

      <div className="container header-inner header-grid" style={{ display: "grid", gridTemplateColumns: "1fr auto" }}>
        {/* LEFT */}
        <div className="header-left" style={{ marginLeft: -4 }}>
          <Link to={`/${lang}`} className="brand-link" aria-label="NEOX">
            <img
              src="/image/neox-logo.png"
              alt="NEOX"
              loading="eager"
              decoding="async"
              draggable={false}
              style={{
                height: isMobile ? 14 : 28,
                width: "auto",
                maxWidth: isMobile ? 110 : 160,
                display: "block",
                filter:
                  "drop-shadow(0 6px 16px rgba(0,0,0,.42)) drop-shadow(0 0 10px rgba(47,184,255,.06))",
              }}
            />
          </Link>
        </div>

        {/* RIGHT */}
        <div className="header-right" style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <LangMenu lang={lang} onPick={(c) => i18n.changeLanguage(c)} />
          <button
            aria-controls={panelId}
            onClick={() => setOpen((v) => !v)}
            style={{
              width: 38,
              height: 38,
              borderRadius: 999,
              background: "rgba(255,255,255,.08)",
              border: "1px solid rgba(255,255,255,.12)",
              color: "#fff",
            }}
          >
            ☰
          </button>
        </div>
      </div>
    </header>
  );
}
