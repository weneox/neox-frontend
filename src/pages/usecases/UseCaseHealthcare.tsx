// src/pages/usecases/UseCaseHealthcare.tsx
import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { HeartPulse } from "lucide-react";
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
  // q_auto,f_auto əlavə et (yoxdursa)
  if (!url.includes("/upload/")) return url;
  if (url.includes("/upload/q_auto,f_auto/")) return url;
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
  const d = (ms: number) => ({ ["--d" as any]: `${isMobile ? Math.round(ms * 0.7) : ms}ms` });

  const toContact = withLang("/contact", lang);
  const toServices = withLang("/services", lang);

  // Sənin verdiyin 2 video:
  const LEFT_VIDEO = autoCloudinary(
    "https://res.cloudinary.com/dppoomunj/video/upload/v1770779385/neox/media/asset_1770779384389_adf30cfde805b.mp4"
  ); // loop YOX
  const RIGHT_VIDEO = autoCloudinary(
    "https://res.cloudinary.com/dppoomunj/video/upload/v1770779377/neox/media/asset_1770779374106_614590aaa295f.mp4"
  ); // loop VAR

  useSeo({
    title: "NEOX — Healthcare Scenario",
    description: "Healthcare scenario: faster scheduling, fewer no-shows, and instant patient answers.",
    canonicalPath: withLang("/use-cases/healthcare", lang),
  });

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
            {/* TEXT — solda */}
            <div className={cx("uc-hLeft uc-enter", enter && "uc-in")} style={d(0)}>
              <BreadcrumbPill
                text={t("useCases.hero.crumb", { defaultValue: "Use Case" })}
                enter={enter}
                delayMs={0}
              />

              <h1 className={cx("mt-6 text-white break-words uc-enter", enter && "uc-in")} style={d(90)}>
                <span className="block text-[44px] leading-[1.05] sm:text-[64px] font-semibold">
                  <span className="uc-grad">Healthcare</span> Scenario
                </span>
              </h1>

              <p
                className={cx(
                  "mt-5 text-[16px] sm:text-[18px] leading-[1.7] text-white/70 break-words uc-enter",
                  enter && "uc-in"
                )}
                style={d(170)}
              >
                Faster scheduling, fewer no-shows, and instant patient answers.
              </p>

              <div className={cx("uc-hBullets uc-enter", enter && "uc-in")} style={d(240)}>
                {bullets.map((b) => (
                  <div key={b} className="uc-hBullet">
                    <HeartPulse className="uc-hBulletIcon" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>

              <div className={cx("uc-hCTA uc-enter", enter && "uc-in")} style={d(320)}>
                <a className="uc-btn" href={toContact}>
                  Öz case-ni danış <span aria-hidden="true">→</span>
                </a>
                <a className="uc-btn uc-btnGhost" href={toServices}>
                  Xidmətələr
                </a>
              </div>
            </div>

            {/* MEDIA — sağda, 2 video */}
            <div className={cx("uc-enter", enter && "uc-in")} style={d(420)}>
              <div className="uc-hMediaGrid">
                {/* SOL video: loop YOX */}
                <div className="uc-mediaCard uc-contain">
                  <div className="uc-mediaInner">
                    <video
                      className="uc-mediaVideo"
                      src={LEFT_VIDEO}
                      autoPlay
                      muted
                      loop={false}
                      playsInline
                      preload="metadata"
                    />
                    <div className="uc-mediaShade" aria-hidden="true" />
                  </div>
                </div>

                {/* SAĞ video: loop VAR */}
                <div className="uc-mediaCard uc-contain">
                  <div className="uc-mediaInner">
                    <video
                      className="uc-mediaVideo"
                      src={RIGHT_VIDEO}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="metadata"
                    />
                    <div className="uc-mediaShade" aria-hidden="true" />
                  </div>
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
