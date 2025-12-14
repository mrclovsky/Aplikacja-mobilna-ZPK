import { useMemo } from "react";
import type { DataFile, Point, Route } from "../../assets/types";

export type UseResolvedRouteParams = {
  data: DataFile;
  selectedRoute: Route | null;
  visitedIds: Set<string>;
};

export type UseResolvedRouteResult = {
  resolvedPoints: Point[];
  routeCoordinates: { latitude: number; longitude: number }[];
  totalPoints: number;
  donePoints: number;
};

/**
 * useResolvedRoute
 * --------------------------------------------------
 * W pełni bezpieczne wydzielenie logiki danych trasy z MapScreen:
 * - mapowanie pointRefs -> Point
 * - sortowanie po `order`
 * - wyliczanie współrzędnych trasy (Polyline)
 * - liczniki: totalPoints, donePoints
 *
 * Hook zachowuje 1:1 dotychczasowe działanie.
 */
export function useResolvedRoute({
  data,
  selectedRoute,
  visitedIds,
}: UseResolvedRouteParams): UseResolvedRouteResult {
  /**
   * Mapa punktów po ID – dokładnie jak w MapScreen
   */
  const pointsById = useMemo(
    () => new Map<string, Point>(data.points.map((p) => [p.id, p])),
    [data.points]
  );

  /**
   * Rozwiązane punkty trasy – 1:1 ta sama logika jak wcześniej
   */
  const resolvedPoints = useMemo(() => {
    if (!selectedRoute) return [] as Point[];

    return selectedRoute.pointRefs
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((ref) => pointsById.get(ref.pointId))
      .filter((p): p is Point => !!p);
  }, [selectedRoute, pointsById]);

  /**
   * Współrzędne do Polyline – 1:1 jak w MapScreen
   */
  const routeCoordinates = useMemo(
    () => resolvedPoints.map((p) => ({ latitude: p.lat, longitude: p.lng })),
    [resolvedPoints]
  );

  /**
   * Liczba wszystkich punktów
   */
  const totalPoints = resolvedPoints.length;

  /**
   * Liczba odwiedzonych punktów – 1:1 jak wcześniej
   */
  const donePoints = useMemo(
    () => resolvedPoints.filter((p) => visitedIds.has(p.id)).length,
    [resolvedPoints, visitedIds]
  );

  return {
    resolvedPoints,
    routeCoordinates,
    totalPoints,
    donePoints,
  };
}

export default useResolvedRoute;
