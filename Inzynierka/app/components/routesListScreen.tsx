// app/components/routesListScreen.tsx
// Lista tras z dwiema zakładkami: polecane oraz moje.
// Funkcjonalność:
// - Przełączanie zakładek z wyróżnieniem aktywnej.
// - Rozwijanie i zwijanie szczegółów trasy z animacją układu.
// - Przewinięcie listy na górę po zmianie zakładki.
// - Wybór trasy i przekazanie jej do komponentu nadrzędnego.
// Struktura:
// - Konfiguracja zakładek (etykiety i źródła danych) w jednym miejscu.
// - Komponenty prezentacyjne: TabButton i RouteCard.
// - Brak duplikacji styli; aktywne/nieaktywne stany oparte o te same bazowe style.

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";

import routesData from "../../assets/data/routesData.json";
import type { DataFile, Route } from "../../assets/types";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type TabKey = "suggested" | "mine";

interface RoutesListScreenProps {
  onSelectRoute: (route: Route) => void;
}

const THEME = {
  brand: "#004d00",
  cardBg: "rgba(0,0,0,0.4)",
  text: "#fff",
  textMuted: "#aaa",
  shadow: "#000",
};

export default function RoutesListScreen({ onSelectRoute }: RoutesListScreenProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<ScrollView>(null);

  const [activeTab, setActiveTab] = useState<TabKey>("suggested");
  const [expandedRoutes, setExpandedRoutes] = useState<Record<string, boolean>>({});

  const data = routesData as DataFile;
  const suggestedRoutes = useMemo<Route[]>(() => data.suggestedRoutes ?? [], [data]);
  const myRoutes = useMemo<Route[]>(() => data.myRoutes ?? [], [data]);

  // Konfiguracja zakładek: jedyne źródło prawdy dla etykiet i danych.
  const tabs = useMemo(
    () => [
      { key: "suggested" as const, label: t("recomendedRoutes"), routes: suggestedRoutes },
      { key: "mine" as const, label: t("myRoutes"), routes: myRoutes },
    ],
    [t, suggestedRoutes, myRoutes]
  );

  const currentTab = tabs.find((tab) => tab.key === activeTab) ?? tabs[0];
  const routesToRender = currentTab.routes;

  // Przewinięcie listy na górę po zmianie zakładki.
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [activeTab]);

  // Animowane rozwijanie/zwijanie szczegółów.
  const toggleDetails = useCallback((routeName: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedRoutes((prev) => ({ ...prev, [routeName]: !prev[routeName] }));
  }, []);

  const handleSelectRoute = useCallback((route: Route) => {
    onSelectRoute(route);
  }, [onSelectRoute]);

  return (
    <View style={styles.container}>
      {/* Pasek zakładek */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TabButton
            key={tab.key}
            label={tab.label}
            active={tab.key === activeTab}
            onPress={() => setActiveTab(tab.key)}
          />
        ))}
      </View>

      {/* Lista tras */}
      <ScrollView
        ref={scrollRef}
        style={styles.routesContainer}
        contentContainerStyle={styles.routesContent}
        horizontal={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        {routesToRender.map((route) => (
          <RouteCard
            key={route.name}
            route={route}
            expanded={!!expandedRoutes[route.name]}
            onToggle={() => toggleDetails(route.name)}
            onSelect={() => handleSelectRoute(route)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

/**
 * Przycisk zakładki z wyróżnieniem aktywnego stanu.
 */
function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.tabButton, active ? styles.tabButtonActive : styles.tabButtonInactive]}
      onPress={onPress}
      disabled={active}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

/**
 * Karta trasy z nagłówkiem oraz sekcją szczegółów rozwijaną z animacją.
 */
function RouteCard({
  route,
  expanded,
  onToggle,
  onSelect,
}: {
  route: Route;
  expanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
}) {
  const pointsCount = route.pointRefs?.length ?? route.defaultPoints ?? 0;
  const lengthText = route.lengthKm != null ? `${route.lengthKm} km` : "-";

  return (
    <View style={styles.routeBox}>
      <View style={styles.routeHeader}>
        <Ionicons name="navigate" size={24} color={THEME.text} style={styles.routeIcon} />
        <Text style={styles.routeText}>{route.name}</Text>
        <TouchableOpacity style={styles.detailsButton} onPress={onToggle} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={24} color={THEME.text} />
        </TouchableOpacity>
      </View>

      {expanded && (
        <View style={styles.detailsContainer}>
          <View style={styles.infoRow}>
            <InfoPill icon="navigate" value={`${pointsCount}`} />
            <InfoPill icon="walk" value={lengthText} />
          </View>

          {!!route.description && <Text style={styles.detailsText}>{route.description}</Text>}

          <TouchableOpacity style={styles.selectButton} onPress={onSelect} activeOpacity={0.9}>
            <Text style={styles.selectButtonText}>Wybierz trasę</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

/**
 * Jednolity element informacyjny z ikoną i wartością (np. liczba punktów, długość trasy).
 */
function InfoPill({ icon, value }: { icon: string; value: string }) {
  return (
    <View style={styles.infoBox}>
      <Ionicons name={icon as any} size={22} color={THEME.text} style={{ marginRight: 6 }} />
      <Text style={styles.infoText}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },

  // Zakładki
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 100,
    marginBottom: 20,
    width: "100%",
    gap: 15,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 18,
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 2,
  },
  tabButtonActive: { backgroundColor: THEME.brand },
  tabButtonInactive: {
    backgroundColor: THEME.cardBg,
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  tabText: { fontWeight: "600", fontSize: 18, color: THEME.textMuted },
  tabTextActive: { color: THEME.text },

  // Lista tras
  routesContainer: { flex: 1, marginTop: 30 },
  routesContent: { gap: 15, paddingBottom: 40 },

  // Karta trasy
  routeBox: {
    backgroundColor: THEME.cardBg,
    padding: 20,
    borderRadius: 12,
    width: "100%",
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  routeHeader: { flexDirection: "row", alignItems: "center" },
  routeIcon: { marginRight: 15 },
  routeText: { flex: 1, color: THEME.text, fontSize: 20, fontWeight: "700" },
  detailsButton: { padding: 4 },

  // Szczegóły trasy
  detailsContainer: { marginTop: 12, paddingHorizontal: 0 },
  infoRow: { flexDirection: "row", marginBottom: 10 },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.brand,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  infoText: { color: THEME.text, fontWeight: "700", fontSize: 20 },

  detailsText: { color: THEME.text, fontSize: 20, marginBottom: 12 },

  selectButton: {
    backgroundColor: THEME.brand,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 6,
  },
  selectButtonText: { color: THEME.text, fontWeight: "700", fontSize: 20 },
});
