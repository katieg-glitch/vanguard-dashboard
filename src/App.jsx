import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════
// CONFIG — Replace these with your Airtable credentials
// ═══════════════════════════════════════════
const AIRTABLE_API_KEY = "YOUR_AIRTABLE_API_KEY";
const AIRTABLE_BASE_ID = "YOUR_BASE_ID";
const AIRTABLE_TABLE_NAME = "Sales Entries";
const API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`;

const BRANDS = ["Ferris", "Scag", "Wright"];

// ═══════════════════════════════════════════
// AIRTABLE API HELPERS
// ═══════════════════════════════════════════
const airtableFetch = async (url, options = {}) => {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`Airtable error: ${res.status}`);
  return res.json();
};

const fetchAllRecords = async () => {
  let all = [];
  let offset = null;
  do {
    const url = offset ? `${API_URL}?offset=${offset}` : API_URL;
    const data = await airtableFetch(url);
    all = [...all, ...data.records];
    offset = data.offset;
  } while (offset);
  return all;
};

const createRecords = async (records) => {
  const chunks = [];
  for (let i = 0; i < records.length; i += 10) {
    chunks.push(records.slice(i, i + 10));
  }
  const results = [];
  for (const chunk of chunks) {
    const data = await airtableFetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ records: chunk.map((fields) => ({ fields })) }),
    });
    results.push(...data.records);
  }
  return results;
};

const aggregateScoreboard = (records) => {
  const map = {};
  records.forEach((r) => {
    const f = r.fields;
    const key = (f["Salesperson Name"] || "Unknown").trim().toLowerCase();
    if (!map[key]) {
      map[key] = { salesperson: f["Salesperson Name"] || "Unknown", dealer: f["Dealer Name"] || "", ferris: 0, scag: 0, wright: 0, total: 0 };
    }
    const brand = (f["Brand"] || "").toLowerCase();
    if (brand === "ferris") map[key].ferris++;
    else if (brand === "scag") map[key].scag++;
    else if (brand === "wright") map[key].wright++;
    map[key].total = map[key].ferris + map[key].scag + map[key].wright;
  });
  return Object.values(map).sort((a, b) => b.total - a.total);
};

// ═══════════════════════════════════════════
// DEMO DATA
// ═══════════════════════════════════════════
const DEMO_SCOREBOARD = [
  { salesperson: "Mike Torres", dealer: "ProCut Equipment", ferris: 14, scag: 8, wright: 6, total: 28 },
  { salesperson: "Sarah Chen", dealer: "GreenLine Power", ferris: 10, scag: 9, wright: 5, total: 24 },
  { salesperson: "Jake Williams", dealer: "Blade Masters Inc.", ferris: 7, scag: 6, wright: 8, total: 21 },
  { salesperson: "Dana Price", dealer: "Tri-County Mowers", ferris: 9, scag: 4, wright: 5, total: 18 },
  { salesperson: "Carlos Ruiz", dealer: "Southwest Turf", ferris: 5, scag: 7, wright: 3, total: 15 },
  { salesperson: "Emily Tran", dealer: "Heritage Outdoor", ferris: 4, scag: 5, wright: 4, total: 13 },
  { salesperson: "Brett Lawson", dealer: "LawnPro Dealers", ferris: 3, scag: 4, wright: 4, total: 11 },
  { salesperson: "Nina Patel", dealer: "Elite Turf Group", ferris: 5, scag: 2, wright: 2, total: 9 },
  { salesperson: "Tom Herrera", dealer: "Valley Equipment", ferris: 2, scag: 3, wright: 2, total: 7 },
  { salesperson: "Lisa Monroe", dealer: "Capital Mowers", ferris: 1, scag: 3, wright: 2, total: 6 },
];

const isDemo = AIRTABLE_API_KEY === "YOUR_AIRTABLE_API_KEY";

// ═══════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════
const TrophyIcon = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);
const PlusIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const TrashIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
const StarIcon = ({ size = 16, fill = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={fill} strokeWidth="1">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);
const UploadIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);
const BeltIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="8" width="20" height="8" rx="2" /><circle cx="12" cy="12" r="2.5" /><line x1="6" y1="8" x2="6" y2="16" /><line x1="18" y1="8" x2="18" y2="16" />
  </svg>
);
const RefreshIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

// ═══════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════
const Y = { gold: "#FFD100", light: "#FFF176", dark: "#F9A825", muted: "#BFA930", bg: "#1A1A00" };

const RankBadge = ({ rank }) => {
  if (rank === 1) return (
    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #FFD100, #F9A825)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, color: "#000", boxShadow: "0 2px 10px rgba(255,209,0,0.5)" }}>1</div>
  );
  if (rank === 2) return (
    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #E0E0E0, #9E9E9E)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, color: "#333" }}>2</div>
  );
  if (rank === 3) return (
    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #CD7F32, #8B5E3C)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, color: "#fff" }}>3</div>
  );
  return (
    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#111", border: "1px solid #333", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: "#666" }}>{rank}</div>
  );
};

const QualifyBar = ({ count }) => {
  const pct = Math.min((count / 5) * 100, 100);
  const qualified = count >= 5;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: "#1a1a00", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: qualified ? "linear-gradient(90deg, #00C853, #69F0AE)" : "linear-gradient(90deg, #FFD100, #F9A825)", borderRadius: 3, transition: "width 0.6s ease" }} />
      </div>
      {qualified ? (
        <span style={{ fontSize: 11, fontWeight: 700, color: "#00C853", letterSpacing: 0.5 }}>QUALIFIED</span>
      ) : (
        <span style={{ fontSize: 11, fontWeight: 600, color: Y.gold }}>{count}/5</span>
      )}
    </div>
  );
};

const TabBtn = ({ active, children, onClick, icon }) => (
  <button onClick={onClick} style={{
    padding: "12px 22px", border: "none", cursor: "pointer",
    background: active ? "linear-gradient(135deg, #FFD100, #F9A825)" : "transparent",
    color: active ? "#000" : "#777",
    fontWeight: active ? 800 : 500, fontSize: 14,
    borderRadius: 10, display: "flex", alignItems: "center", gap: 8,
    transition: "all 0.25s ease", fontFamily: "inherit",
    ...(active ? { boxShadow: "0 4px 20px rgba(255,209,0,0.25)" } : {}),
  }}
    onMouseEnter={e => { if (!active) e.target.style.color = "#ccc"; }}
    onMouseLeave={e => { if (!active) e.target.style.color = "#777"; }}
  >
    {icon}{children}
  </button>
);

// ═══════════════════════════════════════════
// CSV PARSER
// ═══════════════════════════════════════════
const parseCSV = (text) => {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const vals = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === "," && !inQuotes) { vals.push(current.trim()); current = ""; continue; }
      current += ch;
    }
    vals.push(current.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
    return obj;
  });
};

// ═══════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════
export default function VanguardDashboard() {
  const [tab, setTab] = useState("scoreboard");
  const [scoreboard, setScoreboard] = useState(isDemo ? DEMO_SCOREBOARD : []);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  const [formData, setFormData] = useState({
    dealerName: "", dealerNumber: "", salesperson: "", email: "", brand: "",
    entries: [{ dateSold: "", serialNumber: "" }],
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [csvData, setCsvData] = useState([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const fileRef = useRef(null);

  const [sortCol, setSortCol] = useState("total");
  const [sortDir, setSortDir] = useState("desc");

  const refreshScoreboard = useCallback(async () => {
    if (isDemo) return;
    setLoading(true);
    try {
      const records = await fetchAllRecords();
      setScoreboard(aggregateScoreboard(records));
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Failed to fetch scoreboard:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isDemo) refreshScoreboard();
  }, [refreshScoreboard]);

  const sorted = [...scoreboard].sort((a, b) =>
    sortDir === "desc" ? b[sortCol] - a[sortCol] : a[sortCol] - b[sortCol]
  );
  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortCol(col); setSortDir("desc"); }
  };

  const addEntry = () => setFormData((p) => ({ ...p, entries: [...p.entries, { dateSold: "", serialNumber: "" }] }));
  const removeEntry = (i) => setFormData((p) => ({ ...p, entries: p.entries.filter((_, idx) => idx !== i) }));
  const updateEntry = (i, field, val) => setFormData((p) => {
    const e = [...p.entries]; e[i] = { ...e[i], [field]: val }; return { ...p, entries: e };
  });

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const records = formData.entries
        .filter((e) => e.serialNumber.trim())
        .map((e) => ({
          "Dealer Name": formData.dealerName,
          "Dealer #": formData.dealerNumber,
          "Salesperson Name": formData.salesperson,
          Email: formData.email,
          Brand: formData.brand,
          "Date Sold": e.dateSold,
          "Serial Number": e.serialNumber,
        }));
      if (!isDemo) await createRecords(records);
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setFormData({ dealerName: "", dealerNumber: "", salesperson: "", email: "", brand: "", entries: [{ dateSold: "", serialNumber: "" }] });
        if (!isDemo) refreshScoreboard();
      }, 3000);
    } catch (err) {
      alert("Error submitting: " + err.message);
    }
    setSubmitting(false);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    setUploadResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => setCsvData(parseCSV(ev.target.result));
    reader.readAsText(file);
  };

  const handleBulkUpload = async () => {
    if (!csvData.length) return;
    setUploading(true);
    try {
      const records = csvData.map((row) => {
        const find = (keys) => {
          for (const k of keys) {
            const match = Object.keys(row).find((rk) => rk.toLowerCase().replace(/[^a-z]/g, "") === k.toLowerCase().replace(/[^a-z]/g, ""));
            if (match && row[match]) return row[match];
          }
          return "";
        };
        return {
          "Dealer Name": find(["dealername", "dealer name", "dealer"]),
          "Dealer #": find(["dealernumber", "dealer #", "dealer#", "dealernum"]),
          "Salesperson Name": find(["salespersonname", "salesperson name", "salesperson", "rep", "repname"]),
          Email: find(["email", "emailaddress"]),
          Brand: find(["brand"]),
          "Date Sold": find(["datesold", "date sold", "date", "saledate"]),
          "Serial Number": find(["serialnumber", "serial number", "serial", "serial#"]),
        };
      });
      if (!isDemo) await createRecords(records);
      setUploadResult({ success: true, count: records.length });
      setCsvData([]);
      setCsvFileName("");
      if (!isDemo) refreshScoreboard();
    } catch (err) {
      setUploadResult({ success: false, error: err.message });
    }
    setUploading(false);
  };

  const inputStyle = {
    width: "100%", padding: "12px 16px", background: "#111", border: "1px solid #333",
    borderRadius: 8, color: "#e0e0e0", fontSize: 14, fontFamily: "inherit",
    outline: "none", transition: "border 0.2s", boxSizing: "border-box",
  };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: "#888", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6, display: "block" };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e0e0e0", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "fixed", inset: 0, opacity: 0.02, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", pointerEvents: "none" }} />
      <div style={{ position: "fixed", top: -200, right: -200, width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,209,0,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: -200, left: -100, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(249,168,37,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", padding: "0 20px" }}>
        {/* HEADER */}
        <header style={{ paddingTop: 32, paddingBottom: 16, textAlign: "center" }}>
          <div style={{ marginBottom: 16 }}>
            <img src="https://www.vanguardpower.com/content/dam/vanguard/na/en_us/images/header/vanguard-logo.svg" alt="Vanguard Commercial Power" style={{ height: 40, filter: "brightness(0) invert(1)" }} onError={(e) => { e.target.style.display = "none"; }} />
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,209,0,0.1)", border: "1px solid rgba(255,209,0,0.2)", borderRadius: 20, padding: "5px 14px", marginBottom: 14 }}>
            <StarIcon size={12} fill={Y.gold} />
            <span style={{ fontSize: 11, fontWeight: 700, color: Y.gold, letterSpacing: 1.5, textTransform: "uppercase" }}>2026 Season</span>
          </div>
          <h1 style={{ fontSize: "clamp(26px, 5vw, 44px)", fontWeight: 900, margin: 0, lineHeight: 1.1, background: "linear-gradient(135deg, #FFFFFF 20%, #FFD100 60%, #F9A825)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: -1 }}>
            Vanguard Power Sweepstakes
          </h1>
          <p style={{ color: "#666", fontSize: 15, marginTop: 8, fontWeight: 400 }}>Sell Vanguard-powered Ferris, Scag &amp; Wright — win big.</p>
          {isDemo && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,209,0,0.08)", border: "1px solid rgba(255,209,0,0.15)", borderRadius: 8, padding: "6px 14px", marginTop: 10 }}>
              <span style={{ fontSize: 12, color: Y.muted }}>Demo Mode — connect your Airtable API key to go live</span>
            </div>
          )}
        </header>

        {/* TABS */}
        <nav style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
          <TabBtn active={tab === "scoreboard"} onClick={() => setTab("scoreboard")} icon={<TrophyIcon size={16} />}>Scoreboard</TabBtn>
          <TabBtn active={tab === "register"} onClick={() => setTab("register")} icon={<PlusIcon size={16} />}>Register Sales</TabBtn>
          <TabBtn active={tab === "upload"} onClick={() => setTab("upload")} icon={<UploadIcon size={16} />}>Bulk Import</TabBtn>
          <TabBtn active={tab === "prizes"} onClick={() => setTab("prizes")} icon={<StarIcon size={16} fill="currentColor" />}>Rewards &amp; Rules</TabBtn>
        </nav>

        {/* ═══════════ SCOREBOARD ═══════════ */}
        {tab === "scoreboard" && (
          <div style={{ animation: "fadeUp 0.4s ease" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, marginBottom: 16 }}>
              {lastRefresh && <span style={{ fontSize: 12, color: "#555" }}>Updated {lastRefresh.toLocaleTimeString()}</span>}
              <button onClick={refreshScoreboard} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid #333", background: "#111", color: "#aaa", cursor: "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: 600, opacity: loading ? 0.5 : 1 }}>
                <RefreshIcon size={14} /> {loading ? "Loading..." : "Refresh"}
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
              {[
                { label: "Total Entries", value: scoreboard.reduce((s, r) => s + r.total, 0), accent: Y.gold },
                { label: "Qualified Reps", value: scoreboard.filter((r) => r.total >= 5).length, accent: "#00C853" },
                { label: "Active Dealers", value: new Set(scoreboard.map((r) => r.dealer)).size, accent: "#448AFF" },
              ].map((s, i) => (
                <div key={i} style={{ background: "#111", border: "1px solid #222", borderRadius: 14, padding: "20px 24px" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#666", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: s.accent }}>{s.value}</div>
                </div>
              ))}
            </div>

            <div style={{ background: "#111", border: "1px solid #222", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #222" }}>
                      {["Rank", "Salesperson", "Dealership"].map((h) => (
                        <th key={h} style={{ padding: "16px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#666", letterSpacing: 1, textTransform: "uppercase" }}>{h}</th>
                      ))}
                      {["ferris", "scag", "wright"].map((b) => (
                        <th key={b} onClick={() => handleSort(b)} style={{ padding: "16px 16px", textAlign: "center", fontSize: 11, fontWeight: 700, color: sortCol === b ? Y.gold : "#666", letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
                          {b} {sortCol === b && (sortDir === "desc" ? "▼" : "▲")}
                        </th>
                      ))}
                      <th onClick={() => handleSort("total")} style={{ padding: "16px 16px", textAlign: "center", fontSize: 11, fontWeight: 700, color: sortCol === "total" ? Y.gold : "#666", letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", userSelect: "none" }}>
                        Total {sortCol === "total" && (sortDir === "desc" ? "▼" : "▲")}
                      </th>
                      <th style={{ padding: "16px 16px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#666", letterSpacing: 1, textTransform: "uppercase" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((row, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #1a1a1a", transition: "background 0.15s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#151515")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                        <td style={{ padding: "14px 16px" }}><RankBadge rank={i + 1} /></td>
                        <td style={{ padding: "14px 16px", fontWeight: 700, fontSize: 14 }}>{row.salesperson}</td>
                        <td style={{ padding: "14px 16px", color: "#888", fontSize: 13 }}>{row.dealer}</td>
                        {["ferris", "scag", "wright"].map((b) => (
                          <td key={b} style={{ padding: "14px 16px", textAlign: "center", fontWeight: 600, fontSize: 14, fontVariantNumeric: "tabular-nums" }}>{row[b]}</td>
                        ))}
                        <td style={{ padding: "14px 16px", textAlign: "center" }}>
                          <span style={{ fontWeight: 800, fontSize: 18, color: Y.gold }}>{row.total}</span>
                        </td>
                        <td style={{ padding: "14px 16px" }}><QualifyBar count={row.total} /></td>
                      </tr>
                    ))}
                    {sorted.length === 0 && (
                      <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "#555" }}>No entries yet. Be the first to register!</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <p style={{ textAlign: "center", fontSize: 12, color: "#444", marginTop: 16 }}>
              {isDemo ? "Showing demo data. Connect Airtable to see live results." : "Live data from Airtable. Minimum 5 units to qualify."}
            </p>
          </div>
        )}

        {/* ═══════════ REGISTER SALES ═══════════ */}
        {tab === "register" && (
          <div style={{ maxWidth: 680, margin: "0 auto", animation: "fadeUp 0.4s ease" }}>
            {submitted ? (
              <div style={{ textAlign: "center", padding: "60px 20px", background: "#111", border: "1px solid #222", borderRadius: 16 }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #00C853, #69F0AE)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 28 }}>✓</div>
                <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Submission Received!</h2>
                <p style={{ color: "#888", marginTop: 8 }}>Your sales entries have been recorded and pushed to Airtable.</p>
              </div>
            ) : (
              <div style={{ background: "#111", border: "1px solid #222", borderRadius: 16, padding: "32px 28px" }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px", color: Y.gold }}>Register Unit Sales</h2>
                <p style={{ color: "#666", fontSize: 13, margin: "0 0 28px" }}>Submit your Vanguard-powered unit sales. Each serial number = 1 entry.</p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={labelStyle}>Dealer Name</label>
                    <input style={inputStyle} placeholder="e.g. ProCut Equipment" value={formData.dealerName} onChange={(e) => setFormData((p) => ({ ...p, dealerName: e.target.value }))} onFocus={(e) => (e.target.style.borderColor = Y.gold)} onBlur={(e) => (e.target.style.borderColor = "#333")} />
                  </div>
                  <div>
                    <label style={labelStyle}>Dealer #</label>
                    <input style={inputStyle} placeholder="e.g. D-10423" value={formData.dealerNumber} onChange={(e) => setFormData((p) => ({ ...p, dealerNumber: e.target.value }))} onFocus={(e) => (e.target.style.borderColor = Y.gold)} onBlur={(e) => (e.target.style.borderColor = "#333")} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={labelStyle}>Salesperson Name</label>
                    <input style={inputStyle} placeholder="Full name" value={formData.salesperson} onChange={(e) => setFormData((p) => ({ ...p, salesperson: e.target.value }))} onFocus={(e) => (e.target.style.borderColor = Y.gold)} onBlur={(e) => (e.target.style.borderColor = "#333")} />
                  </div>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input style={inputStyle} type="email" placeholder="you@dealer.com" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} onFocus={(e) => (e.target.style.borderColor = Y.gold)} onBlur={(e) => (e.target.style.borderColor = "#333")} />
                  </div>
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={labelStyle}>Brand</label>
                  <div style={{ display: "flex", gap: 10 }}>
                    {BRANDS.map((b) => (
                      <button key={b} onClick={() => setFormData((p) => ({ ...p, brand: b }))} style={{
                        flex: 1, padding: "10px 16px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                        fontWeight: 700, fontSize: 14, transition: "all 0.2s",
                        background: formData.brand === b ? "linear-gradient(135deg, #FFD100, #F9A825)" : "#0a0a0a",
                        color: formData.brand === b ? "#000" : "#666",
                        border: formData.brand === b ? "1px solid transparent" : "1px solid #333",
                      }}>
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ borderTop: "1px solid #222", paddingTop: 24, marginBottom: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Unit Sales</h3>
                      <p style={{ fontSize: 12, color: "#666", margin: "2px 0 0" }}>Add each unit with date and serial number</p>
                    </div>
                    <button onClick={addEntry} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, cursor: "pointer", background: "rgba(255,209,0,0.08)", border: "1px solid rgba(255,209,0,0.2)", color: Y.gold, fontWeight: 600, fontSize: 13, fontFamily: "inherit" }}>
                      <PlusIcon size={14} /> Add Unit
                    </button>
                  </div>
                  {formData.entries.map((entry, i) => (
                    <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "flex-end" }}>
                      <div style={{ flex: 1 }}>
                        {i === 0 && <label style={labelStyle}>Date Sold</label>}
                        <input type="date" style={{ ...inputStyle, colorScheme: "dark" }} value={entry.dateSold} onChange={(e) => updateEntry(i, "dateSold", e.target.value)} onFocus={(e) => (e.target.style.borderColor = Y.gold)} onBlur={(e) => (e.target.style.borderColor = "#333")} />
                      </div>
                      <div style={{ flex: 1.5 }}>
                        {i === 0 && <label style={labelStyle}>Serial Number</label>}
                        <input style={inputStyle} placeholder="e.g. VG-2026-XXXXX" value={entry.serialNumber} onChange={(e) => updateEntry(i, "serialNumber", e.target.value)} onFocus={(e) => (e.target.style.borderColor = Y.gold)} onBlur={(e) => (e.target.style.borderColor = "#333")} />
                      </div>
                      {formData.entries.length > 1 && (
                        <button onClick={() => removeEntry(i)} style={{ padding: 10, background: "rgba(244,67,54,0.08)", border: "1px solid rgba(244,67,54,0.2)", borderRadius: 8, cursor: "pointer", color: "#F44336", display: "flex", alignItems: "center" }}>
                          <TrashIcon />
                        </button>
                      )}
                    </div>
                  ))}
                  <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>{formData.entries.length} unit{formData.entries.length !== 1 ? "s" : ""} — each creates a separate Airtable record</div>
                </div>

                <div style={{ background: "rgba(255,209,0,0.04)", border: "1px solid rgba(255,209,0,0.12)", borderRadius: 10, padding: "14px 18px", marginBottom: 24 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 16, lineHeight: 1.4 }}>⚠️</span>
                    <p style={{ fontSize: 12, color: "#998a44", margin: 0, lineHeight: 1.6 }}>
                      <strong style={{ color: Y.gold }}>Disclaimer:</strong> Documentation for all sales, including invoices and equipment registrations, will be required in order to claim any reward. This documentation will be requested at the time of prize fulfillment. Submitting entries does not guarantee prize eligibility without proper verification.
                    </p>
                  </div>
                </div>

                <button onClick={handleSubmit} disabled={submitting} style={{
                  width: "100%", padding: "16px", border: "none", borderRadius: 10, cursor: "pointer",
                  background: "linear-gradient(135deg, #FFD100, #F9A825)", color: "#000",
                  fontSize: 16, fontWeight: 800, fontFamily: "inherit", letterSpacing: 0.5,
                  boxShadow: "0 4px 24px rgba(255,209,0,0.2)", opacity: submitting ? 0.6 : 1,
                }}>
                  {submitting ? "Submitting..." : "Submit Sales Entries"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══════════ BULK IMPORT ═══════════ */}
        {tab === "upload" && (
          <div style={{ maxWidth: 720, margin: "0 auto", animation: "fadeUp 0.4s ease" }}>
            <div style={{ background: "#111", border: "1px solid #222", borderRadius: 16, padding: "32px 28px" }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px", color: Y.gold }}>Bulk Import SPIFFs</h2>
              <p style={{ color: "#666", fontSize: 13, margin: "0 0 24px" }}>Upload a CSV of existing qualified records to push them into Airtable in batch.</p>

              <div style={{ background: "#0a0a0a", border: "1px solid #222", borderRadius: 10, padding: "16px 20px", marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Expected CSV Columns</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {["Dealer Name", "Dealer #", "Salesperson Name", "Email", "Brand", "Date Sold", "Serial Number"].map((col) => (
                    <span key={col} style={{ padding: "4px 10px", background: "rgba(255,209,0,0.06)", border: "1px solid rgba(255,209,0,0.12)", borderRadius: 6, fontSize: 12, fontWeight: 600, color: Y.muted }}>{col}</span>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: "#555", marginTop: 10, marginBottom: 0 }}>Column headers are matched flexibly — "Salesperson Name", "salesperson", or "Rep" all work. One row per serial number.</p>
              </div>

              <input ref={fileRef} type="file" accept=".csv" onChange={handleFileSelect} style={{ display: "none" }} />
              <button onClick={() => fileRef.current?.click()} style={{
                width: "100%", padding: "40px 20px", border: "2px dashed #333", borderRadius: 12, cursor: "pointer",
                background: "transparent", color: "#888", fontSize: 14, fontFamily: "inherit", fontWeight: 600,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 8, transition: "all 0.2s",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = Y.gold; e.currentTarget.style.color = Y.gold; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#333"; e.currentTarget.style.color = "#888"; }}>
                <UploadIcon size={24} />
                {csvFileName ? csvFileName : "Click to select CSV file"}
              </button>

              {csvData.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Preview ({csvData.length} records)</h3>
                    <button onClick={() => { setCsvData([]); setCsvFileName(""); }} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #333", background: "transparent", color: "#888", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>Clear</button>
                  </div>
                  <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #222" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: "#1a1a1a" }}>
                          {Object.keys(csvData[0]).map((h) => (
                            <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvData.slice(0, 8).map((row, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid #1a1a1a" }}>
                            {Object.values(row).map((v, j) => (
                              <td key={j} style={{ padding: "8px 12px", color: "#aaa", whiteSpace: "nowrap" }}>{v}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {csvData.length > 8 && (
                      <div style={{ padding: "8px 12px", textAlign: "center", color: "#555", fontSize: 12, borderTop: "1px solid #1a1a1a" }}>...and {csvData.length - 8} more rows</div>
                    )}
                  </div>
                  <button onClick={handleBulkUpload} disabled={uploading} style={{
                    width: "100%", padding: "16px", border: "none", borderRadius: 10, cursor: "pointer",
                    background: "linear-gradient(135deg, #FFD100, #F9A825)", color: "#000",
                    fontSize: 16, fontWeight: 800, fontFamily: "inherit", marginTop: 20,
                    boxShadow: "0 4px 24px rgba(255,209,0,0.2)", opacity: uploading ? 0.6 : 1,
                  }}>
                    {uploading ? `Uploading ${csvData.length} records...` : `Push ${csvData.length} Records to Airtable`}
                  </button>
                </div>
              )}

              {uploadResult && (
                <div style={{ marginTop: 20, padding: "16px 20px", borderRadius: 10, background: uploadResult.success ? "rgba(0,200,83,0.08)" : "rgba(244,67,54,0.08)", border: `1px solid ${uploadResult.success ? "rgba(0,200,83,0.2)" : "rgba(244,67,54,0.2)"}` }}>
                  {uploadResult.success ? (
                    <p style={{ margin: 0, color: "#00C853", fontWeight: 600 }}>Successfully uploaded {uploadResult.count} records to Airtable!</p>
                  ) : (
                    <p style={{ margin: 0, color: "#F44336", fontWeight: 600 }}>Upload failed: {uploadResult.error}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════ REWARDS & RULES ═══════════ */}
        {tab === "prizes" && (
          <div style={{ animation: "fadeUp 0.4s ease" }}>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>Total Rewards</div>
              <div style={{ fontSize: "clamp(36px, 6vw, 56px)", fontWeight: 900, background: "linear-gradient(135deg, #FFD100, #F9A825, #BFA930)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>$30,000</div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                <TrophyIcon size={20} color={Y.gold} /> Sweepstakes Raffle — Per Brand
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
                {BRANDS.map((brand) => (
                  <div key={brand} style={{ background: "#111", border: "1px solid #222", borderRadius: 14, padding: "24px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>{brand}</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: Y.gold }}>$7,500</div>
                    <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>10 winners × $750 each</div>
                    <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>Live raffle drawing</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: "#111", border: "1px solid #222", borderRadius: 16, padding: "28px 24px", marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 6px", display: "flex", alignItems: "center", gap: 10 }}>
                <StarIcon size={18} fill={Y.gold} /> Brand Champion Awards
              </h3>
              <p style={{ color: "#666", fontSize: 13, margin: "0 0 20px" }}>Top sales rep per brand at year end — 3 winners total</p>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #FFD100, #F9A825)", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 20 }}>💰</span></div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 20, color: Y.gold }}>$1,500</div>
                    <div style={{ fontSize: 11, color: "#666" }}>Cash per winner</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #444, #222)", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 20 }}>🏆</span></div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Commemorative Award</div>
                    <div style={{ fontSize: 11, color: "#666" }}>Plaque or Championship Ring</div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ background: "linear-gradient(135deg, #141400, #1a1a00, #0a0a0a)", border: "1px solid #2a2a10", borderRadius: 16, padding: "32px 28px", marginBottom: 24, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,209,0,0.08) 0%, transparent 70%)" }} />
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,209,0,0.08)", border: "1px solid rgba(255,209,0,0.15)", borderRadius: 20, padding: "4px 12px", marginBottom: 14 }}>
                <BeltIcon size={14} />
                <span style={{ fontSize: 11, fontWeight: 700, color: Y.gold, letterSpacing: 1.2, textTransform: "uppercase" }}>Grand Prize</span>
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 4px", color: Y.gold }}>2026 Pace Vanguard Power Champion</h3>
              <p style={{ color: "#776a30", fontSize: 13, margin: "0 0 20px" }}>Highest total Vanguard unit sales across all brands</p>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                {[
                  { icon: "💵", label: "Cash Award", value: "$3,000" },
                  { icon: "🥊", label: "Custom Championship Belt", value: "Exclusive" },
                  { icon: "👑", label: "Official Title", value: "Power Champion" },
                ].map((p, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{p.icon}</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: Y.gold }}>{p.value}</div>
                      <div style={{ fontSize: 11, color: "#665" }}>{p.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: "#111", border: "1px solid #222", borderRadius: 16, padding: "28px 24px", marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 20px" }}>How It Works</h3>
              <div style={{ display: "grid", gap: 16 }}>
                {[
                  { step: "01", title: "Sell 5+ Vanguard-powered units", desc: "Any combo of Ferris, Scag, and Wright mowers qualifies you." },
                  { step: "02", title: "Every unit = 1 entry", desc: "No cap. 12 units sold = 12 entries. More sales, better odds." },
                  { step: "03", title: "Submit via this portal", desc: "Enter serial numbers and sale dates. Each record is tracked separately." },
                  { step: "04", title: "Win in the live raffle", desc: "10 winners per brand at $750 each. Brand Champions and Overall Champion named at year end." },
                ].map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <div style={{ minWidth: 44, height: 44, borderRadius: 12, background: "rgba(255,209,0,0.08)", border: "1px solid rgba(255,209,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 14, color: Y.gold }}>{s.step}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{s.title}</div>
                      <div style={{ fontSize: 13, color: "#666", lineHeight: 1.5 }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: "#111", border: "1px solid #222", borderRadius: 16, padding: "28px 24px", marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 16px" }}>Eligibility &amp; Verification</h3>
              <div style={{ fontSize: 13, color: "#888", lineHeight: 1.8 }}>Open to all dealership sales professionals selling Vanguard-powered Ferris, Scag, and Wright units. Minimum of 5 units sold to qualify for the sweepstakes drawing. Sales must be verified through completed SPIFF forms.</div>
              <div style={{ background: "rgba(255,209,0,0.04)", border: "1px solid rgba(255,209,0,0.12)", borderRadius: 10, padding: "14px 18px", marginTop: 16 }}>
                <p style={{ fontSize: 12, color: "#998a44", margin: 0, lineHeight: 1.6 }}>
                  <strong style={{ color: Y.gold }}>Important:</strong> Documentation for all sales — including invoices and equipment registrations — will be required in order to claim any reward. This documentation will be requested at the time of prize fulfillment.
                </p>
              </div>
            </div>

            <div style={{ background: "#111", border: "1px solid #222", borderRadius: 16, padding: "28px 24px", marginBottom: 40 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 16px" }}>Rewards Breakdown</h3>
              {[
                { label: "Sweepstakes Raffle (3 brands × $7,500)", amount: "$22,500", pct: 75 },
                { label: "Brand Champions (3 × $1,500)", amount: "$4,500", pct: 15 },
                { label: "Overall Champion", amount: "$3,000", pct: 10 },
              ].map((item, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: "#888" }}>{item.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: Y.gold }}>{item.amount}</span>
                  </div>
                  <div style={{ height: 6, background: "#1a1a1a", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${item.pct}%`, height: "100%", background: "linear-gradient(90deg, #FFD100, #F9A825)", borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <footer style={{ textAlign: "center", padding: "30px 0 40px", borderTop: "1px solid #1a1a1a" }}>
          <div style={{ fontSize: 12, color: "#444" }}>2026 Vanguard Power Sweepstakes — Powered by Pace</div>
        </footer>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,500;0,9..40,700;0,9..40,800;0,9..40,900;1,9..40,400&display=swap');
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
        input::placeholder { color: #555; }
        ::-webkit-scrollbar { height: 6px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
      `}</style>
    </div>
  );
}
