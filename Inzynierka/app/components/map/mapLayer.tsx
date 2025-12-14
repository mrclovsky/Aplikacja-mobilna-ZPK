import React from "react";
import { Image } from "react-native";
import MapView, { Marker, Polyline, Region } from "react-native-maps";
import type { Point } from "../../../assets/types";
import MapOverlayLayer from "./mapOverlayLayer";
import { Platform } from "react-native";


export type MapLayerProps = {
  mapRef: React.RefObject<MapView>;
  userLocation: Region;
  routeCoordinates: { latitude: number; longitude: number }[];
  resolvedPoints: Point[];
  visitedIds: Set<string>;
  overlayIndex: number;
  trackingMode: boolean;
  onRegionChange?: (region: Region) => void;
  onRegionChangeComplete?: (region: Region) => void;
  arrowImage: any; // require(...) przekazywany z zewnątrz
  routeColor?: string;
};

/**
 * MapLayer
 * --------------------------------------------------
 * W pełni bezpieczne wydzielenie warstwy renderującej mapę:
 * - MapView
 * - Polyline trasy
 * - Marker użytkownika
 * - Markery punktów
 * - MapOverlayLayer
 *
 * Komponent zachowuje dokładnie to samo zachowanie co wcześniej w MapScreen.
 */
export default function MapLayer({
  mapRef,
  userLocation,
  routeCoordinates,
  resolvedPoints,
  visitedIds,
  overlayIndex,
  trackingMode,
  onRegionChange,
  onRegionChangeComplete,
  arrowImage,
  routeColor = "#00FF30",
}: MapLayerProps) {
  const mapRotateEnabled = false;
  const mapPitchEnabled = !trackingMode;
  const mapScrollEnabled = !trackingMode;
  const mapZoomEnabled = !trackingMode;

  return (
    <MapView
      ref={mapRef}
      style={{ flex: 1 }}
      initialRegion={userLocation}
      showsUserLocation={false}
      showsMyLocationButton={true}
      showsCompass={false}
      rotateEnabled={mapRotateEnabled}
      pitchEnabled={mapPitchEnabled}
      scrollEnabled={mapScrollEnabled}
      zoomEnabled={mapZoomEnabled}
      loadingEnabled={true}
      onRegionChange={onRegionChange}
      onRegionChangeComplete={onRegionChangeComplete}
    >
      {/* overlay + corner markers */}
      <MapOverlayLayer overlayIndex={overlayIndex} hideCornerMarkers={true}/>

      {routeCoordinates.length >= 2 && (
        <Polyline
          coordinates={routeCoordinates}
          strokeColor={routeColor}
          strokeWidth={4}
          geodesic={false}
        />
      )}

      <Marker
        coordinate={{
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        }}
        anchor={{ x: 0.5, y: 0.5 }}
        flat={false}
        rotation={0}
        zIndex={9999}
        tracksViewChanges={true}
      >
        <Image source={arrowImage} style={{ width: 35, height: 35 }} />
      </Marker>

      {resolvedPoints.map((p) => {
        const isVisited = visitedIds.has(p.id);

        const markerImage =
            Platform.OS === "ios"
                ? isVisited
                ? require("../../../assets/images/point-visited-ios.png")
                : p.type === "physical"
                ? require("../../../assets/images/point-physical-ios.png")
                : require("../../../assets/images/point-virtual-ios.png")
                : isVisited
                ? require("../../../assets/images/point-visited.png")
                : p.type === "physical"
                ? require("../../../assets/images/point-physical.png")
                : require("../../../assets/images/point-virtual.png");

        return (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.lat, longitude: p.lng }}
            image={markerImage}         
            anchor={Platform.OS === "android"
                ? { x: 0.5, y: 0.5 }   
                : { x: 0.5, y: 1 }
            } 
            zIndex={10}
          />
        );
      })}
    </MapView>
  );
}