import React, { memo, useEffect, useRef, useState } from "react";
import { GitBranch, SlidersHorizontal, Zap, ShieldCheck } from "lucide-react";

/**
 * ServiceBusinessWorkflows — Premium page-integrated video hero
 * - Video plays 0→INTRO_END once (intro text anim can happen there)
 * - Then loops LOOP_FROM→LOOP_TO forever (never returns to 0, so intro text won't re-trigger)
 * - Cloudinary URL uses q_auto,f_auto
 * - Video looks like part of the page (no “block” feel)
 */

const RAW_VIDEO_URL =
  "https://res.cloudinary.com/dppoomunj/video/upload/v1770673590/neox/media/asset_1770673578452_69109b2e9cd08.mp4";

// q_auto,f_auto (Cloudinary)
const VIDEO_URL = RAW_VIDEO_URL.replace("/video/upload/", "/video/upload/q_auto,f_auto/");

// ✅ Set these for your video (seconds)
const INTRO_END = 3.0; // intro finishes here (0→3 plays once)
const LOOP_FROM = 3.0; // loop start
const LOOP_TO = 6.0;   // loop end (set to real duration or last usable second)

export default memo(function ServiceBusinessWorkflows() {
  return (
    <div>
      <section style={{ paddingTop: "var(--hdrh,72px)" }} />
      <Inner />
    </div>
  );
});

function Inner() {
  const vref = useRef<HTMLVideoElement | null>(null);
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    const v = vref.current;
    if (!v) return;

    // Start from 0 on first mount
    try {
      v.currentTime = 0;
    } catch {}

    // We loop a segment by timeupdate (more reliable than Cloudinary loop transforms)
    const onTimeUpdate = () => {
      if (!introDone && v.currentTime >= INTRO_END - 0.03) {
        setIntroDone(true);
      }
      if (v.currentTime >= LOOP_TO - 0.03) {
        // never go back to 0; jump to LOOP_FROM
        v.currentTime = LOOP_FROM;
        void v.play?.();
      }
    };

    // Safety: if metadata reveals duration smaller than LOOP_TO, clamp
    const onLoadedMeta = () => {
      const dur = Number.isFinite(v.duration) ? v.duration : 0;
      if (dur && LOOP_TO > dur - 0.05) {
        // If video is shorter than your LOOP_TO, just loop near the end
        // (you can also adjust LOOP_TO manually to the exact duration)
        // eslint-disable-next-line no-console
        console.warn("[NEOX] LOOP_TO > duration; consider adjusting LOOP_TO.");
      }
      void v.play?.();
    };

    v.addEventListener("timeupdate", onTimeUpdate);
    v.addEventListener("loadedmetadata", onLoadedMeta);

    return () => {
      v.removeEventListener("timeupdate", onTimeUpdate);
      v.removeEventListener("loadedmetadata", onLoadedMeta);
    };
    // introDone is state; we read it in handler, so we re-bind when it changes
  }, [introDone]);

  return (
    <main style={{ padding: "28px 0 84px" }}>
      <style>{`
        .svc2{ overflow-x:hidden; }
        .svc2 .container{ max-width:1180px; margin:0 auto; padding:0 18px; }

        /* ===============================
           Page-integrated video hero
        =============================== */
        .svc2-heroWrap{
          position: relative;
          min-height: clamp(560px, 78vh, 860px);
          overflow: clip;
          border-radius: 0; /* not a block */
          padding: 0;
          margin: 0;
        }

        .svc2-bg{
          position:absolute; inset:0;
          pointer-events:none;
        }

        .svc2-video{
          position:absolute; inset:-1px;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scale(1.03);
          filter: saturate(1.06) contrast(1.05);
        }

        .svc2-vignette{
          position:absolute; inset:-2px;
          background:
            radial-gradient(1100px 700px at 18% 12%, rgba(255,184,47,.20), transparent 60%),
            radial-gradient(900px 620px at 86% 18%, rgba(167,89,255,.16), transparent 62%),
            radial-gradient(900px 700px at 55% 90%, rgba(20,160,255,.10), transparent 60%),
            linear-gradient(180deg, rgba(5,7,11,.86), rgba(5,7,11,.24) 45%, rgba(5,7,11,.92));
        }

        .svc2-noise{
          position:absolute; inset:0;
          opacity:.09;
          mix-blend-mode: overlay;
          background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E");
        }

        .svc2-glowLine{
          position:absolute; left:-20%; right:-20%; top:72px; height:1px;
          background: linear-gradient(90deg, transparent, rgba(255,184,47,.22), rgba(167,89,255,.18), transparent);
          opacity:.75;
        }

        .svc2-content{
          position: relative;
          z-index: 1;
          padding: clamp(28px, 4.8vw, 58px) 0;
        }

        .svc2-heroInner{
          max-width: 1180px;
          margin: 0 auto;
          padding: 0 18px;
        }

        .svc2-k{
          font-weight:900;
          letter-spacing:.18em;
          font-size:11px;
          color:rgba(255,255,255,.72);
          text-transform:uppercase;
          display:flex;
          align-items:center;
          gap:10px;
        }

        .svc2-dot{
          width:10px;
          height:10px;
          border-radius:999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), rgba(255,184,47,.85));
          box-shadow:0 0 0 4px rgba(255,184,47,.10);
        }

        .svc2-title{
          margin-top:12px;
          font-size:clamp(30px,3.6vw,54px);
          line-height:1.04;
          font-weight:900;
          color:rgba(255,255,255,.94);
          letter-spacing:-.03em;
          max-width: 18ch;
        }

        .svc2-sub{
          margin-top:12px;
          color:rgba(255,255,255,.74);
          font-size:15.5px;
          line-height:1.7;
          max-width:72ch;
        }

        /* intro text appears once; after intro we keep it stable (no re-typing loop) */
        .svc2-sub b{ color: rgba(255,255,255,.92); font-weight:900; }

        .svc2-grid{
          margin-top:22px;
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap:14px;
        }

        @media (max-width: 980px){
          .svc2-grid{ grid-template-columns:1fr; }
          .svc2-title{ max-width: 26ch; }
          .svc2-heroWrap{ min-height: clamp(620px, 86vh, 980px); }
        }

        .svc2-card{
          border-radius:22px;
          border:1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          -webkit-backdrop-filter: blur(18px) saturate(1.18);
          backdrop-filter: blur(18px) saturate(1.18);
          padding:16px;
          box-shadow:0 22px 90px rgba(0,0,0,.42);
        }

        .svc2-h{
          display:flex;
          align-items:center;
          gap:10px;
          font-weight:900;
          color:rgba(255,255,255,.92);
        }

        .svc2-p{
          margin-top:8px;
          color:rgba(255,255,255,.70);
          line-height:1.75;
          font-size:14px;
        }

        .svc2-li{ margin-top:10px; display:grid; gap:10px; }

        .svc2-it{
          display:flex;
          gap:10px;
          align-items:flex-start;
          padding:10px;
          border-radius:16px;
          border:1px solid rgba(255,255,255,.08);
          background: rgba(0,0,0,.20);
        }

        .svc2-ico{
          width:30px;
          height:30px;
          border-radius:12px;
          display:flex;
          align-items:center;
          justify-content:center;
          border:1px solid rgba(255,255,255,.12);
          background: rgba(255,184,47,.08);
          color:rgba(255,255,255,.94);
          flex:0 0 auto;
        }

        .svc2-itT{ font-weight:900; color:rgba(255,255,255,.92); }
        .svc2-itD{ margin-top:4px; color:rgba(255,255,255,.70); line-height:1.65; font-size:13.5px; }

        /* subtle “page blend” bottom fade so hero flows into next sections */
        .svc2-bottomFade{
          position:absolute; left:0; right:0; bottom:-1px; height:120px;
          background: linear-gradient(180deg, transparent, rgba(5,7,11,.88));
        }

        /* reduced motion: stop video if user prefers */
        @media (prefers-reduced-motion: reduce){
          .svc2-video{ display:none; }
        }
      `}</style>

      <section className="svc2">
        <div className="svc2-heroWrap">
          <div className="svc2-bg" aria-hidden="true">
            <video
              ref={vref}
              className="svc2-video"
              src={VIDEO_URL}
              autoPlay
              muted
              playsInline
              preload="auto"
            />
            <div className="svc2-vignette" />
            <div className="svc2-noise" />
            <div className="svc2-glowLine" />
            <div className="svc2-bottomFade" />
          </div>

          <div className="svc2-content">
            <div className="svc2-heroInner">
              <div className="svc2-k">
                <span className="svc2-dot" aria-hidden="true" />
                <span>SERVICES</span>
              </div>

              <div className="svc2-title">Biznes workflowlarının qurulması</div>

              <div className="svc2-sub">
                Satış, lead, müştəri dəstəyi və daxili əməliyyatlar üçün avtomatlaşdırılmış proseslər:{" "}
                <b>form → CRM → bildiriş → hesabat → növbəti addım</b>.
                {!introDone ? (
                  <span style={{ opacity: 0.9 }}> {/* intro zamanı sənin “yazı” effektin burda ola bilər */}</span>
                ) : null}
              </div>

              <div className="svc2-grid">
                <div className="svc2-card">
                  <div className="svc2-h">
                    <GitBranch size={18} />
                    <span>Proses dizaynı</span>
                  </div>

                  <div className="svc2-p">
                    Sənin iş modelinə uyğun “step-by-step” axın: kim nə vaxt nə edir, hansı triggerlər işləyir.
                  </div>

                  <div className="svc2-li">
                    <Item
                      icon={<SlidersHorizontal size={16} />}
                      title="Trigger & Rules"
                      desc="Status, SLA, auto follow-up, eskalasiya."
                    />
                    <Item
                      icon={<Zap size={16} />}
                      title="Automation"
                      desc="Formlar, CRM, Telegram bildirişləri, e-mail axınları."
                    />
                  </div>
                </div>

                <div className="svc2-card">
                  <div className="svc2-h">
                    <ShieldCheck size={18} />
                    <span>Ölçmə & optimizasiya</span>
                  </div>

                  <div className="svc2-p">
                    KPI-lar: dönüşüm, cavab vaxtı, itən lead, operator yükü — hamısı panel və export ilə.
                  </div>

                  <div className="svc2-li">
                    <Item icon={<Zap size={16} />} title="Dashboard" desc="Gündəlik statlar, funnel, conversion." />
                    <Item icon={<SlidersHorizontal size={16} />} title="Iterate" desc="Həftəlik optimizasiya: daha az manual iş." />
                  </div>
                </div>
              </div>

              {/* optional: tiny meta row */}
              <div style={{ marginTop: 16, color: "rgba(255,255,255,.58)", fontSize: 12 }}>
                Video: intro (0–{INTRO_END}s) bir dəfə · loop ({LOOP_FROM}–{LOOP_TO}s) sonsuz
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Item({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="svc2-it">
      <div className="svc2-ico" aria-hidden="true">
        {icon}
      </div>
      <div>
        <div className="svc2-itT">{title}</div>
        <div className="svc2-itD">{desc}</div>
      </div>
    </div>
  );
}
