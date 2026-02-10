// src/pages/Contact.tsx
import React, { FormEvent, memo, useEffect, useMemo, useRef, useState } from "react";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  CheckCircle,
  CalendarDays,
  Copy,
  AlertTriangle,
} from "lucide-react";
import { useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

type Status = "idle" | "loading" | "success" | "error";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

/** Reduced motion */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const on = () => setReduced(!!mq.matches);
    on();
    mq.addEventListener ? mq.addEventListener("change", on) : mq.addListener(on);
    return () => {
      mq.removeEventListener ? mq.removeEventListener("change", on) : mq.removeListener(on);
    };
  }, []);
  return reduced;
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

/* ---------------- SEO (native head inject) ---------------- */
function useSeo(opts: { title: string; description: string; canonicalPath: string; ogImage?: string }) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = opts.title;

    const ensureMeta = (selector: string, create: () => HTMLMetaElement) => {
      let el = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = create();
        document.head.appendChild(el);
      }
      return el;
    };

    const ensureLink = (selector: string, create: () => HTMLLinkElement) => {
      let el = document.head.querySelector(selector) as HTMLLinkElement | null;
      if (!el) {
        el = create();
        document.head.appendChild(el);
      }
      return el;
    };

    const setMetaName = (name: string, content: string) => {
      const el = ensureMeta(`meta[name="${name}"]`, () => {
        const m = document.createElement("meta");
        m.setAttribute("name", name);
        return m;
      });
      el.setAttribute("content", content);
    };

    const setMetaProp = (property: string, content: string) => {
      const el = ensureMeta(`meta[property="${property}"]`, () => {
        const m = document.createElement("meta");
        m.setAttribute("property", property);
        return m;
      });
      el.setAttribute("content", content);
    };

    const base = window.location.origin;
    const canonicalUrl = base + opts.canonicalPath;

    const canonical = ensureLink(`link[rel="canonical"]`, () => {
      const l = document.createElement("link");
      l.setAttribute("rel", "canonical");
      return l;
    });
    canonical.setAttribute("href", canonicalUrl);

    setMetaName("description", opts.description);

    setMetaProp("og:type", "website");
    setMetaProp("og:title", opts.title);
    setMetaProp("og:description", opts.description);
    setMetaProp("og:url", canonicalUrl);
    if (opts.ogImage) setMetaProp("og:image", base + opts.ogImage);

    setMetaName("twitter:card", "summary_large_image");
    setMetaName("twitter:title", opts.title);
    setMetaName("twitter:description", opts.description);
    if (opts.ogImage) setMetaName("twitter:image", base + opts.ogImage);

    return () => {
      document.title = prevTitle;
    };
  }, [opts.title, opts.description, opts.canonicalPath, opts.ogImage]);
}

/* ================= Styles (FAST / CLEAN) ================= */
const CONTACT_CSS = `
  html, body {
    background: #000 !important;
    margin: 0;
    padding: 0;
    width: 100%;
    overflow-x: hidden;
  }

  .ct-page{
    background:#000 !important;
    color: rgba(255,255,255,.92);
    min-height: 100vh;
    width: 100%;
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  .ct-page *{ min-width:0; max-width:100%; }

  /* Simple premium gradient text (STATIC) */
  .ct-gradient{
    background: linear-gradient(90deg, #ffffff 0%, rgba(170,225,255,.98) 35%, rgba(47,184,255,.92) 70%, rgba(42,125,255,.92) 100%);
    -webkit-background-clip:text;
    background-clip:text;
    color:transparent;
  }

  /* Lightweight appear (no blur) */
  .ct-enter{
    opacity: 0;
    transform: translateY(10px);
    transition: opacity .38s ease, transform .46s ease;
    transition-delay: var(--d, 0ms);
  }
  .ct-enter.ct-in{
    opacity: 1;
    transform: translateY(0px);
  }

  .ct-crumb{
    display:inline-flex;
    align-items:center;
    gap:10px;
    border: 1px solid rgba(255,255,255,.10);
    background: rgba(255,255,255,.04);
    padding: 10px 14px;
    border-radius: 999px;
  }
  .ct-crumbDot{
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: rgba(47,184,255,1);
    box-shadow: 0 0 0 4px rgba(47,184,255,.14);
    flex: 0 0 auto;
  }
  .ct-crumbText{
    font-size: 12px;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: rgba(255,255,255,.70);
    white-space: nowrap;
  }

  .ct-hero{
    position: relative;
    padding: 22px 0 0;
    overflow: hidden;
  }
  .ct-heroInner{
    min-height: clamp(520px, 78vh, 860px);
    display:flex;
    align-items:center;
    justify-content:center;
    padding: 64px 0 22px;
  }
  @media (max-width: 560px){
    .ct-heroInner{
      min-height:auto;
      padding-top: 86px;
      padding-bottom: 14px;
    }
  }

  .ct-heroBG{ pointer-events:none; position:absolute; inset:0; }
  .ct-heroBG::before{
    content:"";
    position:absolute;
    inset:-10% -10%;
    background:
      radial-gradient(900px 520px at 50% 10%, rgba(47,184,255,.08), transparent 62%),
      radial-gradient(980px 560px at 20% 0%, rgba(42,125,255,.06), transparent 70%),
      radial-gradient(980px 560px at 80% 0%, rgba(170,225,255,.05), transparent 70%);
    opacity:.90;
  }
  .ct-heroBG::after{
    content:"";
    position:absolute;
    inset:0;
    background: radial-gradient(900px 520px at 50% 0%, rgba(0,0,0,.18), rgba(0,0,0,.92));
  }

  .ct-divider{
    height: 1px;
    width: 100%;
    max-width: 920px;
    margin: 40px auto 0;
    background: linear-gradient(90deg, transparent, rgba(47,184,255,.22), rgba(255,255,255,.08), rgba(42,125,255,.18), transparent);
    opacity: .95;
  }
  .ct-spacer{ height: 28px; }

  .ct-panel{
    border-radius: 24px;
    border: 1px solid rgba(255,255,255,.10);
    background: linear-gradient(180deg, rgba(255,255,255,.028), rgba(255,255,255,.012));
    box-shadow: 0 14px 54px rgba(0,0,0,.58);
    overflow: hidden;
    position: relative;
  }
  .ct-panel::after{
    content:"";
    position:absolute;
    inset:0;
    pointer-events:none;
    opacity:.78;
    background:
      radial-gradient(700px 420px at 60% 0%, rgba(255,255,255,.05), transparent 62%),
      radial-gradient(700px 420px at 20% 0%, rgba(47,184,255,.05), transparent 70%),
      linear-gradient(180deg, rgba(0,0,0,.02), rgba(0,0,0,.40));
  }

  .ct-row{
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,.10);
    background: rgba(255,255,255,.03);
  }

  /* PREMIUM buttons (no underline, no arrows) */
  .ct-btn{
    display:inline-flex; align-items:center; justify-content:center; gap:10px;
    padding: 12px 16px; border-radius: 999px;
    border: 1px solid rgba(255,255,255,.12);
    background: rgba(255,255,255,.03);
    color: rgba(255,255,255,.92);
    transition: transform .16s ease, border-color .18s ease, background .18s ease, box-shadow .18s ease;
    text-decoration:none !important;
    cursor: pointer;
    user-select: none;
  }
  .ct-btn:hover{
    transform: translateY(-2px);
    border-color: rgba(47,184,255,.22);
    background: rgba(255,255,255,.045);
    box-shadow: 0 16px 52px rgba(0,0,0,.52);
    text-decoration:none !important;
  }
  .ct-btn:focus-visible{
    outline: none;
    box-shadow: 0 0 0 4px rgba(47,184,255,.14), 0 16px 52px rgba(0,0,0,.52);
  }
  .ct-btn--primary{
    border-color: rgba(47,184,255,.22);
    background: linear-gradient(180deg, rgba(47,184,255,.16), rgba(42,125,255,.10));
  }
  .ct-btn--square{
    border-radius: 14px;
    padding: 10px 12px;
  }
  .ct-btn:active{ transform: translateY(-1px); }

  .ct-input{
    width:100%;
    border-radius:14px;
    border:1px solid rgba(255,255,255,.10);
    background: rgba(0,0,0,.36);
    padding:12px 14px;
    color: rgba(255,255,255,.90);
    outline: none;
    transition: border-color .16s ease, box-shadow .16s ease, background .16s ease;
  }
  .ct-input:focus{
    border-color: rgba(47,184,255,.28);
    box-shadow: 0 0 0 4px rgba(47,184,255,.10);
    background: rgba(0,0,0,.44);
  }
  .ct-input--bad{ border-color: rgba(248,113,113,.45) !important; }

  .ct-meter{
    height: 8px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,.10);
    background: rgba(255,255,255,.03);
    overflow: hidden;
  }
  .ct-meter > i{
    display:block;
    height: 100%;
    width: var(--w, 0%);
    background: linear-gradient(90deg, rgba(170,225,255,.92), rgba(47,184,255,.90), rgba(42,125,255,.90));
    opacity: .75;
  }

  .ct-status{
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,.10);
    background: rgba(255,255,255,.03);
  }

  /* Rotating word: NO pill, NO animation */
  .ct-rotLine{
    display:flex;
    flex-wrap:wrap;
    justify-content:center;
    gap: 10px;
  }
  .ct-rotLead{ color: rgba(255,255,255,.70); }
  .ct-rotWord{
    color: rgba(170,225,255,.95);
    font-weight: 600;
    letter-spacing: .01em;
  }

  /* Mobile: never truncate email/phone */
  @media (max-width: 560px){
    .ct-mobileBreak{ word-break: break-word; overflow-wrap:anywhere; }
    .ct-mobileStack{ flex-direction: column; align-items: flex-start !important; gap: 10px !important; }
  }

  @media (prefers-reduced-motion: reduce){
    .ct-enter{ opacity:1 !important; transform:none !important; transition:none !important; }
    .ct-btn{ transition:none !important; }
  }
`;

const BreadcrumbPill = memo(function BreadcrumbPill({
  text,
  enter,
  delayMs,
}: {
  text: string;
  enter: boolean;
  delayMs: number;
}) {
  return (
    <div className={cx("ct-crumb ct-enter", enter && "ct-in")} style={{ ["--d" as any]: `${delayMs}ms` }}>
      <span className="ct-crumbDot" aria-hidden="true" />
      <span className="ct-crumbText">{text}</span>
    </div>
  );
});

export default function Contact() {
  const { t, i18n } = useTranslation();
  const { lang } = useParams<{ lang?: string }>();
  const { pathname, search } = useLocation();

  const pageRef = useRef<HTMLElement | null>(null);
  const reduced = usePrefersReducedMotion();
  const isMobile = useMemo(() => window.matchMedia?.("(max-width: 560px)")?.matches ?? false, []);

  const langPrefix = (lang || i18n.language || "az").toLowerCase();
  useSeo({
    title: t("contact.seo.title"),
    description: t("contact.seo.description"),
    canonicalPath: `/${langPrefix}/contact`,
  });

  const [enter, setEnter] = useState(false);
  useEffect(() => {
    if (reduced) return;
    const tt = window.setTimeout(() => setEnter(true), 120);
    return () => window.clearTimeout(tt);
  }, [reduced]);

  const d = (ms: number) => ({ ["--d" as any]: `${isMobile ? Math.round(ms * 0.7) : ms}ms` });

  const isDemo = useMemo(() => new URLSearchParams(search).get("demo") === "1", [search]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    message: "",
    website: "", // honeypot
  });

  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [touched, setTouched] = useState<{ [k: string]: boolean }>({});
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const email = "info@weneox.com";
  const phone = "+994 51 800 55 77";

  const WHATSAPP_NUMBER = "994518005577";
  const WA_TEXT = useMemo(() => encodeURIComponent(t("contact.whatsapp.text")), [t]);
  const WHATSAPP_LINK = useMemo(() => `https://wa.me/${WHATSAPP_NUMBER}?text=${WA_TEXT}`, [WA_TEXT]);

  const clean = (s: string) => s.replace(/\s+/g, " ").trim();

  // ===== i18n fallback (so keys NEVER show) =====
  const safeT = (key: string, fallback: string) => {
    const v = t(key);
    return v === key ? fallback : v;
  };

  // ===== Rotating word (3s) =====
  const rotating = useMemo(
    () => [
      safeT("contact.hero.rotate.ai_automation", "AI avtomatlaşdırma"),
      safeT("contact.hero.rotate.agents", "agentlər"),
      safeT("contact.hero.rotate.sales", "satış"),
      safeT("contact.hero.rotate.support", "support"),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [i18n.language]
  );
  const [rotIdx, setRotIdx] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => {
      setRotIdx((p) => (p + 1) % rotating.length);
    }, 3000);
    return () => window.clearInterval(id);
  }, [rotating.length, reduced]);

  useEffect(() => {
    const root = pageRef.current;
    if (!root) return;

    const els = Array.from(root.querySelectorAll<HTMLElement>(".ct-enter"));
    if (!els.length) return;

    if (reduced) {
      els.forEach((el) => el.classList.add("ct-in"));
      return;
    }

    const timers: number[] = [];
    els.forEach((el, i) => {
      const tt = window.setTimeout(() => el.classList.add("ct-in"), 120 + i * (isMobile ? 90 : 110));
      timers.push(tt);
    });

    return () => timers.forEach((tt) => window.clearTimeout(tt));
  }, [reduced, isMobile]);

  useEffect(() => {
    if (isDemo && !formData.message) {
      setFormData((p) => ({
        ...p,
        message: t("contact.form.demo_prefill"),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const markTouched = (name: string) => setTouched((p) => ({ ...p, [name]: true }));
  const markRequiredTouched = () => setTouched((p) => ({ ...p, name: true, email: true, message: true }));

  const nameOk = clean(formData.name).length >= 2;
  const emailOk = isValidEmail(clean(formData.email));
  const msgOk = clean(formData.message).length >= 10;

  const msgLen = clean(formData.message).length;
  const msgPct = clamp(Math.round((msgLen / 500) * 100), 0, 100);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedEmail(true);
      window.setTimeout(() => setCopiedEmail(false), 1500);
    } catch {}
  };

  const copyPhone = async () => {
    try {
      await navigator.clipboard.writeText(phone);
      setCopiedPhone(true);
      window.setTimeout(() => setCopiedPhone(false), 1500);
    } catch {}
  };

  // ✅ Backend base
  const API_BASE_RAW = (import.meta as any)?.env?.VITE_API_BASE || "http://localhost:5050";
  const API_BASE = String(API_BASE_RAW).replace(/\/+$/, "");

  const canSubmit = status !== "loading" && nameOk && emailOk && msgOk;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (formData.website) {
      setStatus("success");
      setFormData({ name: "", email: "", company: "", phone: "", message: "", website: "" });
      setTouched({});
      window.setTimeout(() => setStatus("idle"), 3000);
      return;
    }

    if (!canSubmit) {
      markRequiredTouched();
      setStatus("error");
      setErrorMessage(t("contact.form.errors.fill_required"));
      return;
    }

    setStatus("loading");

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);

    try {
      const payload = {
        name: clean(formData.name),
        email: clean(formData.email),
        company: clean(formData.company),
        phone: clean(formData.phone),
        message: formData.message.trim(),
        source: isDemo ? "demo" : "contact",
        page: pathname || `/${langPrefix}/contact`,
        lang: langPrefix,
        meta: {
          referrer: document.referrer || "",
          userAgent: navigator.userAgent,
          ts: Date.now(),
        },
      };

      const res = await fetch(`${API_BASE}/api/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {}

      if (!res.ok) {
        const msg = (data && (data.error || data.message)) || t("contact.form.errors.send_failed");
        throw new Error(msg);
      }

      setStatus("success");
      setFormData({ name: "", email: "", company: "", phone: "", message: "", website: "" });
      setTouched({});
      window.setTimeout(() => setStatus("idle"), 4200);
    } catch (err: any) {
      console.error("Contact submit error:", err);

      const isAbort = err?.name === "AbortError";
      const msg = isAbort
        ? t("contact.form.errors.send_failed")
        : (err?.message as string) || t("contact.form.errors.send_failed");

      setStatus("error");
      setErrorMessage(msg);
    } finally {
      window.clearTimeout(timeout);
    }
  };

  // Subtitle text (no key leakage)
  const subtitleLead = safeT("contact.hero.subtitle_lead", "AI avtomatlaşdırma, agentlər, satış və support prosesləri —");
  const subtitleTail = safeT("contact.hero.subtitle_tail", "konkret nəticə üçün.");

  return (
    <main ref={pageRef as any} className="ct-page">
      <style>{CONTACT_CSS}</style>

      {/* ================= HERO ================= */}
      <section className="ct-hero" aria-label={t("contact.aria.hero")}>
        <div className="ct-heroBG" aria-hidden="true" />
        <div className="ct-heroInner">
          <div className="relative z-[1] mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 w-full">
            <div className="mx-auto max-w-[980px] text-center">
              <div className="flex justify-center">
                <BreadcrumbPill text={t("contact.hero.breadcrumb")} enter={enter} delayMs={0} />
              </div>

              <h1 className="mt-6 text-white break-words ct-enter" style={d(90)}>
                <span className="block text-[40px] leading-[1.05] sm:text-[60px] font-semibold">
                  {t("contact.hero.title.before")}{" "}
                  <span className="ct-gradient">{t("contact.hero.title.highlight")}</span>
                </span>
              </h1>

              {/* Subtitle with rotation (simple, premium) */}
              <p className="mt-5 text-[16px] sm:text-[18px] leading-[1.7] text-white/70 break-words ct-enter" style={d(180)}>
                <span className="ct-rotLine">
                  <span className="ct-rotLead">{subtitleLead}</span>
                  <span className="ct-rotWord">{rotating[rotIdx]}</span>
                  <span className="ct-rotLead">{subtitleTail}</span>
                </span>
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center ct-enter" style={d(270)}>
                <a
                  href={WHATSAPP_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ct-btn ct-btn--primary"
                  aria-label={t("contact.hero.cta_whatsapp_aria")}
                >
                  <CalendarDays className="h-5 w-5" />
                  {t("contact.hero.cta_whatsapp")}
                </a>

                <button type="button" onClick={copyEmail} className="ct-btn" aria-label={t("contact.hero.cta_email_aria")}>
                  <Mail className="h-5 w-5 opacity-80" />
                  {copiedEmail ? t("contact.common.copied") : email}
                </button>
              </div>

              <div className="ct-divider" />
            </div>
          </div>
        </div>
        <div className="ct-spacer" />
      </section>

      {/* ================= CONTENT ================= */}
      <section className="relative mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pb-16" aria-label={t("contact.aria.content")}>
        <div className="grid md:grid-cols-2 gap-6 lg:gap-10 items-start">
          {/* LEFT */}
          <div className="ct-panel p-6 sm:p-8 md:sticky md:top-6 ct-enter" style={d(340)}>
            <div className="relative z-[1]">
              <h2 className="text-[22px] sm:text-[26px] font-semibold text-white">{t("contact.left.title")}</h2>
              <p className="mt-2 text-white/70 leading-[1.7] break-words">{t("contact.left.subtitle")}</p>

              <div className="mt-6 space-y-4">
                {/* Email */}
                <div className="ct-row p-4">
                  <div className="flex items-start gap-4">
                    <div className="h-11 w-11 rounded-xl border border-white/10 bg-gradient-to-br from-[rgba(47,184,255,.40)] to-[rgba(42,125,255,.28)] flex items-center justify-center flex-shrink-0">
                      <Mail className="h-5 w-5 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-white font-semibold">{t("contact.left.channels.email.title")}</div>

                      <div className={cx("mt-2 flex items-center justify-between gap-3", "ct-mobileStack")}>
                        <div className="text-white/75 text-sm ct-mobileBreak">{email}</div>
                        <button
                          type="button"
                          onClick={copyEmail}
                          className="ct-btn ct-btn--square"
                          style={{ width: "auto" }}
                          aria-label={t("contact.left.channels.email.copy_aria")}
                        >
                          <Copy className="h-4 w-4" />
                          <span className="text-xs">{copiedEmail ? t("contact.common.copied") : t("contact.common.copy")}</span>
                        </button>
                      </div>

                      <div className="text-white/45 text-xs mt-1">{t("contact.left.channels.email.note")}</div>
                    </div>
                  </div>
                </div>

                {/* Phone */}
                <div className="ct-row p-4">
                  <div className="flex items-start gap-4">
                    <div className="h-11 w-11 rounded-xl border border-white/10 bg-gradient-to-br from-[rgba(47,184,255,.40)] to-[rgba(42,125,255,.28)] flex items-center justify-center flex-shrink-0">
                      <Phone className="h-5 w-5 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-white font-semibold">{t("contact.left.channels.phone.title")}</div>

                      <div className={cx("mt-2 flex items-center justify-between gap-3", "ct-mobileStack")}>
                        <div className="text-white/75 text-sm ct-mobileBreak">{phone}</div>
                        <button
                          type="button"
                          onClick={copyPhone}
                          className="ct-btn ct-btn--square"
                          style={{ width: "auto" }}
                          aria-label={t("contact.left.channels.phone.copy_aria")}
                        >
                          <Copy className="h-4 w-4" />
                          <span className="text-xs">{copiedPhone ? t("contact.common.copied") : t("contact.common.copy")}</span>
                        </button>
                      </div>

                      <div className="text-white/45 text-xs mt-1">{t("contact.left.channels.phone.note")}</div>
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="ct-row p-4">
                  <div className="flex items-start gap-4">
                    <div className="h-11 w-11 rounded-xl border border-white/10 bg-gradient-to-br from-[rgba(47,184,255,.40)] to-[rgba(42,125,255,.28)] flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-semibold">{t("contact.left.channels.location.title")}</div>
                      <div className="mt-2 text-white/75 text-sm break-words">{t("contact.left.channels.location.value")}</div>
                      <div className="text-white/45 text-xs mt-1">{t("contact.left.channels.location.note")}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* What to expect */}
              <div
                className="mt-6 ct-row p-5"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(47,184,255,.10), rgba(42,125,255,.06), rgba(255,255,255,.02))",
                }}
              >
                <div className="text-white font-semibold">{t("contact.left.expect.title")}</div>
                <ul className="mt-3 space-y-2 text-white/70">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-[2px] h-5 w-5 text-[rgba(170,225,255,.95)]" />
                    {t("contact.left.expect.items.0")}
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-[2px] h-5 w-5 text-[rgba(170,225,255,.95)]" />
                    {t("contact.left.expect.items.1")}
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-[2px] h-5 w-5 text-[rgba(170,225,255,.95)]" />
                    {t("contact.left.expect.items.2")}
                  </li>
                </ul>
              </div>

              <div className="mt-5 text-xs text-white/45">{t("contact.left.footer_note")}</div>
            </div>
          </div>

          {/* RIGHT: FORM */}
          <div className="ct-panel p-6 sm:p-8 ct-enter" style={d(440)}>
            <div className="relative z-[1]">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-[22px] sm:text-[26px] font-semibold text-white">{t("contact.form.title")}</h3>
                  <p className="mt-2 text-white/70 leading-[1.7] break-words">{t("contact.form.subtitle")}</p>
                </div>
                <div className="hidden sm:block text-right flex-shrink-0">
                  <div className="text-[12px] tracking-[0.14em] uppercase text-white/55">{t("contact.form.badge.label")}</div>
                  <div className="text-white font-semibold">{t("contact.form.badge.value")}</div>
                </div>
              </div>

              {/* status */}
              {status !== "idle" && (
                <div className="mt-5 ct-status p-4 flex items-start gap-3">
                  {status === "success" ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-emerald-300 mt-[2px]" />
                      <div className="min-w-0">
                        <div className="text-emerald-200 font-semibold">{t("contact.form.status.success_title")}</div>
                        <div className="text-emerald-200/80 text-sm">{t("contact.form.status.success_desc")}</div>
                      </div>
                    </>
                  ) : status === "error" ? (
                    <>
                      <AlertTriangle className="h-5 w-5 text-red-300 mt-[2px]" />
                      <div className="min-w-0">
                        <div className="text-red-200 font-semibold">{t("contact.form.status.error_title")}</div>
                        <div className="text-red-200/85 text-sm">{errorMessage || t("contact.form.errors.send_failed")}</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        className="h-5 w-5 rounded-full border border-white/15"
                        style={{
                          background:
                            "conic-gradient(from 90deg, rgba(47,184,255,.85), rgba(42,125,255,.75), rgba(170,225,255,.80), rgba(47,184,255,.85))",
                          maskImage: "radial-gradient(circle at 50% 50%, transparent 58%, black 60%)",
                          WebkitMaskImage: "radial-gradient(circle at 50% 50%, transparent 58%, black 60%)",
                        }}
                      />
                      <div className="min-w-0">
                        <div className="text-white font-semibold">{t("contact.form.status.loading_title")}</div>
                        <div className="text-white/65 text-sm">{t("contact.form.status.loading_desc")}</div>
                      </div>
                    </>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {/* honeypot */}
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  className="hidden"
                />

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="min-w-0">
                    <label className="block text-sm text-white/70 mb-2">{t("contact.form.fields.name.label")}</label>
                    <input
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      onBlur={() => markTouched("name")}
                      className={cx("ct-input", touched.name && !nameOk && "ct-input--bad")}
                      placeholder={t("contact.form.fields.name.placeholder")}
                    />
                    {touched.name && !nameOk && <div className="mt-1 text-xs text-red-200/90">{t("contact.form.errors.name_short")}</div>}
                  </div>

                  <div className="min-w-0">
                    <label className="block text-sm text-white/70 mb-2">{t("contact.form.fields.email.label")}</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      onBlur={() => markTouched("email")}
                      className={cx("ct-input", touched.email && !emailOk && "ct-input--bad")}
                      placeholder={t("contact.form.fields.email.placeholder")}
                    />
                    {touched.email && !emailOk && <div className="mt-1 text-xs text-red-200/90">{t("contact.form.errors.email_bad")}</div>}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="min-w-0">
                    <label className="block text-sm text-white/70 mb-2">{t("contact.form.fields.company.label")}</label>
                    <input
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      className="ct-input"
                      placeholder={t("contact.form.fields.company.placeholder")}
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="block text-sm text-white/70 mb-2">{t("contact.form.fields.phone.label")}</label>
                    <input
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="ct-input"
                      placeholder={t("contact.form.fields.phone.placeholder")}
                    />
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex items-end justify-between gap-3">
                    <label className="block text-sm text-white/70 mb-2">{t("contact.form.fields.message.label")}</label>
                    <div className="text-xs text-white/45 mb-2">{msgLen}/500</div>
                  </div>

                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    onBlur={() => markTouched("message")}
                    rows={6}
                    className={cx("ct-input", touched.message && !msgOk && "ct-input--bad")}
                    style={{ resize: "none" }}
                    placeholder={t("contact.form.fields.message.placeholder")}
                  />

                  <div className="mt-2 flex items-center justify-between gap-3">
                    {touched.message && !msgOk ? (
                      <div className="text-xs text-red-200/90">{t("contact.form.errors.message_short")}</div>
                    ) : (
                      <div className="text-xs text-white/45">{t("contact.form.hint")}</div>
                    )}

                    <div className="w-[120px] ct-meter" aria-label={t("contact.form.message_meter_aria")}>
                      <i style={{ ["--w" as any]: `${msgPct}%` }} />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={cx("ct-btn ct-btn--primary w-full", "disabled:opacity-50 disabled:cursor-not-allowed")}
                  aria-label={t("contact.form.submit_aria")}
                >
                  {status === "loading" ? (
                    t("contact.form.submit_loading")
                  ) : (
                    <>
                      {t("contact.form.submit")}
                      <Send className="h-5 w-5" />
                    </>
                  )}
                </button>

                <div className="text-xs text-white/45">{t("contact.form.legal")}</div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="relative mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pb-20" aria-label={t("contact.aria.cta")}>
        <div className="ct-panel p-8 sm:p-10 text-center ct-enter" style={d(560)}>
          <div className="relative z-[1]">
            <h2 className="text-[22px] sm:text-[28px] font-semibold text-white break-words">{t("contact.final.title")}</h2>
            <p className="mt-3 text-white/70 max-w-[760px] mx-auto leading-[1.7] break-words">{t("contact.final.subtitle")}</p>

            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="ct-btn ct-btn--primary"
              style={{ marginTop: 16, paddingInline: 18 }}
              aria-label={t("contact.final.cta_aria")}
            >
              <CalendarDays className="h-5 w-5" />
              {t("contact.final.cta")}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
