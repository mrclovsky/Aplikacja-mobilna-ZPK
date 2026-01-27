import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Camera, CameraView } from "expo-camera";
import * as Location from "expo-location";
import Ionicons from "react-native-vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";

import type { DataFile, Point, Route } from "../../assets/types";
import { visitedStore } from "../stores/visitedPointsStore";
import { t } from "i18next";
import { useRoutesData } from "../hooks/useRoutesData";
import { useAppSettings } from "../hooks/useAppSettings";

type Validation = "idle" | "success" | "error";
type Phase = "idle" | "validating" | "done";

const THEME = {
  brand: "#004d00",
  text: "#fff",
  textMuted: "rgba(255,255,255,0.9)",
  scrim: "rgba(0,0,0,0.55)",
  scrimMask: "rgba(0,0,0,0.45)",
  ok: "#22c55e",
  err: "#ef4444",
  link: "#10b981",
};

const FOCUS_SIZE = 240;
const BORDER_RADIUS = 16;
const SCAN_ARM_MS = 600;
const SCAN_HOLD_MS = 250;
const SCAN_COOLDOWN_MS = 700;
const LOCATE_TIMEOUT_MS = 6000;
const LASTKNOWN_MAX_AGE_MS = 2 * 60 * 1000;
const PANEL_HEIGHT_IDLE = 70;
const PANEL_HEIGHT_EXPANDED = 130;
const PANEL_BOTTOM = 84;
const ACTIONS_HEIGHT = 48;
const VALIDATION_MIN_MS = 450;
const RETURN_TO_MAP_MS = 900;

export default function QRScanScreen() {
  const [hasPermission, setHasPermission] = useState<null | boolean>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [scanned, setScanned] = useState(false);
  const [lastData, setLastData] = useState<string | null>(null);
  const [validation, setValidation] = useState<Validation>("idle");
  const [matchedPoint, setMatchedPoint] = useState<Point | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { route: routeParam } = useLocalSearchParams<{ route?: string }>();
  const routeName = typeof routeParam === "string" && routeParam.trim() ? routeParam.trim() : undefined;
  const { data } = useRoutesData();
  const { distanceToPoint } = useAppSettings();

  const pointsByQr = useMemo(() => {
    const map = new Map<string, Point>();
    for (const p of (data.points as Point[])) {
      if (p.type === "physical" && p.qr) map.set(p.qr, p);
    }
    return map;
  }, [data.points]);

  const allowedPointIds = useMemo<Set<string> | null>(() => {
    if (!routeName) return null;
    const allRoutes: Route[] = [ ...(data.suggestedRoutes || []), ...(data.myRoutes || []) ];
    const r = allRoutes.find((rr) => rr.name === routeName);
    if (!r?.pointRefs?.length) return new Set<string>();
    return new Set(r.pointRefs.map((ref) => ref.pointId));
  }, [routeName, data.suggestedRoutes, data.myRoutes]);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const armedAtRef = useRef<number>(Date.now() + SCAN_ARM_MS);
  const lastAttemptAtRef = useRef<number>(0);
  const scannedRef = useRef<boolean>(false);
  const processingRef = useRef<boolean>(false);
  const scanTokenRef = useRef<number>(0);
  const returnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const candidateValRef = useRef<string | null>(null);
  const candidateSinceRef = useRef<number>(0);

  useEffect(() => { scannedRef.current = scanned; }, [scanned]);

  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  const distanceMeters = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  const getFreshPosition = useCallback(async () => {
    try {
      const fg = await Location.getForegroundPermissionsAsync();
      if (fg.status !== "granted") {
        const req = await Location.requestForegroundPermissionsAsync();
        if (req.status !== "granted") throw new Error("perm");
      }
    } catch {
      throw new Error("perm");
    }

    try {
      const last = await Location.getLastKnownPositionAsync();
      if (last && Date.now() - (last.timestamp ?? 0) <= LASTKNOWN_MAX_AGE_MS) {
        return last;
      }
    } catch {
    }

    let timeoutId: any;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("timeout")), LOCATE_TIMEOUT_MS);
      });
      const posPromise = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const res = await Promise.race([posPromise, timeoutPromise]);
      return res as Awaited<typeof posPromise>;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }, []);

  const resetScan = useCallback(() => {
    scanTokenRef.current += 1;
    processingRef.current = false;

    if (returnTimerRef.current) {
      clearTimeout(returnTimerRef.current);
      returnTimerRef.current = null;
    }

    setPhase("idle");
    setScanned(false);
    scannedRef.current = false;

    setLastData(null);
    setValidation("idle");
    setMatchedPoint(null);
    setMessage(null);

    candidateValRef.current = null;
    candidateSinceRef.current = 0;

    armedAtRef.current = Date.now() + SCAN_ARM_MS;
  }, []);

  useEffect(() => {
    armedAtRef.current = Date.now() + SCAN_ARM_MS;
    return () => {
      if (returnTimerRef.current) clearTimeout(returnTimerRef.current);
    };
  }, []);

  type MessageKey =
  | "unknown"
  | "routeMissing"
  | "routeError"
  | "notInRoute"
  | "tooFar"
  | "noGps"
  | "success"
  | "default";

const keyMap: Record<MessageKey, string> = {
  unknown: "unknownError",
  routeMissing: "routeMissingError",
  routeError: "routeError",
  notInRoute: "notInRouteError",
  tooFar: "tooFarError",
  noGps: "noGpsError",
  success: "success",
  default: "defaultError",
};
  
  const buildMessage = useCallback(
  (key: MessageKey, extras?: { id?: string; dist?: number }) => {
    return t(keyMap[key], {
      id: extras?.id ?? "",
      dist: extras?.dist != null ? Math.round(extras.dist) : undefined,
    });
  },
  [t]
);

  const panelHeight = useRef(new Animated.Value(PANEL_HEIGHT_IDLE)).current;
  const heightDelta = Animated.subtract(panelHeight, PANEL_HEIGHT_IDLE);
  const panelTranslateY = Animated.multiply(heightDelta, 0.5);

  useEffect(() => {
    const toValue = phase === "idle" ? PANEL_HEIGHT_IDLE : PANEL_HEIGHT_EXPANDED;
    Animated.timing(panelHeight, {
      toValue,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [phase, panelHeight]);

  const handleScan = useCallback(
    async ({ data: raw }: { type: string; data: string }) => {
      const now = Date.now();
      if (now < armedAtRef.current) return;
      if (now - lastAttemptAtRef.current < SCAN_COOLDOWN_MS) return;
      if (processingRef.current) return;
      if (scannedRef.current) return;

      const value = (raw ?? "").trim();
      if (!value) return;

      if (candidateValRef.current !== value) {
        candidateValRef.current = value;
        candidateSinceRef.current = now;
        return;
      }
      if (now - (candidateSinceRef.current || 0) < SCAN_HOLD_MS) return;

      processingRef.current = true;
      lastAttemptAtRef.current = now;
      const myToken = scanTokenRef.current;

      setLastData(value);
      setPhase("validating");
      const t0 = Date.now();

      let nextValidation: Validation = "error";
      let nextMessage: string = buildMessage("unknown");
      let nextPoint: Point | null = null;

      const point = pointsByQr.get(value) ?? null;
      if (!point) {
        nextValidation = "error";
        nextMessage = buildMessage("unknown");
      } else if (routeName) {
        if (!allowedPointIds) {
          nextValidation = "error";
          nextMessage = buildMessage("routeError");
        } else if (!allowedPointIds.has(point.id)) {
          nextValidation = "error";
          nextMessage = buildMessage("notInRoute");
        } else {
          try {
            const loc = await getFreshPosition();
            if (myToken !== scanTokenRef.current) return;
            const dist = distanceMeters(loc.coords.latitude, loc.coords.longitude, point.lat, point.lng);
            const radius = distanceToPoint;

            if (dist > radius) {
              nextValidation = "error";
              nextPoint = point;
              nextMessage = buildMessage("tooFar", { dist });
            } else {
              nextValidation = "success";
              nextPoint = point;
              nextMessage = buildMessage("success", { id: point.id });
            }
          } catch {
            nextValidation = "error";
            nextPoint = point;
            nextMessage = buildMessage("noGps");
          }
        }
      } else {
        nextValidation = "error";
        nextPoint = point;
        nextMessage = buildMessage("routeMissing");
      }

      const elapsed = Date.now() - t0;
      if (elapsed < VALIDATION_MIN_MS) {
        await sleep(VALIDATION_MIN_MS - elapsed);
      }
      if (myToken !== scanTokenRef.current) return;

      setMatchedPoint(nextPoint);
      setValidation(nextValidation);
      setMessage(nextMessage);
      setPhase("done");
      setScanned(true);
      scannedRef.current = true;
      processingRef.current = false;

      if (nextValidation === "success" && nextPoint && routeName) {
        visitedStore.add(routeName, nextPoint.id);
        returnTimerRef.current = setTimeout(() => {
          if (myToken !== scanTokenRef.current) return;
          router.back();
        }, RETURN_TO_MAP_MS);
      }

      armedAtRef.current = Date.now() + SCAN_COOLDOWN_MS;
      candidateValRef.current = null;
      candidateSinceRef.current = 0;
    },
    [pointsByQr, routeName, allowedPointIds, distanceMeters, getFreshPosition, buildMessage]
  );

  if (hasPermission === null) {
    return (
      <View style={styles.center}>
        <Text>{t("checkingPermissions")}</Text>
      </View>
    );
  }
  if (hasPermission === false) {
    return (
      <View style={styles.center}>
        <Text style={styles.info}>{t("failedPermissions")}</Text>
        <TouchableOpacity
          onPress={() => Linking.openSettings()}
          style={[styles.btn, styles.btnPrimary]}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>{t("openSettings")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        activeOpacity={0.8}
        accessibilityLabel="Wróć"
      >
        <Ionicons name="arrow-back" size={35} color={THEME.text} />
      </TouchableOpacity>

      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={handleScan}
      />

      <View pointerEvents="none" style={styles.overlay}>
        <View style={styles.mask} />
        <View style={styles.row}>
          <View style={styles.mask} />
          <View style={styles.focusBox} />
          <View style={styles.mask} />
        </View>
        <View style={styles.mask} />
      </View>

      <Animated.View
        style={[
          styles.bottomPanel,
          { height: panelHeight, transform: [{ translateY: panelTranslateY as any }] },
        ]}
      >
        <View style={styles.panelContent}>
          {phase === "idle" && (
            <Text style={styles.idleTitle}>{t("setQR")}</Text>
          )}

          {phase === "validating" && (
            <ActivityIndicator size="small" color={THEME.text} />
          )}

          {phase === "done" && (
            <>
              <Text
                style={[
                  styles.result,
                  { color: validation === "success" ? THEME.ok : THEME.err },
                ]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {validation === "success" ? "✅ " : "❌ "}
                {message}
              </Text>

              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary, styles.spacingTopMd]}
                onPress={resetScan}
                activeOpacity={0.9}
              >
                <Text style={styles.btnText}>{t("scanAgain")}</Text>
              </TouchableOpacity>

              {lastData?.startsWith("http") && (
                <TouchableOpacity
                  style={[styles.btn, styles.btnLink, styles.spacingTopSm]}
                  onPress={() => Linking.openURL(lastData).catch(() => {})}
                  activeOpacity={0.9}
                >
                  <Text style={styles.btnText}>{t("openLink")}</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  info: { color: THEME.textMuted, textAlign: "center" },

  backButton: {
    position: "absolute",
    top: 60,
    left: 20,
    zIndex: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.scrim,
    alignItems: "center",
    justifyContent: "center",
  },

  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: "center" },
  row: { flexDirection: "row" },
  mask: { flex: 1, backgroundColor: THEME.scrimMask },
  focusBox: {
    width: FOCUS_SIZE,
    height: FOCUS_SIZE,
    borderRadius: BORDER_RADIUS,
    borderWidth: 3,
    borderColor: "#fff",
  },

  bottomPanel: {
    position: "absolute",
    bottom: PANEL_BOTTOM,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    backgroundColor: THEME.scrim,
    alignItems: "center",
    justifyContent: "center",
  },

  panelContent: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingHorizontal: 8,
  },

  idleTitle: {
    color: THEME.text,
    textAlign: "center",
    fontWeight: "700",
    fontSize: 22,
    letterSpacing: 0.3,
  },

  result: {
    color: THEME.text,
    fontWeight: "700",
    textAlign: "center",
    maxWidth: "92%",
    marginBottom: 2,
    marginTop: 4,
  },

  spacingTopMd: { marginTop: 12 },
  spacingTopSm: { marginTop: 10 },

  btn: {
    minWidth: 180,
    height: ACTIONS_HEIGHT,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  btnPrimary: {
    backgroundColor: THEME.brand,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  btnLink: { backgroundColor: THEME.link },
  btnText: { color: THEME.text, fontSize: 16, fontWeight: "bold" },
});
