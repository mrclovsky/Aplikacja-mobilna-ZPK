// app/hooks/useSaveAchievement.ts
// Hook odpowiedzialny za dopisywanie osiągnięć do pliku JSON w katalogu dokumentów.
// Zakres:
// - Wyznaczenie pełnej liczby punktów trasy (z route.pointRefs lub defaultPoints).
// - Formatowanie czasu (mm:ss), daty (YYYY-MM-DD) i dystansu (km, 2 miejsca).
// - Utworzenie pliku, jeśli nie istnieje, oraz bezpieczny odczyt/zapis z tolerancją na uszkodzony JSON.
// - Dopisanie nowego osiągnięcia na koniec istniejącej listy.

import { File, Paths } from "expo-file-system";
import { Achievement, Route } from "../../assets/types";

const STORE = new File(Paths.document, "achievementsData.json");

/* ===== Pomocnicze ===== */

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max));

const toDateStr = (d = new Date()) => d.toISOString().split("T")[0];

const toTimeStr = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const metersToKm2 = (meters: number) => {
  const km = meters / 1000;
  return Math.round(km * 100) / 100; // liczba z max 2 miejscami po przecinku
};

type StoreShape = { achievements: Achievement[] };

const ensureStore = async () => {
  if (!STORE.exists) {
    STORE.create();
    STORE.write(JSON.stringify({ achievements: [] }, null, 2), { encoding: "utf8" });
  }
};

const readStore = async (): Promise<StoreShape> => {
  try {
    const raw = await STORE.text();
    if (!raw?.trim()) return { achievements: [] };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.achievements)) return { achievements: parsed.achievements as Achievement[] };
    return { achievements: [] };
  } catch {
    // uszkodzony JSON lub błąd odczytu – traktuj jako pustą listę
    return { achievements: [] };
  }
};

const writeStore = async (data: StoreShape) => {
  STORE.write(JSON.stringify(data, null, 2), { encoding: "utf8" });
};

/* ===== Hook API ===== */

export const useSaveAchievement = () => {
  /**
   * Zapisuje osiągnięcie na podstawie metryk przejścia trasy.
   * @param route          trasa (format z pointRefs / defaultPoints)
   * @param elapsedTime    czas w sekundach
   * @param distance       dystans w metrach
   * @param achievedPoints liczba zaliczonych punktów
   * @param totalPoints    opcjonalnie pełna liczba punktów trasy; jeśli brak, wyliczana z route
   */
  const saveAchievement = async (
    route: Route,
    elapsedTime: number,
    distance: number,
    achievedPoints: number,
    totalPoints?: number
  ) => {
    if (!route) return;

    const computedTotal = totalPoints ?? (route.pointRefs?.length ?? route.defaultPoints ?? 0);

    const newAchievement: Achievement = {
      id: makeId(),
      name: route.name,
      date: toDateStr(),
      time: toTimeStr(elapsedTime),
      length: Number.isFinite(distance) ? metersToKm2(distance) : 0,
      points: clamp(achievedPoints ?? 0, 0, computedTotal),
      maxPoints: computedTotal,
    };

    try {
      await ensureStore();
      const store = await readStore();
      store.achievements.push(newAchievement);
      await writeStore(store);
      console.log("Zapisano nowe osiągnięcie:", newAchievement);
    } catch (err) {
      console.error("Błąd zapisu osiągnięcia:", err);
    }
  };

  return { saveAchievement };
};
