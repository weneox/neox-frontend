import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Truck } from "lucide-react";
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

export default function UseCaseLogistics() {
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

  useSeo({
    title: "NEOX — Logistics Scenario",
    description: "Logistics automation scenario: shipment updates, tracking, and fewer support tickets.",
    canonicalPath: withLang("/use-cases/logistics", lang),
  });

  useRevealScopedBatched(rootRef, { batchSize: 3, batchDelayMs: 90, rootMargin: "0px 0px -18% 0px" });

  const item: CaseItem = {
    icon: Truck,
    tint: "amber",
    sektor: "Logistics",
    basliq: "Fewer tickets with proactive shipment updates",
    hekayə:
      "NEOX reduces “Where is my order?” by giving proactive updates, tracking answers, and routing exceptions to operators when needed.",
    maddeler: [
      "Tracking info and status updates inside chat",
      "Automatic notifications when milestones change (picked up / in transit / delivered)",
      "Exception routing: delays, address issues, customs questions",
      "Summaries for support and internal teams",
    ],
    neticeler: [
      { k: "-55%", v: "WISMO", sub: "Less repetitive tracking questions" },
      { k: "+27%", v: "Resolution", sub: "Faster handling of exceptions" },
      { k: "-33%", v: "Support Load", sub: "Tickets reduced significantly" },
      { k: "+18%", v: "CSAT", sub: "Better customer experience" },
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
                  <span className="uc-grad">Logistics</span> Scenario
                </span>
              </h1>

              <p className={cx("mt-5 text-[16px] sm:text-[18px] leading-[1.7] text-white/70 break-words uc-enter", enter && "uc-in")} style={d(180)}>
                Automated tracking answers + proactive updates = fewer tickets.
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
          />
        </div>
      </section>

      {reduced ? null : null}
    </main>
  );
}
