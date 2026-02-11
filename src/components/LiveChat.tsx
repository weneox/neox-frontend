// src/components/LiveChat.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";

type Role = "agent" | "customer";
type Msg = { id: string; role: Role; text: string; time?: string };

type Item =
  | { kind: "msg"; id: string; role: Role; text: string; time?: string }
  | { kind: "typing"; id: string; role: Role };

const LIVECHAT_CSS = `
/* =========================
   L I V E  C H A T — premium natural (scoped)
   Prefix: lcx-
   ========================= */

.lcx{
  --bg: rgba(255,255,255,.03);
  --bg2: rgba(255,255,255,.05);
  --line: rgba(255,255,255,.10);
  --ink: rgba(255,255,255,.92);
  --muted: rgba(255,255,255,.70);
  --dim: rgba(255,255,255,.55);

  --a1: rgba(47,184,255,.95);
  --a2: rgba(42,125,255,.95);

  width:100%;
  border-radius: 22px;
  border: 1px solid var(--line);
  background: radial-gradient(1200px 600px at 12% 8%, rgba(47,184,255,.10), transparent 55%),
              radial-gradient(900px 540px at 88% 12%, rgba(42,125,255,.10), transparent 55%),
              rgba(0,0,0,.26);
  overflow:hidden;
  position:relative;
}

.lcx:before{
  content:"";
  position:absolute;
  inset:0;
  background: linear-gradient(180deg, rgba(255,255,255,.06), transparent 42%, rgba(0,0,0,.28));
  pointer-events:none;
}

.lcxHead{
  position:relative;
  z-index:2;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  padding: 12px 14px;
  border-bottom:1px solid rgba(255,255,255,.08);
}

.lcxTitle{
  display:flex;
  align-items:center;
  gap:10px;
  min-width:0;
}

.lcxLiveDot{
  width:10px;height:10px;border-radius:999px;
  background: rgba(66,255,190,.95);
  box-shadow: 0 0 0 3px rgba(66,255,190,.14);
  flex:0 0 auto;
}

.lcxTitleText{
  font-size:12px;
  letter-spacing:.16em;
  text-transform:uppercase;
  color: rgba(255,255,255,.72);
  white-space:nowrap;
}

.lcxStatus{
  display:inline-flex;
  align-items:center;
  gap:8px;
  padding: 8px 10px;
  border-radius:999px;
  border:1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.03);
  color: rgba(255,255,255,.78);
  font-size:12px;
  white-space:nowrap;
}

.lcxFrame{
  position:relative;
  z-index:2;
  padding: 12px;
}

.lcxScroll{
  height: 320px;
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,.08);
  background: rgba(0,0,0,.22);
  overflow:auto;
  padding: 12px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,.18) transparent;
  overscroll-behavior: contain;
}

.lcxScroll::-webkit-scrollbar{ width:10px; }
.lcxScroll::-webkit-scrollbar-thumb{
  background: rgba(255,255,255,.14);
  border-radius: 999px;
  border: 3px solid transparent;
  background-clip: padding-box;
}

.lcxMsg{
  display:flex;
  flex-direction:column;
  gap:6px;
  margin: 10px 0;
}

.lcxMeta{
  display:flex;
  align-items:baseline;
  justify-content:space-between;
  gap:10px;
  font-size:11px;
  color: rgba(255,255,255,.58);
  letter-spacing:.08em;
  text-transform:uppercase;
}

.lcxWho{
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}

.lcxTime{
  opacity:.8;
  flex:0 0 auto;
}

.lcxBubble{
  width: fit-content;
  max-width: min(92%, 520px);
  padding: 10px 12px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.04);
  color: var(--ink);
  line-height:1.35;
  font-size: 14px;
}

.lcxMsg.isAgent{ align-items:flex-end; }
.lcxMsg.isAgent .lcxMeta{ justify-content:flex-end; }
.lcxMsg.isAgent .lcxBubble{
  background: linear-gradient(180deg, rgba(47,184,255,.14), rgba(42,125,255,.08));
  border-color: rgba(47,184,255,.24);
}

.lcxMsg.isCustomer{ align-items:flex-start; }
.lcxMsg.isCustomer .lcxBubble{
  background: rgba(255,255,255,.04);
}

.lcxTyping{
  display:inline-flex;
  align-items:center;
  gap:6px;
  opacity:.9;
}

.lcxDots{
  display:inline-flex;
  gap:5px;
  align-items:center;
}

.lcxDots i{
  width:6px;height:6px;border-radius:999px;
  background: rgba(255,255,255,.70);
  opacity:.55;
  animation: lcxDot 1.05s ease-in-out infinite;
}
.lcxDots i:nth-child(2){ animation-delay:.14s; }
.lcxDots i:nth-child(3){ animation-delay:.28s; }

@keyframes lcxDot{
  0%,100%{ transform: translateY(0); opacity:.45; }
  50%{ transform: translateY(-3px); opacity:.95; }
}

.lcxFoot{
  position:relative;
  z-index:2;
  padding: 12px 14px 14px;
  border-top:1px solid rgba(255,255,255,.08);
  display:flex;
  flex-wrap:wrap;
  gap:8px;
}

.lcxPill{
  display:inline-flex;
  align-items:center;
  padding: 8px 10px;
  border-radius:999px;
  border:1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.03);
  color: rgba(255,255,255,.78);
  font-size: 12px;
  line-height:1;
  white-space:nowrap;
}

/* responsive */
@media (max-width: 520px){
  .lcxScroll{ height: 280px; padding: 10px; }
  .lcxBubble{ max-width: 94%; }
}
`;

function useInView<T extends Element>(threshold = 0.28) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([e]) => setInView(e.isIntersecting),
      { threshold, rootMargin: "0px 0px -12% 0px" }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, inView };
}

export default function LiveChat({
  messages,
  typing,
  visibleSlots = 4,
  title = "LIVE / CUSTOMER CHAT",
}: {
  messages: Msg[];
  typing: Role | null;
  visibleSlots?: number;
  title?: string;
}) {
  const endRef = useRef<HTMLDivElement | null>(null);
  const { ref, inView } = useInView<HTMLElement>(0.22);

  const items = useMemo<Item[]>(() => {
    const base: Item[] = messages.map((m) => ({
      kind: "msg",
      id: m.id,
      role: m.role,
      text: m.text,
      time: m.time,
    }));
    if (typing) base.push({ kind: "typing", id: `typing-${typing}`, role: typing });
    return base.slice(-visibleSlots);
  }, [messages, typing, visibleSlots]);

  // only autoscroll when in view (perf + your rule: scroll görmədən “işləməsin” hissi)
  useEffect(() => {
    if (!inView) return;
    const raf = requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    });
    return () => cancelAnimationFrame(raf);
  }, [items.length, inView]);

  const whoLabel = (r: Role) => (r === "customer" ? "MÜŞTƏRİ" : "NEOX AGENT");
  const typingLabel = (r: Role) => (r === "customer" ? "typing…" : "typing…");

  return (
    <section ref={ref as any} className="lcx" aria-label="Live chat demo">
      <style>{LIVECHAT_CSS}</style>

      <div className="lcxHead">
        <div className="lcxTitle">
          <span className="lcxLiveDot" aria-hidden="true" />
          <div className="lcxTitleText">{title}</div>
        </div>

        <div className="lcxStatus" aria-label="status">
          <span style={{ width: 8, height: 8, borderRadius: 999, background: "rgba(66,255,190,.95)" }} />
          ACTIVE
        </div>
      </div>

      <div className="lcxFrame">
        <div className="lcxScroll" role="log" aria-label="Chat messages">
          {items.map((it) => {
            if (it.kind === "typing") {
              const isCustomer = it.role === "customer";
              return (
                <div key={it.id} className={`lcxMsg ${isCustomer ? "isCustomer" : "isAgent"}`}>
                  <div className="lcxMeta">
                    <span className="lcxWho">{whoLabel(it.role)}</span>
                    <span className="lcxTime">
                      <span className="lcxTyping">
                        {typingLabel(it.role)}{" "}
                        <span className="lcxDots" aria-hidden="true">
                          <i />
                          <i />
                          <i />
                        </span>
                      </span>
                    </span>
                  </div>
                  <div className="lcxBubble" aria-label="Typing indicator">
                    …
                  </div>
                </div>
              );
            }

            const isCustomer = it.role === "customer";
            return (
              <div key={it.id} className={`lcxMsg ${isCustomer ? "isCustomer" : "isAgent"}`}>
                <div className="lcxMeta">
                  <span className="lcxWho">{whoLabel(it.role)}</span>
                  <span className="lcxTime">{it.time ?? ""}</span>
                </div>
                <div className="lcxBubble">{it.text}</div>
              </div>
            );
          })}

          <div ref={endRef} />
        </div>
      </div>

      <div className="lcxFoot" aria-hidden="true">
        <span className="lcxPill">intent: detect</span>
        <span className="lcxPill">route: auto</span>
        <span className="lcxPill">audit: on</span>
        <span className="lcxPill">latency: low</span>
      </div>
    </section>
  );
}
