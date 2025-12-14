import React from "react";
import { StyleSheet, View } from "react-native";
import { t } from "i18next";
import {
  StartStopButton,
  ToggleTrackingButton,
  ScanQRButton,
  HudCounters,
  MapSelectButton,
} from "./uiComponents";

export type MapControlsProps = {
  // --- ogólne ---
  navigationActive: boolean;
  canStart: boolean;

  // --- akcje ---
  onStart: () => void | Promise<void>;
  onStop: () => void | Promise<void>;
  onToggleTracking: () => void | Promise<void>;
  onScan: (routeName: string) => void;

  // --- stan ---
  trackingMode: boolean;
  selectedRouteName?: string;

  // --- HUD ---
  elapsed: string; // np. "mm:ss"
  pointsText: string; // np. "3/10"
  distanceText: string; // np. "1.25 km"

  // --- selektor mapy ---
  overlayIndex: number;
  onOverlayChange: (idx: number) => void;
  translatedEntries: string[];
  mapLabels: { none: string; mapPrefix: string };

  // --- kolory ---
  themeColors: {
    primary: string;
    onPrimary: string;
    onSurface: string;
  };

  // --- layout ---
  navBarHeight: number; // np. 64
};

/**
 * MapControls
 * --------------------------------------------------
 * W pełni bezpieczne wydzielenie dolnego panelu + HUD:
 * - MapSelectButton
 * - StartStopButton
 * - ToggleTrackingButton
 * - ScanQRButton
 * - HudCounters
 *
 * Komponent NIE przejmuje żadnej logiki biznesowej.
 * Jest w 100% sterowany przez propsy (identycznie jak wcześniej w MapScreen).
 */
export default function MapControls({
  navigationActive,
  canStart,
  onStart,
  onStop,
  onToggleTracking,
  onScan,
  trackingMode,
  selectedRouteName,
  elapsed,
  pointsText,
  distanceText,
  overlayIndex,
  onOverlayChange,
  translatedEntries,
  mapLabels,
  themeColors,
  navBarHeight,
}: MapControlsProps) {
  return (
    <>
      {/* Dolny panel sterowania */}
      <View style={[styles.bottomRow, { bottom: navBarHeight + 70 }]}>
        <MapSelectButton
            selectedIndex={overlayIndex}
            onSelect={onOverlayChange}
            entries={translatedEntries}
            navigationActive={navigationActive}
            labels={mapLabels}
        />
        
        {/* TOGGLE — jeśli nie ma, wstawiamy dummy o tej samej wielkości */}
        {navigationActive ? (
            <ToggleTrackingButton
            tracking={trackingMode}
            onPress={onToggleTracking}
            colors={{
                primary: themeColors.primary,
                onSurface: themeColors.onSurface,
                onPrimary: themeColors.onPrimary,
            }}
            />
        ) : (
            <View style={styles.dummy} />
        )}

        <StartStopButton
          navigationActive={navigationActive}
          canStart={canStart}
          onPress={navigationActive ? onStop : onStart}
          primaryColor={themeColors.primary}
          labels={{
            start: t("start"),
            stop: t("stop"),
          }}
        />

        {navigationActive && selectedRouteName ? (
            <ScanQRButton onPress={() => onScan(selectedRouteName)} />
        ) : (
            <View style={styles.dummy} />
        )}
      </View>

      {/* HUD */}
      {navigationActive && (
        <HudCounters
          elapsed={elapsed}
          points={pointsText}
          distanceKm={distanceText}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  bottomRow: {
    position: "absolute",
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dummy: {
  width: 100,               
  height: 40,              
},
});