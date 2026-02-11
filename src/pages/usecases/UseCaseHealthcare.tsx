import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle } from "lucide-react";
import {
  UC_STYLES,
  BreadcrumbPill,
  cx,
  getLangFromPath,
  withLang,
  useMedia,
  usePrefersReducedMotion,
  useRevealScopedBatched,
  useSeo,
} from "./_ucShared";

function toQAutoFauto(url: string) {
  if (url.includes("/q_auto,f_auto/")) return url;
  return url.replace("/upload/", "/upload/q_auto,f_auto/");
}

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

  // sequence delay helper
  const d = (ms: number) => ({ ["--d" as any]: `${isMobile ? Math.round(ms * 0.75) : ms}ms` });

  const toContact = withLang("/contact", lang);
  const toServices = withLang("/services", lang);

  // ✅ Your two videos
  const LEFT_VIDEO = toQAutoFauto(
    "https://res.cloudinary.com/dppoomunj/video/upload/v1770779385/neox/media/asset_1770779384389_adf30cfde805b.mp4"
  );
  const RIGHT_VIDEO = toQAutoFauto(
    "https://res.cloudinary.com/dppoomunj/video/upload/v1770779377/neox/media/asset_1770779374106_614590aaa295f.mp4"
  );

  useSeo({
    title: "NEOX — Healthcare Scenario",
    description: "Healthcare automation scenario: scheduling, triage, and operator routing.",
    canonicalPath: withLang("/use-cases/healthcare", lang),
  });

  // keep scroll reveal for below-the-fold parts (if you add later)
  useRevealScopedBatched(rootRef, { batchSize: 3, batchDelayMs: 90, rootMargin: "0px 0px -18% 0px" });

  const bullets = [
    "FAQ automation: services, pricing, preparation instructions",
    "Smart intake: symptoms & appointment intent (optional)",
    "No-show reduction via reminders & clear next steps",
    "Operator handoff for sensitive or complex requests",
  ];

  return (
    <main ref={rootRef as any} className="uc-page">
      <style>{UC_STYLES}</style>

      <section className="uc-hHero">
        <div className="uc-hHeroBG" aria-hidden="true" />

        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="uc-hGrid">
            {/* LEFT TEXT */}
            <div className="uc-hLeft">
              <div className="flex justify-start">
                <BreadcrumbPill text={t("useCases.hero.crumb", { defaultValue: "Use Case" })} enter={enter} delayMs={0} />
              </div>

              <h1 className={cx("mt-6 text-white uc-enter", enter && "uc-in")} style={d(90)}>
                <span className="block text-[46px] leading-[1.02] sm:text-[64px] font-semibold">
                  <span className="uc-grad">Healthcare</span> Scenario
                </span>
              </h1>

              <p
                className={cx("mt-4 text-[16px] sm:text-[18px] leading-[1.7] text-white/70 uc-enter", enter && "uc-in")}
                style={d(190)}
              >
                Faster scheduling, fewer no-shows, and instant patient answers.
              </p>

              <div className={cx("uc-hBullets uc-enter", enter && "uc-in")} style={d(280)}>
                {bullets.map((b) => (
                  <div key={b} className="uc-hBullet">
                    <CheckCircle className="uc-hBulletIcon" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>

              <div className={cx("uc-hCTA uc-enter", enter && "uc-in")} style={d(360)}>
                <a href={toContact} className="uc-btn">
                  {t("useCases.cta.ownCase", { defaultValue: "Öz case-ni danış" })} <span aria-hidden="true">→</span>
                </a>
                <a href={toServices} className="uc-btn uc-btnGhost">
                  {t("useCases.cta.services", { defaultValue: "Xidmətlar" })}
                </a>
              </div>

              <div className={cx("uc-divider uc-enter", enter && "uc-in")} style={d(430)} />
            </div>

            {/* RIGHT MEDIA (2 LONG blocks) */}
            <div className="uc-hMediaGrid">
              {/* ✅ order: left block first, then right block */}
              <div className={cx("uc-mediaCard uc-enter", enter && "uc-in")} style={d(520)} aria-label="Healthcare media left">
                <div className="uc-mediaInner">
                  <video className="uc-mediaVideo" src={LEFT_VIDEO} autoPlay muted loop playsInline preload="metadata" />
                  <div className="uc-mediaShade" aria-hidden="true" />
                </div>
              </div>

              <div className={cx("uc-mediaCard uc-enter", enter && "uc-in")} style={d(640)} aria-label="Healthcare media right">
                <div className="uc-mediaInner">
                  <video className="uc-mediaVideo" src={RIGHT_VIDEO} autoPlay muted loop playsInline preload="metadata" />
                  <div className="uc-mediaShade" aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* below-the-fold can be added later */}
      {reduced ? null : null}
    </main>
  );
}
