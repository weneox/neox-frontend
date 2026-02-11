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

  // hero delay helper
  const d = (ms: number) => ({ ["--d" as any]: `${isMobile ? Math.round(ms * 0.7) : ms}ms` });

  const toContact = withLang("/contact", lang);
  const toServices = withLang("/services", lang);

  useSeo({
    title: "NEOX — Healthcare Scenario",
    description: "Healthcare automation scenario: scheduling, triage, and operator routing.",
    canonicalPath: withLang("/use-cases/healthcare", lang),
  });

  // ✅ reveal (scroll-based)
  useRevealScopedBatched(rootRef, { batchSize: 2, batchDelayMs: 110, rootMargin: "0px 0px -22% 0px" });

  const item: CaseItem = {
    icon: Stethoscope,
    tint: "pink",
    sektor: "Healthcare",
    basliq: "Instant answers + clean scheduling flow",
    hekayə:
      "NEOX answers common patient questions, collects required information, and schedules appointments faster. Complex cases are handed off to operators with full context.",
    maddeler: [
      "FAQ automation: services, pricing, preparation instructions",
      "Smart intake: symptoms & appointment intent (optional)",
      "No-show reduction via reminders & clear next steps",
      "Operator handoff for sensitive or complex requests",
    ],
    neticeler: [
      { k: "-44%", v: "No-shows", sub: "Better reminders & clarity" },
      { k: "+36%", v: "Booked Visits", sub: "Less friction to schedule" },
      { k: "-40%", v: "Call Volume", sub: "Fewer phone interruptions" },
      { k: "+22%", v: "Satisfaction", sub: "Faster answers for patients" },
    ],
  };

  return (
    <main ref={rootRef as any} className="uc-page">
      <style>{UC_STYLES}</style>

      {/* HERO */}
      <section className="uc-hero uc-section">
        <div className="uc-heroBG" aria-hidden="true" />
        <div className="uc-heroInner">
          <div className="relative z-[1] mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 w-full">
            <div className="mx-auto max-w-[980px] text-center">
              <div className="flex justify-center">
                <BreadcrumbPill text={t("useCases.hero.crumb", { defaultValue: "Use Case" })} enter={enter} delayMs={0} />
              </div>

              <h1 className={cx("mt-6 text-white break-words uc-enter", enter && "uc-in")} style={d(90)}>
                <span className="block text-[40px] leading-[1.05] sm:text-[60px] font-semibold">
                  <span className="uc-grad">Healthcare</span> Scenario
                </span>
              </h1>

              <p className={cx("mt-5 text-[16px] sm:text-[18px] leading-[1.7] text-white/70 break-words uc-enter", enter && "uc-in")} style={d(180)}>
                Faster scheduling, fewer no-shows, and instant patient answers.
              </p>

              <div className="uc-divider" />
            </div>
          </div>
        </div>
        <div className="uc-spacer" />
      </section>

      {/* CANVA-LIKE ABOUT PROJECT BLOCK */}
      <section className="uc-section py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="uc-aboutGrid">
            {/* LEFT TEXT (first reveals) */}
            <div className={cx("uc-reveal reveal-left")}>
              <div className="uc-aboutText">
                <div className="uc-aboutTitle">
                  ABOUT <br /> PROJECT
                </div>

                <div className="uc-aboutList">
                  {item.maddeler.map((m) => (
                    <Bullet key={m} text={m} />
                  ))}
                </div>

                <div className="mt-7 flex flex-wrap gap-3">
                  <a href={toContact} className="uc-btn">
                    {t("useCases.cta.ownCase", { defaultValue: "Contact" })} <span aria-hidden="true">→</span>
                  </a>
                  <a href={toServices} className="uc-btn uc-btnGhost">
                    {t("useCases.cta.services", { defaultValue: "Services" })}
                  </a>
                </div>
              </div>
            </div>

            {/* RIGHT 2 IMAGE PLACEHOLDERS */}
            <div className="uc-imgWrap">
              {/* left image: DROP from top */}
              <div className={cx("uc-reveal reveal-drop")} style={{ transitionDelay: reduced ? "0ms" : "120ms" }}>
                <div className="uc-imgCard">
                  <div className="uc-imgPh">IMAGE 1 (TOP DROP)</div>
                </div>
              </div>

              {/* right image: RISE from bottom */}
              <div className={cx("uc-reveal reveal-rise")} style={{ transitionDelay: reduced ? "0ms" : "220ms" }}>
                <div className="uc-imgCard">
                  <div className="uc-imgPh">IMAGE 2 (BOTTOM RISE)</div>
                </div>
              </div>

              {/* bottom bar */}
              <div className={cx("uc-reveal reveal-bottom")} style={{ gridColumn: "1 / -1", transitionDelay: reduced ? "0ms" : "300ms" }}>
                <div className="uc-bar" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
