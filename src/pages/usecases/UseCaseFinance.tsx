import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Landmark } from "lucide-react";
import {
  UC_STYLES,
  BreadcrumbPill,
  CaseRow,
  CaseItem,
  cx,
  getLangFromPath,
  withLang,
  useMedia,
  usePrefersReducedMotion,
  useRevealScopedBatched,
  useSeo,
} from "./_ucShared";

export default function UseCaseFinance() {
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

  const VIDEO_URL =
    "https://res.cloudinary.com/dppoomunj/video/upload/q_auto,f_auto/v1770597752/neox/media/asset_1770597746529_36e8f6de7d5d8.mp4";

  useSeo({
    title: "NEOX — Finance Scenario",
    description: "Finance automation scenario: onboarding, document flows, and follow-ups with clarity.",
    canonicalPath: withLang("/use-cases/finance", lang),
  });

  useRevealScopedBatched(rootRef, { batchSize: 3, batchDelayMs: 90, rootMargin: "0px 0px -18% 0px" });

  const item: CaseItem = {
    icon: Landmark,
    tint: "violet",
    sektor: "Finance",
    basliq: "Automated onboarding that stays compliant",
    hekayə:
      "NEOX guides clients through onboarding, collects required details, and escalates exceptions to an operator — reducing delays without sacrificing compliance.",
    maddeler: [
      "Step-by-step onboarding with smart validation and clear next steps",
      "Document requests & reminders (no manual chasing)",
      "Risk/edge cases routed to operator with full context",
      "Audit-friendly conversation summaries",
    ],
    neticeler: [
      { k: "-52%", v: "Onboarding Time", sub: "Less back-and-forth" },
      { k: "+28%", v: "Completion", sub: "More users finish the flow" },
      { k: "-41%", v: "Manual Work", sub: "Support workload drops" },
      { k: "+19%", v: "Lead Quality", sub: "Better qualification earlier" },
    ],
  };

  return (
    <main ref={rootRef as any} className="uc-page">
      <style>{UC_STYLES}</style>

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
                  <span className="uc-grad">Finance</span> Scenario
                </span>
              </h1>

              <p
                className={cx("mt-5 text-[16px] sm:text-[18px] leading-[1.7] text-white/70 break-words uc-enter", enter && "uc-in")}
                style={d(180)}
              >
                Onboarding, reminders, and exceptions — automated end-to-end.
              </p>

              <div className="uc-divider" />
            </div>
          </div>
        </div>
        <div className="uc-spacer" />
      </section>

      <section className="uc-section py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <CaseRow
            c={item}
            flip={false}
            tRealScenario={t("useCases.labels.realScenario", { defaultValue: "Real scenario" })}
            toContact={toContact}
            toServices={toServices}
            ctaPrimary={t("useCases.cta.ownCase", { defaultValue: "Contact" })}
            ctaSecondary={t("useCases.cta.services", { defaultValue: "Services" })}
            videoUrl={VIDEO_URL}
          />
        </div>
      </section>

      {reduced ? null : null}
    </main>
  );
}
