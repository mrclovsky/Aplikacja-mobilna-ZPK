import React, { useMemo } from "react";
import { Image } from "react-native";
import MapView, { Overlay, Marker } from "react-native-maps";
import proj4 from "proj4";
import chRegionData from "../../../assets/data/Chylonia_region.json";
import grRegionData from "../../../assets/data/Grabowek_region.json";

proj4.defs(
  "EPSG:2180",
  "+proj=tmerc +lat_0=0 +lon_0=19 +k=0.9993 +x_0=500000 +y_0=-5300000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs"
);

const MANUAL_SHIFT_METERS: number = -8;

type CornerSetProjected = {
  tl: { x: number; y: number };
  tr: { x: number; y: number };
  br: { x: number; y: number };
  bl: { x: number; y: number };
};

function computeProjCornersFromWorld(
  world: { A: number; B: number; D: number; E: number; C: number; F: number },
  width: number,
  height: number
): CornerSetProjected {
  const { A, B, D, E, C, F } = world;
  const calc = (i: number, j: number) => {
    const x = A * i + B * j + C;
    const y = D * i + E * j + F;
    return { x, y };
  };

  const tl = calc(0, 0);
  const tr = calc(Math.max(0, width - 1), 0);
  const br = calc(Math.max(0, width - 1), Math.max(0, height - 1));
  const bl = calc(0, Math.max(0, height - 1));

  return { tl, tr, br, bl };
}

function centroidOfCorners(c: CornerSetProjected) {
  return {
    x: (c.tl.x + c.tr.x + c.br.x + c.bl.x) / 4,
    y: (c.tl.y + c.tr.y + c.br.y + c.bl.y) / 4,
  };
}

function applyOffsetToCorners(c: CornerSetProjected, dx: number, dy: number): CornerSetProjected {
  return {
    tl: { x: c.tl.x + dx, y: c.tl.y + dy },
    tr: { x: c.tr.x + dx, y: c.tr.y + dy },
    br: { x: c.br.x + dx, y: c.br.y + dy },
    bl: { x: c.bl.x + dx, y: c.bl.y + dy },
  };
}

function projCornersToWgs84(c: CornerSetProjected) {
  const tlp = proj4("EPSG:2180", "WGS84", [c.tl.x, c.tl.y]);
  const trp = proj4("EPSG:2180", "WGS84", [c.tr.x, c.tr.y]);
  const blp = proj4("EPSG:2180", "WGS84", [c.bl.x, c.bl.y]);
  const brp = proj4("EPSG:2180", "WGS84", [c.br.x, c.br.y]);

  const tl = { latitude: tlp[1], longitude: tlp[0] };
  const tr = { latitude: trp[1], longitude: trp[0] };
  const bl = { latitude: blp[1], longitude: blp[0] };
  const br = { latitude: brp[1], longitude: brp[0] };

  const lats = [tl.latitude, tr.latitude, bl.latitude, br.latitude];
  const lngs = [tl.longitude, tr.longitude, bl.longitude, br.longitude];
  const sw = { latitude: Math.min(...lats), longitude: Math.min(...lngs) };
  const ne = { latitude: Math.max(...lats), longitude: Math.max(...lngs) };

  return { tl, tr, bl, br, sw, ne };
}

function computeAffineTransform(fromCorners: CornerSetProjected, toCorners: CornerSetProjected) {
  const fromPts = [fromCorners.tl, fromCorners.tr, fromCorners.br, fromCorners.bl];
  const toPts = [toCorners.tl, toCorners.tr, toCorners.br, toCorners.bl];

  const A: number[][] = [];
  const B: number[] = [];

  for (let i = 0; i < 4; i++) {
    const f = fromPts[i];
    const t = toPts[i];
    A.push([f.x, f.y, 0, 0, 1, 0]);
    B.push(t.x);
    A.push([0, 0, f.x, f.y, 0, 1]);
    B.push(t.y);
  }

  const ATA = Array.from({ length: 6 }, () => Array(6).fill(0));
  const ATB = Array(6).fill(0);

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 6; j++) {
      for (let k = 0; k < 6; k++) {
        ATA[j][k] += A[i][j] * A[i][k];
      }
      ATB[j] += A[i][j] * B[i];
    }
  }

  function invertMatrix(mat: number[][]) {
    const n = mat.length;
    const m = mat.map((r) => r.slice());
    const inv = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
    for (let i = 0; i < n; i++) {
      let pivot = i;
      for (let r = i; r < n; r++) {
        if (Math.abs(m[r][i]) > Math.abs(m[pivot][i])) pivot = r;
      }
      if (Math.abs(m[pivot][i]) < 1e-12) return null;
      [m[i], m[pivot]] = [m[pivot], m[i]];
      [inv[i], inv[pivot]] = [inv[pivot], inv[i]];
      const div = m[i][i];
      for (let c = 0; c < n; c++) {
        m[i][c] /= div;
        inv[i][c] /= div;
      }
      for (let r = 0; r < n; r++) {
        if (r === i) continue;
        const factor = m[r][i];
        if (Math.abs(factor) < 1e-15) continue;
        for (let c = 0; c < n; c++) {
          m[r][c] -= factor * m[i][c];
          inv[r][c] -= factor * inv[i][c];
        }
      }
    }
    return inv;
  }

  const invATA = invertMatrix(ATA);
  if (!invATA) return null;

  const params = Array(6).fill(0);
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      params[i] += invATA[i][j] * ATB[j];
    }
  }

  const [a, b, c, d, tx, ty] = params;
  return {
    apply: (p: { x: number; y: number }) => ({ x: a * p.x + b * p.y + tx, y: c * p.x + d * p.y + ty }),
  };
}

function extractWorldVals(worldSpec: any) {
  if (!worldSpec) return null;
  const vals = {
    A: Number(worldSpec.A ?? (Array.isArray(worldSpec) ? worldSpec[0] : undefined)),
    B: Number(worldSpec.B ?? (Array.isArray(worldSpec) ? worldSpec[2] : undefined)),
    D: Number(worldSpec.D ?? (Array.isArray(worldSpec) ? worldSpec[1] : undefined)),
    E: Number(worldSpec.E ?? (Array.isArray(worldSpec) ? worldSpec[3] : undefined)),
    C: Number(worldSpec.C ?? (Array.isArray(worldSpec) ? worldSpec[4] : undefined)),
    F: Number(worldSpec.F ?? (Array.isArray(worldSpec) ? worldSpec[5] : undefined)),
  };
  if (Object.values(vals).some((v) => Number.isNaN(v))) return null;
  return vals;
}

const overlayImagesCH = [
  require("../../../assets/maps/Chylonia/CH_mapa_1.jpg"),
  require("../../../assets/maps/Chylonia/CH_mapa_2.jpg"),
  require("../../../assets/maps/Chylonia/CH_mapa_3.jpg"),
  require("../../../assets/maps/Chylonia/CH_mapa_4.jpg"),
  require("../../../assets/maps/Chylonia/CH_mapa_5.jpg"),
  require("../../../assets/maps/Chylonia/CH_mapa_6.jpg"),
];

const overlayImagesGR = [
  require("../../../assets/maps/Grabowek/GR_mapa_1.jpg"),
  require("../../../assets/maps/Grabowek/GR_mapa_2.jpg"),
  require("../../../assets/maps/Grabowek/GR_mapa_3.jpg"),
  require("../../../assets/maps/Grabowek/GR_mapa_4.jpg"),
  require("../../../assets/maps/Grabowek/GR_mapa_5.jpg"),
  require("../../../assets/maps/Grabowek/GR_mapa_6.jpg"),
];

const makeCornerSetFromJson = (arr: any[]): CornerSetProjected | null => {
  if (!arr || arr.length < 4) return null;
  const tl = { x: Number(arr[0].x), y: Number(arr[0].y) };
  const tr = { x: Number(arr[1].x), y: Number(arr[1].y) };
  const br = { x: Number(arr[2].x), y: Number(arr[2].y) };
  const bl = { x: Number(arr[3].x), y: Number(arr[3].y) };
  if ([tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y].some((v) => Number.isNaN(v))) return null;
  return { tl, tr, br, bl };
};

export default function MapOverlayLayer({ overlayIndex, hideCornerMarkers }: { overlayIndex: number, hideCornerMarkers?: boolean;}) {
  const chRegion = chRegionData ?? null;
  const grRegion = grRegionData ?? null;

  const chCornersProjected = useMemo(() => {
    try {
      if (!chRegion || !Array.isArray(chRegion.points)) return null;
      return makeCornerSetFromJson(chRegion.points);
    } catch (e) {
      console.warn("Error creating chCornersProjected:", e);
      return null;
    }
  }, [chRegion]);

  const grCornersProjected = useMemo(() => {
    try {
      if (!grRegion || !Array.isArray(grRegion.points)) return null;
      return makeCornerSetFromJson(grRegion.points);
    } catch (e) {
      console.warn("Error creating grCornersProjected:", e);
      return null;
    }
  }, [grRegion]);

  const chCornersWgs84All = useMemo(() => {
    try {
      if (overlayIndex > 0 && chRegion?.world) {
        const imgReq = overlayImagesCH[overlayIndex - 1];
        const worldVals = extractWorldVals(chRegion.world);
        if (worldVals) {
          const src = Image.resolveAssetSource(imgReq);
          const width = src?.width ?? 0;
          const height = src?.height ?? 0;
          if (width > 0 && height > 0) {
            let projCorners = computeProjCornersFromWorld(worldVals, width, height);

            if (chCornersProjected) {
              const affine = computeAffineTransform(projCorners, chCornersProjected);
              if (affine) {
                projCorners = {
                  tl: affine.apply(projCorners.tl),
                  tr: affine.apply(projCorners.tr),
                  br: affine.apply(projCorners.br),
                  bl: affine.apply(projCorners.bl),
                };
              } else {
                const centroidWorld = centroidOfCorners(projCorners);
                const centroidPoints = centroidOfCorners(chCornersProjected);
                const dx = centroidPoints.x - centroidWorld.x;
                const dy = centroidPoints.y - centroidWorld.y;
                projCorners = applyOffsetToCorners(projCorners, dx, dy);
              }
            }

            if (MANUAL_SHIFT_METERS !== 0) {
              projCorners = applyOffsetToCorners(projCorners, 0, -MANUAL_SHIFT_METERS);
            }

            return projCornersToWgs84(projCorners);
          }
        }
      }

      if (!chCornersProjected) return null;
      return projCornersToWgs84(chCornersProjected);
    } catch (e) {
      console.warn("Konwersja Chylonia nieudana:", e);
      return null;
    }
  }, [chCornersProjected, chRegion, overlayIndex]);

  const grCornersWgs84All = useMemo(() => {
    try {
      if (overlayIndex > 0 && grRegion?.world) {
        const imgReq = overlayImagesGR[overlayIndex - 1];
        const worldVals = extractWorldVals(grRegion.world);
        if (worldVals) {
          const src = Image.resolveAssetSource(imgReq);
          const width = src?.width ?? 0;
          const height = src?.height ?? 0;
          if (width > 0 && height > 0) {
            let projCorners = computeProjCornersFromWorld(worldVals, width, height);

            if (grCornersProjected) {
              const affine = computeAffineTransform(projCorners, grCornersProjected);
              if (affine) {
                projCorners = {
                  tl: affine.apply(projCorners.tl),
                  tr: affine.apply(projCorners.tr),
                  br: affine.apply(projCorners.br),
                  bl: affine.apply(projCorners.bl),
                };
              } else {
                const centroidWorld = centroidOfCorners(projCorners);
                const centroidPoints = centroidOfCorners(grCornersProjected);
                const dx = centroidPoints.x - centroidWorld.x;
                const dy = centroidPoints.y - centroidWorld.y;
                projCorners = applyOffsetToCorners(projCorners, dx, dy);
              }
            }

            if (MANUAL_SHIFT_METERS !== 0) {
              projCorners = applyOffsetToCorners(projCorners, 0, MANUAL_SHIFT_METERS);
            }

            return projCornersToWgs84(projCorners);
          }
        }
      }

      if (!grCornersProjected) return null;
      return projCornersToWgs84(grCornersProjected);
    } catch (e) {
      console.warn("Konwersja Grabowek nieudana:", e);
      return null;
    }
  }, [grCornersProjected, grRegion, overlayIndex]);

  const mapCornersAnyAvailable = !!chCornersWgs84All || !!grCornersWgs84All;
  if (!mapCornersAnyAvailable) return null;

  return (
    <>
      {overlayIndex > 0 && (
        <>
          {chCornersWgs84All && overlayImagesCH[overlayIndex - 1] && (
            <Overlay
              bounds={[
                [chCornersWgs84All.sw.latitude, chCornersWgs84All.sw.longitude],
                [chCornersWgs84All.ne.latitude, chCornersWgs84All.ne.longitude],
              ]}
              image={overlayImagesCH[overlayIndex - 1]}
              tappable={false}
            />
          )}

          {grCornersWgs84All && overlayImagesGR[overlayIndex - 1] && (
            <Overlay
              bounds={[
                [grCornersWgs84All.sw.latitude, grCornersWgs84All.sw.longitude],
                [grCornersWgs84All.ne.latitude, grCornersWgs84All.ne.longitude],
              ]}
              image={overlayImagesGR[overlayIndex - 1]}
              tappable={false}
            />
          )}
        </>
      )}

      {!hideCornerMarkers && chCornersWgs84All && (
        <>
          <Marker coordinate={chCornersWgs84All.tl} key="ch-corner-tl" />
          <Marker coordinate={chCornersWgs84All.tr} key="ch-corner-tr" />
          <Marker coordinate={chCornersWgs84All.bl} key="ch-corner-bl" />
          <Marker coordinate={chCornersWgs84All.br} key="ch-corner-br" />
        </>
      )}

      {!hideCornerMarkers && grCornersWgs84All && (
        <>
          <Marker coordinate={grCornersWgs84All.tl} key="gr-corner-tl" />
          <Marker coordinate={grCornersWgs84All.tr} key="gr-corner-tr" />
          <Marker coordinate={grCornersWgs84All.bl} key="gr-corner-bl" />
          <Marker coordinate={grCornersWgs84All.br} key="gr-corner-br" />
        </>
      )}
    </>
  );
}
