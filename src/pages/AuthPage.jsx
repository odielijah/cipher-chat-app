import { useState } from "react";
import { useAuth } from "../lib/AuthContext";

export default function AuthPage({ theme, toggleTheme }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    username: "",
    display_name: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const dk = theme === "dark";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "register") await register(form);
      else await login(form);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const update = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const inputBase = {
    fontFamily: "Sora, sans-serif",
    fontSize: "13px",
    background: dk ? "#0d0d0d" : "#f9f9f9",
    border: `1px solid ${dk ? "#27272a" : "#e4e4e7"}`,
    color: dk ? "#ffffff" : "#0a0a0a",
    borderRadius: "12px",
    padding: "12px 16px",
    width: "100%",
    outline: "none",
    transition: "border-color 0.15s",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: dk ? "#000000" : "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        fontFamily: "Sora, sans-serif",
        transition: "background 0.3s",
      }}
    >
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          width: "36px",
          height: "36px",
          borderRadius: "10px",
          border: `1px solid ${dk ? "#27272a" : "#e4e4e7"}`,
          background: dk ? "#0d0d0d" : "#f4f4f5",
          color: dk ? "#71717a" : "#71717a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.2s",
        }}
      >
        {dk ? (
          <svg
            width="16"
            height="16"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        ) : (
          <svg
            width="16"
            height="16"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        )}
      </button>

      <div style={{ width: "100%", maxWidth: "360px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "16px",
              background: "#433597",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <rect
                x="5"
                y="12"
                width="16"
                height="11"
                rx="3"
                fill="white"
                fillOpacity="0.95"
              />
              <path
                d="M8.5 12V9.5a4.5 4.5 0 019 0V12"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <circle cx="13" cy="17" r="1.4" fill="#433597" />
              <rect
                x="12.3"
                y="17"
                width="1.4"
                height="2.2"
                rx="0.7"
                fill="#433597"
              />
            </svg>
          </div>
          <div
            style={{
              fontSize: "20px",
              fontWeight: 600,
              color: dk ? "#ffffff" : "#0a0a0a",
              letterSpacing: "-0.3px",
            }}
          >
            Cipher
          </div>
          <div
            style={{
              fontSize: "13px",
              color: dk ? "#52525b" : "#a1a1aa",
              marginTop: "4px",
            }}
          >
            Messages only you can read
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            background: dk ? "#0d0d0d" : "#f4f4f5",
            border: `1px solid ${dk ? "#1c1c1e" : "#e4e4e7"}`,
            borderRadius: "12px",
            padding: "4px",
            marginBottom: "20px",
          }}
        >
          {["login", "register"].map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setError("");
              }}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: "9px",
                border: "none",
                cursor: "pointer",
                fontSize: "13px",
                fontFamily: "Sora, sans-serif",
                fontWeight: 500,
                transition: "all 0.2s",
                background:
                  mode === m ? (dk ? "#1c1c1e" : "#ffffff") : "transparent",
                color:
                  mode === m
                    ? dk
                      ? "#ffffff"
                      : "#0a0a0a"
                    : dk
                      ? "#52525b"
                      : "#a1a1aa",
                boxShadow:
                  mode === m
                    ? dk
                      ? "0 1px 3px rgba(0,0,0,0.6)"
                      : "0 1px 3px rgba(0,0,0,0.08)"
                    : "none",
              }}
            >
              {m === "login" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {mode === "register" && (
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  color: dk ? "#3f3f46" : "#a1a1aa",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                }}
              >
                Display name
              </div>
              <input
                type="text"
                value={form.display_name}
                onChange={update("display_name")}
                placeholder="Alice"
                required
                style={inputBase}
                onFocus={(e) => (e.target.style.borderColor = "#433597")}
                onBlur={(e) =>
                  (e.target.style.borderColor = dk ? "#27272a" : "#e4e4e7")
                }
              />
            </div>
          )}

          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.06em",
                color: dk ? "#3f3f46" : "#a1a1aa",
                marginBottom: "6px",
                textTransform: "uppercase",
              }}
            >
              Username
            </div>
            <input
              type="text"
              value={form.username}
              onChange={update("username")}
              placeholder="alice_92"
              required
              pattern="[a-zA-Z0-9_\-]{3,32}"
              style={inputBase}
              onFocus={(e) => (e.target.style.borderColor = "#433597")}
              onBlur={(e) =>
                (e.target.style.borderColor = dk ? "#27272a" : "#e4e4e7")
              }
            />
          </div>

          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.06em",
                color: dk ? "#3f3f46" : "#a1a1aa",
                marginBottom: "6px",
                textTransform: "uppercase",
              }}
            >
              Password
            </div>
            <input
              type="password"
              value={form.password}
              onChange={update("password")}
              placeholder="••••••••"
              required
              minLength={8}
              style={inputBase}
              onFocus={(e) => (e.target.style.borderColor = "#433597")}
              onBlur={(e) =>
                (e.target.style.borderColor = dk ? "#27272a" : "#e4e4e7")
              }
            />
          </div>

          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.15)",
                borderRadius: "12px",
                padding: "12px 14px",
              }}
            >
              <svg
                style={{
                  width: "14px",
                  height: "14px",
                  color: "#f87171",
                  flexShrink: 0,
                  marginTop: "1px",
                }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span
                style={{
                  fontSize: "12px",
                  color: "#f87171",
                  fontFamily: "Sora, sans-serif",
                }}
              >
                {error}
              </span>
            </div>
          )}

          {mode === "register" && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                background: "rgba(67,53,151,0.07)",
                border: "1px solid rgba(67,53,151,0.18)",
                borderRadius: "12px",
                padding: "12px 14px",
              }}
            >
              <svg
                style={{
                  width: "14px",
                  height: "14px",
                  color: "#7c6fd4",
                  flexShrink: 0,
                  marginTop: "1px",
                }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span
                style={{
                  fontSize: "12px",
                  color: "#7c6fd4",
                  fontFamily: "Sora, sans-serif",
                  lineHeight: 1.5,
                }}
              >
                Keys are generated on this device. Your password wraps your
                private key — we never see it.
              </span>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "12px",
              border: "none",
              background: loading ? "rgba(67,53,151,0.45)" : "#433597",
              color: "#ffffff",
              fontSize: "13px",
              fontFamily: "Sora, sans-serif",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginTop: "4px",
              transition: "background 0.2s",
            }}
          >
            {loading ? (
              <>
                <svg
                  style={{ width: "14px", height: "14px" }}
                  className="animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                {mode === "register" ? "Generating keys…" : "Signing in…"}
              </>
            ) : mode === "register" ? (
              "Create account"
            ) : (
              "Sign in"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
