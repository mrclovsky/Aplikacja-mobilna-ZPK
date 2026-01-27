export type PointType = "physical" | "virtual";

export interface Point {
  id: string;
  type: PointType;
  radius: number;
  lat: number;
  lng: number;
  qr?: string;
}

export interface PointRef {
  pointId: string;
  order?: number;
  radiusOverride?: number;
}

export interface Route {
  name: string;
  description?: string;
  lengthKm?: number;
  defaultPoints?: number;
  pointRefs: PointRef[];
}

export interface DataFile {
  version: number;
  points: Point[];
  suggestedRoutes: Route[];
  myRoutes?: Route[];
}

export interface Achievement {
  id: string;
  name: string;
  date: string;
  time: string;
  length: number;
  points: number;
  maxPoints: number;
}
