// app/components/mapScreen.tsx
// UI/HUD + punkty + sesja. Kamera sterowana przez cameraController.
// Proximity checking przeniesiony do app/components/map/proximity.ts.

import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, Image, StyleSheet, View } from "react-native";
import MapView, { Marker, Polyline, Region } from "react-native-maps";
import { DataFile, Point, Route } from "../../assets/types";
import routesData from "../../assets/data/routesData.json";
import { useNavigationStats } from "../hooks/useNavigationStats";
import { useSaveAchievement } from "../hooks/useSaveAchievement";
import { visitedStore } from "../stores/visitedPointsStore";

import {
  PointMarker,
  RouteNameBanner,
  ProximityBanner,
  StartStopButton,
  ToggleTrackingButton,
  ScanQRButton,
  HudCounters,
} from "./map/uiComponents";

import { createCameraController } from "./map/cameraController";
import { createProximityChecker } from "./map/proximityChecker";
import { t } from "i18next";

const THEME = {
  primary: "#004d00",
  onPrimary: "#ffffff",
  onSurface: "#000000",
  route: "#00FF30",
  pointPhysical: "#a90b0bff",
  pointVirtual: "#6f1abfff",
  pointVisited: "#00FF30",
};

interface MapScreenProps {
  selectedRoute: Route | null;
}

export default function MapScreen({ selectedRoute }: MapScreenProps) {
  const [userLocation, setUserLocation] = useState<Region | null>(null);

  // heading: stan + ref (synchronizowane)
  const [heading, _setHeading] = useState(0);
  const headingRef = useRef<number>(0);
  const setHeadingBoth = (h: number) => { headingRef.current = h; _setHeading(h); };

  const [navigationActive, setNavigationActive] = useState(false);
  const [nearMessage, setNearMessage] = useState<string | null>(null);
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());

  const [trackingMode, _setTrackingMode] = useState(false);
  const trackingModeRef = useRef(false);
  const setTrackingMode = (v: boolean) => { trackingModeRef.current = v; _setTrackingMode(v); };

  const mapRef = useRef<MapView>(null);
  const headingSubscription = useRef<any>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  // timer banera (kontrolowany lokalnie)
  const bannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { elapsedTime, distanceTravelled, start, stop } = useNavigationStats();
  const { saveAchievement } = useSaveAchievement();

  // „żywa” lokalizacja w refie (czytana przez kontroler kamery)
  const userLocRef = useRef<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (userLocation) {
      userLocRef.current = { lat: userLocation.latitude, lng: userLocation.longitude };
    }
  }, [userLocation]);

  // Dane trasy
  const data = routesData as DataFile;
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

  // Banery: utilsy lokalne (utrzymują dotychczasowe zachowanie)
  const showBanner = (text: string, durationMs?: number) => {
    if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
    setNearMessage(text);
    if (durationMs && durationMs > 0) {
      bannerTimeoutRef.current = setTimeout(() => {
        setNearMessage(null);
        bannerTimeoutRef.current = null;
      }, durationMs);
    }
  };
  const showPersistentMessageIfNone = (text: string) => {
    // Utrzymuje logikę: ustaw tylko jeśli nie ma aktywnego timera i nie dublujemy treści
    if (!bannerTimeoutRef.current && nearMessage !== text) {
      setNearMessage(text);
    }
  };
  const clearMessage = () => {
    if (bannerTimeoutRef.current) { clearTimeout(bannerTimeoutRef.current); bannerTimeoutRef.current = null; }
    setNearMessage(null);
  };

  useEffect(() => {
    return () => { if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current); };
  }, []);

  // visitedStore per trasa (bez zmian)
  useEffect(() => {
    const routeName = selectedRoute?.name;
    visitedStore.clear(routeName);
    setVisitedIds(new Set());

    if (!routeName) return;
    const unsubscribe = visitedStore.subscribe(routeName, (ids) => setVisitedIds(ids));
    return () => { unsubscribe(); visitedStore.clear(routeName); };
  }, [selectedRoute?.name]);

  // Lokalizacja startowa
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    })();

    return () => {
      if (headingSubscription.current) headingSubscription.current.remove();
      if (locationSubscription.current) locationSubscription.current.remove();
    };
  }, []);

  // Fit to route
  useEffect(() => {
    if (mapRef.current && routeCoordinates.length > 0) {
      mapRef.current.fitToCoordinates(routeCoordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }, [routeCoordinates]);

  // Kontroler kamery (raz)
  const camera = useMemo(
    () =>
      createCameraController({
        mapRef,
        trackingModeRef,
        userLocationRef: userLocRef,
        headingRef,
        setHeading: setHeadingBoth,
      }),
    []
  );

  // Kontroler bliskości (raz)
  const proximity = useMemo(
    () =>
      createProximityChecker({
        showBanner,
        showPersistentMessageIfNone,
        clearMessage,
      }),
    // callbacki są stabilne w praktyce; jeśli chcesz, możesz dodać je do depsów
    []
  );

  /* ===== Start/Stop + subskrypcje ===== */

  const handleStart = async () => {
    if (!selectedRoute || !userLocation) return;

    setNavigationActive(true);
    start();
    setTrackingMode(true);

    // wyczyść stan banera i proximity
    clearMessage();
    proximity.reset();

    await camera.runStartSequence();

    locationSubscription.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Highest, timeInterval: 900, distanceInterval: 1 },
      async (loc) => {
        const lat = loc.coords.latitude;
        const lng = loc.coords.longitude;

        setUserLocation({
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });

        await camera.onPositionUpdate({ navigationActive: true });

        // Proximity — cała dotychczasowa logika przeniesiona do modułu
        proximity.check({
          lat,
          lng,
          points: resolvedPoints,
          routeName: selectedRoute.name,
        });
      }
    );

    headingSubscription.current = await Location.watchHeadingAsync((headingData) => {
      const trueHeading = headingData.trueHeading ?? headingData.magHeading ?? 0;
      camera.onHeadingSample(trueHeading);
    });
  };

  const handleStop = async () => {
    setNavigationActive(false);

    const result = stop();
    const totalPoints = resolvedPoints.length;
    const donePoints = resolvedPoints.filter((p) => visitedIds.has(p.id)).length;

    if (selectedRoute) {
      saveAchievement(selectedRoute, result.finalTime, result.finalDistance, donePoints, totalPoints);
    }

    visitedStore.clear(selectedRoute?.name);

    if (headingSubscription.current) { headingSubscription.current.remove(); headingSubscription.current = null; }
    if (locationSubscription.current) { locationSubscription.current.remove(); locationSubscription.current = null; }

    // posprzątaj HUD i proximity
    clearMessage();
    proximity.reset();

    await camera.runStopReset();
    setTrackingMode(false);
  };

  const toggleTrackingMode = async () => {
    if (!navigationActive) return;
    if (!trackingModeRef.current) {
      setTrackingMode(true);
      await camera.runEnterTrackingSequence();
    } else {
      setTrackingMode(false);
    }
  };

  const handleRegionChange = () => {};
  const handleRegionChangeComplete = async (_region: Region) => {
    await camera.onRegionChangeComplete({
      navigationActive,
      trackingMode: trackingModeRef.current,
    });
  };

  /* ===== Widok ===== */

  if (!userLocation) return <View style={styles.container} />;

  const totalPoints = resolvedPoints.length;
  const donePoints = resolvedPoints.filter((p) => visitedIds.has(p.id)).length;
  const canStart = !!selectedRoute && !!userLocation;

  const mapRotateEnabled = false;
  const mapPitchEnabled = !trackingMode;
  const mapScrollEnabled = !trackingMode;
  const mapZoomEnabled = !trackingMode;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <View style={styles.container}>
      {!navigationActive && selectedRoute && <RouteNameBanner title={selectedRoute.name} />}

      {navigationActive && nearMessage && <ProximityBanner text={nearMessage} />}

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={userLocation}
        showsUserLocation={false}
        showsMyLocationButton={true}
        rotateEnabled={mapRotateEnabled}
        pitchEnabled={mapPitchEnabled}
        scrollEnabled={mapScrollEnabled}
        zoomEnabled={mapZoomEnabled}
        loadingEnabled={true}
        onRegionChange={handleRegionChange}
        onRegionChangeComplete={handleRegionChangeComplete}
      >
        {routeCoordinates.length >= 2 && (
          <Polyline coordinates={routeCoordinates} strokeColor={THEME.route} strokeWidth={4} geodesic={false} />
        )}

        <Marker
          coordinate={{ latitude: userLocation.latitude, longitude: userLocation.longitude }}
          anchor={{ x: 0.5, y: 0.5 }}
          flat={false}
          rotation={0}
          zIndex={9999}
          tracksViewChanges={false}
        >
          <Image source={require("../../assets/images/arrow.png")} style={{ width: 35, height: 35 }} />
        </Marker>

        {resolvedPoints.map((p) => {
          const isVisited = visitedIds.has(p.id);
          const variant: "visited" | "physical" | "virtual" =
            isVisited ? "visited" : p.type === "physical" ? "physical" : "virtual";

          return (
            <Marker key={p.id} coordinate={{ latitude: p.lat, longitude: p.lng }} pointerEvents="none" zIndex={10}>
              <PointMarker variant={variant} />
            </Marker>
          );
        })}
      </MapView>

      <View style={styles.bottomRow}>
        <StartStopButton
          navigationActive={navigationActive}
          canStart={canStart}
          onPress={navigationActive ? handleStop : handleStart}
          primaryColor={THEME.primary}
          labels={{ start: t("start"), stop: t("stop") }}
        />

        {navigationActive && (
          <ToggleTrackingButton
            tracking={trackingMode}
            onPress={toggleTrackingMode}
            colors={{ primary: THEME.primary, onSurface: THEME.onSurface, onPrimary: THEME.onPrimary }}
          />
        )}

        {navigationActive && selectedRoute?.name && (
          <ScanQRButton
            onPress={() =>
              router.push({
                pathname: "./components/qrScanScreen",
                params: { route: selectedRoute.name },
              })
            }
          />
        )}
      </View>

      {navigationActive && (
        <HudCounters
          elapsed={formatTime(elapsedTime)}
          points={`${donePoints}/${totalPoints}`}
          distanceKm={`${(distanceTravelled / 1000).toFixed(2)} km`}
        />
      )}
    </View>
  );
}

/* ===== Style ===== */

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: Dimensions.get("window").width, height: Dimensions.get("window").height },
  bottomRow: {
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
});
