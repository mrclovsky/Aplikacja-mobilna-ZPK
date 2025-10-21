// app/screens/homeScreen.tsx
// Ekran główny aplikacji z dolną nawigacją. Renderuje jedną z czterech sekcji:
// - Lista tras
// - Mapa wybranej trasy
// - Osiągnięcia
// - Ustawienia
//
// Najważniejsze założenia:
// - Struktura zakładek opisana w jednej tablicy konfiguracyjnej (bez duplikacji kodu).
// - Zmiana języka i18n wymusza lokalny rerender (dla odświeżenia etykiet).
// - Widok mapy pracuje w trybie pełnoekranowym (bez paddingu), pozostałe sekcje mają padding.
// - Ikony w nawigacji: aktywna zakładka podkreślona kropką i pogrubionym podpisem.

import React, { useEffect, useMemo, useState } from "react";
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import Ionicons from "react-native-vector-icons/Ionicons";

import { Route } from "../assets/types";
import AchievementsScreen from "./components/achievementsScreen";
import MapScreen from "./components/mapScreen";
import RoutesListScreen from "./components/routesListScreen";
import SettingsScreen from "./components/settingsScreen";

const backgroundImage = require("../assets/images/las.jpg");

type TabKey = "routes" | "route" | "achievements" | "settings";

const COLORS = {
  navbarBg: "rgba(0, 77, 0, 0.8)",
  iconActive: "#000",
  iconInactive: "#fff",
  text: "#fff",
  dot: "#fff",
};

export default function HomeScreen() {
  const { t, i18n } = useTranslation();

  // Aktualna zakładka oraz wybrana trasa do przekazania do MapScreen
  const [activeTab, setActiveTab] = useState<TabKey>("routes");
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);

  // Tylko do wymuszenia rerenderu po zmianie języka (etkiety w navbarze)
  const [, setLangTick] = useState(0);
  useEffect(() => {
    const onLangChange = () => setLangTick((v) => v + 1);
    i18n.on("languageChanged", onLangChange);
    return () => i18n.off("languageChanged", onLangChange);
  }, [i18n]);

  // Konfiguracja zakładek. Renderer jest funkcją, żeby odświeżał się przy zmianie stanu.
  const tabs = useMemo<
    Array<{
      key: TabKey;
      icon: string;
      label: string;
      fullScreen: boolean;
      render: () => React.ReactNode;
    }>
  >(
    () => [
      {
        key: "routes",
        icon: "list",
        label: t("routesListPage"),
        fullScreen: false,
        render: () => <RoutesListScreen onSelectRoute={setSelectedRoute} />,
      },
      {
        key: "route",
        icon: "navigate",
        label: t("routePage"),
        fullScreen: true,
        render: () => <MapScreen selectedRoute={selectedRoute} />,
      },
      {
        key: "achievements",
        icon: "trophy",
        label: t("achievementsPage"),
        fullScreen: false,
        render: () => <AchievementsScreen />,
      },
      {
        key: "settings",
        icon: "settings",
        label: t("settingsPage"),
        fullScreen: false,
        render: () => <SettingsScreen />,
      },
    ],
    [t, selectedRoute]
  );

  const current = tabs.find((t) => t.key === activeTab) ?? tabs[0];
  const Content = current.render;

  return (
    <ImageBackground source={backgroundImage} style={styles.background} imageStyle={{ opacity: 0.5 }}>
      <View style={styles.container}>
        <View style={current.fullScreen ? styles.fullScreenContent : styles.contentContainer}>
          <Content />
        </View>

        <View style={styles.navbar}>
          {tabs.map((tab) => (
            <NavItem
              key={tab.key}
              icon={tab.icon}
              label={tab.label}
              active={tab.key === activeTab}
              onPress={() => setActiveTab(tab.key)}
            />
          ))}
        </View>
      </View>
    </ImageBackground>
  );
}

// Pojedynczy przycisk w dolnej nawigacji (ikona + etykieta + znacznik aktywności)
function NavItem({
  icon,
  label,
  active,
  onPress,
}: {
  icon: string;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.navItem} onPress={onPress} activeOpacity={0.8}>
      <Ionicons name={icon} size={28} color={active ? COLORS.iconActive : COLORS.iconInactive} />
      <Text style={[styles.navText, active && styles.navTextActive]}>{label}</Text>
      {active && <View style={styles.activeDot} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1, justifyContent: "space-between" },

  // Układ dla treści ekranów nie-mapowych (z marginesem wewnętrznym)
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  // Układ pełnoekranowy dla mapy (bez paddingu, pełna szerokość)
  fullScreenContent: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "stretch",
    padding: 0,
    width: "100%",
  },

  // Pasek nawigacji dolnej
  navbar: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: COLORS.navbarBg,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 40,
    marginHorizontal: 10,
  },

  // Element nawigacji
  navItem: { justifyContent: "center", alignItems: "center" },
  navText: { color: COLORS.text, fontSize: 12, marginTop: 4 },
  navTextActive: { fontWeight: "700" },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.dot, marginTop: 4 },
});
