import { useState, useEffect, useRef, useCallback } from "react";
import { getMessages } from "../lib/api";
import { decryptMessage } from "../lib/crypto";

export default function ChatWindow({
  convo,
  currentUser,
  privateKey,
  incomingMessage,
  onSend,
  isOnline,
  theme,
}) {
  const [messages, setMessages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState("");
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const dk = theme === "dark";

  useEffect(() => {
    async function loadHistory() {
      setLoadingHistory(true);
      try {
        const raw = await getMessages(convo.user_id, { limit: 50 });
        const reversed = [...raw].reverse();
        const decrypted = await Promise.all(
          reversed.map(async (msg) => {
            const isSender = msg.from_user_id === currentUser.id;
            const text = await decryptMessage(
              msg.payload,
              privateKey,
              isSender,
            );
            return {
              id: msg.id,
              from_user_id: msg.from_user_id,
              isSender,
              text: text ?? "🔒 Unable to decrypt",
              decryptFailed: text === null,
              created_at: msg.created_at,
            };
          }),
        );
        setMessages(decrypted);
      } catch (err) {
        console.error("Failed to load history:", err);
      } finally {
        setLoadingHistory(false);
      }
    }
    loadHistory();
    inputRef.current?.focus();
  }, [convo.user_id, currentUser.id, privateKey]);

  useEffect(() => {
    if (!incomingMessage) return;
    if (
      incomingMessage.from_user_id !== convo.user_id &&
      incomingMessage.to_user_id !== convo.user_id
    )
      return;
    async function processIncoming() {
      const isSender = incomingMessage.from_user_id === currentUser.id;
      const text = await decryptMessage(
        incomingMessage.payload,
        privateKey,
        isSender,
      );
      const newMsg = {
        id: incomingMessage.id,
        from_user_id: incomingMessage.from_user_id,
        isSender,
        text: text ?? "🔒 Unable to decrypt",
        decryptFailed: text === null,
        created_at: incomingMessage.created_at,
      };
      setMessages((prev) =>
        prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg],
      );
    }
    processIncoming();
  }, [incomingMessage, convo.user_id, currentUser.id, privateKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    setInputText("");
    setError("");
    setSending(true);
    const optimisticId = `opt-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: optimisticId,
        from_user_id: currentUser.id,
        isSender: true,
        text,
        decryptFailed: false,
        created_at: new Date().toISOString(),
        pending: true,
      },
    ]);
    try {
      await onSend(convo.user_id, text);
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? { ...m, pending: false } : m)),
      );
    } catch {
      setError("Failed to send. Try again.");
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [inputText, sending, currentUser.id, onSend, convo.user_id]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        fontFamily: "Sora, sans-serif",
        background: dk ? "#000000" : "#ffffff",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 20px",
          borderBottom: `1px solid ${dk ? "#1a1a1a" : "#f0f0f0"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ position: "relative" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: dk ? "#1c1c1e" : "#f4f4f5",
                border: `1px solid ${dk ? "#27272a" : "#e4e4e7"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "11px",
                fontWeight: 600,
                color: dk ? "#71717a" : "#a1a1aa",
              }}
            >
              {convo.display_name?.slice(0, 2).toUpperCase()}
            </div>
            {isOnline && (
              <div
                style={{
                  position: "absolute",
                  bottom: "-1px",
                  right: "-1px",
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: "#22c55e",
                  border: `2px solid ${dk ? "#000" : "#fff"}`,
                }}
              />
            )}
          </div>
          <div>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: dk ? "#ffffff" : "#0a0a0a",
              }}
            >
              {convo.display_name}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: isOnline ? "#22c55e" : dk ? "#3f3f46" : "#a1a1aa",
                marginTop: "1px",
              }}
            >
              {isOnline ? "Online" : `@${convo.username}`}
            </div>
          </div>
        </div>

        {/* E2EE badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            background: "rgba(67,53,151,0.08)",
            border: "1px solid rgba(67,53,151,0.18)",
            borderRadius: "20px",
            padding: "5px 10px",
          }}
        >
          <svg
            width="11"
            height="11"
            fill="none"
            viewBox="0 0 24 24"
            stroke="#7c6fd4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 500,
              color: "#7c6fd4",
              fontFamily: "Sora, sans-serif",
            }}
          >
            End-to-end encrypted
          </span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 8px" }}>
        {loadingHistory ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: "8px",
              color: dk ? "#3f3f46" : "#d4d4d8",
              fontSize: "13px",
            }}
          >
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
            Decrypting messages…
          </div>
        ) : messages.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "16px",
                background: "rgba(67,53,151,0.08)",
                border: "1px solid rgba(67,53,151,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "12px",
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
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <p
              style={{
                fontSize: "13px",
                fontWeight: 500,
                color: dk ? "#3f3f46" : "#a1a1aa",
              }}
            >
              Secure channel open
            </p>
            <p
              style={{
                fontSize: "12px",
                color: dk ? "#27272a" : "#d4d4d8",
                marginTop: "4px",
                maxWidth: "240px",
                lineHeight: 1.5,
              }}
            >
              Only you and {convo.display_name} can read these messages.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {messages.map((msg, i) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                showTime={shouldShowTime(messages, i)}
                theme={theme}
              />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            margin: "0 16px 8px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(239,68,68,0.06)",
            border: "1px solid rgba(239,68,68,0.15)",
            borderRadius: "10px",
            padding: "8px 12px",
          }}
        >
          <svg
            style={{
              width: "13px",
              height: "13px",
              color: "#f87171",
              flexShrink: 0,
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

      {/* Input */}
      <div
        style={{
          padding: "12px 16px 16px",
          borderTop: `1px solid ${dk ? "#1a1a1a" : "#f0f0f0"}`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", gap: "10px" }}>
          <div
            style={{
              flex: 1,
              background: dk ? "#0d0d0d" : "#f9f9f9",
              border: `1px solid ${dk ? "#27272a" : "#e4e4e7"}`,
              borderRadius: "16px",
              padding: "11px 16px",
            }}
          >
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message…"
              rows={1}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                resize: "none",
                fontSize: "13px",
                fontFamily: "Sora, sans-serif",
                color: dk ? "#ffffff" : "#0a0a0a",
                lineHeight: 1.5,
                maxHeight: "120px",
              }}
              onInput={(e) => {
                e.target.style.height = "auto";
                e.target.style.height =
                  Math.min(e.target.scrollHeight, 120) + "px";
              }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || sending}
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "13px",
              border: "none",
              background:
                inputText.trim() && !sending
                  ? "#433597"
                  : dk
                    ? "#1c1c1e"
                    : "#f4f4f5",
              color:
                inputText.trim() && !sending
                  ? "#ffffff"
                  : dk
                    ? "#3f3f46"
                    : "#d4d4d8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: inputText.trim() && !sending ? "pointer" : "not-allowed",
              flexShrink: 0,
              transition: "all 0.2s",
            }}
          >
            {sending ? (
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
            ) : (
              <svg
                style={{ width: "14px", height: "14px" }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )}
          </button>
        </div>
        <p
          style={{
            fontSize: "11px",
            color: dk ? "#27272a" : "#e4e4e7",
            textAlign: "center",
            marginTop: "8px",
            fontFamily: "Sora, sans-serif",
          }}
        >
          🔒 AES-256-GCM encrypted · Enter to send
        </p>
      </div>
    </div>
  );
}

// ── Message bubble — time is OUTSIDE the blob ──────────────

function MessageBubble({ msg, showTime, theme }) {
  const dk = theme === "dark";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: msg.isSender ? "flex-end" : "flex-start",
        marginTop: showTime ? "16px" : "2px",
      }}
    >
      {/* Timestamp label — shown above group of messages when time gap > 10 mins */}
      {showTime && (
        <p
          style={{
            fontSize: "10px",
            color: dk ? "#3f3f46" : "#d4d4d8",
            marginBottom: "6px",
            fontFamily: "Sora, sans-serif",
            letterSpacing: "0.02em",
          }}
        >
          {formatMessageTime(msg.created_at)}
        </p>
      )}

      {/* Bubble */}
      <div
        style={{
          maxWidth: "68%",
          background: msg.decryptFailed
            ? "rgba(239,68,68,0.08)"
            : msg.isSender
              ? "#433597"
              : dk
                ? "#1c1c1e"
                : "#f4f4f5",
          border: msg.decryptFailed
            ? "1px solid rgba(239,68,68,0.2)"
            : msg.isSender
              ? "none"
              : `1px solid ${dk ? "#27272a" : "#ebebeb"}`,
          borderRadius: msg.isSender
            ? "18px 18px 4px 18px"
            : "18px 18px 18px 4px",
          padding: "9px 14px",
          opacity: msg.pending ? 0.55 : 1,
          transition: "opacity 0.2s",
        }}
      >
        <p
          style={{
            fontSize: "13px",
            lineHeight: 1.5,
            wordBreak: "break-word",
            whiteSpace: "pre-wrap",
            color: msg.decryptFailed
              ? "#f87171"
              : msg.isSender
                ? "#ffffff"
                : dk
                  ? "#ffffff"
                  : "#0a0a0a",
            fontFamily: "Sora, sans-serif",
            margin: 0,
          }}
        >
          {msg.text}
        </p>
      </div>

      {/* Time + status — OUTSIDE the bubble, below it */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          marginTop: "3px",
          padding: "0 2px",
        }}
      >
        <span
          style={{
            fontSize: "10px",
            color: dk ? "#3f3f46" : "#d4d4d8",
            fontFamily: "Sora, sans-serif",
          }}
        >
          {formatBubbleTime(msg.created_at)}
        </span>
        {msg.isSender && (
          <svg
            style={{
              width: "11px",
              height: "11px",
              color: msg.pending ? (dk ? "#27272a" : "#e4e4e7") : "#7c6fd4",
            }}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            {msg.pending ? (
              <path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm0 18a8 8 0 110-16 8 8 0 010 16zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
            ) : (
              <path d="M18 7l-1.41-1.41-6.34 6.34-2.83-2.83L6 10.52l4.25 4.25L18 7zm-7.75 7.73L4.5 9l1.41-1.41 4.34 4.34 7.34-7.34L19 6l-8.75 8.73z" />
            )}
          </svg>
        )}
      </div>
    </div>
  );
}

function shouldShowTime(messages, index) {
  if (index === 0) return true;
  const prev = new Date(messages[index - 1].created_at);
  const curr = new Date(messages[index].created_at);
  return curr - prev > 10 * 60 * 1000;
}

function formatMessageTime(isoString) {
  return new Date(isoString).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBubbleTime(isoString) {
  return new Date(isoString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
