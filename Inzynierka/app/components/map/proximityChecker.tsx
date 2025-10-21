// app/components/map/proximity.ts
// Kontroler odpowiedzialny za wykrywanie bliskości punktów,
// wystawianie banerów i oznaczanie zaliczeń w visitedStore.
// Zachowuje tę samą logikę, co w dotychczasowym mapScreen.

import { Point } from "../../../assets/types";
import { visitedStore } from "../../stores/visitedPointsStore";

type ProximityCallbacks = {
  // Baner jednorazowy z czasem trwania (np. „Zaliczyłeś punkt”, 5s)
  showBanner: (text: string, durationMs?: number) => void;
  // Komunikat „stały”, ustawiany tylko gdy nie ma aktywnego banera czasowego
  // i gdy treść różni się od aktualnej (np. „Teraz zeskanuj kod QR”).
  showPersistentMessageIfNone: (text: string) => void;
  // Natychmiastowe wyczyszczenie komunikatu + timera.
  clearMessage: () => void;
};

export type ProximityChecker = {
  // Czyści wewnętrzne Sety anty-spamowe (wołaj przy starcie sesji/zmianie trasy/STOP).
  reset(): void;
  // Główne sprawdzenie bliskości — wołaj na każdym odczycie pozycji.
  check(args: {
    lat: number;
    lng: number;
    points: Point[];
    routeName?: string;
  }): void;
};

export function createProximityChecker(cb: ProximityCallbacks): ProximityChecker {
  // „Anty-spam” — żeby nie powielać tych samych akcji w pętli życia sesji
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

  const check: ProximityChecker["check"] = ({ lat, lng, points, routeName }) => {
    let anyInRange = false;

    for (const p of points) {
      const d = distanceMeters(lat, lng, p.lat, p.lng);
      // Utrzymujemy dotychczasową logikę: porównanie wprost do p.radius
      if (d <= p.radius) {
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
            // Utrzymanie warunku: tylko gdy nie ma aktywnego timera i nie dublujemy treści
            cb.showPersistentMessageIfNone("Teraz zeskanuj kod QR");
          }
        }
        break; // pierwszy trafiony punkt wystarcza — tak jak wcześniej
      }
    }

    // Po wyjściu ze stref — czyścimy komunikat i sety (jak wcześniej)
    if (!anyInRange) {
      cb.clearMessage();
      shownVirtual.clear();
      shownPhysical.clear();
    }
  };

  return { reset, check };
}
