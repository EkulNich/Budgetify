import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { supabase } from "../lib/supabase";

import { AnimatedSplashOverlay } from "@/components/animated-icon";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const user = session.user;

        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .single();

        if (!existing) {
          await supabase.from("profiles").insert({
            id: user.id,
            monthly_salary: 0,
            monthly_budget: 0,
            username: user.email?.split("@")[0] ?? "user",
          });
        }
      }
    });
  }, []);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <StatusBar style="dark" />
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="social/friends" />
        <Stack.Screen name="social/pools" />
        <Stack.Screen name="social/pool/[id]" />
      </Stack>
    </ThemeProvider>
  );
}
