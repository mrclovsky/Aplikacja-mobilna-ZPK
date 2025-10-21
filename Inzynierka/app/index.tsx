// app/index.tsx
// Ekran powitalny z animowanym komunikatem, wyborem języka oraz przyciskami logowania/rejestracji.
// Założenia:
// - Komunikat rotuje cyklicznie co INTERVAL_MS z animacją wyjazdu i wjazdu.
// - Zmiana języka natychmiast aktualizuje widoczną treść bez naruszania cyklu.
// - Przyciski kierują do ścieżek /login oraz /register (expo-router).

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Animated, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

const backgroundImage = require("../assets/images/las.jpg");

const THEME = {
  brand: "#004d00",
  text: "#fff",
};

const LANGS = ["pl", "en", "ua", "de"] as const;

const ANIM = {
  offset: 50,     // piksele przesunięcia Y przy animacji
  duration: 500,  // czas animacji jednego etapu
  interval: 5000, // co ile zmieniamy greeting
};

export default function WelcomeScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();

  // Powitania budowane przez i18n; gdy klucza brak, t() zwróci wejściowy tekst (jak w oryginale).
  const GREETING_SOURCES = ["Witaj!", "Hello!", "Привіт!", "Hallo!"];
  const greetings = useMemo(() => GREETING_SOURCES.map((g) => t(g)), [i18n.language, t]);

  const [index, setIndex] = useState(0);
  const [titleText, setTitleText] = useState(greetings[0]);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pojedyncza sekwencja: wyjazd w górę → podmiana tekstu → wjazd od dołu.
  const animateOnce = useCallback(
    (nextText: string) => {
      Animated.timing(slideAnim, {
        toValue: -ANIM.offset,
        duration: ANIM.duration,
        useNativeDriver: true,
      }).start(() => {
        setTitleText(nextText);
        slideAnim.setValue(ANIM.offset);
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: ANIM.duration,
          useNativeDriver: true,
        }).start();
      });
    },
    [slideAnim]
  );

  // Uruchom cykliczną rotację tekstu na stałym interwale.
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setIndex((prev) => {
        const next = (prev + 1) % greetings.length;
        animateOnce(greetings[next]);
        return next;
      });
    }, ANIM.interval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
    // zależności: zmiana języka przelicza greetings, więc restartujemy pętlę
  }, [greetings, animateOnce]);

  // Aktualizuj widoczny tekst, gdy zmieni się język lub liczba powitań.
  useEffect(() => {
    const safeIndex = greetings.length ? index % greetings.length : 0;
    setTitleText(greetings[safeIndex] ?? "");
  }, [greetings, index]);

  return (
    <ImageBackground source={backgroundImage} style={styles.background} imageStyle={{ opacity: 0.7 }}>
      <View style={styles.container}>
        {/* Animowany nagłówek powitalny */}
        <Animated.Text style={[styles.title, { transform: [{ translateY: slideAnim }] }]}>
          {titleText}
        </Animated.Text>

        {/* Akcje: logowanie i rejestracja */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/login")}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel="Przejdź do logowania"
        >
          <Text style={styles.buttonText}>{t("login")}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonMargin]}
          onPress={() => router.push("/register")}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel="Przejdź do rejestracji"
        >
          <Text style={styles.buttonText}>{t("register")}</Text>
        </TouchableOpacity>

        {/* Wybór języka */}
        <View style={[styles.langContainer, { position: "absolute", bottom: 40 }]}>
          {LANGS.map((lng) => (
            <LanguageButton
              key={lng}
              label={lng.toUpperCase()}
              active={i18n.language === lng}
              onPress={() => i18n.changeLanguage(lng)}
            />
          ))}
        </View>
      </View>
    </ImageBackground>
  );
}

function LanguageButton({
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
      accessibilityLabel={`Zmień język na ${label}`}
    >
      <Text style={styles.langText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  title: { fontSize: 30, fontWeight: "bold", marginBottom: 40, color: THEME.text, textAlign: "center" },

  langContainer: { flexDirection: "row", marginBottom: 30 },
  langButton: {
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  langButtonActive: { backgroundColor: THEME.brand },
  langText: { color: THEME.text, fontWeight: "600" },

  button: {
    backgroundColor: THEME.brand,
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonMargin: { marginTop: 20 },
  buttonText: { color: THEME.text, fontSize: 18, fontWeight: "600" },
});
