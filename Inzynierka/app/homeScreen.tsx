// app/screens/homeScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import Ionicons from "react-native-vector-icons/Ionicons";

import { Route } from "../assets/types";
import AchievementsScreen from "./components/achievementsScreen";
import MapScreen from "./components/mapScreen";
import RoutesListScreen from "./components/routesListScreen";
import SettingsScreen from "./components/settingsScreen";

import { useSafeAreaInsets } from "react-native-safe-area-context";

const backgroundImage = require("../assets/images/las.jpg");
  
type TabKey = "routes" | "route" | "achievements" | "settings";

const COLORS = {
  navbarBg: "rgba(0, 77, 0, 0.85)",
  iconActive: "#000",
  iconInactive: "#fff",
  text: "#fff",
  dot: "#fff",
};

// W razie potrzeby dopasuj tę wysokość (w px)
const NAVBAR_HEIGHT = 64;
const NAVBAR_BOTTOM_OFFSET = 12;

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();

  const navbarTotalHeight =
  NAVBAR_HEIGHT + (insets.bottom ?? 0) + NAVBAR_BOTTOM_OFFSET;

  const [activeTab, setActiveTab] = useState<TabKey>("routes");
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);

  const [, setLangTick] = useState(0);
  useEffect(() => {
    const onLangChange = () => setLangTick((v) => v + 1);
    i18n.on("languageChanged", onLangChange);
    return () => i18n.off("languageChanged", onLangChange);
  }, [i18n]);

  const tabs = useMemo(
    () => [
      {
        key: "routes" as TabKey,
        icon: "list",
        label: t("routesListPage"),
        fullScreen: false,
        render: () => <RoutesListScreen onSelectRoute={setSelectedRoute} />,
      },
      {
        key: "route" as TabKey,
        icon: "navigate",
        label: t("routePage"),
        fullScreen: true,
        render: () => <MapScreen selectedRoute={selectedRoute} />,
      },
      {
        key: "achievements" as TabKey,
        icon: "trophy",
        label: t("achievementsPage"),
        fullScreen: false,
        render: () => <AchievementsScreen />,
      },
      {
        key: "settings" as TabKey,
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
  const isFullScreen = current.fullScreen;

  return (
    <ImageBackground source={backgroundImage} style={styles.background} imageStyle={{ opacity: 0.5 }}>
      <View style={styles.container}>
        <View style={[styles.contentWrapper, 
        !isFullScreen && { paddingBottom:
        NAVBAR_HEIGHT + (insets.bottom ?? 0) + NAVBAR_BOTTOM_OFFSET, // ✅ IDEALNIE ZGODNE Z NAVBAREM
      },]}>
          <Content />
        </View>

        {/* navbar jako absolutny overlay; bottom zależy od safe-area + offset */}
        <View
          style={[
            styles.navbar,
            {
              height: NAVBAR_HEIGHT,
              bottom: (insets.bottom ?? 0) + NAVBAR_BOTTOM_OFFSET,
            },
          ]}
        >
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
      <Ionicons name={icon} size={26} color={active ? COLORS.iconActive : COLORS.iconInactive} />
      <Text style={[styles.navText, active && styles.navTextActive]} numberOfLines={1}>
        {label}
      </Text>
      {active && <View style={styles.activeDot} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1 },

  contentWrapper: { 
    flex: 1,
  },

  navbar: {
    position: "absolute",
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: COLORS.navbarBg,
    paddingHorizontal: 8,
    borderRadius: 14,
    zIndex: 200,
    // nie ustawiamy paddingBottom = insets; używamy wysokości NAVBAR_HEIGHT
  },

  navItem: { justifyContent: "center", alignItems: "center", paddingHorizontal: 6, flex: 1 },
  navText: { color: COLORS.text, fontSize: 12, marginTop: 4 },
  navTextActive: { fontWeight: "700" },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.dot, marginTop: 4 },
});
