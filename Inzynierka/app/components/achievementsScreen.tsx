// app/components/achievementsScreen.tsx
// Lista osiągnięć z obsługą odczytu/zapisu do pliku, migracją brakujących ID,
// sortowaniem po dacie i usuwaniem pozycji przez gest przesunięcia.
// Warstwy:
// - Trwałość: plik JSON w katalogu dokumentów (FILE).
// - Migracja: nadanie brakujących ID i zapis z powrotem.
// - Prezentacja: FlatList + Swipeable, animowane usuwanie.
// - Animacje: Animated.Value per element, inicjalizowane na podstawie stanu.

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureHandlerRootView, Swipeable } from "react-native-gesture-handler";
import Ionicons from "react-native-vector-icons/Ionicons";
import { File, Paths } from "expo-file-system";
import { Achievement } from "../../assets/types";
import { t } from "i18next";

const THEME = {
  bgCard: "rgba(0,0,0,0.4)",
  brand: "#004d00",
  text: "#fff",
  textSubtle: "#ccc",
  danger: "red",
  shadow: "#000",
};

const FILE = new File(Paths.document, "achievementsData.json");

export default function AchievementsScreen() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());
  const animatedValues = useRef<Record<string, Animated.Value>>({});

  // Ładowanie: utworzenie pliku gdy nie istnieje, migracja ID, sortowanie i zapis.
  useEffect(() => {
    (async () => {
      try {
        if (!FILE.exists) {
          FILE.create();
          FILE.write(JSON.stringify({ achievements: [] }, null, 2), { encoding: "utf8" });
          setAchievements([]);
          return;
        }

        const raw = await FILE.text();
        const parsed = raw?.trim() ? JSON.parse(raw) : { achievements: [] };
        const source: Achievement[] = parsed.achievements ?? [];

        let changed = false;
        const withIds = source.map((a) => {
          if (!a.id) {
            changed = true;
            return { ...a, id: makeId() };
          }
          return a;
        });

        const sorted = sortByDateDesc(withIds);
        setAchievements(sorted);

        if (changed) {
          await persist(sorted);
        }
      } catch (err) {
        console.error("Błąd ładowania achievements:", err);
        setAchievements([]);
      }
    })();
  }, []);

  // Inicjalizacja Animated.Value dla każdego elementu obecnego w stanie.
  useEffect(() => {
    achievements.forEach((a) => {
      const key = a.id as string;
      if (!animatedValues.current[key]) {
        animatedValues.current[key] = new Animated.Value(1);
      }
    });
  }, [achievements]);

  // Potwierdzenie i animowane usuwanie.
  const requestDelete = (id: string) => {
    const index = achievements.findIndex((a) => a.id === id);
    if (index === -1) return;

    Alert.alert(t("deleteAchievement"), t("deleteAchievementQuestion"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: () => animateAndRemove(id, index),
      },
    ]);
  };

  const animateAndRemove = async (id: string, index: number) => {
    try {
      const anim = animatedValues.current[id];
      Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }).start(async () => {
        const updated = [...achievements];
        updated.splice(index, 1);
        setAchievements(updated);
        delete animatedValues.current[id];
        swipeableRefs.current.delete(id);
        await persist(updated);
      });
    } catch (err) {
      console.error("Błąd przy usuwaniu:", err);
    }
  };

  // Prawa akcja swipe (usuń).
  const renderRightActions = (id: string) => (
    <TouchableOpacity
      style={styles.deleteButton}
      onPress={() => {
        swipeableRefs.current.get(id)?.close();
        requestDelete(id);
      }}
      activeOpacity={0.85}
    >
      <Ionicons name="close-circle" size={40} color={THEME.text} />
    </TouchableOpacity>
  );

  // Pojedynczy element listy.
  const renderItem = ({ item }: { item: Achievement }) => {
    const id = item.id as string;
    const anim = animatedValues.current[id] ?? new Animated.Value(1);

    // POPRAWKA: prawidłowe skalowanie — outputRange jako liczby i przypięcie pod klucz 'scale'.
    const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });

    return (
      <Animated.View
        style={{
          opacity: anim,
          transform: [{ scale }],
        }}
      >
        <Swipeable
          ref={(ref) => {
            if (ref) swipeableRefs.current.set(id, ref);
            else swipeableRefs.current.delete(id);
          }}
          renderRightActions={() => renderRightActions(id)}
          overshootRight={false}
        >
          <AchievementCard item={item} />
        </Swipeable>
      </Animated.View>
    );
  };

  const keyExtractor = (item: Achievement) =>
    (item.id as string) ||
    `${item.date}|${item.name}|${item.time}|${item.length}|${item.points}|${item.maxPoints}`;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeContainer}>
        <FlatList
          data={achievements}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.achievementsContainer}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          windowSize={7}
          removeClippedSubviews
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

/**
 * Karta osiągnięcia: nagłówek (ikona, nazwa, data) i trzy pola informacyjne.
 */
function AchievementCard({ item }: { item: Achievement }) {
  const lengthFormatted = useMemo(
    () =>
      (item.length ?? 0).toLocaleString("pl-PL", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [item.length]
  );

  return (
    <View style={styles.achievementBox}>
      <View style={styles.achievementHeader}>
        <Ionicons name="trophy" size={28} color={THEME.text} style={styles.icon} />
        <Text style={styles.achievementText}>{item.name}</Text>
        <Text style={styles.dateText}>{item.date}</Text>
      </View>

      <View style={styles.infoRow}>
        <InfoBox icon="time" value={item.time} />
        <InfoBox icon="walk" value={`${lengthFormatted} km`} />
        <InfoBox icon="star" value={`${item.points}/${item.maxPoints}`} />
      </View>
    </View>
  );
}

/**
 * Uniwersalny boks z ikoną i wartością tekstową.
 */
function InfoBox({ icon, value }: { icon: string; value: string }) {
  return (
    <View style={styles.infoBox}>
      <Ionicons name={icon as any} size={22} color={THEME.text} />
      <Text style={styles.infoText}>{value}</Text>
    </View>
  );
}

/* ===== Pomocnicze ===== */

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const sortByDateDesc = (arr: Achievement[]) =>
  [...arr].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

const persist = async (updated: Achievement[]) => {
  try {
    FILE.write(JSON.stringify({ achievements: updated }, null, 2), { encoding: "utf8" });
  } catch (err) {
    console.error("Błąd zapisu achievements:", err);
  }
};

/* ===== Style ===== */

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: "transparent" },

  achievementsContainer: {
    paddingHorizontal: 10,
    paddingTop: 20,
    paddingBottom: 20,
  },

  achievementBox: {
    backgroundColor: THEME.bgCard,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },

  achievementHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  icon: { marginRight: 8 },

  achievementText: {
    flexShrink: 1,
    color: THEME.text,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },

  dateText: {
    marginLeft: 8,
    color: THEME.textSubtle,
    fontSize: 16,
    fontWeight: "500",
  },

  infoRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 10,
    alignItems: "stretch",
    width: "100%",
  },

  infoBox: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.brand,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
    minWidth: 0,
  },

  infoText: {
    color: THEME.text,
    fontWeight: "700",
    fontSize: 16,
    marginTop: 4,
    flexShrink: 1,
    minWidth: 0,
    textAlign: "center",
  },

  deleteButton: {
    backgroundColor: THEME.danger,
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    borderRadius: 12,
    marginVertical: 10,
  },
});
