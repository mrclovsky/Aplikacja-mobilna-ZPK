// app/_layout.tsx
// Główny układ nawigacji oparty o expo-router Stack i i18next.
// Założenia:
// - I18nextProvider obejmuje cały stos ekranów.
// - Wspólne opcje nagłówka dla ekranów logowania/rejestracji zdefiniowane w screenOptions.
// - Ekrany index, homeScreen oraz komponent skanera QR mają wyłączony nagłówek.

import React from "react";
import { Stack } from "expo-router";
import { I18nextProvider, useTranslation } from "react-i18next";
import i18n from "../i18n";

export default function RootLayout() {
  return (
    <I18nextProvider i18n={i18n}>
      <StackWithI18n />
    </I18nextProvider>
  );
}

// Odseparowany stos, aby mieć dostęp do t() już wewnątrz providera.
function StackWithI18n() {
  const { t } = useTranslation();
  const backTitle = t("home") || "Strona główna";

  return (
    <Stack
      // Wspólne opcje nagłówków dla ekranów, które go wyświetlają (login/register)
      screenOptions={{
        headerTransparent: true,
        headerTintColor: "#fff",
        headerTitle: "",
        headerShadowVisible: false,
      }}
    >
      {/* Ekran powitalny */}
      <Stack.Screen name="index" options={{ headerShown: false }} />

      {/* Logowanie */}
      <Stack.Screen
        name="login"
        options={{
          headerBackTitle: backTitle,
        }}
      />

      {/* Rejestracja */}
      <Stack.Screen
        name="register"
        options={{
          headerBackTitle: backTitle,
          headerTitleStyle: { fontWeight: "bold" },
        }}
      />

      {/* Główny ekran aplikacji */}
      <Stack.Screen name="homeScreen" options={{ headerShown: false }} />

      {/* Skaner QR */}
      <Stack.Screen name="components/qrScanScreen" options={{ headerShown: false }} />
    </Stack>
  );
}
