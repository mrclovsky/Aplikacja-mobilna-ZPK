import { useEffect, useRef, useState } from "react";

export type UseProximityBannerReturn = {
  message: string | null;
  showBanner: (text: string, durationMs?: number) => void;
  showPersistentMessageIfNone: (text: string) => void;
  clearMessage: () => void;
};

export function useProximityBanner(): UseProximityBannerReturn {
  const [message, setMessage] = useState<string | null>(null);
  const bannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBanner = (text: string, durationMs?: number) => {
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
