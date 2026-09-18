"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  drainQueue,
  enqueue,
  getQueueLength,
  type QueuedSaveType,
} from "@/lib/offline-queue";

const RETRY_INTERVAL_MS = 10000;

// Wraps a set of save calls so a failure (e.g. a dropped connection) gets
// queued in localStorage and retried automatically, instead of just a
// toast the coach might not notice - drains on mount, on the browser's
// `online` event, and on a backup interval while anything is pending.
export function useOfflineSaveQueue(
  handlers: Record<QueuedSaveType, (...args: unknown[]) => Promise<void>>,
) {
  const [pendingCount, setPendingCount] = useState(0);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const drain = useCallback(async () => {
    const remaining = await drainQueue(handlersRef.current);
    setPendingCount(remaining);
  }, []);

  useEffect(() => {
    setPendingCount(getQueueLength());
    drain();

    window.addEventListener("online", drain);
    const interval = setInterval(() => {
      if (getQueueLength() > 0) drain();
    }, RETRY_INTERVAL_MS);

    return () => {
      window.removeEventListener("online", drain);
      clearInterval(interval);
    };
  }, [drain]);

  const saveWithRetry = useCallback(
    async (type: QueuedSaveType, args: unknown[]) => {
      try {
        await handlersRef.current[type](...args);
      } catch {
        enqueue(type, args);
        setPendingCount(getQueueLength());
      }
    },
    [],
  );

  return { pendingCount, saveWithRetry };
}
