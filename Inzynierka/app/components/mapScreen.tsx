import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {StyleSheet, View } from "react-native";
import MapView, {Region } from "react-native-maps";
import { DataFile, Route } from "../../assets/types";
import { visitedStore } from "../stores/visitedPointsStore";
import useProximityBanner from "../hooks/useProximityBanner";
import useLiveLocation from "../hooks/useLiveLocation";
import useNavigationController from "../hooks/useNavigationController";
import useResolvedRoute from "../hooks/useResolvedRoute";
import MapLayer from "./map/mapLayer";
import { RouteNameBanner, ProximityBanner } from "./map/uiComponents";
import MapControls from "./map/mapControls";
import { createCameraController } from "./map/cameraController";
import { createProximityChecker } from "./map/proximityChecker";
import { t } from "i18next";
import { useRoutesData } from "../hooks/useRoutesData";
import { useAppSettings } from "../hooks/useAppSettings";

const NAVBAR_HEIGHT = 64;

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
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());
  const [trackingMode, _setTrackingMode] = useState(false);
  const trackingModeRef = useRef(false);
  const setTrackingMode = (v: boolean) => {
    trackingModeRef.current = v;
    _setTrackingMode(v);
  };

  const [heading, _setHeading] = useState(0);
  const headingRef = useRef<number>(0);
  const setHeadingBoth = (h: number) => {
    headingRef.current = h;
    _setHeading(h);
  };

  const mapRef = useRef<MapView>(null);

  const {
  userLocation,
    setUserLocation,
    requestAndLoadInitialLocation,
    startTracking,
    stopTracking,
  } = useLiveLocation();

  const userLocRef = useRef<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (userLocation) userLocRef.current = { lat: userLocation.latitude, lng: userLocation.longitude };
  }, [userLocation]);

  const [overlayIndex, setOverlayIndex] = useState<number>(0);

  /* Get routes data from API/storage */
  const { data: routesData } = useRoutesData();
  
  /* Get distance setting */
  const { distanceToPoint } = useAppSettings();

  /* Pozostała logika bez zmian (lokalizacja, start/stop, UI...) */

  const {
    resolvedPoints,
    routeCoordinates,
    totalPoints,
    donePoints,
  } = useResolvedRoute({
    data: routesData,
    selectedRoute,
    visitedIds,
  });

  const {
    message: nearMessage,
    showBanner,
    showPersistentMessageIfNone,
    clearMessage,
  } = useProximityBanner();

  useEffect(() => {
    const routeName = selectedRoute?.name;
    visitedStore.clear(routeName);
    setVisitedIds(new Set());
    if (!routeName) return;
    const unsubscribe = visitedStore.subscribe(routeName, (ids) => setVisitedIds(ids));
    return () => {
      unsubscribe();
      visitedStore.clear(routeName);
    };
  }, [selectedRoute?.name]);

  useEffect(() => {
    requestAndLoadInitialLocation();
  }, [requestAndLoadInitialLocation]);

  useEffect(() => {
    if (mapRef.current && routeCoordinates.length > 0) {
      mapRef.current.fitToCoordinates(routeCoordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }, [routeCoordinates]);

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

  const proximity = useMemo(
    () =>
      createProximityChecker({
        showBanner,
        showPersistentMessageIfNone,
        clearMessage,
      }),
    []
  );

  const {
    navigationActive,
    handleStart,
    handleStop,
    elapsedTime,
    distanceTravelled,
  } = useNavigationController({
    selectedRoute,
    resolvedPoints,
    visitedIds,
    userLocation,
    camera,
    proximity,
    startTracking,
    stopTracking,
    setTrackingMode,
    clearMessage,
    distanceToPoint,
  });

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

  if (!userLocation) return <View style={styles.container} />;

  const canStart = !!selectedRoute && !!userLocation;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const mapEntryKeys = ["map.none", "map.map1", "map.map2", "map.map3", "map.map4", "map.map5", "map.map6"];
  const translatedEntries = mapEntryKeys.map((k) => t(k));
  const mapLabels = { none: t("map.none"), mapPrefix: t("map.prefix") };

  return (
    <View style={styles.container}>
      {!navigationActive && selectedRoute && <RouteNameBanner title={selectedRoute.name} />}
      {navigationActive && nearMessage && <ProximityBanner text={nearMessage} />}

      <MapLayer
        mapRef={mapRef}
        userLocation={userLocation}
        routeCoordinates={routeCoordinates}
        resolvedPoints={resolvedPoints}
        visitedIds={visitedIds}
        overlayIndex={overlayIndex}
        trackingMode={trackingMode}
        onRegionChange={handleRegionChange}
        onRegionChangeComplete={handleRegionChangeComplete}
        arrowImage={require("../../assets/images/arrow.png")}
        routeColor={THEME.route}
      />

      <MapControls
        navigationActive={navigationActive}
        canStart={canStart}
        onStart={handleStart}
        onStop={handleStop}
        onToggleTracking={toggleTrackingMode}
        onScan={(routeName: string) =>
          router.push({
          pathname: "./components/qrScanScreen",
          params: { route: routeName },
          })
        }
        trackingMode={trackingMode}
        selectedRouteName={selectedRoute?.name}
        elapsed={formatTime(elapsedTime)}
        pointsText={`${donePoints}/${totalPoints}`}
        distanceText={`${(distanceTravelled / 1000).toFixed(2)} km`}
        overlayIndex={overlayIndex}
        onOverlayChange={(idx: number) => setOverlayIndex(idx)}
        translatedEntries={translatedEntries}
        mapLabels={mapLabels}
        themeColors={{ primary: THEME.primary, onPrimary: THEME.onPrimary, onSurface: THEME.onSurface }}
        navBarHeight={NAVBAR_HEIGHT}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
