import { useState } from "react";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useLocation } from "wouter";

const ADMIN_EMAIL = "admin@primeauthority.com";

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (email !== ADMIN_EMAIL) { setError("Access denied. Admin credentials required."); return; }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/admin/dashboard");
    } catch (err: any) {
      setError("Invalid credentials. " + (err.message || ""));
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "13px 15px", background: "#1a1a1a",
    border: "1px solid #333", borderRadius: 8, color: "#fff",
    fontSize: 14, fontFamily: "Poppins, sans-serif", margi
    nBottom: 14,
    outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0b0b0b", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#111", border: "1px solid #222", borderRadius: 16, padding: "50px 40px", width: "100%", maxWidth: 400, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🛡️</div>
        <h1 style={{ color: "#ff2b2b", fontWeight: 900, fontSize: "1.6rem", letterSpacing: 2, marginBottom: 5 }}>ADMIN ACCESS</h1>
        <p style={{ color: "#666", fontSize: 13, marginBottom: 30 }}>Prime Authority Admin Panel</p>

        {error && <div style={{ background: "rgba(255,43,43,0.1)", border: "1px solid rgba(255,43,43,0.3)", borderRadius: 8, padding: "10px 15px", marginBottom: 20 }}>
          <p style={{ color: "#ff2b2b", fontSize: 13 }}>{error}</p>
        </div>}

        <form onSubmit={handleSubmit}>
          <input style={inputStyle} type="email" placeholder="Admin Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input style={inputStyle} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="submit" disabled={loading} style={{ width: "100%", padding: "14px", background: "#ff2b2b", border: "none", borderRadius: 8, color: "#fff", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "Poppins, sans-serif", opacity: loading ? 0.7 : 1 }}>
            {loading ? "LOGGING IN..." : "LOGIN"}
          </button>
        </form>
      </div>
    </div>
  );
}
