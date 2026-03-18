import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Region } from "react-native-maps";

export type LiveLocationHandlers = {
  onLocation?: (coords: { lat: number; lng: number }) => void;
  onHeading?: (heading: number) => void;
};

export function useLiveLocation() {
  const [userLocation, setUserLocation] = useState<Region | null>(null);

  const headingSubscription = useRef<any>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const lastHeading = useRef<number | null>(null);
  const lastSpeed = useRef<number>(0);

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

  const startTracking = useCallback(async (handlers: LiveLocationHandlers) => {
    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Highest,
        timeInterval: 2000, 
        distanceInterval: 3, 
      },
      (loc) => {
        const { latitude, longitude, heading, speed, accuracy } = loc.coords;

        const isAccuracyAcceptable = accuracy !== null && accuracy < 20;

        lastSpeed.current = isAccuracyAcceptable ? (speed ?? 0) : 0;

        const region: Region = {
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };

        setUserLocation(region);
        handlers.onLocation?.({ lat: latitude, lng: longitude });

        if (isAccuracyAcceptable && lastSpeed.current > 0.5 && heading !== null && heading >= 0) {
          if (
            lastHeading.current === null ||
            Math.abs(heading - lastHeading.current) > 4
          ) {
            lastHeading.current = heading;
            handlers.onHeading?.(heading);
          }
        }
      }
    );

    headingSubscription.current = await Location.watchHeadingAsync((headingData) => {
      if (lastSpeed.current > 0.5) return;

      let newHeading = headingData.trueHeading ?? headingData.magHeading ?? 0;
      if (newHeading === 0) return;

      if (
        lastHeading.current === null ||
        Math.abs(newHeading - lastHeading.current) > 5
      ) {
        lastHeading.current = newHeading;
        handlers.onHeading?.(newHeading);
      }
    });
    }, []);

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
    lastSpeed.current = 0;

  }, []);

  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    userLocation,
    setUserLocation,
    requestAndLoadInitialLocation,
    startTracking,
    stopTracking,
  } as const;
}

export default useLiveLocation;
