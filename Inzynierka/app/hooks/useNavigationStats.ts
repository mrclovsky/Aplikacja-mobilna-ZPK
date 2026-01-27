import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";

type LatLng = { latitude: number; longitude: number };

const WATCH_OPTIONS: Location.LocationOptions = {
  accuracy: Location.Accuracy.Highest,
  timeInterval: 1000,
  distanceInterval: 1,
};

const haversineMeters = (a: LatLng, b: LatLng) => {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const sin = Math.sin;
  const cos = Math.cos;

  const h =
    sin(dLat / 2) * sin(dLat / 2) +
    cos(lat1) * cos(lat2) * sin(dLon / 2) * sin(dLon / 2);

  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

export function useNavigationStats() {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [distanceTravelled, setDistanceTravelled] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previousLocationRef = useRef<LatLng | null>(null);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const isRunningRef = useRef(false);

  const start = useCallback(async () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    setElapsedTime(0);
    setDistanceTravelled(0);
    previousLocationRef.current = null;

    timerRef.current = setInterval(() => {
      setElapsedTime((s) => s + 1);
    }, 1000);

    locationSubRef.current = await Location.watchPositionAsync(
      WATCH_OPTIONS,
      (loc) => {
        const curr: LatLng = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };

        const prev = previousLocationRef.current;
        if (prev) {
          const d = haversineMeters(prev, curr);
          setDistanceTravelled((m) => m + d);
        }
        previousLocationRef.current = curr;
      }
    );
  }, []);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (locationSubRef.current) {
      locationSubRef.current.remove();
      locationSubRef.current = null;
    }
    isRunningRef.current = false;

    const finalTime = elapsedTime;
    const finalDistance = distanceTravelled;

    previousLocationRef.current = null;

    return { finalTime, finalDistance };
  }, [elapsedTime, distanceTravelled]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (locationSubRef.current) locationSubRef.current.remove();
      isRunningRef.current = false;
      previousLocationRef.current = null;
    };
  }, []);

  return {
    elapsedTime,
    distanceTravelled,
    start,
    stop,
  };
}
