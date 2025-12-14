import { useCallback, useState } from "react";
import type { Route, Point } from "../../assets/types";
import { useNavigationStats } from "./useNavigationStats";
import { useSaveAchievement } from "./useSaveAchievement";
import { visitedStore } from "../stores/visitedPointsStore";

// Minimalne interfejsy, żeby NIE wiązać hooka sztywno z implementacją
export type CameraControllerLike = {
  runStartSequence: () => Promise<void>;
  runStopReset: () => Promise<void>;
  onPositionUpdate: (args: { navigationActive: boolean }) => Promise<void>;
  onHeadingSample: (heading: number) => void;
};

export type ProximityCheckerLike = {
  reset: () => void;
  check: (args: {
    lat: number;
    lng: number;
    points: Point[];
    routeName: string;
  }) => void;
};

export type UseNavigationControllerParams = {
  selectedRoute: Route | null;
  resolvedPoints: Point[];
  visitedIds: Set<string>;
  userLocation: { latitude: number; longitude: number } | null;

  camera: CameraControllerLike;
  proximity: ProximityCheckerLike;

  startTracking: (handlers: {
    onLocation: (coords: { lat: number; lng: number }) => void | Promise<void>;
    onHeading: (heading: number) => void;
  }) => Promise<void>;

  stopTracking: () => void;
  setTrackingMode: (v: boolean) => void;
  clearMessage: () => void;
};

/**
 * useNavigationController
 * -------------------------------------------------
 * W pełni bezpieczne wydzielenie funkcjonalności START / STOP nawigacji.
 * Zachowuje dokładnie tę samą logikę co w MapScreen:
 * - start/stop statystyk
 * - zapis osiągnięć
 * - reset visitedStore
 * - reset proximity
 * - start/stop GPS + heading
 * - sekwencje kamery
 */
export function useNavigationController({
  selectedRoute,
  resolvedPoints,
  visitedIds,
  userLocation,
  camera,
  proximity,
  startTracking,
  stopTracking,
  setTrackingMode,
  clearMessage,
}: UseNavigationControllerParams) {
  const [navigationActive, setNavigationActive] = useState(false);

  const { elapsedTime, distanceTravelled, start, stop } = useNavigationStats();
  const { saveAchievement } = useSaveAchievement();

  /**
   * START nawigacji – 1:1 jak w MapScreen
   */
  const handleStart = useCallback(async () => {
    if (!selectedRoute || !userLocation) return;

    setNavigationActive(true);
    start();
    setTrackingMode(true);

    clearMessage();
    proximity.reset();

    await camera.runStartSequence();

    await startTracking({
      onLocation: async ({ lat, lng }) => {
        await camera.onPositionUpdate({ navigationActive: true });

        proximity.check({
          lat,
          lng,
          points: resolvedPoints,
          routeName: selectedRoute.name,
        });
      },
      onHeading: (trueHeading) => {
        camera.onHeadingSample(trueHeading);
      },
    });
  }, [
    selectedRoute,
    userLocation,
    start,
    setTrackingMode,
    clearMessage,
    proximity,
    camera,
    startTracking,
    resolvedPoints,
  ]);

  /**
   * STOP nawigacji – 1:1 jak w MapScreen
   */
  const handleStop = useCallback(async () => {
    setNavigationActive(false);

    const result = stop();
    const totalPoints = resolvedPoints.length;
    const donePoints = resolvedPoints.filter((p) => visitedIds.has(p.id)).length;

    if (selectedRoute) {
      saveAchievement(
        selectedRoute,
        result.finalTime,
        result.finalDistance,
        donePoints,
        totalPoints
      );
    }

    visitedStore.clear(selectedRoute?.name);

    stopTracking();

    clearMessage();
    proximity.reset();

    await camera.runStopReset();
    setTrackingMode(false);
  }, [
    stop,
    resolvedPoints,
    visitedIds,
    selectedRoute,
    saveAchievement,
    stopTracking,
    clearMessage,
    proximity,
    camera,
    setTrackingMode,
  ]);

  return {
    navigationActive,
    handleStart,
    handleStop,
    elapsedTime,
    distanceTravelled,
  } as const;
}

export default useNavigationController;
