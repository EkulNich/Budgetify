import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { supabase } from "../lib/supabase";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { useCurrentUser } from "@/hooks/data/use-current-user";
import { useResolvedColorScheme } from "@/hooks/use-theme";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { ensureProfileRow } from "@/lib/profile";

export default function TabLayout() {
  const colorScheme = useResolvedColorScheme();
  const { user } = useCurrentUser();

  usePushNotifications(user?.id);

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <StatusBar style="dark" />
        <AnimatedSplashOverlay />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={!!user}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="social/friends" />
            <Stack.Screen name="social/pools" />
            <Stack.Screen name="social/pool/[id]" />
            <Stack.Screen name="edit-profile" />
            <Stack.Screen name="onboarding" />
          </Stack.Protected>
          <Stack.Protected guard={!user}>
            <Stack.Screen name="login" />
          </Stack.Protected>
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
