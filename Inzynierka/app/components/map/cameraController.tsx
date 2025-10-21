import { MutableRefObject } from "react";
import { Dimensions, Platform } from "react-native";
import MapView, { Camera, LatLng, Region } from "react-native-maps";

/* — Parametry jak wcześniej — */
const SMOOTH_ALPHA = 0.15;
const HEADING_MIN_INTERVAL = 250;
const HEADING_ANIM_DURATION = 300;
const NAV_PITCH = 30;

const TRACKING_ZOOM = 18;
const USER_SCREEN_FRACTION_FROM_TOP = 0.65;

const CENTER_TICK_MS = 250;
const CENTER_TOLERANCE_M = 3.5;

const START_CENTER_MS = 420;
const START_ZOOM_MS   = 420;
const START_ROTATE_MS = 360;
const START_PITCH_MS  = 360;
const FINAL_OFFSET_MS = 220;

const TOGGLE_CENTER_MS = 260;
const TOGGLE_ZOOM_MS   = 300;
const TOGGLE_ROTATE_MS = 260;
const TOGGLE_FINAL_MS  = 200;

/* — Drobna histereza na heading, żeby wyciąć mikrodrgania — */
const HEADING_EPS = 0.75; // stopnie

export type CameraController = {
  runStartSequence(): Promise<void>;
  runEnterTrackingSequence(): Promise<void>;
  runStopReset(): Promise<void>;
  onPositionUpdate(opts: { navigationActive: boolean }): Promise<void>;
  onHeadingSample(trueHeading: number): Promise<void>;
  onRegionChangeComplete(opts: { navigationActive: boolean; trackingMode: boolean }): Promise<void>;
};

type Deps = {
  mapRef: MutableRefObject<MapView | null>;
  trackingModeRef: MutableRefObject<boolean>;
  userLocationRef: MutableRefObject<{ lat: number; lng: number } | null>;
  headingRef: MutableRefObject<number>;
  setHeading: (h: number) => void; // synchronizuje stan + ref w mapScreen
};

export function createCameraController({
  mapRef,
  trackingModeRef,
  userLocationRef,
  headingRef,
  setHeading,
}: Deps): CameraController {
  // wewnętrzne „refy”
  const smoothedHeadingRef = ref<number | null>(null);
  const latestHeadingRef   = ref<number>(0);
  const lastAppliedHeadingRef = ref<number>(0); // do histerezy
  const desiredPitchRef    = ref<number>(0);

  const isProgrammaticChangeRef = ref<boolean>(false);
  const isAnimatingRef          = ref<boolean>(false);
  const headingAnimEnabledRef   = ref<boolean>(false);

  const suppressAutoCenterUntilRef = ref<number>(0);
  const lastHeadingAnimTsRef       = ref<number>(0);
  const lastCenterTsRef            = ref<number>(0);

  /* helpers */
  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

  const armProgrammaticGuard = (ms: number) => {
    isProgrammaticChangeRef.current = true;
    setTimeout(() => (isProgrammaticChangeRef.current = false), ms + 40);
  };

  const runAnim = async (fn: () => void, duration: number) => {
    armProgrammaticGuard(duration);
    fn();
    await sleep(duration + 40);
  };

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

  const metersPerPixelAtLatZoom = (lat: number, zoom: number) => {
    const EARTH_CIRCUMFERENCE = 40075016.686;
    const latRad = (lat * Math.PI) / 180;
    return (Math.cos(latRad) * EARTH_CIRCUMFERENCE) / (256 * Math.pow(2, zoom));
  };

  const destinationPoint = (lat: number, lng: number, bearingDeg: number, distanceM: number): LatLng => {
    const R = 6371000;
    const brng = (bearingDeg * Math.PI) / 180;
    const φ1 = (lat * Math.PI) / 180;
    const λ1 = (lng * Math.PI) / 180;
    const δ = distanceM / R;
    const sinφ2 = Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(brng);
    const φ2 = Math.asin(sinφ2);
    const y = Math.sin(brng) * Math.sin(δ) * Math.cos(φ1);
    const x = Math.cos(δ) - Math.sin(φ1) * sinφ2;
    const λ2 = λ1 + Math.atan2(y, x);
    return { latitude: (φ2 * 180) / Math.PI, longitude: (((λ2 * 180) / Math.PI + 540) % 360) - 180 };
  };

  const regionForZoom = (lat: number, lng: number, zoom: number): Region => {
    const { width, height } = Dimensions.get("window");
    const degreesPerPixel = 360 / (256 * Math.pow(2, zoom));
    return {
      latitude: lat,
      longitude: lng,
      latitudeDelta: degreesPerPixel * height,
      longitudeDelta: degreesPerPixel * width,
    };
  };

  const computeOffsetCenter = (uLat: number, uLng: number, bearingDeg: number, zoom: number): LatLng => {
    const { height } = Dimensions.get("window");
    const dyPx = (USER_SCREEN_FRACTION_FROM_TOP - 0.5) * height;
    const offsetMeters = dyPx * metersPerPixelAtLatZoom(uLat, zoom);
    return destinationPoint(uLat, uLng, bearingDeg, offsetMeters);
  };

  const smoothHeading = (prev: number, target: number, alpha: number) =>
    (prev + deltaAngle(target, prev) * alpha + 360) % 360;

  function deltaAngle(to: number, from: number) {
    return (to - from + 540) % 360 - 180;
  }

  /* pojedyncze kroki */
  const centerOnUser = async ({
    duration = 260,
    includeHeading = true,
    includePitch = true,
    useOffset = false,
    force = false,
  }: {
    duration?: number;
    includeHeading?: boolean;
    includePitch?: boolean;
    useOffset?: boolean;
    force?: boolean;
  } = {}) => {
    const map = mapRef.current;
    const loc = userLocationRef.current;
    if (!map || !loc) return;

    const camNow = await map.getCamera();
    const currentZoom = (camNow as any)?.zoom ?? 17;

    const targetHeading = latestHeadingRef.current || headingRef.current || (camNow as any)?.heading || 0;

    const targetCenter: LatLng =
      useOffset && trackingModeRef.current
        ? computeOffsetCenter(loc.lat, loc.lng, targetHeading, currentZoom)
        : { latitude: loc.lat, longitude: loc.lng };

    const currentCenter: LatLng =
      (camNow as any)?.center ?? { latitude: loc.lat, longitude: loc.lng };

    const dist = distanceMeters(
      currentCenter.latitude,
      currentCenter.longitude,
      targetCenter.latitude,
      targetCenter.longitude
    );
    if (!force && dist <= CENTER_TOLERANCE_M) return;

    const payload: Partial<Camera> = {
      center: targetCenter,
      ...(includeHeading ? { heading: targetHeading } : {}),
      ...(includePitch ? { pitch: desiredPitchRef.current ?? (camNow as any)?.pitch ?? 0 } : {}),
    };

    await runAnim(() => {
      map.animateCamera(payload as Camera, { duration });
    }, duration);

    lastCenterTsRef.current = Date.now();
  };

  const animateHeading = async (duration = START_ROTATE_MS) => {
    const map = mapRef.current;
    if (!map) return;
    const cam = await map.getCamera();
    const targetHeading = latestHeadingRef.current || headingRef.current || (cam as any)?.heading || 0;
    await runAnim(() => {
      map.animateCamera({ heading: targetHeading } as Camera, { duration });
    }, duration);
  };

  const animatePitch = async (pitch: number, duration = START_PITCH_MS) => {
    const map = mapRef.current;
    if (!map) return;
    desiredPitchRef.current = pitch;
    await runAnim(() => {
      map.animateCamera({ pitch } as Camera, { duration });
    }, duration);
  };

  const animateZoomToTrackingRegion = async (duration: number) => {
    const map = mapRef.current;
    const loc = userLocationRef.current;
    if (!map || !loc) return;
    const region = regionForZoom(loc.lat, loc.lng, TRACKING_ZOOM);
    await runAnim(() => {
      map.animateToRegion(region, duration);
    }, duration);
  };

  const finalOffsetCenter = async (duration = FINAL_OFFSET_MS) => {
    const map = mapRef.current;
    const loc = userLocationRef.current;
    if (!map || !loc) return;

    const cam = await map.getCamera();
    const targetHeading = latestHeadingRef.current || headingRef.current || (cam as any)?.heading || 0;
    const targetCenter = computeOffsetCenter(loc.lat, loc.lng, targetHeading, TRACKING_ZOOM);

    await runAnim(() => {
      map.animateCamera(
        {
          center: targetCenter,
          heading: targetHeading,
          pitch: desiredPitchRef.current,
          ...(Platform.OS === "android" ? { zoom: TRACKING_ZOOM } : {}),
        } as Camera,
        { duration }
      );
    }, duration);
  };

  /* sekwencje */
  const runStartSequence = async () => {
    if (!mapRef.current || !userLocationRef.current) return;

    isAnimatingRef.current = true;
    headingAnimEnabledRef.current = false;

    const totalMs =
      START_CENTER_MS + START_ZOOM_MS + START_ROTATE_MS + START_PITCH_MS + FINAL_OFFSET_MS + 140;
    suppressAutoCenterUntilRef.current = Date.now() + totalMs;

    await centerOnUser({
      duration: START_CENTER_MS,
      includeHeading: false,
      includePitch: false,
      useOffset: false,
      force: true,
    });

    await animateZoomToTrackingRegion(START_ZOOM_MS);
    await animateHeading(START_ROTATE_MS);
    await animatePitch(NAV_PITCH, START_PITCH_MS);
    await finalOffsetCenter(FINAL_OFFSET_MS);

    headingAnimEnabledRef.current = true;
    isAnimatingRef.current = false;
    suppressAutoCenterUntilRef.current = 0;
  };

  const runEnterTrackingSequence = async () => {
    if (!mapRef.current || !userLocationRef.current) return;

    isAnimatingRef.current = true;
    const prev = headingAnimEnabledRef.current;
    headingAnimEnabledRef.current = false;

    await centerOnUser({
      duration: TOGGLE_CENTER_MS,
      includeHeading: true,
      includePitch: true,
      useOffset: false,
      force: true,
    });

    await animateZoomToTrackingRegion(TOGGLE_ZOOM_MS);
    await animateHeading(TOGGLE_ROTATE_MS);
    await finalOffsetCenter(TOGGLE_FINAL_MS);

    headingAnimEnabledRef.current = prev;
    isAnimatingRef.current = false;
  };

  /* eventy z mapScreen */
  const onPositionUpdate = async ({ navigationActive }: { navigationActive: boolean }) => {
    if (
      !navigationActive ||
      !trackingModeRef.current ||
      isAnimatingRef.current ||
      Date.now() < (suppressAutoCenterUntilRef.current || 0)
    ) {
      return;
    }
    const now = Date.now();
    if (now - (lastCenterTsRef.current || 0) >= CENTER_TICK_MS) {
      // można czekać – pozycja rzadko (900 ms)
      await centerOnUser({
        duration: 240,
        includeHeading: false,
        includePitch: true,
        useOffset: true,
      });
    }
  };

  const onHeadingSample = async (trueHeading: number) => {
    if (isAnimatingRef.current) return;

    if (smoothedHeadingRef.current === null) smoothedHeadingRef.current = trueHeading;
    const prev = smoothedHeadingRef.current!;
    const next = smoothHeading(prev, trueHeading, SMOOTH_ALPHA);

    smoothedHeadingRef.current = next;
    latestHeadingRef.current = next;
    setHeading(next);

    // histereza — nie animuj dla mikrozmian
    const deltaFromApplied = Math.abs(deltaAngle(next, lastAppliedHeadingRef.current));
    if (deltaFromApplied < HEADING_EPS) return;

    const now = Date.now();
    if (
      headingAnimEnabledRef.current &&
      mapRef.current &&
      now - (lastHeadingAnimTsRef.current || 0) >= HEADING_MIN_INTERVAL
    ) {
      lastHeadingAnimTsRef.current = now;
      lastAppliedHeadingRef.current = next;

      if (trackingModeRef.current) {
        // fire-and-forget: nie blokujemy kolejnych próbek
        // (ew. błędy łapiemy „w próżni”, żeby nie generowały warningów)
        centerOnUser({
          duration: HEADING_ANIM_DURATION,
          includeHeading: true,
          includePitch: true,
          useOffset: true,
        }).catch(() => {});
      } else {
        // również fire-and-forget
        (async () => {
          await runAnim(() => {
            mapRef.current!.animateCamera(
              { heading: next } as Camera,
              { duration: HEADING_ANIM_DURATION }
            );
          }, HEADING_ANIM_DURATION);
        })().catch(() => {});
      }
    }
  };

  const onRegionChangeComplete = async ({
    navigationActive,
    trackingMode,
  }: {
    navigationActive: boolean;
    trackingMode: boolean;
  }) => {
    if (!navigationActive || !mapRef.current) return;
    if (isProgrammaticChangeRef.current || isAnimatingRef.current) return;
    if (!trackingMode) return;
    await centerOnUser({ duration: 160, includeHeading: true, includePitch: true, useOffset: true });
  };

  const runStopReset = async () => {
    const map = mapRef.current;
    const loc = userLocationRef.current;
    if (!map || !loc) return;

    await runAnim(() => {
      map.animateCamera(
        {
          center: { latitude: loc.lat, longitude: loc.lng },
          heading: 0,
          pitch: 0,
          zoom: 16,
        } as Camera,
        { duration: 800 }
      );
    }, 800);

    desiredPitchRef.current = 0;
    smoothedHeadingRef.current = null;
    latestHeadingRef.current = 0;
    lastAppliedHeadingRef.current = 0;
    headingAnimEnabledRef.current = false;
    lastCenterTsRef.current = 0;
    suppressAutoCenterUntilRef.current = 0;
    lastHeadingAnimTsRef.current = 0;
  };

  return {
    runStartSequence,
    runEnterTrackingSequence,
    runStopReset,
    onPositionUpdate,
    onHeadingSample,
    onRegionChangeComplete,
  };
}

function ref<T>(initial: T): { current: T } {
  return { current: initial };
}
