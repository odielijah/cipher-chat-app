// ============================================================
// useWebSocket.js — Real-time connection to WhisperBox
//
// WHY A CUSTOM HOOK:
// WebSocket lifecycle (connect, disconnect, reconnect, heartbeat)
// is complex. A hook keeps it clean and reusable.
//
// WHAT IT DOES:
// - Opens wss:// connection with your access token
// - Automatically reconnects if the connection drops
// - Refreshes the token before reconnecting if needed
// - Exposes: sendMessage(), onMessage callback, status
// ============================================================

import { useEffect, useRef, useCallback, useState } from "react";
import { getAccessToken } from "./api";

const WS_URL = "wss://whisperbox.koyeb.app/ws";
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function useWebSocket({ onMessage, enabled = true }) {
  const wsRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef(null);
  const [status, setStatus] = useState("disconnected"); // 'connecting' | 'connected' | 'disconnected' | 'error'

  const connect = useCallback(() => {
    const token = getAccessToken();
    if (!token || !enabled) return;

    setStatus("connecting");
    const ws = new WebSocket(`${WS_URL}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      reconnectAttempts.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage?.(data);
      } catch (err) {
        console.error("WS message parse error:", err);
      }
    };

    ws.onclose = (event) => {
      setStatus("disconnected");
      wsRef.current = null;

      // Don't reconnect if closed intentionally (code 1000)
      if (event.code === 1000) return;

      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts.current++;
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY);
      } else {
        setStatus("error");
      }
    };

    ws.onerror = () => {
      setStatus("error");
    };
  }, [enabled, onMessage]);

  useEffect(() => {
    if (enabled) connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.close(1000, "component unmounted");
      }
    };
  }, [connect, enabled]);

  const sendMessage = useCallback((toUserId, payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          event: "message.send",
          to: toUserId,
          payload,
        }),
      );
      return true;
    }
    return false; // caller should fall back to REST
  }, []);

  return { sendMessage, status };
}
