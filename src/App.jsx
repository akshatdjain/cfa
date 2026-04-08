import { useState, useRef, useEffect, useCallback } from "react";

const SYSTEM_PROMPT = `You are a CFA Level 1 tutor for Raghavendra, preparing for August 2026. He has deep DCF valuation experience across Indian stocks (Nifty 500), builds quantitative trading systems (Theta X platform — NSE/BSE), and is targeting a Quant PM career.

RESPONSE RULES:
- Concise, exam-focused (under 250 words unless concept demands more)
- Indian market examples: ₹, NSE, BSE, Nifty, Sensex, RBI, SEBI, GOI bonds
- State which CFA topic area the concept belongs to
- For formulas: show formula + quick numeric example
- Flag common CFA exam traps and mistakes
- Connect to other CFA topics briefly when relevant
- Use practical analogies from trading/investing
- End with a memory hook, mnemonic, or exam tip when useful

FORMAT: Use markdown with **bold** for key terms, backticks for formulas. Keep it punchy.`;

const TOPICS = [
  { id: "all", label: "All topics", icon: "◈" },
  { id: "ethics", label: "Ethics", icon: "§" },
  { id: "quant", label: "Quant", icon: "Σ" },
  { id: "econ", label: "Econ", icon: "↗" },
  { id: "fra", label: "FRA", icon: "₹" },
  { id: "corp", label: "Corp", icon: "⊞" },
  { id: "equity", label: "Equity", icon: "△" },
  { id: "fi", label: "Fixed Inc", icon: "‖" },
  { id: "deriv", label: "Derivs", icon: "∂" },
  { id: "alt", label: "Alts", icon: "◇" },
  { id: "pm", label: "Portfolio", icon: "π" },
];

const QUICK_BY_TOPIC = {
  all: [
    "What are the most tested formulas in CFA L1?",
    "Give me a quick revision of DuPont analysis",
    "Explain the relationship between bond prices and yields",
    "What's the difference between systematic and unsystematic risk?",
  ],
  ethics: [
    "Explain Standard I(A) - Knowledge of the Law",
    "Mosaic theory vs material nonpublic info",
    "What are the GIPS requirements for CFA L1?",
    "Soft dollar standards — when is it acceptable?",
  ],
  quant: [
    "Type I vs Type II error with example",
    "When to use t-test vs z-test?",
    "Explain Bayes' theorem with a stock example",
    "Chebyshev's inequality vs empirical rule",
  ],
  econ: [
    "How does RBI repo rate affect bond markets?",
    "Explain the IS-LM model simply",
    "Fiscal vs monetary policy effects on GDP",
    "Marshall-Lerner condition for currency depreciation",
  ],
  fra: [
    "FIFO vs LIFO impact on all financial statements",
    "Operating lease vs finance lease IFRS 16",
    "How to detect earnings manipulation?",
    "DTL vs DTA — when does each arise?",
  ],
  corp: [
    "NPV vs IRR — when do they conflict?",
    "Modigliani-Miller with and without taxes",
    "Pecking order theory vs trade-off theory",
    "How to calculate WACC step by step?",
  ],
  equity: [
    "Gordon Growth Model assumptions and limitations",
    "H-model vs two-stage DDM — when to use which?",
    "Explain all three forms of EMH",
    "P/E vs EV/EBITDA — when to prefer which?",
  ],
  fi: [
    "Modified duration vs effective duration",
    "Explain convexity with a practical example",
    "Spot rate vs forward rate vs YTM",
    "What is credit spread and what drives it?",
  ],
  deriv: [
    "Put-call parity with a Nifty example",
    "How are forward prices determined? No-arbitrage",
    "Protective put vs covered call payoff",
    "Interest rate swap mechanics step by step",
  ],
  alt: [
    "PE fund structure: GP vs LP, fees, waterfall",
    "Real estate valuation: income vs comparable",
    "Hedge fund strategies overview for CFA L1",
    "Commodities: contango vs backwardation",
  ],
  pm: [
    "CAPM derivation and all assumptions",
    "CML vs SML — what's plotted on each?",
    "How to construct an IPS for a client?",
    "Sharpe ratio vs Treynor ratio vs Jensen's alpha",
  ],
};

function Md({ text }) {
  if (!text) return null;
  const il = (s) => {
    const p = [];
    let re = /(\*\*(.+?)\*\*)|(`(.+?)`)/g, l = 0, m;
    while ((m = re.exec(s)) !== null) {
      if (m.index > l) p.push(<span key={`t${m.index}`}>{s.slice(l, m.index)}</span>);
      if (m[1]) p.push(<strong key={m.index} style={{ color: "#e8f5e9", fontWeight: 600 }}>{m[2]}</strong>);
      if (m[3]) p.push(<code key={m.index} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, background: "#162216", color: "#00E676", padding: "1px 5px", borderRadius: 3, border: "1px solid #1e3a1e" }}>{m[4]}</code>);
      l = re.lastIndex;
    }
    if (l < s.length) p.push(<span key="e">{s.slice(l)}</span>);
    return p;
  };
  return (
    <div style={{ lineHeight: 1.65 }}>
      {text.split("\n").map((ln, i) => {
        if (ln.startsWith("### ")) return <div key={i} style={{ fontSize: 13, fontWeight: 600, color: "#81c784", margin: "10px 0 4px" }}>{il(ln.slice(4))}</div>;
        if (ln.startsWith("## ")) return <div key={i} style={{ fontSize: 14, fontWeight: 600, color: "#66BB6A", margin: "12px 0 5px" }}>{il(ln.slice(3))}</div>;
        if (ln.startsWith("# ")) return <div key={i} style={{ fontSize: 15, fontWeight: 600, color: "#00E676", margin: "14px 0 6px" }}>{il(ln.slice(2))}</div>;
        if (/^[-*]\s/.test(ln)) return <div key={i} style={{ display: "flex", gap: 7, margin: "2px 0", paddingLeft: 4 }}><span style={{ color: "#00E676", flexShrink: 0, fontSize: 13 }}>›</span><span style={{ color: "#b2dfb4" }}>{il(ln.slice(2))}</span></div>;
        const nm = ln.match(/^(\d+)\.\s/);
        if (nm) return <div key={i} style={{ display: "flex", gap: 7, margin: "2px 0", paddingLeft: 4 }}><span style={{ color: "#00E676", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, minWidth: 16, flexShrink: 0 }}>{nm[1]}.</span><span style={{ color: "#b2dfb4" }}>{il(ln.slice(nm[0].length))}</span></div>;
        if (!ln.trim()) return <div key={i} style={{ height: 5 }} />;
        return <div key={i} style={{ margin: "3px 0", color: "#c8e6c9" }}>{il(ln)}</div>;
      })}
    </div>
  );
}

export default function App() {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [topic, setTopic] = useState("all");
  const [count, setCount] = useState(0);
  const [error, setError] = useState(null);
  const chatRef = useRef(null);
  const inRef = useRef(null);
  const tips = ["Consulting the curriculum...", "Running through standards...", "Checking Schweser notes...", "Crunching the formula...", "Cross-referencing topics...", "Finding the exam angle..."];
  const [ti, setTi] = useState(0);

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [msgs, busy]);
  useEffect(() => { if (!busy) return; const iv = setInterval(() => setTi(p => (p + 1) % tips.length), 2000); return () => clearInterval(iv); }, [busy]);

  const send = useCallback(async (text) => {
    const q = text?.trim();
    if (!q || busy) return;
    setInput("");
    setError(null);
    const topicCtx = topic !== "all" ? `\n[Topic: ${TOPICS.find(t => t.id === topic)?.label}. Focus answer on this area.]` : "";
    const nm = [...msgs, { role: "user", content: q }];
    setMsgs(nm);
    setBusy(true);
    try {
      const am = nm.slice(-10).map(m => ({ role: m.role, content: m.content }));

      // Call our backend proxy (API key stays server-side)
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: SYSTEM_PROMPT + topicCtx,
          messages: am,
          topic: topic,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.detail || `Server error ${res.status}`);
      }

      const data = await res.json();
      const reply = data.content?.map(c => c.text || "").join("\n") || "No response received.";
      setMsgs(p => [...p, { role: "assistant", content: reply }]);
      setCount(p => p + 1);
    } catch (err) {
      console.error("Chat error:", err);
      setError(err.message);
      setMsgs(p => [...p, { role: "assistant", content: `⚠ ${err.message}. Check the server is running.` }]);
    }
    setBusy(false);
    inRef.current?.focus();
  }, [msgs, busy, topic]);

  const qp = QUICK_BY_TOPIC[topic] || QUICK_BY_TOPIC.all;

  return (
    <div style={S.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap');
        @keyframes pulse{0%,80%,100%{transform:scale(.5);opacity:.3}40%{transform:scale(1);opacity:1}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#050805}::-webkit-scrollbar-thumb{background:#1a3018;border-radius:2px}
        textarea::placeholder{color:#2a4a2a}textarea:focus{outline:none;border-color:#00E676!important;box-shadow:0 0 0 1px #00E67622}
        .tp{transition:all .15s ease}.tp:hover{background:#0d180d!important;border-color:#2a4a2a!important}
        .qb{transition:all .15s ease}.qb:hover{background:#0d180d!important;border-color:#00E67666!important;color:#00E676!important}
        .pills-scroll::-webkit-scrollbar{display:none}
      `}</style>

      {/* Header */}
      <div style={S.hdr}>
        <div style={S.hdrTop}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={S.mark}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00E676" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </div>
            <div>
              <div style={S.title}>CFA RAPID DOUBTS</div>
              <div style={S.sub}>Level 1 · Aug 2026 · Theta X Research</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={S.badge}>{count} answered</div>
            <button onClick={() => { setMsgs([]); setError(null); }} style={S.clr}>CLEAR</button>
          </div>
        </div>
        <div style={S.pills} className="pills-scroll">
          {TOPICS.map(t => (
            <button key={t.id} className="tp" onClick={() => setTopic(t.id)}
              style={{ ...S.pill, ...(topic === t.id ? S.pillOn : {}) }}>
              <span style={{ fontSize: 10, lineHeight: 1 }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chat */}
      <div ref={chatRef} style={S.chat}>
        {msgs.length === 0 && !busy && (
          <div style={S.empty}>
            <div style={S.circle}>
              <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 22, fontWeight: 700, color: "#00E676" }}>?</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#8ac98c" }}>
              {topic === "all" ? "Ask any CFA L1 doubt" : `${TOPICS.find(t => t.id === topic)?.label} doubts`}
            </div>
            <div style={{ fontSize: 12, color: "#3a5a3a", textAlign: "center", maxWidth: 360, lineHeight: 1.5 }}>
              Type a concept, formula, or confusion below. Answers use Indian market examples and connect to your quant background.
            </div>
            <div style={S.qGrid}>
              {qp.map((p, i) => (
                <button key={i} className="qb" onClick={() => send(p)} style={S.qBtn}>{p}</button>
              ))}
            </div>
          </div>
        )}

        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", animation: "fadeUp .25s ease" }}>
            {m.role !== "user" && <div style={S.aiDot}>AI</div>}
            <div style={m.role === "user" ? S.uBub : S.aBub}>
              {m.role === "user" ? <span style={{ fontSize: 13 }}>{m.content}</span> : <Md text={m.content} />}
            </div>
          </div>
        ))}

        {busy && (
          <div style={{ display: "flex", justifyContent: "flex-start", animation: "fadeUp .25s ease" }}>
            <div style={S.aiDot}>AI</div>
            <div style={S.ldBub}>
              <div style={{ display: "flex", gap: 3 }}>
                {[0, .15, .3].map((d, i) => <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#00E676", display: "inline-block", animation: `pulse 1.2s ${d}s infinite ease-in-out` }} />)}
              </div>
              <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 10.5, color: "#2a4a2a", fontStyle: "italic" }}>{tips[ti]}</span>
            </div>
          </div>
        )}
      </div>

      {/* Suggestion chips */}
      {msgs.length > 0 && !busy && (
        <div style={S.chips}>
          {qp.slice(0, 2).map((p, i) => (
            <button key={i} className="qb" onClick={() => send(p)} style={S.chip}>{p}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={S.bar}>
        <textarea ref={inRef} value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
          placeholder={topic === "all" ? "Type your CFA doubt..." : `Ask about ${TOPICS.find(t => t.id === topic)?.label}...`}
          rows={1} style={S.ta} disabled={busy} />
        <button onClick={() => send(input)} disabled={!input.trim() || busy}
          style={{ ...S.sBtn, opacity: !input.trim() || busy ? 0.25 : 1 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

const S = {
  root: { fontFamily: "'Outfit',sans-serif", background: "#050805", height: "100vh", display: "flex", flexDirection: "column", color: "#c8e6c9", overflow: "hidden" },
  hdr: { borderBottom: "1px solid #0d180d", background: "#070b07", flexShrink: 0 },
  hdrTop: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px 4px" },
  mark: { width: 32, height: 32, borderRadius: 7, background: "#0a1408", border: "1px solid #162a14", display: "flex", alignItems: "center", justifyContent: "center" },
  title: { fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, fontWeight: 700, color: "#00E676", letterSpacing: 2 },
  sub: { fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#2a4a2a", letterSpacing: 0.5, marginTop: 1 },
  badge: { fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: "#00E676", background: "#0a1408", border: "1px solid #162a14", padding: "2px 8px", borderRadius: 4 },
  clr: { fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#2a4a2a", background: "transparent", border: "1px solid #162a14", padding: "2px 8px", borderRadius: 4, cursor: "pointer", letterSpacing: 1 },
  pills: { display: "flex", gap: 4, padding: "6px 14px 10px", overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none" },
  pill: { fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: "#3a5a3a", background: "#070b07", border: "1px solid #121e12", padding: "3px 9px", borderRadius: 16, cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4, transition: "all .15s" },
  pillOn: { color: "#00E676", background: "#0a1408", borderColor: "#00E676" },
  chat: { flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 },
  empty: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 10, padding: "8px 0" },
  circle: { width: 48, height: 48, borderRadius: "50%", border: "1.5px solid #162a14", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a1408" },
  qGrid: { display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", maxWidth: 500, marginTop: 6 },
  qBtn: { fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#4a7a4a", background: "#070b07", border: "1px solid #121e12", padding: "6px 11px", borderRadius: 6, cursor: "pointer", textAlign: "left", lineHeight: 1.35, maxWidth: 240, transition: "all .15s" },
  aiDot: { fontFamily: "'JetBrains Mono',monospace", fontSize: 8, fontWeight: 700, color: "#00E676", background: "#0a1408", border: "1px solid #162a14", width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 6, marginTop: 2 },
  uBub: { background: "#00E676", color: "#050805", padding: "8px 13px", borderRadius: "12px 12px 3px 12px", maxWidth: "80%", fontWeight: 500 },
  aBub: { background: "#090f09", border: "1px solid #121e12", padding: "11px 14px", borderRadius: "12px 12px 12px 3px", maxWidth: "88%", fontSize: 13 },
  ldBub: { background: "#090f09", border: "1px solid #121e12", padding: "11px 14px", borderRadius: "12px 12px 12px 3px", display: "flex", alignItems: "center", gap: 10 },
  chips: { display: "flex", gap: 5, padding: "0 14px 5px", overflowX: "auto", flexShrink: 0 },
  chip: { fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: "#3a5a3a", background: "#070b07", border: "1px solid #121e12", padding: "4px 9px", borderRadius: 5, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, transition: "all .15s" },
  bar: { display: "flex", alignItems: "flex-end", gap: 8, padding: "8px 14px 12px", borderTop: "1px solid #0d180d", background: "#070b07", flexShrink: 0 },
  ta: { flex: 1, fontFamily: "'Outfit',sans-serif", fontSize: 14, color: "#c8e6c9", background: "#050805", border: "1px solid #121e12", borderRadius: 10, padding: "10px 14px", resize: "none", lineHeight: 1.4 },
  sBtn: { width: 38, height: 38, borderRadius: 10, background: "#00E676", color: "#050805", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "opacity .15s" },
};
