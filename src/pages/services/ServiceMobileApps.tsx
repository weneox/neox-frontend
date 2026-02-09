import React, { memo } from "react";
import { Smartphone, Layers, Zap, ShieldCheck } from "lucide-react";

export default memo(function ServiceMobileApps() {
  return (
    <main style={{ padding: "calc(var(--hdrh,72px) + 28px) 0 84px" }}>
      <style>{`
        .m .container{ max-width:1180px; margin:0 auto; padding:0 18px; }
        .m-hero{
          border-radius:26px; border:1px solid rgba(255,255,255,.08);
          background:
            radial-gradient(120% 90% at 18% 10%, rgba(47,184,255,.14), transparent 55%),
            radial-gradient(120% 90% at 86% 10%, rgba(255,184,47,.12), transparent 60%),
            rgba(10,12,18,.62);
          -webkit-backdrop-filter: blur(18px) saturate(1.15);
          backdrop-filter: blur(18px) saturate(1.15);
          box-shadow:0 26px 120px rgba(0,0,0,.55);
          padding: 26px 20px;
        }
        .m-k{ font-weight:900; letter-spacing:.18em; font-size:11px; color:rgba(255,255,255,.70); text-transform:uppercase; display:flex; align-items:center; gap:10px; }
        .m-dot{ width:10px; height:10px; border-radius:999px; background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), rgba(47,184,255,.85)); box-shadow:0 0 0 4px rgba(47,184,255,.10); }
        .m-title{ margin-top:10px; font-size:clamp(28px,3.2vw,44px); line-height:1.06; font-weight:900; color:rgba(255,255,255,.94); letter-spacing:-.02em; }
        .m-sub{ margin-top:10px; color:rgba(255,255,255,.70); font-size:15px; line-height:1.65; max-width:70ch; }
        .m-grid{ margin-top:18px; display:grid; grid-template-columns: 1fr 1fr; gap:14px; }
        @media (max-width: 980px){ .m-grid{ grid-template-columns:1fr; } }
        .m-card{ border-radius:22px; border:1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.03); padding:16px; box-shadow:0 22px 90px rgba(0,0,0,.40); }
        .m-h{ display:flex; align-items:center; gap:10px; font-weight:900; color:rgba(255,255,255,.90); }
        .m-p{ margin-top:8px; color:rgba(255,255,255,.68); line-height:1.7; font-size:14px; }
        .m-li{ margin-top:10px; display:grid; gap:10px; }
        .m-it{ display:flex; gap:10px; align-items:flex-start; padding:10px; border-radius:16px; border:1px solid rgba(255,255,255,.07); background: rgba(0,0,0,.18); }
        .m-ico{ width:30px; height:30px; border-radius:12px; display:flex; align-items:center; justify-content:center; border:1px solid rgba(255,255,255,.10); background: rgba(47,184,255,.08); color:rgba(255,255,255,.92); flex:0 0 auto; }
        .m-itT{ font-weight:900; color:rgba(255,255,255,.90); }
        .m-itD{ margin-top:4px; color:rgba(255,255,255,.66); line-height:1.65; font-size:13.5px; }
      `}</style>

      <section className="m">
        <div className="container">
          <div className="m-hero">
            <div className="m-k">
              <span className="m-dot" aria-hidden="true" />
              <span>SERVICES</span>
            </div>
            <div className="m-title">Mobil app-lərin hazırlanması</div>
            <div className="m-sub">
              iOS/Android üçün sürətli, stabil və premium UX-li tətbiqlər. İstəsən backend, admin panel, analitika və push bildirişləri də qururuq.
            </div>

            <div className="m-grid">
              <div className="m-card">
                <div className="m-h">
                  <Smartphone size={18} />
                  <span>UX & Performans</span>
                </div>
                <div className="m-p">Sürətli açılış, smooth animasiya, offline-ready strukturlar.</div>
                <div className="m-li">
                  <Item icon={<Zap size={16} />} title="Fast" desc="Optimized bundle, caching, minimal latency." />
                  <Item icon={<Layers size={16} />} title="Scalable" desc="Modular arxitektura, rahat genişlənmə." />
                </div>
              </div>

              <div className="m-card">
                <div className="m-h">
                  <ShieldCheck size={18} />
                  <span>Backend & Təhlükəsizlik</span>
                </div>
                <div className="m-p">Auth, rate-limit, audit, secure API. Deploy + monitoring ilə.</div>
                <div className="m-li">
                  <Item icon={<ShieldCheck size={16} />} title="Secure" desc="JWT, roles, logging, protections." />
                  <Item icon={<Zap size={16} />} title="Push/Events" desc="Bildirişlər, event tracking, funnel." />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
});

function Item({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="m-it">
      <div className="m-ico" aria-hidden="true">
        {icon}
      </div>
      <div>
        <div className="m-itT">{title}</div>
        <div className="m-itD">{desc}</div>
      </div>
    </div>
  );
}
