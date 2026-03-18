import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
  SafeAreaView,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { DataFile, Route } from "../../assets/types";
import { t } from "i18next";
import { useRoutesData } from "../hooks/useRoutesData";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

const TOP_MARGIN = 64;

export default function RoutesListScreen({ onSelectRoute }: RoutesListScreenProps) {
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const [expandedRoutes, setExpandedRoutes] = useState<Record<string, boolean>>({});
  const { data, isLoading, isRefreshing, error, refresh } = useRoutesData();
  const routesToRender = useMemo<Route[]>(() => data.suggestedRoutes ?? [], [data]);

  const toggleDetails = useCallback((routeName: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedRoutes((prev) => ({ ...prev, [routeName]: !prev[routeName] }));
  }, []);

  const handleSelectRoute = useCallback((route: Route) => {
    onSelectRoute(route);
  }, [onSelectRoute]);

  const containerPaddingTop = (insets.top ?? 0) + TOP_MARGIN;
  const containerPaddingBottom = 0;
  const containerPaddingHorizontal = Math.max(12, (insets.left ?? 0), (insets.right ?? 0));

  const handleRefresh = useCallback(async () => {
    try {
      await refresh();
    } catch (err) {
      console.log('Refresh failed, using cached data');
    }
  }, [refresh]);

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          paddingTop: containerPaddingTop,
          paddingBottom: 0,
          paddingHorizontal: 0,
        },
      ]}
    >
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.text} />
          <Text style={styles.loadingText}>{t("loading") || "Loading..."}</Text>
        </View>
      )}

      {error && !isLoading && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={32} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!isLoading && (
        <ScrollView
          ref={scrollRef}
          style={styles.routesContainer}
          contentContainerStyle={[styles.routesContent, {
            paddingHorizontal: containerPaddingHorizontal,
          }]}
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

          <TouchableOpacity
            style={[styles.refreshButton, isRefreshing && styles.refreshButtonDisabled]}
            onPress={handleRefresh}
            disabled={isRefreshing}
            activeOpacity={0.85}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color={THEME.text} />
            ) : (
              <Ionicons name="refresh" size={24} color={THEME.text} />
            )}
            <Text style={styles.refreshButtonText}>
              {isRefreshing ? t("refreshing") || "Refreshing..." : t("refresh") || "Refresh"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

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
            <Text style={styles.selectButtonText}>{t("chooseRoute")}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function InfoPill({ icon, value }: { icon: string; value: string }) {
  return (
    <View style={styles.infoBox}>
      <Ionicons name={icon as any} size={22} color={THEME.text} style={{ marginRight: 6 }} />
      <Text style={styles.infoText}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: THEME.text,
    fontSize: 16,
    fontWeight: "600",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  errorText: {
    color: THEME.text,
    fontSize: 16,
    textAlign: "center",
  },

  routesContainer: { flex: 1, marginTop: 18 },
  routesContent: { gap: 15, paddingBottom: 40 },

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

  refreshButton: {
    backgroundColor: THEME.brand,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
    gap: 10,
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  refreshButtonDisabled: {
    opacity: 0.6,
  },
  refreshButtonText: {
    color: THEME.text,
    fontSize: 18,
    fontWeight: "700",
  },
});
