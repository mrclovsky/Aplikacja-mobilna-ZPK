import { useEffect, useRef, useState } from "react";

export type UseProximityBannerReturn = {
  message: string | null;
  showBanner: (text: string, durationMs?: number) => void;
  showPersistentMessageIfNone: (text: string) => void;
  clearMessage: () => void;
};

/**
 * Hook that encapsulates banner message behaviour used across the map screen.
 *
 * Behaviour is equivalent to the original implementation in MapScreen:
 * - showBanner(text, durationMs?) shows a message and (optionally) clears it after durationMs.
 * - showPersistentMessageIfNone(text) sets the message only if there is no active timeout and message differs.
 * - clearMessage() clears any active timeout and the message.
 *
 * The hook also performs cleanup on unmount to avoid dangling timers.
 */
export function useProximityBanner(): UseProximityBannerReturn {
  const [message, setMessage] = useState<string | null>(null);
  const bannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBanner = (text: string, durationMs?: number) => {
    // clear existing timeout if any
    if (bannerTimeoutRef.current) {
      clearTimeout(bannerTimeoutRef.current);
      bannerTimeoutRef.current = null;
    }

    setMessage(text);

    if (durationMs && durationMs > 0) {
      bannerTimeoutRef.current = setTimeout(() => {
        setMessage(null);
        bannerTimeoutRef.current = null;
      }, durationMs);
    }
  };

  const showPersistentMessageIfNone = (text: string) => {
    // Only set if there is no active timeout and the message isn't already equal
    if (!bannerTimeoutRef.current && message !== text) {
      setMessage(text);
    }
  };

  const clearMessage = () => {
    if (bannerTimeoutRef.current) {
      clearTimeout(bannerTimeoutRef.current);
      bannerTimeoutRef.current = null;
    }
    setMessage(null);
  };

  useEffect(() => {
    return () => {
      if (bannerTimeoutRef.current) {
        clearTimeout(bannerTimeoutRef.current);
        bannerTimeoutRef.current = null;
      }
    };
  }, []);

  return { message, showBanner, showPersistentMessageIfNone, clearMessage };
}

export default useProximityBanner;
