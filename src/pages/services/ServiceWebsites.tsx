import React, { memo } from "react";
import { Globe2, Rocket, ShieldCheck, Search } from "lucide-react";

export default memo(function ServiceWebsites() {
  return (
    <main style={{ padding: "calc(var(--hdrh,72px) + 28px) 0 84px" }}>
      <style>{`
        .w .container{ max-width:1180px; margin:0 auto; padding:0 18px; }
        .w-hero{
          border-radius:26px; border:1px solid rgba(255,255,255,.08);
          background:
            radial-gradient(120% 90% at 18% 10%, rgba(167,89,255,.16), transparent 55%),
            radial-gradient(120% 90% at 86% 10%, rgba(47,184,255,.12), transparent 60%),
            rgba(10,12,18,.62);
          -webkit-backdrop-filter: blur(18px) saturate(1.15);
          backdrop-filter: blur(18px) saturate(1.15);
          box-shadow:0 26px 120px rgba(0,0,0,.55);
          padding: 26px 20px;
        }
        .w-k{ font-weight:900; letter-spacing:.18em; font-size:11px; color:rgba(255,255,255,.70); text-transform:uppercase; display:flex; align-items:center; gap:10px; }
        .w-dot{ width:10px; height:10px; border-radius:999px; background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), rgba(167,89,255,.85)); box-shadow:0 0 0 4px rgba(167,89,255,.10); }
        .w-title{ margin-top:10px; font-size:clamp(28px,3.2vw,44px); line-height:1.06; font-weight:900; color:rgba(255,255,255,.94); letter-spacing:-.02em; }
        .w-sub{ margin-top:10px; color:rgba(255,255,255,.70); font-size:15px; line-height:1.65; max-width:70ch; }
        .w-grid{ margin-top:18px; display:grid; grid-template-columns: 1fr 1fr; gap:14px; }
        @media (max-width: 980px){ .w-grid{ grid-template-columns:1fr; } }
        .w-card{ border-radius:22px; border:1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.03); padding:16px; box-shadow:0 22px 90px rgba(0,0,0,.40); }
        .w-h{ display:flex; align-items:center; gap:10px; font-weight:900; color:rgba(255,255,255,.90); }
        .w-p{ margin-top:8px; color:rgba(255,255,255,.68); line-height:1.7; font-size:14px; }
        .w-li{ margin-top:10px; display:grid; gap:10px; }
        .w-it{ display:flex; gap:10px; align-items:flex-start; padding:10px; border-radius:16px; border:1px solid rgba(255,255,255,.07); background: rgba(0,0,0,.18); }
        .w-ico{ width:30px; height:30px; border-radius:12px; display:flex; align-items:center; justify-content:center; border:1px solid rgba(255,255,255,.10); background: rgba(167,89,255,.08); color:rgba(255,255,255,.92); flex:0 0 auto; }
        .w-itT{ font-weight:900; color:rgba(255,255,255,.90); }
        .w-itD{ margin-top:4px; color:rgba(255,255,255,.66); line-height:1.65; font-size:13.5px; }
      `}</style>

      <section className="w">
        <div className="container">
          <div className="w-hero">
            <div className="w-k">
              <span className="w-dot" aria-hidden="true" />
              <span>SERVICES</span>
            </div>
            <div className="w-title">Veb saytların hazırlanması</div>
            <div className="w-sub">
              Premium dizayn + sürətli performans + SEO əsasları + konversiya yönümlü struktur. İstəsən blog, admin panel və AI widget da əlavə edirik.
            </div>

            <div className="w-grid">
              <div className="w-card">
                <div className="w-h">
                  <Globe2 size={18} />
                  <span>Frontend & UX</span>
                </div>
                <div className="w-p">Mobil-first, premium animasiyalar, 9/10 Lighthouse performans hədəfi.</div>
                <div className="w-li">
                  <Item icon={<Rocket size={16} />} title="Performance" desc="Video optimizasiya, lazy load, caching." />
                  <Item icon={<Search size={16} />} title="SEO" desc="Meta, struktur, sitemap, clean URL." />
                </div>
              </div>

              <div className="w-card">
                <div className="w-h">
                  <ShieldCheck size={18} />
                  <span>Backend & Admin</span>
                </div>
                <div className="w-p">Leads, blog, media library, multi-lang, deploy flow (Netlify/CF + Railway).</div>
                <div className="w-li">
                  <Item icon={<Rocket size={16} />} title="Deploy" desc="CI/CD, env vars, domain, SSL." />
                  <Item icon={<ShieldCheck size={16} />} title="Security" desc="JWT, rate limit, admin allowlist." />
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
    <div className="w-it">
      <div className="w-ico" aria-hidden="true">
        {icon}
      </div>
      <div>
        <div className="w-itT">{title}</div>
        <div className="w-itD">{desc}</div>
      </div>
    </div>
  );
}
