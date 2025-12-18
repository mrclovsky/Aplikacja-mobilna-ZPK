// app/screens/settingsScreen.tsx
// Ekran ustawień użytkownika.
// Zawiera: awatar, nazwę użytkownika, wybór języka i przycisk wylogowania.
// Założenia:
// - Logika przełączania języka z i18next.
// - Wylogowanie poprzez przejście do "/" (expo-router).
// - Prosty, przewidywalny UI bez duplikacji kodu (wspólny komponent przycisku językowego).

import React, { useCallback, memo, useState, useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import Ionicons from "react-native-vector-icons/Ionicons";
import { apiService } from "../services/api";

const THEME = {
  brand: "#004d00",
  text: "#fff",
  chipBg: "rgba(0,0,0,0.3)",
  chipBgActive: "#004d00",
};

const LANGS = ["pl", "en", "ua", "de"] as const;

export default function SettingsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();

  // W tej wersji nazwa użytkownika jest stałą.
  // W razie integracji z backendem można ją pobrać z kontekstu/autoryzacji.
  const username = "Jan Kowalski";

  const [distanceToPoint, setDistanceToPoint] = useState<number>(10);
  const [isLoadingDistance, setIsLoadingDistance] = useState(true);
  const [isRefreshingDistance, setIsRefreshingDistance] = useState(false);

  // Load distance setting on mount
  useEffect(() => {
    loadDistanceSetting();
  }, []);

  const loadDistanceSetting = async () => {
    try {
      setIsLoadingDistance(true);
      const settings = await apiService.getAppSettings();
      setDistanceToPoint(settings.distance_to_point);
    } catch (error) {
      console.error('Error loading distance setting:', error);
    } finally {
      setIsLoadingDistance(false);
    }
  };

  const handleRefreshDistance = useCallback(async () => {
    try {
      setIsRefreshingDistance(true);
      const settings = await apiService.fetchSettings();
      setDistanceToPoint(settings.distance_to_point);
    } catch (error) {
      console.error('Error refreshing distance setting:', error);
    } finally {
      setIsRefreshingDistance(false);
    }
  }, []);

  const handleBackToStart = useCallback(() => {
    router.push("/");
  }, [router]);

  const handleChangeLanguage = useCallback(
    (lng: string) => () => i18n.changeLanguage(lng),
    [i18n]
  );

  return (
    <View style={styles.container}>
      {/* Ikona użytkownika */}
      <Ionicons name="person-circle" size={100} color={THEME.brand} style={styles.userIcon} />

      {/* Nazwa użytkownika */}
      <Text style={styles.username}>{username}</Text>

      {/* Wybór języka */}
      <View style={styles.langContainer}>
        {LANGS.map((lng) => (
          <LanguageButton
            key={lng}
            label={lng.toUpperCase()}
            active={i18n.language === lng}
            onPress={handleChangeLanguage(lng)}
          />
        ))}
      </View>

      {/* Distance to point setting */}
      <View style={styles.distanceContainer}>
        <View style={styles.distanceHeader}>
          <Text style={styles.distanceLabel}>{t("distanceToPoint")}</Text>
          <TouchableOpacity
            onPress={handleRefreshDistance}
            disabled={isRefreshingDistance}
            style={styles.refreshButton}
            activeOpacity={0.7}
          >
            {isRefreshingDistance ? (
              <ActivityIndicator size="small" color={THEME.brand} />
            ) : (
              <Ionicons name="refresh" size={24} color={THEME.brand} />
            )}
          </TouchableOpacity>
        </View>
        {isLoadingDistance ? (
          <ActivityIndicator size="small" color={THEME.brand} style={styles.distanceLoader} />
        ) : (
          <>
            <Text style={styles.distanceValue}>{distanceToPoint} m</Text>
            <Text style={styles.distanceNote}>
              {t("distanceNote", { distance: distanceToPoint })}
            </Text>
          </>
        )}
      </View>

      {/* Back to start */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleBackToStart} activeOpacity={0.85}>
        <Text style={styles.logoutButtonText}>{t("backToStart")}</Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * Pojedynczy przycisk wyboru języka (kapsuła).
 * Odpowiada za spójny wygląd i aktywny stan.
 */
const LanguageButton = memo(function LanguageButton({
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
      style={[styles.langButton, active && styles.langButtonActive]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`language-${label}`}
    >
      <Text style={styles.langText}>{label}</Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  // Układ główny ekranu
  container: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    padding: 20,
  },

  // Nagłówek użytkownika
  userIcon: {
    marginBottom: 10,
  },
  username: {
    fontSize: 22,
    color: THEME.text,
    fontWeight: "bold",
    marginBottom: 20,
  },

  // Pasek wyboru języka
  langContainer: {
    flexDirection: "row",
    marginBottom: 30,
  },
  langButton: {
    backgroundColor: THEME.chipBg,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  langButtonActive: {
    backgroundColor: THEME.chipBgActive,
  },
  langText: {
    color: THEME.text,
    fontWeight: "600",
  },

  // Distance to point section
  distanceContainer: {
    width: "100%",
    backgroundColor: THEME.chipBg,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: "center",
  },
  distanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    width: "100%",
  },
  distanceLabel: {
    fontSize: 18,
    color: THEME.text,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  refreshButton: {
    padding: 4,
    position: "absolute",
    right: 0,
  },
  distanceLoader: {
    marginVertical: 10,
  },
  distanceValue: {
    fontSize: 32,
    color: THEME.brand,
    fontWeight: "bold",
    marginBottom: 8,
  },
  distanceNote: {
    fontSize: 12,
    color: THEME.text,
    textAlign: "center",
    opacity: 0.8,
    paddingHorizontal: 10,
  },

  // Przycisk wylogowania
  logoutButton: {
    backgroundColor: THEME.brand,
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 20,
  },
  logoutButtonText: {
    color: THEME.text,
    fontWeight: "bold",
    fontSize: 16,
  },
});
