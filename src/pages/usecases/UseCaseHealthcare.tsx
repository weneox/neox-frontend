// src/pages/usecases/UseCaseHealthcare.tsx
import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Stethoscope } from "lucide-react";
import {
  UC_STYLES,
  BreadcrumbPill,
  Bullet,
  CaseItem,
  cx,
  getLangFromPath,
  withLang,
  useMedia,
  usePrefersReducedMotion,
  useRevealScopedBatched,
  useSeo,
} from "./_ucShared";

export default function UseCaseHealthcare() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const lang = getLangFromPath(pathname);

  const reduced = usePrefersReducedMotion();
  const isMobile = useMedia("(max-width: 560px)", false);
  const rootRef = useRef<HTMLElement | null>(null);

  const [enter, setEnter] = useState(false);
  useEffect(() => {
    const tt = window.setTimeout(() => setEnter(true), 220);
    return () => window.clearTimeout(tt);
  }, []);

  const d = (ms: number) => ({ ["--d" as any]: `${isMobile ? Math.round(ms * 0.7) : ms}ms` });

  const toContact = withLang("/contact", lang);
  const toServices = withLang("/services", lang);

  // ✅ later we will put real media
  const LEFT_MEDIA_URL = "";  // e.g. image or video
  const RIGHT_MEDIA_URL = ""; // e.g. image or video

  useSeo({
    title: "NEOX — Healthcare Scenario",
    description: "Healthcare automation scenario: scheduling, triage, and operator routing.",
    canonicalPath: withLang("/use-cases/healthcare", lang),
  });

  // scroll-based reveal (text then media)
  useRevealScopedBatched(rootRef, { batchSize: 2, batchDelayMs: 120, rootMargin: "0px 0px -22% 0px" });

  const item: CaseItem = {
    icon: Stethoscope,
    tint: "pink",
    sektor: "Healthcare",
    basliq: "Healthcare Scenario",
    hekayə: "Faster scheduling, fewer no-shows, and instant patient answers.",
    maddeler: [
      "FAQ automation: services, pricing, preparation instructions",
      "Smart intake: symptoms & appointment intent (optional)",
      "No-show reduction via reminders & clear next steps",
      "Operator handoff for sensitive or complex requests",
    ],
    neticeler: [],
  };

  return (
    <main ref={rootRef as any} className="uc-page">
      <style>{UC_STYLES}</style>

      {/* SECTION: Canva-like hero layout */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="uc-canva">
            {/* LEFT: your existing title + description (NOT "ABOUT PROJECT") */}
            <div className="uc-canvaLeft">
              <div className="inline-flex">
                <BreadcrumbPill text={t("useCases.hero.crumb", { defaultValue: "Scenario" })} enter={enter} delayMs={0} />
              </div>

              <h1 className={cx("mt-5 uc-canvaTitle uc-enter", enter && "uc-in")} style={d(90)}>
                <span className="uc-grad">{item.basliq}</span>
              </h1>

              <p className={cx("uc-canvaSub uc-enter", enter && "uc-in")} style={d(180)}>
                {item.hekayə}
              </p>

              {/* bullets = like Canva left side */}
              <div className={cx("uc-canvaList uc-reveal reveal-left")} style={{ transitionDelay: reduced ? "0ms" : "40ms" }}>
                {item.maddeler.map((m) => (
                  <Bullet key={m} text={m} />
                ))}
              </div>

              <div className={cx("uc-canvaCtas uc-reveal reveal-left")} style={{ transitionDelay: reduced ? "0ms" : "90ms" }}>
                <a href={toContact} className="uc-btn">
                  {t("useCases.cta.ownCase", { defaultValue: "Contact" })} <span aria-hidden="true">→</span>
                </a>
                <a href={toServices} className="uc-btn uc-btnGhost">
                  {t("useCases.cta.services", { defaultValue: "Services" })}
                </a>
              </div>
            </div>

            {/* RIGHT: 2 tall media blocks + bottom bar */}
            <div className="uc-canvaMedia">
              {/* LEFT MEDIA (drops from top) */}
              <div className={cx("uc-reveal reveal-drop")} style={{ transitionDelay: reduced ? "0ms" : "120ms" }}>
                <div className="uc-mediaCard">
                  {LEFT_MEDIA_URL ? (
                    LEFT_MEDIA_URL.endsWith(".mp4") ? (
                      <video
                        src={LEFT_MEDIA_URL}
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    ) : (
                      <img src={LEFT_MEDIA_URL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    )
                  ) : (
                    <div className="uc-mediaPh">MEDIA 1 (DROP)</div>
                  )}
                </div>
              </div>

              {/* RIGHT MEDIA (rises from bottom) */}
              <div className={cx("uc-reveal reveal-rise")} style={{ transitionDelay: reduced ? "0ms" : "220ms" }}>
                <div className="uc-mediaCard">
                  {RIGHT_MEDIA_URL ? (
                    RIGHT_MEDIA_URL.endsWith(".mp4") ? (
                      <video
                        src={RIGHT_MEDIA_URL}
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    ) : (
                      <img src={RIGHT_MEDIA_URL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    )
                  ) : (
                    <div className="uc-mediaPh">MEDIA 2 (RISE)</div>
                  )}
                </div>
              </div>

              {/* LONG BAR */}
              <div className={cx("uc-reveal reveal-bottom")} style={{ transitionDelay: reduced ? "0ms" : "300ms" }}>
                <div className="uc-canvaBar" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
