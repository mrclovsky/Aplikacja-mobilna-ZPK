// app/components/map/uiComponents.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

/** Stałe **/
const MAP_BUTTON_WIDTH = 100;
const MAP_BUTTON_HEIGHT = 40;

export function RouteNameBanner({ title }: { title: string }) {
  return (
    <View style={styles.routeNameContainer}>
      <Text style={styles.routeNameText}>{title}</Text>
    </View>
  );
}

export function ProximityBanner({ text }: { text: string }) {
  return (
    <View style={styles.proximityBanner}>
      <Text style={styles.proximityText}>{text}</Text>
    </View>
  );
}

/** Start/Stop (środek wrappera) **/
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
      <Text style={styles.startButtonText}>{navigationActive ? labels.stop : labels.start}</Text>
    </TouchableOpacity>
  );
}

/** ToggleTrackingButton - lewy (pod MapSelect) **/
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
        styles.uiButtonBase,styles.toggleButton,
        tracking ? { borderColor: colors.onSurface, backgroundColor: "#fff" } : { borderColor: colors.primary, backgroundColor: colors.primary },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Ionicons name="locate-outline" size={20} color={iconColor} />
    </TouchableOpacity>
  );
}

/** ScanQRButton - prawy **/
export function ScanQRButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.uiButtonBase]} onPress={onPress}>
      <Ionicons name="qr-code-outline" size={20} color="#000" />
    </TouchableOpacity>
  );
}

/** HUD counters **/
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

export function MapSelectButton({
  selectedIndex,
  onSelect,
  entries,
  navigationActive,
  labels = { none: "Brak", mapPrefix: "M" },
}: {
  selectedIndex: number;
  onSelect: (index: number) => void;
  entries: string[]; // entries[0] = 'Brak'
  navigationActive: boolean;
  labels?: { none: string; mapPrefix?: string };
}) {
  const [open, setOpen] = useState(false);
  const anim = useRef(new Animated.Value(navigationActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: navigationActive ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [navigationActive, anim]);

  const toggleOpen = () => setOpen((s) => !s);
  const handleSelect = (idx: number) => {
    onSelect(idx);
    setOpen(false);
  };

  const entriesReversed = entries.slice().reverse();
  const label = selectedIndex === 0 ? labels.none : `${labels.mapPrefix ?? "M"}${selectedIndex}`;

  // raise przy navigationActive (delikatne uniesienie nad Toggle)
  const raiseOnNav = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -45], // -10px uniesienia — dostosuj jeśli chcesz mniej/więcej
  });

  // lista otwiera się w górę — liczymy translację w górę o wysokość listy
  const LIST_GAP = 6;

  const listOffset = useRef(new Animated.Value(open ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(listOffset, {
      toValue: open ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [open, listOffset]);

  return (
    <>
      {/* Lista: pozycjonowana względem osi środka wrappera i przesuwana WYŻEJ (ujemne translateY) */}
      {open && (
        <Animated.View
          style={[
            styles.mapSelectListContainer,
            {
              bottom: MAP_BUTTON_HEIGHT + LIST_GAP,
              opacity: listOffset,
              transform:[{ translateY: Animated.add(raiseOnNav, 
                listOffset.interpolate({
                  inputRange: [0, 1],
                  outputRange: [6, 0],
                })) }],
            },
          ]}
        >
          {entriesReversed.map((labelText, revIdx) => {
            const originalIdx = entries.length - 1 - revIdx;
            const isSelected = selectedIndex === originalIdx;
            return (
              <TouchableOpacity
                key={`${labelText}-${originalIdx}`}
                style={[styles.mapSelectListItem, isSelected ? styles.mapSelectListItemSelected : null]}
                onPress={() => handleSelect(originalIdx)}
                activeOpacity={0.85}
              >
                <Text style={[styles.mapSelectListText, isSelected ? styles.mapSelectListTextSelected : null]}>
                  {labelText}
                </Text>
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      )}

      {/* Przycisk: umieszczony dokładnie na tej samej osi Y co ToggleTracking (top:'50%' + translateY(-h/2)), 
          oraz animacja podnoszenia przy navigationActive */}
      <Animated.View
        style={[
          styles.mapSelectButtonWrapper,
          {
            transform: [{ translateY: raiseOnNav }],
          },
        ]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={[styles.uiButtonBase, styles.mapSelectButtonInner]}
          onPress={toggleOpen}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Wybór mapy"
        >
          <View style={styles.mapSelectContentInline}>
            <Ionicons name="map-outline" size={18} color="#000" />
            <Text numberOfLines={1} ellipsizeMode="tail" style={styles.mapSelectLabel}>
              {label}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </>
  );
}

/* ===== Style ===== */
const styles = StyleSheet.create({
  // Start/Stop
  startButton: {
    height: MAP_BUTTON_HEIGHT,
    minWidth: MAP_BUTTON_WIDTH + 32, 
    paddingHorizontal: 24,
    borderRadius: 20,
    justifyContent: "center", 
    alignItems: "center",
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
    textTransform: "uppercase",
  },

  uiButtonBase: {
    height: MAP_BUTTON_HEIGHT,
    width: MAP_BUTTON_WIDTH,
    borderRadius: 20,
    borderWidth: 2,
    backgroundColor: "#fff",
    borderColor: "#000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },

  // ToggleTracking — lewy, wyrównany do środka wrappera
  toggleButton: {
    paddingHorizontal: 8,
  },

  mapSelectButtonInner: {
    paddingHorizontal: 8, // tylko to, czego NIE ma w bazie
  },

  mapSelectButtonWrapper: {
    position: "absolute",
    left: 0,
    zIndex: 60,
  },

  mapSelectContentInline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  
  mapSelectLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: "#000",
    fontWeight: "600",
    flexShrink: 1,
    textAlign: "left",
  },

  // Lista pojawiająca się NAD przyciskiem
  mapSelectListContainer: {
    position: "absolute",
    width: MAP_BUTTON_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    paddingVertical: 4,
    elevation: 6,
    zIndex: 70,
  },
  mapSelectListItem: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  mapSelectListItemSelected: {
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  mapSelectListText: {
    fontSize: 14,
    color: "#000",
  },
  mapSelectListTextSelected: {
    fontWeight: "700",
  },

  // HUD counters (bez zmian)
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
});
