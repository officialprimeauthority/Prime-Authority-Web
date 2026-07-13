import { useEffect, useState, useCallback } from "react";
import { ref, onValue, update, remove, push, set } from "firebase/database";
import { database, auth } from "@/lib/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { useLocation } from "wouter";

const ADMIN_EMAIL = "admin@primeauthority.com";

interface Entry { id: string; [key: string]: any; }

interface LineupEntry {
  id: string;
  teamName: string;
  logo?: string;
  serialNumber: string;
  playerIgn: string;
  playerUid: string;
  role: string;
  joiningDate: string;
  createdAt?: string;
}

type Tab =
  | "dashboard" | "hero" | "explore" | "benefits" | "contact"
  | "tournament" | "scrims" | "about" | "team" | "upcoming"
  | "journey" | "gallery" | "notifications" | "settings" | "profile";

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 18, color = "currentColor" }: { d: string; size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const IGrid     = () => <Icon d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />;
const IMonitor  = () => <Icon d="M2 3h20v13H2zM8 21h8M12 16v5" />;
const ICompass  = () => <Icon d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm4.24-1.76L14 10l-4 2 2-4z" />;
const IDiamond  = () => <Icon d="M12 2l9 9-9 11L3 11z" />;
const ITrophy   = () => <Icon d="M6 3H3v5a6 6 0 0 0 6 6h1v2H8l-2 2h12l-2-2h-2v-2h1a6 6 0 0 0 6-6V3h-3M3 3v5M21 3v5" />;
const ISwords   = () => <Icon d="M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6-6 2 2-3 3 2 2-2 2-2-2-2 2-1-3M3 21l7-7" />;
const IInfo     = () => <Icon d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zM12 16v-4M12 8h.01" />;
const IUsers    = () => <Icon d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 8A4 4 0 0 0 9 7M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />;
const IFlag     = () => <Icon d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" />;
const IImage    = () => <Icon d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />;
const IBell     = () => <Icon d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />;
const ISettings = () => <Icon d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />;
const IUser     = () => <Icon d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />;
const ILogout   = () => <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />;
const IMenu     = () => <Icon d="M3 12h18M3 6h18M3 18h18" />;
const ISearch   = () => <Icon d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />;
const IChevron  = () => <Icon d="M6 9l6 6 6-6" />;
const IEye      = () => <Icon d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />;

// ─── PA Logo SVG ──────────────────────────────────────────────────────────────
const PALogo = ({ size = 40 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <polygon points="50,5 95,28 95,72 50,95 5,72 5,28" fill="rgba(220,38,38,0.15)" stroke="#dc2626" strokeWidth="2" />
    <text x="50" y="62" textAnchor="middle" fill="#dc2626" fontSize="38" fontWeight="900" fontFamily="Arial">PA</text>
  </svg>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const INPUT: React.CSSProperties = {
  width: "100%", padding: "10px 14px", background: "#0f0f1a", border: "1px solid #2a2a3a",
  borderRadius: 8, color: "#fff", fontSize: 13, fontFamily: "Poppins, sans-serif",
  outline: "none", boxSizing: "border-box", marginBottom: 10,
};
const BTN: React.CSSProperties = {
  padding: "8px 16px", border: "none", borderRadius: 7, cursor: "pointer",
  fontWeight: 700, fontSize: 12, fontFamily: "Poppins, sans-serif",
};
const CARD: React.CSSProperties = {
  background: "#0f0f1a", border: "1px solid #1e1e2e", borderRadius: 12, padding: 20, marginBottom: 16,
};

function Badge({ status }: { status: string }) {
  const c = status === "Accepted" ? "#22c55e" : status === "Rejected" ? "#ef4444" : "#f59e0b";
  const bg = status === "Accepted" ? "rgba(34,197,94,0.15)" : status === "Rejected" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)";
  return (
    <span style={{ background: bg, color: c, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
      {status || "Pending"}
    </span>
  );
}

function getCaptainDisplay(entry: Entry) {
  return entry.captainIGN || entry.captainName || entry.managerIgn || entry.ign || entry.playerIgn || entry.name || "—";
}

function getRegisteredOn(entry: Entry) {
  return entry.createdAt || entry.registeredAt || entry.joinedAt || "—";
}

const readFileAsDataURL = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(file);
});

// ─── Entry Detail Modal ───────────────────────────────────────────────────────
function EntryModal({ entry, onClose, onAccept, onReject, onDelete, onSendNotif }: {
  entry: Entry; onClose: () => void;
  onAccept: () => void; onReject: () => void; onDelete: () => void;
  onSendNotif: (msg: string) => Promise<void>;
}) {
  const [notifMsg, setNotifMsg] = useState("");
  const [sending, setSending] = useState(false);
  const skip = ["id", "teamLogo", "userId", "status"];
  const keys = Object.keys(entry).filter(k => !skip.includes(k));

  const handleSend = async () => {
    if (!notifMsg.trim()) return;
    setSending(true);
    await onSendNotif(notifMsg.trim());
    setNotifMsg(""); setSending(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#0f0f1a", border: "1px solid #2a2a3a", borderRadius: 16, width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto", padding: 28 }}>
        {/* Modal header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h2 style={{ color: "#dc2626", fontWeight: 900, fontSize: 18, marginBottom: 6 }}>
              {entry.teamName || entry.managerIgn || entry.ign || "Entry Details"}
            </h2>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <Badge status={entry.status || "Pending"} />
              {entry.userEmail && <span style={{ color: "#666", fontSize: 12 }}>{entry.userEmail}</span>}
            </div>
          </div>
          {entry.teamLogo && <img src={entry.teamLogo} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover", border: "1px solid #2a2a3a" }} />}
        </div>

        {/* Fields grid */}
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", marginBottom: 20 }}>
          {keys.map(k => entry[k] && (
            <div key={k} style={{ background: "#0a0a14", borderRadius: 8, padding: "10px 14px" }}>
              <p style={{ color: "#555", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>{k}</p>
              <p style={{ color: "#ddd", fontSize: 13, wordBreak: "break-all" }}>{String(entry[k])}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          <button onClick={() => { onAccept(); onClose(); }} style={{ ...BTN, background: "#16a34a", color: "#fff" }}>✅ Accept</button>
          <button onClick={() => { onReject(); onClose(); }} style={{ ...BTN, background: "#dc2626", color: "#fff" }}>❌ Reject</button>
          <button onClick={() => { onDelete(); onClose(); }} style={{ ...BTN, background: "#374151", color: "#fff" }}>🗑️ Delete</button>
        </div>

        {/* Personal notification */}
        <div style={{ background: "#0a0a14", border: "1px solid #1e3a5f", borderRadius: 10, padding: 16 }}>
          <p style={{ color: "#60a5fa", fontSize: 13, fontWeight: 600, marginBottom: 10 }}>📩 Send Personal Notification</p>
          <textarea value={notifMsg} onChange={e => setNotifMsg(e.target.value)}
            placeholder="Type a message for this user..." rows={3}
            style={{ ...INPUT, resize: "vertical", border: "1px solid #1e3a5f", marginBottom: 10 }} />
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleSend} disabled={sending || !notifMsg.trim()}
              style={{ ...BTN, background: "#3b82f6", color: "#fff", opacity: (sending || !notifMsg.trim()) ? 0.6 : 1 }}>
              {sending ? "Sending…" : "📤 Send"}
            </button>
            <button onClick={onClose} style={{ ...BTN, background: "transparent", border: "1px solid #2a2a3a", color: "#888" }}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Table (for dashboard & full tabs) ───────────────────────────────────────
function EntryTable({ entries, onView }: { entries: Entry[]; onView: (e: Entry) => void }) {
  if (!entries.length) return <p style={{ color: "#444", fontSize: 13, padding: "20px 0" }}>No entries found.</p>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #1e1e2e" }}>
            {["#", "Team Name", "Captain / IGL", "Registered On", "Status", "Action"].map(h => (
              <th key={h} style={{ padding: "10px 14px", color: "#555", fontWeight: 600, textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => {
            const registeredOn = getRegisteredOn(e);
            return (
              <tr key={e.id} style={{ borderBottom: "1px solid #13131f", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                <td style={{ padding: "10px 14px", color: "#555" }}>{String(i + 1).padStart(2, "0")}</td>
                <td style={{ padding: "10px 14px", color: "#e0e0e0", fontWeight: 600 }}>{e.teamName || e.managerIgn || e.ign || "—"}</td>
                <td style={{ padding: "10px 14px", color: "#aaa" }}>{getCaptainDisplay(e)}</td>
                <td style={{ padding: "10px 14px", color: "#666", whiteSpace: "nowrap" }}>
                  {registeredOn !== "—" ? new Date(registeredOn).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                </td>
                <td style={{ padding: "10px 14px" }}><Badge status={e.status || "Pending"} /></td>
                <td style={{ padding: "10px 14px" }}>
                  <button onClick={() => onView(e)} style={{ ...BTN, background: "#dc2626", color: "#fff", padding: "6px 14px" }}>View</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Placeholder tab ──────────────────────────────────────────────────────────
function ComingSoon({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 320, gap: 16 }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626" }}>
        {icon}
      </div>
      <h2 style={{ color: "#fff", fontWeight: 800, fontSize: 20 }}>{title}</h2>
      <p style={{ color: "#555", fontSize: 14 }}>This section is coming soon.</p>
      <span style={{ background: "rgba(220,38,38,0.1)", color: "#dc2626", padding: "6px 18px", borderRadius: 20, fontSize: 12, fontWeight: 700, border: "1px solid rgba(220,38,38,0.3)" }}>COMING SOON</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [, navigate]    = useLocation();
  const [tab, setTab]   = useState<Tab>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [searchQ, setSearchQ]     = useState("");

  const [joins, setJoins]             = useState<Entry[]>([]);
  const [tournaments, setTournaments] = useState<Entry[]>([]);
  const [scrims, setScrims]           = useState<Entry[]>([]);
  const [allUsers, setAllUsers]       = useState<string[]>([]);
  const [tournamentOn, setTournamentOn] = useState(false);
  const [scrimOn, setScrimOn]           = useState(false);
  const [joinOn, setJoinOn]             = useState(false);
  const [tournamentBannerOn, setTournamentBannerOn] = useState(false);
  const [scrimBannerOn, setScrimBannerOn] = useState(false);
  const [tournamentBannerImage, setTournamentBannerImage] = useState("");
  const [scrimBannerImage, setScrimBannerImage] = useState("");
  const [upcomingTournamentBannerOn, setUpcomingTournamentBannerOn] = useState(false);
  const [upcomingTournamentBannerImage, setUpcomingTournamentBannerImage] = useState("");
  const [notifBadge, setNotifBadge]     = useState(0);
  const [authChecked, setAuthChecked]   = useState(false);
  const [filterStatus, setFilterStatus] = useState("All");
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [bcSending, setBcSending]       = useState(false);
  const [viewEntry, setViewEntry]       = useState<Entry | null>(null);
  const [heroTitle, setHeroTitle]       = useState("PRIME AUTHORITY");
  const [heroSubtitle, setHeroSubtitle] = useState("Where Champions Are Made.");
  const [heroDescription, setHeroDescription] = useState("India's Professional Free Fire Esports Organization");
  const [heroButtonText, setHeroButtonText] = useState("Join Organization");
  const [heroButtonLink, setHeroButtonLink] = useState("join.html");
  const [heroSaving, setHeroSaving]     = useState(false);
  const [lineupEntries, setLineupEntries] = useState<LineupEntry[]>([]);
  const [showLineupForm, setShowLineupForm] = useState(false);
  const [lineupSaving, setLineupSaving] = useState(false);
  const [lineupDeleting, setLineupDeleting] = useState(false);
  const [lineupForm, setLineupForm] = useState({
    teamName: "",
    serialNumber: "",
    playerIgn: "",
    playerUid: "",
    role: "",
    joiningDate: "",
    logo: "",
  });
  const [editingLineupId, setEditingLineupId] = useState<string | null>(null);
  const [currentDate] = useState(() => {
    const d = new Date();
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) +
      " | " + d.toLocaleDateString("en-IN", { weekday: "long" });
  });

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    let redirectTimer: number | undefined;

    const unsubscribe = onAuthStateChanged(auth, user => {
      if (!isMounted) return;

      if (user?.email === ADMIN_EMAIL) {
        if (redirectTimer) window.clearTimeout(redirectTimer);
        setAuthChecked(true);
        return;
      }

      if (user) {
        if (redirectTimer) window.clearTimeout(redirectTimer);
        signOut(auth).finally(() => {
          if (isMounted) navigate("/admin");
        });
        return;
      }

      if (redirectTimer) window.clearTimeout(redirectTimer);
      redirectTimer = window.setTimeout(() => {
        if (isMounted && !auth.currentUser) {
          navigate("/admin");
        }
      }, 300);
    });

    return () => {
      isMounted = false;
      if (redirectTimer) window.clearTimeout(redirectTimer);
      unsubscribe();
    };
  }, [navigate]);

  // ── Firebase listeners ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!authChecked) return;
    const collect = (snap: any, setter: (a: Entry[]) => void) => {
      if (!snap.exists()) { setter([]); return; }
      const arr = Object.entries(snap.val())
        .filter(([, v]) => v !== null && typeof v === "object")
        .map(([id, v]) => ({ id, ...(v as Record<string, unknown>) }))
        .reverse() as Entry[];
      setter(arr);
      const uids = [...new Set(arr.map((v: any) => v.userId).filter(Boolean))] as string[];
      setAllUsers(prev => [...new Set([...prev, ...uids])]);
    };
    const unsubs = [
      onValue(ref(database, "applications"),  s => collect(s, setJoins)),
      onValue(ref(database, "tournaments"),   s => collect(s, setTournaments)),
      onValue(ref(database, "scrims"),        s => collect(s, setScrims)),
      onValue(ref(database, "users"),         s => {
        if (!s.exists()) { setAllUsers([]); return; }
        const uids = Object.entries(s.val() || {})
          .map(([id]) => id as string)
          .filter(Boolean);
        setAllUsers(uids);
      }),
      onValue(ref(database, "settings/tournamentFormEnabled"), s => setTournamentOn(s.val() === true)),
      onValue(ref(database, "settings/scrimFormEnabled"),      s => setScrimOn(s.val() === true)),
      onValue(ref(database, "settings/joinFormEnabled"),       s => setJoinOn(s.val() === true)),
      onValue(ref(database, "settings/tournamentBannerEnabled"), s => setTournamentBannerOn(s.val() === true)),
      onValue(ref(database, "settings/scrimBannerEnabled"),      s => setScrimBannerOn(s.val() === true)),
      onValue(ref(database, "settings/joinBannerEnabled"),       s => setJoinBannerOn(s.val() === true)),
      onValue(ref(database, "settings/tournamentBannerImage"), s => setTournamentBannerImage(s.val() || "")),
      onValue(ref(database, "settings/scrimBannerImage"),      s => setScrimBannerImage(s.val() || "")),
      onValue(ref(database, "settings/joinBannerImage"),        s => setJoinBannerImage(s.val() || "")),
      onValue(ref(database, "settings/upcomingTournamentBannerEnabled"), s => setUpcomingTournamentBannerOn(s.val() === true)),
      onValue(ref(database, "settings/upcomingTournamentBannerImage"), s => setUpcomingTournamentBannerImage(s.val() || "")),
      onValue(ref(database, "hero"), s => {
        const data = s.val() || {};
        setHeroTitle(data.title || "PRIME AUTHORITY");
        setHeroSubtitle(data.subtitle || "Where Champions Are Made.");
        setHeroDescription(data.description || "India's Professional Free Fire Esports Organization");
        setHeroButtonText(data.buttonText || "Join Organization");
        setHeroButtonLink(data.buttonLink || "join.html");
      }),
      onValue(ref(database, "lineup"), s => {
        if (!s.exists()) { setLineupEntries([]); return; }
        const arr = Object.entries(s.val() || {})
          .map(([id, value]) => ({ id, ...(value as Record<string, unknown>) }))
          .reverse() as LineupEntry[];
        setLineupEntries(arr);
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, [authChecked]);

  // badge = pending items
  useEffect(() => {
    const p = [...joins, ...tournaments, ...scrims].filter(e => !e.status || e.status === "Pending").length;
    setNotifBadge(p);
  }, [joins, tournaments, scrims]);

  const getNotificationTargetPaths = useCallback((entry: Partial<Entry>) => {
    const paths: string[] = [];
    if (entry.userId) paths.push(entry.userId);
    const emailValue = String(entry.userEmail || entry.emailAddress || "").trim().toLowerCase();
    const sanitized = emailValue.replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
    if (sanitized) paths.push(sanitized);
    return [...new Set(paths.filter(Boolean))];
  }, []);

  const sendNotificationToRecipient = useCallback(async (entry: Partial<Entry>, payload: Record<string, unknown>) => {
    const paths = getNotificationTargetPaths(entry);
    if (!paths.length) return;
    await Promise.all(paths.map(path => push(ref(database, `notifications/${path}`), payload)));
  }, [getNotificationTargetPaths]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const updateStatus = useCallback((path: string, id: string, status: string, entry: Entry) => {
    update(ref(database, `${path}/${id}`), { status });
    if (entry.userId || entry.userEmail || entry.emailAddress) {
      sendNotificationToRecipient(entry, {
        message: `Your ${path === "applications" ? "join application" : path === "tournaments" ? "tournament registration" : "scrim booking"} has been ${status}!`,
        status, type: path === "applications" ? "join" : path === "tournaments" ? "tournament" : "scrim",
        createdAt: new Date().toISOString(),
      });
    }
  }, [sendNotificationToRecipient]);

  const deleteEntry = useCallback((path: string, id: string) => {
    if (confirm("Delete this entry?")) remove(ref(database, `${path}/${id}`));
  }, []);

  const sendPersonalNotif = useCallback(async (entry: Entry, msg: string) => {
    if (!entry.userId && !entry.userEmail && !entry.emailAddress) { alert("No user ID or email found for this entry."); return; }
    try {
      await sendNotificationToRecipient(entry, {
        message: `📩 Admin: ${msg}`, status: "Info", type: "admin_message",
        createdAt: new Date().toISOString(),
      });
      alert("✅ Notification sent!");
    } catch (err: any) {
      alert("Error sending notification: " + err.message);
    }
  }, [sendNotificationToRecipient]);

  const sendBroadcast = useCallback(async () => {
    if (!broadcastMsg.trim()) { alert("Enter a message."); return; }
    if (!allUsers.length) { alert("No users found."); return; }
    if (!confirm(`Send to ${allUsers.length} user(s)?`)) return;
    setBcSending(true);
    await Promise.all(allUsers.map(uid => push(ref(database, `notifications/${uid}`), {
      message: `📢 ${broadcastMsg.trim()}`, status: "Info", type: "broadcast",
      createdAt: new Date().toISOString(),
    })));
    setBroadcastMsg(""); setBcSending(false);
    alert(`✅ Sent to ${allUsers.length} users!`);
  }, [broadcastMsg, allUsers]);

  const filtered = (arr: Entry[]) => {
    let r = filterStatus === "All" ? arr : arr.filter(e => (e.status || "Pending") === filterStatus);
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      r = r.filter(e => JSON.stringify(e).toLowerCase().includes(q));
    }
    return r;
  };

  if (!authChecked) return (
    <div style={{ minHeight: "100vh", background: "#080810", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 44, height: 44, border: "3px solid #dc2626", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  // ── Sidebar items ────────────────────────────────────────────────────────────
  const NAV: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "dashboard",    label: "Dashboard",              icon: <IGrid /> },
    { key: "hero",         label: "Hero Section",           icon: <IMonitor /> },
    { key: "benefits",     label: "Organization Benefits",  icon: <IDiamond /> },
    { key: "contact",      label: "Contact Requests",       icon: <IInfo /> },
    { key: "upcoming",     label: "Upcoming Tournament",    icon: <IFlag /> },
    { key: "tournament",   label: "Tournament Registration",icon: <ITrophy /> },
    { key: "scrims",       label: "Scrims Registration",    icon: <ISwords /> },
    { key: "team",         label: "Our Lineup",             icon: <IUsers /> },
    { key: "journey",      label: "Journey",                icon: <IFlag /> },
    { key: "notifications",label: "Notifications",          icon: <IBell /> },
    { key: "settings",     label: "Website Settings",       icon: <ISettings /> },
    { key: "profile",      label: "Admin Profile",          icon: <IUser /> },
  ];

  const SW = collapsed ? 64 : 220;

  const handleHeroSave = async () => {
    setHeroSaving(true);
    await set(ref(database, "hero"), {
      title: heroTitle.trim() || "PRIME AUTHORITY",
      subtitle: heroSubtitle.trim() || "Where Champions Are Made.",
      description: heroDescription.trim() || "India's Professional Free Fire Esports Organization",
      buttonText: heroButtonText.trim() || "Join Organization",
      buttonLink: heroButtonLink.trim() || "join.html",
    });
    setHeroSaving(false);
    alert("Hero section updated successfully.");
  };

  const resetLineupForm = () => {
    setLineupForm({ teamName: "", serialNumber: "", playerIgn: "", playerUid: "", role: "", joiningDate: "", logo: "" });
    setEditingLineupId(null);
    setShowLineupForm(false);
  };

  const handleLineupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lineupForm.teamName.trim() || !lineupForm.playerIgn.trim() || !lineupForm.playerUid.trim() || !lineupForm.role.trim() || !lineupForm.serialNumber.trim()) {
      alert("Please fill all required fields.");
      return;
    }
    setLineupSaving(true);
    const payload = {
      teamName: lineupForm.teamName.trim(),
      serialNumber: lineupForm.serialNumber.trim(),
      playerIgn: lineupForm.playerIgn.trim(),
      playerUid: lineupForm.playerUid.trim(),
      role: lineupForm.role.trim(),
      joiningDate: lineupForm.joiningDate.trim(),
      logo: lineupForm.logo,
      createdAt: new Date().toISOString(),
    };
    if (editingLineupId) {
      await update(ref(database, `lineup/${editingLineupId}`), payload);
    } else {
      await push(ref(database, "lineup"), payload);
    }
    resetLineupForm();
    setLineupSaving(false);
    alert(editingLineupId ? "Lineup entry updated." : "Lineup entry created.");
  };

  const deleteAllLineupEntries = useCallback(async () => {
    if (!lineupEntries.length) {
      alert('No lineup entries to delete.');
      return;
    }

    if (!confirm(`Delete all ${lineupEntries.length} lineup entries? This cannot be undone.`)) return;

    try {
      setLineupDeleting(true);
      await Promise.all(lineupEntries.map(entry => remove(ref(database, `lineup/${entry.id}`))));
      setLineupEntries([]);
      setLineupDeleting(false);
      alert('✅ All lineup entries deleted.');
    } catch (err: any) {
      setLineupDeleting(false);
      alert('Failed to delete all lineup entries: ' + err.message);
    }
  }, [lineupEntries]);

  const handleLineupFile = async (file?: File) => {
    if (!file) return;
    const logo = await readFileAsDataURL(file);
    setLineupForm(prev => ({ ...prev, logo }));
  };

  const startEditLineup = (entry: LineupEntry) => {
    setLineupForm({
      teamName: entry.teamName || "",
      serialNumber: entry.serialNumber || "",
      playerIgn: entry.playerIgn || "",
      playerUid: entry.playerUid || "",
      role: entry.role || "",
      joiningDate: entry.joiningDate || "",
      logo: entry.logo || "",
    });
    setEditingLineupId(entry.id);
    setShowLineupForm(true);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080810", display: "flex", fontFamily: "Poppins, sans-serif", color: "#fff" }}>
      {/* ── SIDEBAR ─────────────────────────────────────────────────────────── */}
      <aside style={{ width: SW, background: "#0a0a14", borderRight: "1px solid #13131f", display: "flex", flexDirection: "column", flexShrink: 0, transition: "width 0.25s", overflowX: "hidden", position: "relative", zIndex: 100 }}>
        {/* Logo */}
        <div style={{ padding: collapsed ? "18px 0" : "18px 20px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid #13131f", justifyContent: collapsed ? "center" : "space-between" }}>
          {!collapsed && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <PALogo size={36} />
              <div>
                <p style={{ color: "#dc2626", fontWeight: 900, fontSize: 13, letterSpacing: 1, lineHeight: 1.2 }}>PRIME</p>
                <p style={{ color: "#dc2626", fontWeight: 900, fontSize: 13, letterSpacing: 1, lineHeight: 1.2 }}>AUTHORITY</p>
              </div>
            </div>
          )}
          {collapsed && <PALogo size={32} />}
          {!collapsed && (
            <button onClick={() => setCollapsed(true)} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", padding: 4, display: "flex" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" /></svg>
            </button>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "12px 0", overflowY: "auto" }}>
          {NAV.map(item => {
            const active = tab === item.key;
            return (
              <button key={item.key} onClick={() => setTab(item.key)} title={collapsed ? item.label : undefined}
                style={{
                  display: "flex", alignItems: "center", gap: 12, width: "100%",
                  padding: collapsed ? "13px 0" : "12px 20px", justifyContent: collapsed ? "center" : "flex-start",
                  background: active ? "rgba(220,38,38,0.15)" : "transparent",
                  border: "none", borderLeft: active ? "3px solid #dc2626" : "3px solid transparent",
                  color: active ? "#dc2626" : "#666", cursor: "pointer", transition: "0.15s",
                  fontFamily: "Poppins, sans-serif", fontSize: 13, fontWeight: active ? 700 : 400,
                  whiteSpace: "nowrap",
                }}>
                <span style={{ flexShrink: 0 }}>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <button onClick={async () => { await signOut(auth); navigate("/admin"); }}
          style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: collapsed ? "14px 0" : "14px 20px", justifyContent: collapsed ? "center" : "flex-start", background: "none", border: "none", borderTop: "1px solid #13131f", color: "#dc2626", cursor: "pointer", fontFamily: "Poppins, sans-serif", fontSize: 13, fontWeight: 700 }}>
          <ILogout />
          {!collapsed && <span>Logout</span>}
        </button>

        {/* Bottom brand */}
        {!collapsed && (
          <div style={{ padding: "16px 20px", borderTop: "1px solid #13131f", textAlign: "center" }}>
            <PALogo size={44} />
            <p style={{ color: "#333", fontSize: 9, letterSpacing: 1, marginTop: 6 }}>PRIME AUTHORITY</p>
            <p style={{ color: "#2a2a2a", fontSize: 8, letterSpacing: 0.5 }}>WHERE CHAMPIONS ARE MADE.</p>
          </div>
        )}
      </aside>

      {/* ── RIGHT SIDE ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* ── TOPBAR ────────────────────────────────────────────────────────── */}
        <header style={{ background: "#0a0a14", borderBottom: "1px solid #13131f", padding: "0 24px", height: 60, display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
          <button onClick={() => setCollapsed(v => !v)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", display: "flex", padding: 4, flexShrink: 0 }}>
            <IMenu />
          </button>

          {/* Search */}
          <div style={{ flex: 1, maxWidth: 400, position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#444", display: "flex" }}>
              <ISearch />
            </span>
            <input
              value={searchQ} onChange={e => setSearchQ(e.target.value)}
              placeholder="Search entries…"
              style={{ ...INPUT, paddingLeft: 40, marginBottom: 0, borderRadius: 24, background: "#0f0f1a", border: "1px solid #1e1e2e" }}
            />
          </div>

          <div style={{ flex: 1 }} />

          {/* Date */}
          <span style={{ color: "#555", fontSize: 12, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
            {currentDate}
          </span>

          {/* Bell */}
          <button onClick={() => setTab("notifications")} style={{ background: "none", border: "none", cursor: "pointer", color: "#888", position: "relative", display: "flex", padding: 6 }}>
            <IBell />
            {notifBadge > 0 && (
              <span style={{ position: "absolute", top: 2, right: 2, background: "#dc2626", color: "#fff", borderRadius: "50%", width: 16, height: 16, fontSize: 9, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {notifBadge > 9 ? "9+" : notifBadge}
              </span>
            )}
          </button>

          {/* Admin profile */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "6px 10px", borderRadius: 10, background: "#0f0f1a", border: "1px solid #1e1e2e" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(220,38,38,0.2)", border: "2px solid #dc2626", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626" }}>
              <IUser />
            </div>
            <div style={{ lineHeight: 1.3 }}>
              <p style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>Admin</p>
              <p style={{ color: "#666", fontSize: 10 }}>Super Administrator</p>
            </div>
            <span style={{ color: "#555" }}><IChevron /></span>
          </div>
        </header>

        {/* ── CONTENT ───────────────────────────────────────────────────────── */}
        <main style={{ flex: 1, overflowY: "auto", padding: "28px 28px 40px" }}>

          {/* ── DASHBOARD ─────────────────────────────────────────────────── */}
          {tab === "dashboard" && (
            <div>
              <div style={{ marginBottom: 26 }}>
                <h1 style={{ color: "#fff", fontWeight: 900, fontSize: 22, marginBottom: 4 }}>Welcome back, Admin 👋</h1>
                <p style={{ color: "#555", fontSize: 13 }}>Manage your website content and registrations.</p>
              </div>

              {/* Stats row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14, marginBottom: 26 }}>
                {[
                  { icon: "📋", label: "Join Applications", val: joins.length,                                       color: "#3b82f6" },
                  { icon: "🏆", label: "Tournament Teams",   val: tournaments.length,                                 color: "#8b5cf6" },
                  { icon: "⚔️", label: "Scrim Bookings",    val: scrims.length,                                      color: "#f59e0b" },
                  { icon: "⏳", label: "Pending Reviews",   val: [...joins, ...tournaments, ...scrims].filter(e => !e.status || e.status === "Pending").length, color: "#ef4444" },
                  { icon: "👥", label: "Total Users",        val: allUsers.length,                                    color: "#22c55e" },
                ].map(({ icon, label, val, color }) => (
                  <div key={label} style={{ background: "#0f0f1a", border: `1px solid ${color}22`, borderRadius: 12, padding: "18px 16px", display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{icon}</div>
                    <div>
                      <p style={{ color, fontSize: 22, fontWeight: 900 }}>{val}</p>
                      <p style={{ color: "#555", fontSize: 11 }}>{label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Hero preview + Latest Join */}
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0,5fr) minmax(0,7fr)", gap: 16, marginBottom: 16 }}>
                {/* Hero widget */}
                <div style={CARD}>
                  <h3 style={{ color: "#aaa", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Hero Section</h3>
                  <div style={{ borderRadius: 10, overflow: "hidden", background: "linear-gradient(135deg,#1a0a0a,#0a0010)", border: "1px solid #1e1e2e", padding: "28px 20px", textAlign: "center", marginBottom: 14 }}>
                    <PALogo size={56} />
                    <h2 style={{ color: "#dc2626", fontWeight: 900, fontSize: 18, letterSpacing: 2, marginTop: 10 }}>{heroTitle}</h2>
                    <p style={{ color: "#888", fontSize: 11, marginTop: 4 }}>{heroSubtitle}</p>
                    <p style={{ color: "#555", fontSize: 10, marginTop: 2 }}>{heroDescription}</p>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => window.open("/", "_blank")} style={{ ...BTN, flex: 1, background: "transparent", border: "1px solid #2a2a3a", color: "#aaa", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <IEye /> Preview
                    </button>
                    <button onClick={() => setTab("hero")} style={{ ...BTN, flex: 1, background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.3)", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      ✏️ Edit Hero Section
                    </button>
                  </div>
                </div>

                {/* Latest Join Requests */}
                <div style={CARD}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <h3 style={{ color: "#aaa", fontSize: 13, fontWeight: 600 }}>Latest Join Organization Requests</h3>
                    <button onClick={() => setTab("benefits")} style={{ background: "none", border: "none", color: "#dc2626", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>View All</button>
                  </div>
                  <EntryTable entries={joins.slice(0, 5)} onView={setViewEntry} />
                </div>
              </div>

              {/* Latest Tournament + Scrims + Notifications */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <div style={CARD}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <h3 style={{ color: "#aaa", fontSize: 13, fontWeight: 600 }}>Latest Tournament Registrations</h3>
                    <button onClick={() => setTab("tournament")} style={{ background: "none", border: "none", color: "#dc2626", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>View All</button>
                  </div>
                  <EntryTable entries={tournaments.slice(0, 3)} onView={setViewEntry} />
                </div>

                <div style={CARD}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <h3 style={{ color: "#aaa", fontSize: 13, fontWeight: 600 }}>Latest Scrims Registrations</h3>
                    <button onClick={() => setTab("scrims")} style={{ background: "none", border: "none", color: "#dc2626", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>View All</button>
                  </div>
                  <EntryTable entries={scrims.slice(0, 3)} onView={setViewEntry} />
                </div>

                {/* Recent Notifications (pending items feed) */}
                <div style={CARD}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <h3 style={{ color: "#aaa", fontSize: 13, fontWeight: 600 }}>Recent Notifications</h3>
                    <button onClick={() => setTab("notifications")} style={{ background: "none", border: "none", color: "#dc2626", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>View All</button>
                  </div>
                  {[
                    ...joins.slice(0, 2).map(e => ({ msg: `New join request received`, sub: `${e.teamName || e.managerIgn || "Team"} has requested to join`, time: e.createdAt })),
                    ...tournaments.slice(0, 2).map(e => ({ msg: `Tournament registration received`, sub: `${e.teamName || "Team"} registered for tournament`, time: e.createdAt })),
                    ...scrims.slice(0, 1).map(e => ({ msg: `New scrims registration received`, sub: `${e.teamName || "Team"} registered for scrims`, time: e.createdAt })),
                  ].slice(0, 5).map((n, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, paddingBottom: 12, marginBottom: 12, borderBottom: i < 4 ? "1px solid #13131f" : "none" }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#dc2626" }}>
                        <IBell />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: "#ddd", fontSize: 12, fontWeight: 600, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.msg}</p>
                        <p style={{ color: "#555", fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.sub}</p>
                      </div>
                      <span style={{ color: "#444", fontSize: 10, whiteSpace: "nowrap", flexShrink: 0 }}>
                        {n.time ? new Date(n.time).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                      </span>
                    </div>
                  ))}
                  {joins.length + tournaments.length + scrims.length === 0 && (
                    <p style={{ color: "#444", fontSize: 13 }}>No recent activity.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── TOURNAMENT ────────────────────────────────────────────────────── */}
          {tab === "tournament" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h2 style={{ color: "#fff", fontWeight: 900, fontSize: 20 }}>Tournament Registrations</h2>
                  <p style={{ color: "#555", fontSize: 13 }}>{tournaments.length} total entries</p>
                </div>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  style={{ ...INPUT, width: "auto", marginBottom: 0, borderRadius: 24, padding: "8px 16px" }}>
                  {["All", "Pending", "Accepted", "Rejected"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div style={CARD}>
                <EntryTable entries={filtered(tournaments)} onView={setViewEntry} />
              </div>
            </div>
          )}

          {/* ── SCRIMS ────────────────────────────────────────────────────────── */}
          {tab === "scrims" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h2 style={{ color: "#fff", fontWeight: 900, fontSize: 20 }}>Scrims Registrations</h2>
                  <p style={{ color: "#555", fontSize: 13 }}>{scrims.length} total entries</p>
                </div>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  style={{ ...INPUT, width: "auto", marginBottom: 0, borderRadius: 24, padding: "8px 16px" }}>
                  {["All", "Pending", "Accepted", "Rejected"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div style={CARD}>
                <EntryTable entries={filtered(scrims)} onView={setViewEntry} />
              </div>
            </div>
          )}

          {/* ── BENEFITS (Join Applications) ──────────────────────────────────── */}
          {tab === "benefits" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h2 style={{ color: "#fff", fontWeight: 900, fontSize: 20 }}>Join Applications</h2>
                  <p style={{ color: "#555", fontSize: 13 }}>{joins.length} total applications • {joins.filter(e => !e.status || e.status === "Pending").length} pending</p>
                </div>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  style={{ ...INPUT, width: "auto", marginBottom: 0, borderRadius: 24, padding: "8px 16px" }}>
                  {["All", "Pending", "Accepted", "Rejected"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div style={CARD}>
                {filtered(joins).length === 0 ? (
                  <p style={{ color: "#444", fontSize: 13, padding: "20px 0" }}>No join applications found.</p>
                ) : filtered(joins).map(entry => (
                  <div key={entry.id} style={{ border: "1px solid #1e1e2e", borderRadius: 12, padding: 16, marginBottom: 12, background: "#0a0a14" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                      <div>
                        <p style={{ color: "#fff", fontWeight: 800, margin: 0 }}>{entry.teamName || entry.managerIgn || "—"}</p>
                        <p style={{ color: "#666", fontSize: 12, margin: "4px 0 0" }}>{entry.managerIgn || "—"} • {entry.teamRegion || "—"}</p>
                      </div>
                      <Badge status={entry.status || "Pending"} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginTop: 12, color: "#aaa", fontSize: 13 }}>
                      <div><strong style={{ color: "#fff" }}>Players:</strong> {entry.totalPlayers || "—"}</div>
                      <div><strong style={{ color: "#fff" }}>Contact:</strong> {entry.whatsappContact || "—"}</div>
                      <div><strong style={{ color: "#fff" }}>Email:</strong> {entry.emailAddress || "—"}</div>
                      <div><strong style={{ color: "#fff" }}>Prev Org:</strong> {entry.previousOrganization || "—"}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                      {entry.status !== "Accepted" && (
                        <button onClick={() => updateStatus("applications", entry.id, "Accepted", entry)} style={{ ...BTN, background: "#16a34a", color: "#fff" }}>✅ Accept</button>
                      )}
                      {entry.status !== "Rejected" && (
                        <button onClick={() => updateStatus("applications", entry.id, "Rejected", entry)} style={{ ...BTN, background: "#dc2626", color: "#fff" }}>❌ Reject</button>
                      )}
                      {entry.status && entry.status !== "Pending" && (
                        <button onClick={() => updateStatus("applications", entry.id, "Pending", entry)} style={{ ...BTN, background: "#f59e0b", color: "#fff" }}>⏳ Pending</button>
                      )}
                      <button onClick={() => setViewEntry(entry)} style={{ ...BTN, background: "#3b82f6", color: "#fff" }}>👁️ View</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── CONTACT REQUESTS ─────────────────────────────────────────────── */}
          {tab === "contact" && (
            <div>
              <h2 style={{ color: "#fff", fontWeight: 900, fontSize: 20, marginBottom: 24 }}>Contact Requests</h2>
              <div style={CARD}>
                <h3 style={{ color: "#fff", fontWeight: 700, marginBottom: 8 }}>📩 Request Management</h3>
                <p style={{ color: "#555", fontSize: 13, lineHeight: 1.7 }}>
                  Contact requests ko yahan manage karna hai. Upcoming Tournament ka banner aur visibility ka control bhi naya section mein available hai.
                </p>
              </div>
            </div>
          )}

          {/* ── UPCOMING TOURNAMENT ───────────────────────────────────────────── */}
          {tab === "upcoming" && (
            <div>
              <h2 style={{ color: "#fff", fontWeight: 900, fontSize: 20, marginBottom: 24 }}>Upcoming Tournament</h2>
              <div style={CARD}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <div>
                    <h3 style={{ color: "#fff", fontWeight: 700, marginBottom: 4, fontSize: 15 }}>Show banner on Upcoming Tournament page</h3>
                    <p style={{ color: "#555", fontSize: 13 }}>Banner ko website ke upcoming tournament page par dikhane ke liye toggle ON karen.</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ color: upcomingTournamentBannerOn ? "#22c55e" : "#ef4444", fontWeight: 700, fontSize: 12 }}>{upcomingTournamentBannerOn ? "ON" : "OFF"}</span>
                    <button onClick={() => set(ref(database, "settings/upcomingTournamentBannerEnabled"), !upcomingTournamentBannerOn)} style={{ width: 52, height: 26, borderRadius: 13, border: "none", background: upcomingTournamentBannerOn ? "#22c55e" : "#374151", cursor: "pointer", position: "relative", transition: "0.3s" }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: upcomingTournamentBannerOn ? 29 : 3, transition: "0.3s" }} />
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 16 }}>
                  <p style={{ color: "#ddd", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Choose file from device</p>
                  <label style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px dashed #2a2a3d", background: "#111", color: "#fff", cursor: "pointer", fontSize: 13 }}>
                    Select image from device
                    <input type="file" accept="image/*" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const dataUrl = await readFileAsDataURL(file);
                      await set(ref(database, "settings/upcomingTournamentBannerImage"), dataUrl);
                    }} style={{ display: "none" }} />
                  </label>

                  {upcomingTournamentBannerImage ? (
                    <div style={{ marginTop: 12 }}>
                      <img src={upcomingTournamentBannerImage} style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 10, border: "1px solid #2a2a3d" }} />
                      <button type="button" onClick={async () => {
                        await set(ref(database, "settings/upcomingTournamentBannerImage"), "");
                        await set(ref(database, "settings/upcomingTournamentBannerEnabled"), false);
                      }} style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.12)", color: "#f87171", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>
                        Delete banner
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS (Broadcast) ──────────────────────────────────────── */}
          {tab === "notifications" && (
            <div>
              <h2 style={{ color: "#fff", fontWeight: 900, fontSize: 20, marginBottom: 24 }}>Notifications</h2>
              <div style={CARD}>
                <h3 style={{ color: "#fff", fontWeight: 700, marginBottom: 8 }}>📢 Broadcast to All Users</h3>
                <p style={{ color: "#555", fontSize: 13, marginBottom: 16 }}>
                  Send a message to all <strong style={{ color: "#fff" }}>{allUsers.length}</strong> registered users simultaneously.
                </p>
                <textarea value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)}
                  placeholder="Type your broadcast message…" rows={4}
                  style={{ ...INPUT, resize: "vertical" }} />
                <button onClick={sendBroadcast} disabled={bcSending || !broadcastMsg.trim()}
                  style={{ ...BTN, background: "#dc2626", color: "#fff", padding: "12px 24px", opacity: (bcSending || !broadcastMsg.trim()) ? 0.6 : 1 }}>
                  {bcSending ? "Sending…" : `📢 Send to ${allUsers.length} Users`}
                </button>
              </div>

              <div style={{ ...CARD, background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.2)" }}>
                <h3 style={{ color: "#60a5fa", marginBottom: 8 }}>💡 Personal Notification</h3>
                <p style={{ color: "#555", fontSize: 13, lineHeight: 1.7 }}>
                  To send a personal notification to a specific user, open their entry from the{" "}
                  <strong style={{ color: "#fff" }}>Tournament</strong>,{" "}
                  <strong style={{ color: "#fff" }}>Scrims</strong>, or{" "}
                  <strong style={{ color: "#fff" }}>Join Requests</strong> tabs and click <strong style={{ color: "#60a5fa" }}>📩 Send Notification</strong> inside the View modal.
                </p>
              </div>
            </div>
          )}

          {/* ── SETTINGS ──────────────────────────────────────────────────────── */}
          {tab === "settings" && (
            <div>
              <h2 style={{ color: "#fff", fontWeight: 900, fontSize: 20, marginBottom: 24 }}>Website Settings</h2>

              {[
                {
                  label: "🏆 Tournament Registration Form",
                  desc: tournamentOn ? "Form is LIVE — users can register." : "Showing 'COMING SOON'.",
                  on: tournamentOn,
                  toggle: () => set(ref(database, "settings/tournamentFormEnabled"), !tournamentOn),
                  subToggle: {
                    label: "Show banner",
                    on: tournamentBannerOn,
                    toggle: () => set(ref(database, "settings/tournamentBannerEnabled"), !tournamentBannerOn),
                  },
                  bannerImage: {
                    value: tournamentBannerImage,
                    onChange: async (e: React.ChangeEvent<HTMLInputElement>) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = async () => {
                        await set(ref(database, "settings/tournamentBannerImage"), reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    },
                  },
                },
                {
                  label: "📅 Upcoming Tournament Page",
                  desc: "Show a banner on the Upcoming Tournament page.",
                  on: upcomingTournamentBannerOn,
                  toggle: () => set(ref(database, "settings/upcomingTournamentBannerEnabled"), !upcomingTournamentBannerOn),
                  bannerImage: {
                    value: upcomingTournamentBannerImage,
                    onChange: async (e: React.ChangeEvent<HTMLInputElement>) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = async () => {
                        await set(ref(database, "settings/upcomingTournamentBannerImage"), reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    },
                  },
                  deleteBanner: async () => {
                    await set(ref(database, "settings/upcomingTournamentBannerImage"), "");
                    await set(ref(database, "settings/upcomingTournamentBannerEnabled"), false);
                  },
                },
                {
                  label: "⚔️ Scrim Booking Form",
                  desc: scrimOn ? "Form is LIVE — teams can book." : "Showing 'COMING SOON'.",
                  on: scrimOn,
                  toggle: () => set(ref(database, "settings/scrimFormEnabled"), !scrimOn),
                  subToggle: {
                    label: "Show banner",
                    on: scrimBannerOn,
                    toggle: () => set(ref(database, "settings/scrimBannerEnabled"), !scrimBannerOn),
                  },
                  bannerImage: {
                    value: scrimBannerImage,
                    onChange: async (e: React.ChangeEvent<HTMLInputElement>) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = async () => {
                        await set(ref(database, "settings/scrimBannerImage"), reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    },
                  },
                },
                {
                  label: "🚀 Team Recruitment Form",
                  desc: joinOn ? "Form is LIVE — teams can apply." : "Showing 'COMING SOON'.",
                  on: joinOn,
                  toggle: () => set(ref(database, "settings/joinFormEnabled"), !joinOn),
                  subToggle: {
                    label: "Show banner",
                    on: joinBannerOn,
                    toggle: () => set(ref(database, "settings/joinBannerEnabled"), !joinBannerOn),
                  },
                  bannerImage: {
                    value: joinBannerImage,
                    onChange: async (e: React.ChangeEvent<HTMLInputElement>) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = async () => {
                        await set(ref(database, "settings/joinBannerImage"), reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    },
                  },
                },
              ].map(({ label, desc, on, toggle, subToggle, bannerImage, deleteBanner }) => (
                <div key={label} style={CARD}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                    <div>
                      <h3 style={{ color: "#fff", fontWeight: 700, marginBottom: 4, fontSize: 15 }}>{label}</h3>
                      <p style={{ color: "#555", fontSize: 13 }}>{desc}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0, marginLeft: 20 }}>
                      <span style={{ color: on ? "#22c55e" : "#ef4444", fontWeight: 700, fontSize: 12 }}>{on ? "ON" : "OFF"}</span>
                      <button onClick={toggle} style={{ width: 52, height: 26, borderRadius: 13, border: "none", background: on ? "#22c55e" : "#374151", cursor: "pointer", position: "relative", transition: "0.3s" }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: on ? 29 : 3, transition: "0.3s" }} />
                      </button>
                    </div>
                  </div>
                  {subToggle ? (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingTop: 14, borderTop: "1px solid #1e1e2e" }}>
                      <div>
                        <p style={{ color: "#ddd", fontSize: 13, fontWeight: 600 }}>{subToggle.label}</p>
                        <p style={{ color: "#555", fontSize: 12 }}>Show a banner above the form when this is ON.</p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ color: subToggle.on ? "#22c55e" : "#ef4444", fontWeight: 700, fontSize: 12 }}>{subToggle.on ? "ON" : "OFF"}</span>
                        <button onClick={subToggle.toggle} style={{ width: 52, height: 26, borderRadius: 13, border: "none", background: subToggle.on ? "#22c55e" : "#374151", cursor: "pointer", position: "relative", transition: "0.3s" }}>
                          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: subToggle.on ? 29 : 3, transition: "0.3s" }} />
                        </button>
                      </div>
                    </div>
                  ) : null}
                  <div style={{ marginTop: 12 }}>
                    <p style={{ color: "#ddd", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Choose file from device</p>
                    <label style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px dashed #2a2a3d", background: "#111", color: "#fff", cursor: "pointer", fontSize: 13 }}>
                      Select image from device
                      <input type="file" accept="image/*" onChange={bannerImage.onChange} style={{ display: "none" }} />
                    </label>
                    {bannerImage.value ? <img src={bannerImage.value} style={{ marginTop: 10, width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 10, border: "1px solid #2a2a3d" }} /> : null}
                    {deleteBanner ? (
                      <button type="button" onClick={deleteBanner} style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.12)", color: "#f87171", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>
                        Delete banner
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}

              <div style={{ ...CARD, background: "rgba(220,38,38,0.04)", border: "1px solid rgba(220,38,38,0.2)" }}>
                <h3 style={{ color: "#dc2626", marginBottom: 10 }}>ℹ️ How toggles work</h3>
                <ul style={{ paddingLeft: 18 }}>
                  {[
                    "Toggle ON → form becomes visible on the website immediately",
                    "Toggle OFF → page shows 'COMING SOON'",
                    "Changes take effect in real-time — no page reload needed",
                    "All submissions appear in Tournament / Scrims tabs",
                    "Accept / Reject auto-sends a notification to the user",
                    "📩 Send Notification → personal message to a specific user via View modal",
                  ].map(t => <li key={t} style={{ color: "#888", fontSize: 13, lineHeight: 2 }}>{t}</li>)}
                </ul>
              </div>
            </div>
          )}

          {/* ── ADMIN PROFILE ─────────────────────────────────────────────────── */}
          {tab === "profile" && (
            <div>
              <h2 style={{ color: "#fff", fontWeight: 900, fontSize: 20, marginBottom: 24 }}>Admin Profile</h2>
              <div style={{ ...CARD, maxWidth: 480 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(220,38,38,0.15)", border: "2px solid #dc2626", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626" }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" /></svg>
                  </div>
                  <div>
                    <p style={{ color: "#fff", fontWeight: 800, fontSize: 18 }}>Admin</p>
                    <p style={{ color: "#dc2626", fontSize: 12, fontWeight: 700 }}>Super Administrator</p>
                    <p style={{ color: "#555", fontSize: 12 }}>{ADMIN_EMAIL}</p>
                  </div>
                </div>
                <div style={{ background: "#0a0a14", borderRadius: 8, padding: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {[
                      ["Role", "Super Administrator"],
                      ["Access", "Full Access"],
                      ["Join Applications", String(joins.length)],
                      ["Tournament Entries", String(tournaments.length)],
                      ["Scrim Bookings", String(scrims.length)],
                      ["Total Users", String(allUsers.length)],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <p style={{ color: "#555", fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>{k}</p>
                        <p style={{ color: "#ddd", fontSize: 13, fontWeight: 600, marginTop: 2 }}>{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={async () => { await signOut(auth); navigate("/admin"); }}
                  style={{ ...BTN, background: "#dc2626", color: "#fff", marginTop: 16, width: "100%", padding: "12px 0" }}>
                  🚪 Logout
                </button>
              </div>
            </div>
          )}

          {/* ── HERO SECTION ──────────────────────────────────────────────── */}
          {tab === "hero" && (
            <div>
              <h2 style={{ color: "#fff", fontWeight: 900, fontSize: 20, marginBottom: 24 }}>Hero Section Editor</h2>
              <div style={CARD}>
                <div style={{ display: "grid", gap: 12 }}>
                  <input value={heroTitle} onChange={e => setHeroTitle(e.target.value)} placeholder="Main Heading" style={INPUT} />
                  <input value={heroSubtitle} onChange={e => setHeroSubtitle(e.target.value)} placeholder="Secondary Heading" style={INPUT} />
                  <textarea value={heroDescription} onChange={e => setHeroDescription(e.target.value)} placeholder="Description" rows={4} style={{ ...INPUT, resize: "vertical" }} />
                  <input value={heroButtonText} onChange={e => setHeroButtonText(e.target.value)} placeholder="Button Text" style={INPUT} />
                  <input value={heroButtonLink} onChange={e => setHeroButtonLink(e.target.value)} placeholder="Button Link" style={INPUT} />
                  <button onClick={handleHeroSave} disabled={heroSaving} style={{ ...BTN, background: "#dc2626", color: "#fff", padding: "12px 18px", opacity: heroSaving ? 0.7 : 1 }}>
                    {heroSaving ? "Saving..." : "Save Hero Section"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === "team"    && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h2 style={{ color: "#fff", fontWeight: 900, fontSize: 20 }}>Our Lineup</h2>
                  <p style={{ color: "#555", fontSize: 13 }}>{lineupEntries.length} lineup entries</p>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  {lineupEntries.length > 0 && (
                    <button onClick={deleteAllLineupEntries} disabled={lineupDeleting} style={{ ...BTN, background: 'transparent', border: '1px solid #dc2626', color: '#dc2626', padding: '10px 16px' }}>
                      {lineupDeleting ? 'Deleting...' : 'Delete All'}
                    </button>
                  )}
                  <button onClick={() => { setShowLineupForm(v => !v); if (showLineupForm) resetLineupForm(); }} style={{ ...BTN, background: '#dc2626', color: '#fff', padding: '10px 16px' }}>
                    {showLineupForm ? 'Cancel' : 'Create Our Lineup'}
                  </button>
                </div>
              </div>

              {showLineupForm && (
                <div style={{ ...CARD, marginBottom: 20 }}>
                  <h3 style={{ color: "#fff", fontWeight: 700, marginBottom: 14 }}>{editingLineupId ? "Edit Lineup Entry" : "Create New Lineup Entry"}</h3>
                  <form onSubmit={handleLineupSubmit} style={{ display: "grid", gap: 12 }}>
                    <input value={lineupForm.teamName} onChange={e => setLineupForm(prev => ({ ...prev, teamName: e.target.value }))} placeholder="Team Name" style={INPUT} required />
                    <input type="file" accept="image/*" onChange={e => handleLineupFile(e.target.files?.[0])} style={{ ...INPUT, padding: "12px" }} />
                    {lineupForm.logo && <img src={lineupForm.logo} alt="Preview" style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 12, border: "1px solid #2a2a3a" }} />}
                    <input value={lineupForm.serialNumber} onChange={e => setLineupForm(prev => ({ ...prev, serialNumber: e.target.value }))} placeholder="Sr No." style={INPUT} required />
                    <input value={lineupForm.playerIgn} onChange={e => setLineupForm(prev => ({ ...prev, playerIgn: e.target.value }))} placeholder="Player IGN" style={INPUT} required />
                    <input value={lineupForm.playerUid} onChange={e => setLineupForm(prev => ({ ...prev, playerUid: e.target.value }))} placeholder="Player UID" style={INPUT} required />
                    <input value={lineupForm.role} onChange={e => setLineupForm(prev => ({ ...prev, role: e.target.value }))} placeholder="Role" style={INPUT} required />
                    <input type="date" value={lineupForm.joiningDate} onChange={e => setLineupForm(prev => ({ ...prev, joiningDate: e.target.value }))} style={INPUT} />
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button type="submit" disabled={lineupSaving} style={{ ...BTN, background: "#dc2626", color: "#fff", padding: "10px 16px", opacity: lineupSaving ? 0.7 : 1 }}>
                        {lineupSaving ? "Saving..." : editingLineupId ? "Update Entry" : "Submit Entry"}
                      </button>
                      <button type="button" onClick={resetLineupForm} style={{ ...BTN, background: "#374151", color: "#fff", padding: "10px 16px" }}>Reset</button>
                    </div>
                  </form>
                </div>
              )}

              {lineupEntries.length === 0 ? (
                <div style={CARD}><p style={{ color: "#555" }}>No lineup entries yet.</p></div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {lineupEntries.map(entry => (
                    <div key={entry.id} style={{ ...CARD, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        {entry.logo && <img src={entry.logo} alt="Team logo" style={{ width: 54, height: 54, objectFit: "cover", borderRadius: 12, border: "1px solid #2a2a3a" }} />}
                        <div>
                          <p style={{ color: "#fff", fontWeight: 700 }}>{entry.teamName}</p>
                          <p style={{ color: "#555", fontSize: 12 }}>Sr No. {entry.serialNumber} • {entry.playerIgn} • {entry.role}</p>
                          <p style={{ color: "#777", fontSize: 12 }}>UID: {entry.playerUid} • Joined: {entry.joiningDate || "—"}</p>
                        </div>
                      </div>
                      <button onClick={() => startEditLineup(entry)} style={{ ...BTN, background: "transparent", border: "1px solid #2a2a3a", color: "#aaa" }}>Edit</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {tab === "journey" && <ComingSoon title="Journey Timeline Editor" icon={<IFlag />} />}


        <footer style={{ borderTop: "1px solid #13131f", padding: "12px 28px", textAlign: "center" }}>
          <p style={{ color: "#333", fontSize: 11 }}>© 2024 PRIME AUTHORITY. All rights reserved.</p>
        </footer>
      </div>

      {/* ── ENTRY MODAL ─────────────────────────────────────────────────────── */}
      {viewEntry && (
        <EntryModal
          entry={viewEntry}
          onClose={() => setViewEntry(null)}
          onAccept={() => {
            const p = joins.find(e => e.id === viewEntry.id) ? "applications"
                    : tournaments.find(e => e.id === viewEntry.id) ? "tournaments" : "scrims";
            updateStatus(p, viewEntry.id, "Accepted", viewEntry);
          }}
          onReject={() => {
            const p = joins.find(e => e.id === viewEntry.id) ? "applications"
                    : tournaments.find(e => e.id === viewEntry.id) ? "tournaments" : "scrims";
            updateStatus(p, viewEntry.id, "Rejected", viewEntry);
          }}
          onDelete={() => {
            const p = joins.find(e => e.id === viewEntry.id) ? "applications"
                    : tournaments.find(e => e.id === viewEntry.id) ? "tournaments" : "scrims";
            deleteEntry(p, viewEntry.id);
            setViewEntry(null);
          }}
          onSendNotif={msg => sendPersonalNotif(viewEntry, msg)}
        />
      )}
    </div>
  );
}
