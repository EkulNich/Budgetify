import Constants, { ExecutionEnvironment } from "expo-constants";
import { useEffect } from "react";
import { Platform } from "react-native";

import { supabase } from "@/lib/supabase";

/** Requests push permission and keeps this device's Expo push token saved for the signed-in user. */
export function usePushNotifications(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    // Expo Go doesn't ship the native push module at all, and a dev client
    // built before expo-notifications was added won't have it compiled in
    // either. Merely *importing* expo-notifications runs its native module
    // lookup at the top of the file, so it must be `require`d lazily here,
    // inside the try/catch below, rather than statically at the top of this
    // file — a static import would crash on load before this guard ever runs.
    if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
      return;
    }

    let cancelled = false;

    (async () => {
      let Notifications: typeof import("expo-notifications");
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        Notifications = require("expo-notifications") as typeof import("expo-notifications");

        // On a re-invoked effect (React StrictMode double-mount in dev),
        // Metro's module cache can hand back a broken/partial module instead
        // of re-throwing the original error — treat that the same as a
        // missing module rather than letting it crash on `undefined`.
        if (typeof Notifications?.getExpoPushTokenAsync !== "function") {
          throw new Error("native module unavailable");
        }
      } catch {
        // Expected until the app is rebuilt with expo-notifications compiled
        // in (Expo Go, or a stale dev client) — not worth logging as an error.
        return;
      }

      try {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });

        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== "granted" || cancelled) return;

        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const { data: token } = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined,
        );
        if (cancelled || !token) return;

        const { error } = await supabase.from("push_tokens").upsert({
          user_id: userId,
          expo_push_token: token,
          updated_at: new Date().toISOString(),
        });
        if (error) {
          console.error("Failed to save push token:", error.message);
        }
      } catch (error) {
        console.error("Push notification registration unavailable:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);
}
