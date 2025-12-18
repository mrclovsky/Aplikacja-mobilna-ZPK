export type PointType = "physical" | "virtual";

export interface Point {
  id: string;
  type: PointType;
  radius: number;   // metry
  lat: number;
  lng: number;
  qr?: string;      // tylko dla physical
}

export interface PointRef {
  pointId: string;
  order?: number;           // opcjonalna kolejność w trasie
  radiusOverride?: number;  // opcjonalne nadpisanie promienia dla tej trasy
}

export interface Route {
  name: string;             // pełni rolę ID trasy
  description?: string;
  lengthKm?: number;
  defaultPoints?: number;   // informacyjne
  pointRefs: PointRef[];
}

export interface DataFile {
  version: number;
  points: Point[];
  suggestedRoutes: Route[];
  myRoutes?: Route[];
}

// (zostawiamy Achievement, bo używasz go w innych miejscach)
export interface Achievement {
  id: string;
  name: string;
  date: string;
  time: string;
  length: number;
  points: number;
  maxPoints: number;
}
