import { useState } from "react";
import { useAuth } from "../lib/AuthContext";

export default function ReauthModal({ theme, toggleTheme }) {
  const { currentUser, login, logout } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const dk = theme === "dark";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login({ username: currentUser.username, password });
    } catch {
      setError("Incorrect password");
    } finally {
      setLoading(false);
    }
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
        }}
      >
        {dk ? (
          <svg
            width="15"
            height="15"
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
            width="15"
            height="15"
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

      <div style={{ width: "100%", maxWidth: "340px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "14px",
              background: "rgba(67,53,151,0.1)",
              border: "1px solid rgba(67,53,151,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <svg
              width="22"
              height="22"
              fill="none"
              viewBox="0 0 24 24"
              stroke="#7c6fd4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
          </div>
          <h1
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: dk ? "#ffffff" : "#0a0a0a",
              marginBottom: "8px",
            }}
          >
            Unlock your keys
          </h1>
          <p
            style={{
              fontSize: "13px",
              color: dk ? "#52525b" : "#a1a1aa",
              lineHeight: 1.6,
            }}
          >
            Welcome back,{" "}
            <span style={{ color: dk ? "#a1a1aa" : "#52525b" }}>
              {currentUser?.display_name}
            </span>
            . Enter your password to restore your encryption keys.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "12px" }}
        >
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            required
            style={{
              width: "100%",
              background: dk ? "#0d0d0d" : "#f9f9f9",
              border: `1px solid ${dk ? "#27272a" : "#e4e4e7"}`,
              borderRadius: "12px",
              padding: "12px 16px",
              fontSize: "13px",
              fontFamily: "Sora, sans-serif",
              color: dk ? "#ffffff" : "#0a0a0a",
              outline: "none",
              boxSizing: "border-box",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#433597")}
            onBlur={(e) =>
              (e.target.style.borderColor = dk ? "#27272a" : "#e4e4e7")
            }
          />

          {error && (
            <p
              style={{
                fontSize: "12px",
                color: "#f87171",
                fontFamily: "Sora, sans-serif",
                paddingLeft: "2px",
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
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
                Deriving keys…
              </>
            ) : (
              "Unlock"
            )}
          </button>

          <button
            type="button"
            onClick={logout}
            style={{
              background: "none",
              border: "none",
              color: dk ? "#3f3f46" : "#a1a1aa",
              fontSize: "12px",
              fontFamily: "Sora, sans-serif",
              cursor: "pointer",
              padding: "6px",
            }}
          >
            Sign in as a different user
          </button>
        </form>
      </div>
    </div>
  );
}
