// src/pages/usecases/UseCaseFinance.tsx
import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Landmark } from "lucide-react";
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

function autoCloudinary(url: string) {
  if (!url.includes("/upload/")) return url;
  if (url.includes("/upload/q_auto,f_auto/")) return url;
  return url.replace("/upload/", "/upload/q_auto,f_auto/");
}

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

  const VIDEO_URL = autoCloudinary(
    "https://res.cloudinary.com/dppoomunj/video/upload/v1770783125/neox/media/asset_1770783123123_2ada78da599b5.mp4"
  ); // loop YOX

  useSeo({
    title: "NEOX — Finance Scenario",
    description: "Finance scenario: reduce repetitive questions and route high-risk requests to operators.",
    canonicalPath: withLang("/use-cases/finance", lang),
  });

  useRevealScopedBatched(rootRef, { batchSize: 3, batchDelayMs: 90, rootMargin: "0px 0px -18% 0px" });

  const bullets = [
    "Instant answers for common product & pricing questions",
    "Risk routing: suspicious requests -> operator handoff",
    "Lead capture with minimal friction",
    "Conversation summaries for teams",
  ];

  return (
    <main ref={rootRef as any} className="uc-page">
      <style>{UC_STYLES}</style>

      <section className="uc-hHero">
        <div className="uc-hHeroBG" aria-hidden="true" />
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="uc-hGrid">
            {/* TEXT — solda */}
            <div className={cx("uc-hLeft uc-enter", enter && "uc-in")} style={d(0)}>
              <BreadcrumbPill text={t("useCases.hero.crumb", { defaultValue: "Use Case" })} enter={enter} delayMs={0} />

              <h1 className={cx("mt-6 text-white break-words uc-enter", enter && "uc-in")} style={d(90)}>
                <span className="block text-[44px] leading-[1.05] sm:text-[64px] font-semibold">
                  <span className="uc-grad">Finance</span> Scenario
                </span>
              </h1>

              <p
                className={cx(
                  "mt-5 text-[16px] sm:text-[18px] leading-[1.7] text-white/70 break-words uc-enter",
                  enter && "uc-in"
                )}
                style={d(170)}
              >
                Faster replies with safer routing for sensitive requests.
              </p>

              <div className={cx("uc-hBullets uc-enter", enter && "uc-in")} style={d(240)}>
                {bullets.map((b) => (
                  <div key={b} className="uc-hBullet">
                    <Landmark className="uc-hBulletIcon" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>

              <div className={cx("uc-hCTA uc-enter", enter && "uc-in")} style={d(320)}>
                <a className="uc-btn" href={toContact}>
                  Əlaqə <span aria-hidden="true">→</span>
                </a>
                <a className="uc-btn uc-btnGhost" href={toServices}>
                  Xidmətələr
                </a>
              </div>
            </div>

            {/* MEDIA — sağda */}
            <div className={cx("uc-enter", enter && "uc-in")} style={d(420)}>
              <div className="uc-mediaCard uc-contain">
                <div className="uc-mediaInner uc-mediaInner--rect">
                  <video
                    className="uc-mediaVideo"
                    src={VIDEO_URL}
                    autoPlay
                    muted
                    loop={false}
                    playsInline
                    preload="metadata"
                  />
                  <div className="uc-mediaShade" aria-hidden="true" />
                </div>
              </div>
              <div className="uc-divider" />
            </div>
          </div>
        </div>
      </section>

      {reduced ? null : null}
    </main>
  );
}
