import React, { memo } from "react";
import { Megaphone, CalendarClock, Zap, BarChart3 } from "lucide-react";

export default memo(function ServiceSmmAutomation() {
  return (
    <main style={{ padding: "calc(var(--hdrh,72px) + 28px) 0 84px" }}>
      <style>{`
        .s .container{ max-width:1180px; margin:0 auto; padding:0 18px; }
        .s-hero{
          border-radius:26px; border:1px solid rgba(255,255,255,.08);
          background:
            radial-gradient(120% 90% at 18% 10%, rgba(255,184,47,.16), transparent 55%),
            radial-gradient(120% 90% at 86% 10%, rgba(47,184,255,.12), transparent 60%),
            rgba(10,12,18,.62);
          -webkit-backdrop-filter: blur(18px) saturate(1.15);
          backdrop-filter: blur(18px) saturate(1.15);
          box-shadow:0 26px 120px rgba(0,0,0,.55);
          padding: 26px 20px;
        }
        .s-k{ font-weight:900; letter-spacing:.18em; font-size:11px; color:rgba(255,255,255,.70); text-transform:uppercase; display:flex; align-items:center; gap:10px; }
        .s-dot{ width:10px; height:10px; border-radius:999px; background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), rgba(255,184,47,.85)); box-shadow:0 0 0 4px rgba(255,184,47,.10); }
        .s-title{ margin-top:10px; font-size:clamp(28px,3.2vw,44px); line-height:1.06; font-weight:900; color:rgba(255,255,255,.94); letter-spacing:-.02em; }
        .s-sub{ margin-top:10px; color:rgba(255,255,255,.70); font-size:15px; line-height:1.65; max-width:70ch; }
        .s-grid{ margin-top:18px; display:grid; grid-template-columns: 1fr 1fr; gap:14px; }
        @media (max-width: 980px){ .s-grid{ grid-template-columns:1fr; } }
        .s-card{ border-radius:22px; border:1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.03); padding:16px; box-shadow:0 22px 90px rgba(0,0,0,.40); }
        .s-h{ display:flex; align-items:center; gap:10px; font-weight:900; color:rgba(255,255,255,.90); }
        .s-p{ margin-top:8px; color:rgba(255,255,255,.68); line-height:1.7; font-size:14px; }
        .s-li{ margin-top:10px; display:grid; gap:10px; }
        .s-it{ display:flex; gap:10px; align-items:flex-start; padding:10px; border-radius:16px; border:1px solid rgba(255,255,255,.07); background: rgba(0,0,0,.18); }
        .s-ico{ width:30px; height:30px; border-radius:12px; display:flex; align-items:center; justify-content:center; border:1px solid rgba(255,255,255,.10); background: rgba(255,184,47,.08); color:rgba(255,255,255,.92); flex:0 0 auto; }
        .s-itT{ font-weight:900; color:rgba(255,255,255,.90); }
        .s-itD{ margin-top:4px; color:rgba(255,255,255,.66); line-height:1.65; font-size:13.5px; }
      `}</style>

      <section className="s">
        <div className="container">
          <div className="s-hero">
            <div className="s-k">
              <span className="s-dot" aria-hidden="true" />
              <span>SERVICES</span>
            </div>
            <div className="s-title">SMM avtomatlaşdırılması</div>
            <div className="s-sub">
              Kontent planı, paylaşım avtomatikası, DM/lead axını, analitika və müştəri suallarını AI ilə cavablandırma — hamısı bir sistemdə.
            </div>

            <div className="s-grid">
              <div className="s-card">
                <div className="s-h">
                  <CalendarClock size={18} />
                  <span>Plan & Publish</span>
                </div>
                <div className="s-p">Kontent təqvimi + avtomatik paylaşım + təkrarlanan kampaniyalar.</div>
                <div className="s-li">
                  <Item icon={<Zap size={16} />} title="Automation" desc="Schedule, repost, multi-channel publishing." />
                  <Item icon={<Megaphone size={16} />} title="Campaigns" desc="Funnel üçün ardıcıl post axınları." />
                </div>
              </div>

              <div className="s-card">
                <div className="s-h">
                  <BarChart3 size={18} />
                  <span>Analytics & Growth</span>
                </div>
                <div className="s-p">Post performansı, lead dönüşümü, DM cavab sürəti — ölç, artır.</div>
                <div className="s-li">
                  <Item icon={<BarChart3 size={16} />} title="Metrics" desc="Engagement, CTR, conversion, cost." />
                  <Item icon={<Zap size={16} />} title="Optimize" desc="A/B test, təkmilləşdirmə, audit." />
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
    <div className="s-it">
      <div className="s-ico" aria-hidden="true">
        {icon}
      </div>
      <div>
        <div className="s-itT">{title}</div>
        <div className="s-itD">{desc}</div>
      </div>
    </div>
  );
}
