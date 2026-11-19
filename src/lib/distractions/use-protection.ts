import { useCallback, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { deviceSessionIsActive, protectionStatus, type ProtectionStatus } from "./device";

export function useProtection(sessionId?: string) {
  const [status, setStatus] = useState<ProtectionStatus | "checking">("checking");
  const [verified, setVerified] = useState<{ id: string; enabled: boolean } | null>(null);
  const revision = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++revision.current;
    try {
      const [permission, enabled] = await Promise.all([
        protectionStatus(), sessionId ? deviceSessionIsActive(sessionId) : false,
      ]);
      if (current !== revision.current) return;
      setStatus(permission);
      setVerified(sessionId ? { id: sessionId, enabled } : null);
    } catch {
      if (current !== revision.current) return;
      setStatus("unavailable");
      setVerified(sessionId ? { id: sessionId, enabled: false } : null);
    }
  }, [sessionId]);
  useFocusEffect(useCallback(() => {
    void refresh();
    const sub = AppState.addEventListener("change", state => {
      if (state === "active") void refresh();
    });
    const timer = sessionId ? setInterval(() => {
      if (AppState.currentState === "active") void refresh();
    }, 5000) : undefined;
    return () => { revision.current++; sub.remove(); clearInterval(timer); };
  }, [refresh, sessionId]));
  return { status, refresh, enabled: verified?.id === sessionId ? verified?.enabled : undefined };
}
