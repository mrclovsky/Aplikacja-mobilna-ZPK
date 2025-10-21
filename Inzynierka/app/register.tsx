// app/register.tsx
// Ekran rejestracji z czterema polami formularza i prostą walidacją zgodności haseł.
// Założenia:
// - Teksty tytułu i etykiet pochodzą z i18n.
// - Po kliknięciu przycisku wykonywana jest walidacja haseł, a następnie wyświetlany jest Alert.
// - Brak nawigacji po rejestracji (zachowanie jak w oryginale).

import React, { useState, useCallback } from "react";
import { Alert, ImageBackground, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";

const backgroundImage = require("../assets/images/las.jpg");

const THEME = {
  brand: "#004d00",
  text: "#fff",
  inputBg: "rgba(255, 255, 255, 0.9)",
};

export default function RegisterScreen() {
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleRegister = useCallback(() => {
    if (password !== confirmPassword) {
      Alert.alert("Błąd", "Hasła nie są zgodne!");
      return;
    }
    Alert.alert("Rejestracja", `Email: ${email}\nNazwa użytkownika: ${username}`);
    // Tu można dodać właściwą logikę rejestracji (API, walidacje itp.)
  }, [email, username, password, confirmPassword]);

  return (
    <ImageBackground source={backgroundImage} style={styles.background} imageStyle={{ opacity: 0.7 }}>
      <View style={styles.container}>
        <Text style={styles.title}>{t("registerTitle")}</Text>

        <FormInput
          placeholder={t("email")}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          returnKeyType="next"
        />

        <FormInput
          placeholder={t("username")}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          returnKeyType="next"
        />

        <FormInput
          placeholder={t("password")}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          returnKeyType="next"
        />

        <FormInput
          placeholder={t("confirmPassword")}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          returnKeyType="done"
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleRegister}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel={t("register")}
        >
          <Text style={styles.buttonText}>{t("register")}</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}

/**
 * Jednolite pole formularza z gotowymi stylami i typowymi właściwościami.
 * Pomaga unikać duplikacji i utrzymać spójny wygląd pól.
 */
function FormInput({
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "none",
  returnKeyType = "default",
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad" | "url";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  returnKeyType?: "done" | "go" | "next" | "search" | "send" | "default";
}) {
  return (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#777"
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
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
