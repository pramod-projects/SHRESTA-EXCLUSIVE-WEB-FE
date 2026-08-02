"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type FeedbackState = "idle" | "pending" | "success" | "error";

export type UseFeedbackReturn = {
  state: FeedbackState;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  /** Wrap an async action. Transitions: idle → pending → success|error → idle. */
  trigger: (action: () => Promise<void>) => void;
  /** Manually reset back to idle (e.g. after navigating away). */
  reset: () => void;
};

/**
 * Manages the feedback lifecycle for any async button action.
 *
 * Usage:
 *   const fb = useFeedback();
 *   <button disabled={fb.isPending} onClick={() => fb.trigger(submitForm)}>
 *     {fb.isSuccess ? "Saved!" : "Save"}
 *   </button>
 *
 * @param resetAfterMs  How long (ms) to hold the success/error state before
 *                      returning to idle. Default 2 000 ms.
 */
export function useFeedback(resetAfterMs = 2000): UseFeedbackReturn {
  const [state, setState] = useState<FeedbackState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  useEffect(() => () => clearTimer(), []);

  const reset = useCallback(() => {
    clearTimer();
    setState("idle");
  }, []);

  const trigger = useCallback(
    (action: () => Promise<void>) => {
      if (state === "pending") return;
      clearTimer();
      setState("pending");

      action().then(
        () => {
          setState("success");
          timer.current = setTimeout(() => setState("idle"), resetAfterMs);
        },
        () => {
          setState("error");
          timer.current = setTimeout(() => setState("idle"), resetAfterMs);
        }
      );
    },
    [state, resetAfterMs]
  );

  return {
    state,
    isPending: state === "pending",
    isSuccess: state === "success",
    isError: state === "error",
    trigger,
    reset,
  };
}
