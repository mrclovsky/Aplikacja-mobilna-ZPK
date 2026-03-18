import { MutableRefObject } from "react";
import { Dimensions, Platform } from "react-native";
import MapView, { Camera, LatLng, Region } from "react-native-maps";

const NAV_PITCH = 30; 
const TRACKING_ZOOM = 18; 
const TRACKING_ALTITUDE = 350; 
const USER_SCREEN_FRACTION_FROM_TOP = 0.55;

const UPDATE_INTERVAL_MS = Platform.OS === "android" ? 1500 : 500; 
const HEADING_TOLERANCE_DEG = 5;

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
  setHeading: (h: number) => void;
};

export function createCameraController({
  mapRef,
  trackingModeRef,
  userLocationRef,
  headingRef,
  setHeading,
}: Deps): CameraController {
  const lastAppliedHeadingRef = ref<number>(0);
  const isAnimatingRef = ref<boolean>(false);
  const lastUpdateTsRef = ref<number>(0);

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

  const computeOffsetCenter = (uLat: number, uLng: number, bearingDeg: number, zoom: number): LatLng => {
    const { height } = Dimensions.get("window");
    const dyPx = (USER_SCREEN_FRACTION_FROM_TOP - 0.5) * height;
    const offsetMeters = dyPx * metersPerPixelAtLatZoom(uLat, zoom);
    return destinationPoint(uLat, uLng, bearingDeg, offsetMeters);
  };

  function deltaAngle(to: number, from: number) {
    return (to - from + 540) % 360 - 180;
  }

  const updateCameraView = (heading: number, duration: number) => {
    const map = mapRef.current;
    const loc = userLocationRef.current;
    if (!map || !loc) return;

    const targetCenter = computeOffsetCenter(loc.lat, loc.lng, heading, TRACKING_ZOOM);

    map.animateCamera(
      {
        center: targetCenter,
        heading: heading,
        pitch: NAV_PITCH,
        zoom: TRACKING_ZOOM,
        altitude: TRACKING_ALTITUDE,
      },
      { duration }
    );
    
    lastUpdateTsRef.current = Date.now();
    lastAppliedHeadingRef.current = heading;
  };

  const runStartSequence = async () => {
    isAnimatingRef.current = true;
    const initialHeading = headingRef.current || 0;
    
    updateCameraView(initialHeading, 1500);
    
    setTimeout(() => {
        isAnimatingRef.current = false;
    }, 1500);
  };

  const runEnterTrackingSequence = async () => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    
    const currentHeading = headingRef.current || 0;
    updateCameraView(currentHeading, 800);
    
    setTimeout(() => {
        isAnimatingRef.current = false;
    }, 800);
  };

  const onPositionUpdate = async ({ navigationActive }: { navigationActive: boolean }) => {
    if (!navigationActive || !trackingModeRef.current || isAnimatingRef.current) return;
    
    const now = Date.now();
    if (now - lastUpdateTsRef.current >= UPDATE_INTERVAL_MS) {
        updateCameraView(lastAppliedHeadingRef.current, UPDATE_INTERVAL_MS);
    }
  };

  const onHeadingSample = async (trueHeading: number) => {
    if (isAnimatingRef.current || !trackingModeRef.current) {
        setHeading(trueHeading);
        return;
    }

    setHeading(trueHeading);

    const delta = Math.abs(deltaAngle(trueHeading, lastAppliedHeadingRef.current));
    
    const now = Date.now();
    if (delta > HEADING_TOLERANCE_DEG && (now - lastUpdateTsRef.current >= UPDATE_INTERVAL_MS)) {
        updateCameraView(trueHeading, UPDATE_INTERVAL_MS);
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
    
    if (isAnimatingRef.current) return;
    
    if (trackingMode) {
      updateCameraView(lastAppliedHeadingRef.current, 800);
    }
  };

  const runStopReset = async () => {
    const map = mapRef.current;
    const loc = userLocationRef.current;
    if (!map || !loc) return;

    map.animateCamera(
      {
        center: { latitude: loc.lat, longitude: loc.lng },
        heading: 0,
        pitch: 0,
        zoom: 16,
        altitude: 1200,
      },
      { duration: 800 }
    );

    lastAppliedHeadingRef.current = 0;
    lastUpdateTsRef.current = 0;
    isAnimatingRef.current = false;
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
