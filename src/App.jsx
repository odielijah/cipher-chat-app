import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import AuthPage from "./pages/AuthPage";
import ChatLayout from "./pages/ChatLayout";
import ReauthModal from "./components/ReauthModal";

function AppInner({ theme, toggleTheme }) {
  const { isAuthenticated, isLoading, needsPassword } = useAuth();

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center transition-colors duration-300"
        style={{
          background: theme === "dark" ? "#000000" : "#ffffff",
          fontFamily: "Sora, sans-serif",
        }}
      >
        <div
          className="flex items-center gap-2.5"
          style={{ color: theme === "dark" ? "#52525b" : "#a1a1aa" }}
        >
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  if (needsPassword)
    return <ReauthModal theme={theme} toggleTheme={toggleTheme} />;
  if (!isAuthenticated)
    return <AuthPage theme={theme} toggleTheme={toggleTheme} />;
  return <ChatLayout theme={theme} toggleTheme={toggleTheme} />;
}

export default function App() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("wb_theme") || "dark",
  );

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("wb_theme", next);
      return next;
    });
  };

  return (
    <AuthProvider>
      <AppInner theme={theme} toggleTheme={toggleTheme} />
    </AuthProvider>
  );
}
