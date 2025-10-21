// app/screens/settingsScreen.tsx
// Ekran ustawień użytkownika.
// Zawiera: awatar, nazwę użytkownika, wybór języka i przycisk wylogowania.
// Założenia:
// - Logika przełączania języka z i18next.
// - Wylogowanie poprzez przejście do "/" (expo-router).
// - Prosty, przewidywalny UI bez duplikacji kodu (wspólny komponent przycisku językowego).

import React, { useCallback, memo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import Ionicons from "react-native-vector-icons/Ionicons";

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

  const handleLogout = useCallback(() => {
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

      {/* Wylogowanie */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.85}>
        <Text style={styles.logoutButtonText}>{t("logoutButton")}</Text>
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
