import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

/**
 * Prezentacyjny znacznik punktu trasy.
 * Wariant: visited/physical/virtual – zmienia kolor środkowej kropki.
 */
export function PointMarker({ variant }: { variant: "visited" | "physical" | "virtual" }) {
  return (
    <View style={styles.pointOuter}>
      <View
        style={
          variant === "visited"
            ? styles.pointInnerVisited
            : variant === "physical"
            ? styles.pointInnerPhysical
            : styles.pointInnerVirtual
        }
      />
    </View>
  );
}

/**
 * Baner z nazwą trasy wyświetlany w górnej części ekranu.
 */
export function RouteNameBanner({ title }: { title: string }) {
  return (
    <View style={styles.routeNameContainer}>
      <Text style={styles.routeNameText}>{title}</Text>
    </View>
  );
}

/**
 * Baner komunikatów o bliskości/zaliczeniu punktu.
 */
export function ProximityBanner({ text }: { text: string }) {
  return (
    <View style={styles.proximityBanner}>
      <Text style={styles.proximityText}>{text}</Text>
    </View>
  );
}

/**
 * Główny przycisk START/STOP. Używa stylu „disabled”, gdy nie można zacząć.
 */
export function StartStopButton({
  navigationActive,
  canStart,
  onPress,
  primaryColor = "#004d00",
  labels = { start: "START", stop: "STOP" },
}: {
  navigationActive: boolean;
  canStart: boolean;
  onPress: () => void;
  primaryColor?: string;
  labels?: { start: string; stop: string };
}) {
  // aktywny, gdy trwa nawigacja (STOP) albo można wystartować (START)
  const enabled = navigationActive || canStart;

  return (
    <TouchableOpacity
      style={[
        styles.startButton,
        enabled ? { backgroundColor: primaryColor } : styles.startButtonDisabled,
      ]}
      onPress={enabled ? onPress : undefined}  
      disabled={!enabled}                       
      activeOpacity={enabled ? 0.7 : 1}
      accessibilityRole="button"
      accessibilityState={{ disabled: !enabled }}
    >
      <Text style={styles.startButtonText}>
        {navigationActive ? labels.stop : labels.start}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * Przycisk przełączania trybu kamery (wolny/śledzenie), po lewej stronie dolnego wiersza.
 */
export function ToggleTrackingButton({
  tracking,
  onPress,
  colors = { primary: "#004d00", onSurface: "#000000", onPrimary: "#ffffff" },
}: {
  tracking: boolean;
  onPress: () => void;
  colors?: { primary: string; onSurface: string; onPrimary: string };
}) {
  const iconColor = tracking ? colors.onSurface : colors.onPrimary;
  return (
    <TouchableOpacity
      style={[
        styles.centerButtonBase,
        tracking ? styles.centerButtonTrack : styles.centerButtonFree,
        tracking ? { borderColor: colors.onSurface, backgroundColor: "#fff" } : { borderColor: colors.primary, backgroundColor: colors.primary },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Ionicons name="locate-outline" size={20} color={iconColor} />
    </TouchableOpacity>
  );
}

/**
 * Przycisk otwarcia skanera QR, po prawej stronie dolnego wiersza.
 */
export function ScanQRButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.scanButton} onPress={onPress}>
      <Ionicons name="qr-code-outline" size={20} color="#000" />
    </TouchableOpacity>
  );
}

/**
 * Zestaw liczników HUD (czas, licznik punktów i dystans) pozycjonowanych w górnej części ekranu.
 * Oczekuje już sformatowanych stringów.
 */
export function HudCounters({
  elapsed,
  points,
  distanceKm,
}: {
  elapsed: string;
  points: string;
  distanceKm: string;
}) {
  return (
    <>
      <View style={styles.timerContainerRight}>
        <Text style={styles.timerText}>{elapsed}</Text>
      </View>

      <View style={styles.counterCenter}>
        <View style={styles.counterBox}>
          <Text style={styles.timerText}>{points}</Text>
        </View>
      </View>

      <View style={styles.timerContainerLeft}>
        <Text style={styles.timerText}>{distanceKm}</Text>
      </View>
    </>
  );
}

/* ===== Style prezentacyjne przeniesione z mapScreen ===== */

const styles = StyleSheet.create({
  // Start/Stop
  startButton: {
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  startButtonDisabled: {
    backgroundColor: "#3b3b3b",
    shadowOpacity: 0.1,
  },
  startButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  // Toggle tracking (lewy przycisk w bottom row)
  centerButtonBase: {
    position: "absolute",
    left: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 20,
    borderWidth: 2,
  },
  centerButtonFree: {},
  centerButtonTrack: {},

  // Scan QR (prawy przycisk w bottom row)
  scanButton: {
    position: "absolute",
    right: 20,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#000",
  },

  // HUD counters
  timerContainerRight: {
    position: "absolute",
    top: 60,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  timerContainerLeft: {
    position: "absolute",
    top: 60,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  timerText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
  },
  counterCenter: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  counterBox: {
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 10,
  },

  // Banery
  routeNameContainer: {
    position: "absolute",
    top: 60,
    left: 10,
    right: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 10,
    zIndex: 10,
  },
  routeNameText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
  },
  proximityBanner: {
    position: "absolute",
    top: 115,
    left: 20,
    right: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
    zIndex: 10,
  },
  proximityText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  // Marker punktu
  pointOuter: {
    width: 20,
    height: 20,
    borderRadius: 9,
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 1.5,
    elevation: 2,
  },
  pointInnerVirtual: {
    width: 10,
    height: 10,
    borderRadius: 6,
    backgroundColor: "#8A2BE2",
  },
  pointInnerPhysical: {
    width: 10,
    height: 10,
    borderRadius: 6,
    backgroundColor: "red",
  },
  pointInnerVisited: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#00FF30",
  },
});
