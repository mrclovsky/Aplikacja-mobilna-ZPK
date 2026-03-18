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
  navigationActive: boolean;
  canStart: boolean;

  onStart: () => void | Promise<void>;
  onStop: () => void | Promise<void>;
  onToggleTracking: () => void | Promise<void>;
  onScan: (routeName: string) => void;

  trackingMode: boolean;
  selectedRouteName?: string;

  elapsed: string; 
  pointsText: string; 
  distanceText: string; 

  overlayIndex: number;
  onOverlayChange: (idx: number) => void;
  isMapLoading: boolean;
  translatedEntries: string[];
  mapLabels: { none: string; mapPrefix: string };

  themeColors: {
    primary: string;
    onPrimary: string;
    onSurface: string;
  };

  navBarHeight: number;
};

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
  isMapLoading,
  translatedEntries,
  mapLabels,
  themeColors,
  navBarHeight,
}: MapControlsProps) {
  return (
    <>
      <View style={[styles.bottomRow, { bottom: navBarHeight + 70 }]}>
        <MapSelectButton
            selectedIndex={overlayIndex}
            onSelect={onOverlayChange}
            entries={translatedEntries}
            navigationActive={navigationActive}
            labels={mapLabels}
            isLoading={isMapLoading}
        />
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