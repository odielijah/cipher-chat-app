import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../lib/AuthContext";
import { useWebSocket } from "../lib/useWebSocket";
import {
  getConversations,
  getUserPublicKey,
  sendMessageRest,
} from "../lib/api";
import { encryptMessage, importPublicKey } from "../lib/crypto";
import ConversationList from "../components/ConversationList";
import ChatWindow from "../components/ChatWindow";

export default function ChatLayout({ theme, toggleTheme }) {
  const { currentUser, privateKey, publicKey, logout } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConvo, setActiveConvo] = useState(null);
  const [incomingMessage, setIncomingMessage] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const dk = theme === "dark";

  // DRY: Centralized responsive styles
  const styles = useMemo(
    () => ({
      container: {
        height: "100vh",
        display: "flex",
        background: dk ? "#000000" : "#ffffff",
        fontFamily: "Sora, sans-serif",
        transition: "background 0.3s",
        overflow: "hidden",
      },
      sidebar: {
        width: isMobile ? "100%" : "300px",
        flexShrink: 0,
        display: isMobile && activeConvo ? "none" : "flex",
        flexDirection: "column",
        borderRight: `1px solid ${dk ? "#1a1a1a" : "#f0f0f0"}`,
      },
      main: {
        flex: 1,
        display: isMobile && !activeConvo ? "none" : "flex",
        flexDirection: "column",
        minWidth: 0,
      },
      iconBtn: {
        width: "30px",
        height: "30px",
        borderRadius: "8px",
        border: `1px solid ${dk ? "#27272a" : "#e4e4e7"}`,
        background: "transparent",
        color: dk ? "#52525b" : "#a1a1aa",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      },
      mobileHeader: {
        display: "flex",
        alignItems: "center",
        padding: "12px 16px",
        gap: "12px",
        borderBottom: `1px solid ${dk ? "#1a1a1a" : "#f0f0f0"}`,
      },
    }),
    [dk, isMobile, activeConvo],
  );

  const handleWsMessage = useCallback((data) => {
    if (data.event === "message.receive") {
      setIncomingMessage(data);
      refreshConversations();
    } else if (data.event === "user.online") {
      setOnlineUsers((prev) => new Set([...prev, data.user_id]));
    } else if (data.event === "user.offline") {
      setOnlineUsers((prev) => {
        const n = new Set(prev);
        n.delete(data.user_id);
        return n;
      });
    }
  }, []);

  const { sendMessage: wsSend, status: wsStatus } = useWebSocket({
    onMessage: handleWsMessage,
    enabled: !!privateKey,
  });

  const refreshConversations = useCallback(async () => {
    try {
      const convos = await getConversations();
      setConversations(convos);
    } catch {}
  }, []);

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  const handleSendMessage = useCallback(
    async (recipientId, plaintext) => {
      const recipientPublicKeyBase64 = await getUserPublicKey(recipientId);
      const recipientPublicKey = await importPublicKey(
        recipientPublicKeyBase64,
      );
      const payload = await encryptMessage(
        plaintext,
        recipientPublicKey,
        publicKey,
      );
      const sent = wsSend(recipientId, payload);
      if (!sent) await sendMessageRest(recipientId, payload);
      refreshConversations();
      return payload;
    },
    [wsSend, publicKey, refreshConversations],
  );

  const handleStartConvo = useCallback((user) => {
    setActiveConvo({
      user_id: user.id,
      display_name: user.display_name,
      username: user.username,
    });
  }, []);

  const wsColor =
    wsStatus === "connected"
      ? "#22c55e"
      : wsStatus === "connecting"
        ? "#eab308"
        : "#52525b";

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        {/* Header */}
        <div
          style={{
            padding: "16px",
            borderBottom: `1px solid ${dk ? "#1a1a1a" : "#f0f0f0"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "10px",
                background: "#433597",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="17" height="17" viewBox="0 0 26 26" fill="none">
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
            <div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: dk ? "#ffffff" : "#0a0a0a",
                  lineHeight: 1.1,
                }}
              >
                {currentUser?.display_name}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: dk ? "#3f3f46" : "#a1a1aa",
                  marginTop: "2px",
                }}
              >
                @{currentUser?.username}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: wsColor,
              }}
              title={`WebSocket: ${wsStatus}`}
            />
            <button onClick={toggleTheme} style={styles.iconBtn}>
              {dk ? (
                <svg
                  width="13"
                  height="13"
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
                  width="13"
                  height="13"
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
            <button onClick={logout} style={styles.iconBtn}>
              <svg
                width="13"
                height="13"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>

        <ConversationList
          conversations={conversations}
          activeConvo={activeConvo}
          onlineUsers={onlineUsers}
          onSelectConvo={setActiveConvo}
          onStartConvo={handleStartConvo}
          theme={theme}
        />
      </div>

      {/* Main Area */}
      <div style={styles.main}>
        {activeConvo ? (
          <>
            {isMobile && (
              <div style={styles.mobileHeader}>
                <button
                  onClick={() => setActiveConvo(null)}
                  style={{
                    ...styles.iconBtn,
                    width: "auto",
                    padding: "0 8px",
                    fontSize: "12px",
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    style={{ marginRight: "4px" }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Back
                </button>
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: dk ? "#fff" : "#000",
                  }}
                >
                  {activeConvo.display_name}
                </span>
              </div>
            )}
            <ChatWindow
              key={activeConvo.user_id}
              convo={activeConvo}
              currentUser={currentUser}
              privateKey={privateKey}
              incomingMessage={incomingMessage}
              onSend={handleSendMessage}
              isOnline={onlineUsers.has(activeConvo.user_id)}
              theme={theme}
            />
          </>
        ) : (
          <EmptyState theme={theme} />
        )}
      </div>
    </div>
  );
}

function EmptyState({ theme }) {
  const dk = theme === "dark";
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "32px",
        fontFamily: "Sora, sans-serif",
      }}
    >
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "18px",
          background: "rgba(67,53,151,0.08)",
          border: "1px solid rgba(67,53,151,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "16px",
        }}
      >
        <svg
          width="24"
          height="24"
          fill="none"
          viewBox="0 0 24 24"
          stroke="#7c6fd4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </div>
      <p
        style={{
          fontSize: "14px",
          fontWeight: 500,
          color: dk ? "#3f3f46" : "#a1a1aa",
        }}
      >
        No conversation selected
      </p>
      <p
        style={{
          fontSize: "12px",
          color: dk ? "#27272a" : "#d4d4d8",
          marginTop: "6px",
        }}
      >
        Search for someone above to start a secure chat
      </p>
    </div>
  );
}
