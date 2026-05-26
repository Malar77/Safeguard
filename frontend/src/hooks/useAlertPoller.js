import { useEffect, useCallback, useRef } from "react";

/**
 * Custom hook for real-time alert polling
 * Provides automatic polling, error handling, and optimization
 */
export function useAlertPoller({
  onAlertsUpdate,
  onUnreadUpdate,
  onNewAlertDetected,
  pollInterval = 10000, // 10 seconds (configurable, default was 15s)
  enabled = true,
} = {}) {
  const pollTimerRef = useRef(null);
  const lastCountRef = useRef(0);
  const isPollingRef = useRef(false);

  const startPolling = useCallback(async (fetchAlertsFunc, fetchUnreadFunc) => {
    if (isPollingRef.current) return;
    isPollingRef.current = true;

    const poll = async () => {
      try {
        // Fetch both in parallel for efficiency
        const [alertsRes, unreadRes] = await Promise.all([
          fetchAlertsFunc?.(),
          fetchUnreadFunc?.(),
        ]).catch(() => [null, null]);

        if (alertsRes) onAlertsUpdate?.(alertsRes.data);
        
        if (unreadRes) {
          const unreadCount = unreadRes.data?.unread_count || 0;
          onUnreadUpdate?.(unreadCount);

          // Trigger alarm if new unread count is higher than previous
          if (unreadCount > lastCountRef.current && onNewAlertDetected) {
            onNewAlertDetected();
          }
          lastCountRef.current = unreadCount;
        }
      } catch (error) {
        console.error("Alert polling error:", error);
      }

      // Schedule next poll only if we're still polling
      if (isPollingRef.current && enabled) {
        pollTimerRef.current = setTimeout(poll, pollInterval);
      }
    };

    // Start polling
    poll();
  }, [pollInterval, enabled, onAlertsUpdate, onUnreadUpdate, onNewAlertDetected]);

  const stopPolling = useCallback(() => {
    isPollingRef.current = false;
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const resetUnreadCounter = useCallback(() => {
    lastCountRef.current = 0;
  }, []);

  return {
    startPolling,
    stopPolling,
    resetUnreadCounter,
    isPolling: () => isPollingRef.current,
  };
}
