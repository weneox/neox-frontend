// src/pages/usecases/UseCaseHealthcare.tsx
import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Stethoscope, CheckCircle } from "lucide-react";
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

  useSeo({
    title: "NEOX — Healthcare Scenario",
    description: "Healthcare automation scenario: scheduling, triage, and operator routing.",
    canonicalPath: withLang("/use-cases/healthcare", lang),
  });

  // ✅ 30% girmədən açılmasın: rootMargin mənfi bottom veririk
  useRevealScopedBatched(rootRef, { batchSize: 3, batchDelayMs: 90, rootMargin: "0px 0px -30% 0px" });

  return (
    <main ref={rootRef as any} className="uc-page">
      <style>{UC_STYLES}</style>

      {/* HERO */}
      <section className="uc-hero">
        <div className="uc-heroBG" aria-hidden="true" />
        <div className="uc-heroInner">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 w-full">
            <div className="mx-auto max-w-[980px] text-center">
              <div className="flex justify-center">
                <BreadcrumbPill
                  text={t("useCases.hero.crumb", { defaultValue: "Use Case" })}
                  enter={enter}
                  delayMs={0}
                />
              </div>

              <h1 className={cx("mt-6 text-white uc-enter", enter && "uc-in")} style={d(90)}>
                <span className="block text-[40px] leading-[1.05] sm:text-[60px] font-semibold">
                  <span className="uc-grad">Healthcare</span> Automation
                </span>
              </h1>

              <p className={cx("mt-5 text-[16px] sm:text-[18px] text-white/70 uc-enter", enter && "uc-in")} style={d(180)}>
                Daha az manual iş. Daha sürətli cavab. Daha çox qəbul.
              </p>

              <div className="uc-divider" />
            </div>
          </div>
        </div>
        <div className="uc-spacer" />
      </section>

      {/* ABOUT PROJECT LAYOUT (Canva style) */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="uc-aboutGrid">
            {/* TEXT: əvvəlcə sözlər açılır */}
            <div className="uc-reveal reveal-left">
              <article className="uc-aboutText uc-pop uc-contain">
                <div className="flex items-center gap-3">
                  <div className="uc-ic" aria-hidden="true">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div className="text-white/60 text-[12px] tracking-[.14em] uppercase">
                    ABOUT PROJECT
                  </div>
                </div>

                <h2 className="uc-aboutTitle mt-4">
                  AI ilə xəstə axınının avtomatlaşdırılması
                </h2>

                <p className="mt-3 text-white/70 leading-[1.7]">
                  NEOX xəstələrin suallarını dərhal cavablayır, lazımi məlumatları toplayır və
                  görüşlərin təyin edilməsini sürətləndirir. Həssas sorğular operatorlara tam kontekstlə ötürülür.
                </p>

                <div className="uc-aboutList">
                  {[
                    "FAQ avtomatlaşdırma: xidmətlər, qiymətlər, hazırlıq qaydaları",
                    "Ağıllı intake: simptomlar və görüş niyyəti",
                    "No-show azaldılması: xatırlatmalar + növbəti addımlar",
                    "Həssas hallarda operatora yönləndirmə",
                  ].map((x) => (
                    <div key={x} className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-[rgba(170,225,255,.95)] mt-0.5 flex-shrink-0" />
                      <span className="text-white/75 leading-[1.65]">{x}</span>
                    </div>
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
              </article>
            </div>

            {/* IMAGES: sonra panellər gəlir */}
            <div className="uc-imgWrap">
              {/* LEFT: yuxarıdan düşür */}
              <div className="uc-reveal reveal-drop">
                <div className="uc-imgCard uc-pop uc-contain">
                  <div className="uc-imgPh">Image #1 (top → down)</div>
                </div>
              </div>

              {/* RIGHT: aşağıdan qalxır */}
              <div className="uc-reveal reveal-rise">
                <div className="uc-imgCard uc-pop uc-contain">
                  <div className="uc-imgPh">Image #2 (bottom → up)</div>
                </div>
              </div>

              {/* Canva-dakı kimi altda mavi bar (optional) */}
              <div className="uc-reveal reveal-bottom uc-barWrap">
                <div className="uc-bar" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {reduced ? null : null}
    </main>
  );
}
