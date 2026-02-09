import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ShoppingBag } from "lucide-react";
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

export default function UseCaseRetail() {
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
    "https://res.cloudinary.com/dppoomunj/video/upload/q_auto,f_auto/v1770594527/neox/media/asset_1770594489151_13bb67859a0f3.mp4";

  useSeo({
    title: "NEOX — Retail Scenario",
    description: "Retail automation scenario: faster replies, higher conversion, smarter routing.",
    canonicalPath: withLang("/use-cases/retail", lang),
  });

  useRevealScopedBatched(rootRef, { batchSize: 3, batchDelayMs: 90, rootMargin: "0px 0px -18% 0px" });

  const item: CaseItem = {
    icon: ShoppingBag,
    tint: "cyan",
    sektor: "Retail",
    basliq: "From questions to checkout — automated, but human",
    hekayə:
      "NEOX handles repetitive customer questions, captures intent, and routes complex requests to an operator. You keep speed and consistency while increasing conversions.",
    maddeler: [
      "Instant replies for product availability, pricing, and delivery options",
      "Smart lead capture after 2–3 messages (phone/email only when needed)",
      "Operator handoff when the user asks for a manager or a custom request",
      "Conversation summaries for faster follow-up",
    ],
    neticeler: [
      { k: "+32%", v: "Conversion", sub: "More chats turn into real leads" },
      { k: "-48%", v: "Response Time", sub: "Customers get answers instantly" },
      { k: "+21%", v: "Upsell", sub: "Better qualification & recommendations" },
      { k: "-35%", v: "Tickets", sub: "Less repetitive support load" },
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
                  <span className="uc-grad">Retail</span> Scenario
                </span>
              </h1>

              <p
                className={cx("mt-5 text-[16px] sm:text-[18px] leading-[1.7] text-white/70 break-words uc-enter", enter && "uc-in")}
                style={d(180)}
              >
                Faster replies, better qualification, and clean handoff to operators — all inside one flow.
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
