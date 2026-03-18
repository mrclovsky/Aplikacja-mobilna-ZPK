import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Animated, ImageBackground, StyleSheet, Text, TouchableOpacity, View, Image } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

const backgroundImage = require("../assets/images/las.jpg");

const THEME = {
  brand: "#004d00",
  text: "#fff",
};

const LANGS = ["pl", "en", "ua", "de"] as const;

const ANIM = {
  offset: 50,
  duration: 500,
  interval: 5000, 
};

export default function WelcomeScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const GREETING_SOURCES = ["Witaj!", "Hello!", "Привіт!", "Hallo!"];
  const greetings = useMemo(() => GREETING_SOURCES.map((g) => t(g)), [i18n.language, t]);
  const [index, setIndex] = useState(0);
  const [titleText, setTitleText] = useState(greetings[0]);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
  }, [greetings, animateOnce]);

  useEffect(() => {
    const safeIndex = greetings.length ? index % greetings.length : 0;
    setTitleText(greetings[safeIndex] ?? "");
  }, [greetings, index]);

  return (
    <ImageBackground source={backgroundImage} style={styles.background} imageStyle={{ opacity: 0.7 }}>
      <View style={styles.container}>
        <View style={styles.topContainer}>
          <View style={styles.brandWrapper}>
            <Text style={styles.brandMain}>ZPK</Text>
            <View style={styles.brandDot} />
            <Text style={styles.brandSub}>UMG</Text>
          </View>
          
          <Image 
            source={require("../assets/images/icon.png")} 
            style={styles.logoIcon} 
          />
        </View>

        <Animated.Text style={[styles.title, { transform: [{ translateY: slideAnim }] }]}>
          {titleText}
        </Animated.Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/homeScreen")}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel="Start application"
        >
          <Text style={styles.buttonText}>{t("letsgo")}</Text>
        </TouchableOpacity>

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

  topContainer: {
    position: 'absolute',
    top: 70,               
    alignItems: 'center',
  },
  brandWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  brandMain: {
    fontSize: 42,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  brandDot: {
    width: 12,
    height: 4,
    backgroundColor: THEME.brand,
    marginHorizontal: 15,
  },
  brandSub: {
    fontSize: 32,
    fontWeight: '300',
    color: '#fff',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  logoIcon: {
    width: 70,
    height: 70,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: THEME.brand,
  },
});
