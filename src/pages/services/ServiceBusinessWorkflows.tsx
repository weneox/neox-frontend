import React, { memo } from "react";
import { GitBranch, SlidersHorizontal, Zap, ShieldCheck } from "lucide-react";
import ServiceChatbot247 from "./ServiceChatbot247";

/**
 * Bu fayl ServiceChatbot247-dəki premium şablondan istifadə edir:
 * Sadəcə fərqli məzmun + ikonla.
 *
 * Sən istəsən sonra şablonu ayrıca komponentə çıxararıq.
 */
export default memo(function ServiceBusinessWorkflows() {
  // Quick hack: eyni UI bazasını saxlayıb fərqli məzmunla
  // (sənin üçün tez və problemsiz)
  return (
    <div>
      {/* ServiceChatbot247 UI-nin özünü saxlamırıq, sadəcə təmiz copy istəyirsənsə,
          növbəti mərhələdə "ServiceShell" komponentinə çıxaracağıq.
          İndilik sürətli yol: yeni səhifə üçün ayrıca fayl yaratdım aşağıda. */}
      <section style={{ paddingTop: "var(--hdrh,72px)" }} />
      <Inner />
    </div>
  );
});

function Inner() {
  // Bu səhifə üçün öz premium layoutumuzu ayrıca qururuq (yüngül + səliqəli)
  return (
    <main style={{ padding: "28px 0 84px" }}>
      <style>{`
        .svc2{ overflow-x:hidden; }
        .svc2 .container{ max-width:1180px; margin:0 auto; padding:0 18px; }
        .svc2-hero{
          border-radius:26px;
          border:1px solid rgba(255,255,255,.08);
          background:
            radial-gradient(120% 90% at 18% 10%, rgba(255,184,47,.18), transparent 55%),
            radial-gradient(120% 90% at 86% 10%, rgba(167,89,255,.12), transparent 60%),
            rgba(10,12,18,.62);
          -webkit-backdrop-filter: blur(18px) saturate(1.15);
          backdrop-filter: blur(18px) saturate(1.15);
          box-shadow:0 26px 120px rgba(0,0,0,.55);
          padding: 26px 20px;
        }
        .svc2-k{ font-weight:900; letter-spacing:.18em; font-size:11px; color:rgba(255,255,255,.70); text-transform:uppercase; display:flex; align-items:center; gap:10px; }
        .svc2-dot{ width:10px; height:10px; border-radius:999px; background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), rgba(255,184,47,.85)); box-shadow:0 0 0 4px rgba(255,184,47,.10); }
        .svc2-title{ margin-top:10px; font-size:clamp(28px,3.2vw,44px); line-height:1.06; font-weight:900; color:rgba(255,255,255,.94); letter-spacing:-.02em; }
        .svc2-sub{ margin-top:10px; color:rgba(255,255,255,.70); font-size:15px; line-height:1.65; max-width:68ch; }
        .svc2-grid{ margin-top:18px; display:grid; grid-template-columns: 1fr 1fr; gap:14px; }
        @media (max-width: 980px){ .svc2-grid{ grid-template-columns:1fr; } }
        .svc2-card{ border-radius:22px; border:1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.03); padding:16px; box-shadow:0 22px 90px rgba(0,0,0,.40); }
        .svc2-h{ display:flex; align-items:center; gap:10px; font-weight:900; color:rgba(255,255,255,.90); }
        .svc2-p{ margin-top:8px; color:rgba(255,255,255,.68); line-height:1.7; font-size:14px; }
        .svc2-li{ margin-top:10px; display:grid; gap:10px; }
        .svc2-it{ display:flex; gap:10px; align-items:flex-start; padding:10px; border-radius:16px; border:1px solid rgba(255,255,255,.07); background: rgba(0,0,0,.18); }
        .svc2-ico{ width:30px; height:30px; border-radius:12px; display:flex; align-items:center; justify-content:center; border:1px solid rgba(255,255,255,.10); background: rgba(255,184,47,.08); color:rgba(255,255,255,.92); flex:0 0 auto; }
        .svc2-itT{ font-weight:900; color:rgba(255,255,255,.90); }
        .svc2-itD{ margin-top:4px; color:rgba(255,255,255,.66); line-height:1.65; font-size:13.5px; }
      `}</style>

      <section className="svc2">
        <div className="container">
          <div className="svc2-hero">
            <div className="svc2-k">
              <span className="svc2-dot" aria-hidden="true" />
              <span>SERVICES</span>
            </div>
            <div className="svc2-title">Biznes workflowlarının qurulması</div>
            <div className="svc2-sub">
              Satış, lead, müştəri dəstəyi və daxili əməliyyatlar üçün avtomatlaşdırılmış proseslər: form → CRM → bildiriş →
              hesabat → növbəti addım.
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
                  <Item icon={<SlidersHorizontal size={16} />} title="Trigger & Rules" desc="Status, SLA, auto follow-up, eskalasiya." />
                  <Item icon={<Zap size={16} />} title="Automation" desc="Formlar, CRM, Telegram bildirişləri, e-mail axınları." />
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
