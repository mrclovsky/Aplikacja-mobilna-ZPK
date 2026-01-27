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

function StackWithI18n() {
  const { t } = useTranslation();
  const backTitle = t("home") || "Strona główna";

  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerTintColor: "#fff",
        headerTitle: "",
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />

      <Stack.Screen
        name="login"
        options={{
          headerBackTitle: backTitle,
        }}
      />

      <Stack.Screen
        name="register"
        options={{
          headerBackTitle: backTitle,
          headerTitleStyle: { fontWeight: "bold" },
        }}
      />

      <Stack.Screen name="homeScreen" options={{ headerShown: false }} />
      <Stack.Screen name="components/qrScanScreen" options={{ headerShown: false }} />
    </Stack>
  );
}
