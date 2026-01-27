import { Point } from "../../../assets/types";
import { visitedStore } from "../../stores/visitedPointsStore";

type ProximityCallbacks = {
  showBanner: (text: string, durationMs?: number) => void;
  showPersistentMessageIfNone: (text: string) => void;
  clearMessage: () => void;
};

export type ProximityChecker = {
  reset(): void;
  check(args: {
    lat: number;
    lng: number;
    points: Point[];
    routeName?: string;
    distanceToPoint?: number;
  }): void;
};

export function createProximityChecker(cb: ProximityCallbacks): ProximityChecker {
  const shownVirtual = new Set<string>();
  const shownPhysical = new Set<string>();

  const distanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const reset = () => {
    shownVirtual.clear();
    shownPhysical.clear();
  };

  const check: ProximityChecker["check"] = ({ lat, lng, points, routeName, distanceToPoint = 10 }) => {
    let anyInRange = false;

    for (const p of points) {
      const d = distanceMeters(lat, lng, p.lat, p.lng);
      if (d <= distanceToPoint) {
        anyInRange = true;
        const alreadyVisited = visitedStore.has(routeName, p.id);

        if (p.type === "virtual") {
          if (!alreadyVisited) {
            visitedStore.add(routeName, p.id);
            if (!shownVirtual.has(p.id)) shownVirtual.add(p.id);
            cb.showBanner("Zaliczyłeś punkt", 5000);
          }
        } else {
          if (!alreadyVisited) {
            if (!shownPhysical.has(p.id)) shownPhysical.add(p.id);
            cb.showPersistentMessageIfNone("Teraz zeskanuj kod QR");
          }
        }
        break;
      }
    }

    if (!anyInRange) {
      cb.clearMessage();
      shownVirtual.clear();
      shownPhysical.clear();
    }
  };

  return { reset, check };
}
