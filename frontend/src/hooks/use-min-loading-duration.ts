"use client";

import { useEffect, useRef, useState } from "react";

/** Keeps a loading flag true for at least `minMs` after it first flips on, so
 * a fast (especially local-dev) response doesn't flash a skeleton for an
 * imperceptible instant — the loading UI reads as an intentional cue instead
 * of a flicker. Turning off is immediate once the minimum has elapsed. */
export function useMinLoadingDuration(isLoading: boolean, minMs = 400): boolean {
  const [visible, setVisible] = useState(isLoading);
  const shownAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      shownAtRef.current = Date.now();
      setVisible(true);
      return;
    }

    const shownAt = shownAtRef.current;
    if (shownAt === null) {
      setVisible(false);
      return;
    }

    const elapsed = Date.now() - shownAt;
    if (elapsed >= minMs) {
      shownAtRef.current = null;
      setVisible(false);
      return;
    }

    const timeout = setTimeout(() => {
      shownAtRef.current = null;
      setVisible(false);
    }, minMs - elapsed);

    return () => clearTimeout(timeout);
  }, [isLoading, minMs]);

  return visible;
}
