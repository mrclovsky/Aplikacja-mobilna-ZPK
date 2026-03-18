import React from "react";
import { Image, Platform } from "react-native";
import MapView, { Marker, Polyline, Region } from "react-native-maps";
import type { Point } from "../../../assets/types";
import MapOverlayLayer from "./mapOverlayLayer";

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
  arrowImage: any;
  routeColor?: string;
};

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
  
  const mapRotateEnabled = trackingMode; 
  const mapPitchEnabled = !trackingMode;
  const mapScrollEnabled = !trackingMode;
  const mapZoomEnabled = !trackingMode;

  return (
    <MapView
      ref={mapRef}
      style={{ flex: 1 }}
      initialRegion={userLocation}
      showsUserLocation={false}
      showsMyLocationButton={false} 
      showsCompass={false}
      rotateEnabled={mapRotateEnabled}
      pitchEnabled={mapPitchEnabled}
      scrollEnabled={mapScrollEnabled}
      zoomEnabled={mapZoomEnabled}
      loadingEnabled={true}
      onRegionChange={onRegionChange}
      onRegionChangeComplete={onRegionChangeComplete}
      mapType={Platform.OS === "android" ? "none" : "standard"}
    >
      <MapOverlayLayer overlayIndex={overlayIndex} />

      <Marker
        coordinate={{
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        }}
        anchor={{ x: 0.5, y: 0.5 }}
        flat={trackingMode}
        rotation={0} 
        zIndex={1000}
        tracksViewChanges={false}
      >
        <Image source={arrowImage} style={{ width: 35, height: 35 }} />
      </Marker>

      {resolvedPoints.map((p, index) => {
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
            key={`${p.id}-${index}`}
            coordinate={{ latitude: p.lat, longitude: p.lng }}
            image={markerImage}         
            anchor={Platform.OS === "android"
                ? { x: 0.5, y: 0.5 }   
                : { x: 0.5, y: 1 }
            } 
            zIndex={500}
            tracksViewChanges={false}
          />
        );
      })}

      {routeCoordinates.length >= 2 && (
        <Polyline
          coordinates={routeCoordinates}
          strokeColor={routeColor}
          strokeWidth={4}
          zIndex={9999} 
          tappable={true}     
          geodesic={true}
        />
      )}
    </MapView>
  );
}