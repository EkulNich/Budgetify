import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { supabase } from "../lib/supabase";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { useCurrentUser } from "@/hooks/data/use-current-user";
import { useResolvedColorScheme } from "@/hooks/use-theme";
import { ensureProfileRow } from "@/lib/profile";

export default function TabLayout() {
  const colorScheme = useResolvedColorScheme();
  const { user } = useCurrentUser();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        ensureProfileRow(session.user);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <StatusBar style="dark" />
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!!user}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="social/friends" />
          <Stack.Screen name="social/pools" />
          <Stack.Screen name="social/pool/[id]" />
        </Stack.Protected>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="login" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
