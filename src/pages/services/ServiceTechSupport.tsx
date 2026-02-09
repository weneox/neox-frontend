import React, { memo } from "react";
import { Headset, ShieldCheck, Clock, Wrench } from "lucide-react";

export default memo(function ServiceTechSupport() {
  return (
    <main style={{ padding: "calc(var(--hdrh,72px) + 28px) 0 84px" }}>
      <style>{`
        .t .container{ max-width:1180px; margin:0 auto; padding:0 18px; }
        .t-hero{
          border-radius:26px; border:1px solid rgba(255,255,255,.08);
          background:
            radial-gradient(120% 90% at 18% 10%, rgba(47,184,255,.14), transparent 55%),
            radial-gradient(120% 90% at 86% 10%, rgba(167,89,255,.12), transparent 60%),
            rgba(10,12,18,.62);
          -webkit-backdrop-filter: blur(18px) saturate(1.15);
          backdrop-filter: blur(18px) saturate(1.15);
          box-shadow:0 26px 120px rgba(0,0,0,.55);
          padding: 26px 20px;
        }
        .t-k{ font-weight:900; letter-spacing:.18em; font-size:11px; color:rgba(255,255,255,.70); text-transform:uppercase; display:flex; align-items:center; gap:10px; }
        .t-dot{ width:10px; height:10px; border-radius:999px; background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), rgba(47,184,255,.85)); box-shadow:0 0 0 4px rgba(47,184,255,.10); }
        .t-title{ margin-top:10px; font-size:clamp(28px,3.2vw,44px); line-height:1.06; font-weight:900; color:rgba(255,255,255,.94); letter-spacing:-.02em; }
        .t-sub{ margin-top:10px; color:rgba(255,255,255,.70); font-size:15px; line-height:1.65; max-width:70ch; }
        .t-grid{ margin-top:18px; display:grid; grid-template-columns: 1fr 1fr; gap:14px; }
        @media (max-width: 980px){ .t-grid{ grid-template-columns:1fr; } }
        .t-card{ border-radius:22px; border:1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.03); padding:16px; box-shadow:0 22px 90px rgba(0,0,0,.40); }
        .t-h{ display:flex; align-items:center; gap:10px; font-weight:900; color:rgba(255,255,255,.90); }
        .t-p{ margin-top:8px; color:rgba(255,255,255,.68); line-height:1.7; font-size:14px; }
        .t-li{ margin-top:10px; display:grid; gap:10px; }
        .t-it{ display:flex; gap:10px; align-items:flex-start; padding:10px; border-radius:16px; border:1px solid rgba(255,255,255,.07); background: rgba(0,0,0,.18); }
        .t-ico{ width:30px; height:30px; border-radius:12px; display:flex; align-items:center; justify-content:center; border:1px solid rgba(255,255,255,.10); background: rgba(47,184,255,.08); color:rgba(255,255,255,.92); flex:0 0 auto; }
        .t-itT{ font-weight:900; color:rgba(255,255,255,.90); }
        .t-itD{ margin-top:4px; color:rgba(255,255,255,.66); line-height:1.65; font-size:13.5px; }
      `}</style>

      <section className="t">
        <div className="container">
          <div className="t-hero">
            <div className="t-k">
              <span className="t-dot" aria-hidden="true" />
              <span>SERVICES</span>
            </div>
            <div className="t-title">Texniki dəstək</div>
            <div className="t-sub">
              Qurulan sistemlər üçün monitorinq, düzəliş, yeniləmə, təhlükəsizlik və stabil işləmə. Problem olanda “itmirik” — sürətli reaksiya veririk.
            </div>

            <div className="t-grid">
              <div className="t-card">
                <div className="t-h">
                  <Clock size={18} />
                  <span>Sürətli cavab</span>
                </div>
                <div className="t-p">SLA əsaslı dəstək: kritik problem → prioritet eskalasiya.</div>
                <div className="t-li">
                  <Item icon={<Headset size={16} />} title="Operator kanal" desc="Birbaşa admin panel + Telegram bildiriş." />
                  <Item icon={<Clock size={16} />} title="SLA" desc="Cavab vaxtı ölçümü, reminder və alertlər." />
                </div>
              </div>

              <div className="t-card">
                <div className="t-h">
                  <ShieldCheck size={18} />
                  <span>Stabil sistem</span>
                </div>
                <div className="t-p">Update, security patch, backup, performans və uptime monitorinq.</div>
                <div className="t-li">
                  <Item icon={<Wrench size={16} />} title="Maintenance" desc="Planlı yeniləmələr, test, rollback." />
                  <Item icon={<ShieldCheck size={16} />} title="Security" desc="Rate limit, auth, audit, log." />
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
    <div className="t-it">
      <div className="t-ico" aria-hidden="true">
        {icon}
      </div>
      <div>
        <div className="t-itT">{title}</div>
        <div className="t-itD">{desc}</div>
      </div>
    </div>
  );
}
