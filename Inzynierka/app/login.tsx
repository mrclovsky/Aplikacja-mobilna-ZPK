// app/login.tsx
// Ekran logowania z dwoma polami oraz przyciskiem akcji.
// Funkcjonalność:
// - Wyświetla tytuł z tłumaczeń i18n.
// - Dwa pola wejściowe (nazwa użytkownika i hasło) z jednolitym wyglądem.
// - Po naciśnięciu przycisku przechodzi do /homeScreen (bez walidacji, zgodnie z oryginałem).

import React, { useCallback } from "react";
import { ImageBackground, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

const backgroundImage = require("../assets/images/las.jpg");

const THEME = {
  brand: "#004d00",
  text: "#fff",
  inputBg: "rgba(255, 255, 255, 0.9)",
};

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const handleLogin = useCallback(() => {
    router.push("/homeScreen");
  }, [router]);

  return (
    <ImageBackground source={backgroundImage} style={styles.background} imageStyle={{ opacity: 0.7 }}>
      <View style={styles.container}>
        <Text style={styles.title}>{t("loginTitle")}</Text>

        <FormInput
          placeholder={t("username")}
          accessibilityLabel={t("username")}
          autoCapitalize="none"
          returnKeyType="next"
        />
        <FormInput
          placeholder={t("password")}
          accessibilityLabel={t("password")}
          secureTextEntry
          returnKeyType="done"
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel={t("login")}
        >
          <Text style={styles.buttonText}>{t("login")}</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}

/**
 * Jednolite pole formularza z predefiniowanymi stylami i opcjami dostępności.
 * Pozwala uniknąć duplikacji kodu dla wielu pól.
 */
function FormInput({
  placeholder,
  accessibilityLabel,
  secureTextEntry = false,
  autoCapitalize = "none",
  returnKeyType = "default",
}: {
  placeholder: string;
  accessibilityLabel?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  returnKeyType?: "done" | "go" | "next" | "search" | "send" | "default";
}) {
  return (
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor="#777"
      accessibilityLabel={accessibilityLabel ?? placeholder}
      secureTextEntry={secureTextEntry}
      autoCapitalize={autoCapitalize}
      returnKeyType={returnKeyType}
    />
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  title: { fontSize: 28, fontWeight: "bold", color: THEME.text, marginBottom: 30 },

  input: {
    width: "100%",
    backgroundColor: THEME.inputBg,
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 15,
    fontSize: 16,
  },

  button: {
    backgroundColor: THEME.brand,
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: THEME.text, fontSize: 16, fontWeight: "600" },
});
