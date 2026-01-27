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

export function useResolvedRoute({
  data,
  selectedRoute,
  visitedIds,
}: UseResolvedRouteParams): UseResolvedRouteResult {
  const pointsById = useMemo(
    () => new Map<string, Point>(data.points.map((p) => [p.id, p])),
    [data.points]
  );

  const resolvedPoints = useMemo(() => {
    if (!selectedRoute) return [] as Point[];

    return selectedRoute.pointRefs
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((ref) => pointsById.get(ref.pointId))
      .filter((p): p is Point => !!p);
  }, [selectedRoute, pointsById]);

  const routeCoordinates = useMemo(
    () => resolvedPoints.map((p) => ({ latitude: p.lat, longitude: p.lng })),
    [resolvedPoints]
  );

  const totalPoints = resolvedPoints.length;

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
