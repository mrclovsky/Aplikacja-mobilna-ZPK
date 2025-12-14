import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Region } from "react-native-maps";

function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  const θ = Math.atan2(y, x);
  return (toDeg(θ) + 360) % 360;
}

export type LiveLocationHandlers = {
  onLocation?: (coords: { lat: number; lng: number }) => void;
  onHeading?: (heading: number) => void;
};

/**
 * useLiveLocation
 * ----------------
 * Bezpieczny hook wyciągający pełną logikę śledzenia urządzenia z MapScreen:
 * - requestForegroundPermissionsAsync
 * - getCurrentPositionAsync (lokalizacja startowa)
 * - watchPositionAsync (ruch użytkownika)
 * - watchHeadingAsync (kompas)
 * - poprawne czyszczenie subskrypcji
 *
 * ZACHOWUJE DOKŁADNIE TĘ SAMĄ FUNKCJONALNOŚĆ co dotychczasowa implementacja:
 * - identyczna dokładność (Highest)
 * - timeInterval: 900
 * - distanceInterval: 1
 */
export function useLiveLocation() {
  const [userLocation, setUserLocation] = useState<Region | null>(null);

  const headingSubscription = useRef<any>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const lastHeading = useRef<number | null>(null);
  const lastLocationForBearing = useRef<{ lat: number; lng: number } | null>(null);

  /**
   * Pobranie uprawnień + jednorazowa aktualna lokalizacja (TAK jak wcześniej w useEffect)
   */
  const requestAndLoadInitialLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;

    const loc = await Location.getCurrentPositionAsync({});

    const region: Region = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };

    setUserLocation(region);

    return region;
  }, []);

  /**
   * Start śledzenia pozycji + headingu
   * Wywoływane zamiast bezpośredniego Location.watchPositionAsync
   */
  const startTracking = useCallback(async (handlers: LiveLocationHandlers) => {
    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Highest,
        timeInterval: 900,
        distanceInterval: 1,
      },
      async (loc) => {
        const lat = loc.coords.latitude;
        const lng = loc.coords.longitude;

        const region: Region = {
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };

        setUserLocation(region);

        handlers.onLocation?.({ lat, lng });

        // ✅ BEARING Z RUCHU (ratunek dla Androida)
        if (lastLocationForBearing.current) {
          const prev = lastLocationForBearing.current;
          const bearing = calculateBearing(
            prev.lat,
            prev.lng,
            lat,
            lng
          );

          // jeśli kompas nie działa lub stoi w miejscu
          if (bearing && !isNaN(bearing)) {
            lastHeading.current = bearing;
            handlers.onHeading?.(bearing);
          }
        }

        lastLocationForBearing.current = { lat, lng };
      }
    );

    headingSubscription.current = await Location.watchHeadingAsync((headingData) => {
      let newHeading = headingData.trueHeading ?? headingData.magHeading ?? 0;

      // ❌ ODRZUĆ śmieci z Androida
      if (newHeading === 0) return;

      // ✅ FILTR DRGAŃ (minimalna zmiana 4°)
      if (
        lastHeading.current === null ||
        Math.abs(newHeading - lastHeading.current) > 4
      ) {
        lastHeading.current = newHeading;
        handlers.onHeading?.(newHeading);
      }
    });
  }, []);

  /**
   * Zatrzymanie wszystkich subskrypcji (TAK jak w handleStop)
   */
  const stopTracking = useCallback(() => {
    if (headingSubscription.current) {
      headingSubscription.current.remove();
      headingSubscription.current = null;
    }

    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }

    lastHeading.current = null;
    lastLocationForBearing.current = null;

  }, []);

  /**
   * Cleanup przy unmount – zabezpieczenie przed wyciekami
   */
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    userLocation,
    setUserLocation, // zostawione celowo, aby NIE zepsuć istniejącej logiki MapScreen
    requestAndLoadInitialLocation,
    startTracking,
    stopTracking,
  } as const;
}

export default useLiveLocation;
